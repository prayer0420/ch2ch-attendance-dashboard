$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'autostart-policy.ps1')
function Assert-True([bool]$Value, [string]$Label) { if (-not $Value) { throw $Label } }
$boot = [DateTime]::Parse('2026-09-22T00:00:00Z').ToUniversalTime()
$old = @{ startedAt='2026-09-21T23:59:59Z'; pid=123 }
$current = @{ startedAt='2026-09-22T00:00:00Z'; pid=123 }
Assert-True (Test-EntriesBeforeBoot @($old) $boot) 'Old record should be archived.'
Assert-True (-not (Test-EntriesBeforeBoot @($old, $current) $boot)) 'A mixed record must remain.'
Assert-True (-not (Test-EntriesBeforeBoot @() $boot)) 'Empty state must remain.'
Assert-True (-not (Test-EntriesBeforeBoot @(@{ startedAt='invalid' }) $boot)) 'Invalid timestamp must fail closed.'
Assert-True (-not (Test-EntriesBeforeBoot @(@{ pid=123 }) $boot)) 'Missing timestamp must fail closed.'
$fixture = Join-Path ([IO.Path]::GetTempPath()) ('ch2ch-autostart-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $fixture | Out-Null
$stateFile = Join-Path $fixture 'processes.json'
@{ dashboard=$old } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
$beforeHash = (Get-FileHash -LiteralPath $stateFile).Hash
Move-PreBootState $fixture 'processes.json' $boot
Assert-True (-not (Test-Path -LiteralPath $stateFile)) 'Previous boot record still blocks startup.'
$archived = @(Get-ChildItem -LiteralPath $fixture -Filter 'processes.json.before-boot-*.json')
Assert-True ($archived.Count -eq 1 -and (Get-FileHash -LiteralPath $archived[0].FullName).Hash -eq $beforeHash) 'Old state not preserved exactly.'
@{ dashboard=$current } | ConvertTo-Json | Set-Content -LiteralPath $stateFile -Encoding UTF8
$currentHash = (Get-FileHash -LiteralPath $stateFile).Hash
Move-PreBootState $fixture 'processes.json' $boot
Assert-True ((Get-FileHash -LiteralPath $stateFile).Hash -eq $currentHash) 'Current-boot state changed.'
$refused = $false
try { Move-PreBootState $fixture '..\outside.json' $boot } catch { $refused = $true }
Assert-True $refused 'Unexpected state path was accepted.'
$exe = 'C:\fixture\ngrok.exe'; $config = 'C:\fixture\ngrok.yml'; $origin = 'https://fixture.ngrok-free.dev'
$entry = @{ pid=123; startedAt=$boot.ToString('O'); executable=$exe; configFile=$config; origin=$origin }
$process = [pscustomobject]@{ Id=123; StartTime=$boot }
$details = [pscustomobject]@{ ProcessId=123; ExecutablePath=$exe; CommandLine="$exe http http://127.0.0.1:3000 --url $origin --config $config" }
Assert-True (Test-TunnelIdentity $entry $process $details $exe $config $origin) 'Owned process rejected.'
$process.StartTime = $boot.AddSeconds(1)
Assert-True (-not (Test-TunnelIdentity $entry $process $details $exe $config $origin)) 'Reused PID was accepted.'
$process.StartTime = $boot
$details.ExecutablePath = 'C:\unrelated.exe'
Assert-True (-not (Test-TunnelIdentity $entry $process $details $exe $config $origin)) 'Unrelated executable accepted.'
$details.ExecutablePath = $exe
$details.CommandLine = "$exe http http://127.0.0.1:9999"
Assert-True (-not (Test-TunnelIdentity $entry $process $details $exe $config $origin)) 'Wrong tunnel target accepted.'
$source = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'autostart.ps1') -Raw
Assert-True ($source.Contains("'-Production', '-WebOnly', '-NoPause'")) 'Web launcher must remain web-only so Runner attaches through its verified launcher.'
Assert-True ($source.Contains("start-runner.ps1") -and $source.Contains('$script:runnerStarted = $true')) 'Autostart must verify and report Runner startup.'
Assert-True ($source.Contains('WaitForExit(90000)') -and $source.Contains('-RedirectStandardOutput')) 'Launcher must wait on the helper with detached output.'
Assert-True ($source.Contains("Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1")) 'Use the Windows runtime signing module even with an inherited PowerShell 7 module path.'
Assert-True ($source -notmatch 'Stop-Process|ExecutionPolicy|Set-NetFirewall|Register-ScheduledTask') 'Autostart must not kill processes or change OS protections.'
Write-Output 'PASS: pre-boot state preservation, current-state retention, path restriction, reused PID rejection, tunnel identity, separate verified Runner policy. No real service or startup setting changed.'
