# 앱 전환 및 API 연결 안내

## 지원 범위 (2026-09-22)

목표는 **Electron Windows 앱 + 모바일 설치형 웹앱(PWA)**입니다. 공통 화면, 인증된 API 연결, Windows 앱의 접근 제한, PWA manifest·아이콘·설치 안내·오프라인 연결 안내를 준비했습니다. 별도 Android/iOS 네이티브 앱은 아닙니다. 별도 Windows 연결 앱 설치 파일과 격리 웹 배포 후보를 생성했습니다. 최신 결과·백업·운영 전환 조건은 [앱 배포 기록](APP_RELEASE_2026-09-22.md)을 참고하세요. 외부 HTTPS 운영 배포는 아직 수행하지 않았습니다.

| 구성 | 역할 | 연결 방향 |
|---|---|---|
| 웹 / Windows 화면 | 출석·QR·예배일지 입력·검토 | 같은 출처의 `/api/*` 호출 |
| Next 서버 | 인증, 파일 해석, 저장 요청 | 서버 전용 키로 외부 서비스 접근 |
| Runner | 웹교적 브라우저 자동화 | 저장된 작업을 가져와 처리 |
| Google / Supabase / BAND | 자료·결과·게시물 보관 | 비밀키를 화면에 전달하지 않음 |

Windows 실행기는 `http://127.0.0.1:3000/runs/new`에 연결합니다. 서버는 `127.0.0.1:3000`에만 바인딩하여 다른 PC에 개방하지 않습니다. 포트가 이미 사용 중이면 기존 프로그램을 종료하지 않고 안내합니다. 기존 `localhost:3000` 브라우저와 `127.0.0.1:3000`은 별도 출처이므로 로그인과 로컬 URL 기본값을 각각 설정해야 합니다.

## 로그인과 연결

- `APP_ACCESS_PASSWORD`(12자 이상), `APP_SESSION_TOKEN`(32자 이상)을 서버의 비공개 환경설정에 설정해야 합니다. 미설정이면 접근 차단이 정상입니다. 실제 값을 소스·배포 패키지·앱 화면에 넣지 않습니다.
- `POST /api/auth/login`: JSON `{ "password": "사용자가 입력한 접속 코드" }`. 성공하면 `{ "ok": true }`와 HttpOnly 세션 쿠키를 반환합니다. 브라우저는 쿠키를 자동으로 보관합니다.
- `GET /api/app`: 인증 성공 후 계약 버전, 서비스 경로, 요청 제한, 세션 만료 시각을 반환합니다. **외부 DB·Google·Runner의 정상 동작을 보장하는 종합 상태 검사는 아닙니다.**
- `GET /api/openapi`: 로그인·연결·주요 조회 API의 OpenAPI 3.0.3 명세입니다. 모든 쓰기 필드를 정의한 전체 명세는 아닙니다.
- `POST /api/auth/logout`: 동일 출처 요청만 허용하며 쿠키를 지우고 로그인 화면으로 이동합니다.

쓰기 요청은 서버와 같은 `Origin`이 필요합니다. 웹에서는 브라우저가 자동으로 설정합니다. CORS 전체 공개나 인증 없는 외부 호출은 허용하지 않습니다. 현재 권한 모델은 단일 관리용 접속 코드이며, 독립 모바일 네이티브 클라이언트·다중 사용자 서비스에는 별도 사용자 인증/권한 설계가 필요합니다. 공용 API 키로 관리자 비밀번호를 배포하지 마세요.

동일 출처 화면의 조회 예:

```js
const response = await fetch('/api/runs?page=1&pageSize=20', {
  credentials: 'same-origin',
  cache: 'no-store'
});
const result = await response.json();
if (!response.ok) throw new Error(result.error || '조회 실패');
// result.demo === true이면 실제 운영 기록이 아닌 샘플입니다.
```

## 업무 API

| API | 용도 / 주의 |
|---|---|
| `GET /api/attendance` | 실제 저장된 출석 이력. DB 설정 없을 때만 `demo: true`. `week`, `family`, `name`, `service=1-3 또는 4`, `failuresOnly`, `page`, `pageSize` |
| `GET /api/runs` | 출석 실행 목록. `page` 1~100000, `pageSize` 1~100. 응답 `{data,demo,page,pageSize}` |
| `POST /api/runs` | 출석 작업 등록. JSON 또는 multipart. 응답 `{runId,status}`는 **접수**이며 완료가 아님 |
| `GET /api/runs/{id}` | 개별 실행 상태 |
| `GET /api/runs/{id}/results` | 처리 결과 (`status` 필터 가능) |
| `GET /api/runs/{id}/events` | 최근 실행 로그 (최대 100개) |
| `GET /api/runner/status` | 최근 실행기 heartbeat. `demo`와 `last_seen_at`을 함께 판단 |
| `/api/qr-attendance` | 로컬 미리보기·적용 / 원격 큐. 기존 응답 형태가 환경에 따라 다르므로 UI 구현을 함께 참고 |
| `/api/worship-journals` | GET 저장 목록 `{journals}`, POST multipart `preview` / `publish` |
| `/api/band/status`, `/api/band/publish` | 연결 확인 / 사용자가 승인한 게시 |

출석 등록의 Google Sheet 입력: `dataSource=google_sheet`, `googleSheetUrl`, `googleSheetTab`, `targetDate`(YYYY-MM-DD), `targetYear`, `targetWeek`(1~53), `targetDept`, `targetCourse`, `targetGroup`. 파일 입력은 `dataSource=file` + `file` multipart. 이 API는 실제 작업을 등록하므로 자동 재전송하지 않습니다. 응답 유실 시 실행 목록을 먼저 확인해야 합니다. 아직 idempotency key를 지원하지 않습니다.

예배일지는 `date`, `author`, `attendanceSheetUrl`, `attendanceSheetTab`, `bulletin`(HWP/PDF), `accountingSourceType`(`excel`/`google-sheet`), `accountingFile` 또는 `accountingSheetUrl`을 multipart로 전송합니다. 먼저 `action=preview`로 검토하고, 기존 화면의 검증·reviewDigest 절차를 거쳐 `publish`합니다. 앱에서도 이 검토 단계를 생략하지 마세요. 추가 입력·검토본의 정확한 구조는 `components/worship-journal-builder.tsx`와 API 구현을 기준으로 합니다.

일반 JSON 본문은 4MB, multipart 전체는 48MB 이하입니다. 개별 파일은 더 작은 제한이 있을 수 있습니다. 오류 응답은 `{error: "설명"}`: 400 입력 오류, 401 로그인 필요, 403 출처/권한 오류, 413 크기 초과, 429 요청 제한, 503 설정/연결 문제. 기존 일부 API는 500을 사용합니다.

## 화면 변경

- PC 현재 메뉴 강조, 좁은 화면의 설정 메뉴·홈·로그아웃 제공.
- 하단 메뉴와 본문 사이 여백 및 기기 하단 안전 영역 반영.
- 설정 저장을 실제 로컬 URL 기본값에 연결. 사용하지 않던 가짜 저장 필드 제거.
- 설정 → API 연결 확인 / API 명세 보기 제공.
- 화면의 개인정보 안내와 운영/샘플 상태 문구 수정.
- 예배일지 Google Sheet / PDF 출력 양식은 변경하지 않음.
- 모바일 웹앱: 설정 → 홈 화면에 앱 추가. Android/PC 설치 프롬프트를 제공하고, iPhone/iPad에는 Safari 홈 화면 추가 경로를 안내합니다. 기기별 실제 설치는 배포 후 실기기 검증이 필요합니다.
- service worker는 개인정보를 캐시하지 않고, 네트워크가 끊긴 화면 이동에 연결 안내만 표시합니다. API 응답 캐시·오프라인 제출 큐는 없습니다.

## Windows 배포 전 남은 일

새 `desktop-client`는 웹 연결 전용 앱이며 설치 파일과 패키지 실행 검사를 완료했습니다. 아래 일체형 실행기 한계는 기존 `desktop`에 해당합니다. 새 앱도 코드 서명·OS 새 설치/제거·실제 운영 연결 검증은 남아 있습니다.

- 기존 실행기는 아직 Node 설치와 `.env.local` 수동 준비, `next dev` 실행에 의존합니다. userData 기반 설정·로그 보관, 프로덕션 빌드 포함, 실행 환경 동봉을 완료해야 일반 사용자용 설치 앱이 됩니다.
- 배포 패키지는 소스 허용 목록을 사용하고 env·키·로그·산출물을 제외합니다. 실제 설치 파일을 빌드할 때 최종 내용 검사도 다시 수행해야 합니다.
- 설치·업데이트·코드 서명과 Windows 실기기 설치 시험은 이번 범위에서 수행하지 않았습니다.
- 모바일 접속에는 상시 켜진 서버와 HTTPS가 필요합니다. 휴대폰의 localhost는 서버 PC가 아닙니다.
- 개인정보가 담긴 출석·회계자료의 오프라인 캐시는 구현하지 않았습니다.

## 자동 검증

`npm run verify:app`: API 계약, pagination, 실제/샘플 분기, DB 오류 시 샘플 대체 금지, 데스크톱 URL/IPC 제한, 포트 충돌 보존, 패키지 제외 규칙.

`npm run verify:security`: API 인증·CSRF·서명 세션·본문 제한 등 회귀 시험.

화면 시험은 먼저 `$env:NEXT_BUILD_DIR='.local-runtime/security-build'`로 `npm run build` 후 `npm run verify:app-layout`을 실행합니다. 독립 loopback 포트의 테스트 서버에서 임시 시험 세션만 사용하며, 실제 출석 등록·Google Sheet 쓰기·BAND 게시를 하지 않습니다. 스크린샷은 `.local-runtime/app-review`에 저장됩니다.

참고: [Electron 보안 체크리스트](https://www.electronjs.org/docs/latest/tutorial/security), [Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route), [Supabase 조회 API](https://supabase.com/docs/reference/javascript/select).

PWA 구현 기준: [Next.js PWA 안내](https://nextjs.org/docs/app/guides/progressive-web-apps). 일반 폼 POST의 Origin 헤더가 사라지지 않도록 Referrer-Policy는 `same-origin`을 사용합니다. 외부 사이트로 Referer는 전송하지 않습니다. [Origin 헤더 설명](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Origin).

## 2026-09-22 검증 결과

- `verify:app`, `verify:security`, 데스크톱 프로세스·패키지·UI 상태 시험, TypeScript, 프로덕션 빌드 통과.
- 주요 8화면 × 360/768/1280/1920px에서 가로 넘침·설정 메뉴·현재 메뉴 확인.
- 실제 HTML 폼 로그인/로그아웃, 설정 저장·새로고침·3개 업무 화면 간 공유, API 연결 안내 통과.
- manifest/아이콘/service worker 비인증 접근, 설치 취소 UI, 오프라인 안내→온라인 복귀, 개인정보 캐시 없음 확인.
- 실제 Supabase 출석 이력 read-only 조회 성공. 이름/연락처를 출력하지 않았고 기존 자료를 수정하지 않음.
- 설치 프롬프트 동작은 테스트 이벤트로 검증했으며 실제 OS 설치, 모바일 실기기, Windows 설치 파일 외부 배포는 미실시. 별도 연결 앱의 설치 파일 생성과 패키지 실행 검사는 후속 [앱 배포 기록](APP_RELEASE_2026-09-22.md)에 추가했습니다.
