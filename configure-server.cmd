@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -File ".\scripts\server\configure.ps1"
pause
