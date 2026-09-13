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

$lines = New-Object System.Collections.Generic.List[string]
function Add-Line([string]$Text = '') { $script:lines.Add($Text) }
function Relative-Path([string]$Path) {
    if ($Path.StartsWith($source, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $Path.Substring($source.Length).TrimStart('\')
    }
    return $Path
}
function Redact-Line([string]$Text) {
    if ($Text -match '(?i)(password|passwd|pwd|secret|token|credential|private.?key|access.?key)') {
        if ($Text -match '^\s*([^:=]+)\s*[:=]') {
            return ($matches[1].Trim() + ': <REDACTED>')
        }
        return '<REDACTED sensitive line>'
    }
    return $Text.Trim()
}

$allFiles = @(Get-ChildItem -LiteralPath $source -Recurse -File -Force -ErrorAction SilentlyContinue)
$totalBytes = ($allFiles | Measure-Object -Property Length -Sum).Sum

Add-Line '# Meritz Oracle Linux 10 preflight inventory'
Add-Line
Add-Line ('- Collected: {0}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss K'))
Add-Line ('- Source: `{0}`' -f $source)
Add-Line ('- Files: {0}' -f $allFiles.Count)
Add-Line ('- Total bytes: {0}' -f $totalBytes)
Add-Line '- Safety: source files were read only; likely secret-bearing lines are redacted.'

Add-Line
Add-Line '## Top-level entries'
Get-ChildItem -LiteralPath $source -Force | Sort-Object @{ Expression = 'PSIsContainer'; Descending = $true }, Name | ForEach-Object {
    $kind = if ($_.PSIsContainer) { 'DIR ' } else { 'FILE' }
    Add-Line ('- {0} `{1}` ({2} bytes)' -f $kind, $_.Name, $(if ($_.PSIsContainer) { 0 } else { $_.Length }))
}

Add-Line
Add-Line '## File extensions'
$allFiles | Group-Object Extension | Sort-Object Count -Descending | Select-Object -First 40 | ForEach-Object {
    $name = if ([string]::IsNullOrWhiteSpace($_.Name)) { '<none>' } else { $_.Name }
    Add-Line ('- `{0}`: {1}' -f $name, $_.Count)
}

Add-Line
Add-Line '## Maven modules and coordinates'
$pomFiles = @($allFiles | Where-Object Name -eq 'pom.xml' | Sort-Object FullName)
foreach ($pom in $pomFiles) {
    try {
        [xml]$xml = Get-Content -LiteralPath $pom.FullName -Raw
        $project = $xml.project
        Add-Line ('- `{0}` | groupId=`{1}` artifactId=`{2}` version=`{3}` packaging=`{4}`' -f
            (Relative-Path $pom.FullName), $project.groupId, $project.artifactId, $project.version, $project.packaging)
    } catch {
        Add-Line ('- `{0}` | XML parse error: {1}' -f (Relative-Path $pom.FullName), $_.Exception.Message)
    }
}

Add-Line
Add-Line '## Maven dependency coordinates'
$dependencySet = New-Object System.Collections.Generic.SortedSet[string]
foreach ($pom in $pomFiles) {
    try {
        [xml]$xml = Get-Content -LiteralPath $pom.FullName -Raw
        $nodes = $xml.SelectNodes("//*[local-name()='dependency']")
        foreach ($node in $nodes) {
            $g = $node.SelectSingleNode("./*[local-name()='groupId']")
            $a = $node.SelectSingleNode("./*[local-name()='artifactId']")
            $v = $node.SelectSingleNode("./*[local-name()='version']")
            if ($g -and $a) {
                [void]$dependencySet.Add(('{0}:{1}:{2}' -f $g.InnerText, $a.InnerText, $(if ($v) { $v.InnerText } else { '<managed>' })))
            }
        }
    } catch {}
}
$dependencySet | ForEach-Object { Add-Line ('- `{0}`' -f $_) }

Add-Line
Add-Line '## Build, deployment, configuration, and database files'
$importantNames = @('pom.xml','package.json','package-lock.json','yarn.lock','Dockerfile','docker-compose.yml','docker-compose.yaml')
$importantExt = @('.yml','.yaml','.properties','.sql','.sh','.bash','.service','.conf','.env','.rpm','.jar','.war','.so','.dll')
$allFiles | Where-Object {
    ($importantNames -contains $_.Name) -or ($importantExt -contains $_.Extension.ToLowerInvariant()) -or
    ($_.Name -match '(?i)(readme|deploy|install|startup|shutdown|runtime)')
} | Sort-Object FullName | ForEach-Object {
    Add-Line ('- `{0}` ({1} bytes)' -f (Relative-Path $_.FullName), $_.Length)
}

Add-Line
Add-Line '## Runtime and endpoint clues (sensitive values redacted)'
$textExtensions = @('.yml','.yaml','.properties','.xml','.conf','.env','.sh','.bash','.bat','.cmd','.md','.log')
$runtimePattern = '(?i)(jdbc:|postgresql|mariadb|mysql|oracle|redis|elastic|zookeeper|solr|qdrant|spring\.profiles|server\.port|listen|datasource|java_home|java-version|java\.version)'
foreach ($file in ($allFiles | Where-Object { $textExtensions -contains $_.Extension.ToLowerInvariant() })) {
    try {
        $matches = Select-String -LiteralPath $file.FullName -Pattern $runtimePattern -Encoding UTF8 -ErrorAction SilentlyContinue
        foreach ($match in ($matches | Select-Object -First 80)) {
            Add-Line ('- `{0}:{1}` {2}' -f (Relative-Path $file.FullName), $match.LineNumber, (Redact-Line $match.Line))
        }
    } catch {}
}

Add-Line
Add-Line '## Oracle Linux portability clues'
$portabilityPattern = '(?i)(/etc/|/var/|/opt/|/application|/logs|/data|systemctl|service\s|yum\s|dnf\s|apt(-get)?\s|sudo\s|chmod\s|chown\s|selinux|firewalld|native|system\.loadlibrary|runtime\.getruntime|processbuilder|\.dll|\.so\b|windows|linux)'
$sourceExt = @('.java','.kt','.groovy','.xml','.yml','.yaml','.properties','.sh','.bash','.bat','.cmd','.dockerfile')
foreach ($file in ($allFiles | Where-Object { ($sourceExt -contains $_.Extension.ToLowerInvariant()) -or $_.Name -eq 'Dockerfile' })) {
    try {
        $matches = Select-String -LiteralPath $file.FullName -Pattern $portabilityPattern -Encoding UTF8 -ErrorAction SilentlyContinue
        foreach ($match in ($matches | Select-Object -First 60)) {
            Add-Line ('- `{0}:{1}` {2}' -f (Relative-Path $file.FullName), $match.LineNumber, (Redact-Line $match.Line))
        }
    } catch {}
}

Add-Line
Add-Line '## Deployment manuals'
$allFiles | Where-Object { $_.FullName -match '(?i)docs' -and $_.Name -match '(?i)(deploy|install|setting|manual|readme)' } |
    Sort-Object FullName | ForEach-Object { Add-Line ('- `{0}` ({1} bytes)' -f (Relative-Path $_.FullName), $_.Length) }

Add-Line
Add-Line '## Large and packaged files'
$allFiles | Where-Object { $_.Length -ge 10MB -or $_.Extension -match '(?i)^\.(zip|tar|gz|tgz|rpm|jar|war|iso)$' } |
    Sort-Object Length -Descending | ForEach-Object { Add-Line ('- `{0}` ({1:N0} bytes)' -f (Relative-Path $_.FullName), $_.Length) }

$lines | Set-Content -LiteralPath $OutputPath -Encoding UTF8
$hash = Get-FileHash -LiteralPath $OutputPath -Algorithm SHA256
Write-Host ('Report: {0}' -f (Resolve-Path -LiteralPath $OutputPath).Path)
Write-Host ('Bytes : {0}' -f (Get-Item -LiteralPath $OutputPath).Length)
Write-Host ('SHA256: {0}' -f $hash.Hash)
