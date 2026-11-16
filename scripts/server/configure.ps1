param([switch]$Reset)
. (Join-Path $PSScriptRoot 'common.ps1')
Add-Type -AssemblyName System.Security
if ($Reset) {
  if (-not (Test-Path -LiteralPath $serverAuthFile)) { throw 'Authentication is not configured. Run configure-server.cmd first.' }
  Write-Host 'CH2CH local server: reset app access code'
} else {
  if (Test-Path -LiteralPath $serverAuthFile) { throw 'Authentication already exists. Run reset-access-code.cmd to replace it.' }
  Write-Host 'CH2CH local server: first-time login setup'
}
Write-Host 'Choose a NEW non-empty app access code. Short codes are unsafe for the public HTTPS address.'
Write-Host 'Do not use your Windows or church password.'
Write-Host 'The input is hidden. Do not send it in chat. Existing .env.local is unchanged.'
$first = Read-Host 'New app access code' -AsSecureString
$second = Read-Host 'Confirm app access code' -AsSecureString
$firstPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($first)
$secondPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($second)
try {
  $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($firstPointer)
  $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secondPointer)
  if (-not $value.Trim() -or $value.Length -gt 256) { throw 'Use a non-empty code of at most 256 characters.' }
  if ($value -cne $confirmation) { throw 'The two entries do not match. No settings were saved.' }
  if ($Reset) {
    $oldBytes = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($serverAuthFile), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    try {
      $oldSettings = [Text.Encoding]::UTF8.GetString($oldBytes) | ConvertFrom-Json
      $workerToken = [string]$oldSettings.QR_WORKER_TOKEN
      if ($workerToken.Length -lt 32) { throw 'Existing QR Worker credential is incomplete. Nothing was changed.' }
    } finally { [Array]::Clear($oldBytes, 0, $oldBytes.Length) }
  }
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $sessionBytes = New-Object byte[] 48
    $generator.GetBytes($sessionBytes)
    if (-not $Reset) {
      $workerBytes = New-Object byte[] 48
      $generator.GetBytes($workerBytes)
      $workerToken = [Convert]::ToBase64String($workerBytes)
    }
  } finally { $generator.Dispose() }
  $settings = @{ APP_ACCESS_PASSWORD = $value; APP_SESSION_TOKEN = [Convert]::ToBase64String($sessionBytes); QR_WORKER_TOKEN = $workerToken }
  $bytes = [Text.Encoding]::UTF8.GetBytes(($settings | ConvertTo-Json -Compress))
  $encrypted = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  $verified = [Security.Cryptography.ProtectedData]::Unprotect($encrypted, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  if ([Convert]::ToBase64String($bytes) -cne [Convert]::ToBase64String($verified)) { throw 'Encryption verification failed.' }
  New-Item -ItemType Directory -Path $serverPrivateDirectory -Force | Out-Null
  if ($Reset) {
    $temporary = Join-Path $serverPrivateDirectory ('auth-' + [guid]::NewGuid().ToString('N') + '.tmp')
    $backup = Join-Path $serverPrivateDirectory 'auth.before-reset.dpapi'
    try {
      [IO.File]::WriteAllBytes($temporary, $encrypted)
      [IO.File]::Replace($temporary, $serverAuthFile, $backup)
    } finally { if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force } }
    Write-Host 'Saved encrypted replacement outside OneDrive. An encrypted recovery copy was retained.'
    Write-Host 'Previous web sessions will end after server restart.'
  } else {
    $stream = [IO.File]::Open($serverAuthFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    try { $stream.Write($encrypted, 0, $encrypted.Length) } finally { $stream.Dispose() }
    Write-Host 'Saved encrypted app authentication outside OneDrive. No server was started.'
  }
  Write-Host 'Tell Codex it is done so the owned web server can be restarted safely.'
  Write-Host 'Existing jobs must be reviewed before starting Runner. Your access code was not displayed.'
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($firstPointer)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secondPointer)
  $value = $null; $confirmation = $null; $settings = $null
  if ($bytes) { [Array]::Clear($bytes, 0, $bytes.Length) }
  if ($verified) { [Array]::Clear($verified, 0, $verified.Length) }
  if ($sessionBytes) { [Array]::Clear($sessionBytes, 0, $sessionBytes.Length) }
  if ($workerBytes) { [Array]::Clear($workerBytes, 0, $workerBytes.Length) }
  $first.Dispose(); $second.Dispose()
}
