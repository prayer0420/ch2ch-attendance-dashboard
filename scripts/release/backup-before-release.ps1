param([string]$ProjectPath = (Join-Path $PSScriptRoot '..\..'))
$ErrorActionPreference = 'Stop'
$backupProject = (Resolve-Path -LiteralPath $ProjectPath).Path
$backupParent = Join-Path $env:LOCALAPPDATA 'CH2CH-Backups'
$backupTarget = Join-Path $backupParent ((Get-Date -Format 'yyyyMMdd-HHmmss') + '-' + [guid]::NewGuid().ToString('N').Substring(0,8))
if ($backupTarget.StartsWith($backupProject + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Backup must be outside the project.' }
New-Item -ItemType Directory -Path $backupTarget | Out-Null
Add-Type -AssemblyName System.Security
$backupEntries = [System.Collections.Generic.List[object]]::new()

# Preserve dirty/untracked source without changing Git state or the running service.
$backupFiles = & git -C $backupProject -c core.quotepath=false ls-files --cached --others --exclude-standard
if ($LASTEXITCODE -ne 0) { throw 'Cannot list project files.' }
foreach ($relative in ($backupFiles | Sort-Object -Unique)) {
  $source = Join-Path $backupProject $relative
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
  # OneDrive files can be reparse points without being symbolic links.
  if ((Get-Item -LiteralPath $source).LinkType) { throw "Refusing linked file: $relative" }
  $target = Join-Path (Join-Path $backupTarget 'source') $relative
  New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
  $sourceHash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
  Copy-Item -LiteralPath $source -Destination $target
  if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $sourceHash) { throw "Copy verification failed: $relative" }
  $backupEntries.Add(@{ path = $relative; sha256 = $sourceHash; encrypted = $false })
}

# Secrets and local operational snapshots never enter Git or a distributable package.
$privateFiles = @(Get-ChildItem -LiteralPath $backupProject -Force -File | Where-Object { $_.Name -like '.env*' -and $_.Name -ne '.env.example' })
$runtimePath = Join-Path $backupProject '.local-runtime'
if (Test-Path -LiteralPath $runtimePath) { $privateFiles += @(Get-ChildItem -LiteralPath $runtimePath -Force -File) }
foreach ($file in $privateFiles) {
  $relative = [IO.Path]::GetRelativePath($backupProject, $file.FullName)
  $bytes = [IO.File]::ReadAllBytes($file.FullName)
  $encrypted = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  $target = Join-Path (Join-Path $backupTarget 'private') ($relative + '.dpapi')
  New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
  [IO.File]::WriteAllBytes($target, $encrypted)
  $decoded = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($target), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
  $hash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
  if ([Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($decoded)) -ne $hash) { throw "Encrypted backup verification failed: $relative" }
  $backupEntries.Add(@{ path = $relative; sha256 = $hash; encrypted = $true })
}
& git -C $backupProject bundle create (Join-Path $backupTarget 'repository.bundle') --all
if ($LASTEXITCODE -ne 0) { throw 'Git history backup failed.' }
& git -C $backupProject bundle verify (Join-Path $backupTarget 'repository.bundle') 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Git bundle verification failed.' }
$manifest = @{
  complete = $true; createdAt = (Get-Date).ToString('o'); source = $backupProject
  commit = (& git -C $backupProject rev-parse HEAD); branch = (& git -C $backupProject branch --show-current)
  status = @(& git -C $backupProject -c core.quotepath=false status --short)
  files = $backupEntries; note = 'Private files require the same Windows account and PC. Regenerable build folders/node_modules and external databases are not backed up.'
}
$manifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $backupTarget 'manifest.json') -Encoding utf8
Write-Output "Verified backup: $backupTarget"
Write-Output "Files: $($backupEntries.Count); Git history: verified; secret/local-data encryption: verified"
