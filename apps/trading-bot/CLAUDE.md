# CLAUDE.md — trading-bot

이 앱을 수정할 때 참고할 로컬 규칙입니다. 루트 `CLAUDE.md` 규칙에 이 문서를 덧붙입니다.

## 스코프

- 이 앱은 KIS OpenAPI 기반 소액 자동 매매 실험용입니다.
- backend (Spring Boot) 와 frontend (Vite + React) 는 같은 폴더 안에 있지만 독립 빌드입니다.
- 다른 `apps/*` 앱과 종속성 공유하지 않습니다. 필요하면 `packages/` 로 분리하세요.

## 절대 지켜야 할 것

- **자격증명(APP_KEY / APP_SECRET / 계좌번호) 을 절대 소스나 로그, 커밋 메시지에 남기지 않습니다.** 모두 환경변수(`KIS_*`)로만 주입.
- **실전 주문 코드 경로에는 반드시 두 개 이상의 안전장치(`KIS_LIVE`, `TRADING_ORDER_ENABLED`) 를 유지합니다.** 기본값은 항상 `false`.
- 새 기능을 추가할 때 mock 프로필에서도 UI 를 조작할 수 있도록 `@Profile("mock")` 대응체를 함께 추가합니다.

## 백엔드 규칙

- 패키지 구조: `com.tradingbot.{config,kis,trading.{controller,service,model}}` 를 유지합니다.
- 외부 API 호출은 `com.tradingbot.kis.KisApiClient` 를 통과시킵니다. 컨트롤러가 직접 WebClient 를 잡지 않습니다.
- 값은 Java `record` 로 표현합니다. 검증은 Bean Validation (`jakarta.validation`) 을 사용하세요.
- KIS 응답 필드는 매매에 필요한 것만 매핑합니다 (원 응답은 매우 큽니다).
- 로깅에 `appSecret`, `accessToken` 을 절대 남기지 마세요.

## 프론트엔드 규칙

- `any` 금지 (루트 규칙과 동일). 타입은 `src/types/trading.ts` 에 모읍니다.
- API 호출은 `src/api/client.ts` 한 곳에서만. 컴포넌트에서 `fetch` 직접 호출 금지.
- Vite dev proxy 를 통해 `/api/*` 로 백엔드와 통신합니다.
- UI 카피는 한국어를 유지하세요.

## 실행 / 검증

- 백엔드 빠른 확인: `cd backend && ./gradlew test`
- 프론트엔드 타입체크: `npm run typecheck --workspace=@trading-bot/frontend`
- 실전/모의 여부와 무관하게 코드가 mock 프로필로 부팅되는지 항상 확인하세요.
