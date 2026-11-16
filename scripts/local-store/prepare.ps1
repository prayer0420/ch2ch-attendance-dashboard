$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../server/common.ps1')
$localData = Join-Path $serverPrivateDirectory 'data-v1'
if (Test-Path -LiteralPath $localData) { throw 'Data directory already exists. Refusing to replace it.' }
New-Item -ItemType Directory -Path $localData | Out-Null
$acl = Get-Acl -LiteralPath $localData
$acl.SetAccessRuleProtection($true, $false)
foreach ($identity in @([Security.Principal.WindowsIdentity]::GetCurrent().User, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
  $acl.AddAccessRule([Security.AccessControl.FileSystemAccessRule]::new($identity, 'FullControl', 'ContainerInherit,ObjectInherit', 'None', 'Allow'))
}
Set-Acl -LiteralPath $localData -AclObject $acl
Write-Output "Prepared private data directory: $localData (not activated)"
