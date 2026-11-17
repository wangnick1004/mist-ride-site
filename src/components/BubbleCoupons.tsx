"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BUBBLE_COUPON } from "@/lib/line";
import BubbleField from "./BubbleField";
import LineLink from "./LineLink";
import styles from "./BubbleCoupons.module.css";

/**
 * 氣泡層＋優惠券提示。戳破金色「優惠」泡泡時跳出優惠券，按鈕開啟官方 LINE 並預填領券關鍵字。
 * 給無法拖曳畫布的使用者（鍵盤、螢幕閱讀器）另外提供「直接領取」按鈕。
 */
export default function BubbleCoupons({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState(0);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const onCoupon = useCallback(() => {
    setFound((n) => n + 1);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeBtn.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <BubbleField className={className} onCoupon={onCoupon} />

      <button type="button" className={styles.direct} onClick={onCoupon}>
        找不到金色泡泡？直接領取優惠券
      </button>

      {open && (
        <div className={styles.toast} role="dialog" aria-modal="false" aria-labelledby="coupon-title">
          <div className={styles.ticket}>
            <p className={styles.kicker}>{found > 1 ? `第 ${found} 張` : "戳到了！"}</p>
            <h3 id="coupon-title">{BUBBLE_COUPON.title}</h3>
            <p className={styles.detail}>{BUBBLE_COUPON.detail}</p>
            <p className={styles.code}>
              領券關鍵字 <strong>{BUBBLE_COUPON.keyword}</strong>
            </p>
            <LineLink message={BUBBLE_COUPON.keyword} className={styles.line}>
              到官方 LINE 領取
            </LineLink>
          </div>
          <button ref={closeBtn} type="button" className={styles.close} onClick={() => setOpen(false)} aria-label="關閉優惠券">
            ×
          </button>
        </div>
      )}
    </>
  );
}
