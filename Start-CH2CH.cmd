@echo off
setlocal
cd /d "%~dp0"
echo Starting CH2CH local dashboard...
echo Dashboard: http://localhost:3000
start "CH2CH Dashboard" cmd /k "cd /d "%~dp0" && npm.cmd run dev"
timeout /t 3 /nobreak > nul
start http://localhost:3000
endlocal
