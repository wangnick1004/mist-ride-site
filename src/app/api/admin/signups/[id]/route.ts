import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { SIGNUP_STATUS } from "@/lib/constants";
import { HttpError, isSameOrigin, json, readJson } from "@/lib/server/guard";
import { currentAdmin } from "@/lib/server/session";

const body = z.object({ status: z.enum(SIGNUP_STATUS) });
const idSchema = z.uuid();

/** 更新一筆登記的狀態（待審、入選、已寄出、未入選）。 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new HttpError(403, "來源不正確");
    const admin = await currentAdmin();
    if (!admin) throw new HttpError(401, "請先登入");
    const id = idSchema.safeParse((await ctx.params).id);
    const parsed = body.safeParse(await readJson(req, 256));
    if (!id.success || !parsed.success) throw new HttpError(422, "資料不正確");

    const db = await getDb();
    const rows = await db
      .update(schema.trialSignups)
      .set({ status: parsed.data.status })
      .where(eq(schema.trialSignups.id, id.data))
      .returning({ id: schema.trialSignups.id });
    if (rows.length === 0) throw new HttpError(404, "找不到這筆資料");
    await db
      .insert(schema.adminAuditLog)
      .values({ actor: admin.sub, action: "status", target: `${id.data}→${parsed.data.status}` });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return json({ ok: false, message: err.message }, err.status);
    console.error("[admin] status update failed", err);
    return json({ ok: false, message: "系統暫時無法處理。" }, 500);
  }
}

/** 依當事人要求刪除一筆登記（個資法第 3 條）。 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    if (!isSameOrigin(req)) throw new HttpError(403, "來源不正確");
    const admin = await currentAdmin();
    if (!admin) throw new HttpError(401, "請先登入");
    const id = idSchema.safeParse((await ctx.params).id);
    if (!id.success) throw new HttpError(422, "資料不正確");
    const db = await getDb();
    const rows = await db
      .delete(schema.trialSignups)
      .where(eq(schema.trialSignups.id, id.data))
      .returning({ id: schema.trialSignups.id });
    if (rows.length === 0) throw new HttpError(404, "找不到這筆資料");
    await db.insert(schema.adminAuditLog).values({ actor: admin.sub, action: "delete", target: id.data });
    return json({ ok: true });
  } catch (err) {
    if (err instanceof HttpError) return json({ ok: false, message: err.message }, err.status);
    console.error("[admin] delete failed", err);
    return json({ ok: false, message: "系統暫時無法處理。" }, 500);
  }
}
