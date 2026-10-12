@echo off
title ORBIT dev server
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ORBIT] Node.js not found. Install Node 22 LTS from https://nodejs.org and run this again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [ORBIT] Installing dependencies - first run takes a few minutes...
  call npm install
  if errorlevel 1 (
    echo [ORBIT] npm install failed. See the errors above.
    pause
    exit /b 1
  )
)

echo [ORBIT] Checking .env.local...
call npm run setup

echo [ORBIT] Starting dev server - browser opens in a moment.
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3000"
call npm run dev
pause
