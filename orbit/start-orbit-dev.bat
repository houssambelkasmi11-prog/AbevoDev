@echo off
title ORBIT dev server (Turbopack)
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
)

call npm run setup
echo [ORBIT] Starting dev server with Turbopack (hot reload) - browser opens when ready.
start "" /b node scripts\open-when-ready.mjs
call npm run dev
pause
