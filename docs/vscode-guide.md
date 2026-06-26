# VS Code로 실행하는 방법

PowerShell 명령을 직접 외울 필요 없이 VS Code의 Task로 실행하면 됩니다.

## 1. 프로젝트 열기

VS Code에서 아래 폴더를 엽니다.

```text
C:\Users\ekzm8\OneDrive\문서\등촌프로젝트
```

## 2. Task 메뉴 열기

VS Code 상단 메뉴에서:

```text
Terminal → Run Task...
```

또는:

```text
Ctrl + Shift + P
Tasks: Run Task
```

## 3. 홈페이지 켜기

```text
2. Start dashboard
```

터미널에 아래 주소가 보이면 성공입니다.

```text
http://localhost:3000
```

브라우저에서 직접 이 주소를 열어도 됩니다.

VS Code를 쓰지 않으려면 프로젝트 폴더의 아래 파일을 더블클릭해도 됩니다.

```text
Start-CH2CH.cmd
```

이 파일은 홈페이지와 Runner를 같이 켜고 브라우저를 엽니다.

Windows 로그인 때 자동으로 켜지게 하려면 아래 파일을 한 번 실행합니다.

```text
Install-CH2CH-Startup.cmd
```

## 4. 실행 요청 만들기

브라우저에서 아래 페이지로 이동합니다.

```text
http://localhost:3000/runs/new
```

처음에는 반드시 아래 버튼을 먼저 누르세요.

```text
테스트 실행 시작
```

테스트 실행은 CH2CH에 실제 저장하지 않는 점검용입니다.

## 5. Runner 켜기

실행 상세 화면이 `대기 중`에서 멈춰 있으면 Runner가 요청을 아직 가져가지 않은 상태입니다.

VS Code에서:

```text
Terminal → Run Task...
3. Start local Runner
```

정상 흐름은 아래와 같습니다.

```text
대기 중 → Runner 접수 → 실행 중 → 테스트 완료
```

## 6. 검사하기

코드가 정상인지 확인할 때:

```text
Check: TypeScript
Check: Build
Check: Runner syntax
```

## 7. 환경변수

`.env.local`에는 아래처럼 넣습니다.

```text
NEXT_PUBLIC_SUPABASE_URL=https://프로젝트ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
ADMIN_EMAILS=관리자이메일@example.com

RUNNER_MODE=true
RUNNER_ID=main-office-pc
RUNNER_POLL_INTERVAL_MS=3000
ENABLE_SUPABASE=true
CH2CH_USER=CH2CH아이디
CH2CH_PASSWORD=CH2CH비밀번호
```

`NEXT_PUBLIC_SUPABASE_URL`에는 `/rest/v1`을 붙이지 않습니다.

CH2CH 아이디와 비밀번호는 로컬 PC에만 둡니다.
