# 보안 점검 및 보완 — 2026-09-22

## 점검 범위와 상태

CH2CH 대시보드의 페이지, API, 관리자 로그인, QR Worker, Google URL 처리, 파일 입력, 의존성을 점검했다. Supabase는 읽기 전용으로 진단했다. 서버 VM·방화벽·다른 프로젝트 데이터는 변경하지 않았다. 이 문서는 로컬 수정본에 관한 기록이며 운영 배포가 완료됐다는 뜻이 아니다.

## 주요 발견과 수정

| 발견 | 조치 |
| --- | --- |
| 로그인 화면이 있지만 페이지/API 접근 검사가 없음 | 페이지 및 25개 보호 API 처리기에 서버 측 인증 적용(앱 연결/명세 2개 포함). 미들웨어가 생략되어도 API에서 거부 |
| 환경변수가 없어도 데이터 접근 가능 | 설정 누락 시 접근 차단, 로그인 페이지에서 설정 필요 표시 |
| 고정 비밀값 자체를 세션 쿠키로 발급 | 비밀값 대신 서명·만료·임의 nonce가 있는 세션 발급. 기존 고정 쿠키는 무효 |
| 교차 사이트 변경 요청 차단 없음 | 로그인 및 변경 API에서 Origin/Host 확인. 서버 Worker는 별도 키 사용 |
| localhost 이름만으로 Worker 접근 허용 | 32자 이상 QR_WORKER_TOKEN 필수. Runner에서 해당 키 전송 |
| 로그인 횟수 제한 없음 | 프로세스당 10분 30회 제한, 일정 시간 비교로 비밀번호 검증 |
| 유사 도메인을 Google 주소로 수락 | 정확한 HTTPS 호스트·경로만 허용하고 CSV 주소 재구성. 게시용 시트 경로 처리도 보완 |
| 무제한 요청 본문 및 HWP 압축 해제 | JSON 4MB, multipart 48MB, 로그인 4KB 본문 상한. 기존 개별 파일 제한 유지, HWP 본문 압축 해제 64MB 상한 |
| 기본 응답 보안 헤더 미설정 | nosniff, iframe 삽입 금지, referrer 제한, 불필요한 장치 권한 차단, 제한적 CSP 추가 |
| 의존성 취약점 11건 | Next.js 15.5.25, PostCSS 8.5.28, 공식 SheetJS 0.20.3 및 호환 업데이트. npm audit 전체/운영 의존성 0건 확인 |
| 산출물·개인키 신규 추적 위험 | 임시 산출물·개인키·서비스 계정 파일의 ignore 규칙 보완. 기존 추적 파일/과거 Git 기록은 자동 삭제하지 않음 |

## 사용 전 필수 설정

실제 값은 로컬 `.env.local`과 배포 서비스의 비공개 환경변수에만 입력한다. 채팅이나 Git에 넣지 않는다. `.env.example`에는 빈 항목만 추가했다.

- `APP_ACCESS_PASSWORD`: 사용자가 정한 관리자 비밀번호, 12자 이상.
- `APP_SESSION_TOKEN`: 비밀번호와 다른 무작위 서명 비밀값, 32자 이상. 비밀번호 관리 도구에서 생성한다.
- `APP_SESSION_MAX_AGE_SECONDS`: 기본 43200초(12시간), 상한 12시간.
- `QR_WORKER_TOKEN`: 별도 무작위 비밀값, 32자 이상. 대시보드 서버와 Runner에 같은 값을 설정한다.

점검 당시 위 관리자/Worker 인증값은 로컬에 없었다. 임의로 생성하거나 저장하지 않았다. 인증값이 없거나 짧으면 접근이 차단된다. 설정 후 앱과 Runner를 재시작해야 적용된다. 배포 환경도 각각 설정해야 한다.

세션 서명키를 변경하면 기존 세션 전체가 무효화된다. 로그아웃은 해당 브라우저 쿠키를 지우며, 이미 탈취된 쿠키를 개별 폐기하는 중앙 세션 저장소는 아직 없다. 의심되는 세션이 있으면 서명키를 교체한다. 로그아웃 엔드포인트는 같은 출처의 POST만 받는다.

## 실제 Supabase 확인

- 출석 관련 7개 테이블의 RLS 활성화 확인. 정책 없음은 현재 서버 service-role 전용 구조에서 일반 클라이언트 접근을 거부하는 의도와 맞는다.
- `attendance-inputs` 저장소는 비공개로 확인됐다.
- `qr_sync_jobs` 테이블은 조회 결과에 없었다. QR 원격 작업용 테이블 준비 여부는 별도 확인해야 한다.
- `public.set_updated_at` 함수는 SECURITY INVOKER이며 search_path 고정 경고가 있다. 다른 프로젝트도 사용하는 DB이므로 이번에 변경하지 않았다. 소유자가 함수 정의와 사용하는 테이블을 검토한 뒤 search_path를 고정해야 한다.
- Supabase Auth의 유출 비밀번호 차단이 꺼져 있다는 경고가 있다. 본 앱의 자체 접속 코드와는 별개이며, 해당 프로젝트의 Supabase Auth 사용자 운영 여부·요금제 확인 후 설정해야 한다.

참고: [함수 search_path 경고](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [유출 비밀번호 차단](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [API 보호](https://supabase.com/docs/guides/api/securing-your-api).

## 검증

- `npm run verify:security`: 보호 API 25개 검사, 인증값 누락, 서명 위조·만료, 이전 고정 쿠키, 교차 출처, 요청 크기, Worker 인증, 악성 URL, 로그인 제한.
- `node scripts/verify-security-http.js`: `.local-runtime/security-build` 격리 빌드를 루프백 임시 포트에서 실행. 실제 HTTP 페이지/API 차단, 미들웨어 우회 헤더, 로그인·보안 쿠키, 교차 출처 변경 차단, localhost Worker 우회 차단. 테스트 비밀값은 자식 프로세스에만 주입하며 운영 설정/데이터를 바꾸지 않는다.
- 타입 검사 및 프로덕션 빌드 통과.
- `node scripts/verify-security-http.js --ui`: 인증 후 QR → 출석 실행 → 예배일지 화면의 시트 URL 공유 테스트 통과. 기존 localhost:3000 기반 테스트는 서버가 없어서 실패했으며, 격리 서버·로그인 지원을 추가해 재검증했다.
- 기존 회계·주보·출석·QR 큐·실행 저장·예배일지 출력·BAND 회귀 테스트 통과. 외부 실제 출석/게시/시트 쓰기를 재실행한 것은 아니다.
- Git 추적 텍스트 192개에서 일부 키 패턴 검사. 발견 1개는 테스트의 가짜 private-key 문자열이었다. 이 검사는 모든 Git 과거 기록·이미지·모든 비밀번호 유형의 비노출을 보증하지 않는다.
- 공개 브라우저 JavaScript 빌드 파일 59개에서 설정된 비밀값 3종의 포함 여부를 검사했고 일치 항목이 없었다.

## 남은 운영 보안

- 로컬 코드 수정은 운영 사이트에 자동 반영되지 않는다. 인증값 준비 후 커밋/배포 및 운영 주소 확인이 필요하다.
- 로그인 제한은 프로세스 메모리 방식이다. 서버리스 다중 인스턴스/재시작을 넘는 차단은 WAF 또는 공유 저장소 기반 제한을 추가해야 한다. DDoS 방지는 호스팅 계층에서 설정한다.
- CSP는 호환성을 위해 frame/object/base/form 제한만 적용했다. 모든 스크립트에 nonce를 적용하는 강한 script-src 정책은 별도 작업이다.
- 인증된 관리자도 악성 압축 Excel/PDF를 넣으면 파서가 자원을 많이 사용할 수 있다. 파일 크기 제한만으로 모든 압축 폭탄을 막지는 못하므로 신뢰할 수 있는 파일 사용과 격리 파서 프로세스/메모리 제한이 필요하다.
- 개인별 계정·역할 구분·접속 감사 로그는 아직 없으며 관리자 접속 코드를 공유하는 구조다.
- 이전에 채팅/문서로 공유한 서버 root 비밀번호는 서버 소유자가 교체해야 한다. 이번 작업에서 서버 계정 비밀번호는 변경하지 않았다.
- `.env.local`과 서비스 계정 키의 OneDrive 동기화 범위, 공유 링크, 저장소 공개 여부 및 기존 추적 산출물을 검토해야 한다.

의존성 기준: [Next.js 보안 권고](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4), [SheetJS 공식 설치 경로](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/), [Next.js 데이터 보안](https://nextjs.org/docs/app/guides/data-security).
