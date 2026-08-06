import { NextResponse } from "next/server";
import { mockRun } from "@/lib/mock-data";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({ data: { ...mockRun, id }, demo: true, localOnly: true });
}
