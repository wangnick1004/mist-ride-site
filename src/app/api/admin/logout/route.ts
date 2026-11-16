import { isSameOrigin, json } from "@/lib/server/guard";
import { SESSION_COOKIE } from "@/lib/server/session";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return json({ ok: false }, 403);
  const res = json({ ok: true });
  res.headers.append("Set-Cookie", `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict`);
  return res;
}
