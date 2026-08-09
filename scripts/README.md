# 점검 스크립트

저장 경로 회귀 검사는 다음 명령으로 실행합니다.

```powershell
npm run verify:run-persistence
```

이 검사는 구형 `attendance_runs` 컬럼 오류만 호환 재시도 대상으로 삼고, 입력 파일 경로가 기존 `csv_file_name` JSON에 유지되는지 확인합니다.
