import { useEffect, useMemo, useState } from "react";
import { Menu, Search, ChevronRight, LayoutDashboard, ArrowRight, Command as CommandIcon, X, Globe, ExternalLink, TerminalSquare, LifeBuoy } from "lucide-react";
import Sidebar, { NAV, type ViewKey } from "./components/Sidebar";
import Overview from "./components/Overview";
import Simulator from "./components/Simulator";
import Runbook from "./components/Runbook";
import Status from "./components/Status";
import Commands from "./components/Commands";
import Troubleshooting from "./components/Troubleshooting";
import Tools from "./components/Tools";
import FileTree from "./components/FileTree";
import { GitHubIcon, STATE_STYLE, StateDot, TelegramIcon, type IconComponent } from "./components/Brand";
import { BOT, BOT_COMMANDS, TROUBLESHOOTING } from "./data/content";
import { healthLabel, useRepo, useWebhookHealth } from "./lib/live";

const CRUMB: Record<ViewKey, string> = {
  overview: "overview",
  simulator: "live-simulator",
  runbook: "deploy-runbook",
  status: "live-status",
  commands: "commands",
  troubleshooting: "troubleshooting",
  tools: "operator-tools",
  structure: "project-structure",
};

type PaletteAction = { label: string; hint: string; keywords?: string; icon: IconComponent; view?: ViewKey; href?: string };

const PALETTE_ACTIONS: PaletteAction[] = [
  ...NAV.map((n) => ({ label: `Go to ${n.label}`, hint: n.hint, view: n.key, icon: n.icon })),
  { label: `Open ${BOT.handle} in Telegram`, hint: BOT.telegramDisplay, href: BOT.telegramUrl, icon: TelegramIcon },
  { label: "Open the GitHub repository", hint: BOT.repoDisplay, href: BOT.repoUrl, icon: GitHubIcon },
  { label: "Open the website", hint: BOT.webDisplay, href: BOT.webUrl, icon: Globe },
  ...BOT_COMMANDS.map((c) => ({
    label: `Command ${c.cmd}`,
    hint: c.menu,
    keywords: `${c.behavior} ${c.category}`,
    view: "commands" as ViewKey,
    icon: TerminalSquare,
  })),
  ...TROUBLESHOOTING.map((t) => ({
    label: `Fix: ${t.title}`,
    hint: t.symptom,
    keywords: `${t.id} ${t.causes.join(" ")}`,
    view: "troubleshooting" as ViewKey,
    icon: LifeBuoy,
  })),
];

const isViewKey = (v: string): v is ViewKey => NAV.some((n) => n.key === v);

export default function App() {
  const [view, setView] = useState<ViewKey>(() => {
    const h = typeof location !== "undefined" ? location.hash.replace("#", "") : "";
    return isViewKey(h) ? h : "overview";
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const health = useWebhookHealth();
  const { version } = useRepo();

  /* deep-linkable views (#simulator, #status, …) */
  useEffect(() => {
    if (location.hash.replace("#", "") !== view) history.replaceState(null, "", `#${view}`);
  }, [view]);
  useEffect(() => {
    const onHash = () => {
      const h = location.hash.replace("#", "");
      if (isViewKey(h)) setView(h);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  /* ⌘K / Ctrl+K + global Escape when palette is open */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        setPaletteQuery("");
        setPaletteIndex(0);
      } else if (e.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen]);

  const paletteResults = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return PALETTE_ACTIONS.slice(0, NAV.length + 3);
    return PALETTE_ACTIONS.filter((a) => `${a.label} ${a.hint} ${a.keywords ?? ""}`.toLowerCase().includes(q));
  }, [paletteQuery]);
  useEffect(() => setPaletteIndex(0), [paletteQuery]);

  const runPaletteAction = (a: PaletteAction) => {
    if (a.view) setView(a.view);
    if (a.href) window.open(a.href, "_blank", "noopener,noreferrer");
    setPaletteOpen(false);
  };

  const Icon = NAV.find((n) => n.key === view)?.icon ?? LayoutDashboard;
  const st = STATE_STYLE[health.state];

  return (
    <div className="ambient bg-blueprint flex h-screen overflow-hidden bg-abyss text-ink">
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />

      <Sidebar view={view} onNavigate={setView} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-[#0a1120]/80 px-4 backdrop-blur sm:px-5">
          <button onClick={() => setSidebarOpen(true)} aria-label="Open navigation" className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden">
            <Menu size={18} />
          </button>
          <nav className="flex min-w-0 items-center gap-1.5 font-mono text-[10.5px] text-slate-500" aria-label="Breadcrumb">
            <span className="hidden text-slate-600 sm:inline">imageishere</span>
            <ChevronRight size={11} className="hidden text-slate-700 sm:inline" />
            <Icon size={12} className="text-cyan-400" />
            <span className="truncate text-slate-300">{CRUMB[view]}</span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setView("status")} title="Live webhook status"
              className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] transition hover:brightness-125 md:flex ${st.ring} ${st.bg} ${st.text}`}>
              <StateDot state={health.state} /> {healthLabel(health.state)}
              {health.latency != null && <span className="font-normal normal-case tracking-normal text-slate-500">· {health.latency}ms</span>}
            </button>
            <button onClick={() => { setPaletteOpen(true); setPaletteQuery(""); setPaletteIndex(0); }} aria-label="Open command palette"
              className="group flex items-center gap-2 rounded-lg border border-line-2 bg-panel px-2.5 py-1.5 font-mono text-[10px] text-slate-500 transition hover:border-cyan-400/40 hover:text-cyan-300">
              <Search size={12} />
              <span className="hidden sm:inline">Jump to…</span>
              <kbd className="hidden items-center gap-0.5 rounded border border-white/10 bg-black/40 px-1.5 py-0.5 text-[9px] text-slate-400 group-hover:text-cyan-300 sm:flex">Ctrl K</kbd>
            </button>
            <a href={BOT.telegramUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-b from-[#3fbdf5] to-[#229ed9] px-3 py-1.5 text-[11px] font-bold text-[#04121f] shadow-[0_4px_14px_rgba(42,171,238,0.35)] transition hover:brightness-110">
              <TelegramIcon size={13} className="text-[#04121f]" /> <span className="hidden sm:inline">Open bot</span>
            </a>
          </div>
        </header>

        {/* views — the simulator stays mounted so chats & renders survive navigation */}
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 lg:p-6">
          <div className={view === "simulator" ? "fade-up h-full" : "hidden"}>
            <Simulator active={view === "simulator"} />
          </div>
          {view !== "simulator" && (
            <div key={view} className="fade-up h-full">
              {view === "overview" && <Overview onNavigate={setView} />}
              {view === "runbook" && <Runbook onNavigate={setView} />}
              {view === "status" && <Status />}
              {view === "commands" && <Commands />}
              {view === "troubleshooting" && <Troubleshooting />}
              {view === "tools" && <Tools />}
              {view === "structure" && <FileTree />}
            </div>
          )}
        </main>

        {/* status bar */}
        <footer className="flex h-7 shrink-0 items-center gap-4 border-t border-line bg-[#080d19] px-4 font-mono text-[8.5px] uppercase tracking-[0.18em] text-slate-600">
          <a href={BOT.telegramUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-slate-500 hover:text-cyan-300">
            <TelegramIcon size={9} className="text-[#2aabee]" /> {BOT.handle}
          </a>
          <span className="hidden sm:inline">v{version ?? BOT.version}</span>
          <a href={BOT.webUrl} target="_blank" rel="noreferrer" className="hidden normal-case tracking-normal hover:text-cyan-300 md:inline">{BOT.webDisplay}</a>
          <span className="ml-auto flex items-center gap-1.5"><StateDot state={health.state} /> webhook {healthLabel(health.state)}</span>
          <a href={BOT.githubProfile} target="_blank" rel="noreferrer" className="hidden items-center gap-1 normal-case tracking-normal hover:text-cyan-300 lg:flex">
            © {new Date().getFullYear()} {BOT.developer} <ExternalLink size={8} />
          </a>
        </footer>
      </div>

      {/* command palette */}
      {paletteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[16vh] backdrop-blur-sm" onClick={() => setPaletteOpen(false)} role="dialog" aria-modal="true" aria-label="Command palette">
          <div className="w-[min(560px,92vw)] overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#0d1526] shadow-[0_40px_120px_rgba(0,0,0,0.6)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
              <CommandIcon size={16} className="text-cyan-400" />
              <input autoFocus value={paletteQuery} onChange={(e) => setPaletteQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIndex((i) => Math.min(paletteResults.length - 1, i + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setPaletteIndex((i) => Math.max(0, i - 1)); }
                  if (e.key === "Enter" && paletteResults[paletteIndex]) runPaletteAction(paletteResults[paletteIndex]);
                }}
                placeholder="Jump to page, /command, or error (e.g. 403)…" aria-label="Command palette input"
                className="w-full bg-transparent text-[14px] text-white placeholder-slate-600 outline-none" />
              <button onClick={() => setPaletteOpen(false)} aria-label="Close palette" className="text-slate-600 hover:text-slate-300"><X size={16} /></button>
            </div>
            <ul className="max-h-80 overflow-y-auto p-2">
              {paletteResults.map((a, i) => (
                <li key={a.label}>
                  <button onMouseEnter={() => setPaletteIndex(i)} onClick={() => runPaletteAction(a)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${i === paletteIndex ? "bg-cyan-400/10" : ""}`}>
                    <a.icon size={16} className={i === paletteIndex ? "text-cyan-300" : "text-slate-500"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-slate-100">{a.label}</span>
                      <span className="block truncate font-mono text-[9px] text-slate-600">{a.hint}</span>
                    </span>
                    {a.href ? <ExternalLink size={13} className="shrink-0 text-slate-600" /> : i === paletteIndex && <ArrowRight size={14} className="shrink-0 text-cyan-400" />}
                  </button>
                </li>
              ))}
              {paletteResults.length === 0 && <li className="px-4 py-6 text-center font-mono text-[10.5px] text-slate-600">no matches for “{paletteQuery}”</li>}
            </ul>
            <div className="flex items-center gap-3 border-t border-white/5 px-4 py-2 font-mono text-[8.5px] uppercase tracking-wider text-slate-700">
              <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span><span className="ml-auto">⌘K / Ctrl+K</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
