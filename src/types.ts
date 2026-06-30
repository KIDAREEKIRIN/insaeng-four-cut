export type Screen = 'home' | 'camera' | 'result' | 'gallery'

export interface Filter {
  id: string
  label: string
  /** CSS filter string applied to both the live preview and the final canvas */
  css: string
}

export interface Layout {
  id: string
  label: string
  /** number of photos to capture */
  shots: number
  /** grid columns when composing */
  cols: number
  rows: number
  /** aspect ratio (w/h) of each captured cell */
  cellAspect: number
}

export interface FrameColor {
  id: string
  label: string
  /** background color of the printed strip */
  bg: string
  /** text color for the footer caption */
  fg: string
}

export const FILTERS: Filter[] = [
  { id: 'original', label: '원본', css: 'none' },
  { id: 'soft', label: '뽀샤시', css: 'brightness(1.14) saturate(1.05) contrast(0.95) blur(0.4px)' },
  { id: 'bright', label: '화사', css: 'brightness(1.12) saturate(1.25) contrast(1.02)' },
  { id: 'vivid', label: '선명', css: 'contrast(1.18) saturate(1.4) brightness(1.02)' },
  { id: 'mono', label: '흑백', css: 'grayscale(1) contrast(1.1)' },
  { id: 'noir', label: '느와르', css: 'grayscale(1) contrast(1.35) brightness(0.95)' },
  { id: 'vintage', label: '빈티지', css: 'sepia(0.45) contrast(1.1) saturate(1.1) brightness(1.02)' },
  { id: 'film', label: '필름', css: 'sepia(0.18) contrast(1.12) saturate(1.18) brightness(1.03)' },
  { id: 'latte', label: '라떼', css: 'sepia(0.35) saturate(1.15) brightness(1.06) contrast(0.98)' },
  { id: 'warm', label: '따뜻', css: 'sepia(0.2) saturate(1.3) brightness(1.05) hue-rotate(-6deg)' },
  { id: 'cool', label: '쿨톤', css: 'contrast(1.05) saturate(1.1) hue-rotate(-12deg) brightness(1.04)' },
  { id: 'mint', label: '민트', css: 'saturate(1.2) hue-rotate(-18deg) brightness(1.05) contrast(1.03)' },
]

export type Arrangement = 'strip' | 'grid'

/** how many photos the user can choose to take */
export const CUT_COUNTS = [1, 2, 3, 4, 6, 8] as const

export const ARRANGEMENTS: { id: Arrangement; label: string }[] = [
  { id: 'strip', label: '세로 스트립' },
  { id: 'grid', label: '그리드' },
]

/** build a layout dynamically from a cut count + arrangement */
export function makeLayout(count: number, arrangement: Arrangement): Layout {
  const cols = arrangement === 'grid' && count > 1 ? 2 : 1
  const rows = Math.ceil(count / cols)
  // taller strips read better when there are many stacked cells
  const cellAspect = cols === 1 && count >= 5 ? 16 / 9 : 4 / 3
  return {
    id: `${arrangement}-${count}`,
    label: `${count}컷`,
    shots: count,
    cols,
    rows,
    cellAspect,
  }
}

export const DEFAULT_LAYOUT = makeLayout(4, 'strip')

export const BORDERS = [
  { id: 'slim', pad: 16, gap: 8, footerH: 96 },
  { id: 'normal', pad: 34, gap: 16, footerH: 132 },
  { id: 'wide', pad: 56, gap: 22, footerH: 156 },
] as const

export const RADII = [
  { id: 'sharp', radius: 2 },
  { id: 'round', radius: 16 },
  { id: 'rounder', radius: 36 },
] as const

export type BorderId = (typeof BORDERS)[number]['id']
export type RadiusId = (typeof RADII)[number]['id']

export const FRAME_COLORS: FrameColor[] = [
  { id: 'black', label: '블랙', bg: '#171311', fg: '#f5ece0' },
  { id: 'cream', label: '크림', bg: '#f5ece0', fg: '#2b2521' },
  { id: 'coral', label: '코랄', bg: '#ff5436', fg: '#2b1410' },
  { id: 'sky', label: '하늘', bg: '#a9d6e5', fg: '#143642' },
  { id: 'pink', label: '핑크', bg: '#ffc8dd', fg: '#5e2b41' },
  { id: 'olive', label: '올리브', bg: '#5a6650', fg: '#f5ece0' },
]

export interface ThemeSticker {
  emoji: string
  x: number
  y: number
  scale: number
}
export interface Theme {
  id: string
  emoji: string
  frameColorId: string
  stickers: ThemeSticker[]
}

const S = 0.13
// corner / edge anchor points (normalized to the strip)
const TL = { x: 0.13, y: 0.08 }
const TR = { x: 0.87, y: 0.08 }
const BL = { x: 0.13, y: 0.92 }
const BR = { x: 0.87, y: 0.92 }
const TC = { x: 0.5, y: 0.06 }
const BC = { x: 0.5, y: 0.94 }

export const THEMES: Theme[] = [
  {
    id: 'love',
    emoji: '❤️',
    frameColorId: 'pink',
    stickers: [
      { emoji: '❤️', ...TL, scale: S },
      { emoji: '💕', ...TR, scale: S },
      { emoji: '🫶', ...BL, scale: S },
      { emoji: '❤️', ...BR, scale: S },
    ],
  },
  {
    id: 'birthday',
    emoji: '🎂',
    frameColorId: 'sky',
    stickers: [
      { emoji: '🎂', ...TC, scale: 0.15 },
      { emoji: '🎉', ...TL, scale: S },
      { emoji: '🎈', ...TR, scale: S },
      { emoji: '🎈', ...BL, scale: S },
      { emoji: '🎁', ...BR, scale: S },
    ],
  },
  {
    id: 'y2k',
    emoji: '✨',
    frameColorId: 'coral',
    stickers: [
      { emoji: '✨', ...TL, scale: S },
      { emoji: '⭐', ...TR, scale: S },
      { emoji: '🦋', ...BL, scale: S },
      { emoji: '💫', ...BR, scale: S },
      { emoji: '✨', ...BC, scale: 0.1 },
    ],
  },
  {
    id: 'xmas',
    emoji: '🎄',
    frameColorId: 'olive',
    stickers: [
      { emoji: '🎄', ...TL, scale: S },
      { emoji: '❄️', ...TR, scale: S },
      { emoji: '❄️', ...BL, scale: S },
      { emoji: '🎁', ...BR, scale: S },
    ],
  },
  {
    id: 'cute',
    emoji: '🐰',
    frameColorId: 'cream',
    stickers: [
      { emoji: '🐰', ...TL, scale: S },
      { emoji: '🌸', ...TR, scale: S },
      { emoji: '🎀', ...BL, scale: S },
      { emoji: '🌸', ...BR, scale: S },
    ],
  },
]
