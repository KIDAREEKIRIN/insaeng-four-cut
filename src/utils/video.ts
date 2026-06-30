import type { FrameColor, Layout } from '../types'
import { DEFAULT_FRAME_STYLE, loadImage, paintStrip, stripGeom, type FrameStyle } from './compose'

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))

function pickMime(): string | undefined {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ]
  if (typeof MediaRecorder === 'undefined') return undefined
  return candidates.find((m) => MediaRecorder.isTypeSupported(m))
}

export interface VideoResult {
  blob: Blob
  ext: string
}

/**
 * Record the animated four-cut to a video file via canvas.captureStream +
 * MediaRecorder. Prefers WebM; falls back to whatever the browser supports
 * (Safari typically produces MP4).
 */
export async function composeVideo(
  bursts: string[][],
  layout: Layout,
  frame: FrameColor,
  caption: string,
  opts?: { style?: FrameStyle; brand?: string; loops?: number; fps?: number },
): Promise<VideoResult> {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder not supported')
  }
  const style = opts?.style ?? DEFAULT_FRAME_STYLE
  const brand = opts?.brand ?? '기산네컷'
  const fps = opts?.fps ?? 12
  const loops = opts?.loops ?? 3

  const g = stripGeom(layout, style, 360)
  const W = Math.round(g.W)
  const H = Math.round(g.H)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const loaded = await Promise.all(bursts.map((b) => Promise.all(b.map(loadImage))))
  const frameCount = Math.min(...loaded.map((b) => b.length))
  const order: number[] = []
  for (let f = 0; f < frameCount; f++) order.push(f)
  for (let f = frameCount - 2; f > 0; f--) order.push(f)

  // paint an initial frame so the stream has content immediately
  paintStrip(ctx, loaded.map((b) => b[0]), layout, frame, caption, brand, g)

  const stream = canvas.captureStream(fps)
  const mime = pickMime()
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
  const chunks: BlobPart[] = []
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data)
  }
  const stopped = new Promise<void>((resolve) => {
    rec.onstop = () => resolve()
  })

  rec.start()
  for (let loop = 0; loop < loops; loop++) {
    for (const f of order) {
      paintStrip(ctx, loaded.map((b) => b[f]), layout, frame, caption, brand, g)
      await delay(1000 / fps)
    }
  }
  rec.stop()
  await stopped

  const type = mime ?? 'video/webm'
  const blob = new Blob(chunks, { type })
  const ext = type.includes('mp4') ? 'mp4' : 'webm'
  return { blob, ext }
}
