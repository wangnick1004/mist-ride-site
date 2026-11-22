import type { Metadata, Viewport } from "next";
import { Archivo, Noto_Sans_TC } from "next/font/google";
import "./globals.css";

// 中文字檔很大，不預載；英文 Archivo 開寬度軸做 MIST-RIDE 的加寬字
const noto = Noto_Sans_TC({ weight: ["400", "500", "700", "900"], preload: false, display: "swap", variable: "--font-noto" });
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], display: "swap", variable: "--font-archivo" });

export const metadata: Metadata = {
  title: "機不可失 MIST-RIDE｜機不可失化妝水",
  description: "帽險路上，機不可失。給每天騎車通勤的你：戴安全帽前噴 3 下，控油、保濕。鋁罐袋式噴霧，輕壓就是一陣細霧。",
};

export const viewport: Viewport = {
  themeColor: "#EEF3F1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW" className={`${noto.variable} ${archivo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
