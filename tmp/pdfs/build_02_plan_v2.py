from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Table, TableStyle, Preformatted

OUT = Path(r"C:\Users\c\OneDrive\문서\등촌프로젝트\output\pdf\02_xen02에서_tc-xen01으로_전체이관_계획.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
pdfmetrics.registerFont(TTFont("Malgun-Bold", r"C:\Windows\Fonts\malgunbd.ttf"))
pdfmetrics.registerFontFamily("Malgun", normal="Malgun", bold="Malgun-Bold")

NAVY = colors.HexColor("#123A63")
BLUE = colors.HexColor("#1D5F8F")
SKY = colors.HexColor("#EAF4FB")
PALE = colors.HexColor("#F5F8FA")
GREEN = colors.HexColor("#E8F5EC")
YELLOW = colors.HexColor("#FFF6D8")
RED = colors.HexColor("#FCEBEC")
GRAY = colors.HexColor("#5B6670")
DARK = colors.HexColor("#1E2933")
LINE = colors.HexColor("#CCD6DE")

ss = getSampleStyleSheet()
ss.add(ParagraphStyle(name="CoverTitle", fontName="Malgun-Bold", fontSize=23, leading=31, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8*mm))
ss.add(ParagraphStyle(name="CoverSub", fontName="Malgun", fontSize=11.5, leading=18, textColor=GRAY, alignment=TA_CENTER, spaceAfter=5*mm))
ss.add(ParagraphStyle(name="H1K", fontName="Malgun-Bold", fontSize=16.5, leading=23, textColor=NAVY, spaceBefore=3*mm, spaceAfter=4*mm, keepWithNext=True))
ss.add(ParagraphStyle(name="H2K", fontName="Malgun-Bold", fontSize=12.5, leading=18, textColor=BLUE, spaceBefore=3.5*mm, spaceAfter=2.5*mm, keepWithNext=True))
ss.add(ParagraphStyle(name="H3K", fontName="Malgun-Bold", fontSize=10.3, leading=15, textColor=DARK, spaceBefore=2.5*mm, spaceAfter=1.5*mm, keepWithNext=True))
ss.add(ParagraphStyle(name="BodyK", fontName="Malgun", fontSize=9.2, leading=14.8, textColor=DARK, spaceAfter=2.7*mm))
ss.add(ParagraphStyle(name="SmallK", fontName="Malgun", fontSize=8, leading=12, textColor=GRAY, spaceAfter=1.7*mm))
ss.add(ParagraphStyle(name="BulletK", fontName="Malgun", fontSize=9, leading=14.2, leftIndent=5*mm, firstLineIndent=-3.5*mm, textColor=DARK, spaceAfter=1.2*mm))
ss.add(ParagraphStyle(name="QuoteK", fontName="Malgun-Bold", fontSize=10.8, leading=16.5, textColor=NAVY, leftIndent=6*mm, rightIndent=6*mm, spaceBefore=2*mm, spaceAfter=3*mm))
ss.add(ParagraphStyle(name="TableK", fontName="Malgun", fontSize=7.6, leading=10.8, textColor=DARK))
ss.add(ParagraphStyle(name="TableBoldK", fontName="Malgun-Bold", fontSize=7.6, leading=10.8, textColor=DARK))
ss.add(ParagraphStyle(name="CodeK", fontName="Malgun", fontSize=7.6, leading=11, textColor=colors.HexColor("#17324D"), backColor=colors.HexColor("#F3F6F8"), leftIndent=3*mm, rightIndent=3*mm, borderPadding=2.2*mm))

def P(text, style="BodyK"):
    return Paragraph(text, ss[style])

def bullets(items):
    return [Paragraph("- " + x, ss["BulletK"]) for x in items]

def table(headers, rows, widths):
    data = [[P(str(h), "TableBoldK") for h in headers]]
    data += [[P(str(c), "TableK") for c in row] for row in rows]
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("GRID", (0,0), (-1,-1), 0.35, LINE), ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, PALE]),
        ("LEFTPADDING", (0,0), (-1,-1), 2.1*mm), ("RIGHTPADDING", (0,0), (-1,-1), 2.1*mm),
        ("TOPPADDING", (0,0), (-1,-1), 1.9*mm), ("BOTTOMPADDING", (0,0), (-1,-1), 1.9*mm),
    ]))
    return t

def box(title, body, bg=SKY):
    t = Table([[P(title, "TableBoldK")], [P(body, "SmallK")]], colWidths=[166*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), bg), ("BOX", (0,0), (-1,-1), 0.7, LINE),
        ("LEFTPADDING", (0,0), (-1,-1), 4*mm), ("RIGHTPADDING", (0,0), (-1,-1), 4*mm),
        ("TOPPADDING", (0,0), (-1,-1), 2.5*mm), ("BOTTOMPADDING", (0,0), (-1,-1), 1.8*mm),
    ]))
    return t

def flow(items):
    rows = []
    for i, item in enumerate(items):
        rows.append([P(item, "TableBoldK")])
        if i < len(items)-1:
            rows.append([P("↓", "QuoteK")])
    t = Table(rows, colWidths=[166*mm], hAlign="LEFT")
    style = [("BACKGROUND", (0,0), (-1,-1), SKY), ("BOX", (0,0), (-1,-1), 0.7, LINE), ("INNERGRID", (0,0), (-1,-1), 0.2, LINE), ("ALIGN", (0,0), (-1,-1), "CENTER"), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("TOPPADDING", (0,0), (-1,-1), 2.2*mm), ("BOTTOMPADDING", (0,0), (-1,-1), 2.2*mm)]
    for r in range(1, len(rows), 2):
        style += [("BACKGROUND", (0,r), (-1,r), colors.white), ("TOPPADDING", (0,r), (-1,r), 0.5*mm), ("BOTTOMPADDING", (0,r), (-1,r), 0.5*mm)]
    t.setStyle(TableStyle(style))
    return t

def footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setStrokeColor(LINE); canvas.setLineWidth(0.4); canvas.line(18*mm, 14*mm, w-18*mm, 14*mm)
    canvas.setFont("Malgun", 7.4); canvas.setFillColor(GRAY)
    canvas.drawString(18*mm, 9*mm, "2번 전체 이관 계획 - 개발 공부하는 고등학생용")
    canvas.drawRightString(w-18*mm, 9*mm, str(doc.page))
    canvas.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=22*mm, rightMargin=22*mm, topMargin=18*mm, bottomMargin=20*mm, title="xen02에서 tc-xen01으로 전체 이관 계획")
doc.addPageTemplates([PageTemplate(id="main", frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")], onPage=footer)])
S = []

# Cover
S += [Spacer(1, 14*mm), P("2번 전체 이관 계획", "CoverTitle"), P("xen02에서 tc-xen01으로 VM 3대를 옮기는 방법", "CoverSub"),
      box("이 문서가 답하는 질문", "무엇을 옮기는가? 왜 새로 설치하지 않고 VM을 복사하는가? 어떤 순서로 해야 안전한가? 언제 멈춰야 하는가? 문제가 생기면 어떻게 돌아가는가?", SKY),
      Spacer(1, 4*mm), box("가장 중요한 결론", "VM 자체는 복사·이동으로 target에 준비한다. 하지만 Elasticsearch, Solr, Redis, MariaDB 데이터는 각각 다른 방법으로 복원·검증한다. target은 운영망과 분리하고, CMS가 실제로 동작하는 것을 확인한 뒤에만 특정 테스트 경로와 L4를 통해 운영 전환한다.", GREEN),
      Spacer(1, 6*mm), P("팀장님께 말할 핵심 문장", "H2K"), P("이번 작업은 새 OS를 처음부터 만드는 작업이 아니라, 기존 VM 3대를 새 Xen 호스트에서 재현하고 서비스별 데이터와 연결을 검증한 뒤 운영 전환하는 작업입니다.", "QuoteK"),
      Spacer(1, 8*mm), P("설명 수준: 개발을 공부하는 고등학생", "SmallK"), PageBreak()]

# 1 executive plan
S += [P("1. 팀장님께 먼저 보고할 계획", "H1K"),
      P("회의에서 긴 명령어를 설명할 필요는 없습니다. 먼저 목적, 방법, 안전장치, 성공 기준을 말하면 됩니다."),
      box("보고용 최종 문장", "현재 tc-xen02에서 실행 중인 VM 101, 102, 103을 tc-xen01 호스트에서 다시 실행하는 계획입니다. tc-xen01에는 이미 xen01.01~03 VM과 Qdrant·Elasticsearch·PostgreSQL·Gitea가 있으므로 기존 목적지 VM을 바로 덮어쓰지 않고, 먼저 보존 대상인지 확인하겠습니다. 테스트 목적이면 새 복사 VM을 격리된 임시 IP에서 부팅하고, 기존 서비스를 목적지로 사용하기로 승인되면 서비스별 백업·복원 방식을 적용하겠습니다. Elasticsearch는 Snapshot/Restore, Solr는 collection BACKUP/RESTORE, Redis는 기존 cluster 재결합 또는 cache 재생성, MariaDB/PostgreSQL은 정합성을 지키는 백업·복원, Gitea는 DB·저장소·설정의 일관된 백업·복원을 사용합니다. CMS와 시뮬레이터까지 통과한 뒤에만 특정 테스트 경로와 L4를 통해 운영 전환하겠습니다.", SKY),
      P("1.1 이 계획의 성공 기준", "H2K"),
      table(["성공 단계", "팀장님께 설명할 말"], [
          ["VM", "새 Xen 호스트에서 VM이 정상 부팅됨"],
          ["서비스", "DB, Redis, Solr, Elasticsearch와 애플리케이션이 정상"],
          ["데이터", "필요한 DB, index, collection이 기준과 일치"],
          ["업무", "CMS 로그인, 검색, 배포, 챗봇 시나리오가 통과"],
          ["전환", "특정 테스트 경로 후 운영 L4 전환 가능"],
          ["안전", "문제 시 원본 xen02로 되돌릴 수 있음"],
      ], [39*mm, 127*mm]), PageBreak()]

# 2 big picture
S += [P("2. 전체 계획을 한 장으로 보기", "H1K"),
      P("계획은 ‘파일을 옮기는 날’부터 시작하지 않습니다. 먼저 현재 모습을 기록하고, 옮길 장소와 되돌아갈 방법을 정해야 합니다."),
      flow(["0. 승인: 작업해도 되는 시간과 범위 결정", "1. As-Is 조사: 현재 서버의 사진 찍기", "2. To-Be 설계: 새 호스트에 어떻게 놓을지 결정", "3. 백업: 실패해도 돌아갈 지점 만들기", "4. VM 이관: VM을 한 대씩 복사·이동", "5. target 격리: 원본과 충돌하지 않게 부팅", "6. 서비스 복원: 제품별 방법으로 연결·복원", "7. 리허설: 업무 시나리오와 시뮬레이터 실행", "8. 최종 동기화: 마지막 변경분 반영", "9. Cut-over: 특정 경로부터 운영 요청 전환", "10. 안정화: 로그·자원·오류 관찰"]),
      Spacer(1, 3*mm), box("왜 한 번에 세 대를 옮기지 않나", "세 대를 동시에 바꾸면 문제가 생겼을 때 어느 VM에서 생겼는지 알기 어렵다. VM 103 -> 102 -> 101 순서처럼 한 대씩 검증하면, 원인을 찾고 되돌리기 쉽다. 단, 실제 서비스 제공 관계가 확인되면 순서는 조정할 수 있다.", YELLOW), PageBreak()]

# 3 scope
S += [P("3. 이번 이관의 범위", "H1K"),
      P("범위를 먼저 정하지 않으면 ‘무엇을 성공시켜야 하는가’가 계속 바뀝니다."),
      table(["구분", "이번 계획에 포함", "이번 계획에서 바로 하지 않음"], [
          ["원본", "tc-xen02의 VM 101, 102, 103", "원본을 먼저 삭제하거나 재설치"],
          ["대상", "tc-xen01의 새 복사 VM 또는 기존 목적지 VM", "기존 VM을 승인 없이 덮어쓰기"],
          ["OS", "기존 Rocky Linux 9.6을 우선 재현", "처음부터 OS를 새로 설치하는 재구축"],
          ["애플리케이션", "CMS, Master, Engine, Gateway, Chat UI, Scheduler", "소스 코드 기능 변경"],
          ["데이터", "MariaDB, Redis, Elasticsearch, Solr/ZK, Qdrant", "승인 없는 전체 데이터 삭제"],
          ["네트워크", "임시 IP, hosts/DNS, HAProxy, 테스트 L4", "전체 운영 트래픽 즉시 전환"],
      ], [29*mm, 73*mm, 64*mm]),
      Spacer(1, 3*mm), box("현재 목표를 정확히 말하면", "‘xen02에서 쓰던 VM을 tc-xen01 호스트에서 켜 보는 것’이 1차 목표다. 단, tc-xen01에는 이미 서비스가 있는 VM이 있으므로 기존 VM을 덮어쓸지, 새 복사 VM을 만들지, 기존 서비스에 데이터만 복원할지를 먼저 승인받아야 한다. 그 다음 CMS와 시뮬레이터를 target에서 통과시키고, 운영 요청을 target으로 넘기는 것은 마지막 승인 단계다.", GREEN), PageBreak()]

# 4 actual starting point
S += [P("4. 현재 출발점: 실제로 확인한 것", "H1K"),
      P("아래 내용은 문서에서 상상한 값이 아니라 지금까지 실제로 확인한 값입니다. 단, 서비스의 모든 연결관계와 Xen 관리 권한은 아직 추가 확인이 필요합니다."),
      table(["VM", "주소와 OS", "관찰된 서비스"], [
          ["101", "192.168.1.101 / xen02.01.tc.kr / Rocky 9.6 / 5 vCPU / 약 18 GiB / 300 GiB", "Qdrant, Elasticsearch, Solr, ZooKeeper, Redis, MariaDB, MaxScale, HAProxy, Node/Kibana"],
          ["102", "192.168.1.102 / xen02.02.tc.kr / Rocky 9.6 / 5 vCPU / 약 18 GiB / 300 GiB", "Elasticsearch, Solr, ZooKeeper, Redis, MariaDB, Docker proxy, CMS 애플리케이션 확인"],
          ["103", "192.168.1.103 / xen02.03.tc.kr / Rocky 9.6 / 5 vCPU / 약 18 GiB / 300 GiB", "Elasticsearch, Solr, ZooKeeper, Redis, MariaDB, Docker proxy"],
      ], [23*mm, 73*mm, 70*mm]),
      Spacer(1, 3*mm), table(["이미 확인한 연결", "의미"], [
          ["http://cms", "Windows hosts가 cms를 192.168.1.101로 보내고, HAProxy가 80번 포트에서 CMS backend로 전달"],
          ["CMS backend", "cms1/cms2/cms3가 8280 포트에서 동작하도록 HAProxy에 설정됨"],
          ["서버 내부 curl", "CMS의 127.0.0.1:8280 응답이 401이므로 프로세스는 살아 있고 인증이 필요함"],
      ], [49*mm, 117*mm]),
      P("4.1 목적지 tc-xen01에 이미 있는 VM과 서비스", "H2K"),
      P("새 자료 기준으로 tc-xen01에는 이미 다음 목적지 VM이 있습니다. 이 표는 ‘복사해서 덮어쓸 대상’이라고 확정한 표가 아니라, 먼저 보호해야 할 가능성이 있는 기존 환경을 기록한 표입니다."),
      table(["목적지 VM", "주소와 자원", "이미 기록된 서비스", "이관 시 주의"], [
          ["xen01.01", "192.168.1.81 / Rocky 9.6 / 5 vCPU / 19 GiB / 300 GiB", "Qdrant 01 (v1.15.0)", "기존 Qdrant collection 보존 여부 확인. VM 디스크를 바로 덮어쓰지 않음"],
          ["xen01.02", "192.168.1.82 / Rocky 9.6 / 5 vCPU / 19 GiB / 300 GiB", "Elasticsearch 9.1.1 / 9200, 9300", "source 버전과 다를 수 있으므로 data 디렉터리 직접 복사 금지. Snapshot/Restore 검토"],
          ["xen01.03", "192.168.1.83 / Rocky 9.6 / 5 vCPU / 19 GiB / 300 GiB", "PostgreSQL 5432 / Gitea 3000", "DB·Git 저장소·app.ini·첨부파일·비밀키를 함께 고려. 기존 데이터 백업 필수"],
      ], [25*mm, 55*mm, 40*mm, 46*mm]),
      Spacer(1, 3*mm),
      box("이 표가 의미하는 것", "tc-xen01의 기존 VM이 이미 사용 중이면 ‘source VM 전체 복사 → 기존 target VM 덮어쓰기’는 삭제·서비스 중단 위험이 있는 별도 작업이다. 기본안은 기존 VM을 보존하고 새 복사 VM을 만들거나, 담당자 승인 아래 서비스별 백업·복원을 하는 것이다.", RED), PageBreak()]

# 5 copy vs rebuild
S += [P("5. 왜 새로 설치보다 VM 복사·이동을 먼저 검토하는가", "H1K"),
      table(["방법", "하는 일", "장점", "주의점"], [
          ["VM 복사·이동", "OS, 프로그램, 가상 디스크를 통째로 target에 재현", "현재 상태를 빠르게 재현", "IP 충돌, 기존 cluster 상태, 라이선스와 hardware 차이 확인"],
          ["OS 재구축", "새 VM에 OS와 프로그램을 다시 설치", "깨끗한 환경과 통제된 설정", "설치·버전·권한·데이터 복구 작업이 매우 많음"],
          ["혼합형", "VM은 복사하고, 데이터 서비스는 제품별 백업·복원", "현재 계획에 가장 현실적", "복사와 복원을 각각 검증해야 함"],
      ], [32*mm, 55*mm, 38*mm, 41*mm]),
      P("이번 계획의 기본 선택은 혼합형입니다.", "H2K"),
      flow(["VM의 OS와 애플리케이션 파일은 Xen 방식으로 복사·이동", "target은 임시 주소로 격리 부팅", "분산 데이터는 Redis/ES/Solr/ZK/MariaDB 방식에 맞게 처리", "CMS와 시뮬레이터로 통합 검증", "마지막에만 운영 주소와 L4 전환"]),
      box("새로 설치 방식으로 바뀌는 조건", "VM 이동이 불가능하거나, target OS를 반드시 새로 설치해야 하거나, 기존 파일이 새 OS에서 실행되지 않거나, 보안·감사 정책상 깨끗한 재구축이 필요한 경우에만 별도 재구축 계획으로 전환한다.", YELLOW), PageBreak()]

# 6 gates roles
S += [P("6. 역할과 승인 게이트", "H1K"),
      P("이관은 한 사람이 서버 명령어를 잘 친다고 끝나는 작업이 아닙니다. 누가 승인하고, 누가 확인하고, 누가 되돌릴지 정해야 합니다."),
      table(["역할", "해야 할 일"], [
          ["팀장/작업 승인자", "작업 시간, 중단 가능 시간, 운영 전환과 롤백 승인"],
          ["Xen 관리자", "pool, SR, CPU, 네트워크, VM 복사·이동 권한과 자원 확인"],
          ["Linux/인프라 담당", "OS, 방화벽, mount, 권한, IP, hosts, 프로세스 확인"],
          ["DB 담당", "MariaDB 백업·정합화·복구와 데이터 기준 승인"],
          ["검색/캐시 담당", "Redis, Elasticsearch, Solr/ZooKeeper 복원과 cluster 검증"],
          ["애플리케이션 담당", "CMS/Master/Engine/Gateway 연결, 시뮬레이터와 업무 검증"],
          ["롤백 담당", "문제 발생 시 누가 어떤 기준으로 source로 돌릴지 실행"],
      ], [45*mm, 121*mm]),
      P("6.1 반드시 승인받아야 하는 순간", "H2K"),
      table(["게이트", "승인 전에는 하지 않는 것"], [
          ["작업 승인", "VM 중지, 이동, IP 변경"],
          ["백업 완료", "source writer 중지, 데이터 추출과 최종 동기화"],
          ["target 준비", "서비스 정상 기동과 테스트 트래픽 투입"],
          ["리허설 통과", "운영 DNS/VIP/L4 전환"],
          ["전환 후", "source 삭제 또는 source를 바로 재사용"],
      ], [45*mm, 121*mm]), PageBreak()]

# 7 preconditions
S += [P("7. 작업 시작 전 조건", "H1K"),
      P("아래 조건 중 하나라도 모르면 ‘아직 실행할 때가 아니다’라고 판단합니다."),
      table(["확인할 것", "합격 기준", "없으면 생기는 문제"], [
          ["target 자원", "CPU, RAM, SR 용량, 네트워크가 VM 3대를 받을 수 있음", "VM이 못 켜지거나 디스크가 부족"],
          ["Xen 권한", "VM 생성·복사·이동·네트워크 연결 권한 확인", "관리 명령을 실행할 수 없음"],
          ["임시 IP", "source와 다른 IP와 hostname 준비", "같은 주소 충돌"],
          ["백업 저장소", "VM backup과 제품별 backup을 보관할 장소", "실패 시 되돌릴 수 없음"],
          ["테스트 기준", "CMS 로그인, 검색, 배포, 시뮬레이터 성공 기준", "무엇이 성공인지 판단 불가"],
          ["롤백 기준", "어떤 오류면 중단하고 source로 돌아갈지", "문제를 계속 키움"],
          ["담당자", "Xen, DB, 검색, 애플리케이션, L4 연락처", "장애 때 기다리기만 함"],
      ], [39*mm, 77*mm, 50*mm]),
      box("현재 미확정 핵심", "tc-xen01의 pool/SR/network와 xe 관리 인증, xen01.01~03의 실제 사용 여부, 기존 Qdrant·Elasticsearch·PostgreSQL·Gitea를 보존할지, CMS가 어느 VM과 backend를 사용하는지, 시뮬레이터 실행 방법과 성공 기준이 확정되어야 한다.", RED), PageBreak()]

# 8 phase 0-1
S += [P("8. 0단계와 1단계: 승인과 As-Is 조사", "H1K"),
      P("As-Is는 ‘현재 있는 모습’이라는 뜻입니다. 이 단계에서는 바꾸지 않고 사진만 찍습니다."),
      P("8.1 먼저 적을 목록", "H2K")] + bullets(["VM 이름, IP, hostname, OS, CPU, RAM, 디스크, /data 용량", "실행 중인 프로세스와 서비스 이름", "LISTEN 포트와 포트를 사용하는 프로세스", "JAR, 설정파일, systemd, 환경변수, hosts 위치", "DB, Redis, ES index, Solr collection, ZK, Qdrant 데이터 위치", "다른 VM과 외부 시스템으로 나가는 모든 IP:PORT", "현재 CMS 접속 방식과 테스트 시나리오", "각 항목의 확인 시각과 담당자"]) + [
      P("8.2 조사 결과물", "H2K"),
      table(["산출물", "무엇을 적나"], [
          ["VM 인벤토리", "101/102/103의 자원·OS·서비스"],
          ["서비스 배치표", "어느 VM에 CMS, DB, Redis, ES, Solr가 있는지"],
          ["통신표", "출발지 -> 목적지 IP:PORT와 용도"],
          ["파일표", "JAR/config/data/log 경로와 checksum"],
          ["업무표", "로그인, 검색, 배포, 챗봇, 시뮬레이터 테스트"],
          ["위험표", "삭제, 중지, 중복 실행, 데이터 손실 위험"],
      ], [40*mm, 126*mm]),
      box("이 단계의 중단 기준", "서비스가 어디에 있는지, 어느 포트를 쓰는지, 어떤 데이터가 중요한지, source와 target이 어떻게 연결되는지 모르면 다음 단계로 가지 않는다.", YELLOW), PageBreak()]

# 9 phase 2 target design
S += [P("9. 2단계: To-Be 설계", "H1K"),
      P("To-Be는 ‘옮긴 뒤 만들고 싶은 모습’입니다. 계획표를 먼저 그리고 실제 VM을 나중에 움직입니다."),
      table(["설계 항목", "결정해야 할 내용"], [
          ["VM 이름", "새 VM을 101/102/103 역할로 유지할지, 새 이름을 쓸지"],
          ["CPU/RAM/디스크", "source와 같은 자원으로 만들지, 증설할지"],
          ["IP", "리허설용 임시 IP와 운영 전환 시 최종 IP"],
          ["hostname", "source와 충돌하지 않는 이름과 최종 이름"],
          ["SR", "VM 디스크를 놓을 target 저장소와 여유 공간"],
          ["network", "source network, 격리 network, 운영 network, VLAN"],
          ["서비스 위치", "CMS와 backend가 어느 VM에 실행되는지"],
          ["접속 경로", "HAProxy, DNS/hosts, L4/VIP가 어느 순서로 연결되는지"],
      ], [43*mm, 123*mm]),
      P("9.1 target 설계 그림", "H2K"),
      flow(["tc-xen01 Host / Pool / SR 확인", "기존 xen01.01~03 보존 여부 결정", "새 복사 VM 또는 서비스별 복원 대상 준비", "임시 IP와 격리된 네트워크로 부팅", "서비스 주소를 target 주소로 연결", "테스트 IP만 target으로 보냄", "승인 후 운영 L4/VIP에 반영"]),
      box("주소를 세 종류로 나누기", "source 주소는 현재 환경, target 임시 주소는 리허설 환경, 운영 주소는 실제 사용자가 쓰는 최종 주소다. 이 세 가지를 한 표에 섞지 않아야 한다.", GREEN), PageBreak()]

# 10 backup
S += [P("10. 3단계: 백업과 복구 지점", "H1K"),
      P("백업은 ‘파일을 하나 복사해 두는 것’이 아니라, 문제가 생겼을 때 어떤 상태로 돌아갈 수 있는지를 만드는 작업입니다."),
      table(["대상", "계획", "합격 기준"], [
          ["VM", "원본 VM snapshot/backup 또는 Xen export를 보관", "백업 목록, 시각, 저장 위치, 복구 가능 여부"],
          ["MariaDB", "미러 DB는 보존하고 Scheduler 영향 데이터는 B0/B1 data-only SQL 준비", "row count, checksum, PK, AUTO_INCREMENT manifest"],
          ["Redis", "cluster topology, node ID, slot, AOF/RDB 경로를 기록", "원복용 hold는 보관, 새 cluster 경로도 준비"],
          ["Solr/ZK", "모든 collection hard commit 후 collection별 BACKUP, configset/alias export", "모든 backup completed, count/checksum 기록"],
          ["Elasticsearch", "공유 repository를 verify하고 Snapshot 생성", "SUCCESS, failed shard 0, 예상 index 모두 포함"],
          ["Qdrant", "collection 목록과 storage/snapshot 계획", "collection 수, 대표 검색, checksum 기록"],
          ["애플리케이션", "JAR, conf, upload, script와 checksum 보관", "파일명·버전·권한·checksum 일치"],
      ], [32*mm, 78*mm, 56*mm]),
      P("10.1 B0와 B1을 쉽게 이해하기", "H2K"),
      table(["구분", "시점", "목적"], [
          ["B0", "리허설 전", "연습하고 복구할 수 있는지 확인"],
          ["B1", "최종 전환 직전", "모든 writer를 멈추고 마지막 변경분 반영"],
      ], [25*mm, 57*mm, 84*mm]), PageBreak()]

# 11 VM move
S += [P("11. 4단계: VM 복사·이동", "H1K"),
      P("이 단계는 Xen 관리자가 수행합니다. 개발자는 이동 방식과 결과를 확인하고 기록해야 합니다."),
      table(["가능 조건", "우선 방식", "확인할 것"], [
          ["같은 pool, 공유 SR, CPU 호환", "live migration 또는 Xen 이동", "pool UUID, SR 공유, CPU feature, network"],
          ["별도 pool 또는 비공유 SR", "XVA export/import 또는 복제", "export 저장공간, 전송시간, VM 중지 시간"],
          ["복사 불가 또는 OS 재구축 필요", "새 VM + OS/서비스 재구성", "설치 매체, 버전, config/data 복원 계획"],
      ], [48*mm, 53*mm, 65*mm]),
      P("11.1 이동 당일의 순서", "H2K"),
      flow(["작업 승인과 source 상태 기록", "원본 VM의 backup/snapshot 확인", "VM 한 대 중지 또는 이동 방식 적용", "target에서 VM 생성·디스크·NIC 확인", "source와 다른 임시 IP로 부팅", "hostname, route, disk, service 자동기동 상태 확인", "다음 VM으로 반복"]),
      box("이 단계에서 하지 않는 것", "원본과 target을 같은 IP로 동시에 운영하지 않는다. target을 L4에 넣지 않는다. 서비스가 자동으로 올라왔다고 업무 테스트가 끝났다고 생각하지 않는다.", RED), PageBreak()]

# 12 target isolation
S += [P("12. 5단계: target을 안전하게 부팅", "H1K"),
      P("target은 새로 옮겨진 VM입니다. target이 source인 척하면 두 서버가 서로 싸우거나, 테스트 데이터가 실제 서비스로 나갈 수 있습니다."),
      table(["순서", "해야 할 일", "왜 하는가"], [
          ["1", "target 식별 파일과 hostname 확인", "엉뚱한 VM을 바꾸지 않기 위해"],
          ["2", "임시 IP, 임시 hostname, 별도 네트워크 적용", "source와 주소 충돌 방지"],
          ["3", "모든 자동기동과 Scheduler 상태 확인", "준비 전에 업무가 실행되지 않게"],
          ["4", "source DB/서비스로의 egress 차단", "테스트가 원본 데이터를 바꾸지 않게"],
          ["5", "L4/VIP에 target 미등록", "운영 사용자가 target에 오지 않게"],
          ["6", "미러 원본 data를 hold 보관", "실패 시 분석·원복 가능"],
      ], [22*mm, 79*mm, 65*mm]),
      P("12.1 target 부팅 후 확인 순서", "H2K"),
      flow(["hostname/IP 확인", "디스크와 mount 확인", "Java/Python/권한 확인", "설정에서 source IP와 운영 VIP 검색", "서비스 자동기동 상태 확인", "포트와 로그 확인", "외부 연결 차단 상태 확인"]), PageBreak()]

# 13 product restore
S += [P("13. 6단계: 제품별 복원 전략", "H1K"),
      P("VM을 옮긴 뒤 모든 서비스를 똑같이 다루면 안 됩니다. 데이터의 성격이 다르기 때문입니다."),
      table(["제품", "이번 계획의 기본 전략", "성공 기준"], [
          ["MariaDB", "미러 DB를 기준으로 보존. Scheduler/writer 중지 후 승인된 A/B 범위만 정합화", "무결성, count/checksum, 비대상 table 불변"],
          ["Redis", "기존 cluster 재결합 우선. 실패하면 빈 3 master/3 replica 구성 후 cache 재생성", "cluster ok, slot 16384, cache 조회 정상"],
          ["Elasticsearch", "미러 data는 hold. 빈 새 cluster를 만들고 Snapshot/Restore", "green, failed shard 0, index/mapping/alias 일치"],
          ["ZooKeeper/Solr", "clean ensemble 구성 후 configset과 모든 collection BACKUP/RESTORE", "모든 collection active, count/alias/검색 일치"],
          ["Qdrant", "collection과 storage/snapshot을 기준으로 복원", "collection 목록과 대표 vector 검색 일치"],
      ], [33*mm, 85*mm, 48*mm]),
      box("데이터를 복사하는 방식의 차이", "Redis는 재생성 가능한 cache로 판단할 수 있지만, MariaDB의 업무 행과 Solr/Elasticsearch의 검색 데이터는 확인 없이 버리면 안 된다. Elasticsearch와 Solr는 제품이 제공하는 Snapshot/Backup/Restore를 우선 사용한다.", YELLOW), PageBreak()]

# 14 detailed services
S += [P("14. 제품별 상세 계획", "H1K"),
      P("14.1 Redis", "H2K")] + bullets(["먼저 현재 master/replica와 slot을 확인한다. 7000이 항상 master라고 가정하지 않는다.", "source cluster를 target과 동시에 노출하지 않는다.", "정적 설정, 자동 cluster state, AOF, RDB를 한 세트로 hold 보관한다.", "기존 상태가 맞으면 재결합한다. 하나라도 꼬이면 억지로 고치지 않고 빈 cluster 경로로 전환한다.", "빈 cluster를 만들면 master 3개와 replica 3개를 구성하고 시스템 배포 기능으로 cache를 다시 만든다.", "Scheduler는 OFF 상태를 유지한다."]) + [
      P("14.2 Elasticsearch", "H2K")] + bullets(["미러 data 디렉터리는 증적과 원복용으로 보관하고 새 working data로 사용하지 않는다.", "target에서 빈 cluster와 Snapshot repository를 준비한다.", "application index와 Kibana index를 Snapshot/Restore한다.", "global state, template, pipeline, ILM, SLM은 별도 검증한다.", "green, unassigned shard 0, 대표 검색·정렬·aggregation과 node restart를 확인한다."]) + [
      P("14.3 ZooKeeper/Solr", "H2K")] + bullets(["ZooKeeper는 새 clean ensemble으로 구성하고 옛 transaction log와 ephemeral session을 복원하지 않는다.", "Solr configset을 올리고 source의 모든 collection을 목록으로 대조한다.", "collection별 BACKUP/RESTORE가 completed인지 확인한다.", "shard, replica, leader, alias, count, 한국어 검색과 CRUD를 확인한다.", "collection 하나라도 누락되면 NO-GO다."]) + [PageBreak()]

# 15 MariaDB/App
S += [P("15. MariaDB, Scheduler, 애플리케이션 계획", "H1K"),
      P("15.1 MariaDB", "H2K"),
      flow(["source Scheduler와 모든 writer 중지", "진행 중 job이 없는지 확인", "B1 data-only SQL과 count/checksum 준비", "target에서 A그룹 통계·batch 데이터만 검증 후 재적재", "B그룹은 영향받은 후보 PK만 교정", "비대상 table이 변하지 않았는지 확인", "DB 정합성 승인 후 애플리케이션 연결"]),
      P("15.2 Scheduler", "H2K")] + bullets(["target에서 처음부터 켜지 않는다.", "리허설에서 101 한 대만 제한 기동한다.", "승인된 읽기·파생 통계 job만 시험한다.", "예약 배포 job과 ES log backup job은 별도 승인 전 실행하지 않는다.", "실행 전후 DB/ES/Solr/Redis와 batch log를 비교한다.", "시험이 끝나면 다시 OFF로 둔다."]) + [
      P("15.3 애플리케이션", "H2K"),
      table(["기동 순서", "확인 내용"], [
          ["Master", "DB 연결, schema 변경 방지, health"],
          ["Engine", "Master와 DB/검색/cache 연결"],
          ["Gateway", "upstream과 API health"],
          ["CMS", "HAProxy의 http://cms 경로, 로그인, 주요 화면"],
          ["Chat UI", "Gateway/Engine과 사용자 화면"],
          ["Scheduler", "마지막, 승인된 101 한 대만"],
      ], [40*mm, 126*mm]), PageBreak()]

# 15.4 bot lifecycle verification
S += [P("15.4 봇 생성·학습·배포 검증 계획", "H1K"),
      P("봇 관련 기능은 ‘파일을 복사했는가’만으로 검증할 수 없습니다. 실제 업무 기능을 한 번 실행해 DB·Solr·Redis·Engine이 함께 움직이는지 확인해야 합니다."),
      flow(["테스트 봇 선택 또는 생성", "DB에 bot·tenant 정보 생성 확인", "학습 실행과 학습 상태 확인", "학습 결과·검색 문서 준비 확인", "배포 실행", "Solr collection/문서와 active·standby 확인", "Redis cache 생성·TTL 확인", "Engine이 새 봇을 조회", "시뮬레이터로 질문·답변 전체 시험"]),
      table(["업무 행동", "생길 수 있는 결과", "반드시 확인할 것"], [
          ["봇 생성", "DB의 bot metadata와 tenant 연결", "bot ID, 삭제 여부, 연결된 학습/배포 ID"],
          ["학습", "학습 상태와 학습 버전", "SUCCESS 여부, 결과 위치, 실패 로그"],
          ["배포", "active/standby 전환, Solr 문서 반영, Redis cache 생성", "배포 결과, collection·문서 수, Redis key/TTL"],
          ["시뮬레이터 질문", "Gateway → Engine → Redis/Solr/DB 흐름", "예상 답변, 로그, 응답시간, 오류 없음"],
      ], [36*mm, 67*mm, 63*mm]),
      box("중요한 구분", "배포 기능이 Redis cache를 다시 만들 수 있다는 것은 Redis를 무조건 지워도 된다는 뜻이 아니다. Solr collection도 테스트 봇 생성으로 새로 생길 수 있지만, 기존 운영 collection의 BACKUP/RESTORE를 대신하지 않는다. ‘자동 생성이 되는지 확인’과 ‘기존 운영 데이터를 안전하게 복원’은 서로 다른 시험이다.", YELLOW),
      box("미확정 항목", "현재 자료만으로 봇 생성 순간에 collection이 생기는지, 최초 배포 때 생기는지, 학습만으로 Solr 문서가 생기는지는 확정하지 않는다. target의 테스트 봇에서 각 단계 전후 DB·Solr·Redis 상태를 비교해 실제 순서를 기록한다.", RED), PageBreak()]

# 16 rehearsal
S += [P("16. 7단계: 리허설과 시뮬레이터", "H1K"),
      P("리허설은 ‘화면이 뜨는지’만 보는 시험이 아닙니다. 실제 운영에서 생길 흐름을 안전한 target에서 재현하는 시험입니다."),
      table(["시험 층", "시험 내용", "통과 기준"], [
          ["VM/OS", "재부팅, 자원, 시간대, 권한, 자동기동", "오류와 권한 거부 없음"],
          ["포트", "각 service LISTEN과 VM 간 통신", "필요한 IP:PORT만 연결"],
          ["제품", "Redis cluster, ES health, Solr collection, DB read", "제품 자체 상태 정상"],
          ["애플리케이션", "CMS/Master/Engine/Gateway health", "source endpoint 접근 0"],
          ["업무", "로그인, 검색, bot, 배포, 파일, 챗봇", "주요 시나리오 성공"],
          ["시뮬레이터", "정해진 테스트 입력을 끝까지 실행", "예상 결과와 로그 일치"],
          ["장애", "한 노드 재기동과 복구", "cluster 재합류와 업무 복구"],
          ["롤백", "복원 실패와 서비스 실패를 재현", "source 보존, target 중단 가능"],
      ], [35*mm, 76*mm, 55*mm]),
      P("16.1 테스트 IP를 사용하는 이유", "H2K"),
      P("전체 사용자를 target으로 보내기 전에 특정 테스트 IP만 연결하면 작은 범위에서 확인할 수 있습니다. ‘특정 IP’가 L4 VIP인지 테스트 클라이언트 IP인지 현재 자료만으로는 확정할 수 있으므로 네트워크 담당자에게 확인해야 합니다."), PageBreak()]

# 17 final sync
S += [P("17. 8단계: 최종 동기화와 Cut-over", "H1K"),
      P("리허설이 끝났다고 바로 운영 전환하지 않습니다. 리허설 중 source에서 새로 바뀐 데이터가 있을 수 있기 때문입니다."),
      P("17.1 최종 동기화 순서", "H2K"),
      flow(["점검창 시작과 신규 요청 차단", "source Scheduler 중지", "진행 중 job이 0건인지 확인", "gateway/CMS/master/engine writer 중지 또는 read-only", "B1 MariaDB 선택 SQL 생성", "Solr 모든 collection B1 BACKUP", "Elasticsearch B1 Snapshot과 policy export", "target에 서비스별 복원", "count/checksum/검색/업무 검증", "Scheduler는 여전히 OFF", "승인 후 특정 테스트 경로 연결"]),
      P("17.2 Cut-over의 의미", "H2K"),
      P("Cut-over는 운영 사용자가 바라보는 주소를 target으로 바꾸는 순간입니다. VM을 복사한 순간도 아니고, CMS 화면이 뜬 순간도 아닙니다. DNS, hosts, L4, VIP, proxy 중 실제 사용자가 들어오는 경로를 target으로 바꾸는 작업입니다."),
      box("전환 직전 NO-GO", "백업 checksum이 없거나, collection/index가 하나라도 빠졌거나, DB 정합성이 승인되지 않았거나, source endpoint 접근이 남아 있거나, Scheduler 중복 실행 가능성이 있거나, 롤백 담당자가 없으면 전환하지 않는다.", RED), PageBreak()]

# 18 start stop order
S += [P("18. 중지와 기동 순서 계획", "H1K"),
      P("아래는 런북을 바탕으로 한 계획상의 순서입니다. 실제 운영 매뉴얼과 서비스 담당자의 승인을 우선합니다."),
      table(["최종 중지 순서", "복원 후 기동 순서"], [
          ["1. L4 신규 요청 차단", "1. MariaDB"],
          ["2. Scheduler", "2. ZooKeeper -> Solr"],
          ["3. Chat UI/CMS/Gateway", "3. Elasticsearch -> Kibana"],
          ["4. Engine/Master", "4. Redis cluster"],
          ["5. DB 선택 백업, Solr BACKUP, ES Snapshot", "5. Master -> Engine -> Gateway"],
          ["6. ES -> Solr -> ZooKeeper", "6. CMS -> Chat UI"],
          ["7. Redis topology 기록 후 중지", "7. 시스템 배포로 Redis cache 재생성"],
          ["8. MariaDB는 강제 종료하지 않고 writer 차단", "8. 내부 health -> 특정 테스트 IP"],
          ["", "9. Scheduler 101 한 대, 최종 승인 후"],
      ], [82*mm, 84*mm]),
      box("왜 Scheduler가 마지막인가", "Scheduler는 시간에 따라 자동으로 DB, Solr, Redis, Engine을 바꿀 수 있습니다. 101, 102, 103에서 동시에 실행되면 같은 예약 작업이 중복 실행될 수 있으므로, 검증의 마지막에 한 대만 제한적으로 켠다.", YELLOW), PageBreak()]

# 19 rollback
S += [P("19. 롤백 계획", "H1K"),
      P("롤백은 실패했을 때 당황해서 하는 행동이 아니라, 미리 정한 조건에 따라 source로 돌아가는 계획입니다."),
      table(["상황", "판단", "행동"], [
          ["VM 부팅 실패", "target OS, 디스크, NIC 문제", "target 격리 유지, source 유지, 로그 분석"],
          ["서비스 기동 실패", "JAR, library, config, permission 문제", "target만 수정 또는 target 중단"],
          ["DB 정합화 실패", "count/checksum/PK가 다름", "writer 계속 중지, before-image로 원복"],
          ["Redis 실패", "cluster state/slot/replica 문제", "기존 상태 hold 보관, 빈 cluster 경로 검토"],
          ["Solr/ES 복원 실패", "collection/index 누락 또는 shard 문제", "전환 금지, backup/snapshot 재검증"],
          ["업무 시나리오 실패", "CMS/Master/Engine 연결 또는 데이터 문제", "테스트 IP 제거, target 분석"],
          ["전환 후 장애", "오류율/데이터/응답시간 기준 초과", "L4/DNS/VIP 복귀, source write 정책 복원"],
      ], [39*mm, 63*mm, 64*mm]),
      P("19.1 롤백에서 지켜야 할 것", "H2K")] + bullets(["source VM과 source data를 target 검증이 끝날 때까지 보존한다.", "target에서 쓰기가 발생했다면 source로 돌아가기 전에 데이터 방향과 충돌을 승인받는다.", "DNS/VIP만 되돌리면 되는지, DB write 정책까지 되돌려야 하는지 구분한다.", "롤백 후에도 로그, 오류, 데이터 상태를 기록한다."]) + [PageBreak()]

# 20 schedule
S += [P("20. 일정 계획 예시", "H1K"),
      P("날짜를 먼저 정하기보다, 각 단계의 완료 조건을 통과했을 때 다음 단계로 넘어가는 방식이 안전합니다."),
      table(["시점", "할 일", "완료 산출물"], [
          ["D-5 ~ D-3", "As-Is 조사와 서비스 연결표 작성", "인벤토리, 통신표, 위험표"],
          ["D-3 ~ D-2", "tc-xen01 pool/SR/network와 자원, 기존 VM 사용 여부 확인", "To-Be 구성표, 임시 IP표"],
          ["D-2 ~ D-1", "B0 백업, 복구 가능성, 시뮬레이터 준비", "backup manifest, 테스트 케이스"],
          ["D-day 1", "VM 103 역할 복사·격리·서비스 검증", "VM03 검증 보고서"],
          ["D-day 2", "VM 102 역할 복사·격리·서비스 검증", "VM02 검증 보고서"],
          ["D-day 3", "VM 101 역할 복사·HAProxy/CMS/Qdrant 검증", "VM01 검증 보고서"],
          ["D-day 4", "세 VM 통합과 시뮬레이터", "통합 테스트 결과"],
          ["Cut-over", "B1 최종 동기화 후 운영 전환", "전환 승인·기록"],
          ["D+1 ~ D+3", "로그, 자원, 오류, 업무 관찰", "안정화 보고서"],
      ], [34*mm, 79*mm, 53*mm]),
      box("일정이 밀려도 괜찮은 기준", "백업이 불완전하거나 테스트가 실패했는데 날짜 때문에 다음 단계로 가면 안 된다. 이관은 날짜보다 완료 조건이 중요하다.", GREEN), PageBreak()]

# 21 checklist and questions
S += [P("21. 팀장님께 확인할 질문 목록", "H1K"),
      P("이 질문의 답을 받으면 계획이 추측이 아니라 실제 작업 계획이 됩니다."),
      table(["질문", "왜 필요한가"], [
          ["source는 tc-xen02, target 호스트는 tc-xen01이 확정인가?", "이관 방향을 틀리지 않기 위해"],
          ["tc-xen01의 관리 IP와 Xen 접속 방법은 무엇인가?", "호스트 접속과 VM 접속을 구분하기 위해"],
          ["tc-xen01의 pool/SR/network와 VM 생성·복사 권한이 있는가?", "실제 VM 이관 가능 여부"],
          ["xen01.01~03 VM은 현재 사용 중인가? 담당자는 누구인가?", "기존 목적지 VM을 보호하기 위해"],
          ["기존 목적지 VM을 보존해야 하는가, 교체해도 되는가?", "덮어쓰기와 서비스별 복원의 선택 기준"],
          ["테스트용 새 VM을 만들 수 있는 CPU·RAM·SR 여유가 있는가?", "안전한 복사본을 만들기 위해"],
          ["192.168.1.81~83은 운영 IP인가, 테스트 IP인가?", "IP 충돌과 운영 트래픽 유입 방지"],
          ["Qdrant 01의 기존 collection을 보존해야 하는가?", "벡터 검색 데이터 손실 방지"],
          ["Elasticsearch 9.1.1은 기존 ES의 목적지인가? source ES 버전과 호환 계획은?", "버전 차이와 Snapshot/Restore 계획 확정"],
          ["PostgreSQL과 Gitea의 기존 데이터·저장소를 보존해야 하는가?", "DB·Git 저장소·설정 백업 범위 확정"],
          ["세 VM을 한 대씩 옮기는 순서를 승인하는가?", "장애 범위 최소화"],
          ["임시 IP와 격리 VLAN/포트그룹이 있는가?", "source와 target 충돌 방지"],
          ["CMS의 기존 접속 경로는 http://cms가 맞는가?", "HAProxy/hosts/L4 설계"],
          ["meritz.easycms 같은 도메인은 브라우저용인가?", "hosts와 proxy 설정 구분"],
          ["시뮬레이터 이름, 실행 방법, 성공 기준은?", "통합 테스트 가능 여부"],
          ["Scheduler는 언제, 어느 VM 한 대에서 켤 것인가?", "중복 job 방지"],
          ["최종 전환과 롤백 승인자는 누구인가?", "운영 사고 대응"],
      ], [105*mm, 61*mm]), PageBreak()]

# 22 final summary
S += [P("22. 이 계획의 마지막 한 장 요약", "H1K"),
      P("이관은 ‘옮기기’보다 ‘안전하게 확인하고, 필요하면 되돌리는 것’이 핵심입니다."),
      flow(["원본을 사진 찍는다", "새 장소를 준비한다", "백업을 만든다", "VM을 한 대씩 복사한다", "target을 격리한다", "서비스별로 복원한다", "CMS와 시뮬레이터를 시험한다", "최종 변경분을 동기화한다", "특정 IP로 작게 연결한다", "승인 후 운영 L4로 전환한다", "문제면 source로 돌아간다"]),
      Spacer(1, 4*mm), box("팀장님께 한 문장으로", "VM 자체는 tc-xen01에 새 복사본으로 준비하되, 이미 존재하는 xen01.01~03 VM은 덮어쓰지 않고 보존 여부를 먼저 확인하겠습니다. 기존 서비스를 목적지로 쓰는 경우에는 Qdrant·Elasticsearch·PostgreSQL·Gitea를 제품별 백업·복원하고, target을 격리한 상태에서 CMS와 시뮬레이터를 검증한 다음 특정 IP와 L4를 통해 단계적으로 운영 전환하겠습니다.", SKY),
      Spacer(1, 5*mm), P("다음 3번 문서에서는 이 계획의 각 단계에서 실제로 어떤 명령어를 입력하고, 그 명령어가 무엇을 의미하며, 결과가 어떻게 나와야 하는지를 하나씩 설명한다.", "SmallK"), P("끝.", "SmallK")]

doc.build(S)
print(str(OUT))
