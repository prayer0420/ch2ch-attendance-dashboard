# 2026-09-14 고객사 개발계 현장 시작 가이드

## 목적

고객사 개발계에서 바로 변경하지 않고, 실제 topology·버전·미러링 범위·배포방식을 먼저 확정한 뒤 로컬 실습 결과와 비교한다.

## 현장 첫 원칙

- 고객사 hostname/IP를 로컬 QEMU 값으로 추측하지 않는다.
- `aivbsvr1v`, `aivbdb1v`가 실제 이름인지 현장에서 다시 확인한다.
- “미러링 완료”의 대상과 마지막 동기화 시각을 확인한다.
- source와 target을 명확히 표시하기 전에는 설치·재시작·파일 교체를 하지 않는다.
- 비밀번호·토큰·개인키·고객 데이터를 Codex나 문서에 붙이지 않는다.
- 조회 결과부터 수집하고 변경은 승인된 작업계획에 따라 한 번에 하나씩 한다.
- 로컬의 `C:\Users\c\Downloads`, `127.0.0.1:2222`, QEMU용 tar/SCP 절차를 고객사 명령으로 사용하지 않는다.
- 고객사의 승인된 CI/CD·빌드서버·artifact repository·SFTP 중계·보안 반입·미러링 방식 중 실제 전달 경로를 확인한다.
- 고객사 target에서 소스를 임의로 빌드하기 전에 현재 배포가 source build인지 승인 artifact 배포인지 확인한다.
- 실제 작업자는 각 제품의 원본 설정 파일 위치로 직접 이동해 현재 값을 눈으로 확인하고 필요한 줄만 수정한다. 고객사 원본에 없는 helper script, 자동 생성 파일, 임의 systemd unit을 편의를 위해 먼저 만들지 않는다.
- 긴 설정 파일을 새로 타이핑하거나 통째로 붙여넣지 않는다. 승인된 원본 설정 파일을 복사·미러링하고 신규 hostname/IP/port/path/profile처럼 실제로 달라지는 값만 직접 수정한다.

## 모든 제품에 적용할 직접 수정 절차

DB·Redis·ZooKeeper·Solr·Elasticsearch·Logstash·애플리케이션 설정은 아래 순서를 공통으로 적용한다.

1. 실행 중인 process와 시작 명령에서 **실제로 읽는 설정 파일 경로**를 찾는다.
2. 해당 디렉터리로 직접 이동해 원본 파일과 권한·소유자를 확인한다.
3. 현재 runtime 값과 파일 설정값을 비교한다.
4. 원본 파일을 날짜가 포함된 이름으로 보존한다. 비밀값이 든 파일은 권한을 유지하고 외부 문서에 내용을 복사하지 않는다.
5. `vi`로 필요한 줄만 직접 변경한다.
6. 저장 후 `grep`, `cat`, 제품 조회 명령으로 변경된 줄을 확인한다.
7. 재시작 전에 **실제 실행 경로의 파일**에 변경이 반영됐는지 다시 확인한다.
8. 한 서비스를 재시작하고 상태·listener·로그를 확인한 뒤 다음 서비스로 진행한다.

실습에서 확인된 중요 사례:

- MariaDB: `/etc/my.cnf.d/meritz.cnf`에서 port를 직접 확인·변경하고 runtime listener와 비교.
- Redis: 원본 `/application/redis/conf/7000.conf`, `7001.conf`를 기준으로 instance별 경로와 port를 직접 수정.
- ZooKeeper: staging의 `zoo1.cfg~zoo3.cfg`뿐 아니라 실제 `zkServer.sh --config`가 읽는 `conf-zk1~conf-zk3/zoo.cfg`와 `zookeeper-env.sh`를 직접 확인.
- Solr: 복사한 원본 `bin/solr.in.sh`에서 `JAVA_HOME`, PID, home, log, host, port, `ZK_HOST`만 직접 수정.
- 애플리케이션: 활성 profile의 원본 `application-*.yml`을 직접 수정하고 build 후 JAR의 `BOOT-INF/classes` 반영값까지 확인.

Solr 미러링 직후에는 원본 `solr.in.sh`의 `JAVA_HOME`이 기존 OS 전용 경로일 수 있다. `java -version`만 확인하지 말고 설정 파일에 고정된 경로와 target의 실제 Java 경로를 비교한다. 경로가 없으면 Solr는 `refers to a location where Java could not be found`로 중단된다. target에서 실제 존재하는 승인 Java 8 경로로 해당 줄만 수정하고 `bin/solr version`으로 먼저 검증한다.

같은 host에 여러 Solr process를 구성할 때는 node별 `SOLR_PID_DIR`, `SOLR_HOME`, `SOLR_LOGS_DIR`, `SOLR_PORT`를 분리한다. `SOLR_HOST`가 같은 IP여도 port가 다르면 SolrCloud node는 구분된다. 원본에 별도 `DATA_HOME`이 없으면 임의로 추가하지 않고 각 core의 index data가 node별 `SOLR_HOME/<core>/data` 아래에 생성되는 원본 방식을 유지한다.

### 애플리케이션의 Solr 연관 설정은 한 묶음으로 전수 확인

`zk.hosts` 하나만 바꾸고 끝내지 않는다. 활성 profile의 Solr 설정 블록 전체와 기존 hostname 참조를 검색한다.

```bash
grep -nE 'solr|zk:|hosts:|url:|urls:|createNodeSetNode' 실제-application-core-profile.yml
grep -RniE 'solr1|solr2|solr3|zk1|zk2|zk3|createNodeSetNode' 실제-활성설정-directory --include='*.yml' --include='*.yaml' --include='*.properties'
```

반드시 비교·수정할 항목:

- `solr.url`: 기본 요청 대상 Solr node
- `solr.urls`: 전체 Solr node 목록
- `createNodeSetNode1~3`: collection/shard/replica 생성 시 사용할 **실제 live node ID**
- `zk.hosts`: SolrCloud metadata를 읽을 ZooKeeper ensemble
- collection/alias 이름과 `/solr` chroot

`createNodeSetNode`는 단순 조회에서는 사용되지 않아 CMS 화면이 일부 정상이어도 collection 생성·A/B 전환 시 뒤늦게 실패할 수 있다. 다음 명령으로 ZooKeeper에 등록된 live node ID를 먼저 확인하고 설정값과 정확히 맞춘다.

```bash
실제-solr-bin/solr zk ls /live_nodes -z 실제-ZooKeeper-ensemble/solr
```

수정 후에는 활성 설정 전체에서 옛 Solr/ZooKeeper hostname·IP·port가 남았는지 다시 검색한다. 의도적으로 남긴 값은 이유를 기록하고, 의미를 모르는 중복 key는 임의 삭제하지 않는다.

## 현장 도착 후 확보할 답

| 질문 | 확인 결과 |
|---|---|
| 실제 개발계 APP/DB hostname과 IP는? | 미확정 |
| APP 1대·DB 1대가 맞는가? 별도 검색/캐시 서버가 있는가? | 미확정 |
| Oracle Linux 정확한 release/kernel은? | 미확정 |
| 미러링은 VM, disk, DB replication, 파일 중 무엇인가? | 미확정 |
| 마지막 full/incremental sync 시각은? | 미확정 |
| 실제 Java 공급사·patch는? | 미확정 |
| 실제 배포는 Maven JAR인가 Gradle WAR/JBoss인가? | 미확정 |
| MariaDB 실제 patch와 target 계획 버전은? | 미확정 |
| Redis/Solr/ZK/ES/Logstash 정확한 버전과 배치는? | 미확정 |
| 활성 Spring profile과 외부 설정 우선순위는? | 미확정 |
| 정상 botCode와 CMS 테스트 계정은? | 미확정 |
| 작업 승인자·rollback 결정자·허용시간은? | 미확정 |

## 변경 전 서버 기본 증적

다음은 조회 명령이다. 고객사 정책과 권한 범위 안에서 APP와 DB 각각 수집한다.

```bash
hostname
cat /etc/os-release
uname -r
ip -br addr
ip route
free -h
df -hT
getenforce
systemctl is-active firewalld
```

애플리케이션/DB process와 port:

```bash
ps -ef | grep -E '[j]ava|[m]ariadbd|[r]edis|[s]olr|[e]lasticsearch|[l]ogstash'
sudo ss -lntp
```

실제 Java와 배포방식:

```bash
java -version
readlink -f "$(command -v java)"
systemctl list-unit-files | grep -Ei 'cms|master|engine|gateway|chat|scheduler|maria|redis|solr|zoo|elastic|logstash'
```

정상 결과는 특정 값이 아니라 **기존 문서·고객사 설계와 일치하는 값**이다. 예상 밖 hostname/IP/version/port가 나오면 변경하지 말고 차이로 기록한다.

## 반드시 받아야 할 파일의 비밀값 제외본

- 실제 systemd unit과 시작/중지 스크립트
- `runtime.env`의 key 목록; 값 중 비밀은 마스킹
- 활성 `application*.yml/properties`의 주소·포트·profile 부분
- `my.cnf`의 비밀값 제외본
- Redis, ZooKeeper, Solr, Elasticsearch, Logstash 설정
- artifact 파일명·크기·SHA256
- MariaDB dump 정보, Solr backup/configset, ES snapshot 정보
- 인증서 파일명·subject·SAN·만료일; 개인키 내용 제외

## Redis 원본 구성 확인 — 대상 서버에 그대로 재현하기 위한 필수 사전점검

Redis의 `redis1`, `redis2`, `7000`, `7001` 같은 폴더 이름은 제품이 강제하는 규칙이 아니다. 그러나 기존 시작 스크립트, systemd unit, 백업·점검 스크립트가 그 경로를 참조할 수 있으므로 **원본을 확인하기 전에 대상 경로를 임의로 정하지 않는다.** 먼저 기존 개발계에서 아래 항목을 확인하고, 승인된 변경이 없다면 대상 OL10에 같은 구조로 재현한다.

### 1. 실행 방식과 실제 실행 계정 확인

```bash
ps -eo user,group,pid,ppid,args | grep '[r]edis-server'
systemctl list-units --all --type=service | grep -i redis
```

- 첫 명령은 Redis process의 실제 사용자·그룹, 실행 binary, 설정 파일 인자를 확인한다.
- 두 번째 명령은 systemd로 관리되는지와 실제 unit 이름을 찾는다.
- unit 이름이 확인된 경우에만 아래처럼 내용을 조회한다.

```bash
sudo systemctl cat 실제-unit이름
```

실행 사용자가 확인되면 계정 정보를 조회한다.

```bash
id 실제사용자
getent passwd 실제사용자
```

확인할 값은 사용자·그룹 이름, 홈 디렉터리, shell, UID/GID다. 파일 소유권을 함께 이관할 때는 숫자 UID/GID 차이도 확인한다. 원본이 `admin`으로 실행되더라도 대상 계정에 wheel/sudo 권한까지 자동으로 부여하지 말고, Redis 실행과 파일 접근에 필요한 권한만 고객사 정책에 맞춘다.

### 2. binary·설정·데이터·로그 경로 확인

먼저 process 인자와 systemd unit에서 확인된 실제 경로를 기준으로 조회한다. 대표 설치 경로가 `/application/redis`인 경우 예시는 다음과 같다.

```bash
find /application/redis -maxdepth 3 -type f -name '*.conf' -print 2>/dev/null
grep -RniE '^(bind|protected-mode|port|daemonize|supervised|pidfile|logfile|dir|dbfilename|appendonly|appendfilename|save|cluster-enabled|cluster-config-file|cluster-node-timeout|cluster-announce)' /application/redis --include='*.conf' 2>/dev/null
```

설정에서 확인한 경로를 직접 대입하여 소유자와 권한도 확인한다.

```bash
ls -ld 실제-binary-directory 실제-config-directory 실제-data-directory 실제-log-directory
ls -lah 실제-config-directory
```

다음 값을 원본/대상 비교표에 기록한다.

| 구분 | 원본에서 확인할 값 | 대상 OL10 적용 원칙 |
|---|---|---|
| 실행 주체 | 사용자, 그룹, UID/GID | 동일 역할 계정과 필요한 소유권 재현 |
| 실행 방식 | systemd, 시작 스크립트, Docker/Compose, 수동 실행 | 원본 운영방식 우선 |
| binary | `redis-server`, `redis-cli` 실제 경로와 버전 | 승인된 동일 버전·경로 우선 |
| instance 설정 | 각 port가 읽는 `.conf` 경로 | unit/스크립트 인자와 일치 |
| data | `dir`, `dbfilename`, AOF 이름 | dump/AOF 복원 위치와 소유권 일치 |
| log/PID | `logfile`, `pidfile` | 디렉터리 생성·쓰기 권한 보장 |
| cluster | node config, announce IP/port, bus port | 신규 IP·실제 topology에 맞게 변경 |
| 자동기동 | unit의 `User`, `Group`, `ExecStart`, `Restart` | 재부팅 후 동일하게 기동되는지 검증 |

### 3. 원본 유형을 구분한다

- **native process 방식:** host의 `/application/redis`, `/logs/redis` 같은 실제 경로와 systemd/스크립트를 확인한다.
- **Docker/Compose 방식:** host 폴더 이름만 보고 판단하지 말고 Compose의 image version, container user, command, volume source/target, network alias를 확인한다.
- 서로 다른 시험환경의 구성을 섞지 않는다. 현재 확인된 `xen02.01.tc.kr`의 native Redis 5.0.8 구성과 `xen02-3`의 Docker Redis 7.2.9 구성은 별개다.

### 현재 실습에서 확인된 비교 기준

- 기존 native 환경: 실행 계정 `admin`, Redis `5.0.8`, 설정 `/application/redis/conf/7000.conf`·`7001.conf`, 데이터 `/application/redis/db/7000`·`7001`, 로그 `/logs/redis/7000.log`·`7001.log`.
- 로컬 QEMU 1회차: 실행 계정 `admin`, 설정 `/application/redis/conf/7000.conf`·`7001.conf`·`7002.conf`, 데이터 `/application/redis/db/7000`·`7001`·`7002`, 로그 `/logs/redis/7000.log`·`7001.log`·`7002.log`.
- 위 값은 월요일 고객사 값으로 단정하지 않는다. 고객사 원본을 조회한 뒤 실제 계정·경로·instance 수·master/replica 배치를 기준으로 대상 구성을 결정한다.

## ZooKeeper 배치와 포트 중복 여부 — 반드시 현장에서 확인

ZooKeeper가 3개라는 정보만으로 서버가 3대라고 단정하지 않는다. 실제 hostname, IP, process, container network를 확인해 아래 유형 중 무엇인지 먼저 판별한다.

```bash
hostname
ip -br addr
ps -eo user,pid,args | grep -Ei '[z]ookeeper|[q]uorumpeer'
sudo ss -lntp | grep -E ':218[1-9]|:28[0-9][0-9]|:38[0-9][0-9]'
```

실제 `zoo.cfg`와 `myid` 경로가 확인되면 다음 값을 조회한다.

```bash
grep -nE '^(clientPort|clientPortAddress|dataDir|dataLogDir|server\.)' 실제-zoo.cfg
cat 실제-myid
```

| 실제 배치 | 포트 원칙 | 예시 |
|---|---|---|
| 서로 다른 서버/IP에 native process 한 개씩 | 각 서버에서 같은 포트 사용 가능 | 모두 client `2181`, peer `2888`, election `3888` |
| 같은 서버/IP에 native process 3개 | 같은 network namespace이므로 각 process의 세 포트를 모두 다르게 배정 | client `2181/2182/2183`, peer `2888/2889/2890`, election `3888/3889/3890` |
| 같은 host의 container 3개 | container별 IP/network namespace가 다르면 내부 포트는 같을 수 있음 | container 내부는 모두 `2181/2888/3888`; host mapping과 service name은 별도 확인 |

`zk1`, `zk2`, `zk3`라는 이름만 보고 배치를 판단하지 않는다. 고객사에서 한 주소에 native ZooKeeper 3개가 실행된다면 포트가 겹치지 않도록 인스턴스별 client/peer/election 포트를 모두 분리해야 한다. 반대로 서로 다른 서버/IP라면 세 서버가 같은 포트를 사용해도 충돌하지 않는다.

같은 host에 여러 native ZooKeeper를 구성할 때는 `zoo.cfg`의 포트와 데이터 경로만 바꾸면 끝나는 것으로 판단하지 않는다. `zkServer.sh`가 함께 읽는 `zookeeper-env.sh`에서 PID와 로그 경로를 고정했는지도 반드시 확인한다.

```bash
grep -nE 'ZOOPIDFILE|ZOO_LOG_DIR|ZOO_LOG_FILE' \
  실제-ZooKeeper-conf-directory/zookeeper-env.sh \
  실제-ZooKeeper-bin-directory/zkEnv.sh \
  실제-ZooKeeper-bin-directory/zkServer.sh
```

- 같은 PID 파일을 여러 instance가 사용하면 첫 process 이후 나머지가 `already running as process ...`로 오판한다.
- 같은 로그 경로와 파일명을 사용하면 세 process의 로그가 섞이거나 rolling 과정에서 충돌할 수 있다.
- 같은 host의 native 3-instance 구성에서는 instance별 config directory, `dataDir`, `dataLogDir`, `clientPort`, peer/election port, `ZOOPIDFILE`, `ZOO_LOG_DIR`을 모두 분리한다.
- 서로 다른 서버에 한 instance씩 있는 원본이라면 공통 PID·로그 경로를 그대로 사용할 수 있다. 원본 배치가 다른데 불필요하게 변경하지 않는다.
- 설정을 staging 위치에서 수정한 뒤 instance별 실행 폴더로 복사하는 구조라면, 수정한 원본이 아니라 **실제 `zkServer.sh --config`가 읽는 `zoo.cfg`**를 다시 조회한다. 잘못된 복사본으로 기동하면 출력에는 올바른 설정 폴더가 표시돼도 내부 `clientPort`, `dataDir`, `server.*` 값은 옛 값일 수 있다.

### 현재 원본에서 확인된 ZooKeeper 기준

- 실행 계정: `admin`
- Java: `/usr/lib/jvm/jre-1.8.0-openjdk/bin/java`
- ZooKeeper: Solr 디렉터리에 포함된 `3.6.1`
- 설치 경로: `/application/solr/zk`
- 실행 class: `org.apache.zookeeper.server.quorum.QuorumPeerMain`
- 설정: `/application/solr/zk/conf/zoo.cfg`
- node ID: `/application/solr/zk/data/myid`
- 로그: `/logs/solr/zk`
- 위 결과는 현재 조회한 원본 한 서버의 값이다. 나머지 ZooKeeper node의 hostname/IP, `zoo.cfg`, `myid`를 조회해야 전체 3-node topology가 확정된다.
- 원본 `zookeeper-env.sh` 확인값: `ZOO_LOG_DIR=/logs/solr/zk`, `ZOOPIDFILE=/application/solr/zk/run/zookeeper.pid`. 이는 서버당 한 ZooKeeper인 원본에서는 정상이지만, 같은 host에 3개를 실행하는 QEMU에서는 instance별 분리가 필요하다.
- QEMU 성공 기준 실측: `zk1` client `2181` follower, `zk2` client `2182` leader, `zk3` client `2183` follower. 같은 host 3-instance quorum이 정상 구성됐다.

## 작업 Gate

| Gate | 통과 조건 | 미통과 시 |
|---|---|---|
| A 식별 | source/target/역할/승인자 확정 | 변경 중지 |
| B 복구 | snapshot/backup/checksum/rollback 확정 | 변경 중지 |
| C 런타임 | Java·배포방식·artifact 확정 | 설치안 재검토 |
| D 데이터 | DB/Redis/Solr/ES 이관방식과 일관성 시점 확정 | 쓰기 전환 금지 |
| E 연결 | DNS/IP/port/firewall/profile 확정 | 서비스 기동 보류 |
| F 기능 | 정상 테스트 데이터와 기대결과 확정 | 성공 판정 보류 |

## 고객사에서 문제가 생겼을 때 Codex에 보내는 형식

### 사진 2~3장으로 먼저 보낼 핵심 자료

1. 서버 식별: `hostname`, `ip -br addr`, 역할표
2. 실제 runtime: 서비스명·실행계정·버전·listen port·active profile
3. 관련 설정 블록과 같은 시각 오류 로그 30~100줄

전체 `ps -ef` Java 출력은 classpath가 너무 길다. PID를 찾은 뒤 `/proc/<PID>/cmdline`에서 필요한 heap·config·`-D...` 값만 골라 보낸다. YAML은 전체 파일이나 비밀값이 섞일 수 있는 넓은 검색 대신 대상 block만 `grep -nA... '^블록명:'`으로 조회한다.

Elasticsearch heap은 `jvm.options`와 `jvm.options.d/*.options`를 함께 조회하고 최종값은 실행 process로 확인한다. Solr를 다른 계정으로 수동 시작할 때는 그 계정이 읽을 수 있는 실제 Solr server 디렉터리에서 실행한다.

```text
환경: 고객사 개발계
대상: [hostname] [APP/DB] [서비스명]
현재 단계: 설치 / 기동 / 데이터복원 / 연결 / CMS 기능 / 재부팅
방금 실행한 것: [명령 또는 변경]
오류 전문: [비밀값 제거 후 원문]
현재 상태: [systemctl, ps, ss, curl 결과]
관련 로그: [같은 시각 30~100줄]
기존 개발계 정상 결과: [알고 있으면 함께]
```

Codex는 먼저 원인 범주를 `OS / 구성·연결 / 데이터·애플리케이션 / 미확정`으로 나누고, 변경 전에 조회 명령과 정상·비정상 기준을 안내해야 한다.

## 현장 완료 판정

- OL10과 보안 기능이 정상 상태
- 실제 artifact가 승인된 Java로 실행
- 신규 주소로만 DB·Redis·Solr·ES·내부 서비스 연결
- DB 조회·쓰기, Redis session, Solr 검색, ES/Logstash 로그 확인
- CMS 로그인·조회·등록·수정·업로드·검색
- 정상 botCode의 HTTP 200·정상 code·sessionKey·메시지
- Scheduler 단일 실행
- 재부팅 후 재현
- rollback 절차와 증적 보존
