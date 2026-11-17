import AssemblyStory from "@/components/AssemblyStory";
import HelpBot from "@/components/HelpBot";
import HeroSpray from "@/components/HeroSpray";
import IngredientsSection from "@/components/IngredientsSection";
import PlaySection from "@/components/PlaySection";
import TrialForm from "@/components/TrialForm";
import styles from "./page.module.css";

export default function Home() {
  return (
    <>
      <header className={styles.nav}>
        <a href="#top" className={styles.brand} aria-label="順路 首頁">
          <svg viewBox="0 0 64 40" aria-hidden="true">
            <path d="M12 22 A20 20 0 0 1 52 22 Z" fill="currentColor" />
            <rect x="8" y="22" width="48" height="4" rx="2" fill="currentColor" />
            <path d="M14 33 H50" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="9 6" />
          </svg>
          順路
        </a>
        <nav aria-label="主要">
          <a href="#ingredients">成分與永續</a>
          <a href="#assembly">包裝與構造</a>
          <a href="#play">玩模型</a>
          <a href="#trial">試用登記</a>
        </nav>
      </header>

      <main id="top">
        {/* 1. 使用情境：噴出化妝水，鏡頭推進霧裡 */}
        <HeroSpray />

        {/* 2. 霧散開：成分與永續 */}
        <IngredientsSection />

        {/* 3. 外包裝與內部結構：捲動組裝 */}
        <div id="assembly">
          <AssemblyStory />
        </div>

        {/* 4. 自己玩模型：旋轉、拆解、透視、換色、試噴 */}
        <PlaySection />

        <section id="trial" className={styles.trial} aria-labelledby="trial-title">
          <h2 id="trial-title">加入校園試用候補名單</h2>
          <p>先登記，產品資訊檔案（PIF）與產品登錄完成後，我們會依名單抽選並通知入選者。</p>
          <TrialForm />
        </section>
      </main>

      <HelpBot />

      <footer className={styles.footer}>
        <p>本產品為一般化粧品，不含防曬成分，日間請另外搭配防曬。成分比例與永續數據以定案配方及檢驗報告為準。</p>
        <p>© 2026 順路</p>
      </footer>
    </>
  );
}
