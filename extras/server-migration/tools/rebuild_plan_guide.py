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
OUT = ROOT / 'output' / 'pdf' / '02_xen02에서_xen03으로_전체이관_계획.pdf'
TMP = ROOT / 'tmp' / 'pdfs' / 'plan_appendix.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True); TMP.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Malgun', r'C:\Windows\Fonts\malgun.ttf'))
pdfmetrics.registerFont(TTFont('Malgun-Bold', r'C:\Windows\Fonts\malgunbd.ttf'))
ss = getSampleStyleSheet()
ss.add(ParagraphStyle(name='TitleK', parent=ss['Title'], fontName='Malgun-Bold', fontSize=20, leading=27, alignment=TA_CENTER, textColor=colors.HexColor('#143B5D'), spaceAfter=10))
ss.add(ParagraphStyle(name='SubK', parent=ss['Normal'], fontName='Malgun', fontSize=10, leading=15, alignment=TA_CENTER, textColor=colors.HexColor('#52606D'), spaceAfter=12))
ss.add(ParagraphStyle(name='H1K', parent=ss['Heading1'], fontName='Malgun-Bold', fontSize=14.5, leading=20, textColor=colors.HexColor('#143B5D'), spaceBefore=7, spaceAfter=7))
ss.add(ParagraphStyle(name='H2K', parent=ss['Heading2'], fontName='Malgun-Bold', fontSize=11, leading=16, textColor=colors.HexColor('#1F5F86'), spaceBefore=5, spaceAfter=4))
ss.add(ParagraphStyle(name='BodyK', parent=ss['BodyText'], fontName='Malgun', fontSize=8.6, leading=12.7, spaceAfter=4))
ss.add(ParagraphStyle(name='SmallK', parent=ss['BodyText'], fontName='Malgun', fontSize=7.5, leading=10.5, textColor=colors.HexColor('#5A6573'), spaceAfter=4))
ss.add(ParagraphStyle(name='WarnK', parent=ss['BodyText'], fontName='Malgun-Bold', fontSize=8.6, leading=12.5, backColor=colors.HexColor('#FFF4D6'), borderColor=colors.HexColor('#E8B94A'), borderWidth=.6, borderPadding=6, spaceAfter=6))
ss.add(ParagraphStyle(name='CodeK', parent=ss['Code'], fontName='Malgun', fontSize=7, leading=9, leftIndent=6, borderColor=colors.HexColor('#D9E2EC'), borderWidth=.5, borderPadding=5, backColor=colors.HexColor('#F6F8FA'), spaceAfter=6))

def P(x, st='BodyK'): return Paragraph(x, ss[st])
def C(x): return Preformatted(x.strip(), ss['CodeK'])
def T(rows, widths):
    t=Table(rows,colWidths=widths,repeatRows=1)
    t.setStyle(TableStyle([('FONTNAME',(0,0),(-1,0),'Malgun-Bold'),('FONTNAME',(0,1),(-1,-1),'Malgun'),('FONTSIZE',(0,0),(-1,-1),7.2),('LEADING',(0,0),(-1,-1),9.7),('BACKGROUND',(0,0),(-1,0),colors.HexColor('#DCEAF4')),('TEXTCOLOR',(0,0),(-1,0),colors.HexColor('#143B5D')),('GRID',(0,0),(-1,-1),.35,colors.HexColor('#B8C7D3')),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),3),('RIGHTPADDING',(0,0),(-1,-1),3),('TOPPADDING',(0,0),(-1,-1),3),('BOTTOMPADDING',(0,0),(-1,-1),3)]))
    return t
def footer(canvas, doc):
    canvas.saveState(); canvas.setFont('Malgun',7); canvas.setFillColor(colors.HexColor('#73808C')); canvas.drawString(16*mm,10*mm,'2번 전체 이관 계획 | 팀장님 보고용 + 상세 계획'); canvas.drawRightString(194*mm,10*mm,str(doc.page)); canvas.restoreState()

story=[
    P('2번 문서: xen02에서 xen03으로 전체 이관 계획','TitleK'),
    P('맨 앞은 팀장님께 설명하는 계획, 뒤는 실제 작업을 설계하는 상세 계획','SubK'),
    P('이 문서는 “무엇을 언제 어떤 순서로 옮길지”를 정하는 계획서입니다. 실제 명령어의 문법과 출력 해석은 3번 문서를 사용합니다. 이 문서의 계획이 승인되기 전에는 VM 중지·이관·IP 변경을 하지 않습니다.','WarnK'),
    P('1. 팀장님께 먼저 말씀드릴 최종 계획','H1K'),
    P('“이번 작업의 대상은 tc-xen02(192.168.1.100)에서 실행 중인 VM 3대, 즉 192.168.1.101·102·103입니다. 이 세 VM을 tc-xen03(192.168.1.120)에서 같은 역할로 재현하겠습니다. 단순히 VM 파일만 복사하지 않고, 먼저 현재 서비스·데이터·연결관계를 조사한 뒤 xen03의 pool·SR·자원·네트워크를 확인하겠습니다. 백업과 복구 가능성을 확보하고, VM을 한 대씩 옮겨 임시 주소에서 Redis·Elasticsearch·Solr·ZooKeeper·MariaDB·Qdrant와 업무 시뮬레이터를 순서대로 검증하겠습니다. 테스트가 모두 통과하고 담당자 승인을 받은 뒤에만 운영 IP/DNS/VIP를 전환합니다. 문제가 생기면 원본 VM을 보존한 상태에서 신규 VM만 격리하고 원래 환경으로 되돌립니다.”'),
    P('이번 작업은 새로 설치가 아니라 VM 복사·이동을 우선합니다','H1K'),
    C('xen02 호스트\n ├─ VM 101\n ├─ VM 102\n └─ VM 103\n        │\n        └─ VM 자체를 xen03으로 이동/복제'),
    P('현재 목표는 Rocky Linux를 새로 설치하는 OS 재구축이 아니라, 기존 VM 3대를 xen03에서 다시 실행하고 정상 연결을 검증하는 VM 이관입니다. VM을 이동하면 보통 Rocky Linux, 설치된 Java·Python·Docker, Redis·Elasticsearch·Solr·ZooKeeper·MariaDB·Qdrant, 설정파일, 서비스 등록, 가상 디스크, /data 데이터가 함께 따라갑니다.'),
    P('다만 복사했다고 끝나는 것은 아닙니다. 신규 VM을 임시 IP로 부팅하고, IP·hostname 충돌을 막은 뒤 Redis → Elasticsearch → ZooKeeper → Solr → MariaDB·Qdrant → 시뮬레이터 순서로 검증하고, 마지막에만 운영 전환합니다.'),
    T([['구분','뜻','이번 계획'],['VM 이관','기존 VM 자체를 다른 Xen 호스트에서 실행','우선 검토'],['OS 재구축','새 VM에 Rocky Linux와 서비스를 새로 설치','복제 불가·재구성이 필요할 때 대안'],['운영 전환','운영 IP/DNS/VIP와 실제 요청을 신규로 변경','검증·승인 후 마지막 단계']], [34*mm,73*mm,57*mm]),
    P('새로 설치가 가능한지는 xen03 새 VM 생성 권한, Xen 관리자 권한, CPU·RAM·SR 공간, Rocky 설치 ISO, sudo 권한, 서비스 설치파일·버전, 데이터 백업·복구 방법이 모두 준비되어야 판단할 수 있습니다. 현재는 admin SSH 접속은 확인했지만, xen03에서 xe 관리 명령을 실행할 때 별도 인증이 필요했으므로 VM 생성·이동 권한은 아직 확인 전입니다.','WarnK'),
    P('만약 새로 설치 방식으로 전환해야 한다면 작업은 다음처럼 커집니다. 이것은 현재의 1순위가 아니라 복제·이동이 불가능할 때의 대안입니다.','H2K'),
    C('새 VM 생성\n→ Rocky Linux 설치\n→ 디스크·네트워크 설정\n→ Java·Python·Docker 설치\n→ Redis 설치\n→ Elasticsearch 설치\n→ ZooKeeper 설치\n→ Solr 설치\n→ MariaDB 설치\n→ Qdrant 설치\n→ 설정파일 작성\n→ 데이터 복구\n→ 클러스터 연결\n→ 시뮬레이터 테스트'),
    P('새로 설치 방식은 할 수는 있지만 설치할 것이 많고, 버전·권한·설정·데이터 복구를 모두 직접 맞춰야 합니다. 그래서 첫 이관은 VM 복제·이동으로 진행하고, 필요할 때만 OS 재구축을 별도 프로젝트로 잡는 것이 현실적입니다.'),
    P('2. 계획을 한 장으로 보기','H1K'),
    C('조사      →  설계      →  백업      →  이관      →  연결/검증      →  승인 전환      →  모니터링\n(현재를    (어디에    (되돌릴    (한 대씩  (서비스와     (운영 주소  (문제 감시)\n사진 찍기) 놓을지)   지점)     옮기기)  클러스터)   변경)\n\n원본 xen02                                      신규 xen03\nVM101 ───────── 복제/이동 ───────────────────> 새 VM101 역할\nVM102 ───────── 복제/이동 ───────────────────> 새 VM102 역할\nVM103 ───────── 복제/이동 ───────────────────> 새 VM103 역할\n  │                                                 │\n  └─ 검증이 끝날 때까지 보존                         └─ 임시 IP/격리망에서 시험'),
    T([['계획 원칙','쉽게 말하면'],['원본 보존','새 환경이 성공할 때까지 기존 VM을 지우거나 함부로 바꾸지 않는다.'],['한 대씩','세 대를 동시에 바꾸지 않아야 문제 원인을 찾고 되돌리기 쉽다.'],['임시 주소','원본과 신규가 같은 IP를 동시에 사용하지 않게 한다.'],['서비스별 검증','VM이 켜졌다고 성공이 아니라 서비스·포트·클러스터·업무까지 확인한다.'],['승인 후 전환','운영 IP/DNS/VIP 변경은 마지막 승인 뒤에만 한다.']], [37*mm,119*mm]),
    P('3. 현재 확인된 출발점','H1K'),
    T([['VM','실제 관찰 자원','실제 실행 서비스'],['101 / 192.168.1.101\nxen02.01.tc.kr','Rocky 9.6 / 5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용','Qdrant, ES 7.8, Solr 7.6, ZK 3.6.1, Redis 5.0.8, MariaDB 10.6.7, MaxScale, HAProxy, Node/Kibana'],['102 / 192.168.1.102\nxen02.02.tc.kr','Rocky 9.6 / 5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용','ES 7.8, Solr 7.6, ZK 3.6.1, Redis 5.0.8, MariaDB, Docker proxy'],['103 / 192.168.1.103\nxen02.03.tc.kr','Rocky 9.6 / 5 vCPU / 18 GiB / 300 GiB\n/data 194 GiB 중 1.4 GiB 사용','ES 7.8, Solr 7.6, ZK 3.6.1, Redis 5.0.8, MariaDB, Docker proxy']], [34*mm,54*mm,78*mm]),
    P('현재 확인된 것은 “VM 안에 어떤 서비스 프로세스가 떠 있는가”입니다. 각 서비스가 어느 VM의 어느 IP:PORT를 실제로 호출하는지, xen03의 pool/SR 상태가 어떤지는 추가 승인·관리자 조회가 필요합니다.','WarnK'),
    PageBreak(),
    P('4. 이관 작업의 단계별 계획','H1K'),
    T([['단계','목표','완료 조건','산출물'],['0 승인','작업을 해도 되는 시간과 범위 확정','팀장·서비스 담당·롤백 담당 승인','작업 승인 기록'],['1 As-Is 조사','현재 구조를 틀리지 않게 기록','VM·서비스·데이터·연결 목록 작성','인벤토리'],['2 To-Be 설계','xen03에 어떻게 놓을지 결정','pool/SR/network/자원·임시 IP 확정','목표 구성표'],['3 백업','실패해도 돌아갈 지점 확보','VM 백업 및 제품별 데이터 복구점 확인','백업·checksum·복구 테스트'],['4 파일/VM 이관','신규 VM을 만들고 원본과 분리','새 VM 부팅·디스크·NIC 확인','신규 VM'],['5 구성','새 주소와 서비스 설정 반영','hostname·hosts·env·systemd·방화벽 점검','기동 가능한 환경'],['6 연결 검증','서비스 간 통신과 클러스터 확인','Redis/ES/Solr/ZK/DB/Qdrant 정상','검증 기록'],['7 통합 테스트','실제 업무 흐름 시험','시뮬레이터 성공 기준 충족','테스트 결과'],['8 전환','운영 요청이 새 환경으로 가게 함','승인 후 DNS/VIP/IP 정책 전환','전환 기록'],['9 안정화','전환 후 이상 감시','로그·자원·오류 모니터링','안정화 보고']], [19*mm,43*mm,77*mm,27*mm]),
    P('5. 이관 방식을 결정하는 순서','H1K'),
    P('아직 xen03에서 xe 관리 인증이 되지 않아 아래 세 가지 중 어느 방식을 쓸지는 확정하지 않았습니다. 이것은 계획이 부족해서가 아니라, 잘못된 방식으로 바로 실행하지 않기 위한 의도적인 보류입니다.'),
    T([['조건','우선 검토','장점·주의'],['같은 pool + 공유 SR + CPU 호환','live migration','중단이 적을 수 있음. 네트워크·SR·CPU 조건과 롤백을 먼저 확인.'],['별도 pool 또는 비공유 SR','XVA export/import','VM과 디스크를 묶어 이동. 파일 저장공간·전송시간·종료 승인 필요.'],['VM 복제보다 새 구성 통제가 중요','OS 재구축 + 제품별 복원','설정·버전·데이터를 명확히 관리. 설치·복원 작업량이 큼.']], [50*mm,47*mm,69*mm]),
    P('추천 전략은 “VM 이동 방식”과 “데이터 복원 방식”을 분리하는 혼합형입니다. VM의 OS·가상 디스크는 Xen 방식으로 옮길 수 있어도, MariaDB·Elasticsearch·Solr·Redis·ZooKeeper·Qdrant 데이터는 각 제품의 안전한 백업·복구 방법으로 검증합니다.'),
    P('6. 서비스 연결을 고려한 이관 순서','H1K'),
    C('기반/조정       →       데이터·검색       →       업무 애플리케이션       →       시뮬레이터\nZooKeeper              Redis / MariaDB / ES / Solr / Qdrant        Gateway / Engine        최종 업무흐름\n\n학습용 기본 순서:\n1 ZooKeeper 앙상블 확인\n2 Redis 클러스터 확인\n3 MariaDB·MaxScale 확인\n4 Elasticsearch 노드/샤드 확인\n5 Solr와 ZooKeeper 연결/collection 확인\n6 Qdrant collection 확인\n7 Gateway·Engine·Notebook 확인\n8 시뮬레이터 실행'),
    P('이 순서는 “무조건 start 명령을 이 순서로 치라”는 뜻이 아닙니다. 서비스를 제공하는 쪽을 먼저 확인하고, 실제 사내 운영 매뉴얼의 기동 순서를 우선해야 합니다. 각 서비스가 어느 VM에 있는지와 의존관계가 실제 설정에서 확정되기 전에는 기동 순서를 확정하지 않습니다.'),
    PageBreak(),
    P('7. 제품별 데이터·연결 계획','H1K'),
    T([['제품','옮겨야 하는 것','연결/검증 계획','위험'],['Redis','설정·cluster node 정보·RDB/AOF','7000/7001 접속, cluster info/nodes, 앱의 대상 주소 확인','옛 announce IP·데이터 손실'],['Elasticsearch','버전·설정·index 데이터','9200 API, 9300 노드 통신, cluster health/nodes/shards','버전·discovery·샤드 문제'],['Solr','설정·collection·configset·index','8983 API, ZK_HOST/2181, collection 상태','ZK 경로·클러스터 불일치'],['ZooKeeper','myid·server 목록·dataDir 계획','2181 응답, 2888/3888 앙상블·quorum','잘못된 ensemble·데이터 손상'],['MariaDB','DB·사용자·권한·replication','DB 포트·MaxScale backend·데이터 건수','쓰기 중 데이터 불일치'],['Qdrant','collection·storage/snapshot','6333 등 API·collection·검색 결과','단순 파일 복사·버전 문제']], [26*mm,51*mm,61*mm,28*mm]),
    P('8. VM별 검증 우선순위','H1K'),
    P('VM03부터 복제본을 검증하는 방안을 제안합니다. 103은 실제 관찰상 검색·클러스터·DB·Docker proxy가 있으므로 연결 검증을 충분히 연습할 수 있고, 101은 Qdrant·HAProxy·MaxScale·Kibana까지 있어 가장 복잡하므로 마지막에 다루는 것이 안전합니다. 단 실제 서비스 제공자 관계가 밝혀지면 그 관계에 맞춰 순서를 조정합니다.'),
    T([['순서','대상','완료 조건'],['1','VM03 / .103','OS·디스크·서비스·ES/Solr/ZK/Redis/MariaDB·연결 확인'],['2','VM02 / .102','ES/Solr/ZK/Redis/MariaDB·Docker proxy 확인'],['3','VM01 / .101','Qdrant·HAProxy·MaxScale·Kibana·검색/DB 연계 확인'],['4','세 VM 통합','시뮬레이터가 실제 업무 흐름을 끝까지 통과']], [24*mm,58*mm,84*mm]),
    P('9. IP·DNS·hosts·VIP 전환 계획','H1K'),
    P('신규 VM을 처음 켤 때는 원본과 다른 임시 IP 또는 격리 네트워크를 사용합니다. 그래야 신규 VM이 원본 VM으로 착각되거나, 두 VM이 같은 주소를 두고 싸우는 일이 없습니다. 검증이 끝난 뒤 운영 전환 시점에만 DNS·hosts·VIP·방화벽 정책을 운영 기준으로 변경합니다.'),
    C('원본 운영 주소  ──(전환 전에는 유지)──> 기존 운영 서비스\n신규 테스트 주소  ──(검증 기간)──────> 새 VM 서비스\n\n승인된 Cut-over 시점:\n1 쓰기/요청 전환 정책 확인\n2 DNS·VIP·hosts 변경\n3 새 VM의 API·클러스터·시뮬레이터 확인\n4 문제 시 승인된 복귀 절차'),
    P('10. 백업과 롤백 계획','H1K'),
    T([['상황','행동','원본 처리'],['복제본 부팅 실패','신규 VM을 격리하고 로그 분석','원본 유지'],['서비스 연결 실패','신규 설정·방화벽·hosts를 점검','원본 유지'],['데이터 복원 실패','복구점 재검증 또는 복원 재시도','원본 데이터 보호'],['통합 테스트 실패','실패한 연결부터 역추적','운영 전환 금지'],['전환 후 장애','승인된 DNS/VIP 복귀와 쓰기 정책 적용','원본을 기준으로 복귀']], [38*mm,84*mm,44*mm]),
    PageBreak(),
    P('11. 승인 게이트와 담당자','H1K'),
    T([['승인 지점','누가 확인?','확인 내용'],['작업 전','팀장·인프라 담당','작업 시간·중단 가능 시간·담당자'],['이관 방식','Xen 관리자','pool·SR·CPU·network·자원'],['백업 완료','서비스 담당·DB 담당','복구 가능·checksum·데이터 기준'],['테스트 완료','개발·서비스 담당','API·클러스터·업무 시뮬레이터'],['운영 전환','팀장·서비스 오너','cut-over·롤백·모니터링 책임']], [37*mm,52*mm,77*mm]),
    P('현재 가장 중요한 미확정 항목은 xen03의 Xen 관리자 인증, pool/SR 상태, 시뮬레이터 실행 명령과 성공 기준입니다. 이 값들이 정해지기 전에는 이관 방식을 확정하거나 변경 명령을 실행하지 않습니다.','WarnK'),
    P('12. 예상 일정 예시','H1K'),
    T([['시점','할 일','완료 산출물'],['D-5~D-3','세 VM As-Is 조사·설정·데이터 위치 파악','인벤토리·연결표'],['D-3~D-2','xen03 pool/SR/network·자원 확인·임시 IP 설계','To-Be 구성표'],['D-2~D-1','백업·복구 가능성 확인·시뮬레이터 준비','복구점·테스트 케이스'],['D-day 1','VM03 복제·구성·검증','검증 결과'],['D-day 2','VM02 복제·구성·검증','검증 결과'],['D-day 3','VM01 복제·구성·검증','검증 결과'],['Cut-over','승인 후 운영 주소 전환','전환·롤백 기록'],['D+1~D+3','오류·자원·로그·업무 모니터링','안정화 보고']], [31*mm,92*mm,43*mm]),
    P('날짜는 실제 작업창과 서비스 중단 가능 시간에 맞춰 조정합니다. 일정에 날짜를 먼저 박기보다, 각 단계의 완료 조건이 충족될 때 다음 단계로 넘어가는 방식이 안전합니다.'),
    P('13. 팀장님 질문에 대한 짧은 답변','H1K'),
    P('“왜 새로 설치하지 않고 복사하나요?” → VM 자체는 빠르게 재현할 수 있기 때문입니다. 하지만 데이터와 설정은 제품별로 검증하므로, 무조건 통째로 복사하지 않습니다.'),
    P('“왜 세 대를 동시에 안 옮기나요?” → 문제가 생겼을 때 원인을 찾기 어렵고, 원본으로 돌아가는 절차가 복잡해집니다. 한 대씩 검증하는 것이 안전합니다.'),
    P('“언제 성공인가요?” → VM 부팅이 아니라 서비스·포트·제품 API·클러스터·데이터·시뮬레이터까지 통과하고 담당자가 승인했을 때입니다.'),
    P('“가장 먼저 할 일은 무엇인가요?” → xen03의 pool/SR/자원과 시뮬레이터의 정확한 실행 기준을 먼저 확인하는 것입니다.'),
    P('팀장님께 말할 최종 문장','H2K'),
    P('“이번에는 OS를 새로 설치하는 재구축보다, 기존 VM을 xen03으로 복제·이동하는 방식을 우선 검토하겠습니다. VM 이관 후 임시 IP에서 서비스와 클러스터 연결을 검증하고, 문제가 없을 때 운영 전환하겠습니다. 새로 설치하는 방식은 복제 방식이 불가능하거나 OS 재구축이 필요한 경우의 별도 대안으로 준비하겠습니다.”'),
    P('뒤에 이어지는 원본 가이드 계획 관련 페이지에는 As-Is → To-Be → 설치 → 설정 → 데이터 → 네트워크 → 테스트 → 운영 전환 → 롤백의 상세 사고순서가 그대로 포함되어 있습니다.','SmallK'),
]

doc=BaseDocTemplate(str(TMP),pagesize=A4,leftMargin=16*mm,rightMargin=16*mm,topMargin=15*mm,bottomMargin=17*mm,title='xen02에서 xen03으로 전체 이관 계획',author='Codex')
doc.addPageTemplates([PageTemplate(id='main',frames=Frame(doc.leftMargin,doc.bottomMargin,doc.width,doc.height),onPage=footer)])
doc.build(story)

src=PdfReader(str(SOURCE)); add=PdfReader(str(TMP)); writer=PdfWriter()
for p in add.pages: writer.add_page(p)
for n in [13,14,15,16,17,18,20]: writer.add_page(src.pages[n-1])
with OUT.open('wb') as f: writer.write(f)
print(OUT)
