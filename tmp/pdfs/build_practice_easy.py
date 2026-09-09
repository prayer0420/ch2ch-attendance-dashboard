from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, Table, TableStyle, Preformatted

OUT = Path(r"C:\Users\c\OneDrive\문서\등촌프로젝트\output\pdf\VM2에서_VM1_실제실습_초보자용_명령어_순서_v3.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont("Malgun", r"C:\Windows\Fonts\malgun.ttf"))
pdfmetrics.registerFont(TTFont("Malgun-Bold", r"C:\Windows\Fonts\malgunbd.ttf"))
pdfmetrics.registerFontFamily("Malgun", normal="Malgun", bold="Malgun-Bold")

NAVY = colors.HexColor("#123A63")
BLUE = colors.HexColor("#1D5F8F")
LIGHT = colors.HexColor("#E5E7EB")
PALE = colors.HexColor("#F5F8FA")
GREEN = colors.HexColor("#E8F5EC")
YELLOW = colors.HexColor("#FFF6D8")
RED = colors.HexColor("#FCEBEC")
DARK = colors.HexColor("#1E2933")
GRAY = colors.HexColor("#5B6670")

s = getSampleStyleSheet()
s.add(ParagraphStyle(name="TitleK", fontName="Malgun-Bold", fontSize=23, leading=31, textColor=NAVY, alignment=1, spaceAfter=8*mm))
s.add(ParagraphStyle(name="SubK", fontName="Malgun", fontSize=11, leading=17, textColor=GRAY, alignment=1, spaceAfter=7*mm))
s.add(ParagraphStyle(name="H1K", fontName="Malgun-Bold", fontSize=16, leading=23, textColor=NAVY, spaceBefore=3*mm, spaceAfter=4*mm, keepWithNext=True))
s.add(ParagraphStyle(name="H2K", fontName="Malgun-Bold", fontSize=11.5, leading=17, textColor=BLUE, spaceBefore=3*mm, spaceAfter=2*mm, keepWithNext=True))
s.add(ParagraphStyle(name="BodyK", fontName="Malgun", fontSize=9.2, leading=14.5, textColor=DARK, spaceAfter=2.5*mm))
s.add(ParagraphStyle(name="SmallK", fontName="Malgun", fontSize=8, leading=11.5, textColor=GRAY))
s.add(ParagraphStyle(name="HeadK", fontName="Malgun-Bold", fontSize=7.8, leading=11, textColor=DARK))
s.add(ParagraphStyle(name="TableK", fontName="Malgun", fontSize=7.8, leading=11, textColor=DARK))
s.add(ParagraphStyle(name="CodeK", fontName="Malgun", fontSize=8, leading=12, textColor=colors.HexColor("#17324D"), backColor=colors.HexColor("#F3F6F8"), leftIndent=3*mm, rightIndent=3*mm, borderPadding=2.5*mm))

def P(x, st="BodyK"): return Paragraph(x, s[st])
def code(x): return Preformatted(x, s["CodeK"])
def tbl(headers, rows, widths):
    data = [[Paragraph(str(x), s["HeadK"]) for x in headers]]
    data += [[Paragraph(str(x), s["TableK"]) for x in row] for row in rows]
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,0), LIGHT), ("GRID", (0,0), (-1,-1), .35, colors.HexColor("#B8C2CC")), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 2.2*mm), ("RIGHTPADDING", (0,0), (-1,-1), 2.2*mm), ("TOPPADDING", (0,0), (-1,-1), 2*mm), ("BOTTOMPADDING", (0,0), (-1,-1), 2*mm)]))
    return t
def box(title, text, bg=PALE):
    t = Table([[P(title, "HeadK")], [P(text, "SmallK")]], colWidths=[166*mm])
    t.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), bg), ("BOX", (0,0), (-1,-1), .6, colors.HexColor("#B8C2CC")), ("LEFTPADDING", (0,0), (-1,-1), 4*mm), ("RIGHTPADDING", (0,0), (-1,-1), 4*mm), ("TOPPADDING", (0,0), (-1,-1), 2.5*mm), ("BOTTOMPADDING", (0,0), (-1,-1), 2.5*mm)]))
    return t

def footer(canvas, doc):
    canvas.saveState(); canvas.setFont("Malgun", 7); canvas.setFillColor(GRAY)
    canvas.drawString(18*mm, 9*mm, "VM 2번 → VM 1번 실제 실습 명령어 초보자용")
    canvas.drawRightString(192*mm, 9*mm, str(doc.page)); canvas.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=15*mm, rightMargin=15*mm, topMargin=15*mm, bottomMargin=18*mm, title="VM2에서 VM1 실제 실습 명령어")
doc.addPageTemplates([PageTemplate(id="main", frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")], onPage=footer)])
story = []
story += [Spacer(1, 20*mm), P("VM 2번 → VM 1번", "TitleK"), P("실제 실습 명령어와 순서\n초보자가 한 줄씩 따라 하는 버전", "SubK"), box("이 문서의 목표", "VM 2번에서 필요한 서비스 파일과 디렉터리를 확인하고, VM 1번에 준비한 뒤 서비스를 하나씩 실행하여 시뮬레이터까지 확인합니다. 이 문서의 명령은 설명용 예시이며 대괄호 값은 실제 확인 후 바꿉니다.", GREEN), Spacer(1, 8*mm), box("중요", "이 문서는 VM 전체를 통째로 복사하는 방법이 아니라 서비스 환경을 재구성하는 방법입니다. VM 1번의 기존 Qdrant·PostgreSQL·Gitea 등은 먼저 보존 여부를 확인하고, Elasticsearch 정리나 데이터 초기화는 승인 전 실행하지 않습니다.", RED), PageBreak()]

story += [P("0. 시작 전에 알아둘 것", "H1K"), P("이 실습에서 VM 2번은 원본입니다. VM 1번은 목적지입니다. 먼저 VM 2번에서 보고 기록한 뒤, VM 1번에서 준비합니다."), tbl(["표시", "뜻"], [["[VM2_IP]", "VM 2번의 실제 IP"], ["[VM1_IP]", "VM 1번의 실제 IP"], ["[서비스폴더]", "ls 화면에서 확인한 실제 서비스 폴더명"], ["[추가디렉터리]", "팀장님이 지정한 logs·data 외 실제 폴더명"], ["[포트]", "해당 서비스가 사용하는 실제 포트"]], [48*mm, 118*mm]), box("진행 규칙", "명령 한 줄 입력 → 결과 읽기 → 이상 없으면 다음 명령. 모르는 결과가 나오면 멈추고 화면을 기록합니다.", YELLOW), PageBreak()]

story += [P("1. VM 2번에 접속하고 정체 확인", "H1K"), P("먼저 원본 VM 2번에 접속합니다. 접속한 뒤 다른 서버가 아닌지 확인합니다."), code("ssh admin@[VM2_IP]\nhostname\nhostname -I\npwd"), tbl(["명령", "한 조각씩 뜻", "기대 결과"], [["ssh admin@[VM2_IP]", "ssh = 원격 접속, admin = 사용자, @ 뒤 = 서버 주소", "VM 2번에 접속"], ["hostname", "서버 이름 표시", "VM 2번 이름"], ["hostname -I", "-I = IP 주소 표시", "VM 2번 IP"], ["pwd", "현재 폴더 주소 표시", "/home/admin 등"]], [43*mm, 83*mm, 40*mm]), box("확인", "hostname과 IP가 VM 2번 정보와 다르면 즉시 중단합니다. 지금부터 실행하는 명령은 현재 접속한 서버에서 실행됩니다.", RED), PageBreak()]

story += [P("2. VM 2번에서 /application 찾아가기", "H1K"), P("복잡한 검색 명령 대신 폴더를 직접 이동하면서 봅니다."), code("cd /application\npwd\nls\nls -l"), tbl(["명령", "뜻", "정상 모습"], [["cd /application", "application 폴더로 이동", "에러가 없음"], ["pwd", "현재 위치 확인", "/application"], ["ls", "안에 있는 이름 보기", "서비스처럼 보이는 폴더"], ["ls -l", "권한·소유자·크기까지 보기", "파일의 자세한 정보"]], [43*mm, 68*mm, 55*mm]), P("`cd`는 change directory입니다. `ls`에서 보이는 폴더 이름을 메모합니다. 예를 들어 `cms`, `master`, `engine`이라는 폴더가 보이면 실제 이름을 그대로 기록합니다. 이름을 추측하지 않습니다."), PageBreak()]

story += [P("3. 서비스 폴더 하나씩 확인", "H1K"), P("한 번에 모든 서비스를 보지 말고 하나만 확인합니다."), code("cd /application/[서비스폴더]\npwd\nls\nls -l"), tbl(["명령", "뜻", "확인할 것"], [["cd /application/[서비스폴더]", "실제 서비스 폴더로 이동", "pwd가 예상 경로인지"], ["pwd", "현재 위치 표시", "/application/서비스이름"], ["ls", "파일 이름 보기", "start·stop·JAR·설정파일"], ["ls -l", "권한과 소유자 보기", "실행권한과 admin 소유 여부"]], [59*mm, 55*mm, 52*mm]), box("[서비스폴더] 바꾸기", "대괄호를 포함해 입력하지 않습니다. 먼저 `ls`에서 실제 폴더가 `cms`인지 `cms-app`인지 확인하고, 그 실제 이름을 넣습니다.", YELLOW), PageBreak()]

story += [P("4. start/stop 스크립트 읽기", "H1K"), P("팀장님이 알려준 대로 서비스 실행 스크립트는 `/application` 아래에 있습니다. 실행 전에 반드시 내용을 읽습니다."), code("ls\ncat start.sh\ncat stop.sh\nless start.sh\n# less 화면에서 q를 눌러 나가기\nq"), tbl(["명령", "뜻", "주의"], [["cat start.sh", "start.sh 전체 내용을 화면에 표시", "짧은 파일에 사용"], ["cat stop.sh", "stop.sh 전체 내용을 화면에 표시", "종료·삭제 명령이 있는지 확인"], ["less start.sh", "긴 파일을 한 화면씩 읽기", "q를 눌러 종료"], ["q", "less에서 나가기", "서비스 명령이 아님"]], [49*mm, 70*mm, 47*mm]), P("start 스크립트에서 Java 위치, JAR 위치, 설정파일, 로그 경로, 다른 서비스 주소, 포트를 찾습니다. `java -jar`는 Java로 JAR를 실행한다는 뜻입니다. 원본 IP가 적혀 있으면 목적지에서 그대로 사용해도 되는지 확인합니다."), box("아직 실행하지 않기", "파일 내용을 이해하지 못했으면 `./start.sh`를 입력하지 않습니다. 특히 stop.sh 안에 kill·rm·초기화가 있으면 실행 전에 반드시 확인합니다.", RED), PageBreak()]

story += [P("5. VM 2번에서 압축할 세 폴더 확인", "H1K"), P("이번 연습에서 압축할 대상은 `logs`, `data`, `mariadb` 세 디렉터리입니다. 팀장님 조건에 따라 서비스는 중지하지 않고 운영 중인 상태 그대로 진행합니다."), code("cd /\npwd\nls\nls -ld logs data mariadb\nsudo du -sh /logs\nsudo du -sh /data\nsudo du -sh /mariadb"), tbl(["명령", "한 조각씩 뜻", "기대 결과"], [["cd /", "루트 폴더로 이동", "pwd가 /"], ["pwd", "현재 위치 확인", "/"], ["ls", "루트 아래 이름 보기", "logs·data·mariadb가 보이는지"], ["ls -ld logs data mariadb", "세 폴더 자체의 권한·소유자 보기", "세 폴더 존재 확인"], ["sudo du -sh /logs", "sudo=관리자, du=용량, -s=합계, -h=읽기 쉬운 단위", "logs 용량"], ["sudo du -sh /data", "관리자 권한으로 data 합계 용량 확인", "data 용량"], ["sudo du -sh /mariadb", "MariaDB 데이터 폴더의 합계 용량 확인", "mariadb 용량"]], [51*mm, 83*mm, 32*mm]), P("`mariadb` 폴더가 없다면 MariaDB 데이터가 `/var/lib/mysql`에 있을 수도 있습니다. 이 경우 마음대로 압축 대상을 바꾸지 말고 팀장님께 실제 데이터 경로를 확인합니다. 이번 방식은 무중단이므로 logs·data·mariadb가 압축 중에도 바뀔 수 있다는 점을 기록합니다."), PageBreak()]

story += [P("6. VM 1번의 기존 상태 기록", "H1K"), P("이제 새 터미널에서 VM 1번에 접속합니다. 목적지에는 이미 Qdrant, Elasticsearch, PostgreSQL, Gitea 등이 있을 수 있으므로 먼저 기록합니다."), code("ssh admin@[VM1_IP]\nhostname\nhostname -I\npwd\ndf -h\nsudo ss -lntp"), tbl(["명령", "뜻", "왜 하는가"], [["ssh admin@[VM1_IP]", "VM 1번에 원격 접속", "목적지에서 작업"], ["df -h", "디스크 전체 용량을 읽기 쉬운 단위로 표시", "압축 해제 공간 확인"], ["sudo ss -lntp", "LISTEN 중인 TCP 포트와 프로세스 표시", "기존 서비스와 포트 충돌 확인"]], [50*mm, 72*mm, 44*mm]), box("현재 목적지 정보", "xen01.01에는 Qdrant, xen01.02에는 Elasticsearch, xen01.03에는 PostgreSQL과 Gitea가 기록되어 있습니다. 실제 사용 여부와 백업 여부를 먼저 확인합니다.", RED), PageBreak()]

story += [P("7. VM 1번에 라이브러리 설치", "H1K"), P("앞 단계에서 전달받은 패키지를 목적지 VM 1번에 준비합니다. 이미 설치된 패키지는 다시 설치하지 않습니다."), code("sudo dnf install -y ncurses-compat-libs\njava -version\nrpm -q ncurses-compat-libs"), tbl(["명령", "뜻", "기대 결과"], [["sudo dnf install -y ncurses-compat-libs", "관리자 권한으로 dnf를 사용해 패키지 설치. -y는 질문에 자동 yes", "Complete! 또는 설치 완료"], ["java -version", "Java 버전 표시", "Java 1.8 계열"], ["rpm -q ncurses-compat-libs", "해당 패키지가 설치됐는지 조회", "패키지명과 버전 출력"]], [73*mm, 72*mm, 21*mm]), P("앞의 긴 패키지 목록에서 대부분 `already installed`였다면 이미 준비된 상태입니다. `ncurses-compat-libs`가 마지막에 따로 설치됐다면 그것까지 설치한 뒤 라이브러리 단계가 끝납니다."), PageBreak()]

story += [P("8. VM 2번에서 logs·data·mariadb 무중단 압축", "H1K"), P("팀장님 조건에 따라 MariaDB와 다른 서비스를 중지하지 않고 압축합니다. 먼저 세 폴더가 실제로 존재하는지 확인한 뒤 아래 명령을 실행합니다."), code("sudo tar -czpf /tmp/vm2_logs_data_mariadb.tar.gz /logs /data /mariadb\\\nls -lh /tmp/vm2_logs_data_mariadb.tar.gz\\\ntar -tzf /tmp/vm2_logs_data_mariadb.tar.gz"), tbl(["입력 부분", "뜻", "기대 결과"], [["sudo", "관리자 권한으로 실행", "권한 오류 감소"], ["tar", "파일과 폴더를 하나로 묶는 도구", "압축 작업 시작"], ["-c", "create, 새 압축파일 생성", "새 파일 생성"], ["-z", "gzip 방식으로 압축", ".tar.gz 파일"], ["-p", "원래 권한 보존", "권한 정보 유지"], ["-f", "뒤에 오는 이름을 압축파일명으로 사용", "지정 파일명 생성"], ["/tmp/vm2_logs_data_mariadb.tar.gz", "압축파일을 만들 위치와 이름", "/tmp 아래 파일"], ["/logs /data /mariadb", "압축에 넣을 세 폴더", "세 폴더 포함"], ["\\", "다음 줄도 같은 명령이라는 표시", "줄바꿈 입력 시 필요"], ["ls -lh", "파일 목록·상세정보·읽기 쉬운 단위", "압축파일 크기 확인"], ["tar -tzf", "압축을 풀지 않고 파일 목록만 보기", "내부 경로 확인"]], [49*mm, 75*mm, 42*mm]), P("무중단 압축에서는 압축하는 동안 파일이 계속 변경될 수 있습니다. 그래서 명령이 성공해도 MariaDB 데이터가 완벽히 한 시점으로 맞는다고 자동 보장되지는 않습니다. 이 연습에서는 팀장님 지시에 따라 압축하되, 목적지에서 서비스 기동·DB 무결성·시뮬레이터 기능을 반드시 확인합니다."), box("경고 메시지 해석", "`tar: Removing leading '/'`는 절대경로의 앞 `/`를 압축 안에서 제거한다는 안내입니다. 보통 오류가 아닙니다. 프롬프트가 돌아오고 별도 Error가 없다면 다음 확인 단계로 갑니다.", YELLOW), PageBreak()]

story += [P("9. 압축파일을 VM 1번으로 보내기", "H1K"), P("VM 2번에서 아래 명령을 실행합니다. `scp`는 파일 하나를 SSH로 복사하는 도구입니다. 이번에는 앞 단계에서 만든 logs·data·mariadb 압축파일을 보냅니다."), code("sha256sum /tmp/vm2_logs_data_mariadb.tar.gz\nscp /tmp/vm2_logs_data_mariadb.tar.gz admin@[VM1_IP]:/tmp/"), tbl(["명령", "뜻", "기대 결과"], [["sha256sum 파일", "파일의 지문을 계산", "원본 지문 기록"], ["scp", "SSH를 이용한 파일 복사", "전송 완료 후 프롬프트"], ["/tmp/vm2_logs_data_mariadb.tar.gz", "보낼 압축파일의 전체 경로", "전송 대상"], ["admin@[VM1_IP]", "VM 1번의 admin 계정과 주소", "목적지"], [":/tmp/", "목적지의 /tmp 폴더", "파일이 VM 1번 /tmp에 생김"]], [57*mm, 68*mm, 41*mm]), P("`scp`는 `/logs`, `/data`, `/mariadb`를 각각 따로 보내는 것이 아니라 세 폴더가 들어 있는 압축파일 하나를 보냅니다. `VM1_IP`는 실제 목적지 IP로 바꿉니다."), PageBreak()]

story += [P("10. VM 1번에서 전송 파일 확인·해제", "H1K"), P("VM 1번 터미널에서 실행합니다. 먼저 파일이 제대로 왔는지 확인합니다."), code("ls -lh /tmp/vm2_logs_data_mariadb.tar.gz\nsha256sum /tmp/vm2_logs_data_mariadb.tar.gz\ntar -tzf /tmp/vm2_logs_data_mariadb.tar.gz\n\n# 승인된 경우에만 해제\nsudo tar -xzpf /tmp/vm2_logs_data_mariadb.tar.gz -C /"), tbl(["명령", "뜻", "정상 결과"], [["ls -lh 파일", "파일 목록·크기·읽기 쉬운 단위", "파일 존재"], ["sha256sum", "전송된 파일 지문 계산", "VM 2번 지문과 동일"], ["tar -tzf", "압축 내부 목록만 보기", "logs·data·mariadb 포함"], ["-x", "extract, 압축 해제", "파일 복원"], ["-C /", "루트 폴더에서 해제", "원래 경로에 복원"]], [51*mm, 78*mm, 37*mm]), P("`sha256sum` 값이 원본과 같으면 전송된 압축파일 자체는 동일하다는 뜻입니다. `tar -tzf` 결과에 세 폴더가 보이는지 확인한 뒤에만 해제합니다."), box("해제는 변경 작업", "목적지의 기존 `/logs`, `/data`, `/mariadb` 파일을 덮어쓸 수 있습니다. 목적지 기존 데이터를 백업하고, Elasticsearch 등 겹치는 서비스의 처리 범위를 확인한 뒤 마지막 tar 명령을 실행합니다.", RED), PageBreak()]

story += [P("11. 권한과 파일 위치 확인", "H1K"), P("파일이 있어도 서비스 실행 사용자가 읽지 못하면 서비스가 실패합니다."), code("ls -ld /logs /data /mariadb\nls -l /application/[서비스폴더]\nps -ef\nsudo ss -lntp"), tbl(["명령", "뜻", "확인할 것"], [["ls -ld /logs /data /mariadb", "세 폴더 자체의 권한·소유자", "admin 또는 실제 실행 사용자 권한"], ["ls -l /application/...", "서비스 폴더 파일 목록", "start·stop·JAR·설정파일"], ["ps -ef", "실행 중인 모든 프로세스", "중복 실행 여부"], ["sudo ss -lntp", "열린 TCP 포트와 프로세스", "포트 충돌 여부"]], [55*mm, 67*mm, 44*mm]), P("권한을 바꾸는 `chown`, `chmod`는 실제 실행 사용자와 팀장님 기준을 확인한 뒤 사용합니다. 잘못 바꾸면 서비스가 읽던 파일을 못 읽거나 보안 권한이 약해질 수 있습니다."), PageBreak()]

story += [P("12. 설정파일은 백업 후 수정", "H1K"), P("목적지 서비스가 VM 2번 주소를 바라보지 않고 VM 1번의 올바른 서비스 주소를 바라보도록 설정을 확인합니다."), code("cd /application/[서비스폴더]\nls\ncat [설정파일]\ncp [설정파일] [설정파일].before-change\ngrep 'redis' [설정파일]\ngrep 'solr' [설정파일]\ngrep 'elasticsearch' [설정파일]"), tbl(["명령", "뜻", "주의"], [["cat 설정파일", "설정 전체를 읽음", "비밀번호가 보일 수 있음"], ["cp 원본 백업", "설정파일을 다른 이름으로 복사", "수정 전 백업"], ["grep 'redis' 파일", "redis가 들어간 줄만 검색", "연결 주소 확인"], ["grep 'solr' 파일", "solr 연결 설정 검색", "목적지 주소인지 확인"], ["grep 'elasticsearch' 파일", "ES 연결 설정 검색", "겹침 여부 확인"]], [54*mm, 73*mm, 39*mm]), box("수정 명령은 따로 확인", "이 문서에서는 정확한 설정 키와 목적지 주소를 모르므로 자동 치환 명령을 넣지 않았습니다. 먼저 설정을 읽고, 무엇을 어떤 값으로 바꿀지 확정한 뒤 수정합니다.", YELLOW), PageBreak()]

story += [P("13. MariaDB는 수동 실행", "H1K"), P("현재 기준으로 MariaDB에는 start/stop 스크립트가 없으므로 우선 수동 실행합니다. 실행 명령은 서버에 설치된 방식과 팀장님 절차를 확인해야 하므로 추측하지 않습니다."), code("# 먼저 MariaDB가 이미 실행 중인지 확인\nps -ef\nss -lntp\n\n# 설치된 실행 방법·데이터 경로를 확인한 뒤 담당자 절차로 수동 실행\n# 실행 후 다시 확인\nps -ef\nsudo ss -lntp\n\n# 애플리케이션 폴더로 이동\ncd /application\nls"), tbl(["확인", "정상 기대값", "이상하면"], [["ps -ef", "MariaDB 프로세스 확인", "수동 실행 방법을 확인"], ["ss -lntp", "DB 포트가 LISTEN", "로그·포트·실행 사용자 확인"], ["접속 시험", "담당자가 정한 계정으로 접속", "비밀번호를 문서에 적지 않음"]], [43*mm, 67*mm, 56*mm]), box("MariaDB 주의", "DB 디렉터리를 지우거나 덮어쓰지 않습니다. MariaDB가 정상인지 확인한 뒤 Master·Engine 같은 애플리케이션을 시작합니다.", RED), PageBreak()]

story += [P("14. 서비스 하나씩 시작", "H1K"), P("각 서비스 폴더에서 start 스크립트를 실행합니다. 실제 파일 이름은 `ls` 결과로 바꿉니다."), code("cd /application/[서비스폴더]\npwd\nls\ncat [start파일]\n./[start파일]\nps -ef\nsudo ss -lntp"), tbl(["순서", "명령", "무엇을 확인하나"], [["1", "cd /application/[서비스폴더]", "올바른 서비스 폴더"], ["2", "pwd", "현재 위치"], ["3", "ls", "start파일 존재"], ["4", "cat [start파일]", "실행 내용 이해"], ["5", "./[start파일]", "서비스 시작"], ["6", "ps -ef", "프로세스 실행"], ["7", "sudo ss -lntp", "포트 LISTEN"]], [18*mm, 70*mm, 78*mm]), P("한 서비스가 정상 확인되기 전에는 다음 서비스를 시작하지 않습니다. CMS만 먼저 켜고 내부 연결이 안 된다고 판단하지 말고, MariaDB·Redis·검색·ZooKeeper 같은 의존 서비스부터 확인합니다."), PageBreak()]

story += [P("15. 로그 확인", "H1K"), P("서비스가 시작된 것처럼 보여도 실제 오류가 로그에 남을 수 있습니다."), code("ls /logs\nls /logs/[서비스로그폴더]\ntail -n 50 /logs/[서비스로그파일]\n\n# systemd로 관리되는 서비스라면\njournalctl -u [서비스명] -n 50 --no-pager"), tbl(["명령", "뜻", "기대값"], [["ls /logs", "로그 폴더 목록", "서비스 로그 위치"], ["tail -n 50 파일", "파일 마지막 50줄 보기", "최근 실행 결과"], ["journalctl -u", "특정 systemd 서비스 로그", "최근 오류·시작 기록"], ["--no-pager", "넘김 화면 없이 표시", "한 번에 결과 확인"]], [54*mm, 74*mm, 38*mm]), P("로그에서 `ERROR`, `Exception`, `Connection refused`, `timeout`, `permission denied`를 확인합니다. 오류가 있으면 마지막 줄만 보지 말고 처음 발생한 오류를 찾습니다."), PageBreak()]

story += [P("16. HTTP·포트 확인", "H1K"), P("프로세스와 포트가 정상이어도 HTTP 요청이 실패할 수 있습니다. 내부에서 먼저 확인합니다."), code("curl -i --max-time 5 http://127.0.0.1:[포트]/\nsudo ss -lntp | grep ':[포트]'"), tbl(["부분", "뜻"], [["curl", "웹 요청을 보내는 도구"], ["-i", "응답 헤더도 같이 표시"], ["--max-time 5", "최대 5초만 기다림"], ["127.0.0.1", "현재 서버 자신"], ["|", "앞 결과를 뒤 명령으로 전달"], ["grep ':[포트]'", "특정 포트 줄만 골라 표시"]], [46*mm, 122*mm]), box("401은 죽은 것이 아닐 수 있음", "HTTP 401은 서버가 요청을 받았지만 인증이 필요하다는 뜻일 수 있습니다. connection refused는 해당 포트에 듣는 프로세스가 없을 가능성이 큽니다.", YELLOW), PageBreak()]

story += [P("17. 시뮬레이터 확인", "H1K"), P("서비스가 모두 실행된 뒤 실제 업무 흐름을 확인합니다."), tbl(["시험", "확인할 것", "관련 서비스"], [["CMS 접속", "화면이 열리고 로그인 가능", "HAProxy·CMS"], ["학습 배포", "필요한 Redis 상태가 생성·조회", "Master·Engine·Redis"], ["봇 생성", "Solr collection 또는 검색 구조 생성·조회", "CMS·Solr·ZooKeeper"], ["검색", "문서·벡터 검색 결과", "Solr/ES·Qdrant"], ["저장", "업무 데이터가 DB에 저장", "MariaDB/PostgreSQL"], ["로그 확인", "중요 오류가 없는지", "모든 서비스"]], [32*mm, 83*mm, 53*mm]), P("‘Redis는 학습 배포 때 생길 수 있다’, ‘Solr collection은 봇을 만들 때 생길 수 있다’는 말은 모든 데이터를 미리 복사하지 않아도 된다는 뜻이 아닙니다. 서비스 연결이 정상이고 애플리케이션이 생성 작업을 할 수 있을 때 자동으로 만들어질 수 있다는 뜻입니다."), PageBreak()]

story += [P("18. 문제가 생기면 이 순서로 멈추기", "H1K"), P("무작정 재실행하거나 초기화하지 말고 아래 순서로 확인합니다."), tbl(["순서", "질문", "확인 명령"], [["1", "파일이 있는가?", "ls, pwd"], ["2", "권한이 맞는가?", "ls -l"], ["3", "스크립트 내용이 이해되는가?", "cat, less"], ["4", "프로세스가 떴는가?", "ps -ef"], ["5", "포트가 열렸는가?", "sudo ss -lntp"], ["6", "로그 첫 오류는?", "tail, journalctl"], ["7", "의존 서비스가 정상인가?", "DB·Redis·Solr·ZK·ES·Qdrant 확인"]], [18*mm, 82*mm, 68*mm]), box("중단해야 하는 경우", "데이터 삭제·초기화·cluster reset·Elasticsearch 제거·방화벽 변경·원본 파일 덮어쓰기가 필요한 상황이면 여기서 멈추고 팀장님께 확인합니다.", RED), PageBreak()]

story += [P("19. 오늘의 실제 첫 단계", "H1K"), P("처음부터 압축하지 않습니다. 오늘은 VM 2번에서 아래 네 줄만 입력하고 결과를 기록하는 것으로 시작합니다."), code("hostname\nhostname -I\npwd\nls"), tbl(["입력", "내가 확인해야 하는 것"], [["hostname", "내가 VM 2번에 있는가"], ["hostname -I", "VM 2번 IP가 무엇인가"], ["pwd", "현재 어느 폴더인가"], ["ls", "현재 폴더에 무엇이 있는가"]], [45*mm, 123*mm]), P("그 다음에 아래 네 줄을 입력합니다."), code("cd /application\npwd\nls\nls -l"), P("여기까지 결과를 보내주면, 다음에는 실제로 보이는 서비스 폴더 이름을 기준으로 한 단계씩 진행할 수 있습니다. 지금은 폴더 이름을 추측하지 않는 것이 가장 중요합니다."), box("완료 기준", "VM 2번 확인 → /application 목록 확인 → 서비스 폴더 하나 선택 → start/stop 스크립트와 JAR·설정파일 이름 기록. 이 네 가지가 끝나면 다음 단계로 넘어갑니다.", GREEN)]

doc.build(story)
print(str(OUT))
