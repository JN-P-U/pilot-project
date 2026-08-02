#!/bin/bash
# trading-bot 통합 개발 실행 스크립트 (backend + frontend 동시 실행)
# 사용법:
#   ./start-dev.sh              # .env 의 SPRING_PROFILES_ACTIVE 를 사용
#   ./start-dev.sh live         # 인자로 명시 (.env 값 무시)
#   ./start-dev.sh mock         # 인자로 명시
#
# 프로필 결정 순서 (우선순위 높은 순):
#   1) CLI 인자 ($1)
#   2) .env 의 SPRING_PROFILES_ACTIVE (프론트 실행 모드 선택으로 갱신됨)
# 모두 비어있으면 실패합니다 (application.yml 에 fallback 없음 — 의도적).

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$DIR/../.." && pwd)"
BACKEND_DIR="$DIR/backend"
ENV_FILE="$DIR/.env"
BACKEND_PORT=8080
FRONTEND_PORT=5173

# CLI 인자 우선 (아니면 .env 로드 후 SPRING_PROFILES_ACTIVE 사용)
PROFILE=""
if [ -n "${1:-}" ]; then
  PROFILE="$1"
  echo "프로필: '$PROFILE' (CLI 인자)"
fi

# nvm 자동 로드 (사용자 셸이 nvm 으로 node 를 관리하는 경우 서브셸에서도 npm 을 찾도록)
if [ -z "$(command -v npm)" ]; then
  NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    # .nvmrc 있으면 그걸, 없으면 설치된 최신 버전 사용
    if [ -f "$REPO_ROOT/.nvmrc" ]; then
      nvm use >/dev/null 2>&1 || nvm use node >/dev/null 2>&1 || true
    else
      nvm use node >/dev/null 2>&1 || true
    fi
  fi
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm 을 찾을 수 없습니다. node/npm 을 설치했는지 확인하세요 (nvm 사용 중이면 'nvm use <version>' 후 재실행)."
  exit 1
fi

if [ ! -d "$BACKEND_DIR" ]; then
  echo "백엔드 디렉토리를 찾을 수 없습니다: $BACKEND_DIR"
  exit 1
fi

# 프론트엔드 의존성 미설치면 자동 설치
if [ ! -d "$REPO_ROOT/node_modules" ]; then
  echo "node_modules 없음 — npm install 실행"
  ( cd "$REPO_ROOT" && npm install )
fi

# .env 로드 (프로필이 아직 정해지지 않았다면 여기서 SPRING_PROFILES_ACTIVE 를 픽업)
if [ -f "$ENV_FILE" ]; then
  echo ".env 로드: $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
else
  echo ".env 없음 — 환경변수만 사용 (mock 프로필은 자격증명 없이도 동작)"
fi

# CLI 인자가 없었으면 .env / shell 의 SPRING_PROFILES_ACTIVE 를 사용
if [ -z "$PROFILE" ]; then
  PROFILE="${SPRING_PROFILES_ACTIVE:-}"
  if [ -n "$PROFILE" ]; then
    echo "프로필: '$PROFILE' (.env / 환경변수)"
  fi
fi

if [ -z "$PROFILE" ]; then
  echo "프로필이 결정되지 않았습니다. 다음 중 하나로 지정하세요:" >&2
  echo "  1) ./start-dev.sh <mock|live>" >&2
  echo "  2) 프론트에서 실행 모드 선택 → .env 의 SPRING_PROFILES_ACTIVE 갱신" >&2
  echo "  3) .env 에 SPRING_PROFILES_ACTIVE=mock|live 직접 지정" >&2
  exit 1
fi

if [ "$PROFILE" != "mock" ] && [ "$PROFILE" != "live" ]; then
  echo "알 수 없는 프로필: '$PROFILE' (허용: mock | live)"
  exit 1
fi

# live 프로필인데 필수 값이 비어있으면 조기 실패
if [ "$PROFILE" = "live" ]; then
  : "${KIS_APP_KEY:?KIS_APP_KEY 가 필요합니다}"
  : "${KIS_APP_SECRET:?KIS_APP_SECRET 가 필요합니다}"
  : "${KIS_CANO:?KIS_CANO 가 필요합니다}"
  if [ "${TRADING_ORDER_ENABLED:-false}" = "true" ]; then
    echo "⚠️  TRADING_ORDER_ENABLED=true 실제 주문 API 가 전송됩니다."
    if [ "${KIS_LIVE:-false}" = "true" ]; then
      echo "⚠️  KIS_LIVE=true 실전 서버(openapi.koreainvestment.com:9443) 로 호출됩니다."
    fi
  fi
fi

export SPRING_PROFILES_ACTIVE="$PROFILE"

# 이전 실행이 남아있으면 정리 (백엔드/프론트엔드 프로세스 + gradle 데몬).
# 살아있는 것이 없으면 end-dev.sh 가 알려주고 즉시 진행합니다.
echo "이전 실행 정리 중..."
if [ -x "$DIR/end-dev.sh" ]; then
  "$DIR/end-dev.sh" || true
else
  echo "end-dev.sh 를 찾을 수 없어 정리를 건너뜁니다."
fi
echo ""

cleanup() {
  trap - INT TERM EXIT
  echo ""
  echo "종료 중..."
  # 1) 현재 셸의 모든 백그라운드 잡 종료
  local pids
  pids=$(jobs -p)
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null || true
  fi
  # 2) 안전장치: 포트를 아직 잡고 있는 프로세스 정리
  #    (gradle 데몬처럼 프로세스 트리 밖으로 벗어난 자식이 있을 때)
  local port_pids
  port_pids=$(lsof -ti :"$BACKEND_PORT" :"$FRONTEND_PORT" 2>/dev/null || true)
  if [ -n "$port_pids" ]; then
    # shellcheck disable=SC2086
    kill -TERM $port_pids 2>/dev/null || true
    sleep 1
    port_pids=$(lsof -ti :"$BACKEND_PORT" :"$FRONTEND_PORT" 2>/dev/null || true)
    if [ -n "$port_pids" ]; then
      # shellcheck disable=SC2086
      kill -KILL $port_pids 2>/dev/null || true
    fi
  fi
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

echo "trading-bot 백엔드 시작 (profile=$PROFILE) → http://localhost:$BACKEND_PORT/api/health"
echo "trading-bot 프론트엔드 시작 → http://localhost:$FRONTEND_PORT"
echo "(종료: Ctrl+C)"
echo ""

# 백엔드 시작 (출력은 [BE] 접두어)
# --no-daemon: gradle 데몬 대신 in-process 실행 → Ctrl+C 시 Spring Boot 도 함께 종료
(
  cd "$BACKEND_DIR"
  ./gradlew bootRun --no-daemon --console=plain 2>&1 | awk '{ print "[BE] " $0; fflush(); }'
) &
BE_PID=$!

# 프론트엔드 시작 (npm workspace, [FE] 접두어)
(
  cd "$REPO_ROOT"
  npm run dev --workspace=@trading-bot/frontend 2>&1 | awk '{ print "[FE] " $0; fflush(); }'
) &
FE_PID=$!

# 어느 한쪽이라도 죽으면 나머지도 함께 정리
# (bash 3.2 호환을 위해 wait -n 대신 kill -0 폴링 사용)
while kill -0 "$BE_PID" 2>/dev/null && kill -0 "$FE_PID" 2>/dev/null; do
  sleep 1
done

echo ""
if ! kill -0 "$BE_PID" 2>/dev/null; then
  echo "⚠️  백엔드 프로세스가 먼저 종료됨 → 프론트엔드도 정리합니다."
else
  echo "⚠️  프론트엔드 프로세스가 먼저 종료됨 → 백엔드도 정리합니다."
fi
# EXIT 트랩이 이후 정리를 담당합니다.
