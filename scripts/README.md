# 점검 스크립트

저장 경로 회귀 검사는 다음 명령으로 실행합니다.

```powershell
npm run verify:run-persistence
```

이 검사는 구형 `attendance_runs` 컬럼 오류만 호환 재시도 대상으로 삼고, 입력 파일 경로가 기존 `csv_file_name` JSON에 유지되는지 확인합니다.

`verify:parser`는 출석 파서와 실행 대상 매핑을 함께 검사하는 `verify:attendance-sync`의 호환 명령입니다.

## 소속 보정 회귀 검사

```powershell
npm run verify:affiliation-correction
```

다음 세 가지를 실제 CH2CH 화면을 변경하지 않는 모의 데이터로 검사합니다.

- 원래 가족 화면에서 누락된 사람만 보정 대상으로 수집되는지
- 검색으로 다른 소속을 찾은 사람의 성공 결과가 `second_pass_success`로 반영되는지
- 검색·체크·저장 검증에 실패한 사람의 이름과 원인이 별도 결과 목록에 남는지

이 검사는 실제 출석 데이터를 변경하지 않습니다. 실제 저장 실행은 별도의 Runner 실행에서만 수행합니다.

## 웹교적 출석 매핑 가상 검사

```powershell
npm run verify:web-attendance-virtual
```

가상 웹교적 행에 출석 작업을 적용하고 저장 후 새 상태를 다시 읽어 다음 규칙을 검사합니다.

- 시트의 `1-3부 참석`은 웹교적 `주일` 체크박스만 대상으로 하는지
- 시트의 `4부 참석`은 웹교적 `부서` 체크박스만 대상으로 하는지
- `방송` 체크 상태는 변경하지 않는지
- 저장되지 않은 체크를 저장 성공으로 잘못 처리하지 않고 최종 불일치로 잡는지

실제 CH2CH 화면이나 계정의 출석 데이터는 변경하지 않습니다.

## QR 요청 큐 회귀 검사

```powershell
npm run verify:qr-job-queue
```

Vercel 작업을 Runner Worker 요청으로 변환하는지와 완료·실패 결과 형식을 검사합니다.
