# CH2CH 프로젝트 이어서 작업하기

이 문서는 다른 PC에서 이 프로젝트를 다시 열었을 때 가장 먼저 읽는 인수인계 문서입니다.

## 저장소

- GitHub: https://github.com/prayer0420/ch2ch-attendance-dashboard
- 현재 작업 브랜치: `codex/accounting-worship-journal`
- 현재 데스크톱 앱 작업 커밋: `7952bd8 feat: add windows desktop installer`
- 브랜치 문서 보기: https://github.com/prayer0420/ch2ch-attendance-dashboard/tree/codex/accounting-worship-journal

## 다른 PC에서 시작하기

```bash
git clone https://github.com/prayer0420/ch2ch-attendance-dashboard.git
cd ch2ch-attendance-dashboard
git fetch origin
git switch codex/accounting-worship-journal
npm install
```

`.env.local`은 GitHub에 저장하지 않습니다. 기존 PC의 안전한 백업에서 복사하거나, 관리자에게 필요한 환경변수 값을 받아 프로젝트 루트에 직접 만듭니다.

```text
ch2ch-attendance-dashboard/
  .env.local
  package.json
  app/
  components/
  lib/
  runner/
  desktop/
```

## 현재 구현 상태

### 웹 Dashboard

- Next.js Dashboard와 Supabase 실행 요청/결과 저장 기능이 있습니다.
- 실행 요청 화면은 `app/runs/new/`, `components/run-create-form.tsx`가 담당합니다.
- 출석 입력 파서는 `lib/attendance-input-parser.ts`에 있습니다.
- QR 출석 동기화 화면은 `app/qr-attendance/`, `components/qr-attendance-sync.tsx`가 담당합니다.
- 예배일지는 `app/worship-journal/`, `components/worship-journal-builder.tsx`가 담당합니다.

### Runner

- Runner 진입점: `runner/src/runner.js`
- CH2CH 브라우저 자동화: `runner/legacy-ch2ch/src/main.js`
- Runner는 Supabase에서 `queued` 실행 요청을 가져와 처리합니다.
- CH2CH 아이디와 비밀번호는 `.env.local`에서만 읽습니다.
- 실제 저장 모드와 테스트 모드는 환경변수로 구분합니다. 처음 실행할 때는 `DRY_RUN=true`로 확인합니다.

### Windows 설치형 앱

- Electron 진입점: `desktop/main.js`
- Dashboard와 Runner 프로세스 관리: `desktop/process-manager.js`
- 설치 화면: `desktop/renderer/`
- 설치 안내: `desktop/README.md`
- 설치 프로그램 설정: `package.json`의 `build` 항목
- 빌드 명령: `npm.cmd run desktop:dist`

설치 프로그램은 GitHub에 바이너리로 저장하지 않습니다. 다른 PC에서 다음 명령으로 다시 만듭니다.

```powershell
npm.cmd install
npm.cmd run install-browsers
npm.cmd run desktop:dist
```

생성 위치는 `dist/CH2CH 출석체크 Setup 0.1.0.exe`입니다.

설치 파일에는 보안을 위해 `.env.local`이 포함되지 않습니다. 설치 후 앱이 사용하는 `resources/project/.env.local`을 별도로 준비해야 합니다.

## 검증 명령

코드를 수정한 뒤 아래 명령을 먼저 실행합니다.

```powershell
npm.cmd run verify:desktop-process
npm.cmd run verify:desktop-ui
npm.cmd run verify:desktop-package
npm.cmd run verify:qr-job-queue
npm.cmd run verify:affiliation-correction
npm.cmd run verify:run-persistence
npm.cmd run typecheck
npm.cmd run build
```

출석 자동화 로직을 건드릴 때는 반드시 테스트 모드로 먼저 실행하고, 실제 저장 전에 대상 주차·부서·출석 유형을 확인합니다.

## 아직 하지 않은 작업

### Linux 서버 배포

`aiteam.chanuk.theworkpc.com` 서버에는 아직 프로젝트를 배포하지 않았습니다. SSH 접속 가능 여부와 웹 UI 로그인 문제는 서버 관리자에게 별도로 확인해야 합니다.

서버 작업 문서:

- [Linux 서버 배포 준비](./continuation/SERVER-DEPLOYMENT.md)

서버 배포 전에는 다음을 결정해야 합니다.

1. Dashboard만 서버에서 제공할지
2. CH2CH Runner까지 서버에서 24시간 실행할지
3. Linux 서버에서 Chromium과 Xvfb를 사용할지
4. 웹 UI 인증을 Linux 계정과 연동할지, 별도 사용자 DB를 사용할지

현재 Runner는 브라우저 자동화와 CH2CH 로그인 세션에 의존하므로, 단순히 Vercel에 올리는 것만으로는 Runner가 계속 실행되지 않습니다.

## 절대 저장하지 말 것

- `.env.local`
- CH2CH 아이디와 비밀번호
- Supabase `service_role` 키
- SSH 개인키
- 서버 root 비밀번호
- 실제 출석 명단 원본 파일

## 작업 범위 찾는 법

한 기능만 수정할 때는 아래 문서와 코드만 먼저 읽습니다.

| 작업 | 먼저 읽을 문서 | 주요 코드 |
| --- | --- | --- |
| QR 출석 | `docs/workflows/qr-attendance/README.md` | `app/qr-attendance/`, `components/qr-attendance-sync.tsx` |
| 실행 요청/가족 제어 | `docs/workflows/run-request/README.md` | `app/runs/new/`, `components/run-create-form.tsx`, `lib/attendance-input-parser.ts` |
| 예배일지 | `docs/workflows/worship-journal/README.md` | `app/worship-journal/`, `components/worship-journal-builder.tsx` |
| Runner 자동화 | `docs/workflows/ch2ch-runner/README.md` | `runner/src/`, `runner/legacy-ch2ch/src/` |
| Windows 앱 | `desktop/README.md` | `desktop/`, `package.json` |

## 권장 작업 순서

1. `git status`로 다른 사람이 만든 변경을 확인합니다.
2. 해당 기능의 문서와 담당 코드만 읽습니다.
3. 테스트를 먼저 실행해 현재 상태를 기록합니다.
4. 작은 범위로 수정합니다.
5. 관련 검증 명령과 `typecheck`, `build`를 다시 실행합니다.
6. 변경 이유와 실행 결과를 커밋 메시지에 남깁니다.
