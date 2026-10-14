@echo off
title ORBIT
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

rem Fast mode: optimised production server. It only recompiles after code changes,
rem so pages open instantly instead of compiling on first visit like dev mode does.
rem Want hot-reload while editing code? Run start-orbit-dev.bat instead.
start "" /b node scripts\open-when-ready.mjs
call npm run fast
pause
