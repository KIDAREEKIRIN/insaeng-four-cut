import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { FrameColor } from '../types'
import { loadImage } from '../utils/compose'
import { useI18n } from '../i18n'

export interface CollageHandle {
  export: () => Promise<string>
}

interface Item {
  id: number
  index: number // which shot
  cx: number // normalized center
  cy: number
  scale: number // width as fraction of box
  rot: number // degrees
}

interface Props {
  shots: string[]
  frame: FrameColor
  caption: string
  brand: string
}

function initialItems(n: number): Item[] {
  const cols = n <= 1 ? 1 : n <= 4 ? 2 : 3
  const rows = Math.ceil(n / cols)
  const scale = cols === 1 ? 0.6 : cols === 2 ? 0.46 : 0.34
  return Array.from({ length: n }, (_, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    return {
      id: i,
      index: i,
      cx: (col + 0.5) / cols,
      cy: 0.16 + ((row + 0.5) / rows) * 0.62,
      scale,
      rot: (i % 2 ? 6 : -6) + (i % 3) - 1,
    }
  })
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, r)
    return
  }
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

const CollageEditor = forwardRef<CollageHandle, Props>(function CollageEditor(
  { shots, frame, caption, brand },
  ref,
) {
  const { t } = useI18n()
  const boxRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(0)
  const [items, setItems] = useState<Item[]>(() => initialItems(shots.length))
  const [selected, setSelected] = useState<number | null>(null)
  const drag = useRef<{ id: number; dx: number; dy: number } | null>(null)
  // per-shot aspect ratio (w/h), filled as <img> elements load
  const aspects = useRef<Record<number, number>>({})

  // reset when the set of shots changes (e.g., retake / bg toggle)
  const shotsKey = useMemo(() => shots.join('|').length + ':' + shots.length, [shots])
  const lastKey = useRef(shotsKey)
  if (lastKey.current !== shotsKey) {
    lastKey.current = shotsKey
    setItems(initialItems(shots.length))
    setSelected(null)
  }

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const ro = new ResizeObserver(() => setSize(box.getBoundingClientRect().width))
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  function norm(e: React.PointerEvent) {
    const r = boxRef.current!.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
  }
  function down(e: React.PointerEvent, it: Item) {
    e.stopPropagation()
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    setSelected(it.id)
    // bring to front
    setItems((prev) => [...prev.filter((x) => x.id !== it.id), prev.find((x) => x.id === it.id)!])
    const n = norm(e)
    drag.current = { id: it.id, dx: n.x - it.cx, dy: n.y - it.cy }
  }
  function move(e: React.PointerEvent) {
    if (!drag.current) return
    const n = norm(e)
    const d = drag.current
    setItems((prev) =>
      prev.map((x) =>
        x.id === d.id
          ? { ...x, cx: Math.min(1, Math.max(0, n.x - d.dx)), cy: Math.min(1, Math.max(0, n.y - d.dy)) }
          : x,
      ),
    )
  }
  function up() {
    drag.current = null
  }

  function patchSel(patch: Partial<Item>) {
    if (selected === null) return
    setItems((prev) => prev.map((x) => (x.id === selected ? { ...x, ...patch } : x)))
  }
  const sel = items.find((x) => x.id === selected) ?? null

  useImperativeHandle(ref, () => ({
    export: async () => {
      const SIZE = 1080
      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = frame.bg
      ctx.fillRect(0, 0, SIZE, SIZE)
      const sheen = ctx.createLinearGradient(0, 0, 0, SIZE)
      sheen.addColorStop(0, 'rgba(255,255,255,0.05)')
      sheen.addColorStop(1, 'rgba(0,0,0,0.06)')
      ctx.fillStyle = sheen
      ctx.fillRect(0, 0, SIZE, SIZE)

      const imgs = await Promise.all(shots.map(loadImage))
      for (const it of items) {
        const img = imgs[it.index]
        const aspect = img.naturalWidth / img.naturalHeight || 4 / 3
        const w = it.scale * SIZE
        const h = w / aspect
        const pad = w * 0.04
        ctx.save()
        ctx.translate(it.cx * SIZE, it.cy * SIZE)
        ctx.rotate((it.rot * Math.PI) / 180)
        ctx.shadowColor = 'rgba(0,0,0,0.35)'
        ctx.shadowBlur = w * 0.06
        ctx.shadowOffsetY = w * 0.02
        // white photo border
        ctx.fillStyle = '#fff'
        roundRect(ctx, -w / 2 - pad, -h / 2 - pad, w + pad * 2, h + pad * 2 + pad * 2, w * 0.04)
        ctx.fill()
        ctx.shadowColor = 'transparent'
        ctx.save()
        roundRect(ctx, -w / 2, -h / 2, w, h, w * 0.02)
        ctx.clip()
        ctx.drawImage(img, -w / 2, -h / 2, w, h)
        ctx.restore()
        ctx.restore()
      }

      ctx.fillStyle = frame.fg
      ctx.textAlign = 'center'
      ctx.font = '700 44px "Black Han Sans", sans-serif'
      ctx.fillText(brand, SIZE / 2, SIZE - 56)
      ctx.globalAlpha = 0.7
      ctx.font = '400 26px "Gowun Dodum", sans-serif'
      ctx.fillText(caption, SIZE / 2, SIZE - 22)
      ctx.globalAlpha = 1

      return canvas.toDataURL('image/png')
    },
  }))

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={boxRef}
        onClick={() => setSelected(null)}
        className="relative aspect-square w-full max-w-[min(80vw,360px)] overflow-hidden rounded-xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.7)]"
        style={{ backgroundColor: frame.bg }}
      >
        {items.map((it) => (
          <img
            key={it.id}
            src={shots[it.index]}
            alt=""
            draggable={false}
            onPointerDown={(e) => down(e, it)}
            onPointerMove={move}
            onPointerUp={up}
            onLoad={(e) => {
              const im = e.currentTarget
              aspects.current[it.index] = im.naturalWidth / im.naturalHeight
            }}
            className={`absolute touch-none rounded-[3px] border-[3px] border-white shadow-lg ${
              selected === it.id ? 'outline outline-2 outline-dashed outline-[var(--color-shutter)]' : ''
            }`}
            style={{
              left: `${it.cx * 100}%`,
              top: `${it.cy * 100}%`,
              width: size ? it.scale * size : '30%',
              transform: `translate(-50%, -50%) rotate(${it.rot}deg)`,
            }}
          />
        ))}
        {/* caption preview */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 text-center">
          <div className="text-sm font-bold" style={{ fontFamily: 'var(--font-display)', color: frame.fg }}>
            {brand}
          </div>
          <div className="text-[10px] opacity-70" style={{ color: frame.fg }}>
            {caption}
          </div>
        </div>
      </div>

      {sel && (
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/10 px-3 py-1.5 backdrop-blur">
          <span className="text-xs text-[var(--color-paper-dim)]">{t('editor.size')}</span>
          <button onClick={() => patchSel({ scale: Math.max(0.15, sel.scale - 0.05) })} className="h-7 w-7 rounded-full bg-white/15 text-lg">−</button>
          <button onClick={() => patchSel({ scale: Math.min(0.95, sel.scale + 0.05) })} className="h-7 w-7 rounded-full bg-white/15 text-lg">+</button>
          <span className="ml-1 text-xs text-[var(--color-paper-dim)]">{t('collage.rotate')}</span>
          <button onClick={() => patchSel({ rot: sel.rot - 8 })} className="h-7 w-7 rounded-full bg-white/15 text-sm">↺</button>
          <button onClick={() => patchSel({ rot: sel.rot + 8 })} className="h-7 w-7 rounded-full bg-white/15 text-sm">↻</button>
        </div>
      )}
      <p className="text-center text-xs text-[var(--color-paper-dim)]/70">{t('collage.hint')}</p>
    </div>
  )
})

export default CollageEditor
