# feature-context — trading-bot

## 목표

- 취미 수준의 자동 매매 에이전트를 만든다. 실제 소액 매매까지 갈 수 있어야 하지만, 안전장치가 우선.
- KIS (한국투자증권) OpenAPI 를 백엔드 브로커로 사용.
- 프론트엔드는 관측/수동개입 대시보드 역할.

## 도메인 컨텍스트 (KIS)

- **인증**: `POST /oauth2/tokenP` → 24h 유효 access token.
- **시세**: `GET /uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=005930`, header `tr_id=FHKST01010100`.
- **주문**: `POST /uapi/domestic-stock/v1/trading/order-cash`, header `tr_id`:
  - 실전 매수 `TTTC0802U` / 매도 `TTTC0801U`
  - 모의 매수 `VTTC0802U` / 매도 `VTTC0801U`
- **base URL**:
  - 실전: `https://openapi.koreainvestment.com:9443`
  - 모의: `https://openapivts.koreainvestment.com:29443`
- **주요 필드**:
  - 계좌: `CANO` (앞 8자리) + `ACNT_PRDT_CD` (뒤 2자리)
  - 주문: `PDNO` (종목코드 6자리), `ORD_DVSN` (`00`=지정, `01`=시장가), `ORD_QTY`, `ORD_UNPR` (시장가는 0)

## 아키텍처 결정

- **모노레포 배치**: `apps/trading-bot/{backend,frontend}`.
  - `apps/trading-bot/frontend` 는 루트 npm workspace 로 등록.
  - `backend` 는 Gradle 프로젝트, npm workspace 밖.
- **프로필 분기**: `mock` 은 KIS 미호출, `live` (또는 없음) 는 실제 호출. `@Profile("!mock")` 으로 KIS 서비스 활성화.
- **주문 안전장치**: `KIS_LIVE`(base URL) 와 `TRADING_ORDER_ENABLED`(주문 전송) 를 별도 플래그로 분리.
- **HTTP 클라이언트**: Spring Boot 4 에는 webflux 스타터가 있으므로 WebClient 사용. 서비스 계층은 `Mono#block()` 으로 동기 노출.

## 아직 안 만든 것 (다음 확장 후보)

- 매매 전략 인터페이스 + `@Scheduled` 잡 (SMA/RSI 등 단순 지표 → 시그널).
- 포지션/체결 저장소 (H2 or SQLite → 나중에 PostgreSQL).
- 실시간 WebSocket 시세 (`ws://ops.koreainvestment.com:21000/tryitout/H0STCNT0`).
- Alert (Slack/Telegram) 웹훅.
- 백테스트 러너 (과거 시세 → 전략 시뮬레이션).

## 우선순위

1. mock 프로필로 UI ↔ 백엔드 계약을 안정화.
2. 모의투자 계좌로 실시세 조회 검증.
3. 모의투자 계좌로 주문 왕복 검증.
4. 단순 전략 하나(예: 이동평균 교차) 스케줄러 등록.
5. 관측(대시보드 차트, 로그, 알림) 강화.
6. 실전 전환은 최소 1주간 모의 무결성 확인 후.

## 금지 사항

- `apps/ui-test`, `apps/auto-ui-test` 등 다른 앱의 프레임워크/설정을 이 앱에 끌어오지 말 것.
- 자격증명/토큰을 파일에 기록하거나 로그에 남기지 말 것.
- 실전 주문 코드 경로에 안전장치를 우회하는 코드를 넣지 말 것.
