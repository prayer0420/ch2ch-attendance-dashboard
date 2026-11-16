$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'runner-guard-policy.ps1')
function Assert-Equal($Actual, $Expected, [string]$Label) { if ($Actual -ne $Expected) { throw "$Label : $Actual" } }
Assert-Equal (Get-RunnerGuardDecision $true $true $true) 'online' 'Live Runner must be preserved'
Assert-Equal (Get-RunnerGuardDecision $true $false $false) 'start-runner' 'Dead Runner must recover'
Assert-Equal (Get-RunnerGuardDecision $true $false $true) 'identity-conflict' 'Reused PID must block'
Assert-Equal (Get-RunnerGuardDecision $false $false $false) 'waiting-for-web' 'Stopped web must stay stopped'
Assert-Equal (Get-RunnerGuardDecision $false $true $true) 'online' 'Temporary web outage must not kill Runner'
$startCount = 0
$running = $false
foreach ($tick in 1..3) {
  if ((Get-RunnerGuardDecision $true $running $running) -eq 'start-runner') { $startCount++; $running = $true }
}
Assert-Equal $startCount 1 'Repeated checks must not duplicate Runner'
foreach ($name in @('runner-guard-policy.ps1','runner-guard.ps1','start-runner-guard.ps1','start-runner.ps1','register-autostart.ps1','..\start-local.ps1')) {
  $parseErrors = $null; $tokens = $null
  [void][Management.Automation.Language.Parser]::ParseFile((Join-Path $PSScriptRoot $name), [ref]$tokens, [ref]$parseErrors)
  Assert-Equal $parseErrors.Count 0 "PowerShell syntax: $name"
}
$guard = Get-Content (Join-Path $PSScriptRoot 'runner-guard.ps1') -Raw
if ($guard -match 'Stop-Process|taskkill|\.update\(|\.delete\(') { throw 'Guard must not terminate or mutate business records' }
if (-not $guard.Contains('-Quiet -NoGuard')) { throw 'Guard must not recursively start itself' }
if (-not $guard.Contains('CH2CH-RunnerGuard-')) { throw 'Guard must be single instance' }
$runner = Get-Content (Join-Path $PSScriptRoot 'start-runner.ps1') -Raw
if (-not $runner.Contains('$guardReady -and -not $NoGuard')) { throw 'Verified start must enable guard' }
$start = Get-Content (Join-Path $PSScriptRoot '..\start-local.ps1') -Raw
$listenerBranch = $start.Substring($start.IndexOf('if ($listeners.Count)'), $start.IndexOf("foreach (`$name") - $start.IndexOf('if ($listeners.Count)'))
if (-not $listenerBranch.Contains('server\start-runner.ps1')) { throw 'Existing web must also check Runner' }
Write-Output 'PASS: recovery, no duplicate, reused PID blocked, stopped web preserved, no live-job termination, PowerShell syntax, unified startup.'
