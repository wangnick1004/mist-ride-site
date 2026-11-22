/**
 * 右下角小幫手的決策樹（不使用 AI 模型，所有回答都是事先寫好的）。
 * 修改回答：直接改這裡的文字；新增分支：加一個節點並在選項的 next 指到它。
 * 選項種類：
 *   next：前往另一個節點
 *   href：捲到網頁上的某個區塊（例如 #ingredients）
 *   line：開啟官方 LINE 並預填這段訊息（LINE 尚未開放時改導向試用登記）
 * 說明文字限用一般化粧品可用的說法，不提供醫療建議。
 */

export interface BotOption {
  label: string;
  next?: string;
  href?: string;
  line?: string;
}

export interface BotNode {
  id: string;
  text: string[];
  options: BotOption[];
}

const BACK: BotOption = { label: "回到主選單", next: "root" };

export const BOT_NODES: Record<string, BotNode> = {
  root: {
    id: "root",
    text: ["嗨騎士，我是小霧 👋", "想了解哪一方面呢？"],
    options: [
      { label: "怎麼使用", next: "use" },
      { label: "適合我的膚質嗎", next: "skin" },
      { label: "成分與安全", next: "safety" },
      { label: "試用與優惠", next: "trial" },
      { label: "什麼時候上市", next: "launch" },
      { label: "其他問題", next: "other" },
    ],
  },
  use: {
    id: "use",
    text: [
      "洗臉後閉上眼睛，距離臉約 20 公分輕壓噴頭，再輕拍到吸收。",
      "袋式設計倒著拿也能噴，出門前戴安全帽之前噴一下就好。",
      "提醒你：本產品不含防曬，白天請另外擦防曬。",
    ],
    options: [
      { label: "看罐子怎麼運作", href: "#assembly" },
      { label: "需要多久噴一次？", next: "useFreq" },
      BACK,
    ],
  },
  useFreq: {
    id: "useFreq",
    text: [
      "建議早上出門前使用；在冷氣房覺得乾，也可以再噴一次。",
      "實際的建議用量會在上市前依感官測試結果訂定。",
    ],
    options: [{ label: "還有問題，問真人", line: "我想詢問使用方式" }, BACK],
  },
  skin: {
    id: "skin",
    text: ["你的膚質比較接近哪一種？"],
    options: [
      { label: "容易出油", next: "skinOily" },
      { label: "外油內乾", next: "skinCombo" },
      { label: "敏感肌", next: "skinSensitive" },
      { label: "乾性肌", next: "skinDry" },
      BACK,
    ],
  },
  skinOily: {
    id: "skinOily",
    text: ["2% 菸鹼醯胺可以調理肌膚油水平衡，幫助控油，很適合安全帽一戴就悶出油的你。"],
    options: [{ label: "看菸鹼醯胺的作用", href: "#ingredients" }, BACK],
  },
  skinCombo: {
    id: "skinCombo",
    text: ["T 字出油、兩頰乾是騎車通勤族很常見的狀況。菸鹼醯胺負責控油，依克多因和丙二醇負責保濕。"],
    options: [{ label: "看依克多因的作用", href: "#ingredients" }, BACK],
  },
  skinSensitive: {
    id: "skinSensitive",
    text: [
      "第一次使用前，建議先在耳後或手臂內側小範圍試用一兩天。",
      "如果出現紅、癢、刺痛等不適，請停止使用；狀況持續時請諮詢皮膚科醫師。",
      "上市前會完成人體重複斑貼試驗（HRIPT），結果會放在產品資訊檔案中。",
    ],
    options: [{ label: "詢問真人", line: "我是敏感肌，想詢問成分" }, BACK],
  },
  skinDry: {
    id: "skinDry",
    text: ["這是一款清爽的水性化妝水，主打控油與保濕。乾性肌如果覺得不夠滋潤，可以在之後疊擦你習慣的乳液。"],
    options: [BACK],
  },
  safety: {
    id: "safety",
    text: ["想了解哪一部分？"],
    options: [
      { label: "有哪些成分", href: "#ingredients" },
      { label: "怎麼防腐", next: "preserve" },
      { label: "噴霧安全嗎", next: "spraySafe" },
      { label: "永續與回收", href: "#ingredients" },
      BACK,
    ],
  },
  preserve: {
    id: "preserve",
    text: [
      "配方以戊二醇＋辛醯羥肟酸作為抑菌保存系統，並搭配植酸鈉螯合。",
      "上市前必須通過 ISO 11930 防腐效能試驗；目前也正在向食藥署確認適法性，備案為苯氧乙醇。",
    ],
    options: [BACK],
  },
  spraySafe: {
    id: "spraySafe",
    text: [
      "請閉眼使用，避免噴向眼睛、口、鼻。",
      "這是加壓容器：請勿放在 50 °C 以上的地方，也不要放在機車坐墊下，不可刺穿或焚燒。",
    ],
    options: [BACK],
  },
  trial: {
    id: "trial",
    text: [
      "目前開放校園試用候補登記；產品資訊檔案與產品登錄完成後，會依名單抽選並通知入選者。",
      "成分頁的金色泡泡裡也藏著上市優惠券喔。",
    ],
    options: [
      { label: "前往試用登記", href: "#trial" },
      { label: "去找優惠泡泡", href: "#ingredients" },
      { label: "用 LINE 問試用", line: "我想詢問試用活動" },
      BACK,
    ],
  },
  launch: {
    id: "launch",
    text: ["產品還在上市前的檢驗與登錄階段，確定上市日期與價格後，會先通知試用登記與官方 LINE 的好友。"],
    options: [{ label: "加入官方 LINE 等通知", line: "我想收到上市通知" }, { label: "前往試用登記", href: "#trial" }, BACK],
  },
  other: {
    id: "other",
    text: ["這個問題交給真人回答比較好。點下面的按鈕到官方 LINE，我們的團隊會回覆你。"],
    options: [{ label: "到官方 LINE 問真人", line: "你好，我有問題想詢問" }, BACK],
  },
};
