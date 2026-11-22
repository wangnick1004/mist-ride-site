/**
 * 網站基本資訊（SEO、分享預覽、結構化資料共用）。
 * 換成自己的網域時，在 Vercel 設定 NEXT_PUBLIC_SITE_URL（例如 https://mistride.tw）再重新部署即可。
 */
const FALLBACK_URL = "https://mist-ride.vercel.app";

function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  return /^https:\/\/[a-z0-9.-]+(:\d+)?$/i.test(raw) ? raw : FALLBACK_URL;
}

export const SITE = {
  url: siteUrl(),
  name: "機不可失 MIST-RIDE",
  product: "機不可失化妝水",
  title: "機不可失化妝水｜騎車通勤的控油保濕噴霧化妝水 - MIST-RIDE",
  description:
    "給每天騎機車通勤的你：戴安全帽前噴 3 下，控油、保濕。鋁罐袋式噴霧（BOV），壓縮空氣推動、倒著拿也能噴，輕壓就是一陣細霧。開放校園試用登記。",
  keywords: [
    "機不可失",
    "MIST-RIDE",
    "化妝水",
    "噴霧化妝水",
    "控油化妝水",
    "保濕噴霧",
    "機車通勤",
    "安全帽 出油",
    "菸鹼醯胺",
    "依克多因",
    "袋式噴霧",
    "BOV",
  ],
  locale: "zh_TW",
  themeColor: "#EEF3F1",
};
