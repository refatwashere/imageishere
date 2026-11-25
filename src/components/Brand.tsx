import type { ComponentType } from "react";
import type { ProbeState } from "../lib/live";

export type IconComponent = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

/** "imageishere" wordmark — one word, with a subtle accent on "is" for readability */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`} aria-label="imageishere">
      image<span className="text-cyan-300">is</span>here
    </span>
  );
}

export function TelegramIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      <path
        fill="#fff"
        d="M5.4 11.8l11.6-4.5c.54-.2 1.01.13.83.95l-1.97 9.3c-.15.66-.54.82-1.09.51l-3-2.21-1.45 1.4c-.16.16-.3.3-.6.3l.21-3.05 5.56-5.02c.24-.21-.05-.33-.38-.12l-6.87 4.33-2.96-.92c-.64-.2-.66-.64.13-.96z"
      />
    </svg>
  );
}

export function GitHubIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1-.02-1.96-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

export const STATE_STYLE: Record<ProbeState, { dot: string; text: string; ring: string; bg: string }> = {
  idle: { dot: "bg-slate-500", text: "text-slate-400", ring: "border-slate-500/20", bg: "bg-slate-500/5" },
  checking: { dot: "bg-sky-400 animate-pulse", text: "text-sky-300", ring: "border-sky-400/20", bg: "bg-sky-400/5" },
  ok: { dot: "bg-emerald-400 pulse-dot", text: "text-emerald-300", ring: "border-emerald-400/20", bg: "bg-emerald-400/[0.06]" },
  reachable: { dot: "bg-teal-300", text: "text-teal-200", ring: "border-teal-300/20", bg: "bg-teal-300/[0.06]" },
  down: { dot: "bg-rose-400", text: "text-rose-300", ring: "border-rose-400/25", bg: "bg-rose-400/[0.06]" },
};

export function StateDot({ state, className = "" }: { state: ProbeState; className?: string }) {
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${STATE_STYLE[state].dot} ${className}`} />;
}

/** tiny latency sparkline from real samples */
export function Sparkline({ values, className = "" }: { values: number[]; className?: string }) {
  if (values.length < 2) {
    return <div className={`flex items-center font-mono text-[8px] text-slate-700 ${className}`}>collecting samples…</div>;
  }
  const W = 100, H = 24;
  const max = Math.max(...values) * 1.15 || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - (v / max) * H}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
