"use client";

import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import type { Ingredient } from "@/lib/ingredients";
import { MechanismAnim } from "./MechanismAnim";
import Reveal from "./Reveal";
import styles from "./IngredientCards.module.css";

/**
 * 三個主角成分的圖卡。點圖卡（或按 Enter）打開詳細說明：
 * 大尺寸作用示意動畫、三步驟作用、特色、證據與搭配。使用原生 <dialog>，
 * 內建焦點鎖定與 Esc 關閉。
 * 對話框裡可以左右滑動（或按方向鍵、點下方圓點）切換成分；
 * 第一次打開時卡片會輕輕往旁邊「翻一下」，提示可以滑動，不另外放文字。
 */
const SWIPE = 60;

export default function IngredientCards({ items }: { items: Ingredient[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [dir, setDir] = useState<"next" | "prev" | null>(null);
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(0);
  const [peek, setPeek] = useState(false);
  const start = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);
  const moved = useRef(false);
  const hinted = useRef(false); // 每次載入頁面只提示一次
  const open = index === null ? null : items[index];

  const show = (i: number) => {
    setIndex(i);
    setDir(null);
    setStep(0);
    dialog.current?.showModal();
    if (!hinted.current) {
      hinted.current = true;
      setPeek(true);
    }
  };
  const close = () => dialog.current?.close();
  const go = (delta: number) => {
    if (index === null) return;
    setIndex((index + delta + items.length) % items.length);
    setDir(delta > 0 ? "next" : "prev");
    setStep(0);
    setPeek(false);
    dialog.current?.scrollTo({ top: 0 });
  };

  useEffect(() => {
    if (!peek) return;
    const t = setTimeout(() => setPeek(false), 2600);
    return () => clearTimeout(t);
  }, [peek]);

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    moved.current = false;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null };
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.horizontal === null && Math.hypot(dx, dy) > 8) {
      s.horizontal = Math.abs(dx) > Math.abs(dy);
      if (s.horizontal) {
        moved.current = true;
        setPeek(false);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* 手指已經離開或瀏覽器不允許時略過，滑動仍可運作 */
        }
      }
    }
    if (s.horizontal) setDrag(dx);
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    setDrag(0);
    if (!s || s.id !== e.pointerId || !s.horizontal) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1);
  };

  return (
    <>
      <ul className={styles.grid}>
        {items.map((ing, i) => (
          <Reveal as="li" key={ing.name} delay={i * 120} className={styles.card}>
            <button type="button" className={styles.hit} onClick={() => show(i)} aria-haspopup="dialog">
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
        onClose={() => {
          setIndex(null);
          setPeek(false);
        }}
        onClick={(e) => {
          // 點對話框外的半透明背景也能關閉
          if (e.target === e.currentTarget) close();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(1);
          if (e.key === "ArrowLeft") go(-1);
        }}
      >
        {open?.detail && (
          <div
            key={open.name}
            className={styles.sheet}
            data-visible="true"
            data-dir={dir ?? undefined}
            data-peek={peek}
            data-dragging={drag !== 0}
            style={drag ? { transform: `translateX(${drag * 0.5}px) rotate(${drag * 0.01}deg)` } : undefined}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onClickCapture={(e) => {
              // 滑動結束時不要誤觸按鈕
              if (moved.current) {
                e.stopPropagation();
                e.preventDefault();
                moved.current = false;
              }
            }}
          >
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
        {open?.detail && (
          <nav className={styles.pager} aria-label="切換成分">
            <button type="button" className={styles.pageArrow} onClick={() => go(-1)} aria-label="上一個成分">
              ‹
            </button>
            {items.map((ing, i) => (
              <button
                key={ing.name}
                type="button"
                className={styles.dot}
                aria-label={ing.name}
                aria-current={i === index ? "true" : undefined}
                onClick={() => i !== index && go(i - (index ?? 0))}
              />
            ))}
            <button type="button" className={styles.pageArrow} onClick={() => go(1)} aria-label="下一個成分">
              ›
            </button>
          </nav>
        )}
      </dialog>
    </>
  );
}
