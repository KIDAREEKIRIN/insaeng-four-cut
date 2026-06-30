import { useEffect, useState } from 'react'
import type { Filter, Layout, Screen } from './types'
import { FILTERS, DEFAULT_LAYOUT, FRAME_COLORS } from './types'
import { setBgmTrack } from './utils/sound'
import { loadBgm } from './utils/bgmStore'
import HomeScreen from './components/HomeScreen'
import CameraScreen from './components/CameraScreen'
import ResultScreen from './components/ResultScreen'
import GalleryScreen from './components/GalleryScreen'

export default function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT)
  const [filter, setFilter] = useState<Filter>(FILTERS[0])
  const [frame, setFrame] = useState(FRAME_COLORS[0])
  const [shots, setShots] = useState<string[]>([])
  const [bursts, setBursts] = useState<string[][] | null>(null)
  const [retakeIndex, setRetakeIndex] = useState<number | null>(null)

  // restore a previously uploaded BGM track (without auto-playing — needs a gesture)
  useEffect(() => {
    loadBgm().then((saved) => {
      if (saved) setBgmTrack(saved.blob, saved.name)
    })
  }, [])

  const goCamera = () => {
    setShots([])
    setBursts(null)
    setRetakeIndex(null)
    setScreen('camera')
  }

  const goRetakeCut = (index: number) => {
    setRetakeIndex(index)
    setScreen('camera')
  }

  const handleComplete = (captured: string[], usedLayout: Layout, capturedBursts?: string[][]) => {
    if (retakeIndex !== null) {
      setShots((prev) => prev.map((s, i) => (i === retakeIndex ? captured[0] : s)))
      if (capturedBursts) {
        setBursts((prev) =>
          prev ? prev.map((b, i) => (i === retakeIndex ? capturedBursts[0] : b)) : prev,
        )
      }
      setRetakeIndex(null)
    } else {
      setShots(captured)
      setLayout(usedLayout)
      setBursts(capturedBursts ?? null)
    }
    setScreen('result')
  }

  return (
    <div className="grain vignette relative min-h-full w-full overflow-hidden">
      {screen === 'home' && (
        <HomeScreen onStart={goCamera} onGallery={() => setScreen('gallery')} />
      )}
      {screen === 'gallery' && (
        <GalleryScreen onHome={() => setScreen('home')} onShoot={goCamera} />
      )}
      {screen === 'camera' && (
        <CameraScreen
          filter={filter}
          onFilterChange={setFilter}
          onComplete={handleComplete}
          onBack={() => (retakeIndex !== null ? setScreen('result') : setScreen('home'))}
          retakeLayout={retakeIndex !== null ? layout : undefined}
          retakeGif={bursts !== null}
        />
      )}
      {screen === 'result' && (
        <ResultScreen
          shots={shots}
          bursts={bursts}
          layout={layout}
          frame={frame}
          onFrameChange={setFrame}
          onRetake={goCamera}
          onRetakeCut={goRetakeCut}
          onHome={() => setScreen('home')}
        />
      )}
    </div>
  )
}
