-- 이전 데모 Runner가 저장한 가짜 결과를 삭제합니다.
-- Supabase SQL Editor에서 필요할 때 한 번만 실행하세요.

delete from public.attendance_weekly_records
where member_name in ('주고은', '박지혜A', '홍길동', '시트 예시 1', '시트 예시 2', '시트 예시 3');

delete from public.attendance_results
where name in ('주고은', '박지혜A', '홍길동', '시트 예시 1', '시트 예시 2', '시트 예시 3');

delete from public.run_events
where message like '%데모%'
   or message like '%박지혜A%'
   or message like '%홍길동%';
