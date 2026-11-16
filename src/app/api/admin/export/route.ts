import { desc } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { currentAdmin } from "@/lib/server/session";
import { SKIN_LABELS } from "@/lib/trial";

/**
 * CSV 欄位跳脫，並防止「CSV 公式注入」：
 * 以 = + - @（含全形、前面有空白）或 Tab／CR 開頭的內容在 Excel 會被當成公式執行，前面加上單引號讓它變成純文字。
 */
function cell(v: unknown): string {
  let s = v === null || v === undefined ? "" : v instanceof Date ? v.toISOString() : String(v);
  // 前面有空白再接公式符號也算（部分試算表會先去掉空白再判斷）
  if (/^[\s\u3000]*[=+\-@\uFF1D\uFF0B\uFF0D\uFF20]/.test(s) || /^[\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const STATUS_LABEL = { pending: "待審", approved: "入選", shipped: "已寄出", rejected: "未入選" } as const;

export async function GET() {
  const admin = await currentAdmin();
  if (!admin) return new Response("請先登入", { status: 401, headers: { "Cache-Control": "no-store" } });

  const db = await getDb();
  const rows = await db.select().from(schema.trialSignups).orderBy(desc(schema.trialSignups.createdAt));
  await db
    .insert(schema.adminAuditLog)
    .values({ actor: admin.sub, action: "export", target: `${rows.length} rows` });

  const header = ["登記時間", "稱呼", "Email", "學校", "縣市", "膚質", "通勤分鐘", "推薦碼", "推薦人", "願收行銷通知", "狀態", "同意版本", "資料到期"];
  const lines = rows.map((r) =>
    [
      r.createdAt,
      r.name,
      r.email,
      r.school,
      r.county,
      SKIN_LABELS[r.skinType],
      r.commuteMinutes,
      r.referralCode,
      r.referredBy,
      r.marketingOptIn ? "是" : "否",
      STATUS_LABEL[r.status],
      r.consentVersion,
      r.expiresAt,
    ]
      .map(cell)
      .join(","),
  );
  // 前面加 BOM，Excel 打開中文才不會亂碼
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="trial-signups-${stamp}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
