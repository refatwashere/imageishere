import { useEffect, useState } from "react";
import {
  ChevronRight, Folder, FolderOpen, FileCode, FileJson, FileText, File, Copy, Check, FolderGit2, Boxes, ExternalLink, Loader2, AlertTriangle, Terminal,
} from "lucide-react";
import { BOT, FILE_TREE, type TreeNode } from "../data/content";
import { useCopy } from "../lib/clipboard";
import { fetchSource, timeAgo, useRepo } from "../lib/live";
import type { IconComponent } from "./Brand";

/* ---------------- file type helpers ---------------- */
const langOf = (name: string) =>
  name.endsWith(".js") ? "js" : name.endsWith(".json") ? "json" : name.endsWith(".md") ? "md" : name.startsWith(".env") ? "env" : "text";

const iconOf = (name: string): { icon: IconComponent; color: string } => {
  const l = langOf(name);
  if (l === "js") return { icon: FileCode, color: "text-amber-300" };
  if (l === "json") return { icon: FileJson, color: "text-orange-300" };
  if (l === "md") return { icon: FileText, color: "text-violet-300" };
  if (l === "env") return { icon: FileText, color: "text-rose-300" };
  return { icon: File, color: "text-slate-500" };
};

function findTreeNode(nodes: TreeNode[], targetPath: string, prefix = ""): TreeNode | undefined {
  for (const n of nodes) {
    const p = prefix ? `${prefix}/${n.name}` : n.name;
    if (p === targetPath) return n;
    if (n.children) {
      const found = findTreeNode(n.children, targetPath, p);
      if (found) return found;
    }
  }
  return undefined;
}

/* ---------------- tiny per-line highlighter (preview only) ---------------- */
const JS_TOKENS = /(\/\/.*$)|('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|\b(const|let|var|async|await|function|return|if|else|try|catch|finally|throw|new|require|module|exports|for|of|typeof|null|true|false|undefined)\b|\b(\d+(?:\.\d+)?)\b/g;

function highlight(line: string, lang: string): React.ReactNode {
  if (lang === "env") {
    const i = line.indexOf("=");
    if (line.trim().startsWith("#") || i < 0) return <span className="text-slate-500">{line}</span>;
    return <><span className="text-cyan-300">{line.slice(0, i)}</span><span className="text-slate-500">=</span><span className="text-emerald-300">{line.slice(i + 1)}</span></>;
  }
  if (lang === "md") {
    if (/^#{1,6}\s/.test(line)) return <span className="font-semibold text-sky-300">{line}</span>;
    return line;
  }
  if (lang !== "js" && lang !== "json") return line;
  const out: React.ReactNode[] = [];
  let last = 0, k = 0;
  let m: RegExpExecArray | null;
  JS_TOKENS.lastIndex = 0;
  while ((m = JS_TOKENS.exec(line))) {
    if (m[0].length === 0) { JS_TOKENS.lastIndex++; continue; }
    if (m.index > last) out.push(line.slice(last, m.index));
    const cls = m[1] ? "italic text-slate-500" : m[2] ? "text-emerald-300" : m[3] ? "text-violet-300" : "text-amber-300";
    out.push(<span key={k++} className={cls}>{m[0]}</span>);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

/* ---------------- tree row ---------------- */
function TreeRow({ node, depth, path, expanded, toggle, selected, onSelect }: {
  node: TreeNode; depth: number; path: string;
  expanded: Set<string>; toggle: (p: string) => void;
  selected: string; onSelect: (path: string, node: TreeNode) => void;
}) {
  const fullPath = path ? `${path}/${node.name}` : node.name;
  const isDir = node.type === "dir";
  const isOpen = expanded.has(fullPath);
  const isSelected = selected === fullPath;
  const { icon: Icon, color } = iconOf(node.name);

  return (
    <>
      <button
        onClick={() => (isDir ? toggle(fullPath) : onSelect(fullPath, node))}
        className={`group flex w-full items-center gap-1.5 rounded-lg py-[6px] pr-2 text-left transition ${isSelected ? "bg-cyan-400/10 text-cyan-100" : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"}`}
        style={{ paddingLeft: `${depth * 18 + 6}px` }}
      >
        {isDir ? <ChevronRight size={13} className={`shrink-0 text-slate-600 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} /> : <span className="w-[13px] shrink-0" />}
        {isDir ? (isOpen ? <FolderOpen size={15} className="shrink-0 text-sky-300/90" /> : <Folder size={15} className="shrink-0 text-sky-300/80" />) : <Icon size={14} className={`shrink-0 ${color}`} strokeWidth={1.8} />}
        <span className={`truncate font-mono text-[11px] ${isDir ? "font-semibold text-slate-300" : ""}`}>{node.name}{isDir ? "/" : ""}</span>
        {node.note && <span className="ml-auto hidden truncate pl-3 font-mono text-[8.5px] text-slate-700 group-hover:text-slate-500 2xl:inline">{node.note}</span>}
      </button>
      {isDir && isOpen && node.children?.map((child) => (
        <TreeRow key={child.name} node={child} depth={depth + 1} path={fullPath} expanded={expanded} toggle={toggle} selected={selected} onSelect={onSelect} />
      ))}
    </>
  );
}

/* ---------------- page ---------------- */
const DEFAULT_PATH = "api/webhook.js";

export default function FileTree() {
  const { commits, scripts, repo } = useRepo();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["api", "lib", "test"]));
  const [selected, setSelected] = useState(DEFAULT_PATH);
  const [node, setNode] = useState<TreeNode>(() => findTreeNode(FILE_TREE, DEFAULT_PATH) ?? FILE_TREE[0]);
  const [source, setSource] = useState<{ path: string; text?: string; error?: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const { isCopied, copy } = useCopy(1400);

  useEffect(() => {
    setShowAll(false);
    if (node.preview === false) { setSource({ path: selected }); return; }
    let alive = true;
    setSource(null);
    fetchSource(selected)
      .then((text) => alive && setSource({ path: selected, text }))
      .catch((e) => alive && setSource({ path: selected, error: (e as Error).message }));
    return () => { alive = false; };
  }, [selected, node]);

  const toggle = (p: string) => setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(p)) next.delete(p); else next.add(p);
    return next;
  });

  const lang = langOf(node.name);
  const lines = source?.text ? source.text.replace(/\n$/, "").split("\n") : [];
  const LIMIT = 140;
  const visible = showAll ? lines : lines.slice(0, LIMIT);
  const bytes = source?.text ? new Blob([source.text]).size : 0;
  const latest = commits[0];

  const quality = [
    { cmd: "npm run check", desc: scripts?.check ?? "node --check on bot.js, api/webhook.js, lib/image-generator.js, test/webhook.test.js" },
    { cmd: "npm test", desc: scripts?.test ? `${scripts.test} (test/webhook.test.js)` : "node --test (test/webhook.test.js)" },
    { cmd: "npm audit --omit=dev", desc: "audit production dependencies" },
    { cmd: "npm run vercel:dev", desc: scripts?.["vercel:dev"] ?? "vercel dev" },
  ];

  return (
    <div className="grid gap-5 lg:h-full lg:min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* tree */}
      <div className="flex min-h-0 flex-col gap-5">
        <div className="panel-flat min-h-0 flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between border-b border-white/5 px-2 pb-3">
            <h2 className="flex items-center gap-2 font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400"><FolderGit2 size={13} className="text-cyan-400" /> imageishere</h2>
            <a href={BOT.repoUrl} target="_blank" rel="noreferrer" className="font-mono text-[9px] text-slate-600 hover:text-cyan-300">{repo?.defaultBranch ?? "main"}{latest ? ` @ ${latest.sha}` : ""}</a>
          </div>
          <div className="mt-2">
            {FILE_TREE.map((n) => (
              <TreeRow key={n.name} node={n} depth={0} path="" expanded={expanded} toggle={toggle} selected={selected}
                onSelect={(p, nn) => { setSelected(p); setNode(nn); }} />
            ))}
          </div>
        </div>

        <div className="panel-flat p-4">
          <h3 className="flex items-center gap-2 font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-400"><Boxes size={13} className="text-cyan-400" /> Quality commands</h3>
          <ul className="mt-3 space-y-1.5">
            {quality.map((q) => (
              <li key={q.cmd} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                <code className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-cyan-200"><Terminal size={10} className="text-slate-500" />{q.cmd}</code>
                <div className="mt-0.5 truncate font-mono text-[9px] text-slate-600" title={q.desc}>{q.desc}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* detail + live source */}
      <div className="flex min-h-0 flex-col gap-4">
        <div className="panel-flat p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-slate-600">Selected file</div>
              <code className="mt-1 block break-all font-mono text-[15px] font-semibold text-cyan-200">{selected}</code>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => void copy(selected, "path")} aria-label="Copy path" className="rounded-lg border border-white/8 p-2 text-slate-500 transition hover:text-cyan-300">
                {isCopied("path") ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
              <a href={`${BOT.repoUrl}/blob/main/${selected}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 font-mono text-[10px] font-semibold text-cyan-300 transition hover:bg-cyan-400/15">
                Open on GitHub <ExternalLink size={11} />
              </a>
            </div>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-slate-300">{node.desc ?? node.note}</p>
          <div className="mt-3 flex flex-wrap gap-2 font-mono text-[9.5px] text-slate-500">
            <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">{lang === "js" ? "JavaScript" : lang.toUpperCase()}</span>
            {source?.text && <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">{lines.length} lines</span>}
            {source?.text && <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">{(bytes / 1024).toFixed(1)} KB</span>}
            {latest && <span className="rounded-md border border-white/5 bg-white/[0.03] px-2 py-1">branch updated {timeAgo(latest.date)}</span>}
          </div>
        </div>

        <div className="codeblock flex min-h-[320px] flex-1 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-white/[0.03] px-3 py-2">
            <div className="flex items-center gap-2 text-[10px] text-slate-500">
              <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" /></span>
              <span className="font-mono text-slate-400">{selected}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden font-mono text-[9px] text-emerald-400/80 sm:inline">live · raw.githubusercontent.com</span>
              {source?.text && (
                <button onClick={() => void copy(source.text!, "file")} aria-label="Copy file contents"
                  className="flex items-center gap-1 rounded-md border border-white/5 bg-white/[0.04] px-2 py-1 font-mono text-[9.5px] text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-300">
                  {isCopied("file") ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  {isCopied("file") ? "copied" : "copy"}
                </button>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto py-2.5 text-[11px] leading-[1.7]">
            {node.preview === false ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
                <FileJson size={22} className="text-slate-600" />
                <p className="text-[11px] text-slate-500">Large generated lockfile, so there's no preview here.</p>
                <a href={`${BOT.repoUrl}/blob/main/${selected}`} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-cyan-400 hover:text-cyan-300">view on GitHub →</a>
              </div>
            ) : !source ? (
              <div className="flex items-center gap-2 px-4 py-3 font-mono text-[10.5px] text-slate-500"><Loader2 size={13} className="animate-spin" /> fetching {selected} from GitHub…</div>
            ) : source.error ? (
              <div className="flex items-start gap-2 px-4 py-3 text-[11px] text-amber-300/90"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> Couldn't load the file ({source.error}). Open it on GitHub instead.</div>
            ) : (
              <pre>
                {visible.map((line, i) => (
                  <div key={i} className="flex gap-4 px-4 hover:bg-white/[0.03]">
                    <span className="cl-num w-7 shrink-0 select-none text-right">{i + 1}</span>
                    <code className="whitespace-pre font-mono text-[#c9d8f2]">{highlight(line, lang)}</code>
                  </div>
                ))}
              </pre>
            )}
            {lines.length > LIMIT && (
              <div className="px-4 pb-2 pt-1">
                <button onClick={() => setShowAll((v) => !v)} className="rounded-md border border-white/8 bg-white/[0.03] px-3 py-1.5 font-mono text-[10px] text-cyan-300 hover:bg-white/[0.06]">
                  {showAll ? "collapse" : `show all ${lines.length} lines`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
