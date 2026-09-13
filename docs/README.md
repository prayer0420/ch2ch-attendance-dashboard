# 등촌 프로젝트 문서 안내

이 폴더는 다른 노트북이나 새 Codex 작업에서 프로젝트를 이어가기 위한 문서 허브다.

## 읽는 순서

### 공통 작업 규칙

1. 프로젝트 루트의 `AGENTS.md`
2. 이 파일 `docs/README.md`

### Linux 이관·QEMU 작업

3. `extras/server-migration/CODEX_MASTER_HANDOFF.md`
4. 작업 트랙에 따라 다음 문서 중 하나
   - 실제 이관 목표 `tc-xen02 → tc-xen03`: `extras/server-migration/CODEX_MASTER_HANDOFF.md`의 트랙 A
   - 완료된 연습 `xen02 → xen01`: `extras/server-migration/CODEX_MASTER_HANDOFF.md`의 트랙 B
   - QEMU Oracle Linux 10: `extras/qemu-oracle-linux/QEMU_ORACLE_LINUX_HANDOFF.md`
5. `docs/current/CURRENT_STATE.md`
6. 필요할 때만 `docs/logs/SESSION_LOG.md`의 최근 기록

### 메리츠 Oracle Linux 10 실습·고객사 현장

가장 먼저 `docs/meritz-ol10/README.md`를 읽는다. 이 문서에서 로컬 실습 1~3회 기록, 2026-09-14 고객사 현장 시작 가이드, 장애 빠른 찾기 문서로 이동한다.

### CH2CH 애플리케이션 개발 작업

- 전체 개발 인수인계: `docs/CONTINUE-HERE.md`
- 기능별 문서: `docs/workflows/`
- 설계·작업 계획: `docs/superpowers/specs/`, `docs/superpowers/plans/`
- 서버 배포: `docs/continuation/SERVER-DEPLOYMENT.md`

## 디렉터리 규칙

| 위치 | 용도 |
|---|---|
| `docs/current/` | 항상 최신 상태만 유지하는 현재 작업 문서 |
| `docs/logs/` | 날짜별 작업 결과·명령·판단 근거 |
| `docs/archive/` | 길어진 CURRENT_STATE의 이전 버전 보관 |
| `docs/meritz-ol10/` | 메리츠 OL10 실습 회차·고객사 현장 대응 전용 문서 |
| `docs/workflows/` | 기능별 실행·운영 절차 |
| `docs/continuation/` | 서버 배포 등 별도 연속 작업 |
| `docs/superpowers/` | 설계서와 작업 계획 |
| `extras/` | CH2CH 본체와 별개인 서버 이관·전사·QEMU 보조 자료와 프로그램 |

## 현재 상태 기록 원칙

`docs/current/CURRENT_STATE.md`에는 지나친 요약을 하지 않는다. 다음 키워드를 검색 가능한 형태로 보존한다.

- 트랙명, 단계 번호, 호스트명, VM명, OS
- 명령어와 실행 위치
- 파일 경로, IP, 포트, 인터페이스
- 계정명, 서비스명, 상태값
- 오류 문구 원문, 정상 기준, 판단 근거
- 다음에 실행할 정확한 명령어

파일이 길어지면 기존 내용을 삭제하지 않고 `docs/archive/CURRENT_STATE_YYYY-MM-DD_1.md`, `_2.md`로 이동·보관한다. `docs/current/CURRENT_STATE.md`에는 최신 상태와 보관 파일 목록을 남긴다.

### 갱신 빈도

- `CURRENT_STATE.md`는 매 명령 결과마다 수정하지 않는다.
- 사용자가 직접 저장을 요청했을 때 또는 의미 있는 대화가 약 5~10개 누적됐을 때 최신 상태를 한 번에 갱신한다.
- `SESSION_LOG.md`는 하루에 한 번 의미 있는 변경사항을 모아 기록한다.
- 단순한 명령 실행 결과는 즉시 현재 상태 파일에 반복해서 추가하지 않는다.

## 보안 규칙

비밀번호, 토큰, 개인키, 세션값, 실제 고객 개인정보, `.env.local`의 비밀값은 기록하지 않는다.
