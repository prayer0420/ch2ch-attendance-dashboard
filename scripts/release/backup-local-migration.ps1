$ErrorActionPreference = 'Stop'
$project = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$destination = Join-Path $env:LOCALAPPDATA ('CH2CH-Backups\local-migration-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $destination | Out-Null
# Backup contains private attendance data: grant access only to its owner and SYSTEM.
$acl = Get-Acl -LiteralPath $destination
$acl.SetAccessRuleProtection($true, $false)
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
foreach ($identity in @($sid, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
  $rule = [Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow')
  $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $destination -AclObject $acl
$entries = [Collections.Generic.List[object]]::new()
$tracked = @(& git -C $project -c core.quotepath=false ls-files --cached)
if ($LASTEXITCODE -ne 0) { throw 'Cannot enumerate tracked source.' }
$untracked = @(& git -C $project -c core.quotepath=false ls-files --others --exclude-standard -- app components lib public runner scripts desktop desktop-client supabase docs)
if ($LASTEXITCODE -ne 0) { throw 'Cannot enumerate application source.' }
$rootUntracked = @(Get-ChildItem -LiteralPath $project -File -Force | Where-Object { $_.Extension -in @('.cmd','.ps1','.json','.mjs','.ts','.md') } | ForEach-Object Name)
$localFiles = @(Get-ChildItem -LiteralPath (Join-Path $project '.local-runtime') -File -Force | Where-Object { $_.Extension -notin @('.log','.tsbuildinfo') } | ForEach-Object { '.local-runtime/' + $_.Name })
$envFiles = @(Get-ChildItem -LiteralPath $project -File -Force | Where-Object { $_.Name -like '.env*' } | ForEach-Object Name)
foreach ($relative in (@($tracked) + @($untracked) + @($rootUntracked) + @($localFiles) + @($envFiles) | Sort-Object -Unique)) {
  $source = Join-Path $project $relative
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
  $file = Get-Item -LiteralPath $source
  if ($file.LinkType) { throw "Refusing source link: $relative" }
  $target = Join-Path (Join-Path $destination 'project') $relative
  New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
  $hash = (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
  Copy-Item -LiteralPath $source -Destination $target
  if ((Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash -ne $hash) { throw "Backup mismatch: $relative" }
  $entries.Add(@{ path = $relative; sha256 = $hash; bytes = $file.Length })
}
$projectHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($project.ToLowerInvariant()))).Substring(0,16)
$privateDir = Join-Path $env:LOCALAPPDATA ('CH2CH-Server/' + $projectHash)
if (Test-Path -LiteralPath $privateDir) {
  foreach ($file in (Get-ChildItem -LiteralPath $privateDir -Recurse -File | Where-Object Extension -ne '.log')) {
    $relative = [IO.Path]::GetRelativePath($privateDir, $file.FullName)
    $target = Join-Path $destination ('server-private/' + $relative)
    New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
    Copy-Item -LiteralPath $file.FullName -Destination $target
    $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    if ((Get-FileHash -LiteralPath (Join-Path $destination ('server-private/' + $relative)) -Algorithm SHA256).Hash -ne $hash) { throw 'Private backup mismatch.' }
    $entries.Add(@{ path = 'server-private/' + $relative; sha256 = $hash; bytes = $file.Length })
  }
}
& git -C $project bundle create (Join-Path $destination 'repository.bundle') --all
if ($LASTEXITCODE -ne 0) { throw 'Git backup failed.' }
& git -C $project bundle verify (Join-Path $destination 'repository.bundle') 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Git verification failed.' }
@{ createdAt = (Get-Date).ToString('o'); project = $project; files = $entries; sourceBackupComplete = $true; remoteDataBackupComplete = $false; notes = 'Unrelated untracked media, dependencies, build caches and runtime logs excluded. Original files unchanged. Private backup readable only by this Windows user and SYSTEM.' } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $destination 'source-manifest.json') -Encoding utf8
Write-Output "BACKUP=$destination"
Write-Output "VERIFIED_FILES=$($entries.Count)"
