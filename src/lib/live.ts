/* ------------------------------------------------------------------ */
/*  Live data: webhook health, service probes and GitHub repo feed.    */
/*  Nothing here is simulated — every value comes from a real request. */
/* ------------------------------------------------------------------ */

import { useEffect, useState, useSyncExternalStore } from "react";
import { BOT } from "../data/content";

export type ProbeState = "idle" | "checking" | "ok" | "reachable" | "down";

export type ProbeResult = {
  state: ProbeState;
  latency: number | null;
  http?: number;
  detail?: string;
  body?: unknown;
  checkedAt: number | null;
};

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/* =================== generic probes =================== */

/** CORS-readable request → real status code + optional JSON body */
export async function probeCors(url: string, opts: { expectStatus?: number[]; parse?: boolean; timeoutMs?: number } = {}): Promise<ProbeResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
  const t0 = now();
  try {
    const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    const latency = Math.round(now() - t0);
    let body: unknown;
    if (opts.parse) body = await res.json().catch(() => undefined);
    const expected = opts.expectStatus ?? [200];
    return { state: expected.includes(res.status) ? "ok" : "down", latency, http: res.status, body, checkedAt: Date.now() };
  } catch {
    return { state: "down", latency: null, detail: ctrl.signal.aborted ? "timed out" : "blocked or unreachable", checkedAt: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}

/** opaque request → proves the host answered, but the browser hides status/body */
export async function probeNoCors(url: string, timeoutMs = 15000): Promise<ProbeResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = now();
  try {
    await fetch(url, { mode: "no-cors", cache: "no-store", signal: ctrl.signal });
    return { state: "reachable", latency: Math.round(now() - t0), detail: "opaque response", checkedAt: Date.now() };
  } catch {
    return { state: "down", latency: null, detail: ctrl.signal.aborted ? "timed out" : "unreachable", checkedAt: Date.now() };
  } finally {
    clearTimeout(timer);
  }
}

/* =================== webhook health store (shared app-wide) =================== */

export type HealthSnapshot = ProbeResult & {
  mode: "same-origin" | "cors" | "no-cors" | null;
  history: number[];
};

let health: HealthSnapshot = { state: "idle", latency: null, checkedAt: null, mode: null, history: [] };
const listeners = new Set<() => void>();
let corsBlocked = false;
let inflight: Promise<void> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

const emit = (next: Partial<HealthSnapshot>) => {
  health = { ...health, ...next };
  listeners.forEach((l) => l());
};

export function isSameOrigin(): boolean {
  try {
    return typeof location !== "undefined" && location.hostname === new URL(BOT.webUrl).hostname;
  } catch {
    return false;
  }
}

export function checkWebhook(): Promise<void> {
  if (inflight) return inflight;
  emit({ state: "checking" });
  inflight = (async () => {
    const same = isSameOrigin();
    if (same || !corsBlocked) {
      const r = await probeCors(same ? BOT.webhookPath : BOT.webhookUrl, { parse: true });
      const healthy = r.http === 200 && (r.body as { status?: string } | undefined)?.status === "ok";
      if (r.http !== undefined) {
        emit({ ...r, state: healthy ? "ok" : "down", mode: same ? "same-origin" : "cors", history: r.latency != null ? [...health.history, r.latency].slice(-30) : health.history });
        return;
      }
      if (same) {
        emit({ ...r, mode: "same-origin" });
        return;
      }
      corsBlocked = true; // the route doesn't send CORS headers → use an opaque probe from now on
    }
    const r = await probeNoCors(BOT.webhookUrl);
    emit({ ...r, http: undefined, body: undefined, mode: "no-cors", history: r.latency != null ? [...health.history, r.latency].slice(-30) : health.history });
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    if (health.state === "idle") setTimeout(() => void checkWebhook(), 0);
    pollTimer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") void checkWebhook();
    }, 120_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}

export function useWebhookHealth(): HealthSnapshot {
  return useSyncExternalStore(subscribe, () => health, () => health);
}

export const healthLabel = (s: ProbeState) =>
  ({ idle: "pending", checking: "checking…", ok: "operational", reachable: "reachable", down: "unreachable" })[s];

/* =================== GitHub repository feed =================== */

export type RepoInfo = {
  stars: number;
  forks: number;
  issues: number;
  watchers: number;
  language?: string;
  license?: string;
  defaultBranch: string;
  pushedAt: string;
  createdAt: string;
  description?: string;
  homepage?: string;
};

export type CommitInfo = { sha: string; message: string; date: string; author: string; url: string };

export type RepoData = {
  repo: RepoInfo | null;
  commits: CommitInfo[];
  version: string | null;
  scripts: Record<string, string> | null;
  dependencies: Record<string, string> | null;
  loading: boolean;
  error: string | null;
  fetchedAt: number | null;
};

type GitHubCommitResponse = {
  sha: string;
  html_url: string;
  commit?: {
    message?: string;
    author?: { date?: string; name?: string };
    committer?: { date?: string };
  };
  author?: { login?: string } | null;
};

const REPO_CACHE_KEY = "imageishere.repo.v1";
const REPO_TTL = 10 * 60 * 1000;
let repoPromise: Promise<RepoData> | null = null;

async function loadRepo(): Promise<RepoData> {
  try {
    const cached = sessionStorage.getItem(REPO_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as RepoData;
      if (parsed.fetchedAt && Date.now() - parsed.fetchedAt < REPO_TTL) return parsed;
    }
  } catch {
    /* ignore cache errors */
  }

  const api = `https://api.github.com/repos/${BOT.repoSlug}`;
  const [repoRes, commitsRes, pkgRes] = await Promise.allSettled([
    fetch(api).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`GitHub API ${r.status}`)))),
    fetch(`${api}/commits?per_page=8`).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`GitHub API ${r.status}`)))),
    fetch(`${BOT.rawBase}/package.json`, { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`raw ${r.status}`)))),
  ]);

  const data: RepoData = { repo: null, commits: [], version: null, scripts: null, dependencies: null, loading: false, error: null, fetchedAt: Date.now() };

  if (repoRes.status === "fulfilled") {
    const r = repoRes.value;
    data.repo = {
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      issues: r.open_issues_count ?? 0,
      watchers: r.subscribers_count ?? r.watchers_count ?? 0,
      language: r.language ?? undefined,
      license: r.license?.spdx_id ?? undefined,
      defaultBranch: r.default_branch ?? "main",
      pushedAt: r.pushed_at,
      createdAt: r.created_at,
      description: r.description ?? undefined,
      homepage: r.homepage ?? undefined,
    };
  }
  if (commitsRes.status === "fulfilled" && Array.isArray(commitsRes.value)) {
    data.commits = (commitsRes.value as GitHubCommitResponse[]).map((c) => ({
      sha: String(c.sha).slice(0, 7),
      message: String(c.commit?.message ?? "").split("\n")[0],
      date: c.commit?.author?.date ?? c.commit?.committer?.date ?? "",
      author: c.author?.login ?? c.commit?.author?.name ?? "unknown",
      url: c.html_url,
    }));
  }
  if (pkgRes.status === "fulfilled") {
    data.version = pkgRes.value?.version ?? null;
    data.scripts = pkgRes.value?.scripts ?? null;
    data.dependencies = pkgRes.value?.dependencies ?? null;
  }

  const failures = [repoRes, commitsRes, pkgRes].filter((r) => r.status === "rejected");
  if (failures.length === 3) data.error = "GitHub is unreachable or rate-limited. Showing built-in project facts.";
  else if (failures.length) data.error = "Some repository data could not be loaded (GitHub API limits anonymous requests to 60 per hour).";

  if (failures.length < 3) {
    try {
      sessionStorage.setItem(REPO_CACHE_KEY, JSON.stringify(data));
    } catch {
      /* storage full / private mode */
    }
  }
  return data;
}

const EMPTY_REPO: RepoData = { repo: null, commits: [], version: null, scripts: null, dependencies: null, loading: true, error: null, fetchedAt: null };

export function useRepo(): RepoData {
  const [data, setData] = useState<RepoData>(EMPTY_REPO);
  useEffect(() => {
    let alive = true;
    if (!repoPromise) repoPromise = loadRepo();
    repoPromise
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ ...EMPTY_REPO, loading: false, error: "Could not load repository data." }));
    return () => {
      alive = false;
    };
  }, []);
  return data;
}

/* =================== source file fetch (raw.githubusercontent.com) =================== */

const fileCache = new Map<string, Promise<string>>();

export function fetchSource(path: string): Promise<string> {
  if (!fileCache.has(path)) {
    const p = fetch(`${BOT.rawBase}/${path}`, { cache: "no-store" }).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    });
    p.catch(() => fileCache.delete(path));
    fileCache.set(path, p);
  }
  return fileCache.get(path)!;
}

/* =================== helpers =================== */

export function timeAgo(iso: string | number | null | undefined): string {
  if (!iso) return "—";
  const t = typeof iso === "number" ? iso : new Date(iso).getTime();
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 60) return `${d}d ago`;
  return new Date(t).toLocaleDateString();
}
