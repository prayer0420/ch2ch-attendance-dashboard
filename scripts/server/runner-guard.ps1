# Per-user supervisor. Never kills a process or resets interrupted business jobs.
param([ValidateRange(10,300)][int]$IntervalSeconds = 30)
. (Join-Path $PSScriptRoot 'common.ps1')
. (Join-Path $PSScriptRoot 'runner-guard-policy.ps1')
$guardMutex = New-Object Threading.Mutex($false, ('Local\CH2CH-RunnerGuard-' + $serverProjectHash))
$guardLocked = $false
$previousPhase = ''
try {
  try { $guardLocked = $guardMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $guardLocked = $true }
  if (-not $guardLocked) { exit 0 }
  New-Item -ItemType Directory -Path $serverPrivateDirectory -Force | Out-Null
  $self = Get-Process -Id $PID
  @{ pid=$PID; startedAt=$self.StartTime.ToUniversalTime().ToString('O'); nodePath=$self.Path; scriptPath=$PSCommandPath } |
    ConvertTo-Json | Set-Content -LiteralPath (Join-Path $serverRuntime 'runner-guard.json') -Encoding UTF8
  while ($true) {
    $phase = 'checking'
    try {
      $state = Get-ServerState
      $webReady = (Test-ServerProcessOwned $state.dashboard) -and $state.dashboard.mode -eq 'start' -and -not $state.dashboard.setupOnly
      $runnerOwned = Test-ServerProcessOwned $state.runner
      $pidAlive = $false
      if ($state.runner) { $pidAlive = $null -ne (Get-Process -Id $state.runner.pid -ErrorAction SilentlyContinue) }
      $phase = Get-RunnerGuardDecision $webReady $runnerOwned $pidAlive
      if ($phase -eq 'start-runner') {
        $helperScript = Join-Path $PSScriptRoot 'start-runner.ps1'
        $helperArgs = '-NoProfile -NonInteractive -File "' + $helperScript + '" -Quiet -NoGuard'
        $helper = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -ArgumentList $helperArgs -WindowStyle Hidden -WorkingDirectory $serverProject -RedirectStandardOutput (Join-Path $serverPrivateDirectory 'runner-guard-start.out.log') -RedirectStandardError (Join-Path $serverPrivateDirectory 'runner-guard-start.err.log') -PassThru
        try {
          $helperHandle = $helper.Handle
          # Do not overlap a slow start helper. It owns the existing lifecycle lock.
          while (-not $helper.WaitForExit(30000)) { }
          $phase = if ($helper.ExitCode -eq 0) { 'recovered' } else { 'retry-next-check' }
        } finally { $helper.Dispose() }
      }
    } catch { $phase = 'check-failed' }
    $now = [DateTime]::UtcNow.ToString('O')
    @{ timestamp=$now; phase=$phase; intervalSeconds=$IntervalSeconds; pid=$PID } |
      ConvertTo-Json | Set-Content -LiteralPath (Join-Path $serverPrivateDirectory 'runner-guard-status.json') -Encoding UTF8
    if ($phase -ne $previousPhase) {
      Add-Content -LiteralPath (Join-Path $serverPrivateDirectory 'runner-guard.log') -Encoding UTF8 -Value "$now phase=$phase"
      $previousPhase = $phase
    }
    Start-Sleep -Seconds $IntervalSeconds
  }
} finally {
  if ($guardLocked) { $guardMutex.ReleaseMutex() }
  $guardMutex.Dispose()
}
