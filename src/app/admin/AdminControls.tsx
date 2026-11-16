"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { SIGNUP_STATUS } from "@/lib/constants";
import styles from "./admin.module.css";

type Status = (typeof SIGNUP_STATUS)[number];
const LABEL: Record<Status, string> = { pending: "待審", approved: "入選", shipped: "已寄出", rejected: "未入選" };

export function RowActions({ id, status, name }: { id: string; status: Status; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  async function send(method: "PATCH" | "DELETE", body?: object) {
    setError("");
    const res = await fetch(`/api/admin/signups/${id}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : "{}",
    });
    if (res.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const data = (await res.json().catch(() => ({ ok: false }))) as { ok: boolean; message?: string };
    if (!data.ok) setError(data.message ?? "更新失敗");
    start(() => router.refresh());
  }

  return (
    <div className={styles.rowActions}>
      <select
        aria-label={`${name} 的狀態`}
        defaultValue={status}
        disabled={pending}
        onChange={(e) => send("PATCH", { status: e.target.value })}
      >
        {(Object.keys(LABEL) as Status[]).map((s) => (
          <option key={s} value={s}>
            {LABEL[s]}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={styles.danger}
        disabled={pending}
        onClick={() => {
          if (window.confirm(`確定要永久刪除「${name}」的登記資料嗎？刪除後無法復原。`)) send("DELETE");
        }}
      >
        刪除
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className={styles.buttonGhost}
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.replace("/admin/login");
        router.refresh();
      }}
    >
      登出
    </button>
  );
}
