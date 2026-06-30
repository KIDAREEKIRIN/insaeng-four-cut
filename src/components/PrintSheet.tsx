import { useState } from 'react'
import { useI18n } from '../i18n'

interface Props {
  preview: string | null
  onClose: () => void
}

const SIZES = [
  { id: '4x6', label: '4 × 6', price: 500 },
  { id: 'card', label: '카드', price: 1000 },
  { id: 'strip', label: '스트립', price: 800 },
] as const

export default function PrintSheet({ preview, onClose }: Props) {
  const { t } = useI18n()
  const [sizeId, setSizeId] = useState<string>('4x6')
  const [qty, setQty] = useState(1)
  const [order, setOrder] = useState<string | null>(null)

  const size = SIZES.find((s) => s.id === sizeId) ?? SIZES[0]
  const total = size.price * qty

  function pay() {
    // demo only — no real payment is processed
    setOrder(String(Date.now()).slice(-6))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-3xl bg-[var(--color-ink-card)] p-6 sm:rounded-3xl"
      >
        <h3 className="mb-1 text-center text-xl text-[var(--color-paper)]" style={{ fontFamily: 'var(--font-display)' }}>
          {t('print.title')}
        </h3>
        <p className="mb-4 text-center text-[11px] text-[var(--color-shutter)]">{t('print.demo')}</p>

        {order ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-5xl">📦</span>
            <p className="text-[var(--color-paper)]">{t('print.done')}</p>
            <p className="text-sm text-[var(--color-paper-dim)]">
              {t('print.orderNo')}: #{order}
            </p>
            <button onClick={onClose} className="mt-2 rounded-full bg-[var(--color-shutter)] px-8 py-2.5 font-bold text-white">
              {t('common_close')}
            </button>
          </div>
        ) : (
          <>
            {preview && (
              <img src={preview} alt="" className="mx-auto mb-4 max-h-40 w-auto rounded-lg" />
            )}

            <p className="mb-1.5 text-xs tracking-widest text-[var(--color-paper-dim)]">{t('print.size')}</p>
            <div className="mb-4 flex gap-2">
              {SIZES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSizeId(s.id)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-bold transition ${
                    sizeId === s.id ? 'bg-[var(--color-paper)] text-[var(--color-ink)]' : 'bg-white/8 text-[var(--color-paper-dim)]'
                  }`}
                >
                  {s.label}
                  <span className="block text-[10px] opacity-70">₩{s.price}</span>
                </button>
              ))}
            </div>

            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs tracking-widest text-[var(--color-paper-dim)]">{t('print.qty')}</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-8 w-8 rounded-full bg-white/10 text-lg text-[var(--color-paper)]">−</button>
                <span className="w-6 text-center font-bold text-[var(--color-paper)]">{qty}</span>
                <button onClick={() => setQty((q) => Math.min(20, q + 1))} className="h-8 w-8 rounded-full bg-white/10 text-lg text-[var(--color-paper)]">+</button>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between border-t border-white/10 pt-3">
              <span className="font-bold text-[var(--color-paper)]">{t('print.total')}</span>
              <span className="text-lg font-bold text-[var(--color-shutter)]">₩{total.toLocaleString()}</span>
            </div>

            <button onClick={pay} className="w-full rounded-full bg-[var(--color-shutter)] py-3.5 font-bold text-white transition active:scale-95">
              {t('print.pay')} · ₩{total.toLocaleString()}
            </button>
            <button onClick={onClose} className="mt-2 w-full rounded-full bg-white/8 py-3 text-sm font-bold text-[var(--color-paper-dim)]">
              {t('common_close')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
