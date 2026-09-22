function Test-EntriesBeforeBoot($Entries, [DateTime]$BootTime) {
  $items = @($Entries)
  if ($items.Count -eq 0) { return $false }
  foreach ($entry in $items) {
    if (-not $entry -or -not $entry.startedAt) { return $false }
    try {
      $created = [DateTime]::Parse([string]$entry.startedAt).ToUniversalTime()
      if ($created -ge $BootTime.ToUniversalTime()) { return $false }
    } catch { return $false }
  }
  return $true
}

function Move-PreBootState([string]$Runtime, [string]$FileName, [DateTime]$BootTime) {
  if ($FileName -notin @('processes.json', 'ngrok-process.json')) { throw 'Unknown process record.' }
  $directory = [IO.Path]::GetFullPath($Runtime).TrimEnd('\')
  $source = [IO.Path]::GetFullPath((Join-Path $directory $FileName))
  if ([IO.Path]::GetDirectoryName($source) -ine $directory) { throw 'Record path is outside runtime.' }
  if (-not (Test-Path -LiteralPath $source)) { return }
  $record = Get-Content -LiteralPath $source -Raw -Encoding UTF8 | ConvertFrom-Json
  $entries = if ($FileName -eq 'processes.json') { @($record.dashboard, $record.runner) | Where-Object { $null -ne $_ } } else { @($record) }
  if (-not (Test-EntriesBeforeBoot $entries $BootTime)) { return }
  $destination = [IO.Path]::GetFullPath((Join-Path $directory ($FileName + '.before-boot-' + [guid]::NewGuid().ToString('N') + '.json')))
  if ([IO.Path]::GetDirectoryName($destination) -ine $directory) { throw 'Archive path is outside runtime.' }
  # Only archive records provably older than this boot. Never terminate a PID
  # that Windows might have reassigned to another program after a reboot.
  Move-Item -LiteralPath $source -Destination $destination -ErrorAction Stop
}

function Test-TunnelIdentity($Entry, $Process, $Details, [string]$Executable, [string]$Config, [string]$Origin) {
  if (-not $Entry -or -not $Process -or -not $Details -or -not $Entry.startedAt -or -not $Details.CommandLine) { return $false }
  try {
    $created = [DateTime]::Parse([string]$Entry.startedAt).ToUniversalTime()
    return ($Entry.pid -eq $Process.Id -and $Details.ProcessId -eq $Process.Id -and
      [Math]::Abs(($Process.StartTime.ToUniversalTime() - $created).TotalMilliseconds) -le 100 -and
      $Entry.executable -ieq $Executable -and $Details.ExecutablePath -ieq $Executable -and
      $Entry.configFile -ieq $Config -and $Entry.origin -ceq $Origin -and
      $Details.CommandLine.IndexOf($Config, [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
      $Details.CommandLine.Contains('http://127.0.0.1:3000') -and $Details.CommandLine.Contains($Origin))
  } catch { return $false }
}
