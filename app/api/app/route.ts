import { checkRequestSecurity, sessionFromRequest } from "@/lib/security";
import { appContract } from "@/lib/api-contract";

export async function GET(request: Request) {
  const denied = await checkRequestSecurity(request);
  if (denied) return denied;
  const expiry = Number(sessionFromRequest(request)!.split(".")[0]);
  return Response.json({ data: { ...appContract, session: { authenticated: true, expiresAt: new Date(expiry * 1000).toISOString() } } }, { headers: { "Cache-Control": "private, no-store" } });
}
