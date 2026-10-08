@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Open Bedroom AGI.html in the parent folder instead. It needs no installation.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4180 in your browser. Close this window to stop the preview.
node scripts\server.mjs
