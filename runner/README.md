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

## 시트·웹교적 불일치 보정

가족 화면에서 이름을 찾지 못했거나 최종 체크 상태가 시트와 다르면 해당 인원은 즉시 성공 처리하지 않고 마지막 보정 단계로 넘깁니다.

보정 단계는 다음 순서로 동작합니다.

1. CH2CH 이름 검색에서 사람을 다시 찾습니다.
2. 검색 결과에서 확인한 소속을 클릭하고 대상 주차를 다시 선택합니다.
3. 그 소속 화면에서 이름을 다시 확인한 뒤 주일·부서 체크를 적용합니다.
4. 체크 상태를 다시 읽고 저장을 시도합니다.
5. `result.json`의 `affiliationCorrections`에 성공 또는 실패, 원래 가족, 발견된 소속, 저장 검증 결과, 실패 원인을 기록합니다.

보정 성공은 검색만 된 경우가 아니라 체크 상태 대조까지 통과한 경우에만 인정됩니다. 실패자는 `affiliation_correction_summary` 실행 이벤트에서 이름 목록으로 확인할 수 있습니다.
