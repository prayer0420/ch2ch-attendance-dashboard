# 로컬 QEMU 사전실습 3회차 — 미들웨어·애플리케이션·CMS 기능

## 회차 정의

- 상태: 예정, 실제 결과 미기록
- 선행조건: 2회차 build와 DB CRUD 통과
- 목표: Redis, ZooKeeper, Solr, Elasticsearch/Logstash와 애플리케이션을 순차 연결하고 CMS 실제 기능을 end-to-end로 검증한다.

## 소단계와 통과 기준

| 소단계 | 작업 | 통과 기준 |
|---|---|---|
| 3-1 | `ol10lab` 외부 설정 | 기존 운영/개발 주소와 실제 외부 API 호출 차단 |
| 3-2 | Redis | protocol PING 외에 실제 세션/캐시 확인 |
| 3-3 | ZooKeeper | node/chroot 상태 정상 |
| 3-4 | Solr | configset, collection, alias, replica, 대표 검색 정상 |
| 3-5 | Elasticsearch | 승인 버전 cluster와 snapshot restore 검증 |
| 3-6 | Logstash | 샘플 로그가 target ES에서 조회됨 |
| 3-7 | Master/CMS/Engine/Gateway/Chat UI | 각 process·port·log·API 정상 |
| 3-8 | Scheduler | 마지막에 단일 인스턴스로 제한 기동 |
| 3-9 | CMS 업무 기능 | 로그인·조회·등록·수정·검색·업로드·챗봇 흐름 정상 |
| 3-10 | 재부팅·롤백 | 재부팅 후 재현, 실패 시 checkpoint 복구 가능 |

## 서비스 시작 원칙

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
→ Chat UI
→ Scheduler 마지막 단일 실행
```

실제 dependency가 소스·운영 설정에서 다르면 순서를 수정하고 근거를 기록한다.

## Elasticsearch 전환 원칙

- 기존 7.8 정확한 patch, plugin, index 생성 버전, template, alias, pipeline 수집
- 현재 애플리케이션 client `7.8.0` 기준 기능 확보
- raw data directory 복사 금지
- Snapshot/Restore 우선
- snapshot version과 index 생성 버전의 대상 호환성 확인
- OS 전환과 Elastic major upgrade를 가능한 한 분리
- 필요 시 전환용 7.17 검증 단계를 거치되 7.17을 장기 최종안으로 자동 확정하지 않음
- 8.x 전환 시 7.16+ High Level REST Client compatibility mode 또는 신규 Java API Client 검토

## 로컬 자원 제한

APP 약 7.3GiB에서 모든 Java 서비스를 동시에 기본 heap으로 실행하면 OOM 가능성이 높다.

- 구성요소별 설치·API 시험은 순차 실행
- 최종 연결시험은 필요한 구성만 작은 heap으로 제한
- `free -h`, Java RSS, kernel OOM log를 기록
- 로컬 성공을 운영 성능·HA 승인으로 해석하지 않음

## CMS 기능 체크리스트

- 로그인 성공과 Redis session 확인
- 권한별 메뉴 노출
- 목록·상세 조회
- 승인된 테스트 콘텐츠 등록·수정·삭제
- 한글·특수문자·긴 문자열
- 파일 업로드·다운로드와 저장경로 권한
- Solr 색인 반영과 대표 한국어 검색
- Gateway→Engine 요청
- 기존 환경에서 성공한 정상 botCode 사용
- HTTP 200, 정상 업무 code, 유효 sessionKey, 기대 메시지
- DB 데이터 반영
- 애플리케이션 로그와 Elasticsearch 수집
- 브라우저 Console/Network의 JS·CORS·API URL 확인
- Scheduler job은 승인 범위에서 한 번만 실행

과거 `B2B_BASIC_CODE`는 source에서도 실패했으므로 이관 판정 기준으로 사용하지 않는다. 정상 이력이 있는 `TC_CALLBOT` 같은 기준 데이터를 사용한다.

## 예상 장애 분류

| 오류 | 우선 범주 |
|---|---|
| UnknownHostException | DNS/hostname/profile |
| Connection refused | 서비스 미수신/포트/listen 주소 |
| timeout | firewalld/ACL/route/IP |
| Redis NOAUTH | secret/ACL/profile |
| Solr collection null | alias/configset/ZK 주소 |
| ES red | primary shard/allocation/disk/plugin |
| Logstash retry | output 주소/인증/TLS/pipeline |
| CMS 500 | 같은 시각 APP log와 dependency 오류 |
| UI blank | 정적 자산/Node build/API base URL/CORS |
| Java `Killed` | OOM/heap 합계 |

## 실제 결과 기록란

상세 변경 위치와 2회차 재사용 절차는 `FULL_BUILD_RUN_01_CHANGE_CHECKLIST.md`에 계속 갱신한다.

```text
[Redis]
상태: 5.0.8 3-master cluster·연결시험 완료, 자동기동 보류
버전/topology:
오류/조치/결과:

[ZooKeeper/Solr]
상태: ZK 3.6.1 quorum, Solr 7.6.0 3-node와 collection restore 완료
버전/configset/collection/alias:
오류/조치/결과:

[Elasticsearch/Logstash]
상태: ES 7.8.0 3-node green·snapshot restore, Logstash 시험 pipeline 완료
source/target/snapshot:
오류/조치/결과:

[애플리케이션/CMS]
상태: tc profile의 DB·Redis·Solr·ZK·ES 및 내부 URL 변경 중
서비스별 port와 시작 결과:
업무 기능 결과:
오류/조치/결과:

[재부팅/롤백]
상태: 예정
결과:
```

## 종료 조건

CMS 화면만 표시되는 것이 아니라 DB·Redis·Solr·Elasticsearch·내부 서비스까지 연결된 기능이 성공해야 한다. 재부팅 후 재현되고, 실패 시 복구 절차와 소요시간이 기록돼야 한다.
