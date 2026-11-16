// 前後端共用的選項清單（不依賴資料庫套件，前端表單可以直接匯入）

export const SKIN_TYPES = ["oily", "combination", "dry", "normal", "sensitive", "unsure"] as const;
export const COUNTIES = [
  "臺北市", "新北市", "桃園市", "臺中市", "臺南市", "高雄市", "基隆市", "新竹市", "嘉義市",
  "新竹縣", "苗栗縣", "彰化縣", "南投縣", "雲林縣", "嘉義縣", "屏東縣", "宜蘭縣", "花蓮縣",
  "臺東縣", "澎湖縣", "金門縣", "連江縣",
] as const;
export const SIGNUP_STATUS = ["pending", "approved", "shipped", "rejected"] as const;
