import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { mockRun, mockRuns } from "@/lib/mock-data";

function readValue(input: FormData | Record<string, unknown>, key: string) {
  const value = input instanceof FormData ? input.get(key) : input[key];
  return value instanceof File ? value.name : value;
}

export async function GET() {
  return NextResponse.json({ data: mockRuns, demo: true, localOnly: true });
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  const input = contentType.includes("multipart/form-data")
    ? await request.formData()
    : await request.json() as Record<string, unknown>;
  const targetWeek = Number(readValue(input, "targetWeek"));
  const targetYear = Number(readValue(input, "targetYear")) || new Date().getFullYear();
  const targetDate = String(readValue(input, "targetDate") ?? "");
  const targetDept = String(readValue(input, "targetDept") ?? "");
  const targetCourse = String(readValue(input, "targetCourse") ?? "");
  const targetGroup = String(readValue(input, "targetGroup") ?? "");

  if (!Number.isInteger(targetWeek) || targetWeek < 1 || targetWeek > 53) {
    return NextResponse.json({ error: "주차는 1주부터 53주 사이로 입력해 주세요." }, { status: 400 });
  }

  const runId = `local-run-${randomUUID()}`;
  const run = {
    ...mockRun,
    id: runId,
    target_week: targetWeek,
    target_week_text: `${targetYear}년 ${targetWeek}주차`,
    target_year: targetYear,
    target_date: targetDate,
    target_dept: targetDept,
    target_term: targetCourse,
    target_course: targetCourse,
    target_group: targetGroup,
    // The test workflow was removed. The local runner consumes real requests.
    status: "queued" as const,
    dry_run: false,
    requested_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_step: "실행기 연결 대기"
  };

  return NextResponse.json({ runId, run, demo: false, localOnly: true });
}
