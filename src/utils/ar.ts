type Anchor =
  | 'eyes'
  | 'leftEye'
  | 'rightEye'
  | 'nose'
  | 'forehead'
  | 'fLeft'
  | 'fRight'
  | 'underLeft'
  | 'underRight'

interface ArPart {
  emoji: string
  anchor: Anchor
  size: number // multiple of eye distance
  dy?: number // vertical offset in eye-distance units (negative = up)
  rot?: boolean // rotate with head tilt
}

interface ArFilter {
  id: string
  icon: string // shown in the chip
  parts: ArPart[]
}

export const AR_FILTERS: ArFilter[] = [
  { id: 'none', icon: '🚫', parts: [] },
  { id: 'glasses', icon: '🕶️', parts: [{ emoji: '🕶️', anchor: 'eyes', size: 2.3, rot: true }] },
  { id: 'crown', icon: '👑', parts: [{ emoji: '👑', anchor: 'forehead', size: 2.1, dy: -1.1, rot: true }] },
  {
    id: 'hearts',
    icon: '😍',
    parts: [
      { emoji: '❤️', anchor: 'leftEye', size: 1.0 },
      { emoji: '❤️', anchor: 'rightEye', size: 1.0 },
    ],
  },
  {
    id: 'bunny',
    icon: '🐰',
    parts: [
      { emoji: '🐰', anchor: 'fLeft', size: 1.5, dy: -0.9, rot: true },
      { emoji: '🐰', anchor: 'fRight', size: 1.5, dy: -0.9, rot: true },
    ],
  },
  {
    id: 'dog',
    icon: '🐶',
    parts: [
      { emoji: '🐶', anchor: 'fLeft', size: 1.3, dy: -0.5, rot: true },
      { emoji: '🐶', anchor: 'fRight', size: 1.3, dy: -0.5, rot: true },
      { emoji: '🐽', anchor: 'nose', size: 1.0, rot: true },
    ],
  },
  {
    id: 'cat',
    icon: '🐱',
    parts: [
      { emoji: '🐱', anchor: 'fLeft', size: 1.2, dy: -0.8, rot: true },
      { emoji: '🐱', anchor: 'fRight', size: 1.2, dy: -0.8, rot: true },
    ],
  },
  {
    id: 'flowers',
    icon: '🌸',
    parts: [
      { emoji: '🌸', anchor: 'fLeft', size: 0.95, dy: -0.3, rot: true },
      { emoji: '🌷', anchor: 'forehead', size: 1.05, dy: -0.75, rot: true },
      { emoji: '🌸', anchor: 'fRight', size: 0.95, dy: -0.3, rot: true },
    ],
  },
  {
    id: 'stars',
    icon: '🤩',
    parts: [
      { emoji: '⭐', anchor: 'leftEye', size: 1.0 },
      { emoji: '⭐', anchor: 'rightEye', size: 1.0 },
    ],
  },
  { id: 'tophat', icon: '🎩', parts: [{ emoji: '🎩', anchor: 'forehead', size: 2.6, dy: -1.5, rot: true }] },
  { id: 'gradcap', icon: '🎓', parts: [{ emoji: '🎓', anchor: 'forehead', size: 2.6, dy: -1.4, rot: true }] },
  { id: 'disguise', icon: '🥸', parts: [{ emoji: '🥸', anchor: 'nose', size: 3.0, dy: -0.3, rot: true }] },
  { id: 'clown', icon: '🤡', parts: [{ emoji: '🔴', anchor: 'nose', size: 0.9, rot: true }] },
  {
    id: 'teary',
    icon: '🥹',
    parts: [
      { emoji: '💧', anchor: 'underLeft', size: 0.7 },
      { emoji: '💧', anchor: 'underRight', size: 0.7 },
    ],
  },
  {
    id: 'sparkle',
    icon: '✨',
    parts: [
      { emoji: '✨', anchor: 'forehead', size: 0.9, dy: -0.6 },
      { emoji: '✨', anchor: 'fLeft', size: 0.7, dy: 0.2 },
      { emoji: '✨', anchor: 'fRight', size: 0.7, dy: 0.2 },
      { emoji: '✨', anchor: 'nose', size: 0.6, dy: 0.7 },
    ],
  },
  { id: 'butterfly', icon: '🦋', parts: [{ emoji: '🦋', anchor: 'forehead', size: 1.5, dy: -0.6, rot: true }] },
  { id: 'party', icon: '🎉', parts: [{ emoji: '🎉', anchor: 'forehead', size: 1.9, dy: -1.3, rot: true }] },
]

export type ArFilterId = string

interface Pt {
  x: number
  y: number
}

export interface FaceAnchors {
  leftEye: Pt
  rightEye: Pt
  nose: Pt
  forehead: Pt
  fLeft: Pt
  fRight: Pt
}

// MediaPipe FaceLandmarker (478 pts, with iris) — normalized to the video frame
export function faceAnchors(landmarks: { x: number; y: number }[]): FaceAnchors | null {
  if (!landmarks || landmarks.length < 478) return null
  const g = (i: number) => ({ x: landmarks[i].x, y: landmarks[i].y })
  return {
    leftEye: g(468), // left iris center
    rightEye: g(473), // right iris center
    nose: g(1),
    forehead: g(10),
    fLeft: g(103),
    fRight: g(332),
  }
}

export interface CropNorm {
  sx: number
  sy: number
  sw: number
  sh: number
}

/** center-crop a video of size (vw,vh) to targetAspect, in normalized 0..1 coords */
export function centerCropNorm(vw: number, vh: number, targetAspect: number): CropNorm {
  const srcAspect = vw / vh
  if (srcAspect > targetAspect) {
    const sw = vh * targetAspect
    return { sx: (vw - sw) / 2 / vw, sy: 0, sw: sw / vw, sh: 1 }
  }
  const sh = vw / targetAspect
  return { sx: 0, sy: (vh - sh) / 2 / vh, sw: 1, sh: sh / vh }
}

/**
 * Draw the AR overlay onto a target canvas context that represents the video
 * center-cropped by `crop`. Coordinates are mapped (and mirrored for selfies).
 */
export function drawAr(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  crop: CropNorm,
  mirror: boolean,
  a: FaceAnchors,
  filterId: ArFilterId,
) {
  const filter = AR_FILTERS.find((f) => f.id === filterId)
  if (!filter || !filter.parts.length) return

  const map = (p: Pt): Pt => {
    let u = (p.x - crop.sx) / crop.sw
    const v = (p.y - crop.sy) / crop.sh
    if (mirror) u = 1 - u
    return { x: u * W, y: v * H }
  }
  const le = map(a.leftEye)
  const re = map(a.rightEye)
  const mid = { x: (le.x + re.x) / 2, y: (le.y + re.y) / 2 }
  const eyeDist = Math.hypot(re.x - le.x, re.y - le.y) || W * 0.2
  // order the eyes left→right in SCREEN space so the angle is the head tilt
  // (~0 when upright) regardless of mirroring — otherwise rotated emojis flip
  const [p1, p2] = le.x <= re.x ? [le, re] : [re, le]
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x)

  const pts: Record<Anchor, Pt> = {
    eyes: mid,
    leftEye: le,
    rightEye: re,
    nose: map(a.nose),
    forehead: map(a.forehead),
    fLeft: map(a.fLeft),
    fRight: map(a.fRight),
    underLeft: { x: le.x, y: le.y + eyeDist * 0.5 },
    underRight: { x: re.x, y: re.y + eyeDist * 0.5 },
  }

  for (const part of filter.parts) {
    const p = pts[part.anchor]
    const x = p.x
    const y = p.y + (part.dy ?? 0) * eyeDist
    ctx.save()
    ctx.translate(x, y)
    if (part.rot) ctx.rotate(angle)
    ctx.font = `${eyeDist * part.size}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(part.emoji, 0, 0)
    ctx.restore()
  }
}
