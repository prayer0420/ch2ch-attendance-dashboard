param([switch]$Quiet)
. (Join-Path $PSScriptRoot 'common.ps1')
Import-ServerAuthentication
$lifecycleMutex = New-Object Threading.Mutex($false, ('Local\CH2CH-Start-' + $serverProjectHash))
$lifecycleLocked = $false
try {
  try { $lifecycleLocked = $lifecycleMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $lifecycleLocked = $true }
  if (-not $lifecycleLocked) { throw 'Another start/stop operation is in progress.' }
  $state = Get-ServerState
  if (-not (Test-ServerProcessOwned $state.dashboard) -or $state.dashboard.setupOnly -or $state.dashboard.mode -ne 'start') { throw 'An owned production web server must be running first.' }
  $listeners = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop)
  if ($listeners.Count -ne 1 -or $listeners[0].LocalAddress -ne '127.0.0.1' -or $listeners[0].OwningProcess -ne $state.dashboard.pid) { throw 'Unexpected web listener. Runner was not started.' }
  if ($state.runner) {
    $recorded = Get-Process -Id $state.runner.pid -ErrorAction SilentlyContinue
    if ($recorded) {
      if (-not (Test-ServerProcessOwned $state.runner)) { throw 'Recorded Runner identity mismatch. Nothing was stopped or started.' }
      if (-not $Quiet) { Write-Output 'Runner is already running. No duplicate started.' }
      return
    }
    $state.Remove('runner')
    Save-ServerState $state
  }
  & $serverNode (Join-Path $PSScriptRoot 'preflight-runner.js')
  if ($LASTEXITCODE -ne 0) { throw 'Runner preflight failed. Nothing was started.' }
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
  $runnerScript = Join-Path $serverProject 'runner\src\runner.js'
  $env:RUNNER_DASHBOARD_URL = 'http://127.0.0.1:3000'
  $runner = Start-Process -FilePath $serverNode -ArgumentList @(('"' + $runnerScript + '"')) -WorkingDirectory $serverProject -WindowStyle Hidden -RedirectStandardOutput (Join-Path $serverRuntime "runner-$stamp.out.log") -RedirectStandardError (Join-Path $serverRuntime "runner-$stamp.err.log") -PassThru
  $state.runner = @{ pid=$runner.Id; startedAt=$runner.StartTime.ToUniversalTime().ToString('O'); nodePath=$serverNode; scriptPath=$runnerScript }
  Save-ServerState $state
  Start-Sleep -Seconds 2
  if ($runner.HasExited -or -not (Test-ServerProcessOwned $state.runner)) { throw 'Runner exited or could not be verified. Check the timestamped Runner log.' }
  $heartbeatReady = $false
  for ($attempt = 0; $attempt -lt 10; $attempt++) {
    & $serverNode (Join-Path $PSScriptRoot 'check-runner-online.js') $state.runner.startedAt *> $null
    if ($LASTEXITCODE -eq 0) { $heartbeatReady = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $heartbeatReady) { throw 'Runner process exists but a fresh idle heartbeat was not verified.' }
  if (-not $Quiet) { Write-Output 'Runner online and idle. Existing non-queued records were preserved.' }
} finally {
  if ($lifecycleLocked) { $lifecycleMutex.ReleaseMutex() }
  $lifecycleMutex.Dispose()
}
