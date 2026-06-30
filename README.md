# 인생네컷 📸

웹(PWA) 기반 네컷 사진 부스. 카운트다운에 맞춰 연속 촬영하고, 필터·프레임을 골라 한 장의 필름 스트립으로 합성·저장합니다.

## 기술 스택

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v4**
- **vite-plugin-pwa** — "홈 화면에 추가"로 앱처럼 설치
- **MediaDevices API**(카메라) + **Canvas API**(4컷 합성)

## 실행 방법

```bash
npm install
npm run dev        # Mac 브라우저용 (http://localhost:5173)
```

### 아이패드에서 테스트하기

카메라는 **보안 컨텍스트(HTTPS 또는 localhost)** 에서만 동작합니다.
아이패드는 Mac의 IP로 접속하므로 HTTPS가 필요합니다.

```bash
npm run dev:https  # 자체 서명 인증서로 HTTPS 서버 실행
```

1. Mac과 아이패드를 **같은 와이파이**에 연결
2. 터미널에 출력되는 `Network: https://<맥의-IP>:5173/` 주소를 아이패드 Safari에서 열기
3. 자체 서명 인증서 경고가 뜨면 **"고급 → 계속"** 으로 진행 (개발용)
4. 카메라 권한 허용
5. 공유 메뉴 → **"홈 화면에 추가"** 로 앱처럼 설치

## 빌드

```bash
npm run build      # 타입체크 + 프로덕션 빌드 (dist/)
npm run preview    # 빌드 결과 미리보기
```

## 구조

```
src/
  App.tsx                 # 화면 상태 머신 (home → camera → result)
  types.ts                # 필터·레이아웃·프레임 정의
  hooks/useCamera.ts      # getUserMedia 생명주기 관리
  utils/compose.ts        # 프레임 캡처 + 네컷 합성 (Canvas)
  components/
    HomeScreen.tsx        # 시작 화면
    CameraScreen.tsx      # 프리뷰·필터·카운트다운·연속 촬영
    ResultScreen.tsx      # 결과 합성·프레임 색상·저장/공유
```

## 기능

- **컷 수 커스텀**: 1 / 2 / 3 / 4 / 6 / 8컷 × 배치(세로 스트립 / 그리드) 자유 조합
- 필터 12종: 원본·뽀샤시·화사·선명·흑백·느와르·빈티지·필름·라떼·따뜻·쿨톤·민트 (촬영 중 라이브 미리보기 + 현재 필터 배지)
- 타이머: 3초 / 5초 / 10초
- **움직이는 GIF 네컷**: 컷마다 연속 프레임을 촬영해 부메랑 루프 GIF 생성·저장 (gifenc)
- **컷 재선택**: 완성 화면에서 마음에 안 드는 컷만 탭해서 단독 재촬영
- **프레임 커스텀**: 문구 직접 입력(기본값 오늘 날짜) · 색상 6종 · 테두리 두께 3단계 · 모서리 3단계
- **스티커·낙서**: 이모지 스티커(드래그·크기조절·삭제)와 펜 드로잉, 저장 시 합성
- **사운드**: WebAudio로 셔터음·카운트다운 비프 합성, 부드러운 BGM 루프, 음소거/BGM 토글
- **QR 공유**: 사진을 임시 호스트(24시간 자동 삭제)에 업로드 → 링크 QR 생성, 다른 기기로 스캔해 저장 (실패 시 Web Share 폴백)
- **갤러리**: 완성한 네컷(PNG/GIF)을 기기(IndexedDB)에 자동 보관 · 다시보기 · 공유 · 삭제
- **다국어**: 한국어 / 영어 토글 (localStorage 저장, 기기 언어 자동 감지)
- **콜라주 자유배치**: 스트립/콜라주 모드 전환, 각 컷을 드래그·크기·회전으로 자유 배치 → 정사각 합성
- **AI 배경제거**: @imgly/background-removal로 컷 배경을 제거해 프레임 색 위에 합성 (모델은 사용 시점에만 로드)
- **프레임 테마 세트**: 하트/생일/Y2K/크리스마스/큐트 — 스티커 세트 + 프레임 색상 원클릭 적용
- **내 BGM 업로드**: 오디오 파일을 BGM으로 올려 IndexedDB 보관, 기본 합성음과 선택
- **움직이는 영상(WebM/MP4)**: 버스트를 MediaRecorder로 녹화 (WebM 우선, Safari는 MP4 폴백)
- **실시간 AR 필터 16종**: MediaPipe 얼굴 추적 — 선글라스·왕관·하트눈·토끼·강아지·고양이·꽃왕관·별눈·중절모·졸업모·변장·광대코·눈물·반짝이·나비·파티 (라이브 + 촬영 합성, 데이터 기반이라 추가 쉬움)
- **클라우드 공유 링크**: 업로드 후 링크 복사 (QR과 함께)
- 전/후면 카메라 전환, 셀카 미러링
- 저장/공유 (iOS는 Web Share로 사진 앱에 바로 저장)

## 데모(목업) 기능 — 백엔드/계정 연결 시 실제화 가능

아래는 UX 흐름만 구현한 **데모**입니다. 실제 동작에는 표시된 인프라가 필요합니다.

- **프린트 주문/결제**: 사이즈·수량·합계·결제 흐름 (UI). 실제 결제는 Stripe 등 + 서버 필요
- **멀티 디바이스 동시 촬영**: 세션 코드 + QR 참여 화면. 실시간 동기화는 Supabase Realtime/WebSocket 서버 필요

## 폴더 구조 (추가분)

```
src/
  i18n.tsx                # 경량 다국어 (ko/en) 컨텍스트 + t()
  gifenc.d.ts             # gifenc 타입 선언
  components/
    PhotoEditor.tsx       # 스티커·펜 드로잉 에디터 (캔버스 합성 export)
    CollageEditor.tsx     # 콜라주 자유배치 에디터 (드래그·크기·회전)
    GalleryScreen.tsx     # 갤러리 그리드 + 뷰어
    SoundToggles.tsx      # 음소거 / BGM 토글 + BGM 업로드 시트
    LangToggle.tsx        # 한/영 토글
    PrintSheet.tsx        # 프린트 주문/결제 데모
    MultiDeviceSheet.tsx  # 멀티 디바이스 세션 데모
  hooks/
    useCamera.ts          # getUserMedia 생명주기
    useFaceAr.ts          # MediaPipe FaceLandmarker 추적 + AR 오버레이
  utils/
    compose.ts            # 프레임 캡처(+AR 합성) + 스트립 합성 (paintStrip 공유)
    ar.ts                 # AR 필터 정의 + 얼굴 앵커 + 이모지 오버레이 그리기
    gif.ts                # gifenc 기반 움직이는 GIF 합성
    video.ts              # MediaRecorder 기반 영상(WebM/MP4) 녹화
    bg.ts                 # AI 배경제거 (lazy import)
    gallery.ts            # IndexedDB 저장/조회/삭제 (사진)
    bgmStore.ts           # IndexedDB BGM 파일 보관
    sound.ts              # WebAudio 셔터음·비프·BGM + 업로드 트랙
    share.ts              # 임시 호스트 업로드 (QR용)
  types.ts                # 레이아웃 동적 생성, 테두리/모서리·테마 프리셋
```
