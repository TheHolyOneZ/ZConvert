import { motion } from "motion/react";
import { CheckCircle2, AlertCircle, SkipForward, FolderOpen, Trash2, Clock } from "lucide-react";
import { useJobStore } from "../store/jobStore";
import { getFormatInfo } from "../lib/formats";
import { revealFile } from "../ipc/commands";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function HistoryPanel() {
  const history = useJobStore((s) => s.history);
  const clearHistory = useJobStore((s) => s.clearHistory);

  return (
    <div className="flex-1 flex flex-col min-h-0">

      <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-light)" }}>
        <div className="flex items-center gap-2">
          <Clock size={13} style={{ color: "var(--color-text-subtle)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
            Conversion History
          </span>
          {history.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ background: "var(--color-panel-strong)", color: "var(--color-text-subtle)" }}>
              {history.length}
            </span>
          )}
        </div>
        {history.length > 0 && (
          <button onClick={clearHistory}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all"
            style={{ color: "var(--color-text-subtle)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-panel-hover)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-subtle)"; }}
          >
            <Trash2 size={11} /> Clear
          </button>
        )}
      </div>


      <div className="flex-1 overflow-y-auto px-2 py-2">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <Clock size={32} style={{ color: "var(--color-text-subtle)" }} />
            <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
              No conversions yet
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {history.map((entry, i) => {
              const srcInfo = entry.detectedFormat ? getFormatInfo(entry.detectedFormat) : null;
              const tgtInfo = getFormatInfo(entry.targetFormat);
              const StatusIcon = entry.status === "done" ? CheckCircle2 : entry.status === "failed" ? AlertCircle : SkipForward;
              const statusColor = entry.status === "done" ? "var(--color-success)" : entry.status === "failed" ? "var(--color-error)" : "var(--color-text-subtle)";

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.015, duration: 0.15 }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl group transition-all"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-panel-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <StatusIcon size={13} style={{ color: statusColor, flexShrink: 0 }} />

                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: "var(--color-text)" }}>
                      {entry.fileName}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] px-1 py-0.5 rounded"
                        style={{ background: "var(--color-panel-strong)", color: "var(--color-text-subtle)" }}>
                        {srcInfo?.label ?? "?"}
                      </span>
                      <span style={{ color: "var(--color-text-subtle)", fontSize: 9 }}>→</span>
                      <span className="text-[10px] px-1 py-0.5 rounded"
                        style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}>
                        {tgtInfo?.label ?? entry.targetFormat}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>
                        · {timeAgo(entry.timestamp)}
                      </span>
                    </div>
                    {entry.error && (
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--color-error)" }}>
                        {entry.error}
                      </p>
                    )}
                  </div>

                  {entry.outputPath && entry.status === "done" && (
                    <button
                      onClick={() => revealFile(entry.outputPath!)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      style={{ color: "var(--color-text-subtle)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-panel-strong)"; e.currentTarget.style.color = "var(--color-accent)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-subtle)"; }}
                    >
                      <FolderOpen size={12} />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
