
param(
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$node = "C:\Program Files\nodejs\node.exe"
$runtimeDir = Join-Path $root ".local-runtime"
$stateFile = Join-Path $runtimeDir "processes.json"
$dashboardLog = Join-Path $runtimeDir "dashboard.out.log"
$dashboardErrorLog = Join-Path $runtimeDir "dashboard.err.log"
$runnerLog = Join-Path $runtimeDir "runner.out.log"
$runnerErrorLog = Join-Path $runtimeDir "runner.err.log"
$url = "http://localhost:3000/runs/new"

if (-not (Test-Path -LiteralPath $node)) {
  throw "Node.js was not found: $node"
}

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

if (Test-Path -LiteralPath $stateFile) {
  Write-Host "[CH2CH] Previous local run info found. Stopping it first..."
  & (Join-Path $PSScriptRoot "stop-local.ps1") -NoPause
  if ($LASTEXITCODE -ne 0) {
    throw "The previous CH2CH process could not be stopped. Close its command window once, then retry."
  }
}

# A launcher version from before PID tracking may have left a server on port 3000.
$orphanedListeners = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue
foreach ($listener in $orphanedListeners) {
  Write-Host "[CH2CH] Stopping the previous dashboard on port 3000. PID=$($listener.OwningProcess)"
  & taskkill.exe /PID $listener.OwningProcess /T /F | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "The previous dashboard on port 3000 could not be stopped. Close its command window once, then retry."
  }
}

foreach ($logFile in @($dashboardLog, $dashboardErrorLog, $runnerLog, $runnerErrorLog)) {
  if (Test-Path -LiteralPath $logFile) {
    Clear-Content -LiteralPath $logFile -ErrorAction SilentlyContinue
  }
}

$dashboard = Start-Process -FilePath $node `
  -ArgumentList @("node_modules\next\dist\bin\next", "dev", "-p", "3000") `
  -WorkingDirectory $root `
  -WindowStyle Minimized `
  -RedirectStandardOutput $dashboardLog `
  -RedirectStandardError $dashboardErrorLog `
  -PassThru

$runner = Start-Process -FilePath $node `
  -ArgumentList @("runner\src\runner.js") `
  -WorkingDirectory $root `
  -WindowStyle Minimized `
  -RedirectStandardOutput $runnerLog `
  -RedirectStandardError $runnerErrorLog `
  -PassThru

$state = @{
  dashboard = @{ pid = $dashboard.Id; startedAt = $dashboard.StartTime.ToUniversalTime().ToString("O") }
  runner = @{ pid = $runner.Id; startedAt = $runner.StartTime.ToUniversalTime().ToString("O") }
}
$state | ConvertTo-Json -Depth 3 | Set-Content -Encoding UTF8 -LiteralPath $stateFile

Write-Host "[CH2CH] Dashboard PID: $($dashboard.Id)"
Write-Host "[CH2CH] Runner PID: $($runner.Id)"
Write-Host "[CH2CH] Waiting for $url ..."
Write-Host "[CH2CH] Dashboard log: $dashboardLog"
Write-Host "[CH2CH] Dashboard error log: $dashboardErrorLog"
Write-Host "[CH2CH] Runner log: $runnerLog"
Write-Host "[CH2CH] Runner error log: $runnerErrorLog"

$ready = $false
for ($attempt = 0; $attempt -lt 45; $attempt += 1) {
  Start-Sleep -Seconds 1
  try {
    $statusCode = & curl.exe --silent --output NUL --write-out "%{http_code}" --max-time 2 $url
    if ($statusCode -eq "200") {
      $ready = $true
      break
    }
  } catch {}
}

if ($ready) {
  Start-Process $url
  Write-Host "[CH2CH] READY - Dashboard and Runner are running."
  Write-Host "[CH2CH] Browser opened: $url"
  Write-Host "[CH2CH] To stop, double-click stop-local.cmd"
} else {
  & (Join-Path $PSScriptRoot "stop-local.ps1") -NoPause
  Write-Warning "Dashboard did not respond within 45 seconds."
  Write-Warning "Open $dashboardErrorLog and check the error message."
  Write-Warning "You can still try this URL manually: $url"
  exit 1
}

if (-not $NoPause) {
  Read-Host "Press Enter to close this helper window"
}

exit 0
