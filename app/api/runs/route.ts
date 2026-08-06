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

  if (!Number.isInteger(targetWeek) || targetWeek < 1 || targetWeek > 53) {
    return NextResponse.json({ error: "주차는 1주부터 53주 사이로 입력해 주세요." }, { status: 400 });
  }

  const runId = `local-run-${randomUUID()}`;
  const run = {
    ...mockRun,
    id: runId,
    target_week: targetWeek,
    target_week_text: `${targetWeek}주차`,
    status: "dry_run_completed" as const,
    dry_run: true,
    requested_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_step: "로컬 미리보기 완료"
  };

  return NextResponse.json({ runId, run, demo: true, localOnly: true });
}
