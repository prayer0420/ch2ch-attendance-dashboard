# Read-only health check for the local CH2CH server. Changes nothing.
$ErrorActionPreference = 'Stop'
$project = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
. (Join-Path $project 'scripts\server\common.ps1')
Set-Location -LiteralPath $project
function Line([string]$label, [string]$value) { Write-Output ('{0,-16} {1}' -f $label, $value) }
function Http([string]$url) {
  try {
    $r = [Net.HttpWebRequest]::Create($url); $r.Timeout = 4000; $r.AllowAutoRedirect = $false
    $resp = $r.GetResponse(); $c = [int]$resp.StatusCode; $resp.Close(); return $c
  } catch [Net.WebException] { if ($_.Exception.Response) { return [int]$_.Exception.Response.StatusCode }; return 0 }
}

Write-Output '== CH2CH status =='
$state = Get-ServerState
foreach ($name in @('dashboard', 'runner')) {
  $e = $state[$name]
  if (-not $e) { Line $name 'not recorded'; continue }
  $owned = Test-ServerProcessOwned $e
  $extra = if ($name -eq 'dashboard') { " mode=$($e.mode) build=$($e.buildDir)" } else { '' }
  Line $name ("{0} pid={1} since={2}{3}" -f ($(if ($owned) { 'RUNNING' } else { 'STOPPED/unverified' })), $e.pid, $e.startedAt, $extra)
}
$guardFile = Join-Path $serverRuntime 'runner-guard.json'
if (Test-Path -LiteralPath $guardFile) {
  $g = Get-Content -LiteralPath $guardFile -Raw -Encoding UTF8 | ConvertFrom-Json
  Line 'runner guard' $(if (Test-ServerProcessOwned $g) { "RUNNING pid=$($g.pid)" } else { 'STOPPED' })
} else { Line 'runner guard' 'not recorded' }

$listen = @(Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue)
Line 'port 3000' $(if ($listen.Count) { ($listen | ForEach-Object { "$($_.LocalAddress) pid=$($_.OwningProcess)" }) -join ', ' } else { 'not listening' })
$login = Http 'http://127.0.0.1:3000/login'; $api = Http 'http://127.0.0.1:3000/api/app'
Line 'http' ("/login={0} (want 200)  /api/app={1} (want 401)" -f $login, $api)

$active = Join-Path $serverRuntime 'active-build.json'
if (Test-Path -LiteralPath $active) { Line 'active build' ((Get-Content -LiteralPath $active -Raw | ConvertFrom-Json).dir) }

Write-Output ''
Write-Output '== data store / queue (read-only) =='
& $serverNode (Join-Path $PSScriptRoot 'status-db.js')

Write-Output ''
Write-Output '== autostart =='
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'CH2CH-Local-Autostart.lnk'
Line 'startup link' $(if (Test-Path -LiteralPath $lnk) { 'registered' } else { 'MISSING' })
$log = Join-Path $serverRuntime 'autostart-local.log'
if (Test-Path -LiteralPath $log) { Get-Content -LiteralPath $log -Tail 6 -Encoding UTF8 | ForEach-Object { "  $_" } }
$latestErr = Get-ChildItem -LiteralPath $serverRuntime -Filter 'runner-*.err.log' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if ($latestErr -and $latestErr.Length -gt 0) {
  Write-Output ''
  Write-Output "== latest runner error log: $($latestErr.Name) =="
  Get-Content -LiteralPath $latestErr.FullName -Tail 10 -Encoding UTF8 | ForEach-Object { "  $_" }
}
