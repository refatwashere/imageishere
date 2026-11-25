import { useEffect, useRef, useState } from "react";
import {
  Check, ChevronRight, ClipboardList, KeyRound, Terminal, Rocket, Webhook, ShieldCheck, Bot, RotateCcw, AppWindow, Gauge, ExternalLink, AlertTriangle,
} from "lucide-react";
import CodeBlock from "./CodeBlock";
import { BOT, BOT_DESCRIPTION_SNIPPET, ENV_EXAMPLE, ENV_VARS, SETCOMMANDS_SNIPPET } from "../data/content";
import type { ViewKey } from "./Sidebar";
import { TelegramIcon, type IconComponent } from "./Brand";

type Task = { id: string; label: string };
type Step = { id: string; title: string; time: string; icon: IconComponent; tasks: Task[] };

/* README Table of Contents §1–8 */
const STEPS: Step[] = [
  { id: "prereqs", title: "Prerequisites", time: "2 min", icon: ClipboardList, tasks: [
    { id: "p1", label: "A Telegram account" },
    { id: "p2", label: "A GitHub account" },
    { id: "p3", label: "A Vercel account" },
    { id: "p4", label: "A Browserless account" },
    { id: "p5", label: "Node.js 18 or newer" },
    { id: "p6", label: "PowerShell or another terminal" },
    { id: "p7", label: "Access to the Vercel project dashboard" },
  ]},
  { id: "bot", title: "Create the Telegram bot", time: "3 min", icon: Bot, tasks: [
    { id: "b1", label: "Open Telegram and search for @BotFather" },
    { id: "b2", label: "Send /start" },
    { id: "b3", label: "Send /newbot" },
    { id: "b4", label: "Enter a public display name, for example “Image is Here”" },
    { id: "b5", label: "Enter a unique username ending in bot, for example imageishere_bot" },
    { id: "b6", label: "Copy the HTTP API token shown by BotFather" },
    { id: "b7", label: "Store the token privately as TELEGRAM_BOT_TOKEN" },
  ]},
  { id: "botfather", title: "Configure BotFather", time: "3 min", icon: KeyRound, tasks: [
    { id: "c1", label: "/setdescription: the public description shown before /start" },
    { id: "c2", label: "/setabouttext: the short About text" },
    { id: "c3", label: "/setuserpic: upload a bot profile image" },
    { id: "c4", label: "/setcommands: paste the command list" },
    { id: "c5", label: "/setprivacy: decide whether the bot receives group messages" },
  ]},
  { id: "browserless", title: "Create the Browserless account", time: "3 min", icon: AppWindow, tasks: [
    { id: "s1", label: "Open chrome.browserless.io" },
    { id: "s2", label: "Create or sign in to the account" },
    { id: "s3", label: "Open the API or dashboard section" },
    { id: "s4", label: "Copy the Browserless API key" },
    { id: "s5", label: "Store it privately as BROWSERLESS_KEY" },
  ]},
  { id: "local", title: "Local setup", time: "5 min", icon: Terminal, tasks: [
    { id: "l1", label: "npm install" },
    { id: "l2", label: "Copy-Item .env.example .env" },
    { id: "l3", label: "Fill in TELEGRAM_BOT_TOKEN, WEBHOOK_SECRET and BROWSERLESS_KEY" },
    { id: "l4", label: "Generate a strong webhook secret (PowerShell snippet)" },
    { id: "l5", label: "npm start, then send /start to the bot (local polling)" },
    { id: "l6", label: "Stop polling with Ctrl+C before switching to the webhook" },
  ]},
  { id: "vercel", title: "Deploy to Vercel", time: "5 min", icon: Rocket, tasks: [
    { id: "v1", label: "Open vercel.com and select Add New Project" },
    { id: "v2", label: "Import refatwashere/imageishere from GitHub" },
    { id: "v3", label: "Leave the framework preset on Other" },
    { id: "v4", label: "Add the environment variables and apply them to Production" },
    { id: "v5", label: "Select Deploy and wait for it to complete" },
    { id: "v6", label: "Open https://<domain>/api/webhook and confirm the health JSON" },
    { id: "v7", label: "Redeploy after any environment variable change" },
  ]},
  { id: "webhook", title: "Register the Telegram webhook", time: "2 min", icon: Webhook, tasks: [
    { id: "w1", label: "Set $token, $webhookUrl and $secret exactly once" },
    { id: "w2", label: "Run setWebhook with secret_token, allowed_updates and drop_pending_updates" },
    { id: "w3", label: "Confirm Telegram answers ok: true" },
  ]},
  { id: "verify", title: "Verify and test the bot", time: "4 min", icon: ShieldCheck, tasks: [
    { id: "t1", label: "getWebhookInfo: the url matches the Vercel route" },
    { id: "t2", label: "has_custom_certificate is false; last_error_message is empty" },
    { id: "t3", label: "pending_update_count is 0 or decreasing" },
    { id: "t4", label: "allowed_updates contains message, callback_query and inline_query" },
    { id: "t5", label: "Open t.me/imageishere_bot and send /start, /help and /about" },
    { id: "t6", label: "Send a prompt such as “a red fox in a snowy forest”" },
    { id: "t7", label: "The loading message appears, then the generated photo arrives" },
  ]},
];

const ALL_TASKS = STEPS.flatMap((s) => s.tasks);
const STORE = "imageishere.runbook.v1";

const LEVEL_BADGE: Record<string, string> = {
  required: "bg-rose-400/15 text-rose-300",
  recommended: "bg-amber-400/15 text-amber-300",
  optional: "bg-slate-400/10 text-slate-400",
};

export default function Runbook({ onNavigate }: { onNavigate: (v: ViewKey) => void }) {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(STORE) ?? "{}"); } catch { return {}; }
  });
  const [active, setActive] = useState(STEPS[0].id);
  const contentRef = useRef<HTMLDivElement>(null);
  const step = STEPS.find((s) => s.id === active)!;
  const activeIdx = STEPS.findIndex((s) => s.id === active);

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(checked)); } catch { /* ignore */ }
  }, [checked]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [active]);

  const done = ALL_TASKS.filter((t) => checked[t.id]).length;
  const pct = Math.round((done / ALL_TASKS.length) * 100);
  const stepDone = (s: Step) => s.tasks.every((t) => checked[t.id]);
  const stepCount = (s: Step) => s.tasks.filter((t) => checked[t.id]).length;
  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  return (
    <div className="grid gap-5 xl:h-full xl:min-h-0 xl:grid-cols-[300px_minmax(0,1fr)]">
      {/* ============ stepper ============ */}
      <div className="panel-flat flex min-h-0 flex-col p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400">Deploy runbook</h2>
          <button onClick={() => setChecked({})} className="flex items-center gap-1 font-mono text-[9px] text-slate-600 transition hover:text-rose-300" title="Reset all checkboxes">
            <RotateCcw size={10} /> reset
          </button>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline justify-between font-mono text-[9.5px]">
            <span className="text-slate-500">{done} / {ALL_TASKS.length} tasks</span>
            <span className={pct === 100 ? "text-emerald-400" : "text-cyan-300"}>{pct}%</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/40">
            <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          {pct === 100 && (
            <a href={BOT.telegramUrl} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1.5 font-mono text-[10px] font-semibold text-emerald-300">
              Deployment complete. Say hi to {BOT.handle} <ExternalLink size={10} />
            </a>
          )}
        </div>
        <ol className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {STEPS.map((s, i) => {
            const isActive = s.id === active;
            const complete = stepDone(s);
            return (
              <li key={s.id}>
                <button onClick={() => setActive(s.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${isActive ? "border-cyan-400/30 bg-cyan-400/[0.08]" : "border-transparent hover:bg-white/[0.03]"}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold transition ${complete ? "bg-emerald-400 text-[#04160d]" : isActive ? "bg-cyan-400 text-[#04121f]" : "border border-white/10 text-slate-500"}`}>
                    {complete ? <Check size={12} strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[11.5px] font-medium leading-tight ${complete ? "text-slate-500 line-through decoration-slate-700" : "text-slate-200"}`}>{s.title}</span>
                    <span className="mt-0.5 block font-mono text-[8.5px] text-slate-600">{s.time} · {stepCount(s)}/{s.tasks.length} done</span>
                  </span>
                  <ChevronRight size={13} className={isActive ? "text-cyan-400" : "text-slate-700"} />
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ============ step content ============ */}
      <div ref={contentRef} className="min-h-0 xl:overflow-y-auto">
        <div className="panel-flat p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-400/10 text-cyan-300"><step.icon size={20} strokeWidth={1.7} /></div>
              <div>
                <h1 className="font-display text-lg font-semibold text-white">{activeIdx + 1}. {step.title}</h1>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-600">≈ {step.time} · README.md</p>
              </div>
            </div>
            {activeIdx < STEPS.length - 1 && (
              <button onClick={() => setActive(STEPS[activeIdx + 1].id)} className="btn-ghost flex items-center gap-1.5 rounded-lg px-3 py-2 font-mono text-[10.5px] font-semibold text-cyan-300">
                next step <ChevronRight size={13} />
              </button>
            )}
          </div>

          <div className="mt-4 space-y-1.5">
            {step.tasks.map((t) => {
              const on = !!checked[t.id];
              return (
                <button key={t.id} onClick={() => toggle(t.id)} role="checkbox" aria-checked={on}
                  className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left transition ${on ? "border-emerald-400/20 bg-emerald-400/[0.06]" : "border-white/5 bg-white/[0.02] hover:border-cyan-400/25"}`}>
                  <span className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border transition ${on ? "border-emerald-400 bg-emerald-400" : "border-slate-600"}`}>
                    {on && <Check size={12} strokeWidth={3.5} className="text-[#04160d]" />}
                  </span>
                  <span className={`text-[12px] leading-snug ${on ? "text-slate-500" : "text-slate-200"}`}>{t.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-4">
            {active === "prereqs" && (
              <>
                <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-[11.5px] leading-relaxed text-rose-100/85">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-300" />
                  <span>A Telegram bot token and a Browserless API key are <b className="text-rose-200">secrets</b>. Never commit or publish either value.</span>
                </div>
                <CodeBlock title="check your Node version (needs ≥ 18)" code={`node --version`} />
              </>
            )}
            {active === "bot" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <CodeBlock title="token format" code={`123456789:AA...\n\n# store as TELEGRAM_BOT_TOKEN`} />
                <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-4 text-[11px] leading-relaxed text-rose-100/85">
                  <b className="text-rose-300">If the token is leaked:</b>
                  <ol className="mt-1.5 list-decimal space-y-0.5 pl-4">
                    <li>Open @BotFather</li>
                    <li>Send /revoke or /mybots</li>
                    <li>Select the bot</li>
                    <li>Revoke the existing token</li>
                    <li>Update TELEGRAM_BOT_TOKEN everywhere the bot is deployed</li>
                  </ol>
                </div>
              </div>
            )}
            {active === "botfather" && (
              <>
                <CodeBlock title="/setcommands" code={SETCOMMANDS_SNIPPET} />
                <CodeBlock title="recommended bot description" code={BOT_DESCRIPTION_SNIPPET} />
                <p className="text-[11px] leading-relaxed text-slate-500">BotFather settings don't set the Vercel environment variables or register the webhook. Those are separate steps.</p>
              </>
            )}
            {active === "browserless" && (
              <div className="grid gap-4 lg:grid-cols-2">
                <CodeBlock title="optional · custom endpoint" code={`BROWSERLESS_URL=https://your-browserless-host\n\n# default: https://chrome.browserless.io`} />
                <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-[11px] leading-relaxed text-slate-400">
                  <b className="text-slate-200">How it's used:</b> lib/image-generator.js sends
                  <code className="mx-1 rounded bg-black/40 px-1 font-mono text-[10px] text-cyan-300">POST /function?timeout=115000&stealth=true</code>
                  with your key as a Bearer token. A headless browser opens Perchance, types the prompt, clicks Generate and returns the image source.
                </div>
              </div>
            )}
            {active === "local" && (
              <>
                <CodeBlock title="PowerShell · install" code={`git clone ${BOT.repoGit}\ncd imageishere\nnpm install\nCopy-Item .env.example .env`} />
                <CodeBlock title=".env" code={ENV_EXAMPLE} />
                <CodeBlock title="PowerShell · generate a webhook secret" code={`$rng = [Security.Cryptography.RandomNumberGenerator]::Create()\n$bytes = New-Object byte[] 32\n$rng.GetBytes($bytes)\n$rng.Dispose()\n[BitConverter]::ToString($bytes).Replace('-', '').ToLower()`} />
                <CodeBlock title="run" code={`npm start        # local polling (bot.js)\nnpm run dev      # nodemon\nnpm run check    # syntax-check all entry points\nnpm test         # node --test`} />
                <div className="rounded-xl border border-amber-400/15 bg-amber-400/5 p-4 text-[11px] leading-relaxed text-amber-100/85">
                  Don't run local polling and the Telegram webhook at the same time. Telegram delivers updates through only one active delivery method.
                </div>
              </>
            )}
            {active === "vercel" && (
              <>
                <div className="overflow-hidden rounded-xl border border-line">
                  <div className="border-b border-white/5 bg-white/[0.03] px-4 py-2 font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Project Settings → Environment Variables</div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-[10.5px]">
                      <tbody className="divide-y divide-white/5">
                        {ENV_VARS.map((v) => (
                          <tr key={v.name}>
                            <td className="px-4 py-2 font-mono text-[10px] text-cyan-200">{v.name}</td>
                            <td className="px-2 py-2"><span className={`rounded px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${LEVEL_BADGE[v.level]}`}>{v.level}</span></td>
                            <td className="px-2 py-2 text-[10px] text-slate-500">{v.purpose}{v.defaultValue ? ` Default: ${v.defaultValue}` : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <CodeBlock title="GET https://<your-vercel-domain>/api/webhook → expected" code={BOT.healthResponse} />
                <p className="text-[11px] leading-relaxed text-slate-500">After any variable change: Deployments → latest deployment menu → <b className="text-slate-300">Redeploy</b>. vercel.json gives api/webhook.js a maxDuration of 300 s.</p>
              </>
            )}
            {active === "webhook" && (
              <>
                <CodeBlock title="PowerShell registration" code={`$token = "YOUR_TELEGRAM_BOT_TOKEN"
$webhookUrl = "https://<your-vercel-domain>/api/webhook"
$secret = "YOUR_WEBHOOK_SECRET"

$body = @{
    url = $webhookUrl
    secret_token = $secret
    allowed_updates = @("message", "callback_query", "inline_query")
    drop_pending_updates = $true
} | ConvertTo-Json

Invoke-RestMethod \`
    -Method Post \`
    -Uri "https://api.telegram.org/bot$token/setWebhook" \`
    -ContentType "application/json" \`
    -Body $body`} />
                <p className="text-[11px] leading-relaxed text-slate-500">The webhook URL must use HTTPS, be publicly reachable, point to <b className="text-slate-300">/api/webhook</b> and return HTTP 200 to valid Telegram requests.</p>
                <button onClick={() => onNavigate("tools")} className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold">
                  <Gauge size={15} /> Build this command with your own values in Tools
                </button>
              </>
            )}
            {active === "verify" && (
              <>
                <CodeBlock title="PowerShell · webhook status" code={`$token = "YOUR_TELEGRAM_BOT_TOKEN"\nInvoke-RestMethod "https://api.telegram.org/bot$token/getWebhookInfo"`} />
                <div className="flex flex-wrap gap-3">
                  <a href={BOT.telegramUrl} target="_blank" rel="noreferrer" className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold">
                    <TelegramIcon size={15} className="text-[#04121f]" /> Open {BOT.handle}
                  </a>
                  <button onClick={() => onNavigate("tools")} className="btn-ghost flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-semibold">
                    <ShieldCheck size={14} /> Auto-verify getWebhookInfo in Tools
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-500">Prompts are limited to 500 characters. Don't send explicit, hateful, abusive or illegal content. The bot should stay public-safe and follow Telegram and Perchance usage policies.</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button disabled={activeIdx === 0} onClick={() => setActive(STEPS[activeIdx - 1].id)}
            className="btn-ghost rounded-xl px-4 py-2.5 text-[11px] font-semibold text-slate-400 disabled:cursor-not-allowed disabled:opacity-30">← previous</button>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.25em] text-slate-700">step {activeIdx + 1} of {STEPS.length}</span>
          <button disabled={activeIdx === STEPS.length - 1} onClick={() => setActive(STEPS[activeIdx + 1].id)}
            className="btn-ghost rounded-xl px-4 py-2.5 text-[11px] font-semibold text-cyan-300 disabled:cursor-not-allowed disabled:opacity-30">next →</button>
        </div>
      </div>
    </div>
  );
}
