"use client";

import { useEffect, useRef, useState } from "react";

/** 進入畫面時從 0 數到目標數字；不是數字的內容（例如「Al」）直接顯示。 */
export default function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const target = Number(value);
  const numeric = value.trim() !== "" && Number.isFinite(target);
  const decimals = numeric ? (value.split(".")[1]?.length ?? 0) : 0;
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(numeric ? (0).toFixed(decimals) : value);

  useEffect(() => {
    if (!numeric) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      raf = requestAnimationFrame(() => setShown(target.toFixed(decimals)));
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / duration);
        const e = 1 - Math.pow(1 - t, 3);
        setShown((target * e).toFixed(decimals));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [numeric, target, decimals, duration]);

  return (
    <span ref={ref} aria-label={value}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
