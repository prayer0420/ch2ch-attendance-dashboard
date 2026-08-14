# 출석 실행 화면 개선 Implementation Plan

> **For agentic workers:** Inline execution in the current session.

**Goal:** 실행 화면에서 출석 이력으로 이동할 수 있게 하고, 불필요한 안내 문구를 제거하며, 화면 진입 시 현재 일요일을 기본 실행 날짜로 자동 설정한다.

**Architecture:** 상단 전역 메뉴에서는 출석 이력 링크를 제거하고 실행 화면의 PageActions에 이력 링크를 추가한다. 실행 폼은 localStorage의 과거 날짜를 복원하지 않고 매 진입 시 현재 일요일을 기본값으로 사용하며, 사용자가 직접 입력한 날짜는 현재 화면에서 유지하고 주차 계산은 기존 함수로 수행한다.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS, Node 검증 스크립트

## Global Constraints

- 커밋 제목은 한글 규칙을 따른다.
- 실행 날짜는 사용자가 직접 변경할 수 있어야 한다.
- API 요청에는 계산된 연도·주차가 계속 전달되어야 한다.

---

### Task 1: 날짜 기본값 회귀 테스트

**Files:**
- Create: `scripts/verify-run-date-default.js`
- Modify: `package.json`

- [ ] 현재 일요일 계산과 저장값 무시 규칙을 검증하는 스크립트를 작성한다.
- [ ] 실패 상태를 확인한다.
- [ ] 구현 후 통과시킨다.

### Task 2: 실행 화면 UI와 날짜 복원 수정

**Files:**
- Modify: `components/app-shell.tsx`
- Modify: `app/runs/new/page.tsx`
- Modify: `components/run-create-form.tsx`

- [ ] 전역 출석 이력 메뉴를 제거한다.
- [ ] 실행 화면에 출석 이력 이동 버튼을 추가한다.
- [ ] 요청된 안내 문구 3개를 제거한다.
- [ ] 진입 시 현재 일요일을 기본값으로 적용하고 사용자의 날짜 입력을 허용한다.

### Task 3: 검증

- [ ] 날짜 회귀 검증 스크립트를 실행한다.
- [ ] `npm.cmd run typecheck`를 실행한다.
- [ ] `npm.cmd run build`를 실행한다.

