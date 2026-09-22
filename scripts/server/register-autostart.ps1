param([Parameter(Mandatory=$true)][string]$ExecutablePath)
. (Join-Path $PSScriptRoot 'common.ps1')
$executable = (Resolve-Path -LiteralPath $ExecutablePath).Path
$signature = Get-AuthenticodeSignature -LiteralPath $executable
if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O="ngrok, Inc\."') { throw 'Official ngrok signature required.' }
foreach ($file in @($serverAuthFile, (Join-Path $serverPrivateDirectory 'ngrok.dpapi'), (Join-Path $serverRuntime 'public-origin.json'), (Join-Path $serverRuntime 'server-build\BUILD_ID'))) {
  if (-not (Test-Path -LiteralPath $file)) { throw 'Existing authenticated server setup is incomplete.' }
}
$startupFolder = [Environment]::GetFolderPath('Startup')
if (-not $startupFolder -or -not (Test-Path -LiteralPath $startupFolder)) { throw 'Current user startup folder is unavailable.' }
$shortcutPath = Join-Path $startupFolder ('CH2CH-Web-' + $serverProjectHash + '.lnk')
$target = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$script = Join-Path $PSScriptRoot 'autostart.ps1'
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -File "' + $script + '" -ExecutablePath "' + $executable + '" -DelaySeconds 15'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
if (Test-Path -LiteralPath $shortcutPath) {
  if ($shortcut.TargetPath -ine $target -or $shortcut.Arguments -cne $arguments -or $shortcut.WorkingDirectory -ine $serverProject) { throw 'A different shortcut already exists. Nothing overwritten.' }
  Write-Output "Already registered: $shortcutPath"
  exit 0
}
$shortcut.TargetPath = $target
$shortcut.Arguments = $arguments
$shortcut.WorkingDirectory = $serverProject
$shortcut.WindowStyle = 7
$shortcut.Description = 'CH2CH web and HTTPS tunnel at Windows sign-in; no attendance Runner.'
$shortcut.Save()
$verify = $shell.CreateShortcut($shortcutPath)
if ($verify.TargetPath -ine $target -or $verify.Arguments -cne $arguments) { throw 'Shortcut verification failed.' }
Write-Output "Registered for this Windows user at sign-in: $shortcutPath"
Write-Output 'No admin privilege, stored Windows password, auto-login, service, firewall, or power policy change.'
