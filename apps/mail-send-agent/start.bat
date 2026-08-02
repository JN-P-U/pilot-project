@echo off
chcp 65001 > nul
set PORT=3000
set DIR=%~dp0
set ENV_FILE=%DIR%.env.local
set CONFIG_JS=%DIR%config.js

set AUTH_CLIENT_ID=
set RECEIVER_EMAIL=

if exist "%ENV_FILE%" (
  for /f "usebackq tokens=1,* delims==" %%a in ("%ENV_FILE%") do (
    if /i "%%a"=="auth_client_id" set AUTH_CLIENT_ID=%%b
    if /i "%%a"=="receiver_email" set RECEIVER_EMAIL=%%b
  )
)

(
  echo window.__MAIL_AGENT_CONFIG__ = {
  echo   authClientId: "%AUTH_CLIENT_ID%",
  echo   receiverEmail: "%RECEIVER_EMAIL%"
  echo };
) > "%CONFIG_JS%"

echo 포트 %PORT% 확인 중...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":%PORT% "') do (
  taskkill /F /PID %%a > nul 2>&1
)

echo mail-send-agent 서버 시작 중...
echo 주소: http://localhost:%PORT%/mail-send-agent.html
echo (종료: Ctrl+C)
echo.

npx --yes serve -p %PORT% "%DIR%"

del "%CONFIG_JS%" 2>nul
