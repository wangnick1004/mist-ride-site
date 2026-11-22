"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./HeroSpray.module.css";

// 首屏照片（2752 × 1536，Gemini 生成，v3：印刷區為正確商標）上的關鍵位置，單位為原圖像素；換照片時一併更新
const IMG_W = 2752;
const IMG_H = 1536;
const NOZZLE = { x: 1468, y: 456 }; // 噴嘴出口
const FACE = { x: 1816, y: 448 }; // 霧噴向的位置（臉頰）
const MIST = { x: 1650, y: 445 }; // 霧團中心：鏡頭推進的焦點
// object-position 的水平對齊：桌機讓人物靠右、左側留給標題；手機直式畫面保留噴罐與臉
const FOCUS_X_DESKTOP = 0.12;
const FOCUS_X_MOBILE = 0.62;
const FOCUS_Y = 0.5;

interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
}

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

function makeSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(250,252,250,0.55)");
  grad.addColorStop(1, "rgba(245,248,246,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

export default function HeroSpray() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const progress = useRef(0);
  const [p, setP] = useState(0);
  const [origin, setOrigin] = useState("64% 28%");
  // 封面原圖只有 1024 px 寬，窄螢幕放大太多會糊，推近倍率隨畫面寬度調整
  const [zoomAmp, setZoomAmp] = useState(2.2);
  const [focusX, setFocusX] = useState(FOCUS_X_DESKTOP);

  // 捲動進度
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const span = rect.height - window.innerHeight;
      const v = clamp(-rect.top / (span || 1));
      progress.current = v;
      setP(v);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // 霧氣粒子
  useEffect(() => {
    const cv = canvas.current;
    const st = stage.current;
    if (!cv || !st) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const sprite = makeSprite();
    const puffs: Puff[] = [];
    let W = 0;
    let H = 0;
    let s = 1;
    let ox = 0;
    let oy = 0;
    const toScreen = (pt: { x: number; y: number }) => ({ x: ox + pt.x * s, y: oy + pt.y * s });

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = st.clientWidth;
      H = st.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      s = Math.max(W / IMG_W, H / IMG_H);
      const fx = W < 860 ? FOCUS_X_MOBILE : FOCUS_X_DESKTOP;
      setFocusX(fx);
      ox = (W - IMG_W * s) * fx;
      oy = (H - IMG_H * s) * FOCUS_Y;
      setZoomAmp(W < 860 ? 1.6 : 2.2); // v3 原圖 2752 px，手機可推近較多仍保持清晰
      const m = toScreen(MIST);
      setOrigin(`${((m.x / W) * 100).toFixed(2)}% ${((m.y / H) * 100).toFixed(2)}%`);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(st);

    // 固定種子亂數，粒子行為可重現
    let seed = 20261116;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const n = toScreen(NOZZLE);
    const f = toScreen(FACE);
    const baseAng = Math.atan2(f.y - n.y, f.x - n.x);

    const emit = (count: number, k: number) => {
      const noz = toScreen(NOZZLE);
      for (let i = 0; i < count; i++) {
        const ang = baseAng + (rand() - 0.5) * 0.62;
        const sp = (160 + rand() * 260) * s * (1 + k * 0.6);
        puffs.push({
          x: noz.x + (rand() - 0.5) * 3 * s,
          y: noz.y + (rand() - 0.5) * 3 * s,
          vx: Math.cos(ang) * sp,
          vy: Math.sin(ang) * sp,
          age: 0,
          life: 0.9 + rand() * 1.4,
          size: (5 + rand() * 9) * s * (1 + k * 2.5),
        });
      }
    };

    let last = performance.now();
    let acc = 0;
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const k = progress.current;
      acc += dt * (70 + 900 * k * k);
      const count = Math.floor(acc);
      acc -= count;
      if (puffs.length < 1600) emit(count, k);

      ctx.clearRect(0, 0, W, H);
      for (let i = puffs.length - 1; i >= 0; i--) {
        const q = puffs[i];
        q.age += dt;
        if (q.age > q.life) {
          puffs.splice(i, 1);
          continue;
        }
        const drag = Math.exp(-dt * 2.6);
        q.vx *= drag;
        q.vy = q.vy * drag - 14 * s * dt; // 細霧輕輕上飄
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        const t = q.age / q.life;
        const r = q.size * (1 + t * 3.2);
        ctx.globalAlpha = Math.sin(Math.PI * Math.min(1, t * 1.6)) * (0.18 + 0.25 * k) * (1 - t * 0.6);
        ctx.drawImage(sprite, q.x - r, q.y - r, r * 2, r * 2);
      }
      ctx.globalAlpha = 1;
      if (!reduce) raf = requestAnimationFrame(tick);
    };

    if (reduce) {
      // 減少動態：只畫一個靜態霧團
      emit(260, 0.2);
      for (const q of puffs) {
        const t = rand() * 0.8;
        q.age = t * q.life;
        q.x += q.vx * t * 0.9;
        q.y += q.vy * t * 0.9;
      }
      tick(performance.now());
    } else {
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const zoom = 1 + zoomAmp * smooth(0.05, 0.95, p) ** 1.4;
  const textOut = 1 - smooth(0.02, 0.22, p);
  const bloom = smooth(0.4, 0.88, p);
  const whiteout = smooth(0.78, 0.97, p);
  const cue = 1 - smooth(0, 0.08, p);

  return (
    <section ref={section} className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.sticky}>
        <div
          ref={stage}
          className={styles.stage}
          style={{ transform: `scale(${zoom})`, transformOrigin: origin }}
        >
          <Image
            src="/images/hero-commute-v3.jpg"
            alt="騎機車通勤的女生出門前，對著臉噴一下晨霧化妝水"
            fill
            priority
            sizes="100vw"
            className={styles.photo}
            style={{ objectPosition: `${focusX * 100}% ${FOCUS_Y * 100}%` }}
          />
          <canvas ref={canvas} className={styles.mist} aria-hidden="true" />
        </div>

        <div className={styles.shade} style={{ opacity: textOut }} aria-hidden="true" />
        <div
          className={styles.bloom}
          aria-hidden="true"
          style={{
            opacity: bloom,
            background: `radial-gradient(circle at ${origin}, rgba(245,240,230,0.98) 0%, rgba(245,240,230,0.9) ${
              8 + bloom * 40
            }%, rgba(245,240,230,0) ${30 + bloom * 70}%)`,
          }}
        />
        <div className={styles.whiteout} style={{ opacity: whiteout }} aria-hidden="true" />

        <div className={styles.copy} style={{ opacity: textOut, transform: `translateY(${(1 - textOut) * -24}px)` }}>
          <p className={styles.kicker}>晨霧 控油化妝水・50 mL</p>
          <h1 id="hero-title">
            出門前這一噴，
            <br />
            <em>機不可失</em>。
          </h1>
          <p className={styles.lead}>
            帽險路上，機不可失。給每天騎車通勤的你：戴安全帽前噴 3 下，控油、保濕，提升肌膚對環境傷害的保護力。
          </p>
        </div>

        <p className={styles.cue} style={{ opacity: cue }} aria-hidden="true">
          往下捲動，走進這陣霧裡
          <span>↓</span>
        </p>
      </div>
    </section>
  );
}
