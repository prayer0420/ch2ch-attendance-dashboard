import { NextResponse } from "next/server";
import { mockEvents } from "@/lib/mock-data";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    data: mockEvents.map((event) => ({ ...event, run_id: id })),
    demo: true,
    localOnly: true
  });
}
