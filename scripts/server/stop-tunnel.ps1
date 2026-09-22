. (Join-Path $PSScriptRoot 'common.ps1')
$tunnelStateFile = Join-Path $serverRuntime 'ngrok-process.json'
$tunnelLock = New-Object Threading.Mutex($false, ('Local\CH2CH-Tunnel-' + $serverProjectHash))
$haveLock = $false
try {
  try { $haveLock = $tunnelLock.WaitOne(0) } catch [Threading.AbandonedMutexException] { $haveLock = $true }
  if (-not $haveLock) { throw 'Another tunnel operation is in progress.' }
  if (-not (Test-Path -LiteralPath $tunnelStateFile)) { Write-Output 'No recorded tunnel.'; return }
  $entry = Get-Content -LiteralPath $tunnelStateFile -Raw | ConvertFrom-Json
  $process = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
  if (-not $process) { Write-Output 'Recorded tunnel is already stopped.'; return }
  $created = [DateTime]::Parse([string]$entry.startedAt).ToUniversalTime()
  $details = Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.pid)"
  if ([Math]::Abs(($process.StartTime.ToUniversalTime() - $created).TotalMilliseconds) -gt 100 -or $details.ExecutablePath -ine $entry.executable -or $details.CommandLine.IndexOf([string]$entry.configFile,[StringComparison]::OrdinalIgnoreCase) -lt 0 -or $details.CommandLine -notmatch 'http://127\.0\.0\.1:3000') { throw 'Tunnel identity mismatch; nothing stopped.' }
  Stop-Process -Id $process.Id -ErrorAction Stop
  Write-Output 'Stopped only this project tunnel. The local web server and business data were preserved.'
} finally { if ($haveLock) { $tunnelLock.ReleaseMutex() }; $tunnelLock.Dispose() }
