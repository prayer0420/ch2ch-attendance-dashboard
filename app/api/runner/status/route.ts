import { NextResponse } from "next/server";
import { mockHeartbeat } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ data: mockHeartbeat, demo: true, localOnly: true });
}
