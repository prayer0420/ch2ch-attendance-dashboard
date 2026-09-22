@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -File ".\scripts\start-local.ps1" -Production -NoPause
if errorlevel 1 pause
