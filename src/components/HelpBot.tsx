"use client";

import { useEffect, useRef, useState } from "react";
import { BOT_NODES, type BotOption } from "@/lib/helpbot";
import { LINE_READY, lineMessageUrl } from "@/lib/line";
import styles from "./HelpBot.module.css";

type Msg = { from: "bot" | "user"; text: string };

/** 右下角的決策樹小幫手：選選項回答常見問題，最後引導到官方 LINE。 */
export default function HelpBot() {
  const [open, setOpen] = useState(false);
  const [node, setNode] = useState("root");
  const [log, setLog] = useState<Msg[]>(() => BOT_NODES.root.text.map((t) => ({ from: "bot", text: t })));
  const panel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [log, open]);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLButtonElement>("[data-option]")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, node]);

  const choose = (o: BotOption) => {
    const said: Msg = { from: "user", text: o.label };
    if (o.next) {
      const n = BOT_NODES[o.next];
      setLog((l) => [...l, said, ...n.text.map((t) => ({ from: "bot" as const, text: t }))]);
      setNode(o.next);
      return;
    }
    if (o.href) {
      setLog((l) => [...l, said, { from: "bot", text: "幫你捲到那一段了。" }]);
      document.querySelector(o.href)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (o.line) {
      const url = lineMessageUrl(o.line);
      if (url) {
        setLog((l) => [...l, said, { from: "bot", text: "已幫你打開官方 LINE，訊息會先填好，按送出就可以了。" }]);
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        setLog((l) => [
          ...l,
          said,
          { from: "bot", text: "官方 LINE 即將開放！先加入試用候補名單，開放時會第一個通知你。" },
        ]);
        document.querySelector("#trial")?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const reset = () => {
    setNode("root");
    setLog(BOT_NODES.root.text.map((t) => ({ from: "bot", text: t })));
  };

  const current = BOT_NODES[node];

  return (
    <div className={styles.root}>
      {open && (
        <div ref={panel} id="helpbot-panel" className={styles.panel} role="dialog" aria-modal="false" aria-labelledby="helpbot-title">
          <header className={styles.head}>
            <div>
              <p id="helpbot-title" className={styles.title}>
                順路小幫手
              </p>
              <p className={styles.sub}>選擇問題，快速找到答案{LINE_READY ? "，也可以轉到官方 LINE" : ""}</p>
            </div>
            <button type="button" className={styles.icon} onClick={reset} aria-label="重新開始" title="重新開始">
              ↺
            </button>
            <button
              type="button"
              className={styles.icon}
              onClick={() => {
                setOpen(false);
                toggle.current?.focus();
              }}
              aria-label="關閉小幫手"
            >
              ×
            </button>
          </header>

          <div className={styles.log} aria-live="polite">
            {log.map((m, i) => (
              <p key={i} className={m.from === "bot" ? styles.bot : styles.user}>
                {m.text}
              </p>
            ))}
            <div ref={end} />
          </div>

          <div className={styles.options} role="group" aria-label="可選擇的問題">
            {current.options.map((o) => (
              <button
                key={o.label}
                type="button"
                data-option=""
                data-kind={o.line ? "line" : o.href ? "link" : "next"}
                onClick={() => choose(o)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className={styles.note}>這是預先寫好的問答，不是即時客服；個別問題請到官方 LINE。</p>
        </div>
      )}

      <button
        ref={toggle}
        type="button"
        className={styles.fab}
        aria-expanded={open}
        aria-controls="helpbot-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">{open ? "×" : "?"}</span>
        <span className={styles.fabLabel}>{open ? "關閉" : "有問題嗎"}</span>
      </button>
    </div>
  );
}
