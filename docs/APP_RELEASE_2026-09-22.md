# 웹·Windows·모바일 앱 전환 — 2026-09-22

## 이번 결과

동일한 웹 서비스와 인증 API에 **Windows 연결 앱**과 **모바일 설치형 웹앱(PWA)**이 접속하는 구조다. 앱이 별도 DB를 만들거나 출석 실행기를 중복 실행하지 않는다. Android/iOS 스토어용 네이티브 앱은 아니다.

| 형태 | 이번에 준비한 것 | 실제 사용 조건 |
|---|---|---|
| 웹 | 분리된 프로덕션 standalone 빌드, 로그인·API 검사 | 서버 환경설정과 운영 배포 |
| Windows | 약 100MB NSIS 설치 파일, 서버 주소 선택·저장, 독립 앱 창 | 이미 실행 중인 로컬 웹 또는 운영 HTTPS 서버 |
| 모바일 | 반응형 화면, manifest·아이콘·홈 화면 추가 안내, 연결 끊김 안내 | HTTPS 서버, 기기별 설치 확인 |

Next.js 지침에 따라 standalone 서버와 public/static 자원을 함께 묶었다. 기존 프로젝트의 `.next` 대신 별도 폴더에서 빌드했다. Windows 연결 앱은 기존 Electron 실행기와 앱 식별자·설정 폴더를 분리했다.

## 대단계 1 — 백업 및 복구 확인

- 소단계 1: 변경 전 파일·Git 기록·미커밋 상태를 보존했다. DB나 Google Sheet 원본을 변경하지 않았다.
- 소단계 2: `C:\Users\c\AppData\Local\CH2CH-Backups\20260922-101759-a1852648`에 739개 항목과 Git bundle을 저장하고 SHA-256으로 검증했다. `.env*`와 `.local-runtime` 바로 아래의 파일은 Windows 사용자 암호화(DPAPI)로 보관했다. 복호화에는 같은 PC·Windows 계정이 필요하다.
- 소단계 3: `C:\Users\c\AppData\Local\CH2CH-Backups\restore-check-20260922-1032`의 새 폴더로 실제 복원하고 해시를 검증했다. 기존 프로젝트에 덮어쓰거나 복원본을 실행하지 않았다.

백업 제외: 재생성 가능한 의존성·빌드 폴더, `.local-runtime`의 하위 폴더, Git ignore 처리된 기타 파일, 외부 Supabase/Google/BAND 데이터. 모든 디스크·원격 데이터의 완전한 백업은 아니다. 복원 검사 폴더에는 복호화된 설정이 있으므로 외부 공유하지 않는다.

재사용 스크립트는 `scripts/release/backup-before-release.ps1`과 `restore-backup.ps1`이다. PowerShell 7이 필요하며 복원은 존재하지 않는 새 폴더만 허용한다. Git 이력은 원본 백업의 `repository.bundle`에 별도로 보관된다. 실행 중인 서비스를 덮어쓰는 자동 롤백은 제공하지 않는다.

## 대단계 2 — 배포 후보 생성

- 소단계 1: Windows 설치 파일은 `.local-runtime/releases/windows-client/CH2CH-Client-Setup-0.1.0-x64.exe`이다. SHA-256: `144640948A9C82C90F1E060AC69679B7CA14C4583F10E9A92C7D0F8C7673D0C9`. 현재 **NotSigned**이며 시험용이다. 설치 프로그램 실행·등록·삭제, SmartScreen/UAC 우회는 하지 않았다. 배포용 코드 서명과 실제 새 설치/제거 시험은 남아 있다.
- 소단계 2: 웹 배포 후보는 `.local-runtime/releases/web-2026-09-22T01-30-06-568Z/.next/standalone`이다. 상위 `release-manifest.json`에 전체 파일 해시를 기록했다. Windows에서 빌드했으므로 Linux 서버에는 그대로 복사하지 않고 Linux 환경에서 다시 빌드한다. 비밀값·운영 자료·Runner 실행 환경·Playwright 브라우저는 포함하지 않았다.

Windows 앱 실행 시 웹 주소를 입력한다. 기존 로컬 서비스라면 실제 켜져 있는 `http://localhost:3000` 등이고, 운영 서버라면 해당 HTTPS 주소다. 앱 메뉴의 `서버 주소 변경` 또는 `Ctrl+,`로 수정한다. 접속 주소만 `%APPDATA%\CH2CH-Client\connection.json`에 저장하고 서비스 개인 키는 저장하지 않는다. 웹 로그인 쿠키와 웹 저장값은 독립 Chromium 프로필에 보관한다.

이 앱은 **웹 서비스를 포함한 오프라인 일체형 실행기**가 아니다. 자체 Node.js 설치 없이 창을 실행하지만, 연결 대상 웹 서비스는 별도로 켜져 있어야 한다. 앱을 닫아도 기존 서버·Runner를 종료하지 않는다. 기존 `desktop:*`, `start-local.cmd` 흐름은 새 연결 앱으로 대체하지 않았다.

개발자용 재생성: `npm run client:dist`, `npm run release:web`. 각각 독립 작업으로 실행한다. 웹 빌드는 비밀 환경파일을 복사하지 않으며, 의존성 설치/업데이트나 실행 중인 서비스를 변경하지 않는다. 로컬 의존성 바이트를 하드링크로 재사용하므로 릴리스 작업 폴더의 node_modules를 직접 수정하거나 npm install을 실행하지 않는다. 배포 대상은 완성된 standalone 폴더만이다.

## 대단계 3 — 검증 및 운영 전환 조건

- 소단계 1: API·보안·타입 검사 통과. API 25개 보호, 세션 서명·만료, 교차 출처 차단, Worker 인증, 페이지네이션, 실제/샘플 데이터 분리, 기존 포트 점유 보존을 검사했다.
- 소단계 2: 설치 파일에 포함된 `win-unpacked` 앱을 임시 프로필·임시 HTTP 서버로 실행했다. 주소 검증·저장, 설정 IPC 격리, Node 접근 차단, 서버 연결 실패 후 복구 안내, 앱 종료 후 서버 유지가 통과했다. 소스 버전도 동일 시험 통과. 웹 standalone에서 8개 화면 × 360/768/1280/1920px, 실제 HTML 로그인/로그아웃, 설정 공유, PWA 설치 취소 UI, 오프라인 안내→온라인 복귀, 개인정보 캐시 없음 검사가 통과했다. Windows 패키지 allowlist 7개 앱 파일과 웹 배포본 2,297개 텍스트/아카이브를 검사해 로컬 비밀값 일치와 인증파일 포함을 찾지 못했다. 모든 유형의 비밀정보가 없다는 보증은 아니다.
- 소단계 3: 실제 Google Sheet 수정·웹교적 출석 처리·BAND 게시를 다시 실행하지 않았다. 기존 업무 회귀 시험 결과와 격리 검증에 근거한 배포 후보이지, 실운영 전체 흐름의 성공을 보증한 상태는 아니다. 기존 서비스를 중지/재시작하지 않았고 커밋·푸시·Vercel 운영 배포도 수행하지 않았다.

재검사 스크립트:

- `npm run verify:client`: Windows 소스 앱 검사.
- `npm run verify:client-package`: 생성된 Windows 앱·아카이브 검사. 설치 프로그램은 실행하지 않는다.
- `node scripts/verify-security-http.js --app --standalone <standalone 폴더>`: 독립 포트·시험용 세션으로 웹/API/PWA 화면 검사.
- `node scripts/release/verify-release-contents.js <배포 폴더>`: 파일명·로컬 비밀값 포함 검사. 비밀값은 출력하지 않는다.

다음 운영 전환에서는 서버 주소와 배포 환경을 확정하고, 비공개 설정으로 `APP_ACCESS_PASSWORD`(12자 이상), `APP_SESSION_TOKEN`(32자 이상), 필요한 Worker 토큰을 준비해야 한다. 현재 로컬에는 새 로그인 설정이 없으므로 **그대로 시작하면 설정 안내/접근 차단이 정상**이다. 임의 비밀번호는 만들지 않았다. 별도 시험 주소에서 실제 연동의 읽기 확인을 한 뒤 승인된 소량 업무 검증과 운영 전환을 진행한다. 공개 API 전체 개방은 하지 않는다.

QR 원격 큐용 DB 준비, 서버의 브라우저 자동화 가능 여부, 상시 Runner, Google 공유 권한, 서버에 보존할 기존 예배일지 자료는 배포 환경에서 추가 확인해야 한다. 휴대폰의 localhost는 이 Windows PC가 아니므로 모바일 실제 사용에는 운영 HTTPS 주소가 필요하다. PWA는 개인정보 오프라인 캐시·오프라인 제출을 지원하지 않는다.

Vercel 기존 배포 메타데이터 조회는 연결 도구의 인자 오류로 완료하지 못했다. 원격 배포 상태를 확인했다고 간주하지 않았고 원격 설정도 바꾸지 않았다.

참고: [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [Electron 앱 API](https://www.electronjs.org/docs/latest/api/app), [Windows NSIS 설치 패키지](https://www.electron.build/nsis/).
