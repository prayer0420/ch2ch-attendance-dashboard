from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Preformatted, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'C:\Users\c\Downloads\신입개발자_리눅스_서버_OS이관_초보자용_실전가이드.pdf')
OUT = ROOT / 'output' / 'pdf'
TMP = ROOT / 'tmp' / 'pdfs'
OUT.mkdir(parents=True, exist_ok=True); TMP.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Malgun', r'C:\Windows\Fonts\malgun.ttf'))
pdfmetrics.registerFont(TTFont('Malgun-Bold', r'C:\Windows\Fonts\malgunbd.ttf'))
ss = getSampleStyleSheet()
ss.add(ParagraphStyle(name='T', parent=ss['Title'], fontName='Malgun-Bold', fontSize=19, leading=26, alignment=TA_CENTER, textColor=colors.HexColor('#143B5D'), spaceAfter=10))
ss.add(ParagraphStyle(name='H', parent=ss['Heading1'], fontName='Malgun-Bold', fontSize=14, leading=20, textColor=colors.HexColor('#143B5D'), spaceBefore=7, spaceAfter=7))
ss.add(ParagraphStyle(name='H2', parent=ss['Heading2'], fontName='Malgun-Bold', fontSize=11, leading=16, textColor=colors.HexColor('#1F5F86'), spaceBefore=6, spaceAfter=4))
ss.add(ParagraphStyle(name='B', parent=ss['BodyText'], fontName='Malgun', fontSize=8.0, leading=11.5, spaceAfter=3))
ss.add(ParagraphStyle(name='S', parent=ss['BodyText'], fontName='Malgun', fontSize=7.6, leading=11, textColor=colors.HexColor('#5A6573'), spaceAfter=4))
ss.add(ParagraphStyle(name='W', parent=ss['BodyText'], fontName='Malgun-Bold', fontSize=8.3, leading=12, backColor=colors.HexColor('#FFF4D6'), borderColor=colors.HexColor('#E8B94A'), borderWidth=.6, borderPadding=5, spaceAfter=6))
ss.add(ParagraphStyle(name='C', parent=ss['Code'], fontName='Malgun', fontSize=6.9, leading=8.8, leftIndent=6, borderColor=colors.HexColor('#D9E2EC'), borderWidth=.5, borderPadding=5, backColor=colors.HexColor('#F6F8FA'), spaceAfter=6))

def P(x, st='B'): return Paragraph(x, ss[st])
def C(x): return Preformatted(x.strip(), ss['C'])
def T(rows, widths):
    t=Table(rows,colWidths=widths,repeatRows=1)
    t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,0),'Malgun-Bold'),('FONTNAME',(0,1),(-1,-1),'Malgun'),('FONTSIZE',(0,0),(-1,-1),7.1),('LEADING',(0,0),(-1,-1),9.8),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#DCEAF4')),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#B8C7D3')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),3),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
    return t
def footer(canvas, doc):
    canvas.saveState(); canvas.setFont('Malgun',7); canvas.setFillColor(colors.HexColor('#73808C')); canvas.drawString(16*mm,10*mm,'실서버 분석 업데이트 | 원본 가이드 보존본'); canvas.drawRightString(194*mm,10*mm,str(doc.page)); canvas.restoreState()
def appendix(name, title, story):
    path=TMP/name
    doc=BaseDocTemplate(str(path),pagesize=A4,leftMargin=16*mm,rightMargin=16*mm,topMargin=15*mm,bottomMargin=17*mm,title=title,author='Codex')
    doc.addPageTemplates([PageTemplate(id='p',frames=Frame(doc.leftMargin,doc.bottomMargin,doc.width,doc.height),onPage=footer)])
    doc.build([P(title,'T'),P('원본 가이드의 해당 주제를 유지한 상태에서 2026-09-03 조회 결과와 실제 환경 기준 설명을 덧붙인 업데이트 부록','S'),P('아래 내용은 분석·교육용입니다. 실제 변경 명령은 승인 전 실행하지 않습니다.','W')]+story)
    return path

def merge(name, source_pages, appendix_path):
    src=PdfReader(str(SOURCE)); out=PdfWriter()
    for n in source_pages: out.add_page(src.pages[n-1])
    app=PdfReader(str(appendix_path))
    for p in app.pages: out.add_page(p)
    dest=OUT/name
    with dest.open('wb') as f: out.write(f)
    return dest

common_inventory = [
    ['VM','실제 조회 자원','실제로 실행 중인 주요 서비스'],
    ['192.168.1.101\nxen02.01.tc.kr','Rocky 9.6 / 5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용','Qdrant, Elasticsearch 7.8, Solr 7.6, ZooKeeper 3.6.1, Redis 5.0.8(7000/7001), MariaDB 10.6.7, MaxScale, HAProxy, Node/Kibana'],
    ['192.168.1.102\nxen02.02.tc.kr','Rocky 9.6 / 5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용','Elasticsearch 7.8, Solr 7.6, ZooKeeper 3.6.1, Redis 5.0.8(7000/7001), MariaDB'],
    ['192.168.1.103\nxen02.03.tc.kr','Rocky 9.6 / 5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용','Elasticsearch 7.8, Solr 7.6, ZooKeeper 3.6.1, Redis 5.0.8(7000/7001), MariaDB, Docker proxy'],
]

append1=[
    P('A. 실제로 접속해서 확인한 현재 상태','H'),
    P('세 VM에 SSH로 접속해 hostname, 사용자, OS, CPU, 메모리, 디스크, 실행 서비스, LISTEN 포트를 조회했습니다. 다음 표는 “문서에 적힌 예상값”이 아니라 이번 접속에서 관찰한 값입니다.'),
    T(common_inventory,[31*mm,53*mm,76*mm]),
    P('관찰된 주요 포트: Redis 7000/7001, ZooKeeper 2181, Solr 8983, Elasticsearch 9200/9300, MariaDB 3306 또는 13306, Qdrant 6333~6335. 실제 연결 상대와 방화벽은 설정파일 및 서비스 로그에서 추가 확인해야 합니다.','S'),
    P('B. 서비스들이 서로 연결되는 모습','H'),
    C('업무 애플리케이션 / Gateway\n    ├─ Redis        빠른 세션·큐·상태 데이터\n    ├─ MariaDB      영구 업무 데이터\n    ├─ Elasticsearch 검색·분석 API\n    └─ Solr         검색 API\n                    └─ ZooKeeper가 SolrCloud 조정\n\nQdrant는 벡터 검색 데이터 저장소입니다.\nHAProxy/MaxScale은 뒤쪽 여러 서비스로 요청을 나누는 문지기 역할입니다.'),
    P('Redis는 보통 앱이 Redis의 IP와 7000/7001 포트로 연결합니다. Elasticsearch는 앱·Kibana가 9200으로 API를 호출하고, 노드끼리는 9300을 사용할 수 있습니다. SolrCloud는 Solr가 ZooKeeper의 2181로 연결되어 collection·configset 정보를 조정합니다. ZooKeeper는 앙상블 노드끼리 2888·3888을 사용할 수 있습니다.'),
    P('이 그림은 역할 설명이지 실제 토폴로지 확정본이 아닙니다. 실제 주소는 systemctl cat으로 실행 설정을 찾고, grep으로 IP·hostname·port를 확인해야 합니다.','W'),
    P('C. 이관 때 새로 설치하는 것과 복사하는 것','H'),
    T([['대상','일반적인 처리','주의'],['VM/OS','VM 이동·복제 또는 새 VM 생성','CPU·RAM·디스크·NIC·MAC 확인'],['서비스 프로그램','새 VM에 같은 버전 설치 또는 VM에 포함된 파일 사용','systemd·실행 사용자·라이브러리 확인'],['설정','원본에서 위치를 찾아 비교·이식','옛 IP·hostname·비밀번호 마스킹'],['데이터','제품 공식 backup/snapshot/restore 우선','잠긴 파일·버전 호환성 확인'],['연결','hosts·DNS·방화벽·환경변수·클러스터 주소 재검증','원본과 신규 IP 충돌 금지']], [28*mm,78*mm,54*mm]),
    P('따라서 정답은 “무조건 새로 설치”도 “무조건 통째로 복사”도 아닙니다. VM은 복제할 수 있지만, DB·검색 인덱스·Redis·ZooKeeper·Qdrant 데이터는 제품별 복구 방식을 함께 적용해야 합니다.'),
]

append2=[
    P('먼저 읽을 큰 그림 - 팀장님께 이렇게 설명하면 됩니다','H'),
    P('“이번 작업은 서버 한 대를 통째로 옮기는 작업이 아니라, xen02라는 건물 안에 있는 VM 세 채를 xen03이라는 건물로 옮겨서 같은 서비스와 연결을 다시 만드는 작업입니다. 먼저 현재 상태를 조사하고, xen03의 수용 능력과 Xen 구조를 확인합니다. 그 다음 원본을 보존한 복사본을 만들고, Redis·MariaDB·Elasticsearch·ZooKeeper·Solr·Qdrant의 연결을 새 환경에 맞춰 검증합니다. 시뮬레이터가 업무 흐름을 끝까지 통과한 뒤에만 운영 전환하고, 실패하면 원본으로 돌아갑니다.”'),
    C('현재:  xen02 호스트\n          ├─ VM 101: Qdrant + 검색 + DB + 프록시\n          ├─ VM 102: 검색 + Solr/ZooKeeper + Redis + DB\n          └─ VM 103: 검색 + Solr/ZooKeeper + Redis + DB + 업무 도구\n\n목표:  xen03 호스트\n          ├─ VM 101 역할을 새 환경에서 재현\n          ├─ VM 102 역할을 새 환경에서 재현\n          └─ VM 103 역할을 새 환경에서 재현\n\n검증:  주소 → 포트 → 서비스 → 클러스터 → 시뮬레이터 → 승인 전환'),
    P('이 문서의 역할은 “무엇을, 왜, 어떤 순서와 승인으로 할지”를 정하는 것입니다. 명령어의 상세 문법은 3번 문서로 넘기고, 제품의 기본 개념은 1번 문서를 참조합니다.','W'),
    P('A. 이번 이관의 실제 범위','H'),
    P('출발지는 tc-xen02(192.168.1.100)와 그 안의 VM 101·102·103입니다. 목적지는 tc-xen03(192.168.1.120)입니다. 세 VM 전체를 옮기되, 한 번에 모두 변경하지 않고 한 대씩 복제·검증합니다.'),
    T(common_inventory,[31*mm,53*mm,76*mm]),
    P('B. 서비스 의존관계를 먼저 그리는 이유','H'),
    P('서비스는 혼자 섬처럼 떠 있지 않습니다. 예를 들어 Solr가 실행 중이어도 ZooKeeper 주소가 옛 IP를 가리키면 SolrCloud에 참여하지 못합니다. Redis가 PONG을 반환해도 클러스터 노드 주소가 옛 IP면 앱의 일부 요청이 실패할 수 있습니다. Elasticsearch가 9200에서 응답해도 노드 통신 9300과 discovery가 틀리면 클러스터가 분리될 수 있습니다.'),
    T([['확인 대상','확인할 연결','테스트 관점'],['Redis','앱 → Redis 7000/7001','ping보다 cluster info·nodes까지'],['Elasticsearch','앱/Kibana → 9200, ES 노드 ↔ 9300','cluster health·nodes·shards'],['Solr','앱 → 8983, Solr → ZooKeeper 2181','collection·ZK_HOST·configset'],['ZooKeeper','ZK 노드 ↔ 2181/2888/3888','앙상블 quorum·myid·server 목록'],['MariaDB/MaxScale','앱/프록시 → DB 포트','DB 사용자·권한·backend·데이터 건수'],['Qdrant','앱 → 6333 등','collection 목록·검색 결과']], [32*mm,65*mm,63*mm]),
    P('C. 실제 계획: 사진 → 복사본 → 조립 → 시험 → 전환','H'),
    C('1. 사진: 원본 VM·서비스·포트·설정·데이터 크기 기록\n2. 복사본: VM export/snapshot 또는 새 VM 준비\n3. 조립: OS·서비스·설정·hosts·방화벽·권한 구성\n4. 시험: 프로세스 → 포트 → API → 클러스터 → 시뮬레이터\n5. 전환: 승인 후에만 DNS/VIP/IP 정책 변경\n6. 복귀: 실패하면 원본을 보존한 채 신규만 격리'),
    P('D. 이관 방식 결정에 필요한 xen03 정보','H'),
    P('xen03 SSH 접속은 확인했지만, 현재 admin 계정으로 xe를 실행하면 별도 인증이 요구됐습니다. 따라서 아래 정보는 Xen 관리자 인증 또는 XenCenter에서 확보해야 합니다.'),
    C('xe host-list params=name-label,uuid,memory-total,memory-free\nxe vm-list is-control-domain=false params=name-label,uuid,power-state,VCPUs-max,memory-static-max\nxe sr-list params=name-label,uuid,physical-size,physical-utilisation,type\nxe network-list params=name-label,uuid,bridge-label'),
    P('pool과 공유 SR이 확인되면 live migration을 검토할 수 있고, 그렇지 않으면 XVA export/import나 OS 재구축+제품별 데이터 복원을 검토합니다. 어느 방식이든 원본 보존, 백업, 임시 IP, 연결 검증, 롤백이 선행입니다.','W'),
    P('E. 서비스 검증 순서','H'),
    P('일반적인 학습 순서는 ZooKeeper·Redis·MariaDB 같은 기반 서비스 → Elasticsearch·Solr·Qdrant → Gateway·Engine → 시뮬레이터입니다. 단 실제 운영 기동 순서는 사내 매뉴얼과 서비스 담당자의 의존관계를 우선합니다.'),
    P('F. 팀장님 예상 질문과 답변','H'),
    P('Q. 세 VM을 그냥 복사하면 되지 않나?\nA. VM 디스크는 복사할 수 있지만, 서비스 설정의 옛 IP·hostname, DB·검색 데이터의 일관성, 클러스터 노드 정보, 방화벽은 자동으로 올바르게 바뀌지 않습니다. 그래서 복제 후 연결과 제품 상태를 따로 검증합니다.'),
    P('Q. 왜 한 번에 세 대를 옮기지 않나?\nA. 한 대씩 옮기면 문제가 생긴 VM과 원인을 좁힐 수 있고, 원본을 유지하면서 롤백하기 쉽습니다. 서비스 의존관계상 제공자와 소비자를 구분해야 하므로 순차 검증이 안전합니다.'),
    P('Q. 언제 성공으로 보나?\nA. VM이 켜진 것만으로 성공이 아닙니다. 필요한 프로세스·포트·API·클러스터 상태·데이터 건수·실제 시뮬레이터 업무 흐름까지 통과하고, 담당자 승인을 받아야 합니다.'),
    P('Q. 지금 당장 가장 먼저 할 일은?\nA. xen03의 Xen 관리자 인증으로 pool·SR·network·자원 현황을 확인하고, 시뮬레이터의 정확한 실행 명령과 성공 기준을 확보하는 것입니다. 이 두 가지가 정해져야 이관 방식을 확정할 수 있습니다.'),
]

append3=[
    P('A. 실제 연결 확인 명령과 읽는 법','H'),
    P('아래 명령은 상태를 확인하는 테스트용입니다. <IP>와 <PORT>는 실제 설정에서 확인한 값으로 바꾸고, 인증 비밀번호는 명령줄에 적지 않습니다.'),
    C('Redis\nredis-cli -h <REDIS_IP> -p 7000 ping\nredis-cli -h <REDIS_IP> -p 7000 cluster info\nredis-cli -h <REDIS_IP> -p 7000 cluster nodes\n\nElasticsearch\ncurl -sS http://<ES_IP>:9200/\ncurl -sS http://<ES_IP>:9200/_cluster/health?pretty\ncurl -sS http://<ES_IP>:9200/_cat/nodes?v\n\nSolr\ncurl -sS http://<SOLR_IP>:8983/solr/admin/info/system?wt=json\ncurl -sS http://<SOLR_IP>:8983/solr/admin/collections?action=CLUSTERSTATUS&wt=json\n\nZooKeeper\necho ruok | nc -w 3 <ZK_IP> 2181\nnc -vz <ZK_IP> 2181'),
    P('Redis PONG은 한 노드 응답입니다. cluster_state:ok와 cluster nodes의 주소·상태까지 봐야 합니다. Elasticsearch는 green/yellow/red와 노드 수를 봅니다. Solr는 collection과 ZK 연결을 봅니다. ZooKeeper ruok은 생존 확인이지 quorum 정상의 완전한 증거는 아닙니다.'),
    P('B. VM 안에서 설정 위치 찾기','H'),
    C('systemctl cat NAME\n# ExecStart, EnvironmentFile, WorkingDirectory를 읽는다\nsudo grep -RniE "redis|elastic|solr|zookeeper|zk|qdrant|maria|192\\.168\\.1\\." /etc /opt /data 2>/dev/null | head -200\ncat /etc/hosts\nip addr\nip route\nsudo firewall-cmd --list-all\ngetenforce'),
    P('systemctl cat은 서비스가 어떤 파일과 옵션으로 시작되는지 찾는 명령입니다. grep은 연결 주소와 포트를 찾습니다. hosts는 이름을 IP로 바꾸고, ip route는 다른 서버로 가는 길을 확인하며, 방화벽은 문이 막혔는지 확인합니다.'),
    P('C. 이관 후 연결을 고치는 순서','H'),
    T([['순서','행동','정상 기준'],['1 주소','hostname·ip addr·/etc/hosts 확인','원본과 충돌하지 않는 임시 주소'],['2 서비스','systemctl status·ps 확인','프로세스와 실행 사용자가 예상과 일치'],['3 포트','ss -lntup 확인','필요 포트 LISTEN'],['4 네트워크','nc -vz 상대IP 포트','TCP 연결 성공'],['5 제품','redis-cli·curl·health API','제품 응답·클러스터 정상'],['6 통합','시뮬레이터 실행','업무 흐름 성공·로그 정상']], [22*mm,79*mm,59*mm]),
    P('D. 실제 이관 명령 형태와 위험 설명','H'),
    C('# 같은 pool·공유 SR·호환 CPU를 확인한 뒤에만 검토\nxe vm-migrate uuid=<SOURCE_VM_UUID> host-uuid=<DEST_HOST_UUID> live=true\n\n# 비공유 SR 또는 별도 pool일 때 검토\nxe vm-export vm=<SOURCE_VM_UUID> filename=/backup/xen02-01.xva\nsha256sum /backup/xen02-01.xva\nxe vm-import filename=/backup/xen02-01.xva sr-uuid=<DEST_SR_UUID> preserve=false'),
    P('vm-migrate는 VM을 다른 호스트로 옮기는 관리 명령, vm-export는 VM과 디스크를 XVA로 내보내는 명령, vm-import는 XVA를 대상 SR에 가져오는 명령입니다. UUID·SR·호스트를 잘못 넣으면 다른 VM을 대상으로 삼을 수 있으므로 승인과 이중 확인이 필요합니다.','W'),
]

apps=[
    ('01_이관에_필요한_이론과_기초지식.pdf',[1,2,8,9,10,11,12],appendix('appendix1.pdf','실서버 분석 업데이트 - 이론·구조',append1)),
    ('02_xen02에서_xen03으로_전체이관_계획.pdf',[13,14,15,16,17,18,20],appendix('appendix2.pdf','실서버 분석 업데이트 - 전체 이관 계획',append2)),
    ('03_실제_이관_행동방법과_명령어_해설.pdf',[3,4,5,6,7,19],appendix('appendix3.pdf','실서버 분석 업데이트 - 실제 연결·행동방법',append3)),
]
for name,pages,app in apps:
    print(merge(name,pages,app))
