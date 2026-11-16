import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * 內容安全政策（CSP）：只允許載入本站的資源。
 * - script-src 'unsafe-inline'：Next.js 靜態頁面的內嵌腳本需要；改用 nonce 會讓所有頁面變成動態產生、
 *   失去部分預先產生（PPR）的效能，因此採用官方「Without Nonces」做法。
 * - 'wasm-unsafe-eval'：3D 模型的 meshopt 解壓縮使用 WebAssembly。
 * - blob:/data:：three.js 載入模型內嵌貼圖時使用。
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  `connect-src 'self' blob: data:${isDev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" }, // 舊瀏覽器的防點擊劫持
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // 只允許嵌入同源或明確授權的資源（本站沒有任何外部資源）
  { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  // HSTS 只在正式環境（HTTPS）送出，本機 http 不送
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // PGlite（本機開發用的 PostgreSQL）含 WebAssembly 與檔案存取，不交給打包器處理
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  // 不在回應標頭透露使用的框架
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // 後台與 API 一律不快取、不被搜尋引擎收錄
        source: "/admin/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
