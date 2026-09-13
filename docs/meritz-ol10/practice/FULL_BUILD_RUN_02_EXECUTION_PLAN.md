# Meritz OL10 2회차 실행계획·현장 체크리스트

이 문서는 1회차에서 실제로 성공한 절차와 실패 원인을 반영한 2회차용 작업표다. 목표는 명령을 많이 치는 것이 아니라, **실제 실행 설정을 먼저 조사하고 필요한 값만 수정한 뒤 의존성 순서대로 검증하는 것**이다.

## 현장 안내 원칙

- 이 문서는 **월요일 6시간 제한 현장의 실행 리허설**이다. 로컬에서만 편한 장황한 진단보다 현장에서 사람이 직접 입력하고 즉시 판정할 수 있는 명령을 사용한다.
- 정보가 충분히 제공된다고 가정하지 않고 read-only 사전점검으로 실제 상태를 확인한다.
- 한 번에 한 단계만 진행한다: `짧은 진단 1~2개 → 결과 판정 → 필요한 변경만 실행 → 즉시 검증`.
- 사진 2~3장 안에 핵심이 담기도록 명령과 출력을 줄인다. 긴 전체 설정 대신 활성값·버전·경로·포트만 추출한다.
- 현장에서 직접 타이핑할 수 있도록 짧은 명령을 우선한다. 반복이 꼭 필요할 때만 짧은 loop를 사용한다.
- 정상 확인은 가능하면 제품이 제공하는 통합 명령 하나로 끝낸다. 예: Redis는 `redis-cli --cluster check IP:PORT`로 접속·노드·슬롯·키를 함께 확인한다.
- 같은 사실을 `ss`, 개별 포트 반복, 개별 상태 API로 중복 확인하지 않는다. 통합 확인이 실패하거나 결과가 모호할 때만 세부 진단을 추가한다.
- 설정 파일과 YML은 작업자가 `vi`로 직접 수정한다. `sed -i` 같은 일괄 치환은 사용자가 명시적으로 요청한 경우에만 사용한다.
- 디렉터리 생성·파일 복사·기동·검증은 명령으로 처리하되, 긴 명령은 사람이 입력 가능한 한 줄 또는 짧은 블록으로 제공한다.
- 기본 답변은 `현재 판정 → 지금 입력할 명령 1~2개 → 정상 기준`만 제공한다. 설명은 왜 필요한지 한두 문장으로 제한하고, 장애가 발생했을 때만 진단 단계를 확장한다.
- 오류를 숨기기 위한 무분별한 `2>/dev/null`을 피한다. 실패 원인이 필요한 단계에서는 오류를 그대로 확인한다.
- `install`, `restore`, `restart`, 방화벽 변경 전에는 기존 설치·데이터·실행 여부와 담당 권한을 먼저 확인한다.
- 로컬 QEMU 전용 Windows 명령과 고객사 Linux 명령을 분리해 표시한다.
- 모든 작업 답변에는 `1회차 정상 기준 / 2회차 현재 단계 / 완료·진행·대기` 진행판을 짧게 표시한다.

## 2회차 진행판

| 단계 | 1회차 정상 기준 | 2회차 상태 |
|---|---|---|
| 1. 원본 inventory·backup | 전체 stack·기능 정상 | 완료 |
| 2. 대상 APP·DB 기반 | APP↔DB 통신 정상 | 완료 |
| 3. MariaDB | 10.11.18, 원본 13306, 업무 DB | 완료 — 대상 3306, 129 tables, APP→DB 연결 정상 |
| 4. Redis | 3 master, cluster `ok`, 노드당 5 keys | 완료 — 3 master, 15 keys, 16,384 slots, AOF 3개 |
| 5. ZooKeeper | 1 leader + 2 follower, `/solr` | 완료 — zk2 leader, zk1·zk3 follower |
| 6. SolrCloud | liveNodes 3, collections 6, aliases 2 | 완료 — collections 6, 문서 수 일치, aliases 2 |
| 7. Elasticsearch | nodes 3, green, unassigned 0 | 대기 |
| 8. Logstash | green, 테스트 1건 적재 | 대기 |
| 9. YML·build·JAR | `tc/core-tc`, BUILD SUCCESS | 대기 |
| 10. APP 기동 | Master·CMS·Engine·Gateway·Chat-UI | 대기 |
| 11. 기능시험 | 로그인·학습·Engine·Chat-UI 성공 | 대기 |
| 별도 | Scheduler `entityManagerFactory` 오류 | 완료 기준 제외 |

## 0. 이번 회차의 완료 기준

- [ ] MariaDB 연결 및 CMS 로그인
- [ ] Redis cluster `ok`
- [x] ZooKeeper 1 leader + 2 follower
- [ ] SolrCloud live node 3, collection 6, alias 2
- [ ] Elasticsearch node 3, cluster green
- [ ] Logstash 입력 1건이 Elasticsearch에 적재
- [ ] CMS 학습 `SUCCESS`
- [ ] Engine에 `Completed Learning Engine`
- [ ] Chat-UI 기본 채팅·STANDBY simulator 세션 생성
- [ ] 변경 전후 설정·로그·검증 결과 보관

Scheduler는 `entityManagerFactory` bean 오류를 별도 해결하기 전까지 완료 기준에서 제외한다.

---

## 1. 시작 전에 먼저 확정할 값

### 로컬 2회차 대상값

| 항목 | 확정값 |
|---|---|
| 대상 APP IP / Windows SSH | `192.168.60.10` / `2232` |
| 대상 DB IP / Windows SSH | `192.168.60.20` / `2233` |
| 대상 DB 서비스 포트 | `3306` (원본은 `13306`; 환경 차이 반영 실습) |
| 대상 QEMU private socket | `127.0.0.1:12346` |
| 대상 디스크 출발점 | `baseline-20260912-preinstall`의 APP·DB baseline |
| baseline 실제 크기 | APP `2.13GB`, DB `2.13GB` |
| 확인 당시 C 드라이브 여유 공간 | `746.8GB` |
| 디스크 생성 방식 | 공간이 충분하므로 독립적인 전체 복사본 사용 |

- [x] 대상 디렉터리 `C:\Users\c\QEMU VMs\meritz-ol10-run02` 생성
- [x] 대상 APP 디스크 `meritz-run02-app.qcow2` 생성 및 크기 `2.13GB` 확인
- [x] 대상 DB 디스크 `meritz-run02-db.qcow2` 생성 및 크기 `2.13GB` 확인
- [x] 대상 APP를 SSH `2232`, private socket `12346`으로 기동
- [x] 대상 DB를 SSH `2233`, private socket `12346`으로 기동
- [x] 대상 APP hostname을 `meritz-run02-app`으로 변경
- [x] 대상 APP `enp0s3`를 `192.168.60.10/24`, gateway 없음, `never-default=yes`로 변경
- [x] 대상 DB hostname을 `meritz-run02-db`로 변경
- [x] 대상 DB `enp0s3`를 `192.168.60.20/24`, gateway 없음, `never-default=yes`로 변경
- [x] 대상 APP↔DB `192.168.60.10/20` 양방향 통신 확인 (`ping` 2/2, loss 0%)

로컬 실습값을 월요일 서버에 그대로 복사하지 않는다. 아래 표를 먼저 채운다.

| 항목 | 로컬 QEMU 1회차 | 2회차/월요일 실제값 |
|---|---|---|
| active profile | `tc`, `core-tc` | |
| APP IP | `192.168.50.10` | |
| DB IP/port | `192.168.50.20:13306` | |
| Redis | APP 한 대의 `7000/7001/7002` | |
| ZooKeeper client | APP 한 대의 `2181/2182/2183` | |
| ZooKeeper chroot | `/solr` | |
| Solr HTTP | APP 한 대의 `8983/8984/8985` | |
| Elasticsearch HTTP | APP 한 대의 `9200/9201/9202` | |
| Engine | `192.168.50.10:8180` | |
| Gateway | `192.168.50.10:8081` | |
| CMS/Master/Chat-UI | `8280/8380/8480` | |
| 실행계정 | `admin` | |
| 웹 진입 | Windows SSH tunnel | HAProxy/LB/DNS 여부 확인 |

월요일에 가장 먼저 물어볼 것:

- [ ] “그대로 미러링”이 OS 디스크 복제인지, 프로그램 디렉터리 복사인지, 데이터까지 포함한 것인지
- [ ] APP 1대/DB 1대에서 실제로 몇 개 인스턴스를 띄울 것인지
- [ ] 고객사 DNS에 `engine1`, `gateway`, `solr1`, `zk1` 등이 등록돼 있는지
- [ ] `/etc/hosts` 사용이 허용되는지. 허용되지 않으면 YML/DB에 실제 IP 또는 DNS를 넣는다.
- [ ] 원본의 실행계정, 시작 스크립트/systemd, Java 경로, active profile
- [ ] DB dump, Solr backup, ES snapshot의 생성시각·버전·checksum
- [ ] 방화벽·SELinux·포트 정책과 변경 승인

### 개발계 Solr·Elasticsearch 원본 접속 사전점검

- Solr Admin과 Elasticsearch API가 외부에 직접 공개되지 않으면 SSH local port forwarding을 사용한다.
- 문서의 `xen01.trycatch.kr`은 2026-09-13 로컬 확인에서 DNS 이름 해석에 실패했다. `trycatch.iptime.org`는 이름 해석과 ping은 성공했지만 SSH `28122` 연결은 실패했다.
- 같은 내부망에서 Xen VM의 실제 주소가 `192.168.1.101/102/103`이라면 각 서버의 SSH 22번 연결을 먼저 확인한다. 정확한 접속 주소는 저장된 PuTTY 세션 또는 담당자 확인값을 사용하고 임의로 `hosts`에 등록하지 않는다.
- 터널 성공 판정은 로컬 포트 LISTEN만으로 하지 않는다. Solr는 `/solr/admin/info/system?wt=json`, Elasticsearch는 `/_cluster/health?pretty`의 실제 응답까지 확인한다.
- 이 항목은 2회차 이관 실습과 분리해 보관하며, 월요일에는 원본 정상 기준 확보 단계에서 수행한다.
- [ ] 애플리케이션 기동 시 Hibernate DDL 실행 가능 여부와 DB 변경 승인

---

## 2. 사진 2~3장으로 공유할 선확인 결과

### 로컬 2회차 원본 inventory 확인 결과

- [x] 원본 APP `meritz-ol10-01`, `192.168.50.10` 확인
- [x] 원본 DB `meritz-db01`, `192.168.50.20` 확인
- [x] 원본 MariaDB `10.11.18`, 서비스 `active` 확인
- [x] 기존 runtime 자료 확인: Redis 5.0.8, ZooKeeper 3.6.1, Solr 7.6.0, ELK 7.8.0, Logstash 7.8.0
- [x] 기존 Solr backup 및 ES snapshot archive 확인
- [x] 기존 DB dump `/home/test1/xen02-meritz.sql` 확인
- [ ] 최종 설정 변경시점 이후의 APP 설정·JAR와 최신 DB/Solr/ES/Redis 데이터를 새로 백업
- [x] 최종 배포 JAR 확인: Master, CMS, Engine, Gateway, Chat-UI, Scheduler
- [x] 원본 APP 파일시스템 여유 공간 `35GB` 확인
- [x] 원본 크기 확인: Redis `34MB`, Solr/ZK `828MB`, ELK/Logstash `3.1GB`, APP JAR 디렉터리 약 `718MB`, 소스 `971MB`
- [x] 동적 data·PID·log를 제외한 최종 `/application` 및 소스 mirror archive 생성 (`2.8GB`, gzip OK, SHA-256 `2187208a5176892e710cfcd67db126a92a0262cca673520e0790ccda86113e76`)
- [x] Redis 원본 확인: 세 master 모두 `appendonly yes`, `dump.rdb`, 노드별 DB 디렉터리, 노드당 키 5개
- [x] Redis 노드별 온라인 RDB와 cluster metadata archive 생성 (`6.6KB`, 노드별 5 keys, gzip OK, SHA-256 `3a4a086c29a50d28d11d6948b4c608d74063279795f1e30e80ac6860dfabccb0`)
- [x] Solr 원본 논리 구성 확인: collection 6, alias 2, configset `_default`·`chat-base-config`
- [x] 최신 Solr collection backup 6개 생성 완료 (`status:0`)
- [x] 최신 configset `_default`, `chat-base-config` export 완료
- [x] alias 정보를 포함해 `run02-solr-backup-20260913.tar.gz`로 압축 (`278KB`, SHA-256 `bbc7836556e882e7901f1070ff102d8deeefb23023401c212efba0ea4f13a324`)
- [x] 최신 MariaDB `meritz_easycms` dump 생성 (`194KB`, gzip OK, SHA-256 `e4049b9f1eec84ab356ae7c17afbcc3729083fc0c604758452303dc3e7f443aa`)
- [x] 현재 Elasticsearch snapshot 생성 (`run02_20260913`, ES 7.8.0, indices/shards 7, failed 0, state SUCCESS)
- [x] Elasticsearch snapshot archive 생성 (`48KB`, SHA-256 `1966e4b35e7d5a1ffb8c945bae758c65794f2af5156bf07d61608c68b15f7a44`)
- [x] APP 이관파일 4개의 `SHA256SUMS` manifest 작성
- [x] APP 이관파일 4개와 DB dump를 Windows staging을 거쳐 대상 서버로 전달·재검증
- [x] APP 이관 archive 4개를 Windows staging으로 전달하고 원본 SHA-256 일치 확인
- [x] DB dump를 Windows staging으로 전달하고 SHA-256 `e4049b9f1eec84ab356ae7c17afbcc3729083fc0c604758452303dc3e7f443aa` 일치 확인

현장에서는 “미러링 완료” 범위를 먼저 확인한다. 담당자가 Solr backup/configset을 제공하면 작업자가 collection별 BACKUP과 `downconfig`를 다시 수행하지 않고 제공본의 생성시각·Solr 버전·collection/configset 목록·checksum만 검증한다. 이번 로컬 실습에서는 이미 실행한 최신 백업이 모두 성공했으므로 이를 사용한다. 직접 새 백업을 생성하는 절차는 제공본이 없거나 최신 시점 백업을 별도로 요청받았을 때만 수행한다.

기존 archive는 프로그램 원본으로 재사용할 수 있지만 최종 YML, ZooKeeper `/solr`, Engine/Gateway/Chat-UI 내부 URL 수정 전 생성본일 수 있다. 따라서 기존 archive만으로 완료 판정하지 않고 현재 runtime 설정과 최신 데이터 백업을 별도로 생성한다. `meritz_pw_recovery_20260913`은 복구용 임시 schema이므로 명시적 필요가 없는 한 이관 대상에서 제외하고 업무 schema `meritz_easycms`만 새 dump로 이관한다.

### 사진 1 — 서버·프로세스·포트

```bash
hostname
ip -br addr
free -h
java -version
ps -eo user,pid,args | grep -Ei '[r]edis|[z]ookeeper|[s]olr|[e]lasticsearch|[l]ogstash|\.jar'
sudo ss -lntp
```

### 사진 2 — 실제 실행 설정과 데이터 위치

```bash
find /application -maxdepth 3 -type d -print 2>/dev/null
find /application -maxdepth 4 -type f \( -name '*.yml' -o -name '*.conf' -o -name 'solr.in.sh' -o -name 'zoo.cfg' \) -print 2>/dev/null
sudo du -sh /application/* /data/* /logs/* 2>/dev/null
```

### 사진 3 — 애플리케이션 내부 연결값

소스 루트에서 실행한다.

```bash
grep -RniE --include='application-tc.yml' --include='application-core-tc.yml' --exclude-dir=target 'jdbc:mariadb|redis|nodes:|hosts:|host[123]:|url:|urls:|domain:|createNodeSetNode|simulator-prefix|resourceLocation' .
```

비밀번호·인증키·개인키는 사진에서 가린다. 결과가 길면 DB/Redis/ZK/Solr와 APP 내부 URL을 나눠 찍는다.

---

## 3. 작업 순서

### 대상 서버 복원 이후 실전 모드

QEMU 디스크 생성, Windows `127.0.0.1:22xx` 접속, Windows staging SCP는 로컬 실습 전용이다. 이관파일이 대상 서버에 도착한 시점부터는 고객사에서도 사용할 수 있는 Linux 절차인 `현재값 확인 → 기존 파일 백업 → 필요한 값만 직접 수정 → 기동 → runtime 검증`만 사용한다. 현장에서는 이 문서의 실습 IP를 복사하지 않고 1절에서 확정한 실제 IP·포트·계정·경로로 치환한다.

항상 `현재값 확인 → 백업 → 직접 수정 → 기동 → runtime 검증` 순서다.

1. 원본/신규 서버 inventory와 backup 확인
2. Java·계정·디렉터리·권한·방화벽·SELinux
3. MariaDB 설치/복구 및 APP에서 연결 확인
4. Redis 기동 및 기존 cluster metadata 확인
5. ZooKeeper 기동 및 `/solr` chroot 확인
6. Solr 기동, collection/alias/data 복구 확인
7. Elasticsearch 기동, repository 등록, snapshot restore
8. Logstash pipeline 검증; Kibana는 현장 정책 확인 전 미기동
9. 활성 profile의 YML 연결값 수정
10. Maven build 후 JAR 배포
11. Master → CMS → Engine → Gateway → Chat-UI 순 기동
12. 로그인 → 학습 → Engine 반영 → Chat-UI 세션 기능시험

### 로컬 2회차 대상 DB 사전점검 결과

- [x] 대상 DB hostname/IP: `meritz-run02-db` / `192.168.60.20`
- [x] `mariadb-server`, `mariadb` 패키지 미설치 확인
- [x] `mariadb` systemd unit 없음, 13306 미수신, `/var/lib/mysql` 없음 확인
- [x] `ol10_appstream`에서 원본과 동일한 MariaDB `10.11.18-1.el10_2` client/server 제공 확인
- [x] MariaDB client/server `10.11.18-1.el10_2` 설치
- [x] 원본 설정과 실제 port `13306` 확인 후, 대상 실습 port `3306` 직접 설정
- [x] 원본 사용자 정의 설정 위치 `/etc/my.cnf.d/meritz.cnf`, `port=13306` 확인; 대상 사용자 정의값 없음
- [x] 원본 실제값 확인: `[mysqld]`, port `13306`, bind 기본값 `NULL`, charset/collation `latin1`/`latin1_swedish_ci`
- [x] 대상 `[mysqld] port=3306` 설정, MariaDB active/enabled, `0.0.0.0:3306` LISTEN 확인
- [x] `meritz_easycms` dump 복원, 업무 table `129`개 확인
- [x] `tbl_manage_schema.prefix_url`을 대상 `192.168.60.20:3306`으로 변경
- [x] 대상 APP `192.168.60.10`용 DB 계정·권한 준비
- [x] DB firewalld에서 대상 APP IP만 `3306/tcp` 허용
- [x] 대상 APP에서 실제 `APP_TO_DB_OK` 확인
- [x] APP mirror 해제, `admin` 실행계정 UID/GID `1001:1001` 생성, `/application` 소유권 정리
- [x] Redis 실행 config와 cluster metadata IP를 `192.168.60.10`으로 직접 변경
- [x] Redis RDB 배치 및 3-master 최초 기동, 노드당 5 keys와 전체 16,384 slots 확인

현장에서는 이 조회를 생략하지 않는다. 이미 설치·미러링된 DB가 있으면 재설치와 중복 restore를 중단하고 DBA/담당 범위를 확인한다. 미설치여도 설치 권한이 DB 담당자에게 있으면 작업자가 임의 설치하지 않고 결과만 보고한다.

복원 완료 상태에서 다음을 다시 실행하지 않는다.

- Redis `--cluster create`
- ZooKeeper `myid` 재작성
- DB dump 중복 restore
- Solr collection 중복 restore/생성
- Elasticsearch snapshot 중복 restore

---

## 3A. 월요일 6시간용 순차 실행 명령서 — 2회차 현재까지 검증 완료

이 절은 설명 자료가 아니라 **위에서 아래로 실행하는 현장 명령서**다. 실습 IP는 2회차 값이며 월요일에는 확인한 실제값으로 바꾼다.

### 명령을 읽는 최소 규칙

- `-p 7000`: 한 글자짜리 짧은 옵션. 여기서는 접속 포트다.
- `--cluster`: 이름이 긴 옵션. Redis 클러스터 관리 기능을 선택한다.
- 줄 끝 `\`: 명령이 다음 줄에 계속된다는 뜻이다. `\` 뒤에는 공백을 넣지 않는다.
- `|`: 왼쪽 명령의 출력을 오른쪽 명령의 입력으로 넘긴다.
- `&&`: 앞 명령이 성공했을 때만 다음 명령을 실행한다.
- `||`: 앞 명령이 실패했을 때 다음 명령을 실행한다.
- `*`, `?`: 셸이 먼저 펼치는 와일드카드다. 현재 계정에 디렉터리 접근권한이 없으면 `sudo`보다 먼저 실패할 수 있다.
- 설정·YML은 `vi`로 직접 수정한다. 반복 기동과 확인만 짧은 loop를 사용한다.

### 1단계 — 대상 서버와 이관파일 확인

실행 위치: 대상 APP

목적: 잘못된 서버에서 작업하는 사고와 손상된 파일 사용을 막는다.

```bash
hostname
ip -br addr
cd /home/test1/run02-import
sha256sum -c SHA256SUMS
```

정상 기준: hostname `meritz-run02-app`, IP `192.168.60.10`, APP 이관파일 4개 모두 `OK`.

실행 위치: 대상 DB

```bash
hostname
ip -br addr
sha256sum /home/test1/run02-import/run02-meritz-db-20260913.sql.gz
```

정상 기준: hostname `meritz-run02-db`, IP `192.168.60.20`, DB dump SHA-256 `e4049b9f1eec84ab356ae7c17afbcc3729083fc0c604758452303dc3e7f443aa`.

### 2단계 — MariaDB 사전점검·설치

실행 위치: 대상 DB

목적: 설치 여부를 모르는 상태에서 재설치하거나 기존 DB를 덮지 않는다.

```bash
rpm -q mariadb mariadb-server
systemctl is-active mariadb
ss -lnt | grep -E ':3306|:13306'
```

패키지가 없을 때만 저장소에서 원본과 같은 버전을 확인·설치한다. 고객사에서 DB 설치가 DBA 범위면 결과만 전달하고 설치하지 않는다.

```bash
sudo dnf -q --showduplicates list mariadb-server
sudo dnf install -y mariadb-10.11.18-1.el10_2 mariadb-server-10.11.18-1.el10_2
```

확인:

```bash
rpm -q mariadb mariadb-server
mariadb --version
```

2회차 실습 결과: MariaDB `10.11.18` 설치 완료.

### 3단계 — MariaDB 포트 직접 설정·기동

실행 위치: 대상 DB

목적: 1회차 원본은 `13306`, 2회차 대상은 환경 차이 훈련을 위해 `3306`을 사용한다. 월요일에는 실제 지정 포트를 사용한다.

```bash
sudo vi /etc/my.cnf.d/meritz.cnf
```

2회차 입력값:

```ini
[mysqld]
port=3306
```

기동·통합 확인:

```bash
sudo systemctl enable --now mariadb
sudo mariadb -NBe "SELECT VERSION(),@@port,@@bind_address;"
```

정상 기준: `10.11.18-MariaDB`, port `3306`, bind `NULL`; `ss -lntp`에서는 `0.0.0.0:3306` LISTEN.

### 4단계 — DB dump 복원과 내부 JDBC 변경

실행 위치: 대상 DB

목적: 업무 DB가 없는 경우에만 dump를 한 번 복원한다.

```bash
sudo mariadb -NBe "SHOW DATABASES" | grep -Fx meritz_easycms || echo DB_NOT_FOUND
```

`DB_NOT_FOUND`일 때만 실행:

```bash
gzip -dc /home/test1/run02-import/run02-meritz-db-20260913.sql.gz | sudo mariadb
```

복원 확인:

```bash
sudo mariadb -NBe "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='meritz_easycms';"
```

2회차 정상 기준: `129` tables.

DB 내부의 tenant JDBC도 직접 확인하고 수정한다.

```bash
sudo mariadb meritz_easycms -e "SELECT id,prefix_url,schema_name,user_name FROM tbl_manage_schema;"
sudo mariadb meritz_easycms
```

MariaDB 프롬프트에서 실행:

```sql
UPDATE tbl_manage_schema
SET prefix_url='jdbc:mariadb://192.168.60.20:3306/meritz_easycms'
WHERE id=1;
SELECT id,prefix_url,schema_name,user_name FROM tbl_manage_schema;
exit
```

DB 계정은 DBA 제공값을 우선한다. 2회차에서는 APP `192.168.60.10`용 `meritz_easycms` 계정을 만들고 업무 DB 권한을 부여했다. 월요일에는 승인 없이 `CREATE USER`, `ALTER USER`, 비밀번호 변경을 하지 않는다.

확인:

```bash
sudo mariadb -NBe "SELECT User,Host FROM mysql.user WHERE User='meritz_easycms';"
```

2회차 정상 기준: `meritz_easycms  192.168.60.10`.

### 5단계 — APP→DB 방화벽 검증

실행 위치: 대상 APP

목적: DB 서버 자체 접속이 아니라 실제 APP→DB 경로를 검증한다.

```bash
timeout 3 bash -c '</dev/tcp/192.168.60.20/3306' && echo APP_TO_DB_OK || echo APP_TO_DB_FAIL
```

`APP_TO_DB_FAIL`이고 ping은 성공하며 DB가 LISTEN이면 DB 방화벽을 확인한다. 2회차 실습에서는 대상 DB에서 APP IP 하나만 허용했다.

실행 위치: 대상 DB — 실습 또는 변경 승인 시에만 실행

```bash
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="192.168.60.10/32" port protocol="tcp" port="3306" accept'
sudo firewall-cmd --reload
```

정상 기준: 반드시 대상 APP에서 다시 실행한 결과가 `APP_TO_DB_OK`.

### 6단계 — APP 프로그램 복원과 실행계정 준비

실행 위치: 대상 APP

목적: 압축을 풀기 전에 대상 경로가 비어 있는지와 필수 명령을 확인한다.

```bash
find /application -mindepth 1 -maxdepth 1 -print 2>/dev/null
command -v tar gzip
df -h /
```

APP mirror 범위가 `/application`과 `/home/test1/meritz`이면 `/usr/lib/jvm`의 Java는 포함되지 않는다. middleware 기동 전에 실행 Java를 별도로 확인한다.

```bash
command -v java || echo JAVA_NOT_INSTALLED
```

1회차 고정 Java 경로도 확인한다.

```bash
test -x /usr/lib/jvm/java-1.8.0-amazon-corretto/bin/java && echo JAVA_OK || echo JAVA_MISSING
```

2회차 결과: `JAVA_MISSING`. ZooKeeper 기동 전에 원본 Java 패키지/버전을 확인하고 동일 runtime을 대상에 준비한다.

원본 확인 결과:

```text
java-1.8.0-amazon-corretto-devel-1.8.0_504.b01-1.x86_64
/usr/lib/jvm/java-1.8.0-amazon-corretto → 195MB
```

대상 APP에서 Amazon 공식 RPM을 내려받는다.

```bash
cd /home/test1
curl -fL -o corretto8.rpm https://corretto.aws/downloads/resources/8.504.01.1/java-1.8.0-amazon-corretto-devel-1.8.0_504.b01-1.x86_64.rpm
```

버전 고정 릴리스의 공식 SHA-256과 로컬 파일의 SHA-256을 비교한다.

```bash
sha256sum /home/test1/corretto8.rpm
```

정상 SHA-256은 `df71903a9673dccdaf35c3ad0a644d4c7e5422b9a59ae309a284ad75325c41fe`다. 정확히 같을 때만 설치한다. `latest` URL은 새 릴리스가 나오면 바뀌므로 버전 일치 이관에는 사용하지 않는다.

```bash
sudo dnf install -y /home/test1/corretto8.rpm
```

설치 후 원본 package와 Java 버전을 확인한다.

```bash
rpm -q java-1.8.0-amazon-corretto-devel
/usr/lib/jvm/java-1.8.0-amazon-corretto/bin/java -version
```

2회차 설치 결과: 원본과 동일한 Corretto `8.504.01.1`, build `1.8.0_504-b01` 확인 완료.

`tar`가 없을 때만 설치:

```bash
sudo dnf install -y tar gzip
```

대상 `/application`이 비어 있을 때만 복원:

```bash
cd /
sudo tar -xzf /home/test1/run02-import/run02-app-mirror-20260913.tar.gz
```

`tar -xzf` 의미: `x` 해제, `z` gzip, `f` 다음 인자가 파일명.

원본 실행계정 기준은 `admin` UID/GID `1001:1001`이다. 먼저 충돌을 확인한다.

```bash
getent passwd 1001 || echo UID_1001_AVAILABLE
getent group 1001 || echo GID_1001_AVAILABLE
```

둘 다 사용 가능할 때만 생성:

```bash
sudo groupadd -g 1001 admin
sudo useradd -u 1001 -g 1001 -m -s /bin/bash admin
sudo chown -R admin:admin /application
```

확인:

```bash
id admin
ls -ld /application/redis
```

2회차 정상 기준: `admin`은 `1001:1001`, `/application` 실행파일은 `admin:admin`. 고객사에서는 실제 실행계정 기준을 따르고 기존 `/application` 전체에 무조건 `chown -R`하지 않는다.

### 7단계 — Redis 실행 설정·RDB·cluster metadata 복원

실행 위치: 대상 APP

목적: 원본 3-master, 포트 `7000/7001/7002`, 노드당 5 keys, 슬롯 배치를 유지하고 IP만 변경한다.

백업을 작업경로에 해제:

```bash
mkdir -p /home/test1/run02-redis-restore
tar -xzf /home/test1/run02-import/run02-redis-data-20260913.tar.gz -C /home/test1/run02-redis-restore
```

실행 설정 세 파일을 직접 연다.

```bash
sudo -u admin vi /application/redis/conf/7000.conf
sudo -u admin vi /application/redis/conf/7001.conf
sudo -u admin vi /application/redis/conf/7002.conf
```

각 파일에서 실제 적용되는 두 값을 변경한다.

```text
bind 127.0.0.1 192.168.60.10
cluster-announce-ip 192.168.60.10
```

RDB와 클러스터 상태 파일 배치:

```bash
for p in 7000 7001 7002; do sudo mkdir -p /application/redis/db/$p; sudo cp /home/test1/run02-redis-restore/redis/$p/* /application/redis/db/$p/; done
sudo chown -R admin:admin /application/redis/db
```

클러스터 상태 파일도 Redis가 꺼진 상태에서 직접 연다.

```bash
sudo -u admin vi /application/redis/db/7000/7000.conf
sudo -u admin vi /application/redis/db/7001/7001.conf
sudo -u admin vi /application/redis/db/7002/7002.conf
```

세 파일의 모든 원본 IP `192.168.50.10`을 대상 IP `192.168.60.10`으로 변경한다. 이 파일은 `cluster-config-file`이 가리키는 Redis 동적 상태 파일이다. 실행 중에는 직접 수정하지 않는다. topology가 달라지면 이 방식 대신 새 cluster와 논리 데이터 이관 절차를 사용한다.

실행 폴더 준비:

```bash
sudo mkdir -p /logs/redis /application/redis/run
sudo chown -R admin:admin /logs/redis /application/redis/run
```

RDB를 우선 읽도록 최초 1회 AOF를 끈 상태로 기동:

```bash
for p in 7000 7001 7002; do sudo -u admin /application/redis/bin/redis-server /application/redis/conf/$p.conf --appendonly no --daemonize yes; done
```

- `--appendonly no`: export한 `dump.rdb`를 먼저 읽기 위한 이번 최초 기동 임시값.
- `--daemonize yes`: 백그라운드로 실행.

포트·노드·슬롯·키를 한 명령으로 확인:

```bash
/application/redis/bin/redis-cli --cluster check 192.168.60.10:7000
```

- `--cluster`: Redis 클러스터 관리 기능.
- `check`: 지정 노드에서 시작해 전체 클러스터를 검사.
- 7000 하나만 지정해도 cluster metadata로 7001·7002를 찾는다.

2회차 정상 기준:

```text
7000/7001/7002 → 각각 5 keys
3개 master가 모두 표시됨
[OK] All 16384 slots covered.
```

RDB 복원 확인 후 AOF 재활성화:

```bash
for p in 7000 7001 7002; do /application/redis/bin/redis-cli -p $p CONFIG SET appendonly yes; done
```

정상 기준: `OK` 세 번. AOF 파일 확인:

```bash
sudo find /application/redis/db -name '*.aof' -ls
```

2회차 검증 결과: `7000`, `7001`, `7002`에 `appendonly.aof`가 각각 생성됐고 소유자는 `admin:admin`이다. Redis 이관 완료.

### 8단계 — ZooKeeper 활성 설정 확인

실행 위치: 대상 APP

목적: sample·과거 backup 파일은 제외하고 실제 3개 인스턴스 설정만 확인한다. 전체 `find`는 data/log/run 권한 오류와 불필요한 파일이 많으므로 현장 기본 명령으로 사용하지 않는다.

```bash
sudo grep -HE '^(dataDir|dataLogDir|clientPort|server)' /application/solr/zk/conf-zk?/zoo.cfg
```

- `conf-zk?`: `conf-zk1`, `conf-zk2`, `conf-zk3`만 선택한다.
- 확인값: 노드별 data/dataLog 경로, client port, 3개 server 목록.

기동 여부는 한 줄로 확인한다.

```bash
ss -lnt | grep ':218[1-3]' || echo ZK_OFF
```

2회차 최초 확인 결과: `ZK_OFF`. 활성 설정값 확인 후 기존 IP만 직접 수정한다.

2회차 확인 결과:

```text
zk1 → data/zk1, datalog/zk1, client 2181
zk2 → data/zk2, datalog/zk2, client 2182
zk3 → data/zk3, datalog/zk3, client 2183
server.1 → peer/election 2888/3888
server.2 → peer/election 2889/3889
server.3 → peer/election 2890/3890
```

같은 APP 서버에서 3개 인스턴스를 실행하므로 client·peer·election 포트가 모두 달라야 한다. 경로와 포트는 유지하고 원본 IP `192.168.50.10`만 대상 IP `192.168.60.10`으로 직접 변경한다.

```bash
sudo -u admin vi /application/solr/zk/conf-zk1/zoo.cfg
sudo -u admin vi /application/solr/zk/conf-zk2/zoo.cfg
sudo -u admin vi /application/solr/zk/conf-zk3/zoo.cfg
```

각 파일에서 `server.1`, `server.2`, `server.3`의 IP만 변경하고 포트는 유지한다. `dataDir`, `dataLogDir`, `clientPort`, `clientPortAddress`는 변경하지 않는다.

권한 주의: 설정 파일은 `admin:admin`, mode `644`이므로 로그인 계정 `test1`이 일반 `vi`로 열면 저장할 때 `E212: Can't open file for writing`이 발생한다. 반드시 `sudo -u admin vi ...`로 연다. 이미 일반 `vi`에서 수정했다면 `:w /tmp/파일명`으로 임시 저장하고, 원본과 `diff -u`로 비교한 뒤 `admin` 권한으로 반영한다. `:w!`는 OS 쓰기 권한을 우회하지 못한다.

노드 번호 파일 확인:

```bash
sudo cat /application/solr/zk/data/zk{1,2,3}/myid
```

정상 기준: 순서대로 `1`, `2`, `3`. `myid`는 `server.1~3` 번호와 반드시 일치해야 한다.

2회차 이관본에는 runtime 최상위 wrapper가 있는지 참고로 확인했다.

```bash
find /application/solr/zk -maxdepth 1 -type f -name '*.sh' -print
```

2회차 결과: `appctl.sh`, `start.sh`, `stop.sh`, `restart.sh`, `status.sh`가 존재했다. 그러나 월요일 대상 서버에는 이 wrapper들이 없을 수 있으므로 **현장 기본 절차에서는 wrapper 존재를 전제로 하지 않는다.** 아래 짧은 반복문으로 `zkServer.sh`를 직접 호출한다.

**월요일 필수 — 기동 전에 로그 경로와 권한을 반드시 준비·확인한다.** `/logs` 아래 신규 디렉터리는 `admin`이 만들 수 없으므로 root 권한으로 생성한 뒤 실행 계정에 넘긴다. `mkdir -p`는 이미 디렉터리가 있어도 안전하므로 별도 존재 여부 분기 없이 한 줄로 처리한다.

```bash
sudo mkdir -p /logs/solr/zk{1,2,3}; sudo chown -R admin:admin /logs/solr; ls -ld /logs/solr/zk{1,2,3}
```

정상 기준: 세 경로가 모두 출력되고 소유자·그룹이 `admin admin`이다. 이 확인이 끝나기 전에는 ZooKeeper를 기동하지 않는다.

```bash
for n in 1 2 3; do sudo -u admin env JAVA_HOME=/usr/lib/jvm/java-1.8.0-amazon-corretto /application/solr/zk/bin/zkServer.sh --config /application/solr/zk/conf-zk$n start; done
```

기동 후 quorum 역할을 별도 명령으로 확인한다. 두 명령을 한 줄로 붙여도 타이핑 양이 거의 줄지 않고 실패 지점을 구분하기 어려우므로 현장 절차에서는 분리한다.

```bash
for n in 1 2 3; do sudo -u admin /application/solr/zk/bin/zkServer.sh --config /application/solr/zk/conf-zk$n status | grep Mode; done
```

`STARTED`는 프로세스 생성 성공일 뿐 quorum 성공을 보장하지 않으므로 역할 확인은 생략하지 않는다. 정상 기준은 `leader` 1개와 `follower` 2개다. 세 역할이 모두 나오면 client port를 통한 상태 조회까지 성공한 것이므로 별도의 `ss` 포트 확인은 장애 조사 때만 사용한다. wrapper 검색 명령은 2회차 분석 기록으로만 남기며 월요일 필수 명령에는 포함하지 않는다.

2회차 최종 결과: `zk1=follower`, `zk2=leader`, `zk3=follower`. 3노드 quorum 형성 완료.

2회차 시행착오: 로그 경로를 만들지 않고 실행해 세 노드 모두 `mkdir: cannot create directory '/logs/solr': Permission denied`와 `FAILED TO START`가 발생했다. 설정 또는 Java 문제가 아니라 로그 디렉터리 선행 준비 누락이 원인이었다. 월요일에는 위 `mkdir + chown`을 기동 명령 바로 앞의 필수 단계로 실행한다.

---

## 4. YML 변경표 — 가장 먼저 볼 부분

### 4.1 common

파일:

```text
common/src/main/resources/application-core-tc.yml
```

| 설정 | 로컬 실습값 | 주의 |
|---|---|---|
| Redis `hosts` | `.10:7000,.10:7001,.10:7002` | 세 node 전체 |
| Solr `url` | `.10:8983/solr` | 대표 endpoint |
| `createNodeSetNode1~3` | `.10:8983/8984/8985_solr` | 세 줄 누락 금지 |
| Solr `urls` | `.10:8983/8984/8985/solr` | 같은 포트 반복 실수 금지 |
| ZK `hosts` | `.10:2181,.10:2182,.10:2183/solr` | **끝의 `/solr` 필수** |

`/solr`가 빠지면 collection 조회 일부는 되더라도 사전 파일 쓰기가 실패하며 CMS 로그에 `upload result: 9999`가 나온다. 성공 기준은 `connectString=.../solr`, `upload result: 0`이다.

### 4.2 CMS

파일:

```text
cms/src/main/resources/application-tc.yml
```

| 설정 | 로컬 실습값 | 이유 |
|---|---|---|
| Redis nodes | `.10:7000/7001/7002` | session 저장 |
| JDBC | `.20:13306/meritz_easycms` | 기본 datasource |
| ES host1/2/3 + port | `.10`, 공통 `9200` | 코드가 공통 port 하나 적용 |
| Engine URL 3개 | `.10:8180` 세 번 | `engine1/2/3` DNS를 쓰지 않는 실습 |
| Scheduler | `.10:8580/scheduler` | 내부 호출 |
| Master | `.10:8380` | 내부 호출 |
| `resourceLocation` | `http://chat-ui:8480/images` | Windows 브라우저가 받는 주소 |
| `simulator-prefix` | `http://chat-ui:8480` | `.10`을 브라우저에 전달하면 접근 불가 |

### 4.3 Master

파일:

```text
master/src/main/resources/application-tc.yml
```

- JDBC/Redis/ES는 CMS와 동일한 실제 대상 확인
- Engine URL 3개는 로컬 실습에서 `http://192.168.50.10:8180`
- Chat-UI/Scheduler/Master 내부 URL 확인

### 4.4 Gateway

파일:

```text
gateway/src/main/resources/application-tc.yml
```

- Engine URL 두 곳 → 로컬 `http://192.168.50.10:8180`
- ES 대표 URL → 로컬 `http://192.168.50.10:9200`
- ES host1/2/3 → 로컬 `.10`, 공통 port `9200`

### 4.5 Chat-UI

파일:

```text
chat-ui/src/main/resources/application-tc.yml
```

- `client.url` → 브라우저 진입 주소
- Gateway `domain` → 로컬 `http://192.168.50.10:8081/gateway`

Gateway `domain=http://gateway:8081/gateway`가 남으면 Chat-UI 로그에 `UnknownHostException: gateway`, `failed create session`, `sessionKey:null`이 나온다.

### 4.6 Engine

파일:

```text
engine/src/main/resources/application-tc.yml
```

- CMS URL → 로컬 `http://192.168.50.10:8280`
- `js/common.js`의 `ClassPathResource.getFile()` 오류는 fat JAR에서 발생한 별도 코드 문제다. 1회차에서는 Engine 기동과 학습 완료를 막지 않았지만 운영 전 수정 대상으로 남긴다.

### 4.7 Scheduler

파일:

```text
scheduler/src/main/resources/application-tc.yml
```

- Redis/JDBC/ES/Master 주소를 확인한다.
- 현재 `entityManagerFactory` bean 부재로 기동 실패한다. 다른 서비스 이관과 분리해 해결한다.

### 수정 후 잔존 호스트명 검사

```bash
grep -RniE --include='application-tc.yml' --include='application-core-tc.yml' --exclude-dir=target 'mariadb1|mariadb:3306|redis[123]:|solr[123]:|zk[123]:|engine[123]?:|gateway:8081|master:8380|scheduler1:8580|chat-ui1:8480|localhost:(8081|8180|8280|8380|8480|8580)' .
```

검색 결과를 전부 무조건 바꾸지 않는다. 서버 내부 URL인지, Windows 브라우저가 받는 URL인지, 외부 연계 주소인지 먼저 구분한다.

건드리지 않을 값:

- KT API, LDAP, Kakao/Facebook 등 외부 연계 URL
- 의미를 확인하지 않은 `clustername`, `server`
- 비밀번호, 인증키, 개인키

---

## 5. DB에서 반드시 함께 바꿀 값

CMS 기본 JDBC YML만 바꾸면 끝이 아니다.

```sql
SELECT id, prefix_url, schema_name, user_name
FROM tbl_manage_schema;
```

- `prefix_url`이 신규 DB 주소인지 확인한다.
- `password`는 애플리케이션이 복호화하는 **암호문**이다.
- 평문으로 덮어쓰면 `using password: NO`와 로그인 실패가 발생한다.
- 원본 암호문은 유지하고 URL/권한만 신규 환경에 맞춘다.
- 현장 승인 없이 DB 계정 비밀번호를 임의 변경하지 않는다.

Master 기동 시 Hibernate가 `alter table ... add constraint`를 실행할 수 있다. 기동 전에 실효 `ddl-auto`, DB backup, 변경 승인을 확인한다.

---

## 6. Middleware 필수 확인점

### Redis

- config/data/log/PID와 실행계정 확인
- AOF/RDB 위치와 원본 topology 확인
- 재기동 후 `cluster_state:ok`, node 3, 기존 key 확인
- 기존 `nodes.conf`가 있으면 cluster를 새로 만들지 않는다.

### ZooKeeper

- `Using config:`가 수정한 파일을 가리키는지 확인
- 인스턴스별 `dataDir`, `dataLogDir`, client/peer/election port, `myid`
- 인스턴스별 `ZOOPIDFILE`, `ZOO_LOG_DIR`
- 동일 IP 3개는 포트를 나누고, 서로 다른 서버 3대는 같은 포트를 사용할 수 있다.

### Solr

- 경로를 모르면 먼저 디렉터리를 직접 확인한다. 아래 순서로 입력하고, 실제 Solr가 보이는 경로에서 계속 진행한다:

```bash
ls /application /opt /usr/local 2>/dev/null
ls /application/solr 2>/dev/null
ls /application/solr/solr1/bin/solr.in.sh /application/solr/zk/bin/zkServer.sh 2>/dev/null
```

- `ls /application/solr`에서 `solr1`, `solr2`, `solr3`, `zk`가 보이면 정상 후보이다. `solr1/bin/solr.in.sh`가 Solr 인스턴스 설정 파일이고, `zk/bin/zkServer.sh`가 ZooKeeper 실행 파일이다. 다른 경로에 설치돼 있으면 `/application/solr` 부분만 실제 후보 경로로 바꾼다.
- 운영 중인 경우에는 `ps -ef | grep '[s]olr'`로 `solr.install.dir`도 함께 확인한다.
- 현장용 핵심 설정 확인 명령:

```bash
grep -H -e '^SOLR_' -e '^ZK_HOST' /application/solr/solr?/bin/solr.in.sh
```

- 복합 정규식 `SOLR_(HOME|DATA_HOME|...)`은 타이핑 오류 가능성이 커서 사용하지 않는다. `-e`로 단순 조건 두 개를 나눠 `SOLR_` 설정과 `ZK_HOST`를 함께 확인한다.
- 확인 목적: `SOLR_HOME`은 인스턴스 설정, `SOLR_DATA_HOME`은 인덱스 데이터, `SOLR_LOGS_DIR`은 로그, `SOLR_PID_DIR`은 PID 위치, `SOLR_HOST`·`SOLR_PORT`는 서비스 주소, `ZK_HOST`는 ZooKeeper 연결 주소다. 이관 시 IP만 대상 IP로 바꾸고 포트·경로·`/solr` chroot는 유지한다.
- `ZK_HOST` 끝의 `/solr`는 파일 경로가 아니라 ZooKeeper chroot namespace다. SolrCloud의 `configs`, `live_nodes`, collection/alias 메타데이터가 기존 `/solr` 아래에 있으므로 이 값을 빼면 기존 클러스터 메타데이터를 보지 못한다.
- 2회차 Solr 기동 실패 원인: 대상 ZooKeeper에 `/solr` znode이 없어서 `A chroot was specified in ZkHost but the znode doesn't exist`가 발생했다. Solr 프로세스가 `STARTED`여도 CoreContainer가 초기화되지 않을 수 있으므로, 대상 ZK에 `/solr`를 만들고 configset을 업로드한 뒤 Solr를 재기동한다.
- 순서 교정: ZooKeeper quorum 확인 뒤, Solr 기동 전에 `/solr` chroot 생성과 configset(`_default`, `chat-base-config`) 업로드를 먼저 수행한다. 2회차에서는 이 단계를 빠뜨려 Solr가 HTTP 500으로 올라왔고, 이 누락을 현장 체크리스트의 필수 단계로 승격했다.
- 2회차 복구 결과: `/solr` 생성과 두 configset 업로드 후 Solr 8983/8984/8985가 모두 HTTP OK로 초기화 완료됐다.
- collection restore 시행착오: 백업을 `/home/test1` 아래에 두고 Solr(`admin` 계정)로 RESTORE하여 `specified location ... does not exist`가 반복됐다. 파일이 실제로 없다는 뜻이 아니라 Solr 실행 계정이 사용자 홈 경로를 통과하지 못할 수 있으므로, restore 백업은 `/data/solr_backup`처럼 Solr 계정이 읽을 수 있는 경로에 두고 `admin:admin` 권한을 확인한다.
- configset은 ZooKeeper 내부 데이터이므로 일반 `mv`로 옮기지 않는다. `zk upconfig`가 ZooKeeper API를 통해 `/solr/configs/...`에 등록하는 정식 방법이다. ZooKeeper의 내부 data 디렉터리에 파일을 직접 덮어쓰면 znode 구조·권한·트랜잭션 상태가 맞지 않을 수 있다.
- 월요일 단축형: 대상 IP·Solr 실행 파일·configset 상위 경로만 변수로 한 번 지정하고 두 configset은 반복문으로 업로드한다.

```bash
Z='192.168.60.10:2181,192.168.60.10:2182,192.168.60.10:2183'; S=/application/solr/solr1/bin/solr; C=/home/test1/run02-solr-restore/run02-final-20260913/configsets
for n in _default chat-base-config; do sudo -u admin env JAVA_HOME=/usr/lib/jvm/java-1.8.0-amazon-corretto "$S" zk upconfig -z "$Z/solr" -n "$n" -d "$C/$n/conf"; done
```

현장에서는 `Z`, `S`, `C` 세 값만 실제 환경에 맞게 바꾸고, `for` 이하 본문은 그대로 사용한다.
- 2회차 확인 결과: PID 경로는 모두 존재했다. 반면 `/logs/solr/solr1~3`은 없었으므로 Solr 기동 전에 `sudo mkdir -p /logs/solr/solr{1,2,3}; sudo chown -R admin:admin /logs/solr`로 생성·권한 보정한다.
- `SOLR_HOME`, `SOLR_DATA_HOME`, log, PID, host, port, Java, `ZK_HOST`
- `ZK_HOST` 끝 `/solr`
- 실행 디렉터리는 각 Solr의 `server`; 다른 사용자 홈에서 실행하지 않는다.
- collection뿐 아니라 alias와 문서 수까지 확인
- Solr 기동 시 open file/process limit, entropy, `lsof` 관련 WARN은 기동 실패와 구분한다. `Started Solr server`가 나오면 우선 HTTP·Cloud 상태를 확인하고, limit 조정과 `lsof` 설치는 운영 하드닝 항목으로 별도 처리한다.

### Elasticsearch

- config/data/log/tmp/PID를 node별 분리
- `jvm.options`와 `jvm.options.d/*.options` 모두 확인
- 실제 JVM heap은 `/proc/<PID>/cmdline`로 확인
- snapshot repository는 등록해야 ES가 디스크의 snapshot을 인식한다.
- restore 전 기존 index 충돌과 `include_global_state` 여부 확인

---

## 7. Build·배포 원칙

YML을 수정한 후에만 한 번 빌드한다.

```bash
cd /home/test1/meritz
mvn clean package -DskipTests
```

- `BUILD SUCCESS` 확인
- `src/main/resources`만 수정하고 실행 중 JAR을 그대로 두지 않는다.
- 빌드된 YML은 `BOOT-INF/classes` 또는 의존 common JAR에 포함된다.
- 배포 전 기존 JAR과 설정을 날짜가 포함된 이름으로 백업한다.
- 새 JAR 복사 후 소유자를 실행계정으로 맞춘다.
- PID 파일이 아니라 실제 listen port의 PID를 확인한다.

포트 충돌 `Port xxxx was already in use`가 나오면 기존 프로세스가 남은 것이다. `start requested`는 성공 판정이 아니다. 성공 문구와 listen port를 둘 다 확인한다.

---

## 8. 기동·검증 순서

### QEMU 실습 전용

1. APP QEMU가 `127.0.0.1:12345`를 listen하도록 먼저 실행
2. DB QEMU를 나중에 실행해 socket에 connect
3. 양쪽 `enp0s3` IP와 서로 Ping 확인

양쪽 NIC가 `UP`이어도 socket peer가 연결되지 않으면 통신되지 않는다. 이 경우 APP은 유지하고 DB만 정상 종료 후 다시 실행한다. QEMU 창을 닫으면 VM도 꺼진다.

### 서비스 순서

```text
MariaDB
→ Redis
→ ZooKeeper
→ Solr
→ Elasticsearch
→ Logstash
→ Master
→ CMS
→ Engine
→ Gateway
→ Chat-UI
```

- 각 단계에서 port/health를 확인한 뒤 다음 단계로 이동한다.
- `Started ...Application`이 나오기 전에는 성공으로 판정하지 않는다.
- CMS는 포트를 연 뒤 완전 기동까지 약 45초 걸린 사례가 있다.
- 무한 `until` 대신 제한 횟수 loop를 사용하고 실패 시 즉시 로그를 본다.
- VM 재부팅 후 자동기동이 없다면 cluster 생성/restore가 아니라 **기존 데이터로 서비스만 기동**한다.

---

## 9. 기능시험과 판정 로그

### CMS 학습

정상 흐름:

```text
ZK connectString 끝 /solr
→ dictionary upload result: 0
→ INDEXING_INTENT 진행
→ Engine 호출 성공
→ Learning Job status=SUCCESS
→ Completed Learning Engine
```

오류별 바로 볼 곳:

| 증상 | 실제 원인 | 확인/조치 |
|---|---|---|
| `upload result: 9999` | ZK chroot `/solr` 누락 | common ZK hosts와 runtime 로그 |
| `UnknownHostException: engine1` | CMS/Master Engine URL 잔존 | Engine URL 3개 수정 후 JAR 재배포 |
| `not found Learn Cache` | 학습 전 Engine 기동 또는 배포 실패 | 최신 학습 완료 로그와 구분 |
| `UnknownHostException: gateway` | Chat-UI Gateway domain 잔존 | Chat-UI YML 수정 후 재배포 |
| `channelCache is null` | 채널 cache 미생성/미로딩 | 학습·배포 성공 후 최신 Gateway/Redis 확인 |
| `sessionKey:null` | Gateway session 생성 실패의 결과 | 바로 앞 Gateway 호출 오류 확인 |

### 최종 시험

- [ ] CMS 로그인
- [ ] TC_CALLBOT 학습 SUCCESS
- [ ] Engine STANDBY/TEST 학습 완료
- [ ] `http://chat-ui:8480/client/default/chat.html`
- [ ] `http://chat-ui:8480/client/STANDBY/simulator.html?...`
- [ ] Gateway/Engine 최신 로그에 UnknownHost/connection refused 없음
- [ ] Redis key와 세션 증가 확인
- [ ] Solr alias와 문서 수 확인
- [ ] ES cluster green, Logstash 신규 index 확인

---

## 10. Windows 웹 접속 — 로컬 QEMU 전용

Windows hosts:

```text
127.0.0.1 cms meritz.easycms chat-ui
```

APP VM의 private IP `192.168.50.10`은 Windows가 직접 접근하지 못한다. CMS와 Chat-UI를 한 SSH 연결에서 전달한다.

```powershell
ssh -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -L 127.0.0.1:8280:127.0.0.1:8280 -L 127.0.0.1:8480:127.0.0.1:8480 -p 2222 test1@127.0.0.1
```

- 터널 PowerShell 창은 닫지 않는다.
- `ping`은 이름 해석만 확인한다.
- `Test-NetConnection=True`도 stale SSH가 port만 점유한 경우가 있으므로 HTTP 200까지 확인한다.
- Windows 명령은 `PS C:\...>`에서, Linux 명령은 `[test1@...]$`에서 실행한다.
- 현재 QEMU에는 HAProxy가 없으므로 `http://cms/login`이 아니라 `http://cms:8280/login`을 사용한다.
- 고객사 개발계에서 HAProxy/LB 80번이 준비돼 있으면 현장 URL을 따른다.

---

## 11. 중단·롤백 기준

다음 상황에서는 다음 서비스로 넘어가지 않는다.

- DB port/인증 실패
- Redis cluster fail
- ZooKeeper quorum 미형성
- Solr collection/alias 누락
- ES red 또는 node 수 부족
- active profile 불명확
- 백업·rollback 경로 미확인 상태에서 DB/JAR 변경 필요

롤백은 변경 전 백업 설정/JAR 복구 후 해당 서비스만 재기동한다. 데이터를 삭제하거나 cluster를 재생성하는 방식으로 복구하지 않는다.

---

## 12. 월요일 최단 진행 요약

1. 실제 배치·IP·DNS·profile·실행계정·backup을 먼저 사진 2~3장으로 확보
2. DB와 middleware의 기존 config/data가 준비됐는지 판정
3. 활성 `tc` YML에서 내부 연결값과 브라우저 전달 URL을 표대로 수정
4. `tbl_manage_schema`의 URL과 암호문 보존 확인
5. 잔존 hostname grep
6. Maven build 1회, JAR 백업·배포
7. 의존성 순 기동 및 단계별 health 확인
8. CMS 로그인 → 학습 → Engine → Chat-UI 세션 순으로 시험
9. 오류는 최신 로그 한 건만 기준으로 원인 서비스에서 수정
