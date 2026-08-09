# Supabase 스키마 점검

## 저장에 필요한 테이블

- `attendance_runs`: 실행 요청과 현재 상태
- `attendance_results`: 사람별 처리 결과
- `attendance_weekly_records`: 최종 주차 기록
- `run_events`: 실행 로그
- `runner_heartbeats`: Runner 연결 상태
- Storage `attendance-inputs`: CSV, XLSX, XLS, PDF 원본

## 마이그레이션

기본 테이블은 `schema.sql`로 만들고, 이후 다음 파일을 순서대로 적용합니다.

1. `migrations/20260618_add_input_files.sql`
2. `migrations/20260806_restore_run_target_fields.sql`

현재 구형 프로젝트에서 일부 컬럼이 빠져 있어도 API는 선택 컬럼을 빼고 한 번 재시도합니다. 다만 운영 DB를 장기적으로 안정화하려면 위 SQL을 Supabase SQL Editor에서 적용하는 것이 최종 해결입니다.

적용 후 확인할 컬럼:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'attendance_runs'
order by ordinal_position;
```

Service Role Key는 SQL, 문서, 화면 캡처, GitHub에 기록하지 않습니다.
