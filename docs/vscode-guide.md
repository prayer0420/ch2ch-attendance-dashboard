# 로컬 실행 안내

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run runner
```

브라우저에서 `http://localhost:3000`을 엽니다. `Start-CH2CH.cmd`를 실행하면 대시보드와 Runner가 함께 시작됩니다.

먼저 `.env.example`을 참고해 `.env.local`에 Supabase와 CH2CH 값을 입력하고, Supabase SQL Editor에서 `supabase/schema.sql`을 실행해야 합니다. 실행 요청과 결과는 Supabase에 저장되므로 Vercel과 로컬 Runner가 같은 프로젝트 정보를 사용해야 합니다.
