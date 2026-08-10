# Linux 서버 배포 준비 문서

대상 서버:

```text
aiteam.chanuk.theworkpc.com
SSH port: 22
계정: gd
```

이 문서는 준비 단계 문서입니다. 아직 서버에 프로젝트를 설치하거나 서비스를 실행하지 않았습니다.

## 먼저 확인할 것

### SSH 권한

```bash
ssh gd@aiteam.chanuk.theworkpc.com
whoami
hostname
sudo -l
```

`gd` 계정에 sudo 권한이 없다면 root 또는 기존 관리자가 서버에서 실행해야 합니다.

Ubuntu/Debian 계열:

```bash
usermod -aG sudo gd
```

CentOS/RHEL 계열:

```bash
usermod -aG wheel gd
```

권한 변경 후에는 SSH를 끊고 다시 접속합니다.

## 웹 UI 로그인은 별도 문제

Linux SSH 계정과 웹 UI 계정은 자동으로 같은 계정이 아닙니다. 웹 UI에서 `gd`로 로그인하려면 웹서비스의 인증 방식에 따라 별도 등록이 필요합니다.

서버 관리자에게 다음을 확인합니다.

- 웹 UI가 Linux PAM 계정을 사용하는가?
- LDAP/SSO를 사용하는가?
- 별도의 애플리케이션 사용자 DB가 있는가?
- `gd`를 웹 UI 사용자로 등록할 관리자 화면이나 설정 파일이 있는가?

sudo 권한을 주는 것만으로 웹 UI 로그인이 해결되지는 않습니다.

## 배포 선택지

### 권장: 혼합형

```text
서버: Next.js Dashboard, API, Supabase 연동
Windows PC: CH2CH Runner와 브라우저 자동화
```

이 방식은 CH2CH 로그인과 브라우저 화면을 직접 확인하기 쉽습니다. 서버가 꺼져도 Runner를 별도로 관리할 수 있습니다.

### 완전 서버형

```text
서버: Dashboard + Runner + Chromium 자동화
```

이 방식은 24시간 자동화가 가능하지만 Linux에서 Chromium, Playwright, Xvfb 또는 headless 설정, CH2CH 로그인 세션, systemd 자동 재시작을 모두 구성해야 합니다.

현재 레거시 Runner의 기본값은 브라우저 표시 모드입니다. Linux 서버에서 그대로 실행하면 화면이 없어 실패할 수 있으므로, 서버형으로 결정할 때 `HEADLESS`, Xvfb, 로그인 세션 유지 방식을 먼저 검증합니다.

## 예상 설치 절차

서버 OS와 관리자 승인이 확인된 후에 진행합니다.

```bash
sudo apt update
sudo apt install -y git curl nginx xvfb
```

Node.js 20 LTS 이상을 설치한 뒤:

```bash
sudo mkdir -p /opt/ch2ch-attendance-dashboard
sudo chown -R "$USER":"$USER" /opt/ch2ch-attendance-dashboard
git clone https://github.com/prayer0420/ch2ch-attendance-dashboard.git /opt/ch2ch-attendance-dashboard
cd /opt/ch2ch-attendance-dashboard
git switch codex/accounting-worship-journal
npm install
npx playwright install chromium
```

`.env.local`은 서버에서 직접 만들고 GitHub에는 올리지 않습니다.

```bash
chmod 600 .env.local
```

그 다음 Dashboard와 Runner를 systemd 서비스로 등록하고, Nginx에서 HTTPS 도메인으로 연결합니다. 서비스 파일과 Nginx 설정은 서버 OS와 실제 도메인이 확인된 뒤 작성합니다.

## 서버 배포 전 금지사항

- root 비밀번호를 GitHub나 채팅에 기록하지 않습니다.
- SSH 개인키를 저장소에 올리지 않습니다.
- `.env.local`을 커밋하지 않습니다.
- 실제 출석 명단을 서버 테스트 파일로 남기지 않습니다.
- 서버형 자동화를 바로 실제 저장 모드로 실행하지 않습니다.

## 다음 작업자가 먼저 할 일

1. 서버 OS 확인: Ubuntu/Debian인지, CentOS/RHEL인지
2. `sudo -l` 결과 확인
3. 웹 UI 인증 방식 확인
4. 서버에서 Chromium을 GUI 또는 headless로 실행할 수 있는지 확인
5. Dashboard만 배포할지 Runner까지 배포할지 결정
6. 결정 후 systemd와 Nginx 설정 작성
