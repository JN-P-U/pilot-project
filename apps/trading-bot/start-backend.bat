@echo off
chcp 65001 > nul
setlocal EnableDelayedExpansion

REM trading-bot 백엔드 실행 스크립트
REM 사용법:
REM   start-backend.bat            (mock 프로필, 기본)
REM   start-backend.bat live       (live 프로필, KIS 실호출)
REM   start-backend.bat mock

set DIR=%~dp0
set BACKEND_DIR=%DIR%backend
set ENV_FILE=%DIR%.env
set PROFILE=%1
set PORT=8080

if "%PROFILE%"=="" set PROFILE=mock

if not exist "%BACKEND_DIR%" (
  echo 백엔드 디렉토리를 찾을 수 없습니다: %BACKEND_DIR%
  exit /b 1
)

if not "%PROFILE%"=="mock" if not "%PROFILE%"=="live" (
  echo 알 수 없는 프로필: %PROFILE% ^(허용: mock ^| live^)
  exit /b 1
)

if exist "%ENV_FILE%" (
  echo .env 로드: %ENV_FILE%
  for /f "usebackq tokens=1,* delims==" %%a in ("%ENV_FILE%") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" if not "%%a"=="" set "%%a=%%b"
  )
) else (
  echo .env 없음 — 환경변수만 사용
)

if "%PROFILE%"=="live" (
  if "%KIS_APP_KEY%"=="" (
    echo KIS_APP_KEY 가 필요합니다
    exit /b 1
  )
  if "%KIS_APP_SECRET%"=="" (
    echo KIS_APP_SECRET 가 필요합니다
    exit /b 1
  )
  if "%KIS_CANO%"=="" (
    echo KIS_CANO 가 필요합니다
    exit /b 1
  )
  if "%TRADING_ORDER_ENABLED%"=="true" echo [경고] TRADING_ORDER_ENABLED=true 실제 주문 API 가 전송됩니다.
  if "%KIS_LIVE%"=="true" echo [경고] KIS_LIVE=true 실전 서버로 호출됩니다.
)

set SPRING_PROFILES_ACTIVE=%PROFILE%

echo 포트 %PORT% 확인 중...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%PORT% "') do (
  taskkill /F /PID %%a > nul 2>&1
)

echo trading-bot 백엔드 시작 (profile=%PROFILE%)
echo 주소: http://localhost:%PORT%/api/health
echo (종료: Ctrl+C)
echo.

cd /d "%BACKEND_DIR%"
call gradlew.bat bootRun --console=plain
