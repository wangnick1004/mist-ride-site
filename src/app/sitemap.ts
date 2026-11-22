import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// 只列出要給搜尋引擎收錄的公開頁面（後台與 API 不列入）
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
