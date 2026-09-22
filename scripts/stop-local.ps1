param([switch]$NoPause)
. (Join-Path $PSScriptRoot 'server\common.ps1')
$serverStopMutex = New-Object Threading.Mutex($false, ('Local\CH2CH-Start-' + $serverProjectHash))
$serverHaveLock = $false
try {
  try { $serverHaveLock = $serverStopMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $serverHaveLock = $true }
  if (-not $serverHaveLock) { throw 'Another start/stop operation is already in progress.' }
  $state = Get-ServerState
  $remaining = @{}
  foreach ($name in @('runner', 'dashboard')) {
    $entry = $state[$name]
    if (-not $entry) { continue }
    if (-not (Get-Process -Id $entry.pid -ErrorAction SilentlyContinue)) { continue }
    if (-not (Test-ServerProcessOwned $entry)) {
      $remaining[$name] = $entry
      Write-Warning "Unverified/reused $name PID: $($entry.pid). NOT stopped."
      continue
    }
    & taskkill.exe /PID $entry.pid /T /F | Out-Null
    if ($LASTEXITCODE -ne 0) { $remaining[$name] = $entry; Write-Warning "Could not stop $name." }
    else { Write-Host "[CH2CH] Stopped own $name process." }
  }
  Save-ServerState $remaining
  if ($remaining.Count) { throw 'Some recorded processes were left intact. Review them before restarting.' }
  Write-Host '[CH2CH] Recorded services stopped. Files, logs and business data were kept.'
  if (-not $NoPause) { Read-Host 'Press Enter to close' }
} finally {
  if ($serverHaveLock) { $serverStopMutex.ReleaseMutex() }
  $serverStopMutex.Dispose()
}
