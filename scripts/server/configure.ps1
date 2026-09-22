. (Join-Path $PSScriptRoot 'common.ps1')
Add-Type -AssemblyName System.Security
if (Test-Path -LiteralPath $serverAuthFile) { throw 'Authentication already exists. This first-time setup will not replace it or invalidate sessions.' }
Write-Host 'CH2CH local server: first-time login setup'
Write-Host 'Choose a NEW app access code, at least 12 characters. Do not use your Windows or church password.'
Write-Host 'The input is hidden. Do not send it in chat. Existing .env.local is unchanged.'
$first = Read-Host 'New app access code' -AsSecureString
$second = Read-Host 'Confirm app access code' -AsSecureString
$firstPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($first)
$secondPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($second)
try {
  $value = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($firstPointer)
  $confirmation = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secondPointer)
  if ($value.Length -lt 12 -or $value.Length -gt 256) { throw 'Use 12 to 256 characters.' }
  if ($value -cne $confirmation) { throw 'The two entries do not match. No settings were saved.' }
  $generator = [Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $sessionBytes = New-Object byte[] 48; $workerBytes = New-Object byte[] 48
    $generator.GetBytes($sessionBytes); $generator.GetBytes($workerBytes)
  } finally { $generator.Dispose() }
  $settings = @{ APP_ACCESS_PASSWORD = $value; APP_SESSION_TOKEN = [Convert]::ToBase64String($sessionBytes); QR_WORKER_TOKEN = [Convert]::ToBase64String($workerBytes) }
  $bytes = [Text.Encoding]::UTF8.GetBytes(($settings | ConvertTo-Json -Compress))
  $encrypted = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  $verified = [Security.Cryptography.ProtectedData]::Unprotect($encrypted, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  if ([Convert]::ToBase64String($bytes) -cne [Convert]::ToBase64String($verified)) { throw 'Encryption verification failed.' }
  New-Item -ItemType Directory -Path $serverPrivateDirectory -Force | Out-Null
  $stream = [IO.File]::Open($serverAuthFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
  try { $stream.Write($encrypted, 0, $encrypted.Length) } finally { $stream.Dispose() }
  Write-Host 'Saved encrypted app authentication outside OneDrive. No server was started.'
  Write-Host 'Setup complete. Tell Codex it is done so the owned web server can be restarted safely.'
  Write-Host 'Existing jobs must be reviewed before starting Runner. Your access code was not displayed.'
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($firstPointer)
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secondPointer)
  $value = $null; $confirmation = $null; $settings = $null
  if ($bytes) { [Array]::Clear($bytes, 0, $bytes.Length) }
  if ($verified) { [Array]::Clear($verified, 0, $verified.Length) }
  $first.Dispose(); $second.Dispose()
}
