import { count, desc, isNotNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb, schema } from "@/db";
import { purgeExpired } from "@/lib/server/retention";
import { currentAdmin } from "@/lib/server/session";
import { SKIN_LABELS } from "@/lib/trial";
import { LogoutButton, RowActions } from "./AdminControls";
import styles from "./admin.module.css";

const STATUS_LABEL = { pending: "待審", approved: "入選", shipped: "已寄出", rejected: "未入選" } as const;
const fmt = new Intl.DateTimeFormat("zh-TW", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Taipei" });

export default async function Dashboard() {
  // 名單與登入狀態一律在請求時讀取，不預先產生
  await connection();
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  await purgeExpired(admin.sub); // 順便清掉超過保存期限的資料

  const db = await getDb();
  const t = schema.trialSignups;
  const [[totals], byStatus, bySkin, byCounty, topReferrers, rows, audit] = await Promise.all([
    db
      .select({
        total: count(),
        optIn: sql<number>`count(*) filter (where ${t.marketingOptIn})`.mapWith(Number),
        avgCommute: sql<number>`coalesce(round(avg(${t.commuteMinutes})), 0)`.mapWith(Number),
      })
      .from(t),
    db.select({ k: t.status, n: count() }).from(t).groupBy(t.status),
    db.select({ k: t.skinType, n: count() }).from(t).groupBy(t.skinType).orderBy(desc(count())),
    db.select({ k: t.county, n: count() }).from(t).groupBy(t.county).orderBy(desc(count())).limit(6),
    db
      .select({ k: t.referredBy, n: count() })
      .from(t)
      .where(isNotNull(t.referredBy))
      .groupBy(t.referredBy)
      .orderBy(desc(count()))
      .limit(5),
    db.select().from(t).orderBy(desc(t.createdAt)).limit(200),
    db.select().from(schema.adminAuditLog).orderBy(desc(schema.adminAuditLog.at)).limit(8),
  ]);

  const statusCount = Object.fromEntries(byStatus.map((s) => [s.k, s.n]));

  return (
    <>
      <header className={styles.head}>
        <div>
          <h1>試用候補名單</h1>
          <p>
            共 {totals?.total ?? 0} 筆・願收行銷通知 {totals?.optIn ?? 0} 筆・平均單趟通勤 {totals?.avgCommute ?? 0} 分鐘
          </p>
        </div>
        <div className={styles.headActions}>
          <a className={styles.button} href="/api/admin/export">
            匯出 CSV
          </a>
          <LogoutButton />
        </div>
      </header>

      <section className={styles.stats}>
        <div>
          <h2>狀態</h2>
          <ul>
            {(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((k) => (
              <li key={k}>
                {STATUS_LABEL[k]} <b>{statusCount[k] ?? 0}</b>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>膚質</h2>
          <ul>
            {bySkin.map((s) => (
              <li key={s.k}>
                {SKIN_LABELS[s.k]} <b>{s.n}</b>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>縣市（前 6）</h2>
          <ul>
            {byCounty.map((c) => (
              <li key={c.k}>
                {c.k} <b>{c.n}</b>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>推薦排行</h2>
          <ul>
            {topReferrers.length === 0 && <li>尚無推薦</li>}
            {topReferrers.map((r) => (
              <li key={r.k}>
                <code>{r.k}</code> <b>{r.n}</b>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles.tableWrap}>
        <h2>最新 200 筆</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>登記時間</th>
              <th>稱呼</th>
              <th>Email</th>
              <th>學校</th>
              <th>縣市</th>
              <th>膚質</th>
              <th>通勤</th>
              <th>推薦碼／推薦人</th>
              <th>狀態</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={9}>還沒有人登記。</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{fmt.format(r.createdAt)}</td>
                <td>{r.name}</td>
                <td>{r.email}</td>
                <td>{r.school ?? "—"}</td>
                <td>{r.county}</td>
                <td>{SKIN_LABELS[r.skinType]}</td>
                <td>{r.commuteMinutes} 分</td>
                <td>
                  <code>{r.referralCode}</code>
                  {r.referredBy && <small> ← {r.referredBy}</small>}
                </td>
                <td>
                  <RowActions id={r.id} status={r.status} name={r.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.audit}>
        <h2>最近操作紀錄</h2>
        <ul>
          {audit.map((a) => (
            <li key={a.id}>
              {fmt.format(a.at)}・{a.actor}・{a.action}
              {a.target ? `・${a.target}` : ""}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
