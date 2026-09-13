# 메리츠 Oracle Linux 10 실습·현장 문서 허브

이 폴더는 로컬 QEMU 사전실습 1~3회와 2026-09-14 고객사 개발계 작업을 빠르게 이어가기 위한 전용 허브다. 새 Codex 대화에서는 이 파일을 먼저 읽고 현재 환경과 실습 회차를 식별한다.

## 새 대화에서 읽는 순서

1. 프로젝트 루트 `AGENTS.md`
2. `docs/meritz-ol10/README.md` — 이 파일
3. `docs/current/CURRENT_STATE.md` — 가장 최근 완료 지점
4. 현재 작업에 맞는 실습 또는 현장 문서
5. 상세 판단이 필요할 때 `docs/current/MERITZ_OL10_FIELD_PRACTICE_MASTER_GUIDE.md`
6. 원시 증적이 필요할 때만 `MERITZ_OL10_PREFLIGHT_DETAIL.md`, `MERITZ_OL10_PREFLIGHT_RAW.md`

## 환경을 먼저 구분한다

| 환경 | 의미 | 대표 호스트·주소 |
|---|---|---|
| 로컬 QEMU | 고객사 방문 전 Oracle Linux 10 축소 실습 | APP `meritz-ol10-01`/`192.168.50.10`, DB `meritz-db01`/`192.168.50.20` |
| 고객사 개발계 | 2026-09-14부터 실제 확인할 환경 | 실제 hostname/IP를 현장에서 확인하기 전까지 추측 금지 |
| xen02→xen01 연습 | 과거 1차 서비스 이관 연습 | `extras/server-migration/` 문서 기준 |
| 실제 xen02→xen03 | 별도 실제 이관 트랙 | 승인된 실제 topology 확인 후 진행 |

서로 다른 환경의 IP·hostname·포트·명령 결과를 섞지 않는다.

## 실습 회차

| 회차 | 범위 | 상태 | 문서 |
|---|---|---|---|
| 1회 | QEMU·OL10·WHPX·SSH·APP/DB 분리·사설망·백업·소스 사전분석 | 완료 | `practice/PRACTICE_01_FOUNDATION_AND_PREFLIGHT.md` |
| 2회 | JDK 8·Maven·소스 전송·첫 build·MariaDB 10.11·CRUD | 예정 | `practice/PRACTICE_02_BUILD_AND_DATABASE.md` |
| 3회 | Redis·ZooKeeper·Solr·Elasticsearch/Logstash·애플리케이션·CMS 기능 | 예정 | `practice/PRACTICE_03_FULL_STACK_AND_CMS.md` |

“예정” 문서의 체크 항목은 실제 실행 전 계획이다. 명령을 실행하지 않았는데 완료로 바꾸지 않는다. 실행 시각·명령·출력·판정·오류·복구를 실제 결과로 추가한다.

## 고객사 현장 문서

| 문서 | 용도 |
|---|---|
| `field/MONDAY_2026-09-14_FIELD_START.md` | 현장 도착 후 변경 전 확인, 자료 요청, 작업 gate |
| `field/INCIDENT_QUICK_INDEX.md` | 오류 문구와 증상으로 바로 원인 범주와 다음 조회 찾기 |
| `docs/current/MERITZ_OL10_FIELD_PRACTICE_MASTER_GUIDE.md` | OS 전환 원리, 서비스별 상세 위험, 전체 성공 기준 |

## 실제 수행 체크리스트

- `practice/FULL_BUILD_RUN_01_CHANGE_CHECKLIST.md` — 1회차의 변경 위치·값·이유·검증·시행착오를 정리한 2회차 재사용본

## 현재 확정된 주요 결정

- 최종 목표는 CMS 화면 표시가 아니라 DB·Redis·Solr·Elasticsearch·내부 서비스까지 포함한 실제 기능 성공이다.
- 로컬 QEMU 기반은 완료됐고 애플리케이션 stack 설치는 아직 시작하지 않았다.
- Java 8 + Spring Boot 2.3.0.RELEASE이므로 OL10 기본 Java 21로 바로 실행하지 않는다.
- 현재 받은 소스는 Maven/JAR 구조다. 소스 내 Gradle/WAR/JBoss 문서 2개는 2026-09-12 사용자 확인으로 현재 메리츠에는 틀린 과거 매뉴얼로 확정했으며 사용하지 않는다.
- 로컬 MariaDB 1차 시험은 OL10 저장소의 10.11.18을 사용하고 10.6 dump 호환성을 검증한다.
- Elasticsearch 7.8 데이터는 raw data 복사가 아니라 Snapshot/Restore를 사용한다.
- 로컬 1차 OL10 시험은 Elasticsearch 7.8 계열과 현재 애플리케이션 client 7.8.0을 유지해 OS 변경 영향부터 확인한다. 최종 장기운영 버전 승인은 별도다.
- SELinux Enforcing과 firewalld active를 유지한 상태에서 통과해야 한다.
- Scheduler는 마지막에 승인된 한 인스턴스만 실행한다.
- 비밀번호·토큰·개인키·고객 개인정보는 기록하지 않는다.

## Codex에 현장 오류를 질문할 때 함께 줄 정보

다음 여섯 항목을 주면 원인분류가 가장 빨라진다.

```text
환경: 로컬 QEMU / 고객사 개발계 / 기존 개발계
대상: hostname, APP/DB 역할, 서비스명
직전 작업: 방금 실행한 명령 또는 변경한 파일
증상: 오류 전문, HTTP status, 화면 현상
상태 증적: systemctl/ps/ss/curl 등 현재 출력
관련 로그: 같은 시각의 journal 또는 애플리케이션 로그 30~100줄
```

비밀번호·토큰·cookie·개인키·실제 고객 데이터는 가리고 전달한다.

## 빠른 재개 문구

새 대화에서는 다음처럼 요청한다.

```text
AGENTS.md와 docs/meritz-ol10/README.md, docs/current/CURRENT_STATE.md를 읽고
현재 환경과 실습 회차를 먼저 말해줘. 지금 발생한 증상은 아래와 같아.
[hostname / 서비스 / 명령 / 오류 / 로그]
변경 명령 전에 원인 범주와 조회 명령부터 알려줘.
```
