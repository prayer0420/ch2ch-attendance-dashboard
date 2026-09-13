param(
    [Parameter(Mandatory = $true)]
    [string]$SourcePath,

    [Parameter(Mandatory = $true)]
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$source = (Resolve-Path -LiteralPath $SourcePath).Path
$outputParent = Split-Path -Parent $OutputPath
if ($outputParent -and -not (Test-Path -LiteralPath $outputParent)) {
    New-Item -ItemType Directory -Path $outputParent | Out-Null
}

$output = New-Object System.Collections.Generic.List[string]
function Add-Line([string]$Text = '') { $script:output.Add($Text) }
function Relative-Path([string]$Path) {
    return $Path.Substring($source.Length).TrimStart('\')
}
function Sanitize([string]$Line) {
    if ($Line -match '(?i)^\s*([^#][^:=]*(password|passwd|pwd|secret|token|credential|private.?key|access.?key|api.?key|key)[^:=]*)\s*[:=]') {
        $indent = ([regex]::Match($Line, '^\s*')).Value
        return $indent + $matches[1].Trim() + ': <REDACTED>'
    }
    return $Line
}
function Add-File([System.IO.FileInfo]$File) {
    Add-Line
    Add-Line ('### `{0}`' -f (Relative-Path $File.FullName))
    Add-Line
    Add-Line '~~~text'
    try {
        Get-Content -LiteralPath $File.FullName -Encoding UTF8 | ForEach-Object { Add-Line (Sanitize $_) }
    } catch {
        Add-Line ('<READ ERROR: {0}>' -f $_.Exception.Message)
    }
    Add-Line '~~~'
}

Add-Line '# Meritz Oracle Linux 10 detailed source evidence'
Add-Line
Add-Line ('- Collected: {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss K'))
Add-Line ('- Source: `{0}`' -f $source)
Add-Line '- Scope: build descriptors, deployment manuals, Dockerfiles, shell/config files, and application configuration.'
Add-Line '- Safety: likely password, token, credential, and key values are redacted.'

$all = @(Get-ChildItem -LiteralPath $source -Recurse -File -Force -ErrorAction SilentlyContinue)
$selected = $all | Where-Object {
    $_.Name -eq 'pom.xml' -or
    $_.Name -eq 'package.json' -or
    $_.Name -eq 'Dockerfile' -or
    $_.Name -match '(?i)^(application.*\.(yml|yaml|properties)|runtime\.env|.*\.(sh|service|conf))$' -or
    ($_.FullName -match '(?i)[\\/]docs[\\/]99\.ETC[\\/]' -and $_.Extension -eq '.md' -and $_.Name -match '(?i)(deploy|manual|setting)')
} | Sort-Object FullName

Add-Line
Add-Line ('## Selected files ({0})' -f @($selected).Count)
foreach ($file in $selected) { Add-File $file }

$output | Set-Content -LiteralPath $OutputPath -Encoding UTF8
$hash = Get-FileHash -LiteralPath $OutputPath -Algorithm SHA256
Write-Host ('Report: {0}' -f (Resolve-Path -LiteralPath $OutputPath).Path)
Write-Host ('Bytes : {0}' -f (Get-Item -LiteralPath $OutputPath).Length)
Write-Host ('SHA256: {0}' -f $hash.Hash)
