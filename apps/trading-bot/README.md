# trading-bot

한국투자증권(KIS) OpenAPI 를 이용한 소액 취미용 주식 자동 매매 실험 프로젝트.

- **backend**: Spring Boot 4.x + Java 21 + Gradle (Groovy)
- **frontend**: Vite + React 18 + TypeScript
- **시장/브로커**: 한국투자증권 KIS OpenAPI (모의투자/실전 전환 지원)

## 폴더 구조

```
apps/trading-bot/
├── backend/           Spring Boot 서버
│   ├── build.gradle
│   ├── src/main/java/com/tradingbot/
│   │   ├── config/          KIS/Trading 프로퍼티, WebClient, CORS
│   │   ├── kis/             KIS OpenAPI 클라이언트 (토큰/시세/주문)
│   │   └── trading/         Controller / Service / Model (mock/live 프로필 분기)
│   └── src/main/resources/  application.yml (+ mock/live 프로필)
├── frontend/          Vite + React 대시보드 (@trading-bot/frontend)
├── prompts/           feature-context (에이전트 참고용)
├── .env.example       KIS 자격증명 예시
└── README.md
```

## 사전 준비

1. Java 21 설치 확인: `java -version`
2. Node 18+ / npm 설치 확인
3. (선택) [KIS 개발자센터](https://apiportal.koreainvestment.com) 가입 후 앱키/시크릿, 모의투자 계좌 발급
4. `apps/trading-bot/.env.example` 을 복사해 `.env` 생성 후 값 채우기

## 실행

### 백엔드 + 프론트엔드 동시 실행 (mock 프로필 — 자격증명 없이도 UI 검증 가능)

```bash
cd apps/trading-bot
./start-dev.sh                # macOS/Linux
start-backend.bat             # Windows (백엔드만)
# → 백엔드: http://localhost:8080/api/health
# → 프론트엔드: http://localhost:5173
# Ctrl+C 로 두 프로세스 모두 종료
```

`start-dev.sh` 는 백엔드(gradle bootRun) 와 프론트엔드(npm workspace dev) 를 한 셸에서 병렬로 띄우고, 출력에 `[BE]` / `[FE]` 접두어를 붙여 구분합니다. gradle 은 `--no-daemon` 으로 실행되어 Ctrl+C 시 Spring Boot 프로세스도 함께 종료됩니다.

Ctrl+C 로 정리가 안 됐거나 별도 터미널에서 강제로 정리하고 싶으면:

```bash
./end-dev.sh                  # 8080/5173 + gradle 데몬 모두 종료
./end-dev.sh --keep-daemon    # 앱 프로세스만 종료, gradle 데몬은 유지
```

### 실제 KIS 호출 (live 프로필)

`.env` 파일을 만들고 (`.env.example` 참고) 실행:

```bash
cd apps/trading-bot
./start-dev.sh live           # macOS/Linux
start-backend.bat live        # Windows (백엔드만)
```

스크립트는 `.env` 를 자동 로드하고 `SPRING_PROFILES_ACTIVE` 를 지정합니다. `live` 프로필은 `KIS_APP_KEY`/`KIS_APP_SECRET`/`KIS_CANO` 가 없으면 시작 전에 실패합니다.

주의: `TRADING_ORDER_ENABLED=true` 로 명시하지 않으면 주문 API 는 dry-run(로그만) 으로 동작합니다.

### 개별 실행

백엔드만 gradle 로:

```bash
cd apps/trading-bot/backend
./gradlew bootRun                       # 기본 = mock
SPRING_PROFILES_ACTIVE=live ./gradlew bootRun
```

프론트엔드만:

```bash
# 리포 루트에서
npm install
npm run dev --workspace=@trading-bot/frontend
# → http://localhost:5173
```

Vite dev server 는 `/api/*` 요청을 `http://localhost:8080` 으로 프록시합니다.

## 안전장치

### 1) 실행 단계 게이트 (3단)

- **SPRING_PROFILES_ACTIVE** (기본 `mock`): mock 이면 KIS 를 전혀 호출하지 않고 가짜 시세/주문을 반환.
- **KIS_LIVE** (기본 `false`): `true` 여야 실전 서버 (`openapi.koreainvestment.com:9443`) 로 호출. 그 외 모의 서버.
- **TRADING_ORDER_ENABLED** (기본 `false`): `true` 여야 주문 API 실제 전송. false 이면 로그만 남기고 `accepted=false` 반환.

세 게이트를 모두 통과해야만 실제 매수/매도가 발생합니다.

### 2) 사전 검증 (TradingGuard)

주문이 KIS 로 나가기 전에 `com.tradingbot.trading.guard.TradingGuard` 가 4가지를 검사합니다. 실패 시 400 응답 (`error=GUARD`) 반환하고 주문은 전송조차 되지 않습니다.

| 항목                            | 기본값              | 설명                                                                 |
| ------------------------------- | ------------------- | -------------------------------------------------------------------- |
| `TRADING_MARKET_HOURS_ONLY`     | `true`              | 평일 정규장(09:00~15:20 KST) 외 시간대 주문 차단                     |
| `TRADING_OPEN_TIME` / `CLOSE_TIME` | `09:00` / `15:20` | 허용 시간 창                                                         |
| `TRADING_ALLOWED_STOCK_CODES`   | `005930`            | 화이트리스트 (콤마 구분). 여기 없는 종목은 거부                      |
| `TRADING_MAX_QTY`               | `1`                 | 단건 주문 최대 수량                                                  |
| `TRADING_MAX_DAILY_NOTIONAL`    | `50000`             | 하루 총 주문금액(원) 상한. `수량 × (지정가 or 현재가)` 누적          |

- 시장가 주문은 참조가로 KIS 현재가 조회 값을 사용합니다.
- 지정가 주문은 요청의 `price` 를 그대로 사용하며, `price ≤ 0` 이면 즉시 거부합니다.
- 일일 누적은 **KIS 로 실제 접수 성공한 주문만** 반영됩니다 (dry-run/거부 건은 누적 X).
- 서버 재시작 시 누적은 리셋됩니다. 지속 저장이 필요하면 별도 스토어를 붙이세요.

## API 요약

| Method | Path                   | 설명                       |
| ------ | ---------------------- | -------------------------- |
| GET    | `/api/health`          | 서버 상태 + active profile |
| GET    | `/api/quotes/{code}`   | 종목 현재가 조회 (6자리)   |
| POST   | `/api/orders`          | 주문 접수                  |

### Swagger UI / OpenAPI

백엔드 실행 후:

- Swagger UI: http://localhost:8080/swagger-ui.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs

`/api/**` 만 문서에 노출되도록 필터링되어 있습니다 (`springdoc.paths-to-match` 설정, `application.yml` 참조).

주문 요청 예시:

```json
{
  "stockCode": "005930",
  "side": "BUY",
  "quantity": 1,
  "price": 0,
  "orderType": "MARKET"
}
```

## 개발 메모

- KIS OpenAPI 자세한 문서: https://apiportal.koreainvestment.com
- 매매 전략(스케줄러/시그널)은 아직 스캐폴딩되지 않았습니다. `trading.service` 하위에 전략 인터페이스를 추가하고 `@Scheduled` 잡을 붙이면 됩니다.
- 실시간 시세는 WebSocket 이며 아직 미구현입니다. 필요 시 `kis` 패키지에 `KisWebSocketClient` 를 추가하세요.

## 관련 문서

- `apps/trading-bot/CLAUDE.md` — 이 앱을 다룰 때 에이전트가 지켜야 할 규칙
- `apps/trading-bot/prompts/feature-context.md` — 도메인/기술 컨텍스트
- 루트 `CLAUDE.md` — 리포 전역 규칙
