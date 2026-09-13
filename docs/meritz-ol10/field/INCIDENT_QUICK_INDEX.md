# 고객사 현장 장애 빠른 찾기

## 사용법

오류가 나면 서비스 설정을 바로 바꾸지 말고 증상과 가장 가까운 행을 찾는다. 조회 결과와 로그를 확보한 다음 변경은 하나씩 적용한다.

| 증상·오류 | 의미 후보 | 첫 확인 | 흔한 원인 |
|---|---|---|---|
| `command not found` | 명령 또는 패키지 없음 | 입력 오타, `command -v`, package | PuTTY 제어문자, 오타, 미설치 |
| `UnknownHostException` | 이름 해석 실패 | `getent hosts 이름` | DNS, `/etc/hosts`, 옛 hostname |
| `Connection refused` | 대상 도달, port 미수신 | 대상 `systemctl`, `ss -lntp` | 서비스 중지, bind/port 오류 |
| `Connection timed out` | 응답 경로 차단 | IP, route, firewalld, ACL | 잘못된 IP, 방화벽, cluster 내부 port |
| `Access denied` | 인증·권한 실패 | 계정명, host 권한, secret 공급 위치 | DB GRANT, 만료, 잘못된 profile |
| `PKIX path building failed` | Java trust 실패 | 인증서 chain, truststore, 시간 | 사내 CA 누락, 만료, SAN 불일치 |
| TLS handshake 실패 | protocol/cipher 불일치 | 양쪽 TLS 버전·인증서·OL10 crypto policy | 구형 TLS, 인증서, cipher |
| `UnsupportedClassVersionError` | Java class version 불일치 | build/runtime `java -version` | Java 21 build 후 Java 8 실행 등 |
| `ClassNotFoundException` | JAR/dependency 누락 | artifact 내용, Maven tree | packaging, scope, 외부 JAR 누락 |
| `NoSuchMethodError` | 런타임 library 충돌 | dependency tree와 실제 classpath | 서로 다른 library 버전 |
| `lib*.so not found` | native library 누락 | `file`, `ldd`, loader path | glibc/arch/package 차이 |
| systemd `active`인데 port 없음 | wrapper만 성공 또는 child 종료 | `journalctl`, process, `ss`, app log | profile, working dir, 환경변수 |
| `Permission denied` | UNIX 권한 또는 SELinux | `namei -l`, `ls -lZ`, AVC | 소유권, mode, context |
| Java가 `Killed` | OOM 가능 | `free`, process RSS, kernel log | heap 합계가 RAM 초과 |
| MariaDB `DEFINER` 오류 | dump 객체 계정 부재 | view/trigger/procedure 정의 | 원본 계정이 target에 없음 |
| MariaDB collation 오류 | target 미지원/차이 | charset/collation 목록 | 버전 차이 |
| MariaDB ERROR 1032 | dump DML 전제와 target 불일치 | 첫 오류 줄, 대상 table, 부분 적용 | dump 반복 실행, 기존 데이터 |
| Redis `NOAUTH` | 인증 필요/오류 | profile, ACL/user | secret 또는 ACL 차이 |
| Redis `CLUSTERDOWN` | slot/cluster 불완전 | nodes, info, slots | announce IP, bus port, replica |
| Solr collection null | collection/alias를 못 찾음 | ZK 주소, alias, collection list | chroot/configset/alias 누락 |
| Solr replica down | node/core 통신 실패 | live_nodes, core, replica, log | hostname, 방화벽, core path |
| ES `red` | primary shard 사용 불가 | health, allocation explain | disk, plugin, incompatible index |
| ES restore 실패 | snapshot/index 비호환 | snapshot version, index creation version | 목표 버전, plugin/analyzer |
| Logstash 재시도 반복 | output 실패 | pipeline log, output URL, TLS/auth | 옛 ES 주소, 인증, plugin |
| CMS HTTP 500 | 서버 내부 처리 실패 | 같은 시각 CMS log와 하위 서비스 | DB/Redis/Solr/ES/profile |
| CMS 화면만 뜨고 기능 실패 | 정적 UI와 API 분리 | 브라우저 Network/Console | API URL, CORS, Gateway/Engine |
| 로그인 후 세션 유지 안 됨 | Redis/cookie/time 문제 | Redis key, cookie, timezone | session store, domain, SameSite |
| 검색 결과 없음 | Solr 색인/alias/analyzer | collection, alias, doc count, query | configset, 색인 job, 한글 analyzer |
| 챗봇 `sessionKey=null` | 요청 기준 또는 Engine/데이터 문제 | source 동일 요청 비교 | 잘못된 botCode, Solr 데이터 |
| Scheduler 중복 처리 | 복수 인스턴스 실행 | process/unit 수, job log | 두 서버 동시 active |

## 공통 조회 순서

```text
대상 hostname 확인
→ 직전 변경 확인
→ process 상태
→ listen port
→ 이름/IP/TCP
→ 같은 시각 로그
→ 실제 profile·설정 우선순위
→ 하위 시스템 API/로그인
→ 기존 환경 동일 요청 비교
```

## 금지되는 즉흥 조치

- 원인 확인 전 SELinux 영구 해제
- firewalld 전체 중지로 완료 판정
- 여러 설정을 동시에 변경
- source Redis `FLUSHALL`
- 실행 중 MariaDB datadir 복사
- Elasticsearch raw data directory 복사
- `killall java`
- Scheduler 여러 대 동시 기동
- 오류 난 dump 전체를 상태 확인 없이 반복 실행
- target에 쓰기가 시작된 뒤 데이터 정합성 판단 없이 트래픽만 source로 복귀

## 상세 문서 연결

- 전체 원리와 서비스별 위험: `docs/current/MERITZ_OL10_FIELD_PRACTICE_MASTER_GUIDE.md`
- 월요일 시작 순서: `docs/meritz-ol10/field/MONDAY_2026-09-14_FIELD_START.md`
- 현재 완료 지점: `docs/current/CURRENT_STATE.md`
- 날짜별 실제 실행 결과: `docs/logs/SESSION_LOG.md`
