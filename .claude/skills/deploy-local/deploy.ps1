# Rebuild and switch the local CH2CH production server (web + Runner) on this PC.
# Order: idle check -> build into the inactive slot -> stop -> switch slot -> start -> verify.
# On a failed start it switches back to the previous build and starts that again.
param([switch]$SkipBuild, [switch]$Force)
$ErrorActionPreference = 'Stop'
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
. (Join-Path $project 'scripts\server\common.ps1')
Set-Location -LiteralPath $project
$slots = Join-Path $project 'scripts\server\build-slots.js'
function Step([string]$m) { Write-Output "[deploy] $m" }
function Http([string]$url) {
  try {
    $r = [Net.HttpWebRequest]::Create($url); $r.Timeout = 5000; $r.AllowAutoRedirect = $false
    $resp = $r.GetResponse(); $c = [int]$resp.StatusCode; $resp.Close(); return $c
  } catch [Net.WebException] { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }; return 0 }
}
function Start-Services {
  & (Join-Path $project 'scripts\start-local.ps1') -Production -NoPause
  $s = Get-ServerState
  return ((Test-ServerProcessOwned $s.dashboard) -and (Test-ServerProcessOwned $s.runner) -and
    (Http 'http://127.0.0.1:3000/login') -eq 200 -and (Http 'http://127.0.0.1:3000/api/app') -eq 401)
}

# 1. Never restart in the middle of attendance/QR work.
if (-not $Force) {
  & $serverNode (Join-Path $project 'scripts\server\check-idle.js')
  if ($LASTEXITCODE -ne 0) { throw 'Jobs are waiting/running or the queue could not be checked. Nothing was changed. Re-run after they finish.' }
}

$previous = (& $serverNode $slots active).Trim()
$target = $previous
# 2. Build into the slot the running server is NOT using.
if (-not $SkipBuild) {
  Step "building (active stays $previous)..."
  # No 2>&1: Windows PowerShell turns native stderr into terminating errors under 'Stop'.
  # next/tsc inherit the console, so only build.js's own summary lines are captured here.
  $out = @(& $serverNode (Join-Path $project 'scripts\server\build.js'))
  $out | ForEach-Object { "  $_" }
  if ($LASTEXITCODE -ne 0) { throw 'Build or type check failed. The running server was not touched.' }
  $line = $out | Where-Object { "$_" -like 'BUILD_DIR=*' } | Select-Object -Last 1
  if (-not $line) { throw 'Build finished without reporting BUILD_DIR. Running server untouched.' }
  $target = ("$line" -replace '^BUILD_DIR=', '').Trim()
}

# 3. Stop, switch, start.
Step 'stopping web + Runner (guard stays and will not interfere while web is down)...'
& (Join-Path $project 'scripts\stop-local.ps1') -NoPause
& $serverNode $slots set $target | Out-Null
Step "starting from $target..."
$ok = $false
try { $ok = Start-Services } catch { Step "start failed: $($_.Exception.Message)" }

if (-not $ok) {
  if ($target -ne $previous) {
    Step "new build did not come up; rolling back to $previous"
    try { & (Join-Path $project 'scripts\stop-local.ps1') -NoPause } catch {}
    & $serverNode $slots set $previous | Out-Null
    if (Start-Services) { throw "Deploy failed; rolled back to $previous and it is serving again. See .local-runtime/dashboard-*.err.log." }
  }
  throw 'Deploy failed and the service is not healthy. Check .local-runtime logs.'
}
# Dev runs rewrite this generated file; keep the repo clean.
& git checkout -- next-env.d.ts 2>$null
Step "done: serving $target  (/login=200, /api/app=401, web + Runner running)"
