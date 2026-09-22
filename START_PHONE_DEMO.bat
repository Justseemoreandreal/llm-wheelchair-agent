@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\run_demo.ps1" -PhoneMode
if errorlevel 1 (
  echo.
  echo Phone demo launcher failed. See .runtime\logs\launcher.log
  pause
)
endlocal
