# 2026 여름수련회 25개 원본 상세 집계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 최종 Google Sheet에서 24개 가족 원본과 새가족팀 원본을 합친 25개 원본만 읽어 일자별 참석·숙박·이동 명단과 인원을 자동 집계하고, 기존 `취합` 탭은 과거 비교자료로 보존한다.

**Architecture:** 기존 운영 탭의 요약 영역과 수동 확정 영역을 보존한다. 각 운영 탭의 오른쪽 빈 영역에 일자별 명단·인원 상세 블록을 추가하고, 원본 파일은 `IMPORTRANGE`로만 읽는다. 24개 가족은 `'여름수련회 참석조사'`, 새가족팀은 `'수련회 양식'`의 실제 열을 사용한다.

**Tech Stack:** Google Sheets native formulas (`IMPORTRANGE`, `FILTER`, `TEXTJOIN`, `COUNTIF`, `IFERROR`, `SUM`), Google Sheets batchUpdate, Google Drive read-only metadata/range reads.

## Global Constraints

- 집계 대상은 24개 가족 원본 + 새가족팀 = 정확히 25개 원본이다.
- 기존 최종 파일의 `취합` 탭은 과거 자료·비교용으로 유지하며 어떠한 통계에도 포함하지 않는다.
- 25개 원본 파일은 읽기 전용이다. 원본의 셀·수식·서식·구조·권한·파일명은 수정하지 않는다.
- 모든 쓰기는 최종 작업 대상 spreadsheet ID `1UqSxS9ckR0L_Zmg6Yc-1PS1HmGfe5uBH4bLR7XHYrjo`에만 수행한다.
- 날짜 기준은 8/26(수), 8/27(목), 8/28(금), 8/29(토)이다.
- 자동 열과 직접 수정 열을 분리하고, 원본 연결 오류는 `연결 승인 필요`로 표시한다.

### Task 1: Source registry and schema verification

**Files:**
- Read-only: Drive folder `1dXw2QBKAGyaOwJWk5nTdKfTA0mz-psA0` (24 family spreadsheets)
- Read-only: spreadsheet `1MCKxw2W-nz9GXWRbPONb4zPf4Dk1OVQMOMDdrFyNaOA` (`수련회 양식`)

- [ ] Confirm exactly 24 family files are present in the supplied folder.
- [ ] Confirm all 24 family files expose `여름수련회 참석조사`.
- [ ] Confirm 새가족팀 exposes `수련회 양식` and uses the same visible data columns: A name, B/C/I/P daily attendance, G/M lodging, D:F and J:L transportation, S notes.
- [ ] Record the 25 source IDs and tab names in the formulas without editing any source.

### Task 2: Detailed attendee names and counts

**Files:**
- Modify only target sheet `참석자 명단`.

- [ ] Preserve existing summary and manual columns.
- [ ] Add per-source formula columns for 8/26, 8/27, 8/28, 8/29 attendee names and counts.
- [ ] Use `FILTER` on source A names with daily attendance columns B, C, I, P equal to `TRUE`.
- [ ] Use `TEXTJOIN` for names and `COUNTIF` for counts, wrapped in `IFERROR`.
- [ ] Add a 25-source total row for each daily count and verify it excludes the old `취합` tab.

### Task 3: Detailed lodging names and counts

**Files:**
- Modify only target sheet `숙박·방편성`.

- [ ] Preserve existing automatic lodging counts and manual room assignment columns.
- [ ] Add 목 숙박 명단·인원 and 금 숙박 명단·인원 columns.
- [ ] Filter source names by G and M equal to `TRUE` respectively.
- [ ] Add a 25-source total row and keep room number/room assignment as direct-input fields.

### Task 4: Detailed transportation names, counts, and notes

**Files:**
- Modify only target sheet `이동수단`.

- [ ] Preserve existing automatic and final-adjustment count columns.
- [ ] Add 목 상세 block for D:F: 교회차, 개별이동/대중교통, 기타 name lists and counts.
- [ ] Add 금 상세 block for J:L: 교회차, 개별이동/대중교통, 기타 name lists and counts.
- [ ] Add 토 복귀 상세 block for the source Saturday self-drive/return column and counts.
- [ ] Pull source S notes into a family-level note column with `TEXTJOIN` over nonblank notes.
- [ ] Keep the final adjustment fields separate from automatic source values.

### Task 5: Carpool operating template alignment

**Files:**
- Modify only target sheet `카풀 명단`.

- [ ] Keep the blank direct-entry structure.
- [ ] Add a short instruction that names/counts come from `이동수단` and actual assignments are entered here.
- [ ] Keep status, passenger assignment, and note fields manual.

### Task 6: Verification and visual quality

**Files:**
- Read-only verification of target formula/value ranges and metadata.

- [ ] Verify all four operating tabs contain 25 source rows and do not include `기존 취합(이 파일)` in operational totals.
- [ ] Verify daily attendee, lodging, and transportation total formulas are present and use the correct source columns.
- [ ] Verify all original links are intact and no source file has been written.
- [ ] Verify the target sheet saves successfully and added blocks are wrapped, readable, and not clipped.
- [ ] Update the target `탭 설명` and in-tab warnings to state the 25-source rule and absolute source-read-only rule.
