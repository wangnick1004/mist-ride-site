"use client";

import { useEffect, useRef } from "react";

/**
 * 成分頁背景的晨霧氣泡：緩慢上升、左右搖擺，
 * 滑鼠／手指靠近會被推開，點一下會破掉並分裂成小氣泡，捲動時跟著輕微晃動。
 * 不在畫面內時暫停；「減少動態效果」時只畫靜態氣泡。
 */

interface Bubble {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  rise: number;
  phase: number;
  wobble: number;
}

interface Pop {
  x: number;
  y: number;
  r: number;
  t: number;
}

export default function BubbleField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const host = cv?.parentElement;
    if (!cv || !host) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = 0;
    let H = 0;
    let bubbles: Bubble[] = [];
    const pops: Pop[] = [];
    const pointer = { x: -9999, y: -9999, active: false };

    const make = (y?: number, r?: number): Bubble => {
      const rr = r ?? 6 + Math.random() ** 2 * 30;
      return {
        x: Math.random() * W,
        y: y ?? Math.random() * H,
        r: rr,
        vx: 0,
        vy: 0,
        rise: 10 + (36 - rr) * 0.9 + Math.random() * 10, // 小氣泡升得快
        phase: Math.random() * Math.PI * 2,
        wobble: 6 + Math.random() * 14,
      };
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = host.clientWidth;
      H = host.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(70, (W * H) / 26000));
      while (bubbles.length < target) bubbles.push(make());
      bubbles = bubbles.slice(0, target);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const draw = (b: Bubble, alpha = 1) => {
      const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.05, b.x, b.y, b.r);
      g.addColorStop(0, `rgba(255,255,255,${0.95 * alpha})`);
      g.addColorStop(0.55, `rgba(220,236,230,${0.35 * alpha})`);
      g.addColorStop(0.92, `rgba(127,191,179,${0.28 * alpha})`);
      g.addColorStop(1, `rgba(127,191,179,0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      // 薄膜邊緣的淡淡虹彩
      ctx.strokeStyle = `rgba(31,122,109,${0.16 * alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      // 高光
      ctx.fillStyle = `rgba(255,255,255,${0.85 * alpha})`;
      ctx.beginPath();
      ctx.ellipse(b.x - b.r * 0.38, b.y - b.r * 0.42, b.r * 0.2, b.r * 0.12, -0.6, 0, Math.PI * 2);
      ctx.fill();
    };

    // 互動：推開與點破
    const local = (e: PointerEvent) => {
      const rect = cv.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMove = (e: PointerEvent) => {
      const p = local(e);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    const onDown = (e: PointerEvent) => {
      // 點在卡片或文字上時不戳破背後的氣泡
      if ((e.target as Element | null)?.closest("[data-reveal], a, button")) return;
      const p = local(e);
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 6) {
          pops.push({ x: b.x, y: b.y, r: b.r, t: 0 });
          // 破掉後分裂成幾顆小氣泡
          const kids = b.r > 14 ? 3 : 0;
          bubbles.splice(i, 1, make(H + 40));
          for (let k = 0; k < kids; k++) {
            const c = make(b.y, b.r * 0.32);
            c.x = b.x + (k - 1) * b.r * 0.6;
            c.vx = (k - 1) * 40;
            c.vy = -30;
            bubbles.push(c);
          }
          break;
        }
      }
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown);

    // 捲動時給氣泡一點慣性
    let lastScroll = window.scrollY;
    const onScroll = () => {
      const d = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      const k = Math.max(-40, Math.min(40, d)) * 0.6;
      for (const b of bubbles) b.vy += k * (14 / b.r);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    let visible = false;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);

      for (const b of bubbles) {
        b.phase += dt * (0.8 + 12 / b.r);
        if (pointer.active) {
          const dx = b.x - pointer.x;
          const dy = b.y - pointer.y;
          const d = Math.hypot(dx, dy);
          const reach = 90 + b.r * 2;
          if (d < reach && d > 0.01) {
            const f = (1 - d / reach) * 900;
            b.vx += (dx / d) * f * dt;
            b.vy += (dy / d) * f * dt;
          }
        }
        b.vx *= Math.exp(-dt * 2.2);
        b.vy *= Math.exp(-dt * 2.2);
        b.x += (b.vx + Math.cos(b.phase) * b.wobble * 0.6) * dt;
        b.y += (b.vy - b.rise) * dt;
        if (b.y < -b.r - 20) Object.assign(b, make(H + b.r + Math.random() * 60));
        if (b.x < -b.r) b.x = W + b.r;
        if (b.x > W + b.r) b.x = -b.r;
        draw(b);
      }

      // 破掉的氣泡：擴散的細環＋幾滴水珠
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i];
        p.t += dt * 2.6;
        if (p.t >= 1) {
          pops.splice(i, 1);
          continue;
        }
        const a = 1 - p.t;
        ctx.strokeStyle = `rgba(31,122,109,${0.35 * a})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + p.t * 0.8), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = `rgba(127,191,179,${0.7 * a})`;
        for (let k = 0; k < 6; k++) {
          const ang = (k / 6) * Math.PI * 2 + 0.3;
          const rr = p.r * (1 + p.t * 1.6);
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (visible) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (reduce) return;
      if (visible) {
        last = performance.now();
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    });
    io.observe(host);

    if (reduce) {
      ctx.clearRect(0, 0, W, H);
      for (const b of bubbles) draw(b);
    }

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
