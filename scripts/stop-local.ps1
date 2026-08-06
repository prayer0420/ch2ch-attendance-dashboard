
param(
  [switch]$NoPause
)

$root = Split-Path -Parent $PSScriptRoot
$stateFile = Join-Path $root ".local-runtime\processes.json"

if (-not (Test-Path -LiteralPath $stateFile)) {
  Write-Host "[CH2CH] No recorded local processes for this project."
  if (-not $NoPause) { Read-Host "Press Enter to close" }
  exit 0
}

$state = Get-Content -Raw -Encoding UTF8 -LiteralPath $stateFile | ConvertFrom-Json
$stopFailed = $false

foreach ($entryName in @("dashboard", "runner")) {
  $entry = $state.$entryName
  if (-not $entry) { continue }

  $process = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
  if (-not $process) {
    Write-Host "[CH2CH] $entryName is already stopped."
    continue
  }

  $recordedStart = [DateTime]::Parse($entry.startedAt).ToUniversalTime()
  $actualStart = $process.StartTime.ToUniversalTime()
  if ([Math]::Abs(($actualStart - $recordedStart).TotalSeconds) -gt 2) {
    Write-Warning "$entryName PID seems reused by another process. Not stopping PID=$($entry.pid)"
    continue
  }

  & taskkill.exe /PID $entry.pid /T /F | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[CH2CH] Stopped $entryName. PID=$($entry.pid)"
  } else {
    Write-Warning "Could not stop $entryName. PID=$($entry.pid)"
    $stopFailed = $true
  }
}

if (-not $stopFailed) {
  Remove-Item -LiteralPath $stateFile -Force
}
if (-not $NoPause) { Read-Host "Press Enter to close" }
if ($stopFailed) { exit 1 }
exit 0
