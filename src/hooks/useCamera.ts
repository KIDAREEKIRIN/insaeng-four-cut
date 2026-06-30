import { useCallback, useEffect, useRef, useState } from 'react'

type FacingMode = 'user' | 'environment'

export type CameraErrorCode =
  | 'unsupported'
  | 'insecure'
  | 'denied'
  | 'notfound'
  | 'generic'

interface UseCameraResult {
  videoRef: React.RefObject<HTMLVideoElement | null>
  ready: boolean
  error: CameraErrorCode | null
  facingMode: FacingMode
  switchCamera: () => void
  retry: () => void
}

/**
 * Manages the getUserMedia lifecycle for the live preview.
 * Note: camera access requires a secure context (https or localhost).
 */
export function useCamera(active: boolean): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<CameraErrorCode | null>(null)
  const [facingMode, setFacingMode] = useState<FacingMode>('user')
  const [nonce, setNonce] = useState(0)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  useEffect(() => {
    if (!active) {
      stop()
      return
    }

    let cancelled = false

    async function start() {
      setError(null)
      setReady(false)

      if (!navigator.mediaDevices?.getUserMedia) {
        setError('unsupported')
        return
      }
      if (!window.isSecureContext) {
        setError('insecure')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode,
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
          setReady(true)
        }
      } catch (err) {
        if (cancelled) return
        const name = (err as DOMException)?.name
        if (name === 'NotAllowedError') {
          setError('denied')
        } else if (name === 'NotFoundError') {
          setError('notfound')
        } else {
          setError('generic')
        }
      }
    }

    start()
    return () => {
      cancelled = true
      stop()
    }
  }, [active, facingMode, nonce, stop])

  const switchCamera = useCallback(() => {
    setFacingMode((m) => (m === 'user' ? 'environment' : 'user'))
  }, [])

  const retry = useCallback(() => setNonce((n) => n + 1), [])

  return { videoRef, ready, error, facingMode, switchCamera, retry }
}
