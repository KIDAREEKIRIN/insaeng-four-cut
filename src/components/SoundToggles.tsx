import { useRef, useState } from 'react'
import { isBgmOn, isMuted, setMuted, toggleBgm, setBgmTrack, getBgmTrackName, startBgm } from '../utils/sound'
import { saveBgm, clearBgm } from '../utils/bgmStore'
import { useI18n } from '../i18n'

interface Props {
  className?: string
}

export default function SoundToggles({ className = '' }: Props) {
  const { t } = useI18n()
  const [muted, setMutedState] = useState(isMuted())
  const [bgm, setBgm] = useState(isBgmOn())
  const [sheet, setSheet] = useState(false)
  const [track, setTrack] = useState<string | null>(getBgmTrackName())
  const fileRef = useRef<HTMLInputElement>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBgmTrack(file, file.name)
    saveBgm(file, file.name).catch(() => {})
    setTrack(file.name)
    // play it right away (this click is a user gesture)
    startBgm()
    setBgm(true)
    setSheet(false)
  }

  function useSynth() {
    setBgmTrack(null)
    clearBgm().catch(() => {})
    setTrack(null)
  }

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={() => {
            const next = !muted
            setMuted(next)
            setMutedState(next)
            if (next) setBgm(false)
          }}
          aria-label={muted ? '소리 켜기' : '소리 끄기'}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg backdrop-blur transition active:scale-90"
        >
          {muted ? '🔇' : '🔊'}
        </button>
        <button
          onClick={() => setBgm(toggleBgm())}
          aria-label={t('bgm.title')}
          className={`grid h-10 w-10 place-items-center rounded-full text-lg backdrop-blur transition active:scale-90 ${
            bgm ? 'bg-[var(--color-shutter)]' : 'bg-white/10'
          }`}
        >
          🎵
        </button>
        <button
          onClick={() => setSheet(true)}
          aria-label={t('bgm.settings')}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-base backdrop-blur transition active:scale-90"
        >
          ⚙
        </button>
      </div>

      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onFile} />

      {sheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur sm:items-center"
          onClick={() => setSheet(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-3xl bg-[var(--color-ink-card)] p-6 sm:rounded-3xl"
          >
            <h3 className="mb-4 text-center text-xl text-[var(--color-paper)]" style={{ fontFamily: 'var(--font-display)' }}>
              {t('bgm.title')}
            </h3>

            <p className="mb-3 text-center text-xs text-[var(--color-paper-dim)]">
              {t('bgm.now')}: {track ?? t('bgm.synth')}
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => fileRef.current?.click()}
                className="rounded-full bg-[var(--color-shutter)] py-3.5 font-bold text-white transition active:scale-95"
              >
                🎧 {t('bgm.upload')}
              </button>
              <button
                onClick={useSynth}
                className={`rounded-full py-3.5 font-bold transition active:scale-95 ${
                  track === null
                    ? 'bg-[var(--color-paper)] text-[var(--color-ink)]'
                    : 'bg-white/8 text-[var(--color-paper)]'
                }`}
              >
                🎼 {t('bgm.synth')}
              </button>
              <button
                onClick={() => setSheet(false)}
                className="mt-1 rounded-full bg-white/8 py-3 text-sm font-bold text-[var(--color-paper-dim)]"
              >
                {t('common_close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
