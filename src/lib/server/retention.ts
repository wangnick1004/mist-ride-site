import "server-only";
import { lt, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

/**
 * 刪除超過保存期限（expires_at，預設登記後 1 年）的試用登記，兌現隱私權告知中的承諾。
 * 由後台頁面載入時、以及排程 API（/api/cron/purge）呼叫。
 */
export async function purgeExpired(actor: string): Promise<number> {
  const db = await getDb();
  const removed = await db
    .delete(schema.trialSignups)
    .where(lt(schema.trialSignups.expiresAt, sql`now()`))
    .returning({ id: schema.trialSignups.id });
  if (removed.length > 0) {
    await db
      .insert(schema.adminAuditLog)
      .values({ actor, action: "purge", target: `${removed.length} expired rows` });
  }
  // 操作紀錄本身保留 2 年
  await db.delete(schema.adminAuditLog).where(lt(schema.adminAuditLog.at, sql`now() - interval '2 years'`));
  return removed.length;
}
