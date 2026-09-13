from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Preformatted, Spacer, Table, TableStyle, PageBreak

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output' / 'pdf'
OUT.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Malgun', r'C:\Windows\Fonts\malgun.ttf'))
pdfmetrics.registerFont(TTFont('Malgun-Bold', r'C:\Windows\Fonts\malgunbd.ttf'))
ss = getSampleStyleSheet()
ss.add(ParagraphStyle(name='TitleK', parent=ss['Title'], fontName='Malgun-Bold', fontSize=21, leading=28, alignment=TA_CENTER, textColor=colors.HexColor('#143B5D'), spaceAfter=9))
ss.add(ParagraphStyle(name='SubK', parent=ss['Normal'], fontName='Malgun', fontSize=10, leading=16, alignment=TA_CENTER, textColor=colors.HexColor('#52606D'), spaceAfter=16))
ss.add(ParagraphStyle(name='H1K', parent=ss['Heading1'], fontName='Malgun-Bold', fontSize=15, leading=21, textColor=colors.HexColor('#143B5D'), spaceBefore=7, spaceAfter=7))
ss.add(ParagraphStyle(name='H2K', parent=ss['Heading2'], fontName='Malgun-Bold', fontSize=11.5, leading=17, textColor=colors.HexColor('#1F5F86'), spaceBefore=6, spaceAfter=4))
ss.add(ParagraphStyle(name='BodyK', parent=ss['BodyText'], fontName='Malgun', fontSize=9.2, leading=15, spaceAfter=5))
ss.add(ParagraphStyle(name='SmallK', parent=ss['BodyText'], fontName='Malgun', fontSize=7.8, leading=11, textColor=colors.HexColor('#5A6573'), spaceAfter=4))
ss.add(ParagraphStyle(name='WarnK', parent=ss['BodyText'], fontName='Malgun-Bold', fontSize=8.8, leading=14, backColor=colors.HexColor('#FFF4D6'), borderColor=colors.HexColor('#E8B94A'), borderWidth=.6, borderPadding=6, spaceBefore=4, spaceAfter=7))
ss.add(ParagraphStyle(name='CodeK', parent=ss['Code'], fontName='Malgun', fontSize=7.6, leading=10.5, leftIndent=6, borderColor=colors.HexColor('#D9E2EC'), borderWidth=.5, borderPadding=6, backColor=colors.HexColor('#F6F8FA'), spaceBefore=3, spaceAfter=7))

def P(s, style='BodyK'):
    return Paragraph(s, ss[style])

def C(s):
    return Preformatted(s.strip(), ss['CodeK'])

def T(data, widths):
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,0),'Malgun-Bold'),('FONTNAME',(0,1),(-1,-1),'Malgun'),('FONTSIZE',(0,0),(-1,-1),7.7),('LEADING',(0,0),(-1,-1),11),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#DCEAF4')),('TEXTCOLOR',(0,0),(-1,0),colors.HexColor('#143B5D')),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#B8C7D3')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
    return t

def footer(canvas, doc):
    canvas.saveState(); canvas.setFont('Malgun', 7.2); canvas.setFillColor(colors.HexColor('#73808C'))
    canvas.drawString(17*mm, 11*mm, '등촌프로젝트 | xen02 → xen03 이관 학습·계획 문서')
    canvas.drawRightString(193*mm, 11*mm, str(doc.page)); canvas.restoreState()

def build(name, title, subtitle, story):
    path = OUT / name
    doc = BaseDocTemplate(str(path), pagesize=A4, leftMargin=16*mm, rightMargin=16*mm, topMargin=16*mm, bottomMargin=18*mm, title=title, author='Codex')
    doc.addPageTemplates([PageTemplate(id='main', frames=Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height), onPage=footer)])
    head = [P(title, 'TitleK'), P(subtitle, 'SubK'), P('교육·분석·계획용 문서입니다. 실제 서버의 중지·재부팅·삭제·이관·설정 변경은 승인된 작업창에서만 수행합니다.', 'WarnK')]
    doc.build(head + story)
    return path

def bullets(items):
    return [P('• ' + escape(x)) for x in items]

inventory = [
    ['VM', '조회된 자원', '조회된 주요 서비스·포트'],
    ['101 xen02.01', 'Rocky 9.6 / 5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용', 'Qdrant, Elasticsearch 7.8, Solr 7.6, ZooKeeper 3.6.1, Redis 5.0.8(7000/7001), MariaDB 10.6.7, MaxScale, HAProxy, Node/Kibana\n80, 2181, 3306, 6333~6335, 8983, 9200/9300'],
    ['102 xen02.02', 'Rocky 9.6 / 5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용', 'Elasticsearch 7.8, Solr 7.6, ZooKeeper 3.6.1, Redis 5.0.8(7000/7001), MariaDB\n2181, 3306~3307, 5432, 8983, 9200/9300'],
    ['103 xen02.03', 'Rocky 9.6 / 5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용', 'Elasticsearch 7.8, Solr 7.6, ZooKeeper 3.6.1, Redis 5.0.8(7000/7001), MariaDB, Docker proxy\n2181, 5000, 8983, 9200/9300'],
]

story1 = [
    P('1. 이번 작업의 의미', 'H1K'),
    P('xen02 호스트에서 실행 중인 Rocky Linux VM 3대를 xen03 호스트에서 같은 역할과 데이터로 재현하고, 임시 주소에서 통합 테스트한 뒤 승인된 시점에 전환하는 작업입니다. VM 파일을 복사하는 것만으로는 서비스·설정·데이터·클러스터 연결이 복원되지 않습니다.'),
    P('먼저 10살 어린이도 이해할 수 있게 비유해 보겠습니다.', 'H2K'),
    P('xen02와 xen03은 아파트 단지의 ‘건물’입니다. VM은 그 건물 안의 ‘각 집’입니다. 101·102·103은 세 집의 주소이고, Elasticsearch·Redis·MariaDB 같은 프로그램은 각 집 안에서 일하는 사람입니다. 이관은 집의 벽만 옮기는 것이 아니라, 가구·열쇠·주소록·인터넷 연결·냉장고 안의 물건까지 새 건물에서 다시 제대로 배치하는 일입니다.'),
    C('현재 모습\n[물리 호스트 xen02 / 192.168.1.100]\n  ├─ VM 101 / 192.168.1.101  여러 검색·DB·Qdrant 서비스\n  ├─ VM 102 / 192.168.1.102  검색·클러스터·DB 서비스\n  └─ VM 103 / 192.168.1.103  검색·클러스터·DB·업무 서비스\n\n목표 모습\n[물리 호스트 xen03 / 192.168.1.120]\n  ├─ 새 VM 101 역할\n  ├─ 새 VM 102 역할\n  └─ 새 VM 103 역할'),
    P('중요한 결론: “새로 설치”와 “복사해서 이동” 중 하나만 정답인 것은 아닙니다. VM 자체는 복제·이동할 수 있지만, 애플리케이션 데이터는 제품별 백업·복구를 함께 사용해야 합니다. 그래서 실제로는 ‘VM 이동 + 설정 확인 + 데이터 검증’의 조합입니다.'),
    T([['출발지','도착지','범위'],['Citrix Hypervisor 8.2\ntc-xen02 / 192.168.1.100','Citrix Hypervisor 8.2\ntc-xen03 / 192.168.1.120','VM 3대, OS, 가상 디스크, 네트워크, systemd, 설정, 데이터, 클러스터 관계']], [48*mm,48*mm,76*mm]),
    P('2. 반드시 이해할 7층 구조', 'H1K'),
    T([['층','쉽게 말하면','이관 때 확인'],['VM/OS','컴퓨터 자체','CPU·RAM·디스크·Rocky 버전·커널'],['Network','주소와 길','IP·hostname·gateway·DNS·/etc/hosts'],['Runtime','실행 기반','Java·Python·Docker·라이브러리'],['Service','자동 실행 등록','systemd unit·실행 사용자·enable'],['Config','프로그램 설정','yml·properties·conf·env·ExecStart'],['Data','실제 업무 데이터','/data·DB datadir·ES index·Qdrant storage'],['Connection','서로 통신하는 관계','VM 간 IP:PORT·클러스터·방화벽']], [25*mm,49*mm,98*mm]),
    P('3. 서비스·프로세스·포트의 차이', 'H1K'),
    P('서비스는 시작 규칙, 프로세스는 현재 실행 중인 프로그램, 포트는 요청을 받는 문입니다. 세 가지를 따로 확인해야 합니다.'),
    T([['대상','조회','정상 판단'],['서비스','systemctl status NAME','active (running)'],['프로세스','ps auxf','예상 실행 사용자와 PID 존재'],['포트','sudo ss -lntup','예상 IP:PORT가 LISTEN'],['API','curl 127.0.0.1:PORT','제품이 이해 가능한 응답'],['로그','journalctl -u NAME -n 100','기동 오류·권한·주소 충돌 없음']], [32*mm,82*mm,58*mm]),
    P('4. 이번 환경의 핵심 위험', 'H1K'),
    *bullets(['Elasticsearch 9200/9300은 API와 노드 통신을 나눠 쓸 수 있으므로 discovery와 cluster 설정을 함께 확인합니다.','SolrCloud는 ZooKeeper 주소·chroot·collection 설정까지 함께 복원해야 합니다.','Redis 7000/7001은 cluster node 정보, RDB/AOF, announce IP를 확인합니다.','MariaDB와 MaxScale은 DB 원본·사용자 권한·replication·프록시 backend를 분리해 백업합니다.','원본과 복제본을 같은 IP/MAC으로 동시에 켜면 IP 충돌과 클러스터 데이터 문제가 생깁니다.']),
    P('5. 실제 조회 결과 요약', 'H1K'), T(inventory, [31*mm,51*mm,81*mm]),
    P('위 표는 2026-09-03에 SSH 조회 전용으로 확인한 값입니다. 자료에 적힌 서비스와 실제 실행 서비스가 다를 수 있으므로 최종 이관 목록은 실제 조회 결과로 확정합니다.', 'SmallK'),
    P('6. 데이터 이관 원칙', 'H1K'),
    P('Elasticsearch index, Solr index, ZooKeeper dataDir, Redis AOF/RDB, MariaDB datadir, Qdrant storage는 무조건 파일 복사하지 않습니다. 제품이 지원하는 snapshot/backup/restore를 우선 사용하고, 복구 후 제품 API와 데이터 건수를 검증합니다.'),
    P('7. 시뮬레이터란?', 'H1K'),
    P('시뮬레이터는 단순 실행 확인이 아니라 Gateway → Engine → Redis/DB/Search → TTS 같은 실제 업무 흐름을 테스트 데이터로 흘리는 통합 테스트입니다. 프로그램명·경로·실행 옵션·성공 판정 기준은 이관 전에 담당자에게 받아야 합니다.'),
    P('8. pool과 SR을 아주 쉽게 이해하기', 'H1K'),
    P('pool은 여러 Xen 호스트를 ‘한 팀’처럼 묶은 것입니다. 같은 pool이면 관리 화면에서 여러 호스트와 VM을 한꺼번에 보고, 조건이 맞을 때 VM을 다른 호스트로 옮기기 쉽습니다. 단, 같은 pool이라고 데이터가 자동으로 모두 복사된다는 뜻은 아닙니다.'),
    P('SR(Storage Repository)은 VM의 가상 디스크를 보관하는 ‘창고’입니다. VM의 CPU와 메모리는 실행 설정이고, 실제 Rocky Linux 파일과 /data 내용은 이 가상 디스크 안에 있습니다. 공유 SR이면 두 호스트가 같은 창고를 볼 수 있어 이동이 빠를 수 있고, 비공유 SR이면 XVA export/import처럼 디스크를 별도로 옮겨야 합니다.'),
    C('[호스트] ── 관리\n   ├─ [pool] 여러 호스트를 한 팀으로 묶는 논리 그룹\n   └─ [SR] VM 디스크를 보관하는 창고\n          └─ [VM] CPU/RAM/가상 디스크/가상 NIC\n                 └─ [OS] Rocky Linux\n                        └─ [서비스] Redis, ES, Solr, DB ...'),
    P('9. 연결은 어떻게 되는가?', 'H1K'),
    P('연결은 “주소(IP)를 알고, 상대 포트의 문이 열려 있고, 프로그램 설정이 그 주소를 가리키는 것”입니다. 예를 들어 VM 102의 Elasticsearch가 VM 103의 주소와 9200 포트를 바라본다면, 세 가지가 모두 맞아야 합니다: ① VM 103의 실제 IP, ② 9200 포트 LISTEN, ③ 방화벽 허용, ④ Elasticsearch 설정의 대상 주소.'),
    P('따라서 새 VM에서 IP만 바꾸면 끝나지 않습니다. /etc/hosts, yml·properties·conf·환경변수·systemd 설정에 옛 IP가 남아 있는지 찾아야 합니다. 테스트용 임시 IP를 쓸 때는 원본과 신규 VM이 서로 다른 주소를 사용해야 합니다.'),
    P('10. 한 문장으로 다시 정리', 'H1K'),
    P('이관은 “새 건물(xen03)에 세 집(VM)을 마련하고, 각 집의 가구(서비스), 주소록(설정), 물건(데이터), 이웃과의 전화번호(IP:PORT)를 확인한 다음, 손님(시뮬레이터)이 실제로 방문해 업무를 끝까지 수행하는지 검사하는 과정”입니다.'),
    P('11. Redis·Elasticsearch·Solr·ZooKeeper는 어떻게 연결되는가?', 'H1K'),
    P('이 네 제품은 서로 같은 제품이 아닙니다. Redis는 빠른 임시 데이터·세션·큐, Elasticsearch는 검색·분석, Solr는 검색 서비스, ZooKeeper는 SolrCloud 같은 분산 시스템의 멤버 정보와 설정 조정 역할을 합니다. 실제 업무 프로그램이 이들을 호출하는 방향은 VM의 설정파일을 읽어야 확정할 수 있습니다.'),
    C('업무 애플리케이션 / Gateway\n        ├─ Redis       : 빠른 상태·세션·큐 (예: 7000, 7001)\n        ├─ MariaDB     : 영구 업무 데이터 (예: 3306)\n        ├─ Elasticsearch: 검색·분석 API (예: 9200, 노드 통신 9300)\n        └─ Solr        : 검색 API (예: 8983)\n                         └─ ZooKeeper: SolrCloud 조정 (예: 2181)\n\n중요: 위 그림은 역할을 설명하는 기본 그림입니다. 실제 연결 주소와 포트는 각 VM의 설정과 로그로 확인합니다.'),
    T([['제품','누가 누구에게 연결?','대표 포트','이관 시 핵심'],['Redis','앱·Gateway가 Redis 노드로 연결','7000/7001','cluster node 주소·AOF/RDB·announce IP'],['Elasticsearch','앱·Kibana가 ES API로 연결, ES 노드끼리 통신','9200/9300','cluster.name·discovery·node 주소·index'],['Solr','앱이 Solr API로 연결, Solr가 ZK로 연결','8983/2181','ZK_HOST·chroot·collection·configset'],['ZooKeeper','ZK 앙상블 노드끼리 연결','2181/2888/3888','myid·server 목록·dataDir·quorum']], [28*mm,57*mm,27*mm,61*mm]),
    P('“연결한다”는 말은 새 VM의 프로그램을 켜는 것보다 더 구체적입니다. 예를 들어 Solr가 ZooKeeper에 연결되려면 새 VM의 Solr 설정에서 ZK 주소를 가리켜야 하고, 새 VM 방화벽에서 2181로 나갈 수 있어야 하며, ZooKeeper가 실제로 2181에서 응답해야 합니다. 세 조건 중 하나라도 틀리면 Solr는 실행 중이어도 클러스터에 들어가지 못합니다.'),
]

story2 = [
    P('1. 계획의 한 문장', 'H1K'),
    P('원본을 보존한 상태에서 세 VM의 구성을 목록화하고, xen03의 pool·SR·자원을 확인한 뒤, 백업 복구점을 만들고 VM을 한 대씩 이관합니다. 임시 주소에서 서비스·클러스터·시뮬레이터가 통과할 때만 운영 전환을 승인받습니다.'),
    P('초보자용 결론부터 말하면', 'H2K'),
    P('우리는 처음부터 운영 IP를 바꾸거나 세 VM을 동시에 끄지 않습니다. 먼저 “사진 찍기(조회) → 복사본 만들기(백업/이관) → 새 장소에서 조립하기(설정) → 시험 운전(검증) → 승인 후 주소 바꾸기(전환)” 순서로 진행합니다.'),
    C('원본 xen02                         신규 xen03\nVM101 ──────── 복제/이동 ────────> 새 VM101 역할\nVM102 ──────── 복제/이동 ────────> 새 VM102 역할\nVM103 ──────── 복제/이동 ────────> 새 VM103 역할\n  │                                      │\n  └─ 원본은 당분간 보존                  └─ 임시망에서 테스트'),
    P('2. 전체 이관 범위', 'H1K'),
    T([['대상','원본','목표','완료 기준'],['VM01','xen02.01 / .101','xen03의 새 VM','Qdrant·HAProxy·DB/검색 연계'],['VM02','xen02.02 / .102','xen03의 새 VM','ES/Solr/ZK/Redis/MariaDB'],['VM03','xen02.03 / .103','xen03의 새 VM','Notebook·업무 서비스·연계'],['공통','IP·hostname·디스크·데이터','임시 주소 또는 격리망','원본과 충돌 없이 검증·롤백']], [24*mm,48*mm,48*mm,45*mm]),
    P('3. 의사결정 게이트', 'H1K'),
    T([['게이트','통과 질문','통과 전 금지'],['G0 승인','작업시간·중단허용시간·담당자·롤백 담당자가 정해졌나?','shutdown·export·migrate'],['G1 구조','두 호스트가 같은 pool인가? SR가 공유되는가?','이관 방식 확정'],['G2 자원','xen03에 15 vCPU·54 GiB 이상과 디스크 여유가 있는가?','세 VM 동시 기동'],['G3 백업','VM과 제품별 데이터 복구가 확인됐나?','원본 삭제·IP 전환'],['G4 검증','서비스·포트·클러스터·시뮬레이터가 정상인가?','운영 cut-over'],['G5 전환','팀장·서비스 담당자가 결과를 승인했나?','원본 중단']], [22*mm,77*mm,66*mm]),
    P('4. 이관 방식 선택', 'H1K'),
    P('A안 - 같은 pool·공유 SR·호환 CPU이면 live migration을 검토합니다. 중단은 적지만 pool·네트워크·스토리지 조건 확인이 필수입니다.'),
    P('B안 - 다른 pool 또는 비공유 SR이면 XVA export/import를 검토합니다. 파일 크기·저장공간·전송시간·checksum을 먼저 계산하고, 보통 VM 종료 승인 후 export합니다.'),
    P('C안 - OS 재구축과 제품별 백업 복원입니다. 설치·설정 작업은 많지만 데이터와 서비스 구성을 가장 통제하기 쉽습니다.'),
    P('현재 xen03 SSH 계정에서는 xe 관리 명령에 별도 인증이 필요해 pool/SR 상태를 확정하지 못했습니다. 따라서 관리자 인증 또는 XenCenter 확인이 첫 번째 실제 작업입니다.', 'WarnK'),
    P('초보자가 헷갈리는 선택 기준', 'H2K'),
    T([['질문','예','선택'],['xen02와 xen03이 같은 pool이고 SR도 공유?','관리 화면에서 두 호스트가 한 pool에 있고 같은 SR를 봄','live migration 검토'],['pool은 다르지만 XVA 저장공간이 있음?','export 파일을 옮길 백업 공간이 있음','XVA export/import 검토'],['서비스만 새로 만들고 데이터는 공식 백업으로 복원?','제품별 설치·복원 절차가 준비됨','OS 재구축 + 제품별 복원']], [53*mm,74*mm,43*mm]),
    P('여기서 “무엇이 더 멋진 방법인가”보다 중요한 것은 원본을 되돌릴 수 있는가입니다. 처음 연습에서는 작은 비운영 VM으로 방법을 시험하고, 세 VM 전체 이관은 그 시험 결과를 보고 결정합니다.'),
    P('5. 단계별 계획', 'H1K'),
    T([['단계','할 일','산출물'],['1 조사','OS·자원·서비스·포트·설정·데이터 크기','As-Is 인벤토리'],['2 설계','pool/SR/network·임시 IP·자원 계획','To-Be 표'],['3 백업','VM export/snapshot·DB·검색·벡터 백업','복구점·checksum'],['4 이관','한 VM씩 복제/재구축·원본 보존','신규 VM'],['5 구성','hostname/IP/hosts/firewall/systemd/env','기동 가능한 VM'],['6 검증','프로세스→포트→API→클러스터→통합','테스트 증적'],['7 전환','승인 시간에 DNS/VIP/IP 정책 전환','Cut-over 기록'],['8 감시','로그·포트·자원·오류 모니터링','안정화 기록']], [20*mm,107*mm,38*mm]),
    P('6. 권장 순서', 'H1K'),
    P('복제본 검증 순서는 VM03 → VM02 → VM01을 권장합니다. VM01은 Qdrant·HAProxy·MaxScale까지 있어 현재 관찰상 가장 복잡하므로 마지막에 다루는 편이 안전합니다. 실제 제공자-소비자 관계가 다르면 제공자 서비스를 먼저 올립니다.'),
    P('7. 롤백', 'H1K'),
    *bullets(['전환 전에는 원본 세 VM을 변경하지 않습니다.','검증 실패 시 신규 VM만 격리·중지하고 원본을 유지합니다.','전환 후 장애 시 승인된 DNS/VIP 복귀 절차로 원본을 복귀합니다.','cut-over 후 쓰기가 발생하면 원본 단순 복귀가 데이터 유실을 만들 수 있으므로 쓰기 중지와 최종 백업 시점을 기록합니다.','롤백 성공 기준은 시뮬레이터·핵심 API·클러스터·DB 연결·로그 정상입니다.']),
    P('8. 팀장님 보고용 문장', 'H1K'),
    P('“세 VM을 한 번에 끄고 옮기지 않고, 실제 서비스·데이터 의존관계를 조사하고 xen03의 pool/SR/자원을 확인합니다. 백업 복구점을 만든 뒤 VM 단위로 이관·검증하고, 임시 주소의 시뮬레이터 테스트가 통과할 때만 운영 전환합니다. 실패하면 원본을 보존한 채 롤백합니다.”'),
    P('9. 계획을 외우는 대신 질문으로 기억하기', 'H1K'),
    *bullets(['내가 옮기는 것은 호스트인가, VM인가, 서비스인가, 데이터인가?','신규 VM이 원본과 동시에 켜져도 IP·MAC 충돌이 없는가?','xen03에 CPU·RAM·SR 공간이 충분한가?','이 서비스의 데이터는 파일 복사인가, 공식 backup/restore인가?','이 서비스가 다른 VM의 어느 IP:PORT를 호출하는가?','문제가 생기면 원본에서 몇 분 안에 다시 서비스를 시작할 수 있는가?','시뮬레이터의 성공은 어떤 응답·로그·업무 결과로 판정하는가?']),
    P('10. 제품 연결 검증 순서', 'H1K'),
    P('서비스를 아무 순서로나 켜면 원인을 찾기 어렵습니다. 보통은 기반 저장소와 조정 서비스 → 데이터 서비스 → 검색 서비스 → 업무 애플리케이션 → 시뮬레이터 순으로 확인합니다. 실제 기동 순서는 담당자의 운영 매뉴얼을 우선합니다.'),
    C('1) ZooKeeper 앙상블 상태\n2) Redis 노드/클러스터 상태\n3) MariaDB와 MaxScale\n4) Elasticsearch 노드/샤드\n5) Solr와 ZooKeeper 연결/collection\n6) Qdrant\n7) Gateway·Engine·Notebook·시뮬레이터'),
    P('주의: 이 순서는 학습용 기본 순서입니다. 101~103에서 실제 서비스가 어떤 VM에 있고 어떤 서비스가 제공자인지는 설정·로그 조사로 확정해야 합니다.'),
]

story3 = [
    P('0. 명령어 사용 규칙', 'H1K'),
    P('아래 [조회]는 읽기만 하고 [변경]은 서버 상태를 바꿉니다. [변경] 명령은 설명·검토용이며 승인된 작업창에서만 실행합니다. 대상 IP·VM UUID·경로·저장공간을 다시 확인한 뒤 사용합니다.'),
    P('명령어를 외울 필요는 없습니다. 모든 명령은 “어디에 있는지 확인 → 무엇이 실행 중인지 확인 → 어디와 연결되는지 확인 → 그 다음에만 변경”의 순서로 읽습니다. 아래 명령은 서버에 들어가서 관찰하는 돋보기라고 생각하면 됩니다.', 'WarnK'),
    P('명령어 결과 읽는 예', 'H2K'),
    C('LISTEN 0 128 0.0.0.0:9200 ... java,pid=1234\n          │       │              │\n          │       │              └─ 누가 열었나: java / PID 1234\n          │       └─ 어느 문인가: TCP 9200\n          └─ 외부 요청을 받을 준비가 됐나: LISTEN'),
    P('이 한 줄은 “Java 프로그램이 TCP 9200번 문을 열고 손님을 기다린다”는 뜻입니다. 하지만 이것만으로 Elasticsearch 클러스터가 정상이라고 단정할 수는 없습니다. API 응답·로그·노드 상태까지 이어서 확인해야 합니다.'),
    P('1. SSH와 기본 확인 [조회]', 'H1K'),
    C(r'''ssh -i $HOME\\.ssh\\xen-tc-admin_rsa admin@192.168.1.101
hostname
id -un
cat /etc/os-release'''),
    P('ssh는 원격 접속, -i는 개인키 지정, hostname은 서버 식별, id -un은 현재 사용자, os-release는 OS 확인입니다. 접속 직후 이 세 가지를 확인하면 다른 서버에서 명령하는 사고를 줄일 수 있습니다.'),
    P('2. 자원·디스크 조사 [조회]', 'H1K'),
    C('nproc\nfree -h\nlsblk -f\ndf -hT\nsudo du -xhd1 /data 2>/dev/null | sort -h'),
    P('nproc은 CPU, free -h는 메모리, lsblk -f는 디스크·파일시스템·UUID, df는 파티션 여유, du는 폴더별 실제 사용량을 보여줍니다.'),
    P('3. 서비스·프로세스·포트 [조회]', 'H1K'),
    C('systemctl list-units --type=service --state=running --no-pager\nsystemctl status elasticsearch780.service --no-pager\nsystemctl cat elasticsearch780.service\nps auxf\nsudo ss -lntup\njournalctl -u elasticsearch780.service -n 100 --no-pager'),
    P('status는 상태, cat은 ExecStart·EnvironmentFile·WorkingDirectory, ps는 프로세스, ss는 LISTEN 포트와 PID, journalctl은 로그입니다. active만 보지 말고 포트와 API까지 확인합니다.'),
    P('4. 설정·의존관계 [조회]', 'H1K'),
    C(r'''sudo grep -RniE '192\.168\.1\.|redis|elastic|solr|zookeeper|zk|maria|qdrant' /etc /opt /data 2>/dev/null | head -200
cat /etc/hosts
ip addr
ip route
sudo firewall-cmd --list-all
getenforce'''),
    P('grep은 IP·제품명·포트가 설정에 박혔는지 찾습니다. hosts는 이름→IP 표, ip 명령은 주소·경로, firewall-cmd는 방화벽, getenforce는 SELinux 상태를 보여줍니다. 결과에 비밀번호·토큰이 섞일 수 있으므로 공유 전 마스킹합니다.'),
    P('연결 문제를 네 단계로 쪼개기', 'H2K'),
    T([['질문','확인 방법','문제가 있으면'],['1. 주소가 맞나?','ip addr, /etc/hosts','잘못된 IP/hostname 수정 계획'],['2. 문이 열렸나?','ss -lntup','서비스 기동 여부 확인'],['3. 길이 막혔나?','nc -vz 상대IP 포트, 방화벽','방화벽·라우팅 확인'],['4. 프로그램이 대화하나?','curl·제품 health API·로그','설정·인증·클러스터 확인']], [45*mm,64*mm,61*mm]),
    P('5. xen03 관리정보 [조회 - Xen 관리자 인증 필요]', 'H1K'),
    C('xe host-list params=name-label,uuid,memory-total,memory-free\nxe vm-list is-control-domain=false params=name-label,uuid,power-state,VCPUs-max,memory-static-max\nxe sr-list params=name-label,uuid,physical-size,physical-utilisation,type\nxe network-list params=name-label,uuid,bridge-label'),
    P('host-list는 호스트·메모리, vm-list는 VM UUID·전원·vCPU·메모리, sr-list는 저장소 여유, network-list는 가상 네트워크를 확인합니다. 현재 xen03 SSH 계정으로 xe 실행 시 별도 인증이 요구됐습니다.'),
    P('6. 이관 명령 형태 [변경 - 승인 필요]', 'H1K'),
    P('같은 pool·공유 SR·호환 CPU가 확인된 경우:', 'H2K'),
    C('xe vm-migrate uuid=<SOURCE_VM_UUID> host-uuid=<DEST_HOST_UUID> live=true'),
    P('vm-migrate는 지정 VM을 지정 호스트로 이동합니다. live=true도 모든 조건에서 가능한 것은 아니므로 먼저 비운영 VM으로 검증합니다.'),
    P('비공유 SR 또는 별도 pool인 경우:', 'H2K'),
    C('xe vm-export vm=<SOURCE_VM_UUID> filename=/backup/xen02-01.xva\nsha256sum /backup/xen02-01.xva\nxe vm-import filename=/backup/xen02-01.xva sr-uuid=<DEST_SR_UUID> preserve=false'),
    P('vm-export는 VM과 디스크를 XVA로 내보내고, vm-import는 대상 SR로 가져옵니다. 파일 크기·공간·전송시간을 먼저 계산하고 원본과 복제본을 같은 IP/MAC으로 동시에 연결하지 않습니다.'),
    P('7. 신규 VM 최초 부팅 [조회]', 'H1K'),
    C('hostname\nip addr\nip route\ncat /etc/hosts\ndf -hT\nsystemctl --failed --no-pager\nsudo ss -lntup'),
    P('hostname·IP·route 충돌, 파일시스템 누락, failed 서비스, 포트 누락을 확인합니다. 최초 부팅에서는 원본 운영 IP로 바꾸지 않습니다.'),
    P('왜 원본과 신규를 동시에 켜면 안 되나요?', 'H2K'),
    P('두 집이 같은 주소를 가지면 우편물이 어느 집으로 갈지 알 수 없습니다. 서버에서는 ARP가 흔들리고, 클러스터 노드가 서로를 잘못 인식하며, DB·Redis에 서로 다른 데이터가 쓰일 수 있습니다. 그래서 첫 부팅은 격리 네트워크 또는 임시 IP에서 하고, 테스트가 끝난 뒤 승인된 전환 절차를 따릅니다.'),
    P('8. 애플리케이션 검증 순서', 'H1K'),
    T([['순서','확인','예시'],['1 프로세스','서비스 실행','systemctl status NAME'],['2 포트','문이 열림','ss -lntup'],['3 API','제품 응답','curl 127.0.0.1:9200'],['4 클러스터','노드·샤드·리더','제품별 health API·로그'],['5 통합','업무 흐름','시뮬레이터 테스트']], [25*mm,58*mm,85*mm]),
    P('9. 서비스 기동 명령 [변경 - 승인 필요]', 'H1K'),
    C('sudo systemctl start NAME\nsudo systemctl enable NAME\nsudo systemctl restart NAME\nsudo systemctl stop NAME'),
    P('start는 지금 시작, enable은 부팅 자동 시작, restart는 중단 후 재시작, stop은 중단입니다. restart와 stop은 승인 전 실행하지 않습니다.'),
    P('10. 먼저 실행하면 안 되는 것', 'H1K'),
    *bullets(['rm -rf: 영구 삭제','dnf update/upgrade: 버전·호환성 변경','systemctl stop/restart: 서비스 중단','firewall-cmd --add/remove: 정책 변경','setenforce 0: 보안 정책 약화','IP/hostname 변경: 원본·복제본 충돌','원본 VM 삭제: 검증·복구 전 금지']),
    P('11. 시뮬레이터 실행 전 확보할 값', 'H1K'),
    P('현재 자료에는 프로그램명·경로·옵션·테스트 데이터·성공 기준이 없습니다. 담당자에게 아래 정보를 받아 <SIMULATOR_COMMAND>를 실제 명령으로 바꿉니다.'),
    T([['값','필요한 이유'],['프로그램명·경로','무엇을 실행하는지 식별'],['환경변수·설정파일','Gateway·DB·검색 주소 확인'],['입력 데이터·케이스','반복 가능한 테스트'],['성공 응답·로그·시간','정상 판정'],['실패 로그','원인 분석·롤백 결정']], [62*mm,106*mm]),
    P('12. 실행 기록 양식', 'H1K'),
    C('작업일시:\n작업자/승인자:\n대상 VM UUID / hostname:\n원본 상태:\n백업 파일과 SHA-256:\n변경 명령 및 결과:\n서비스·포트·클러스터 결과:\n시뮬레이터 케이스/결과:\n롤백 필요 여부:'),
    P('13. 제품별 연결 테스트 명령 [조회/테스트]', 'H1K'),
    P('아래 명령은 실제 주소와 포트를 확인한 뒤 사용합니다. 인증이 필요한 환경에서는 비밀번호를 명령줄에 직접 적지 않습니다. 명령이 성공해도 “네트워크로 문까지 갔다”는 뜻일 뿐, 데이터나 클러스터가 정상이라는 뜻은 아닙니다.'),
    C('Redis - 지정 노드가 응답하는지\nredis-cli -h <REDIS_IP> -p 7000 ping\nredis-cli -h <REDIS_IP> -p 7000 cluster info\nredis-cli -h <REDIS_IP> -p 7000 cluster nodes\n\nElasticsearch - API·클러스터 확인\ncurl -sS http://<ES_IP>:9200/\ncurl -sS http://<ES_IP>:9200/_cluster/health?pretty\ncurl -sS http://<ES_IP>:9200/_cat/nodes?v\n\nSolr - Solr와 collection 확인\ncurl -sS http://<SOLR_IP>:8983/solr/admin/info/system?wt=json\ncurl -sS http://<SOLR_IP>:8983/solr/admin/collections?action=CLUSTERSTATUS&wt=json\n\nZooKeeper - 기본 응답 확인\necho ruok | nc -w 3 <ZK_IP> 2181\nnc -vz <ZK_IP> 2181'),
    P('Redis PONG은 Redis 한 노드가 응답한다는 뜻이고, cluster info의 cluster_state:ok까지 봐야 클러스터 상태를 판단할 수 있습니다. Elasticsearch는 green/yellow/red를 구분하고, Solr는 collection과 ZK 연결을 확인하며, ZooKeeper의 ruok 응답은 프로세스 생존 확인일 뿐 quorum 정상 판정은 아닙니다.'),
    P('참고: 사용자가 제공한 Linux OS 이관 가이드와 Citrix Hypervisor 8.2 공식 CLI 문서의 vm-migrate·vm-export·vm-import 개념을 반영했습니다. Citrix Hypervisor 8.2는 지원 종료 제품이므로 사내 표준과 관리자 절차를 우선합니다.', 'SmallK'),
]

for args in [
    ('01_이관에_필요한_이론과_기초지식.pdf', '이관에 필요한 이론과 기초지식', 'xen02에서 xen03으로 VM 3대를 옮기기 전에 이해해야 할 개념', story1),
    ('02_xen02에서_xen03으로_전체이관_계획.pdf', 'xen02에서 xen03으로 전체 이관 계획', 'xen02.01~03 전체 구성 이관을 위한 승인·백업·검증·롤백 Runbook', story2),
    ('03_실제_이관_행동방법과_명령어_해설.pdf', '실제 이관 행동방법과 명령어 해설', '조회부터 VM 이동, 서비스 검증, 시뮬레이터까지 - 실행 전 이해용', story3),
]:
    print(build(*args))
