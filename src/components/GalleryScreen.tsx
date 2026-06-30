import { useEffect, useState } from 'react'
import { deleteFromGallery, listGallery, type GalleryItem } from '../utils/gallery'
import { useI18n } from '../i18n'

interface Props {
  onHome: () => void
  onShoot: () => void
}

function dataUrlToFile(dataUrl: string, name: string): File {
  const [head, body] = dataUrl.split(',')
  const mime = head.match(/:(.*?);/)?.[1] ?? 'image/png'
  const bin = atob(body)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return new File([arr], name, { type: mime })
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function GalleryScreen({ onHome, onShoot }: Props) {
  const { t } = useI18n()
  const [items, setItems] = useState<GalleryItem[] | null>(null)
  const [active, setActive] = useState<GalleryItem | null>(null)
  const canShare = typeof navigator !== 'undefined' && !!navigator.canShare

  useEffect(() => {
    listGallery().then(setItems)
  }, [])

  async function handleSave(item: GalleryItem) {
    const ext = item.dataUrl.startsWith('data:image/gif') ? 'gif' : 'png'
    const file = dataUrlToFile(item.dataUrl, `인생네컷_${item.createdAt}.${ext}`)
    if (canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: t('brand.full') })
        return
      } catch {
        /* fall through */
      }
    }
    const a = document.createElement('a')
    a.href = item.dataUrl
    a.download = file.name
    a.click()
  }

  async function handleDelete(item: GalleryItem) {
    await deleteFromGallery(item.id)
    setItems((prev) => (prev ? prev.filter((i) => i.id !== item.id) : prev))
    setActive(null)
  }

  return (
    <div className="relative flex min-h-full flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+18px)]">
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onHome}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-[var(--color-paper)]"
          aria-label={t('cam.back')}
        >
          ←
        </button>
        <h2 className="text-2xl text-[var(--color-paper)]" style={{ fontFamily: 'var(--font-display)' }}>
          {t('gallery.title')}
        </h2>
        <div className="h-10 w-10" />
      </div>

      {items === null ? (
        <div className="flex flex-1 items-center justify-center">
          <span className="animate-pulse text-[var(--color-paper-dim)]">{t('gallery.loading')}</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <span className="text-5xl">📷</span>
          <p className="text-[var(--color-paper-dim)]">{t('gallery.empty')}</p>
          <button
            onClick={onShoot}
            className="mt-2 rounded-full bg-[var(--color-shutter)] px-6 py-2.5 font-bold text-white"
          >
            {t('gallery.shoot')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item)}
              className="group relative aspect-[3/4] overflow-hidden rounded-lg bg-[var(--color-ink-card)] transition active:scale-95"
            >
              <img src={item.dataUrl} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* viewer modal */}
      {active && (
        <div
          className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-black/85 p-6 backdrop-blur"
          onClick={() => setActive(null)}
        >
          <img
            src={active.dataUrl}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[62vh] w-auto rounded-xl shadow-2xl"
          />
          <p className="text-xs text-[var(--color-paper-dim)]">{formatDate(active.createdAt)}</p>
          <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => handleSave(active)}
              className="rounded-full bg-[var(--color-shutter)] px-6 py-3 font-bold text-white"
            >
              {canShare ? t('gallery.save') : t('gallery.saveOnly')}
            </button>
            <button
              onClick={() => handleDelete(active)}
              className="rounded-full bg-white/10 px-6 py-3 font-bold text-[var(--color-paper)]"
            >
              {t('common_delete')}
            </button>
            <button
              onClick={() => setActive(null)}
              className="rounded-full bg-white/10 px-6 py-3 font-bold text-[var(--color-paper)]"
            >
              {t('common_close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
