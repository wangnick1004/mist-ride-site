/**
 * 機不可失 MIST-RIDE 商標：M 畫成機車龍頭（握把＋煞車拉桿），上方 5 顆霧點。
 * 龍頭跟著 currentColor，霧點用 --mark-dot（預設晨霧青）。小於 24 px 時傳 simple 省略煞車拉桿。
 */
export default function BrandMark({ className, simple = false }: { className?: string; simple?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <path
        d="M16 96L21 54C22 42 28 36 38 36H42C48 36 51 39 53 44L60 60L67 44C69 39 72 36 78 36H82C92 36 98 42 99 54L104 96"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18.4 75L15.6 99M101.6 75L104.4 99" stroke="currentColor" strokeWidth="15" strokeLinecap="round" />
      {!simple && <path d="M31.5 63L29 90M88.5 63L91 90" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" />}
      <g style={{ fill: "var(--mark-dot, #2A9D95)" }}>
        <circle cx="60" cy="24" r="4.6" />
        <circle cx="50" cy="16" r="3.4" />
        <circle cx="70" cy="16" r="3.4" />
        <circle cx="42" cy="8.5" r="2.3" />
        <circle cx="78" cy="8.5" r="2.3" />
      </g>
    </svg>
  );
}
