# Runner 저장 점검

Runner는 `attendance_runs`에서 `queued` 행을 가져오고, Storage의 입력 파일을 읽은 뒤 `attendance_results`와 `attendance_weekly_records`에 결과를 기록합니다.

입력 파일 경로는 다음 순서로 찾습니다.

1. 최신 컬럼 `source_file_path`
2. 구형 DB 호환용 `csv_file_name` JSON의 `path`

따라서 API가 구형 스키마 호환 재시도로 저장한 실행도 Runner가 처리할 수 있습니다.

## 확인 순서

1. Supabase `attendance_runs`에 `queued` 행이 생겼는지 확인합니다.
2. `runner_heartbeats`의 `last_seen_at`과 `current_step`을 확인합니다.
3. 실행 행의 `error_message`와 `run_events`를 확인합니다.
4. 입력 파일이 `attendance-inputs` 버킷에 남아 있는지 확인합니다.

Runner를 실행하기 전에 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, CH2CH 로그인 환경변수가 현재 PC의 `.env.local`에 있는지만 확인하고 실제 값은 출력하지 않습니다.
