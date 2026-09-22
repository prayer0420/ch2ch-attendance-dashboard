import { checkRequestSecurity } from "@/lib/security";
import { openApiDocument } from "@/lib/api-contract";

export async function GET(request: Request) {
  const denied = await checkRequestSecurity(request);
  if (denied) return denied;
  return Response.json(openApiDocument, { headers: { "Cache-Control": "private, no-store" } });
}
