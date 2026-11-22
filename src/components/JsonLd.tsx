import { SITE } from "@/lib/site";

/**
 * 結構化資料（schema.org），讓搜尋引擎看懂品牌、網站與產品。
 * 產品尚未販售，所以不放價格（offers）與評價，避免與實際情況不符。
 */
export default function JsonLd() {
  const org = `${SITE.url}/#organization`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": org,
        name: SITE.name,
        alternateName: ["機不可失", "MIST-RIDE"],
        url: `${SITE.url}/`,
        logo: `${SITE.url}/brand/logo-512.png`,
        slogan: "帽險路上，機不可失",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: `${SITE.url}/`,
        name: SITE.name,
        inLanguage: "zh-Hant-TW",
        publisher: { "@id": org },
      },
      {
        "@type": "Product",
        "@id": `${SITE.url}/#product`,
        name: SITE.product,
        brand: { "@type": "Brand", name: SITE.name },
        description: SITE.description,
        image: [`${SITE.url}/images/hero-commute-v4.jpg`],
        category: "化妝水",
        size: "50 mL",
        material: "鋁罐、鋁塑複合內袋（袋式噴霧 BOV）",
      },
    ],
  };
  // 轉義 < 避免內容被當成 HTML 結束標籤
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
