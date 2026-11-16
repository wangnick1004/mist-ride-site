import { z } from "zod";
import { COUNTIES, SKIN_TYPES } from "@/lib/constants";

/** 個資告知的版本：告知內容（/privacy）改版時一併更新，資料庫會記下每筆登記同意的版本。 */
export const CONSENT_VERSION = "2026-11-16";

export const SKIN_LABELS: Record<(typeof SKIN_TYPES)[number], string> = {
  oily: "油性",
  combination: "混合性（T 字油、兩頰乾）",
  dry: "乾性",
  normal: "中性",
  sensitive: "敏感性",
  unsure: "不確定",
};

export const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉容易看錯的 I、O、0、1
export const REFERRAL_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/;

// 不允許控制字元（換行、NULL 等），避免名單匯出或後台顯示時被插入奇怪內容
// 也擋掉零寬字元與雙向文字控制字元（例如 U+202E 會讓文字反向顯示，可用來在後台偽裝內容）
const noControl = (s: string) =>
  !/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]/.test(s);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine(noControl, "含有不允許的字元")
    .optional()
    .transform((v) => (v ? v : undefined));

/** 試用登記表單：前端即時檢查與後端驗證共用同一份規則 */
export const trialSignupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "請填寫稱呼")
    .max(40, "稱呼最多 40 個字")
    .refine(noControl, "含有不允許的字元"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email 太長")
    .pipe(z.email("Email 格式不正確")),
  school: optionalText(60),
  county: z.enum(COUNTIES, "請選擇居住縣市"),
  skinType: z.enum(SKIN_TYPES, "請選擇膚質"),
  commuteMinutes: z.coerce
    .number("請填寫通勤時間")
    .int("請填寫整數分鐘")
    .min(1, "通勤時間至少 1 分鐘")
    .max(180, "通勤時間最多 180 分鐘"),
  referredBy: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || REFERRAL_RE.test(v), "推薦碼格式不正確"),
  marketingOptIn: z.boolean().default(false),
  ageConfirm: z.literal(true, "需年滿 18 歲才能登記"),
  consent: z.literal(true, "請先閱讀並同意個人資料告知事項"),
  // 防機器人：隱藏欄位必須是空的、填表時間不能太短
  website: z.string().max(0).optional(),
  elapsedMs: z.number().int().min(0).max(86_400_000),
});

export type TrialSignupInput = z.input<typeof trialSignupSchema>;
export type TrialSignupData = z.output<typeof trialSignupSchema>;
