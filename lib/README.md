# 저장 호환 유틸리티

`run-persistence.js`는 `attendance_runs` 저장 시 최신 컬럼이 아직 없는 Supabase 프로젝트를 위한 최소 호환 계층입니다.

- `isMissingColumnError`: Postgres `42703` 또는 컬럼 없음 오류만 재시도 대상으로 판별합니다.
- `stripOptionalRunColumns`: 후속 마이그레이션 컬럼만 제거합니다.
- `csv_file_name`: 기존 스키마에서도 Storage 경로 JSON을 유지하는 핵심 필드입니다.

인증, 저장 재시도 횟수 증가, 임의 컬럼 삭제는 이 파일에 추가하지 않습니다. 스키마를 정식으로 맞춘 뒤에도 회귀 테스트를 유지해 이동·복구 과정에서 저장이 다시 깨지지 않았는지 확인합니다.
