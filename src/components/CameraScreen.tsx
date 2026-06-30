import { useRef, useState } from 'react'
import type { Arrangement, Filter, Layout } from '../types'
import { ARRANGEMENTS, CUT_COUNTS, FILTERS, makeLayout } from '../types'
import { useCamera } from '../hooks/useCamera'
import { useFaceAr } from '../hooks/useFaceAr'
import { captureFrame } from '../utils/compose'
import { AR_FILTERS, type ArFilterId } from '../utils/ar'
import { playShutter, playTick } from '../utils/sound'
import { useI18n } from '../i18n'

interface Props {
  filter: Filter
  onFilterChange: (f: Filter) => void
  onComplete: (shots: string[], layout: Layout, bursts?: string[][]) => void
  onBack: () => void
  /** when set, capture a single shot to replace one cut, using this layout */
  retakeLayout?: Layout
  /** when retaking, whether the original session was a GIF (capture a burst) */
  retakeGif?: boolean
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

// animated-GIF burst settings
const BURST_FRAMES = 10
const BURST_GAP = 60 // ms between burst frames
const BURST_W = 480 // lower res to keep memory + GIF size sane

export default function CameraScreen({
  filter,
  onFilterChange,
  onComplete,
  onBack,
  retakeLayout,
  retakeGif,
}: Props) {
  const [running, setRunning] = useState(false)
  const [count, setCount] = useState<number | null>(null)
  const [captured, setCaptured] = useState<string[]>([])
  const [flash, setFlash] = useState(false)
  const [timer, setTimer] = useState(3)
  const [cutCount, setCutCount] = useState(4)
  const [arrangement, setArrangement] = useState<Arrangement>('strip')
  const [gifMode, setGifMode] = useState(false)
  const [arFilter, setArFilter] = useState<ArFilterId>('none')

  const { t } = useI18n()
  const isRetake = !!retakeLayout
  const gif = isRetake ? !!retakeGif : gifMode
  const layout = retakeLayout ?? makeLayout(cutCount, arrangement)
  const shotsToTake = isRetake ? 1 : layout.shots
  const { videoRef, ready, error, facingMode, switchCamera, retry } = useCamera(true)

  const overlayRef = useRef<HTMLCanvasElement>(null)
  const { anchorsRef } = useFaceAr(videoRef, overlayRef, {
    filterId: arFilter,
    facingMode,
    enabled: arFilter !== 'none',
  })
  const arArg = () => ({ anchors: anchorsRef.current, filterId: arFilter })

  async function runSequence() {
    if (!ready || running) return
    setRunning(true)
    setCaptured([])
    const results: string[] = []
    const bursts: string[][] = []

    for (let i = 0; i < shotsToTake; i++) {
      for (let c = timer; c >= 1; c--) {
        setCount(c)
        playTick(c === 1)
        await delay(850)
      }
      setCount(null)

      const video = videoRef.current
      const mirror = facingMode === 'user'
      if (video && video.videoWidth) {
        if (gif) {
          // capture a short burst, keep the middle frame as the still
          const frames: string[] = []
          for (let f = 0; f < BURST_FRAMES; f++) {
            frames.push(captureFrame(video, layout, filter.css, mirror, BURST_W, arArg()))
            if (f < BURST_FRAMES - 1) await delay(BURST_GAP)
          }
          bursts.push(frames)
          results.push(captureFrame(video, layout, filter.css, mirror, 1000, arArg()))
        } else {
          results.push(captureFrame(video, layout, filter.css, mirror, 1000, arArg()))
        }
        setCaptured([...results])
      }
      playShutter()

      setFlash(true)
      await delay(140)
      setFlash(false)
      await delay(650)
    }

    setRunning(false)
    await delay(350)
    onComplete(results, layout, gif ? bursts : undefined)
  }

  return (
    <div className="relative flex min-h-full flex-col">
      {/* top bar */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+14px)]">
        <button
          onClick={onBack}
          disabled={running}
          className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-[var(--color-paper)] backdrop-blur disabled:opacity-30"
          aria-label={t('cam.back')}
        >
          ←
        </button>
        <span className="rounded-full bg-black/40 px-4 py-1.5 text-sm font-bold text-[var(--color-paper)] backdrop-blur">
          {isRetake ? t('cam.retakeHeader') : `${captured.length} / ${shotsToTake}`}
        </span>
        <button
          onClick={switchCamera}
          disabled={running}
          className="grid h-10 w-10 place-items-center rounded-full bg-black/40 text-[var(--color-paper)] backdrop-blur disabled:opacity-30"
          aria-label={t('cam.switch')}
        >
          ⟲
        </button>
      </div>

      {/* live preview */}
      <div className="relative mx-auto mt-0 flex w-full max-w-md flex-1 items-center justify-center">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-black sm:rounded-3xl">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
              <p className="text-[var(--color-paper-dim)]">{t(`err.${error}`)}</p>
              <button
                onClick={retry}
                className="rounded-full bg-[var(--color-shutter)] px-6 py-2.5 font-bold text-white"
              >
                {t('cam.retry')}
              </button>
            </div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              className={`h-full w-full object-cover ${facingMode === 'user' ? 'mirror' : ''}`}
              style={{ filter: filter.css === 'none' ? undefined : filter.css }}
            />
          )}

          {/* AR overlay (coordinates already mirrored in draw, so not CSS-mirrored) */}
          {!error && (
            <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          )}

          {/* loading shimmer */}
          {!ready && !error && (
            <div className="absolute inset-0 grid place-items-center bg-[var(--color-ink-soft)]">
              <span className="animate-pulse text-[var(--color-paper-dim)]">{t('cam.preparing')}</span>
            </div>
          )}

          {/* countdown */}
          {count !== null && (
            <div className="absolute inset-0 grid place-items-center bg-black/30">
              <span
                key={count}
                className="animate-pop text-[10rem] leading-none text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {count}
              </span>
            </div>
          )}

          {/* flash */}
          {flash && <div className="animate-flash absolute inset-0 bg-white" />}

          {/* current filter badge */}
          {ready && !error && count === null && (
            <div className="absolute inset-x-0 bottom-3 flex justify-center">
              <span className="rounded-full bg-black/45 px-3 py-1 text-xs font-bold tracking-wide text-white backdrop-blur">
                {t(`filter.${filter.id}`)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* controls */}
      <div className="relative z-20 space-y-3 px-5 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-4">
        {!isRetake && (
          <>
            {/* cut count */}
            <ChipRow disabled={running}>
              <span className="grid shrink-0 place-items-center px-1 text-xs text-[var(--color-paper-dim)]">
                {t('cam.cuts')}
              </span>
              {CUT_COUNTS.map((n) => (
                <Chip key={n} active={n === cutCount} onClick={() => setCutCount(n)}>
                  {t('cam.cut', { n })}
                </Chip>
              ))}
            </ChipRow>

            {/* arrangement + timer on one row */}
            <div className="flex items-center justify-between gap-3">
              <Segmented
                disabled={running}
                options={ARRANGEMENTS.map((a) => ({ value: a.id, label: t(`arr.${a.id}`) }))}
                value={arrangement}
                onChange={(v) => setArrangement(v as Arrangement)}
              />
              <Segmented
                disabled={running}
                prefix="⏱"
                options={[3, 5, 10].map((s) => ({ value: String(s), label: t('cam.sec', { n: s }) }))}
                value={String(timer)}
                onChange={(v) => setTimer(Number(v))}
              />
            </div>

            {/* GIF mode toggle */}
            <div className={`flex justify-center ${running ? 'pointer-events-none opacity-40' : ''}`}>
              <button
                onClick={() => setGifMode((g) => !g)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  gifMode
                    ? 'bg-[var(--color-shutter)] text-white'
                    : 'bg-white/8 text-[var(--color-paper-dim)]'
                }`}
              >
                {gifMode ? t('cam.gifOn') : t('cam.gifOff')}
              </button>
            </div>
          </>
        )}

        {isRetake && (
          <div className="flex items-center justify-center">
            <Segmented
              disabled={running}
              prefix="⏱"
              options={[3, 5, 10].map((s) => ({ value: String(s), label: t('cam.sec', { n: s }) }))}
              value={String(timer)}
              onChange={(v) => setTimer(Number(v))}
            />
          </div>
        )}

        {/* filter chips */}
        <ChipRow disabled={running}>
          {FILTERS.map((f) => (
            <Chip key={f.id} active={f.id === filter.id} onClick={() => onFilterChange(f)}>
              {t(`filter.${f.id}`)}
            </Chip>
          ))}
        </ChipRow>

        {/* AR filters */}
        <ChipRow disabled={running}>
          <span className="grid shrink-0 place-items-center px-1 text-xs text-[var(--color-paper-dim)]">AR</span>
          {AR_FILTERS.map((f) => (
            <Chip key={f.id} active={f.id === arFilter} onClick={() => setArFilter(f.id)}>
              {f.id === 'none' ? t('cam.arNone') : f.icon}
            </Chip>
          ))}
        </ChipRow>

        {/* shutter */}
        <div className="flex items-center justify-center pt-1">
          <button
            onClick={runSequence}
            disabled={!ready || running}
            className="grid h-20 w-20 place-items-center rounded-full border-4 border-white/80 bg-white/10 backdrop-blur transition active:scale-90 disabled:opacity-40"
            aria-label={t('cam.shutter')}
          >
            <span
              className={`rounded-full bg-[var(--color-shutter)] transition-all ${
                running ? 'h-7 w-7 rounded-lg' : 'h-14 w-14'
              }`}
            />
          </button>
        </div>
        <p className="text-center text-xs text-[var(--color-paper-dim)]/70">
          {running
            ? t('cam.shooting')
            : isRetake
              ? t('cam.retakeHint')
              : t('cam.startHint', { n: shotsToTake })}
        </p>
      </div>
    </div>
  )
}

function ChipRow({ children, disabled }: { children: React.ReactNode; disabled: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        disabled ? 'pointer-events-none opacity-40' : ''
      }`}
    >
      {children}
    </div>
  )
}

function Chip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition ${
        active
          ? 'bg-[var(--color-paper)] text-[var(--color-ink)]'
          : 'bg-white/8 text-[var(--color-paper-dim)]'
      }`}
    >
      {children}
    </button>
  )
}

function Segmented({
  options,
  value,
  onChange,
  disabled,
  prefix,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
  disabled: boolean
  prefix?: string
}) {
  return (
    <div className={`flex items-center gap-1.5 ${disabled ? 'pointer-events-none opacity-40' : ''}`}>
      {prefix && <span className="text-sm text-[var(--color-paper-dim)]">{prefix}</span>}
      <div className="flex gap-1 rounded-full bg-white/8 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${
              value === o.value
                ? 'bg-[var(--color-paper)] text-[var(--color-ink)]'
                : 'text-[var(--color-paper-dim)]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}
