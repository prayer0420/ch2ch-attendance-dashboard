@echo off
setlocal
cd /d "%~dp0"

echo This will register CH2CH to start automatically when Windows logs in.
echo It will run Start-CH2CH.cmd.
echo.

schtasks /Create /TN "CH2CH Attendance Dashboard" /TR "\"%~dp0Start-CH2CH.cmd\"" /SC ONLOGON /F

echo.
echo Done. CH2CH will start automatically at Windows login.
pause
endlocal
