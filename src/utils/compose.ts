import type { FrameColor, Layout } from '../types'
import { centerCropNorm, drawAr, type ArFilterId, type FaceAnchors } from './ar'

/**
 * Grab the current video frame, center-crop it to the layout's cell aspect
 * ratio, apply the chosen CSS filter, and return a JPEG data URL.
 */
export function captureFrame(
  video: HTMLVideoElement,
  layout: Layout,
  filterCss: string,
  mirror: boolean,
  outW = 1000,
  ar?: { anchors: FaceAnchors | null; filterId: ArFilterId },
): string {
  const targetAspect = layout.cellAspect // w / h
  const cellW = outW
  const cellH = Math.round(cellW / targetAspect)

  const canvas = document.createElement('canvas')
  canvas.width = cellW
  canvas.height = cellH
  const ctx = canvas.getContext('2d')!

  // center-crop the source video to the target aspect
  const vw = video.videoWidth
  const vh = video.videoHeight
  const srcAspect = vw / vh
  let sx = 0
  let sy = 0
  let sw = vw
  let sh = vh
  if (srcAspect > targetAspect) {
    sw = vh * targetAspect
    sx = (vw - sw) / 2
  } else {
    sh = vw / targetAspect
    sy = (vh - sh) / 2
  }

  if (filterCss && filterCss !== 'none') ctx.filter = filterCss
  if (mirror) {
    ctx.translate(cellW, 0)
    ctx.scale(-1, 1)
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cellW, cellH)

  // bake the AR overlay on top (reset transform/filter so it stays crisp)
  if (ar && ar.anchors && ar.filterId !== 'none') {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.filter = 'none'
    const crop = centerCropNorm(vw, vh, targetAspect)
    drawAr(ctx, cellW, cellH, crop, mirror, ar.anchors, ar.filterId)
  }

  return canvas.toDataURL('image/jpeg', 0.92)
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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

/** tunable frame geometry (border thickness + corner radius) */
export interface FrameStyle {
  pad: number
  gap: number
  footerH: number
  radius: number
}

export const DEFAULT_FRAME_STYLE: FrameStyle = { pad: 34, gap: 16, footerH: 132, radius: 14 }

export interface StripGeom {
  cellW: number
  cellH: number
  W: number
  H: number
  pad: number
  gap: number
  footerH: number
  radius: number
}

/** compute the strip geometry for a given base cell width */
export function stripGeom(layout: Layout, style: FrameStyle, cellW: number): StripGeom {
  // scale border/radius proportionally to the chosen cell width (base 520)
  const k = cellW / 520
  const pad = style.pad * k
  const gap = style.gap * k
  const footerH = style.footerH * k
  const radius = style.radius * k
  const cellH = Math.round(cellW / layout.cellAspect)
  const innerW = layout.cols * cellW + (layout.cols - 1) * gap
  const innerH = layout.rows * cellH + (layout.rows - 1) * gap
  return {
    cellW,
    cellH,
    pad,
    gap,
    footerH,
    radius,
    W: innerW + pad * 2,
    H: pad + innerH + footerH,
  }
}

/**
 * Paint a strip onto an already-prepared context (unscaled coordinates).
 * Shared by the still PNG composer and the animated GIF composer.
 */
export function paintStrip(
  ctx: CanvasRenderingContext2D,
  cells: CanvasImageSource[],
  layout: Layout,
  frame: FrameColor,
  caption: string,
  brand: string,
  g: StripGeom,
) {
  const { cellW, cellH, gap, pad, W, H, radius } = g

  ctx.fillStyle = frame.bg
  ctx.fillRect(0, 0, W, H)

  const sheen = ctx.createLinearGradient(0, 0, 0, H)
  sheen.addColorStop(0, 'rgba(255,255,255,0.05)')
  sheen.addColorStop(1, 'rgba(0,0,0,0.05)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, W, H)

  for (let i = 0; i < cells.length; i++) {
    const col = i % layout.cols
    const row = Math.floor(i / layout.cols)
    const x = pad + col * (cellW + gap)
    const y = pad + row * (cellH + gap)

    ctx.save()
    roundRect(ctx, x, y, cellW, cellH, radius)
    ctx.clip()
    ctx.drawImage(cells[i], x, y, cellW, cellH)
    ctx.restore()

    ctx.save()
    roundRect(ctx, x + 0.5, y + 0.5, cellW - 1, cellH - 1, radius)
    ctx.strokeStyle = 'rgba(0,0,0,0.10)'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.restore()
  }

  // footer caption
  const footerY = pad + (layout.rows * cellH + (layout.rows - 1) * gap)
  const s = cellW / 520
  ctx.fillStyle = frame.fg
  ctx.textAlign = 'center'
  ctx.font = `700 ${30 * s}px "Black Han Sans", sans-serif`
  ctx.fillText(brand, W / 2, footerY + 52 * s)
  ctx.globalAlpha = 0.7
  ctx.font = `400 ${18 * s}px "Gowun Dodum", sans-serif`
  ctx.fillText(caption, W / 2, footerY + 86 * s)
  ctx.globalAlpha = 1
}

/**
 * Compose captured shots into a printable photo strip and return a PNG data URL.
 */
export async function composeStrip(
  shots: string[],
  layout: Layout,
  frame: FrameColor,
  caption: string,
  opts?: { style?: FrameStyle; brand?: string },
): Promise<string> {
  const style = opts?.style ?? DEFAULT_FRAME_STYLE
  const brand = opts?.brand ?? '인생네컷'
  const SCALE = 2
  const g = stripGeom(layout, style, 520)

  const canvas = document.createElement('canvas')
  canvas.width = g.W * SCALE
  canvas.height = g.H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)

  const images = await Promise.all(shots.map(loadImage))
  paintStrip(ctx, images, layout, frame, caption, brand, g)

  return canvas.toDataURL('image/png')
}
