import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'ko' | 'en'

type Dict = Record<string, string>

const ko: Dict = {
  'brand.full': '기산네컷',
  'home.badge': '● REC · 나만의 사진 부스',
  'home.titleA': '기산',
  'home.titleB': '네컷',
  'home.subtitle': '카운트다운에 맞춰 네 컷을 찍고,\n나만의 프레임으로 완성해 보세요.',
  'home.start': '촬영 시작',
  'home.gallery': '🖼️ 갤러리 보기',
  'home.pwa': '홈 화면에 추가하면 앱처럼 사용할 수 있어요',

  'cam.back': '뒤로',
  'cam.switch': '카메라 전환',
  'cam.shutter': '촬영 시작',
  'cam.retakeHeader': '컷 다시찍기',
  'cam.preparing': '카메라 준비 중…',
  'cam.retry': '다시 시도',
  'cam.cuts': '컷수',
  'cam.cut': '{n}컷',
  'cam.gifOn': '🎞 움직이는 GIF ON',
  'cam.gifOff': '🎞 움직이는 GIF OFF',
  'cam.shooting': '촬영 중… 자세를 잡아 주세요!',
  'cam.retakeHint': '이 컷만 다시 찍어요',
  'cam.startHint': '버튼을 누르면 {n}컷 연속 촬영',
  'cam.sec': '{n}초',
  'cam.arNone': '없음',

  'err.unsupported': '이 브라우저는 카메라를 지원하지 않아요.',
  'err.insecure': '카메라는 HTTPS 또는 localhost에서만 동작해요.',
  'err.denied': '카메라 권한이 거부됐어요. 설정에서 허용해 주세요.',
  'err.notfound': '사용 가능한 카메라를 찾지 못했어요.',
  'err.generic': '카메라를 열 수 없어요. 다시 시도해 주세요.',

  'arr.strip': '세로 스트립',
  'arr.grid': '그리드',

  'filter.original': '원본',
  'filter.soft': '뽀샤시',
  'filter.bright': '화사',
  'filter.vivid': '선명',
  'filter.mono': '흑백',
  'filter.noir': '느와르',
  'filter.vintage': '빈티지',
  'filter.film': '필름',
  'filter.latte': '라떼',
  'filter.warm': '따뜻',
  'filter.cool': '쿨톤',
  'filter.mint': '민트',

  'res.done': '완성! ✨',
  'res.composing': '합성 중…',
  'res.retakeSection': '컷 다시찍기 (탭하면 그 컷만 재촬영)',
  'res.caption': '문구',
  'res.captionPlaceholder': '문구를 입력하세요',
  'res.dateBtn': '날짜',
  'res.frameColor': '프레임 색상',
  'res.border': '테두리',
  'res.corner': '모서리',
  'border.slim': '좁게',
  'border.normal': '보통',
  'border.wide': '넓게',
  'radius.sharp': '각지게',
  'radius.round': '둥글게',
  'radius.rounder': '더둥글게',
  'res.savedAgain': '저장됨 · 다시 저장',
  'res.saveShare': '저장 / 공유',
  'res.saveImg': '이미지 저장',
  'res.gifSave': '🎞 움직이는 GIF 저장',
  'res.gifMaking': '🎞 GIF 만드는 중…',
  'res.retakeAll': '다시 찍기',
  'res.home': '처음으로',
  'res.autosave': '저장하면 갤러리에도 자동 보관돼요',
  'res.ariaQr': 'QR로 공유',

  'qr.title': 'QR로 공유',
  'qr.uploading': '사진 업로드 중…',
  'qr.scan': '다른 기기 카메라로 스캔하면 사진이 열려요.\n링크는 24시간 후 자동 삭제됩니다.',
  'qr.fail': '업로드에 실패했어요.\n대신 저장/공유로 보낼 수 있어요.',
  'qr.switch': '저장 / 공유로 전환',
  'qr.copy': '🔗 링크 복사',
  'qr.copied': '복사됨!',

  'print.order': '🖨 프린트 주문',
  'print.title': '프린트 주문',
  'print.size': '사이즈',
  'print.qty': '수량',
  'print.total': '합계',
  'print.pay': '결제하기',
  'print.demo': '데모 · 실제 결제는 되지 않아요',
  'print.done': '주문이 접수됐어요! (데모)',
  'print.orderNo': '주문번호',
  'print.self': '🖨 내 프린터로 바로 인쇄',
  'print.selfHint': 'AirPrint·연결된 프린터로 실제 출력돼요',
  'print.orderTitle': '프린트 주문 (데모)',

  'multi.start': '👥 함께 찍기',
  'multi.title': '함께 찍기',
  'multi.code': '세션 코드',
  'multi.scan': '다른 기기에서 이 QR을 스캔해 참여하세요',
  'multi.waiting': '참여자 대기 중…',
  'multi.demo': '데모 · 실시간 동기화는 백엔드(서버)가 필요해요',

  'gif.title': '움직이는 네컷 🎞',
  'gif.saveShare': 'GIF 저장 / 공유',
  'gif.save': 'GIF 저장',

  'video.save': '🎬 영상 저장',
  'video.making': '🎬 영상 만드는 중…',
  'video.title': '움직이는 영상 🎬',
  'video.saveShare': '영상 저장 / 공유',
  'video.saveOnly': '영상 저장',

  'gallery.title': '갤러리',
  'gallery.loading': '불러오는 중…',
  'gallery.empty': '아직 저장한 네컷이 없어요.',
  'gallery.shoot': '촬영하러 가기',
  'gallery.save': '저장 / 공유',
  'gallery.saveOnly': '저장',

  'editor.pen': '✏️ 펜',
  'editor.sticker': '😀 스티커',
  'editor.undo': '↩︎ 되돌리기',
  'editor.clear': '전체 지우기',
  'editor.size': '크기',

  'bgm.title': '배경음악',
  'bgm.settings': '배경음악 설정',
  'bgm.synth': '기본 사운드',
  'bgm.upload': '내 음악 올리기',
  'bgm.now': '현재',
  'bgm.playing': '재생 중',

  'theme.title': '테마',
  'mode.strip': '스트립',
  'mode.collage': '콜라주',
  'collage.rotate': '회전',
  'collage.hint': '사진을 드래그해 자유롭게 배치하세요',
  'bg.remove': '🪄 AI 배경 제거',
  'bg.restore': '🖼 원본 배경',
  'bg.processing': '배경 제거 중… {n}/{t}',

  common_close: '닫기',
  common_delete: '삭제',
}

const en: Dict = {
  'brand.full': 'GISAN4CUT',
  'home.badge': '● REC · Your photo booth',
  'home.titleA': 'GISAN',
  'home.titleB': '4CUT',
  'home.subtitle': 'Snap four shots on the countdown,\nthen finish with your own frame.',
  'home.start': 'Start',
  'home.gallery': '🖼️ Gallery',
  'home.pwa': 'Add to Home Screen to use it like an app',

  'cam.back': 'Back',
  'cam.switch': 'Switch camera',
  'cam.shutter': 'Take photos',
  'cam.retakeHeader': 'Retake cut',
  'cam.preparing': 'Preparing camera…',
  'cam.retry': 'Try again',
  'cam.cuts': 'Cuts',
  'cam.cut': '{n}',
  'cam.gifOn': '🎞 Live GIF ON',
  'cam.gifOff': '🎞 Live GIF OFF',
  'cam.shooting': 'Shooting… strike a pose!',
  'cam.retakeHint': 'Retaking just this cut',
  'cam.startHint': 'Press to shoot {n} in a row',
  'cam.sec': '{n}s',
  'cam.arNone': 'None',

  'err.unsupported': "This browser doesn't support the camera.",
  'err.insecure': 'The camera works only on HTTPS or localhost.',
  'err.denied': 'Camera permission denied. Please allow it in settings.',
  'err.notfound': 'No available camera found.',
  'err.generic': "Couldn't open the camera. Please try again.",

  'arr.strip': 'Vertical',
  'arr.grid': 'Grid',

  'filter.original': 'Original',
  'filter.soft': 'Soft',
  'filter.bright': 'Bright',
  'filter.vivid': 'Vivid',
  'filter.mono': 'B&W',
  'filter.noir': 'Noir',
  'filter.vintage': 'Vintage',
  'filter.film': 'Film',
  'filter.latte': 'Latte',
  'filter.warm': 'Warm',
  'filter.cool': 'Cool',
  'filter.mint': 'Mint',

  'res.done': 'Done! ✨',
  'res.composing': 'Composing…',
  'res.retakeSection': 'Retake a cut (tap to reshoot it)',
  'res.caption': 'Caption',
  'res.captionPlaceholder': 'Enter text',
  'res.dateBtn': 'Date',
  'res.frameColor': 'Frame color',
  'res.border': 'Border',
  'res.corner': 'Corner',
  'border.slim': 'Thin',
  'border.normal': 'Normal',
  'border.wide': 'Wide',
  'radius.sharp': 'Sharp',
  'radius.round': 'Round',
  'radius.rounder': 'Rounder',
  'res.savedAgain': 'Saved · Save again',
  'res.saveShare': 'Save / Share',
  'res.saveImg': 'Save image',
  'res.gifSave': '🎞 Save live GIF',
  'res.gifMaking': '🎞 Making GIF…',
  'res.retakeAll': 'Reshoot',
  'res.home': 'Home',
  'res.autosave': 'Saving also keeps a copy in the gallery',
  'res.ariaQr': 'Share via QR',

  'qr.title': 'Share via QR',
  'qr.uploading': 'Uploading photo…',
  'qr.scan': 'Scan with another device to open the photo.\nThe link auto-deletes after 24 hours.',
  'qr.fail': 'Upload failed.\nYou can use Save / Share instead.',
  'qr.switch': 'Switch to Save / Share',
  'qr.copy': '🔗 Copy link',
  'qr.copied': 'Copied!',

  'print.order': '🖨 Order prints',
  'print.title': 'Order prints',
  'print.size': 'Size',
  'print.qty': 'Qty',
  'print.total': 'Total',
  'print.pay': 'Pay',
  'print.demo': 'Demo · no real payment',
  'print.done': 'Order received! (demo)',
  'print.orderNo': 'Order no.',
  'print.self': '🖨 Print on my printer',
  'print.selfHint': 'Really prints via AirPrint / a connected printer',
  'print.orderTitle': 'Order prints (demo)',

  'multi.start': '👥 Shoot together',
  'multi.title': 'Shoot together',
  'multi.code': 'Session code',
  'multi.scan': 'Scan this QR on another device to join',
  'multi.waiting': 'Waiting for others…',
  'multi.demo': 'Demo · live sync needs a backend server',

  'gif.title': 'Live four-cut 🎞',
  'gif.saveShare': 'Save / Share GIF',
  'gif.save': 'Save GIF',

  'video.save': '🎬 Save video',
  'video.making': '🎬 Making video…',
  'video.title': 'Live video 🎬',
  'video.saveShare': 'Save / Share video',
  'video.saveOnly': 'Save video',

  'gallery.title': 'Gallery',
  'gallery.loading': 'Loading…',
  'gallery.empty': 'No saved cuts yet.',
  'gallery.shoot': 'Go shoot',
  'gallery.save': 'Save / Share',
  'gallery.saveOnly': 'Save',

  'editor.pen': '✏️ Pen',
  'editor.sticker': '😀 Sticker',
  'editor.undo': '↩︎ Undo',
  'editor.clear': 'Clear all',
  'editor.size': 'Size',

  'bgm.title': 'Background music',
  'bgm.settings': 'Music settings',
  'bgm.synth': 'Default sound',
  'bgm.upload': 'Upload my music',
  'bgm.now': 'Now',
  'bgm.playing': 'Playing',

  'theme.title': 'Theme',
  'mode.strip': 'Strip',
  'mode.collage': 'Collage',
  'collage.rotate': 'Rotate',
  'collage.hint': 'Drag the photos to arrange them freely',
  'bg.remove': '🪄 AI remove BG',
  'bg.restore': '🖼 Original BG',
  'bg.processing': 'Removing BG… {n}/{t}',

  common_close: 'Close',
  common_delete: 'Delete',
}

const DICTS: Record<Lang, Dict> = { ko, en }

interface I18nValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nValue | null>(null)

function readLang(): Lang {
  try {
    const saved = localStorage.getItem('inc-lang')
    if (saved === 'ko' || saved === 'en') return saved
    return navigator.language?.startsWith('ko') ? 'ko' : 'en'
  } catch {
    return 'ko'
  }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readLang)

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem('inc-lang', l)
    } catch {
      /* ignore */
    }
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = DICTS[lang][key] ?? key
      if (vars) {
        for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
      }
      return s
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
