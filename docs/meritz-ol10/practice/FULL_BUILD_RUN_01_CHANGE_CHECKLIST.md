# 빈 OL10 전체구축 1회차 변경·검증 체크리스트

이 문서는 1회차에서 실제로 확인하고 수정한 지점을 2회차에 그대로 재사용하기 위한 작업표다. 순서는 항상 `현재값 확인 → 원본/요구값 비교 → 백업 → 직접 수정 → 재기동 → runtime 검증`이다.

## 환경 구분

| 환경 | APP | DB | 원칙 |
|---|---|---|---|
| 로컬 QEMU | `192.168.50.10` | `192.168.50.20` | 한 APP VM에 middleware를 여러 포트로 축소 구성 |
| 고객사 개발계 | 현장 확인 | 현장 확인 | 로컬 IP를 복사하지 말고 실제 배치·주소·포트를 먼저 확인 |
| 10월 운영계 | APP 3대 예정 | DB 2대 예정 | VIP·LB·HA·replication 구조를 별도 확인 |

실습 profile은 `tc`다. 고객사에서는 시작 명령·환경변수·systemd에서 active profile을 다시 확인한다.

## 1. OS·Java·빌드

- [x] Corretto Java 8u504, Maven 3.9.9 설치
- [x] `~/.mavenrc`에서 Corretto 8 `JAVA_HOME` 고정
- [x] Maven 멀티모듈 전체 `BUILD SUCCESS`
- [ ] 고객사: 실제 artifact, 시작 스크립트, 실행 Java, active profile 확인

## 2. MariaDB

| 항목 | 확인·수정 위치 | 1회차 결과 |
|---|---|---|
| port | `/etc/my.cnf.d/meritz.cnf` | `13306` |
| listener | runtime | `0.0.0.0:13306`, `[::]:13306` |
| SELinux | port label | `13306/tcp`를 `mysqld_port_t`로 등록 |
| 방화벽 | public rich rule | APP `192.168.50.10/32`만 허용 |
| DB | `meritz_easycms` | table 129개, 대표 데이터 확인 |
| 계정·권한 | MariaDB user/grant | APP IP에서 schema 접근 허용 |

검증 위치: `select @@port,@@bind_address`, `ss -lntp`, `semanage port -l`, `firewall-cmd --list-rich-rules`, information_schema. 비밀번호는 출력·기록하지 않는다.

시행착오: `13306` 변경 후 기동 실패 원인은 SELinux Enforcing의 `name_bind` 거부였다. SELinux를 끄지 않고 포트 label을 추가해 해결했다.

## 3. Redis 5.0.8

| 항목 | 위치·값 |
|---|---|
| binary/config | `/application/redis/bin`, `/application/redis/conf/{7000,7001,7002}.conf` |
| data/log | `/application/redis/db/{7000,7001,7002}`, `/logs/redis/{7000,7001,7002}.log` |
| client/bus port | `7000/7001/7002`, `17000/17001/17002` |
| topology | 실습용 3 master, replica 0 |

- [x] `cluster_state:ok`, 16,384 slots 전체 할당, 다른 node를 통한 시험 key 조회
- [ ] 자동기동 방식은 전체 stack 기능시험 후 정리
- [ ] 고객사: 실행계정·config/data/log/PID·AOF/RDB·master/replica 배치 조사

## 4. ZooKeeper 3.6.1

| node | 실제 config | client | peer/election |
|---|---|---:|---:|
| zk1 | `conf-zk1/zoo.cfg` | 2181 | 2888/3888 |
| zk2 | `conf-zk2/zoo.cfg` | 2182 | 2889/3889 |
| zk3 | `conf-zk3/zoo.cfg` | 2183 | 2890/3890 |

- [x] `myid`, data, datalog, PID, log 모두 node별 분리
- [x] `zk1=follower`, `zk2=leader`, `zk3=follower`

시행착오: 원본 `zookeeper-env.sh`의 공통 PID 때문에 zk2·zk3가 `already running`으로 오판했다. 또 편집 파일과 실제 `--config` 파일이 달랐다. `Using config:`와 실제 파일, `ZOOPIDFILE`, `ZOO_LOG_DIR`를 함께 확인한다.

## 5. Solr 7.6.0 / SolrCloud

| node | 설정 | HTTP | log |
|---|---|---:|---|
| solr1 | `/application/solr/solr1/bin/solr.in.sh` | 8983 | `/logs/solr/solr1` |
| solr2 | `/application/solr/solr2/bin/solr.in.sh` | 8984 | `/logs/solr/solr2` |
| solr3 | `/application/solr/solr3/bin/solr.in.sh` | 8985 | `/logs/solr/solr3` |

공통 ZK는 `192.168.50.10:2181,2182,2183/solr`이고 Java는 OL10의 실제 Corretto 8 경로다.

- [x] `liveNodes=3`, collection 6개, alias 2개
- [x] 문서 수: `TC_CALLBOT_A=20`, `B=20`, `LOG=0`, `TEST=0`, `tc_01_A=9`, `tc_01_B=1`
- [x] alias: `TC_CALLBOT→TC_CALLBOT_A`, `tc_01→tc_01_A`

현재 `SOLR_DATA_HOME=/application/solr/solr/data`는 1회차 복구 결과를 유지한 실습값이다. 고객사에서 같은 host의 native 3-node라면 data/PID/log 분리 여부를 반드시 확인한다.

시행착오: solr1 ZK 주소 일부에 DB IP `.20`을 잘못 입력했다. 세 파일 전체 비교가 필요하다. `admin`으로 시작하면서 현재 디렉터리가 `/home/test1/meritz`이면 Jetty `start.ini` 접근 오류가 발생했으므로 실제 Solr server 디렉터리에서 실행한다.

## 6. Elasticsearch 7.8.0

| node | config | data/log/tmp | HTTP/transport |
|---|---|---|---|
| es1 | `/application/elk/config-es1` | es1 전용 | 9200/9300 |
| es2 | `/application/elk/config-es2` | es2 전용 | 9201/9301 |
| es3 | `/application/elk/config-es3` | es3 전용 | 9202/9302 |

- [x] cluster `trusted-context-es`, node 3, green, unassigned 0
- [x] snapshot repository `/data/solr_backup/elasticsearch`, system index 6개 restore
- [x] 실습 heap node당 512M

시행착오: `jvm.options` 외에 `jvm.options.d/99-managed-heap.options`의 2G가 추가 적용됐다. 두 위치와 `/proc/<PID>/cmdline`의 실제 heap을 모두 확인한다. 고객사에는 로컬 512M를 복사하지 않는다.

## 7. Logstash 7.8.0

- [x] `/application/elk/logstash`, 실행계정 `admin`, Java 8, heap 512M
- [x] API `127.0.0.1:9600` green
- [x] 시험 file input → Elasticsearch index 1건 적재·검색
- [ ] 고객사: 실제 pipeline·로그 경로·index·codec/filter·ES 인증/TLS 확인

Kibana는 고객사 개발계에서 설치됐으나 미기동이라는 확인을 우선하며 승인 전 임의 기동하지 않는다.

## 8. 애플리케이션 `tc` 설정 변경표

### common — `/home/test1/meritz/common/src/main/resources/application-core-tc.yml`

- [x] Redis hosts → `.10:7000/.10:7001/.10:7002`
- [x] Solr `url`, `urls`, `createNodeSetNode1~3` → `.10:8983/8984/8985`
- [x] ZK node endpoints → `.10:2181/2182/2183`
- [x] CMS 직접 ZooKeeper 접속값의 chroot를 `.10:2181,.10:2182,.10:2183/solr`로 수정하고 CMS 재빌드·재배포

중요 시행착오 — ZooKeeper chroot 누락:

- Solr 노드의 `ZK_HOST`는 ensemble 뒤에 `/solr`가 붙어 있고 실제 configset은 `/solr/configs/chat-base-config`에 존재한다.
- `application-core-tc.yml`의 `zk.hosts`에는 `/solr`가 빠져 있어 CMS 로그의 `connectString`도 chroot 없이 표시됐다.
- 학습은 `GENERATING_DIALOG`과 collection alias 확인까지 진행됐지만, `/configs/chat-base-config/lang/*.txt`에 사전을 쓰는 단계에서 `writeDictionary msg=null`, `upload result: 9999`가 반복됐다.
- 진단은 `zkCli.sh -server <zk>/solr ls /configs/chat-base-config/lang`과 chroot 없는 동일 조회를 비교한다. 전자에 사전 파일이 있고 후자가 `Node does not exist`이면 원인이 확정된다.
- 수정 후에는 `common`만 편집하고 끝내지 않는다. `common` 리소스를 포함하는 CMS JAR을 `mvn -pl cms -am package -DskipTests`로 다시 만들고 배포·재기동한 뒤, 실행 로그의 `connectString` 끝 `/solr`와 사전 upload 성공을 확인한다.
- 월요일에는 Solr의 chroot, 애플리케이션의 직접 ZK client 주소, configset 실제 znode 위치를 하나의 세트로 먼저 비교한다.

### cms — `/home/test1/meritz/cms/src/main/resources/application-tc.yml`

- [x] Redis, JDBC `.20:13306/meritz_easycms`, DB username
- [x] ES host1/2/3 `.10`, 공통 port 9200
- [x] Scheduler URL `.10:8580/scheduler`
- [x] Master URL `.10:8380`
- [x] Engine URL 3개를 실습용 `.10:8180`으로 변경하여 `engine1/2/3` 이름 해석 실패 해결
- [x] Chat-UI resource/simulator URL은 Windows가 해석 가능한 `chat-ui:8480`으로 변경 대상 확정

### master — `/home/test1/meritz/master/src/main/resources/application-tc.yml`

- [x] Redis, JDBC, DB username, ES 대표 endpoint
- [x] Chat-UI `.10:8480`, Scheduler `.10:8580`, Master `.10:8380` 내부 URL 변경·검증
- [x] Engine URL 3개를 실습용 `.10:8180`으로 변경

### gateway — `/home/test1/meritz/gateway/src/main/resources/application-tc.yml`

- [x] ES URL과 host1/2/3 → `.10:9200` 대표 endpoint
- [x] Engine 내부 URL 두 곳 → `.10:8180`

### scheduler — `/home/test1/meritz/scheduler/src/main/resources/application-tc.yml`

- [x] Redis, JDBC `.20:13306`, DB username, ES 대표 endpoint
- [x] Master 내부 URL → `.10:8380`

### engine·chat-ui

- [x] Engine의 CMS URL → `.10:8280`
- [x] Chat-UI의 client URL → `.10:8480`
- [x] Chat-UI Gateway domain `gateway:8081` → `.10:8081/gateway`; `UnknownHostException: gateway` 해결

아직 일부러 건드리지 않는 값: KT API, LDAP, Kakao/Facebook, 사내 외부 연계 주소, 의미를 코드에서 확인하지 않은 `clustername/server`, 비밀번호·인증키·개인키.

## 9. 적용·최종 판정

- [x] 모든 `tc` 내부 연결값 전수 확인 후 Maven build 1회 (`BUILD SUCCESS`)
- [x] CMS·Master JAR의 source와 `BOOT-INF/classes` 설정 반영 확인
- [ ] DB → Redis → ZK → Solr → ES → Logstash → 내부 APP → CMS/Chat-UI 순 기동
- [ ] CMS 로그인·조회·등록·수정·업로드·검색
- [ ] DB 반영, Redis session, Solr 검색, ES/Logstash 로그
- [ ] Scheduler 한 인스턴스, 재부팅 후 자동기동·기능 재검증
- [x] CMS 학습: ZK dictionary upload `0`, Engine 학습 완료
- [x] Chat-UI Gateway 주소 수정 후 세션 기능 정상화

### Master 기동 결과

- [x] 실습 배치: `/application/master/master.jar`, 실행계정 `admin`
- [x] 실습 전용 heap: `Xms128m/Xmx384m`; 고객사에 그대로 적용 금지
- [x] active profile `tc,core-tc`, Undertow `8380`, `Started MasterApplication`
- [x] DB 인증 오류 해결 후 JPA 초기화 성공

시행착오: 처음 만든 DB 계정 비밀번호와 JAR의 설정값이 달라 `1045 Access denied`가 발생했다. 여러 줄을 한꺼번에 붙여넣은 `read` 명령이 다음 줄을 비밀번호로 소비했고, `-p` 뒤에 비밀번호를 입력해 prompt 문자열 및 Bash history expansion으로 처리되는 입력 실수도 있었다. 비밀값은 한 줄짜리 `read -r -s DBPASS` 실행 후 별도로 입력한다. 고객사에서는 승인 없이 DB 비밀번호를 변경하지 않는다.

주의: Master 최초 정상 기동 중 Hibernate가 다수의 `alter table ... add constraint`를 실행했다. 이는 단순 조회 기동이 아니라 DB schema 변경이 발생할 수 있음을 뜻한다. 월요일에는 `ddl-auto` 실효값, DB backup, 변경 승인부터 확인한 뒤 애플리케이션을 기동한다.

### CMS 로그인·멀티테넌트 DB 시행착오

- [x] CMS `8280` 기동과 로그인 화면 표시
- [x] `tbl_manage_schema.prefix_url`을 target DB `192.168.50.20:13306/meritz_easycms`로 변경
- [x] CMS 로그인 성공

주의사항:

- CMS 기본 datasource YAML만 바꾸면 충분하지 않다. 로그인 시 별도 멀티테넌트 datasource가 `tbl_manage_schema`의 `prefix_url`, `user_name`, `password`를 사용한다.
- 원본 테이블 값 `jdbc:mariadb://mariadb:3306/meritz_easycms`가 남아 있을 때 `UnknownHostException: mariadb`와 `User reading Error`가 발생했다.
- `tbl_manage_schema.password`는 평문이 아니라 `EncryptionService.decrypt()` 대상 암호문이다. 평문으로 덮어쓰면 JDBC 로그가 `using password: NO`가 되므로, 원본 dump의 암호문을 임시 schema에서 복구하고 URL만 target 값으로 유지한다.
- YAML이 DOS/CRLF이면 단순 `sha256sum` 비교에 `\r`이 포함될 수 있다. 비밀값 비교 시 `tr -d '\r'`을 거쳐야 한다.

### Windows 웹 진입과 이름 해석

- 원본 Xen의 `192.168.1.101 cms chat-ui`는 HAProxy/LB 80번 진입점이며 `Host` 헤더로 CMS `8280`, Chat-UI `8480`을 구분한다.
- 현재 QEMU는 Windows가 `192.168.50.10` 사설 socket망에 직접 접근하지 못하고 HAProxy도 없다. Windows hosts는 `127.0.0.1 cms chat-ui meritz.easycms`를 사용한다. APP에서는 `/etc/hosts` 별칭을 추가하지 않고 활성 YML의 내부 연결 주소를 실제 IP로 변경했다.
- QEMU에서는 SSH local forwarding으로 `8280`과 `8480`을 각각 전달하고 포트를 붙여 접속한다. `ping` 성공은 이름 해석만 의미하며 TCP tunnel과 HTTP 정상 여부는 별도 확인한다.
- Chat-UI의 `/client/default/chat.html`과 `/client/STANDBY/simulator.html`은 APP 내부에서 HTTP 200을 확인했다. 화면의 “서비스 이용 불가”는 접속 실패가 아니라 `channelCache is null`과 Gateway session 생성 실패다.
- 최종 원인은 Chat-UI YML의 `domain: http://gateway:8081/gateway`였다. `/etc/hosts`를 사용하지 않는 실습 원칙에 따라 `.10:8081/gateway`로 수정·재빌드·재배포하여 해결했다.

### 재부팅·재기동 시행착오

- APP QEMU의 socket `127.0.0.1:12345`가 먼저 listen한 뒤 DB QEMU가 connect해야 `192.168.50.10 ↔ .20` 통신이 된다.
- 양쪽 `enp0s3`가 `UP`이어도 socket peer가 없으면 `Destination Host Unreachable`가 발생한다. APP은 유지하고 DB만 정상 종료·재실행해 해결했다.
- QEMU 창을 닫아 VM 전체가 종료됐고, systemd 미등록 서비스는 모두 수동 재기동이 필요했다. 데이터 restore나 cluster create는 다시 하지 않았다.
- `start requested`는 성공이 아니다. 기존 process와 PID file이 어긋나 Master 새 프로세스가 `Port 8380 was already in use`로 실패했다. 실제 listen PID를 확인한 후 교체한다.
- stale SSH tunnel은 Windows port만 listen하고 HTTP 전달은 하지 못할 수 있다. `curl.exe --noproxy "*"`의 HTTP code까지 확인한다.
- Windows `curl.exe`, `NUL`, PowerShell backtick을 Linux 프롬프트에서 실행하지 않는다.

## 10. 2회차·월요일 선확인

1. hostname/IP/역할/OS/메모리
2. 실행 사용자·명령·실제 config/profile
3. binary/config/data/log/PID와 소유자
4. listen port·firewall·SELinux
5. DB/Redis/ZK/Solr/ES topology·버전
6. 활성 profile의 내부 연결 주소
7. backup/snapshot 시각·checksum·rollback

사진은 핵심 설정과 오류 전후 로그를 2~3장으로 나누고 비밀번호·토큰·인증키·개인키를 가린다.
