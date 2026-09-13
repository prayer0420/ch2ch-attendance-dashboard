# 메리츠 프로젝트 Oracle Linux 10 이관 사전 호환성 판정

## 1. 목적과 판정 범위

- 목적: 기존 Rocky Linux 9.6 기반 메리츠 챗봇 시스템을 Oracle Linux 10으로 전환할 때 애플리케이션·데이터·외부 서비스가 정상 동작하는지 사전에 검증한다.
- 로컬 실습 토폴로지:
  - APP: `meritz-ol10-01`, `192.168.50.10`, PuTTY `127.0.0.1:2222`
  - DB: `meritz-db01`, `192.168.50.20`, PuTTY `127.0.0.1:2223`
- 이 문서는 소스 정적 분석과 현재 VM 실측에 근거한 사전 판정이다. 실제 운영 이관 승인이나 제품 벤더 지원을 대신하지 않는다.
- 민감한 비밀번호·토큰·키·개인정보는 기록하지 않는다.

## 2. 결론

### 전체 판정: 조건부 진행 가능

Oracle Linux 10 자체, QEMU 네트워크, 디스크, 외부 Maven/npm 접근은 정상이다. 그러나 현재 프로젝트를 OL10 기본 패키지만으로 그대로 실행할 수는 없다.

핵심 조건은 다음과 같다.

1. 프로젝트가 요구하는 Java 8은 OL10 기본 저장소에 없으므로 별도 JDK 8 배포판이 필요하다.
2. Spring Boot `2.3.0.RELEASE`는 공식적으로 Java 8~14 범위이므로 OL10 기본 Java 21로 바로 실행하지 않는다.
3. OL10 기본 MariaDB는 `10.11.18`이지만 기존 환경 기록은 `10.6.7`이다. dump 복원과 SQL 호환성을 시험해야 한다.
4. Redis 5.0.8, Solr 7.6, ZooKeeper 3.6.1, Elasticsearch 7.8은 오래된 버전이며 OL10 기본 저장소에서 동일 버전을 제공하지 않는다.
5. 현재 소스에는 실제 운영 데이터와 전체 배포 산출물이 없으므로, 지금 가능한 것은 소스 빌드·빈/샘플 데이터 기반 기능 시험이다.
6. 완전한 이관 리허설에는 원본 DB dump, Solr backup/configset, Elasticsearch snapshot, Redis 데이터 판정, 실제 실행 스크립트와 활성 profile이 추가로 필요하다.

## 3. Oracle Linux 10 VM 실측

| 항목 | APP | DB | 판정 |
|---|---|---|---|
| OS | Oracle Linux Server 10.0 | Oracle Linux Server 10.0 | 통과 |
| 커널 | UEK8 `6.12.0-100.28.2.el10uek.x86_64` | 동일 | 통과 |
| 아키텍처 | `x86_64` | `x86_64` | 통과 |
| glibc | `2.39` | 동일 계열 | 네이티브 바이너리는 별도 시험 |
| 메모리 | 약 7.3GiB | 약 5.3GiB | 전체 동시 기동에는 부족 가능성 높음 |
| 루트 여유 | 약 42GiB | 약 42GiB | 샘플 실습 통과, 실데이터 용량은 미확정 |
| SELinux | Enforcing | Enforcing | 유지하여 시험 |
| firewalld | active | active | 필요한 포트만 허용 |
| 내부망 | `192.168.50.10/24` | `192.168.50.20/24` | 양방향 ping 통과 |
| 외부 저장소 | Maven/npm HTTP 200 | Oracle DNF 정상 | 통과 |

## 4. 소스 구성 판정

### 확인된 구조

- 소스 위치: 회사 컴퓨터 `C:\Users\c\Downloads\meritz-main\meritz`
- 파일 5,168개, 약 135MB
- Java 파일 2,711개
- Maven 멀티모듈:
  - `common`
  - `persistence`
  - `cms`
  - `engine`
  - `gateway`
  - `chat-ui`
  - `scheduler`
  - `master`
- 모든 서비스 모듈의 POM packaging은 `jar`이다.
- 루트 POM은 Java `1.8`, Spring Boot `2.3.0.RELEASE`를 지정한다.
- 실행 서비스용 완성 JAR/WAR는 포함되지 않았다.
- 포함된 JAR는 `libs/simplecaptcha-1.2.1.jar`이며 CMS와 Master가 system scope로 참조한다.
- DAMO 관련 `scpdb.jar` 의존성은 POM에서 주석 처리되어 현재 빌드 필수요소는 아니다.

### 배포 문서와 소스 불일치

- 배포 매뉴얼: Gradle로 WAR를 만들고 WildFly/JBoss에 배포하는 과거 절차
- 현재 소스: Maven POM과 Spring Boot 실행형 JAR 구조
- 현재 저장소에는 Gradle 빌드 파일이 확인되지 않았다.
- 판정: 매뉴얼의 `gradle ... build`, `ROOT.war` 교체 절차를 현재 소스에 그대로 적용하지 않는다.
- 로컬 실습 기준 빌드 후보: 루트에서 Maven reactor build 후 각 실행형 JAR 기동
- 실제 운영 이관에서는 현재 운영 서버의 JAR/WAR, 시작 스크립트, WildFly 사용 여부를 다시 확인해야 한다.

## 5. 런타임·서비스 호환성 매트릭스

| 구성요소 | 기존/소스 요구 | OL10 확인 | 판정 | 실습 전략 |
|---|---|---|---|---|
| Java | Java 8 | 기본 저장소 Java 21 | 조건부/핵심 위험 | 검증된 x86_64 JDK 8을 별도 설치하고 checksum 기록 |
| Maven | Maven 3.3+ | 3.9.9 제공 | 통과 예상 | JDK 8로 Maven 실행 후 전체 reactor build |
| Spring Boot | 2.3.0.RELEASE | Java 8~14 공식 호환 | 조건부 | Java 8 유지, Java 21 직접 실행 금지 |
| MariaDB | 기존 10.6.7, JDBC 2.7.5 | OL10 10.11.18 | 버전 호환 시험 필요 | dump 복원·문자셋·SQL mode·계정 인증 검증 |
| Redis | 기존 5.0.8, Jedis cluster | 기본 패키지 없음 | 고위험/EOL | 격리 실습에서 동일 버전 재현 후 업그레이드 별도 평가 |
| Solr | 7.6 | 동일 기본 패키지 없음 | 고위험/EOL | Java 8 기반 단일/축소 SolrCloud 시험, configset 필요 |
| ZooKeeper | 3.6.1 | 동일 기본 패키지 없음 | 조건부/EOL 위험 | 단일 노드 또는 축소 ensemble, Solr 연동 확인 |
| Elasticsearch | 7.8.0 client/server 기록 | 동일 기본 패키지 없음 | 고위험/현 OL10 지원 밖 | 7.8 격리 재현 후 snapshot/API/클라이언트 호환 검증 |
| Node/Vue | Node >=6, Vue 2.6.11, Webpack 3 | OL10 Node 22 계열 | 빌드 호환 위험 | lockfile·vendored tgz 활용, 별도 구버전 Node 빌드 환경 검토 |
| Podman | 소스에 CMS/Master Dockerfile | OL10 Podman 5.8.2 제공 | 도구 사용 가능 | 컨테이너 방식은 별도 시험 경로로 유지 |

참고 공식 문서:

- Oracle Linux 10 AppStream: https://docs.oracle.com/en/operating-systems/oracle-linux/product-lifecycle/ol10_application_streams.html
- Spring Boot 2.3 요구사항: https://docs.spring.io/spring-boot/docs/2.3.0.RELEASE/reference/html/getting-started.html
- Maven 3.9 요구사항: https://maven.apache.org/docs/3.9.0/release-notes.html
- Elastic 지원 매트릭스: https://www.elastic.co/support/matrix/
- Redis 지원 버전: https://redis.io/docs/latest/operate/oss_and_stack/install/version-mgmt/
- MariaDB 설치 문서: https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/installing-mariadb/binary-packages/rpm/yum

## 6. 확인된 서비스 포트

| 서비스 | 애플리케이션 포트 |
|---|---:|
| Gateway | 8081 |
| Engine | 8180 |
| CMS | 8280 |
| Master | 8380 |
| Chat UI | 8480 |
| Scheduler | 8580 |
| MariaDB 기존 설정 | 13306 |
| Redis 기존 설정 | 7000/7001/7002 또는 profile별 6379 |
| ZooKeeper 기존 설정 | 2181/2182/2183 |
| Solr 기존 설정 | 8983/8984/8985 |
| Elasticsearch | 9200, transport 9300 계열 |

## 7. 설정·컨테이너 위험

### 프로파일과 주소

- `dev`, `prod`, `tb`, `tc`, `local` 등 여러 설정이 공존한다.
- 메리츠 `tc` 설정은 MariaDB `mariadb1:13306/meritz_easycms`를 사용한다.
- Redis, Solr, ZooKeeper, Elasticsearch, Master, Scheduler, Engine 주소가 hostname 또는 과거 사설 IP로 하드코딩되어 있다.
- 외부 KT 로그인, LDAP, 메시징, API 주소도 포함되어 있다.
- 로컬 실습에서 `prod` profile을 그대로 기동하면 안 된다.
- 별도의 `ol10lab` 외부 설정을 만들고 DB·검색·캐시 주소와 비활성 외부 연계를 명시해야 한다.
- 실제 비밀번호와 암호화 키는 문서에 넣지 않고 VM 내부 권한 제한 파일 또는 승인된 비밀 관리 방식으로 제공한다.

### Dockerfile 오류·불일치

- CMS 실제 포트는 8280인데 Dockerfile은 `EXPOSE 8380`이다.
- Master 실제 포트는 8380인데 Dockerfile은 `EXPOSE 8480`이다.
- `EXPOSE`는 실제 수신 포트를 바꾸지는 않지만 운영자와 포트 매핑을 오도한다.
- CMS와 Master만 Dockerfile이 있고 나머지 서비스에는 동일한 컨테이너 정의가 없다.
- 두 Dockerfile은 `amazoncorretto:8-alpine-jre`를 사용하므로 프로젝트가 Java 8 런타임을 전제로 한다는 추가 근거다.

### 파일시스템

- 확인된 절대경로:
  - `/application/cms/data`
  - `/application/cms/meritz_data`
  - `/logs/<service>`
  - `/data/logs/...`
  - `${user.home}/script/solrBackup.sh`
- 전용 서비스 계정, 디렉터리 소유권, SELinux label, 로그 회전 정책을 함께 구성해야 한다.
- SELinux나 firewalld 전체를 끄는 방식은 호환성 성공으로 인정하지 않는다.

## 8. 로컬 2-VM 실습 설계

### 권장 배치

#### DB VM `meritz-db01`

- MariaDB 10.11.18
- 포트 13306으로 기존 설정과 맞추거나 외부 설정에서 3306으로 명시
- DB명 `meritz_easycms`
- 테스트 전용 계정과 최소 권한
- APP `192.168.50.10`에서만 DB 포트 접근 허용

#### APP VM `meritz-ol10-01`

- JDK 8, Maven
- Redis 축소 구성
- ZooKeeper 및 Solr 축소 구성
- Elasticsearch 단일 노드
- Master, CMS, Engine, Gateway, Chat UI
- Scheduler는 마지막에 한 번만 기동

### 자원 판정

- APP 8GiB에서 모든 구성요소를 동시에 실행하는 것은 권장하지 않는다.
- 선택지 A: APP 메모리를 12GiB로 늘리고 각 Java heap을 작게 제한한다.
- 선택지 B: 8GiB를 유지하고 구성요소별·서비스별로 순차 검증한다.
- 전체 클러스터 성능이나 HA 검증은 현재 2-VM/32GB 호스트 구성의 범위 밖이다.
- 이번 실습 성공 기준은 OL10 기능 호환성이지 운영 성능·고가용성 인증이 아니다.

## 9. 현재 부족한 이관 입력자료

다음 자료 없이는 완전한 데이터 이관 검증을 완료할 수 없다.

- 현재 운영/개발 서버에서 실제 사용 중인 JDK 배포판과 정확한 patch 버전
- 실제 배포 JAR/WAR 및 SHA256
- 실제 시작·중지 스크립트, systemd unit, JVM 옵션, `runtime.env`
- 최종 활성 Spring profile과 외부 설정 파일 우선순위
- MariaDB schema+data dump와 문자셋·collation·SQL mode
- DB 사용자/권한 목록의 비밀값 제외본
- Redis RDB/AOF 보존 여부와 cluster topology
- Solr configset, collection/alias 목록과 backup
- ZooKeeper chroot·znode 구성
- Elasticsearch snapshot, index/template/alias/pipeline 목록
- Logstash pipeline과 plugin 목록
- 인증서·truststore·keystore 목록과 만료일(개인키 제외)
- 정상 판정에 사용할 테스트 botCode와 기대 응답

## 10. 실습 전 반드시 처리할 사항

1. 양쪽 VM의 중복 NetworkManager 프로필 `Wired connection 1` 자동 연결을 끈다.
2. 두 VM을 정상 종료하고 설치 전 qcow2 기준 snapshot 또는 안전 복사본을 만든다.
3. APP 메모리를 12GiB로 늘릴지 순차 검증으로 갈지 확정한다.
4. 실습 전용 외부 설정 `application-ol10lab.yml`을 작성한다.
5. 운영/개발 외부 API 호출과 기존 DB·검색엔진 주소를 모두 차단 또는 대체한다.
6. Java 8 배포본의 공급처·라이선스·checksum을 확정한다.
7. DB부터 구성하고 APP→DB TCP 연결을 확인한 후 캐시·검색·애플리케이션 순으로 진행한다.

## 11. 권장 설치·검증 순서

1. VM clean baseline 백업
2. NetworkManager 중복 profile 정리
3. JDK 8·Maven 설치 및 버전 증적
4. 프로젝트 전송 및 SHA256
5. Maven compile/package 시험
6. MariaDB 설치·포트·문자셋 설정
7. 제공 SQL 또는 승인된 dump 복원
8. DB 접속·CRUD 검증
9. Redis 구성 및 세션/캐시 검증
10. ZooKeeper→Solr 구성 및 검색 검증
11. Elasticsearch 구성 및 API 검증
12. Master→CMS→Engine→Gateway→Chat UI 순차 기동
13. Scheduler 단일 기동
14. 포트·로그·프로세스·API·시뮬레이터 검증
15. 재부팅 후 자동 기동과 재검증

## 12. 최종 성공 기준

- Oracle Linux 10이 `running`이며 SELinux `Enforcing`, firewalld `active` 상태를 유지한다.
- APP·DB 내부망과 필요한 TCP 포트만 통신한다.
- 프로젝트가 JDK 8로 재현 가능하게 빌드된다.
- MariaDB schema와 샘플/승인 데이터가 정상 복원되고 읽기·쓰기가 된다.
- Redis, Solr, ZooKeeper, Elasticsearch가 각 API 수준에서 정상 응답한다.
- 여섯 애플리케이션의 실제 포트와 로그가 정상이다.
- 기존 운영/개발 주소로 의도하지 않은 연결을 시도하지 않는다.
- 정상 기준 botCode에서 Gateway 응답 `HTTP 200`, 업무 코드 정상, 유효 sessionKey와 메시지를 확인한다.
- VM 재부팅 후 네트워크와 필요한 서비스가 재현된다.
- 실패 시 clean baseline으로 되돌릴 수 있다.
