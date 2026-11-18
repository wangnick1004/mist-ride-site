"use client";

import { useId, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import { ECO_FACTS, NATURAL_ROWS, NATURAL_WATER_PCT, type EcoFact } from "@/lib/ingredients";
import CountUp from "./CountUp";
import Reveal from "./Reveal";
import styles from "./EcoFlipCards.module.css";

const STATUS_TEXT = { estimate: "暫估值", pending: "驗證中", design: "設計規格" } as const;
const SWIPE = 60; // 左右滑超過這個距離（px）就翻面

/** 永續卡片：正面是重點數字，翻面看計算方式或更深入的說明。可按按鈕，也可用手指左右滑動翻面。 */
export default function EcoFlipCards() {
  return (
    <ul className={styles.grid}>
      {ECO_FACTS.map((f, i) => (
        <Reveal as="li" key={f.label} delay={i * 100} className={styles.slot}>
          <FlipCard fact={f} back={BACKS[i]} />
        </Reveal>
      ))}
    </ul>
  );
}

function FlipCard({ fact, back }: { fact: EcoFact; back: { title: string; body: ReactNode } }) {
  // 用角度記錄翻面狀態：往左滑 −180°、往右滑 +180°，翻轉方向跟著手勢
  const [angle, setAngle] = useState(0);
  const [drag, setDrag] = useState(0);
  const start = useRef<{ x: number; y: number; id: number; horizontal: boolean | null } | null>(null);
  const id = useId();
  const flipped = Math.abs(Math.round(angle / 180)) % 2 === 1;

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("input, select, textarea")) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, horizontal: null };
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.horizontal === null && Math.hypot(dx, dy) > 8) {
      s.horizontal = Math.abs(dx) > Math.abs(dy);
      if (s.horizontal) e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (s.horizontal) setDrag(Math.max(-180, Math.min(180, dx * 0.6)));
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || s.id !== e.pointerId || !s.horizontal) {
      setDrag(0);
      return;
    }
    const dx = e.clientX - s.x;
    if (Math.abs(dx) > SWIPE) setAngle((a) => a + (dx > 0 ? 180 : -180));
    setDrag(0);
  };

  return (
    <div
      className={styles.card}
      data-flipped={flipped}
      data-dragging={drag !== 0}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div className={styles.inner} style={{ transform: `rotateY(${angle + drag}deg)` }}>
        <section className={styles.front} aria-hidden={flipped} inert={flipped}>
          <p className={styles.status} data-status={fact.status}>
            {STATUS_TEXT[fact.status]}
          </p>
          <p className={styles.value}>
            <CountUp value={fact.value} />
            {fact.unit && <small>{fact.unit}</small>}
          </p>
          <h3>{fact.label}</h3>
          <p className={styles.note}>{fact.note}</p>
          <button type="button" className={styles.flip} aria-controls={id} aria-expanded={flipped} onClick={() => setAngle((a) => a - 180)}>
            翻面看{back.title} <span aria-hidden="true">↻</span>
          </button>
          <p className={styles.swipeHint} aria-hidden="true">
            ← 也可以左右滑動翻面 →
          </p>
        </section>

        <section id={id} className={styles.back} aria-hidden={!flipped} inert={!flipped} aria-label={back.title}>
          <h3>{back.title}</h3>
          <div className={styles.backBody}>{back.body}</div>
          <button type="button" className={styles.flip} onClick={() => setAngle((a) => a + 180)}>
            翻回正面 <span aria-hidden="true">↺</span>
          </button>
        </section>
      </div>
    </div>
  );
}

/** ISO 16128-2 成分明細：配方水固定 83.15%，其餘成分以顏色區分 */
function NaturalIndexBreakdown() {
  const rest = NATURAL_ROWS.reduce((a, r) => a + r.pct, 0);
  const contrib = NATURAL_ROWS.reduce((a, r) => a + r.pct * r.index, 0);
  const withWater = NATURAL_WATER_PCT + contrib;
  const noWater = (contrib / rest) * 100;
  return (
    <div className={styles.calc}>
      <p>每個成分的貢獻 ＝ 配方比例 × 天然來源指數，全部加總就是產品的指數。</p>

      <p className={styles.barTitle}>全配方 100%</p>
      <div className={styles.stack} role="img" aria-label={`配方水 ${NATURAL_WATER_PCT}%，其他成分 ${rest.toFixed(2)}%`}>
        <span style={{ width: `${NATURAL_WATER_PCT}%`, background: "#9FD0E6" }}>
          <em>水 {NATURAL_WATER_PCT}%</em>
        </span>
        {NATURAL_ROWS.map((r) => (
          <span key={r.name} style={{ width: `${r.pct}%`, background: r.color }} />
        ))}
      </div>

      <p className={styles.barTitle}>放大：水以外的 {rest.toFixed(2)}%</p>
      <div className={styles.stack} role="img" aria-label="水以外的成分比例，灰色斜線代表非天然來源的部分">
        {NATURAL_ROWS.map((r) => {
          const natural = r.index * 100;
          return (
            <span
              key={r.name}
              title={`${r.name} ${r.pct}%`}
              style={{
                width: `${(r.pct / rest) * 100}%`,
                background:
                  r.index >= 1
                    ? r.color
                    : `linear-gradient(90deg, ${r.color} ${natural}%, transparent ${natural}%), repeating-linear-gradient(45deg, #c9cfd0 0 3px, #eef0f0 3px 6px)`,
              }}
            />
          );
        })}
      </div>

      <ul className={styles.legend}>
        <li>
          <i style={{ background: "#9FD0E6" }} />
          <span>配方水</span>
          <b>{NATURAL_WATER_PCT}%</b>
          <small>× 1</small>
        </li>
        {NATURAL_ROWS.map((r) => (
          <li key={r.name} title={r.note}>
            <i
              style={{
                background: r.index >= 1 ? r.color : `repeating-linear-gradient(45deg, ${r.color} 0 3px, #eef0f0 3px 6px)`,
              }}
            />
            <span>{r.name}</span>
            <b>{r.pct}%</b>
            <small>× {r.index}</small>
          </li>
        ))}
      </ul>

      <div className={styles.result}>
        <p>
          含配方水 <strong>{withWater.toFixed(1)}%</strong>
        </p>
        <p>
          不含水 <strong>{noWater.toFixed(1)}%</strong>
        </p>
      </div>
      <p className={styles.small}>
        斜線＝非天然來源的部分（例如菸鹼醯胺保守假設為石化路線）。數字為企劃書表 2-7 的基準情境暫估，定案前以原料商文件重算。
      </p>
    </div>
  );
}

const BACKS: { title: string; body: ReactNode }[] = [
  { title: "成分明細", body: <NaturalIndexBreakdown /> },
  {
    title: "和傳統噴霧比較",
    body: (
      <table className={styles.compare}>
        <thead>
          <tr>
            <th scope="col" />
            <th scope="col">袋式 BOV（本產品）</th>
            <th scope="col">傳統氣霧罐</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">推動方式</th>
            <td>壓縮空氣在內袋外圍施壓</td>
            <td>液化拋射劑和內容物混合</td>
          </tr>
          <tr>
            <th scope="row">化妝水接觸氣體</th>
            <td>不接觸</td>
            <td>接觸</td>
          </tr>
          <tr>
            <th scope="row">配方多一種成分</th>
            <td>否</td>
            <td>是（拋射劑）</td>
          </tr>
          <tr>
            <th scope="row">倒著拿能噴</th>
            <td>可以</td>
            <td>多半不行</td>
          </tr>
        </tbody>
      </table>
    ),
  },
  {
    title: "怎麼回收",
    body: (
      <ol className={styles.steps}>
        <li>
          <strong>噴到沒聲音</strong>確認內容物用完、罐內不再有壓力。
        </li>
        <li>
          <strong>不刺穿、不焚燒</strong>加壓容器請勿自行戳洞或丟進火裡。
        </li>
        <li>
          <strong>拿掉透明蓋</strong>塑膠蓋另外回收，鋁罐交給資源回收（依各地清潔隊規定）。
        </li>
      </ol>
    ),
  },
  {
    title: "要達到什麼標準",
    body: (
      <div className={styles.calc}>
        <p>OECD 301「易生物降解」的判定，大致是在 28 天的試驗中：</p>
        <ul className={styles.criteria}>
          <li>以二氧化碳生成量或耗氧量計算，分解達 60% 以上；或以溶解性有機碳計算，達 70% 以上</li>
          <li>而且要在開始分解後的「10 天窗口」內達標</li>
        </ul>
        <p className={styles.small}>
          目前正在向原料商索取戊二醇、辛醯羥肟酸、植酸鈉等原料的報告；拿到報告前，我們不對外宣稱「可降解」。
        </p>
      </div>
    ),
  },
];
