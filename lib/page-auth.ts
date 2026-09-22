import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, validSession } from "./security";

export async function requirePageSession() {
  if (!(await validSession((await cookies()).get(SESSION_COOKIE)?.value))) redirect("/login");
}
