import { z } from "zod";
import { getDb, schema } from "@/db";
import { HttpError, clientIp, isSameOrigin, json, rateLimit, readJson } from "@/lib/server/guard";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifyAdminPassword } from "@/lib/server/session";

const body = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) throw new HttpError(403, "請從後台登入頁登入");
    const ip = clientIp(req);
    if (!rateLimit(`login:${ip}`, 5, 15 * 60_000) || !rateLimit("login:all", 30, 15 * 60_000)) {
      return json({ ok: false, message: "嘗試次數太多，請 15 分鐘後再試。" }, 429, { "Retry-After": "900" });
    }
    const parsed = body.safeParse(await readJson(req, 1024));
    if (!parsed.success || !(await verifyAdminPassword(parsed.data.password))) {
      return json({ ok: false, message: "密碼不正確。" }, 401);
    }
    const db = await getDb();
    await db.insert(schema.adminAuditLog).values({ actor: "admin", action: "login" });
    const res = json({ ok: true });
    const opts = sessionCookieOptions();
    res.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${signSession("admin")}; Path=${opts.path}; Max-Age=${opts.maxAge}; HttpOnly; SameSite=Strict${opts.secure ? "; Secure" : ""}`,
    );
    return res;
  } catch (err) {
    if (err instanceof HttpError) return json({ ok: false, message: err.message }, err.status);
    console.error("[admin] login failed", err);
    return json({ ok: false, message: "系統暫時無法處理。" }, 500);
  }
}
