import "server-only";

/**
 * 簡易限流（記憶體滑動視窗）。
 * 單一伺服器（本機、單一容器）可用；部署到多台或 serverless 時，請改用 Upstash Redis
 * 或平台防火牆（例如 Vercel WAF 的 rate limit 規則），因為每個執行個體各自計數。
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) {
    // 避免記憶體無限成長：清掉最舊的一批
    for (const k of Array.from(buckets.keys()).slice(0, 2_000)) buckets.delete(k);
  }
  return true;
}

/**
 * 取得來源 IP（只用於限流，不寫入資料庫）。
 * X-Forwarded-For 可以被使用者自己偽造，只有部署在會覆寫這個標頭的平台
 * （例如 Vercel、設定好的反向代理）時才信任：環境變數 TRUST_PROXY=1。
 * 沒有開啟時所有請求共用同一個桶，靠全站上限保護。
 */
export function clientIp(req: Request): string {
  if (process.env.TRUST_PROXY !== "1") return "shared";
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * 只接受同網站送出的請求：比對 Origin（或 Referer）與 Host。
 * 搭配 SameSite cookie，可擋掉跨站偽造請求（CSRF）。
 */
export function isSameOrigin(req: Request): boolean {
  const host = req.headers.get("host");
  const source = req.headers.get("origin") ?? req.headers.get("referer");
  if (!host || !source) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

/** 讀取 JSON 本文並限制大小，避免超大請求佔用資源。 */
export async function readJson(req: Request, maxBytes = 4096): Promise<unknown> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) throw new HttpError(415, "格式不支援");
  const len = Number(req.headers.get("content-length") ?? "0");
  if (len > maxBytes) throw new HttpError(413, "資料太大");
  // 邊讀邊計算大小，超過上限立刻中止，不會先把整個超大請求讀進記憶體
  const reader = req.body?.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "資料太大");
      }
      chunks.push(value);
    }
  }
  const buf = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buf);
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "資料格式錯誤");
  }
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}
