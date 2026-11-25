import { useCallback, useEffect, useState } from "react";
import {
  Activity, RefreshCw, Radio, Globe, Send, AppWindow, Image as ImageIcon, Sparkles, GitCommitHorizontal, Info, Star, GitFork, CircleDot, Code2, ExternalLink,
} from "lucide-react";
import { BOT } from "../data/content";
import {
  checkWebhook, healthLabel, isSameOrigin, probeCors, probeNoCors, timeAgo, useRepo, useWebhookHealth, type ProbeResult,
} from "../lib/live";
import { GitHubIcon, STATE_STYLE, Sparkline, StateDot, type IconComponent } from "./Brand";

type ServiceDef = {
  id: string;
  name: string;
  role: string;
  display: string;
  icon: IconComponent;
  visibility: "status" | "opaque";
  run: () => Promise<ProbeResult>;
};

const SERVICES: ServiceDef[] = [
  {
    id: "website", name: "Website", role: "Public home of imageishere", display: BOT.webDisplay, icon: Globe, visibility: "opaque",
    run: () => (isSameOrigin() ? probeCors("/") : probeNoCors(BOT.webUrl)),
  },
  {
    id: "telegram-api", name: "Telegram Bot API", role: "sendMessage · sendPhoto · answerInlineQuery", display: "api.telegram.org", icon: Send, visibility: "status",
    run: async () => {
      const r = await probeCors("https://api.telegram.org/bot0:status-probe/getMe", { expectStatus: [401, 404], parse: true });
      return { ...r, detail: r.state === "ok" ? `${r.http} for a dummy token, so the API is answering` : r.detail };
    },
  },
  {
    id: "bot-profile", name: "Bot profile", role: "Public entry point for users", display: BOT.telegramDisplay, icon: Radio, visibility: "opaque",
    run: () => probeNoCors(BOT.telegramUrl),
  },
  {
    id: "browserless", name: "Browserless", role: "Stealth headless Chrome (/function)", display: "chrome.browserless.io", icon: AppWindow, visibility: "opaque",
    run: () => probeNoCors("https://chrome.browserless.io/"),
  },
  {
    id: "perchance", name: "Perchance", role: "AI text-to-image generator", display: "perchance.org/ai-text-to-image-generator", icon: Sparkles, visibility: "opaque",
    run: () => probeNoCors("https://perchance.org/ai-text-to-image-generator"),
  },
  {
    id: "fallback", name: "Fallback renderer", role: "Used when Browserless fails", display: "image.pollinations.ai", icon: ImageIcon, visibility: "status",
    run: () => probeCors("https://image.pollinations.ai/prompt/imageishere%20status%20probe?width=64&height=64&nologo=true&seed=1"),
  },
  {
    id: "github", name: "Source (GitHub)", role: "refatwashere/imageishere · main", display: "raw.githubusercontent.com", icon: Code2, visibility: "status",
    run: async () => {
      const r = await probeCors(`${BOT.rawBase}/package.json`, { parse: true });
      const v = (r.body as { version?: string } | undefined)?.version;
      return { ...r, detail: v ? `package.json reports v${v}` : r.detail };
    },
  },
];

type Entry = ProbeResult & { history: number[] };

const CONTRACT: { req: string; res: string; code: number; note: string }[] = [
  { req: "GET", code: 200, res: '{"status":"ok","service":"Image is Here webhook"}', note: "Health check. Also re-registers the bot's commands" },
  { req: "POST · bad / missing secret", code: 403, res: '{"error":"Forbidden"}', note: "Only when WEBHOOK_SECRET is set" },
  { req: "POST · plain-text prompt", code: 200, res: '{"status":"accepted"}', note: "Image is generated afterwards inside waitUntil" },
  { req: "POST · command / button / inline", code: 200, res: '{"status":"ok"}', note: "Reply sent before responding" },
  { req: "POST · unknown /command", code: 200, res: '{"status":"ignored"}', note: "No reply is sent" },
  { req: "POST · prompt > 500 chars", code: 200, res: '{"status":"prompt_too_long"}', note: "User is asked to shorten it" },
  { req: "POST · env vars missing", code: 500, res: '{"error":"Server configuration error"}', note: "Needs TELEGRAM_BOT_TOKEN + BROWSERLESS_KEY" },
  { req: "PUT / DELETE / …", code: 405, res: '{"error":"Method not allowed"}', note: "Allow: GET, POST" },
];

export default function Status() {
  const health = useWebhookHealth();
  const { repo, commits, version, error: repoError, loading: repoLoading } = useRepo();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<number | null>(null);

  const runAll = useCallback(async () => {
    setRunning(true);
    void checkWebhook();
    setEntries((prev) => {
      const next = { ...prev };
      SERVICES.forEach((s) => (next[s.id] = { ...(prev[s.id] ?? { latency: null, checkedAt: null, history: [] }), state: "checking" }));
      return next;
    });
    await Promise.all(
      SERVICES.map(async (s) => {
        const r = await s.run();
        setEntries((prev) => {
          const history = prev[s.id]?.history ?? [];
          return { ...prev, [s.id]: { ...r, history: r.latency != null ? [...history, r.latency].slice(-30) : history } };
        });
      })
    );
    setLastRun(Date.now());
    setRunning(false);
  }, []);

  useEffect(() => {
    void runAll();
  }, [runAll]);

  const states = [health.state, ...SERVICES.map((s) => entries[s.id]?.state ?? "idle")];
  const up = states.filter((s) => s === "ok" || s === "reachable").length;
  const down = states.filter((s) => s === "down").length;
  const hs = STATE_STYLE[health.state];

  return (
    <div className="space-y-5">
      {/* summary */}
      <div className="panel-flat flex flex-wrap items-center gap-5 p-5">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${down ? "border-rose-400/30 bg-rose-400/10 text-rose-300" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"}`}>
          <Activity size={24} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold text-white">
            {running ? "Running live checks…" : down ? `${down} service${down > 1 ? "s" : ""} unreachable` : "All systems answering"}
          </h1>
          <p className="mt-0.5 text-[11.5px] text-slate-400">
            {up} of {states.length} endpoints responded · checks run in your browser right now
            {lastRun ? ` · last run ${timeAgo(lastRun)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">
          <span className="flex items-center gap-1.5"><StateDot state="ok" /> status visible</span>
          <span className="flex items-center gap-1.5"><StateDot state="reachable" /> reachable (opaque)</span>
          <span className="flex items-center gap-1.5"><StateDot state="down" /> unreachable</span>
        </div>
        <button onClick={() => void runAll()} disabled={running}
          className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold disabled:opacity-60">
          <RefreshCw size={14} className={running ? "animate-spin" : ""} /> {running ? "Checking…" : "Run checks"}
        </button>
      </div>

      {/* webhook hero card + service grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={`rounded-2xl border p-4 md:col-span-2 ${hs.ring} ${hs.bg}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-cyan-300"><Radio size={18} /></div>
              <div>
                <div className="text-[13px] font-semibold text-white">Telegram webhook</div>
                <div className="font-mono text-[10px] text-slate-400">GET {BOT.webDisplay}{BOT.webhookPath}</div>
              </div>
            </div>
            <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9.5px] font-semibold uppercase ${hs.ring} ${hs.text}`}>
              <StateDot state={health.state} /> {healthLabel(health.state)}
            </span>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="min-w-0">
              {health.body ? (
                <pre className="overflow-x-auto rounded-lg border border-white/5 bg-black/40 px-3 py-2 font-mono text-[10.5px] text-emerald-300">{JSON.stringify(health.body)}</pre>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-2 text-[10.5px] leading-relaxed text-slate-400">
                  <Info size={12} className="mt-0.5 shrink-0 text-sky-300" />
                  {health.mode === "no-cors"
                    ? "The route answered, but it doesn't send CORS headers, so the browser hides the JSON body. Host this console on imageishere.vercel.app to see the full response here."
                    : "Waiting for the first response…"}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[9.5px] text-slate-500">
                <span>latency {health.latency != null ? `${health.latency} ms` : "—"}</span>
                <span>http {health.http ?? (health.mode === "no-cors" ? "hidden" : "—")}</span>
                <span>mode {health.mode ?? "—"}</span>
                <span>checked {health.checkedAt ? timeAgo(health.checkedAt) : "—"}</span>
                <span>auto re-check every 2 min</span>
              </div>
            </div>
            <div className="w-full sm:w-44">
              <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-slate-600">latency this session</div>
              <Sparkline values={health.history} className="mt-1 h-10 w-full" />
            </div>
          </div>
        </div>

        {SERVICES.map((s) => {
          const e = entries[s.id];
          const state = e?.state ?? "idle";
          const sty = STATE_STYLE[state];
          return (
            <div key={s.id} className={`flex flex-col rounded-2xl border bg-panel/70 p-4 ${sty.ring}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/8 bg-white/[0.04] text-cyan-300"><s.icon size={15} /></div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-semibold text-white">{s.name}</div>
                    <div className="truncate text-[9.5px] text-slate-500">{s.role}</div>
                  </div>
                </div>
                <StateDot state={state} className="mt-1.5 h-2 w-2" />
              </div>
              <div className="mt-3 truncate font-mono text-[9.5px] text-slate-400">{s.display}</div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className={`font-mono text-[10px] font-semibold uppercase ${sty.text}`}>{healthLabel(state)}</span>
                <span className="font-display text-lg font-bold text-white tabular-nums">{e?.latency != null ? `${e.latency}` : "—"}<span className="ml-0.5 text-[10px] font-normal text-slate-500">ms</span></span>
              </div>
              <div className="mt-1 min-h-[14px] truncate font-mono text-[9px] text-slate-600">
                {e?.http ? `HTTP ${e.http} · ` : ""}{e?.detail ?? (s.visibility === "opaque" ? "reachability only (cross-origin)" : "status visible via CORS")}
              </div>
              <Sparkline values={e?.history ?? []} className="mt-2 h-6 w-full" />
            </div>
          );
        })}
      </div>

      {/* contract + repo */}
      <div className="grid gap-5 xl:grid-cols-5">
        <div className="panel-flat overflow-hidden xl:col-span-3">
          <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
            <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">Webhook response contract</h2>
            <span className="font-mono text-[9px] text-slate-600">from api/webhook.js</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left">
              <thead>
                <tr className="font-mono text-[8.5px] uppercase tracking-wider text-slate-600">
                  <th className="px-5 py-2.5">Request</th><th className="px-2 py-2.5">Code</th><th className="px-2 py-2.5">Body</th><th className="px-5 py-2.5">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {CONTRACT.map((r) => (
                  <tr key={r.req} className="text-[10.5px]">
                    <td className="px-5 py-2.5 text-slate-300">{r.req}</td>
                    <td className="px-2 py-2.5">
                      <span className={`rounded px-1.5 py-0.5 font-mono text-[9.5px] font-bold ${r.code === 200 ? "bg-emerald-400/15 text-emerald-300" : r.code === 500 ? "bg-rose-400/15 text-rose-300" : "bg-amber-400/15 text-amber-300"}`}>{r.code}</span>
                    </td>
                    <td className="px-2 py-2.5 font-mono text-[9.5px] text-cyan-200/90">{r.res}</td>
                    <td className="px-5 py-2.5 text-[10px] text-slate-500">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel-flat p-5 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400"><GitHubIcon size={13} /> Repository activity</h2>
            <a href={BOT.repoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-mono text-[9.5px] text-cyan-400 hover:text-cyan-300">open <ExternalLink size={10} /></a>
          </div>
          {repo && (
            <div className="mt-3 grid grid-cols-4 gap-2 text-center">
              {[
                { icon: Star, v: repo.stars, l: "stars" },
                { icon: GitFork, v: repo.forks, l: "forks" },
                { icon: CircleDot, v: repo.issues, l: "issues" },
                { icon: Code2, v: `v${version ?? BOT.version}`, l: repo.language ?? "code" },
              ].map((x) => (
                <div key={x.l} className="rounded-lg border border-white/5 bg-white/[0.02] px-1 py-2">
                  <x.icon size={12} className="mx-auto text-slate-500" />
                  <div className="mt-1 font-display text-[14px] font-bold text-white">{x.v}</div>
                  <div className="font-mono text-[8px] uppercase tracking-wider text-slate-600">{x.l}</div>
                </div>
              ))}
            </div>
          )}
          <ul className="mt-3 divide-y divide-white/5">
            {repoLoading && <li className="py-3 font-mono text-[10px] text-slate-600">loading commits from GitHub…</li>}
            {commits.slice(0, 6).map((c) => (
              <li key={c.sha}>
                <a href={c.url} target="_blank" rel="noreferrer" className="group flex items-start gap-2.5 py-2.5">
                  <GitCommitHorizontal size={14} className="mt-0.5 shrink-0 text-slate-600 group-hover:text-cyan-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] text-slate-300 group-hover:text-white">{c.message}</span>
                    <span className="font-mono text-[9px] text-slate-600">{c.sha} · {c.author} · {timeAgo(c.date)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          {repoError && <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed text-amber-300/80"><Info size={11} className="mt-0.5 shrink-0" />{repoError}</p>}
        </div>
      </div>
    </div>
  );
}
