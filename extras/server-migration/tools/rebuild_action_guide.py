from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Preformatted, Table, TableStyle, PageBreak
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'C:\Users\c\Downloads\신입개발자_리눅스_서버_OS이관_초보자용_실전가이드.pdf')
OUT = ROOT / 'output' / 'pdf' / '03_실제_이관_행동방법과_명령어_해설.pdf'
TMP = ROOT / 'tmp' / 'pdfs' / 'action_appendix.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True); TMP.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Malgun', r'C:\Windows\Fonts\malgun.ttf'))
pdfmetrics.registerFont(TTFont('Malgun-Bold', r'C:\Windows\Fonts\malgunbd.ttf'))
ss = getSampleStyleSheet()
ss.add(ParagraphStyle(name='TitleK', parent=ss['Title'], fontName='Malgun-Bold', fontSize=20, leading=27, alignment=TA_CENTER, textColor=colors.HexColor('#143B5D'), spaceAfter=9))
ss.add(ParagraphStyle(name='SubK', parent=ss['Normal'], fontName='Malgun', fontSize=9.8, leading=15, alignment=TA_CENTER, textColor=colors.HexColor('#52606D'), spaceAfter=12))
ss.add(ParagraphStyle(name='H1K', parent=ss['Heading1'], fontName='Malgun-Bold', fontSize=14.3, leading=20, textColor=colors.HexColor('#143B5D'), spaceBefore=7, spaceAfter=6))
ss.add(ParagraphStyle(name='H2K', parent=ss['Heading2'], fontName='Malgun-Bold', fontSize=10.8, leading=15, textColor=colors.HexColor('#1F5F86'), spaceBefore=5, spaceAfter=4))
ss.add(ParagraphStyle(name='BodyK', parent=ss['BodyText'], fontName='Malgun', fontSize=8.4, leading=12.1, spaceAfter=4))
ss.add(ParagraphStyle(name='SmallK', parent=ss['BodyText'], fontName='Malgun', fontSize=7.4, leading=10.2, textColor=colors.HexColor('#5A6573'), spaceAfter=4))
ss.add(ParagraphStyle(name='WarnK', parent=ss['BodyText'], fontName='Malgun-Bold', fontSize=8.4, leading=12, backColor=colors.HexColor('#FFF4D6'), borderColor=colors.HexColor('#E8B94A'), borderWidth=.6, borderPadding=6, spaceAfter=6))
ss.add(ParagraphStyle(name='CodeK', parent=ss['Code'], fontName='Malgun', fontSize=6.9, leading=8.6, leftIndent=6, borderColor=colors.HexColor('#D9E2EC'), borderWidth=.5, borderPadding=5, backColor=colors.HexColor('#F6F8FA'), spaceAfter=6))

def P(x, st='BodyK'): return Paragraph(x, ss[st])
def C(x): return Preformatted(x.strip(), ss['CodeK'])
def T(rows, widths):
    t=Table(rows,colWidths=widths,repeatRows=1)
    t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,0),'Malgun-Bold'),('FONTNAME',(0,1),(-1,-1),'Malgun'),('FONTSIZE',(0,0),(-1,-1),7.1),('LEADING',(0,0),(-1,-1),9.5),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#DCEAF4')),('TEXTCOLOR',(0,0),(-1,0),colors.HexColor('#143B5D')),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#B8C7D3')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),3),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
    return t
def footer(canvas, doc):
    canvas.saveState(); canvas.setFont('Malgun',7); canvas.setFillColor(colors.HexColor('#73808C')); canvas.drawString(16*mm,10*mm,'3번 실제 행동방법 | 조회·검증·이관 명령 해설'); canvas.drawRightString(194*mm,10*mm,str(doc.page)); canvas.restoreState()

story=[
    P('3번 문서: 실제 이관 행동방법과 명령어 해설','TitleK'),
    P('각 단계에서 “내가 지금 무엇을 하는지”를 먼저 설명하고, 명령어·정상 결과·다음 단계까지 연결하는 실습용 문서','SubK'),
    P('이 문서는 실행 순서를 설명하지만, 변경 명령은 승인 전 실행하지 않습니다. 현재까지 실제로 한 일은 SSH 접속과 조회뿐이며, VM 중지·복제·이동·IP 변경·서비스 재시작은 아직 하지 않았습니다.','WarnK'),
    P('1. 지금 내가 하고 있는 일은 무엇인가?','H1K'),
    P('현재 단계는 “이관 실행”이 아니라 “이관 전 사전 조사”입니다. 먼저 원본 세 VM을 사진 찍듯 기록합니다. 이 사진이 있어야 나중에 새 VM이 원본과 무엇이 다른지 비교할 수 있습니다.'),
    T([['단계','지금 하는 일','변경 여부'],['0 신원 확인','어느 서버·어느 사용자로 들어왔는지 확인','조회'],['1 현재 조사','OS·CPU·RAM·디스크·서비스·포트·설정 위치 기록','조회'],['2 연결 조사','Redis·ES·Solr·ZK·DB·Qdrant의 상대 주소 확인','조회'],['3 Xen 확인','pool·SR·VM UUID·destination 자원 확인','조회'],['4 방식 선택','live migration 또는 XVA 또는 재구축 결정','계획'],['5 이관','승인 후 VM을 복사·이동','변경'],['6 신규 부팅','임시 IP·격리망에서 새 VM 확인','변경/조회'],['7 제품 검증','서비스·API·클러스터·데이터·시뮬레이터 확인','테스트'],['8 전환','승인 후 운영 주소를 새 VM으로 전환','변경']], [25*mm,107*mm,29*mm]),
    P('이 문서에서 [조회]는 서버 상태를 읽기만 하는 명령, [변경]은 서버나 VM의 상태를 바꾸는 명령입니다. 명령어를 실행하기 전에 반드시 대상 서버와 변경 여부를 확인합니다.'),
    P('2. 원본 VM에 안전하게 접속하기 [조회]','H1K'),
    C('ssh -i $HOME\\.ssh\\xen-tc-admin_rsa admin@192.168.1.101\nhostname\nid -un\ncat /etc/os-release'),
    P('첫 줄은 SSH로 원격 VM에 들어가는 명령입니다. -i는 개인키 위치, admin은 사용자, 마지막 주소는 접속할 VM입니다. hostname은 내가 실제로 어느 VM에 들어왔는지, id -un은 권한 주체가 누구인지, os-release는 OS 버전을 확인합니다.'),
    P('세 VM에 접속할 때는 주소만 바꿉니다. 이번에 실제 접속한 결과는 .101=xen02.01.tc.kr, .102=xen02.02.tc.kr, .103=xen02.03.tc.kr이며 모두 Rocky Linux 9.6이었습니다.'),
    C('ssh -i $HOME\\.ssh\\xen-tc-admin_rsa admin@192.168.1.102\nssh -i $HOME\\.ssh\\xen-tc-admin_rsa admin@192.168.1.103'),
    PageBreak(),
    P('3. 자원과 디스크를 조사하기 [조회]','H1K'),
    C('nproc\nfree -h\nlsblk -f\ndf -hT\nsudo du -xhd1 /data 2>/dev/null | sort -h'),
    T([['명령','무엇을 보여주나','왜 이관 전에 보나'],['nproc','CPU 개수','새 VM vCPU를 맞출 기준'],['free -h','RAM total/used/available','새 호스트 자원과 기동 가능성'],['lsblk -f','디스크·파일시스템·UUID','가상 디스크와 마운트 누락 방지'],['df -hT','파티션 전체·사용·여유','SR·백업·/data 공간 계산'],['du -xhd1 /data','/data 하위별 실제 용량','어떤 데이터가 큰지 파악']], [30*mm,66*mm,65*mm]),
    P('실제 확인 결과 세 VM은 모두 5 vCPU, 약 18GiB RAM, 300GiB 디스크였고 /data 파티션은 약 194GiB였습니다. 그러나 xen03의 SR 여유공간은 아직 Xen 관리자 인증이 없어 확인하지 못했습니다.'),
    P('4. 어떤 서비스가 실행 중인지 확인하기 [조회]','H1K'),
    C('systemctl list-units --type=service --state=running --no-pager\nsystemctl status NAME --no-pager\nps auxf\nsudo ss -lntup\njournalctl -u NAME -n 100 --no-pager'),
    P('systemctl 목록은 자동 관리되는 서비스 이름, status는 한 서비스의 현재 상태, ps는 실제 프로세스, ss는 열려 있는 포트와 PID, journalctl은 서비스 로그를 보여줍니다. 다섯 명령을 같이 보는 이유는 “서비스 등록은 됐지만 프로세스가 없음”, “프로세스는 있지만 포트가 다름”, “포트는 열렸지만 로그에 오류가 있음”을 구분하기 위해서입니다.'),
    P('실제로 관찰된 서비스 구성','H2K'),
    T([['VM','실행 중인 주요 서비스','대표 포트'],['101','Qdrant·Elasticsearch 7.8·Solr 7.6·ZooKeeper 3.6.1·Redis 5.0.8·MariaDB 10.6.7·MaxScale·HAProxy·Node/Kibana','80·2181·3306·6333~6335·8983·9200/9300'],['102','Elasticsearch·Solr·ZooKeeper·Redis·MariaDB·Docker proxy','2181·3306~3307·5432·8983·9200/9300'],['103','Elasticsearch·Solr·ZooKeeper·Redis·MariaDB·Docker proxy','2181·5000·8983·9200/9300']], [30*mm,98*mm,33*mm]),
    P('여기까지가 현재 내가 하는 “서버 읽기”입니다. 아직 아무 서비스도 재시작하지 않았고, 파일도 수정하지 않았습니다.','WarnK'),
    PageBreak(),
    P('5. 서비스 연결 주소를 찾기 [조회]','H1K'),
    C('systemctl cat NAME\n# ExecStart, EnvironmentFile, WorkingDirectory를 찾는다\nsudo grep -RniE "redis|elastic|solr|zookeeper|zk|qdrant|maria|192\\.168\\.1\\." /etc /opt /data 2>/dev/null | head -200\ncat /etc/hosts\nip addr\nip route\nsudo firewall-cmd --list-all\ngetenforce'),
    P('systemctl cat은 서비스가 시작될 때 읽는 설정 위치를 찾습니다. grep은 설정파일 안에서 제품명·IP·hostname·포트가 어디에 쓰였는지 찾습니다. /etc/hosts는 이름을 IP로 바꾸는 표, ip addr는 현재 주소, ip route는 다른 서버로 가는 길, firewall-cmd는 방화벽 정책, getenforce는 SELinux 상태입니다.'),
    P('grep 결과에는 토큰·비밀번호·개인정보가 포함될 수 있으므로 팀장님이나 외부에 공유할 때는 값을 마스킹합니다. 검색 명령은 읽기지만 결과를 공유하는 것은 보안 문제가 될 수 있습니다.'),
    P('6. 연결을 네 단계로 나누어 이해하기','H1K'),
    T([['질문','확인','정상이면'],['1 주소가 맞나?','ip addr·/etc/hosts·설정파일','상대 VM의 올바른 IP/hostname'],['2 프로그램이 떠 있나?','systemctl·ps','예상 서비스·프로세스 존재'],['3 문이 열렸나?','ss -lntup','필요 포트 LISTEN'],['4 실제 대화하나?','nc -vz·curl·제품 health API','응답·클러스터·업무 결과']], [40*mm,66*mm,55*mm]),
    P('예를 들어 “Solr와 ZooKeeper를 연결한다”는 것은 Solr 설정에 ZK 주소를 넣는 것만 뜻하지 않습니다. Solr가 ZK의 2181 포트로 갈 수 있어야 하고, 방화벽이 통과시켜야 하며, ZK가 실제로 응답해야 합니다. 마지막으로 Solr collection 상태까지 확인해야 연결이 끝난 것입니다.'),
    P('7. xen03의 Xen 관리 정보를 확인하기 [조회 - 관리자 인증 필요]','H1K'),
    C('xe host-list params=name-label,uuid,memory-total,memory-free\nxe vm-list is-control-domain=false params=name-label,uuid,power-state,VCPUs-max,memory-static-max\nxe sr-list params=name-label,uuid,physical-size,physical-utilisation,type\nxe network-list params=name-label,uuid,bridge-label'),
    P('host-list는 호스트와 메모리, vm-list는 VM UUID·전원상태·vCPU·메모리, sr-list는 VM 디스크 창고와 여유공간, network-list는 가상 네트워크를 보여줍니다. 이 정보가 있어야 목적지 호스트·SR·network를 잘못 선택하지 않습니다.'),
    P('현재 xen03에 SSH로 들어가는 것은 되었지만, admin 계정으로 xe를 실행하면 별도 인증이 요구되었습니다. 따라서 이 단계는 Xen 관리자 계정이나 XenCenter에서 확인해야 하며, 확인 전에는 이동 명령을 실행하지 않습니다.','WarnK'),
    PageBreak(),
    P('8. 복사·이동 방식 결정하기','H1K'),
    P('여기서 내가 결정하는 것은 “새로 설치할지, 기존 VM을 옮길지”입니다. 결정 기준은 속도가 아니라 원본을 안전하게 되돌릴 수 있는지와 xen03의 구조입니다.'),
    T([['확인된 조건','검토할 방법','내가 해야 할 일'],['같은 pool·공유 SR·CPU 호환','live migration','pool/SR/network·롤백 확인 후 작은 VM으로 시험'],['별도 pool 또는 비공유 SR','XVA export/import','VM 종료 승인·XVA 저장공간·checksum·전송시간 계산'],['VM은 만들 수 있지만 제품 데이터 복구가 중요','새 VM + 제품별 backup/restore','Rocky·서비스 설치·설정·데이터 복구 계획'],['조건이 아직 모름','아무 변경도 하지 않음','Xen 관리자에게 pool/SR 정보 요청']], [45*mm,55*mm,61*mm]),
    P('A. live migration 명령 형태 [변경 - 승인 필요]','H2K'),
    C('xe vm-migrate uuid=<SOURCE_VM_UUID> host-uuid=<DEST_HOST_UUID> live=true'),
    P('이 명령은 지정한 VM을 지정한 호스트로 이동시키는 관리 명령입니다. uuid가 VM을 고르고 host-uuid가 목적지 호스트를 고릅니다. live=true는 실행 중인 상태에서 이동을 시도한다는 뜻이지만, 공유 SR·CPU·네트워크 조건이 맞아야 합니다. 잘못된 UUID를 넣으면 다른 VM을 대상으로 할 수 있습니다.'),
    P('B. XVA export/import 명령 형태 [변경 - 승인 필요]','H2K'),
    C('xe vm-export vm=<SOURCE_VM_UUID> filename=/backup/xen02-01.xva\nsha256sum /backup/xen02-01.xva\nxe vm-import filename=/backup/xen02-01.xva sr-uuid=<DEST_SR_UUID> preserve=false'),
    P('vm-export는 VM과 가상 디스크를 XVA 파일로 내보내고, sha256sum은 파일이 전송 중 바뀌지 않았는지 확인하며, vm-import는 목적지 SR로 가져옵니다. VM 디스크 크기가 크면 시간이 오래 걸리므로 공간·전송시간을 미리 계산합니다. 원본과 신규 VM을 같은 IP/MAC으로 동시에 연결하지 않습니다.'),
    P('이 단계에서 내가 하고 있는 것은 “명령 실행”이 아니라 “어떤 명령을 써도 되는 조건인지 판단”하는 것입니다.','WarnK'),
    PageBreak(),
    P('9. 신규 VM 첫 부팅과 IP 충돌 방지 [변경/조회]','H1K'),
    P('신규 VM을 처음 켤 때는 격리 네트워크나 임시 IP를 사용합니다. 원본과 신규를 같은 운영 IP로 동시에 켜면 네트워크가 어느 VM으로 보낼지 혼란스럽고, 클러스터가 서로를 잘못 인식하거나 데이터가 양쪽에 나뉠 수 있습니다.'),
    C('hostname\nip addr\nip route\ncat /etc/hosts\ndf -hT\nsystemctl --failed --no-pager\nsudo ss -lntup'),
    P('첫 부팅 확인 순서는 hostname·IP·경로 → 디스크 → failed 서비스 → 포트입니다. 모든 값이 예상과 맞기 전에는 운영 IP와 DNS/VIP를 바꾸지 않습니다.'),
    P('10. 제품별 연결 테스트 [조회/테스트]','H1K'),
    C('Redis\nredis-cli -h <REDIS_IP> -p 7000 ping\nredis-cli -h <REDIS_IP> -p 7000 cluster info\nredis-cli -h <REDIS_IP> -p 7000 cluster nodes\n\nElasticsearch\ncurl -sS http://<ES_IP>:9200/\ncurl -sS http://<ES_IP>:9200/_cluster/health?pretty\ncurl -sS http://<ES_IP>:9200/_cat/nodes?v\n\nSolr\ncurl -sS http://<SOLR_IP>:8983/solr/admin/info/system?wt=json\ncurl -sS http://<SOLR_IP>:8983/solr/admin/collections?action=CLUSTERSTATUS&wt=json\n\nZooKeeper\necho ruok | nc -w 3 <ZK_IP> 2181\nnc -vz <ZK_IP> 2181'),
    T([['결과','뜻','다음 판단'],['PONG','Redis 한 노드가 응답','cluster info/nodes로 확대 확인'],['green/yellow/red','ES 클러스터 상태','노드·샤드·로그 확인'],['JSON 응답','Solr API 응답','collection·ZK 연결 확인'],['imok 등 응답','ZK 프로세스 생존 가능성','quorum·server 목록 확인'],['succeeded','TCP 문까지 연결','제품 인증·API·클러스터 별도 확인'],['timeout','길 또는 방화벽 문제 가능','IP·route·firewall 순서로 역추적'],['refused','목적지에 갔지만 문을 안 엶','서비스·포트·bind 확인']], [31*mm,68*mm,62*mm]),
    P('MariaDB는 인증정보를 명령줄에 적지 않고 비밀번호 프롬프트를 사용합니다. 예: mysqladmin ping -h <DB_IP> -P 3306 -u <USER> -p. Qdrant는 curl -sS http://<QDRANT_IP>:6333/collections 형태로 collection 목록을 확인한 뒤 실제 검색 결과까지 봅니다.'),
    PageBreak(),
    P('11. 통합 테스트와 시뮬레이터 [테스트]','H1K'),
    P('제품 하나씩 응답한다고 해서 업무 전체가 성공한 것은 아닙니다. 마지막에는 실제 업무 흐름을 시뮬레이터로 흘려야 합니다. 현재 제공된 자료에는 시뮬레이터의 정확한 프로그램명·경로·실행 옵션·성공 기준이 없으므로, 이 값을 먼저 담당자에게 받아야 합니다.'),
    T([['확보할 정보','예시 질문','기록할 결과'],['프로그램명·경로','어떤 파일/컨테이너를 실행하나?','실행 명령'],['환경변수·설정','Gateway·DB·검색 주소는 어디에 있나?','대상 IP·PORT'],['입력 데이터','어떤 테스트 케이스를 넣나?','케이스 ID'],['성공 기준','응답·로그·업무 결과가 무엇인가?','PASS 기준'],['실패 증적','어떤 로그를 저장하나?','로그 경로·시간']], [43*mm,78*mm,40*mm]),
    C('통합 테스트 예시 흐름\n시뮬레이터 → Gateway/Engine\n                  ├─ Redis 세션·큐\n                  ├─ MariaDB 업무 데이터\n                  ├─ Elasticsearch/Solr 검색\n                  └─ Qdrant 벡터 검색 → 최종 업무 응답'),
    P('12. 서비스 기동·중지 명령은 마지막에만 [변경 - 승인 필요]','H1K'),
    C('sudo systemctl start NAME\nsudo systemctl enable NAME\nsudo systemctl restart NAME\nsudo systemctl stop NAME'),
    P('start는 지금 시작, enable은 부팅 때 자동 시작, restart는 중단 후 재시작, stop은 중단입니다. 신규 VM에서만, 승인된 순서로, 한 서비스씩 실행하고 매번 status·port·log를 확인합니다. 운영 원본에서 먼저 restart/stop하지 않습니다.'),
    P('13. 초보자용 실제 행동 체크리스트','H1K'),
    T([['순서','내가 할 행동','완료 표시'],['1','SSH 접속 후 hostname/id/OS 확인','□'],['2','CPU/RAM/disk/data 사용량 기록','□'],['3','실행 서비스·프로세스·포트 기록','□'],['4','systemd 설정·환경변수·hosts·IP 주소 검색','□'],['5','서비스별 상대 IP:PORT 연결표 작성','□'],['6','Xen 관리자에게 pool/SR/network/UUID 확인','□'],['7','이관 방식과 백업·롤백 승인','□'],['8','신규 VM을 임시 IP/격리망에서 기동','□'],['9','Redis·ES·Solr·ZK·DB·Qdrant 검증','□'],['10','시뮬레이터 통합 테스트','□'],['11','담당자 승인 후 운영 전환','□'],['12','전환 후 로그·자원·오류 모니터링','□']], [20*mm,127*mm,14*mm]),
    P('이 체크리스트의 1~6번이 현재 우리가 하고 있는 분석 단계입니다. 7번부터는 승인된 실제 이관 작업이고, 11번은 가장 마지막 운영 전환입니다.','WarnK'),
]

doc=BaseDocTemplate(str(TMP),pagesize=A4,leftMargin=16*mm,rightMargin=16*mm,topMargin=15*mm,bottomMargin=17*mm,title='실제 이관 행동방법과 명령어 해설',author='Codex')
doc.addPageTemplates([PageTemplate(id='main',frames=Frame(doc.leftMargin,doc.bottomMargin,doc.width,doc.height),onPage=footer)])
doc.build(story)

src=PdfReader(str(SOURCE)); add=PdfReader(str(TMP)); writer=PdfWriter()
for p in add.pages: writer.add_page(p)
for n in [3,4,5,6,7,19]: writer.add_page(src.pages[n-1])
with OUT.open('wb') as f: writer.write(f)
print(OUT)
