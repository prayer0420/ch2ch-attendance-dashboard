$ErrorActionPreference = 'Stop'
$serverProject = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$serverRuntime = Join-Path $serverProject '.local-runtime'
$serverStateFile = Join-Path $serverRuntime 'processes.json'
$serverHashAlgorithm = [Security.Cryptography.SHA256]::Create()
try { $serverProjectHash = ([BitConverter]::ToString($serverHashAlgorithm.ComputeHash([Text.Encoding]::UTF8.GetBytes($serverProject.ToLowerInvariant())))).Replace('-', '').Substring(0, 16) }
finally { $serverHashAlgorithm.Dispose() }
$serverPrivateDirectory = Join-Path $env:LOCALAPPDATA ('CH2CH-Server\' + $serverProjectHash)
$serverAuthFile = Join-Path $serverPrivateDirectory 'auth.dpapi'
$serverNode = (Get-Command node.exe -ErrorAction Stop).Source

# Production builds alternate between two folders (see build-slots.js).
function Get-ActiveBuildDir {
  $allowed = @('.local-runtime/server-build', '.local-runtime/server-build-b')
  $pointer = Join-Path $serverRuntime 'active-build.json'
  if (Test-Path -LiteralPath $pointer) {
    try {
      $dir = [string](Get-Content -LiteralPath $pointer -Raw -Encoding UTF8 | ConvertFrom-Json).dir
      if ($allowed -contains $dir) { return $dir }
    } catch {}
  }
  return $allowed[0]
}

function Import-ServerAuthentication {
  $publicOriginFile = Join-Path $serverRuntime 'public-origin.json'
  if (Test-Path -LiteralPath $publicOriginFile) {
    $originSettings = Get-Content -LiteralPath $publicOriginFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $publicUri = [Uri]([string]$originSettings.origin)
    if (-not $publicUri.IsAbsoluteUri -or $publicUri.Scheme -ne 'https' -or $publicUri.UserInfo -or $publicUri.AbsolutePath -ne '/' -or $publicUri.Query -or $publicUri.Fragment) {
      throw 'Public origin must be a single HTTPS origin, without credentials, path or query.'
    }
    $env:APP_PUBLIC_ORIGIN = $publicUri.GetLeftPart([UriPartial]::Authority)
  }
  if (-not (Test-Path -LiteralPath $serverAuthFile)) { return }
  Add-Type -AssemblyName System.Security
  $decoded = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($serverAuthFile), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  try {
    $settings = [Text.Encoding]::UTF8.GetString($decoded) | ConvertFrom-Json
    foreach ($key in @('APP_ACCESS_PASSWORD', 'APP_SESSION_TOKEN', 'QR_WORKER_TOKEN')) {
      $value = [string]$settings.$key
      $minimum = if ($key -eq 'APP_ACCESS_PASSWORD') { 1 } else { 32 }
      if ($value.Length -lt $minimum) { throw 'Stored authentication is incomplete. Do not print or share the private file.' }
      [Environment]::SetEnvironmentVariable($key, $value, 'Process')
    }
  } finally { [Array]::Clear($decoded, 0, $decoded.Length) }
}

function Test-ServerProcessOwned($entry) {
  if (-not $entry -or -not $entry.pid -or -not $entry.startedAt -or -not $entry.scriptPath -or -not $entry.nodePath) { return $false }
  $process = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
  if (-not $process) { return $false }
  try {
    $recorded = [DateTime]::Parse($entry.startedAt).ToUniversalTime()
    if ([Math]::Abs(($process.StartTime.ToUniversalTime() - $recorded).TotalMilliseconds) -gt 100) { return $false }
    $details = Get-CimInstance Win32_Process -Filter "ProcessId=$($entry.pid)"
    return ($details.ExecutablePath -ieq $entry.nodePath -and $details.CommandLine -and $details.CommandLine.IndexOf([string]$entry.scriptPath, [StringComparison]::OrdinalIgnoreCase) -ge 0)
  } catch { return $false }
}

function Test-NextListenerChild($entry, $parent, $child, $details) {
  if (-not $entry -or -not $parent -or -not $child -or -not $details -or -not $details.CommandLine) { return $false }
  $nextServerScript = Join-Path $serverProject 'node_modules\next\dist\server\lib\start-server.js'
  try {
    return ($details.ProcessId -eq $child.Id -and $details.ParentProcessId -eq $entry.pid -and
      $details.ExecutablePath -ieq $entry.nodePath -and
      $details.CommandLine.IndexOf($nextServerScript, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
      $child.StartTime.ToUniversalTime() -ge $parent.StartTime.ToUniversalTime())
  } catch { return $false }
}

function Test-ServerListenerOwned($entry, $listener) {
  if (-not $listener -or $listener.LocalAddress -ne '127.0.0.1' -or $listener.LocalPort -ne 3000) { return $false }
  if (-not (Test-ServerProcessOwned $entry)) { return $false }
  if ($listener.OwningProcess -eq $entry.pid) { return $true }
  $parent = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
  $child = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
  if (-not $parent -or -not $child) { return $false }
  try {
    $details = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
    return (Test-NextListenerChild $entry $parent $child $details)
  } catch { return $false }
}

function Get-ServerState {
  if (-not (Test-Path -LiteralPath $serverStateFile)) { return @{} }
  $raw = Get-Content -LiteralPath $serverStateFile -Raw -Encoding UTF8 | ConvertFrom-Json
  $result = @{}
  foreach ($key in @('dashboard', 'runner')) { if ($raw.$key) { $result[$key] = $raw.$key } }
  return $result
}

function Save-ServerState($state) {
  New-Item -ItemType Directory -Path $serverRuntime -Force | Out-Null
  $temporary = Join-Path $serverRuntime ('processes-' + [guid]::NewGuid().ToString('N') + '.tmp')
  $state | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $temporary -Encoding UTF8
  Move-Item -LiteralPath $temporary -Destination $serverStateFile -Force
}
