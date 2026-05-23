import { useState } from "react";
import { AnimatePresence } from "motion/react";
import { Trash2, Plus } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useJobStore } from "../store/jobStore";
import { detectFiles } from "../ipc/commands";
import type { FileState } from "../types/conversion";
import FileRow from "./FileRow";
import SkeletonRow from "./SkeletonRow";

export default function FileList() {
  const files = useJobStore((s) => s.files);
  const clearFiles = useJobStore((s) => s.clearFiles);
  const addFiles = useJobStore((s) => s.addFiles);
  const activeJobId = useJobStore((s) => s.activeJobId);

  const [detecting, setDetecting] = useState(false);
  const [detectCount, setDetectCount] = useState(0);

  async function handleAddMore() {
    const selected = await open({ multiple: true, filters: [{ name: "All Files", extensions: ["*"] }] });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    if (paths.length === 0) return;
    setDetectCount(paths.length);
    setDetecting(true);
    try {
      const entries = await detectFiles(paths);
      const states: FileState[] = entries.map((e) => ({ ...e, conversions: {}, targets: [] }));
      addFiles(states);
    } finally {
      setDetecting(false);
    }
  }

  const allConversions = files.flatMap((f) => Object.values(f.conversions));
  const doneCount = allConversions.filter((c) => c.status === "done").length;
  const failedCount = allConversions.filter((c) => c.status === "failed").length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-light)" }}>
        <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
          {files.length} {files.length === 1 ? "file" : "files"}
          {doneCount > 0 && <span className="ml-2" style={{ color: "var(--color-success)" }}>{doneCount} done</span>}
          {failedCount > 0 && <span className="ml-2" style={{ color: "var(--color-error)" }}>{failedCount} failed</span>}
        </p>
        {!activeJobId && (
          <div className="flex items-center gap-0.5">
            <button onClick={handleAddMore}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
              style={{ color: "var(--color-text-subtle)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-panel-hover)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-subtle)"; }}
            >
              <Plus size={12} /> Add
            </button>
            <button onClick={clearFiles}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all"
              style={{ color: "var(--color-text-subtle)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-panel-hover)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-subtle)"; }}
            >
              <Trash2 size={12} /> Clear
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1.5">
        <AnimatePresence initial={false}>
          {files.map((file, i) => (
            <FileRow key={file.id} file={file} index={i} />
          ))}
        </AnimatePresence>
        {detecting &&
          Array.from({ length: detectCount || 3 }).map((_, i) => (
            <SkeletonRow key={`skeleton-${i}`} />
          ))}
      </div>
    </div>
  );
}
