param(
  [Parameter(Mandatory=$true)][string]$ExecutablePath,
  [ValidateRange(0,60)][int]$DelaySeconds = 15,
  [ValidateRange(1,12)][int]$MaxAttempts = 6,
  [ValidateRange(1,30)][int]$RetrySeconds = 10
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
. (Join-Path $PSScriptRoot 'autostart-policy.ps1')
$startupMutex = New-Object Threading.Mutex($false, ('Local\CH2CH-Autostart-' + $serverProjectHash))
$startupLocked = $false
$startupStatusFile = Join-Path $serverPrivateDirectory 'autostart-status.json'
$startupLogFile = Join-Path $serverPrivateDirectory 'autostart.log'
$script:runnerStarted = $false

function Write-StartupStatus([string]$Phase, [string]$Result, [int]$Attempt) {
  New-Item -ItemType Directory -Path $serverPrivateDirectory -Force | Out-Null
  $status = @{ timestamp=[DateTime]::UtcNow.ToString('O'); phase=$Phase; result=$Result; attempt=$Attempt; runnerStarted=$script:runnerStarted; launcherPid=$PID }
  $status | ConvertTo-Json | Set-Content -LiteralPath $startupStatusFile -Encoding UTF8
  # Controlled status labels only: no exceptions, request bodies, or credentials.
  Add-Content -LiteralPath $startupLogFile -Encoding UTF8 -Value ("$($status.timestamp) phase=$Phase result=$Result attempt=$Attempt")
}

function Get-StartupHttpStatus([string]$Url, [switch]$Public) {
  $response = $null
  try {
    $request = [Net.HttpWebRequest]::Create($Url)
    $request.Timeout = 5000; $request.ReadWriteTimeout = 5000; $request.AllowAutoRedirect = $false
    if ($Public) { $request.Headers.Add('ngrok-skip-browser-warning', '1') }
    $response = $request.GetResponse()
    return [int]$response.StatusCode
  } catch [Net.WebException] {
    if ($_.Exception.Response) { $response = $_.Exception.Response; return [int]$response.StatusCode }
    return 0
  } finally { if ($response) { $response.Close() } }
}

function Archive-PreviousBootRecords([DateTime]$BootTime) {
  foreach ($item in @(@{ lock='Start'; file='processes.json' }, @{ lock='Tunnel'; file='ngrok-process.json' })) {
    $guard = New-Object Threading.Mutex($false, ('Local\CH2CH-' + $item.lock + '-' + $serverProjectHash))
    $held = $false
    try {
      try { $held = $guard.WaitOne(0) } catch [Threading.AbandonedMutexException] { $held = $true }
      if (-not $held) { throw 'Another lifecycle operation is in progress.' }
      Move-PreBootState $serverRuntime $item.file $BootTime
    } finally { if ($held) { $guard.ReleaseMutex() }; $guard.Dispose() }
  }
}

try {
  try { $startupLocked = $startupMutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $startupLocked = $true }
  if (-not $startupLocked) { Write-Output 'Autostart is already in progress. No duplicate started.'; exit 0 }
  Write-StartupStatus 'delay' 'pending' 0
  if ($DelaySeconds) { Start-Sleep -Seconds $DelaySeconds }
  Set-Location -LiteralPath $serverProject
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  $phase = 'configuration'
  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      $phase = 'configuration'
      # Shell shortcuts can inherit a PowerShell 7 module search path. Load the
      # Windows PowerShell signing cmdlet from this runtime, not that search path.
      Import-Module (Join-Path $PSHOME 'Modules\Microsoft.PowerShell.Security\Microsoft.PowerShell.Security.psd1') -ErrorAction Stop
      # Windows PowerShell -File can preserve shortcut argument quotes in a
      # string parameter. Normalize those wrapper quotes before path lookup.
      $executable = (Resolve-Path -LiteralPath $ExecutablePath.Trim().Trim('"')).Path
      $origin = [string](Get-Content -LiteralPath (Join-Path $serverRuntime 'public-origin.json') -Raw -Encoding UTF8 | ConvertFrom-Json).origin
      if ($origin -notmatch '^https://[a-z0-9-]+\.ngrok-free\.(app|dev)$') { throw 'Public origin is not configured.' }
      $bootTime = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
      Archive-PreviousBootRecords $bootTime
      $phase = 'web'
      Write-StartupStatus $phase 'checking' $attempt
      # Do not pipe a native launcher: a detached server can inherit a pipe and
      # keep it open after its parent exits. Wait only for the helper process,
      # not its process tree. Keep app credentials out of the ngrok parent.
      $webStamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
      $webArguments = @('-NoProfile', '-NonInteractive', '-File', ('"' + (Join-Path $PSScriptRoot '..\start-local.ps1') + '"'), '-Production', '-WebOnly', '-NoPause')
      $webLauncher = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList $webArguments -WindowStyle Hidden -WorkingDirectory $serverProject -RedirectStandardOutput (Join-Path $serverPrivateDirectory "autostart-web-$webStamp.out.log") -RedirectStandardError (Join-Path $serverPrivateDirectory "autostart-web-$webStamp.err.log") -PassThru
      try {
        # Retain the native handle so Windows PowerShell can read ExitCode even
        # when the short-lived helper has already terminated.
        $webHandle = $webLauncher.Handle
        if (-not $webLauncher.WaitForExit(90000)) { throw 'Web launcher timed out. It was not killed.' }
        if ($null -eq $webLauncher.ExitCode -or $webLauncher.ExitCode -ne 0) { throw 'Web launcher failed safely.' }
      } finally { $webLauncher.Dispose() }
      $web = (Get-ServerState).dashboard
      if (-not (Test-ServerProcessOwned $web) -or $web.setupOnly -or $web.mode -ne 'start') { throw 'Unverified production web process.' }
      if ((Get-StartupHttpStatus 'http://127.0.0.1:3000/login') -ne 200 -or (Get-StartupHttpStatus 'http://127.0.0.1:3000/api/app') -ne 401) { throw 'Local authentication guard is not ready.' }
      $phase = 'runner'
      Write-StartupStatus $phase 'checking' $attempt
      $runnerStamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
      $runnerArguments = @('-NoProfile', '-NonInteractive', '-File', ('"' + (Join-Path $PSScriptRoot 'start-runner.ps1') + '"'), '-Quiet')
      $runnerLauncher = Start-Process -FilePath (Join-Path $PSHOME 'powershell.exe') -ArgumentList $runnerArguments -WindowStyle Hidden -WorkingDirectory $serverProject -RedirectStandardOutput (Join-Path $serverPrivateDirectory "autostart-runner-$runnerStamp.out.log") -RedirectStandardError (Join-Path $serverPrivateDirectory "autostart-runner-$runnerStamp.err.log") -PassThru
      try {
        $runnerHandle = $runnerLauncher.Handle
        if (-not $runnerLauncher.WaitForExit(90000)) { throw 'Runner launcher timed out. It was not killed.' }
        if ($null -eq $runnerLauncher.ExitCode -or $runnerLauncher.ExitCode -ne 0) { throw 'Runner launcher failed safely.' }
      } finally { $runnerLauncher.Dispose() }
      $runnerState = (Get-ServerState).runner
      if (-not (Test-ServerProcessOwned $runnerState)) { throw 'Runner ownership verification failed.' }
      $script:runnerStarted = $true
      $phase = 'tunnel'
      Write-StartupStatus $phase 'checking' $attempt
      $tunnelState = Join-Path $serverRuntime 'ngrok-process.json'
      $tunnelAlive = $false
      if (Test-Path -LiteralPath $tunnelState) {
        $entry = Get-Content -LiteralPath $tunnelState -Raw -Encoding UTF8 | ConvertFrom-Json
        $existing = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
        if ($existing) {
          $details = Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.pid)"
          if (-not (Test-TunnelIdentity $entry $existing $details $executable (Join-Path $PSScriptRoot 'ngrok.yml') $origin)) { throw 'Tunnel identity mismatch. Nothing was stopped.' }
          $tunnelAlive = $true
        }
      }
      if (-not $tunnelAlive) { & (Join-Path $PSScriptRoot 'start-tunnel.ps1') -ExecutablePath $executable *> $null }
      $phase = 'public-https'
      if ((Get-StartupHttpStatus ($origin + '/login') -Public) -ne 200 -or (Get-StartupHttpStatus ($origin + '/api/app') -Public) -ne 401) { throw 'Public HTTPS is not ready.' }
      Write-StartupStatus 'ready' 'passed' $attempt
      Write-Output 'Web, Runner, and HTTPS tunnel ready. Existing non-queued records were preserved.'
      exit 0
    } catch {
      $errorType = $_.Exception.GetType().Name
      $errorScript = [IO.Path]::GetFileName([string]$_.InvocationInfo.ScriptName)
      $errorLine = $_.InvocationInfo.ScriptLineNumber
      Add-Content -LiteralPath $startupLogFile -Encoding UTF8 -Value ("failure-type=$errorType script=$errorScript line=$errorLine")
      if ($_.Exception -is [Management.Automation.CommandNotFoundException]) {
        Add-Content -LiteralPath $startupLogFile -Encoding UTF8 -Value ('missing-command=' + $_.Exception.CommandName)
      }
      Write-StartupStatus $phase 'retry' $attempt
      if ($attempt -lt $MaxAttempts) { Start-Sleep -Seconds $RetrySeconds }
    }
  }
  Write-StartupStatus $phase 'failed' $MaxAttempts
  Write-Output 'Autostart did not become ready. Check autostart-status.json; no unrelated process was stopped.'
  exit 1
} finally {
  if ($startupLocked) { $startupMutex.ReleaseMutex() }
  $startupMutex.Dispose()
}
