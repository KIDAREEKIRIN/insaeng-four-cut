import { GIFEncoder, quantize, applyPalette } from 'gifenc'
import type { FrameColor, Layout } from '../types'
import { DEFAULT_FRAME_STYLE, loadImage, paintStrip, stripGeom, type FrameStyle } from './compose'

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

/**
 * Build an animated GIF where every cut plays its captured burst at once.
 * `bursts[i]` is the array of frame data URLs for cut i.
 */
export async function composeGif(
  bursts: string[][],
  layout: Layout,
  frame: FrameColor,
  caption: string,
  opts?: { style?: FrameStyle; brand?: string; cellW?: number; delay?: number },
): Promise<string> {
  const style = opts?.style ?? DEFAULT_FRAME_STYLE
  const brand = opts?.brand ?? '기산네컷'
  const cellW = opts?.cellW ?? 280
  const delay = opts?.delay ?? 110

  const g = stripGeom(layout, style, cellW)
  const W = Math.round(g.W)
  const H = Math.round(g.H)

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!

  const loaded = await Promise.all(bursts.map((b) => Promise.all(b.map(loadImage))))
  const frameCount = Math.min(...loaded.map((b) => b.length))

  const gif = GIFEncoder()
  // play forward then back for a smooth boomerang loop
  const order: number[] = []
  for (let f = 0; f < frameCount; f++) order.push(f)
  for (let f = frameCount - 2; f > 0; f--) order.push(f)

  for (const f of order) {
    const cells = loaded.map((b) => b[f])
    paintStrip(ctx, cells, layout, frame, caption, brand, g)
    const { data } = ctx.getImageData(0, 0, W, H)
    const palette = quantize(data, 256)
    const index = applyPalette(data, palette)
    gif.writeFrame(index, W, H, { palette, delay })
  }
  gif.finish()

  return `data:image/gif;base64,${bytesToBase64(gif.bytes())}`
}
