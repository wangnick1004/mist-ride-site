import BubbleField from "./BubbleField";
import CountUp from "./CountUp";
import { MechanismAnim, SupportIcon } from "./MechanismAnim";
import Reveal from "./Reveal";
import { ECO_FACTS, FORMULA_FACTS, KEY_INGREDIENTS, SUPPORT_INGREDIENTS } from "@/lib/ingredients";
import styles from "./IngredientsSection.module.css";

const STATUS_TEXT = {
  estimate: "暫估值",
  pending: "驗證中",
  design: "設計規格",
} as const;

export default function IngredientsSection() {
  return (
    <section id="ingredients" className={styles.section} aria-labelledby="ingredients-title">
      {/* 延續上一頁的霧：會上升、會被推開、點一下會破的氣泡 */}
      <BubbleField className={styles.bubbles} />

      <header className={styles.head}>
        <Reveal>
          <p className={styles.kicker}>霧裡有什麼</p>
          <h2 id="ingredients-title">三個主角成分，一份說得清楚的成分表</h2>
          <p className={styles.lead}>
            每個成分都對應騎車通勤的一個困擾，也都標出證據來自哪一種研究。水滴裡的動畫是作用示意；試著把游標移到氣泡上，或點一下把它戳破。
          </p>
        </Reveal>
      </header>

      <ul className={styles.keyGrid}>
        {KEY_INGREDIENTS.map((ing, i) => (
          <Reveal as="li" key={ing.name} delay={i * 120} className={styles.keyCard}>
            <div className={styles.animWrap}>
              {ing.anim && <MechanismAnim kind={ing.anim} label={ing.animLabel ?? ing.role} />}
              <span className={styles.badge}>{ing.amount ?? "EGCG"}</span>
            </div>
            <p className={styles.role}>{ing.role}</p>
            <h3>{ing.name}</h3>
            <p className={styles.inci}>
              {ing.inci}・{ing.origin}
            </p>
            <p className={styles.body}>{ing.body}</p>
            <ul className={styles.tags} aria-label="證據類型">
              {ing.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Reveal>
        ))}
      </ul>

      <Reveal className={styles.supportWrap}>
        <h3 className={styles.subhead}>讓配方穩定的配角</h3>
        <dl className={styles.support}>
          {SUPPORT_INGREDIENTS.map((ing) => (
            <div key={ing.name} className={styles.row}>
              <dt>
                {ing.icon && <SupportIcon kind={ing.icon} />}
                <span className={styles.dtName}>{ing.name}</span>
                <span className={styles.dtRole}>{ing.role}</span>
              </dt>
              <dd>
                <span className={styles.inci}>
                  {ing.inci}・{ing.origin}
                </span>
                {ing.body}
              </dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <div className={styles.eco} aria-labelledby="eco-title">
        <Reveal>
          <p className={styles.kicker}>永續</p>
          <h2 id="eco-title">能驗證的，才寫出來</h2>
          <p className={styles.lead}>
            我們不寫「100% 永續」或「純天然」。每個數字都標明是設計規格、暫估值，還是仍在驗證中。
          </p>
        </Reveal>

        <ul className={styles.ecoGrid}>
          {ECO_FACTS.map((f, i) => (
            <Reveal as="li" key={f.label} delay={i * 100} className={styles.ecoCard}>
              <p className={styles.status} data-status={f.status}>
                {STATUS_TEXT[f.status]}
              </p>
              <p className={styles.value}>
                <CountUp value={f.value} />
                {f.unit && <small>{f.unit}</small>}
              </p>
              <h3>{f.label}</h3>
              <p className={styles.body}>{f.note}</p>
            </Reveal>
          ))}
        </ul>

        <Reveal>
          <ul className={styles.formula}>
            {FORMULA_FACTS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Reveal>
      </div>

      <Reveal className={styles.bridge}>
        <p>這些成分，裝在什麼樣的罐子裡？</p>
        <span aria-hidden="true">↓</span>
      </Reveal>
    </section>
  );
}
