# CH2CH 데스크톱 앱

Electron 앱이 기존 Next.js Dashboard와 Runner를 시작하고 `http://localhost:3000/runs/new`를 앱 창에 표시합니다.

## 개발 실행

```powershell
npm install
npm run install-browsers
npm run desktop:dev
```

실행 전에 프로젝트 루트의 `.env.local`을 준비해야 합니다. 앱은 CH2CH 비밀번호를 화면이나 로그에 표시하지 않습니다.

## 설치 파일 만들기

```powershell
npm run desktop:dist
```

결과는 `dist/`에 생성됩니다. 설치 프로그램에는 `.env.local`이 포함되지 않습니다.
