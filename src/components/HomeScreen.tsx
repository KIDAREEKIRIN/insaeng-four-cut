import { useState } from 'react'
import SoundToggles from './SoundToggles'
import LangToggle from './LangToggle'
import MultiDeviceSheet from './MultiDeviceSheet'
import { useI18n } from '../i18n'

interface Props {
  onStart: () => void
  onGallery: () => void
}

export default function HomeScreen({ onStart, onGallery }: Props) {
  const { t } = useI18n()
  const [showMulti, setShowMulti] = useState(false)
  return (
    <div className="relative flex min-h-full flex-col items-center justify-center px-6 py-16 text-center">
      <div className="absolute right-5 top-[calc(env(safe-area-inset-top)+16px)] z-20 flex items-center gap-2">
        <LangToggle />
        <SoundToggles />
      </div>
      {/* floating film strips for atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
        <div className="animate-shimmer absolute -left-10 top-16 h-44 w-20 rotate-[-8deg] rounded-md bg-[var(--color-ink-card)] shadow-2xl" />
        <div
          className="animate-shimmer absolute -right-8 bottom-24 h-52 w-24 rotate-[10deg] rounded-md bg-[var(--color-ink-card)] shadow-2xl"
          style={{ animationDelay: '1.2s' }}
        />
      </div>

      <div className="animate-slide-up relative z-10 flex flex-col items-center">
        {/* mascot — uses your mascot.png if present, otherwise the built-in SVG */}
        <img
          src={`${import.meta.env.BASE_URL}mascot.png`}
          onError={(e) => {
            const img = e.currentTarget
            if (!img.src.endsWith('mascot.svg')) img.src = `${import.meta.env.BASE_URL}mascot.svg`
          }}
          alt="기산네컷 마스코트"
          className="animate-shimmer mb-3 h-40 w-40 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)] sm:h-48 sm:w-48"
          draggable={false}
        />

        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs tracking-widest text-[var(--color-paper-dim)]">
          {t('home.badge')}
        </span>

        <h1
          className="text-7xl leading-none text-[var(--color-paper)] sm:text-8xl"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {t('home.titleA')}
          <span className="text-[var(--color-shutter)]">{t('home.titleB')}</span>
        </h1>

        <p className="mt-6 max-w-xs whitespace-pre-line text-base leading-relaxed text-[var(--color-paper-dim)]">
          {t('home.subtitle')}
        </p>

        <button
          onClick={onStart}
          className="group mt-12 flex items-center gap-3 rounded-full bg-[var(--color-shutter)] px-9 py-4 text-lg font-bold text-white shadow-[0_10px_40px_-8px_var(--color-shutter)] transition active:scale-95"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-white/80">
            <span className="h-3 w-3 rounded-full bg-white transition group-active:scale-75" />
          </span>
          {t('home.start')}
        </button>

        <div className="mt-5 flex gap-2">
          <button
            onClick={onGallery}
            className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-bold text-[var(--color-paper-dim)] transition active:scale-95"
          >
            {t('home.gallery')}
          </button>
          <button
            onClick={() => setShowMulti(true)}
            className="rounded-full border border-white/15 bg-white/5 px-6 py-2.5 text-sm font-bold text-[var(--color-paper-dim)] transition active:scale-95"
          >
            {t('multi.start')}
          </button>
        </div>

        <p className="mt-10 text-xs text-[var(--color-paper-dim)]/60">{t('home.pwa')}</p>
      </div>

      {showMulti && <MultiDeviceSheet onClose={() => setShowMulti(false)} />}
    </div>
  )
}
