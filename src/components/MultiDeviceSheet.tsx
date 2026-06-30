import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useI18n } from '../i18n'

interface Props {
  onClose: () => void
}

function makeCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  // Date-based seed (Math.random is fine in app runtime)
  let s = ''
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

export default function MultiDeviceSheet({ onClose }: Props) {
  const { t } = useI18n()
  const [code] = useState(makeCode)
  const [qr, setQr] = useState<string | null>(null)

  const joinUrl = `${location.origin}${location.pathname}?join=${code}`

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { margin: 1, width: 320, color: { dark: '#1a1714', light: '#f5ece0' } }).then(setQr)
  }, [joinUrl])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 text-center backdrop-blur" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-xs flex-col items-center gap-4 rounded-3xl bg-[var(--color-ink-card)] p-6"
      >
        <h3 className="text-xl text-[var(--color-paper)]" style={{ fontFamily: 'var(--font-display)' }}>
          {t('multi.title')}
        </h3>

        {qr && <img src={qr} alt="" className="h-52 w-52 rounded-xl" />}

        <div>
          <p className="text-xs tracking-widest text-[var(--color-paper-dim)]">{t('multi.code')}</p>
          <p className="text-2xl font-bold tracking-[0.3em] text-[var(--color-paper)]">{code}</p>
        </div>

        <p className="text-xs text-[var(--color-paper-dim)]">{t('multi.scan')}</p>

        <div className="flex items-center gap-2 text-sm text-[var(--color-paper-dim)]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-shutter)]" />
          {t('multi.waiting')}
        </div>

        <p className="rounded-xl bg-[var(--color-shutter)]/15 px-3 py-2 text-[11px] leading-relaxed text-[var(--color-shutter)]">
          {t('multi.demo')}
        </p>

        <button onClick={onClose} className="rounded-full bg-white/8 px-8 py-2.5 text-sm font-bold text-[var(--color-paper)]">
          {t('common_close')}
        </button>
      </div>
    </div>
  )
}
