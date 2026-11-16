// 資安自動化測試：對執行中的網站送出各種攻擊與異常請求，確認防護都有效。
// 用法：先啟動網站（npm run dev 或 npm run build && npm start），再執行
//   npm run test:security
// 注意：本機限流計數存在伺服器記憶體，10 分鐘內連續重跑多次會被限流（429）擋下，重啟網站即可。
// 可用環境變數：BASE_URL（預設 http://localhost:3000）、ADMIN_PASSWORD（提供時會測試登入後的匯出防護）
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ORIGIN = new URL(BASE).origin;
const json = { "Content-Type": "application/json", Origin: ORIGIN };

const valid = (over = {}) => ({
  name: "資安測試",
  email: `sec-${randomUUID().slice(0, 8)}@example.test`,
  county: "臺北市",
  skinType: "oily",
  commuteMinutes: 20,
  ageConfirm: true,
  consent: true,
  website: "",
  elapsedMs: 8000,
  ...over,
});

const post = (path, body, headers = json) =>
  fetch(BASE + path, { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) });

describe("安全標頭", () => {
  it("首頁送出 CSP、防點擊劫持、nosniff 等標頭，且不透露框架", async () => {
    const res = await fetch(BASE + "/");
    const csp = res.headers.get("content-security-policy") ?? "";
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /object-src 'none'/);
    assert.equal(res.headers.get("x-frame-options"), "DENY");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    assert.ok(res.headers.get("referrer-policy"));
    assert.ok(res.headers.get("permissions-policy"));
    assert.equal(res.headers.get("x-powered-by"), null);
  });

  it("後台頁面不快取、不被搜尋引擎收錄", async () => {
    const res = await fetch(BASE + "/admin/login");
    assert.match(res.headers.get("x-robots-tag") ?? "", /noindex/);
    assert.match(res.headers.get("cache-control") ?? "", /no-store/);
  });
});

describe("試用登記 API", () => {
  it("正常登記成功並取得推薦碼；回應不快取", async () => {
    const res = await post("/api/trial", valid());
    assert.equal(res.status, 200);
    assert.match(res.headers.get("cache-control") ?? "", /no-store/);
    const data = await res.json();
    assert.equal(data.ok, true);
    assert.match(data.referralCode, /^[A-HJ-NP-Z2-9]{8}$/);
  });

  it("重複 Email（大小寫不同）回應狀態碼與新登記相同", async () => {
    const email = `dup-${randomUUID().slice(0, 8)}@example.test`;
    const first = await post("/api/trial", valid({ email }));
    const second = await post("/api/trial", valid({ email: email.toUpperCase() }));
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal((await second.json()).referralCode, undefined);
  });

  it("跨站請求（CSRF）被拒絕", async () => {
    const res = await post("/api/trial", valid(), { "Content-Type": "application/json", Origin: "https://evil.example" });
    assert.equal(res.status, 403);
  });

  it("沒有 Origin／Referer 的請求被拒絕", async () => {
    const res = await post("/api/trial", valid(), { "Content-Type": "application/json" });
    assert.equal(res.status, 403);
  });

  it("非 JSON 內容類型被拒絕", async () => {
    const res = await post("/api/trial", JSON.stringify(valid()), { "Content-Type": "text/plain", Origin: ORIGIN });
    assert.equal(res.status, 415);
  });

  it("超大請求被拒絕（未宣告長度的分段傳送也一樣）", async () => {
    const big = JSON.stringify(valid({ name: "x".repeat(20_000) }));
    const res = await post("/api/trial", big);
    assert.equal(res.status, 413);
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode(big));
        c.close();
      },
    });
    const res2 = await fetch(BASE + "/api/trial", { method: "POST", headers: json, body: stream, duplex: "half" });
    assert.equal(res2.status, 413);
  });

  it("壞掉的 JSON 回 400，不洩漏錯誤細節", async () => {
    const res = await post("/api/trial", "{not json");
    assert.equal(res.status, 400);
    const text = await res.text();
    assert.doesNotMatch(text, /SyntaxError|at JSON\.parse|stack/i);
  });

  it("欄位驗證：不合法的縣市、膚質、通勤時間、未勾選同意都會被擋", async () => {
    const res = await post("/api/trial", valid({ county: "東京都", skinType: "x", commuteMinutes: 999, consent: false }));
    assert.equal(res.status, 422);
    const { fieldErrors } = await res.json();
    for (const k of ["county", "skinType", "commuteMinutes", "consent"]) assert.ok(fieldErrors[k], k);
  });

  it("稱呼含控制字元、零寬字元或雙向文字控制字元會被擋", async () => {
    for (const name of ["a\u0000b", "a\nb", "a​b", "abc‮gpj.exe"]) {
      const res = await post("/api/trial", valid({ name }));
      assert.equal(res.status, 422, JSON.stringify(name));
    }
  });

  it("SQL／HTML 注入字串只會被當成一般文字（不會造成錯誤）", async () => {
    const res = await post("/api/trial", valid({ name: `'); DROP TABLE trial_signups;--<script>` }));
    assert.equal(res.status, 200);
  });

  it("多餘欄位（例如想直接設定 status）會被忽略", async () => {
    const res = await post("/api/trial", valid({ status: "approved", referralCode: "AAAAAAAA", id: randomUUID() }));
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.notEqual(data.referralCode, "AAAAAAAA");
  });

  it("機器人（填了隱藏欄位或填太快）假裝成功但不給推薦碼", async () => {
    for (const over of [{ website: "http://spam" }, { elapsedMs: 200 }]) {
      const res = await post("/api/trial", valid(over));
      assert.equal(res.status, 200);
      assert.equal((await res.json()).referralCode, undefined);
    }
  });

  it("不支援的方法回 405", async () => {
    const res = await fetch(BASE + "/api/trial");
    assert.equal(res.status, 405);
  });
});

describe("後台存取控制", () => {
  it("未登入不能匯出名單", async () => {
    const res = await fetch(BASE + "/api/admin/export");
    assert.equal(res.status, 401);
  });

  it("偽造或竄改的登入 cookie 無效", async () => {
    const fake = Buffer.from(JSON.stringify({ sub: "admin", exp: 9_999_999_999 })).toString("base64url");
    for (const cookie of [`shunlu_admin=${fake}.AAAA`, `shunlu_admin=${fake}`, "shunlu_admin=admin"]) {
      const res = await fetch(BASE + "/api/admin/export", { headers: { Cookie: cookie } });
      assert.equal(res.status, 401, cookie);
    }
  });

  it("未登入不能修改或刪除資料", async () => {
    const id = randomUUID();
    const patch = await fetch(`${BASE}/api/admin/signups/${id}`, { method: "PATCH", headers: json, body: '{"status":"approved"}' });
    const del = await fetch(`${BASE}/api/admin/signups/${id}`, { method: "DELETE", headers: json, body: "{}" });
    assert.equal(patch.status, 401);
    assert.equal(del.status, 401);
  });

  it("錯誤密碼登入失敗；跨站登入被拒絕", async () => {
    const wrong = await post("/api/admin/login", { password: "definitely-wrong-password" });
    assert.ok([401, 429].includes(wrong.status));
    const csrf = await post("/api/admin/login", { password: "x" }, { "Content-Type": "application/json", Origin: "https://evil.example" });
    assert.equal(csrf.status, 403);
  });

  it("排程刪除 API 沒有正確密鑰時不能使用", async () => {
    const res = await fetch(BASE + "/api/cron/purge", { headers: { Authorization: "Bearer wrong" } });
    assert.ok([401, 404].includes(res.status));
  });

  it("未登入開啟 /admin 不會看到名單", async () => {
    const res = await fetch(BASE + "/admin");
    const html = await res.text();
    assert.doesNotMatch(html, /@example\.test/);
  });
});

describe("登入後的防護", { skip: !process.env.ADMIN_PASSWORD && "未提供 ADMIN_PASSWORD" }, () => {
  it("登入 cookie 帶 HttpOnly 與 SameSite=Strict；匯出的 CSV 已中和公式", async () => {
    await post("/api/trial", valid({ name: " =HYPERLINK(\"http://x\")" }));
    const login = await post("/api/admin/login", { password: process.env.ADMIN_PASSWORD });
    assert.equal(login.status, 200);
    const setCookie = login.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);
    const cookie = setCookie.split(";")[0];
    const csv = await (await fetch(BASE + "/api/admin/export", { headers: { Cookie: cookie } })).text();
    // 稱呼前後空白會先被驗證規則去掉，存成 =HYPERLINK...，匯出時前面加上單引號變成純文字
    assert.doesNotMatch(csv, /(^|,)"\s*=HYPERLINK/m);
    assert.match(csv, /"'=HYPERLINK/);
  });
});
