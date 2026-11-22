import type { Metadata } from "next";
import { Suspense } from "react";
import Dashboard from "./Dashboard";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "試用名單後台",
  robots: { index: false, follow: false },
};

// 外框可以預先產生；讀取登入狀態與名單的部分在請求時才執行，放在 Suspense 裡
export default function AdminPage() {
  return (
    <main className={styles.page}>
      <Suspense fallback={<p className={styles.loading}>讀取名單中…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
