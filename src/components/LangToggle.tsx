import { useI18n } from '../i18n'

export default function LangToggle({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n()
  return (
    <button
      onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
      aria-label="language"
      className={`grid h-10 min-w-10 place-items-center rounded-full bg-white/10 px-3 text-sm font-bold text-[var(--color-paper)] backdrop-blur transition active:scale-90 ${className}`}
    >
      {lang === 'ko' ? '한' : 'EN'}
    </button>
  )
}
