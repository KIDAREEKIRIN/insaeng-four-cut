import { useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import type { BorderId, FrameColor, Layout, RadiusId } from '../types'
import { BORDERS, FRAME_COLORS, RADII, THEMES } from '../types'
import { composeStrip, type FrameStyle } from '../utils/compose'
import { composeGif } from '../utils/gif'
import { composeVideo } from '../utils/video'
import PhotoEditor, { type PhotoEditorHandle } from './PhotoEditor'
import CollageEditor, { type CollageHandle } from './CollageEditor'
import PrintSheet from './PrintSheet'
import { saveToGallery } from '../utils/gallery'
import { uploadForQr } from '../utils/share'
import { removeBg } from '../utils/bg'
import { useI18n } from '../i18n'

type QrState =
  | { phase: 'idle' }
  | { phase: 'uploading' }
  | { phase: 'done'; qr: string; link: string }
  | { phase: 'error'; message: string }

interface Props {
  shots: string[]
  bursts: string[][] | null
  layout: Layout
  frame: FrameColor
  onFrameChange: (f: FrameColor) => void
  onRetake: () => void
  onRetakeCut: (index: number) => void
  onHome: () => void
}

type GifState =
  | { phase: 'idle' }
  | { phase: 'making' }
  | { phase: 'done'; url: string }

type VideoState =
  | { phase: 'idle' }
  | { phase: 'making' }
  | { phase: 'done'; url: string; blob: Blob; ext: string }

function formatToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}`
}

function dataUrlToFile(dataUrl: string, name: string): File {
  const [head, body] = dataUrl.split(',')
  const mime = head.match(/:(.*?);/)?.[1] ?? 'image/png'
  const bin = atob(body)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new File([arr], name, { type: mime })
}

export default function ResultScreen({
  shots,
  bursts,
  layout,
  frame,
  onFrameChange,
  onRetake,
  onRetakeCut,
  onHome,
}: Props) {
  const { t } = useI18n()
  const [url, setUrl] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const today = useMemo(() => formatToday(), [])
  const [caption, setCaption] = useState(today)
  const [borderId, setBorderId] = useState<BorderId>('normal')
  const [radiusId, setRadiusId] = useState<RadiusId>('round')
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare
  const editorRef = useRef<PhotoEditorHandle>(null)
  const collageRef = useRef<CollageHandle>(null)
  const [mode, setMode] = useState<'strip' | 'collage'>('strip')
  const [qr, setQr] = useState<QrState>({ phase: 'idle' })
  const [copied, setCopied] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [gif, setGif] = useState<GifState>({ phase: 'idle' })
  const [video, setVideo] = useState<VideoState>({ phase: 'idle' })
  const [bgShots, setBgShots] = useState<string[] | null>(null)
  const [bgOn, setBgOn] = useState(false)
  const [bgProgress, setBgProgress] = useState<{ n: number; t: number } | null>(null)

  const effectiveShots = bgOn && bgShots ? bgShots : shots

  const style = useMemo<FrameStyle>(() => {
    const b = BORDERS.find((x) => x.id === borderId) ?? BORDERS[1]
    const r = RADII.find((x) => x.id === radiusId) ?? RADII[1]
    return { pad: b.pad, gap: b.gap, footerH: b.footerH, radius: r.radius }
  }, [borderId, radiusId])

  // a fresh capture (or retake) invalidates any background-removed copies
  useEffect(() => {
    setBgShots(null)
    setBgOn(false)
  }, [shots])

  useEffect(() => {
    let alive = true
    setUrl(null)
    composeStrip(effectiveShots, layout, frame, caption, { style, brand: t('brand.full') }).then((u) => {
      if (alive) setUrl(u)
    })
    return () => {
      alive = false
    }
  }, [effectiveShots, layout, frame, caption, style, t])

  async function handleBg() {
    if (bgShots) {
      setBgOn((v) => !v)
      return
    }
    if (bgProgress) return
    try {
      const out: string[] = []
      for (let i = 0; i < shots.length; i++) {
        setBgProgress({ n: i, t: shots.length })
        out.push(await removeBg(shots[i]))
      }
      setBgShots(out)
      setBgOn(true)
    } catch {
      /* model load / inference failed — keep originals */
    } finally {
      setBgProgress(null)
    }
  }

  function applyTheme(themeId: string) {
    const theme = THEMES.find((x) => x.id === themeId)
    if (!theme) return
    editorRef.current?.setStickers(theme.stickers)
    const color = FRAME_COLORS.find((c) => c.id === theme.frameColorId)
    if (color) onFrameChange(color)
  }

  /** flatten the active layout (strip or collage) into the final image */
  async function getFinal(): Promise<string | null> {
    if (mode === 'collage') {
      return (await collageRef.current?.export()) ?? null
    }
    if (!url) return null
    if (editorRef.current?.hasDecorations()) {
      return editorRef.current.export()
    }
    return url
  }

  async function handleSave() {
    const final = await getFinal()
    if (!final) return
    // keep a copy in the local gallery
    saveToGallery(final).then(() => setSaved(true))

    const file = dataUrlToFile(final, `기산네컷_${Date.now()}.png`)
    if (canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t('brand.full') })
        return
      } catch {
        /* user cancelled — fall through to download */
      }
    }
    const a = document.createElement('a')
    a.href = final
    a.download = file.name
    a.click()
  }

  async function handleGif() {
    if (!bursts) return
    setGif({ phase: 'making' })
    try {
      const url = await composeGif(bursts, layout, frame, caption, { style, brand: t('brand.full') })
      saveToGallery(url).then(() => setSaved(true))
      setGif({ phase: 'done', url })
    } catch {
      setGif({ phase: 'idle' })
    }
  }

  async function handleVideo() {
    if (!bursts) return
    setVideo({ phase: 'making' })
    try {
      const { blob, ext } = await composeVideo(bursts, layout, frame, caption, { style, brand: t('brand.full') })
      const url = URL.createObjectURL(blob)
      setVideo({ phase: 'done', url, blob, ext })
    } catch {
      setVideo({ phase: 'idle' })
    }
  }

  async function saveBlob(blob: Blob, name: string) {
    const file = new File([blob], name, { type: blob.type })
    if (canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t('brand.full') })
        return
      } catch {
        /* fall through */
      }
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  async function saveImage(dataUrl: string, name: string) {
    const file = dataUrlToFile(dataUrl, name)
    if (canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t('brand.full') })
        return
      } catch {
        /* fall through */
      }
    }
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = name
    a.click()
  }

  async function handleQr() {
    const final = await getFinal()
    if (!final) return
    setQr({ phase: 'uploading' })
    saveToGallery(final).then(() => setSaved(true))
    try {
      const file = dataUrlToFile(final, `기산네컷_${Date.now()}.png`)
      const link = await uploadForQr(file)
      const qrImg = await QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: '#1a1714', light: '#f5ece0' } })
      setQr({ phase: 'done', qr: qrImg, link })
    } catch (err) {
      setQr({ phase: 'error', message: err instanceof Error ? err.message : '업로드에 실패했어요' })
    }
  }

  return (
    <div className="relative flex min-h-full flex-col items-center px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+24px)]">
      <h2 className="mb-3 text-3xl text-[var(--color-paper)]" style={{ fontFamily: 'var(--font-display)' }}>
        {t('res.done')}
      </h2>

      {/* layout mode toggle */}
      <div className="mb-3 flex gap-1 rounded-full bg-white/8 p-1">
        {(['strip', 'collage'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-5 py-1.5 text-sm font-bold transition ${
              mode === m
                ? 'bg-[var(--color-paper)] text-[var(--color-ink)]'
                : 'text-[var(--color-paper-dim)]'
            }`}
          >
            {t(`mode.${m}`)}
          </button>
        ))}
      </div>

      {/* preview: strip editor or free collage */}
      <div className="animate-slide-up flex flex-1 flex-col items-center justify-center">
        {mode === 'collage' ? (
          <CollageEditor
            ref={collageRef}
            shots={effectiveShots}
            frame={frame}
            caption={caption}
            brand={t('brand.full')}
          />
        ) : url ? (
          <PhotoEditor ref={editorRef} baseUrl={url} />
        ) : (
          <div className="grid h-64 w-44 place-items-center rounded-xl bg-[var(--color-ink-card)]">
            <span className="animate-pulse text-sm text-[var(--color-paper-dim)]">{t('res.composing')}</span>
          </div>
        )}
      </div>

      {/* per-cut retake */}
      <div className="mt-4 w-full max-w-md">
        <p className="mb-2 text-center text-xs tracking-widest text-[var(--color-paper-dim)]">
          {t('res.retakeSection')}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {shots.map((s, i) => (
            <button
              key={i}
              onClick={() => onRetakeCut(i)}
              className="group relative h-16 w-12 overflow-hidden rounded-md border border-white/10 transition active:scale-90"
            >
              <img src={s} alt={`cut ${i + 1}`} className="h-full w-full object-cover" />
              <span className="absolute inset-0 grid place-items-center bg-black/35 text-lg opacity-0 transition group-hover:opacity-100">
                🔄
              </span>
              <span className="absolute bottom-0 right-0 rounded-tl bg-black/55 px-1 text-[10px] font-bold text-white">
                {i + 1}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* caption text input */}
      <div className="mt-4 w-full max-w-md">
        <p className="mb-2 text-center text-xs tracking-widest text-[var(--color-paper-dim)]">{t('res.caption')}</p>
        <div className="flex items-center gap-2">
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 24))}
            placeholder={t('res.captionPlaceholder')}
            maxLength={24}
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/8 px-4 py-2.5 text-center text-sm text-[var(--color-paper)] placeholder:text-[var(--color-paper-dim)]/50 focus:border-[var(--color-shutter)] focus:outline-none"
          />
          {caption !== today && (
            <button
              onClick={() => setCaption(today)}
              className="shrink-0 rounded-full bg-white/8 px-3 py-2.5 text-xs font-bold text-[var(--color-paper-dim)]"
            >
              {t('res.dateBtn')}
            </button>
          )}
        </div>
      </div>

      {/* theme presets (strip only) */}
      {mode === 'strip' && (
      <div className="mt-4 w-full max-w-md">
        <p className="mb-2 text-center text-xs tracking-widest text-[var(--color-paper-dim)]">{t('theme.title')}</p>
        <div className="flex justify-center gap-2">
          {THEMES.map((th) => (
            <button
              key={th.id}
              onClick={() => applyTheme(th.id)}
              aria-label={th.id}
              className="grid h-11 w-11 place-items-center rounded-2xl bg-white/8 text-2xl transition active:scale-90"
            >
              {th.emoji}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* frame color picker */}
      <div className="mt-4 w-full max-w-md">
        <p className="mb-2 text-center text-xs tracking-widest text-[var(--color-paper-dim)]">{t('res.frameColor')}</p>
        <div className="flex justify-center gap-3">
          {FRAME_COLORS.map((f) => (
            <button
              key={f.id}
              onClick={() => onFrameChange(f)}
              aria-label={f.label}
              className={`h-9 w-9 rounded-full border-2 transition active:scale-90 ${
                f.id === frame.id ? 'scale-110 border-[var(--color-shutter)]' : 'border-white/20'
              }`}
              style={{ backgroundColor: f.bg }}
            />
          ))}
        </div>
      </div>

      {/* border + corner options (strip only) */}
      {mode === 'strip' && (
      <div className="mt-4 flex w-full max-w-md items-center justify-center gap-6">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs tracking-widest text-[var(--color-paper-dim)]">{t('res.border')}</span>
          <div className="flex gap-1 rounded-full bg-white/8 p-1">
            {BORDERS.map((b) => (
              <button
                key={b.id}
                onClick={() => setBorderId(b.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  borderId === b.id
                    ? 'bg-[var(--color-paper)] text-[var(--color-ink)]'
                    : 'text-[var(--color-paper-dim)]'
                }`}
              >
                {t(`border.${b.id}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs tracking-widest text-[var(--color-paper-dim)]">{t('res.corner')}</span>
          <div className="flex gap-1 rounded-full bg-white/8 p-1">
            {RADII.map((r) => (
              <button
                key={r.id}
                onClick={() => setRadiusId(r.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  radiusId === r.id
                    ? 'bg-[var(--color-paper)] text-[var(--color-ink)]'
                    : 'text-[var(--color-paper-dim)]'
                }`}
              >
                {t(`radius.${r.id}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* AI background removal */}
      <div className="mt-4 w-full max-w-md">
        <button
          onClick={handleBg}
          disabled={!!bgProgress}
          className={`w-full rounded-full py-3 text-sm font-bold transition active:scale-95 disabled:opacity-60 ${
            bgOn ? 'bg-[var(--color-shutter)] text-white' : 'bg-white/8 text-[var(--color-paper)]'
          }`}
        >
          {bgProgress
            ? t('bg.processing', { n: bgProgress.n + 1, t: bgProgress.t })
            : bgOn
              ? t('bg.restore')
              : t('bg.remove')}
        </button>
      </div>

      {/* actions */}
      <div className="mt-4 flex w-full max-w-md flex-col gap-3">
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={!url}
            className="flex-1 rounded-full bg-[var(--color-shutter)] py-4 text-lg font-bold text-white shadow-[0_10px_30px_-8px_var(--color-shutter)] transition active:scale-95 disabled:opacity-40"
          >
            {saved ? t('res.savedAgain') : canShare ? t('res.saveShare') : t('res.saveImg')}
          </button>
          <button
            onClick={handleQr}
            disabled={!url}
            className="shrink-0 rounded-full bg-white/10 px-5 py-4 text-lg font-bold text-[var(--color-paper)] transition active:scale-95 disabled:opacity-40"
            aria-label={t('res.ariaQr')}
          >
            🔗 QR
          </button>
        </div>
        {bursts && (
          <div className="flex gap-3">
            <button
              onClick={handleGif}
              disabled={gif.phase === 'making'}
              className="flex-1 rounded-full border border-[var(--color-shutter)]/50 bg-[var(--color-shutter)]/15 py-3.5 text-sm font-bold text-[var(--color-paper)] transition active:scale-95 disabled:opacity-50"
            >
              {gif.phase === 'making' ? t('res.gifMaking') : t('res.gifSave')}
            </button>
            <button
              onClick={handleVideo}
              disabled={video.phase === 'making'}
              className="flex-1 rounded-full border border-[var(--color-shutter)]/50 bg-[var(--color-shutter)]/15 py-3.5 text-sm font-bold text-[var(--color-paper)] transition active:scale-95 disabled:opacity-50"
            >
              {video.phase === 'making' ? t('video.making') : t('video.save')}
            </button>
          </div>
        )}
        <button
          onClick={() => setShowPrint(true)}
          className="rounded-full bg-white/8 py-3 text-sm font-bold text-[var(--color-paper)] transition active:scale-95"
        >
          {t('print.order')}
        </button>
        <div className="flex gap-3">
          <button
            onClick={onRetake}
            className="flex-1 rounded-full bg-white/8 py-3.5 font-bold text-[var(--color-paper)] transition active:scale-95"
          >
            {t('res.retakeAll')}
          </button>
          <button
            onClick={onHome}
            className="flex-1 rounded-full bg-white/8 py-3.5 font-bold text-[var(--color-paper)] transition active:scale-95"
          >
            {t('res.home')}
          </button>
        </div>
        <p className="mt-1 text-center text-xs text-[var(--color-paper-dim)]/60">
          {t('res.autosave')}
        </p>
      </div>

      {/* GIF preview modal */}
      {gif.phase === 'done' && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/85 p-6 text-center backdrop-blur"
          onClick={() => setGif({ phase: 'idle' })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-[var(--color-ink-card)] p-6"
          >
            <h3 className="text-xl text-[var(--color-paper)]" style={{ fontFamily: 'var(--font-display)' }}>
              {t('gif.title')}
            </h3>
            <img src={gif.url} alt={t('gif.title')} className="max-h-[52vh] w-auto rounded-xl" />
            <button
              onClick={() => saveImage(gif.url, `기산네컷_${Date.now()}.gif`)}
              className="w-full rounded-full bg-[var(--color-shutter)] py-3 font-bold text-white"
            >
              {canShare ? t('gif.saveShare') : t('gif.save')}
            </button>
            <button
              onClick={() => setGif({ phase: 'idle' })}
              className="rounded-full bg-white/8 px-6 py-2.5 text-sm font-bold text-[var(--color-paper)]"
            >
              {t('common_close')}
            </button>
          </div>
        </div>
      )}

      {/* video preview modal */}
      {video.phase === 'done' && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/85 p-6 text-center backdrop-blur"
          onClick={() => setVideo({ phase: 'idle' })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-[var(--color-ink-card)] p-6"
          >
            <h3 className="text-xl text-[var(--color-paper)]" style={{ fontFamily: 'var(--font-display)' }}>
              {t('video.title')}
            </h3>
            <video
              src={video.url}
              className="max-h-[52vh] w-auto rounded-xl"
              autoPlay
              loop
              muted
              playsInline
              controls
            />
            <button
              onClick={() => saveBlob(video.blob, `기산네컷_${Date.now()}.${video.ext}`)}
              className="w-full rounded-full bg-[var(--color-shutter)] py-3 font-bold text-white"
            >
              {canShare ? t('video.saveShare') : t('video.saveOnly')}
            </button>
            <button
              onClick={() => setVideo({ phase: 'idle' })}
              className="rounded-full bg-white/8 px-6 py-2.5 text-sm font-bold text-[var(--color-paper)]"
            >
              {t('common_close')}
            </button>
          </div>
        </div>
      )}

      {showPrint && (
        <PrintSheet preview={url} getImage={getFinal} onClose={() => setShowPrint(false)} />
      )}

      {/* QR share modal */}
      {qr.phase !== 'idle' && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-black/85 p-6 text-center backdrop-blur"
          onClick={() => setQr({ phase: 'idle' })}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-[var(--color-ink-card)] p-6"
          >
            <h3 className="text-xl text-[var(--color-paper)]" style={{ fontFamily: 'var(--font-display)' }}>
              {t('qr.title')}
            </h3>

            {qr.phase === 'uploading' && (
              <div className="flex h-64 w-64 flex-col items-center justify-center gap-3">
                <span className="animate-pulse text-[var(--color-paper-dim)]">{t('qr.uploading')}</span>
              </div>
            )}

            {qr.phase === 'done' && (
              <>
                <img src={qr.qr} alt="QR" className="h-64 w-64 rounded-xl" />
                <p className="whitespace-pre-line text-xs leading-relaxed text-[var(--color-paper-dim)]">
                  {t('qr.scan')}
                </p>
                <a
                  href={qr.link}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full truncate rounded-full bg-white/8 px-4 py-2 text-xs text-[var(--color-paper-dim)]"
                >
                  {qr.link}
                </a>
                <button
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(qr.link)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    } catch {
                      /* clipboard blocked */
                    }
                  }}
                  className="w-full rounded-full bg-[var(--color-shutter)] py-2.5 text-sm font-bold text-white"
                >
                  {copied ? t('qr.copied') : t('qr.copy')}
                </button>
              </>
            )}

            {qr.phase === 'error' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <span className="text-4xl">😢</span>
                <p className="whitespace-pre-line text-sm text-[var(--color-paper-dim)]">{t('qr.fail')}</p>
                <button
                  onClick={() => {
                    setQr({ phase: 'idle' })
                    handleSave()
                  }}
                  className="rounded-full bg-[var(--color-shutter)] px-6 py-2.5 font-bold text-white"
                >
                  {t('qr.switch')}
                </button>
              </div>
            )}

            <button
              onClick={() => setQr({ phase: 'idle' })}
              className="mt-1 rounded-full bg-white/8 px-6 py-2.5 text-sm font-bold text-[var(--color-paper)]"
            >
              {t('common_close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
