import "server-only";
import { createHmac, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;

export const SESSION_COOKIE = "shunlu_admin";
export const SESSION_TTL_S = 8 * 60 * 60; // 8 小時後需重新登入

function secret(): Buffer {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET 未設定或長度不足 32 字元");
  return Buffer.from(s, "utf8");
}

const b64url = (b: Buffer) => b.toString("base64url");

/** 簽發登入 cookie：內容＋到期時間，用 HMAC-SHA256 簽章防竄改。 */
export function signSession(actor: string): string {
  const payload = b64url(Buffer.from(JSON.stringify({ sub: actor, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_S })));
  const sig = b64url(createHmac("sha256", secret()).update(payload).digest());
  return `${payload}.${sig}`;
}

export function verifySession(token: string | undefined): { sub: string } | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    if (!data.sub || !data.exp || data.exp < Date.now() / 1000) return null;
    return { sub: data.sub };
  } catch {
    return null;
  }
}

/** 讀取目前的管理員身分（只能在請求期間呼叫）。 */
export async function currentAdmin(): Promise<{ sub: string } | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_S,
  };
}

/**
 * 驗證管理密碼。ADMIN_PASSWORD_HASH 格式：scrypt:<N>:<salt base64>:<hash base64>
 * 用 `npm run admin:hash` 產生（密碼從鍵盤輸入，不會留在指令紀錄）。
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const stored = process.env.ADMIN_PASSWORD_HASH;
  if (!stored) return false;
  const [algo, nStr, saltB64, hashB64] = stored.split(":");
  if (algo !== "scrypt" || !nStr || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const got = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, {
    N: Number(nStr),
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return got.length === expected.length && timingSafeEqual(got, expected);
}
