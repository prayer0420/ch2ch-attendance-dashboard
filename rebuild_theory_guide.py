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

ROOT = Path(__file__).parent
SOURCE = Path(r'C:\Users\c\Downloads\신입개발자_리눅스_서버_OS이관_초보자용_실전가이드.pdf')
OUT = ROOT / 'output' / 'pdf' / '01_이관에_필요한_이론과_기초지식.pdf'
TMP = ROOT / 'tmp' / 'pdfs' / 'theory_appendix.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True); TMP.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Malgun', r'C:\Windows\Fonts\malgun.ttf'))
pdfmetrics.registerFont(TTFont('Malgun-Bold', r'C:\Windows\Fonts\malgunbd.ttf'))
ss = getSampleStyleSheet()
ss.add(ParagraphStyle(name='TitleK', parent=ss['Title'], fontName='Malgun-Bold', fontSize=21, leading=28, alignment=TA_CENTER, textColor=colors.HexColor('#143B5D'), spaceAfter=10))
ss.add(ParagraphStyle(name='SubK', parent=ss['Normal'], fontName='Malgun', fontSize=10, leading=16, alignment=TA_CENTER, textColor=colors.HexColor('#52606D'), spaceAfter=12))
ss.add(ParagraphStyle(name='H1K', parent=ss['Heading1'], fontName='Malgun-Bold', fontSize=15, leading=21, textColor=colors.HexColor('#143B5D'), spaceBefore=7, spaceAfter=7))
ss.add(ParagraphStyle(name='H2K', parent=ss['Heading2'], fontName='Malgun-Bold', fontSize=11.5, leading=16, textColor=colors.HexColor('#1F5F86'), spaceBefore=5, spaceAfter=4))
ss.add(ParagraphStyle(name='BodyK', parent=ss['BodyText'], fontName='Malgun', fontSize=8.8, leading=13.3, spaceAfter=5))
ss.add(ParagraphStyle(name='SmallK', parent=ss['BodyText'], fontName='Malgun', fontSize=7.5, leading=10.5, textColor=colors.HexColor('#5A6573'), spaceAfter=4))
ss.add(ParagraphStyle(name='WarnK', parent=ss['BodyText'], fontName='Malgun-Bold', fontSize=8.7, leading=13, backColor=colors.HexColor('#FFF4D6'), borderColor=colors.HexColor('#E8B94A'), borderWidth=.6, borderPadding=6, spaceAfter=7))
ss.add(ParagraphStyle(name='CodeK', parent=ss['Code'], fontName='Malgun', fontSize=7.1, leading=9.1, leftIndent=6, borderColor=colors.HexColor('#D9E2EC'), borderWidth=.5, borderPadding=6, backColor=colors.HexColor('#F6F8FA'), spaceAfter=7))

def P(x, st='BodyK'):
    return Paragraph(x, ss[st])
def C(x):
    return Preformatted(x.strip(), ss['CodeK'])
def T(rows, widths):
    t = Table(rows, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,0),'Malgun-Bold'),('FONTNAME',(0,1),(-1,-1),'Malgun'),('FONTSIZE',(0,0),(-1,-1),7.3),('LEADING',(0,0),(-1,-1),10.2),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#DCEAF4')),('TEXTCOLOR',(0,0),(-1,0),colors.HexColor('#143B5D')),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#B8C7D3')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),4),('RIGHTPADDING',(0,0),(-1,-1),4),('TOPPADDING',(0,0),(-1,-1),4),('BOTTOMPADDING',(0,0),(-1,-1),4)]))
    return t
def footer(canvas, doc):
    canvas.saveState(); canvas.setFont('Malgun',7); canvas.setFillColor(colors.HexColor('#73808C')); canvas.drawString(16*mm,10*mm,'1번 이론·기초지식 | 초보자 해설 + 원본 가이드'); canvas.drawRightString(194*mm,10*mm,str(doc.page)); canvas.restoreState()

story = [
    P('1번 문서: 이관에 필요한 이론과 기초지식', 'TitleK'),
    P('먼저 아주 쉬운 설명을 읽고, 뒤에서 사용자가 제공한 원본 가이드 1~13페이지를 그대로 읽는 구조', 'SubK'),
    P('이 문서는 실제 서버를 변경하기 위한 실행 지시서가 아닙니다. “무엇이 무엇인지”를 이해하는 공부용 문서입니다. 실제 서버 명령은 승인된 작업에서만 실행합니다.', 'WarnK'),
    P('1. 이관을 한 문장으로 이해하기', 'H1K'),
    P('이관은 서버의 주소만 바꾸는 일이 아닙니다. 현재 xen02에서 돌아가는 세 VM을 xen03에서 같은 역할을 하도록 옮기고, 프로그램·설정·데이터·네트워크 연결이 모두 정상인지 확인하는 일입니다.'),
    P('10살 어린이에게 설명하면, xen02는 아파트 건물이고 VM은 그 안의 집입니다. 101·102·103은 집 주소입니다. Redis·Elasticsearch·Solr·ZooKeeper·MariaDB 같은 프로그램은 각 집 안에서 일하는 사람입니다. 이관은 집 벽만 옮기는 것이 아니라 가구, 냉장고 속 물건, 열쇠, 전화번호부, 이웃과의 연락처까지 새 건물에서 다시 맞추는 것입니다.'),
    C('현재\n[tc-xen02 / 192.168.1.100]\n  ├─ VM 101 / 192.168.1.101\n  ├─ VM 102 / 192.168.1.102\n  └─ VM 103 / 192.168.1.103\n\n목표\n[tc-xen03 / 192.168.1.120]\n  ├─ 새 VM: 101의 역할\n  ├─ 새 VM: 102의 역할\n  └─ 새 VM: 103의 역할'),
    P('따라서 “새로 설치인가요, 복사인가요?”의 답은 둘 다 일부 맞습니다. VM 자체는 복제·이동할 수 있지만, 서비스 프로그램과 데이터는 새로 설치하거나 제품별 백업으로 복원해야 할 수 있습니다. 실제 방법은 Xen pool/SR 상태와 서비스 데이터 방식에 따라 정합니다.'),
    P('2. 먼저 단어 10개부터', 'H1K'),
    T([['단어','어린이용 설명','이번 환경에서의 의미'],['서버','큰 컴퓨터','xen02·xen03 같은 물리 호스트'],['호스트','VM을 품는 건물','tc-xen02, tc-xen03'],['VM','건물 안의 독립된 집','192.168.1.101~103'],['OS','집의 기본 바닥과 벽','Rocky Linux 9.6'],['서비스','자동으로 일하는 프로그램','Redis, ES, Solr, DB 등'],['프로세스','지금 실제로 실행 중인 일꾼','java, redis-server, qdrant 등'],['포트','프로그램의 문 번호','9200, 9300, 8983, 2181 등'],['설정','프로그램에게 주는 사용 설명서','yml, conf, env, systemd'],['데이터','잃으면 안 되는 실제 내용','DB, 검색 index, collection']], [28*mm,54*mm,72*mm]),
    PageBreak(),
    P('3. Xen 구조: 호스트·VM·pool·SR', 'H1K'),
    P('호스트는 VM이 실제로 실행되는 물리 서버입니다. VM은 호스트 안에서 독립된 컴퓨터처럼 동작합니다. 사용자는 VM에 SSH로 접속하지만, VM을 어느 호스트에서 실행할지는 Xen 관리 영역에서 결정됩니다.'),
    C('[Xen 호스트: tc-xen02]\n  ├─ [VM 101] Rocky Linux + 서비스 + 데이터\n  ├─ [VM 102] Rocky Linux + 서비스 + 데이터\n  └─ [VM 103] Rocky Linux + 서비스 + 데이터\n\n[pool]\n  여러 Xen 호스트를 한 팀처럼 묶은 관리 단위\n\n[SR]\n  VM의 가상 디스크를 보관하는 저장소(창고)'),
    P('pool은 여러 호스트를 한 화면과 관리 체계로 묶는 논리적인 팀입니다. 같은 pool이라고 VM 데이터가 무조건 자동으로 복사되는 것은 아닙니다. SR은 VM의 디스크를 보관하는 창고입니다. 공유 SR이면 여러 호스트가 같은 창고를 볼 수 있고, 비공유 SR이면 디스크를 XVA 등으로 별도 이동할 수 있습니다.'),
    T([['질문','왜 중요한가?','확인할 것'],['같은 pool인가?','live migration 가능성 판단','호스트·pool UUID'],['SR가 공유인가?','디스크 이동 방식 결정','SR 이름·UUID·공간'],['CPU가 호환되는가?','VM이 새 호스트에서 부팅되는지','CPU 기능·세대'],['공간이 충분한가?','세 VM 디스크 수용 가능 여부','SR 여유·백업 공간'],['네트워크가 같은가?','VM이 기존 이웃과 통신하는지','network·bridge·VLAN']], [35*mm,63*mm,56*mm]),
    P('현재 확인 결과: xen03 SSH 접속은 되었지만, admin 계정으로 xe 관리 명령을 실행할 때 별도 인증이 요구되었습니다. 그러므로 xen03의 pool·SR·network·여유 자원은 아직 확정되지 않았습니다. 이것은 “접속 실패”가 아니라 “게스트 OS 접속과 Xen 관리 권한은 별개”라는 뜻입니다.', 'WarnK'),
    P('4. VM 안의 7층 구조', 'H1K'),
    T([['층','무엇인가?','문제 예시'],['1 VM/OS','CPU·RAM·디스크·Rocky','디스크가 안 붙음'],['2 Network','IP·gateway·DNS·hosts','잘못된 주소로 호출'],['3 Runtime','Java·Python·Docker','실행 기반 버전 불일치'],['4 Service','systemd 자동 실행','서비스 이름·사용자 다름'],['5 Config','설정파일·환경변수','옛 IP가 남음'],['6 Data','DB·index·collection','데이터 복원 누락'],['7 Connection','VM 간 실제 통신','방화벽·포트·클러스터 오류']], [28*mm,65*mm,61*mm]),
    PageBreak(),
    P('5. 네트워크를 아주 쉽게 이해하기', 'H1K'),
    P('프로그램 A가 프로그램 B를 찾아가려면 네 가지가 필요합니다. 주소(IP)가 맞아야 하고, 상대 프로그램의 포트 문이 열려 있어야 하며, 중간 방화벽이 통과시켜야 하고, 프로그램 설정이 그 주소를 가리켜야 합니다.'),
    C('앱 ──(상대 IP + 포트)──> Redis/ES/Solr/DB\n │                         │\n └─ 설정파일·환경변수        └─ 서비스가 LISTEN\n                             │\n                        방화벽 허용'),
    T([['요소','비유','확인 질문'],['IP','집 주소','어느 VM인가?'],['hostname','집 이름','이름이 올바른 IP로 바뀌나?'],['port','현관문 번호','프로그램이 그 번호에서 기다리나?'],['gateway','동네 밖으로 가는 길','다른 네트워크로 갈 수 있나?'],['DNS/hosts','전화번호부','이름을 주소로 바꿀 수 있나?'],['firewall','경비실','해당 포트를 통과시키나?']], [30*mm,53*mm,71*mm]),
    P('예를 들어 Solr가 ZooKeeper에 연결된다는 말은 Solr 설정에 ZooKeeper 주소가 있고, Solr VM에서 그 주소의 2181 포트로 갈 수 있고, ZooKeeper가 2181에서 응답한다는 뜻입니다. 하나라도 틀리면 Solr 프로세스는 떠 있어도 SolrCloud가 정상이라고 할 수 없습니다.'),
    P('6. 서비스별 역할과 연결', 'H1K'),
    T([['제품','초보자용 역할','대표 연결·포트','이관 때 보는 것'],['Redis','빠른 메모장·세션·큐','앱 → 7000/7001','cluster nodes, AOF/RDB, announce IP'],['Elasticsearch','검색·분석 엔진','앱/Kibana → 9200\n노드 ↔ 9300','cluster health, nodes, shards'],['Solr','검색 API·SolrCloud','앱 → 8983\nSolr → ZK 2181','ZK_HOST, collection, configset'],['ZooKeeper','SolrCloud 조정자·주소록','앙상블 2181/2888/3888','myid, server 목록, quorum'],['MariaDB','영구 업무 데이터 창고','앱/MaxScale → 3306 등','사용자·권한·datadir·데이터'],['Qdrant','벡터 검색 저장소','앱 → 6333 등','collection·storage·검색 결과']], [29*mm,48*mm,46*mm,49*mm]),
    P('서비스들은 서로 대체재가 아닙니다. Redis가 정상이어도 Elasticsearch가 자동으로 정상 되는 것은 아니고, ZooKeeper가 정상이어도 Solr의 collection이 정상이라는 보장은 없습니다. 제품마다 “프로세스가 떴는가 → 포트가 열렸는가 → 제품 API가 응답하는가 → 클러스터가 정상인가”를 따로 확인합니다.'),
    PageBreak(),
    P('7. 실제 접속해서 관찰한 세 VM', 'H1K'),
    P('아래 내용은 2026-09-03에 admin SSH로 접속해 조회한 실제 관찰값입니다. 비밀번호·개인키는 문서에 기록하지 않았습니다. “실행 중”이라는 사실은 확인했지만, 각 서비스의 최종 클러스터 구성과 업무 연결 상대는 설정파일·로그 추가 조사가 필요합니다.'),
    T([['VM','기본 자원','실제 실행 중인 서비스'],['101 / 192.168.1.101\nxen02.01.tc.kr','Rocky 9.6\n5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용','Qdrant, Elasticsearch 7.8, Solr 7.6, ZooKeeper 3.6.1, Redis 5.0.8(7000/7001), MariaDB 10.6.7, MaxScale, HAProxy, Node/Kibana'],['102 / 192.168.1.102\nxen02.02.tc.kr','Rocky 9.6\n5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용','Elasticsearch 7.8, Solr 7.6, ZooKeeper 3.6.1, Redis 5.0.8(7000/7001), MariaDB, Docker proxy'],['103 / 192.168.1.103\nxen02.03.tc.kr','Rocky 9.6\n5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용','Elasticsearch 7.8, Solr 7.6, ZooKeeper 3.6.1, Redis 5.0.8(7000/7001), MariaDB, Docker proxy']], [34*mm,52*mm,86*mm]),
    P('확인된 주요 LISTEN 포트: 101은 80, 2181, 3306, 6333~6335, 8983, 9200/9300 등이 보였고, 102·103은 2181, 8983, 9200/9300, Redis 7000/7001, MariaDB 관련 포트 등이 보였습니다. 포트 숫자만으로 서비스 관계를 확정하지 말고 PID·설정·로그를 함께 봅니다.'),
    P('8. 데이터·설정·프로그램을 구분하기', 'H1K'),
    P('이관에서 가장 많이 하는 실수는 “프로그램 파일을 복사했으니 끝났다”고 생각하는 것입니다. 실제로는 세 종류를 따로 챙겨야 합니다.'),
    T([['종류','예','새 환경에서 필요한 일'],['프로그램','java, redis-server, solr 실행 파일','같은 버전 설치·실행 가능 여부 확인'],['설정','application.yml, redis.conf, solr.xml, env','새 IP·hostname·경로·권한 반영'],['데이터','MariaDB, ES index, Solr index, Qdrant collection','제품별 backup/restore와 건수·검색 검증']], [31*mm,65*mm,76*mm]),
    P('특히 Elasticsearch index, Solr index, ZooKeeper dataDir, Redis AOF/RDB, MariaDB datadir, Qdrant storage는 서비스가 실행 중일 때 무작정 복사하면 일관성이 깨질 수 있습니다. 서비스별 공식 백업·복원 방법을 우선 검토해야 합니다.', 'WarnK'),
    PageBreak(),
    P('9. 명령어 결과를 읽는 기초', 'H1K'),
    P('원본 가이드의 명령어를 외우기보다 “이 명령이 무엇을 보여주고, 결과로 어떤 질문에 답하는가”를 기억합니다.'),
    T([['명령','보여주는 것','답할 수 있는 질문'],['pwd','현재 위치','내가 어느 디렉터리에 있나?'],['ls -al','파일·권한·소유자','설정파일이 있나? 누가 읽나?'],['cat/less','파일 내용','설정과 로그에 무엇이 있나?'],['grep','특정 문자열 위치','옛 IP·포트가 남았나?'],['find','파일 위치','yml·conf가 어디 있나?'],['df -hT','파티션 여유','디스크가 꽉 찼나?'],['du -sh','폴더별 사용량','어느 데이터가 큰가?'],['free -h','메모리','RAM이 부족한가?'],['systemctl status','서비스 상태','자동 관리 서비스가 정상인가?'],['ps auxf','실제 프로세스','무슨 프로그램이 실행 중인가?'],['ss -lntup','LISTEN 포트·PID','어느 문을 누가 열었나?'],['ip addr/route','IP·경로','주소와 통신 길이 맞나?'],['curl/nc','API·TCP 테스트','상대 서비스와 대화되나?']], [28*mm,63*mm,81*mm]),
    P('10. 내가 지금 알고 있는 것과 모르는 것', 'H1K'),
    T([['구분','확인된 사실','아직 확인해야 할 것'],['접속','101~103 SSH 인증 성공','xen03 Xen 관리 인증'],['OS/자원','세 VM Rocky 9.6, 5 vCPU, 18 GiB, 300 GiB','xen03 SR 여유·CPU·메모리'],['서비스','서비스 이름과 포트 일부 확인','각 서비스의 정확한 연결 상대'],['데이터','/data 사용량 확인','DB·ES·Solr·Redis·Qdrant 실제 데이터 위치·복구량'],['업무 테스트','시뮬레이터 존재 가능성만 문서에 있음','프로그램명·실행 명령·성공 기준']], [30*mm,70*mm,72*mm]),
    P('모르는 것을 추측해서 채우는 것은 실무에서 위험합니다. 좋은 개발자는 “확인되지 않음”이라고 표시하고, 어떤 조회로 확인할지까지 적습니다.'),
    P('11. 이 문서를 읽은 뒤 스스로 설명할 수 있어야 하는 것', 'H1K'),
    P('① 호스트와 VM의 차이 ② pool과 SR의 차이 ③ 서비스·프로세스·포트의 차이 ④ Redis·Elasticsearch·Solr·ZooKeeper·MariaDB·Qdrant의 역할 ⑤ IP·port·방화벽·설정파일의 연결 ⑥ 왜 데이터를 단순 복사하면 안 되는지 ⑦ 101·102·103에 실제로 어떤 서비스가 떠 있는지 ⑧ 결과를 보고도 모르는 것은 “확인 필요”라고 말하는 습관.'),
    P('뒤에 이어지는 원본 가이드 1~13페이지에는 Linux 명령어를 읽는 법, Redis·Elasticsearch·Solr·ZooKeeper의 기본 개념, 환경변수·hosts·방화벽·ulimit 등 상세 설명이 그대로 포함되어 있습니다. 먼저 이 앞부분으로 큰 개념을 잡고, 그 다음 원본 본문을 읽으면 훨씬 이해하기 쉽습니다.', 'WarnK'),
]

appendix = TMP
doc = BaseDocTemplate(str(appendix), pagesize=A4, leftMargin=16*mm, rightMargin=16*mm, topMargin=15*mm, bottomMargin=17*mm, title='이관에 필요한 이론과 기초지식 - 초보자 해설')
doc.addPageTemplates([PageTemplate(id='main', frames=Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height), onPage=footer)])
doc.build(story)

src = PdfReader(str(SOURCE)); add = PdfReader(str(appendix)); writer = PdfWriter()
for page in add.pages: writer.add_page(page)
for n in range(1, 14): writer.add_page(src.pages[n-1])
with OUT.open('wb') as f: writer.write(f)
print(OUT)
