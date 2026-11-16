. (Join-Path $PSScriptRoot 'common.ps1')
$guardFile = Join-Path $serverRuntime 'runner-guard.json'
if (Test-Path -LiteralPath $guardFile) {
  $guardRecord = Get-Content -LiteralPath $guardFile -Raw -Encoding UTF8 | ConvertFrom-Json
  if (Test-ServerProcessOwned $guardRecord) { Write-Output 'Runner guard already running.'; return }
}
# A duplicate launch exits under the guard's mutex; no existing PID is terminated.
$guardScript = Join-Path $PSScriptRoot 'runner-guard.ps1'
$guardArgs = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $guardScript + '"'
$privateKeys = @('APP_ACCESS_PASSWORD','APP_SESSION_TOKEN','QR_WORKER_TOKEN','NGROK_AUTHTOKEN','SUPABASE_SERVICE_ROLE_KEY')
$savedEnvironment = @{}
try {
  foreach ($key in $privateKeys) {
    $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
    [Environment]::SetEnvironmentVariable($key, $null, 'Process')
  }
  $guardProcess = Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -ArgumentList $guardArgs -WindowStyle Hidden -WorkingDirectory $serverProject -RedirectStandardOutput (Join-Path $serverPrivateDirectory 'runner-guard.out.log') -RedirectStandardError (Join-Path $serverPrivateDirectory 'runner-guard.err.log') -PassThru
} finally {
  foreach ($key in $privateKeys) { [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process') }
}
Write-Output 'Runner guard launched; existing web and Runner were not restarted.'
