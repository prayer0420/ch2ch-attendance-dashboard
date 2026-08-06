param([switch]$NoPause)
Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { taskkill.exe /PID $_.OwningProcess /T /F | Out-Null }
Write-Host "[CH2CH] Dashboard stopped."
if (-not $NoPause) { Read-Host "Press Enter to close" }
