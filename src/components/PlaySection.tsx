"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { PART_INFO } from "@/lib/assembly";
import type { PlayState } from "./PlayScene";
import styles from "./PlaySection.module.css";

const PlayScene = dynamic(() => import("./PlayScene"), {
  ssr: false,
  loading: () => <p className={styles.loading}>3D 模型載入中…</p>,
});

// 罐身配色為示意，實際顏色以量產打樣為準
const COLORS = [
  { name: "鼠尾草霧銀", value: "#BCCAC4" },
  { name: "晨霧白", value: "#E4E7E3" },
  { name: "墨綠", value: "#3E6E66" },
  { name: "暖沙", value: "#D8C8B0" },
];

export default function PlaySection() {
  const host = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [explode, setExplode] = useState(0);
  const [xray, setXray] = useState(false);
  const [cap, setCap] = useState(true);
  const [color, setColor] = useState(COLORS[0].value);
  const [selected, setSelected] = useState<string | null>(null);
  const [sprays, setSprays] = useState(0);
  const state = useRef<PlayState>({ explode: 0, xray: false, cap: true, color: COLORS[0].value, selected: null, sprayAt: -1e9 });

  // 只有捲到附近時才載入第二個 3D 畫面，節省效能
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    Object.assign(state.current, { explode, xray, cap, color, selected });
  }, [explode, xray, cap, color, selected]);

  const spray = useCallback(() => {
    if (state.current.cap) setCap(false); // 噴之前先把蓋子拿掉
    state.current.cap = false;
    state.current.sprayAt = performance.now();
    setSprays((n) => n + 1);
  }, []);

  const info = selected ? PART_INFO[selected] : null;

  return (
    <section ref={host} id="play" className={styles.section} aria-labelledby="play-title">
      <header className={styles.head}>
        <p className={styles.kicker}>自己玩玩看</p>
        <h2 id="play-title">轉一轉、拆開來、噴一下</h2>
        <p className={styles.lead}>拖曳旋轉罐子，點任何一個零件看它的材質與用途；拉動滑桿把整支罐子拆開，或按噴頭試噴。</p>
      </header>

      <div className={styles.layout}>
        <div className={styles.stage}>
          {near && <PlayScene state={state} onPick={setSelected} onSpray={spray} />}
          <p className={styles.hint} aria-hidden="true">
            拖曳旋轉・點零件看說明
          </p>
        </div>

        <div className={styles.panel}>
          <div className={styles.group}>
            <label htmlFor="explode" className={styles.label}>
              拆解 <span>{Math.round(explode * 100)}%</span>
            </label>
            <input
              id="explode"
              type="range"
              min={0}
              max={100}
              value={Math.round(explode * 100)}
              onChange={(e) => setExplode(Number(e.target.value) / 100)}
              className={styles.slider}
            />
          </div>

          <div className={styles.toggles}>
            <button type="button" aria-pressed={xray} onClick={() => setXray((v) => !v)}>
              透視罐身
            </button>
            <button type="button" aria-pressed={cap} onClick={() => setCap((v) => !v)}>
              透明保護蓋
            </button>
          </div>

          <div className={styles.group}>
            <p className={styles.label}>罐身顏色（示意）</p>
            <div className={styles.swatches} role="radiogroup" aria-label="罐身顏色">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={color === c.value}
                  aria-label={c.name}
                  title={c.name}
                  style={{ background: c.value }}
                  onClick={() => setColor(c.value)}
                />
              ))}
            </div>
          </div>

          <button type="button" className={styles.spray} onClick={spray}>
            按下噴頭試噴
            <span>{sprays > 0 ? `已噴 ${sprays} 次` : "也可以直接點模型上的噴頭"}</span>
          </button>

          <div className={styles.info} aria-live="polite">
            {info ? (
              <>
                <p className={styles.infoKicker}>你點的是</p>
                <h3>{info.title}</h3>
                <p className={styles.material}>{info.material}</p>
                <p>{info.body}</p>
              </>
            ) : (
              <p className={styles.placeholder}>點模型上的零件，這裡會顯示它的名稱、材質和用途。</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
