
@echo off
setlocal
cd /d "%~dp0"

echo Starting CH2CH dashboard and local Runner...
echo.
echo Dashboard: http://localhost:3000
echo Runner: watches queued requests in Supabase
echo.

start "CH2CH Dashboard" cmd /k "cd /d "%~dp0" && npm.cmd run dev"
start "CH2CH Runner" cmd /k "cd /d "%~dp0" && npm.cmd run runner"

timeout /t 5 /nobreak > nul
start http://localhost:3000

endlocal
