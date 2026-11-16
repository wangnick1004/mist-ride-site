import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { HttpError, clientIp, isSameOrigin, json, rateLimit, readJson } from "@/lib/server/guard";
import { CONSENT_VERSION, REFERRAL_ALPHABET, trialSignupSchema } from "@/lib/trial";

const MIN_FILL_MS = 2500; // 少於 2.5 秒填完的表單視為機器人

function newReferralCode() {
  let s = "";
  for (let i = 0; i < 8; i++) s += REFERRAL_ALPHABET[randomInt(REFERRAL_ALPHABET.length)];
  return s;
}

const ACCEPTED = { ok: true, message: "已收到你的試用登記。產品資訊檔案完成後，我們會用 Email 通知你。" };

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) throw new HttpError(403, "請從官網表單送出");

    const ip = clientIp(req);
    const perIp = ip === "shared" ? 60 : 5; // 無法辨識 IP 時放寬單一桶，避免正常使用者互相卡住
    if (!rateLimit(`trial:${ip}`, perIp, 10 * 60_000) || !rateLimit("trial:all", 300, 60 * 60_000)) {
      return json({ ok: false, message: "送出太頻繁，請稍後再試。" }, 429, { "Retry-After": "600" });
    }

    const body = await readJson(req);
    const parsed = trialSignupSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "form");
        if (k === "website" || k === "elapsedMs") continue; // 不透露防機器人欄位
        fieldErrors[k] ??= issue.message;
      }
      // 只有防機器人欄位出錯：假裝成功，不讓機器人知道被擋
      if (Object.keys(fieldErrors).length === 0) return json(ACCEPTED);
      return json({ ok: false, message: "有欄位需要修正。", fieldErrors }, 422);
    }
    const d = parsed.data;
    if (d.elapsedMs < MIN_FILL_MS) return json(ACCEPTED);

    const db = await getDb();

    // 推薦碼不存在就忽略，不報錯
    let referredBy: string | null = null;
    if (d.referredBy) {
      const hit = await db
        .select({ code: schema.trialSignups.referralCode })
        .from(schema.trialSignups)
        .where(eq(schema.trialSignups.referralCode, d.referredBy))
        .limit(1);
      referredBy = hit[0]?.code ?? null;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const code = newReferralCode();
      try {
        const rows = await db
          .insert(schema.trialSignups)
          .values({
            name: d.name,
            email: d.email,
            school: d.school ?? null,
            county: d.county,
            skinType: d.skinType,
            commuteMinutes: d.commuteMinutes,
            referralCode: code,
            referredBy,
            marketingOptIn: d.marketingOptIn,
            consentVersion: CONSENT_VERSION,
            consentAt: new Date(),
          })
          .onConflictDoNothing({ target: schema.trialSignups.email })
          .returning({ code: schema.trialSignups.referralCode });

        // Email 已登記過：回覆相同訊息，不透露這個 Email 是否在名單裡
        if (rows.length === 0) return json(ACCEPTED);
        // 一律回 200：狀態碼不透露是新登記還是重複登記
        return json({ ...ACCEPTED, referralCode: rows[0]!.code });
      } catch (err) {
        // 推薦碼極少數撞號（唯一索引衝突）時換一組重試
        const e = err as { code?: string; cause?: { code?: string } };
        if (e.code === "23505" || e.cause?.code === "23505") continue;
        throw err;
      }
    }
    throw new Error("referral code collision");
  } catch (err) {
    if (err instanceof HttpError) return json({ ok: false, message: err.message }, err.status);
    console.error("[trial] signup failed", err);
    return json({ ok: false, message: "系統暫時無法處理，請稍後再試。" }, 500);
  }
}
