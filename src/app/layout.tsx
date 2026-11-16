import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "順路 晨霧控油化妝水",
  description: "給每天騎車通勤的你：一瓶控油、保濕的晨霧化妝水。鋁罐袋式噴霧，輕壓就是一陣細霧。",
};

export const viewport: Viewport = {
  themeColor: "#F5F0E6",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant-TW">
      <body>{children}</body>
    </html>
  );
}
