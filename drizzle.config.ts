import { defineConfig } from "drizzle-kit";

// 產生 migration：npm run db:generate
// 套用到正式資料庫：DATABASE_URL=... npm run db:migrate
// （本機開發用的 PGlite 會在啟動時自動套用 drizzle/ 裡的 migration）
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : undefined,
  strict: true,
});
