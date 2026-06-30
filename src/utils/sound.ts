/**
 * Tiny WebAudio sound engine — no asset files.
 * Shutter clicks and countdown beeps are synthesized on the fly, and a soft
 * arpeggio loop provides optional background music.
 */

let ctx: AudioContext | null = null

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

const MUTE_KEY = 'inc-muted'

function readBool(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
function writeBool(key: string, v: boolean) {
  try {
    localStorage.setItem(key, v ? '1' : '0')
  } catch {
    /* ignore */
  }
}

let muted = readBool(MUTE_KEY)

export function isMuted() {
  return muted
}
export function setMuted(m: boolean) {
  muted = m
  writeBool(MUTE_KEY, m)
  if (m) stopBgm()
}

/** countdown beep; `final` = the last tick before the shot */
export function playTick(final = false) {
  if (muted) return
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.value = final ? 880 : 560
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(final ? 0.22 : 0.13, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + (final ? 0.22 : 0.11))
  o.connect(g).connect(c.destination)
  o.start(t)
  o.stop(t + 0.3)
}

/** camera shutter — a short filtered noise burst */
export function playShutter() {
  if (muted) return
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const dur = 0.09
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) {
    const decay = Math.pow(1 - i / data.length, 2.5)
    data[i] = (Math.random() * 2 - 1) * decay
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const hp = c.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1400
  const g = c.createGain()
  g.gain.value = 0.4
  src.connect(hp).connect(g).connect(c.destination)
  src.start(t)
}

// ---- background music ----
let bgmGain: GainNode | null = null
let bgmTimer: ReturnType<typeof setInterval> | null = null
let bgmOn = false
let step = 0
// gentle C-major pentatonic loop
const NOTES = [523.25, 659.25, 783.99, 659.25, 587.33, 783.99]

// user-uploaded BGM track (overrides the synth loop when present)
let trackEl: HTMLAudioElement | null = null
let trackUrl: string | null = null
let trackName: string | null = null

/** set (or clear with null) the custom BGM track from a Blob */
export function setBgmTrack(blob: Blob | null, name?: string) {
  const wasPlaying = bgmOn
  stopBgm()
  if (trackUrl) {
    URL.revokeObjectURL(trackUrl)
    trackUrl = null
  }
  if (blob) {
    trackUrl = URL.createObjectURL(blob)
    trackEl = new Audio(trackUrl)
    trackEl.loop = true
    trackEl.volume = 0.6
    trackName = name ?? '내 음악'
  } else {
    trackEl = null
    trackName = null
  }
  if (wasPlaying) startBgm()
}

export function getBgmTrackName(): string | null {
  return trackName
}

function bgmNote() {
  const c = ac()
  if (!c || !bgmGain) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'triangle'
  o.frequency.value = NOTES[step % NOTES.length]
  step++
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(0.1, t + 0.06)
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
  o.connect(g).connect(bgmGain)
  o.start(t)
  o.stop(t + 0.8)
}

export function startBgm() {
  if (bgmOn) return
  bgmOn = true

  // custom uploaded track takes priority over the synth loop
  if (trackEl) {
    ac() // resume audio context on the user gesture
    trackEl.currentTime = 0
    void trackEl.play().catch(() => {})
    return
  }

  const c = ac()
  if (!c) {
    bgmOn = false
    return
  }
  if (!bgmGain) {
    bgmGain = c.createGain()
    bgmGain.gain.value = 0.5
    bgmGain.connect(c.destination)
  }
  step = 0
  bgmNote()
  bgmTimer = setInterval(bgmNote, 560)
}

export function stopBgm() {
  bgmOn = false
  if (bgmTimer) {
    clearInterval(bgmTimer)
    bgmTimer = null
  }
  if (trackEl) {
    trackEl.pause()
  }
}

export function toggleBgm(): boolean {
  if (bgmOn) stopBgm()
  else startBgm()
  return bgmOn
}

export function isBgmOn() {
  return bgmOn
}
