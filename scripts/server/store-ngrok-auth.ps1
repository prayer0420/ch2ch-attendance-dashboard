$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'common.ps1')
$tokenFile = Join-Path $serverPrivateDirectory 'ngrok.dpapi'
try {
  if (Test-Path -LiteralPath $tokenFile) { throw 'An existing credential will not be overwritten.' }
  $token = [Console]::In.ReadToEnd().Trim()
  if ($token -notmatch '^[A-Za-z0-9_-]{20,256}$') { throw 'Invalid credential format.' }
  Add-Type -AssemblyName System.Security
  $plain = [Text.Encoding]::UTF8.GetBytes($token)
  try {
    $protected = [Security.Cryptography.ProtectedData]::Protect($plain, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    $decoded = [Security.Cryptography.ProtectedData]::Unprotect($protected, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
    if ([Text.Encoding]::UTF8.GetString($decoded) -cne $token) { throw 'Verification failed.' }
    New-Item -ItemType Directory -Path $serverPrivateDirectory -Force | Out-Null
    $file = [IO.File]::Open($tokenFile, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write)
    try { $file.Write($protected, 0, $protected.Length) } finally { $file.Dispose() }
  } finally {
    [Array]::Clear($plain, 0, $plain.Length)
    if ($decoded) { [Array]::Clear($decoded, 0, $decoded.Length) }
    $token = $null
  }
  Write-Output 'Credential encrypted for this Windows account. No tunnel started.'
} catch {
  # Do not emit exceptions that might include submitted data.
  Write-Output 'Credential not saved. Check for an existing credential or invalid input.'
  exit 1
}
