import { timingSafeEqual } from "node:crypto";
import { json } from "@/lib/server/guard";
import { purgeExpired } from "@/lib/server/retention";

/**
 * 每日排程刪除過期資料。部署平台的排程（例如 Vercel Cron）以
 * Authorization: Bearer <CRON_SECRET> 呼叫；沒有設定 CRON_SECRET 時一律拒絕。
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || secret.length < 16) return json({ ok: false }, 404);
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return json({ ok: false }, 401);
  try {
    const removed = await purgeExpired("cron");
    return json({ ok: true, removed });
  } catch (err) {
    console.error("[cron] purge failed", err);
    return json({ ok: false }, 500);
  }
}
