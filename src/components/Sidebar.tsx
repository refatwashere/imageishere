import {
  LayoutDashboard, MessagesSquare, Rocket, Activity, TerminalSquare, LifeBuoy, Wrench, FolderGit2, Radio, X, RefreshCw,
} from "lucide-react";
import { BOT } from "../data/content";
import { checkWebhook, healthLabel, timeAgo, useRepo, useWebhookHealth } from "../lib/live";
import { GitHubIcon, STATE_STYLE, StateDot, TelegramIcon, Wordmark, type IconComponent } from "./Brand";

export type ViewKey = "overview" | "simulator" | "runbook" | "status" | "commands" | "troubleshooting" | "tools" | "structure";

export const NAV: { key: ViewKey; label: string; icon: IconComponent; hint: string }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard, hint: "What imageishere is" },
  { key: "simulator", label: "Live Simulator", icon: MessagesSquare, hint: "Talk to the bot" },
  { key: "runbook", label: "Deploy Runbook", icon: Rocket, hint: "README, step by step" },
  { key: "status", label: "Live Status", icon: Activity, hint: "Real health checks" },
  { key: "commands", label: "Commands", icon: TerminalSquare, hint: "Every reply, verbatim" },
  { key: "troubleshooting", label: "Troubleshooting", icon: LifeBuoy, hint: "403 · 404 · timeouts" },
  { key: "tools", label: "Operator Tools", icon: Wrench, hint: "Secrets · webhook · .env" },
  { key: "structure", label: "Project Structure", icon: FolderGit2, hint: "Browse the source" },
];

export default function Sidebar({
  view, onNavigate, open, onClose,
}: {
  view: ViewKey;
  onNavigate: (v: ViewKey) => void;
  open: boolean;
  onClose: () => void;
}) {
  const health = useWebhookHealth();
  const { version } = useRepo();
  const st = STATE_STYLE[health.state];

  return (
    <>
      {/* mobile scrim */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[268px] flex-col border-r border-line bg-[#0a1120]/95 backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:static lg:z-auto lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* brand */}
        <div className="flex items-center gap-3 border-b border-line px-5 pb-5 pt-5">
          <div className="relative shrink-0">
            <img src="/images/mascot.jpg" alt="imageishere bot avatar" className="h-11 w-11 rounded-2xl border border-cyan-400/25 object-cover shadow-[0_0_24px_rgba(42,171,238,0.35)]" />
            <span className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#0a1120] ${health.state === "down" ? "bg-rose-400" : "bg-emerald-400"}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Wordmark className="text-[17px] text-white" />
              <span className="rounded-md border border-cyan-400/25 bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[9px] font-medium text-cyan-300">v{version ?? BOT.version}</span>
            </div>
            <a href={BOT.telegramUrl} target="_blank" rel="noreferrer" className="block truncate font-mono text-[10px] text-slate-500 transition hover:text-cyan-300">{BOT.handle}</a>
          </div>
          <button onClick={onClose} className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white lg:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="px-3 pb-2 text-[9.5px] font-semibold uppercase tracking-[0.22em] text-slate-600">Console</div>
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = view === item.key;
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <button
                    onClick={() => { onNavigate(item.key); onClose(); }}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                      active ? "text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-0 rounded-xl border border-cyan-400/20 bg-gradient-to-r from-cyan-400/[0.14] via-cyan-400/[0.06] to-transparent" />
                    )}
                    {active && <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-cyan-300 to-sky-600 shadow-[0_0_12px_rgba(42,171,238,0.8)]" />}
                    <Icon size={17} strokeWidth={2} className={`relative shrink-0 transition-colors ${active ? "text-cyan-300" : "text-slate-500 group-hover:text-cyan-200"}`} />
                    <span className="relative min-w-0">
                      <span className="block text-[13px] font-medium leading-tight">{item.label}</span>
                      <span className={`block text-[9.5px] leading-tight ${active ? "text-cyan-200/60" : "text-slate-600"}`}>{item.hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* footer: live webhook card + links */}
        <div className="space-y-3 border-t border-line px-4 py-4">
          <div className={`rounded-xl border p-3 ${st.ring} ${st.bg}`}>
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${st.text}`}>
                <Radio size={11} /> Webhook
              </div>
              <span className={`flex items-center gap-1.5 font-mono text-[9px] uppercase ${st.text}`}>
                <StateDot state={health.state} />{healthLabel(health.state)}
              </span>
            </div>
            <div className="mt-2 truncate font-mono text-[10px] text-slate-400">{BOT.webDisplay}{BOT.webhookPath}</div>
            <div className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[9px] text-slate-600">
              <span>{health.latency != null ? `${health.latency} ms` : "—"} · {health.checkedAt ? timeAgo(health.checkedAt) : "not checked yet"}</span>
              <button onClick={() => void checkWebhook()} aria-label="Re-check webhook" title="Re-check now" className="rounded p-0.5 text-slate-500 transition hover:text-cyan-300">
                <RefreshCw size={11} className={health.state === "checking" ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <a href={BOT.telegramUrl} target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#3fbdf5] to-[#229ed9] px-3 py-2.5 text-[12px] font-bold text-[#04121f] shadow-[0_8px_24px_rgba(42,171,238,0.3)] transition hover:brightness-110">
            <TelegramIcon size={15} className="text-[#04121f]" /> Open {BOT.handle}
          </a>

          <a href={BOT.githubProfile} target="_blank" rel="noreferrer" className="group flex items-center gap-2.5 rounded-xl px-1 py-1 transition">
            <img src={BOT.avatar} alt={BOT.developer} className="h-8 w-8 rounded-full border border-white/10 object-cover" loading="lazy" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-slate-300 group-hover:text-white">{BOT.developer}</span>
              <span className="flex items-center gap-1 font-mono text-[9px] text-slate-600 group-hover:text-cyan-300"><GitHubIcon size={10} /> @{BOT.githubUser}</span>
            </span>
          </a>
        </div>
      </aside>
    </>
  );
}
