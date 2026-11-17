"use client";

import { useRef, useState } from "react";
import type { Ingredient } from "@/lib/ingredients";
import { MechanismAnim } from "./MechanismAnim";
import Reveal from "./Reveal";
import styles from "./IngredientCards.module.css";

/**
 * 三個主角成分的圖卡。點圖卡（或按 Enter）打開詳細說明：
 * 大尺寸作用示意動畫、三步驟作用、特色、證據與搭配。使用原生 <dialog>，
 * 內建焦點鎖定與 Esc 關閉。
 */
export default function IngredientCards({ items }: { items: Ingredient[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<Ingredient | null>(null);
  const [step, setStep] = useState(0);

  const show = (ing: Ingredient) => {
    setOpen(ing);
    setStep(0);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  return (
    <>
      <ul className={styles.grid}>
        {items.map((ing, i) => (
          <Reveal as="li" key={ing.name} delay={i * 120} className={styles.card}>
            <button type="button" className={styles.hit} onClick={() => show(ing)} aria-haspopup="dialog">
              <span className={styles.animWrap}>
                {ing.anim && <MechanismAnim kind={ing.anim} label={ing.animLabel ?? ing.role} />}
                <span className={styles.badge}>{ing.amount ?? "EGCG"}</span>
              </span>
              <span className={styles.role}>{ing.role}</span>
              <span className={styles.name}>{ing.name}</span>
              <span className={styles.inci}>
                {ing.inci}・{ing.origin}
              </span>
              <span className={styles.body}>{ing.body}</span>
              <span className={styles.tags}>
                {ing.evidence.map((e) => (
                  <span key={e}>{e}</span>
                ))}
              </span>
              <span className={styles.more}>
                看作用原理與證據 <span aria-hidden="true">→</span>
              </span>
            </button>
          </Reveal>
        ))}
      </ul>

      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby="ing-dialog-title"
        onClose={() => setOpen(null)}
        onClick={(e) => {
          // 點對話框外的半透明背景也能關閉
          if (e.target === e.currentTarget) close();
        }}
      >
        {open?.detail && (
          <div className={styles.sheet} data-visible="true">
            <button type="button" className={styles.close} onClick={close} aria-label="關閉">
              ×
            </button>

            <div className={styles.sheetGrid}>
              <div className={styles.sheetAnim}>
                {open.anim && <MechanismAnim kind={open.anim} label={open.animLabel ?? open.role} />}
                <span className={styles.badge}>{open.amount ?? "EGCG"}</span>
              </div>

              <div>
                <p className={styles.role}>{open.role}</p>
                <h3 id="ing-dialog-title" className={styles.sheetTitle}>
                  {open.name}
                </h3>
                <p className={styles.inci}>
                  {open.inci}・{open.origin}
                </p>
                <p className={styles.headline}>{open.detail.headline}</p>

                {/* 三步驟作用：可點選切換 */}
                <ol className={styles.steps} aria-label="作用步驟">
                  {open.detail.steps.map((s, i) => (
                    <li key={s.title}>
                      <button
                        type="button"
                        aria-pressed={i === step}
                        className={styles.stepBtn}
                        onClick={() => setStep(i)}
                      >
                        <span className={styles.stepNo}>{i + 1}</span>
                        {s.title}
                      </button>
                    </li>
                  ))}
                </ol>
                <p className={styles.stepText} aria-live="polite">
                  {open.detail.steps[step]?.text}
                </p>
              </div>
            </div>

            <div className={styles.facts}>
              <section>
                <h4>成分特色</h4>
                <ul>
                  {open.detail.highlights.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h4>證據從哪來</h4>
                <p className={styles.tagsInline}>
                  {open.evidence.map((e) => (
                    <span key={e}>{e}</span>
                  ))}
                </p>
                <p>{open.detail.evidenceNote}</p>
              </section>
              <section>
                <h4>和誰搭配</h4>
                <p>{open.detail.pairing}</p>
              </section>
            </div>

            <p className={styles.disclaimer}>
              動畫為作用示意。本產品為一般化粧品，功效以上市前的功效測試結果為準。
            </p>
          </div>
        )}
      </dialog>
    </>
  );
}
