# CH2CH 출석체크 대시보드

> 출석 파일과 Google Sheets 자료를 확인하고, CH2CH 출석 운영 흐름을 로컬에서 미리 검토하는 도구입니다.
> 외부 데이터베이스 없이 샘플 데이터와 요청 단위의 임시 데이터만 사용합니다.

![Next.js](https://img.shields.io/badge/Framework-Next.js%2015-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Playwright](https://img.shields.io/badge/Automation-Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)

## 주요 기능

| 기능 | 설명 |
| --- | --- |
| 출석 대시보드 | 최근 실행, 성공/실패 통계, 샘플 결과를 한 화면에서 확인합니다. |
| 출석 입력 | Google Sheets URL 또는 CSV/XLSX/XLS/PDF 파일을 입력할 수 있습니다. |
| 출석 대상 판별 | 가족·이름·QR·참석 열을 분석해 출석 대상 후보를 만듭니다. |
| QR 출석 확인 | CH2CH QR 출석 자료를 검토하는 화면을 제공합니다. |
| 교인 검색 | 이름과 가족 기준으로 교인 정보를 검색하고 결과를 확인합니다. |
| 예배일지 | 출석 시트와 HWP 자료에서 예배일지 초안을 생성합니다. |
| 로컬 미리보기 | 실행 요청과 결과는 서버 메모리/샘플 데이터로만 처리되며 영구 저장되지 않습니다. |

## 기술 스택

- **Frontend**: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- **Parsing**: `xlsx`, `pdf-parse`, CSV parser
- **UI**: `lucide-react`
- **Automation**: Playwright 기반 로컬 기능

## 프로젝트 구조

```text
.
├── app/                  # 페이지와 API Route
├── components/           # 대시보드 UI와 입력 폼
├── lib/                  # 파서, 타입, 샘플 데이터
├── public/               # 정적 파일
├── scripts/              # 로컬 실행 스크립트
└── docs/                 # 실행 안내
```

## 실행

```powershell
npm.cmd install
npm.cmd run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. Windows에서는 `Start-CH2CH.cmd`를 실행해도 됩니다.

## 환경 변수

외부 데이터베이스 연결이 없으므로 필수 환경 변수는 없습니다. `.env.example`은 이 정책을 명시하기 위한 빈 템플릿입니다.

## 데이터 보존 정책

- Supabase 및 기타 외부 DB를 사용하지 않습니다.
- 실행 이력과 결과는 샘플 데이터 또는 요청 처리 중 생성된 임시 값입니다.
- 서버를 재시작하거나 새 배포가 이루어지면 임시 결과는 사라집니다.
- 실제 CH2CH 저장 기능을 추가할 때는 별도의 저장소와 인증 설계를 먼저 결정해야 합니다.

## 검증

```powershell
npm.cmd run typecheck
npm.cmd run build
```
