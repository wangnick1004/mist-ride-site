import type { Metadata } from "next";
import LoginForm from "./LoginForm";
import styles from "../admin.module.css";

export const metadata: Metadata = {
  title: "後台登入｜順路",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className={styles.loginPage}>
      <h1>試用名單後台</h1>
      <p>僅限團隊成員使用。</p>
      <LoginForm />
    </main>
  );
}
