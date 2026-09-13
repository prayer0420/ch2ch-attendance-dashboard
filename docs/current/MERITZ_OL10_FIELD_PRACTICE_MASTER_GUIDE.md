# 메리츠 CMS Oracle Linux 10 전환 사전실습·현장대응 종합 가이드

## 1. 이 문서의 목적

이 문서는 단순히 Oracle Linux 10에 프로그램을 설치하는 설명서가 아니다. 실제 고객사 개발계에 들어가기 전에 로컬 QEMU 환경에서 가능한 실패를 먼저 재현하고, 원인과 해결 방법과 증적을 남기는 것이 목적이다.

최종 목표는 다음 한 문장으로 정의한다.

> Oracle Linux 10으로 바뀐 고객사 개발계에서 CMS 웹 화면만 열리는 수준을 넘어, 로그인·조회·등록·수정·검색·챗봇 호출·세션·로그·스케줄 작업 등 실제 업무 기능이 정상 동작함을 증명한다.

이를 위해 모든 문제를 다음 세 범주로 나누어 판단한다.

| 범주 | 의미 | 대표 사례 |
|---|---|---|
| OS 전환 문제 | Oracle Linux 10으로 바뀌면서 발생 | Java 8 부재, 패키지명 변경, SELinux 차단, OpenSSL/TLS 변화, systemd·권한·경로 문제 |
| 구성·연결 문제 | OS와 무관하게 주소·포트·계정·설정이 잘못됨 | CMS가 예전 DB 주소를 봄, DNS 실패, 방화벽 포트 누락, profile 오선택 |
| 데이터·애플리케이션 문제 | 데이터 또는 업무 로직 자체의 문제 | DB dump 불완전, Solr collection 누락, 잘못된 botCode, 소스 결함 |

현장에서 오류가 발생했을 때 무조건 “Oracle Linux 10 호환성 문제”라고 결론 내리지 않는다. 반대로 기존 OS에서 잘 됐다는 이유로 OL10에서도 당연히 된다고 가정하지도 않는다. 같은 요청을 기존 개발계와 OL10 개발계에 각각 실행하고, 설정·로그·응답·데이터를 비교하여 범주를 판정한다.

---

## 2. 지금까지 완료된 것과 아직 완료되지 않은 것

### 완료된 로컬 기반 환경

현재 로컬 실습 환경에서는 서버를 설치하고 서로 통신시킬 수 있는 기반까지 준비됐다.

| 항목 | APP VM | DB VM | 상태 |
|---|---|---|---|
| 호스트명 | `meritz-ol10-01` | `meritz-db01` | 완료 |
| OS | Oracle Linux Server 10.0 | Oracle Linux Server 10.0 | 완료 |
| 커널 | UEK8 `6.12.0-100.28.2.el10uek.x86_64` | 동일 | 완료 |
| SSH | 회사 PC `127.0.0.1:2222` | 회사 PC `127.0.0.1:2223` | 완료 |
| 사설 IP | `192.168.50.10/24` | `192.168.50.20/24` | 완료 |
| APP↔DB 통신 | DB 방향 ping 성공 | APP 방향 ping 성공 | 완료 |
| SELinux | Enforcing | Enforcing | 유지 |
| firewalld | active | active | 유지 |
| 중복 NIC 프로필 | 자동 연결 해제 | 자동 연결 해제 | 완료 |
| 설치 전 백업 | `meritz-app-baseline.qcow2` | `meritz-db-baseline.qcow2` | SHA256 비교 완료 |

이 상태는 **서버 기반 준비 완료**이지 **메리츠 시스템 구축 완료**가 아니다.

### 아직 해야 하는 서버·애플리케이션 구성

- 검증된 Java 8 설치와 `JAVA_HOME` 확정
- Maven 설치 및 전체 멀티모듈 소스 빌드
- MariaDB 설치, 포트·문자셋·계정·스키마·데이터 구성
- Redis 구성 및 세션/캐시/클러스터 사용 방식 확인
- ZooKeeper와 Solr 구성, configset·collection·alias 복원
- Elasticsearch 구성, index·template·alias·pipeline 복원
- Logstash pipeline과 plugin 구성
- CMS, Master, Chat UI, Gateway, Engine, Scheduler 배포
- 실습 전용 Spring profile과 외부 설정 작성
- 필요한 포트에 대한 firewalld 정책 구성
- 파일 경로·소유권·SELinux context 구성
- 서비스별 systemd unit·시작 순서·재부팅 후 자동 기동 검증
- CMS 실제 업무 기능과 챗봇 전체 흐름 검증

따라서 현재 진행률을 개념적으로 표현하면 다음과 같다.

```text
VM/OS/SSH/기본 네트워크/복구 기준점       완료
런타임·DB·미들웨어·애플리케이션 설치      미착수
데이터 이관                              실제 자료 미수령
CMS 업무 기능 검증                       미착수
재부팅·장애·롤백 리허설                  미착수
```

---

## 3. 고객사 개발계는 이미 준비돼 있을 수 있는데 왜 로컬에서 다시 하는가

고객사 개발계에 VM, OS, IP, 디스크, 계정, 미러링이 이미 준비돼 있을 수 있다. 그래도 로컬 실습이 필요한 이유는 인프라 생성과 애플리케이션 호환성 검증이 서로 다른 작업이기 때문이다.

고객사가 준비했다는 말만으로 다음 항목까지 완료됐다고 해석하면 안 된다.

- Java 8이 OL10에서 정상 실행되는가
- 현재 프로젝트가 실제 Maven 소스로 빌드되는가
- 기존 배포 JAR/WAR와 현재 소스의 관계가 일치하는가
- MariaDB 10.6 기반 dump가 10.11에서 문제없이 복원되는가
- Redis 5, Solr 7.6, ZooKeeper 3.6.1, Elasticsearch 7.8을 어떤 방식으로 제공할 것인가
- SELinux Enforcing 상태에서 파일·포트·프로세스 접근이 허용되는가
- CMS가 과거 서버가 아니라 신규 개발계 DB와 검색엔진을 보는가
- 실제 CMS 기능이 끝까지 동작하는가

### “미러링 완료”라는 말은 반드시 범위를 확인한다

미러링은 현장에서 여러 뜻으로 사용된다. 다음 중 무엇인지 확인하지 않으면 위험하다.

| 가능한 의미 | 실제로 복제되는 것 | 복제되지 않을 수 있는 것 |
|---|---|---|
| VM 템플릿/디스크 복제 | OS와 디스크 블록 | 새 IP, hostname, SSH host key, 외부 연결값 |
| 스토리지 미러링 | 디스크 데이터 | 실행 중 데이터의 애플리케이션 일관성 |
| DB replication | DB 변경 데이터 | 사용자 권한, 외부 파일, Redis/Solr/ES 데이터 |
| 파일 동기화 | 지정 디렉터리 | DB·검색 인덱스·메모리 상태 |
| 서비스 이중화 | 일부 프로세스와 트래픽 | 설정 동일성, Scheduler 중복 실행 방지 |

현장 착수 전에 고객사에 최소한 다음을 질문해야 한다.

- 무엇을 무엇으로 미러링했는가
- 최초 동기화와 증분 동기화 시각은 언제인가
- DB는 dump/restore인지 replication인지 물리 복사인지
- Redis, Solr, Elasticsearch 데이터도 포함되는지
- 설정 파일·인증서·업로드 파일·로그도 포함되는지
- 미러링 중 양쪽 쓰기가 가능한지, 최종 동기화 시점은 어떻게 통제하는지
- 장애 시 어느 서버로 어떤 절차로 되돌리는지

“미러링됐다”는 말은 검증 완료 증거가 아니다. 원본과 대상의 버전·파일 checksum·데이터 건수·서비스 응답을 비교해야 한다.

---

## 4. 서비스 연결은 OS와 무관한가

### 맞는 부분

MariaDB, Redis, Solr, ZooKeeper, Elasticsearch, Logstash, CMS 같은 구성요소는 TCP/IP, HTTP, JDBC, Redis protocol 등의 표준 연결 방식을 사용한다. 주소·포트·인증·프로토콜이 같고 양쪽 프로그램이 정상 실행된다면 Linux 배포판 이름 자체는 통신 패킷에 거의 나타나지 않는다.

예를 들어 CMS가 MariaDB에 접속할 때 중요한 기본값은 다음과 같다.

```text
목적지 주소: 192.168.50.20
목적지 포트: 13306
프로토콜/드라이버: MariaDB JDBC
DB 이름: meritz_easycms
계정 권한: 필요한 스키마에 대한 최소 권한
```

CMS는 상대 서버가 Oracle Linux인지 Rocky Linux인지 직접 물어보고 접속하는 것이 아니다.

### 그러나 실제 이관에서는 OS가 매우 중요하다

연결을 수행하는 프로그램이 실행돼야 연결도 가능하다. OS가 바뀌면 다음 기반 조건이 달라질 수 있다.

- 같은 버전의 Java와 패키지가 저장소에 존재하는지
- 오래된 프로그램이 새로운 glibc, OpenSSL, 커널에서 실행되는지
- systemd unit과 환경변수가 이전과 같은지
- 파일 소유자·권한·SELinux context가 맞는지
- firewalld zone과 포트가 맞는지
- DNS·hostname·`/etc/hosts` 해석이 맞는지
- TLS 인증서와 truststore가 새로운 암호화 정책을 통과하는지
- 메모리 제한, open files, process limit, cgroup 동작이 맞는지
- 시간대·locale·문자 인코딩이 맞는지

따라서 정확한 결론은 다음과 같다.

> 서비스 연결 규약은 대체로 OS 독립적이지만, 서비스 실행 환경과 보안·네트워크·파일시스템은 OS 의존적이다. 이번 이관의 핵심은 연결 주소를 옮기는 것과 동시에, 그 연결을 수행하는 구버전 소프트웨어가 Oracle Linux 10에서 재현되는지 증명하는 것이다.

---

## 5. 사전검증에서 실제로 확인한 내용과 의미

### OS·CPU·메모리·디스크

- 두 VM 모두 Oracle Linux Server 10.0과 UEK8 커널로 부팅됐다.
- APP 4 vCPU/약 7.3GiB, DB 2 vCPU/약 5.3GiB가 게스트에서 인식됐다.
- 각 루트 파일시스템은 XFS이며 약 42GiB 여유가 있다.
- APP 게스트는 호스트 CPU와 AVX2를 확인했고 WHPX 가속으로 부팅됐다.
- `systemctl is-system-running` 결과가 `running`이었다.

의미:

- OL10 자체가 현재 QEMU/WHPX 환경에서 실행되는 기반 조건은 통과했다.
- 이것은 CMS 호환성 통과를 뜻하지 않는다.
- APP 8GiB 안에 앱 6개와 Redis·Solr·ZooKeeper·Elasticsearch를 모두 동시에 올리면 메모리가 부족할 가능성이 높다. 로컬에서는 구성요소를 순차 검증하거나 APP 메모리를 늘려야 한다.

### 네트워크·SSH

- 회사 Windows의 `127.0.0.1:2222`는 APP SSH 22번으로 전달된다.
- 회사 Windows의 `127.0.0.1:2223`은 DB SSH 22번으로 전달된다.
- QEMU socket network를 통해 APP `192.168.50.10`과 DB `192.168.50.20`이 양방향 통신한다.
- 중복된 `Wired connection 1`의 autoconnect를 꺼서 재부팅 시 사설 IP 경합 위험을 제거했다.

의미:

- PuTTY 관리 통로와 APP↔DB 업무 통로를 분리했다.
- ping 성공은 IP 계층 통과만 뜻한다. MariaDB 설치 후에는 `192.168.50.20:13306` TCP와 실제 JDBC 로그인을 별도로 확인해야 한다.

### 보안 기본 상태

- SELinux는 `Enforcing`이다.
- firewalld는 `active`다.
- 이 두 기능을 끄지 않은 상태로 실습한다.

의미:

- 보안 기능을 끄면 당장은 실행돼도 고객사 환경에서 재현되지 않을 수 있다.
- 오류가 발생하면 SELinux·방화벽이 원인인지 증적으로 판정하고 필요한 최소 정책만 추가한다.

### 패키지 저장소와 외부 접근

- OL10 BaseOS, AppStream, UEK 저장소가 정상이다.
- APP에서 Maven Central과 npm registry HTTP 접근을 확인했다.
- OL10 저장소에서 Maven과 Java 21은 제공되지만 Java 8은 확인되지 않았다.
- DB 저장소에서 MariaDB 10.11 계열은 제공되지만 Redis 패키지는 확인되지 않았다.

Oracle의 OL10 AppStream 목록은 OpenJDK 21, Node.js 22, MySQL 8.4 등을 제시한다. 현재 메리츠 소스의 Spring Boot 2.3.0.RELEASE는 공식적으로 Java 8이 필요하고 Java 14까지의 호환 범위를 명시한다. 따라서 OL10 기본 Java 21로 바로 실행하는 것은 이번 검증의 안전한 출발점이 아니다.

공식 근거:

- Oracle Linux 10 AppStreams: https://docs.oracle.com/en/operating-systems/oracle-linux/product-lifecycle/ol10_application_streams.html
- Spring Boot 2.3.0.RELEASE 요구사항: https://docs.spring.io/spring-boot/docs/2.3.0.RELEASE/reference/html/getting-started.html
- Maven 3.9 요구사항: https://maven.apache.org/docs/3.9.0/release-notes.html

### 프로젝트 소스 정적 분석

확인된 회사 PC 소스 경로는 `C:\Users\c\Downloads\meritz-main\meritz`다.

- 약 5,168개 파일, Java 파일 약 2,711개
- 루트 Maven 멀티모듈 프로젝트
- 모듈: `common`, `persistence`, `cms`, `engine`, `gateway`, `chat-ui`, `scheduler`, `master`
- Java source/target 1.8
- Spring Boot 2.3.0.RELEASE
- 서비스 모듈 packaging은 `jar`
- 완성된 서비스 JAR/WAR는 소스 묶음에 없음
- 포함된 별도 라이브러리는 `libs/simplecaptcha-1.2.1.jar`
- DAMO `scpdb.jar` 의존성은 현재 POM에서 주석 처리됨

가장 중요한 불일치는 과거 배포 문서가 Gradle·WildFly/JBoss·WAR 배포를 설명하지만 현재 소스는 Maven·Spring Boot JAR 구조라는 점이다. 실제 고객사에서 무엇을 실행 중인지 확인하기 전까지 과거 매뉴얼을 그대로 사용해서는 안 된다.

여기서 말하는 과거 배포 문서는 받은 소스 안의 다음 두 파일이다.

- `docs/99.ETC/aicc_chatbot_deploy_manual.md`
- `docs/99.ETC/b2b_aicc_easycms_deploy_manual.md`

이 문서들은 CentOS 7.6 기반 서버, `gradle -p ./<module> clean build`, `*-SNAPSHOT.war`, `/jboss/applications/`, `/jboss/domains/`, `ROOT.war` 교체 절차를 설명한다. 반면 현재 받은 소스 최상위에는 `pom.xml`이 있고 서비스 모듈 packaging은 `jar`이며 Gradle build 파일은 확인되지 않았다. 2026-09-12 사용자 확인으로 두 문서는 현재 메리츠 배포절차가 아닌 틀린 과거 매뉴얼로 확정했다. 이번 로컬 실습과 고객사 작업에서 이 문서의 Gradle·WAR·JBoss 절차를 사용하지 않는다. 다만 과거 구조가 섞인 이유를 추적해야 할 때 참고 증적으로만 보존한다.

현장에서 반드시 대조할 자료:

- 현재 배포 파일명과 SHA256
- `ps -ef`에 나타나는 실제 Java 실행 명령
- systemd unit 또는 시작 스크립트
- `java -version`과 JDK 공급사·patch 버전
- `-jar` 실행인지 WildFly 배포인지
- 활성 Spring profile
- 외부 설정 파일과 환경변수의 우선순위

---

## 6. 전체 서비스 연결 구조와 검증 관점

### 대표 업무 흐름

```text
사용자 브라우저
  → DNS/VIP/HAProxy 또는 직접 웹 포트
  → CMS 또는 Chat UI
  → Gateway
  → Engine
  → MariaDB / Redis / SolrCloud / Elasticsearch / 외부 연계

관리·배치 흐름
  Master / CMS / Scheduler
  → MariaDB / Redis / Solr / Elasticsearch

검색 흐름
  Engine 또는 CMS
  → Solr
  → ZooKeeper가 SolrCloud 구성과 상태를 관리

로그 흐름
  애플리케이션·시스템 로그
  → Logstash
  → Elasticsearch
  → 필요 시 Kibana에서 조회
```

### 현재 확인된 대표 포트

| 구성요소 | 대표 포트 | 검증 의미 |
|---|---:|---|
| Gateway | 8081 | 외부/Chat UI 요청 진입 |
| Engine | 8180 | 챗봇 엔진 호출 |
| CMS | 8280 | 관리자 웹과 API |
| Master | 8380 | 관리 서비스 |
| Chat UI | 8480 | 사용자 채팅 UI |
| Scheduler | 8580 | 배치·예약 작업 |
| MariaDB | 13306 | 현재 소스의 메리츠 프로파일 기준 |
| Redis | 7000/7001/7002 또는 6379 | cluster/profile 확인 필요 |
| Redis cluster bus | 서비스 포트+10000 | 예: 17000, 노드 간 통신 |
| ZooKeeper | 2181/2182/2183 | 환경별 노드 포트 확인 |
| Solr | 8983/8984/8985 | 환경별 Solr 노드 HTTP |
| Elasticsearch | 9200 | HTTP API |
| Elasticsearch | 9300 | 노드 transport |
| HAProxy/Web | 80/443 | 최종 사용자 진입 |
| Logstash | 5000/5044/9600 등 | 실제 pipeline으로 확정 |

포트 번호만 열려 있다고 기능이 정상인 것은 아니다. 각 연결은 다음 네 단계로 확인한다.

```text
이름 해석 성공
→ TCP 포트 연결 성공
→ 프로토콜 로그인/API 성공
→ 실제 업무 데이터 읽기·쓰기 성공
```

---

## 7. 구성요소별 Oracle Linux 10 위험과 실습 목표

### Java 8·Spring Boot·Maven

현재 프로젝트의 가장 먼저 만날 가능성이 높은 OS 전환 문제다.

예상 문제:

- OL10 기본 저장소에 프로젝트용 Java 8이 없음
- Java 21로 빌드 또는 실행하면 오래된 Spring·라이브러리에서 오류 가능
- `JAVA_HOME`과 실제 `java` 명령이 서로 다른 버전을 가리킴
- Maven은 실행되지만 compiler source/target 또는 plugin에서 실패
- 사설 Maven repository, 폐기된 HTTP repository, 인증서 문제
- `simplecaptcha` system-scope JAR의 상대 경로 불일치
- 오래된 네이티브 라이브러리가 glibc 2.39에서 로딩 실패

대표 오류 형태:

- `UnsupportedClassVersionError`: 빌드 JDK와 실행 JDK의 class version 불일치
- `NoSuchMethodError`, `ClassNotFoundException`: dependency 버전·패키징 누락
- `PKIX path building failed`: Maven/외부 HTTPS 인증서 trust 문제
- `Could not resolve dependencies`: 인터넷·프록시·repository·artifact 문제
- `lib*.so: cannot open shared object file`: 네이티브 라이브러리 또는 loader path 문제

실습 목표:

- 승인 가능한 x86_64 JDK 8 배포본 확보
- 설치 파일 SHA256과 공급처 기록
- `java -version`, `javac -version`, `mvn -v`가 모두 같은 Java 8을 가리키는지 증적
- 루트 POM 전체 reactor build
- 각 모듈 산출물 목록과 SHA256 기록
- 실제 실행 JAR인지 plain JAR인지 확인

### MariaDB

기존 기록은 MariaDB 10.6.7이고 OL10 저장소에서 확인된 버전은 10.11.18이다. TCP/JDBC는 OS와 무관해도 DB 버전 차이는 SQL과 데이터 동작에 영향을 준다.

예상 문제:

- dump의 DEFINER 계정이 대상에 없음
- 문자셋·collation 차이
- `sql_mode` 차이로 기존 SQL이 실패
- reserved word 또는 함수 동작 차이
- 계정 인증 plugin·host 권한 차이
- 대소문자 테이블명 처리 차이
- timezone table·서버 시간대 차이
- JDBC URL이 과거 hostname `mariadb1`을 계속 가리킴
- 3306과 13306 포트 혼동
- dump 일부 실패 후 같은 dump를 반복 실행해 데이터 상태가 더 꼬임

실습 목표:

- MariaDB 버전 전략 확정: 동일 10.6 재현 또는 10.11 호환 시험
- 원본의 DB명, 문자셋, collation, `sql_mode`, timezone 증적
- schema-only 복원 후 오류 확인
- 승인된 sample/full dump 복원
- 테이블 수·핵심 행 수·대표 데이터 비교
- APP에서 실제 DB 로그인과 CRUD 확인
- CMS 화면의 등록·수정 결과가 DB에 지속되는지 확인

현재 권장 결정은 로컬 OL10 실습에서 우선 OL10 저장소의 MariaDB `10.11.18`을 사용해 10.6 dump 호환성을 시험하는 것이다. 이유는 10.11이 장기 유지 계열이고, MariaDB가 10.6→10.11 직접 업그레이드 절차를 공식 제공하며, OL10의 패키지·systemd·보안 업데이트 체계와 자연스럽게 맞기 때문이다. 애플리케이션 쪽 MariaDB JDBC driver `2.7.5`는 첫 시험에서 그대로 유지하여 DB 서버 버전 외의 변수를 늘리지 않는다.

다만 10.11 채택은 설치 성공만으로 확정하지 않는다. 원본 10.6의 `my.cnf`, storage engine, compression plugin, 문자셋·collation, `sql_mode`, 사용자 권한을 수집하고 logical dump 복원·테이블 검사·CMS CRUD를 통과해야 한다. 새 10.11 서버에 사용자 schema/data만 logical dump로 복원하는 방식이라면 보통 구버전 system table을 옮기지 않으므로 `mariadb-upgrade`가 핵심 단계는 아니다. 기존 10.6 datadir을 물리적으로 넘기거나 같은 서버에서 package를 major upgrade하는 경우에는 백업 후 `mariadb-upgrade`와 공식 절차가 필요하다. 실패하면 10.6과 10.11의 설정/SQL 차이를 원인별로 분리한다. 고객사가 제품 인증 또는 계약 때문에 정확히 10.6을 요구한다면 10.6 패키지 공급·OL10 지원 여부를 고객사/DB 벤더와 먼저 확정하고, 이를 별도 비교 경로로 시험한다. 단지 기존과 같다는 이유만으로 지원이 끝난 구버전을 신규 OS의 최종안으로 고정하지 않는다.

공식 근거:

- MariaDB 10.6→10.11 절차와 비호환 변경: https://mariadb.com/docs/server/server-management/install-and-upgrade-mariadb/upgrading/mariadb-community-server-upgrade-paths/upgrading-from-mariadb-10-6-to-mariadb-10-11
- MariaDB 10.11 장기 유지 정보: https://mariadb.com/docs/release-notes/mariadb-community-server-release-notes/mariadb-10-11-series/what-is-mariadb-1011

주의:

- 실행 중인 datadir을 임의 복사하지 않는다.
- dump 실패 뒤 원인 확인 없이 같은 파일을 반복 실행하지 않는다.
- 실제 비밀번호는 문서나 채팅에 기록하지 않는다.

### Redis

기존 기록은 Redis 5.0.8이며 매우 오래된 계열이다. Redis는 캐시뿐 아니라 세션·큐·업무 상태를 저장할 수 있으므로 “비워도 되는 캐시”라고 가정하면 안 된다.

예상 문제:

- OL10 기본 저장소에 동일 버전이 없음
- 오래된 binary/container와 새로운 OS의 호환성 문제
- standalone과 cluster 설정 혼동
- `bind`, `protected-mode`, announce IP가 과거 주소
- Redis cluster의 node ID·slot·replica 관계 불일치
- 방화벽에서 서비스 포트만 열고 cluster bus 포트를 누락
- Java Jedis client와 서버 버전·TLS 설정 불일치
- 세션 데이터 미이관으로 로그인 또는 대화가 끊김

실습 목표:

- Redis가 캐시·세션·큐 중 무엇에 쓰이는지 코드와 운영 설정으로 확정
- 데이터 보존이 필요하면 RDB/AOF 정책과 일관성 시점 확정
- cluster 사용 시 모든 16,384 slot과 master/replica 상태 확인
- APP에서 SET/GET 수준이 아니라 실제 CMS 로그인 세션 또는 Gateway sessionKey 확인

Redis의 현재 지원 버전 정책은 Redis 공식 version management 문서에서 다시 확인한다: https://redis.io/docs/latest/operate/oss_and_stack/install/version-mgmt/

### ZooKeeper·Solr

ZooKeeper는 SolrCloud의 노드·collection·configset 상태를 조정한다. Solr 프로세스만 떠도 ZooKeeper 주소나 configset이 틀리면 검색 기능은 실패한다.

예상 문제:

- ZooKeeper `myid`, server 목록, chroot 불일치
- Solr가 예전 ZK ensemble을 바라봄
- configset 누락 또는 버전 차이
- collection은 보이지만 replica가 down
- alias가 누락돼 애플리케이션이 실제 collection을 찾지 못함
- 방화벽·hostname 문제로 노드가 자기 자신을 잘못 광고
- 오래된 Solr/ZK와 Java 배포판 호환 문제
- raw data 디렉터리 복사로 index 상태 손상
- 한국어 분석기·사전 파일 경로 누락

실습 목표:

- 축소 환경에서는 ZooKeeper를 먼저 기동
- Solr가 올바른 ZK 주소/chroot에 등록되는지 확인
- configset → collection → shard/replica → alias 순으로 확인
- backup/restore API를 우선 사용
- 문서 수뿐 아니라 대표 한국어 검색 결과와 정렬·필터를 비교
- CMS에서 등록/수정한 콘텐츠가 검색 결과에 반영되는지 확인

### Elasticsearch·Logstash·Kibana(ELK)

기존 Elasticsearch 7.8.0은 현재 관점에서 오래됐고 최신 OL10 지원 범위와 동일하다고 가정할 수 없다. Elastic의 현재 지원 매트릭스에서 OS/JVM 조합을 확인해야 한다: https://www.elastic.co/support/matrix/

예상 문제:

- 오래된 Elasticsearch 패키지 또는 bundled JDK가 OL10에서 지원되지 않음
- bootstrap check, `vm.max_map_count`, file descriptor, memory lock 실패
- `network.host`, `discovery.*`, cluster name, node name이 과거 값
- 원시 data 디렉터리 복사로 cluster UUID·index 손상
- snapshot repository 경로와 권한·SELinux 문제
- index는 복원됐지만 template·alias·ingest pipeline이 누락
- Logstash plugin 또는 pipeline 문법 불일치
- Logstash output이 예전 Elasticsearch 주소를 계속 봄
- Kibana saved object와 index pattern 누락
- TLS/인증 사용 시 인증서 SAN·truststore·암호화 정책 문제

실습 목표:

- 같은 7.8을 격리 재현할지 지원 버전으로 올릴지 고객사와 별도 결정
- 새 빈 cluster를 만든 뒤 Snapshot/Restore 사용
- cluster health, node, shard, unassigned, index, alias, template, pipeline 확인
- 대표 검색과 문서 수 비교
- Logstash는 pipeline·plugin·환경변수·입출력 주소를 이관
- 샘플 로그 한 건을 넣어 Logstash→Elasticsearch→조회까지 확인

ELK 버전 전략은 OS 전환과 제품 major upgrade를 한 번에 섞지 않는 것을 원칙으로 한다. 현재 소스는 `elasticsearch-rest-high-level-client 7.8.0`을 직접 사용하므로 서버만 최신 8.x/9.x로 바꾸면 API·인증·보안 기본값·Java client 호환성 문제가 추가된다. 반대로 7.8을 OL10에 억지로 설치해 프로세스만 띄우는 것은 기술적으로 가능할 수 있어도 공식 지원과 장기 운영 관점의 최종안으로 볼 수 없다.

권장 경로는 다음과 같다.

1. 기존 7.8의 정확한 patch 버전, plugin, index 생성 버전, template, alias, pipeline, Logstash/Kibana 버전과 애플리케이션 client를 확정한다.
2. 기존 7.8에서 검증 가능한 snapshot을 만들고 별도 환경에서 restore 테스트를 먼저 수행한다.
3. 순수 OS 전환 검증이 급하면 Elasticsearch는 기존 환경에 잠시 유지하고 OL10 APP가 기존 ES에 연결되는지 확인하여 애플리케이션 OS 전환 문제와 ES upgrade 문제를 분리한다.
4. 모든 구성요소를 OL10로 옮겨야 한다면 고객사 지원 정책과 Elastic support matrix에 맞는 목표 Elastic 버전을 먼저 승인받는다.
5. 목표 버전에 맞춰 애플리케이션 client, Logstash, Kibana, plugin, template를 함께 검증한다. 필요하면 7.17 호환 단계를 거쳐 breaking change를 줄인다.
6. 데이터는 raw data directory가 아니라 snapshot/restore를 기본으로 하며, snapshot 버전과 각 index의 생성 버전이 대상 cluster와 호환되는지 사전에 확인한다. 호환되지 않으면 중간 cluster 또는 reindex-from-remote를 사용한다.

즉 로컬 1차 시험에서는 Elasticsearch 7.8 계열과 현재 애플리케이션 client 7.8.0을 유지하여 OS 변경 영향부터 확인한다. 이것은 `ES 7.8을 OL10 최종 장기운영 표준으로 승인`한다는 뜻은 아니다. 먼저 7.8 데이터와 현재 애플리케이션의 기준 동작을 확보한 다음, OL10에서 7.8 실행이 불가능하거나 고객사 지원정책을 충족하지 못하면 Elastic 업그레이드를 별도의 되돌릴 수 있는 변경으로 수행한다.

공식 근거:

- Snapshot/Restore 및 버전·index 호환성: https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-restore.html
- Elastic 지원 종료 정책: https://www.elastic.co/support/eol

### CMS·Master·Chat UI·Gateway·Engine·Scheduler

이 구성요소들은 개별적으로 포트가 열리는 것보다 호출 사슬 전체가 중요하다.

예상 문제:

- 잘못된 Spring profile 활성화
- `application.yml`, profile YAML, 환경변수, command-line 인자의 우선순위 혼동
- DB·Redis·Solr·ES·내부 서비스 주소가 기존 개발/운영계를 가리킴
- CMS/Master Dockerfile의 `EXPOSE` 포트가 실제 포트와 불일치
- `/application`, `/logs`, `/data` 경로와 소유권 누락
- 업로드·다운로드 경로 또는 임시 디렉터리 권한 오류
- 시작 로그는 성공처럼 보이나 초기화 중 dependency 연결 실패
- Gateway는 뜨지만 Engine 호출 실패
- Chat UI 정적 자산 빌드가 Node 22에서 실패
- Scheduler를 여러 대에서 실행해 job 중복 수행
- 외부 KT/LDAP/API 연결이 실습 중 실제 고객 시스템으로 나감

실습 목표:

- 운영 profile을 복사 실행하지 않고 `ol10lab` 외부 설정을 만든다.
- 고객 외부 연계는 승인된 mock/비활성 설정을 사용한다.
- 기반 서비스가 준비된 뒤 Master → CMS → Engine → Gateway → Chat UI 순으로 기동한다.
- Scheduler는 기능 검증 마지막에 한 대만 제한적으로 실행한다.
- 각 서비스는 process, port, startup log, health/API, 실제 기능 순으로 검증한다.

### Chat UI 프런트엔드

소스에는 Vue 2.6.11, Webpack 3, 오래된 Node/npm 조건과 vendored tgz가 확인됐다. OL10 AppStream의 Node.js 22를 그대로 사용하면 빌드 도구가 깨질 가능성이 있다.

예상 문제:

- `node-sass` 또는 오래된 native addon 빌드 실패
- OpenSSL 관련 Webpack 오류
- lockfile 해석 차이
- 사라진 npm package 또는 인증서 오류
- API base URL이 기존 서버 주소로 빌드됨

실습 목표:

- 고객사에서 실제 배포하는 것이 사전 빌드 정적 파일인지 현장 빌드인지 확인
- 기존 정상 빌드의 Node/npm 정확한 버전 수집
- 필요하면 별도의 격리된 구버전 Node 빌드 환경 사용
- 브라우저 개발자 도구에서 JS 오류, API URL, HTTP status 확인

---

## 8. Oracle Linux 10 전환에서 특히 점검할 OS 항목

### 패키지와 저장소

- 같은 패키지명이 존재하는지
- 필요한 구버전이 공식 저장소에 있는지
- 사내 mirror/repository만 사용해야 하는지
- 외부 인터넷이 차단된 환경이면 RPM/JDK/Maven dependency 반입 절차가 있는지
- 설치 파일 checksum과 공급 경로가 기록됐는지

### glibc·네이티브 라이브러리

순수 Java 코드는 비교적 이식성이 높지만 JNI, 암호화 모듈, DB 보안 모듈, 이미지 처리, `*.so`는 glibc와 CPU 아키텍처의 영향을 받는다.

확인 대상:

- `file <binary>`로 x86_64 여부
- `ldd <binary>`의 `not found`
- 실행 시 symbol version 오류
- DAMO 등 고객사 보안 모듈의 OL10 인증·지원 여부

### systemd와 환경변수

터미널에서 수동 실행되는 프로그램이 systemd에서는 실패할 수 있다. systemd는 로그인 shell과 다른 환경을 사용하기 때문이다.

확인 대상:

- `User`, `Group`, `WorkingDirectory`
- `EnvironmentFile`, `JAVA_HOME`, `PATH`
- `ExecStart`, 종료 signal, restart 정책
- dependency와 시작 순서
- open files, process limit, timeout

### 파일 권한과 SELinux

일반 UNIX 권한이 맞아도 SELinux가 차단할 수 있다. 반대로 SELinux만 의심하다 실제 소유권 문제를 놓칠 수도 있다.

판정 순서:

```text
파일 존재 확인
→ 소유자·그룹·mode 확인
→ 상위 디렉터리 접근권한 확인
→ SELinux context 확인
→ audit log에서 AVC 확인
```

SELinux를 영구 비활성화하는 것은 해결책으로 기록하지 않는다. 필요한 경로 label 또는 최소 정책으로 해결하고 근거를 남긴다.

### firewalld와 네트워크

ping 성공과 TCP 성공은 다르다. `Connection refused`는 목적지까지 도달했지만 서비스가 수신하지 않는 경우가 많고, timeout은 방화벽·경로·주소 문제 가능성이 높다.

확인 대상:

- 서비스가 실제 어느 주소에 listen하는지
- NIC가 어느 firewalld zone에 속하는지
- APP→DB처럼 필요한 방향만 허용했는지
- cluster 내부 포트까지 필요한지
- hostname이 신규 IP로 해석되는지

### 암호화 정책·TLS·인증서

새 OS의 OpenSSL과 system-wide crypto policy는 오래된 TLS·cipher·서명 알고리즘을 거부할 수 있다.

대표 증상:

- `handshake_failure`
- `PKIX path building failed`
- `algorithm constraints check failed`
- 인증서 hostname/SAN 불일치

대응 원칙:

- 검증 없이 OS 암호화 정책을 전체 하향하지 않는다.
- 서버 인증서, CA chain, Java truststore, 만료일, SAN을 먼저 확인한다.
- 필요 시 해당 애플리케이션 범위에서 승인된 방식으로 조정한다.

### 시간대·locale·문자셋

- OS timezone, JVM timezone, DB timezone을 비교한다.
- UTF-8 locale과 DB character set/collation을 확인한다.
- 로그 시각·Scheduler 실행 시각·세션 만료 시각을 비교한다.
- CMS 한글 입력·검색·정렬·파일명 처리를 실제로 시험한다.

### 자원과 커널 제한

- Java heap 합계가 실제 RAM을 넘지 않는지
- Elasticsearch `vm.max_map_count`
- open files와 process limit
- 디스크 사용량과 inode
- OOM kill 기록
- swap과 GC pause

로컬 APP 8GiB에서는 전체 성능이나 HA를 판정하지 않는다. 구성요소 호환성을 순차 시험하고, 고객사 자원에서는 전체 동시 기동을 다시 검증한다.

---

## 9. 본격 실습의 권장 순서와 각 단계 통과 조건

### 1단계: 기준정보와 안전장치

- VM/OS/hostname/IP/시간/자원 증적
- 설치 전 qcow2 백업과 checksum
- 고객사에서는 OS snapshot 또는 승인된 rollback 방식 확인
- 실제 source/target을 명확하게 표시

통과 조건: 잘못된 서버를 변경할 가능성이 없고 복구 기준점이 존재한다.

### 2단계: Java 8과 소스 빌드

- 승인된 JDK 8 설치
- Maven 설치
- 소스 전송 후 원본과 SHA256 비교
- 전체 Maven build
- 산출물과 dependency 기록

통과 조건: OL10에서 소스가 반복 가능하게 빌드되고 모든 서비스 산출물이 생성된다.

### 3단계: DB

- MariaDB 설치·버전 전략 적용
- 포트, bind address, 문자셋, timezone, SQL mode 설정
- DB·최소권한 계정 구성
- schema/sample 또는 승인 dump 복원
- APP→DB TCP, 로그인, CRUD 확인

통과 조건: CMS가 사용할 동일한 JDBC 방식으로 읽기와 쓰기가 된다.

### 4단계: Redis

- 실제 topology와 데이터 보존 요건 반영
- standalone 또는 축소 cluster 구성
- APP client 연결 확인
- 세션/캐시 실제 기능 확인

통과 조건: 단순 PING뿐 아니라 업무 세션 또는 캐시 생성·조회가 확인된다.

### 5단계: ZooKeeper와 Solr

- ZooKeeper 선행 구성
- configset·collection·alias 복원
- Solr node/replica 상태 확인
- 대표 검색과 색인 확인

통과 조건: CMS 등록 데이터 또는 승인된 샘플이 검색되고 한국어 결과가 기준과 일치한다.

### 6단계: Elasticsearch와 Logstash

- 버전/지원 전략에 따른 Elasticsearch 구성
- snapshot restore
- template·alias·pipeline 확인
- Logstash pipeline 연결
- 샘플 로그 end-to-end 확인

통과 조건: 애플리케이션 로그 한 건이 대상 Elasticsearch에서 정확히 조회된다.

### 7단계: 애플리케이션

- 안전한 `ol10lab` profile 작성
- Master, CMS, Engine, Gateway, Chat UI 순차 기동
- Scheduler 마지막 단일 기동
- process·port·log·API·기능 확인

통과 조건: 모든 서비스가 신규 DB/Redis/Solr/ES 주소를 보고 실제 요청 사슬이 성공한다.

### 8단계: CMS 업무 기능

- 브라우저 접속과 로그인
- 목록·상세 조회
- 콘텐츠 등록·수정·삭제는 승인된 테스트 데이터로 수행
- 한글·특수문자·긴 문자열
- 파일 업로드·다운로드
- 검색과 색인 반영
- 챗봇 요청과 sessionKey
- 로그와 DB 반영
- 권한별 기능

통과 조건: 화면 표시가 아니라 기대 데이터 변화와 하위 시스템 반영까지 확인된다.

### 9단계: 재부팅·장애·롤백

- VM 재부팅
- 네트워크 IP 유지
- 서비스 시작 순서와 자동 기동
- 중복 Scheduler 없음
- 재검증
- 실패 시 rollback 절차 리허설

통과 조건: 사람의 임시 명령 없이 재현되고, 실패 시 정해진 시간 안에 되돌릴 수 있다.

---

## 10. 현장 오류를 빠르게 분류하는 방법

### 이름을 찾지 못함

대표 메시지:

```text
UnknownHostException
Name or service not known
Could not resolve host
```

우선 확인:

- 설정에 적힌 hostname
- `getent hosts <hostname>` 결과
- DNS/VIP 등록 여부
- `/etc/hosts` 임시값 사용 여부
- source hostname을 그대로 보고 있는지

판정: OS 호환성보다는 이름 해석·설정 문제일 가능성이 높다.

### Connection refused

의미: 목적지에 도달했지만 해당 주소/포트에서 서비스가 듣고 있지 않을 가능성이 높다.

우선 확인:

- 서비스 상태
- `ss -lntp`의 listen 주소와 포트
- 포트 오기입
- 서비스가 초기화 중 종료됐는지 로그

### Connection timed out

의미: 패킷 경로나 방화벽에서 응답을 받지 못한 경우가 많다.

우선 확인:

- 목적지 IP가 신규 개발계가 맞는지
- route와 NIC
- firewalld zone/port
- 고객사 네트워크 ACL
- 서비스 노드 간 내부 포트

### 인증 실패

대표 메시지:

```text
Access denied
Authentication failed
NOAUTH
```

우선 확인:

- 비밀번호 자체를 화면에 출력하지 않고 계정명·host 권한·DB 권한 확인
- 애플리케이션이 읽는 secret 공급 위치
- 환경변수/profile override
- 계정 잠금·만료
- DB 인증 plugin

### TLS/인증서 실패

우선 확인:

- 인증서 만료일
- hostname과 SAN
- CA chain
- Java truststore
- OL10 crypto policy와 상대 서버 TLS 버전

전체 보안 정책을 먼저 낮추지 않는다.

### 서비스가 active인데 포트가 없음

가능한 원인:

- systemd가 wrapper script만 성공으로 판단
- Java 프로세스가 초기화 중 종료
- 잘못된 profile 또는 port
- dependency 연결을 기다리는 중
- `Type=forking`·PIDFile 설정 오류

확인 순서:

```text
systemctl status
→ journalctl
→ 실제 process
→ ss listen
→ 애플리케이션 로그
```

### 웹 화면은 뜨지만 기능이 실패

가능한 원인:

- 정적 UI만 정상이고 API가 실패
- 프런트 API base URL 오류
- Gateway/Engine 연결 실패
- DB 조회는 되지만 쓰기 권한 없음
- Redis session 실패
- Solr alias/collection 누락
- 브라우저 CORS·cookie·HTTPS 문제

확인:

- 브라우저 개발자 도구 Network/Console
- 실패한 API URL과 HTTP status
- 같은 시각의 CMS/Gateway/Engine 로그
- 요청 ID/sessionKey를 통한 흐름 추적

### DB 복원 오류

- 첫 오류 줄과 객체를 보존한다.
- 일부 statement가 이미 적용됐는지 확인한다.
- 백업을 보존한 채 schema/data/권한 오류를 분리한다.
- 원인 없이 전체 dump를 반복 실행하지 않는다.

### Solr collection은 있는데 검색이 안 됨

- collection 존재만 보지 않는다.
- live node, shard, replica state, leader, alias, configset을 각각 확인한다.
- 문서 수와 대표 query를 실행한다.
- 애플리케이션이 호출한 실제 collection/alias 이름을 로그에서 확인한다.

### Elasticsearch yellow/red

- 단일 노드 실습에서는 replica 때문에 yellow일 수 있으므로 원인을 구분한다.
- red, unassigned primary, disk watermark, allocation filter, cluster UUID를 확인한다.
- raw data 복사로 해결하지 않는다.

### SELinux 의심

증상만 보고 `setenforce 0`부터 실행하지 않는다.

확인 예:

```bash
getenforce
sudo ausearch -m AVC -ts recent
ls -lZ <문제경로>
```

AVC 기록과 실제 차단 작업을 연결한 뒤 label 또는 최소 정책을 설계한다.

### 메모리 부족·프로세스 강제 종료

대표 증상:

- Java가 설명 없이 종료
- `Killed`
- 포트가 사라짐
- GC 지연과 timeout

확인 예:

```bash
free -h
ps -eo pid,comm,rss,%mem --sort=-rss | head
journalctl -k | grep -i -E 'oom|killed process'
```

각 Java heap 합계와 OS 여유를 계산하고 로컬에서는 서비스별 순차 기동을 사용한다.

---

## 11. CMS가 “제대로 동작한다”는 최종 판정 기준

다음 중 일부만 통과하면 완료가 아니다.

| 검증 층 | 통과 기준 |
|---|---|
| 인프라 | OL10 정상, 시간·DNS·디스크·메모리 정상 |
| 보안 | SELinux Enforcing, firewalld active를 유지 |
| 런타임 | 승인 JDK 8로 동일하게 빌드·실행 |
| 프로세스 | 필요한 서비스만 실행, Scheduler 단일 실행 |
| 포트 | 정의된 주소/포트에 listen, 필요한 방향만 접근 |
| 설정 | source/운영 주소 잔존 없음, 올바른 profile |
| DB | 스키마·데이터 조회 및 CMS 쓰기 반영 |
| Redis | 실제 세션·캐시 동작 |
| Solr | collection/alias 정상, 등록 데이터 검색 가능 |
| Elasticsearch | index/alias/template 정상, 로그·검색 확인 |
| Logstash | 입력 한 건이 대상 ES까지 도달 |
| 웹 | CMS 로그인·메뉴·조회·등록·수정·업로드 정상 |
| 챗봇 | 정상 기준 botCode로 HTTP 200, 정상 업무 코드, 유효 sessionKey와 메시지 |
| 브라우저 | JS 오류·CORS·mixed content·잘못된 API 주소 없음 |
| 재현성 | 재부팅 후에도 네트워크·서비스·기능 정상 |
| 복구성 | 변경 전 기준점과 rollback 절차·소요시간 존재 |

과거 실습에서 `B2B_BASIC_CODE`는 source와 target 모두 `sessionKey=null`이었으므로 이관 성공 기준으로 부적합했다. 정상 이력이 있는 `TC_CALLBOT`처럼 원본에서 성공이 증명된 테스트 데이터를 기준으로 삼아야 한다.

---

## 12. 고객사 개발계 방문 전에 확보할 자료

### 시스템·배포

- 개발계 APP/DB 실제 hostname, IP, VIP, DNS
- 실제 서버 수와 역할
- OS 정확한 release와 kernel
- CPU, RAM, disk, mount, filesystem
- 현재 배포 JAR/WAR와 SHA256
- Java 공급사·정확한 patch 버전
- 시작/중지 스크립트와 systemd unit
- JVM option, heap, GC, timezone
- 활성 Spring profile과 외부 설정 우선순위

### 데이터·미들웨어

- MariaDB 정확한 버전과 dump/backup 방식
- DB 문자셋·collation·SQL mode·timezone
- DB 계정/권한의 비밀값 제외 목록
- Redis 버전, standalone/cluster, node/slot, RDB/AOF 정책
- ZooKeeper 버전, ensemble, chroot, znode 정보
- Solr 버전, configset, collection, alias, backup
- Elasticsearch 버전, snapshot, index, alias, template, pipeline
- Logstash 버전, plugin, pipeline, input/output
- Kibana saved object 필요 여부

### 애플리케이션·업무 검증

- 정상 동작하는 테스트 계정
- 원본에서 성공한 botCode와 기대 응답
- CMS 기능별 테스트 시나리오
- 테스트 데이터 생성·삭제 범위 승인
- 외부 KT/LDAP/API 호출 허용 여부와 mock 방식
- 파일 업로드 저장 경로와 샘플 파일

### 보안·운영 통제

- 방화벽/ACL 요청 절차
- SELinux 유지 정책
- 인증서/CA/truststore 목록과 만료일, 개인키 제외
- 인터넷/사내 repository 정책
- 변경 승인 시간과 rollback 결정자
- source/target 동시 쓰기 차단 방식

---

## 13. 현장에서 남겨야 할 증적과 오류 기록 양식

명령을 많이 실행하는 것보다 변경 전후를 비교할 수 있게 남기는 것이 중요하다. 비밀번호·토큰·개인정보·개인키는 절대 기록하지 않는다.

### 단계별 증적

- 실행 일시와 작업자
- 대상 hostname/IP/역할
- 변경 전 파일 checksum 또는 백업 위치
- 실행 명령
- 정상/비정상 출력
- 관련 로그 시간 범위
- 변경 후 process/port/API 상태
- 업무 기능 결과
- rollback 명령 또는 복구 파일

### 오류 기록 템플릿

```text
[발생 시각]
[환경] 로컬 QEMU / 고객사 개발계 / 기존 개발계
[대상] hostname, 서비스, 버전
[직전 작업]
[증상] 화면/HTTP status/오류 메시지
[영향 범위]
[정상 기준] 기존 환경에서 같은 요청의 결과
[수집 증적] process, port, journal, app log, 설정의 비밀값 제외 부분
[원인 범주] OS / 구성·연결 / 데이터·애플리케이션 / 미확정
[가설]
[한 번에 적용한 변경 1개]
[변경 결과]
[복구 여부]
[재발 방지/현장 체크리스트 반영]
```

이 양식을 사용하면 시행착오가 단순 실패로 끝나지 않고 고객사 현장 대응 자료가 된다.

---

## 14. 로컬 실습과 고객사 개발계의 차이

로컬 실습에서 증명할 수 있는 것:

- OL10에서 JDK 8과 프로젝트 build가 가능한지
- 각 구버전 구성요소의 설치·기동 여부
- 기본 연결과 sample data 기능
- SELinux/firewalld 조건에서 필요한 설정
- 시작 순서와 오류 대응 방법
- CMS 주요 기능의 축소 end-to-end 흐름

로컬 실습만으로 증명할 수 없는 것:

- 고객사 실제 데이터 전체 정합성
- 실제 외부 연계와 인증서
- 고객사 DNS/VIP/LB/ACL
- 운영 규모 성능과 HA
- 실제 cluster 장애조치
- 고객사 보안 솔루션·DAMO 모듈 호환성
- 최종 배포 artifact가 현재 받은 소스와 동일한지

따라서 로컬 실습의 결과는 “운영 승인”이 아니라 “예상 오류를 선제적으로 제거하고, 남은 현장 확인 항목을 좁히는 것”이다.

---

## 15. 본 실습의 운영 원칙

- 한 번에 원인 하나만 검증한다.
- 오류가 나면 여러 설정을 동시에 바꾸지 않는다.
- 프로세스가 떴다는 사실과 기능 성공을 구분한다.
- ping, TCP, protocol, business function을 단계별로 구분한다.
- 기존 환경과 신규 환경에서 동일한 정상 데이터를 비교한다.
- SELinux·firewalld를 끄는 것으로 성공 판정을 만들지 않는다.
- source와 target을 같은 IP로 동시에 운영망에 올리지 않는다.
- DB/Redis/Solr/Elasticsearch의 raw data를 무작정 복사하지 않는다.
- Scheduler는 최종 승인 전 한 대만 기동한다.
- 비밀번호·토큰·개인키·고객 개인정보를 문서에 넣지 않는다.
- 설치 파일·소스·artifact·backup에는 SHA256을 남긴다.
- 각 단계 통과 후 다음 단계로 넘어간다.
- 실패 시 clean baseline 또는 승인된 rollback 지점으로 되돌릴 수 있어야 한다.

---

## 16. 현재 결론과 바로 다음 작업

### 현재 결론

- 로컬 APP/DB VM 기반은 준비됐다.
- 고객사 개발계도 VM과 미러링이 준비됐을 수 있지만 그 말만으로 애플리케이션 이관이 끝난 것은 아니다.
- 서비스 간 protocol은 대체로 OS 독립적이지만, 구버전 런타임·보안·패키지·파일·서비스 관리는 OL10의 직접적인 영향을 받는다.
- 가장 먼저 검증할 핵심 위험은 Java 8/Spring Boot 2.3 빌드·실행이다.
- 그 다음은 MariaDB 버전과 데이터, Redis/Solr/ZK/Elasticsearch 구버전 재현, 마지막은 CMS 전체 업무 기능이다.
- 성공 기준은 CMS 화면 표시가 아니라 DB·세션·검색·로그·챗봇 요청까지 연결된 end-to-end 기능이다.

### 바로 다음 실습

1. APP VM에서 현재 Java/Maven 미설치 상태를 다시 증적한다.
2. 고객사에서 허용 가능한 JDK 8 공급 방식과 동일한 방법을 선택한다.
3. JDK 8 설치와 checksum을 기록한다.
4. Maven을 설치하고 `mvn -v`가 JDK 8을 사용하는지 확인한다.
5. Meritz 소스를 APP VM으로 전송하고 SHA256을 비교한다.
6. 소스 수정 없이 첫 Maven reactor build를 실행한다.
7. 최초 실패를 그대로 보존하고 OS·dependency·source 문제로 분류한다.

이 첫 빌드 실패부터가 중요한 실습 결과다. 실패를 숨기지 않고 원인·조치·재검증 결과를 이 문서와 별도 실행 기록에 계속 축적한다.
