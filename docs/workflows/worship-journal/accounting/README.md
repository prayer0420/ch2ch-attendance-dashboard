# 예배일지 회계 기능

이 폴더는 예배일지의 회계 입력과 감사헌금 정리만 설명합니다. 회계 기능을 수정할 때는 전체 프로젝트 문서 대신 이 문서와 아래 파일만 먼저 확인합니다.

## 관련 파일

- `lib/worship-journal-accounting.ts`: Google 링크 다운로드 후보, 날짜 탭 선택, 감사헌금 파싱·정렬·합계
- `app/api/worship-journals/route.ts`: 업로드/링크 입력 검증과 예배일지 저장 연결
- `components/worship-journal-builder.tsx`: 회계 원본 탭과 감사헌금 미리보기
- `scripts/accounting/verify-accounting-parser.js`: 실제 회계 표 형태를 이용한 자동 검증

## 입력 방식

화면에서 한 번에 하나의 원본을 선택합니다.

- `엑셀 파일`: `.xlsx` 또는 `.xls`, 최대 15MB
- `Google Sheet`: `docs.google.com/spreadsheets/d/...` 또는 `drive.google.com/file/d/...` 링크

Google 링크는 두 종류를 모두 처리합니다.

1. Drive에 저장된 Office `.xlsx` 원본 다운로드
2. 네이티브 Google Sheet의 XLSX 내보내기

첫 번째 응답이 HTML 확인 페이지이거나 읽을 수 없는 파일이면 두 번째 방식을 시도합니다.

## 날짜 탭 선택

선택한 예배 날짜를 탭 이름과 각 탭 상단 8개 행에서 찾습니다.

- `2026-06-28`
- `2026.06.28`
- `2026/06/28`
- `2026년 6월 28일`
- 연도 표기가 없는 `6/28`, `6월 28일`

같은 날짜가 여러 탭에 있으면 가장 오른쪽 탭을 사용합니다. 다른 연도가 명시된 탭은 월·일이 같아도 선택하지 않습니다.

## 감사헌금 표 규칙

- `감사헌금` 표제가 있는 열을 이름 열로 사용합니다.
- 바로 오른쪽은 금액, 두 칸 오른쪽은 감사내용입니다.
- `온라인`, `현장`, `온라인 계`, `현장 계`, `감사헌금 총계`, `합계`, `소계`는 개인 내역에서 제외합니다.
- 숫자, 쉼표, `₩`, `원`이 포함된 금액을 원 단위 정수로 바꿉니다.
- 감사내용이 있는 항목을 이름 가나다순으로 먼저 정렬하고, 내용 없는 항목을 가나다순으로 이어 붙입니다.
- 총액은 개인 감사헌금 금액을 합산합니다.

## 저장 호환성

새 일지는 `accounting` 필드를 저장합니다. 기존 저장 일지는 이 필드가 없어도 정상 표시됩니다. DB나 외부 서버는 사용하지 않고 기존 `.local-runtime/worship-journals.json` 저장 방식을 유지합니다.

## 검증

회계 기능만 확인할 때:

```powershell
npm.cmd run verify:accounting
```

API와 화면 타입까지 확인할 때:

```powershell
npm.cmd run typecheck
npm.cmd run build
```

실제 수동 확인에서는 `/worship-journal`에서 입력 탭 전환, 파일명 표시, 링크 입력, 실행 버튼 활성화 상태와 감사헌금 미리보기를 확인합니다.
