import { useEffect, useMemo, useRef, useState } from "react";
import {
  SendHorizontal, X, ZoomIn, Eraser, Sparkles, ExternalLink, CheckCheck, Info, LayoutList, Image as ImageIcon, RotateCw, Palette,
} from "lucide-react";
import { BOT } from "../data/content";
import {
  DEFAULT_RATIO, DEFAULT_STYLE, getRatioPreset, getStylePreset, RATIO_PRESETS, STYLE_PRESETS, type RatioId, type StyleId,
} from "../data/styles";
import {
  botMsg, buildInlineResults, CALLBACK_TOAST, fallbackImageUrl, fallbackSeed, handleCallback, handleText, MENU_COMMANDS, REPLIES, uid,
  type ChatButton, type ChatMsg, type InlineResult,
} from "../lib/bot";
import { TelegramIcon } from "./Brand";

/* ---------------- helpers ---------------- */

const STORAGE_KEY = "imageishere.simulator.chat.v1";
const PREFS_KEY = "imageishere.simulator.prefs.v1";
const timeOf = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function restorePrefs(): { styleId: StyleId; ratioId: RatioId } {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as { styleId?: StyleId; ratioId?: RatioId };
      return {
        styleId: STYLE_PRESETS.some((s) => s.id === p.styleId) ? p.styleId! : DEFAULT_STYLE,
        ratioId: RATIO_PRESETS.some((r) => r.id === p.ratioId) ? p.ratioId! : DEFAULT_RATIO,
      };
    }
  } catch {
    /* ignore */
  }
  return { styleId: DEFAULT_STYLE, ratioId: DEFAULT_RATIO };
}

function restore(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return (parsed as ChatMsg[]).filter((m) => m.kind !== "loading");
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** Telegram auto-links URLs and /commands — so do we */
function RichText({ text, onCommand }: { text: string; onCommand: (cmd: string) => void }) {
  const parts = text.split(/(https?:\/\/[^\s]+|(?<![\w/])\/[a-z_]+(?:@\w+)?)/gi);
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null;
        if (/^https?:\/\//i.test(p))
          return <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all text-sky-300 underline-offset-2 hover:underline">{p}</a>;
        if (/^\/[a-z_]+(?:@\w+)?$/i.test(p))
          return <button key={i} onClick={() => onCommand(p)} className="text-sky-300 hover:underline">{p}</button>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function BubbleTail({ side, color }: { side: "in" | "out"; color: string }) {
  return side === "in" ? (
    <svg width="9" height="12" viewBox="0 0 9 12" className="absolute -left-[8px] bottom-0" fill={color}><path d="M9 0C6 6 3 9 0 12h9V0z" /></svg>
  ) : (
    <svg width="9" height="12" viewBox="0 0 9 12" className="absolute -right-[8px] bottom-0" fill={color}><path d="M0 0c3 6 6 9 9 12H0V0z" /></svg>
  );
}

function Elapsed({ since }: { since: number }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-[8.5px] text-sky-300/80">{Math.max(0, Math.round((Date.now() - since) / 1000))}s</span>;
}

function InlineKeyboard({ rows, onButton }: { rows: ChatButton[][]; onButton: (b: ChatButton) => void }) {
  const base = "relative flex-1 rounded-lg bg-[#1f2c3a]/90 px-2 py-2 text-center text-[11.5px] font-medium text-white backdrop-blur transition hover:bg-[#2a3a4c] active:scale-[0.98]";
  return (
    <div className="mt-1 w-[min(330px,86%)] space-y-1 sm:w-[min(340px,68%)]">
      {rows.map((row, i) => (
        <div key={i} className="flex gap-1">
          {row.map((b) =>
            b.url ? (
              <a key={b.label} href={b.url} target="_blank" rel="noreferrer" className={base}>
                {b.label}
                <ExternalLink size={9} className="absolute right-1.5 top-1.5 text-slate-400" />
              </a>
            ) : (
              <button key={b.label} onClick={() => onButton(b)} className={base}>{b.label}</button>
            )
          )}
        </div>
      ))}
    </div>
  );
}

/* ================= MAIN ================= */

export default function Simulator({ active = true }: { active?: boolean }) {
  const [messages, setMessages] = useState<ChatMsg[]>(restore);
  const [prefs, setPrefs] = useState(restorePrefs);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(0);
  const [generating, setGenerating] = useState(0);
  const [menuForced, setMenuForced] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<ChatMsg | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const sessionRef = useRef(0);
  const nonceRef = useRef(0);

  useEffect(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs]);

  const schedule = (fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      timersRef.current.delete(t);
      fn();
    }, ms);
    timersRef.current.add(t);
    return t;
  };

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  /* persist + autoscroll */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((m) => m.kind !== "loading").slice(-80)));
    } catch {
      /* ignore */
    }
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (!active) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const add = (...msgs: ChatMsg[]) => setMessages((m) => [...m, ...msgs]);
  const note = (text: string) => add({ id: uid(), role: "system", kind: "note", text, ts: Date.now() });
  const showToast = (t: string) => {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  };

  const resetChat = () => {
    sessionRef.current += 1;
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    setTyping(0);
    setGenerating(0);
    setBrokenImages({});
    setMessages([]);
  };

  /* image generation — Perchance t2i-styles + Flux + aspect ratio */
  const generate = (prompt: string, opts?: { styleId?: StyleId; ratioId?: RatioId; nonce?: number }) => {
    const sid = sessionRef.current;
    const loadingId = uid();
    const styleId = opts?.styleId ?? prefs.styleId;
    const ratioId = opts?.ratioId ?? prefs.ratioId;
    const nonce = opts?.nonce ?? 0;
    const ratio = getRatioPreset(ratioId);
    const url = fallbackImageUrl(prompt, { styleId, ratioId, nonce });
    let settled = false;
    let hardTimeout: ReturnType<typeof setTimeout> | undefined;
    setGenerating((g) => g + 1);

    const loadingTimer = schedule(() => {
      if (!settled && sid === sessionRef.current) {
        add({ id: loadingId, role: "bot", kind: "loading", text: REPLIES.loading, ts: Date.now() });
      }
    }, 380);

    const finish = (ok: boolean) => {
      if (settled || sid !== sessionRef.current) return;
      settled = true;
      clearTimeout(loadingTimer);
      timersRef.current.delete(loadingTimer);
      if (hardTimeout) {
        clearTimeout(hardTimeout);
        timersRef.current.delete(hardTimeout);
      }
      setMessages((m) => [
        ...m.filter((x) => x.id !== loadingId),
        ok
          ? botMsg({
              kind: "photo",
              imageUrl: url,
              prompt,
              styleId,
              ratioId,
              width: ratio.width,
              height: ratio.height,
              seed: fallbackSeed(prompt.trim().slice(0, BOT.promptLimit), nonce),
              text: REPLIES.caption(prompt),
            })
          : botMsg({ kind: "text", text: REPLIES.error, retryPrompt: prompt }),
      ]);
      setGenerating((g) => Math.max(0, g - 1));
    };

    hardTimeout = schedule(() => finish(false), 125_000);
    const img = new Image();
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.src = url;
  };

  const regenerate = (m: ChatMsg) => {
    if (!m.prompt) return;
    nonceRef.current += 1;
    generate(m.prompt, { styleId: prefs.styleId, ratioId: prefs.ratioId, nonce: nonceRef.current });
  };

  /* route a message exactly like the webhook handler */
  const dispatch = (text: string) => {
    const sid = sessionRef.current;
    const action = handleText(text);
    if (action.type === "reply") {
      setTyping((t) => t + 1);
      schedule(() => {
        if (sid !== sessionRef.current) return;
        add(...action.messages);
        setTyping((t) => Math.max(0, t - 1));
      }, action.delayMs);
    } else if (action.type === "generate") {
      generate(action.prompt);
    } else {
      schedule(() => {
        if (sid === sessionRef.current) note(action.note);
      }, 250);
    }
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    add({ id: uid(), role: "user", kind: "text", text, ts: Date.now() });
    setInput("");
    setMenuForced(false);
    dispatch(text);
  };

  const onButton = (b: ChatButton) => {
    if (!b.callback) return;
    const sid = sessionRef.current;
    showToast(CALLBACK_TOAST);
    const replies = handleCallback(b.callback);
    if (!replies.length) return;
    setTyping((t) => t + 1);
    schedule(() => {
      if (sid !== sessionRef.current) return;
      add(...replies);
      setTyping((t) => Math.max(0, t - 1));
    }, 450);
  };

  /* inline mode: "@imageishere_bot <prompt>" */
  const inlineMatch = input.match(/^@imageishere_bot(?:\s+([\s\S]*))?$/i);
  const inlineResults = inlineMatch ? buildInlineResults(inlineMatch[1] ?? "") : [];
  const pickInline = (r: InlineResult) => {
    add({ id: uid(), role: "user", kind: "text", text: r.messageText, viaBot: true, keyboard: [[r.button]], ts: Date.now() });
    setInput("");
    dispatch(r.messageText); // the bot receives its own via_bot message in a private chat
  };

  /* command menu (setMyCommands list) */
  const slashQuery = /^\/\S*$/.test(input) ? input.slice(1).toLowerCase().replace(/@.*/, "") : null;
  const menuItems = useMemo(() => {
    if (slashQuery === null && !menuForced) return [];
    const q = slashQuery ?? "";
    return MENU_COMMANDS.filter((c) => c.command.startsWith(q));
  }, [slashQuery, menuForced]);
  const menuOpen = menuItems.length > 0 && !inlineMatch;
  useEffect(() => setMenuIndex(0), [input, menuForced]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (menuOpen) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMenuIndex((i) => (i + 1) % menuItems.length); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setMenuIndex((i) => (i - 1 + menuItems.length) % menuItems.length); return; }
      if (e.key === "Tab") { e.preventDefault(); setInput(`/${menuItems[menuIndex].command}`); return; }
      if (e.key === "Escape") { setMenuForced(false); return; }
      if (e.key === "Enter" && (!input.trim() || (slashQuery !== null && !MENU_COMMANDS.some((c) => c.command === slashQuery)))) {
        e.preventDefault();
        send(`/${menuItems[menuIndex].command}`);
        return;
      }
    }
    if (inlineMatch && e.key === "Enter") {
      e.preventDefault();
      if (inlineResults[0]) pickInline(inlineResults[0]);
      return;
    }
    if (e.key === "Enter") { e.preventDefault(); send(input); }
  };

  const isPrompt = input.trim().length > 0 && !input.trim().startsWith("/") && !inlineMatch;
  const promptLen = input.trim().length;
  const status = generating > 0 ? "sending photo…" : typing > 0 ? "typing…" : "bot";
  const images = messages.filter((m) => m.kind === "photo").length;

  const quickPrompts = [
    "A red fox in a snowy forest, cinematic lighting",
    "A cyberpunk city at night, neon rain",
    "A watercolor mountain landscape",
    "A friendly astronaut exploring a colorful planet",
  ];

  return (
    <div className="grid gap-5 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,1fr)_300px]">
      {/* ================= CHAT ================= */}
      <div className="flex h-[min(680px,76vh)] min-h-[440px] flex-col overflow-hidden rounded-2xl border border-line shadow-2xl shadow-black/50 xl:h-full">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-black/30 bg-[#17212b] px-4 py-2.5">
          <img src="/images/mascot.jpg" alt="imageishere avatar" className="h-10 w-10 rounded-full border border-cyan-400/30 object-cover" />
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold text-white">{BOT.name}</div>
            <div className={`text-[11px] ${status === "bot" ? "text-slate-400" : "text-sky-300"}`}>{status}</div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <a href={BOT.telegramUrl} target="_blank" rel="noreferrer" title="Open the real bot in Telegram"
              className="hidden items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-semibold text-sky-300 transition hover:bg-white/[0.06] sm:flex">
              <TelegramIcon size={12} className="text-[#2aabee]" /> Open real bot
            </a>
            <button onClick={resetChat} title="Clear conversation" aria-label="Clear conversation"
              className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-rose-300">
              <Eraser size={16} />
            </button>
          </div>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="chat-wallpaper relative flex-1 space-y-1.5 overflow-y-auto py-4">
          {toast && (
            <div className="pointer-events-none sticky top-2 z-20 mx-auto w-max rounded-xl bg-black/75 px-4 py-2 text-[11.5px] text-white shadow-lg backdrop-blur msg-in">{toast}</div>
          )}

          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center px-4">
              <div className="w-[min(340px,100%)] overflow-hidden rounded-2xl bg-[#182533]/95 text-center shadow-xl shadow-black/40">
                <div className="p-5">
                  <img src="/images/mascot.jpg" alt="" className="float-y mx-auto h-16 w-16 rounded-full border border-cyan-400/25 object-cover shadow-[0_0_40px_rgba(42,171,238,0.35)]" />
                  <div className="mt-3 text-[13px] font-semibold text-white">What can this bot do?</div>
                  <p className="mt-2 text-[12px] leading-relaxed text-slate-300">{BOT.description}</p>
                </div>
                <button onClick={() => send("/start")} className="w-full border-t border-white/5 py-3 text-[12px] font-bold uppercase tracking-[0.18em] text-sky-300 transition hover:bg-white/[0.04]">
                  Start
                </button>
              </div>
              <div className="mt-4 flex max-w-md flex-wrap justify-center gap-1.5">
                {quickPrompts.slice(0, 3).map((p) => (
                  <button key={p} onClick={() => send(p)}
                    className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-[10.5px] text-slate-300 backdrop-blur transition hover:border-cyan-400/40 hover:text-cyan-200">
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            if (m.role === "system") {
              return (
                <div key={m.id} className="msg-in flex justify-center px-4 py-1">
                  <div className="flex max-w-[90%] items-center gap-1.5 rounded-full bg-[#1d2733]/90 px-3 py-1 text-center text-[10.5px] text-slate-400 backdrop-blur">
                    <Info size={11} className="shrink-0 text-slate-500" /> {m.text}
                  </div>
                </div>
              );
            }
            const isUser = m.role === "user";
            const color = isUser ? "#2b5278" : "#182533";
            const isPhoto = m.kind === "photo";
            return (
              <div key={m.id} className={`msg-in flex flex-col px-3 sm:px-6 ${isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`relative max-w-[86%] rounded-2xl text-[12.5px] leading-snug text-slate-100 shadow-md shadow-black/30 sm:max-w-[68%] ${isUser ? "rounded-br-sm" : "rounded-bl-sm"} ${isPhoto ? "overflow-hidden" : "px-3 pb-1.5 pt-2"}`}
                  style={{ background: color }}
                >
                  {!isPhoto && <BubbleTail side={isUser ? "out" : "in"} color={color} />}
                  {m.viaBot && <div className="mb-0.5 text-[11px] font-medium text-sky-300">via {BOT.handle}</div>}
                  {isPhoto ? (
                    <>
                      {brokenImages[m.id] ? (
                        <div className="flex w-[min(320px,70vw)] flex-col items-center justify-center gap-2 bg-black/25 px-4 py-8 text-center">
                          <ImageIcon size={20} className="text-slate-500" />
                          <span className="text-[11px] text-slate-400">Image preview expired or failed to load.</span>
                          {m.prompt && (
                            <button onClick={() => send(m.prompt!)} className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] text-cyan-300 hover:bg-cyan-400/20">
                              Regenerate
                            </button>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => setLightbox(m)} className="group relative block w-[min(320px,70vw)]" aria-label="Expand image">
                          <img
                            src={m.imageUrl}
                            alt={m.prompt ?? "Generated image"}
                            onError={() => setBrokenImages((b) => ({ ...b, [m.id]: true }))}
                            className={`w-full object-cover ${m.ratioId === "portrait" ? "aspect-[2/3]" : m.ratioId === "landscape" ? "aspect-[3/2]" : "aspect-square"}`}
                          />
                          <span className="absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-1 font-mono text-[8.5px] text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
                            <ZoomIn size={10} /> expand
                          </span>
                        </button>
                      )}
                      <div className="w-[min(320px,70vw)] whitespace-pre-wrap break-words px-3 pt-2"><RichText text={m.text ?? ""} onCommand={send} /></div>
                      {m.styleId && (
                        <div className="mt-1.5 flex items-center justify-between gap-2 px-3 font-mono text-[9px] text-slate-400">
                          <span>{getStylePreset(m.styleId).label} · {m.width ?? 1024}×{m.height ?? 1024}</span>
                          {m.prompt && (
                            <button onClick={() => regenerate(m)} className="flex items-center gap-1 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-sky-300 transition hover:border-cyan-400/40 hover:bg-cyan-400/10">
                              <RotateCw size={9} /> Regenerate
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="whitespace-pre-wrap break-words"><RichText text={m.text ?? ""} onCommand={send} /></div>
                      {m.retryPrompt && (
                        <button onClick={() => send(m.retryPrompt!)} className="mt-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-cyan-300 transition hover:bg-cyan-400/20">
                          Retry prompt
                        </button>
                      )}
                    </>
                  )}
                  <div className={`mt-1 flex items-center justify-end gap-1.5 ${isPhoto ? "px-3 pb-1.5" : ""}`}>
                    {m.kind === "loading" && <Elapsed since={m.ts} />}
                    <span className="font-mono text-[8.5px] text-slate-500">{timeOf(m.ts)}</span>
                    {isUser && <CheckCheck size={12} className="text-sky-400" />}
                  </div>
                </div>
                {m.keyboard && <InlineKeyboard rows={m.keyboard} onButton={onButton} />}
              </div>
            );
          })}

          {typing > 0 && (
            <div className="msg-in flex justify-start px-3 sm:px-6">
              <div className="relative flex items-center gap-1 rounded-2xl rounded-bl-sm bg-[#182533] px-4 py-3.5">
                <BubbleTail side="in" color="#182533" />
                <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
                <span className="typing-dot h-2 w-2 rounded-full bg-slate-400" />
              </div>
            </div>
          )}
        </div>

        {/* command menu */}
        {menuOpen && (
          <div className="border-t border-black/30 bg-[#17212b] px-3 pt-2">
            <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-[#1d2733]">
              {menuItems.map((item, i) => (
                <button key={item.command} onMouseEnter={() => setMenuIndex(i)} onClick={() => send(`/${item.command}`)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${i === menuIndex ? "bg-cyan-400/10" : ""}`}>
                  <img src="/images/mascot.jpg" alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                  <span className="w-20 shrink-0 font-mono text-[11px] font-semibold text-sky-300">/{item.command}</span>
                  <span className="truncate text-[10.5px] text-slate-400">{item.description}</span>
                </button>
              ))}
            </div>
            <div className="px-1 py-1.5 font-mono text-[8.5px] text-slate-600">click to send · tab to complete · registered via setMyCommands</div>
          </div>
        )}

        {/* inline results */}
        {inlineMatch && (
          <div className="border-t border-black/30 bg-[#17212b] px-3 pt-2">
            {inlineResults.map((r) => (
              <button key={r.id} onClick={() => pickInline(r)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-[#1d2733] px-3 py-2.5 text-left transition hover:border-cyan-400/30">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300"><ImageIcon size={16} /></span>
                <span className="min-w-0">
                  <span className="block text-[12px] font-semibold text-white">{r.title}</span>
                  <span className="block truncate text-[10.5px] text-slate-400">{r.description}</span>
                </span>
              </button>
            ))}
            <div className="px-1 py-1.5 font-mono text-[8.5px] text-slate-600">inline mode · answerInlineQuery · works in any chat</div>
          </div>
        )}

        {/* style & ratio strip */}
        <div className="flex flex-wrap items-center gap-2 border-t border-black/30 bg-[#141d27] px-3 py-1.5">
          <label className="flex items-center gap-1.5 text-[10.5px] text-slate-400">
            <Palette size={12} className="text-sky-300" />
            <span className="hidden sm:inline">Style</span>
            <select
              value={prefs.styleId}
              onChange={(e) => setPrefs((p) => ({ ...p, styleId: e.target.value as StyleId }))}
              aria-label="Perchance art style"
              className="rounded-lg border border-white/10 bg-[#1f2c3a] px-2 py-1 text-[11px] text-white outline-none focus:border-cyan-400/40"
            >
              {STYLE_PRESETS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex items-center gap-1" role="group" aria-label="Aspect ratio">
            {RATIO_PRESETS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, ratioId: r.id }))}
                title={`${r.label} (${r.width}×${r.height})`}
                className={`rounded-md px-2 py-1 font-mono text-[9.5px] transition ${
                  prefs.ratioId === r.id ? "bg-[#2aabee]/20 text-sky-300 ring-1 ring-[#2aabee]/40" : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
                }`}
              >
                {r.ratio}
              </button>
            ))}
          </div>
        </div>

        {/* input */}
        <div className="flex items-center gap-2 border-t border-black/30 bg-[#17212b] px-3 py-2.5">
          <button onClick={() => { setMenuForced((v) => !v); inputRef.current?.focus(); }} aria-label="Bot menu"
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-semibold transition ${menuForced ? "bg-[#2aabee] text-[#04121f]" : "bg-[#2aabee]/15 text-[#6dc3f1] hover:bg-[#2aabee]/25"}`}>
            <LayoutList size={14} /> Menu
          </button>
          <div className="flex flex-1 items-center gap-2 rounded-full bg-[#242f3d] px-4 py-2.5 ring-cyan-400/40 transition focus-within:ring-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Write a prompt… or type / for commands"
              aria-label="Message the bot"
              className="w-full bg-transparent text-[13px] text-white placeholder-slate-500 outline-none"
            />
            {isPrompt && (
              <span className={`shrink-0 font-mono text-[9.5px] ${promptLen > BOT.promptLimit ? "text-rose-400" : "text-slate-500"}`}>{promptLen}/{BOT.promptLimit}</span>
            )}
            {input && (
              <button onClick={() => setInput("")} aria-label="Clear input" className="shrink-0 text-slate-500 hover:text-slate-300"><X size={14} /></button>
            )}
          </div>
          <button onClick={() => (inlineMatch && inlineResults[0] ? pickInline(inlineResults[0]) : send(input))} disabled={!input.trim()} aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[#3fbdf5] to-[#229ed9] text-[#04121f] shadow-[0_6px_18px_rgba(42,171,238,0.4)] transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100">
            <SendHorizontal size={17} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      {/* ================= SIDE PANEL ================= */}
      <div className="flex min-h-0 flex-col gap-4 xl:overflow-y-auto">
        <div className="panel-flat p-4">
          <h3 className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500"><Palette size={11} className="text-cyan-400" /> Perchance Quality Engine</h3>
          <p className="mt-2.5 text-[11px] leading-relaxed text-slate-400">
            Prompts can use <b className="text-slate-200">t2i-styles</b> expansion templates (lighting, lens, composition) paired with
            <b className="text-slate-200"> Flux</b> rendering and Perchance aspect ratios. Select <b className="text-slate-200">No style</b> for raw verbatim prompts.
          </p>
          <p className="mt-2 font-mono text-[9.5px] text-slate-500">
            Active: <span className="text-cyan-300">{getStylePreset(prefs.styleId).label}</span> · {getStylePreset(prefs.styleId).short}
          </p>
        </div>

        <div className="panel-flat p-4">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Session</h3>
          <dl className="mt-3 space-y-2 text-[11px]">
            {[
              ["messages", String(messages.length)],
              ["images rendered", String(images)],
              ["prompt limit", `${BOT.promptLimit} chars`],
              ["renderer", `flux · ${getRatioPreset(prefs.ratioId).width}×${getRatioPreset(prefs.ratioId).height}`],
              ["style", getStylePreset(prefs.styleId).label],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 last:border-0">
                <dt className="font-mono text-[9.5px] uppercase tracking-wider text-slate-600">{k}</dt>
                <dd className="font-mono text-[10.5px] text-slate-300">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="panel-flat p-4">
          <h3 className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500"><Sparkles size={11} className="text-cyan-400" /> Prompts from /examples</h3>
          <div className="mt-2.5 space-y-1.5">
            {quickPrompts.map((p) => (
              <button key={p} onClick={() => send(p)}
                className="block w-full rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2 text-left text-[10.5px] leading-snug text-slate-300 transition hover:border-cyan-400/30 hover:text-cyan-100">
                {p}
              </button>
            ))}
          </div>
          <p className="mt-2.5 font-mono text-[9px] leading-relaxed text-slate-600">tip: type <span className="text-sky-300">@imageishere_bot a prompt</span> to try inline mode</p>
        </div>

        <a href={BOT.telegramUrl} target="_blank" rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#3fbdf5] to-[#229ed9] px-4 py-2.5 text-[12px] font-bold text-[#04121f] shadow-[0_8px_24px_rgba(42,171,238,0.3)] transition hover:brightness-110">
          <TelegramIcon size={15} className="text-[#04121f]" /> Use the real bot
        </a>
        <button onClick={resetChat} className="btn-ghost flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-semibold text-slate-400">
          <Eraser size={13} /> Reset conversation
        </button>
      </div>

      {/* ================= LIGHTBOX ================= */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6 backdrop-blur-sm" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <button className="absolute right-5 top-5 rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 hover:text-white" onClick={() => setLightbox(null)} aria-label="Close"><X size={18} /></button>
          <figure className="max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.imageUrl} alt={lightbox.prompt} className="max-h-[72vh] w-auto max-w-full rounded-2xl border border-white/10 object-contain shadow-2xl" />
            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[12px] text-slate-300">“{lightbox.prompt}”</span>
              <span className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-cyan-300">
                  seed {lightbox.seed} · {lightbox.width ?? 1024}×{lightbox.height ?? 1024}{lightbox.styleId ? ` · ${getStylePreset(lightbox.styleId).label}` : ""}
                </span>
                <a href={lightbox.imageUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono text-[10px] text-slate-400 hover:text-white">open original <ExternalLink size={10} /></a>
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}
