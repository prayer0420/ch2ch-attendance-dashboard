from pathlib import Path
import html
import re
from deep_explanation import deep_explanation

SOURCE = Path(r"C:\Users\c\Documents\카카오톡 받은 파일\vmware-mirror-ol10-migration-runbook.html")
MIGRATION_ROOT = Path(__file__).resolve().parents[2]
OUTPUT = MIGRATION_ROOT / "output" / "runbook" / "vmware-mirror-ol10-migration-runbook_쉬운설명추가.html"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

STYLE = r'''
    /* 아래 easy-explain 블록은 원본 런북의 내용을 바꾸지 않고 추가한 설명이다. */
    .easy-explain {
      margin: 18px 0 26px;
      padding: 18px 20px 16px;
      border: 2px solid #7aa7d9;
      border-radius: 12px;
      background: #f3f8fe;
      color: #243b53;
    }
    .easy-explain .easy-title {
      margin: 0 0 8px;
      color: #155eef;
      font-size: 17px;
      font-weight: 800;
    }
    .easy-explain p { margin: 8px 0; }
    .easy-explain ul { margin: 8px 0 4px; }
    .easy-explain li { margin: 4px 0; }
    .easy-explain .easy-check {
      margin-top: 12px;
      padding: 10px 12px;
      border-left: 4px solid #067647;
      background: #ecfdf3;
    }
    .easy-explain .easy-danger {
      margin-top: 12px;
      padding: 10px 12px;
      border-left: 4px solid #b42318;
      background: #fef3f2;
    }
    @media print {
      .easy-explain { break-inside: avoid; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
'''

EXPLANATIONS = {
"1. 목적·범위": ("이 부분은 이사 계획의 지도입니다.", "이 문서는 현재 서버에서 새 환경으로 옮길 때 어디까지 다루고 어디부터는 다른 담당자와 상의해야 하는지를 정합니다. ‘포함’은 이번 작업의 범위이고, ‘별도 협의’는 네트워크·VMware·운영 중단처럼 다른 담당자의 승인이 필요한 부분이며, ‘금지’는 실수하면 원본 데이터를 잃을 수 있어 절대 함부로 하지 않는 행동입니다.", "여기서 가장 중요한 사실은 목표가 Oracle Linux 9.6이라는 점과, 원본 OS 종류는 추측하지 말고 실제 서버에서 다시 확인해야 한다는 점입니다. 즉, 이 문서는 ‘무조건 그대로 실행하는 요리법’이 아니라, 현장 확인 결과에 따라 다음 행동을 선택하는 안전한 작업지도입니다.", "실제 결과물: 작업 범위표, 원본 OS 확인 결과, 담당자 승인."),
"2. 작업 원칙과 전환 모델": ("이 부분은 이관의 기본 약속입니다.", "VMware 미러는 컴퓨터 한 대를 통째로 복사해 옮기는 출발점입니다. 하지만 안에 있는 Redis·MariaDB·Solr·Elasticsearch 같은 데이터는 각각 성격이 다르기 때문에, ‘VM을 복사했으니 모든 데이터가 완벽하게 옮겨졌다’고 보면 안 됩니다.", "그래서 이 런북은 큰 컴퓨터는 미러로 준비하고, 데이터는 제품이 제공하는 안전한 백업·복원 방법을 사용합니다. MariaDB는 업무 데이터라 조심하고, Redis는 다시 만들 수 있는 cache인지 확인하며, Solr와 Elasticsearch는 각각 BACKUP/RESTORE와 Snapshot/Restore를 사용합니다.", "멈춤 기준: 원본과 target을 동시에 같은 주소로 켜지 않기, source에서 파괴 명령 실행하지 않기."),
"3. 현행 기준정보": ("이 부분은 이사 전 집의 사진입니다.", "현재 어떤 서버에 어떤 프로그램이 있고, 몇 번 문(port)을 쓰며, 데이터가 어느 폴더에 있는지 기록한 표입니다. 이 표가 있어야 이사 후 ‘무엇이 빠졌는지’를 비교할 수 있습니다.", "표의 값 중 ‘관찰값’과 ‘추정값’을 구분해야 합니다. 예를 들어 서비스 버전과 포트는 실제 조회로 확인해야 하고, 문서에 적힌 주소나 버전이 현재 실행 중인 값과 다르면 실제 조회 결과를 우선합니다.", "확인할 것: VM별 IP·hostname·OS·서비스·포트·데이터 경로·담당자."),
"3.1 현재 VM 배포 JAR 기준 checksum": ("checksum은 파일의 지문입니다.", "JAR 파일을 복사할 때 파일 이름만 같다고 같은 파일이라는 뜻은 아닙니다. SHA-256 checksum은 파일 내용을 계산한 긴 문자열이라서, 복사 전후 값이 같으면 내용이 바뀌지 않았다고 판단하는 데 도움을 줍니다.", "이 값은 ‘이 프로그램을 새로 빌드해서 교체한다’는 뜻이 아닙니다. 현재 VM에서 실제로 실행하던 JAR을 원본으로 삼아 그대로 보존하고, target에서도 같은 지문인지 확인한다는 뜻입니다.", "성공 기준: source와 target의 파일명·크기·권한·SHA-256이 승인된 기준과 일치."),
"4. 역할·사전조건·변수": ("이 부분은 누가 무엇을 준비해야 하는지 정하는 곳입니다.", "서버 이관은 한 사람이 명령어를 잘 입력한다고 끝나지 않습니다. VMware 담당자는 VM을 옮길 수 있어야 하고, DB 담당자는 데이터가 맞는지 판단해야 하며, 애플리케이션 담당자는 CMS와 시뮬레이터가 정상인지 확인해야 합니다.", "변수 시트는 명령어 속 빈칸을 실제 값으로 채우는 표입니다. 예를 들어 SOURCE_IP, TARGET_IP, VM UUID, SR UUID를 잘못 넣으면 엉뚱한 서버를 건드릴 수 있으므로, 명령어보다 먼저 변수표를 확정합니다.", "멈춤 기준: 대상 IP·VM UUID·저장소·담당자가 하나라도 미확정이면 실행하지 않음."),
"4.1 작업 전 필수조건": ("이 목록은 출발 신호가 아니라 안전벨트입니다.", "백업이 있고, target 저장공간이 충분하고, 테스트 IP가 있고, 롤백 담당자가 정해져 있어야 작업을 시작할 수 있다는 뜻입니다. 하나라도 빠지면 문제 발생 시 멈추거나 되돌릴 수 없습니다.", "특히 ‘운영 IP와 다른 임시 IP’, ‘Scheduler를 한 대만 켤 방법’, ‘source와 target을 분리할 네트워크’가 중요합니다.", "GO 조건: 모든 체크박스 완료와 담당자 승인. NO-GO 조건: 한 항목이라도 미확정."),
"4.2 변수 시트": ("변수 시트는 작업용 주소록입니다.", "긴 명령어를 입력할 때 매번 주소와 UUID를 직접 타이핑하면 실수하기 쉽습니다. 이 표에 원본 주소, target 주소, 포트, VM UUID, SR UUID, 백업 경로를 적고, 명령어의 빈칸에 넣습니다.", "이 표는 단순 메모가 아니라 ‘이번 작업에서 어느 대상을 사용할 것인지’를 고정하는 기준입니다. 작업 중 주소가 바뀌면 기존 값을 지우지 말고 변경 이유와 승인자를 기록해야 합니다.", "확인할 것: 실제 xen03 주소(.120인지 .130인지), source/target IP, 백업 저장소, 실행 계정."),
"5. G0 — 사전 채증과 B0 리허설 백업": ("G0는 출발 전에 사진을 찍고 연습용 백업을 만드는 단계입니다.", "채증은 현재 상태를 증거로 남기는 일입니다. 어떤 서비스가 살아 있고, 어떤 데이터가 몇 건이며, 어느 파일을 실행하는지 기록합니다. B0는 운영 전환 직전의 최종 백업이 아니라, 먼저 target에서 복원 연습을 해 보기 위한 백업입니다.", "이 단계에서 서버를 바꾸는 것이 아니라 현재 상태를 읽고 저장합니다. 나중에 target 결과와 비교할 수 있도록 명령어 결과, checksum, 서비스 상태, 데이터 목록을 파일로 남깁니다.", "다음 단계로 가는 조건: B0 백업이 실제로 복원 가능한지 확인하고, 원본 변경 없이 기록 완료."),
"5.1 공통 현황 채증": ("각 서버의 건강검진표를 만드는 일입니다.", "CPU·메모리·디스크·OS·프로세스·포트·로그·설정 주소를 조사합니다. 의사가 환자의 체온과 혈압을 먼저 재듯이, 이관 전에 서버의 현재 모습을 먼저 알아야 합니다.", "명령어의 목적은 ‘무언가를 고치는 것’이 아니라 ‘현재 상태를 읽는 것’입니다. 결과를 서버별 파일로 저장하면 101·102·103을 헷갈리지 않고 target과 비교할 수 있습니다.", "성공 기준: 세 VM의 hostname, IP, OS, 서비스, 포트, 디스크와 연결 대상이 표로 정리됨."),
"5.2 MariaDB B0 선택 데이터 추출": ("MariaDB에서 필요한 일부 데이터의 연습용 복사본을 만드는 단계입니다.", "MariaDB에는 실제 업무 데이터가 있을 수 있으므로 데이터베이스 전체를 무작정 비우거나 복원하지 않습니다. Scheduler가 만드는 통계·배치 기록처럼 다시 넣어야 하는 범위만 골라서 INSERT SQL로 준비합니다.", "B0는 연습용입니다. source의 데이터가 언제 기준인지 기록하고, target에 적용하기 전에 행 수·기본키·checksum을 비교합니다. MyISAM 테이블은 일반적인 transaction 되돌리기가 제한될 수 있어 원복 SQL을 별도로 준비해야 합니다.", "금지: source에서 DROP/TRUNCATE, 승인 없는 전체 DB dump/restore."),
"5.3 Redis B0 상태 채증": ("Redis cluster의 자리 배치표를 만드는 단계입니다.", "Redis는 여러 대가 master와 replica로 나뉘고, 16,384개의 slot에 데이터를 나누어 맡길 수 있습니다. 따라서 ‘Redis 프로세스가 켜져 있다’보다 어느 노드가 어떤 역할인지와 모든 slot이 정상인지가 중요합니다.", "RDB·AOF·cluster state 파일은 바로 새 cluster에 덮어쓰지 않고 hold 영역에 보관합니다. target에서 기존 cluster를 재결합할지, 빈 cluster를 만들고 cache를 다시 생성할지 결정할 수 있도록 상태를 기록합니다.", "성공 기준: master/replica·slot·node ID·AOF/RDB 경로와 checksum 기록."),
"5.4 Solr/ZooKeeper B0 백업": ("검색 설계도와 검색 문서를 연습용으로 보관하는 단계입니다.", "ZooKeeper는 SolrCloud가 어느 서버와 collection을 사용할지 조정하는 역할이고, Solr collection은 실제 검색 문서 묶음입니다. 둘 중 하나만 옮기면 화면은 떠도 검색이 실패할 수 있습니다.", "configset은 검색 규칙과 필드 설계도이고, collection backup은 실제 문서입니다. 모든 collection과 alias를 목록으로 만든 뒤 collection별 BACKUP이 완료됐는지 확인합니다.", "성공 기준: source collection 목록과 backup 완료 목록이 하나도 빠짐없이 일치."),
"5.5 Elasticsearch B0 snapshot": ("Elasticsearch의 검색 데이터를 공식 백업 방식으로 찍는 단계입니다.", "Snapshot은 Elasticsearch가 자신의 index와 shard 구조를 이해한 상태로 저장하는 백업입니다. 실행 중인 data 폴더를 파일 복사하는 것보다 cluster가 읽을 수 있는 형식으로 복원하기 쉽습니다.", "repository는 Snapshot을 넣어 둘 공용 창고이고, B0 snapshot은 target에서 복원 연습을 위한 백업입니다. index뿐 아니라 template·pipeline·ILM·SLM 정책을 별도로 확인해야 합니다.", "성공 기준: snapshot SUCCESS, 실패 shard 0, 예상 index와 정책 목록 기록."),
"6. M0 — VMware 미러 생성·인수": ("VM 한 대를 통째로 복사해 새 장소에 가져오는 단계입니다.", "VM은 가상 컴퓨터입니다. VMware 미러에는 보통 가상 디스크 안의 OS와 설치된 프로그램, 설정 파일이 함께 들어갑니다. 그래서 OS를 새로 설치하는 것보다 현재 상태를 빠르게 재현할 수 있습니다.", "하지만 미러는 ‘안전하게 운영할 준비가 끝났다’는 뜻이 아닙니다. 복사본은 원본과 같은 IP·hostname·cluster 정보를 가질 수 있으므로, target에서는 반드시 격리된 상태로 첫 부팅을 합니다.", "인수 기준: VM 이름·UUID·디스크·NIC·전원 상태 확인, 원본 보존."),
"6.1 VMware 담당 요청사항": ("VMware 담당자에게 정확히 부탁하는 목록입니다.", "이관 담당자가 직접 모든 가상화 설정을 알아서 바꾸는 것이 아니라, VM을 복사할 사람에게 필요한 조건을 전달합니다. CPU·메모리·디스크·네트워크·스냅샷·임시 IP 조건을 명확하게 요청해야 합니다.", "특히 미러 생성 시점과 대상 위치를 기록해야 합니다. 세 VM이 서로 다른 시각에 복사되면 데이터가 하나의 같은 순간을 나타내지 않을 수 있으므로, 그 시각을 나중에 최종 동기화 계획에서 고려합니다.", "확인할 것: target host, datastore/SR, network, VM 중지 시간, snapshot 보존 기간."),
"6.2 최초 target 부팅": ("새로 가져온 복사본을 처음 켜 보는 단계입니다.", "첫 부팅의 목적은 서비스 사용자에게 공개하는 것이 아니라, VM이 부팅되고 디스크가 보이며 네트워크와 OS가 정상인지 확인하는 것입니다. 원본과 같은 IP로 바로 켜면 두 컴퓨터가 같은 주소를 사용해 충돌합니다.", "따라서 임시 IP 또는 격리 네트워크를 사용하고, Scheduler와 자동기동 서비스가 갑자기 실행되지 않았는지 확인합니다.", "절대 하지 않기: 원본과 target의 동일 IP 동시 기동, target의 즉시 L4 등록."),
"7. R0 — Oracle Linux 9.6 대상 준비": ("target 운영체제와 실행 환경을 준비하는 단계입니다.", "목표는 Oracle Linux 9.6에서 기존 애플리케이션이 실행되는 것입니다. VM 미러를 사용하더라도 OS가 무엇인지, Java·Python·라이브러리·권한이 맞는지 확인해야 합니다.", "이 단계는 애플리케이션 소스 코드를 새로 개발하는 단계가 아닙니다. 기존 파일을 보존하고, 새 OS에서 실행에 필요한 기반 환경을 맞추는 단계입니다.", "성공 기준: OS·커널·architecture·JDK·라이브러리·파일 권한이 승인 기준과 일치."),
"7.1 AS-IS 배포판 판정 게이트": ("원본 OS 이름을 추측하지 않고 확인하는 문입니다.", "‘EL7 계열’은 RHEL, CentOS, Oracle Linux 같은 Red Hat 계열의 7 버전대라는 뜻일 수 있습니다. Rocky Linux에는 공식 7 버전이 없으므로, 누군가 ‘Rocky 7’이라고 말해도 실제 /etc/os-release 결과를 확인해야 합니다.", "원본과 target의 OS 차이가 크면 오래된 라이브러리나 서비스 실행 방식이 달라질 수 있습니다. 확인 결과가 문서의 가정과 다르면 이관 방법과 호환성 판정을 다시 합니다.", "NO-GO: 실제 OS·kernel·architecture를 모른 채 파일 복원이나 서비스 기동을 진행."),
"7.2 호스트 호환성": ("기존 프로그램이 새 OS에서 달릴 수 있는지 시험하는 단계입니다.", "JAR 파일은 Java가 필요하고, Python 프로그램은 Python과 모듈이 필요하며, native library는 OS의 라이브러리와 CPU 환경의 영향을 받을 수 있습니다. 파일이 있다고 실행되는 것은 아닙니다.", "같은 파일을 target에 놓은 뒤 ‘실행 가능 여부’, ‘로그 오류’, ‘필요한 포트’, ‘설정파일 경로’를 확인합니다. 오류가 나면 소스 코드를 바꾸기보다 먼저 Java 버전·권한·환경변수·라이브러리를 비교합니다.", "성공 기준: 승인된 JDK/라이브러리에서 실제 JAR과 미들웨어가 오류 없이 기동."),
"7.3 파일 복원": ("프로그램 파일과 설정을 target에 놓는 단계입니다.", "JAR·스크립트·설정파일·업로드 파일·systemd unit을 복사하고 checksum과 소유자를 확인합니다. 데이터베이스나 Elasticsearch data 폴더까지 같은 방식으로 덮어쓰라는 뜻은 아닙니다.", "서비스 프로그램은 파일 복사로 옮길 수 있지만, 서비스가 서로를 가리키는 IP·hostname·포트는 target 주소에 맞게 별도로 검토해야 합니다.", "성공 기준: 파일 지문·권한·실행 사용자·설정 주소·로그 경로가 target 기준과 일치."),
"8. MariaDB 미러 기동·Scheduler 데이터 재적재": ("MariaDB를 원본 미러 기준으로 살리고, Scheduler가 바꾸는 일부 데이터만 정리하는 단계입니다.", "MariaDB는 업무의 오래 보존해야 하는 정보가 있을 수 있어 전체를 새로 만들지 않습니다. 미러 DB를 기준으로 유지하고, Scheduler가 생성하거나 변경하는 범위만 source의 최종 INSERT SQL로 target에 맞춥니다.", "중요한 순서는 writer와 Scheduler를 멈추고, 데이터가 더 이상 변하지 않는지 확인한 뒤, 승인된 범위만 처리하는 것입니다. target에서 실행하더라도 대상 DB인지 세 번 확인합니다.", "금지: 운영 source에서 전체 삭제, target의 모든 table 무차별 초기화."),
"8.1 미러 DB 무결성 확인": ("복사된 DB가 깨지지 않았는지 건강검진하는 단계입니다.", "DB에 접속된다는 것과 데이터가 온전하다는 것은 다릅니다. 테이블을 읽을 수 있는지, 행 수가 맞는지, 기본키가 중복되지 않는지, 로그에 오류가 없는지를 따로 확인합니다.", "MyISAM은 transaction 처리 특성이 InnoDB와 다르므로 ‘실패하면 자동 rollback’을 당연하게 생각하면 안 됩니다. 적용 전 before-image와 원복 INSERT SQL을 준비해야 합니다.", "성공 기준: table/checksum/count/auto_increment와 오류 로그 확인."),
"8.2 Scheduler 간섭 데이터 경계": ("어떤 DB 행을 다시 넣고 어떤 행은 건드리지 않을지 선을 긋는 단계입니다.", "Scheduler는 통계·배치 기록을 만들지만, CMS나 Master도 공용 상태를 바꿀 수 있습니다. 모든 table을 Scheduler 데이터라고 생각하면 업무 원본을 지울 수 있습니다.", "A그룹은 승인된 Scheduler 전용 데이터라면 전량 교체하고, B그룹은 영향받은 후보 PK만 고칩니다. 그 외 업무 원본 table은 미러 상태를 유지합니다.", "성공 기준: 대상 table 목록과 제외 table 목록에 담당자 승인."),
"8.3 Source B0/B1 data-only INSERT SQL": ("source의 데이터를 ‘구조 없이 행만 넣는 SQL’로 준비하는 단계입니다.", "data-only SQL은 CREATE TABLE 같은 구조 생성문보다 INSERT 문을 중심으로 만든 파일입니다. target의 구조는 먼저 준비되어 있다고 보고, 필요한 행을 넣는 데 사용합니다.", "B0는 연습용, B1은 최종 전환 직전의 마지막 변경분입니다. 파일 이름과 생성 시각을 기록하고 SHA-256을 계산해 전송 중 변경되지 않았는지 확인합니다.", "성공 기준: source 시각·범위·행 수·checksum·원복 SQL 기록."),
"8.4 Target 데이터 비우기·재적재": ("target에서 승인된 범위의 오래된 행을 치우고 source 행을 넣는 단계입니다.", "‘데이터를 비운다’는 말은 DB 전체를 지운다는 뜻이 아닙니다. 승인된 A그룹 table 또는 특정 범위만 대상으로 합니다. target 식별을 확인한 뒤 preclear 백업과 원복 SQL이 있어야 합니다.", "MyISAM에서는 중간에 실패해도 자동으로 되돌아가지 않을 수 있으므로, 적용 전후 행 수와 checksum을 비교합니다. 실패하면 미리 만든 rollback INSERT SQL로 되돌립니다.", "변경 전 필수: target 확인, writer 정지, preclear 백업, 승인."),
"8.5 공용 상태 B그룹 선택 교정": ("업무 원본을 보존하면서 정말 영향을 받은 행만 고치는 단계입니다.", "B그룹은 Scheduler뿐 아니라 CMS·Master·사용자 요청도 함께 만질 수 있는 공용 상태입니다. 그래서 전체 삭제 후 재적재하면 안 되고, source와 target의 후보 PK를 비교해 필요한 행만 교정합니다.", "후보 PK는 ‘이 행이 달라졌을 가능성이 있다’는 목록이지 무조건 지워도 된다는 뜻이 아닙니다. 각 PK의 before/after 값을 기록하고 DB 담당자의 승인을 받습니다.", "NO-GO: 후보 범위가 정해지지 않았거나 before-image가 없음."),
"8.6 검증·기동 제한": ("DB를 확인한 뒤 애플리케이션을 아주 제한적으로 연결하는 단계입니다.", "먼저 DB 자체가 맞는지 확인하고, 그 다음 Master·Engine 같은 프로그램을 붙입니다. Scheduler는 여러 VM에서 동시에 실행되지 않도록 마지막까지 꺼 둡니다.", "리허설에서는 101 한 대만 승인된 job을 제한적으로 실행하고 결과를 비교합니다. target에서 만든 시험 이력이 최종 운영 DB에 섞이지 않도록 처리합니다.", "성공 기준: DB 정합성 승인, Scheduler 중복 없음, 주요 읽기·검색 업무 통과."),
"9. Redis 5.0.8 재클러스터링·cache 재배포": ("빠른 임시 창고인 Redis를 target에서 정상화하는 단계입니다.", "Redis에는 세션·cache·큐처럼 다시 만들 수 있는 값이 있을 수 있지만, 실제 업무에서 무엇을 저장하는지는 설정을 확인해야 합니다. 여러 Redis가 하나의 cluster라면 node와 slot 관계도 같이 맞아야 합니다.", "기존 cluster가 target에서 안전하게 재결합되면 그 경로를 사용하고, 상태가 꼬이면 새 빈 cluster를 만들고 애플리케이션의 배포 기능으로 cache를 재생성합니다.", "금지: source와 target을 같은 cluster에 무검증으로 섞기, source에서 FLUSHALL."),
"9.1 파일과 금지 조합": ("Redis 파일을 어떤 식으로 다룰지 정하는 안전장치입니다.", "RDB는 특정 시점의 메모리 저장 파일이고 AOF는 명령 기록에 가까운 파일입니다. cluster state와 설정이 서로 다른 시점이면 파일을 함께 넣었을 때 노드가 이상해질 수 있습니다.", "따라서 파일을 발견했다고 target에 바로 덮어쓰지 않고, 경로·생성 시각·checksum을 보관한 후 재결합 또는 새 cluster 판단을 합니다.", "금지: 서로 다른 시점의 RDB/AOF/cluster state를 섞어 무검증 기동."),
"9.2 우선 경로 — 미러 cluster 그대로 재결합": ("기존 Redis 집단을 새 장소에서 다시 서로 찾게 하는 경로입니다.", "재결합은 Redis 노드들이 서로의 node ID와 주소를 알고 cluster의 16,384 slot을 정상적으로 나눠 맡도록 만드는 것입니다. 단순히 Redis 프로세스를 켜는 것보다 확인해야 할 것이 많습니다.", "cluster info가 ok인지, 모든 slot이 배정됐는지, master와 replica가 예상대로 보이는지, 애플리케이션이 cache를 읽는지를 확인합니다.", "성공 기준: cluster_state:ok, cluster_slots_ok:16384, replica 연결 정상."),
"9.3 대체 경로 — 빈 3 master / 3 replica 재구성": ("기존 Redis 상태를 억지로 고치지 않고 새로 구성하는 경로입니다.", "빈 cluster는 cache가 없는 깨끗한 Redis 집단입니다. master 3대와 replica 3대를 만들고 slot을 나눈 뒤, 애플리케이션이 필요한 cache를 다시 채웁니다.", "이 방식은 cache가 정말 재생성 가능한 경우에만 안전합니다. 세션·큐·업무상태가 Redis에 있다면 데이터 손실 가능성을 담당자와 먼저 판단해야 합니다.", "GO 조건: cache 재생성 방법과 데이터 손실 허용 범위 승인."),
"9.4 시스템 배포 기능으로 cache 재생성": ("빈 Redis에 애플리케이션이 필요한 값을 다시 만들어 넣는 단계입니다.", "Redis를 복원했다는 말은 모든 예전 cache 값을 그대로 가져왔다는 뜻이 아니라, 업무 시스템이 다시 실행되면서 필요한 값을 재생성했다는 뜻일 수 있습니다.", "재생성 뒤 대표 화면·로그인·검색·챗봇 등 실제 사용 흐름에서 cache miss가 오류로 이어지지 않는지 확인합니다.", "성공 기준: 대표 cache 조회, TTL, 애플리케이션 로그, 시뮬레이터 결과 정상."),
"10. ZooKeeper 3.6.1 / Solr 7.6.0 재구성·복원": ("검색 시스템의 조정자와 검색 문서를 새 환경에 복원하는 단계입니다.", "ZooKeeper는 SolrCloud의 반장처럼 collection·replica·leader 정보를 조정합니다. Solr는 검색 API와 문서를 제공합니다. 둘이 연결되지 않으면 Solr 프로세스가 떠 있어도 검색이 정상이라고 할 수 없습니다.", "기존 data 디렉터리를 단순 복사하는 대신 clean ensemble, configset, collection backup/restore 순서로 구성합니다.", "성공 기준: 모든 collection active, shard/replica/leader 정상, alias와 문서 수 일치."),
"10.1 ZooKeeper clean ensemble": ("오래된 회의 기록을 버리고 새 회의체를 만드는 단계입니다.", "ZooKeeper ensemble은 여러 ZooKeeper 서버가 서로 합의하는 묶음입니다. 이전 서버의 임시 세션이나 오래된 transaction log까지 그대로 가져오면 새 환경에서 잘못된 서버를 기억할 수 있습니다.", "새 ensemble을 만들고 각 서버의 myid와 server 목록을 맞춥니다. quorum이 만들어진 뒤 Solr가 새 ZooKeeper 주소를 바라보게 합니다.", "금지: source와 target ZooKeeper를 같은 ensemble으로 무검증 연결."),
"10.2 configset과 collection 복원": ("검색 규칙과 검색 문서 묶음을 되살리는 단계입니다.", "configset은 ‘어떤 필드로 검색하고 분석할지’ 정한 설계도이고, collection은 실제 문서 저장소입니다. 먼저 설계도를 올리고, 그 다음 모든 collection을 복원합니다.", "collection 이름 하나라도 빠지면 일부 기능만 정상처럼 보일 수 있습니다. alias, shard, replica, leader, 문서 수, 대표 한국어 검색까지 확인해야 합니다.", "NO-GO: source collection 목록과 target collection 목록이 다름."),
"11. Elasticsearch 7.8.0 / Kibana 7.8.0 재클러스터링·Snapshot 복원": ("검색·분석 시스템을 새 cluster로 만들고 Snapshot을 읽어오는 단계입니다.", "Elasticsearch는 node와 shard가 있는 검색 저장소입니다. node data 폴더를 통째로 복사하면 cluster UUID·shard 상태·버전 문제를 만들 수 있으므로 새 빈 cluster를 만들고 공식 Snapshot을 복원합니다.", "Kibana 화면도 index와 연결 설정이 필요합니다. Elasticsearch 데이터와 정책 객체를 각각 확인하고, target에서 source로 쓰는 연결이 없는지 검사합니다.", "성공 기준: cluster green 목표, failed/unassigned shard 0, 필요한 index·alias·정책 복원."),
"11.1 Elasticsearch 7.8 global state 판정": ("Snapshot 안에 어떤 ‘전체 설정’을 넣고 뺄지 정하는 단계입니다.", "global state는 여러 index에 공통으로 영향을 주는 template·pipeline·persistent 설정 등을 포함할 수 있습니다. 무조건 전체를 복원하면 target 설정을 덮어쓸 수 있고, 무조건 빼면 검색이 달라질 수 있습니다.", "따라서 index 데이터와 global state를 분리해 판단하고, template·pipeline·ILM·SLM을 별도로 export/import하고 비교합니다.", "승인 기준: 어떤 global state를 복원했는지 목록과 담당자 판단 기록."),
"11.2 미러 데이터 격리와 새 cluster bootstrap": ("기존 검색 data 폴더를 보관만 하고, target에서 새 검색 창고를 시작하는 단계입니다.", "bootstrap은 새 cluster를 처음 만드는 작업입니다. 미러 data는 분석·원복용 hold 영역에 두고, target working data는 깨끗한 경로로 시작합니다.", "이렇게 하면 target이 오래된 node 정보를 읽어 잘못된 cluster에 들어가는 위험을 줄일 수 있습니다.", "금지: source의 data directory를 target working directory로 바로 덮어쓰기."),
"11.3 Repository·정책 객체 수동 이관": ("Snapshot 창고 주소와 자동 관리 규칙을 target에도 등록하는 단계입니다.", "repository는 snapshot 파일이 있는 장소입니다. ILM은 오래된 index를 정리하는 규칙이고 SLM은 snapshot을 자동으로 찍는 규칙입니다. 데이터만 복원하고 규칙을 잊으면 target이 예기치 않게 삭제·백업 작업을 할 수 있습니다.", "target에서는 repository 권한과 read-only 여부를 확인하고, policy·template·pipeline을 하나씩 비교합니다.", "성공 기준: 정책 ID·내용·실행 주체·다음 실행 여부가 승인된 상태."),
"11.4 Application·Kibana index restore": ("실제 검색 index를 새 Elasticsearch에 읽어오는 단계입니다.", "restore는 snapshot에 들어 있는 index를 target cluster에 다시 만드는 작업입니다. application index와 Kibana index를 구분하고, 이미 존재하는 index와 이름이 겹치지 않는지 확인합니다.", "복원 후 index count·mapping·alias·대표 검색·aggregation과 Kibana 화면을 확인합니다.", "NO-GO: restore가 끝나기 전에 애플리케이션 writer를 연결하거나 source와 target을 동시에 쓰게 함."),
"11.5 ILM·SLM 안전 검증": ("자동 삭제와 자동 백업이 target에서 안전한지 시험하는 단계입니다.", "ILM이 잘못 켜지면 오래된 index를 삭제할 수 있고, SLM이 잘못 켜지면 target에서 snapshot을 찍거나 source용 repository를 건드릴 수 있습니다.", "리허설 중에는 자동 실행을 제한하고, 정책 explain/API와 로그로 실제 대상·조건·권한을 확인합니다.", "성공 기준: target에서 의도하지 않은 삭제·snapshot·source 접근이 없음."),
"12. 애플리케이션·Scheduler 기동": ("서비스들을 서로 의존하는 순서대로 켜는 단계입니다.", "Master·Engine·Gateway·CMS는 혼자서 완성되는 프로그램이 아닙니다. DB·Redis·검색 시스템을 먼저 준비하고, 애플리케이션이 올바른 주소를 보도록 한 뒤 화면과 업무 흐름을 확인합니다.", "Scheduler는 다른 서비스와 DB를 자동으로 바꿀 수 있으므로 마지막에 한 대만 제한적으로 켭니다.", "성공 기준: 각 서비스 health와 로그 정상, 중복 Scheduler 없음."),
"12.1 첫 기동 전": ("전원을 켜기 전에 마지막으로 확인하는 단계입니다.", "target hostname·IP·설정파일·환경변수·실행 사용자·자동기동 여부를 확인합니다. source 주소가 설정에 남아 있으면 target 서비스가 원본 DB나 검색 cluster에 접속할 수 있습니다.", "기동 전에 서비스별 의존 대상과 포트를 적어 두고, 실패하면 status와 journal을 저장합니다.", "멈춤 기준: source endpoint가 남아 있거나 target 격리가 확인되지 않음."),
"12.2 기동 원칙": ("한 번에 다 켜지 않고 한 단계씩 확인하는 규칙입니다.", "기반 서비스가 정상인지 확인하고 다음 서비스를 켭니다. 그래야 오류가 DB 때문인지, Redis 때문인지, 앱 설정 때문인지 찾기 쉽습니다.", "start·restart·enable은 모두 상태를 바꾸는 명령이므로 승인된 작업창에서만 사용합니다. ‘active’ 표시만 보지 말고 포트·API·로그·실제 업무까지 확인합니다.", "원칙: 한 번에 하나의 변경, 변경 전후 상태 기록."),
"12.3 Scheduler 제한 시험": ("자동 작업을 아주 작은 범위에서 시험하는 단계입니다.", "Scheduler는 정해진 시간마다 통계 생성, 배포, 로그 백업 등을 할 수 있습니다. 101·102·103이 모두 켜지면 같은 작업이 중복 실행될 수 있습니다.", "리허설에서는 승인된 한 VM의 Scheduler만 켜고, 위험한 배포·삭제 job은 비활성으로 둡니다. 실행 전후 DB·Solr·ES·Redis와 로그를 비교합니다.", "성공 기준: 한 대만 실행, 진행 중 job 없음, 예상 범위의 데이터만 변경."),
"13. T0 — Oracle Linux 9.6 리허설 시험": ("T0는 본 공연 전에 하는 전체 리허설입니다.", "T0는 화면 하나가 뜨는지 보는 시험이 아니라, 로그인·문서 처리·검색·챗봇·배포·시뮬레이터를 target에서 끝까지 실행해 보는 과정입니다.", "실패하더라도 운영 사용자는 source를 계속 사용하고, target만 고칩니다. 테스트 케이스와 기대 결과를 미리 정해야 ‘성공했다’고 말할 수 있습니다.", "PASS 조건: 데이터·기능·재기동·장애복구·시뮬레이터 기준 모두 통과."),
"14. B1 — 최종 데이터 동기화": ("운영 전환 직전에 마지막 변경분을 맞추는 단계입니다.", "B0 리허설 이후에도 source에서 새 문서·통계·배치 기록이 생길 수 있습니다. B1은 신규 요청과 writer를 멈춘 뒤 마지막 순간의 데이터를 고정하는 백업입니다.", "B1이 끝난 뒤 target을 다시 검증하고, 그 다음에만 운영 트래픽을 target으로 보냅니다.", "멈춤 기준: writer 정지와 진행 중 job 0건이 확인되지 않으면 B1을 만들지 않음."),
"14.1 최종 쓰기 중지": ("source에서 데이터가 더 변하지 않도록 잠시 멈추는 단계입니다.", "사용자 요청과 Scheduler가 계속 들어오면 source와 target의 데이터가 서로 달라집니다. 그래서 점검창 동안 신규 요청을 막고, 진행 중 작업이 끝났는지 확인합니다.", "서비스를 막는 순서와 읽기 전용 전환 여부는 운영 담당자가 결정합니다. 강제 종료보다 정상 완료·writer 차단을 우선합니다.", "성공 기준: Scheduler·writer 정지, 진행 중 job 없음, 중단 시각 기록."),
"14.2 B1 최종 선택 백업": ("마지막 백업 묶음을 만드는 단계입니다.", "MariaDB는 승인된 선택 범위의 INSERT SQL, Solr는 모든 collection BACKUP, Elasticsearch는 index Snapshot과 정책 export를 만듭니다. 제품마다 안전한 백업 방법이 다릅니다.", "파일명·생성 시각·checksum·완료 상태를 기록합니다. 백업 하나라도 실패하면 운영 전환하지 않습니다.", "NO-GO: 일부 collection/index만 백업되었거나 snapshot failed shard가 있음."),
"14.3 MariaDB R1 선택 재적재": ("최종 고정된 source 데이터를 target DB에 적용하는 단계입니다.", "R1은 B1을 target에 반영한 결과입니다. A그룹은 승인된 전량 교체, B그룹은 후보 PK 선택 교정, 그 외 업무 원본은 보존합니다.", "적용 후 source와 target의 count·checksum·기본키·AUTO_INCREMENT·논리 orphan을 비교합니다.", "성공 기준: DB 담당자 승인 전에는 애플리케이션 writer를 켜지 않음."),
"14.4 Redis·Solr·Elasticsearch R1": ("세 검색·cache 계층의 최종 상태를 target에서 맞추는 단계입니다.", "Redis는 재결합 또는 cache 재생성, Solr는 모든 collection restore, Elasticsearch는 B1 snapshot restore와 정책 검증을 수행합니다.", "서비스가 켜져 있는지만 보지 말고 cluster 상태·문서 수·대표 검색·alias·TTL·shard를 확인합니다.", "NO-GO: 원본 endpoint 접근, collection/index 누락, Redis slot 미완료."),
"14.5 최종 데이터 검증": ("운영 전환 전에 마지막 비교표를 만드는 단계입니다.", "데이터가 같고 기능도 같아야 합니다. DB 행 수만 같아도 검색 index가 빠졌을 수 있고, 화면이 떠도 일부 업무 API가 실패할 수 있습니다.", "데이터 검증과 업무 시나리오 검증을 모두 통과한 뒤에야 L4/VIP/DNS를 바꿉니다.", "최종 산출물: 비교 결과, 로그, checksum, 담당자 서명, GO/NO-GO 판단."),
"15. 권장 중지·기동 순서": ("서비스를 끄고 켜는 순서를 적은 시간표입니다.", "중지할 때는 새 요청과 자동 작업을 먼저 막고, 기동할 때는 DB·조정 서비스·검색·애플리케이션 순서로 아래에서 위로 올라갑니다. 이는 집의 수도·전기부터 켜고 가전제품을 켜는 것과 비슷합니다.", "실제 서비스 관계가 다르면 담당자의 운영 매뉴얼을 우선하지만, Scheduler를 마지막 한 대만 켠다는 원칙은 지킵니다.", "확인할 것: 각 단계 사이의 health, 포트, 로그, source 접근 차단."),
"16. GO/NO-GO와 롤백": ("GO는 다음 단계로 가고, NO-GO는 멈추는 신호입니다.", "이관에서는 ‘일단 해 보고 문제면 고치자’보다, 미리 정한 통과 기준이 중요합니다. 백업·격리·데이터·기능·전환 단계마다 통과 기준을 둡니다.", "롤백은 target을 지우는 일이 아니라, target 트래픽을 차단하고 source로 돌아가는 절차입니다. target에서 이미 쓰기가 발생했다면 데이터가 두 방향으로 달라질 수 있으므로 먼저 write 상태를 판단합니다.", "원칙: source와 백업은 안정화가 끝날 때까지 보존."),
"16.1 롤백 기준": ("문제가 생겼을 때 돌아가는 방법을 설명하는 부분입니다.", "L4 전환 전에는 사용자가 source를 계속 쓰므로 target을 중단하고 고치면 됩니다. L4 전환 후 target에 쓰기가 없으면 경로를 source로 돌리기 비교적 쉽지만, target에 쓰기가 있었다면 단순히 주소만 되돌리면 데이터가 사라질 수 있습니다.", "그래서 롤백 시점과 write 발생 여부를 기록하고, DB·Redis·Solr·Elasticsearch별로 어떤 데이터를 보존하거나 폐기할지 담당자 승인을 받습니다.", "금지: target write 후 아무 검토 없이 DNS/L4만 source로 되돌리기."),
"부록 A. Scheduler·배치 데이터 분류": ("어떤 DB 데이터가 자동 작업의 영향을 받는지 정리한 참고표입니다.", "모든 데이터가 같은 성격은 아닙니다. 업무 원본은 보존해야 하고, 통계·배치 기록은 다시 만들 수 있으며, 배포 상태는 여러 시스템과 함께 움직일 수 있습니다.", "분류표는 데이터 삭제 허가서가 아닙니다. 실제 배포 JAR·DB schema·로그에서 쓰기 동작을 확인하고, 담당자 승인으로 최종 범위를 확정합니다.", "성공 기준: 보존·선택 교정·전량 교체·고위험 job의 경계가 명확함."),
"A.1 Job별 재실행 위험": ("자동 작업을 다시 실행해도 되는지 판단하는 표입니다.", "어떤 job은 같은 시간 범위를 다시 계산해도 괜찮을 수 있지만, 어떤 job은 같은 행을 두 번 넣거나 배포를 두 번 실행할 수 있습니다. 이름이 비슷해도 위험이 다릅니다.", "재실행 전에 중복키·upsert 여부·from/to 범위·DB와 검색의 동시 변경 여부를 확인합니다. 위험한 배포와 로그 삭제 job은 기본적으로 비활성으로 둡니다.", "NO-GO: 멱등성·중복 실행 안전성이 확인되지 않은 job 재실행."),
"A.2 Scheduler 컷오버 체크": ("운영 전환 직전 Scheduler가 한 대만 실행되는지 확인하는 목록입니다.", "batch log에 끝나지 않은 작업이 없는지, 예약 배포가 대기 중인지, target Scheduler가 꺼져 있는지 확인합니다. 이 목록을 통과하지 못하면 target이 운영 데이터를 몰래 바꿀 수 있습니다.", "마지막 SQL 조회는 진행 중 예약 배포 후보를 찾는 예입니다. 조회 결과가 있다고 바로 삭제하거나 실행하지 말고 담당자가 상태를 판단합니다.", "성공 기준: source stop 기록, 진행 job 0, target 101 한 대만 승인 기동."),
"부록 B. 증적·인수 체크리스트": ("작업이 끝났다는 증거를 모으는 목록입니다.", "‘정상적으로 됐다’고 말하려면 어떤 서버에서 어떤 명령을 실행했고, 어떤 backup·checksum·테스트 결과가 나왔는지 남아 있어야 합니다.", "나중에 장애가 생기거나 다음 사람이 인수할 때 이 자료가 작업의 기억이 됩니다. 비밀번호·토큰은 증적에 남기지 않고 가립니다.", "완료 기준: VM·OS·파일·DB·Redis·Solr·ES·업무·L4·롤백 증적 모두 보관."),
"부록 C. 참고 문서": ("각 제품의 공식 설명서로 다시 확인하는 곳입니다.", "이관 중 명령어의 정확한 옵션과 제품 버전별 동작은 공식 문서가 기준입니다. 런북은 현재 환경에 맞춘 작업 초안이고, 제품이 업데이트되거나 환경이 다르면 공식 문서를 함께 확인해야 합니다.", "특히 DB dump, Redis persistence, Solr backup, ZooKeeper quorum, Elasticsearch snapshot은 잘못 사용하면 데이터 손실로 이어질 수 있으므로 버전이 맞는 문서를 읽습니다.", "확인할 것: 제품 버전, 명령어 버전, 사내 보안·운영 표준과의 일치."),
}

def strip_tags(value: str) -> str:
    return re.sub(r"<[^>]+>", "", value)

def norm(value: str) -> str:
    value = html.unescape(strip_tags(value))
    return re.sub(r"\s+", " ", value).strip()

def easy_block(title: str, a: tuple[str, str, str, str]) -> str:
    lead, body, detail, check = a
    kind = "easy-danger" if any(x in body + detail for x in ["금지", "NO-GO", "파괴", "삭제", "손실"]) else "easy-check"
    deep = deep_explanation(title)
    deep_html = f'''\n        <div class="easy-detail"><strong>조금 더 자세히: 실제 작업의 흐름</strong>{deep}</div>''' if deep.strip() else ""
    return f'''\n      <aside class="easy-explain" aria-label="쉬운 설명">\n        <div class="easy-title">🧒 아주 쉽게 설명하면: {html.escape(title)}</div>\n        <p><strong>{html.escape(lead)}</strong></p>\n        <p>{body}</p>\n        <p>{detail}</p>{deep_html}\n        <div class="{kind}"><strong>이 부분에서 확인할 것:</strong> {check}</div>\n      </aside>\n'''

source = SOURCE.read_text(encoding="utf-8")
if "/* 아래 easy-explain 블록" not in source:
    source = source.replace("  </style>", STYLE + "\n  </style>", 1)

intro_marker = '''    </div>\n\n    <nav class="toc"'''
intro = '''    </div>\n\n    <aside class="easy-explain" aria-label="런북 전체를 읽는 방법">\n      <div class="easy-title">🧒 이 런북 전체를 아주 쉽게 읽는 방법</div>\n      <p><strong>이 문서는 ‘컴퓨터 세 대를 새 건물로 옮기는 작업 설명서’입니다.</strong></p>\n      <p>원본 서버는 <strong>source</strong>, 새 환경은 <strong>target</strong>입니다. VM 미러는 컴퓨터 본체를 복사하는 일이고, MariaDB·Redis·Solr·Elasticsearch 데이터는 각각 알맞은 방법으로 확인하고 복원합니다.</p>\n      <p>검은 명령어 상자는 실제 명령의 원문이고, 이 파란 상자는 그 명령이 하는 일을 풀어쓴 설명입니다. [조회]는 읽기, [변경]은 상태를 바꾸는 행동이므로 승인 없이 실행하지 않습니다.</p>\n      <div class="easy-danger"><strong>가장 중요한 약속:</strong> 원본과 복사본을 같은 IP로 동시에 켜지 않고, 백업과 롤백 방법을 먼저 만든 뒤, target을 격리해서 테스트합니다.</div>\n    </aside>\n\n    <nav class="toc"'''
if intro_marker in source and "런북 전체를 아주 쉽게 읽는 방법" not in source:
    source = source.replace(intro_marker, intro, 1)

heading_re = re.compile(r"<h([234])([^>]*)>(.*?)</h\1>", re.S)
seen = []

def replace_heading(match):
    title = norm(match.group(3))
    if title in EXPLANATIONS:
        seen.append(title)
        return match.group(0) + easy_block(title, EXPLANATIONS[title])
    return match.group(0)

updated = heading_re.sub(replace_heading, source)
missing = [key for key in EXPLANATIONS if key not in seen]
if missing:
    raise SystemExit("설명을 넣지 못한 제목: " + ", ".join(missing))

OUTPUT.write_text(updated, encoding="utf-8")
print(f"작성 완료: {OUTPUT}")
print(f"설명 삽입 제목 수: {len(seen)}")
print(f"원본 크기: {len(source.encode('utf-8'))} bytes")
print(f"새 문서 크기: {len(updated.encode('utf-8'))} bytes")
