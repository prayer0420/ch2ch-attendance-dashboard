from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Table, TableStyle, Preformatted

MIGRATION_ROOT = Path(__file__).resolve().parents[2]
OUT = MIGRATION_ROOT / "output" / "pdf" / "03_tc-xen01_실제_이관_행동방법과_명령어_해설.pdf"
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
ss.add(ParagraphStyle(name="CoverTitle", fontName="Malgun-Bold", fontSize=22, leading=30, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8*mm))
ss.add(ParagraphStyle(name="CoverSub", fontName="Malgun", fontSize=11.5, leading=18, textColor=GRAY, alignment=TA_CENTER, spaceAfter=5*mm))
ss.add(ParagraphStyle(name="H1K", fontName="Malgun-Bold", fontSize=16, leading=22, textColor=NAVY, spaceBefore=2*mm, spaceAfter=4*mm, keepWithNext=True))
ss.add(ParagraphStyle(name="H2K", fontName="Malgun-Bold", fontSize=12.2, leading=17, textColor=BLUE, spaceBefore=3*mm, spaceAfter=2.5*mm, keepWithNext=True))
ss.add(ParagraphStyle(name="BodyK", fontName="Malgun", fontSize=9.15, leading=14.5, textColor=DARK, spaceAfter=2.7*mm))
ss.add(ParagraphStyle(name="SmallK", fontName="Malgun", fontSize=7.9, leading=11.8, textColor=GRAY, spaceAfter=1.5*mm))
ss.add(ParagraphStyle(name="BulletK", fontName="Malgun", fontSize=8.9, leading=13.8, leftIndent=5*mm, firstLineIndent=-3.5*mm, textColor=DARK, spaceAfter=1.1*mm))
ss.add(ParagraphStyle(name="QuoteK", fontName="Malgun-Bold", fontSize=10.3, leading=15.5, textColor=NAVY, leftIndent=6*mm, rightIndent=6*mm, spaceBefore=2*mm, spaceAfter=3*mm))
ss.add(ParagraphStyle(name="TableK", fontName="Malgun", fontSize=7.35, leading=10.4, textColor=DARK))
ss.add(ParagraphStyle(name="TableBoldK", fontName="Malgun-Bold", fontSize=7.35, leading=10.4, textColor=DARK))
ss.add(ParagraphStyle(name="CodeK", fontName="Malgun", fontSize=7.35, leading=10.8, textColor=colors.HexColor("#17324D"), backColor=colors.HexColor("#F3F6F8"), leftIndent=3*mm, rightIndent=3*mm, borderPadding=2.2*mm))

def P(text, style="BodyK"):
    return Paragraph(text, ss[style])

def C(text):
    return Preformatted(text, ss["CodeK"], maxLineLength=110)

def bullets(items):
    return [Paragraph("- " + x, ss["BulletK"]) for x in items]

def table(headers, rows, widths):
    data = [[P(str(h), "TableBoldK") for h in headers]]
    data += [[P(str(c), "TableK") for c in row] for row in rows]
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, PALE]),
        ("LEFTPADDING", (0, 0), (-1, -1), 2.1*mm), ("RIGHTPADDING", (0, 0), (-1, -1), 2.1*mm),
        ("TOPPADDING", (0, 0), (-1, -1), 1.8*mm), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8*mm),
    ]))
    return t

def box(title, body, bg=SKY):
    t = Table([[P(title, "TableBoldK")], [P(body, "SmallK")]], colWidths=[166*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg), ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4*mm), ("RIGHTPADDING", (0, 0), (-1, -1), 4*mm),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5*mm), ("BOTTOMPADDING", (0, 0), (-1, -1), 1.8*mm),
    ]))
    return t

def flow(items):
    rows = []
    for i, item in enumerate(items):
        rows.append([P(item, "TableBoldK")])
        if i < len(items) - 1:
            rows.append([P("↓", "QuoteK")])
    t = Table(rows, colWidths=[166*mm], hAlign="LEFT")
    style = [("BACKGROUND", (0, 0), (-1, -1), SKY), ("BOX", (0, 0), (-1, -1), 0.7, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.2, LINE), ("ALIGN", (0, 0), (-1, -1), "CENTER"), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 2.1*mm), ("BOTTOMPADDING", (0, 0), (-1, -1), 2.1*mm)]
    for r in range(1, len(rows), 2):
        style += [("BACKGROUND", (0, r), (-1, r), colors.white), ("TOPPADDING", (0, r), (-1, r), 0.4*mm), ("BOTTOMPADDING", (0, r), (-1, r), 0.4*mm)]
    t.setStyle(TableStyle(style))
    return t

def footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setStrokeColor(LINE); canvas.setLineWidth(0.4); canvas.line(18*mm, 14*mm, w-18*mm, 14*mm)
    canvas.setFont("Malgun", 7.2); canvas.setFillColor(GRAY)
    canvas.drawString(18*mm, 9*mm, "3번 실제 이관 행동방법·명령어 해설 - 개발 공부하는 고등학생용")
    canvas.drawRightString(w-18*mm, 9*mm, str(doc.page))
    canvas.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=22*mm, rightMargin=22*mm, topMargin=18*mm, bottomMargin=20*mm, title="실제 이관 행동방법과 명령어 해설")
doc.addPageTemplates([PageTemplate(id="main", frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")], onPage=footer)])
S = []

# Cover
S += [Spacer(1, 13*mm), P("3번 실제 이관 행동방법", "CoverTitle"), P("xen02에서 tc-xen01으로 VM과 서비스를 옮길 때의 명령어 해설", "CoverSub"),
      box("이 문서의 목적", "앞의 1번은 개념, 2번은 전체 계획을 설명했습니다. 이 문서는 그 계획을 실제 작업자가 어떻게 수행하는지, 명령어를 왜 입력하는지, 결과를 어떻게 읽는지를 설명합니다.", SKY),
      Spacer(1, 4*mm), box("가장 중요한 안전 규칙", "[조회]는 현재 상태를 읽는 명령입니다. [변경]은 서버를 멈추거나 설정을 바꾸는 명령입니다. 이 문서는 분석·교육용이며, 변경 명령은 작업 승인과 대상 확인 전에는 실행하지 않습니다.", RED),
      Spacer(1, 6*mm), P("이관을 한 문장으로", "H2K"), P("원본 서버의 상태를 확인하고, 백업을 만든 뒤, VM을 새 Xen 호스트에 준비하고, 임시 주소에서 서비스를 검사한 다음, 승인된 경우에만 운영 요청을 target으로 보내는 과정입니다.", "QuoteK"),
      Spacer(1, 8*mm), P("대상: Linux와 서버 이관을 공부하는 고등학생 수준", "SmallK"), PageBreak()]

# 1 safety and scope
S += [P("1. 시작하기 전에: 지금 내가 하는 일은 무엇인가", "H1K"),
      P("이 문서에서 ‘실제 방법’이라고 해서 지금 당장 서버를 끄거나 VM을 옮긴다는 뜻은 아닙니다. 먼저 명령어를 읽고, 조회 결과를 기록하고, 승인된 작업창에서만 변경 단계로 넘어갑니다."),
      table(["표시", "뜻", "예시"], [
          ["[조회]", "정보를 읽기만 함. 보통 안전하지만 민감정보는 마스킹", "hostname, ss, curl, systemctl status"],
          ["[테스트]", "응답이나 연결을 확인함. 대상에 따라 부하 가능", "curl health API, redis-cli ping"],
          ["[변경]", "서비스·네트워크·VM 상태를 바꿈. 승인 필수", "systemctl stop, IP 변경, xe vm-migrate"],
          ["[절대 금지]", "검증 전 실행하면 복구가 어려움", "원본 삭제, rm -rf, 운영 IP 중복 기동"],
      ], [27*mm, 76*mm, 63*mm]),
      P("1.1 이 문서에서 사용하는 이름", "H2K"),
      table(["이름", "뜻"], [
          ["source", "현재 서비스가 실행 중인 원본 xen02 환경"],
          ["target", "tc-xen01 안에서 시험할 새 복사 VM 또는 기존 목적지 서비스"],
          ["VM 101/102/103", "192.168.1.101/102/103에 대응하는 현재 세 VM"],
          ["IP:PORT", "서버 주소와 프로그램의 문 번호. 예: 192.168.1.101:80"],
          ["시뮬레이터", "실제 업무 흐름을 테스트 입력으로 재현하는 프로그램"],
      ], [43*mm, 123*mm]), PageBreak()]

# 2 command grammar
S += [P("2. 명령어를 읽는 법", "H1K"),
      P("명령어는 외울 문장이 아니라 ‘컴퓨터에게 한 가지 질문 또는 행동을 시키는 문장’입니다. 명령 이름과 옵션, 대상 순서로 읽습니다."),
      C("sudo ss -lntup\n│    │  └──── 옵션: 프로세스까지 표시\n│    └─────── 명령: 네트워크 소켓 상태 확인\n└──────────── 관리자 권한으로 실행"),
      table(["기호", "뜻", "주의"], [
          ["$", "일반 사용자 프롬프트", "복사하지 않고 명령어만 입력"],
          ["sudo", "관리자 권한으로 한 번 실행", "비밀번호를 요구할 수 있음"],
          ["|", "왼쪽 결과를 오른쪽 명령에 전달", "긴 명령은 각 부분의 뜻을 나눠 읽기"],
          [">", "결과를 파일에 새로 저장", "기존 파일을 덮어쓸 수 있음"],
          ["2>/dev/null", "오류 메시지를 화면에서 숨김", "오류가 사라진 것이 아님"],
          ["NAME/IP/UUID", "실제 값으로 바꿀 자리", "확인 전 그대로 입력하면 안 됨"],
      ], [31*mm, 64*mm, 71*mm]),
      box("출력 결과는 증거다", "명령을 입력했다는 사실보다 결과가 중요합니다. 명령어, 실행 시각, 어느 서버에서 실행했는지, 결과, 판단을 작업 기록에 남깁니다.", GREEN), PageBreak()]

# 3 Windows to SSH
S += [P("3. Windows에서 원본 VM에 접속하기 [조회]", "H1K"),
      P("첫 단계는 ‘내가 어느 서버에 들어왔는지’ 확인하는 것입니다. 잘못된 서버에서 명령하면 정상 서버를 바꾸는 사고가 생길 수 있습니다."),
      C(r'''ssh -i "$HOME\.ssh\xen-tc-admin_rsa" admin@192.168.1.101
hostname
id -un
cat /etc/os-release

ssh -i "$HOME\.ssh\xen-tc-admin_rsa" admin@192.168.1.102
hostname
id -un
cat /etc/os-release

ssh -i "$HOME\.ssh\xen-tc-admin_rsa" admin@192.168.1.103
hostname
id -un
cat /etc/os-release'''),
      table(["명령", "무슨 질문인가", "정상적으로 확인할 것"], [
          ["ssh -i ...", "원격 Linux에 들어갈 수 있나", "admin 계정으로 접속"],
          ["hostname", "내가 어느 서버에 있는가", "101/102/103과 일치"],
          ["id -un", "현재 사용자 이름은 무엇인가", "admin. 필요 시 sudo 사용"],
          ["cat /etc/os-release", "어떤 OS인가", "Rocky Linux 9.6 관찰값과 일치"],
      ], [48*mm, 66*mm, 52*mm]),
      box("실수 방지", "프롬프트에 보이는 hostname이 예상과 다르면 즉시 명령을 멈춥니다. IP만 보고 믿지 말고 hostname과 /etc/os-release를 함께 확인합니다.", RED), PageBreak()]

# 4 resources
S += [P("4. CPU·메모리·디스크 확인 [조회]", "H1K"),
      C("nproc\nfree -h\nlsblk -f\ndf -hT\nsudo du -xhd1 /data 2>/dev/null | sort -h"),
      table(["명령", "쉽게 말하면", "결과 읽기"], [
          ["nproc", "CPU 코어 수", "VM에 배정된 vCPU 수"],
          ["free -h", "RAM 총량과 사용량", "available이 실제 여유에 가까움"],
          ["lsblk -f", "디스크와 파일시스템", "디스크·mount·UUID 확인"],
          ["df -hT", "파티션별 남은 공간", "Use%가 90% 이상이면 위험"],
          ["du ... /data", "/data 안에서 큰 폴더 찾기", "옮길 실제 데이터 크기 파악"],
      ], [42*mm, 70*mm, 54*mm]),
      P("지금까지 관찰한 원본 기준", "H2K"),
      P("세 VM은 대략 5 vCPU, 18~19 GiB RAM, 300 GiB 디스크, /data 약 194 GiB 파티션으로 기록되어 있습니다. 실제 target에 필요한 SR 여유 공간은 VM 디스크의 provisioned size와 snapshot/XVA 임시 공간까지 포함해 Xen 관리자가 다시 계산해야 합니다."),
      box("df와 du는 다르다", "df는 파티션 전체가 얼마나 찼는지, du는 특정 폴더가 실제로 얼마나 쓰는지 보여줍니다. /data 사용량이 작아도 VM 전체 디스크를 XVA로 내보내면 파일 크기가 클 수 있습니다.", YELLOW), PageBreak()]

# 5 services process ports logs
S += [P("5. 서비스·프로세스·포트·로그 확인 [조회]", "H1K"),
      C("systemctl list-units --type=service --state=running --no-pager\nsystemctl --failed --no-pager\nps auxf\nsudo ss -lntup"),
      table(["확인", "명령", "왜 필요한가"], [
          ["자동 서비스", "systemctl list-units ...", "부팅 후 실행되는 프로그램 목록"],
          ["실패 서비스", "systemctl --failed", "이관 후 놓치기 쉬운 오류"],
          ["프로세스", "ps auxf", "실제 실행 파일과 부모·자식 관계"],
          ["포트", "sudo ss -lntup", "어떤 프로그램이 어느 문을 열었는지"],
      ], [35*mm, 66*mm, 65*mm]),
      C("systemctl status NAME --no-pager\nsystemctl cat NAME\njournalctl -u NAME -n 100 --no-pager"),
      P("NAME은 서비스 이름으로 바꿉니다. status는 현재 상태, cat은 ExecStart·환경파일·작업 디렉터리, journalctl은 최근 로그를 확인합니다. ‘active’만으로 성공이라고 하지 말고 포트와 API 응답을 함께 봅니다."), PageBreak()]

# 6 config and dependencies
S += [P("6. 설정파일과 연결 주소 찾기 [조회]", "H1K"),
      C(r'''systemctl cat NAME
sudo grep -RniE '192\.168\.1\.|redis|elastic|solr|zookeeper|zk|maria|qdrant|8280|8380|8480' /etc /opt /data 2>/dev/null | head -200
cat /etc/hosts
env | sort
ip addr
ip route'''),
      table(["명령", "찾는 것", "주의"], [
          ["systemctl cat", "실행 파일, 환경파일, 작업 폴더", "서비스 이름부터 확인"],
          ["grep -RniE", "IP, 제품명, 포트가 들어간 설정", "비밀번호·토큰이 출력될 수 있음"],
          ["cat /etc/hosts", "이름을 IP로 바꾸는 표", "target에서는 source 주소를 그대로 쓰면 안 됨"],
          ["env", "현재 프로세스 환경변수", "민감정보를 외부에 공유하지 않음"],
          ["ip addr/route", "주소와 목적지로 가는 길", "WireGuard route 충돌도 확인"],
      ], [38*mm, 76*mm, 52*mm]),
      box("grep 결과를 그대로 공유하지 않기", "설정 검색 결과에는 DB 비밀번호, API 토큰, private key가 섞일 수 있습니다. 팀에 공유할 때는 값은 가리고 변수명·파일경로·대상 IP:PORT만 남깁니다.", RED), PageBreak()]

# 7 network CMS actual
S += [P("7. 네트워크를 세 부분으로 나누어 검사하기 [조회/테스트]", "H1K"),
      P("연결이 안 될 때 ‘서비스가 죽었다’고 바로 결론 내리지 않습니다. 주소, 문, 길, 프로그램 대화의 네 단계로 나눕니다."),
      table(["질문", "확인", "결과가 나쁘면 의심할 것"], [
          ["주소가 맞나?", "ip addr, /etc/hosts", "잘못된 IP·hostname"],
          ["문이 열렸나?", "ss -lntup", "프로그램 미기동·bind 주소"],
          ["길이 열렸나?", "nc -vz 상대IP PORT", "route·방화벽·보안그룹"],
          ["대화가 되나?", "curl·health API·로그", "인증·설정·클러스터 문제"],
      ], [42*mm, 62*mm, 62*mm]),
      P("7.1 CMS에서 실제로 확인한 구조", "H2K"),
      flow(["Windows hosts의 cms 이름", "192.168.1.101의 HAProxy 80번", "HAProxy CMS backend", "cms1/cms2/cms3의 8280", "CMS 인증 화면 또는 401 응답"]),
      P("서버 안에서 127.0.0.1:8280으로 curl했을 때 401 Unauthorized가 나온 것은 ‘프로세스가 없었다’는 뜻이 아니라, CMS가 살아 있고 인증을 요구한다는 뜻입니다. 반대로 Windows에서 192.168.1.102:8280을 직접 검사해 실패했다고 해서 CMS 전체가 죽은 것은 아닙니다. 기존 경로는 8280을 외부에 직접 열지 않고 HAProxy 80번으로 접근하도록 만든 구조입니다.", "BodyK"), PageBreak()]

# 8 Windows CMS path
S += [P("8. Windows에서 CMS 접속 경로 확인하기 [조회/테스트]", "H1K"),
      P("브라우저 주소창에 IP와 8280을 직접 넣는 방식이 아니라, 기존 접속 방법인 ‘이름 → HAProxy → backend’를 확인합니다."),
      P("8.1 Windows hosts 파일의 역할", "H2K"),
      P("hosts 파일은 ‘cms라는 이름을 입력하면 어느 IP로 갈지’를 적는 작은 주소록입니다. 환경변수도 아니고, 서버 프로그램도 아닙니다."),
      C("메모장 관리자 권한 실행\nC:\\Windows\\System32\\drivers\\etc\\hosts\n\n192.168.1.101 cms"),
      P("저장 후에는 Windows에서 아래 명령으로 이름 캐시를 비우고 확인합니다."),
      C("ipconfig /flushdns\nResolve-DnsName cms\nTest-NetConnection cms -Port 80\ncurl.exe -I http://cms/"),
      table(["결과", "뜻"], [
          ["Resolve-DnsName이 192.168.1.101", "이름이 올바른 IP로 해석됨"],
          ["TcpTestSucceeded True", "80번 문까지 TCP 연결 가능"],
          ["HTTP 401", "서버·앱은 응답했지만 인증 필요"],
          ["timeout", "경로·방화벽·서버 응답을 차례로 확인"],
      ], [62*mm, 104*mm]),
      box("하지 않을 것", "8280을 무조건 외부에 열거나 WireGuard route를 임의로 추가하지 않습니다. 실제 경로가 HAProxy 80번인지 먼저 확인합니다.", RED), PageBreak()]

# 9 HAProxy config
S += [P("9. HAProxy가 실제로 어느 backend로 보내는지 확인 [조회]", "H1K"),
      C("sudo grep -nE '^(frontend|listen|bind|backend|server)' /etc/haproxy/haproxy.cfg\nsudo grep -nE '^[[:space:]]*(bind|server)' /etc/haproxy/haproxy.cfg\nsudo grep -niE 'hdr\\(host\\)|cms_nodes|master_nodes|engine_nodes|gateway_nodes' /etc/haproxy/haproxy.cfg"),
      P("앞의 결과에서 확인된 핵심은 HAProxy가 0.0.0.0:80에서 받고, CMS backend에 cms1/cms2/cms3를 8280으로 연결한다는 것입니다. ACL이 hdr(host)로 cms만 인식한다면 meritz.easycms 같은 이름을 hosts에 추가하는 것만으로는 원하는 backend가 선택되지 않을 수 있습니다."),
      table(["구성요소", "쉬운 의미", "확인 포인트"], [
          ["bind 0.0.0.0:80", "모든 인터페이스의 80번 문에서 받음", "외부에서 직접 8280을 열 필요가 있는지 별도 판단"],
          ["ACL hdr(host)", "요청의 Host 이름으로 분기", "cms가 허용 목록에 있는지"],
          ["backend cms_nodes", "CMS로 보내는 목적지 묶음", "cms1~3 주소와 8280"],
          ["server cms1 ...", "실제 backend 한 대", "DNS/컨테이너 이름이 어디로 풀리는지"],
      ], [42*mm, 70*mm, 54*mm]),
      C("sudo haproxy -c -f /etc/haproxy/haproxy.cfg\nsudo systemctl status haproxy --no-pager\ncurl -i -H 'Host: cms' http://127.0.0.1/"),
      P("haproxy -c는 설정 문법 검사, status는 프로세스 상태, Host 헤더를 넣은 curl은 브라우저 대신 어떤 ACL이 선택되는지 보는 테스트입니다. 마지막 curl도 인증이 필요하면 401이 나올 수 있으며, 그것은 연결 경로가 살아 있다는 증거입니다."), PageBreak()]

# 10 firewall and wireguard
S += [P("10. 방화벽·WireGuard·라우팅을 해석하기 [조회]", "H1K"),
      C("sudo firewall-cmd --get-active-zones\nsudo firewall-cmd --list-all\nsudo firewall-cmd --query-port=8280/tcp\ngetenforce\n\n# Windows PowerShell\nGet-NetRoute -DestinationPrefix 192.168.1.0/24\nTest-NetConnection 192.168.1.102 -Port 8280"),
      P("방화벽에서 8280/tcp가 no이고, 서버 내부 127.0.0.1:8280은 401을 반환했다면 ‘CMS는 내부에서 살아 있지만 외부 직통은 막혀 있다’고 해석할 수 있습니다. 이 구조에서는 기존 HAProxy 경로를 먼저 사용합니다."),
      table(["관찰", "해석"], [
          ["Wi-Fi source 192.168.1.10, ping 성공, TCP 8280 실패", "서버는 보이지만 8280 직통 문이 정책상 닫혀 있을 수 있음"],
          ["WireGuard source 10.100.0.14, ping 실패", "VPN route가 우선되어 사내망으로 가는 길이 바뀌었을 수 있음"],
          ["192.168.1.0/24 route가 두 개", "metric이 낮은 인터페이스가 우선. 경로 충돌 가능"],
          ["HAProxy 80 연결 성공", "기존 승인된 진입로를 사용해야 함"],
      ], [75*mm, 91*mm]),
      box("변경 금지", "방화벽 포트 추가, WireGuard route 변경, IP 변경은 네트워크 담당자 승인 없이는 하지 않습니다. 지금 문서의 목적은 원인을 읽는 것이지 정책을 바꾸는 것이 아닙니다.", RED), PageBreak()]

# 11 Xen concepts and discovery
S += [P("11. Xen 호스트에서 이동 가능 조건 확인 [조회 - Xen 관리자 필요]", "H1K"),
      P("VM을 옮기는 명령은 Linux VM 안에서 실행하는 명령과 다릅니다. pool, SR, network를 관리하는 Xen 권한이 필요합니다."),
      C("xe host-list params=name-label,uuid,memory-total,memory-free\nxe vm-list is-control-domain=false params=name-label,uuid,power-state,VCPUs-max,memory-static-max\nxe sr-list params=name-label,uuid,physical-size,physical-utilisation,type\nxe network-list params=name-label,uuid,bridge-label"),
      table(["조회", "초보자 설명", "통과 기준"], [
          ["host-list", "Xen 호스트 목록과 메모리", "target tc-xen01 식별"],
          ["vm-list", "VM 이름·UUID·전원·자원", "101/102/103의 UUID 확보"],
          ["sr-list", "VM 디스크를 놓는 저장소 창고", "target SR 여유 공간"],
          ["network-list", "VM NIC를 꽂는 가상 스위치", "target network가 같은 망인지"],
      ], [38*mm, 76*mm, 52*mm]),
      P("target은 tc-xen01 호스트입니다. 새 자료에는 tc-xen01 아래에 이미 xen01.01(192.168.1.81), xen01.02(192.168.1.82), xen01.03(192.168.1.83) VM이 있고, 각각 Qdrant·Elasticsearch·PostgreSQL/Gitea가 기록되어 있습니다. 따라서 xe 명령을 실행하기 전에 기존 VM을 보존할지, 새 복사 VM을 만들지, 기존 서비스에 데이터만 복원할지 담당자에게 확인합니다."), PageBreak()]

# 11.1 existing target inspection
S += [P("11.1 tc-xen01에 이미 있는 VM을 먼저 확인하기 [조회]", "H1K"),
      P("이 단계의 목적은 ‘목적지에 빈 자리가 있는지’가 아니라 ‘이미 누가 살고 있는지’를 확인하는 것입니다. 아래 VM이 실행 중이라면 그 안의 데이터를 먼저 보호해야 합니다."),
      table(["목적지 VM", "IP", "이미 기록된 서비스", "우선 확인할 것"], [
          ["xen01.01", "192.168.1.81", "Qdrant 01", "Qdrant collection 목록·데이터 보존 필요 여부"],
          ["xen01.02", "192.168.1.82", "Elasticsearch 9.1.1 / 9200·9300", "ES 버전·index·snapshot repository·운영 사용 여부"],
          ["xen01.03", "192.168.1.83", "PostgreSQL 5432 / Gitea 3000", "DB·Git 저장소·app.ini·첨부파일·비밀키 백업 여부"],
      ], [26*mm, 31*mm, 55*mm, 54*mm]),
      C("# 목적지 VM 목록과 전원 상태 조회\nxe vm-list is-control-domain=false params=name-label,uuid,power-state\n\n# 목적지 VM에 접속한 뒤, 어느 서버인지 확인\nhostname\nhostname -I\ncat /etc/os-release\nsudo ss -lntup\nsystemctl --failed --no-pager\n\n# 서비스가 실제로 응답하는지 확인하는 형태\ncurl -sS http://127.0.0.1:6333/collections     # Qdrant 예시\ncurl -sS http://127.0.0.1:9200/                # Elasticsearch 예시\npg_isready -h 127.0.0.1 -p 5432              # PostgreSQL 예시\ncurl -I http://127.0.0.1:3000/                # Gitea 예시"),
      P("hostname과 hostname -I는 내가 어느 VM에 들어왔는지 확인합니다. ss는 문이 열려 있는 포트와 그 문을 사용하는 프로세스를 보여줍니다. 이 명령들은 조회용이지만, 계정·토큰·비밀번호가 결과에 포함되면 공유할 때 가립니다."),
      box("중요한 중단 기준", "목적지 VM이 실제 사용 중인지 모르는 상태에서는 VM import, 디스크 교체, rm, systemctl stop을 실행하지 않습니다. 먼저 담당자와 보존·교체·새 VM 생성 중 하나를 결정합니다.", RED), PageBreak()]

# 12 migration command
S += [P("12. VM 이동 방식 선택과 명령 형태 [변경 - 승인 필수]", "H1K"),
      table(["조건", "방식", "실행 전 확인"], [
          ["같은 pool·공유 SR·CPU 호환", "live migration", "공유 SR, CPU feature, network"],
          ["비공유 SR·별도 pool", "XVA export/import", "백업 저장소, 중지 시간, checksum"],
          ["목적지 VM이 이미 사용 중", "새 VM 생성 또는 서비스별 복원", "기존 VM 덮어쓰기 금지, 보존 승인"],
          ["복사 불가·OS 재구축", "새 VM에 재설치", "ISO, 버전, config/data 복구"],
      ], [48*mm, 52*mm, 66*mm]),
      P("12.1 live migration 명령의 모양", "H2K"),
      C("xe vm-migrate uuid=SOURCE_VM_UUID host-uuid=DEST_HOST_UUID live=true"),
      P("vm-migrate는 특정 VM을 특정 Xen 호스트로 옮깁니다. uuid는 VM 식별자, host-uuid는 target 호스트 식별자입니다. live=true는 실행 중 이동을 시도한다는 뜻이지만, 모든 환경에서 되는 것은 아닙니다."),
      P("12.2 XVA export/import 명령의 모양", "H2K"),
      C("xe vm-export vm=SOURCE_VM_UUID filename=/backup/xen02-01.xva\nsha256sum /backup/xen02-01.xva\nxe vm-import filename=/backup/xen02-01.xva sr-uuid=DEST_SR_UUID preserve=false"),
      P("export는 VM을 하나의 이관 파일로 내보내고, sha256sum은 전송 중 파일이 바뀌지 않았는지 확인하며, import는 target SR에 VM을 만듭니다. 이미 xen01.01~03이 실행 중이면 import 대상 이름·SR·네트워크를 새로 정하고, 기존 VM의 디스크를 덮어쓰지 않는지 확인한 뒤에만 진행합니다. 실제 UUID와 경로를 확인하기 전에는 실행하지 않습니다."), PageBreak()]

# 13 migration verification
S += [P("13. VM 이관 직후 확인 순서 [조회]", "H1K"),
      P("VM이 target에서 켜졌다고 이관이 끝난 것이 아닙니다. 부팅된 컴퓨터의 주소, 저장공간, 서비스, 연결을 순서대로 확인합니다."),
      flow(["VM 이름·UUID·전원 상태 확인", "target VM의 hostname 확인", "임시 IP·route 확인", "디스크·mount·/data 확인", "failed service 확인", "LISTEN 포트 확인", "로그와 API 확인", "원본으로의 연결·운영 L4 등록 여부 확인"]),
      C("hostname\nip addr\nip route\ncat /etc/hosts\ndf -hT\nlsblk -f\nsystemctl --failed --no-pager\nsudo ss -lntup"),
      table(["좋은 결과", "나쁜 결과", "다음 행동"], [
          ["임시 IP, hostname, mount가 예상과 같음", "source IP가 그대로이고 충돌 위험", "즉시 격리 유지. 네트워크 담당자 호출"],
          ["failed 서비스 0개", "부팅 실패 서비스 존재", "status와 journal로 원인 기록"],
          ["필요 포트만 LISTEN", "포트가 없거나 엉뚱한 PID", "systemctl·config·bind 확인"],
          ["source endpoint 접근 없음", "target이 source DB를 보고 있음", "서비스 기동 중지 후 설정 재검토"],
      ], [53*mm, 56*mm, 57*mm]), PageBreak()]

# 14 isolation changes
S += [P("14. target 격리 설정 [변경 - 승인 필수]", "H1K"),
      P("target이 원본과 같은 IP·hostname으로 동시에 살아 있으면 두 서버가 같은 집 주소를 쓰는 것과 같습니다. 먼저 임시 주소와 격리 네트워크에서 시험합니다."),
      table(["해야 할 일", "목적"], [
          ["임시 IP·hostname 사용", "ARP·DNS·hosts 충돌 방지"],
          ["L4/VIP에 target 미등록", "일반 사용자가 target으로 오지 않게 함"],
          ["Scheduler OFF", "예약 작업 중복 실행 방지"],
          ["source DB/검색으로 쓰기 차단", "시험 데이터가 원본을 바꾸지 않게 함"],
          ["원본 data 디렉터리 hold 보관", "실패 분석·롤백에 사용"],
      ], [72*mm, 94*mm]),
      P("변경 명령은 환경에 따라 달라지므로 모양만 설명합니다.", "H2K"),
      C("# NetworkManager 환경의 예시 - 승인된 임시 주소로 바꿀 때만 사용\nsudo nmcli connection show\nsudo nmcli connection modify CONNECTION ipv4.addresses TEMP_IP/CIDR\nsudo nmcli connection up CONNECTION\n\n# hostname 변경 예시\nsudo hostnamectl set-hostname TEMP_HOSTNAME"),
      box("중요", "위 nmcli·hostnamectl은 실제 주소를 바꾸는 변경 명령입니다. source와 target, NIC, CIDR, gateway를 문서로 대조하고 승인받기 전에는 입력하지 않습니다.", RED), PageBreak()]

# 15 service order
S += [P("15. 서비스 확인과 기동 순서 [조회 우선]", "H1K"),
      P("프로그램은 서로 연결되어 있습니다. 아래는 런북을 이해하기 위한 기본 순서이며, 실제 서비스 담당자의 운영 순서를 우선합니다."),
      flow(["ZooKeeper 조정 상태", "데이터 서비스: Redis·MariaDB·Elasticsearch·Solr·Qdrant", "애플리케이션: Master·Engine·Gateway·CMS·Chat UI", "Scheduler 1대", "시뮬레이터"]),
      C("systemctl status NAME --no-pager\nsudo ss -lntup\njournalctl -u NAME -n 100 --no-pager\n\n# 변경 명령의 형태 - 승인 후에만\nsudo systemctl start NAME\nsudo systemctl stop NAME\nsudo systemctl restart NAME\nsudo systemctl enable NAME"),
      table(["명령", "뜻", "이관 중 주의"], [
          ["start", "지금 시작", "의존 서비스가 준비된 뒤"],
          ["stop", "중지", "운영 중지 승인 필수"],
          ["restart", "중지 후 다시 시작", "원인 기록 없이 반복 금지"],
          ["enable", "부팅 때 자동 시작", "Scheduler에는 특히 신중"],
      ], [36*mm, 61*mm, 69*mm]), PageBreak()]

# 16 Redis
S += [P("16. Redis 확인과 처리 방법", "H1K"),
      P("Redis는 빠른 임시 데이터, 세션, 큐, 캐시를 저장하는 경우가 많습니다. 하지만 실제로 업무 데이터가 들어가는지는 애플리케이션 설정을 확인해야 합니다."),
      C("redis-cli -h REDIS_IP -p 7000 ping\nredis-cli -h REDIS_IP -p 7000 cluster info\nredis-cli -h REDIS_IP -p 7000 cluster nodes\nredis-cli -h REDIS_IP -p 7000 info replication"),
      table(["결과", "뜻"], [
          ["PONG", "지정 노드가 응답"],
          ["cluster_state:ok", "Redis cluster 자체가 정상 상태"],
          ["cluster_slots_ok:16384", "모든 slot이 담당 노드에 배정"],
          ["master/replica 목록", "노드 역할과 복제 관계 확인"],
          ["timeout/refused", "주소·방화벽·프로세스·인증 순서로 확인"],
      ], [60*mm, 106*mm]),
      P("런북의 기본 판단은 기존 cluster가 target에 맞으면 재결합을 시도하고, 상태가 꼬이면 빈 3 master/3 replica cluster를 만든 뒤 애플리케이션으로 cache를 재생성하는 것입니다. 기존 AOF/RDB·cluster state는 원복용으로 hold 보관하며, Scheduler는 OFF로 둡니다."),
      box("비밀번호 안전", "비밀번호를 명령어에 직접 적거나 화면 캡처에 남기지 않습니다. 인증 방식과 secret 위치는 담당자에게 확인하고, 결과 공유 시 비밀값을 가립니다.", RED), PageBreak()]

# 17 Elasticsearch
S += [P("17. Elasticsearch 확인과 Snapshot/Restore", "H1K"),
      P("Elasticsearch는 검색·분석 데이터를 저장합니다. 실행 중인 data 디렉터리를 통째로 복사하는 방식은 버전·클러스터 상태·샤드 문제를 만들 수 있으므로 런북은 Snapshot/Restore를 원칙으로 합니다."),
      C("curl -sS http://ES_IP:9200/\ncurl -sS 'http://ES_IP:9200/_cluster/health?pretty'\ncurl -sS 'http://ES_IP:9200/_cat/nodes?v'\ncurl -sS 'http://ES_IP:9200/_cat/indices?v'\ncurl -sS 'http://ES_IP:9200/_cat/shards?v'"),
      table(["확인", "통과 기준"], [
          ["버전·노드", "예상 노드 수와 역할 일치"],
          ["cluster health", "target에서 green 목표. yellow/red는 원인 분석"],
          ["indices", "필요한 application·Kibana index 목록 일치"],
          ["shards", "unassigned shard 0, failed shard 없음"],
          ["업무 검색", "대표 검색·정렬·aggregation 결과 일치"],
      ], [67*mm, 99*mm]),
      P("Snapshot/Restore는 데이터를 Elasticsearch가 이해하는 형식으로 저장하고 새 cluster에서 다시 읽는 절차입니다. global state, template, pipeline, ILM/SLM은 데이터와 별도로 확인합니다. target은 새 빈 cluster로 시작하고, source data 폴더는 증적·원복용으로 보관합니다."), PageBreak()]

# 18 Solr ZK
S += [P("18. ZooKeeper와 Solr 확인·복원", "H1K"),
      P("ZooKeeper는 SolrCloud가 어느 node와 collection을 사용하는지 조정하는 역할을 합니다. Solr만 켜지고 ZooKeeper ensemble이 정상이 아니면 검색 클러스터가 완성되지 않습니다."),
      C("# ZooKeeper 프로세스 생존·TCP 확인\necho ruok | nc -w 3 ZK_IP 2181\nnc -vz ZK_IP 2181\n\n# Solr API 확인\ncurl -sS 'http://SOLR_IP:8983/solr/admin/info/system?wt=json'\ncurl -sS 'http://SOLR_IP:8983/solr/admin/collections?action=CLUSTERSTATUS&wt=json'\ncurl -sS 'http://SOLR_IP:8983/solr/admin/collections?action=LIST&wt=json'"),
      table(["확인", "정상 판단"], [
          ["ZooKeeper ruok", "프로세스 응답 확인. quorum 전체 정상은 별도 확인"],
          ["Solr system API", "Solr 버전과 API 응답"],
          ["collection LIST", "source의 모든 collection과 목록 대조"],
          ["CLUSTERSTATUS", "shard·replica·leader 상태 확인"],
          ["검색/CUD", "한국어 검색, 문서 추가·조회·삭제 테스트"],
      ], [67*mm, 99*mm]),
      P("복원 순서는 clean ZooKeeper ensemble 준비 → configset 업로드 → collection별 BACKUP/RESTORE → collection·alias·문서 수·대표 검색 확인입니다. collection 하나라도 누락되면 운영 전환하지 않습니다."), PageBreak()]

# 19 MariaDB
S += [P("19. MariaDB와 Scheduler 다루기", "H1K"),
      P("MariaDB에는 실제 업무 데이터가 있을 수 있으므로 Redis cache처럼 ‘없애고 다시 만들자’고 단순하게 판단하면 안 됩니다."),
      C("mysqladmin ping -h DB_IP -P 3306 -u DB_USER -p\nmysql -h DB_IP -P 3306 -u DB_USER -p -e 'SHOW DATABASES;'\nmysql -h DB_IP -P 3306 -u DB_USER -p DB_NAME -e 'SHOW TABLES;'"),
      P("mysqladmin ping은 DB가 응답하는지 확인하고, SHOW DATABASES/TABLES는 구조를 읽습니다. -p 뒤에 비밀번호를 붙이지 않으면 프롬프트에서 안전하게 입력할 수 있습니다."),
      P("19.1 런북의 최종 동기화 사고방식", "H2K"),
      flow(["source Scheduler와 모든 writer 중지", "진행 중 job이 0건인지 확인", "B1 data-only SQL과 count/checksum 생성", "target에서 승인된 A/B 범위만 정합화", "비대상 table 불변 확인", "DB 담당자 승인 후 애플리케이션 연결"]),
      box("Scheduler를 마지막에 켜는 이유", "Scheduler가 101·102·103에서 동시에 실행되면 같은 예약 작업을 여러 번 수행할 수 있습니다. target에서는 처음부터 자동 실행을 막고, 리허설 마지막에 승인된 한 대만 제한 기동합니다.", YELLOW), PageBreak()]

# 20 Qdrant and app
S += [P("20. Qdrant·MaxScale·애플리케이션 확인", "H1K"),
      P("Qdrant는 벡터 검색 데이터를 저장하고, MaxScale은 MariaDB 앞에서 연결을 분배하거나 장애 대응을 돕는 구성일 수 있습니다. 실제 역할은 설정파일과 서비스 담당자 확인으로 확정합니다."),
      C("curl -sS http://QDRANT_IP:6333/collections\ncurl -sS http://QDRANT_IP:6333/healthz\n\n# MaxScale은 실제 관리 포트와 인증 방식을 확인한 뒤 사용\nsudo ss -lntup | grep -i maxscale\nsystemctl status maxscale --no-pager"),
      table(["대상", "확인할 것"], [
          ["Qdrant", "collection 목록, 대표 vector 검색, storage 경로"],
          ["MaxScale", "backend DB, listener, health 상태"],
          ["Master", "DB·검색·cache 연결과 schema 변경 여부"],
          ["Engine", "Master와 검색·Redis 연결"],
          ["Gateway", "upstream과 API health"],
          ["CMS/Chat UI", "HAProxy 경로·로그인·주요 화면"],
      ], [41*mm, 125*mm]),
      P("앱을 확인할 때는 프로세스 → 포트 → API → 다른 서비스 연결 → 업무 흐름 순서로 갑니다. 화면이 뜨는 것만으로 DB와 검색이 정상이라고 판단하지 않습니다."), PageBreak()]

# 20.1 existing destination service handling
S += [P("20.1 목적지에 이미 있는 서비스가 있을 때의 처리 [조회 후 승인]", "H1K"),
      P("tc-xen01의 기존 서비스는 ‘옮겨 담을 빈 그릇’일 수도 있고, 이미 다른 업무가 사용하는 중요한 서비스일 수도 있습니다. 어느 쪽인지 확인하기 전에는 새 VM의 파일을 복사해 덮어쓰지 않습니다."),
      table(["서비스", "하지 않을 것", "우선 검토할 방식", "검증 결과"], [
          ["Qdrant 01", "실행 중 storage 폴더 덮어쓰기", "collection 목록 확인 후 snapshot/backup·restore", "collection·대표 vector 검색 일치"],
          ["Elasticsearch 9.1.1", "source data 디렉터리 직접 복사", "버전 호환성 확인 후 Snapshot/Restore", "health·index·shard·대표 검색 일치"],
          ["PostgreSQL", "실행 중 data 디렉터리 덮어쓰기", "pg_dump/pg_restore 또는 승인된 복제", "DB·schema·row count·권한 확인"],
          ["Gitea", "Git 저장소만 복사하거나 app.ini만 복사", "DB·repositories·attachments·설정·비밀키 일관 백업/복원", "로그인·저장소 clone/push·웹 화면"],
      ], [31*mm, 46*mm, 57*mm, 42*mm]),
      P("여기서 ‘서비스별 복원’은 프로그램을 다시 설치한다는 뜻만이 아닙니다. 이미 설치된 목적지 서비스의 데이터와 설정을 안전한 형식으로 넣고, 애플리케이션이 새 주소를 바라보도록 연결을 확인하는 작업입니다."),
      box("선택 기준", "기존 목적지 VM을 보존해야 하면 서비스별 백업·복원으로 진행합니다. 테스트용 새 VM을 만들 수 있으면 VM 전체 복사본을 새 이름·임시 IP로 만들고, 기존 목적지 VM과 분리하여 비교합니다.", YELLOW), PageBreak()]

# 21 app connection
S += [P("21. CMS·Master·Engine·Gateway 연결을 확인하는 법", "H1K"),
      P("‘연결한다’는 말은 주소를 한 줄 바꾸는 것만 뜻하지 않습니다. 출발 프로그램의 설정, 목적지 IP, 목적지 포트, 방화벽, 인증, 목적지 서비스 상태가 모두 맞아야 합니다."),
      table(["연결 예", "확인할 5가지"], [
          ["CMS → Gateway", "CMS 설정의 gateway 주소, gateway 포트 LISTEN, curl 응답, 인증, 로그"],
          ["Engine → Redis", "Redis IP·port, cluster mode, 방화벽, credentials, timeout 로그"],
          ["Engine → Elasticsearch", "9200 주소, health, index, 인증, 검색 로그"],
          ["Solr → ZooKeeper", "ZK 2181 주소, ensemble, configset, collection 상태, Solr 로그"],
          ["앱 → MariaDB", "DB host·port, schema, user 권한, connection pool, SQL 오류"],
      ], [50*mm, 116*mm]),
      C("sudo grep -RniE 'gateway|master|engine|redis|elastic|solr|zookeeper|maria|qdrant' /etc /opt /data 2>/dev/null | head -200\ncurl -i -H 'Host: cms' http://127.0.0.1/\njournalctl -u NAME -n 100 --no-pager"),
      box("설정 변경 전에", "현재 파일을 백업하고, 바꿀 파일·한 줄·새 주소·되돌릴 주소를 기록합니다. target에서만 바꿔야 하는 설정을 source에서 바꾸지 않도록 hostname과 IP를 다시 확인합니다.", RED), PageBreak()]

# 21.1 bot lifecycle verification
S += [P("21.1 봇 생성·학습·배포를 이용한 실제 검증 [테스트]", "H1K"),
      P("시뮬레이터를 실행하기 전에 테스트 봇 하나를 정하고, 봇 생성·학습·배포가 어떤 데이터를 만드는지 단계별로 관찰합니다. 이것이 음성에서 말한 ‘학습·배포하면 Redis가 생기고, 봇을 만들거나 배포하면 Solr collection이 생기는지 확인하는 과정’입니다."),
      flow(["테스트 봇 생성·선택과 DB metadata 확인", "학습 실행과 상태·결과 확인", "배포 실행과 active/standby·Solr·Redis 확인", "Engine/Gateway 연결 확인", "시뮬레이터 실행"]),
      table(["단계", "무엇이 만들어지거나 바뀔 수 있나", "어떻게 확인하나"], [
          ["봇 생성", "bot ID, tenant 연결, 기본 상태", "DB의 bot 관련 row를 생성 전후 비교"],
          ["학습", "learn ID, 학습 상태, 결과 위치 또는 검색 데이터", "학습 log·DB 상태·Solr 문서 변화를 비교"],
          ["배포", "deploy ID, active/standby, Solr 문서, Redis cache", "DB·Solr collection/문서 수·Redis key/TTL 확인"],
          ["질문 테스트", "Engine이 Redis와 Solr/DB를 읽어 답변", "Gateway 응답·Engine log·시뮬레이터 결과"],
      ], [30*mm, 79*mm, 57*mm]),
      C("# 아래는 조회 형태의 예시이며 실제 DB명·table·bot ID를 확인한 뒤 사용\n# DB: 생성 전후 bot/learn/deploy 상태를 비교\n# Solr: collection 목록과 문서 수 비교\ncurl -sS 'http://SOLR_IP:8983/solr/admin/collections?action=LIST&wt=json'\n# Redis: cache가 생겼는지 확인(비밀번호는 명령줄에 쓰지 않음)\nredis-cli -h REDIS_IP -p 7000 --scan | head -50\nredis-cli -h REDIS_IP -p 7000 ttl KEY_NAME"),
      P("Redis에서 key가 보인다는 것만으로 충분하지 않습니다. key의 type·value·TTL이 맞고, Engine이 실제로 그 key를 읽어야 합니다. Solr도 collection 이름이 보이는 것만으로 충분하지 않고 문서 수·대표 검색 결과·leader/replica 상태를 함께 확인합니다."),
      box("정확히 구분하기", "시스템 배포로 Redis cache가 자동 생성될 수 있다는 것은 ‘새 빈 Redis를 업무 기능으로 채울 수 있다’는 뜻입니다. 테스트 봇을 만들거나 배포해 Solr collection·문서가 생기는지 확인하는 것은 자동 생성 기능 검증입니다. 그러나 기존 운영 collection과 ES index는 반드시 정식 BACKUP/RESTORE 또는 Snapshot/Restore를 먼저 고려합니다.", YELLOW), PageBreak()]

# 22 simulator
S += [P("22. 시뮬레이터 실행 준비와 실행", "H1K"),
      P("현재 자료에는 시뮬레이터의 정확한 프로그램명, 경로, 실행 옵션, 테스트 데이터, 성공 기준이 확정되어 있지 않습니다. 따라서 먼저 담당자에게 받아야 하며, 모르는 상태에서 임의의 명령을 만들면 안 됩니다."),
      table(["받아야 할 정보", "예시 형태", "왜 필요한가"], [
          ["실행 파일", "/opt/simulator/run.sh 또는 jar", "무엇을 실행하는지"],
          ["환경파일", ".env, application.yml", "target 주소와 포트"],
          ["입력 케이스", "case-id, 파일, 날짜", "반복 가능한 시험"],
          ["성공 기준", "HTTP 200, DB row, 검색 결과", "PASS/FAIL 판단"],
          ["로그 위치", "/var/log/...", "실패 원인 분석"],
      ], [48*mm, 60*mm, 58*mm]),
      C("# 실제 값을 받은 뒤 형태만 참고\ncd SIMULATOR_DIRECTORY\nset -a; source ENV_FILE; set +a\n./SIMULATOR_PROGRAM --case CASE_ID 2>&1 | tee simulator-YYYYMMDD-HHMM.log"),
      P("cd는 실행 폴더로 이동, source는 환경값을 읽는 동작, set -a는 환경변수 전달을 돕는 설정, tee는 화면과 로그 파일에 동시에 기록하는 기능입니다. 위 명령은 실제 이름을 받은 뒤 target에서만 승인받아 사용합니다."), PageBreak()]

# 23 rehearsal
S += [P("23. 리허설: 실제 업무를 흉내 내기", "H1K"),
      P("리허설은 ‘모든 프로세스가 active’인지 보는 시험이 아닙니다. 사용자가 실제로 하는 일을 작은 범위에서 끝까지 해 보는 시험입니다."),
      table(["시험 순서", "확인 내용", "PASS 기준"], [
          ["1. VM/OS", "재부팅, mount, 시간, 권한", "failed 없음·필요 파일 존재"],
          ["2. 네트워크", "필요 IP:PORT 연결", "불필요한 source 접근 없음"],
          ["3. 제품", "Redis·ES·Solr/ZK·DB·Qdrant", "health와 목록 정상"],
          ["4. 앱", "Master·Engine·Gateway·CMS", "API·로그인·주요 화면"],
          ["5. 업무", "검색·배포·챗봇·문서 처리", "예상 결과와 일치"],
          ["6. 시뮬레이터", "정해진 케이스 실행", "로그와 결과 기록"],
          ["7. 장애", "한 서비스 재기동 등", "복구 후 업무 정상"],
      ], [32*mm, 77*mm, 57*mm]),
      P("테스트 중에는 target의 로그 시각, 입력 case, 기대 결과, 실제 결과, 오류 메시지, 담당자 판단을 기록합니다. 테스트 IP만 target으로 보내고 일반 사용자 트래픽은 계속 source에 둡니다."), PageBreak()]

# 24 final sync cutover
S += [P("24. 최종 동기화와 운영 전환 [변경 - 승인 필수]", "H1K"),
      P("리허설이 통과해도 source에서 새로 변경된 데이터가 있을 수 있습니다. 운영 전환 직전에 마지막 변경분을 반영하는 단계가 최종 동기화입니다."),
      flow(["점검창 시작·신규 요청 차단", "source Scheduler 중지", "진행 중 job 0건 확인", "CMS/Gateway/Master/Engine writer 중지 또는 read-only", "MariaDB B1 선택 SQL 생성", "Solr B1 BACKUP", "Elasticsearch B1 Snapshot", "target 복원·검증", "특정 테스트 경로 연결", "승인 후 L4/DNS/VIP 전환"]),
      table(["전환 직전 NO-GO", "이유"], [
          ["백업 checksum 또는 완료 기록 없음", "실패 시 복구 지점 불명확"],
          ["index/collection 하나라도 누락", "검색 결과와 업무가 달라짐"],
          ["DB 정합성 승인 없음", "업무 데이터 손실 위험"],
          ["Scheduler 중복 실행 가능", "같은 job이 두 번 실행될 수 있음"],
          ["롤백 담당자·연락처 없음", "장애 시 판단 지연"],
      ], [86*mm, 80*mm]), PageBreak()]

# 25 rollback and commands
S += [P("25. 롤백할 때의 행동 순서 [변경 - 승인 필수]", "H1K"),
      P("롤백은 ‘target이 마음에 안 들면 아무렇게나 source를 다시 켜는 것’이 아닙니다. target의 쓰기 작업이 source 데이터와 충돌하지 않는지 먼저 판단해야 합니다."),
      flow(["오류 기준 초과를 기록", "신규 요청을 target에서 차단", "Scheduler와 writer 중지", "현재 target 데이터 변경 여부 확인", "L4/DNS/VIP를 source 경로로 복귀", "source 서비스와 DB write 정책 확인", "사용자 업무 재검증", "target 로그·data를 보존하고 원인 분석"]),
      C("# 아래는 형태만 설명. 실제 운영 주소와 승인 절차가 필요\n# L4/DNS/VIP 담당자가 승인된 복귀 작업 수행\n# target 서비스 중지 형태\nsudo systemctl stop NAME\n# 서비스 상태와 로그 확인\nsystemctl status NAME --no-pager\njournalctl -u NAME -n 100 --no-pager"),
      box("원본을 바로 삭제하지 않는 이유", "target 검증과 안정화가 끝나기 전까지 원본 VM·원본 data·백업을 보존해야 합니다. target에서 이미 쓰기가 발생했다면 source로 돌아가기 전에 데이터 충돌 방안을 DB 담당자와 결정합니다.", RED), PageBreak()]

# 26 common errors
S += [P("26. 자주 보는 결과와 원인 찾기", "H1K"),
      table(["결과", "먼저 확인할 것", "섣불리 하지 말 것"], [
          ["Connection refused", "프로세스·LISTEN·bind 주소", "바로 방화벽만 열기"],
          ["Timeout", "route·방화벽·상대 서버 생존", "서비스를 반복 restart"],
          ["HTTP 401", "서버 응답 여부와 인증 계정", "프로세스가 죽었다고 단정"],
          ["HTTP 404", "URL path와 proxy route", "아무 경로로 바꾸기"],
          ["ES red", "unassigned shard·로그·디스크", "data 디렉터리 삭제"],
          ["Solr collection 없음", "collection 목록·restore 상태·ZK", "빈 collection을 운영에 연결"],
          ["Redis cluster_state fail", "node·slot·replica·주소", "source와 target을 동시에 cluster에 넣기"],
          ["systemctl active인데 업무 실패", "API·의존 서비스·로그", "active만 보고 PASS 처리"],
      ], [45*mm, 67*mm, 54*mm]),
      P("문제 해결은 ‘한 번에 하나만 바꾸기’가 원칙입니다. 주소를 바꾸면서 방화벽과 서비스를 동시에 바꾸면 무엇이 원인이었는지 알 수 없습니다."), PageBreak()]

# 27 forbidden list and work log
S += [P("27. 초보자가 특히 조심할 명령", "H1K"),
      table(["명령·행동", "위험"], [
          ["rm -rf /...", "파일을 영구 삭제"],
          ["systemctl stop/restart", "서비스 중단 또는 연결 끊김"],
          ["firewall-cmd --add/remove", "네트워크 정책 변경"],
          ["nmcli modify, hostnamectl", "주소·이름 변경과 충돌"],
          ["xe vm-migrate/export/import", "VM 위치·전원·디스크 변경"],
          ["dnf update/upgrade", "버전·라이브러리 호환성 변경"],
          ["원본 VM 삭제·snapshot 삭제", "검증·롤백 지점 상실"],
          ["Scheduler 자동 enable", "중복 예약 작업"],
      ], [72*mm, 94*mm]),
      P("27.1 작업 기록 양식", "H2K"),
      C("작업일시:\n작업자 / 승인자:\n실행 서버 hostname / IP:\n단계:\n조회 명령:\n결과 요약:\n변경 명령:\n변경 전 값 / 변경 후 값:\n백업 파일·SHA-256:\n서비스·포트·cluster 결과:\n시뮬레이터 case / 결과:\n롤백 필요 여부 / 판단자:"), PageBreak()]

# 28 end checklist
S += [P("28. 실제 작업 당일 최종 체크리스트", "H1K"),
      table(["순서", "완료 조건"], [
          ["1", "팀장·담당자 작업 승인과 작업창 확정"],
          ["2", "source 101/102/103 hostname·IP·OS·서비스 인벤토리 저장"],
          ["3", "tc-xen01 실제 관리 IP, pool·SR·network·권한 확정"],
          ["4", "xen01.01~03 기존 사용 여부와 보존·교체·새 VM 선택 확정"],
          ["5", "임시 IP·격리 네트워크·target 이름 확정"],
          ["6", "VM backup/export와 제품별 B0 백업 완료"],
          ["7", "VM을 한 대씩 target에 복사하거나 서비스별 복원하고 부팅 확인"],
          ["8", "source와 target IP·hostname·Scheduler·L4 충돌 없음"],
          ["9", "Redis·MariaDB·ES·Solr/ZK·Qdrant 제품 검증"],
          ["10", "PostgreSQL·Gitea 데이터와 저장소 검증"],
          ["11", "Master·Engine·Gateway·CMS·Chat UI 연결 검증"],
          ["12", "시뮬레이터를 테스트 IP에서 실행하고 결과 기록"],
          ["13", "B1 최종 동기화와 운영 전환 승인"],
          ["14", "전환 후 로그·자원·오류율 관찰, source 보존"],
      ], [22*mm, 144*mm]),
      Spacer(1, 4*mm), box("이 문서를 사용하는 순서", "처음에는 3~10번의 조회 명령만 읽고 현재 상태표를 만듭니다. 그 다음 11~15번으로 Xen과 target을 확인합니다. 16~23번에서 제품과 업무를 시험하고, 승인받은 작업창에서만 24~25번 전환·롤백 절차를 사용합니다.", GREEN),
      Spacer(1, 5*mm), P("핵심은 명령어를 많이 치는 것이 아니라, 내가 어느 서버에서 무엇을 확인하고 있는지 매번 설명할 수 있는 것입니다.", "QuoteK"), P("끝.", "SmallK")]

doc.build(S)
print(str(OUT))
