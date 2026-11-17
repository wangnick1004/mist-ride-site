"use client";

import { useEffect, useRef } from "react";

/**
 * 成分頁背景的晨霧氣泡。
 * - 會上升、左右搖擺；游標靠近時被推開
 * - 按住可以拖曳，放開時依手勢速度甩出去；甩得夠快撞到邊緣就會破
 * - 點一下會破，大氣泡破了會分裂成小氣泡
 * - 少數「優惠泡泡」戳破後會呼叫 onCoupon（顯示官方 LINE 優惠券）
 * 不在畫面內時暫停；「減少動態效果」時只畫靜態氣泡，仍可點擊戳破。
 */

type Kind = "plain" | "coupon";

interface Bubble {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  rise: number;
  phase: number;
  wobble: number;
  kind: Kind;
  held: boolean;
  thrown: boolean;
}

interface Pop {
  x: number;
  y: number;
  r: number;
  t: number;
  kind: Kind;
}

const MAX_COUPONS = 2;
const POP_SPEED = 900; // 甩出去撞到邊緣時，超過這個速度（px/s）就會破

export default function BubbleField({
  className,
  onCoupon,
}: {
  className?: string;
  onCoupon?: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const couponCb = useRef(onCoupon);
  useEffect(() => {
    couponCb.current = onCoupon;
  }, [onCoupon]);

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
    let couponCooldown = 0;

    const make = (kind: Kind = "plain", y?: number, r?: number): Bubble => {
      const rr = r ?? (kind === "coupon" ? 30 + Math.random() * 8 : 6 + Math.random() ** 2 * 30);
      return {
        x: rr + Math.random() * Math.max(1, W - rr * 2),
        y: y ?? Math.random() * H,
        r: rr,
        vx: 0,
        vy: 0,
        rise: kind === "coupon" ? 14 + Math.random() * 6 : 10 + (36 - rr) * 0.9 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
        wobble: 6 + Math.random() * 14,
        kind,
        held: false,
        thrown: false,
      };
    };
    const coupons = () => bubbles.filter((b) => b.kind === "coupon").length;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = host.clientWidth;
      H = host.clientHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.round(Math.min(70, (W * H) / 26000));
      while (bubbles.length < target) bubbles.push(make());
      bubbles = bubbles.slice(0, target + MAX_COUPONS);
      while (coupons() < MAX_COUPONS) bubbles.push(make("coupon"));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const draw = (b: Bubble) => {
      const coupon = b.kind === "coupon";
      const g = ctx.createRadialGradient(b.x - b.r * 0.35, b.y - b.r * 0.4, b.r * 0.05, b.x, b.y, b.r);
      if (coupon) {
        g.addColorStop(0, "rgba(255,255,255,0.98)");
        g.addColorStop(0.5, "rgba(250,230,180,0.75)");
        g.addColorStop(0.92, "rgba(224,172,80,0.55)");
        g.addColorStop(1, "rgba(224,172,80,0)");
      } else {
        g.addColorStop(0, "rgba(255,255,255,0.95)");
        g.addColorStop(0.55, "rgba(220,236,230,0.35)");
        g.addColorStop(0.92, "rgba(127,191,179,0.28)");
        g.addColorStop(1, "rgba(127,191,179,0)");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * (b.held ? 1.08 : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = coupon ? "rgba(176,120,30,0.55)" : `rgba(31,122,109,${b.held ? 0.45 : 0.16})`;
      ctx.lineWidth = coupon || b.held ? 1.6 : 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.ellipse(b.x - b.r * 0.38, b.y - b.r * 0.42, b.r * 0.2, b.r * 0.12, -0.6, 0, Math.PI * 2);
      ctx.fill();
      if (coupon) {
        ctx.fillStyle = "#8a5a12";
        ctx.font = `700 ${Math.round(b.r * 0.42)}px "PingFang TC","Noto Sans TC",sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("優惠", b.x, b.y + 1);
      }
    };

    const local = (e: PointerEvent) => {
      const rect = cv.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const hitTest = (p: { x: number; y: number }) => {
      // 優惠泡泡優先、後畫的在上面
      let best: Bubble | null = null;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r + 6) {
          if (!best || (b.kind === "coupon" && best.kind !== "coupon")) best = b;
        }
      }
      return best;
    };

    const pop = (b: Bubble) => {
      const i = bubbles.indexOf(b);
      if (i < 0) return;
      pops.push({ x: b.x, y: b.y, r: b.r, t: 0, kind: b.kind });
      if (b.kind === "coupon") {
        bubbles.splice(i, 1);
        couponCooldown = 6; // 6 秒後再冒出新的優惠泡泡
        couponCb.current?.();
        return;
      }
      bubbles.splice(i, 1, make("plain", H + 40));
      if (b.r > 14) {
        for (let k = 0; k < 3; k++) {
          const c = make("plain", b.y, b.r * 0.32);
          c.x = b.x + (k - 1) * b.r * 0.6;
          c.vx = (k - 1) * 40 + b.vx * 0.3;
          c.vy = -30 + b.vy * 0.3;
          bubbles.push(c);
        }
      }
    };

    // ---- 拖曳、甩出、點破 ----
    let grab: {
      b: Bubble;
      id: number;
      dx: number;
      dy: number;
      start: { x: number; y: number; t: number };
      samples: { x: number; y: number; t: number }[];
    } | null = null;

    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest("[data-reveal], a, button, dialog, input, label")) return;
      const p = local(e);
      const b = hitTest(p);
      if (!b) return;
      e.preventDefault();
      b.held = true;
      b.thrown = false;
      b.vx = b.vy = 0;
      grab = {
        b,
        id: e.pointerId,
        dx: p.x - b.x,
        dy: p.y - b.y,
        start: { x: p.x, y: p.y, t: performance.now() },
        samples: [{ x: p.x, y: p.y, t: performance.now() }],
      };
      try {
        host.setPointerCapture(e.pointerId);
      } catch {
        /* 某些瀏覽器不支援時略過 */
      }
      host.style.cursor = "grabbing";
      if (reduce) render();
    };

    const onMove = (e: PointerEvent) => {
      const p = local(e);
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
      if (grab && e.pointerId === grab.id) {
        grab.b.x = p.x - grab.dx;
        grab.b.y = p.y - grab.dy;
        grab.samples.push({ x: p.x, y: p.y, t: performance.now() });
        if (grab.samples.length > 6) grab.samples.shift();
        if (reduce) render();
        return;
      }
      host.style.cursor = hitTest(p) ? "grab" : "";
    };

    const release = (e: PointerEvent, cancelled = false) => {
      if (!grab || e.pointerId !== grab.id) return;
      const g = grab;
      grab = null;
      g.b.held = false;
      host.style.cursor = "";
      try {
        host.releasePointerCapture(e.pointerId);
      } catch {
        /* 略過 */
      }
      const p = local(e);
      const moved = Math.hypot(p.x - g.start.x, p.y - g.start.y);
      const dt = performance.now() - g.start.t;
      if (!cancelled && moved < 6 && dt < 350) {
        pop(g.b); // 點一下就破
      } else {
        const first = g.samples[0];
        const last = g.samples[g.samples.length - 1];
        const span = Math.max(16, last.t - first.t) / 1000;
        g.b.vx = Math.max(-2400, Math.min(2400, (last.x - first.x) / span));
        g.b.vy = Math.max(-2400, Math.min(2400, (last.y - first.y) / span));
        g.b.thrown = Math.hypot(g.b.vx, g.b.vy) > 120;
      }
      if (reduce) render();
    };
    const onUp = (e: PointerEvent) => release(e);
    const onCancel = (e: PointerEvent) => release(e, true);
    const onLeave = () => {
      pointer.active = false;
    };

    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerup", onUp);
    host.addEventListener("pointercancel", onCancel);
    host.addEventListener("pointerleave", onLeave);

    // 捲動時給氣泡一點慣性
    let lastScroll = window.scrollY;
    const onScroll = () => {
      const d = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      const k = Math.max(-40, Math.min(40, d)) * 0.6;
      for (const b of bubbles) if (!b.held) b.vy += k * (14 / b.r);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    const step = (dt: number) => {
      if (couponCooldown > 0) {
        couponCooldown -= dt;
        if (couponCooldown <= 0 && coupons() < MAX_COUPONS) bubbles.push(make("coupon", H + 50));
      }
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (b.held) continue;
        b.phase += dt * (0.8 + 12 / b.r);
        if (pointer.active && !grab) {
          const dx = b.x - pointer.x;
          const dy = b.y - pointer.y;
          const d = Math.hypot(dx, dy);
          const reach = 90 + b.r * 2;
          if (d < reach && d > 0.01) {
            const f = (1 - d / reach) * (b.kind === "coupon" ? 300 : 900);
            b.vx += (dx / d) * f * dt;
            b.vy += (dy / d) * f * dt;
          }
        }
        const damp = Math.exp(-dt * (b.thrown ? 0.9 : 2.2));
        b.vx *= damp;
        b.vy *= damp;
        if (b.thrown && Math.hypot(b.vx, b.vy) < 80) b.thrown = false;
        b.x += (b.vx + (b.thrown ? 0 : Math.cos(b.phase) * b.wobble * 0.6)) * dt;
        b.y += (b.vy - (b.thrown ? 0 : b.rise)) * dt;

        // 被甩出去的氣泡：撞牆反彈，速度夠快就破
        if (b.thrown) {
          const speed = Math.hypot(b.vx, b.vy);
          const hitX = b.x < b.r || b.x > W - b.r;
          const hitY = b.y < b.r || b.y > H - b.r;
          if (hitX || hitY) {
            if (speed > POP_SPEED) {
              pop(b);
              continue;
            }
            if (hitX) {
              b.vx *= -0.6;
              b.x = Math.max(b.r, Math.min(W - b.r, b.x));
            }
            if (hitY) {
              b.vy *= -0.6;
              b.y = Math.max(b.r, Math.min(H - b.r, b.y));
            }
          }
        } else {
          if (b.y < -b.r - 20) Object.assign(b, make(b.kind, H + b.r + Math.random() * 60));
          if (b.x < -b.r) b.x = W + b.r;
          if (b.x > W + b.r) b.x = -b.r;
        }
      }
      for (let i = pops.length - 1; i >= 0; i--) {
        pops[i].t += dt * 2.6;
        if (pops[i].t >= 1) pops.splice(i, 1);
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, W, H);
      for (const b of bubbles) draw(b);
      for (const p of pops) {
        const a = 1 - p.t;
        const coupon = p.kind === "coupon";
        ctx.strokeStyle = coupon ? `rgba(200,140,40,${0.6 * a})` : `rgba(31,122,109,${0.35 * a})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + p.t * 0.8), 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = coupon ? `rgba(224,172,80,${0.8 * a})` : `rgba(127,191,179,${0.7 * a})`;
        const n = coupon ? 10 : 6;
        for (let k = 0; k < n; k++) {
          const ang = (k / n) * Math.PI * 2 + 0.3;
          const rr = p.r * (1 + p.t * 1.6);
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(ang) * rr, p.y + Math.sin(ang) * rr, coupon ? 2.4 : 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    let visible = false;
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt);
      render();
      if (visible) raf = requestAnimationFrame(frame);
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (reduce) return;
      cancelAnimationFrame(raf);
      if (visible) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    });
    io.observe(host);
    if (reduce) render();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onCancel);
      host.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
