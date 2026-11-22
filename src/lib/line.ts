/**
 * 官方 LINE 設定。
 *
 * 帳號建立後，只要在 Vercel 的 Environment Variables 加上：
 *   NEXT_PUBLIC_LINE_OA_ID=@你的LINE官方帳號ID   （例如 @mistride，要包含 @）
 * 再重新部署，網站上所有「官方 LINE」按鈕、優惠券、客服都會自動啟用，不必改程式。
 * 尚未設定時，按鈕會顯示「官方 LINE 即將開放」，並改導向試用登記。
 */

const RAW_ID = (process.env.NEXT_PUBLIC_LINE_OA_ID ?? "").trim();

// 只接受 LINE 官方帳號 ID 的格式，避免設定錯誤時產生奇怪的連結
export const LINE_OA_ID = /^@[a-z0-9._-]{3,30}$/i.test(RAW_ID) ? RAW_ID : "";
export const LINE_READY = LINE_OA_ID !== "";

/** 加入好友連結 */
export function lineAddFriendUrl(): string | null {
  return LINE_READY ? `https://line.me/R/ti/p/${encodeURIComponent(LINE_OA_ID)}` : null;
}

/** 開啟官方帳號聊天室，並預先填好一段訊息（使用者仍需自己按送出） */
export function lineMessageUrl(text: string): string | null {
  return LINE_READY
    ? `https://line.me/R/oaMessage/${encodeURIComponent(LINE_OA_ID)}/?${encodeURIComponent(text)}`
    : null;
}

/**
 * 氣泡裡的優惠券。金額與使用條件由團隊決定後修改這裡；
 * 依企劃書規定，優惠券不以正面評價或發文為條件。
 */
export const BUBBLE_COUPON = {
  keyword: "晨霧泡泡券",
  title: "晨霧泡泡優惠券",
  detail: "產品上市後首購可用，金額與使用期限以官方 LINE 公告為準。",
};
