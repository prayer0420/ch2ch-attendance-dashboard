# QEMU Oracle Linux 10 작업 인수인계 문서

이 문서는 다른 노트북의 Codex에서 이 프로젝트의 Oracle Linux 10 VM 구축 작업을 이어가기 위한 기준 문서다.

## 다른 Codex에 붙여 넣을 시작 프롬프트

```text
이 프로젝트의 QEMU Oracle Linux 10 VM 구축 작업을 이어서 진행해 줘.

반드시 먼저 이 문서와 프로젝트 루트의 `AGENTS.md`를 읽고, 아래 규칙을 지켜라.

- 명령어는 한 번에 하나만 안내한다.
- 내가 직접 입력하고 배우는 방식으로 설명한다.
- 명령어를 주기 전에 목적을 설명한다.
- 명령어의 각 부분을 설명한다.
- 실행 후 정상 결과와 비정상 결과를 설명한다.
- 내가 실제 실행 결과를 보여주기 전에는 다음 단계로 넘어가지 않는다.
- 오류가 나면 여러 설정을 동시에 바꾸지 말고 원인부터 확인한다.
- 삭제, 재설치, 재부팅, 보안 설정 변경 전에는 영향과 복구 방법을 설명한다.
- 기존 VM, 네트워크, 파일을 임의로 삭제하거나 수정하지 않는다.
- 비밀번호를 만들거나 출력하지 않는다.
- WHPX, NAT, TCG, CPU 모델 같은 용어는 처음 나올 때 설명한다.
- 답변마다 전체 진행 현황을 표시한다.
- 진행 현황은 대단계와 소단계, 두 단계 깊이로만 표시한다.

현재 상태는 문서의 `현재 상태`와 `다음 재개 지점`을 기준으로 판단해라.
```

## 전체 목표

Windows 11 Home 로컬 PC에서 QEMU로 Oracle Linux 10 서버를 실행한다.

### 목표 사양

- 호스트: Windows 11 Home
- 호스트 CPU: Intel Core Ultra 7 155H
- 호스트 RAM: 32GB
- 게스트 OS: Oracle Linux 10
- 게스트 CPU: 4 vCPU
- 게스트 RAM: 8GB
- 게스트 디스크: 50GB qcow2
- 네트워크: QEMU user-mode NAT
- 포트 전달: Windows `127.0.0.1:2222` → VM `22/tcp`
- 접속 도구: Windows SSH, PuTTY, WinSCP
- 최종 목적: DB, Redis, ELK, ZooKeeper, Solr, Logstash 등 프로젝트 서비스 연결

## 진행 계획

### 1단계 / Windows 및 QEMU 준비

- 1-1 Windows 가상화 상태 확인
- 1-2 Windows Hypervisor Platform 상태 확인
- 1-3 QEMU 설치
- 1-4 QEMU 및 qemu-img 버전 확인

### 2단계 / QEMU VM 기본 구성

- 2-1 VM 작업 폴더 생성
- 2-2 50GB qcow2 디스크 생성
- 2-3 QEMU CPU 모델 확인
- 2-4 설치용 VM 실행

### 3단계 / Oracle Linux 설치

- 3-1 Oracle Linux 설치 화면 진입
- 3-2 CPU 기능 및 커널 오류 확인
- 3-3 설치 대상 디스크와 사용자 설정
- 3-4 설치 완료 후 첫 부팅 및 로그인

### 4단계 / 네트워크 및 SSH

- 4-1 게스트 네트워크 인터페이스와 IP 확인
- 4-2 QEMU NAT 포트 전달 확인
- 4-3 게스트 sshd 설치 및 활성화
- 4-4 Windows SSH와 PuTTY 접속 확인

### 5단계 / 프로젝트 서비스 연결

- 5-1 프로젝트 파일을 VM으로 전송
- 5-2 DB, Redis, Solr, ZooKeeper 연결 주소 구성
- 5-3 Elasticsearch 및 Logstash 구성
- 5-4 프로젝트별 Master, CMS, Gateway, Engine, Chat UI, Scheduler 설정

### 6단계 / 검증 및 재사용

- 6-1 서비스 프로세스, 포트, 로그 확인
- 6-2 서비스 간 연결 확인
- 6-3 로그인, 학습, 배포, 시뮬레이터 테스트
- 6-4 종료, 재시작, 재사용 가능한 `.bat` 작성

## 현재 상태

### 1단계 / Windows 및 QEMU 준비

- `HypervisorPresent`: `True`
- `HypervisorPlatform`: `Enabled`
- QEMU 설치 방식: `winget`
- QEMU 버전: `11.1.0`
- QEMU 실행 파일:
  `C:\Program Files\qemu\qemu-system-x86_64.exe`
- qemu-img 실행 파일:
  `C:\Program Files\qemu\qemu-img.exe`

### 2단계 / QEMU VM 기본 구성

- VM 폴더:
  `C:\Users\c\QEMU VMs\meritz-ol10-01`
- 디스크:
  `C:\Users\c\QEMU VMs\meritz-ol10-01\meritz-ol10-01.qcow2`
- 디스크 형식: `qcow2`
- 가상 크기: `50 GiB`
- 디스크 검사 결과: `corrupt: false`
- 확인된 CPU 모델: `Broadwell-v4`

### 3단계 / Oracle Linux 설치

- ISO:
  `C:\Users\c\Downloads\OracleLinux-R10-U0-x86_64-dvd.iso`
- ISO SHA256:
  `E5C0A6CCF46298D2960FA46A2E6212790D45EDF9D8A2C292CD14569A278477FB`
- 설치 종류: `Minimal Install`
- 사용자: `test1`
- root 계정: 비활성화
- 설치 완료: 예
- 첫 부팅 및 로그인: 성공

### 4단계 / 네트워크 및 SSH

- 현재 소단계: `4-1 게스트 네트워크 인터페이스와 IP 확인` 시작 전
- 아직 게스트에서 `ip addr` 결과를 확인하지 않음
- SSH 설치 및 Windows 포트포워딩 확인은 아직 완료하지 않음

## WHPX와 TCG 상태

### WHPX

WHPX는 Windows Hypervisor Platform의 약자다. Windows의 하이퍼바이저 기능을 QEMU가 이용해 CPU 가상화를 빠르게 실행하는 방식이다.

WHPX로 `Broadwell-v4`를 사용했을 때 다음 문제가 발생했다.

```text
warning: host doesn't support requested feature: CPUID[eax=06h].EAX.arat [bit 2]
Kernel panic - not syncing: Attempted to kill init!
```

### TCG

TCG는 Tiny Code Generator의 약자다. 게스트 CPU 명령을 소프트웨어로 변환해 실행하므로 WHPX보다 느리지만, 현재 Oracle Linux 10 설치와 부팅에는 성공했다.

현재 정상 작동을 확인한 TCG 일반 부팅 명령은 다음과 같다.

```powershell
& "C:\Program Files\qemu\qemu-system-x86_64.exe" -accel tcg -machine q35 -cpu Broadwell-v4 -smp 4 -m 8G -drive file="C:\Users\c\QEMU VMs\meritz-ol10-01\meritz-ol10-01.qcow2",format=qcow2 -boot order=c -nic user,model=e1000,hostfwd=tcp:127.0.0.1:2222-:22
```

TCG 부팅 후 로그인 프롬프트에서 `test1`로 로그인했고 다음 형태의 셸 프롬프트가 확인됐다.

```text
[test1@localhost ~]$
```

다음 경고는 치명적인 오류가 아니었다.

```text
block dm-0: the capability attribute has been deprecated
```

## WHPX 재시험 계획

WHPX 성공을 보장하지 않는다. 대신 현재 정상 작동하는 TCG 원본 디스크를 보존하고, 별도 복사본에서만 시험한다.

### 6단계 / WHPX 안전 시험 절차

- TCG VM을 완전히 종료한다.
- 원본 qcow2를 삭제하지 않고 WHPX 시험용 qcow2를 별도로 만든다.
- 시험 복사본에는 먼저 `-accel whpx -cpu x86-64-v3`를 적용한다.
- 부팅 성공 여부를 확인한다.
- 게스트에서 `lscpu`로 AVX2와 x86-64-v3 관련 기능을 확인한다.
- 커널 패닉이 발생하면 즉시 시험을 중단한다.
- 원본 TCG 디스크는 계속 보존한다.

WHPX가 정상 동작한다는 판단 기준은 다음 세 가지를 모두 만족하는 것이다.

- Oracle Linux가 정상 부팅된다.
- `lscpu`에서 필요한 CPU 기능이 보인다.
- 로그인 후 서비스 실행에 문제가 없다.

## 다음 재개 지점

다른 작업을 하지 말고 먼저 현재 TCG VM에서 다음 명령 하나만 실행한다.

```bash
ip addr
```

목적은 QEMU user-mode NAT가 게스트에 어떤 네트워크 인터페이스와 IP를 제공했는지 확인하는 것이다.

정상적으로는 `enp0s2` 같은 인터페이스와 `10.0.2.x/24` 주소가 보일 가능성이 높다. 단, 실제 결과를 확인하기 전에는 주소를 확정하지 않는다.

그 결과를 확인한 뒤에만 다음 소단계인 QEMU NAT와 `127.0.0.1:2222 → 게스트:22` 연결을 진행한다.

## 자주 사용하는 주소와 포트

### Windows 측

- SSH 접속 주소: `127.0.0.1`
- SSH 접속 포트: `2222`
- PuTTY 설정: Host Name `127.0.0.1`, Port `2222`, Connection type `SSH`

### Oracle Linux 게스트 측

- SSH 서비스 포트: `22/tcp`
- 게스트 내부 주소: `ip addr` 결과를 확인한 뒤 확정
- QEMU user-mode NAT 게이트웨이: 일반적으로 `10.0.2.2`이지만 실제 환경에서 확인

## 프로젝트 파일과 보안 주의

- 프로젝트를 공유할 때 `.env`, 개인키, 토큰, 비밀번호, 고객 데이터, 운영 DB 접속정보는 업로드하지 않는다.
- 먼저 설정 파일에서 비밀값을 제거한 예시 파일만 공유한다.
- Plus/개인 계정에서 모델 학습 사용 여부는 ChatGPT 설정의 Data Controls에서 확인한다.
- 민감한 프로젝트는 학습 사용을 끄고, 가능하면 Temporary Chat 또는 조직용 환경을 검토한다.
- VM의 qcow2, ISO 같은 큰 바이너리는 Git에 넣지 않는다.
- 이 Markdown 문서와 `AGENTS.md`는 OneDrive 또는 Git으로 동기화해 다른 노트북에서 사용한다.

## 다른 노트북에서 이어가는 방법

같은 계정이어도 Codex 작업 목록, 로컬 프로젝트 경로, 현재 터미널 상태, 첨부 이미지가 다른 노트북에 자동으로 동일하게 나타난다는 보장은 없다. 따라서 대화 자체보다 이 문서를 기준으로 이어가는 방식이 안전하다.

- 이 프로젝트 폴더를 OneDrive로 동기화하거나 Git 저장소에 커밋한다.
- 새 노트북에서 이 프로젝트 폴더를 연다.
- `AGENTS.md`와 이 문서를 먼저 읽는다.
- 위의 `다른 Codex에 붙여 넣을 시작 프롬프트`를 새 대화에 붙여 넣는다.
- 현재 실행 중인 QEMU VM은 노트북 간에 자동으로 이동하지 않으므로, 새 노트북에서 VM을 실행하려면 qcow2 파일을 별도로 복사해야 한다.
- 같은 VM 디스크를 두 노트북에서 동시에 실행하지 않는다.

## 변경 기록

- QEMU 11.1.0 설치 확인
- 50GB qcow2 생성 및 무결성 확인
- Oracle Linux 10 Minimal Install 완료
- TCG로 Oracle Linux 부팅 및 `test1` 로그인 성공
- WHPX + Broadwell-v4에서는 커널 패닉 발생
- SSH 구성은 아직 진행 전
