function Get-RunnerGuardDecision([bool]$WebReady, [bool]$RunnerOwned, [bool]$RecordedPidAlive) {
  if ($RunnerOwned) { return 'online' }
  if ($RecordedPidAlive) { return 'identity-conflict' }
  if (-not $WebReady) { return 'waiting-for-web' }
  return 'start-runner'
}
