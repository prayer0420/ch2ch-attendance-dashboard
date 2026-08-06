import { NextRequest, NextResponse } from "next/server";
import { mockResults } from "@/lib/mock-data";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const status = request.nextUrl.searchParams.get("status");
  const data = mockResults
    .filter((result) => !status || result.status === status)
    .map((result) => ({ ...result, run_id: id }));
  return NextResponse.json({ data, demo: true, localOnly: true });
}
