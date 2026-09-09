def deep_explanation(title: str) -> str:
    """A second teaching layer: concrete inputs, actions, outputs and pitfalls."""
    t = title.lower()
    if "mariadb" in t or "db" in t:
        return '''
        <p><strong>들어오는 자료:</strong> source DB의 현재 데이터, target DB의 table 구조, Scheduler가 건드리는 table 목록, 그리고 승인된 적용 범위입니다. DB는 단순한 파일 창고가 아니라 여러 프로그램이 계속 읽고 쓰는 업무 장부이므로, ‘파일이 복사됐나’보다 ‘어떤 행이 같은가’를 확인합니다.</p>
        <p><strong>실제 흐름:</strong> 먼저 읽기 명령으로 접속·table·행 수·진행 중 작업을 확인합니다. 그다음 writer와 Scheduler를 멈추고 source에서 승인된 data-only INSERT SQL을 만듭니다. target에서는 승인된 범위만 preclear하고 INSERT한 뒤 source와 count·기본키·checksum을 비교합니다. 나머지 업무 원본 table은 건드리지 않는 것이 기본입니다.</p>
        <ol><li><strong>읽기:</strong> DB가 살아 있고 구조가 맞는지 봅니다.</li><li><strong>고정:</strong> 더 이상 행이 변하지 않도록 writer를 멈춥니다.</li><li><strong>적용:</strong> A그룹 전량 또는 B그룹 후보 PK만 처리합니다.</li><li><strong>비교:</strong> 다르면 성공으로 보지 않고 멈춥니다.</li></ol>
        <p><strong>가장 중요한 이유:</strong> MyISAM에서는 실패하면 DB가 자동으로 원래 상태로 돌아온다고 가정하면 안 됩니다. 따라서 지우기 전에 before-image와 원복 INSERT SQL을 먼저 준비합니다.</p>'''
    if "redis" in t:
        return '''
        <p><strong>들어오는 자료:</strong> Redis 노드의 주소·port·master/replica 역할·node ID·slot 상태와 AOF/RDB 파일 정보입니다. Redis가 cache만 저장하는지, 로그인 세션·queue·업무 상태도 저장하는지는 애플리케이션 설정으로 확인합니다.</p>
        <p><strong>실제 흐름:</strong> <code>PONG</code>은 한 노드가 대답했다는 뜻이고, <code>cluster_state:ok</code>와 모든 slot 정상은 집단 전체가 일할 준비가 됐다는 뜻입니다. 기존 cluster 재결합이 안전하면 유지하고, 주소·node ID·slot이 꼬이면 빈 3 master/3 replica를 구성한 뒤 cache를 다시 만듭니다.</p>
        <ol><li>노드와 역할을 기록합니다.</li><li>source와 target이 동시에 같은 cluster가 되지 않게 합니다.</li><li>재결합 또는 새 cluster 중 하나를 선택합니다.</li><li>cache 재생성 뒤 TTL·대표 기능을 확인합니다.</li></ol>
        <p><strong>주의:</strong> ‘Redis니까 지워도 된다’가 아닙니다. cache라면 다시 만들 수 있지만 세션·queue라면 초기화가 곧 업무 영향일 수 있으므로 담당자 승인이 필요합니다.</p>'''
    if "solr" in t or "zookeeper" in t:
        return '''
        <p><strong>들어오는 자료:</strong> ZooKeeper ensemble 주소와 myid, Solr node 주소, configset, collection 목록, shard·replica·leader·alias 정보입니다. ZooKeeper는 SolrCloud의 조정자이고 Solr는 실제 검색 문서를 제공하므로 둘을 한 세트로 봅니다.</p>
        <p><strong>실제 흐름:</strong> 새 ZooKeeper가 quorum을 만든 뒤 검색 규칙인 configset을 올립니다. 그다음 source의 모든 collection을 하나씩 BACKUP/RESTORE합니다. 복원 후에는 이름만 보지 않고 leader·replica·alias·문서 수·대표 한국어 검색을 확인합니다.</p>
        <ol><li>새 ZK ensemble을 준비합니다.</li><li>Solr가 새 ZK를 보게 합니다.</li><li>configset과 collection을 복원합니다.</li><li>shard·replica·leader·alias·검색을 검사합니다.</li></ol>
        <p><strong>자주 하는 착각:</strong> Solr 8983 port가 열려 있어도 collection이나 leader가 없으면 검색 시스템은 완성되지 않은 것입니다. ZK의 <code>ruok</code> 응답도 프로세스 생존 확인일 뿐 quorum 전체 정상 판정은 아닙니다.</p>'''
    if "elasticsearch" in t:
        return '''
        <p><strong>들어오는 자료:</strong> Elasticsearch node·cluster 정보, index·shard·alias 목록, Snapshot repository, template·pipeline·ILM·SLM 정책입니다. Elasticsearch는 index를 여러 shard로 나누어 저장하므로 data 폴더를 일반 파일처럼 복사하지 않습니다.</p>
        <p><strong>실제 흐름:</strong> target에서 새 빈 cluster를 준비하고 repository를 등록한 뒤 성공한 Snapshot을 restore합니다. 복원 후 cluster health·node·index·shard를 보고, 정책 객체는 별도로 비교합니다. <code>green</code>은 shard 배치가 정상이라는 뜻이지 업무 검색까지 자동 보장한다는 뜻은 아닙니다.</p>
        <ol><li>새 cluster와 repository를 준비합니다.</li><li>필요한 snapshot과 index를 복원합니다.</li><li>template·pipeline·ILM·SLM을 따로 확인합니다.</li><li>대표 검색·정렬·aggregation·재기동을 시험합니다.</li></ol>
        <p><strong>raw data 폴더를 피하는 이유:</strong> 그 안에는 cluster UUID와 shard 상태 같은 내부 정보가 들어 있어 버전·노드·시점이 맞지 않으면 cluster가 깨질 수 있습니다.</p>'''
    if "vmware" in t or "target" in t or "부팅" in t or "r0" in t or "m0" in t:
        return '''
        <p><strong>들어오는 자료:</strong> source VM의 CPU·RAM·디스크·NIC·OS·서비스와 target host의 저장공간·네트워크·자원입니다. VM은 가상 CPU·메모리·디스크·네트워크 카드를 가진 컴퓨터입니다.</p>
        <p><strong>실제 흐름:</strong> 가상화 담당자가 VM을 복사하거나 export/import합니다. 복사본을 처음 켤 때는 원본과 다른 임시 IP·hostname을 사용합니다. 부팅 후 OS·mount·/data·자동기동 서비스·Scheduler 상태를 확인합니다.</p>
        <ol><li>source 상태와 백업을 고정합니다.</li><li>target 저장소와 network를 확인합니다.</li><li>VM을 복사·인수합니다.</li><li>임시 주소로 격리 부팅합니다.</li><li>원본과 충돌이 없는지 확인합니다.</li></ol>
        <p><strong>비유:</strong> VM 복사는 집 전체를 새 동네에 복사하는 일입니다. 주소판과 전화번호가 예전 집과 같으면 우편과 전화가 섞이므로, 새 주소를 붙이고 손님을 받기 전까지 격리합니다.</p>'''
    if "scheduler" in t or "job" in t or "컷오버" in t:
        return '''
        <p><strong>들어오는 자료:</strong> Scheduler 실행 node, 실행 주기, job 이름, 대상 DB·Solr·Redis·Elasticsearch, 진행 중 job 목록입니다. Scheduler는 사람이 버튼을 누르지 않아도 시간에 맞춰 일하는 자동 직원입니다.</p>
        <p><strong>실제 흐름:</strong> source와 target의 자동 직원이 동시에 출근하지 않게 합니다. 진행 중 job이 끝났는지 확인하고 source Scheduler를 중지합니다. 리허설에서는 승인된 한 대만 제한 기동하고 배포·ES 로그 삭제 job은 별도 승인합니다.</p>
        <ol><li>실제 실행 node를 찾습니다.</li><li>진행 중·예약 job을 확인합니다.</li><li>source Scheduler를 멈춥니다.</li><li>target 한 대에서 필요한 job만 시험합니다.</li><li>DB·검색·cache 변화를 비교합니다.</li></ol>
        <p><strong>큰 위험:</strong> 101·102·103이 동시에 실행되면 같은 통계나 배포가 중복될 수 있습니다. 그래서 Scheduler는 전체 검증의 마지막에 한 대만 켭니다.</p>'''
    if "네트워크" in t or "cms" in t or "gateway" in t:
        return '''
        <p><strong>들어오는 자료:</strong> 사용자가 입력하는 이름, 이름이 가리키는 IP, HAProxy 수신 port, backend port, 방화벽과 route입니다. 연결은 주소·문·길·프로그램 대화가 모두 맞아야 성립합니다.</p>
        <p><strong>현재 CMS 예:</strong> Windows hosts의 <code>cms</code>가 192.168.1.101을 가리키고, HAProxy가 80번에서 받은 요청을 CMS backend의 8280으로 보냅니다. 서버 안 <code>127.0.0.1:8280</code>에서 401이 나온 것은 CMS가 살아 있고 인증을 요구한다는 뜻입니다.</p>
        <ol><li>이름이 어느 IP로 풀리는지 확인합니다.</li><li>수신 port가 LISTEN인지 봅니다.</li><li>route·방화벽을 확인합니다.</li><li>Host header와 proxy backend를 확인합니다.</li><li>HTTP 응답과 애플리케이션 로그를 같이 봅니다.</li></ol>
        <p><strong>구분:</strong> hosts는 이름→IP 주소록, 환경변수는 프로그램 설정값, HAProxy는 요청을 backend로 전달하는 중간 문입니다. 서로 대체할 수 없습니다.</p>'''
    if "백업" in t or "snapshot" in t or "b0" in t or "b1" in t:
        return '''
        <p><strong>들어오는 자료:</strong> 원본의 현재 상태, 백업 저장 위치, 생성 시각, checksum, 복원 방법입니다. 백업은 파일 한 개를 복사하는 행동이 아니라 실패했을 때 돌아갈 지점을 만드는 일입니다.</p>
        <p><strong>B0와 B1:</strong> B0는 리허설 전 복원 연습용이고, B1은 최종 전환 직전 writer와 Scheduler를 멈춘 뒤 마지막 변경분을 고정하는 용도입니다. 이름이 비슷해도 시점과 목적이 다릅니다.</p>
        <ol><li>백업 대상을 정합니다.</li><li>파일·시각·크기를 기록합니다.</li><li>SHA-256으로 변조 여부를 봅니다.</li><li>target에서 실제 복원합니다.</li><li>성공·실패와 승인을 남깁니다.</li></ol>
        <p><strong>초보자 원칙:</strong> ‘백업 성공’ 메시지만 믿지 말고 목록·checksum·복원 결과까지 확인합니다.</p>'''
    if "go/no-go" in t or "롤백" in t:
        return '''
        <p><strong>들어오는 자료:</strong> 통과 기준, 중단 기준, 책임자, source 보존 상태, target의 write 발생 여부입니다. GO는 다음 단계 진행 승인이고 NO-GO는 해결될 때까지 멈추는 신호입니다.</p>
        <p><strong>실제 롤백:</strong> 오류를 기록하고 신규 요청을 막은 뒤 target Scheduler와 writer를 중지합니다. target write가 없으면 L4·DNS·VIP를 source로 되돌립니다. write가 있었다면 데이터 충돌을 먼저 판단합니다.</p>
        <ol><li>오류 기준과 로그를 기록합니다.</li><li>target 요청을 막습니다.</li><li>target write를 멈춥니다.</li><li>source 경로를 복구합니다.</li><li>사용자 업무를 재검증합니다.</li></ol>
        <p><strong>중요:</strong> 전환 후 target에 쓰기가 있었다면 주소만 되돌리는 것으로는 최신 입력을 보존할 수 없습니다.</p>'''
    if "리허설" in t or "시험" in t or "t0" in t:
        return '''
        <p><strong>들어오는 자료:</strong> 테스트 IP, 테스트 계정, 입력 데이터, 기대 결과, 로그 위치, PASS/FAIL 기준입니다. 기준이 없으면 화면 하나 뜬 것을 성공으로 착각합니다.</p>
        <p><strong>실제 흐름:</strong> VM·OS → port → 제품 health → 애플리케이션 API → 로그인·검색·배포·챗봇 → 시뮬레이터 순서로 시험합니다. 실패하면 다음 단계로 넘어가지 않고 그때의 로그와 설정을 저장합니다.</p>
        <ol><li>프로세스가 실행 중인지 확인합니다.</li><li>port가 열렸는지 확인합니다.</li><li>API와 cluster를 확인합니다.</li><li>업무 시나리오를 실행합니다.</li><li>장애 후 복구도 시험합니다.</li></ol>
        <p><strong>PASS의 뜻:</strong> 명령어가 끝났다는 뜻이 아니라 예상한 데이터·화면·로그·응답이 나온다는 뜻입니다.</p>'''
    if "역할" in t or "변수" in t or "사전조건" in t:
        return '''
        <p><strong>들어오는 자료:</strong> 작업자·승인자·Xen 관리자·DB 담당자·애플리케이션 담당자의 연락처, 실제 주소·UUID·백업 경로입니다.</p>
        <p><strong>실제 흐름:</strong> 누가 해도 된다고 승인하는지, 누가 결과를 판단하는지, 누가 source로 돌릴지를 적습니다. IP·UUID를 추측해서 변수표를 채우지 않습니다.</p>
        <ol><li>사람의 역할을 정합니다.</li><li>서버·저장소 식별자를 확정합니다.</li><li>승인 게이트를 정합니다.</li><li>실행 기록 양식을 준비합니다.</li></ol>
        <p><strong>멈춤 조건:</strong> 담당자·target 주소·백업 경로·rollback 방법 중 하나라도 없으면 명령을 칠 수 있어도 시작하지 않습니다.</p>'''
    if "애플리케이션" in t or "기동" in t:
        return '''
        <p><strong>들어오는 자료:</strong> DB·Redis·검색 서비스 health 결과, JAR, 환경변수, 설정파일, 실행 사용자, 서비스 의존관계입니다. 애플리케이션은 다른 서비스에 전화를 거는 프로그램입니다.</p>
        <p><strong>실제 흐름:</strong> 데이터 서비스가 준비된 뒤 Master·Engine·Gateway·CMS·Chat UI를 연결합니다. 각 서비스마다 프로세스·port·API·로그를 확인하고 source 주소를 보고 있지 않은지 검색합니다.</p>
        <ol><li>파일과 설정 주소를 확인합니다.</li><li>의존 서비스가 정상인지 봅니다.</li><li>한 서비스씩 기동합니다.</li><li>API와 업무 흐름을 검증합니다.</li></ol>
        <p><strong>기억할 점:</strong> <code>systemctl active</code>는 1차 신호일 뿐입니다. 실제 성공은 API·연결·로그인·검색·시뮬레이터까지 확인해야 합니다.</p>'''
    # 특정 제품이나 단계에 해당하지 않는 제목에는 공통 설명을 반복하지 않는다.
    # 해당 단계의 원문과 EXPLANATIONS 설명만 보여 주어 문서 후반부의 중복을 줄인다.
    return ''
