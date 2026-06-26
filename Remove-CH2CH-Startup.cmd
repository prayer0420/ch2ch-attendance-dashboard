@echo off
setlocal

schtasks /Delete /TN "CH2CH Attendance Dashboard" /F

echo.
echo Removed CH2CH auto-start task.
pause
endlocal
