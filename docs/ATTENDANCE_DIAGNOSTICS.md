# 출석 실패 진단

새 실행부터 `run_events.event_type = 'attendance_diagnostic'`의 `context`에 구조화된 진단을 저장합니다. 기존 실행의 기록을 소급 복원하지는 않습니다.

## 기록 내용

- 실행 ID, 고유 이벤트 ID, 실제 관찰 시각, 대상 날짜·주차
- 가족별 시트 대상 이름·주일/부서 체크값
- 화면 진입 시도(최대 2회), 소요 시간, 프레임별 행 수·관찰 이름·소속·선택 주차
- 이름 일치 여부, 체크박스 수·선택 열·처리 전후 값·오류 코드
- 저장 검증 결과와 실패 화면 파일 위치·SHA-256

DB 조회 예시(실행 ID는 실행 상세 주소의 마지막 값):

```sql
select created_at, message, context
from public.run_events
where run_id = '<실행 UUID>'
  and event_type in ('attendance_diagnostic', 'diagnostic_persistence_warning')
order by id;
```

`context.observedAt`은 실제 관찰 시각이고 `created_at`은 DB 저장 시각입니다.

## 판정과 재시도

- 가족 화면: 정확한 대상 이름·소속(화면에 명시된 경우)·주차(선택창에 표시된 경우)를 대조하고 두 차례 연속 같은 행 목록인지 확인합니다. 실패하면 출석부 경로로 한 번 재진입합니다. 그래도 실패하면 체크·저장을 건너뜁니다.
- 이름: `박선희E`의 E를 제거하거나 유사 이름을 선택하지 않습니다. 명시적으로 소속이 다르거나 후보가 여러 개면 선택하지 않습니다.
- 행 상태: 행을 찾았으나 체크박스 읽기에 실패하면 표가 안정된 뒤 같은 이름 행을 한 번 새로 찾습니다. 전체 검색은 하지 않습니다.
- `row-detached`: 화면 갱신으로 기존 행이 문서에서 분리됨.
- `checkbox-not-found`: 해당 행에서 사용할 체크박스를 찾지 못함.
- `ambiguous-checkbox`: 열/레이블 후보가 여러 개임.
- `expected-members-not-found`: 표시된 출석표에서 시트 대상 이름을 확인하지 못함. 미등록으로 단정하지 않음.
- `week-mismatch`, `frame-read-error`, `navigation-not-confirmed`: 주차·화면 읽기·이동 문제를 각각 구분함.
- 가족 버튼은 화면 교체 시 다시 찾는 Locator로 클릭합니다. 클릭 오류만으로 가족을 실패 처리하지 않고 실제 표를 읽어 확인합니다. `view-confirmed-after-navigation-error`는 클릭 오류 뒤에도 정확한 이름·주차가 안정적으로 확인된 경우입니다.
- `family-navigation-result`에는 후보 수, 프레임, `dom-replaced`·`pointer-intercepted`·`click-timeout` 등 클릭 실패 원인 코드가 기록됩니다. 이동 실패 때도 `family-readiness.snapshot`에 관찰한 표가 남습니다.

## 로컬 증거

`runner/legacy-ch2ch/logs/diagnostics/<실행 ID>/events.jsonl`에 원본 진단을 보존하고 같은 폴더에 실패 화면을 저장합니다. DB에는 화면 파일 위치와 체크섬을 기록하며 이미지 자체를 공개 업로드하지 않습니다. 이 경로는 Git에서 제외됩니다.

쿠키·환경변수·전체 HTML·입력값은 진단에 기록하지 않습니다. 실패 화면의 입력창은 마스킹합니다. 이름과 출석 정보가 담기므로 증거 폴더도 출석 데이터와 같은 권한으로 관리해야 합니다. DB 기록 실패는 Runner 로그와 복구 가능한 경우 경고 이벤트에 남기며, 이미 수행 중인 출석을 자동 재실행하지 않습니다.

## 검증

`node scripts/verify-member-row.js`, `node scripts/verify-attendance-single-pass.js`, `node scripts/verify-attendance-diagnostics.js`로 지연 화면, 이름 접미사, 다른 소속, 낡은 행, 한 번 재진입, UTF-8 로그 분할, 실패 화면 참조를 재현합니다. 테스트는 실제 교적과 출석 데이터를 변경하지 않습니다.

`node scripts/verify-family-navigation.js`는 이전 ElementHandle 방식의 분리된 버튼 오류를 먼저 재현하고, 최신 화면에서 버튼을 다시 찾는 방식과 클릭 오류 후 표 검증을 검사합니다.

`scripts/diagnose-family-navigation.js`는 **2026-10-04 / 40주차 장애 전용** 읽기 진단입니다. 기존 인증으로 접속해 12가족의 시트 대상 이름과 주차를 확인하며 체크박스·저장 함수는 로드하지 않습니다. 다른 날짜 진단에 그대로 사용하지 마세요.
