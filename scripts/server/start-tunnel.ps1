param([Parameter(Mandatory=$true)][string]$ExecutablePath)
. (Join-Path $PSScriptRoot 'common.ps1')
$tunnelStateFile = Join-Path $serverRuntime 'ngrok-process.json'
$tunnelLock = New-Object Threading.Mutex($false, ('Local\CH2CH-Tunnel-' + $serverProjectHash))
$haveLock = $false
try {
  try { $haveLock = $tunnelLock.WaitOne(0) } catch [Threading.AbandonedMutexException] { $haveLock = $true }
  if (-not $haveLock) { throw 'Another tunnel operation is in progress.' }
  if (Test-Path -LiteralPath $tunnelStateFile) {
    $existing = Get-Content -LiteralPath $tunnelStateFile -Raw | ConvertFrom-Json
    if (Get-Process -Id $existing.pid -ErrorAction SilentlyContinue) { throw 'A recorded tunnel process still exists. Nothing was stopped or started.' }
  }
  $webState = Get-ServerState
  if (-not (Test-ServerProcessOwned $webState.dashboard) -or $webState.dashboard.setupOnly) { throw 'The configured, owned web server must already be running.' }
  $listeners = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction Stop)
  if ($listeners.Count -ne 1 -or $listeners[0].LocalAddress -ne '127.0.0.1' -or $listeners[0].OwningProcess -ne $webState.dashboard.pid) { throw 'Unexpected web listener. Refusing to publish.' }
  $originConfig = Get-Content -LiteralPath (Join-Path $serverRuntime 'public-origin.json') -Raw | ConvertFrom-Json
  $publicOrigin = [string]$originConfig.origin
  if ($publicOrigin -notmatch '^https://[a-z0-9-]+\.ngrok-free\.(app|dev)$') { throw 'An approved ngrok free HTTPS origin is required.' }
  $executable = (Resolve-Path -LiteralPath $ExecutablePath).Path
  $signature = Get-AuthenticodeSignature -LiteralPath $executable
  if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O="ngrok, Inc\."') { throw 'Official ngrok executable signature check failed.' }
  $configFile = Join-Path $PSScriptRoot 'ngrok.yml'
  & $executable config check --config $configFile
  if ($LASTEXITCODE -ne 0) { throw 'Tunnel configuration check failed.' }
  Add-Type -AssemblyName System.Security
  $decoded = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes((Join-Path $serverPrivateDirectory 'ngrok.dpapi')), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  try {
    $env:NGROK_AUTHTOKEN = [Text.Encoding]::UTF8.GetString($decoded)
    if ($env:NGROK_AUTHTOKEN -notmatch '^[A-Za-z0-9_-]{20,256}$') { throw 'Stored credential format is invalid.' }
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $process = Start-Process -FilePath $executable -ArgumentList @('http','http://127.0.0.1:3000','--url',$publicOrigin,'--inspect=false','--log=false','--config',('"' + $configFile + '"')) -WindowStyle Hidden -WorkingDirectory $serverProject -RedirectStandardOutput (Join-Path $serverRuntime "ngrok-$stamp.out.log") -RedirectStandardError (Join-Path $serverRuntime "ngrok-$stamp.err.log") -PassThru
  } finally { Remove-Item Env:\NGROK_AUTHTOKEN -ErrorAction SilentlyContinue; [Array]::Clear($decoded, 0, $decoded.Length) }
  @{ pid=$process.Id; startedAt=$process.StartTime.ToUniversalTime().ToString('O'); executable=$executable; configFile=$configFile; origin=$publicOrigin } | ConvertTo-Json | Set-Content -LiteralPath $tunnelStateFile -Encoding UTF8
  Start-Sleep -Seconds 2
  if ($process.HasExited) { throw 'Tunnel process exited. Review its error code without exposing credentials.' }
  Write-Output "Tunnel process started: $($process.Id). Verify before declaring ready: $publicOrigin"
} finally { if ($haveLock) { $tunnelLock.ReleaseMutex() }; $tunnelLock.Dispose() }
