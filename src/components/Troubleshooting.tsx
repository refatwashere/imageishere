import { useMemo, useState } from "react";
import { Search, ChevronDown, AlertOctagon, AlertTriangle, Stethoscope, ShieldCheck, Wrench } from "lucide-react";
import { TROUBLESHOOTING } from "../data/content";

export default function Troubleshooting() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string>("403");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TROUBLESHOOTING;
    return TROUBLESHOOTING.filter((t) =>
      [t.id, t.title, t.symptom, ...t.causes, ...t.fix].join(" ").toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      {/* left rail: triage summary */}
      <div className="space-y-5">
        <div className="panel-flat p-5">
          <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400"><Stethoscope size={13} className="text-cyan-400" /> Triage order</h2>
          <ol className="mt-3 space-y-2.5 text-[11.5px] leading-snug text-slate-300">
            {[
              "Start with getWebhookInfo. It shows the registered url, pending_update_count and last_error_message.",
              "Check Vercel Runtime Logs. 403 means a secret mismatch; 404 means the wrong domain or route (it must be /api/webhook).",
              "Verify TELEGRAM_BOT_TOKEN and BROWSERLESS_KEY exist for Production, then redeploy. Variables only apply to new deployments.",
              "If commands work but images don't, check Browserless and Perchance. “using fallback” in the logs means Browserless failed.",
            ].map((t, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-cyan-400/25 bg-cyan-400/10 font-mono text-[9px] font-bold text-cyan-300">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </div>

        <div className="panel-flat p-5">
          <h2 className="flex items-center gap-2 font-display text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-400"><Wrench size={13} className="text-cyan-400" /> The 60-second reset</h2>
          <ol className="mt-3 space-y-1.5 font-mono text-[10px] leading-relaxed text-slate-400">
            <li>1. deleteWebhook?drop_pending_updates=true</li>
            <li>2. Fix the env var / URL that’s actually broken</li>
            <li>3. Redeploy production in Vercel</li>
            <li>4. setWebhook with the same secret_token</li>
            <li>5. getWebhookInfo → pending_update_count: 0</li>
            <li>6. /start in Telegram → the welcome message arrives</li>
          </ol>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[10.5px] text-emerald-200/85">
            <ShieldCheck size={13} className="shrink-0 text-emerald-400" /> This fixes 403s, 404s and stuck pending updates without touching code.
          </div>
        </div>
      </div>

      {/* accordion list */}
      <div className="xl:col-span-2">
        <div className="flex items-center gap-2 rounded-xl border border-line-2 bg-panel px-4 py-2.5 focus-within:border-cyan-400/40">
          <Search size={15} className="shrink-0 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symptoms, causes, fixes…  e.g. “403”"
            aria-label="Search troubleshooting entries"
            className="w-full bg-transparent text-[13px] text-white placeholder-slate-600 outline-none"
          />
          {query && <button onClick={() => setQuery("")} className="font-mono text-[10px] text-slate-500 hover:text-slate-300">clear</button>}
        </div>

        <div className="mt-4 space-y-2.5">
          {filtered.map((t) => {
            const isOpen = open === t.id;
            const critical = t.severity === "critical";
            return (
              <div key={t.id} className={`overflow-hidden rounded-xl border transition ${isOpen ? "border-cyan-400/25 bg-panel-2" : "border-line bg-panel"}`}>
                <button onClick={() => setOpen(isOpen ? "" : t.id)} aria-expanded={isOpen}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  {critical
                    ? <AlertOctagon size={17} className="shrink-0 text-rose-400" />
                    : <AlertTriangle size={17} className="shrink-0 text-amber-400" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-snug text-slate-100">{t.title}</span>
                    <span className="mt-0.5 block truncate font-mono text-[9.5px] text-slate-600">{t.symptom.slice(0, 90)}…</span>
                  </span>
                  <span className={`rounded-md px-2 py-0.5 font-mono text-[8.5px] font-bold uppercase tracking-wider ${critical ? "bg-rose-400/15 text-rose-300" : "bg-amber-400/15 text-amber-300"}`}>{t.severity}</span>
                  <ChevronDown size={16} className={`shrink-0 text-slate-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-white/5 px-4 py-4 text-[11px] leading-relaxed">
                    <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-slate-600">Symptom</div>
                    <p className="mt-1 text-slate-300">{t.symptom}</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-rose-300/80">Likely causes</div>
                        <ul className="mt-1.5 list-none space-y-1.5 text-slate-400">
                          {t.causes.map((c, i) => <li key={i} className="flex items-start gap-1.5"><span className="text-rose-400/70">×</span>{c}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-emerald-300/80">Fix, in order</div>
                        <ul className="mt-1.5 space-y-1.5 text-slate-300">
                          {t.fix.map((f, i) => <li key={i} className="flex items-start gap-1.5"><span className="font-mono text-[9px] text-emerald-400">{i + 1}.</span>{f}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-dashed border-line-2 p-10 text-center">
              <Stethoscope size={22} className="mx-auto text-slate-700" />
              <p className="mt-2 font-mono text-[11px] text-slate-500">Nothing matches “{query}”. Try “403”, “404”, “env”, “Browserless”.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
