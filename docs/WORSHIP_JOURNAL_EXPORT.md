# 예배일지 시트 원본 내보내기

- 저장된 일지를 선택하고 **시트 PNG 저장** 또는 **PDF 저장**을 누릅니다.
- 앱 미리보기의 HTML을 촬영하지 않습니다. 저장 기록의 `spreadsheetId`와 `sheetId`로 Google의 PDF 내보내기를 호출하므로 시트에서 직접 수정한 값·서식도 반영됩니다.
- Google Sheet에 제출하지 않은 미리보기/옛 로컬 기록은 내보내지 않습니다. 실패할 때 미리보기 이미지로 대체하지 않습니다.
- 원본 시트와 동일한 병합·글꼴·테두리를 유지합니다. 기존 양식 A:K, 최소 52행에서 현재 값과 병합 범위의 마지막 행까지 읽으며, 1,000행 이상은 안전하게 중단합니다. 원본 셀은 수정하지 않습니다.
- PNG는 Google PDF의 각 페이지를 PDF.js로 렌더링하고 바깥 흰 여백만 잘라 세로로 합칩니다. OCR이나 이름 추정은 하지 않습니다. 8쪽/2,400만 픽셀 한도를 넘으면 PDF로 저장하도록 안내합니다.
- PDF는 Google에서 받은 원본 그대로 저장합니다.
- `PNG 저장 + 글 복사`는 파일 다운로드와 복사만 합니다. BAND에는 사용자가 첨부·게시합니다. 복사를 허용하지 않는 브라우저는 본문을 직접 복사하도록 안내합니다.
- 게시 본문은 `#예배일지 #탭명`과 출석 정보, 이름이 입력된 새가족만 포함합니다. 새가족이 없으면 해당 제목/0명/없음 문구를 모두 생략합니다.

## 보안과 테스트

- `/api/worship-journals/export?id=...`는 관리자 로그인과 서버에 저장된 일지 ID가 필요합니다. 클라이언트가 임의의 시트 URL을 내보내도록 지정할 수 없습니다.
- 인증 토큰은 서버에만 있으며 PDF 응답은 `private, no-store`입니다. Google 호출은 시간 제한, 20MB 크기 제한, PDF 시그니처 확인을 거칩니다.
- 단위 회귀검증: `node scripts/worship-journal/verify-sheet-export.js`, `node scripts/verify-band-integration.js`.
- 실제 다운로드 검증: 기존 서버 인증을 `Import-ServerAuthentication`으로 프로세스 환경에 불러온 뒤 `node scripts/worship-journal/verify-sheet-export-browser.js`. 저장된 시트를 읽어 PNG를 내려받으며 출석 실행/일지 제출/BAND 게시 요청은 차단합니다. 검토 파일은 Git 제외 경로 `.local-runtime/worship-export-review/`에만 저장합니다.

구현 근거: [Google의 시트 PDF 내보내기 예제](https://developers.google.com/apps-script/samples/automations/generate-pdfs), [Mozilla PDF.js](https://mozilla.github.io/pdf.js/getting_started/).
