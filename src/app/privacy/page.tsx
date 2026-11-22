import type { Metadata } from "next";
import Link from "next/link";
import { CONSENT_VERSION } from "@/lib/trial";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "個人資料蒐集告知事項",
  description: "機不可失化妝水（MIST-RIDE）試用登記與官方 LINE 客服的個人資料蒐集、處理及利用告知（個人資料保護法第 8 條）。",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy", title: "個人資料蒐集告知事項｜機不可失 MIST-RIDE" },
};

const CONTACT_EMAIL = "411313020@gms.ndhu.edu.tw";
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
        <p>機不可失（MIST-RIDE）團隊（以下稱「我們」）。聯絡方式：<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>。</p>
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
          <li>地區：中華民國境內，以及我們使用之雲端服務（Vercel 網站主機、Neon 資料庫、Cloudflare）所在地區，可能位於中華民國境外。</li>
          <li>對象：僅限我們內部經授權的成員；寄送試用品時，提供必要資訊給物流業者。不會出售或提供給其他第三方。</li>
          <li>方式：以電子方式儲存與處理，並採取加密傳輸、存取控管與操作紀錄等安全措施。</li>
        </ul>
      </section>

      <section>
        <h2>五、你的權利</h2>
        <p>
          依個人資料保護法第 3 條，你可以向我們請求查詢、閱覽、製給複本、補充或更正、停止蒐集處理利用，或刪除你的個人資料。請寄信到<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>，
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

      <section id="line">
        <h2>八、官方 LINE 客服與分享領券</h2>
        <p>
          以下說明適用於官方 LINE 帳號「機不可失 MIST-RIDE」（@789dpnrq）的客服小霧與「分享領券」活動。加入好友並傳送訊息，即表示你了解以下內容；不想被處理時，可以隨時封鎖或刪除好友。
        </p>
        <ul>
          <li>
            <b>蒐集目的：</b>回答產品問題、轉接真人客服（〇九〇 消費者、客戶管理與服務）；審核分享截圖並發放優惠券（〇四〇 行銷）。
          </li>
          <li>
            <b>蒐集的資料：</b>LINE 提供的用戶識別碼（不含你的姓名或電話）、你傳給小霧的文字訊息、你上傳的分享截圖，以及發給你的折扣碼與審核結果。
          </li>
          <li>
            <b>交給 AI 處理：</b>文字訊息與分享截圖會傳送給 Google Gemini API，由 AI 產生回覆或判讀截圖。文字訊息在傳送前會自動遮罩電話、Email、身分證字號、卡號與地址；
            <strong>截圖會以原圖傳送</strong>，請避免截到你不想提供的個人資料或他人留言。Google 可能依其服務條款處理這些內容，並可能涉及境外傳輸。
          </li>
          <li>
            <b>保存期間：</b>對話紀錄（已遮罩）保存 30 天後自動刪除；分享截圖保存 30 天供人工審核後自動刪除；審核紀錄（不含截圖）與折扣碼保存至優惠使用期限屆滿後 7 天。
            你封鎖或刪除好友時，對話紀錄會立即刪除。
          </li>
          <li>
            <b>地區與對象：</b>資料存放於 Cloudflare 的雲端服務（Workers、D1、KV），並由 Google 的 Gemini API 處理；只有我們內部經授權的審核人員可以查看截圖與審核紀錄。不會出售或提供給其他第三方。
          </li>
          <li>
            <b>優惠券規則：</b>領券只檢查是否公開分享與是否標示活動標籤，<strong>不以正面評價為條件</strong>，貼文內容想怎麼寫都可以。
          </li>
          <li>
            <b>你的權利：</b>與第五點相同，可以請求查詢、更正、停止處理或刪除，請寄信到<a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>，或在 LINE 輸入「真人客服」。
          </li>
        </ul>
      </section>
    </main>
  );
}
