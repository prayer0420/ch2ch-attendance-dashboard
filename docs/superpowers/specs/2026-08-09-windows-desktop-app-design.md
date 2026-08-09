# CH2CH Windows 설치형 앱 설계

## 목표

VS Code, PowerShell, `start-local.cmd`를 직접 열지 않고 Windows 바탕화면 아이콘을 더블클릭해 CH2CH 출석체크 대시보드와 Runner를 함께 실행한다.

## 사용자 흐름

1. 설치 프로그램으로 `CH2CH 출석체크`를 설치한다.
2. 바탕화면 아이콘을 실행한다.
3. 앱이 기존 Dashboard와 Runner를 시작하고 `http://localhost:3000/runs/new`를 앱 창에 표시한다.
4. 사용자는 기존 홈페이지에서 출석체크·QR·검색 기능을 사용한다.
5. 앱 상단 상태 영역에서 Dashboard와 Runner 상태 및 최근 오류를 확인한다.
6. 앱을 닫으면 앱이 시작한 Dashboard와 Runner만 안전하게 종료한다.

## 기술 선택

- Electron 기반 Windows 데스크톱 앱
- 기존 Next.js Dashboard와 Node Runner를 별도 자식 프로세스로 실행
- 기존 `.env.local`, Supabase 연결, CH2CH 자동화 로직 재사용
- `electron-builder` NSIS 설치 프로그램 생성
- 앱이 시작할 때 Node.js와 의존성 실행 가능 여부를 점검하고 오류를 사용자에게 표시

## 앱 구성

- `desktop/main.js`: Electron 창, 자식 프로세스 시작·종료, 준비 상태 확인
- `desktop/preload.js`: Renderer에 제한된 상태·로그 API 제공
- `desktop/renderer/`: 시작 화면과 오류 상태 UI
- `desktop/installer/`: 설치 시 필요한 파일과 설정 안내
- `electron-builder` 설정: 설치 위치, 바탕화면 바로가기, 앱 아이콘, 제거 프로그램

## 안전 규칙

- `.env.local`은 설치 파일과 GitHub에 포함하지 않는다.
- 앱은 자신이 기록한 PID와 시작 시각이 일치하는 프로세스만 종료한다.
- 기존에 실행 중인 다른 Node 프로세스는 임의로 종료하지 않는다.
- 포트 3000이 다른 프로그램에서 사용 중이면 원인을 표시하고 자동 종료하지 않는다.
- CH2CH 비밀번호를 앱 화면이나 로그에 표시하지 않는다.

## 오류 처리

- Node.js 미설치: 설치 안내 표시
- `node_modules` 없음: 앱 안에서 의존성 설치 안내
- `.env.local` 없음: `.env.example` 복사 및 필수 항목 입력 안내
- Supabase 연결 실패: Runner 로그와 설정 확인 위치 표시
- Dashboard 시작 실패: 포트와 Dashboard 오류 로그 표시
- Runner 시작 실패: Runner 오류 로그 표시

## 검증 기준

- 설치 후 바탕화면 아이콘으로 앱이 실행된다.
- Dashboard가 준비되면 앱 창에 `/runs/new`가 표시된다.
- Runner가 Supabase heartbeat를 갱신한다.
- 앱 종료 시 Dashboard와 Runner가 종료된다.
- 앱을 두 번 실행해도 기존 프로세스를 잘못 종료하지 않는다.
- `npm run typecheck`, `npm run build`, 데스크톱 시작·종료 회귀 테스트가 통과한다.

## 범위 밖

- CH2CH 자동화 로직 자체의 변경
- Vercel 배포 구조 변경
- macOS·Linux용 패키지
- 자동 업데이트 서버 구축
