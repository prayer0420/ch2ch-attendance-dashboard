# Supabase 스키마 점검

## 저장에 필요한 테이블

- `attendance_runs`: 실행 요청과 현재 상태
- `attendance_results`: 사람별 처리 결과
- `attendance_weekly_records`: 최종 주차 기록
- `run_events`: 실행 로그
- `runner_heartbeats`: Runner 연결 상태
- `qr_sync_jobs`: Vercel QR 요청과 로컬 Runner 처리를 연결하는 작업 큐
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

## QR 원격 요청 큐

Vercel에서 QR 버튼을 사용하려면 `migrations/20260809_add_qr_sync_jobs.sql`을 Supabase SQL Editor에서 한 번 실행해야 합니다. Vercel은 작업 요청만 저장하고, 켜져 있는 로컬 Runner가 CH2CH와 Google Sheet 브라우저 작업을 처리합니다.

QR 작업 중에는 로컬 PC의 `start-local.cmd`가 실행 중이어야 합니다. PC가 꺼져 있으면 작업은 `queued` 상태로 남습니다.
