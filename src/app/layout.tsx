import type { Metadata, Viewport } from "next";
import { Archivo, Noto_Sans_TC } from "next/font/google";
import JsonLd from "@/components/JsonLd";
import { SITE } from "@/lib/site";
import "./globals.css";

// 中文字檔很大，不預載；英文 Archivo 開寬度軸做 MIST-RIDE 的加寬字
const noto = Noto_Sans_TC({ weight: ["400", "500", "700", "900"], preload: false, display: "swap", variable: "--font-noto" });
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], display: "swap", variable: "--font-archivo" });

const GSC = (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "").trim();

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.title, template: "%s｜機不可失 MIST-RIDE" },
  description: SITE.description,
  keywords: SITE.keywords,
  applicationName: SITE.name,
  category: "beauty",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: "/",
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  formatDetection: { telephone: false, email: false, address: false },
  // Google Search Console 驗證碼：在 Vercel 設定 NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION 後重新部署
  ...(GSC ? { verification: { google: GSC } } : {}),
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW" className={`${noto.variable} ${archivo.variable}`}>
      <body>
        {children}
        <JsonLd />
      </body>
    </html>
  );
}
