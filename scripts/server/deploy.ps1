param([switch]$SkipBuild, [switch]$NoPause)
# Build the new version beside the running server, smoke-test it, then restart
# into it. A failed build or smoke test leaves the running server untouched;
# a failed restart switches back to the previous build automatically.
. (Join-Path $PSScriptRoot 'common.ps1')
# No credentials are loaded here: the build and smoke test must never see the
# real access code. start-local.ps1 and start-runner.ps1 load them themselves.
$deployMutex = New-Object Threading.Mutex($false, ('Local\CH2CH-Deploy-' + $serverProjectHash))
$deployLocked = $false

function Test-LocalLogin {
  for ($attempt = 0; $attempt -lt 3; $attempt++) {
    try {
      $login = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/login' -UseBasicParsing -TimeoutSec 10
      $api = try { (Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/app' -UseBasicParsing -TimeoutSec 10).StatusCode } catch { [int]$_.Exception.Response.StatusCode }
      if ($login.StatusCode -eq 200 -and $api -eq 401) { return $true }
    } catch {}
    Start-Sleep -Seconds 2
  }
  return $false
}

function Start-Services {
  & (Join-Path $PSScriptRoot '..\start-local.ps1') -Production -WebOnly -NoPause
  # The web server decides success; a Runner problem is reported without rolling back.
  try { & (Join-Path $PSScriptRoot 'start-runner.ps1') -Quiet } catch { Write-Warning ('[deploy] Runner did not start: ' + $_.Exception.Message) }
}

$exitCode = 0
try {
  try { $deployLocked = $deployMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $deployLocked = $true }
  if (-not $deployLocked) { throw 'Another deploy is already running.' }
  Set-Location -LiteralPath $serverProject
  $watch = [Diagnostics.Stopwatch]::StartNew()
  if (-not $SkipBuild) {
    Write-Host '[deploy] 1/4 Building the new version. The current server keeps running.'
    & $serverNode (Join-Path $PSScriptRoot 'build.js')
    if ($LASTEXITCODE -ne 0) { throw 'Build failed. The running server was not changed.' }
  }
  $pendingFile = Join-Path $serverRuntime 'pending-build.json'
  if (-not (Test-Path -LiteralPath $pendingFile)) { throw 'No new build is waiting. Run deploy-server.cmd without -SkipBuild.' }
  $target = [string](Get-Content -LiteralPath $pendingFile -Raw -Encoding UTF8 | ConvertFrom-Json).dir
  if (@('.local-runtime/server-build', '.local-runtime/server-build-b') -notcontains $target) { throw 'Unknown pending build folder.' }
  $previous = Get-ActiveBuildDir
  if ($target -eq $previous) { throw 'The pending build is already active.' }

  Write-Host '[deploy] 2/4 Smoke-testing the new build on a separate local port.'
  & $serverNode (Join-Path $PSScriptRoot 'smoke-build.js') $target
  if ($LASTEXITCODE -ne 0) { throw 'Smoke test failed. The running server was not changed.' }

  & $serverNode (Join-Path $PSScriptRoot 'check-idle.js')
  if ($LASTEXITCODE -ne 0) { throw 'Restart postponed: wait for the job to finish, then run deploy-server.cmd -SkipBuild.' }

  Write-Host '[deploy] 3/4 Restarting into the new build (a few seconds of downtime).'
  $downtime = [Diagnostics.Stopwatch]::StartNew()
  & (Join-Path $PSScriptRoot '..\stop-local.ps1') -NoPause
  & $serverNode (Join-Path $PSScriptRoot 'build-slots.js') set $target | Out-Null
  $started = $false
  try { Start-Services; $started = Test-LocalLogin } catch { Write-Warning $_.Exception.Message }
  if (-not $started) {
    Write-Warning '[deploy] The new build did not start. Switching back to the previous build.'
    try { & (Join-Path $PSScriptRoot '..\stop-local.ps1') -NoPause } catch {}
    & $serverNode (Join-Path $PSScriptRoot 'build-slots.js') set $previous | Out-Null
    Start-Services
    throw 'Deploy failed and the previous build was restored.'
  }
  Remove-Item -LiteralPath $pendingFile -Force
  Write-Host ('[deploy] 4/4 Done. Downtime {0:N0}s, total {1:N0}s. Active build: {2}' -f $downtime.Elapsed.TotalSeconds, $watch.Elapsed.TotalSeconds, $target)
  $originFile = Join-Path $serverRuntime 'public-origin.json'
  if (Test-Path -LiteralPath $originFile) {
    $origin = [string](Get-Content -LiteralPath $originFile -Raw -Encoding UTF8 | ConvertFrom-Json).origin
    try {
      $public = Invoke-WebRequest -Uri ($origin + '/login') -Headers @{ 'ngrok-skip-browser-warning' = '1' } -UseBasicParsing -TimeoutSec 15
      Write-Host "[deploy] External address responded: $($public.StatusCode)"
    } catch { Write-Warning '[deploy] External address did not respond yet. The local server is running.' }
  }
} catch {
  Write-Host ('[deploy] ' + $_.Exception.Message) -ForegroundColor Red
  $exitCode = 1
} finally {
  if ($deployLocked) { $deployMutex.ReleaseMutex() }
  $deployMutex.Dispose()
}
if (-not $NoPause) { Read-Host 'Press Enter to close' | Out-Null }
exit $exitCode
