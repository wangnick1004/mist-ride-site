import type { Metadata } from "next";
import Link from "next/link";
import { CONSENT_VERSION } from "@/lib/trial";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "個人資料蒐集告知事項｜機不可失",
  description: "機不可失（MIST-RIDE）晨霧控油化妝水試用登記的個人資料蒐集、處理及利用告知（個人資料保護法第 8 條）。",
};

// 【】內為上線前需由團隊填寫的資訊
export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <Link href="/#trial" className={styles.back}>
        ← 回到試用登記
      </Link>
      <h1>個人資料蒐集告知事項</h1>
      <p className={styles.meta}>版本 {CONSENT_VERSION}・依個人資料保護法第 8 條告知</p>

      <section>
        <h2>一、蒐集者</h2>
        <p>機不可失（MIST-RIDE）團隊【團隊或公司正式名稱】（以下稱「我們」）。聯絡方式：【聯絡 Email】。</p>
      </section>

      <section>
        <h2>二、蒐集目的</h2>
        <ul>
          <li>試用品候補名單管理、抽選與入選通知（〇九〇 消費者、客戶管理與服務）</li>
          <li>推薦碼活動的計算與優惠發放（〇四〇 行銷）</li>
          <li>經你另外勾選同意後，寄送產品上市與優惠通知（〇四〇 行銷）</li>
          <li>以去識別化的統計方式，了解通勤族的膚質與通勤習慣，作為產品改良參考（一五七 調查、統計與研究分析）</li>
        </ul>
      </section>

      <section>
        <h2>三、個人資料類別</h2>
        <p>
          稱呼、Email（C001 辨識個人者）；學校（C051 學校紀錄，選填）；居住縣市、膚質、單趟通勤時間（C011 個人描述）；推薦碼與推薦關係。
          我們<strong>不</strong>蒐集電話、地址、生日或身分證字號；寄送地址只在你入選試用後另外向你詢問。
        </p>
      </section>

      <section>
        <h2>四、利用期間、地區、對象及方式</h2>
        <ul>
          <li>期間：自登記日起 1 年，或你要求刪除時為止；期滿後由系統自動刪除。</li>
          <li>地區：中華民國境內，以及我們使用之雲端主機與資料庫服務所在地區【服務商與地區】。</li>
          <li>對象：僅限我們內部經授權的成員；寄送試用品時，提供必要資訊給物流業者。不會出售或提供給其他第三方。</li>
          <li>方式：以電子方式儲存與處理，並採取加密傳輸、存取控管與操作紀錄等安全措施。</li>
        </ul>
      </section>

      <section>
        <h2>五、你的權利</h2>
        <p>
          依個人資料保護法第 3 條，你可以向我們請求查詢、閱覽、製給複本、補充或更正、停止蒐集處理利用，或刪除你的個人資料。請寄信到【聯絡 Email】，
          我們會在確認身分後處理。
        </p>
      </section>

      <section>
        <h2>六、不提供的影響</h2>
        <p>
          你可以自由選擇是否提供。若不提供必填欄位（稱呼、Email、居住縣市、膚質、通勤時間），將無法加入試用候補名單；學校、推薦碼與行銷通知為選填，不影響登記。
        </p>
      </section>

      <section>
        <h2>七、其他</h2>
        <p>試用登記僅限年滿 18 歲者。登記不代表已獲得試用品；試用品將在產品資訊檔案（PIF）與產品登錄完成後才會發放。</p>
      </section>
    </main>
  );
}
