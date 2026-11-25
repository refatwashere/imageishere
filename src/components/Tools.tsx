import { useMemo, useState } from "react";
import {
  KeyRound, RefreshCw, Copy, Check, Terminal, FileKey2, Globe, FlaskConical, ShieldCheck, ShieldX, AlertTriangle, Loader2, Radio, Trash2, Info, RotateCw,
} from "lucide-react";
import CodeBlock from "./CodeBlock";
import { BOT, ENV_EXAMPLE, ENV_VARS } from "../data/content";
import { useCopy } from "../lib/clipboard";

const SECRET_RE = /^[A-Za-z0-9_-]{1,256}$/;
const TOKEN_RE = /^\d{6,12}:[A-Za-z0-9_-]{30,}$/;
const PLACEHOLDER_RE = /^(your_|choose_|<|\.\.\.|xxx|changeme)/i;

const genSecret = () => {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
};

const cleanDomain = (d: string) => d.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "<your-vercel-domain>";

/* ================= TOOL 1 · webhook registration studio ================= */
function WebhookStudio({
  domain, setDomain, token, setToken,
}: {
  domain: string; setDomain: (d: string) => void;
  token: string; setToken: (t: string) => void;
}) {
  const [secret, setSecret] = useState(genSecret);
  const [dropPending, setDropPending] = useState(true);
  const [tab, setTab] = useState<"powershell" | "curl" | "node">("powershell");
  const { isCopied, copy } = useCopy(1400);

  const host = cleanDomain(domain);
  const url = `https://${host}${BOT.webhookPath}`;
  const TOKEN = token.trim() || "YOUR_TELEGRAM_BOT_TOKEN";
  const secretOk = SECRET_RE.test(secret);
  const wwwVercel = /^www\.[^.]+\.vercel\.app$/i.test(host);

  const nodePayload = JSON.stringify({
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query", "inline_query"],
    drop_pending_updates: dropPending,
  });

  const outputs = {
    powershell: `$token = "${TOKEN}"
$webhookUrl = "${url}"
$secret = "${secret}"

$body = @{
    url = $webhookUrl
    secret_token = $secret
    allowed_updates = @("message", "callback_query", "inline_query")
    drop_pending_updates = ${dropPending ? "$true" : "$false"}
} | ConvertTo-Json

Invoke-RestMethod \`
    -Method Post \`
    -Uri "https://api.telegram.org/bot$token/setWebhook" \`
    -ContentType "application/json" \`
    -Body $body`,
    curl: `curl -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(
    {
      url,
      secret_token: secret,
      allowed_updates: ["message", "callback_query", "inline_query"],
      drop_pending_updates: dropPending,
    },
    null,
    2
  ).replace(/'/g, "'\\''")}'`,
    node: `node -e ${JSON.stringify(
      `fetch('https://api.telegram.org/bot${TOKEN}/setWebhook',{method:'POST',headers:{'content-type':'application/json'},body:${JSON.stringify(nodePayload)}}).then(r=>r.json()).then(console.log)`
    )}`,
  };

  return (
    <div className="panel-flat flex flex-col p-5 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400"><KeyRound size={13} className="text-cyan-400" /> Webhook registration studio</h2>
        <span className="font-mono text-[9px] text-slate-600">setWebhook · README §Register the Telegram Webhook</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_1fr_1fr]">
        <label className="block">
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">WEBHOOK_SECRET <span className="text-slate-700">(A–Z a–z 0–9 _ -)</span></span>
          <div className={`flex items-center gap-1 rounded-lg border bg-[#080e1c] px-2 py-1.5 ${secretOk ? "border-line-2" : "border-rose-400/50"}`}>
            <input value={secret} onChange={(e) => setSecret(e.target.value)} spellCheck={false} aria-label="Webhook secret"
              className="w-full bg-transparent px-1 font-mono text-[10.5px] text-emerald-300 outline-none" />
            <button onClick={() => void copy(secret, "secret")} className="rounded p-1.5 text-slate-500 hover:text-cyan-300" aria-label="Copy secret">{isCopied("secret") ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}</button>
            <button onClick={() => setSecret(genSecret())} className="rounded p-1.5 text-slate-500 hover:text-cyan-300" aria-label="New secret" title="Generate a new 256-bit secret"><RefreshCw size={13} /></button>
          </div>
          {!secretOk && <span className="mt-1 block font-mono text-[9px] text-rose-400">1–256 chars, only A–Z a–z 0–9 _ -</span>}
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Vercel domain</span>
          <div className="flex items-center gap-2 rounded-lg border border-line-2 bg-panel px-3 py-2.5 focus-within:border-cyan-400/40">
            <Globe size={13} className="shrink-0 text-slate-500" />
            <input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="imageishere.vercel.app" aria-label="Vercel domain"
              className="w-full bg-transparent font-mono text-[11px] text-white outline-none placeholder-slate-700" />
          </div>
          {wwwVercel && <span className="mt-1 block font-mono text-[9px] text-amber-400">www.*.vercel.app has no valid TLS certificate. Use {host.replace(/^www\./, "")}</span>}
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">Bot token <span className="text-slate-700">(shared below)</span></span>
          <input value={token} onChange={(e) => setToken(e.target.value)} type="password" autoComplete="off" placeholder="123456789:AA…" aria-label="Bot token"
            className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2.5 font-mono text-[11px] text-white outline-none placeholder-slate-700 focus:border-cyan-400/40" />
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {(["powershell", "curl", "node"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider transition ${tab === t ? "bg-cyan-400 text-[#04121f]" : "border border-line-2 text-slate-500 hover:text-white"}`}>
            {t === "powershell" ? "PowerShell" : t === "curl" ? "cURL" : "Node"}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-2 font-mono text-[9.5px] text-slate-400">
          <input type="checkbox" checked={dropPending} onChange={(e) => setDropPending(e.target.checked)} className="accent-cyan-400" />
          drop_pending_updates
        </label>
      </div>
      <CodeBlock className="mt-2 flex-1" title={tab === "powershell" ? "register-webhook.ps1" : tab === "curl" ? "register-webhook.sh" : "register-webhook.mjs"} code={outputs[tab]} />
      <p className="mt-2 font-mono text-[9px] leading-relaxed text-slate-600">Use the same secret in Vercel (WEBHOOK_SECRET) and here. Telegram sends it back as the X-Telegram-Bot-Api-Secret-Token header on every update.</p>
    </div>
  );
}

/* ================= TOOL 2 · .env validator ================= */
type EnvCheck = { name: string; level: string; status: "pass" | "warn" | "fail"; note: string };

function EnvValidator() {
  const [raw, setRaw] = useState(ENV_EXAMPLE);

  const checks: EnvCheck[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const line of raw.split("\n")) {
      if (line.trim().startsWith("#")) continue;
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) map.set(m[1], m[2].replace(/^["']|["']$/g, ""));
    }
    return ENV_VARS.map((v): EnvCheck => {
      let val = map.get(v.name);
      let alias = false;
      if (val === undefined && v.name === "WEBHOOK_SECRET" && map.has("TELEGRAM_WEBHOOK_SECRET")) { val = map.get("TELEGRAM_WEBHOOK_SECRET"); alias = true; }
      const base = { name: v.name, level: v.level };
      if (val === undefined || val === "") {
        if (v.level === "required") return { ...base, status: "fail", note: val === "" ? "present but empty" : "missing, required" };
        if (v.level === "recommended") return { ...base, status: "warn", note: "not set, so the webhook accepts updates without a secret check" };
        return { ...base, status: "pass", note: `not set, defaults to ${v.defaultValue}` };
      }
      if (PLACEHOLDER_RE.test(val)) return { ...base, status: v.level === "required" ? "fail" : "warn", note: "still the placeholder from .env.example" };
      if (v.name === "TELEGRAM_BOT_TOKEN" && !TOKEN_RE.test(val)) return { ...base, status: "fail", note: "doesn't look like <bot_id>:<secret> from BotFather" };
      if (v.name === "WEBHOOK_SECRET") {
        if (!SECRET_RE.test(val)) return { ...base, status: "fail", note: "Telegram only allows A–Z a–z 0–9 _ - (1–256 chars)" };
        if (val.length < 32) return { ...base, status: "warn", note: `only ${val.length} chars. Use the 64-char generator` };
        return { ...base, status: "pass", note: alias ? "set via TELEGRAM_WEBHOOK_SECRET alias" : `${val.length} chars, Telegram-safe` };
      }
      if ((v.name === "BROWSERLESS_URL" || v.name === "PERCHANCE_URL") && !/^https:\/\/[^\s]+$/.test(val)) return { ...base, status: "fail", note: "must be an https:// URL" };
      return { ...base, status: "pass", note: v.defaultValue && val.replace(/\/$/, "") === v.defaultValue ? "set to the default" : "set" };
    });
  }, [raw]);

  const count = (s: EnvCheck["status"]) => checks.filter((c) => c.status === s).length;

  return (
    <div className="panel-flat p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400"><FileKey2 size={13} className="text-cyan-400" /> .env validator</h2>
        <div className="flex items-center gap-2 font-mono text-[9px]">
          <span className="text-emerald-400">{count("pass")} ok</span><span className="text-amber-400">{count("warn")} warn</span><span className="text-rose-400">{count("fail")} fail</span>
        </div>
      </div>
      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} rows={5} aria-label="Paste your .env contents"
        className="mt-3 w-full resize-none rounded-xl border border-line-2 bg-[#080e1c] p-3 font-mono text-[10px] leading-relaxed text-slate-300 outline-none transition focus:border-cyan-400/40" />
      <ul className="mt-3 space-y-1.5">
        {checks.map((c) => (
          <li key={c.name} className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5">
            {c.status === "pass" && <ShieldCheck size={13} className="shrink-0 text-emerald-400" />}
            {c.status === "warn" && <AlertTriangle size={13} className="shrink-0 text-amber-400" />}
            {c.status === "fail" && <ShieldX size={13} className="shrink-0 text-rose-400" />}
            <code className="w-40 shrink-0 truncate font-mono text-[9.5px] text-slate-300">{c.name}</code>
            <span className="min-w-0 flex-1 truncate text-[9.5px] text-slate-500" title={c.note}>{c.note}</span>
            <span className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[7.5px] font-bold uppercase ${c.level === "required" ? "bg-rose-400/10 text-rose-300/80" : c.level === "recommended" ? "bg-amber-400/10 text-amber-300/80" : "bg-white/5 text-slate-500"}`}>{c.level.slice(0, 3)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 flex items-start gap-1.5 font-mono text-[8.5px] leading-relaxed text-slate-600"><Info size={10} className="mt-0.5 shrink-0" />Runs entirely in your browser. Nothing you paste leaves this page.</p>
    </div>
  );
}

/* ================= TOOL 3 · live Bot API inspector ================= */
type Verdict = { label: string; status: "pass" | "warn" | "fail"; detail: string };
type WebhookInfo = {
  url?: string;
  has_custom_certificate?: boolean;
  pending_update_count?: number;
  last_error_message?: string;
  last_error_date?: number;
  allowed_updates?: string[];
};

function verifyWebhookInfo(info: WebhookInfo | undefined, expectedUrl: string): Verdict[] {
  const allowed = info?.allowed_updates;
  const required = ["message", "callback_query", "inline_query"];
  return [
    { label: "url matches the Vercel route", status: info?.url === expectedUrl ? "pass" : "fail", detail: info?.url ? info.url : "no webhook set" },
    { label: "has_custom_certificate is false", status: info?.has_custom_certificate === false ? "pass" : "warn", detail: String(info?.has_custom_certificate) },
    { label: "pending_update_count is 0 or decreasing", status: (info?.pending_update_count ?? 0) === 0 ? "pass" : "warn", detail: `${info?.pending_update_count ?? 0} pending` },
    { label: "last_error_message is empty", status: info?.last_error_message ? "fail" : "pass", detail: info?.last_error_message ? `${info.last_error_message}${info.last_error_date ? ` (${new Date(info.last_error_date * 1000).toLocaleString()})` : ""}` : "no errors" },
    { label: "allowed_updates has message, callback_query, inline_query", status: allowed ? (required.every((r) => allowed.includes(r)) ? "pass" : "fail") : "warn", detail: allowed ? allowed.join(", ") : "not reported (Telegram default set)" },
  ];
}

function TelegramInspector({ domain, token, setToken }: { domain: string; token: string; setToken: (t: string) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; body: string; label: string; verdicts?: Verdict[] } | null>(null);
  const expectedUrl = `https://${cleanDomain(domain)}${BOT.webhookPath}`;

  const call = async (method: string, extra?: Record<string, unknown>, destructive = false) => {
    const t = token.trim();
    if (!TOKEN_RE.test(t)) {
      setResult({ ok: false, label: method, body: "That doesn't look like a BotFather token (<bot_id>:<secret>)." });
      return;
    }
    if (destructive && !window.confirm("deleteWebhook with drop_pending_updates=true removes the webhook AND discards all queued updates. The bot will stop answering until you register it again. Continue?")) return;
    setBusy(method);
    try {
      const res = await fetch(`https://api.telegram.org/bot${t}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: extra ? JSON.stringify(extra) : undefined,
      });
      const json = await res.json();
      setResult({
        ok: !!json.ok,
        label: method,
        body: JSON.stringify(json, null, 2),
        verdicts: method === "getWebhookInfo" && json.ok ? verifyWebhookInfo(json.result as WebhookInfo, expectedUrl) : undefined,
      });
    } catch (e) {
      setResult({ ok: false, label: method, body: `Network error: ${(e as Error).message}` });
    } finally {
      setBusy(null);
    }
  };

  const btn = "flex items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 font-mono text-[10px] font-semibold text-cyan-300 transition hover:bg-cyan-400/15 disabled:opacity-40";

  return (
    <div className="panel-flat p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400"><FlaskConical size={13} className="text-cyan-400" /> Live Bot API inspector</h2>
        <span className="flex items-center gap-1.5 font-mono text-[8.5px] text-emerald-400"><Radio size={9} /> api.telegram.org</span>
      </div>
      <label className="mt-3 block">
        <span className="mb-1 flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500">
          <span>Bot token, used only for direct browser → Telegram calls</span>
          {token && <button type="button" onClick={() => { setToken(""); setResult(null); }} className="text-slate-500 hover:text-rose-300">clear</button>}
        </span>
        <input value={token} onChange={(e) => setToken(e.target.value)} type="password" autoComplete="off" placeholder="123456789:AA…" aria-label="Telegram bot token"
          className="w-full rounded-lg border border-line-2 bg-panel px-3 py-2.5 font-mono text-[11px] text-white outline-none placeholder-slate-700 focus:border-cyan-400/40" />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {["getWebhookInfo", "getMe", "getMyCommands"].map((m) => (
          <button key={m} className={btn} disabled={!!busy} onClick={() => call(m)}>{busy === m && <Loader2 size={12} className="animate-spin" />}{m}</button>
        ))}
        <button className="flex items-center gap-1.5 rounded-lg border border-rose-400/25 bg-rose-400/10 px-3 py-2 font-mono text-[10px] font-semibold text-rose-300 transition hover:bg-rose-400/15 disabled:opacity-40"
          disabled={!!busy} onClick={() => call("deleteWebhook", { drop_pending_updates: true }, true)}>
          {busy === "deleteWebhook" ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}deleteWebhook
        </button>
      </div>

      {result?.verdicts && (
        <ul className="mt-3 space-y-1.5">
          {result.verdicts.map((v) => (
            <li key={v.label} className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5">
              {v.status === "pass" ? <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-400" /> : v.status === "warn" ? <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-400" /> : <ShieldX size={13} className="mt-0.5 shrink-0 text-rose-400" />}
              <span className="min-w-0">
                <span className="block text-[10.5px] text-slate-200">{v.label}</span>
                <span className="block break-all font-mono text-[9px] text-slate-500">{v.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {result ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-line bg-[#080e1c]">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-1.5">
            <span className="font-mono text-[9.5px] text-slate-500">bot API → <span className="text-slate-300">{result.label}</span></span>
            <span className={`rounded px-2 py-0.5 font-mono text-[8.5px] font-bold ${result.ok ? "bg-emerald-400/15 text-emerald-300" : "bg-rose-400/15 text-rose-300"}`}>{result.ok ? "OK" : "ERROR"}</span>
          </div>
          <pre className="max-h-52 overflow-auto p-3 font-mono text-[9.5px] leading-relaxed text-slate-300">{result.body}</pre>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-line-2 p-4 text-center text-[10px] leading-relaxed text-slate-600">
          Paste your token and run <b className="text-slate-400">getWebhookInfo</b> to check the README's verification checklist automatically.<br />
          Calls go straight from your browser to Telegram. Nothing is proxied or stored.
        </div>
      )}
    </div>
  );
}

/* ================= PAGE ================= */
export default function Tools() {
  const [domain, setDomain] = useState(BOT.webDisplay);
  const [token, setToken] = useState("");
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <WebhookStudio domain={domain} setDomain={setDomain} token={token} setToken={setToken} />
      <TelegramInspector domain={domain} token={token} setToken={setToken} />
      <EnvValidator />
      <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-panel to-panel p-5 lg:col-span-2">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-300/90"><Terminal size={13} /> Cheat sheet</h2>
            <ul className="mt-3 space-y-2 font-mono text-[10px] leading-relaxed text-slate-400">
              <li><span className="text-violet-300">npm start</span>: local polling via bot.js</li>
              <li><span className="text-violet-300">npm run check</span>: node --check on every entry point</li>
              <li><span className="text-violet-300">npm test</span>: node --test (test/webhook.test.js)</li>
              <li><span className="text-violet-300">npm audit --omit=dev</span>: production dependency audit</li>
              <li><span className="text-violet-300">npm run vercel:dev</span>: run the function locally with vercel dev</li>
              <li><span className="text-violet-300">deleteWebhook {`{"drop_pending_updates":true}`}</span>: switch back to polling</li>
            </ul>
          </div>
          <div>
            <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-violet-300/90"><RotateCw size={13} /> Rotation procedures</h2>
            <div className="mt-3 space-y-2.5 text-[10.5px] leading-relaxed text-violet-100/75">
              <p><b className="text-violet-200">Bot token:</b> revoke in @BotFather → update TELEGRAM_BOT_TOKEN in Vercel → redeploy → register the webhook again if required → send /start.</p>
              <p><b className="text-violet-200">Webhook secret:</b> generate a new secret → update WEBHOOK_SECRET → redeploy → register the webhook again with the same new secret → getWebhookInfo + /start.</p>
              <p><b className="text-violet-200">Browserless key:</b> create a new key → update BROWSERLESS_KEY → redeploy → generate one test image → revoke the old key.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
