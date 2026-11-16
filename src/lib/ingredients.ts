// 成分與永續內容。資料來源：《日間防護控油化妝水》簡報第 7、8、11 頁與《化妝品產品行銷企劃書_v3》。
// 宣稱用語限於官方例示詞句（控油、保濕、提升肌膚對環境傷害的保護力）；成分本身的特性以「成分特性」描述，不寫成產品療效。

import type { MechanismKind, SupportIconKind } from "@/components/MechanismAnim";

export type Evidence = "雙盲人體試驗" | "體外試驗" | "功能性成分";

export interface Ingredient {
  name: string;
  inci: string;
  amount?: string;
  role: string;
  origin: string;
  body: string;
  evidence: Evidence[];
  /** 主角成分的作用示意動畫 */
  anim?: MechanismKind;
  animLabel?: string;
  /** 配角成分的小圖示 */
  icon?: SupportIconKind;
}

export const KEY_INGREDIENTS: Ingredient[] = [
  {
    name: "菸鹼醯胺",
    inci: "Niacinamide",
    amount: "2%",
    role: "控油",
    origin: "維生素 B3",
    body: "調理肌膚油水平衡。安全帽和口罩悶熱、T 字部位容易出油時，幫皮膚維持清爽。",
    evidence: ["雙盲人體試驗"],
    anim: "oil",
    animLabel: "示意：細霧落在皮膚上，油光慢慢收斂",
  },
  {
    name: "依克多因",
    inci: "Ectoin",
    amount: "2%",
    role: "保濕",
    origin: "微生物發酵",
    body: "幫助肌膚保濕，改善「外油內乾」。體外研究也顯示，它有助於減少環境微粒造成的刺激。",
    evidence: ["雙盲人體試驗", "體外試驗"],
    anim: "water",
    animLabel: "示意：水分子聚在依克多因周圍，形成保濕水層",
  },
  {
    name: "綠茶萃取",
    inci: "Camellia Sinensis Leaf Extract（EGCG）",
    role: "環境防護",
    origin: "植物多酚",
    body: "EGCG 具有清除自由基的成分特性，協助提升肌膚對環境傷害的保護力。怕光，所以裝在不透光的鋁罐裡。",
    evidence: ["體外試驗"],
    anim: "shield",
    animLabel: "示意：環境刺激靠近時被攔下",
  },
];

export const SUPPORT_INGREDIENTS: Ingredient[] = [
  {
    name: "生物基 1,3-丙二醇",
    inci: "Propanediol",
    role: "保濕・溶劑",
    origin: "玉米糖發酵",
    body: "保濕，也幫其他成分溶解，取代石化來源的二醇類。",
    evidence: ["功能性成分"],
    icon: "drop",
  },
  {
    name: "檸檬酸／檸檬酸鈉",
    inci: "Citric Acid / Sodium Citrate",
    role: "pH 緩衝",
    origin: "發酵來源",
    body: "把 pH 維持在 5.0–5.5，讓菸鹼醯胺與 EGCG 都保持穩定。",
    evidence: ["功能性成分"],
    icon: "ph",
  },
  {
    name: "戊二醇＋辛醯羥肟酸",
    inci: "Pentylene Glycol + Caprylhydroxamic Acid",
    role: "抑菌保存",
    origin: "多功能成分",
    body: "保存系統的主方案，須通過 ISO 11930 防腐效能試驗；正在函詢食藥署，備案為苯氧乙醇。",
    evidence: ["功能性成分"],
    icon: "guard",
  },
  {
    name: "植酸鈉",
    inci: "Sodium Phytate",
    role: "螯合",
    origin: "植物來源",
    body: "取代 EDTA，抓住水中的金屬離子，降低成分氧化的機會。",
    evidence: ["功能性成分"],
    icon: "chelate",
  },
];

export interface EcoFact {
  value: string;
  unit?: string;
  label: string;
  note: string;
  status: "estimate" | "pending" | "design";
}

export const ECO_FACTS: EcoFact[] = [
  {
    value: "97.9",
    unit: "%",
    label: "天然來源指數（含水）",
    note: "依 ISO 16128-2 計算。不含水時為 87.5%，兩個數字一起標示。",
    status: "estimate",
  },
  {
    value: "0",
    label: "碳氫拋射劑",
    note: "袋式 BOV 用壓縮空氣推出內容物，化妝水不接觸氣體。",
    status: "design",
  },
  {
    // 企劃書要求避免「100%」類的絕對宣稱，這裡只寫材質事實
    value: "Al",
    label: "鋁罐可回收",
    note: "鋁罐用完可以直接回收；包材組成以實際供應商規格為準。",
    status: "design",
  },
  {
    value: "OECD 301",
    label: "易生物降解",
    note: "正在向原料商索取報告，取得前不對外宣稱「可降解」。",
    status: "pending",
  },
];

export const FORMULA_FACTS = [
  "水性配方：不含油相、乳化劑、增稠劑",
  "常溫冷製程，減少加熱耗能",
  "不含防曬成分，誠實提醒你另外擦防曬",
  "全成分數量以 13 種以內為目標",
];
