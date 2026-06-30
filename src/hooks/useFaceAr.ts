import { useEffect, useRef, useState } from 'react'
import {
  centerCropNorm,
  drawAr,
  faceAnchors,
  type ArFilterId,
  type FaceAnchors,
} from '../utils/ar'

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
const MODEL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

interface Opts {
  filterId: ArFilterId
  facingMode: 'user' | 'environment'
  enabled: boolean
}

interface FaceLandmarkerLike {
  detectForVideo: (v: HTMLVideoElement, ts: number) => { faceLandmarks?: { x: number; y: number }[][] }
  close?: () => void
}

/**
 * Loads MediaPipe FaceLandmarker (lazily, only when AR is enabled), runs it on
 * the live video each frame, draws the AR overlay, and exposes the latest face
 * anchors so captures can bake the effect in.
 */
export function useFaceAr(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  overlayRef: React.RefObject<HTMLCanvasElement | null>,
  opts: Opts,
) {
  const anchorsRef = useRef<FaceAnchors | null>(null)
  const [ready, setReady] = useState(false)
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    if (!opts.enabled) return
    let cancelled = false
    let raf = 0
    let landmarker: FaceLandmarkerLike | null = null

    async function init() {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision')
        const vision = await FilesetResolver.forVisionTasks(WASM)
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
        })
        if (cancelled) {
          lm.close?.()
          return
        }
        landmarker = lm as unknown as FaceLandmarkerLike
        setReady(true)
        loop()
      } catch {
        if (!cancelled) setReady(false)
      }
    }

    function loop() {
      raf = requestAnimationFrame(loop)
      const v = videoRef.current
      const o = optsRef.current
      if (!v || !v.videoWidth || !landmarker) return
      try {
        const res = landmarker.detectForVideo(v, performance.now())
        const face = res.faceLandmarks?.[0]
        anchorsRef.current = face ? faceAnchors(face) : null
      } catch {
        anchorsRef.current = null
      }
      paint(o)
    }

    function paint(o: Opts) {
      const canvas = overlayRef.current
      const v = videoRef.current
      if (!canvas || !v) return
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return
      const dpr = window.devicePixelRatio || 1
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr
        canvas.height = h * dpr
      }
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      const a = anchorsRef.current
      if (o.filterId !== 'none' && a) {
        const crop = centerCropNorm(v.videoWidth, v.videoHeight, w / h)
        drawAr(ctx, w, h, crop, o.facingMode === 'user', a, o.filterId)
      }
    }

    init()
    return () => {
      cancelled = true
      if (raf) cancelAnimationFrame(raf)
      landmarker?.close?.()
      landmarker = null
      setReady(false)
    }
  }, [opts.enabled, videoRef, overlayRef])

  return { anchorsRef, ready }
}
