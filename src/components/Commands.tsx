import { useMemo, useState } from "react";
import { Search, Copy, Check, TerminalSquare, Bot, ChevronDown, MessageSquareText, Ban, Ruler, AtSign, MousePointerClick, ExternalLink } from "lucide-react";
import { BOT, BOT_COMMANDS, BOT_DESCRIPTION_SNIPPET, SETCOMMANDS_SNIPPET, type BotCommand } from "../data/content";
import { CALLBACK_REPLIES, CALLBACK_TOAST, REPLIES } from "../lib/bot";
import { useCopy } from "../lib/clipboard";
import CodeBlock from "./CodeBlock";

const CATEGORIES = ["All", "Core", "Info", "Session"] as const;

const REPLY_FOR: Record<string, string> = {
  "/start": REPLIES.start,
  "/generate": REPLIES.generate,
  "/examples": REPLIES.examples,
  "/help": REPLIES.help,
  "/status": REPLIES.status,
  "/about": REPLIES.about,
  "/website": REPLIES.website,
  "/support": REPLIES.support,
  "/cancel": REPLIES.cancel,
};

const KEYBOARD_LABEL: Record<BotCommand["keyboard"], string> = {
  main: "main keyboard",
  website: "“Open website” button",
  none: "no keyboard",
};

function ReplyBubble({ text }: { text: string }) {
  return (
    <div className="mt-2 max-w-md rounded-2xl rounded-bl-sm bg-[#182533] px-3 py-2 text-[11.5px] leading-snug text-slate-200 shadow-md shadow-black/30">
      <div className="whitespace-pre-wrap break-words">{text}</div>
    </div>
  );
}

export default function Commands() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const { copiedKey, copy } = useCopy(1400);
  const [open, setOpen] = useState<string | null>("/start");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return BOT_COMMANDS.filter((c) => {
      if (category !== "All" && c.category !== category) return false;
      if (!q) return true;
      return [c.cmd, c.menu, c.behavior, REPLY_FOR[c.cmd] ?? ""].join(" ").toLowerCase().includes(q);
    });
  }, [query, category]);

  return (
    <div className="grid gap-5 xl:grid-cols-5">
      {/* ============ reference list ============ */}
      <div className="xl:col-span-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-line-2 bg-panel px-4 py-2.5 focus-within:border-cyan-400/40">
            <Search size={15} className="shrink-0 text-slate-500" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search commands and replies…" aria-label="Filter commands"
              className="w-full bg-transparent text-[13px] text-white placeholder-slate-600 outline-none" />
            {query && <button onClick={() => setQuery("")} className="font-mono text-[10px] text-slate-500 hover:text-slate-300">clear</button>}
          </div>
          <div className="flex gap-1.5">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`rounded-lg px-3 py-2 font-mono text-[10.5px] font-semibold transition ${category === c ? "bg-cyan-400 text-[#04121f]" : "border border-line-2 bg-panel text-slate-400 hover:text-white"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {filtered.map((c) => {
            const isOpen = open === c.cmd;
            return (
              <div key={c.cmd} className={`overflow-hidden rounded-xl border transition ${isOpen ? "border-cyan-400/25 bg-panel-2" : "border-line bg-panel/70 hover:border-cyan-400/20"}`}>
                <div className="flex items-start gap-3 p-3.5">
                  <button onClick={() => setOpen(isOpen ? null : c.cmd)} className="flex min-w-0 flex-1 items-start gap-3 text-left" aria-expanded={isOpen}>
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300"><TerminalSquare size={15} /></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="font-mono text-[12.5px] font-semibold text-cyan-200">{c.cmd}</code>
                        <span className="rounded border border-white/8 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-slate-500">{c.category}</span>
                        <span className={`rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider ${c.inMenu ? "bg-emerald-400/10 text-emerald-300/90" : "bg-amber-400/10 text-amber-300/90"}`}>{c.inMenu ? "in menu" : "not in menu"}</span>
                      </div>
                      <p className="mt-1 text-[11.5px] leading-snug text-slate-300">{c.menu}</p>
                      <p className="mt-0.5 text-[10.5px] leading-snug text-slate-500">{c.behavior} · <span className="text-slate-400">{KEYBOARD_LABEL[c.keyboard]}</span></p>
                    </div>
                    <ChevronDown size={15} className={`mt-1 shrink-0 text-slate-600 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  <button onClick={() => void copy(c.cmd, c.cmd)} aria-label={`Copy ${c.cmd}`} className="shrink-0 rounded-lg border border-white/5 p-2 text-slate-600 transition hover:border-cyan-400/30 hover:text-cyan-300">
                    {copiedKey === c.cmd ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t border-white/5 bg-black/20 px-4 pb-4 pt-3">
                    <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-slate-600">Exact reply</div>
                    <ReplyBubble text={REPLY_FOR[c.cmd] ?? ""} />
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-line-2 p-10 text-center">
              <TerminalSquare size={22} className="mx-auto text-slate-700" />
              <p className="mt-2 font-mono text-[11px] text-slate-500">No command matches “{query}”.</p>
            </div>
          )}
        </div>

        {/* non-command behaviours */}
        <h3 className="mt-6 font-mono text-[9.5px] uppercase tracking-[0.22em] text-slate-600">Everything else the bot receives</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-3.5">
            <div className="flex items-center gap-2 text-[11.5px] font-semibold text-emerald-200"><MessageSquareText size={13} /> Plain text</div>
            <p className="mt-1 text-[10.5px] leading-snug text-slate-400">Starts image generation. Shows a loading message, then sends the photo with a caption and deletes the loading message.</p>
            <ReplyBubble text={REPLIES.loading} />
            <ReplyBubble text={REPLIES.caption("a red fox in a snowy forest")} />
          </div>
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
            <div className="flex items-center gap-2 text-[11.5px] font-semibold text-slate-200"><Ban size={13} /> Unknown /command</div>
            <p className="mt-1 text-[10.5px] leading-snug text-slate-400">Ignored silently, with no reply. Commands must match exactly, with an optional @imageishere_bot suffix.</p>
            <div className="mt-2 rounded-lg border border-dashed border-white/10 px-3 py-2 font-mono text-[10px] text-slate-600">{`{"status":"ignored"}`}</div>
          </div>
          <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-3.5">
            <div className="flex items-center gap-2 text-[11.5px] font-semibold text-amber-200"><Ruler size={13} /> Prompt over 500 chars</div>
            <p className="mt-1 text-[10.5px] leading-snug text-slate-400">Rejected before generation, with a polite reply.</p>
            <ReplyBubble text={REPLIES.tooLong} />
          </div>
        </div>
      </div>

      {/* ============ right rail ============ */}
      <div className="space-y-5 xl:col-span-2">
        <div className="panel-flat p-5">
          <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400"><Bot size={13} className="text-cyan-400" /> BotFather → /setcommands</h2>
          <p className="mt-2 text-[11.5px] leading-relaxed text-slate-400">Send <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">/setcommands</code> to @BotFather, select the bot and paste:</p>
          <CodeBlock className="mt-3" title="command list (README)" code={SETCOMMANDS_SNIPPET} />
          <CodeBlock className="mt-3" title="/setdescription" code={BOT_DESCRIPTION_SNIPPET} />
          <p className="mt-3 rounded-lg border border-sky-400/15 bg-sky-400/5 px-3 py-2 text-[10.5px] leading-relaxed text-sky-100/80">
            The webhook also registers these itself on cold start (setMyCommands, setMyDescription, setMyShortDescription, setChatMenuButton). That registration lists 8 commands: <b className="text-sky-200">/cancel</b> still works, but it isn't in the menu.
          </p>
        </div>

        <div className="panel-flat p-5">
          <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400"><MousePointerClick size={13} className="text-cyan-400" /> Main keyboard callbacks</h2>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">Each button answers with a <span className="text-slate-200">“{CALLBACK_TOAST}”</span> toast, then replies:</p>
          <div className="mt-3 overflow-hidden rounded-lg border border-line font-mono text-[10px]">
            {Object.entries(CALLBACK_REPLIES).map(([k, v]) => (
              <div key={k} className="flex items-baseline gap-3 border-b border-white/5 bg-white/[0.02] px-3 py-2 last:border-0">
                <code className="w-16 shrink-0 text-emerald-300">{k}</code>
                <span className="truncate text-slate-500">{v.split("\n")[0]}</span>
              </div>
            ))}
            <div className="flex items-baseline gap-3 bg-white/[0.02] px-3 py-2">
              <code className="w-16 shrink-0 text-sky-300">Website</code>
              <span className="flex items-center gap-1 truncate text-slate-500">url button → {BOT.webDisplay} <ExternalLink size={9} /></span>
            </div>
          </div>
        </div>

        <div className="panel-flat p-5">
          <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400"><AtSign size={13} className="text-cyan-400" /> Inline mode</h2>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-400">In any chat, type <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300">@imageishere_bot a prompt</code>. The bot offers a <b className="text-slate-200">Generate this image</b> card that posts the prompt with a deep-link button back to the bot.</p>
          <ReplyBubble text={"Create an image with this prompt:\n\nA watercolor fox in a forest"} />
          <p className="mt-2 font-mono text-[9px] text-slate-600">button: “Generate in Image is Here” → t.me/imageishere_bot?start=inline_…</p>
        </div>
      </div>
    </div>
  );
}
