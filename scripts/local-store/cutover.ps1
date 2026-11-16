$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../server/common.ps1')
Set-Location -LiteralPath $serverProject
Import-ServerAuthentication
$config = Join-Path $serverPrivateDirectory 'storage-provider.json'
if (Test-Path -LiteralPath $config) { throw 'Already activated; use the regular deploy command for future changes.' }
$dataDir = Join-Path $serverPrivateDirectory 'data-v1'
$journalBefore = Join-Path $dataDir 'worship-journals-before-migration.json'
$journalCurrent = Join-Path $serverRuntime 'worship-journals.json'
if ((Get-FileHash -LiteralPath $journalBefore).Hash -ne (Get-FileHash -LiteralPath $journalCurrent).Hash) { throw 'Journal changed after import; migration must be refreshed before cutover.' }
$pending = Get-Content -LiteralPath (Join-Path $serverRuntime 'pending-build.json') -Raw | ConvertFrom-Json
$target = [string]$pending.dir
if (@('.local-runtime/server-build','.local-runtime/server-build-b') -notcontains $target) { throw 'Unknown pending build.' }
$smoke = Get-Content -LiteralPath (Join-Path $serverProject ($target + '/local-store-smoke.json')) -Raw | ConvertFrom-Json
if (-not $smoke.isolated -or -not $smoke.attendanceUpload -or -not $smoke.mobileQrQueue -or -not $smoke.journalRead) { throw 'Isolated API tests have not passed.' }
$previous = Get-ActiveBuildDir
$mutex = New-Object Threading.Mutex($false, ('Local\CH2CH-Start-' + $serverProjectHash))
$locked = $false
$stopped = $false
try {
  try { $locked = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $locked = $true }
  if (-not $locked) { throw 'Another start/stop is in progress.' }
  $env:CH2CH_STORAGE_PROVIDER = 'local'
  $env:CH2CH_DATA_DIR = $dataDir
  & $serverNode (Join-Path $PSScriptRoot '../server/check-idle.js')
  if ($LASTEXITCODE -ne 0) { throw 'Local migration contains unfinished work; cutover refused.' }
  Remove-Item Env:\CH2CH_STORAGE_PROVIDER
  Remove-Item Env:\CH2CH_DATA_DIR
  & (Join-Path $PSScriptRoot '../stop-local.ps1') -NoPause
  $stopped = $true
  & $serverNode (Join-Path $PSScriptRoot 'activate.cjs')
  if ($LASTEXITCODE -ne 0) { throw 'Could not select local storage.' }
  & $serverNode (Join-Path $PSScriptRoot '../server/build-slots.js') set $target
  if ($LASTEXITCODE -ne 0) { throw 'Could not select tested build.' }
  & (Join-Path $PSScriptRoot '../start-local.ps1') -Production -WebOnly -NoPause
  & (Join-Path $PSScriptRoot '../server/start-runner.ps1') -Quiet
  & $serverNode (Join-Path $PSScriptRoot 'verify-live.cjs')
  if ($LASTEXITCODE -ne 0) { throw 'Live verification failed.' }
  Write-Output 'Cutover complete: web and Runner now share the private PC store. Supabase unchanged.'
} catch {
  if ($stopped) {
    Write-Warning 'Cutover failed; restoring the previous web build and provider. Local imported data is retained.'
    try {
      & (Join-Path $PSScriptRoot '../stop-local.ps1') -NoPause
      if (Test-Path -LiteralPath $config) { Move-Item -LiteralPath $config -Destination ($config + '.failed-' + (Get-Date -Format 'yyyyMMdd-HHmmss')) }
      & $serverNode (Join-Path $PSScriptRoot '../server/build-slots.js') set $previous
      & (Join-Path $PSScriptRoot '../start-local.ps1') -Production -WebOnly -NoPause
    } catch { Write-Warning 'Automatic rollback needs review. No database was deleted.' }
  }
  throw
} finally {
  Remove-Item Env:\CH2CH_STORAGE_PROVIDER -ErrorAction SilentlyContinue
  Remove-Item Env:\CH2CH_DATA_DIR -ErrorAction SilentlyContinue
  if ($locked) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
