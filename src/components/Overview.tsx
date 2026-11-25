import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, ShieldCheck, Zap, Image as ImageIcon, Workflow, Globe, Terminal, ChevronRight, ScanLine, AppWindow, Send, Wand2, LifeBuoy, AtSign, Rocket,
} from "lucide-react";
import type { ViewKey } from "./Sidebar";
import { BOT, BOT_COMMANDS } from "../data/content";
import { healthLabel, timeAgo, useRepo, useWebhookHealth } from "../lib/live";
import CodeBlock from "./CodeBlock";
import { GitHubIcon, STATE_STYLE, StateDot, TelegramIcon, Wordmark } from "./Brand";

function useCountUp(target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setValue(Math.round(target * (p === 1 ? 1 : 1 - Math.pow(2, -9 * p))));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

export default function Overview({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const health = useWebhookHealth();
  const { version, commits, repo } = useRepo();
  const latest = commits[0];
  const limit = useCountUp(BOT.promptLimit);
  const cmds = useCountUp(BOT_COMMANDS.length);
  const budget = useCountUp(BOT.maxDuration);
  const st = STATE_STYLE[health.state];

  const facts = [
    { n: limit, l: "character prompt limit" },
    { n: cmds, l: "bot commands + plain-text prompts" },
    { n: `${budget}s`, l: "function budget (vercel.json)" },
    { n: "1", l: "image per prompt, delivered in-chat" },
  ];

  return (
    <div className="space-y-6">
      {/* ================= HERO ================= */}
      <section className="panel relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="/images/hero.jpg" alt="" className="h-full w-full object-cover object-[72%_center]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#060b16] via-[#060b16]/80 to-[#060b16]/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060b16] via-transparent to-transparent" />
          <div className="pointer-events-none absolute left-0 top-0 h-16 w-full overflow-hidden opacity-40">
            <div className="scan-line h-10 w-full bg-gradient-to-b from-transparent via-cyan-300/25 to-transparent" />
          </div>
        </div>

        <div className="relative z-10 max-w-2xl px-6 pb-8 pt-10 sm:px-9 sm:pt-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.18em]">
              <TelegramIcon size={11} className="text-[#2aabee]" /> Public Telegram bot
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border bg-black/40 px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.18em] ${st.ring} ${st.text}`}>
              <StateDot state={health.state} /> webhook {healthLabel(health.state)}
            </span>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <Wordmark className="text-[22px] text-white/90" />
            <span className="h-4 w-px bg-white/15" />
            <span className="font-mono text-[11px] text-slate-400">{BOT.handle}</span>
          </div>

          <h1 className="mt-3 font-display text-[40px] font-bold leading-[1.02] tracking-tight text-white sm:text-[54px]">
            Type a prompt.
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">Get an image in Telegram.</span>
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-slate-300">
            <b className="font-semibold text-white">imageishere</b> is a public Telegram bot that turns text prompts into AI images.
            Prompts run through <b className="font-semibold text-white">Perchance via Browserless</b>, and a Vercel webhook sends the
            result back to your chat. Built by <b className="font-semibold text-white">{BOT.developer}</b>.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href={BOT.telegramUrl} target="_blank" rel="noreferrer" className="btn-primary group flex items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-bold">
              <TelegramIcon size={16} className="text-[#04121f]" />
              Open {BOT.handle}
              <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
            </a>
            <button onClick={() => onNavigate("simulator")} className="btn-ghost flex items-center gap-2 rounded-xl px-5 py-3 text-[13px] font-semibold">
              <Wand2 size={15} /> Try it here first
            </button>
            <a href={BOT.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-3 text-[12.5px] font-semibold text-slate-300 transition hover:text-white">
              <GitHubIcon size={15} /> Source
            </a>
          </div>

          <div className="mt-7 grid max-w-xl grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
            {facts.map((s) => (
              <div key={s.l}>
                <div className="font-display text-[26px] font-bold leading-none text-white tabular-nums">{s.n}</div>
                <div className="mt-1 text-[9.5px] font-medium uppercase leading-snug tracking-[0.14em] text-slate-500">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= FACT TICKER ================= */}
      <div className="overflow-hidden rounded-xl border border-line bg-panel/60 py-2">
        <div className="ticker flex w-max items-center gap-10 whitespace-nowrap font-mono text-[10.5px] text-slate-500">
          {[0, 1].map((i) => (
            <span key={i} className="flex items-center gap-10" aria-hidden={i === 1}>
              <span>GET <b className="text-slate-300">{BOT.webhookPath}</b> → {`{"status":"ok"}`}</span>
              <span className="text-cyan-400/60">//</span>
              <span>allowed_updates: <b className="text-slate-300">message · callback_query · inline_query</b></span>
              <span className="text-cyan-400/60">//</span>
              <span>Browserless <b className="text-slate-300">/function</b> · stealth · 115 s</span>
              <span className="text-cyan-400/60">//</span>
              <span>fallback renderer <b className="text-slate-300">1024²</b></span>
              <span className="text-cyan-400/60">//</span>
              <span>maxDuration <b className="text-slate-300">300 s</b></span>
              <span className="text-cyan-400/60">//</span>
              <span>v<b className="text-slate-300">{version ?? BOT.version}</b>{latest ? <> · <b className="text-slate-300">{latest.sha}</b> {timeAgo(latest.date)}</> : null}</span>
              <span className="text-cyan-400/60">//</span>
              <span>made by <b className="text-slate-300">{BOT.developer}</b></span>
              <span className="text-cyan-400/60">//</span>
            </span>
          ))}
        </div>
      </div>

      {/* ================= PROJECT INFO + LIFECYCLE ================= */}
      <div className="grid gap-6 xl:grid-cols-5">
        <div className="panel-flat p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <ScanLine size={13} className="text-cyan-400" /> Project Information
            </h2>
            <span className="font-mono text-[9px] text-slate-600">README.md</span>
          </div>
          <dl className="mt-4 divide-y divide-white/5 text-[12.5px]">
            {[
              { k: "Developer", v: BOT.developer, href: BOT.githubProfile },
              { k: "Telegram", v: BOT.telegramDisplay, href: BOT.telegramUrl },
              { k: "GitHub", v: BOT.repoDisplay, href: BOT.repoUrl },
              { k: "Web", v: BOT.webDisplay, href: BOT.webUrl },
              { k: "Webhook", v: `${BOT.webDisplay}${BOT.webhookPath}`, href: BOT.webhookUrl },
              { k: "Version", v: `v${version ?? BOT.version}${latest ? ` · ${latest.sha}` : ""}`, href: latest?.url },
            ].map((row) => (
              <div key={row.k} className="flex items-baseline justify-between gap-4 py-[9px]">
                <dt className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">{row.k}</dt>
                <dd className="min-w-0 truncate text-right">
                  {row.href ? (
                    <a href={row.href} target="_blank" rel="noreferrer" className="text-cyan-300 transition hover:text-cyan-200 hover:underline">{row.v}</a>
                  ) : (
                    <span className="text-slate-200">{row.v}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">Runtime stack</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {BOT.stack.map((s) => (
                <span key={s} className="rounded-md border border-white/8 bg-white/[0.04] px-2 py-1 font-mono text-[9.5px] text-slate-300">{s}</span>
              ))}
            </div>
          </div>
          {latest && (
            <a href={latest.url} target="_blank" rel="noreferrer" className="mt-4 block rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 transition hover:border-cyan-400/25">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-slate-600">Latest commit · {timeAgo(latest.date)}</div>
              <div className="mt-0.5 truncate text-[11px] text-slate-300">{latest.message}</div>
            </a>
          )}
        </div>

        <div className="panel-flat relative overflow-hidden p-5 xl:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <Workflow size={13} className="text-cyan-400" /> How a prompt becomes an image
            </h2>
            <span className="font-mono text-[9px] text-slate-600">POST {BOT.webhookPath}</span>
          </div>
          <div className="mt-6 grid grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto] items-start gap-y-3">
            {[
              { icon: Send, label: "Telegram", sub: "your prompt" },
              null,
              { icon: ShieldCheck, label: "Webhook", sub: "secret ✓ · 200" },
              null,
              { icon: AppWindow, label: "Browserless", sub: "stealth Chrome" },
              null,
              { icon: ImageIcon, label: "Perchance", sub: "renders image" },
            ].map((node, i) =>
              node === null ? (
                <svg key={i} viewBox="0 0 60 12" className="mt-6 h-3 w-full min-w-3 sm:mt-7">
                  <line x1="0" y1="6" x2="60" y2="6" stroke="#2aabee" strokeWidth="1.6" className="flow-dash" />
                </svg>
              ) : (
                <div key={i} className="flex flex-col items-center gap-1.5 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-cyan-400/15 to-sky-900/20 text-cyan-300 shadow-[0_0_30px_rgba(42,171,238,0.15)] sm:h-14 sm:w-14">
                    <node.icon size={20} strokeWidth={1.6} />
                  </div>
                  <div className="text-[10.5px] font-semibold leading-tight text-slate-200">{node.label}</div>
                  <div className="font-mono text-[8.5px] text-slate-600">{node.sub}</div>
                </div>
              )
            )}
          </div>
          <div className="mt-3 text-center font-mono text-[9px] text-slate-600">… then <span className="text-slate-400">sendPhoto</span> → “✨ Generated Image” arrives in your chat</div>
          <div className="mt-4 grid gap-2 border-t border-white/5 pt-4 sm:grid-cols-3">
            {[
              { icon: Zap, t: "Instant ack", d: "The handler answers 200 “accepted” right away and finishes the work inside waitUntil." },
              { icon: LifeBuoy, t: "Fallback renderer", d: "If Browserless fails, the bot sends a Pollinations image instead, so it still replies." },
              { icon: AtSign, t: "Inline mode", d: "Type @imageishere_bot <prompt> in any chat to share a “Generate this image” card." },
            ].map((c) => (
              <div key={c.t} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300"><c.icon size={12} />{c.t}</div>
                <div className="mt-1 text-[10px] leading-snug text-slate-500">{c.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= DEVELOPER · QUICKSTART · RELIABILITY ================= */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* developer */}
        <div className="panel-flat relative overflow-hidden p-5">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
          <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">Developer</h2>
          <div className="mt-4 flex items-center gap-4">
            <img src={BOT.avatar} alt={BOT.developer} className="h-16 w-16 rounded-2xl border border-white/10 object-cover shadow-lg" loading="lazy" />
            <div className="min-w-0">
              <div className="font-display text-[17px] font-bold leading-tight text-white">{BOT.developer}</div>
              <a href={BOT.githubProfile} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1.5 font-mono text-[10.5px] text-slate-400 hover:text-cyan-300">
                <GitHubIcon size={11} /> @{BOT.githubUser}
              </a>
            </div>
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-slate-400">Designed, built and maintained <b className="text-slate-200">imageishere</b>, from the Telegram webhook to the Browserless/Perchance pipeline.</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: GitHubIcon, l: "GitHub", href: BOT.repoUrl },
              { icon: TelegramIcon, l: "Telegram", href: BOT.telegramUrl },
              { icon: Globe, l: "Website", href: BOT.webUrl },
            ].map((b) => (
              <a key={b.l} href={b.href} target="_blank" rel="noreferrer"
                className="flex flex-col items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2 py-3 text-[10px] font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:text-white">
                <b.icon size={16} className={b.l === "Telegram" ? "text-[#2aabee]" : ""} />
                {b.l}
              </a>
            ))}
          </div>
          {repo && (
            <div className="mt-3 flex items-center justify-between font-mono text-[9px] text-slate-600">
              <span>★ {repo.stars} · forks {repo.forks}</span>
              <span>last push {timeAgo(repo.pushedAt)}</span>
            </div>
          )}
        </div>

        {/* quickstart */}
        <div className="panel-flat p-5">
          <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <Terminal size={13} className="text-cyan-400" /> Run it yourself
          </h2>
          <CodeBlock className="mt-3" title="PowerShell" code={`git clone ${BOT.repoGit}
cd imageishere
npm install
Copy-Item .env.example .env
npm start   # local polling via bot.js`} />
          <button onClick={() => onNavigate("runbook")} className="group mt-3 flex items-center gap-1 font-mono text-[10.5px] font-medium text-cyan-400 transition hover:text-cyan-300">
            full deploy runbook with checklists
            <ChevronRight size={12} className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        {/* reliability */}
        <div className="panel-flat flex flex-col justify-between gap-4 p-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              <ShieldCheck size={13} className="text-cyan-400" /> Built to stay up
            </h2>
            <ul className="mt-3 space-y-2.5 text-[11.5px] leading-snug text-slate-300">
              {[
                "Requests without the right secret_token header are rejected with 403.",
                "The immediate 200 response means Telegram never times out and retries the same update.",
                "A fallback renderer keeps replies coming if Browserless or Perchance fails.",
                "Commands, description and menu button register themselves through setMyCommands.",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-400" />{t}</li>
              ))}
            </ul>
          </div>
          <button onClick={() => onNavigate("tools")} className="flex items-center justify-center gap-2 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 font-mono text-[10.5px] font-semibold text-cyan-300 transition hover:bg-cyan-400/15">
            <Rocket size={12} /> Register or verify the webhook →
          </button>
        </div>
      </div>
    </div>
  );
}
