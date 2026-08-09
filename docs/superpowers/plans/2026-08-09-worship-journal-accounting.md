# 예배일지 회계 입력 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 엑셀 업로드 또는 Google Sheet 링크에서 선택 날짜의 감사헌금을 읽어 기존 예배일지에 미리보기하고 로컬 저장한다.

**Architecture:** `lib/worship-journal-accounting.ts`가 XLS/XLSX 워크북 선택과 감사헌금 정규화를 전담한다. 예배일지 API는 원본 파일을 확보해 파서에 전달하고, React 화면은 회계 원본 탭과 정규화된 결과만 다룬다.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, SheetJS `xlsx`, Node 검증 스크립트, Tailwind CSS

## Global Constraints

- 회계 원본은 `.xlsx`/`.xls` 업로드와 Google Sheet URL을 모두 지원한다.
- 한 번 실행할 때 `excel` 또는 `google-sheet` 중 하나만 사용한다.
- 감사헌금만 읽으며 주일헌금이나 헌금 총계는 개인 내역에 포함하지 않는다.
- 감사내용이 있는 항목을 가나다순으로 먼저, 없는 항목을 가나다순으로 다음에 배치한다.
- DB와 별도 서버를 추가하지 않는다.
- 기존 회계 필드 없는 저장 일지를 계속 표시한다.
- 데스크톱 패키징 관련 미커밋 파일은 회계 기능 커밋에 포함하지 않는다.

---

## 파일 구조

- Create: `lib/worship-journal-accounting.ts` — 워크북 날짜 선택, 감사헌금 추출, 정렬, 합계, Google 원본 URL 후보 생성
- Create: `scripts/accounting/verify-accounting-parser.js` — 실제 회계 표 모양으로 파서와 오류를 검증
- Create: `docs/workflows/worship-journal/accounting/README.md` — 회계 기능만 수정할 때 필요한 입력 규칙과 검증 명령
- Modify: `lib/worship-journal.ts` — 예배일지에 선택적 `accounting` 필드와 회계 원본 메타데이터 추가
- Modify: `app/api/worship-journals/route.ts` — 선택된 회계 원본을 읽고 파서 결과를 저장 객체에 결합
- Modify: `components/worship-journal-builder.tsx` — 회계 원본 탭, 파일·URL 입력, 감사헌금 미리보기 추가
- Modify: `app/worship-journal/page.tsx` — 설명 문구에 회계 자료 포함
- Modify: `package.json` — `verify:accounting` 명령 추가

### Task 1: 감사헌금 워크북 파서

**Files:**
- Create: `scripts/accounting/verify-accounting-parser.js`
- Create: `lib/worship-journal-accounting.ts`

**Interfaces:**
- Produces: `parseAccountingWorkbook(buffer: Buffer, date: string, source: AccountingSourceMeta): JournalAccounting`
- Produces: `accountingDownloadUrls(url: string): string[]`
- Produces: `ThanksgivingOffering`, `JournalAccounting`, `AccountingSourceMeta`

- [ ] **Step 1: 실패하는 파서 검증 작성**

검증 스크립트는 `typescript.transpileModule`로 실제 TypeScript 모듈을 불러오고, SheetJS로 다음 워크북을 만든다.

```js
const rows = [
  ["", "2026.06.28헌금"],
  ["", "NO.", "주일헌금", "", "NO.", "감사헌금", "", ""],
  ["", "온라인", "", "", "온라인", "", "", "감사 내용"],
  ["", 1, "김건우", 10000, 1, "구자연", 10000, "모든 것이 감사합니다."],
  ["", 2, "김대완", 120000, 2, "우재황", 500000, ""],
  ["", "온라인 계", "", 130000, "온라인 계", "", 510000, ""],
  ["", "현장", "", "", "현장", "", "", "감사 내용"],
  ["", 1, "김다정", 10000, 1, "박대성", 50000, ""],
  ["", 2, "김이레", 10000, 2, "박찬호", 50000, "상반기 마침 감사"],
  ["", "현장 계", "", 20000, "현장 계", "", 100000, ""],
  ["", "주일헌금 총계", "", 150000, "감사헌금 총계", "", 610000, ""]
];
```

다음을 각각 단언한다.

```js
assert.equal(result.sheetTab, "6월 마지막");
assert.equal(result.total, 610000);
assert.deepEqual(result.thanksgiving.map(({ name }) => name), ["구자연", "박찬호", "박대성", "우재황"]);
assert.equal(result.thanksgiving[0].note, "모든 것이 감사합니다.");
assert.equal(result.thanksgiving[2].note, "");
```

오른쪽에 있는 동일 날짜 탭 선택, 쉼표·원 기호 금액, 날짜 탭 없음, 감사헌금 표제 없음도 별도 단언한다.

- [ ] **Step 2: 검증이 기능 부재로 실패하는지 실행**

Run: `node scripts/accounting/verify-accounting-parser.js`

Expected: FAIL because `lib/worship-journal-accounting.ts` does not exist.

- [ ] **Step 3: 최소 파서 구현**

`lib/worship-journal-accounting.ts`에 다음 공개 타입과 함수를 만든다.

```ts
export type ThanksgivingOffering = { name: string; amount: number; note: string };
export type AccountingSourceMeta = {
  sourceType: "excel" | "google-sheet";
  sourceName: string;
};
export type JournalAccounting = AccountingSourceMeta & {
  sheetTab: string;
  total: number;
  thanksgiving: ThanksgivingOffering[];
};
export function accountingDownloadUrls(url: string): string[];
export function parseAccountingWorkbook(
  buffer: Buffer,
  date: string,
  source: AccountingSourceMeta
): JournalAccounting;
```

구현 규칙은 다음과 같다.

```ts
const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: "" });
const dateScope = [sheetName, ...rows.slice(0, 8).flat()].join(" ");
const headerCell = rows.flatMap((row, rowIndex) => row.map((value, columnIndex) => ({ rowIndex, columnIndex, value })))
  .find(({ value }) => String(value).replace(/\s+/g, "").includes("감사헌금"));
```

표제 열을 이름 열로, 오른쪽 한 칸을 금액 열로, 오른쪽 두 칸을 감사내용 열로 사용한다. `온라인`, `현장`, `온라인 계`, `현장 계`, `감사헌금 총계`, `합계`, `소계`는 제외한다. 금액이 양수이고 이름이 있는 행만 항목으로 만든 뒤 `note 존재 여부 → name.localeCompare(name, "ko-KR")` 순서로 정렬한다.

- [ ] **Step 4: 파서 검증 통과 확인**

Run: `node scripts/accounting/verify-accounting-parser.js`

Expected: PASS with a summary for date selection, four normalized offerings, total, and errors.

- [ ] **Step 5: 파서 변경 커밋**

```powershell
git add -- lib/worship-journal-accounting.ts scripts/accounting/verify-accounting-parser.js
git commit -m "feat: parse thanksgiving offerings from workbooks"
```

### Task 2: 회계 원본을 예배일지 API에 연결

**Files:**
- Modify: `lib/worship-journal.ts`
- Modify: `app/api/worship-journals/route.ts`

**Interfaces:**
- Consumes: `accountingDownloadUrls`, `parseAccountingWorkbook`, `JournalAccounting`
- Produces: `WorshipJournal.accounting?: JournalAccounting`
- Consumes form fields: `accountingSourceType`, `accountingFile`, `accountingSheetUrl`

- [ ] **Step 1: API 입력 계약 검증을 파서 스크립트에 추가**

`accountingDownloadUrls`가 Office 파일용 Drive 다운로드와 네이티브 Sheet용 XLSX export 후보를 모두 반환하고, 잘못된 URL은 `올바른 Google Sheet 링크` 오류를 내는지 단언한다.

```js
assert.deepEqual(accountingDownloadUrls(sheetUrl), [
  `https://drive.google.com/uc?export=download&id=${id}`,
  `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`
]);
assert.throws(() => accountingDownloadUrls("https://example.com"), /올바른 Google Sheet 링크/);
```

- [ ] **Step 2: 새 단언이 실패하는지 실행**

Run: `node scripts/accounting/verify-accounting-parser.js`

Expected: FAIL until URL candidate behavior matches the contract.

- [ ] **Step 3: 예배일지 모델과 POST 처리 구현**

`WorshipJournal`에 선택 필드를 추가한다.

```ts
accounting?: JournalAccounting;
```

API는 `accountingSourceType`이 `excel`일 때 `.xlsx`/`.xls` 파일과 15MB 제한을 검증한다. `google-sheet`일 때 URL 후보를 순서대로 요청하고, HTML 응답·빈 응답·워크북 파싱 실패는 다음 후보로 넘긴다. 모든 후보가 실패하면 공유 권한과 다운로드 권한을 확인하라는 오류를 반환한다. 최종 `journal` 객체에 파서 결과를 결합하되 저장은 모든 분석이 성공한 뒤 한 번만 수행한다.

- [ ] **Step 4: 파서·타입 검사 실행**

Run: `node scripts/accounting/verify-accounting-parser.js`

Expected: PASS.

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 5: API 변경 커밋**

```powershell
git add -- lib/worship-journal.ts app/api/worship-journals/route.ts
git commit -m "feat: attach accounting data to worship journals"
```

### Task 3: 회계 입력 탭과 감사헌금 미리보기

**Files:**
- Modify: `components/worship-journal-builder.tsx`
- Modify: `app/worship-journal/page.tsx`
- Modify: `scripts/accounting/verify-accounting-parser.js`

**Interfaces:**
- Consumes: `WorshipJournal.accounting?: JournalAccounting`
- Sends: `accountingSourceType`, and exactly one of `accountingFile` or `accountingSheetUrl`

- [ ] **Step 1: 화면 계약 정적 검증 추가**

검증 스크립트가 컴포넌트 원문에서 다음 접근 가능한 문구와 FormData 키를 확인하도록 한다.

```js
for (const marker of [
  "회계 자료",
  "엑셀 파일",
  "Google Sheet",
  "감사헌금",
  "accountingSourceType",
  "accountingFile",
  "accountingSheetUrl"
]) assert.ok(componentSource.includes(marker), `missing UI marker: ${marker}`);
```

- [ ] **Step 2: 화면 계약 검증이 실패하는지 실행**

Run: `node scripts/accounting/verify-accounting-parser.js`

Expected: FAIL with `missing UI marker: 회계 자료`.

- [ ] **Step 3: 입력과 미리보기 구현**

상태는 다음처럼 둔다.

```ts
const [accountingSourceType, setAccountingSourceType] = useState<"excel" | "google-sheet">("excel");
const [accountingFile, setAccountingFile] = useState<File | null>(null);
const [accountingSheetUrl, setAccountingSheetUrl] = useState(ACCOUNTING_SHEET);
```

기존 입력 카드 사이에 새 회계 카드를 추가한다. 두 탭 버튼은 `type="button"`, `aria-pressed`, 선택 색상을 가지며, 파일 탭은 `.xlsx,.xls`만 선택한다. 링크 탭은 제공된 회계 URL을 기본값으로 사용한다. `canRun`은 현재 선택한 회계 원본이 있을 때만 참이 된다. 제출 시 선택되지 않은 원본은 FormData에 넣지 않는다.

미리보기에는 `journal.accounting`이 있을 때만 다음 구조를 표시한다.

```tsx
<section aria-labelledby="thanksgiving-title">
  <h3 id="thanksgiving-title">감사헌금</h3>
  <strong>{journal.accounting.total.toLocaleString("ko-KR")}원</strong>
  {journal.accounting.thanksgiving.map((offering) => (
    <p key={`${offering.name}-${offering.amount}-${offering.note}`}>
      {offering.name} ({offering.amount.toLocaleString("ko-KR")}원){offering.note ? ` ${offering.note}` : ""}
    </p>
  ))}
</section>
```

기존 종이 문서형 색상과 테두리를 유지하고, 모바일 한 열·데스크톱 두 열에서 읽히도록 구성한다. 안내 카드의 자동화 항목에도 `감사헌금 자동 정리`를 추가한다.

- [ ] **Step 4: 화면 계약·타입·빌드 확인**

Run: `node scripts/accounting/verify-accounting-parser.js`

Expected: PASS.

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm run build`

Expected: exit 0 and `/worship-journal` plus `/api/worship-journals` are generated.

- [ ] **Step 5: 화면 변경 커밋**

```powershell
git add -- components/worship-journal-builder.tsx app/worship-journal/page.tsx scripts/accounting/verify-accounting-parser.js
git commit -m "feat: add accounting controls to worship journal"
```

### Task 4: 독립 문서와 최종 검증

**Files:**
- Create: `docs/workflows/worship-journal/accounting/README.md`
- Modify: `package.json`

**Interfaces:**
- Produces npm command: `npm run verify:accounting`

- [ ] **Step 1: 회계 전용 문서 작성**

문서에는 수정 범위, 두 입력 방식, 날짜 탐색 순서, 감사헌금 열 규칙, 오류 문구, 검증 명령을 기록한다. 회계 작업자는 이 문서와 아래 네 파일만 읽으면 되도록 명시한다.

```text
lib/worship-journal-accounting.ts
app/api/worship-journals/route.ts
components/worship-journal-builder.tsx
scripts/accounting/verify-accounting-parser.js
```

- [ ] **Step 2: npm 검증 명령 연결**

`package.json` scripts에 다음 한 줄을 추가한다.

```json
"verify:accounting": "node scripts/accounting/verify-accounting-parser.js"
```

- [ ] **Step 3: 전체 검증 실행**

Run: `npm run verify:accounting`

Expected: PASS.

Run: `npm run typecheck`

Expected: exit 0.

Run: `npm run build`

Expected: exit 0.

Run: `git diff --check HEAD~3..HEAD`

Expected: no whitespace errors.

- [ ] **Step 4: 문서와 명령 커밋**

```powershell
git add -- docs/workflows/worship-journal/accounting/README.md package.json
git commit -m "docs: isolate worship journal accounting workflow"
```

- [ ] **Step 5: 커밋 범위와 비밀정보 확인**

Run: `git status --short`

Expected: clean in the isolated worktree.

Run: `git diff --name-only HEAD~4..HEAD`

Expected: only the files listed in this plan and the design/plan documents.

Run: `rg -n "CH2CH_PASSWORD=.+|SUPABASE_SERVICE_ROLE_KEY=.+|APP_SESSION_TOKEN=.+|BAND_ACCESS_TOKEN=.+|ghp_|github_pat" --glob "!node_modules/**" --glob "!.git/**" --glob "!.next/**"`

Expected: no secret values.
