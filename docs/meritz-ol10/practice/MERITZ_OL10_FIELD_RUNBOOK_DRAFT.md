# Meritz OL10 현장 이관 실행서 - 2회차 실전 초안

6시간 현장에서 순서대로 실행하는 압축본이다. 상세 설명과 시행착오는 FULL_BUILD_RUN_02_EXECUTION_PLAN.md에 기록한다.
비밀번호와 개인키는 문서에 적지 않는다.

## 0. 현장값

    APP 서버/IP: __________________  SSH: ______
    DB 서버/IP : __________________  DB port: ______
    Solr 경로: ____________________  ZK 경로: ______
    ES 경로  : ____________________  Logstash 경로: ______
    APP 실행 계정: _________________

## 1. 전체 순서

    [ ] 대상 서버/IP/계정/디스크 확인
    [ ] APP-DB 포트와 방화벽
    [ ] MariaDB 설치, dump 복원, 계정
    [ ] APP runtime 복사와 admin 권한
    [ ] Redis 기동과 cluster check
    [ ] ZooKeeper 설정, myid, 로그경로, quorum
    [ ] Solr 설정, 로그경로, /solr, configset, collection, alias
    [ ] Elasticsearch 3 node와 snapshot restore
    [ ] Logstash test 1건
    [ ] YML 확인, build, JAR 배치
    [ ] Master/CMS/Engine/Gateway/Chat-UI 기동
    [ ] 로그인, 학습, 채팅 시험

## 2. 시작 점검

APP와 DB 각각:

    hostname; ip -br addr; free -h; id

APP에서 DB 통신 확인:

    timeout 3 bash -c '</dev/tcp/DB_IP/DB_PORT' && echo DB_OK || echo DB_FAIL

DB_FAIL이면 다음 단계로 가지 말고 라우팅, 방화벽, DB listen을 먼저 확인한다.

## 3. MariaDB - DB 서버

    rpm -q mariadb-server mariadb; sudo systemctl is-active mariadb
    sudo systemctl enable --now mariadb
    sudo ss -lntp | grep DB_PORT

dump 복원과 테이블 확인:

    gzip -dc /home/test1/run02-import/run02-meritz-db-*.sql.gz | sudo mariadb
    sudo mariadb -NBe "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='meritz_easycms';"

APP 계정과 DB 방화벽은 승인된 값으로 설정한다.

## 4. APP runtime과 권한 - APP 서버

    sudo tar -xzf /home/test1/run02-import/run02-app-mirror-*.tar.gz -C /
    getent passwd admin || sudo useradd -u 1001 -g 1001 -m -s /bin/bash admin
    sudo chown -R admin:admin /application

원본과 UID/GID가 다르면 임의로 진행하지 않는다.

## 5. Redis

    grep -nE '^(bind|port|dir|appendonly|cluster-enabled|cluster-announce-ip)' /application/redis/conf/700?.conf
    for p in 7000 7001 7002; do sudo -u admin /application/redis/bin/redis-server /application/redis/conf/$p.conf --appendonly no --daemonize yes; done
    /application/redis/bin/redis-cli --cluster check APP_IP:7000

정상 기준: 3 masters, 기존 keys, All 16384 slots covered.

## 6. ZooKeeper

    sudo grep -HE '^(dataDir|dataLogDir|clientPort|server)' /application/solr/zk/conf-zk?/zoo.cfg
    sudo cat /application/solr/zk/data/zk{1,2,3}/myid

정상 기준: client 2181/2182/2183, myid 1/2/3, server IP가 대상 APP IP.

기동 전 로그 경로를 반드시 확인:

    sudo mkdir -p /logs/solr/zk{1,2,3}; sudo chown -R admin:admin /logs/solr; ls -ld /logs/solr/zk{1,2,3}

기동:

    for n in 1 2 3; do sudo -u admin env JAVA_HOME=/usr/lib/jvm/java-1.8.0-amazon-corretto /application/solr/zk/bin/zkServer.sh --config /application/solr/zk/conf-zk$n start; done

quorum 확인:

    for n in 1 2 3; do sudo -u admin /application/solr/zk/bin/zkServer.sh --config /application/solr/zk/conf-zk$n status | grep Mode; done

정상 기준: leader 1개 + follower 2개.

## 7. SolrCloud

    grep -H -e 'SOLR_' -e 'ZK_HOST' /application/solr/solr{1,2,3}/bin/solr.in.sh

확인 기준:

    SOLR_HOST = 대상 APP IP
    SOLR_PORT = 8983/8984/8985
    ZK_HOST = 대상 APP IP:2181,2182,2183/solr

기동 전 로그 경로를 반드시 확인:

    sudo mkdir -p /logs/solr/solr{1,2,3}; sudo chown -R admin:admin /logs/solr; ls -ld /logs/solr/solr{1,2,3}

ZooKeeper /solr 생성. 이미 있으면 Node already exists는 정상:

    printf 'create /solr ""\nquit\n' | sudo -u admin /application/solr/zk/bin/zkCli.sh -server 'APP_IP:2181,APP_IP:2182,APP_IP:2183'

configset은 mv가 아니라 zk upconfig으로 등록한다. Solr 계정이 읽도록 /data/solr_backup 아래에 둔다.

    sudo mkdir -p /data/solr_backup/restore
    sudo cp -a /home/test1/run02-solr-restore/run02-final-* /data/solr_backup/restore/
    sudo chown -R admin:admin /data/solr_backup/restore

    Z='APP_IP:2181,APP_IP:2182,APP_IP:2183'; S=/application/solr/solr1/bin/solr; C=/data/solr_backup/restore/run02-final-YYYYMMDD/configsets
    for n in _default chat-base-config; do sudo -u admin env JAVA_HOME=/usr/lib/jvm/java-1.8.0-amazon-corretto "$S" zk upconfig -z "$Z/solr" -n "$n" -d "$C/$n/conf"; done

기동과 HTTP 확인:

    for n in 1 2 3; do p=$((8982+n)); sudo -u admin bash -c "cd /application/solr/solr$n/server && /application/solr/solr$n/bin/solr start -p $p"; done
    for p in 8983 8984 8985; do printf "$p "; curl -fsS "http://127.0.0.1:$p/solr/admin/info/system?wt=json" >/dev/null && echo OK || echo FAIL; done

CoreContainer 500이면 정상 기동이 아니다. chroot, configset, permission을 확인하고 멈춘다.
collection 복원 후 6개 collection과 alias 2개를 확인한다.

## 8. Elasticsearch와 Logstash

Elasticsearch는 config-es1/2/3의 node, data, logs, repo, publish IP, 9200/9201/9202를 확인하고 3 node green 후 snapshot restore한다.

기동 전 로그와 실행 경로를 먼저 만든다. 이번 이관처럼 `/logs`, `/run`, `/tmp`가 복사 대상에서 빠진 경우 이 단계가 없으면 JVM이 `Could not create the Java Virtual Machine`으로 종료된다.

    sudo mkdir -p /logs/elk /application/elk/run /application/elk/tmp/es{1,2,3}
    sudo chown -R admin:admin /logs/elk /application/elk/run /application/elk/tmp
    ls -ld /logs/elk /application/elk/run /application/elk/tmp/es{1,2,3}

Logstash는 pipeline config test, 기동, 9600 확인, 테스트 로그 1건 적재 순서다.

## 9. YML, build, 애플리케이션

    grep -RniE 'localhost|mariadb|redis|solr|zookeeper|elasticsearch|engine:|master:|scheduler|chat-ui' /home/test1/meritz --include='application-tc.yml' --include='application-core-tc.yml' --exclude-dir=target

환경에 맞출 값: DB JDBC/port, Redis nodes, Solr URLs, ZK hosts와 /solr, ES hosts, 내부 APP URL.
외부 API, LDAP, 인증키, 개인키, 비밀번호는 의미 확인 없이 바꾸지 않는다.

    cd /home/test1/meritz
    mvn clean package -DskipTests

BUILD SUCCESS 후 JAR 배치. 기동 후 Started Application과 포트를 확인한다.

## 10. 최종 시험

    ss -lnt | grep -E ':(8081|8180|8280|8380|8480|8580|8983|8984|8985|9200|9201|9202)\b'

    [ ] CMS 로그인
    [ ] 학습 성공
    [ ] Solr collection/alias
    [ ] Chat-UI 접속
    [ ] 세션 생성
    [ ] Gateway to Engine 호출
    [ ] 신규 ERROR 없음

## 즉시 중지 기준

    DB_FAIL
    Redis cluster check 실패
    ZooKeeper quorum 실패
    Solr HTTP 500 또는 CoreContainer 미초기화
    ES green 아님
    APPLICATION FAILED
    Access denied, UnknownHost, Connection refused

오늘 2회차 종료 후 실제 경로, IP, 명령 결과를 반영해 이 초안을 최종본으로 갱신한다.

---

# 부록 A. 설정 변경 판단표

## 반드시 환경값으로 바꾸는 항목

| 영역 | 설정 | 확인 기준 |
|---|---|---|
| DB | JDBC URL | 대상 DB IP와 실제 listen port |
| DB | tbl_manage_schema.prefix_url | 대상 DB IP와 실제 port |
| Redis | nodes | 대상 Redis IP와 7000,7001,7002 |
| ZooKeeper | server.1~3 | 대상 APP IP와 peer/election port |
| Solr | SOLR_HOST | 대상 APP IP |
| Solr | ZK_HOST | 대상 IP와 마지막 /solr |
| Elasticsearch | publish host | 대상 APP IP |
| Elasticsearch | seed hosts | 대상 transport 주소 |
| 애플리케이션 | 내부 URL | 실제 서버 주소와 port |

## 함부로 바꾸지 않는 항목

| 항목 | 이유 |
|---|---|
| 외부 API URL | 고객사 외부 연계 주소일 수 있음 |
| LDAP URL | 인증 체계와 연결됨 |
| 인증키·개인키 | 보안 사고와 서비스 장애 위험 |
| clustername | 기존 클러스터와 다른 것으로 인식될 수 있음 |
| 데이터 경로 | 백업 데이터 위치와 연결됨 |
| Solr의 /solr | ZooKeeper namespace이며 파일 경로가 아님 |

## YML 수정 공통 절차

수정 전 백업:

    cp -p application-tc.yml application-tc.yml.before-migration

수정:

    vi application-tc.yml

수정 후 실제 값 확인:

    grep -nA10 '^elasticsearch:' application-tc.yml
    grep -nE 'localhost|mariadb|redis|solr|zookeeper|engine:|master:|scheduler|chat-ui' application-tc.yml

소스 YML만 바꾸고 끝내지 않는다. build 후 JAR 안의 BOOT-INF/classes 설정도 새 값인지 확인한다.

---

# 부록 B. 명령어 기호

    sudo command

root 권한으로 실행한다.

    sudo -u admin command

admin 계정으로 실행한다. runtime 파일이 admin 소유일 때 사용한다.

    command1 | command2

첫 명령 결과를 두 번째 명령에 넘긴다.

    command1 && echo OK

첫 명령이 성공했을 때만 뒤를 실행한다.

    command1 || echo FAIL

첫 명령이 실패했을 때만 뒤를 실행한다.

    command1; command2

성공 여부와 관계없이 다음 명령을 실행한다.

    for n in 1 2 3; do command; done

같은 작업을 세 번 반복한다.

    700?

7000, 7001, 7002처럼 한 글자를 대체한다.

    218[1-3]

2181, 2182, 2183 포트를 의미한다.

    --config

긴 옵션 이름이며 ZooKeeper 설정 디렉터리를 지정한다.

    --daemonize yes

프로그램을 백그라운드로 실행한다.

백슬래시는 줄이 이어진다는 뜻이다. 백슬래시 뒤에는 공백이 오면 안 된다. 현장에서는 한 줄로 입력해도 된다.

---

# 부록 C. 서비스 정상 판정

| 서비스 | 최소 정상 기준 | 다음 단계 |
|---|---|---|
| MariaDB | active, 포트 listen, 업무 DB 존재 | Redis 진행 |
| Redis | 3 masters, 16384 slots covered | ZooKeeper 진행 |
| ZooKeeper | leader 1, follower 2 | Solr 진행 |
| Solr | 8983/84/85 HTTP OK, collection 6, alias 2 | ES 진행 |
| Elasticsearch | 3 nodes, green, unassigned 0 | Logstash 진행 |
| Logstash | 9600 green, 테스트 문서 1건 | YML/build 진행 |
| APP | Started 로그와 포트 LISTEN | 기능시험 |

포트가 열려 있어도 내부 초기화가 실패할 수 있다.

    Solr: CoreContainer 미초기화
    Spring: APPLICATION FAILED TO START
    Chat-UI: failed create session
    Engine: UnknownHostException
    DB: Access denied 또는 using password: NO

이런 메시지가 있으면 포트만 보고 다음 단계로 가지 않는다.

---

# 부록 D. 오늘 2회차 실수 방지

1. Windows PowerShell 명령을 Linux SSH 창에서 실행하지 않는다.
2. /logs 아래 폴더는 admin이 만들 수 없을 수 있다. 기동 전에 root로 만들고 admin 소유로 바꾼다.
3. admin 소유 설정파일을 test1 일반 vi로 저장하면 E212가 나온다.
4. ZooKeeper가 STARTED여도 quorum을 확인한다.
5. Solr가 STARTED여도 CoreContainer HTTP 확인을 한다.
6. Solr의 ZK_HOST 끝 /solr를 삭제하지 않는다.
7. ZooKeeper에 /solr만 만들고 끝내지 않는다. configset을 upconfig해야 한다.
8. Solr restore 백업을 /home/test1 아래에 두면 admin 계정이 읽지 못할 수 있다.
9. collection restore의 status 400은 앞 시도에서 이미 만들어진 경우일 수 있다.
10. source YML 수정 후 기존 JAR를 실행하지 않는다. build와 JAR 반영 여부를 확인한다.
11. Chat-UI 화면이 열리는 것과 세션 생성 성공은 다르다.
12. Scheduler의 entityManagerFactory 오류는 이번 필수 성공 기준에서 제외하고 별도 보고한다.

---

# 부록 E. 현장 종료 보고

    APP hostname/IP:
    DB hostname/IP/port:
    MariaDB version/database/table count:
    APP to DB:
    Redis nodes/slots/keys:
    ZooKeeper leader/followers:
    Solr HTTP/collections/aliases/document count:
    Elasticsearch nodes/status/unassigned:
    Logstash API/test index:
    Master/CMS/Engine/Gateway/Chat-UI:
    CMS login/learning/Chat-UI session/chat response:

이 출력본은 오늘 2회차 종료 후 실제 고객사 환경의 경로, 계정, 포트, 성공 메시지를 반영해 최종 갱신한다.
