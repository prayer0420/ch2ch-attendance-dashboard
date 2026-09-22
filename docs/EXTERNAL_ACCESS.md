# 무료 외부 접속 운영 상태

## Windows 로그인 후 자동 시작 — 2026-09-22

- 사용자의 추가 요청으로 현재 계정 `DESKTOP-STCN6VH\c`의 시작프로그램 폴더에 `CH2CH-Web-5BC262ED743FC945.lnk`를 등록했다. 부팅만으로 로그인 전부터 켜지는 Windows 서비스가 아니라, **Windows 로그인 후** 실행되는 구성이다.
- 바로가기는 `scripts/server/autostart.ps1`를 숨김 실행한다. 실행 후 15초를 기다리고 운영 웹(`-Production -WebOnly`) → 로컬 인증 차단 확인 → 별도 소유권 검증을 거친 Runner → ngrok → 외부 HTTPS 확인 순으로 진행한다. 웹 시작과 Runner 시작을 분리해 중복 Runner를 막는다.
- 준비가 늦으면 10초 간격으로 최대 6회 시도한다. 시도 시간은 네트워크 응답 시간에 따라 늘 수 있다. 시작 후 계속 감시하는 서비스는 아니며, 수동 종료 이후 자동 부활시키지 않는다.
- 이미 이 프로젝트의 웹·터널이 실행 중이면 유지한다. 다른 프로세스를 죽이지 않으며, 이전 부팅의 PID 기록만 동일 runtime 폴더에 원본 그대로 별도 보존한다. 같은 부팅의 기록이나 판정 불가 기록은 임의로 지우지 않는다.
- 등록 위치: `C:\Users\c\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\CH2CH-Web-5BC262ED743FC945.lnk`.
- 상태 확인 파일: `C:\Users\c\AppData\Local\CH2CH-Server\5BC262ED743FC945\autostart-status.json`. 정상은 `phase: ready`, `result: passed`, `runnerStarted: true`다. 같은 폴더의 `autostart.log` 및 시간별 웹·Runner 시작 로그로 실패 단계를 확인한다. 인증값·쿠키를 기록하지 않는다.
- 자동 시작 해제: 위 CH2CH 바로가기 **하나만** 시작프로그램 폴더 밖의 보관 폴더로 옮긴다. 다시 원위치로 옮기면 재등록된다. 다른 시작프로그램은 건드리지 않는다. 이 동작은 이미 켜진 웹·터널을 중지하지 않으며, 현재 외부 공개를 중지하려면 아래의 터널 중지 절차를 따른다.
- Windows 비밀번호 저장, 자동 로그인, 관리자 권한, 방화벽, 절전, UAC, 작업 스케줄러, Windows 서비스 설정은 변경하지 않았다. 프로젝트 폴더와 ngrok 실행 파일을 이동하면 바로가기 경로를 다시 등록해야 한다.
- 실제 PC 재부팅/로그아웃은 수행하지 않았다. 등록된 바로가기를 실행하여 꺼진 웹·Runner·터널이 모두 켜지는 시험을 완료했다. 첫 시도에 `ready/passed`, `runnerStarted: true`, 최신 Supabase 하트비트 `online/대기 중`, 외부 HTTPS 로그인·로그아웃·인증 차단 검사를 모두 통과했다.
- `powershell.exe -NoProfile -File scripts/server/verify-autostart.ps1`로 이전 부팅 기록의 원본 보존, 현재 기록 유지, 잘못된 경로 거부, 재사용 PID/다른 실행 파일 거부, Runner의 별도 검증 시작 조건을 시험했다. PowerShell 구문 검사도 통과했다.
- 실제 숨김 시작 시험에서 발견한 두 문제를 수정했다. 웹 시작 도우미는 출력 파이프를 물려주지 않고 별도 프로세스로 실행하며 네이티브 핸들을 보존해 종료 결과를 읽는다. ngrok 전자서명 검사는 상속된 PowerShell 7 모듈 검색 경로와 무관하게 Windows PowerShell 기본 보안 모듈을 명시적으로 불러온다. 보안 검사를 비활성화하지 않았다.
- 모바일에서 Runner 오프라인으로 보인 원인은 당시 자동 시작이 웹·터널만 켜도록 구성됐기 때문이다. `scripts/server/start-runner.ps1`로 기존 운영 웹의 소유권, 127.0.0.1 수신 주소, Supabase 연결, Runner의 `queued` 전용 접수 조건, 중복 프로세스를 검사하고 Runner를 별도로 연결한다. 시작 완료는 프로세스 존재만이 아니라 새 `online/대기 중` 하트비트까지 확인한다.
- 확인 당시 Supabase에는 2026-06-20~2026-08-22 사이의 비정상 종료로 남은 `running` 기록 13건과 새 `queued` 기록 0건이 있었다. 기존 13건은 취소·삭제·재실행하지 않았다. 현재 Runner는 `queued`만 접수하므로 이 기록을 자동 재개하지 않는다.

Windows 시작프로그램 동작 기준: [Microsoft 공식 안내](https://support.microsoft.com/en-us/windows/experience/startup-boot/configure-startup-applications-in-windows).

## 최신 상태 — 연결 및 HTTPS 검증 완료 (2026-09-22)

- 사용자 승인을 받아 ngrok 인증 정보를 이 Windows 계정으로 암호화하고, 지정된 앱 로그인 화면을 공개했다. 아래의 계정 연결 대기 기록은 이전 상태다.
- 접속 주소: https://bonanza-opulently-quack.ngrok-free.dev/
- 연결 방향: 휴대폰/PC 브라우저 → ngrok HTTPS → 이 PC의 ngrok 프로세스 → `http://127.0.0.1:3000`.
- 로그인은 `configure-server.cmd`에서 사용자가 정한 앱 접속 코드다. GitHub/ngrok 비밀번호가 아니다. 첫 방문에는 ngrok 무료 안내의 `Visit Site`를 누른다.
- ngrok 토큰은 `%LOCALAPPDATA%\CH2CH-Server\<프로젝트 식별자>\ngrok.dpapi`에 CurrentUser DPAPI로 저장했다. Git, OneDrive, 명령 인수에는 토큰을 저장하지 않았다. 기존 `.env.local`은 변경하지 않았다.
- 실행 시 토큰을 ngrok 자식 프로세스의 환경으로만 전달한다. 로컬 요청 검사, 검사 DB, 검사 웹 UI, ngrok 로그 및 원격 관리 기능은 비활성화했다. 통신이 ngrok을 경유하지 않는다는 뜻은 아니다.
- `APP_PUBLIC_ORIGIN`은 `.local-runtime/public-origin.json`의 정확한 HTTPS 주소를 읽는다. 이 값은 비밀값이 아니지만 Git에서 제외된다. HTTPS 전달 요청의 출처와 로그인 리디렉션이 이 주소를 사용하도록 수정했다. 임의의 `X-Forwarded-Host`를 신뢰하지 않는다.
- 웹과 Runner는 실행 중이며, 현재 Runner는 `online/대기 중`이다. 기존의 비정상 종료로 남은 13개 `running` 기록은 수정·재실행하지 않았고 새 `queued` 작업은 0건인 상태에서 시작했다. 현재는 위의 로그인 후 자동 시작을 등록했고, 절전 설정은 변경하지 않았다.
- 실제 휴대폰의 LTE/5G에서 접속하는 사용자 확인은 아직 남아 있다.

## 검증 결과와 재검증

- `npm run verify:security`: 25개 API 인증 보호, 세션, CSRF, 요청 크기, 로그인 횟수 제한, HTTPS 프록시 출처 및 로그인 이동 경로 회귀 검사 통과.
- `npm run typecheck`, `npm run build:server`: 통과. 운영 서버를 다시 시작해 적용했다.
- `scripts/server/verify-public-access.js`: 실제 외부 HTTPS에서 로그인 화면 200, 내부 페이지의 같은 외부 주소로 로그인 이동, 비로그인 API 401, 다른 출처의 로그인/로그아웃 403, JSON 및 HTML 폼 로그인, Secure/HttpOnly/SameSite 쿠키, 인증 후 API·페이지 200, 로그아웃의 쿠키 삭제와 이후 비로그인 401을 확인했다.
- Chrome에서 무료 안내 → 관리자 접속 화면까지 확인했고 콘솔 오류는 없었다. 검사에서 출석 실행, 구글시트 수정, 예배일지 제출, 밴드 게시를 하지 않았다.
- 미들웨어는 절대 주소 리디렉션이 필요하므로 검증된 공개 주소를 사용한다. 단위 검사만으로 발견하지 못한 상대 주소의 실제 운영 오류도 외부 검사에서 발견·수정한 뒤 재검증했다.

재검증은 프로젝트 폴더에서 다음 명령을 사용한다. Windows 암호화 값을 같은 계정의 시험 프로세스에만 전달하고, 비밀번호·쿠키·응답 본문을 출력하지 않는다. 정상 결과는 `Public HTTPS verification passed`, 실패하면 실패한 단계만 표시한다.

```powershell
powershell.exe -NoProfile -Command '. .\scripts\server\common.ps1; Import-ServerAuthentication; node scripts/server/verify-public-access.js; exit $LASTEXITCODE'
```

## 중지와 다시 시작

작업 위치는 `C:\Users\c\OneDrive\문서\등촌프로젝트`다. 아래 변경 명령은 한 번에 하나만 실행하고 결과를 확인한다.

- 외부 접속만 끄기: `powershell.exe -NoProfile -File scripts/server/stop-tunnel.ps1`. 기록된 PID·생성 시각·실행 파일·연결 대상이 모두 일치하는 터널만 종료한다. 로컬 웹과 업무 자료는 보존한다. 외부 공개를 되돌리는 방법이기도 하다.
- 웹이 꺼져 있으면 먼저 `powershell.exe -NoProfile -File scripts/start-local.ps1 -Production -WebOnly -NoPause`로 시작하고 준비 완료를 확인한다. 아직 `start-server.cmd`로 Runner까지 켜지 않는다.
- 웹 준비가 확인된 뒤 다음 명령으로 터널을 시작한다. 공식 전자서명, loopback 수신, 웹 프로세스 소유권을 검사하며 다른 프로세스는 종료하지 않는다. 시작 메시지만으로 정상 연결을 판단하지 말고 위 HTTPS 검증을 수행한다.

```powershell
powershell.exe -NoProfile -File scripts/server/start-tunnel.ps1 -ExecutablePath "C:\Users\c\AppData\Local\CH2CH-Tools\ngrok-321df1391f9244b3aa4231b554be7b4f\ngrok.exe"
```

## 보존 및 복구 자료

- 변경 전 관련 소스는 `C:\Users\c\AppData\Local\CH2CH-Backups\external-access-20260922-142000`에 복사·해시 확인했다.
- 변경 전 운영 빌드는 `.local-runtime/server-build-before-external-20260922`에 보존했다. 문제가 있으면 먼저 터널과 소유권이 확인된 웹을 중지하고 현재 빌드를 별도로 보존한 뒤, 이전 빌드로 로컬 웹만 복구한다. 변경 전 빌드를 외부 공개하지 않는다.
- 이번 추가 전체 백업 시도는 실행 중인 로그 파일 잠금으로 완료되지 않았다. 위 부분 백업을 전체 백업이라고 취급하지 않는다. 이전에 검증된 전체 백업 `C:\Users\c\AppData\Local\CH2CH-Backups\20260922-115355-9b11ef1c`는 보존되어 있다.
- 새 `auth.dpapi`/`ngrok.dpapi`는 프로젝트 밖의 별도 파일이며 예전 전체 백업에 포함되지 않는다. 다른 PC로 복사한다고 복호화할 수 있는 파일이 아니다.

## 이전 기록 — 2026-09-22 계정 연결 대기

- 사용자는 휴대폰에 별도 앱 없이 외부에서 접속하고, 도메인 비용 없이 이 Windows PC를 서버로 쓰기를 요청했다.
- Cloudflare Tunnel은 설치하거나 설정하지 않았다. 무료 고정 접속 주소를 제공하는 ngrok 방식으로 준비 중이다.
- ngrok 공식 Windows 배포 파일을 별도 사용자 폴더에 내려받고 전자서명을 확인했다. 관리자 권한, 방화벽 변경, PATH 변경, 서비스 등록은 하지 않았다.
- 실행 파일: `C:\Users\c\AppData\Local\CH2CH-Tools\ngrok-321df1391f9244b3aa4231b554be7b4f\ngrok.exe`
- 버전: `3.39.11`. Authenticode 상태 `Valid`, 서명자 `ngrok, Inc.`.
- 실행 파일 SHA-256: `D339BCBD0713233337E860163F5249EEA679CF26750A5700510DBC241D201748`.
- 버전/도움말만 실행했다. 터널은 실행하지 않았고, 외부 주소도 아직 발급·검증되지 않았다.
- Codex 브라우저에 ngrok 가입 화면을 열어두었다. 사용자 본인의 계정 로그인·가입 약관 동의가 필요하다. 기존 앱 접속 코드와 ngrok 계정은 별개다.
- 비밀번호·Authtoken은 채팅에 요청하지 않는다. 인증 정보는 Git/OneDrive/로그에 남기지 않는다.

## 계정 연결 후 진행 순서

- 계정에 실제 배정된 무료 주소와 무료 요금제 여부를 확인한다. 이름을 임의로 만들거나 유료 도메인/요금제를 결제하지 않는다.
- ngrok 인증을 해당 Windows 사용자 전용으로 준비하고, 로컬 요청 검사 기능은 개인정보 노출을 줄이기 위해 비활성화한다. 인증값은 명령 인수나 출력에 노출하지 않는다.
- 외부 공개 전에 기존 인증과 HTTPS 전달 헤더, 로그인 리디렉션, 요청 출처 검증을 확인한다. 검사를 통과시키기 위해 보안 검증을 끄지 않는다.
- 연결 대상은 이 프로젝트의 `http://127.0.0.1:3000`뿐이다. SSH·다른 서비스·파일 디렉터리는 공개하지 않는다.
- 연결 후 비로그인 API 차단과 실제 HTTPS 로그인/로그아웃을 검증한다. 업무 데이터를 쓰는 출석 실행이나 예배일지 제출은 검증 명목으로 수행하지 않는다.
- 실제 휴대폰의 Wi-Fi를 끄고 LTE/5G 접속을 확인한다. 자동 시작·절전 설정은 별도 작업이며 현재 완료되지 않았다.
- 중지 시 이번 작업에서 시작한 것으로 식별되는 터널 프로세스만 종료한다. 기존 웹 서버·Runner 상태·DB 기록은 임의로 변경하지 않는다.

## 운영 제한

- ngrok 무료 요금제는 계정에 자동 배정되는 개발용 주소 한 개를 제공한다. 원하는 이름을 선택하는 개인 소유 도메인은 아니다.
- 확인 당시 월 전송량 1 GB, HTTP 요청 20,000회 제한이 있다. 브라우저 안내 화면도 표시된다. 실사용량을 보고 적합성을 판단한다.
- PC·웹 서버·터널이 켜져 있어야 한다. PC가 꺼지거나 절전되면 접속되지 않는다.
- 실제 출석 실행기(Runner)는 별도의 소유권·하트비트 검증을 거쳐 자동 시작된다. 과거에 남은 비정상 `running` 기록은 자동 재개하지 않으며 새 `queued` 요청만 처리한다.

공식 문서: https://ngrok.com/docs/pricing-limits/free-plan-limits
