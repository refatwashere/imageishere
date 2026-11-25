import { Check, Copy, FileTerminal } from "lucide-react";
import { useCopy } from "../lib/clipboard";

export default function CodeBlock({
  code,
  title = "shell",
  className = "",
}: {
  code: string;
  title?: string;
  className?: string;
}) {
  const { isCopied, copy } = useCopy(1600);
  const copied = isCopied();
  const lines = code.replace(/\n$/, "").split("\n");

  return (
    <div className={`codeblock overflow-hidden text-[11.5px] leading-[1.7] shadow-lg shadow-black/30 ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-white/[0.03] px-3 py-2">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
          <span className="flex gap-1.5">
            <i className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
            <i className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          </span>
          <FileTerminal size={12} className="text-slate-600" />
          <span className="font-mono normal-case tracking-normal text-slate-400">{title}</span>
        </div>
        <button
          onClick={() => void copy(code)}
          aria-label="Copy code"
          className="group flex items-center gap-1.5 rounded-md border border-white/5 bg-white/[0.04] px-2 py-1 text-[10px] font-medium text-slate-400 transition hover:border-cyan-400/30 hover:text-cyan-300"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-0 py-2.5">
        {lines.map((line, i) => (
          <div key={i} className="flex gap-4 px-4 hover:bg-white/[0.03]">
            <span className="cl-num w-5 shrink-0 select-none text-right">{i + 1}</span>
            <code className="whitespace-pre text-[#c9d8f2]">{line}</code>
          </div>
        ))}
      </pre>
    </div>
  );
}
