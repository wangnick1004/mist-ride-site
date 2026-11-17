import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

// node-postgres 與 PGlite 都是 PostgreSQL，對外統一成共用的型別
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * 資料庫連線：
 * - 有設定 DATABASE_URL（正式環境，例如 Neon / Supabase 的 PostgreSQL）→ 使用 node-postgres
 * - 沒有設定（本機開發）→ 使用 PGlite，把 PostgreSQL 存在 website/.data/pglite，不必安裝資料庫
 * 兩者都是 PostgreSQL，schema 與 migration 完全相同。
 */

const MIGRATIONS = path.join(process.cwd(), "drizzle");

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    // 預設強制 TLS 並驗證憑證（Neon、Supabase 等外部資料庫）。
    // Zeabur 等平台的「內部網路」連線不走公開網路、也不提供 TLS，設定 DATABASE_SSL=disable 或在網址加 sslmode=disable。
    const sslMode = process.env.DATABASE_SSL ?? (url.includes("sslmode=disable") ? "disable" : "verify");
    const pool = new Pool({
      connectionString: url,
      max: 5,
      ssl: sslMode === "disable" ? false : { rejectUnauthorized: true },
    });
    const db = drizzle(pool, { schema });
    // 啟動時自動建立／更新資料表（已套用過的 migration 會略過）
    await migrate(db, { migrationsFolder: MIGRATIONS });
    return db as unknown as Db;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL 未設定：正式環境不能使用本機 PGlite。");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const dir = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const client = new PGlite(dir);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db as unknown as Db;
}

// 開發模式熱重載時重用同一個連線
const g = globalThis as unknown as { __shunluDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__shunluDb) {
    g.__shunluDb = createDb().catch((err) => {
      g.__shunluDb = undefined;
      throw err;
    });
  }
  return g.__shunluDb;
}

export { schema };
