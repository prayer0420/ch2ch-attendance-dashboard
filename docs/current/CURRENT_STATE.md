# 현재 작업 상태

## 기본 정보

- 프로젝트: 등촌 프로젝트
- 마지막 갱신일: 2026-09-12
- 현재 작업 트랙: 트랙 C — Windows QEMU Oracle Linux 10 로컬 연습
- 호스트 구조: Codex는 사용자 노트북에서 실행 중이며, QEMU는 Google Chrome Remote Desktop으로 접속한 회사 컴퓨터에서 실행 중
- QEMU Windows 호스트: 회사 컴퓨터의 Windows 계정 `c`
- SSH 명령 실행 위치: Google Chrome Remote Desktop 안의 회사 컴퓨터 PowerShell 또는 PuTTY
- `127.0.0.1:2222` 의미: 사용자 노트북이 아니라 회사 컴퓨터의 QEMU 포트 전달 주소
- 기준 문서: `AGENTS.md`, `extras/server-migration/CODEX_MASTER_HANDOFF.md`, `extras/qemu-oracle-linux/QEMU_ORACLE_LINUX_HANDOFF.md`

## 현재 진행 상황

- 전체 단계: 실습 2회차 진행 중 — JDK 8·Maven·소스 전송·최초 전체 build·JAR 생성 확인 완료, DB VM MariaDB 10.11.18 설치·기동 완료, 포트 변경 직전
- 4-1 게스트 네트워크 인터페이스와 IP 확인: 완료
- 4-2 QEMU NAT 포트 전달 확인: 완료
- 4-3 게스트 SSH 서비스 확인 및 활성화: 완료
- 4-4 Windows SSH 접속 확인: 완료
- WHPX 시험용 qcow2 복사본 생성: 완료
- WHPX 기본 시험 `-cpu max`: 실패 — `WHPX: Unexpected VP exit code 4`
- WHPX 우회 시험 `kernel-irqchip=off`: 부팅 및 SSH 로그인 성공
- 게스트 CPU·AVX2 확인: 완료
- WHPX 상태·서비스 안정성 확인: 완료 — `systemctl is-system-running` 결과 `running`
- 개발계 실습 토폴로지: APP VM 1대 + DB VM 1대
- APP VM 기본 구성: 완료 — 호스트명 `meritz-ol10-01`, PuTTY 포트 `2222`
- DB VM 복제·분리 구성: 완료 — 호스트명 `meritz-db01`, PuTTY 포트 `2223`
- APP↔DB 전용 내부망 구성: 완료 — 상호 `ping` 성공

## 확인된 사실

- Oracle Linux 10 Minimal Install 완료
- QEMU 11.1.0 사용
- TCG 방식으로 VM 부팅 및 `test1` 로그인 성공
- TCG 원본 디스크: `C:\Users\c\QEMU VMs\meritz-ol10-01\meritz-ol10-01.qcow2`
- WHPX 시험 복사본: `C:\Users\c\QEMU VMs\meritz-ol10-01\meritz-ol10-01-whpx.qcow2`
- 게스트 네트워크 인터페이스: `enp0s2`
- 게스트 IP: `10.0.2.15/24`
- QEMU user-mode NAT 네트워크 확인
- 목표 포트 전달: Windows `127.0.0.1:2222` → 게스트 `22/tcp`
- Windows 포트 확인: `Test-NetConnection 127.0.0.1 -Port 2222` 결과 `TcpTestSucceeded : True`
- 게스트 SSH 서비스: `sshd.service` — `Active: active (running)`
- 게스트 SSH 수신 주소: `0.0.0.0:22`, `[::]:22`
- SSH 설정: `enabled; preset: enabled`
- Windows SSH 접속 성공: `ssh -p 2222 test1@127.0.0.1`
- 접속 결과: `Last login: Fri Sep 11 21:19:36 2026` 표시
- Windows `known_hosts`에 `[127.0.0.1]:2222` ED25519 호스트 키 등록
- Google Chrome Remote Desktop `클립보드 동기화`는 활성화되어 있음
- 회사 컴퓨터의 다른 프로그램에서는 클립보드가 작동하지만 QEMU 창에서는 게스트로 전달되지 않음
- 판단: Google Chrome Remote Desktop 클립보드는 정상이나 Oracle Linux Minimal의 QEMU 텍스트 콘솔에서는 직접 붙여넣기가 계속 동작하지 않음
- 운영 방식: QEMU 콘솔 대신 회사 컴퓨터의 PuTTY SSH 세션을 주 터미널로 사용
- VM 안전 종료 완료: `The system will power off now!`, SSH 연결이 `Connection to 127.0.0.1 closed by remote host.`로 종료됨
- `x86-64-v3` CPU 모델: 현재 QEMU Windows 빌드에서 지원하지 않아 `unable to find CPU model 'x86-64-v3'` 발생
- `-accel whpx -cpu max -smp 4` 시험: `warning: Ignoring request for interrupt vector 0`, `WHPX: Unexpected VP exit code 4`로 실패
- 성공한 WHPX 우회 설정: `-accel whpx,kernel-irqchip=off -cpu max -smp 4`
- WHPX 게스트 `lscpu`: CPU 4개, 모델 `Intel(R) Core(TM) Ultra 7 155H`, Hypervisor vendor `Microsoft`, Virtualization type `full`
- CPU Flags 확인: `avx`, `avx2`, `fma`, `bmi1`, `bmi2`, `aes`, `xsave` 포함
- 판단: CPU 실행은 WHPX 하드웨어 가속이며, 오류가 발생한 Hyper-V APIC/인터럽트 칩 처리만 QEMU 쪽으로 우회
- SSH 세션에서 `hostname` 실행 결과: `localhost.localdomain`
- 붙여넣기 확인: Windows에서 붙인 `localhost`가 SSH 셸에 입력되었고, 셸이 이를 명령으로 실행함
- `-bash: localhost: command not found`는 붙여넣기 실패가 아니라 `localhost`가 실행할 명령이 아니어서 발생한 정상적인 오류
- APP VM 디스크: `C:\Users\c\QEMU VMs\meritz-ol10-01\meritz-ol10-01-whpx.qcow2`
- DB VM 디스크: `C:\Users\c\QEMU VMs\meritz-ol10-01\meritz-db01.qcow2`
- APP VM 실행 자원: WHPX, CPU 4개, 메모리 8GiB, SSH 전달 `127.0.0.1:2222 → 22`
- DB VM 실행 자원: WHPX, CPU 2개, 메모리 6GiB, SSH 전달 `127.0.0.1:2223 → 22`
- DB VM SSH 호스트 키 재생성 완료: ED25519 지문 `SHA256:eV2fRXK/HzrceUIMtV50TlIGutj8G3L3f2pbQsEM5y4`
- DB 복제 전 SSH 호스트 키 백업 위치: `/etc/ssh/hostkey-before-db-clone-20260911/`
- APP·DB 추가 내부망 인터페이스: `enp0s3`
- APP 내부망 IP: `192.168.50.10/24`, 연결 프로필 `app-private`
- DB 내부망 IP: `192.168.50.20/24`, 연결 프로필 `db-private`
- 내부망은 QEMU socket 방식이며 회사 컴퓨터의 `127.0.0.1:12345`를 통해 두 가상 NIC를 연결
- 내부망 QEMU MAC: APP `52:54:00:10:00:11`, DB `52:54:00:10:00:12`
- 내부망은 게이트웨이를 사용하지 않고 APP↔DB 통신에만 사용하며, 기존 `enp0s2` NAT NIC는 인터넷·PuTTY 접속용으로 유지
- APP에서 DB `192.168.50.20`, DB에서 APP `192.168.50.10`으로 상호 `ping` 성공
- Oracle Linux 실측: APP·DB 모두 Oracle Linux Server `10.0`, UEK8 커널 `6.12.0-100.28.2.el10uek.x86_64`
- APP glibc: `2.39`, 아키텍처 `x86_64`
- APP 가용 자원: 메모리 약 `7.3GiB`, 루트 파일시스템 여유 약 `42GiB`
- DB 가용 자원: 메모리 약 `5.3GiB`, 루트 파일시스템 여유 약 `42GiB`
- 활성 저장소: `ol10_UEKR8`, `ol10_appstream`, `ol10_baseos_latest`
- OL10 기본 저장소 확인: OpenJDK 21, Maven 3.9.9, Podman 5.8.2 설치 가능
- OL10 기본 저장소에서 `java-1.8.0-openjdk`는 조회되지 않음
- 프로젝트 요구 Java: `1.8`; Spring Boot `2.3.0.RELEASE` 공식 호환 범위는 Java 8~14이므로 Java 21 직접 실행은 사전 검증 없이 사용하지 않음
- OL10 기본 MariaDB 서버 패키지: `10.11.18`; 기존 환경 기록 `10.6.7`과 버전 차이가 있으므로 DB 호환성 시험 필요
- OL10 기본 저장소에서 `redis` 패키지는 조회되지 않음
- 현재 APP에는 Amazon Corretto 8과 Maven 3.9.9가 설치됐고 Java 21도 패키지 의존성으로 함께 보존 중이며, Podman은 설치하지 않음
- 현재 DB에는 MariaDB `10.11.18`이 설치·기동됐고 Redis는 설치하지 않음
- APP·DB SELinux: `Enforcing`; `firewalld`: `active`
- 내부망 프로필 `app-private`, `db-private`는 `AUTOCONNECT=yes`
- 복제 시 자동 생성된 미사용 프로필 `Wired connection 1`은 APP·DB 양쪽 모두 `AUTOCONNECT=no`로 변경 완료; `app-private`, `db-private`는 `AUTOCONNECT=yes` 유지
- 소스 사전점검 보고서: `docs/current/MERITZ_OL10_PREFLIGHT_RAW.md` — 5,168개 파일, 약 135MB
- 소스 구성: Java 파일 2,711개, Maven JAR 모듈 8개, CMS 프런트엔드 Vue/npm 패키지 포함
- 실제 메리츠 프로파일 DB는 MariaDB이며 대표 JDBC 주소는 `mariadb1:13306/meritz_easycms`; PostgreSQL 항목은 주석 또는 다른 배포판 흔적으로 확인
- 주요 외부 의존성: MariaDB, Redis, Solr, ZooKeeper, Elasticsearch, Logstash
- 하드코딩 경로: `/application`, `/logs`, `/data`, `${user.home}/script/solrBackup.sh`
- 서비스 실행용 완성 JAR/WAR는 소스 묶음에 없고 `libs/simplecaptcha-1.2.1.jar`만 포함되어 있어 새 환경에서 빌드하거나 기존 배포 산출물을 별도로 확보해야 함
- 상세 증적: `docs/current/MERITZ_OL10_PREFLIGHT_DETAIL.md`
- 최종 판정서: `docs/current/MERITZ_OL10_COMPATIBILITY_ASSESSMENT.md`
- 현장 실습·오류대응 종합 가이드: `docs/current/MERITZ_OL10_FIELD_PRACTICE_MASTER_GUIDE.md`
- 메리츠 OL10 전용 문서 허브: `docs/meritz-ol10/README.md`
- 로컬 실습 1회차 실제 기록: `docs/meritz-ol10/practice/PRACTICE_01_FOUNDATION_AND_PREFLIGHT.md`
- 로컬 실습 2회차 예정·결과 기록: `docs/meritz-ol10/practice/PRACTICE_02_BUILD_AND_DATABASE.md`
- 로컬 실습 3회차 예정·결과 기록: `docs/meritz-ol10/practice/PRACTICE_03_FULL_STACK_AND_CMS.md`
- 2026-09-14 고객사 시작 가이드: `docs/meritz-ol10/field/MONDAY_2026-09-14_FIELD_START.md`
- 고객사 장애 빠른 찾기: `docs/meritz-ol10/field/INCIDENT_QUICK_INDEX.md`
- 최종 판정: 조건부 진행 가능 — Java 8 별도 확보, 구버전 서비스 재현, MariaDB 10.6→10.11 시험, 외부 연계 차단 필요
- 현재 소스는 Maven 실행형 JAR 구조이며, 포함된 Gradle/WildFly WAR 문서 2개는 2026-09-12 사용자 확인으로 현재 메리츠에는 틀린 과거 매뉴얼로 확정; 해당 절차 사용 금지
- CMS Dockerfile `EXPOSE 8380`은 실제 CMS `8280`과 불일치
- Master Dockerfile `EXPOSE 8480`은 실제 Master `8380`과 불일치
- Maven Central 및 npm registry 접근 결과 HTTP `200`
- DB VM MariaDB 서비스: `systemctl is-active mariadb` 결과 `active`
- DB VM MariaDB 현재 runtime 값: `sudo mariadb -e "select @@port,@@bind_address;"` 결과 `@@port=3306`, `@@bind_address=NULL`
- DB VM MariaDB 실제 listener: `0.0.0.0:3306`, `[::]:3306`; 모든 IPv4·IPv6 인터페이스에서 수신 중
- DB 기본 설정 파일 `/etc/my.cnf.d/mariadb-server.cnf`의 `[mysqld]`에는 `datadir`, `socket`, `log-error`, `pid-file`만 있고 `port`, `bind-address`는 명시되지 않음
- APP `cms/src/main/resources/application-tc.yml`의 실제 요구값: `jdbc:mariadb://mariadb1:13306/meritz_easycms?characterEncoding=UTF-8&serverTimezone=UTC`
- 비교 판단: 수신 주소는 변경할 필요가 없고 MariaDB port만 `3306 → 13306`으로 변경해야 함. 패키지 기본 파일을 직접 수정하지 않고 `/etc/my.cnf.d/meritz.cnf` drop-in에 `[mysqld]`, `port=13306`을 기록할 예정
- 설치 전 clean baseline 백업 완료: `baseline-20260912-preinstall\meritz-app-baseline.qcow2`, `meritz-db-baseline.qcow2`; 원본 대비 SHA256 비교 결과 APP·DB 모두 `True`
- APP JDK: Amazon Corretto `1.8.0_504`, RPM SHA256 `df71903a9673dccdaf35c3ad0a644d4c7e5422b9a59ae309a284ad75325c41fe` 공식값 일치
- Maven: Red Hat Maven `3.9.9-3`; 설치 시 Java 21이 함께 설치돼 기본 Maven runtime이 21로 선택되는 시행착오 발생
- Java 선택 해결: Java 21은 삭제하지 않고 `java`/`javac` alternatives를 Corretto 8로 선택, `~/.mavenrc`에 `JAVA_HOME=/usr/lib/jvm/java-1.8.0-amazon-corretto` 기록
- 최종 `mvn -v`: Java `1.8.0_504`, vendor `Amazon.com Inc.`, runtime Corretto 8 JRE
- 소스 archive: 회사 Windows `C:\Users\c\Downloads\meritz-source-20260912.tar.gz`, 크기 `68,293,923` bytes, SHA256 `3A9598B651891E0487226664F5E94CD38483E9EFD7AF787CA13684ACEC47C543`
- APP 소스: `/home/test1/meritz`, 파일 `5,168`, 크기 `142M`; Windows/APP archive SHA256 일치
- OL10 최초 build 명령: `mvn clean package -DskipTests |& tee ~/build-01.log`
- 최초 build 결과: 수정 없이 `BUILD SUCCESS`, 총 `01:22 min`, 완료시각 `2026-09-12T12:05:47+09:00`
- reactor 결과: ktbot, common, persistence, cms, engine, gateway, chat-ui, scheduler, master 모두 `SUCCESS`
- 생성 JAR 8개: `chat-ui` 108M, `cms` 159M, `common` 584K, `engine` 99M, `gateway` 100M, `master` 137M, `persistence` 1.9M, `scheduler` 115M
- `common`, `persistence`는 공통 library JAR이고 나머지 큰 JAR들은 서비스 산출물로 판단. 사용자의 현장 중심 요청에 따라 manifest·개별 SHA256 추가 검사는 오류 발생 시 진단 항목으로 보류
- build warning: Master의 deprecated API와 unchecked/unsafe operation; 실패 원인은 아니며 향후 코드 개선 항목
- build 로그: APP `/home/test1/build-01.log`

## 2026-09-12 최신 진행 반영

- DB VM MariaDB `10.11.18`은 `/etc/my.cnf.d/meritz.cnf`의 `port=13306`으로 변경 완료했다.
- 최초 재시작 실패 원인은 SELinux Enforcing이 `13306/tcp`를 `mysqld_port_t`로 허용하지 않아 발생한 `name_bind` 거부였다. `semanage port`로 `13306/tcp`를 등록한 뒤 MariaDB가 `active`가 됐고 `0.0.0.0:13306`, `[::]:13306`에서 수신한다.
- DB firewalld에는 APP `192.168.50.10/32`에서 DB `13306/tcp`로 들어오는 연결만 허용하는 rich rule을 추가했다.
- 원본에서 확보한 logical dump `xen02-meritz.sql`을 DB VM으로 전송해 checksum 일치를 확인하고 복원했다. `meritz_easycms` schema의 table 수는 `129`, 표본 데이터 `tbl_intent=2`, `tbl_sentence=2`로 확인했다.
- DB에는 APP 전용 계정 `meritz_easycms`@`192.168.50.10`과 `meritz_easycms` schema 권한을 구성했다. 비밀번호와 password hash는 문서에 기록하지 않는다.
- CMS `application-tc.yml`의 JDBC 주소를 `192.168.50.20:13306/meritz_easycms`로 변경하고 CMS를 재빌드했다. 생성 JAR의 `BOOT-INF/classes/application-tc.yml`에도 변경값이 반영됐다.
- Redis 원본 native 기준은 Redis `5.0.8`, 실행 계정 `admin`, binary `/application/redis/bin`, 설정 `/application/redis/conf`, data `/application/redis/db/<port>`, log `/logs/redis/<port>.log`다. 별도 Docker 시험환경의 Redis `7.2.9`와 혼동하지 않는다.
- APP VM에서 Redis `5.0.8` source compile 및 `/application/redis/bin` 설치를 완료했다. 실행 계정 `admin`은 로컬에서 UID/GID `1001`로 생성했으며 wheel/sudo 권한은 부여하지 않았다.
- 로컬 Redis instance는 `192.168.50.10:7000`, `7001`, `7002`의 3 master로 구성했다. cluster bus는 `17000`, `17001`, `17002`이며 `cluster_state:ok`, 3 nodes, 16,384 slots 전체 할당을 확인했다.
- Redis test key `meritz:cluster:test`를 `7000`을 통해 저장하고 `7002`를 통해 `REDIS_OK`로 조회했다. key slot은 `3586`이다.
- Redis 설정 경로는 `/application/redis/conf/{7000,7001,7002}.conf`, data는 `/application/redis/db/{7000,7001,7002}`, log는 `/logs/redis/{7000,7001,7002}.log`다. 앞서 만든 `/data/redis`는 현재 설정에서 사용하지 않으며 삭제하지 않고 보류한다.
- CMS `application-tc.yml`의 session Redis nodes와 common `application-core-tc.yml`의 Redis hosts를 모두 `192.168.50.10:7000,192.168.50.10:7001,192.168.50.10:7002`로 변경했다.
- Redis process는 현재 수동 daemon 방식으로 기동했다. systemd unit 구성, 방화벽·SELinux 점검, 재부팅 자동기동 검증은 아직 남아 있다.
- 원본 Redis 자동기동 방식 조회 결과 systemd unit은 없고 `/application/redis/start.sh`, `stop.sh`, `restart.sh`, `status.sh`가 공통 `/application/redis/appctl.sh`로 동작을 전달한다. 원본 `appctl.sh`는 `admin` 계정과 `7000/7001` 두 instance를 관리하며 두 instance 모두 `ready=yes`였다. 로컬에서는 당장 복사하지 않고 전체 구성 후 자동기동 단계에서 재검토한다.
- 원본 ZooKeeper는 `/application/solr/zk`에 포함된 `3.6.1`이며 `admin` 계정과 Java 8로 실행 중이다. 설정은 `/application/solr/zk/conf/zoo.cfg`, node ID는 `/application/solr/zk/data/myid`, 로그는 `/logs/solr/zk`다.
- 로컬 QEMU에서는 ZooKeeper 3개를 APP VM 한 주소에 구성하기로 결정했다. native process 3개이므로 client `2181/2182/2183`, peer `2888/2889/2890`, election `3888/3889/3890`처럼 중복되지 않는 포트를 사용한다.
- 월요일에는 ZooKeeper 3개가 서로 다른 서버/IP인지, 같은 서버의 native process인지, 같은 host의 container인지 반드시 확인한다. 서로 다른 IP 또는 container network namespace라면 동일 내부 포트 사용이 가능하지만 같은 host의 native process는 포트 분리가 필수다.
- 원본 topology 확인: `zk1=192.168.1.101`, `zk2=192.168.1.102`, `zk3=192.168.1.103`; 각 서버 한 instance 구조여서 모두 client `2181`, peer `2888`, election `3888`을 사용한다. 현재 조회 서버는 `myid=1`, 역할 `follower`였다.
- 원본 Solr는 `7.6.0`, ZooKeeper는 `3.6.1`; 크기는 Solr 약 `197M`, ZooKeeper 약 `39M`이다.
- QEMU로 원본 ZooKeeper runtime을 archive해 전송했다. archive는 실행 중 변하는 `data/version-*`, `datalog/version-*`, 로그를 제외했고 SHA256 `3a0a394803521156e6c969e655b8f2412d750bafcf165b8dd9eedad6155ca220`이 source/Windows/QEMU에서 일치했다.
- QEMU ZooKeeper 3-instance 설정은 `zoo1.cfg`, `zoo2.cfg`, `zoo3.cfg`; data/datalog은 `zk1`, `zk2`, `zk3`로 분리했고 `myid`는 각각 `1`, `2`, `3`이다. server port는 `2888:3888`, `2889:3889`, `2890:3890`; client port는 `2181`, `2182`, `2183`이다.
- 시행착오: 원본 `zookeeper-env.sh`에 `ZOO_LOG_DIR=/logs/solr/zk`, `ZOOPIDFILE=/application/solr/zk/run/zookeeper.pid`가 고정돼 있는데 이를 처음에 놓쳤다. 결과적으로 첫 node PID를 두 번째·세 번째가 함께 읽어 `already running as process 9035`가 발생했다. 같은 host multi-instance에서는 zoo.cfg뿐 아니라 PID·로그 환경도 반드시 분리한다.
- 두 번째 시행착오: 수정한 `conf/zoo1.cfg~zoo3.cfg`가 실제 실행 폴더 `conf-zk1~conf-zk3/zoo.cfg`에 반영되지 않아 세 instance가 모두 원본의 `clientPort=2181`, 공통 data 경로와 `zk1:2888:3888` 구성을 읽었다. 실제 실행 경로를 `grep`으로 확인해 원인을 찾고 올바른 파일을 다시 복사했다.
- ZooKeeper 최종 성공: `conf-zk1`, `conf-zk2`, `conf-zk3`의 `zookeeper-env.sh`, `zoo.cfg`, PID/log/data/datalog 경로를 분리했다. PID는 각각 `9640`, `9679`, `9718`로 실행됐으며 `zk1:2181=follower`, `zk2:2182=leader`, `zk3:2183=follower`로 3-node quorum이 정상 구성됐다.
- 사용자 현장 작업 선호를 명확히 확정: 실제 설정 파일 경로로 직접 이동해 현재 값을 보고 `vi`로 필요한 줄만 수정한다. 긴 설정 전체 붙여넣기, 고객사 원본에 없는 편의용 systemd/helper 자동 생성, 실제 실행 파일 확인 없는 일괄 치환은 기본 안내에서 제외한다. 복사된 원본 설정을 수정한 뒤 실제 실행 경로와 runtime 반영을 확인하는 절차를 모든 제품에 적용한다.
- 원본 SolrCloud 확인: Solr `7.6.0`, source node별 port `8983`, `SOLR_HOME=/application/solr/solr/server/solr`, `ZK_HOST=zk1:2181,zk2:2181,zk3:2181/solr`, 전체 live node 3개·collection 6개다. 101은 `SOLR_HOST=solr1`, 103은 `SOLR_HOST=solr3`임을 각각 해당 서버에서 확인했다.
- QEMU로 Solr runtime archive를 전송했고 source/QEMU SHA256 `d6740cdcc78145d45c9b1a71c331d16e2917cd8dd0fcc39d356813fcb5a22acb`이 일치했다. PID, 실행 중인 index data, server logs는 archive에서 제외하고 원본 설정과 프로그램은 포함했다.
- Solr 첫 버전 확인은 복사된 `solr.in.sh`의 `JAVA_HOME=/usr/lib/jvm/jre-1.8.0-openjdk`가 QEMU에 없어 실패했다. Corretto 경로 입력 중 `correto` 오타도 한 차례 발생했으며 최종 `JAVA_HOME=/usr/lib/jvm/java-1.8.0-amazon-corretto`로 수정해 `bin/solr version` 결과 `7.6.0`을 확인했다.
- QEMU Solr는 `/application/solr/solr1`, `solr2`, `solr3`으로 분리했다. port는 `8983/8984/8985`, host는 모두 `192.168.50.10`, ZooKeeper는 `192.168.50.10:2181,2182,2183/solr`; PID/home/log 경로는 node별로 분리했다. `/etc/hosts` 별칭은 사용하지 않는다.
- 원본 core 등록 폴더는 실행 home에서 `/application/solr/core-registration-backup`으로 옮겨 보존했다. 실제 index data는 raw copy하지 않고 Backup/Restore로 이관한다.
- QEMU SolrCloud 최종 runtime 성공: PID `10399/10667/10834`, port `8983/8984/8985`, Solr `7.6.0`, ZooKeeper local 3-node ensemble 연결, `liveNodes=3`, `collections=0`. collection 0은 데이터 복원 전 정상 상태다.
- Solr Backup/Restore 완료: 원본의 6개 backup을 QEMU `/data/solr_backup`에 복원했다. collection은 `TC_CALLBOT_A=20`, `TC_CALLBOT_B=20`, `TC_CALLBOT_LOG=0`, `TC_CALLBOT_TEST=0`, `tc_01_A=9`, `tc_01_B=1`; alias는 `TC_CALLBOT→TC_CALLBOT_A`, `tc_01→tc_01_A`로 생성했다.
- 애플리케이션 Solr 연결 점검 중 `zk.hosts`만 먼저 변경 대상으로 안내하고 같은 블록의 `solr.url`, `solr.urls`, `createNodeSetNode1~3`를 처음에 놓친 실수가 있었다. QEMU 실제 live node ID는 `192.168.50.10:8983_solr`, `:8984_solr`, `:8985_solr`이므로 관련 값을 모두 변경해야 한다.
- 재발 방지: 서비스 주소를 변경할 때 대표 URL 한 줄만 보지 않고 활성 profile의 전체 설정 블록과 기존 hostname/IP 참조를 전수 검색한다. 특히 `createNodeSetNode`처럼 특정 기능에서만 사용되는 보조 주소도 실제 live node ID와 대조한다.
- 실습 전략은 1회차에서 빈 OL10에 전체 stack을 완성하고, 2회차에서 프로그램 디렉터리 미러링 후 최소 호환성 수정으로 기동하며, 3회차에서 월요일 현장 절차를 시간 측정해 반복하는 방식으로 확정했다.
- 원본 ELK runtime archive `/data/solr_backup/elk78_runtime.tar.gz`를 QEMU APP VM으로 전송했고 SHA256 `07055a8c0b61eed42ff08630e4b5f8939d41aca0e7f37d2a8592512940b37a0f`이 일치했다. archive에는 Elasticsearch `7.8.0`과 Kibana가 포함됐고 Logstash는 포함되지 않았다.
- QEMU Elasticsearch는 한 APP VM에서 프로그램 `/application/elk` 하나를 공유하고 설정만 `/application/elk/config-es1`, `config-es2`, `config-es3`으로 분리했다. node는 `es1/es2/es3`, HTTP는 `9200/9201/9202`, transport는 `9300/9301/9302`, data는 `/application/elk/data/es1~es3`, log는 `/logs/elk/es1~es3`이다.
- 세 ES node의 `network.publish_host`는 `192.168.50.10`, seed host는 동일 IP의 `9300/9301/9302`, 최초 bootstrap voter는 `es1/es2/es3`으로 설정했다. snapshot 허용 경로는 `/data/solr_backup/elasticsearch`다.
- APP VM 자원 보호를 위해 로컬 실습 ES heap은 node당 `-Xms512m/-Xmx512m`로 설정했다. 고객사에서는 이 값을 복사하지 않고 기존 개발계의 승인된 heap과 서버 자원을 확인한다.
- OL10 `vm.max_map_count` 원래 값은 `1048576`으로 Elasticsearch 최소 기준 `262144`보다 충분하다. 이미 큰 값을 낮출 필요가 없으며 최종 `1048576`으로 유지했다. `admin`의 nofile은 soft `1024`, hard `524288`이므로 현재 수동 기동에서는 ES process 시작 전에 soft limit를 `65536`으로 올렸다.
- Elasticsearch 3-node cluster 최초 기동 성공: cluster `trusted-context-es`, status `green`, `number_of_nodes=3`, `number_of_data_nodes=3`, master는 `es1`; 세 endpoint `9200/9201/9202` 모두 동일 cluster membership을 반환한다. 현재 shard/index가 0인 것은 snapshot restore 전 정상 상태다.
- 최초 cluster가 형성됐으므로 다음 단계에서 세 설정 파일의 `cluster.initial_master_nodes`를 제거해 재부팅 시 새 cluster로 잘못 bootstrap되는 위험을 막고, 원본 snapshot `meritz_20260910`을 반입·등록·restore한다.
- 사용자에게 가장 적합한 설명 수준을 재확정했다. 목적과 전체 진행 위치를 먼저 표시하고, 실제 경로에서 직접 확인·수정하는 명령, 각 옵션의 뜻, 정상 결과와 오류 시 확인 위치까지 제공하되 불필요한 산출물 검사는 생략한다.
- Elasticsearch snapshot repository `meritz_migration_repo`를 QEMU에 read-only로 등록했고 `meritz_20260910` snapshot을 `include_global_state=false`로 restore했다. 6 primary shard 모두 성공, cluster는 3 nodes/3 data nodes, active primary 6, active shard 12, unassigned 0, status green이다.
- 복원 인덱스는 `.apm-agent-configuration`, `.apm-custom-link`, `.kibana-event-log-7.8.0-000001`, `.kibana_1`, `.kibana_task_manager_1`, `ilm-history-2-000001`의 6개이며 실제 업무 로그 인덱스는 없다. 이번 snapshot은 절차 연습용이다.
- snapshot archive `meritz-es-snapshot-20260910.tar.gz`는 source/Windows/QEMU에서 SHA256 `06457ab9e13103e3589510fc1732a6b0aaffbbe1b77f4bcc1e2357c55fe2c017` 일치를 확인했다. `/home/test1` 접근권한 때문에 `sudo -u admin tar`가 `Permission denied`로 실패했고 root로 해제한 뒤 repository를 `admin:admin`으로 변경했다.
- 애플리케이션의 `logging-tc-config.xml` 확인 결과 `logstash`라는 이름의 appender는 네트워크 appender가 아니라 `RollingFileAppender`다. 주요 수집 후보는 `/logs/chat-ui/chat_ui.log`, `/logs/cms/lamp/cms_lamp.log`, `/logs/engine/{chat_engine,nlu_history,scenario_engine,api_engine}.log`, `/logs/gateway/chat_gateway.log`, `/logs/master/lamp/master_lamp.log`다.
- Java 코드의 Elasticsearch 접속은 `new HttpHost(host1, 공통port, scheme)` 형태로 host 3개가 port 하나를 공유한다. 고객사 3서버가 모두 9200이면 정상이나 QEMU 한 IP의 9200/9201/9202를 설정만으로 모두 표현할 수 없다. 1회차 APP 기능검증은 대표 endpoint `192.168.50.10:9200`을 사용하고, ES cluster 자체와 Logstash output은 세 endpoint를 모두 검증한다.
- Logstash `7.8.0` 공식 tar archive를 다운로드했고 gzip 검사와 공식 SHA512 `8b7c9015edfde0bed43a2668bf24d8523f785ea8f94b522e5d9dd886a677459f2c2c2e103b91b04f671287177e902e8f3fbf6747841f7984357a803405f9ed00` 일치를 확인했다. `/application/elk/logstash-7.8.0`으로 해제됐으며 archive UID/GID `631:503`을 로컬 `admin:admin`으로 정리할 예정이다.
- Gateway `application-tc.yml` 조회 출력에 RSA private key 값이 포함된 사실을 확인했다. 해당 값은 문서에 기록하지 않으며 실제 개발계 credential이면 담당자 승인 아래 교체 여부를 판단한다. 무단 변경 금지, 이후 출력 공유 시 secret 제외.
- 공식 Logstash `7.8.0` tar를 `/application/elk/logstash`에 설치하고 numeric archive owner `631:503`을 실행계정 `admin:admin`으로 변경했다. Corretto 8을 지정한 `logstash --version` 결과 `7.8.0`으로 OL10 실행 호환성을 확인했다.
- Logstash heap은 로컬 자원 보호를 위해 `-Xms512m/-Xmx512m`; `path.data=/application/elk/logstash/data`, `path.logs=/logs/elk/logstash`, 관리 API `127.0.0.1:9600`이다. 고객사에서는 기존 승인값을 먼저 확인한다.
- `meritz-practice` pipeline은 `/logs/elk/practice-input/meritz-test.log`를 file input으로 읽고 ES endpoint `192.168.50.10:9200/9201/9202`로 출력한다. pipeline syntax `Configuration OK`, Logstash status green, pipeline worker 1을 확인했다.
- 시험 로그 `MERITZ_OL10_LOGSTASH_OK`가 `meritz-logstash-practice-2026.09.12` index에 1건 적재됐고 ES 검색에서 `migration_lab=oracle-linux-10`, source path와 message를 확인했다. `@timestamp=2026-09-12T14:00:41.155Z`는 UTC이며 KST로 23:00:41이다.
- ELK 기반 검증 판정: Elasticsearch 7.8.0 3-node cluster, snapshot restore, Logstash 7.8.0 file input→ES output 모두 OL10에서 성공. Kibana는 고객사 개발계가 설치만 하고 미기동이라는 정보에 따라 로컬에서도 미기동 유지. 실제 CMS/Master/Engine/Gateway 로그 경로를 Logstash에 연결하는 작업은 애플리케이션 기동 단계에서 수행한다.

## 다음 작업

로컬 1회차 전체 stack과 핵심 기능시험이 완료됐다. CMS 로그인, ZK 사전 업로드, Solr 학습, Engine 반영, Chat-UI 세션 생성까지 성공했다. Scheduler의 `entityManagerFactory` bean 오류와 Engine fat JAR의 `js/common.js` 로딩 오류는 별도 후속 과제로 남긴다.

다음 재개 지점은 `docs/meritz-ol10/practice/FULL_BUILD_RUN_02_EXECUTION_PLAN.md`의 2회차 mirror-first 절차다. 시작 전에 실제 배치·IP·DNS·profile·실행계정·backup을 먼저 조사하고, YML 변경표를 채운 뒤 작업한다.

로컬 1차 ELK 시험은 Elasticsearch 7.8 계열과 소스의 High Level REST Client 7.8.0을 유지하여 OS 변경 영향부터 확인한다. 이는 7.8을 고객사 최종 장기운영 버전으로 승인한 것이 아니며, OL10 실행·지원 문제가 확인되면 Elastic 업그레이드를 별도 변경으로 분리한다.

문서상의 기존 회차 번호보다 실제 수행 전략을 우선한다. 현재 수행 중인 것은 빈 OL10에 전체 stack을 만드는 1회차이며, 이후 mirror-first 2회차와 시간 측정 3회차를 진행한다. 고객사 개발계에서는 로컬 IP와 hostname을 사용하지 않고 `docs/meritz-ol10/field/MONDAY_2026-09-14_FIELD_START.md`의 변경 전 식별·복구 Gate와 Redis 원본 구성 확인부터 수행한다.

## 기록 품질 규칙

- 지나친 한 줄 요약을 피하고, 다음 노트북에서 실제 작업을 재개할 수 있을 만큼 구체적으로 기록한다.
- 반드시 보존할 핵심 키워드: 트랙명, 단계 번호, 호스트명, VM명, OS, 명령어, 실행 위치, 파일 경로, IP, 포트, 인터페이스, 계정명, 서비스명, 상태값, 오류 문구, 정상 기준, 판단 근거, 다음 명령.
- 명령어는 축약하지 않고 코드 블록으로 기록한다.
- 실행 결과는 핵심 출력값을 원문에 가깝게 기록한다. 예: `TcpTestSucceeded : True`, `Active: active (running)`.
- 완료·실패·보류를 구분하고, 실패한 경우 원인과 아직 확정되지 않은 사항을 함께 기록한다.
- 길어지면 이전 내용을 삭제하지 말고 `CURRENT_STATE_YYYY-MM-DD_1.md`, `_2.md`로 보관한 뒤 `CURRENT_STATE.md`에는 현재 상태와 이전 기록 파일 목록을 남긴다.

## 작업 규칙

- 재시작·삭제·보안 변경처럼 결과 확인이 필요한 중요 변경은 한 번에 하나씩 안내한다.
- 서로 독립적인 조회 명령이나 APP·DB에 동일하게 적용하는 단순 작업은 2~4개씩 묶어서 안내한다.
- 명령 전에 목적과 각 부분을 설명한다.
- 사용자가 실행 결과를 보여준 뒤 다음 단계로 진행한다.
- 실제 현장 중심 안내는 변경 전에 반드시 `현재 runtime 값 확인 → 프로젝트 요구값 확인 → 차이와 변경 이유 설명 → 변경 → 적용 결과 확인` 순서로 진행한다. 설치 완료 여부나 산출물 내부 구조처럼 오류가 없을 때 불필요한 추가 검증은 생략하고, 장애 발생 시 진단 항목으로 사용한다.
- 매 명령 결과마다 이 파일을 수정하지 않는다. 사용자가 저장을 요청하거나 5~10개 정도의 의미 있는 대화가 누적됐을 때 최신 상태를 한 번에 갱신한다.
- 하루 단위의 세부 실행 기록은 `docs/logs/SESSION_LOG.md`에 기록한다.
- 기존 VM, 디스크, 네트워크, 파일을 임의로 삭제하거나 수정하지 않는다.
- 비밀번호, 토큰, 개인키, 고객사 비밀값을 요청하거나 출력하지 않는다.
- QEMU 트랙과 Xen 이관 트랙의 호스트명·IP·포트를 섞지 않는다.

## 2026-09-13 최신 진행

- 1회차의 실제 변경 경로·값·이유·검증·시행착오를 `docs/meritz-ol10/practice/FULL_BUILD_RUN_01_CHANGE_CHECKLIST.md`에 정리했다. 2회차에서는 이 문서를 실행 체크리스트로 사용한다.
- Scheduler `application-tc.yml`의 Redis nodes, JDBC URL, DB username을 CMS/Master와 동일한 실습 연결값으로 정렬했다.
- CMS `application-tc.yml`의 Scheduler URL을 `192.168.50.10:8580/scheduler`로 변경했다. CMS Master URL은 설정 블록을 좁게 다시 조회하는 단계다.
- 다음 변경 대상은 Master의 Chat-UI/Scheduler/Master 내부 URL, Gateway의 Engine URL, Scheduler의 Master URL이다. 외부 KT·LDAP·메시징 연계 주소는 일괄 변경하지 않는다.
- 조회 출력에 인증키가 노출됐으나 문서에는 값 자체를 보존하지 않았다. 이후에는 필요한 YAML block만 좁게 조회한다.
- APP 내부 연결 주소 변경 완료: CMS→Scheduler/Master/Chat-UI, Master→Chat-UI/Scheduler/Master, Gateway→Engine, Scheduler→Master, Engine→CMS, Chat-UI client URL을 모두 QEMU APP `192.168.50.10`의 실제 서비스 포트로 맞췄다.
- 다음 단계는 과거 hostname·localhost 잔여값 최종 검색 후 전체 Maven build다.
- 과거 내부 hostname·localhost 잔여 검색 결과 0건이며 전체 Maven build가 41.670초에 성공했다. CMS/Master JAR 내부 설정도 source와 일치한다.
- Master를 `/application/master/master.jar`에서 실습 전용 heap 128M/384M, profile `tc`로 실행했다. DB 비밀번호 불일치로 두 차례 `1045 Access denied`가 발생했으나 실습 DB 계정을 JAR 설정과 맞춘 뒤 정상 기동했다.
- Master 최종 결과: profile `tc,core-tc`, Undertow port `8380`, `Started MasterApplication in 32.134 seconds`.
- Master 기동 중 Hibernate가 다수의 FK constraint DDL을 실행했다. 고객사에서는 애플리케이션 기동 전에 `ddl-auto` 실효값과 DB backup·변경 승인을 확인해야 한다.
- CMS는 멀티테넌트 datasource의 `tbl_manage_schema.prefix_url`을 target DB로 수정하고 원본 암호화 password를 복구한 뒤 로그인에 성공했다. 기본 datasource YAML 외에 DB 저장 datasource 정보를 반드시 함께 점검한다.
- 중간 장애 당시 Chat-UI HTTP endpoint는 정상이었으나 `channelCache`와 Gateway session 생성 실패로 “서비스 이용 불가”가 표시됐다. 아래 최종 완료 절차로 해결됐다.
- 중간 장애 당시 CMS 학습은 ZooKeeper chroot 불일치로 dictionary upload `9999`가 발생했다. `/solr` 반영과 후속 Engine/Gateway 주소 수정을 거쳐 아래와 같이 최종 해결됐다.
- Scheduler는 `entityManagerFactory` bean 오류로 보류 중이며 마지막에 한 인스턴스만 기동한다.

## 2026-09-13 1회차 최종 완료

- `application-core-tc.yml`의 ZooKeeper ensemble 끝에 `/solr`를 추가하고 CMS를 재빌드·재배포했다. runtime 로그 `connectString=.../solr`, dictionary `upload result: 0`을 확인했다.
- 다음 학습 실패는 CMS/Master YML의 `engine1/2/3:8180`이 DNS에서 해석되지 않은 것이 원인이었다. `/etc/hosts`를 사용하지 않고 세 Engine URL을 로컬 APP `192.168.50.10:8180`으로 변경했다.
- 학습 재실행 후 Engine 로그에서 TC_CALLBOT STANDBY/TEST의 `Completed Learning Engine`을 확인했다.
- Chat-UI 세션 실패는 `domain: http://gateway:8081/gateway`의 `UnknownHostException: gateway`가 원인이었다. Chat-UI YML을 `http://192.168.50.10:8081/gateway`로 변경하고 재빌드·재배포하여 정상화했다.
- CMS가 브라우저에 `192.168.50.10:8480` simulator URL을 전달하면 Windows가 QEMU private IP에 접근하지 못한다. 브라우저 전달 URL은 `chat-ui:8480`, Windows hosts는 loopback, SSH tunnel은 8280/8480을 사용한다.
- 전체 QEMU 종료 후 재기동 과정에서 APP socket server를 먼저, DB socket client를 나중에 실행해야 private network가 연결됨을 재확인했다. 양쪽 NIC가 UP이어도 peer 미연결이면 통신되지 않는다.
- 기존 Master가 8380을 점유한 상태에서 PID file만 보고 새 프로세스를 실행해 port 충돌이 발생했다. 배포 재기동은 실제 listen PID와 `Started ...Application`을 모두 확인한다.
- 다음 재개 지점은 `docs/meritz-ol10/practice/FULL_BUILD_RUN_02_EXECUTION_PLAN.md`다.
