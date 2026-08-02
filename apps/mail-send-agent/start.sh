#!/bin/bash

PORT=3000
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$DIR/.env.local"
CONFIG_JS="$DIR/config.js"

# .env.local 읽기
AUTH_CLIENT_ID=""
RECEIVER_EMAIL=""
if [ -f "$ENV_FILE" ]; then
  AUTH_CLIENT_ID=$(grep -E "^auth_client_id=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  RECEIVER_EMAIL=$(grep -E "^receiver_email=" "$ENV_FILE" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
fi

# config.js 생성
cat > "$CONFIG_JS" << EOF
window.__MAIL_AGENT_CONFIG__ = {
  authClientId: "${AUTH_CLIENT_ID}",
  receiverEmail: "${RECEIVER_EMAIL}"
};
EOF

# 종료 시 config.js 삭제
cleanup() {
  rm -f "$CONFIG_JS"
  echo ""
  echo "서버 종료됨."
}
trap cleanup EXIT INT TERM

# 포트 사용 중이면 종료
if lsof -ti :$PORT > /dev/null 2>&1; then
  echo "포트 $PORT 이미 사용 중. 기존 프로세스를 종료합니다..."
  lsof -ti :$PORT | xargs kill -9
  sleep 1
fi

echo "mail-send-agent 서버 시작 중..."
echo "주소: http://localhost:$PORT/mail-send-agent.html"
echo "(종료: Ctrl+C)"
echo ""

npx --yes serve -p $PORT "$DIR"
