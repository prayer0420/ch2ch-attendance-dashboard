# 로컬 QEMU 사전실습 1회차 — OL10 기반·APP/DB·사전분석

## 회차 정의

- 일자: 2026-09-11~2026-09-12
- 환경: Google Chrome Remote Desktop으로 접속한 회사 Windows PC에서 QEMU 실행
- 목적: Oracle Linux 10 VM을 정상 부팅하고 APP/DB 2대 구조, SSH, 사설망, 복구 기준점을 만든 뒤 메리츠 소스의 OL10 위험을 설치 전에 찾는다.
- 상태: 완료
- 아직 포함하지 않은 범위: Java/Maven 설치, 소스 build, DB·미들웨어·CMS 설치

## 환경 위치 구분

- Codex: 사용자 노트북, Windows 계정 `ekzm8`
- QEMU와 PuTTY: 회사 컴퓨터, Windows 계정 `c`
- 회사 PC의 `127.0.0.1`: 사용자 노트북이 아니라 회사 PC loopback
- 소스: 회사 PC `C:\Users\c\Downloads\meritz-main\meritz`
- 동기화 문서: 회사 PC `C:\Users\c\OneDrive\문서\등촌프로젝트`
- QEMU 디스크: 회사 PC `C:\Users\c\QEMU VMs\meritz-ol10-01`

## 완료된 토폴로지

```text
회사 Windows PC
  ├─ 127.0.0.1:2222 → APP VM SSH 22
  ├─ 127.0.0.1:2223 → DB VM SSH 22
  └─ 127.0.0.1:12345 → QEMU socket 기반 APP↔DB 가상 랜선

APP meritz-ol10-01
  ├─ enp0s2: QEMU NAT, 인터넷/SSH
  └─ enp0s3: 192.168.50.10/24, app-private

DB meritz-db01
  ├─ enp0s2: QEMU NAT, 인터넷/SSH
  └─ enp0s3: 192.168.50.20/24, db-private
```

## QEMU와 WHPX 결과

- QEMU 11.1.0 확인
- Oracle Linux 10 Minimal Install 완료
- 최초 TCG 부팅 성공했으나 속도가 느림
- `-cpu x86-64-v3` 실패:

```text
unable to find CPU model 'x86-64-v3'
```

- `-accel whpx -cpu max` 기본 시험 실패:

```text
warning: Ignoring request for interrupt vector 0
WHPX: Unexpected VP exit code 4
```

- 다음 우회로 WHPX 부팅 성공:

```text
-accel whpx,kernel-irqchip=off -cpu max
```

- 의미: CPU 실행은 Microsoft WHPX 하드웨어 가속을 사용하고, 문제가 난 가상 interrupt chip 처리를 QEMU가 담당한다.
- 게스트 `lscpu`: 4 CPU, Intel Core Ultra 7 155H, hypervisor Microsoft, AVX/AVX2 확인
- `systemctl is-system-running`: `running`

## 현재 QEMU 실행 명령

APP를 먼저 실행한다. APP가 회사 PC의 `127.0.0.1:12345`에서 사설망 socket을 listen하기 때문이다.

```powershell
& "C:\Program Files\qemu\qemu-system-x86_64.exe" -display gtk,clipboard=on -accel whpx,kernel-irqchip=off -cpu max -machine q35 -smp 4 -m 8G -drive file="C:\Users\c\QEMU VMs\meritz-ol10-01\meritz-ol10-01-whpx.qcow2",format=qcow2 -boot order=c -nic user,model=e1000,hostfwd=tcp:127.0.0.1:2222-:22 -netdev socket,id=privnet,listen=127.0.0.1:12345 -device e1000,netdev=privnet,mac=52:54:00:10:00:11
```

DB는 APP 화면이 열린 뒤 두 번째 PowerShell에서 실행한다.

```powershell
& "C:\Program Files\qemu\qemu-system-x86_64.exe" -display gtk,clipboard=on -accel whpx,kernel-irqchip=off -cpu max -machine q35 -smp 2 -m 6G -drive file="C:\Users\c\QEMU VMs\meritz-ol10-01\meritz-db01.qcow2",format=qcow2 -boot order=c -nic user,model=e1000,hostfwd=tcp:127.0.0.1:2223-:22 -netdev socket,id=privnet,connect=127.0.0.1:12345 -device e1000,netdev=privnet,mac=52:54:00:10:00:12
```

## SSH와 클립보드 결과

- APP: PuTTY SSH `127.0.0.1:2222`, 사용자 `test1`
- DB: PuTTY SSH `127.0.0.1:2223`, 사용자 `test1`
- QEMU 텍스트 콘솔은 Google Remote Desktop 클립보드가 직접 전달되지 않아 주 터미널로 사용하지 않는다.
- PuTTY에서는 붙여넣기가 가능하다.
- PuTTY 붙여넣기 때 `^[[200~` 또는 끝의 `~`가 명령에 붙은 사례가 있었다. 오류가 나면 제어문자를 제거하고 명령을 직접 다시 입력한다.

대표 오류:

```text
-bash: $'\E[200~sudo': command not found
Error: argument 'show~' not understood
```

## DB VM 복제 후 분리 작업

- APP 디스크를 복제해 DB 디스크 `meritz-db01.qcow2` 생성
- DB hostname을 `meritz-db01`로 변경
- 복제된 SSH host key를 기존 백업 디렉터리로 이동한 뒤 `sudo ssh-keygen -A`로 재생성
- DB ED25519 fingerprint:

```text
SHA256:eV2fRXK/HzrceUIMtV50TlIGutj8G3L3f2pbQsEM5y4
```

- 처음에는 존재하지 않는 백업 디렉터리를 대상으로 `mv`하여 실패했다.
- 실제 생성·사용한 백업 디렉터리:

```text
/etc/ssh/hostkey-before-db-clone-20260911/
```

- 교훈: 복제 VM은 hostname뿐 아니라 SSH host key, IP, MAC, machine-id, 서비스 node ID를 각각 확인해야 한다.

## APP↔DB 사설망 결과

- APP: `192.168.50.10/24`
- DB: `192.168.50.20/24`
- 처음 `192.16.50.10`으로 오타를 입력해 ping 100% loss 발생
- 올바른 `192.168.50.10`으로 DB→APP ping 성공
- APP→DB도 성공
- 양쪽 자동 생성 프로필 `Wired connection 1`은 `AUTOCONNECT=no`
- `app-private`, `db-private`는 `AUTOCONNECT=yes`
- QEMU `12345`는 DB 서비스 포트가 아니라 두 가상 NIC를 연결하는 회사 PC 내부 socket이다.

## OS 실측

| 항목 | APP | DB |
|---|---|---|
| OS | Oracle Linux Server 10.0 | 동일 |
| 커널 | UEK8 6.12.0-100.28.2.el10uek.x86_64 | 동일 |
| 메모리 | 약 7.3GiB | 약 5.3GiB |
| 루트 여유 | 약 42GiB | 약 42GiB |
| SELinux | Enforcing | Enforcing |
| firewalld | active | active |
| 설치된 업무 패키지 | 아직 없음 | 아직 없음 |

활성 repository:

```text
ol10_UEKR8
ol10_appstream
ol10_baseos_latest
```

확인된 제공 패키지:

- Java 21, Maven 3.9.9, Podman 5.8.2
- MariaDB 10.11.18
- Java 8은 OL10 기본 저장소에서 확인되지 않음
- Redis는 기본 저장소 조회에서 확인되지 않음

## 설치 전 복구 기준점

두 VM을 정상 종료한 상태에서 생성했다.

```text
C:\Users\c\QEMU VMs\meritz-ol10-01\baseline-20260912-preinstall\meritz-app-baseline.qcow2
C:\Users\c\QEMU VMs\meritz-ol10-01\baseline-20260912-preinstall\meritz-db-baseline.qcow2
```

각 파일 크기:

```text
2,289,827,840 bytes
```

원본과 백업 `Get-FileHash` 비교:

```text
AppBackupVerified : True
DbBackupVerified  : True
```

백업 파일은 평상시 실행하거나 수정하지 않는다.

## 소스 사전분석 결과

- 약 5,168개 파일, Java 약 2,711개
- Maven 멀티모듈: common, persistence, cms, engine, gateway, chat-ui, scheduler, master
- Java 1.8, Spring Boot 2.3.0.RELEASE
- 현재 서비스 모듈 packaging은 JAR
- 완성된 업무 JAR/WAR는 없음
- `libs/simplecaptcha-1.2.1.jar` 포함
- MariaDB JDBC driver 2.7.5
- Elasticsearch High Level REST Client 7.8.0
- Vue 2.6.11, Webpack 3 기반 Chat UI
- 하드코딩 경로 `/application`, `/logs`, `/data`, `${user.home}/script/solrBackup.sh`
- Maven Central과 npm registry HTTP 200 확인

소스 내 과거 배포 문서:

```text
docs/99.ETC/aicc_chatbot_deploy_manual.md
docs/99.ETC/b2b_aicc_easycms_deploy_manual.md
```

위 문서는 CentOS 7.6·Gradle·WAR·JBoss/WildFly 절차다. 현재 Maven/JAR 소스와 다르므로 고객사의 실제 배포방식을 확인하기 전까지 그대로 사용하지 않는다.

## 현재 기술 결정

- Java: 승인된 JDK 8 별도 확보, Java 21 직접 실행 금지
- Maven: OL10 Maven 사용 가능하되 `mvn -v`가 JDK 8을 가리켜야 함
- MariaDB: 로컬은 10.11.18 우선 시험, 10.6 dump 호환성 검증
- Elasticsearch: 7.8 기준 기능과 snapshot을 보존하고 OS 전환과 major upgrade를 분리
- Elasticsearch 데이터: raw datadir 복사 금지, Snapshot/Restore
- Redis: 캐시라고 단정하지 않고 세션/업무상태 사용 여부 확인
- Solr/ZK: configset, collection, alias, shard/replica까지 확인
- 보안: SELinux와 firewalld를 끄지 않고 최소 정책으로 해결
- Scheduler: 마지막에 한 인스턴스만 기동

## 1회차에서 얻은 현장 교훈

- 출력값과 실행 명령을 구분한다. `hostname` 출력인 `localhost`를 다시 명령처럼 실행하면 command not found가 난다.
- IP 한 글자 오타도 timeout처럼 보인다. 변경 전에 목적지 주소를 다시 읽는다.
- VM 복제는 서버 수만 늘리는 것이 아니라 고유 identity를 분리하는 작업이다.
- ping 성공은 DB 연결 성공이 아니다. TCP, protocol login, 업무 기능을 따로 검증한다.
- “미러링 완료”는 범위를 확인하기 전까지 데이터·설정·서비스 완료를 뜻하지 않는다.
- 웹 화면 표시와 CMS 전체 기능 성공을 구분한다.

## 다음 회차 진입점

`PRACTICE_02_BUILD_AND_DATABASE.md`에서 JDK 8 공급 방식 확정부터 시작한다. 최초 build 실패를 수정 전에 원문으로 보존한다.
