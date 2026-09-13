# 등촌 프로젝트 전체 Codex 인수인계

이 문서는 Codex 작업 **`확인 및 Xen03→Xen04 이전`**에서 나눈 약 935개 turn의 대화와 프로젝트 산출물을 바탕으로 만든 전체 맥락 문서다. 원문 대화를 한 줄씩 복제한 파일은 아니며, 다른 노트북의 Codex가 작업 목적·판단 근거·확인 결과·실패 이력·남은 작업을 잃지 않고 이어갈 수 있도록 정리한 기준 문서다.

## 다른 노트북 Codex에 처음 붙여 넣을 프롬프트

```text
이 폴더는 메리츠/등촌 Linux 서비스 이관 학습 및 실습 프로젝트다.

작업을 시작하기 전에 반드시 다음 파일을 순서대로 끝까지 읽어라.

1. AGENTS.md
2. extras/server-migration/CODEX_MASTER_HANDOFF.md
3. extras/qemu-oracle-linux/QEMU_ORACLE_LINUX_HANDOFF.md

그다음 현재 사용자가 어느 트랙을 이어갈지 확인하라.

- 트랙 A: 실제 목표인 tc-xen02 → tc-xen03 이관 계획·현장 확인
- 트랙 B: 완료된 xen02 → xen01 1차 이관 실습 검증·복기
- 트랙 C: Windows 11 Home의 QEMU Oracle Linux 10 로컬 연습 VM

중요 규칙:

- 명령어는 한 번에 하나만 제시한다.
- 명령 전에 지금 무엇을 왜 하는지 설명한다.
- 명령의 각 부분, 정상 결과, 비정상 결과를 설명한다.
- 사용자가 실제 결과를 보여주기 전에는 다음 단계로 가지 않는다.
- 조회와 변경을 구분하고, 변경·삭제·재시작·보안 정책 작업은 영향과 복구 방법을 먼저 설명한다.
- 기존 source 서버, VM, 네트워크, NFS 백업, 데이터, 설정을 임의로 수정하거나 삭제하지 않는다.
- 비밀번호, 토큰, 개인키, 고객사 비밀값을 요청하거나 출력하지 않는다.
- 서버 이름과 IP는 문서 간 혼동이 있으므로 매번 hostname과 IP를 실제로 확인한다.
- 실제 운영 변경은 담당자 승인과 작업창 없이 실행하지 않는다.
- 답변마다 전체 대단계와 현재 소단계 진행상황을 두 단계 깊이로 표시한다.

현재 사실과 미확정 사항은 이 문서의 `확인된 사실`, `혼동 방지`, `남은 작업`을 기준으로 판단하라. 과거 답변을 무조건 정답으로 취급하지 말고 실제 명령 결과를 우선하라.
```

## 프로젝트가 시작된 이유

최초 요청은 사내 Xen 환경의 서버와 서비스를 새 환경으로 옮기고, 마지막에 실제 챗봇 시뮬레이터까지 실행하는 과정을 이해하고 수행하는 것이었다.

처음에는 사용자가 `xen03 → xen04`라고 표현했지만 곧 **`xen02 → xen03`이 실제 목표**라고 정정했다. 이후 실제 연습 환경에서는 이미 준비된 `xen01`을 target으로 사용하여 **`xen02 → xen01` 이관 실습**을 수행했다. 마지막에는 고객사의 Oracle Linux 10 OS 전환을 대비하기 위해 Windows 로컬 PC에 Oracle Linux 10 VM을 만드는 별도 연습 트랙으로 전환했다.

따라서 이 프로젝트에는 서로 다른 세 트랙이 있다.

### 트랙 A / 실제 이관 목표

- source 호스트: `tc-xen02`, 확인 문서상 `192.168.1.100`
- target 호스트: `tc-xen03`, 확인 문서상 `192.168.1.120`
- source VM: `.101`, `.102`, `.103`
- 목표: VM과 서비스를 target에서 재현하고 임시망에서 검증한 뒤 승인된 시점에 전환
- 상태: 계획·조사 문서 작성 완료, Xen 관리 권한과 실제 pool/SR/network는 현장 재확인 필요

### 트랙 B / 실제로 수행한 1차 연습

- source: `xen02.01~03`, `192.168.1.101~103`
- target: `xen01.01~03`, `192.168.1.81~83`
- 목표: MariaDB, Redis, ZooKeeper/Solr, Elasticsearch, 애플리케이션, HAProxy를 target에서 연결하고 시뮬레이터 검증
- 상태: 주요 인프라와 `TC_CALLBOT` 업무 흐름 검증 성공. 상세 증적은 산출물 문서 참조

### 트랙 C / Oracle Linux 10 로컬 연습

- 호스트: Windows 11 Home, Intel Core Ultra 7 155H, RAM 32GB
- 가상화: QEMU 11.1.0
- 게스트: Oracle Linux 10, 4 vCPU, RAM 8GB, qcow2 50GB
- 상태: TCG로 설치·부팅·`test1` 로그인 성공, SSH 설정 시작 전
- WHPX 상태: `Broadwell-v4`에서 커널 패닉 발생

## 전체 대화의 시간 순서

### 1단계 / 목표와 접근 가능성 확인

- 사용자가 사내 자료와 초보자용 Linux OS 이관 가이드를 제공했다.
- 목표를 `xen02 → xen03`의 VM 3대 이관과 시뮬레이터 실행으로 정정했다.
- Codex가 서버에 직접 접근하려면 현재 PC에서 접근 가능한 네트워크, SSH 키, 권한이 필요하다는 점을 구분했다.
- 게스트 OS의 SSH 접속 권한과 Xen 호스트의 `xe` 관리 권한은 서로 다르다는 점을 확인했다.
- `xen03`에는 SSH 접속할 수 있었지만 `xe` 명령은 별도 인증이 필요했으므로 pool, SR, network, 여유 자원은 확정하지 못했다.

### 2단계 / source 환경 As-Is 조사

- source VM 3대의 OS, CPU, RAM, 디스크, `/data` 사용량을 조사했다.
- 확인 당시 세 VM은 Rocky Linux 9.6, 각 5 vCPU, RAM 18GiB, 가상 디스크 300GiB로 기록됐다.
- 주요 서비스와 포트를 `ss`, `ps`, 설정 파일, 로그로 연결해 확인했다.
- 단순히 포트가 열렸다는 것만으로 서비스나 클러스터 전체가 정상이라고 판단하지 않는 원칙을 세웠다.
- 서비스별 프로그램·설정·데이터 위치가 다르며 `/data` 하나에 전부 들어 있는 것이 아니라는 점을 확인했다.
- 실제 `/data`는 비어 있었고, MariaDB 데이터는 `/mariadb/data`, 애플리케이션은 `/application`, 로그는 `/logs`에 있었다.

### 3단계 / 학습 문서와 이관 계획 작성

- Xen Host, VM, pool, SR, OS, 서비스, 프로세스, 포트, 설정, 데이터의 차이를 설명하는 이론 문서를 만들었다.
- `xen02 → xen03` 전체 이관 계획 문서를 만들었다.
- 실제 이관 행동방법과 명령어 해설 문서를 만들었다.
- 녹음 전사와 기존 VMware/Oracle Linux 런북을 대조해 쉬운 설명 문서를 만들었다.
- 운영용 런북, 체크리스트, 트러블슈팅 부록, 이관 완료 후 검증·연결 설정 가이드를 만들었다.

### 4단계 / xen02 → xen01 1차 실습

- source의 `/logs`, `/data`, `/mariadb`, `/application` 구조를 확인했다.
- `/application` 아래에서 `gateway`, `engine`, `master`, `cms`, `chat-ui`, `scheduler`, `redis`, `solr`, `elk`를 확인했다.
- NFS 공유 `/data/solr_backup`을 백업·전송 경로로 사용했다.
- NFS `root_squash` 때문에 `sudo tar`가 공유 경로를 읽거나 쓰지 못하는 오류를 겪었다.
- 해결 원칙은 일반 사용자로 NFS 파일을 `/tmp`에 복사한 뒤 로컬 파일을 `sudo tar`로 해제하는 것이었다.
- 기존 target 데이터와 설정을 덮기 전에 백업본을 만들고, 광범위한 삭제 대신 복구 가능한 보존 방식을 우선했다.

### 5단계 / 데이터·클러스터 서비스 구성

- MariaDB와 MaxScale 설정을 조사하고 target에서 포트와 로그를 확인했다.
- source Primary는 `xen02.01`, `server_id=101`, `gtid_domain_id=1`, `read_only=0`으로 확인했다.
- target 설계값으로 `.81=201`, `.82=202`, `.83=203`의 고유 server-id를 검토했다.
- MariaDB dump 복원 중 `tbl_intent`, `tbl_sentence`에서 `ERROR 1032`를 만났고, 같은 dump를 무작정 재실행하지 않았다.
- 대상의 복원 전 백업 `/tmp/xen01_before_restore.sql`을 만들었다.
- 실패 테이블을 별도로 다뤄 최종 확인 당시 `meritz_easycms`의 테이블·뷰 129개, `tbl_intent` 2건, `tbl_sentence` 2건이 확인됐다.
- Redis는 데이터가 캐시인지 세션·큐·업무 상태인지 먼저 판정해야 하며, 무조건 초기화하지 않는 원칙을 적용했다.
- ZooKeeper는 clean ensemble, Solr는 configset·collection·alias와 shard/replica 상태를 별도로 확인했다.
- Solr `TC_CALLBOT_B` 시험 복원에서 RESTORE `status:0`, 1 shard, 3 replicas active, 문서 20건을 확인했다.
- Elasticsearch 7.8.0을 target `.81~.83`에서 별도 포트 `9210`으로 구성했다.
- 확인 당시 클러스터 `trusted-context-es`는 3노드, `green`, unassigned shard 0이었다.
- Elasticsearch 원시 data 디렉터리를 복사하지 않고 Snapshot/Restore를 사용하는 원칙을 지켰다.

### 6단계 / 애플리케이션·HAProxy·시뮬레이터

- 공통 애플리케이션 `Gateway`, `Engine`, `Master`, `CMS`, `Chat UI`는 3대 배치 구조로 이해했다.
- `Scheduler`는 중복 job 방지를 위해 한 대만 실행하는 구조로 다뤘다.
- 대표 애플리케이션 포트는 Gateway 8081, Engine 8180, CMS 8280, Master 8380, Chat UI 8480, Scheduler 8580으로 확인했다.
- target 애플리케이션 설정에서 Elasticsearch 포트를 기존 9200과 분리한 9210으로 연결했다.
- HAProxy는 `Host` 이름에 따라 CMS, Chat UI, Gateway 등 backend로 전달하는 구조로 확인했다.
- Windows의 이름 해석과 HAProxy 도달 여부를 `ping`, `curl`로 분리해 확인했다.
- `B2B_BASIC_CODE` 시뮬레이터는 target과 source 모두 `sessionKey=null`이었으므로 이관 실패의 증거가 아니라고 판정했다.
- 정상 이력이 있던 `TC_CALLBOT`을 사용해 Gateway API를 호출했다.
- 최종 확인 결과 `HTTP 200`, 응답 크기 956, `code=0000`, `sessionKey=gw1_...`, 응답 메시지가 반환됐다.
- 이 결과로 당시 target에서 Chat UI, HAProxy, Gateway, Engine, Redis 세션, MariaDB 데이터, Solr 봇 데이터의 핵심 업무 흐름이 정상임을 검증했다.

### 7단계 / 운영 환경 적용 관점 재정리

- 실제 고객사 환경에서는 `/etc/hosts`에 임시 별칭을 넣지 않고 승인된 DNS/FQDN/VIP 또는 실제 연결 주소를 설정 파일에 반영해야 한다는 요구를 확인했다.
- 실제 활성 Spring profile, `application.yml`, `application-tc.yml`, `runtime.env`, 시작 스크립트, JVM 옵션 중 무엇이 최종값을 덮어쓰는지 확인해야 한다.
- 개발계는 `aivbsvr1v` 한 대와 `aivbdb1v`로 보였지만, 문서에는 3노드 서비스가 함께 있어 실제 topology를 현업에 재확인해야 한다.
- 운영계는 `aivbsvr1p~3p`, DB는 `aivbdb1p`, `aivbdb2p`로 언급됐지만 실제 IP·Active/Standby·VIP는 아직 확정값으로 기록하지 않았다.
- 연결 정보가 옛 주소를 가리키는 것이 OS 전환 후 가장 큰 위험이므로 DB, Redis, Solr/ZooKeeper, Elasticsearch/Logstash, Master/CMS/Gateway/Engine/Chat UI/Scheduler를 주소·포트·방화벽·설정·로그·업무 기능 순서로 확인하는 계획을 세웠다.

### 8단계 / Windows 로컬 Oracle Linux 10 실습

- 처음에는 VirtualBox 7.2.8로 Oracle Linux 10 설치를 시도했다.
- Windows 하이퍼바이저 위 NEM 모드에서 게스트 AVX2가 보이지 않았고 Oracle Linux 10 설치 중 `Attempted to kill init!` 커널 패닉이 반복됐다.
- Windows 보안 설정을 여러 개 임의로 변경하지 않고, QEMU로 전환했다.
- Windows Hypervisor Platform은 `Enabled`, `HypervisorPresent=True`로 확인했다.
- QEMU 11.1.0과 qemu-img 11.1.0 설치를 검증했다.
- 50GiB qcow2 디스크를 만들고 `corrupt:false`를 확인했다.
- WHPX + `Broadwell-v4`에서는 `CPUID ... arat` 경고와 커널 패닉이 재현됐다.
- TCG + `Broadwell-v4`에서는 Oracle Linux 10 Minimal Install과 첫 부팅에 성공했다.
- 사용자 `test1`으로 로그인했고 현재 다음 단계는 게스트 `ip addr` 확인과 SSH 구성이다.

## 확인된 source 구성

### VM 101 / xen02.01

- 주소: `192.168.1.101`
- OS: Rocky Linux 9.6로 확인됨
- 자원 기록: 5 vCPU, RAM 18GiB, Disk 300GiB
- 주요 서비스: Qdrant, Elasticsearch 7.8, Solr 7.6, ZooKeeper 3.6.1, Redis 5.0.8, MariaDB 10.6.7, MaxScale, HAProxy, Node/Kibana, 애플리케이션
- 관찰 포트 예: 80, 2181, 3306/13306, 6333~6335, 7000/7001, 8983, 9200/9300, 애플리케이션 8081~8580

### VM 102 / xen02.02

- 주소: `192.168.1.102`
- OS: Rocky Linux 9.6로 확인됨
- 자원 기록: 5 vCPU, RAM 18GiB, Disk 300GiB
- 주요 서비스: Elasticsearch, Solr, ZooKeeper, Redis, MariaDB, Docker proxy

### VM 103 / xen02.03

- 주소: `192.168.1.103`
- OS: Rocky Linux 9.6로 확인됨
- 자원 기록: 5 vCPU, RAM 18GiB, Disk 300GiB
- 주요 서비스: Elasticsearch, Solr, ZooKeeper, Redis, MariaDB, Docker proxy, 애플리케이션

## 서비스 연결 지도

### 사용자 요청 흐름

```text
사용자 브라우저
  → DNS 또는 승인된 이름/VIP
  → HAProxy/LB :80 또는 :443
  → CMS / Chat UI / Gateway
  → Engine
  → MariaDB / Redis / Solr / Elasticsearch / 기타 연계
```

### 내부 서비스 관계

```text
CMS / Master / Scheduler
  → MariaDB
  → Redis
  → Solr
  → Elasticsearch

Chat UI
  → Gateway
  → Engine

Engine
  → Redis
  → SolrCloud
  → 기타 업무 연계

SolrCloud
  → ZooKeeper ensemble

Logstash
  → 입력 데이터 수집·가공
  → Elasticsearch
```

### 대표 포트

| 서비스 | 대표 포트 | 의미 |
|---|---:|---|
| HAProxy/Web | 80, 443 | 사용자 HTTP/HTTPS 진입 |
| ZooKeeper | 2181 | 클라이언트 연결 |
| ZooKeeper | 2888, 3888 | ensemble 노드 통신·선거 |
| MariaDB | 3306 또는 확인된 커스텀 포트 | DB 접속 |
| Qdrant | 6333~6335 | 벡터 검색 API/통신 |
| Redis | 7000, 7001 | Redis 클라이언트 포트 |
| Redis cluster bus | 17000, 17001 | Redis 노드 간 클러스터 통신 |
| Solr | 8983 | Solr HTTP API |
| Solr 내부 | 9983 등 | 환경에 따라 노드/내부 통신 |
| Elasticsearch | 9200 | source HTTP API |
| Elasticsearch | 9300 | source 노드 transport |
| 연습 target ES | 9210, 9310 | 기존 서비스와 충돌 방지를 위한 별도 포트 |
| Gateway | 8081 | Gateway 애플리케이션 |
| Engine | 8180 | Engine 애플리케이션 |
| CMS | 8280 | CMS 애플리케이션 |
| Master | 8380 | Master 애플리케이션 |
| Chat UI | 8480 | Chat UI 애플리케이션 |
| Scheduler | 8580 | Scheduler 애플리케이션 |
| Logstash | 5000, 5044, 9600 등 | 실제 pipeline 설정으로 확정 |

포트 표는 확인 출발점이다. 실제 서버에서는 `ss -lntp`, 프로세스, 설정 파일, 로그를 함께 확인해야 한다.

## 서비스별 이관 원칙

### MariaDB와 MaxScale

- MariaDB datadir을 실행 중인 상태에서 무작정 복사하지 않는다.
- dump 또는 승인된 물리 백업 방법과 일관성 시점을 확보한다.
- source writer, CMS, Scheduler가 동시에 쓰지 않도록 전환 시점을 통제한다.
- target의 server-id, GTID, read_only, 사용자 권한, DB명, 문자셋, 시간대를 확인한다.
- MaxScale frontend/listener와 backend DB 주소를 분리해 확인한다.
- 복원 명령 성공뿐 아니라 테이블 수, 핵심 행 수, 로그인·조회·쓰기 기능을 확인한다.

### Redis

- 캐시라고 단정하지 말고 세션·큐·업무 상태 저장 여부를 먼저 확인한다.
- 기존 cluster 재결합이 정상이라면 node ID, announce IP, master/replica, 16,384 slot을 확인한다.
- 기존 상태가 꼬인 경우에만 승인 후 빈 3 master/3 replica cluster를 만들고 애플리케이션 배포로 캐시를 재생성한다.
- source와 target을 같은 cluster에 무검증으로 섞지 않는다.
- source에서 `FLUSHALL` 같은 파괴적 명령을 실행하지 않는다.

### ZooKeeper와 Solr

- ZooKeeper의 오래된 session과 transaction log를 무조건 복사하지 않는다.
- target에 clean ensemble을 만들고 myid, server 목록, quorum을 확인한다.
- Solr가 올바른 ZK 주소와 chroot를 바라보게 한다.
- configset, 모든 collection, shard, replica, leader, alias를 확인한다.
- Solr collection은 제품의 BACKUP/RESTORE API를 우선한다.
- RESTORE 성공 코드뿐 아니라 replica active, 문서 수, 대표 한국어 검색까지 확인한다.

### Elasticsearch와 Kibana

- Elasticsearch data 디렉터리를 새 클러스터에 그대로 넣지 않는다.
- target에 빈 cluster를 만든 뒤 Snapshot/Restore를 사용한다.
- index 데이터와 global state, template, pipeline, ILM/SLM 정책을 구분한다.
- cluster health, node 수, shard, alias, mapping, 문서 수, 대표 검색을 확인한다.
- Kibana index와 설정도 별도로 확인한다.

### Logstash

- 가져갈 핵심은 data 폴더보다 pipeline, input, filter, output, plugin, 환경변수다.
- 어떤 포트에서 무엇을 받고 어느 Elasticsearch로 내보내는지 실제 설정으로 확인한다.
- target ES 주소가 맞는지와 pipeline 오류·재시도·중복 수집 여부를 확인한다.

### 애플리케이션과 Scheduler

- `application.yml`, `application-tc.yml`, `runtime.env`, 시작 스크립트, 활성 profile을 함께 확인한다.
- DB·Redis·Solr·Elasticsearch와 Master/Engine/Gateway 주소가 source를 가리키지 않는지 점검한다.
- 서비스는 기반 인프라 확인 후 하나씩 기동한다.
- Scheduler는 자동 쓰기와 중복 job 위험 때문에 마지막에 승인된 한 대만 제한적으로 실행한다.
- PID 파일과 로그 파일은 프로그램 본체가 아니며, 예전 PID를 정상 프로세스로 오인하지 않는다.

## 실습 중 발생한 중요한 오류와 교훈

### NFS Permission denied

- 증상: NFS 공유 경로에서 `sudo tar` 실행 시 읽기·쓰기 거부
- 원인: NFS `root_squash`로 root 권한이 공유에서 제한됨
- 원칙: NFS 파일을 권한이 있는 일반 사용자로 `/tmp`에 복사한 뒤 로컬에서 관리자 권한으로 해제
- 금지: 마운트된 `/data/solr_backup` 내부를 reset 과정에서 삭제

### MariaDB ERROR 1032

- 증상: `Can't find record in 'tbl_intent'`, `tbl_sentence`
- 의미: 대상 상태와 dump의 DML 전제가 맞지 않아 특정 행을 찾지 못함
- 대응: 같은 dump 반복 실행 중지, 오류 줄 확인, 복원 전 백업 보존, 실패 테이블 분리 처리
- 교훈: 명령이 일부 진행됐을 수 있으므로 실패 뒤 즉시 재실행하면 상태가 더 꼬일 수 있음

### Solr replica down과 조회 timeout

- 증상: collection은 active처럼 보이지만 replica가 down이고 query timeout
- 대응: live_nodes와 replica/core 상태를 구분하고 각 노드 로그·core.properties·방화벽을 확인
- 최종적으로 시험 collection restore와 3 replicas active, 문서 수 일치를 확인

### 애플리케이션 포트가 즉시 보이지 않음

- 시작 스크립트가 `started`를 출력해도 Java 초기화가 끝나기 전에는 포트가 안 보일 수 있음
- 일정 시간 뒤 status, `ss`, 로그를 함께 확인해야 함
- 방화벽 때문에 node 간 Engine/Gateway 통신이 막혀 학습 알림이 실패했던 적이 있음

### B2B_BASIC_CODE sessionKey null

- target뿐 아니라 source에서도 같은 입력이 실패함
- 원본 로그에 channel/intent 미존재와 Solr alias collection null이 보였음
- 따라서 해당 botCode 실패는 이관 장애 판정에 사용할 수 없음
- 정상 기준 데이터인 `TC_CALLBOT`으로 비교했고 성공함

### VirtualBox와 WHPX 커널 패닉

- 증상: `Kernel panic - not syncing: Attempted to kill init!`
- VirtualBox NEM에서 guest AVX2가 노출되지 않는 문제가 확인됨
- QEMU WHPX + Broadwell-v4에서도 ARAT 경고와 커널 패닉이 재현됨
- TCG는 느리지만 설치와 부팅에 성공함
- 원본 qcow2를 보존하고 복사본에서만 WHPX CPU 모델을 시험해야 함

## 확인된 성공 기준

### xen02 → xen01 실습

- target Elasticsearch 7.8.0 3노드 cluster `green`
- target Solr 시험 collection 복원과 replica active 확인
- MariaDB 핵심 schema/행 확인
- Engine 3대 8180 연결 확인
- 학습 과정에서 Solr 색인과 Engine 3대 notify 성공 확인
- 정상 봇 `TC_CALLBOT` Gateway API가 `code=0000`과 sessionKey 및 메시지 반환
- B2B 실패가 source와 target에서 동일하다는 비교 완료

### Windows QEMU 실습

- QEMU와 qemu-img 버전 확인
- qcow2 50GiB 생성 및 무결성 확인
- Oracle Linux 10 Minimal Install 완료
- TCG에서 최신 UEK 커널 부팅 및 `test1` 로그인 성공

## 혼동 방지

### xen02 → xen03과 xen02 → xen01

- `xen02 → xen03`: 실제 이관 목표와 계획 문서
- `xen02 → xen01`: 실제로 수행한 1차 연습 환경
- `.101~.103`: source VM 주소로 사용
- `.81~.83`: 연습 target VM 주소로 사용
- 새 작업에서 target을 추측하지 말고 반드시 `hostname`과 `hostname -i`로 확인

### Rocky Linux 9.6과 Oracle Linux

- 조사 당시 source VM은 Rocky Linux 9.6이었다.
- 기존 참고 런북은 VMware와 Oracle Linux 9.6을 전제로 했다.
- 앞으로 고객사 목표 OS는 Oracle Linux 10이다.
- VMware/Oracle Linux 런북 명령을 Xen/Rocky 또는 QEMU/Oracle Linux 10에 그대로 실행하면 안 된다.

### 개발계·운영계·로컬 실습

- `aivbsvr1v`, `aivbdb1v`: 고객사 개발계로 언급된 이름이며 실제 topology와 IP는 재확인 필요
- `aivbsvr1p~3p`, `aivbdb1p~2p`: 고객사 운영계로 언급된 이름이며 실제 연결 정보는 재확인 필요
- `xen01`, `xen02`, `xen03`: 사내 Xen 학습·이관 환경
- `meritz-ol10-01`: Windows 로컬 QEMU 연습 VM
- 서로 다른 환경의 IP, 포트, 계정, 설정을 섞지 않는다.

## 보안과 변경 통제

### 절대 문서에 넣지 않을 것

- SSH 개인키 내용
- DB·Redis·애플리케이션 비밀번호
- API token, cookie, session secret
- 고객 개인정보와 실제 운영 데이터
- `.env`의 비밀값

### 변경 전에 필요한 것

- 작업 승인과 작업 시간
- source/target 정확한 식별
- 변경 전 파일 백업과 checksum
- rollback 방법과 담당자
- source와 target의 동시 쓰기 방지
- IP/MAC/DNS/VIP 충돌 방지
- 변경 전후 증적

### 금지 원칙

- source와 target을 같은 IP로 동시에 운영망에서 기동하지 않음
- `killall java`, 광범위한 `rm -rf`, 무검증 data 디렉터리 복사 금지
- source Redis에서 `FLUSHALL` 금지
- Elasticsearch raw data 복사 금지
- target write 발생 후 단순히 L4/DNS만 source로 되돌리지 않음
- 회사 보안정책, UAC, BIOS, Code Integrity 정책을 임의로 제거하지 않음

## 현재 남은 작업

### 트랙 A / 실제 tc-xen02 → tc-xen03

- Xen 관리자 인증 확보
- 두 호스트의 pool 관계 확인
- 공유 SR 여부와 여유 공간 확인
- target network/VLAN/bond 확인
- live migration, XVA export/import, OS 재구축 중 실제 방식 승인
- 임시 IP와 최종 IP/DNS/VIP 설계
- 서비스별 source/target 연결표 확정
- backup/restore와 rollback 리허설
- 실제 시뮬레이터 성공 데이터와 판정 기준 확정

### 트랙 B / xen02 → xen01 실습

- 운영용 최종 증적 문서 검토
- 서비스별 버전·설정·데이터 수량을 source/target 표로 최종 대조
- Scheduler 단일 실행과 job 영향 검증
- Logstash/Kibana/Qdrant의 최종 검증 결과가 누락됐는지 확인
- 필요 시 reset은 NFS 해제와 보존 대상 확인 후 진행

### 트랙 C / QEMU Oracle Linux 10

- 게스트에서 `ip addr` 확인
- `sshd` 설치·활성 상태 확인
- Windows `127.0.0.1:2222 → VM:22` 접속 확인
- PuTTY, Windows ssh, scp, WinSCP 확인
- 정상 TCG qcow2를 보존하고 복사본 생성
- 복사본에서 WHPX + x86-64-v3 시험
- WHPX 성공 시 AVX2와 부팅·서비스 안정성 확인
- 실패 시 TCG 유지 또는 Linux/KVM 대안 검토
- 설치용·일반 부팅용 `.bat` 작성
- 로컬 VM에 서비스 연결 연습 환경 구성

## 핵심 산출물 안내

### 가장 먼저 볼 문서

- `AGENTS.md`: 사용자가 요구한 안내 규칙
- `extras/server-migration/CODEX_MASTER_HANDOFF.md`: 전체 프로젝트 맥락과 현재 상태
- `extras/qemu-oracle-linux/QEMU_ORACLE_LINUX_HANDOFF.md`: 로컬 QEMU 작업 상세
- `산출물/메리츠_xen02_xen01_1차_이관실습_전체기록.docx`: 실제 실습 전체 기록
- `산출물/메리츠_xen02_xen01_운영용_런북.docx`: 운영 작업 순서
- `산출물/메리츠_xen02_xen01_핵심_체크리스트.docx`: 작업 전후 점검표
- `산출물/메리츠_xen02_xen01_트러블슈팅_부록.docx`: 오류 대응
- `산출물/메리츠_운영_이관완료후_검증_및_연결설정_가이드.docx`: 이관 후 연결 검증

### 학습용 PDF

- `output/pdf/01_이관에_필요한_이론과_기초지식.pdf`
- `output/pdf/02_xen02에서_xen03으로_전체이관_계획.pdf`
- `output/pdf/03_실제_이관_행동방법과_명령어_해설.pdf`
- `output/pdf/04_메리츠_런북_쉬운설명버전.pdf`
- `output/pdf/통합_리눅스_서비스이관_실습교재_v3.pdf`
- `output/pdf/VM2에서_VM1_실제실습_초보자용_명령어_순서_v3.pdf`

### 원자료와 해설

- `01_녹음_원문_자동전사.md`: 녹음 전사 원문
- `02_런북_기반_녹음_설명_정리.md`: 전사와 런북 대조 해설
- `output/runbook/vmware-mirror-ol10-migration-runbook_쉬운설명추가.html`: 기존 런북 쉬운 설명

## 다른 노트북에서 이어가는 실제 방법

### 프로젝트 문서 동기화

- 이 프로젝트 폴더는 현재 OneDrive 아래에 있으므로 동일 Microsoft 계정으로 폴더를 완전히 동기화한다.
- 새 노트북에서 파일 옆에 구름 아이콘만 있으면 오프라인 파일이 아닐 수 있으므로 먼저 다운로드 완료를 확인한다.
- 새 노트북 Codex에서 이 폴더를 로컬 프로젝트로 연다.
- 첫 메시지로 문서 맨 위의 인수인계 프롬프트를 붙여 넣는다.
- `AGENTS.md`가 같은 폴더에 있어야 안내 규칙이 유지된다.

### Git 사용 주의

- 현재 Git remote는 `prayer0420/ch2ch-attendance-dashboard`로 확인됐다.
- 이 migration 문서는 해당 코드 저장소의 본래 목적과 다를 수 있고 회사 정보가 포함될 수 있으므로 승인 없이 remote에 push하지 않는다.
- 회사 자료를 Git으로 옮기려면 반드시 비공개 저장소와 회사 정책을 먼저 확인한다.
- 현재 working tree에는 이 작업과 무관한 수정 파일이 있으므로 전체를 일괄 commit하지 않는다.

### 대화 자체의 한계

- Codex 로컬 작업은 프로젝트 폴더, 터미널, VM, SSH 키 같은 현재 컴퓨터의 상태에 의존한다.
- 같은 OpenAI 계정으로 로그인해도 다른 PC에 로컬 폴더·터미널·실행 중 VM·SSH 키가 자동 복제되는 것은 아니다.
- OpenAI 공식 안내상 Codex는 Chat/Work와 별도 이력이며, cloud Work 채팅과 달리 로컬 Codex 작업은 다른 기기에서 동일한 로컬 상태를 자동으로 이어받는 방식이 아니다.
- 따라서 **대화는 이 문서로**, **프로젝트 파일은 OneDrive 또는 승인된 private 저장소로**, **VM 디스크는 별도 안전 복사로**, **SSH 키는 회사 정책에 따른 보안 이동으로** 나누는 것이 안전하다.

### VM 파일 주의

- QEMU qcow2는 프로젝트 폴더 밖 `C:\Users\c\QEMU VMs\meritz-ol10-01`에 있어 OneDrive 프로젝트 동기화에 포함되지 않는다.
- 다른 노트북에서도 같은 VM을 사용하려면 VM이 완전히 종료된 상태에서 qcow2를 별도로 복사해야 한다.
- 동일 qcow2 파일을 두 컴퓨터에서 동시에 실행하지 않는다.
- 새 노트북의 CPU·WHPX 상태가 다르면 같은 명령으로도 동작이 달라질 수 있다.

## 다음 Codex가 먼저 물어볼 한 가지

```text
지금 이어갈 작업은 A) 실제 tc-xen02→tc-xen03 현장 이관,
B) xen02→xen01 실습 복기·검증,
C) 로컬 QEMU Oracle Linux 10의 SSH 설정 중 어느 것인가요?
```

사용자가 하나를 선택한 뒤에만 해당 트랙의 현재 소단계로 들어간다. 세 환경의 명령과 주소를 한 답변에 섞지 않는다.
