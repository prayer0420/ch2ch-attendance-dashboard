# Runner 자동 실행·복구

- `start-local.cmd`와 `start-server.cmd`는 저장된 운영 빌드로 실행합니다. 웹이 이미 실행 중이어도 Runner를 확인하고, 꺼져 있으면 켭니다.
- Windows 현재 사용자 로그인 시 기존 `CH2CH-Web-5BC262ED743FC945.lnk`가 웹 → Runner → 외부 연결을 시작합니다. Runner 시작 후 복구 도우미도 자동 실행합니다.
- 복구 도우미는 30초마다 프로세스의 실행 경로·시작 시각을 확인합니다. 웹이 정상 운영 모드이고 Runner 프로세스가 사라졌을 때만 기존 안전 시작 스크립트를 호출합니다.
- 실행 중인 Runner를 강제로 종료하거나 중복 실행하지 않습니다. 사용자가 제출한 `queued` 작업만 처리하며, 비정상 종료로 남은 `running` 작업은 자동 재실행하지 않습니다. 해당 작업은 결과를 확인한 뒤 새로 요청해야 합니다.
- `stop-local.cmd`로 웹과 Runner를 모두 중지하면 도우미는 대기만 합니다. 웹을 다시 켜면 Runner도 복구합니다. PC 종료·절전·Windows 로그아웃 중에는 서비스가 유지되지 않으며, 로그인 전 자동 실행은 별도 Windows 서비스 구성이 필요합니다.
- 도우미 상태와 상태 변경 로그: `%LOCALAPPDATA%\CH2CH-Server\5BC262ED743FC945\runner-guard-status.json`, `runner-guard.log`.
- 문제가 생기면 다른 프로그램의 PID는 종료하지 않고 `identity-conflict` 상태로 남깁니다. 살아 있으나 응답하지 않는 Runner는 중복 출석 방지를 위해 강제 재시작하지 않습니다.
- 테스트: `powershell.exe -NoProfile -File scripts/server/verify-runner-guard.ps1`. 실제 출석 작업을 중단하지 않고 복구·중복 방지 정책과 문법을 확인합니다.

이번 적용은 OS 서비스·자동 로그인·방화벽·절전 설정을 변경하지 않습니다.
