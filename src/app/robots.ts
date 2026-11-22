import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// 搜尋引擎可收錄行銷頁面，不收錄後台與 API
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] }],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
