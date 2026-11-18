import BubbleCoupons from "./BubbleCoupons";
import EcoFlipCards from "./EcoFlipCards";
import IngredientCards from "./IngredientCards";
import { SupportIcon } from "./MechanismAnim";
import Reveal from "./Reveal";
import { FORMULA_FACTS, KEY_INGREDIENTS, SUPPORT_INGREDIENTS } from "@/lib/ingredients";
import styles from "./IngredientsSection.module.css";

export default function IngredientsSection() {
  return (
    <section id="ingredients" className={styles.section} aria-labelledby="ingredients-title">
      {/* 延續上一頁的霧：可以拖曳、甩出去、戳破的氣泡；金色泡泡裡有優惠券 */}
      <BubbleCoupons className={styles.bubbles} />

      <header className={styles.head}>
        <Reveal>
          <p className={styles.kicker}>霧裡有什麼</p>
          <h2 id="ingredients-title">三個主角成分，一份說得清楚的成分表</h2>
          <p className={styles.lead}>
            每個成分都對應騎車通勤的一個困擾，也都標出證據來自哪一種研究。點圖卡看作用原理與證據。背景的氣泡可以拖著走、甩出去或戳破，金色泡泡裡藏著紅色優惠券，戳破就能領取。
          </p>
        </Reveal>
      </header>

      <IngredientCards items={KEY_INGREDIENTS} />

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
            我們不寫「100% 永續」或「純天然」。每個數字都標明是設計規格、暫估值，還是仍在驗證中；把卡片翻過來，看它是怎麼算的。
          </p>
        </Reveal>

        <EcoFlipCards />

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
