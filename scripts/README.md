# 점검 스크립트

저장 경로 회귀 검사는 다음 명령으로 실행합니다.

```powershell
npm run verify:run-persistence
```

이 검사는 구형 `attendance_runs` 컬럼 오류만 호환 재시도 대상으로 삼고, 입력 파일 경로가 기존 `csv_file_name` JSON에 유지되는지 확인합니다.

참고로 `package.json`에 남아 있는 `verify:parser`는 현재 저장소에 없는 예전 스크립트를 가리킵니다. 출석 파서 검사를 다시 복원하기 전까지는 실행하지 말고, 저장 경로 점검에는 위 명령을 사용합니다.
