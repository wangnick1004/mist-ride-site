"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { STEPS, stepAt } from "@/lib/assembly";
import styles from "./AssemblyStory.module.css";

const CanScene = dynamic(() => import("./CanScene"), {
  ssr: false,
  loading: () => <div className={styles.loading}>3D 模型載入中…</div>,
});

const INTRO_END = 0.012;

export default function AssemblyStory() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [active, setActive] = useState(-1);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      const p = Math.min(1, Math.max(0, -rect.top / (span || 1)));
      progress.current = p;
      setActive(p < INTRO_END ? -1 : stepAt(p));
      setPct(p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const step = active >= 0 ? STEPS[active] : null;

  return (
    <section ref={section} className={styles.story} aria-labelledby="assembly-title">
      <div className={styles.sticky}>
        <div className={styles.caption}>
          <p className={styles.kicker}>拆開來看</p>
          <h2 id="assembly-title" className={styles.title}>
            一支晨霧噴罐，由 14 個零件組成
          </h2>

          <div className={styles.slot} aria-live="polite">
            {step ? (
              <article key={step.key} className={styles.step}>
                <p className={styles.index}>
                  {step.index} <span>/ {String(STEPS.length).padStart(2, "0")}</span>
                </p>
                <h3>{step.title}</h3>
                <p className={styles.material}>{step.material}</p>
                <p>{step.body}</p>
              </article>
            ) : (
              <article className={styles.step}>
                <p>往下捲動，零件會一個一個裝進罐子裡。罐身先剖開一半，讓你看見裡面的內袋和閥門。</p>
              </article>
            )}
          </div>

          <ol className={styles.rail} aria-label="組裝步驟">
            {STEPS.map((s, i) => (
              <li key={s.key} data-state={i < active ? "done" : i === active ? "now" : "next"} title={s.title}>
                <span className={styles.srOnly}>{s.title}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className={styles.canvas}>
          <CanScene progress={progress} />
          <div className={styles.meter} aria-hidden="true">
            <span style={{ transform: `scaleX(${pct})` }} />
          </div>
        </div>
      </div>
    </section>
  );
}
