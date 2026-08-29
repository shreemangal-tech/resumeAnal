@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required to run Resume Audit.
  echo Install the current Node.js LTS release, then run this file again.
  pause
  exit /b 1
)

where pnpm >nul 2>nul
if errorlevel 1 (
  set "PACKAGE_MANAGER=npm"
) else (
  set "PACKAGE_MANAGER=pnpm"
)

if not exist "node_modules\vite\package.json" (
  echo Installing project dependencies...
  call %PACKAGE_MANAGER% install
  if errorlevel 1 (
    echo Dependency installation failed. Review the message above.
    pause
    exit /b 1
  )
)

echo.
echo Resume Audit is starting...
echo Open http://127.0.0.1:5173/ if the browser does not open automatically.
echo Keep this window open while using the application.
echo.

start "Resume Audit browser launcher" /b powershell -NoProfile -WindowStyle Hidden -Command "$url='http://127.0.0.1:5173/'; for($attempt=0; $attempt -lt 60; $attempt++){ try { $null=Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 $url; Start-Process $url; exit } catch { Start-Sleep -Milliseconds 500 } }"
call %PACKAGE_MANAGER% run dev -- --host 127.0.0.1 --port 5173 --strictPort

endlocal
