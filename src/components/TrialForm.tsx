"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { COUNTIES, SKIN_TYPES } from "@/lib/constants";
import { SKIN_LABELS, REFERRAL_RE, trialSignupSchema } from "@/lib/trial";
import styles from "./TrialForm.module.css";

type Errors = Partial<Record<string, string>>;
type Result = { message: string; referralCode?: string };

export default function TrialForm() {
  const started = useRef(0);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [formError, setFormError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const refInput = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    started.current = Date.now();
    // 從分享連結帶入推薦碼（?ref=XXXXXXXX）
    const code = new URLSearchParams(window.location.search).get("ref")?.toUpperCase() ?? "";
    if (REFERRAL_RE.test(code) && refInput.current) refInput.current.value = code;
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const payload = {
      name: String(f.get("name") ?? ""),
      email: String(f.get("email") ?? ""),
      school: String(f.get("school") ?? ""),
      county: String(f.get("county") ?? ""),
      skinType: String(f.get("skinType") ?? ""),
      commuteMinutes: String(f.get("commuteMinutes") ?? "").trim() || undefined, // 空白時提示「請填寫」
      referredBy: String(f.get("referredBy") ?? ""),
      marketingOptIn: f.get("marketingOptIn") === "on",
      ageConfirm: f.get("ageConfirm") === "on",
      consent: f.get("consent") === "on",
      website: String(f.get("website") ?? ""),
      elapsedMs: Math.min(86_400_000, Date.now() - started.current),
    };

    // 前端先檢查一次（與後端同一份規則），後端仍會再驗證
    const check = trialSignupSchema.safeParse(payload);
    if (!check.success) {
      const next: Errors = {};
      for (const issue of check.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      const first = e.currentTarget.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`);
      first?.focus();
      return;
    }

    setErrors({});
    setFormError("");
    setStatus("sending");
    try {
      const res = await fetch("/api/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; message: string; referralCode?: string; fieldErrors?: Errors };
      if (!res.ok || !data.ok) {
        setErrors(data.fieldErrors ?? {});
        setFormError(data.message);
        setStatus("error");
        return;
      }
      setResult({ message: data.message, referralCode: data.referralCode });
      setStatus("done");
    } catch {
      setFormError("網路連線有問題，請稍後再試。");
      setStatus("error");
    }
  }

  if (status === "done" && result) {
    const link = result.referralCode
      ? `${window.location.origin}/?ref=${result.referralCode}#trial`
      : "";
    return (
      <div className={styles.done} role="status">
        <p className={styles.doneTitle}>登記完成</p>
        <p>{result.message}</p>
        {result.referralCode && (
          <div className={styles.code}>
            <p>你的推薦碼</p>
            <strong>{result.referralCode}</strong>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  setCopied(false);
                }
              }}
            >
              {copied ? "已複製分享連結" : "複製分享連結"}
            </button>
            <p className={styles.hint}>朋友用你的連結登記，正式上市時雙方都有優惠。</p>
          </div>
        )}
      </div>
    );
  }

  const err = (k: string) =>
    errors[k] ? (
      <span className={styles.err} id={`${k}-err`}>
        {errors[k]}
      </span>
    ) : null;
  const aria = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${k}-err` } : {});

  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <div className={styles.grid}>
        <label className={styles.field}>
          <span>稱呼</span>
          <input name="name" autoComplete="nickname" maxLength={40} required {...aria("name")} />
          {err("name")}
        </label>
        <label className={styles.field}>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" maxLength={254} required {...aria("email")} />
          {err("email")}
        </label>
        <label className={styles.field}>
          <span>
            學校 <em>選填</em>
          </span>
          <input name="school" autoComplete="organization" maxLength={60} {...aria("school")} />
          {err("school")}
        </label>
        <label className={styles.field}>
          <span>居住縣市</span>
          <select name="county" defaultValue="" required {...aria("county")}>
            <option value="" disabled>
              請選擇
            </option>
            {COUNTIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {err("county")}
        </label>
        <label className={styles.field}>
          <span>膚質</span>
          <select name="skinType" defaultValue="" required {...aria("skinType")}>
            <option value="" disabled>
              請選擇
            </option>
            {SKIN_TYPES.map((s) => (
              <option key={s} value={s}>
                {SKIN_LABELS[s]}
              </option>
            ))}
          </select>
          {err("skinType")}
        </label>
        <label className={styles.field}>
          <span>單趟騎車通勤（分鐘）</span>
          <input name="commuteMinutes" type="number" inputMode="numeric" min={1} max={180} required {...aria("commuteMinutes")} />
          {err("commuteMinutes")}
        </label>
        <label className={styles.field}>
          <span>
            推薦碼 <em>選填</em>
          </span>
          <input
            name="referredBy"
            ref={refInput}
            onInput={(e) => {
              e.currentTarget.value = e.currentTarget.value.toUpperCase();
            }}
            maxLength={8}
            autoComplete="off"
            spellCheck={false}
            {...aria("referredBy")}
          />
          {err("referredBy")}
        </label>
      </div>

      {/* 防機器人：一般使用者看不到這個欄位 */}
      <div className={styles.trap} aria-hidden="true">
        <label>
          網站
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={styles.checks}>
        <label>
          <input type="checkbox" name="ageConfirm" {...aria("ageConfirm")} />
          我已年滿 18 歲
        </label>
        {err("ageConfirm")}
        <label>
          <input type="checkbox" name="consent" {...aria("consent")} />
          我已閱讀並同意
          <a href="/privacy" target="_blank" rel="noopener">
            個人資料蒐集告知事項
          </a>
        </label>
        {err("consent")}
        <label>
          <input type="checkbox" name="marketingOptIn" />
          上市時，願意收到產品與優惠通知（可隨時取消）
        </label>
      </div>

      {formError && (
        <p className={styles.formError} role="alert">
          {formError}
        </p>
      )}

      <button className={styles.submit} type="submit" disabled={status === "sending"}>
        {status === "sending" ? "送出中…" : "加入試用候補名單"}
      </button>
      <p className={styles.note}>
        登記不代表已獲得試用品。產品資訊檔案（PIF）與產品登錄完成後，才會依名單抽選、另外通知入選者提供寄送地址。
      </p>
    </form>
  );
}
