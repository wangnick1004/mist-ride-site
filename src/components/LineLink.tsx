import type { ReactNode } from "react";
import { LINE_READY, lineAddFriendUrl, lineMessageUrl } from "@/lib/line";

/**
 * 官方 LINE 按鈕。設定好 NEXT_PUBLIC_LINE_OA_ID 時開啟 LINE；
 * 尚未設定時改成導向試用登記，並標示「官方 LINE 即將開放」。
 */
export default function LineLink({
  message,
  className,
  children,
}: {
  /** 有提供時會開啟聊天室並預填這段訊息，例如優惠券關鍵字 */
  message?: string;
  className?: string;
  children: ReactNode;
}) {
  const href = message ? lineMessageUrl(message) : lineAddFriendUrl();
  if (!LINE_READY || !href) {
    return (
      <a href="#trial" className={className} data-line="pending">
        {children}
        <small style={{ display: "block", fontSize: "0.72em", opacity: 0.8, marginTop: 2 }}>
          官方 LINE 即將開放，先加入試用候補名單
        </small>
      </a>
    );
  }
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer" data-line="ready">
      {children}
    </a>
  );
}
