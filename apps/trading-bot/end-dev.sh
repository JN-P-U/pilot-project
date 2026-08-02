#!/bin/bash
# trading-bot 개발 프로세스 정리 스크립트
# start-dev.sh 로 띄운 백엔드/프론트엔드, 그리고 남아있는 gradle 데몬을 종료합니다.
#
# 사용법:
#   ./end-dev.sh              # 8080/5173 포트 프로세스 + gradle 데몬 종료
#   ./end-dev.sh --keep-daemon  # gradle 데몬은 남겨두고 앱 프로세스만 종료

BACKEND_PORT=8080
FRONTEND_PORT=5173
KEEP_DAEMON=false
KILLED_TOTAL=0

for arg in "$@"; do
  case "$arg" in
    --keep-daemon) KEEP_DAEMON=true ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      echo "알 수 없는 옵션: $arg"
      exit 1
      ;;
  esac
done

# 지정한 PID 들에게 TERM → 2초 대기 → 남아있으면 KILL
kill_gracefully() {
  local label="$1"
  shift
  local pids=("$@")
  [ ${#pids[@]} -eq 0 ] && return 0
  echo "[$label] TERM → ${pids[*]}"
  kill -TERM "${pids[@]}" 2>/dev/null || true
  KILLED_TOTAL=$((KILLED_TOTAL + ${#pids[@]}))
  sleep 2
  local alive=()
  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      alive+=("$pid")
    fi
  done
  if [ ${#alive[@]} -gt 0 ]; then
    echo "[$label] KILL → ${alive[*]}"
    kill -KILL "${alive[@]}" 2>/dev/null || true
  fi
}

# 1) 포트별 프로세스 정리
for entry in "backend:$BACKEND_PORT" "frontend:$FRONTEND_PORT"; do
  label="${entry%%:*}"
  port="${entry##*:}"
  # shellcheck disable=SC2207
  pids=($(lsof -ti :"$port" 2>/dev/null || true))
  if [ ${#pids[@]} -eq 0 ]; then
    echo "[$label] 포트 $port 사용 중인 프로세스 없음"
  else
    kill_gracefully "$label:$port" "${pids[@]}"
  fi
done

# 2) gradle 데몬 정리 (기본 동작). --keep-daemon 이면 건너뜀.
if [ "$KEEP_DAEMON" = "true" ]; then
  echo "[gradle-daemon] --keep-daemon 옵션 — 유지"
else
  # shellcheck disable=SC2207
  daemon_pids=($(pgrep -f 'org.gradle.launcher.daemon.bootstrap.GradleDaemon' 2>/dev/null || true))
  # gradlew 런처(부트스트랩) 도 함께 정리
  # shellcheck disable=SC2207
  wrapper_pids=($(pgrep -f 'gradle-wrapper.jar bootRun' 2>/dev/null || true))
  all_pids=()
  [ ${#daemon_pids[@]} -gt 0 ] && all_pids+=("${daemon_pids[@]}")
  [ ${#wrapper_pids[@]} -gt 0 ] && all_pids+=("${wrapper_pids[@]}")
  if [ ${#all_pids[@]} -eq 0 ]; then
    echo "[gradle-daemon] 남아있는 데몬 없음"
  else
    kill_gracefully "gradle-daemon" "${all_pids[@]}"
  fi
fi

echo ""
if [ "$KILLED_TOTAL" -eq 0 ]; then
  echo "정리할 프로세스가 없습니다 (백엔드/프론트엔드/gradle 데몬 모두 미실행)."
else
  echo "정리 완료 — ${KILLED_TOTAL}개 프로세스에 종료 신호를 보냈습니다."
fi
