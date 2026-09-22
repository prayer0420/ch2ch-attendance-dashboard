param([switch]$NoPause, [switch]$Production, [switch]$WebOnly, [switch]$SetupOnly)
. (Join-Path $PSScriptRoot 'server\common.ps1')
if ($SetupOnly -and -not $WebOnly) { throw 'SetupOnly requires WebOnly; no Runner may run before authentication setup.' }
Import-ServerAuthentication
$serverStartMutex = New-Object Threading.Mutex($false, ('Local\CH2CH-Start-' + $serverProjectHash))
$serverHaveLock = $false
try {
  try { $serverHaveLock = $serverStartMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $serverHaveLock = $true }
  if (-not $serverHaveLock) { throw 'Another start/stop operation is already in progress.' }
  $state = Get-ServerState
  $listeners = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
  if ($listeners.Count) {
    if ((Test-ServerProcessOwned $state.dashboard) -and @($listeners | Where-Object OwningProcess -ne $state.dashboard.pid).Count -eq 0) {
      Write-Host '[CH2CH] This server is already running at http://localhost:3000. No restart or duplicate Runner.'
      Write-Host '[CH2CH] To change mode/configuration, stop-local.cmd first, then start-server.cmd.'
      return
    }
    throw 'Port 3000 belongs to another or unverified process. It was NOT stopped. Check the existing program first.'
  }
  foreach ($name in @('dashboard', 'runner')) {
    if ($state[$name] -and (Get-Process -Id $state[$name].pid -ErrorAction SilentlyContinue)) { throw "Recorded $name process still exists. Review/stop it explicitly before starting. No process was killed." }
  }
  $checkArgs = @((Join-Path $PSScriptRoot 'server\preflight.js'))
  if ($Production) { $checkArgs += '--production' }
  if ($WebOnly) { $checkArgs += '--web-only' }
  if ($SetupOnly) { $checkArgs += '--setup-only' }
  & $serverNode @checkArgs
  if ($LASTEXITCODE -ne 0) { throw 'Preflight failed. No services started.' }
  New-Item -ItemType Directory -Path $serverRuntime -Force | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
  $env:NEXT_BUILD_DIR = if ($Production) { '.local-runtime/server-build' } else { '.next' }
  $env:NODE_ENV = if ($Production) { 'production' } else { 'development' }
  $env:CH2CH_STANDALONE = '0'
  $env:RUNNER_DASHBOARD_URL = 'http://localhost:3000'
  $webScript = Join-Path $serverProject 'node_modules\next\dist\bin\next'
  $mode = if ($Production) { 'start' } else { 'dev' }
  $web = Start-Process -FilePath $serverNode -ArgumentList @(('"' + $webScript + '"'), $mode, '--hostname', '127.0.0.1', '--port', '3000') -WorkingDirectory $serverProject -WindowStyle Hidden -RedirectStandardOutput (Join-Path $serverRuntime "dashboard-$stamp.out.log") -RedirectStandardError (Join-Path $serverRuntime "dashboard-$stamp.err.log") -PassThru
  $state = @{ dashboard = @{ pid = $web.Id; startedAt = $web.StartTime.ToUniversalTime().ToString('O'); nodePath = $serverNode; scriptPath = $webScript; mode = $mode; setupOnly = [bool]$SetupOnly } }
  Save-ServerState $state
  $ready = $false
  for ($attempt = 0; $attempt -lt 45; $attempt++) {
    if ($web.HasExited) { break }
    try {
      $request = [Net.HttpWebRequest]::Create('http://127.0.0.1:3000/login')
      $request.Timeout = 1500; $request.AllowAutoRedirect = $false
      $response = $request.GetResponse()
      $ready = ([int]$response.StatusCode -eq 200); $response.Close()
    } catch {}
    if ($ready) { break }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) {
    if (Test-ServerProcessOwned $state.dashboard) { Stop-Process -Id $web.Id }
    throw 'The login page did not become ready. Check the new timestamped dashboard log. No unrelated program was stopped.'
  }
  if (-not $WebOnly) {
    $runnerScript = Join-Path $serverProject 'runner\src\runner.js'
    $runner = Start-Process -FilePath $serverNode -ArgumentList @(('"' + $runnerScript + '"')) -WorkingDirectory $serverProject -WindowStyle Hidden -RedirectStandardOutput (Join-Path $serverRuntime "runner-$stamp.out.log") -RedirectStandardError (Join-Path $serverRuntime "runner-$stamp.err.log") -PassThru
    $state.runner = @{ pid = $runner.Id; startedAt = $runner.StartTime.ToUniversalTime().ToString('O'); nodePath = $serverNode; scriptPath = $runnerScript }
    Save-ServerState $state
    Start-Sleep -Seconds 1
    if ($runner.HasExited) { throw 'Web server is running, but Runner exited. Check the timestamped Runner log.' }
  }
  Write-Host '[CH2CH] Web ready: http://localhost:3000 (this PC only).'
  Write-Host "[CH2CH] Mode: $mode. Runner started: $(-not $WebOnly). Setup only: $([bool]$SetupOnly)."
  Write-Host '[CH2CH] No firewall, power, startup registration or network settings were changed.'
  if (-not $NoPause) { Read-Host 'Press Enter to close this helper (server stays running)' }
} finally {
  if ($serverHaveLock) { $serverStartMutex.ReleaseMutex() }
  $serverStartMutex.Dispose()
}
