param([Parameter(Mandatory)][string]$SnapshotPath, [Parameter(Mandatory)][string]$RestorePath)
$ErrorActionPreference = 'Stop'
$snapshotRoot = (Resolve-Path -LiteralPath $SnapshotPath).Path
$restoreRoot = [IO.Path]::GetFullPath($RestorePath)
if (Test-Path -LiteralPath $restoreRoot) { throw 'Choose a NEW folder. This script never overwrites the current project.' }
$manifest = Get-Content -LiteralPath (Join-Path $snapshotRoot 'manifest.json') -Raw | ConvertFrom-Json
if (-not $manifest.complete) { throw 'The backup is incomplete.' }
Add-Type -AssemblyName System.Security
# Validate every entry before creating the restore directory.
foreach ($entry in $manifest.files) {
  $target = [IO.Path]::GetFullPath((Join-Path $restoreRoot $entry.path))
  if (-not $target.StartsWith($restoreRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe backup path.' }
}
New-Item -ItemType Directory -Path $restoreRoot | Out-Null
foreach ($entry in $manifest.files) {
  $target = Join-Path $restoreRoot $entry.path
  $source = if ($entry.encrypted) { Join-Path (Join-Path $snapshotRoot 'private') ($entry.path + '.dpapi') } else { Join-Path (Join-Path $snapshotRoot 'source') $entry.path }
  $bytes = [IO.File]::ReadAllBytes($source)
  if ($entry.encrypted) { $bytes = [Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser) }
  $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
  if ($hash -ne $entry.sha256) { throw "Backup hash mismatch: $($entry.path)" }
  New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
  [IO.File]::WriteAllBytes($target, $bytes)
}
Write-Output "Restored verified files to NEW folder: $restoreRoot"
Write-Output 'No services were started. Install dependencies separately. Git history remains in repository.bundle in the snapshot directory.'
