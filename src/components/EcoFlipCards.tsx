"use client";

import { useId, useState, type ReactNode } from "react";
import { ECO_FACTS, type EcoFact } from "@/lib/ingredients";
import CountUp from "./CountUp";
import Reveal from "./Reveal";
import styles from "./EcoFlipCards.module.css";

const STATUS_TEXT = { estimate: "暫估值", pending: "驗證中", design: "設計規格" } as const;

/** 永續卡片：正面是重點數字，翻面看計算方式或更深入的說明。 */
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
  const [flipped, setFlipped] = useState(false);
  const id = useId();
  return (
    <div className={styles.card} data-flipped={flipped}>
      <div className={styles.inner}>
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
          <button type="button" className={styles.flip} aria-controls={id} aria-expanded={flipped} onClick={() => setFlipped(true)}>
            翻面看{back.title} <span aria-hidden="true">↻</span>
          </button>
        </section>

        <section id={id} className={styles.back} aria-hidden={!flipped} inert={!flipped} aria-label={back.title}>
          <h3>{back.title}</h3>
          <div className={styles.backBody}>{back.body}</div>
          <button type="button" className={styles.flip} onClick={() => setFlipped(false)}>
            翻回正面 <span aria-hidden="true">↺</span>
          </button>
        </section>
      </div>
    </div>
  );
}

/** ISO 16128-2：含水指數 = 水比例 + (1 − 水比例) × 不含水指數 */
function NaturalIndexCalc() {
  const [water, setWater] = useState(83);
  const dry = 87.5; // 不含水的天然來源指數（暫估，依原料商文件重算）
  const wet = water + ((100 - water) * dry) / 100;
  const id = useId();
  return (
    <div className={styles.calc}>
      <p>
        水本身算 100% 天然來源，所以配方含水越多，「含水指數」就越高。這就是為什麼兩個數字要一起標示。
      </p>
      <label htmlFor={id} className={styles.sliderLabel}>
        配方水含量 <strong>{water}%</strong>
      </label>
      <input
        id={id}
        type="range"
        min={50}
        max={95}
        value={water}
        onChange={(e) => setWater(Number(e.target.value))}
        className={styles.slider}
      />
      <div className={styles.bars}>
        <Bar label="含水指數" value={wet} />
        <Bar label="不含水指數" value={dry} muted />
      </div>
      <p className={styles.formula}>
        {water}% + {100 - water}% × {dry}% = <strong>{wet.toFixed(1)}%</strong>
      </p>
      <p className={styles.small}>本產品配方水約 83%，以原料商提供的 ISO 16128 文件重算後定案。</p>
    </div>
  );
}

function Bar({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={styles.bar}>
      <span>{label}</span>
      <span className={styles.track}>
        <span className={styles.fill} data-muted={muted} style={{ width: `${value}%` }} />
      </span>
      <span className={styles.barValue}>{value.toFixed(1)}%</span>
    </div>
  );
}

const BACKS: { title: string; body: ReactNode }[] = [
  { title: "怎麼算", body: <NaturalIndexCalc /> },
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
