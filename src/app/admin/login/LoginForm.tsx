"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import styles from "../admin.module.css";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setError(data.message ?? "登入失敗");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("網路連線有問題，請稍後再試。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className={styles.loginForm} onSubmit={onSubmit}>
      <label>
        管理密碼
        <input name="password" type="password" autoComplete="current-password" required maxLength={200} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? "登入中…" : "登入"}
      </button>
    </form>
  );
}
