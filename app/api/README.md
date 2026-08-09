# API 저장 경로 점검

## 실행 흐름

`POST /api/runs`는 다음 순서로 동작합니다.

1. Google Sheet 또는 업로드 파일을 읽습니다.
2. 원본 파일을 `attendance-inputs` Storage 버킷에 보관합니다.
3. `attendance_runs`에 `queued` 실행 요청을 저장합니다.
4. 로컬 Runner가 해당 행을 가져가 자동화를 시작합니다.

저장 버튼을 눌렀는데 실행 요청이 생기지 않으면 3번 이전에서 멈춘 것입니다. 브라우저 Network 탭에서 `POST /api/runs`의 응답 상태와 `error`를 먼저 확인합니다.

## 구형 DB 호환

`source_file_path`, `source_file_name`, `source_file_type`, `target_year`, `target_date`는 후속 마이그레이션 컬럼입니다. 첫 insert가 `42703 column does not exist`로 실패하면 `lib/run-persistence.js`가 이 선택 컬럼만 제거하고 한 번 재시도합니다. 파일 경로 정보는 기존 `csv_file_name` JSON에 남기므로 Runner가 계속 다운로드할 수 있습니다.

이 재시도는 임시 호환 장치입니다. 운영 DB에는 `supabase/migrations`의 SQL을 적용해야 합니다.

## 재점검 명령

```powershell
npm run verify:run-persistence
npm run typecheck
npm run build
```

비밀키나 전체 환경변수 값은 로그에 출력하지 않습니다.
