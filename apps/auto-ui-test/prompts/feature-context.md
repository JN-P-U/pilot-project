# Auto UI Test Evidence Feature Prompt

Use this prompt when planning or changing the `apps/auto-ui-test` UI test evidence feature.

## Feature Summary

This app extends `apps/ui-test` with two complementary evidence generation modes:

1. **수동 캡처 모드** (`EvidenceFloat`): 사용자가 직접 캡처 버튼을 눌러 스크린샷을 찍고 케이스 메타데이터를 입력한 뒤 XLSX를 다운로드한다.
2. **이벤트 자동 기록 모드** (`EventRecorder`): 기록 시작 후 DOM 이벤트(클릭, 입력 변경)를 자동으로 수집하고, 클릭 이벤트마다 스크린샷을 캡처하여 이벤트 로그 XLSX를 생성한다.

The app has two related surfaces:

- `apps/auto-ui-test/app`: Next.js sample/admin-style UI. `layout.tsx`에 `EventRecorder`가 마운트된다.
- `apps/auto-ui-test/test-evidence`: reusable React package exported as `@auto-ui-test/react`.

## Architecture

```
test-evidence/src/
  EventRecorder.tsx          # 플로팅 기록 컨트롤러 (이벤트 캡처 + 상태 관리)
  EventLogModal.tsx          # 이벤트 리뷰 모달 (메타데이터 입력 + 다운로드)
  generate-event-excel.ts    # 이벤트 로그 전용 XLSX 생성기
  EvidenceFloat.tsx          # 수동 캡처 플로팅 버튼 (ui-test에서 유지)
  EvidenceModal.tsx          # 수동 케이스 리뷰 모달
  generate-excel.ts          # 수동 케이스 XLSX 생성기
  EvidenceContext.tsx        # 화면 메타데이터 컨텍스트
```

컴포넌트 책임 분리:
- `EventRecorder` — DOM 이벤트 리스닝, 스크린샷 캡처, `EventLogItem[]` 상태 보유
- `EventLogModal` — 메타데이터 입력, 이벤트 목록 표시/삭제, 엑셀 다운로드 트리거
- `generate-event-excel.ts` — `EventExcelPayload` → XLSX bytes 변환, 파일명 생성

## User Flow — 이벤트 자동 기록 모드

1. 사용자가 `▶ 기록 시작` 버튼을 클릭해 기록을 시작한다.
2. 앱 내에서 버튼 클릭 및 입력 변경이 발생할 때마다 이벤트가 자동 수집된다.
   - `click`: 이벤트 저장 + 클릭 직후 화면 스크린샷 자동 캡처
   - `change`: 이벤트 저장만 (스크린샷 없음)
3. `⏹ 기록 중 (N)` 버튼을 눌러 기록을 중지한다.
4. `이벤트 로그 (N) →` 버튼을 눌러 모달을 연다.
5. 서비스코드(필수), 화면ID, 화면명, 작성자, 업무분류, Level1–4를 입력한다.
6. 불필요한 이벤트를 개별 삭제하거나 전체 초기화한다.
7. `엑셀 다운로드` 버튼으로 XLSX를 생성·저장한다. 다운로드 완료 시 상태가 초기화된다.

## User Flow — 수동 캡처 모드

- `EvidenceFloat` 버튼으로 첫 캡처 → 케이스 생성 → 모달 오픈
- 케이스 메타데이터 편집 → 추가 캡처 또는 다운로드
- (기존 `apps/ui-test` 플로우와 동일)

## Public Output — 이벤트 로그 XLSX

- 파일명: `MAL_{서비스코드}_AC02(단위테스트케이스결과서)_UT_{화면ID}_{화면명}_V1.0.xlsx`
- 시트 구성:

  | 시트명 | 내용 |
  |--------|------|
  | `겉표지` | 서비스코드, 화면ID/명, 작성일, 문서버전 |
  | `개정이력` | V1.0 최초 작성 |
  | `이벤트 로그` | 순번/시간/유형/대상요소/설명/URL/캡처여부 전체 이벤트 |
  | `공통체크리스트` | 13개 공통 UI 체크리스트 |
  | `이벤트 결과 증빙` | 스크린샷이 있는 이벤트만 이미지 삽입 |

## Public Output — 수동 케이스 XLSX

- 파일명: 동일 형식
- 시트: `겉표지`, `개정이력`, `단위테스트케이스`, `공통체크리스트`, `단위테스트케이스결과증빙`

## Key Interfaces

```typescript
// generate-event-excel.ts
interface EventLogItem {
  id: string;
  seq: number;
  timestamp: string;          // "HH:mm:ss"
  eventType: "click" | "input" | "navigate";
  targetTag: string;          // 예: "button", "input"
  targetLabel: string;        // aria-label > textContent > placeholder > name > id 순
  value?: string;             // input/change 이벤트의 입력값
  url: string;                // window.location.pathname
  screenshot?: string;        // click 이벤트 캡처 data URL (png)
}

interface EventExcelPayload {
  serviceCode: string;
  screenId: string;
  screenName: string;
  author: string;
  capturedAt?: string;
  bizCategory?: string;
  level1?: string; level2?: string; level3?: string; level4?: string;
  events: EventLogItem[];
}
```

## Implementation Notes

- 기록 중 `EventRecorder` UI 자체의 클릭은 `[data-event-recorder]` 속성으로 필터링한다.
- 동시 스크린샷 캡처 방지를 위해 `capturingRef`로 락을 건다.
- `isCapturing` 상태가 `true`일 때 컴포넌트가 `null`을 반환하여 플로팅 버튼이 화면에서 사라진 뒤 캡처한다.
- `generate-event-excel.ts`는 `generate-excel.ts`와 독립적으로 동작하는 자체 완결 파일이다.
- 이벤트 로그 시트에는 전체 이벤트를, 증빙 시트에는 스크린샷 보유 이벤트만 포함한다.
- 포트: `http://localhost:3001` (ui-test는 3000)

## Validation

- 타입 검사: `npx tsc --noEmit` (apps/auto-ui-test 디렉토리에서)
- UI/빌드: `npm run build --workspace=auto-ui-test`
- 이벤트 로그 XLSX: 최소 1건 이벤트 기록 후 다운로드하여 Excel에서 5개 시트 확인
