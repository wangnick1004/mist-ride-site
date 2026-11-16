import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// 個資最小化：只收寄送試用品與候補通知需要的欄位，不收電話、地址、生日、身分證。
// 寄送地址等試用正式開放、確定名單後再另外向入選者收集。

import { COUNTIES, SIGNUP_STATUS, SKIN_TYPES } from "@/lib/constants";

export { COUNTIES, SIGNUP_STATUS, SKIN_TYPES };

export const skinType = pgEnum("skin_type", SKIN_TYPES);
export const county = pgEnum("county", COUNTIES);
export const signupStatus = pgEnum("signup_status", SIGNUP_STATUS);

export const trialSignups = pgTable(
  "trial_signups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    name: varchar("name", { length: 40 }).notNull(),
    email: varchar("email", { length: 254 }).notNull(), // 一律存小寫
    school: varchar("school", { length: 60 }),
    county: county("county").notNull(),
    skinType: skinType("skin_type").notNull(),
    commuteMinutes: smallint("commute_minutes").notNull(),
    referralCode: varchar("referral_code", { length: 12 }).notNull(),
    referredBy: varchar("referred_by", { length: 12 }),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
    consentVersion: varchar("consent_version", { length: 20 }).notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    status: signupStatus("status").notNull().default("pending"),
    // 資料保存期限：到期後由 purgeExpired() 刪除（後台載入時與 /api/cron/purge 排程，見隱私權告知）
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '1 year'`),
  },
  (t) => [
    uniqueIndex("trial_signups_email_uq").on(t.email),
    uniqueIndex("trial_signups_referral_uq").on(t.referralCode),
    index("trial_signups_created_idx").on(t.createdAt),
    index("trial_signups_referred_by_idx").on(t.referredBy),
  ],
);

// 後台操作紀錄：誰在什麼時候看過、匯出或修改了名單
export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actor: varchar("actor", { length: 60 }).notNull(),
    action: varchar("action", { length: 40 }).notNull(),
    target: text("target"),
  },
  (t) => [index("admin_audit_at_idx").on(t.at)],
);

export type TrialSignup = typeof trialSignups.$inferSelect;
