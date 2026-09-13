# 로컬 QEMU 사전실습 2회차 — Java·빌드·MariaDB

## 회차 정의

- 상태: 진행 중 — JDK 8·Maven·소스 전송·전체 build 완료, MariaDB 미착수
- 환경: 로컬 QEMU APP `meritz-ol10-01`, DB `meritz-db01`
- 목표: OL10에서 Java 8 기반 메리츠 소스를 빌드하고, MariaDB 10.11에 schema/sample 또는 승인 dump를 복원하여 APP에서 CRUD까지 성공한다.

## 소단계와 통과 기준

| 소단계 | 작업 | 통과 기준 |
|---|---|---|
| 2-1 | JDK 8 공급처·라이선스·checksum 확정 | 완료 — Amazon Corretto 8 RPM, 공식 SHA256 일치 |
| 2-2 | APP JDK 8 설치 | 완료 — `java`, `javac` 1.8.0_504 |
| 2-3 | Maven 설치·Java 연결 | 완료 — Maven 3.9.9, `.mavenrc`로 Corretto 8 지정 |
| 2-4 | 소스 전송 | 완료 — Windows/APP archive SHA256 일치, 파일 5,168개 |
| 2-5 | 최초 Maven reactor build | 완료 — 수정 없이 전체 `BUILD SUCCESS` |
| 2-6 | 산출물 검증 | 진행 중 — 모듈별 JAR, 크기, SHA256 확인 예정 |
| 2-7 | DB 기준정보 수집 | 10.6 설정·문자셋·collation·SQL mode·timezone 확인 |
| 2-8 | MariaDB 10.11 구성 | service, bind, port, firewalld, SELinux 정상 |
| 2-9 | schema/data 복원 | 첫 오류 없이 완료 또는 실패 객체·원인 분리 |
| 2-10 | APP→DB 검증 | TCP→로그인→SELECT→INSERT/UPDATE/DELETE 시험 통과 |

## 시작 전 필요한 자료

- 고객사에서 허용되는 JDK 8 배포판과 정확한 patch
- JDK 설치 파일 또는 승인 repository
- 실제 MariaDB 10.6 정확한 patch와 `my.cnf` 비밀값 제외본
- DB dump 또는 로컬용 schema/sample SQL
- DB명, 문자셋, collation, SQL mode, timezone
- 테스트 DB 계정 생성 원칙; 비밀번호는 문서에 기록하지 않음

## 로컬 소스 전송과 고객사 배포의 차이

로컬 QEMU에서는 회사 Windows의 압축 해제 소스를 `tar.gz`로 묶어 `127.0.0.1:2222` SCP로 APP VM에 전달한다. 이것은 로컬 실습 VM에 파일을 넣기 위한 전용 절차다.

고객사 개발계에서는 이 Windows 경로와 localhost SCP 절차를 사용하지 않는다. 고객사가 승인한 CI/CD, 빌드 서버, 사내 artifact repository, SFTP 중계서버, 보안 반입매체 또는 이미 미러링된 배포 파일을 사용한다. 실제 운영 원칙은 가능하면 target 서버에서 임의로 소스를 압축·빌드하는 것이 아니라, 승인된 build 환경에서 생성한 JAR/WAR를 checksum과 함께 배포하는 것이다. 이번에는 OL10에서 소스 자체가 빌드되는지 확인하려는 호환성 실습이므로 예외적으로 APP VM에서 build한다.

## 첫 build에서 기록할 것

```text
실행 일시:
APP hostname:
java -version:
javac -version:
mvn -v:
소스 SHA256:
실행 명령:
종료코드:
처음 실패한 Maven module:
첫 ERROR와 Caused by:
원인 범주: JDK / repository / dependency / source / frontend / native library / 미확정
적용한 변경 1개:
재검증 결과:
```

소스 수정 전에 최초 실패 로그를 보존한다. 여러 POM·repository·Java 설정을 동시에 바꾸지 않는다.

## MariaDB 전략

- 로컬 1차 target: OL10 저장소 MariaDB 10.11.18
- source 기준: MariaDB 10.6.7 기록
- 애플리케이션 MariaDB JDBC driver 2.7.5는 첫 시험에서 유지
- 기본 이관: 새 10.11 인스턴스 + logical dump/restore
- 구버전 datadir을 실행 중인 상태에서 복사하지 않음
- `mariadb-upgrade`는 같은 datadir을 major upgrade하거나 물리 승계할 때의 공식 절차로 구분

## 예상 오류와 확인 방향

| 증상 | 우선 확인 |
|---|---|
| JDK 8 설치 불가 | 공급처, x86_64, 라이선스, OL10 실행 여부 |
| `UnsupportedClassVersionError` | build JDK와 runtime JDK 불일치 |
| dependency resolve 실패 | DNS, proxy, Maven repository, 인증서, artifact 존재 |
| `simplecaptcha` 누락 | `libs/simplecaptcha-1.2.1.jar` 상대경로와 system scope |
| frontend build 실패 | Node/npm/Webpack 3 호환성; 백엔드 build와 분리 |
| DB `Access denied` | 계정 host, 권한, secret 공급 위치, 인증 plugin |
| DB unknown collation | source/target collation 지원 여부 |
| dump DEFINER 오류 | view/procedure/trigger의 계정과 권한 |
| SQL mode 오류 | source/target `sql_mode` 비교 |
| APP DB timeout | `192.168.50.20:13306`, listen, firewalld, route |

## 실제 결과 기록란

아래는 실행할 때 채운다. 계획을 완료로 표시하지 않는다.

```text
[2-1 JDK 8 결정]
상태: 완료
결과: Corretto 8.504.01.1, `java`/`javac` 1.8.0_504
오류: Maven 설치가 Java 21을 추가하고 Maven이 Java 21을 선택함
판정: Java 21은 보존하고 `~/.mavenrc`의 `JAVA_HOME=/usr/lib/jvm/java-1.8.0-amazon-corretto`로 Maven만 Java 8 사용

[2-2~2-6 build]
상태: 2-5까지 완료, 2-6 진행 중
결과: `mvn clean package -DskipTests |& tee ~/build-01.log`; 루트, common, persistence, cms, engine, gateway, chat-ui, scheduler, master 전부 SUCCESS; 1분 22초
오류: 실패 없음. deprecated API와 unchecked operation compiler warning만 존재
판정: OL10 + Corretto 8u504 + Maven 3.9.9에서 현재 Maven reactor source build 호환성 통과

[2-7~2-10 MariaDB]
상태: 예정
결과:
오류:
판정:
```

## 종료 조건

- 재현 가능한 JDK 8/Maven build
- 모든 필요한 JAR 산출물 식별
- MariaDB schema/sample 또는 승인 데이터 복원
- APP에서 MariaDB CRUD 성공
- 오류와 해결 과정을 `SESSION_LOG.md`와 이 문서에 반영
- 다음 회차 전에 VM을 정상 종료한 시점의 추가 checkpoint 여부 판단
