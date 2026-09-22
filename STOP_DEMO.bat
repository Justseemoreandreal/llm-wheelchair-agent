@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\stop_demo.ps1"
echo.
echo Demo cleanup finished. You may close this window.
endlocal
