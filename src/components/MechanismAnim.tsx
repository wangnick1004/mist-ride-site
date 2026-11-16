import styles from "./MechanismAnim.module.css";

export type MechanismKind = "oil" | "water" | "shield";
export type SupportIconKind = "drop" | "ph" | "guard" | "chelate";

/**
 * 主角成分的作用示意動畫（純 SVG＋CSS）。
 * 卡片進入畫面（Reveal 加上 data-visible）後才開始播放；減少動態效果時停在說明畫面。
 */
export function MechanismAnim({ kind, label }: { kind: MechanismKind; label: string }) {
  return (
    <figure className={styles.figure} data-kind={kind}>
      <svg viewBox="0 0 200 160" role="img" aria-label={label} className={styles.svg}>
        <defs>
          <radialGradient id={`drop-${kind}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#e3f1ec" />
            <stop offset="100%" stopColor="#b9dcd3" />
          </radialGradient>
          <clipPath id={`clip-${kind}`}>
            <path d="M100 6 C132 46 168 70 168 104 A68 52 0 0 1 32 104 C32 70 68 46 100 6 Z" />
          </clipPath>
        </defs>

        {/* 水滴外框 */}
        <path
          className={styles.dropShape}
          d="M100 6 C132 46 168 70 168 104 A68 52 0 0 1 32 104 C32 70 68 46 100 6 Z"
          fill={`url(#drop-${kind})`}
        />

        <g clipPath={`url(#clip-${kind})`}>
          {/* 皮膚表面 */}
          <path className={styles.skin} d="M20 132 Q100 118 180 132 L180 170 L20 170 Z" />
          <path className={styles.skinLine} d="M20 132 Q100 118 180 132" />

          {kind === "oil" && <Oil />}
          {kind === "water" && <Water />}
          {kind === "shield" && <Shield />}
        </g>

        <path
          className={styles.rim}
          d="M100 6 C132 46 168 70 168 104 A68 52 0 0 1 32 104 C32 70 68 46 100 6 Z"
        />
        <ellipse cx="78" cy="58" rx="9" ry="5" transform="rotate(-35 78 58)" fill="#fff" opacity="0.9" />
      </svg>
      <figcaption className={styles.caption}>{label}</figcaption>
    </figure>
  );
}

/** 菸鹼醯胺：細霧落下，皮膚表面的油光逐漸變小 */
function Oil() {
  const oils = [
    [58, 126, 9],
    [84, 123, 7],
    [108, 122, 10],
    [134, 124, 7],
    [152, 128, 6],
  ];
  return (
    <g>
      {oils.map(([cx, cy, r], i) => (
        <ellipse
          key={i}
          className={styles.oil}
          cx={cx}
          cy={cy}
          rx={r}
          ry={r * 0.55}
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
      {[66, 92, 118, 144, 80, 130].map((x, i) => (
        <circle
          key={i}
          className={styles.mist}
          cx={x}
          cy={44}
          r={3.2}
          style={{ animationDelay: `${i * 0.38}s` }}
        />
      ))}
      <text className={styles.tag} x="100" y="96" textAnchor="middle">
        油光
        <tspan className={styles.arrowDown}> ↓</tspan>
      </text>
    </g>
  );
}

/** 依克多因：水分子聚到依克多因周圍，形成一圈保濕水層 */
function Water() {
  const n = 10;
  return (
    <g>
    <g className={styles.spin}>
      <g className={styles.ectoin}>
        <polygon points="100,74 113,81 113,95 100,102 87,95 87,81" />
      </g>
      <circle className={styles.shell} cx="100" cy="88" r="26" />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return (
          <g key={i} transform={`translate(100 88) rotate(${(a * 180) / Math.PI})`}>
            <g className={styles.waterOrbit} style={{ animationDelay: `${i * 0.08}s` }}>
              <circle className={styles.water} cx="26" cy="0" r="4.2" />
            </g>
          </g>
        );
      })}
    </g>
      <text className={styles.tag} x="100" y="146" textAnchor="middle">
        保濕水層
      </text>
    </g>
  );
}

/** 綠茶 EGCG：環境中的自由基靠近時被攔下、轉成無害的圓點 */
function Shield() {
  // [起點 x, 起點 y, 撞到防護弧的位置 x, y]
  const rads = [
    [150, 26, 128, 86],
    [182, 56, 146, 96],
    [118, 14, 106, 80],
    [188, 96, 156, 104],
  ];
  return (
    <g>
      <path className={styles.shieldArc} d="M38 112 Q100 58 162 112" />
      {rads.map(([x, y, ex, ey], i) => (
        <g
          key={i}
          className={styles.radical}
          style={{
            animationDelay: `${i * 0.75}s`,
            ["--sx" as string]: `${x}px`,
            ["--sy" as string]: `${y}px`,
            ["--ex" as string]: `${ex}px`,
            ["--ey" as string]: `${ey}px`,
          }}
        >
          <path className={styles.spiky} style={{ animationDelay: `${i * 0.75}s` }} d="M0 -7 L2 -2 L7 0 L2 2 L0 7 L-2 2 L-7 0 L-2 -2 Z" />
          <circle className={styles.calm} style={{ animationDelay: `${i * 0.75}s` }} r="4" />
        </g>
      ))}
      <path className={styles.leaf} d="M88 104 Q100 84 116 92 Q108 110 88 104 Z" />
      <path className={styles.leafVein} d="M90 103 Q102 96 114 93" />
      <text className={styles.tag} x="100" y="52" textAnchor="middle">
        環境刺激
      </text>
    </g>
  );
}

/** 配角成分的小圖示動畫 */
export function SupportIcon({ kind }: { kind: SupportIconKind }) {
  return (
    <svg viewBox="0 0 48 48" className={styles.icon} data-kind={kind} aria-hidden="true">
      <circle cx="24" cy="24" r="22" className={styles.iconBg} />
      {kind === "drop" && (
        <g className={styles.iconDrop}>
          <path d="M24 10 C30 18 34 23 34 28 A10 10 0 0 1 14 28 C14 23 18 18 24 10 Z" />
        </g>
      )}
      {kind === "ph" && (
        <g>
          <path className={styles.iconTrack} d="M10 30 A14 14 0 0 1 38 30" />
          <path className={styles.iconBand} d="M19.5 17.5 A14 14 0 0 1 26.5 16.2" />
          <line className={styles.iconNeedle} x1="24" y1="30" x2="24" y2="17" />
          <circle cx="24" cy="30" r="2.4" className={styles.iconDot} />
          <text x="24" y="40" textAnchor="middle" className={styles.iconText}>
            5.0–5.5
          </text>
        </g>
      )}
      {kind === "guard" && (
        <g>
          <path className={styles.iconGuard} d="M24 9 L36 14 V24 C36 31 30 36 24 39 C18 36 12 31 12 24 V14 Z" />
          <circle className={styles.iconMicrobe} cx="40" cy="12" r="3.2" />
        </g>
      )}
      {kind === "chelate" && (
        <g>
          <circle className={styles.iconIon} cx="24" cy="24" r="4.5" />
          <path className={styles.iconClawL} d="M12 14 Q8 24 12 34" />
          <path className={styles.iconClawR} d="M36 14 Q40 24 36 34" />
        </g>
      )}
    </svg>
  );
}
