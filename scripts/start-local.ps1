param([switch]$NoPause)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$node = "C:\Program Files\nodejs\node.exe"
$url = "http://localhost:3000"
if (-not (Test-Path -LiteralPath $node)) { throw "Node.js was not found: $node" }
$dashboard = Start-Process -FilePath $node -ArgumentList @("node_modules\next\dist\bin\next", "dev", "-p", "3000") -WorkingDirectory $root -WindowStyle Minimized -PassThru
Write-Host "[CH2CH] Dashboard PID: $($dashboard.Id)"
Start-Sleep -Seconds 3
Start-Process $url
if (-not $NoPause) { Read-Host "Press Enter to close this helper window" }
