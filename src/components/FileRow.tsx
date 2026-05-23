import { motion, AnimatePresence } from "motion/react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { FileText, Image, Database, X, CheckCircle2, AlertCircle, Loader2, Plus, FolderOpen } from "lucide-react";
import type { FileState } from "../types/conversion";
import { getFormatInfo, formatFileSize, CONVERTIBLE_TO } from "../lib/formats";
import { revealFile } from "../ipc/commands";
import { useJobStore } from "../store/jobStore";

interface Props {
  file: FileState;
  index: number;
}

const CATEGORY_ICON = {
  image: Image,
  document: FileText,
  data: Database,
};

const PREVIEWABLE = new Set(["jpeg", "png", "web_p", "bmp", "gif", "avif", "tiff"]);

export default function FileRow({ file, index }: Props) {
  const removeFile = useJobStore((s) => s.removeFile);
  const toggleFileTarget = useJobStore((s) => s.toggleFileTarget);
  const setFileOutputDir = useJobStore((s) => s.setFileOutputDir);
  const activeJobId = useJobStore((s) => s.activeJobId);
  const isRunning = !!activeJobId;

  const outputDir = file.targets[0]?.outputDir ?? null;
  const outputDirLabel = outputDir ? (outputDir.split(/[\\/]/).pop() ?? outputDir) : null;

  async function pickOutputDir() {
    if (isRunning) return;
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir === "string") setFileOutputDir(file.id, dir);
    else if (dir === null && outputDir !== null) setFileOutputDir(file.id, null);
  }

  const fmtInfo = file.detectedFormat ? getFormatInfo(file.detectedFormat) : null;
  const CategoryIcon = fmtInfo ? CATEGORY_ICON[fmtInfo.category] : FileText;
  const canPreview = file.detectedFormat !== null && PREVIEWABLE.has(file.detectedFormat);
  const thumbnailSrc = canPreview ? convertFileSrc(file.path) : null;

  const availableFormats = file.detectedFormat ? (CONVERTIBLE_TO[file.detectedFormat] ?? []) : [];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.18, delay: index * 0.025 }}
      className="group relative flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all duration-150"
      style={{ background: "transparent" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-panel-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >

      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden mt-0.5"
        style={{ background: "var(--color-panel-strong)", color: "var(--color-text-muted)" }}>
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement!.querySelector(".fallback-icon")!.removeAttribute("hidden");
            }}
          />
        ) : null}
        <span className="fallback-icon" hidden={!!thumbnailSrc}>
          <CategoryIcon size={16} />
        </span>
      </div>


      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
          {file.name}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-text-subtle)" }}>
          {fmtInfo?.label ?? "Unknown"} · {formatFileSize(file.size)}
        </p>


        {availableFormats.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {availableFormats.map((fmt) => {
              const target = file.targets.find((t) => t.format === fmt);
              const cs = target ? file.conversions[target.id] : undefined;
              const status = cs?.status;
              const isSelected = !!target;

              const fmtLabel = getFormatInfo(fmt)?.label ?? fmt;


              const color =
                status === "done"       ? "var(--color-success)"  :
                status === "failed"     ? "var(--color-error)"    :
                status === "converting" ? "var(--color-accent)"   :
                isSelected              ? "var(--color-accent)"   :
                "var(--color-text-subtle)";

              const bg =
                status === "done"   ? "rgba(34,197,94,0.08)"    :
                status === "failed" ? "rgba(248,113,113,0.08)"  :
                isSelected          ? "var(--color-accent-dim)"  :
                "var(--color-panel-strong)";

              const border = isSelected || status
                ? `1px solid ${color}40`
                : "1px solid var(--color-border-light)";

              function handleClick() {
                if (isRunning) {
                  if (status === "done" && cs?.outputPath) revealFile(cs.outputPath);
                  return;
                }
                toggleFileTarget(file.id, fmt);
              }

              return (
                <button
                  key={fmt}
                  onClick={handleClick}
                  title={
                    status === "failed" ? (cs?.error ?? "Failed") :
                    status === "done" && cs?.outputPath ? `→ ${cs.outputPath}` :
                    isSelected ? `Remove ${fmtLabel}` : `Add ${fmtLabel}`
                  }
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all duration-150"
                  style={{ background: bg, border, color, cursor: isRunning && status !== "done" ? "default" : "pointer" }}
                >
                  {status === "converting" && <Loader2 size={9} className="animate-spin" />}
                  {status === "done"        && <CheckCircle2 size={9} />}
                  {status === "failed"      && <AlertCircle size={9} />}
                  {!status && !isSelected   && <Plus size={8} />}
                  {fmtLabel}
                </button>
              );
            })}
          </div>
        )}

        {availableFormats.length === 0 && (
          <p className="text-[10px] mt-1" style={{ color: "var(--color-text-subtle)" }}>
            No supported output formats
          </p>
        )}


        {!isRunning && (
          <button
            onClick={pickOutputDir}
            className="flex items-center gap-1 mt-1.5 text-[10px] transition-all duration-150"
            style={{ color: "var(--color-text-subtle)" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-subtle)"; }}
          >
            <FolderOpen size={9} />
            {outputDirLabel ?? "Save next to source"}
          </button>
        )}
        {isRunning && outputDirLabel && (
          <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: "var(--color-text-subtle)" }}>
            <FolderOpen size={9} />
            {outputDirLabel}
          </p>
        )}
      </div>

      <AnimatePresence>
        {!isRunning && (
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 0 }} whileHover={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => removeFile(file.id)}
            className="mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center group-hover:opacity-100 transition-all"
            style={{ color: "var(--color-text-subtle)", background: "transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-panel-strong)"; e.currentTarget.style.color = "var(--color-text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-subtle)"; }}
          >
            <X size={12} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
