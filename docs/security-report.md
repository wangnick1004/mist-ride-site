# 順路 晨霧控油化妝水網站：資安檢測報告

- 檢測日期：2026-11-16
- 範圍：行銷首頁、試用登記 API（`/api/trial`）、後台（`/admin`、`/api/admin/*`）、排程 API（`/api/cron/purge`）、資料庫存取、相依套件、部署設定
- 參考：OWASP Top 10（2021）、OWASP ASVS 4.0 第 1 級、個人資料保護法第 8 條

## 一、檢測方式

| 方式 | 內容 |
|---|---|
| 相依套件掃描 | `npm audit`（正式環境與開發工具分開評估） |
| 機密資訊檢查 | 掃描原始碼是否含金鑰、確認 `.env.local`、資料庫檔案不會進入 git |
| 原始碼審查 | 逐一檢視 API、登入機制、輸入驗證、輸出（後台、CSV）、SQL 存取、錯誤處理 |
| 動態測試 | 對執行中的網站送出攻擊請求，寫成自動化測試 `tests/security.test.mjs`（22 項） |
| 安全標頭檢查 | 開發與正式模式分別檢查回應標頭 |
| 持續檢查（CI） | GitHub Actions：型別檢查、Lint、`npm audit`、資安測試、OWASP ZAP 基本掃描、CodeQL、Dependabot |

## 二、結果摘要

| 項目 | 結果 |
|---|---|
| 正式環境相依套件漏洞 | **0** |
| 開發工具相依套件 | 14 個中度（drizzle-kit、gltf-transform CLI、typescript-eslint 的子套件），不會進入網站，交由 Dependabot 追蹤 |
| 原始碼中的機密資訊 | 無；`.env.local` 權限 600、已排除於 git |
| 資安自動化測試 | **22 / 22 通過** |
| 檢測中發現並已修正的問題 | 10 項（見第四節） |
| OWASP ZAP 基本掃描（CI） | 0 失敗；警告項目已修正或標註為已檢視的取捨（`.zap/rules.tsv`） |

## 三、已具備的防護（對應 OWASP Top 10）

| OWASP | 防護 |
|---|---|
| A01 存取控制失效 | 後台所有頁面與 API 都在伺服器端檢查登入；未登入一律 401 或導向登入頁；排程 API 需密鑰 |
| A02 加密機制失效 | 密碼以 scrypt（N=2¹⁵）雜湊；登入 cookie 以 HMAC-SHA256 簽章、`HttpOnly`、`SameSite=Strict`、正式環境 `Secure`；正式環境送出 HSTS；資料庫連線強制 TLS 驗證憑證 |
| A03 注入 | 全部使用 Drizzle 參數化查詢；所有輸入以 zod 白名單驗證（多餘欄位丟棄）；React 自動跳脫輸出；CSV 匯出中和公式（含全形與前置空白） |
| A04 不安全設計 | 只收必要個資；重複 Email 回應一致；防機器人（隱藏欄位、填表時間）；限流；資料保存 1 年自動刪除 |
| A05 安全設定錯誤 | CSP、`X-Frame-Options`、`nosniff`、`Referrer-Policy`、`Permissions-Policy`、COOP/CORP；不送 `X-Powered-By`；後台與 API `noindex`、`no-store`；錯誤訊息不含技術細節 |
| A06 易受攻擊的元件 | `npm audit` 納入 CI（高風險以上即失敗）；Dependabot 每週檢查 |
| A07 身分驗證失效 | 登入限流（每 IP 15 分鐘 5 次、全站 30 次）；常數時間比對；登入 8 小時失效 |
| A08 軟體與資料完整性 | `package-lock.json` 鎖定版本；CI 使用 `npm ci` |
| A09 紀錄與監控 | 後台操作紀錄（登入、改狀態、匯出、刪除、過期清除），保留 2 年 |
| A10 SSRF | 伺服器不會依使用者輸入對外發出請求 |
| CSRF | 所有會改變資料的 API 檢查 `Origin`／`Referer` 必須是本站，加上 `SameSite=Strict` cookie |

## 四、檢測中發現並已修正的問題

| # | 嚴重度 | 問題 | 修正 |
|---|---|---|---|
| 1 | 中 | 限流相信使用者自己送的 `X-Forwarded-For`，偽造即可繞過 | 只有設定 `TRUST_PROXY=1`（部署在會覆寫此標頭的平台）時才採用 |
| 2 | 中 | 先把整個請求讀入記憶體才檢查大小，可用超大請求消耗記憶體 | 改為邊讀邊計算，超過上限立即中止（含分段傳送） |
| 3 | 中 | 缺少安全標頭（CSP、防點擊劫持、HSTS 等），並透露框架 | 於 `next.config.ts` 全站加上；關閉 `X-Powered-By` |
| 4 | 低 | 新登記回 201、重複登記回 200，可從狀態碼判斷 Email 是否已登記 | 一律回 200 |
| 5 | 低 | CSV 公式注入防護可被「前置空白」或全形符號繞過 | 擴大比對規則 |
| 6 | 低 | 稱呼可含零寬字元與雙向文字控制字元（如 U+202E），可在後台偽裝內容 | 驗證規則一併擋掉 |
| 7 | 低 | 隱私告知承諾「期滿自動刪除」，但尚無刪除機制 | 新增 `purgeExpired()`：後台載入時與每日排程執行 |
| 8 | 資訊 | 後台頁面在預先產生時讀取當下時間 | 標記為請求時產生（`connection()`） |
| 9 | 中 | （OWASP ZAP 發現）JavaScript 尚未載入時，表單以 GET 送出，Email 等個資會出現在網址 | 試用表單與後台登入表單改為 `method="post"` |
| 10 | 低 | （OWASP ZAP 建議）缺少 Cross-Origin-Embedder-Policy | 加上 `require-corp`；確認照片、3D 模型仍正常載入 |

## 五、已知取捨與殘餘風險

| 項目 | 說明 | 建議 |
|---|---|---|
| CSP 允許 `script-src 'unsafe-inline'` | Next.js 靜態／部分預先產生頁面需要內嵌腳本；改用 nonce 會讓全站變成動態產生 | 網站無使用者產生的 HTML 輸出，風險低；之後可評估 Next.js 實驗性的 SRI 雜湊 CSP |
| 限流存在伺服器記憶體 | 部署到多台或 serverless 時每台各自計數 | 上線時改用 Upstash Redis 或 Vercel WAF 限流規則 |
| 防機器人較弱 | 隱藏欄位與填表時間可被針對性繞過 | 正式開放時加上 Cloudflare Turnstile |
| 可推知某 Email 是否已登記 | 新登記會顯示推薦碼、重複登記不會 | 影響低（只是候補名單）；未來可改為以 Email 寄送推薦碼 |
| 後台單一共用密碼 | 無法區分成員、無兩步驟驗證 | 團隊擴大時改用 GitHub OAuth 或 Passkey，並限制成員名單 |
| 登入無法個別撤銷 | cookie 有效 8 小時 | 疑似外洩時更換 `SESSION_SECRET`，所有登入立即失效 |
| 全站登入限流可被惡意觸發 | 他人連續輸入錯誤密碼，可能暫時讓管理員也無法登入 15 分鐘 | 可接受；搭配平台 WAF 封鎖來源 |

## 六、上線前檢查清單

- [ ] 在部署平台設定 `DATABASE_URL`（啟用 TLS）、`SESSION_SECRET`、`ADMIN_PASSWORD_HASH`、`CRON_SECRET`、`TRUST_PROXY=1`
- [ ] 正式資料庫執行 `npm run db:migrate`
- [ ] 推送到 GitHub 後，到 Settings → Code security 開啟 Secret scanning 與 Push protection，確認 CodeQL、CI 綠燈
- [ ] 檢視 CI 產出的 ZAP 報告（Actions → zap-report）
- [ ] 填寫 `/privacy` 與 `SECURITY.md` 中的【】欄位
- [ ] 設定 Upstash 或 WAF 限流、Cloudflare Turnstile
- [ ] 使用 [Mozilla Observatory](https://developer.mozilla.org/en-US/observatory) 檢查正式網址的標頭評分

## 七、如何重跑檢測

```bash
npm run dev                    # 先啟動網站
npm run test:security          # 另一個終端機執行 22 項資安測試
npm audit --omit=dev           # 正式環境套件漏洞
```
