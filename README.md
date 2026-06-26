# CH2CH 출석체크 관리 홈페이지

구글시트/CSV 기반 CH2CH 출석체크 자동화를 사용자 친화적인 관리 홈페이지, Supabase DB, 로컬 Runner 구조로 확장한 프로젝트입니다.

## 구조

- `app/`: Next.js App Router 홈페이지와 API
- `components/`: 대시보드, 실행 생성, 공통 UI
- `lib/`: 타입, Supabase client, mock data, 서버 데이터 함수
- `supabase/schema.sql`: Supabase 테이블, 인덱스, trigger, 초기 설정
- `runner/src/runner.js`: queued 실행 요청 polling, heartbeat, 결과 저장
- `runner/src/automation-adapter.js`: 기존 CH2CH Playwright 자동화 연결 지점

## 실행

```powershell
npm.cmd install
npm.cmd run dev
```

Supabase 환경변수가 없으면 데모 데이터로 화면이 표시됩니다.

VS Code에서 실행하려면 [docs/vscode-guide.md](docs/vscode-guide.md)를 보면 됩니다. `Terminal → Run Task...`에서 홈페이지, Runner, 검증 명령을 선택해서 실행할 수 있습니다.

VS Code를 열지 않고 실행하려면 `Start-CH2CH.cmd`를 더블클릭합니다. 홈페이지와 Runner가 같이 켜지고 브라우저가 열립니다.

Windows 로그인 때 자동으로 켜지게 하려면 `Install-CH2CH-Startup.cmd`를 한 번 실행합니다. 자동 실행을 끄려면 `Remove-CH2CH-Startup.cmd`를 실행합니다.

## 환경변수

`.env.example`을 복사해서 `.env.local`에 값을 채웁니다. Runner도 `.env.local`을 읽습니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://프로젝트ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
ADMIN_EMAILS=

RUNNER_MODE=true
RUNNER_ID=main-office-pc
RUNNER_POLL_INTERVAL_MS=3000
ENABLE_SUPABASE=true
CH2CH_USER=
CH2CH_PASSWORD=
```

CH2CH 아이디/비밀번호는 로컬 Runner 환경변수에만 두고, Vercel에는 올리지 않습니다.

`CH2CH_HEADLESS=false`로 두면 실제 Playwright 자동화가 연결되었을 때 브라우저가 눈에 보이게 뜹니다.

## Supabase 적용

Supabase SQL Editor에서 `supabase/schema.sql`을 실행합니다.

운영 전에는 관리자 이메일 기반 RLS policy를 추가하세요. 현재 schema는 테이블 RLS를 켜는 단계까지 포함합니다.

## Runner

```powershell
npm.cmd run runner
```

Runner는 `attendance_runs.status = 'queued'` 실행을 가져와 다음 순서로 처리합니다.

```text
queued → picked_up → running → completed / partial_success / failed / dry_run_completed
```

현재 테스트 실행은 구글시트를 CSV로 읽어 DB에 결과만 저장합니다. 실제 CH2CH Playwright 자동화는 `runner/src/automation-adapter.js`의 `runAttendanceAutomation` 함수 안에 기존 자동화 코드를 연결해야 동작합니다.

## 검증 명령

```powershell
npm.cmd run typecheck
npm.cmd run build
node --check runner/src/runner.js
node --check runner/src/automation-adapter.js
```
