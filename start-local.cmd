@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -File ".\scripts\start-local.ps1" -Production -NoPause

if errorlevel 1 (
  echo.
  echo [CH2CH] Startup failed. Check the error message above.
  pause
  exit /b 1
)

echo.
echo [CH2CH] Ready. This window will close automatically.
ping 127.0.0.1 -n 4 >nul
exit /b 0
