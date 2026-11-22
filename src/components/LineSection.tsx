import { LINE_OA_ID, LINE_READY } from "@/lib/line";
import LineLink from "./LineLink";
import styles from "./LineSection.module.css";

/**
 * 官方 LINE 區塊：加入好友、分享領券、手機掃碼。
 * 「分享領券」會開啟聊天室並預填同名文字，對應 LINE 機器人的分享領券流程（line-bot/src/rules.ts）。
 * QR code 圖檔 public/line-qr.svg 內容為 https://line.me/R/ti/p/@789dpnrq，帳號 ID 改變時要重新產生。
 */
export default function LineSection() {
  return (
    <section id="line" className={styles.section} aria-labelledby="line-title">
      <div className={styles.text}>
        <p className={styles.eyebrow}>OFFICIAL LINE</p>
        <h2 id="line-title">加入官方 LINE，路上有小霧陪你</h2>
        <ul className={styles.list}>
          <li>
            <b>問小霧</b>
            <span>產品、成分、正確噴法、試用登記，隨時問隨時回；需要真人時輸入「真人客服」。</span>
          </li>
          <li>
            <b>分享領全館 9 折券</b>
            <span>
              在 Threads、Facebook 或 Instagram 發公開貼文，提到「機不可失」並加上 #分享領優惠，截圖傳給小霧。每個平台各領一次，活動至
              2026/12/31。想怎麼寫都可以，不需要說好話。
            </span>
          </li>
          <li>
            <b>上市第一手通知</b>
            <span>上市日期與價格確定後，會先通知官方 LINE 好友。</span>
          </li>
        </ul>
        <div className={styles.actions}>
          <LineLink className={styles.primary}>加入官方 LINE 好友</LineLink>
          <LineLink message="分享領券" className={styles.secondary}>
            我要分享領券
          </LineLink>
        </div>
      </div>
      {LINE_READY && (
        <figure className={styles.qr}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 小型 SVG，不需要圖片最佳化 */}
          <img src="/line-qr.svg" alt={`官方 LINE ${LINE_OA_ID} 加入好友 QR code`} width={180} height={180} />
          <figcaption>手機掃描加入 {LINE_OA_ID}</figcaption>
        </figure>
      )}
    </section>
  );
}
