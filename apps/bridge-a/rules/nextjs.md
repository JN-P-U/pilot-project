# Next.js App Router 코딩 규칙 (OSMU 구조)

## 디렉터리 구조
- `app/` : App Router 페이지 및 레이아웃
- `app/[feature]/page.tsx` : 기능별 페이지 컴포넌트
- `components/` : 공통 UI 컴포넌트
- `lib/` : 유틸리티, API 클라이언트
- `types/` : 전역 타입 정의

## 컴포넌트 규칙
- 브라우저 API(window, document, localStorage)는 반드시 `"use client"` 컴포넌트에서만 사용
- SSR 경로에서 브라우저 API 직접 호출 금지 → `dynamic import` 또는 `useEffect` 사용
- Server Component에서는 async/await 직접 사용 가능 (fetch, DB 조회 등)
- `any` 타입 사용 금지. Props, API 응답은 반드시 interface/type 정의

## 데이터 페칭
- Server Component: `fetch()` 직접 사용 (Next.js 캐싱 활용)
- Client Component: `useEffect` + `useState` 또는 SWR
- API Route: `app/api/[route]/route.ts` 형식

## 스타일
- Tailwind CSS 유틸리티 클래스 사용
- 인라인 style 속성 최소화
- 한국어 UI 텍스트 유지

## 금지 사항
- `pages/` 디렉터리 신규 생성 금지 (App Router 전환 완료)
- `getServerSideProps`, `getStaticProps` 신규 사용 금지
- 클라이언트 컴포넌트에서 서버 전용 모듈(fs, path 등) import 금지
