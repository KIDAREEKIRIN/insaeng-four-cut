import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useI18n } from '../i18n'

export interface PhotoEditorHandle {
  /** merge base image + decorations and return a PNG data URL */
  export: () => Promise<string>
  hasDecorations: () => boolean
  /** replace all stickers (used by theme presets) */
  setStickers: (list: { emoji: string; x: number; y: number; scale: number }[]) => void
}

interface Point {
  x: number // normalized 0..1
  y: number
}
interface Stroke {
  id: string
  color: string
  width: number // normalized to image width
  points: Point[]
}
interface Sticker {
  id: string
  emoji: string
  x: number // normalized center
  y: number
  scale: number // fraction of image width
}
type HistoryItem = { kind: 'stroke' | 'sticker'; id: string }

const EMOJIS = ['❤️', '⭐', '✨', '🥹', '😎', '🐰', '🌈', '🔥', '🎀', '💛', '🫶', '😻', '🍓', '🦋']
const PEN_COLORS = ['#ff5436', '#ffb347', '#ffffff', '#1a1714', '#a9d6e5', '#ffc8dd', '#5a6650']

let counter = 0
const nextId = () => `${Date.now()}-${counter++}`

interface Props {
  baseUrl: string
}

const PhotoEditor = forwardRef<PhotoEditorHandle, Props>(function PhotoEditor({ baseUrl }, ref) {
  const { t } = useI18n()
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  const [penMode, setPenMode] = useState(false)
  const [penColor, setPenColor] = useState(PEN_COLORS[0])
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [stickers, setStickers] = useState<Sticker[]>([])
  const [, setHistory] = useState<HistoryItem[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)

  const drawing = useRef<Stroke | null>(null)

  // keep the overlay canvas matched to the displayed image size
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const ro = new ResizeObserver(() => {
      const r = box.getBoundingClientRect()
      setSize({ w: r.width, h: r.height })
    })
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !size.w) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size.w * dpr
    canvas.height = size.h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size.w, size.h)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const all = drawing.current ? [...strokes, drawing.current] : strokes
    for (const s of all) {
      if (s.points.length < 1) continue
      ctx.strokeStyle = s.color
      ctx.lineWidth = s.width * size.w
      ctx.beginPath()
      ctx.moveTo(s.points[0].x * size.w, s.points[0].y * size.h)
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x * size.w, s.points[i].y * size.h)
      }
      if (s.points.length === 1) {
        // a single dot
        ctx.lineTo(s.points[0].x * size.w + 0.1, s.points[0].y * size.h)
      }
      ctx.stroke()
    }
  }, [strokes, size])

  useEffect(() => {
    redraw()
  }, [redraw])

  // ---- pen drawing ----
  const PEN_WIDTH = 0.012 // ~ relative to image width

  function toNorm(e: React.PointerEvent) {
    const r = boxRef.current!.getBoundingClientRect()
    return {
      x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)),
      y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)),
    }
  }

  function penDown(e: React.PointerEvent) {
    if (!penMode) return
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    drawing.current = { id: nextId(), color: penColor, width: PEN_WIDTH, points: [toNorm(e)] }
    redraw()
  }
  function penMove(e: React.PointerEvent) {
    if (!penMode || !drawing.current) return
    drawing.current.points.push(toNorm(e))
    redraw()
  }
  function penUp() {
    if (!drawing.current) return
    const s = drawing.current
    drawing.current = null
    setStrokes((prev) => [...prev, s])
    setHistory((h) => [...h, { kind: 'stroke', id: s.id }])
  }

  // ---- sticker dragging ----
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null)

  function stickerDown(e: React.PointerEvent, st: Sticker) {
    if (penMode) return
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setSelected(st.id)
    const n = toNorm(e)
    dragRef.current = { id: st.id, dx: n.x - st.x, dy: n.y - st.y }
  }
  function stickerMove(e: React.PointerEvent) {
    const d = dragRef.current
    if (!d) return
    const n = toNorm(e)
    setStickers((prev) =>
      prev.map((s) =>
        s.id === d.id
          ? { ...s, x: Math.min(1, Math.max(0, n.x - d.dx)), y: Math.min(1, Math.max(0, n.y - d.dy)) }
          : s,
      ),
    )
  }
  function stickerUp() {
    dragRef.current = null
  }

  function addSticker(emoji: string) {
    const st: Sticker = { id: nextId(), emoji, x: 0.5, y: 0.5, scale: 0.16 }
    setStickers((prev) => [...prev, st])
    setHistory((h) => [...h, { kind: 'sticker', id: st.id }])
    setSelected(st.id)
    setShowEmoji(false)
  }

  function resizeSelected(delta: number) {
    if (!selected) return
    setStickers((prev) =>
      prev.map((s) =>
        s.id === selected ? { ...s, scale: Math.min(0.5, Math.max(0.06, s.scale + delta)) } : s,
      ),
    )
  }
  function deleteSelected() {
    if (!selected) return
    setStickers((prev) => prev.filter((s) => s.id !== selected))
    setHistory((h) => h.filter((it) => it.id !== selected))
    setSelected(null)
  }

  function undo() {
    setHistory((h) => {
      if (!h.length) return h
      const last = h[h.length - 1]
      if (last.kind === 'stroke') setStrokes((s) => s.filter((x) => x.id !== last.id))
      else {
        setStickers((s) => s.filter((x) => x.id !== last.id))
        setSelected((sel) => (sel === last.id ? null : sel))
      }
      return h.slice(0, -1)
    })
  }
  function clearAll() {
    setStrokes([])
    setStickers([])
    setHistory([])
    setSelected(null)
  }

  // ---- export ----
  useImperativeHandle(ref, () => ({
    hasDecorations: () => strokes.length > 0 || stickers.length > 0,
    setStickers: (list) => {
      const next: Sticker[] = list.map((s) => ({ id: nextId(), ...s }))
      setStickers(next)
      setSelected(null)
      setHistory((h) => [
        ...h.filter((it) => it.kind !== 'sticker'),
        ...next.map((s) => ({ kind: 'sticker' as const, id: s.id })),
      ])
    },
    export: () =>
      new Promise<string>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const W = img.naturalWidth
          const H = img.naturalHeight
          const canvas = document.createElement('canvas')
          canvas.width = W
          canvas.height = H
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, W, H)
          // strokes
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          for (const s of strokes) {
            if (!s.points.length) continue
            ctx.strokeStyle = s.color
            ctx.lineWidth = s.width * W
            ctx.beginPath()
            ctx.moveTo(s.points[0].x * W, s.points[0].y * H)
            for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x * W, s.points[i].y * H)
            if (s.points.length === 1) ctx.lineTo(s.points[0].x * W + 0.1, s.points[0].y * H)
            ctx.stroke()
          }
          // stickers
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          for (const st of stickers) {
            const fs = st.scale * W
            ctx.font = `${fs}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
            ctx.fillText(st.emoji, st.x * W, st.y * H)
          }
          resolve(canvas.toDataURL('image/png'))
        }
        img.onerror = reject
        img.src = baseUrl
      }),
  }))

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={boxRef}
        onClick={() => !penMode && setSelected(null)}
        className="relative inline-block max-h-[52vh] overflow-hidden rounded-xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
      >
        <img src={baseUrl} alt="네컷" className="block max-h-[52vh] w-auto select-none" draggable={false} />

        {/* pen strokes layer (visual only) */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{ width: size.w, height: size.h }}
        />

        {/* sticker layer */}
        {stickers.map((st) => (
          <span
            key={st.id}
            onPointerDown={(e) => stickerDown(e, st)}
            onPointerMove={stickerMove}
            onPointerUp={stickerUp}
            className={`absolute leading-none ${penMode ? 'pointer-events-none' : 'cursor-move touch-none'} ${
              selected === st.id ? 'rounded-md outline-2 outline-dashed outline-[var(--color-shutter)]' : ''
            }`}
            style={{
              left: `${st.x * 100}%`,
              top: `${st.y * 100}%`,
              fontSize: size.w ? st.scale * size.w : 24,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {st.emoji}
          </span>
        ))}

        {/* pen capture overlay (only active in pen mode) */}
        {penMode && (
          <div
            className="absolute inset-0 touch-none"
            onPointerDown={penDown}
            onPointerMove={penMove}
            onPointerUp={penUp}
            onPointerLeave={penUp}
          />
        )}
      </div>

      {/* selected sticker controls */}
      {selected && !penMode && (
        <div className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
          <button onClick={() => resizeSelected(-0.03)} className="h-7 w-7 rounded-full bg-white/15 text-lg">
            −
          </button>
          <span className="text-xs text-[var(--color-paper-dim)]">{t('editor.size')}</span>
          <button onClick={() => resizeSelected(0.03)} className="h-7 w-7 rounded-full bg-white/15 text-lg">
            +
          </button>
          <button
            onClick={deleteSelected}
            className="ml-1 rounded-full bg-[var(--color-shutter)] px-3 py-1 text-xs font-bold text-white"
          >
            {t('common_delete')}
          </button>
        </div>
      )}

      {/* tool bar */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => {
            setPenMode((p) => !p)
            setSelected(null)
            setShowEmoji(false)
          }}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            penMode ? 'bg-[var(--color-shutter)] text-white' : 'bg-white/10 text-[var(--color-paper)]'
          }`}
        >
          {t('editor.pen')}
        </button>
        <button
          onClick={() => {
            setShowEmoji((s) => !s)
            setPenMode(false)
          }}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            showEmoji ? 'bg-[var(--color-shutter)] text-white' : 'bg-white/10 text-[var(--color-paper)]'
          }`}
        >
          {t('editor.sticker')}
        </button>
        <button onClick={undo} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-[var(--color-paper)]">
          {t('editor.undo')}
        </button>
        <button onClick={clearAll} className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-[var(--color-paper)]">
          {t('editor.clear')}
        </button>
      </div>

      {/* pen color palette */}
      {penMode && (
        <div className="flex items-center gap-2">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setPenColor(c)}
              aria-label={`pen color ${c}`}
              className={`h-7 w-7 rounded-full border-2 transition ${
                penColor === c ? 'scale-110 border-[var(--color-paper)]' : 'border-white/20'
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      )}

      {/* emoji palette */}
      {showEmoji && (
        <div className="flex max-w-md flex-wrap justify-center gap-1.5">
          {EMOJIS.map((em) => (
            <button
              key={em}
              onClick={() => addSticker(em)}
              className="grid h-10 w-10 place-items-center rounded-lg bg-white/10 text-2xl transition active:scale-90"
            >
              {em}
            </button>
          ))}
        </div>
      )}
    </div>
  )
})

export default PhotoEditor
