import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { FlaskConical, Play, X, CheckCircle2, AlertCircle, Loader2, FolderOpen, Info } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { convertFileSrc } from "@tauri-apps/api/core";
import { detectFiles, startJob } from "../ipc/commands";
import { onJobProgress, onJobDone } from "../ipc/events";
import { useJobStore } from "../store/jobStore";
import { getFormatInfo } from "../lib/formats";
import { revealFile } from "../ipc/commands";
import type { FileState, OutputTarget, ConversionState, Format, FileEntry } from "../types/conversion";

const TEST_MATRIX: Partial<Record<Format, Format[]>> = {
  jpeg:     ["png", "web_p", "avif", "tiff", "bmp"],
  png:      ["jpeg", "web_p", "avif", "tiff", "bmp"],
  web_p:    ["jpeg", "png", "avif", "tiff"],
  tiff:     ["jpeg", "png", "web_p", "bmp"],
  bmp:      ["jpeg", "png", "web_p"],
  svg:      ["png", "jpeg", "web_p"],
  csv:      ["json"],
  json:     ["csv"],
  markdown: ["html", "txt"],
  html:     ["txt"],
};

interface TestFile extends FileState {
  targets: OutputTarget[];
}

type ResultMap = Record<string, Record<string, ConversionState>>;

const PREVIEWABLE = new Set(["jpeg", "png", "web_p", "bmp"]);

export default function TestPanel() {
  const settings = useJobStore((s) => s.settings);
  const [testFiles, setTestFiles] = useState<TestFile[]>([]);
  const [results, setResults] = useState<ResultMap>({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const jobPrefixRef = useRef<string | null>(null);
  const pendingJobsRef = useRef<Set<string>>(new Set());
  const unlistenProgress = useRef<(() => void) | null>(null);
  const unlistenDone = useRef<(() => void) | null>(null);


  const addEntriesRef = useRef<(entries: FileEntry[]) => void>(() => {});

  function buildTargets(fmt: Format): OutputTarget[] {
    return (TEST_MATRIX[fmt] ?? []).map((tf) => ({
      id: crypto.randomUUID(),
      format: tf,
      quality: 85,
      maxDimension: null,
      stripMetadata: false,
      outputDir: settings.defaultOutputDir,
    }));
  }

  function addEntries(entries: FileEntry[]) {
    setTestFiles((prev) => {
      const existing = new Set(prev.map((f) => f.path));
      const fresh = entries
        .filter((e) => !existing.has(e.path) && e.detectedFormat && (TEST_MATRIX[e.detectedFormat]?.length ?? 0) > 0)
        .map((e): TestFile => ({ ...e, conversions: {}, targets: buildTargets(e.detectedFormat!) }));
      return [...prev, ...fresh];
    });
  }


  useEffect(() => { addEntriesRef.current = addEntries; });


  useEffect(() => {
    const win = getCurrentWebviewWindow();
    let unlisten: (() => void) | null = null;
    win.onDragDropEvent(async (e) => {
      if (e.payload.type === "enter" || e.payload.type === "over") {
        setIsDragging(true);
      } else if (e.payload.type === "leave") {
        setIsDragging(false);
      } else if (e.payload.type === "drop") {
        setIsDragging(false);
        const paths = e.payload.paths;
        if (paths.length) {
          const entries = await detectFiles(paths);
          addEntriesRef.current(entries);
        }
      }
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, []);


  useEffect(() => {
    onJobProgress((e) => {
      const prefix = jobPrefixRef.current;
      if (!prefix || !e.jobId.startsWith(prefix + "-")) return;
      setResults((prev) => ({
        ...prev,
        [e.fileId]: {
          ...(prev[e.fileId] ?? {}),
          [e.targetId]: { status: e.status, outputPath: e.outputPath ?? null, error: e.error ?? null },
        },
      }));
    }).then((fn) => { unlistenProgress.current = fn; });

    onJobDone((id) => {
      const prefix = jobPrefixRef.current;
      if (!prefix || !id.startsWith(prefix + "-")) return;
      pendingJobsRef.current.delete(id);
      if (pendingJobsRef.current.size === 0) {
        setRunning(false);
        setDone(true);
      }
    }).then((fn) => { unlistenDone.current = fn; });

    return () => { unlistenProgress.current?.(); unlistenDone.current?.(); };
  }, []);

  async function handleBrowse() {
    const selected = await open({ multiple: true, filters: [{ name: "All Files", extensions: ["*"] }] });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    if (paths.length) {
      const entries = await detectFiles(paths);
      addEntries(entries);
    }
  }

  async function handleRun() {
    if (!testFiles.length || running) return;

    const prefix = crypto.randomUUID();
    jobPrefixRef.current = prefix;

    const pending = new Set<string>();
    for (const file of testFiles) {
      if (file.targets.length) pending.add(`${prefix}-${file.id}`);
    }
    pendingJobsRef.current = pending;

    setRunning(true);
    setDone(false);
    setResults({});

    for (const file of testFiles) {
      if (!file.targets.length) continue;
      await startJob({
        id: `${prefix}-${file.id}`,
        files: [{ id: file.id, path: file.path, name: file.name, size: file.size, detectedFormat: file.detectedFormat }],
        outputTargets: file.targets,
        conflictResolution: "rename",
        status: "running",
      }).catch(() => {
        pendingJobsRef.current.delete(`${prefix}-${file.id}`);
        if (pendingJobsRef.current.size === 0) {
          setRunning(false);
          setDone(true);
        }
      });
    }
  }

  function handleClear() {
    setTestFiles([]);
    setResults({});
    setDone(false);
    jobPrefixRef.current = null;
    pendingJobsRef.current = new Set();
  }

  const doneCount = Object.values(results).flatMap(Object.values).filter((c) => c.status === "done").length;
  const failedCount = Object.values(results).flatMap(Object.values).filter((c) => c.status === "failed").length;

  return (
    <div
      className="flex-1 flex flex-col min-h-0 overflow-hidden relative transition-all duration-150"
      style={isDragging ? { outline: "2px solid var(--color-accent)", outlineOffset: "-2px", background: "rgba(99,102,241,0.04)" } : {}}
    >

      {isDragging && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="px-5 py-3 rounded-2xl text-sm font-semibold"
            style={{ background: "var(--color-accent)", color: "#fff", boxShadow: "0 0 32px rgba(99,102,241,0.4)" }}>
            Drop files to add them
          </div>
        </div>
      )}


      <div className="flex items-center justify-between px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-light)" }}>
        <div className="flex items-center gap-2">
          <FlaskConical size={13} style={{ color: "var(--color-accent)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>
            Conversion Test Suite
          </span>
        </div>
        <div className="flex items-center gap-1">
          {testFiles.length > 0 && !running && (
            <button onClick={handleClear}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all"
              style={{ color: "var(--color-text-subtle)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-panel-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <X size={11} /> Clear
            </button>
          )}
          {testFiles.length > 0 && (
            <button
              onClick={handleRun}
              disabled={running}
              className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg font-medium transition-all"
              style={{
                background: running ? "var(--color-panel-strong)" : "var(--color-accent)",
                color: running ? "var(--color-text-subtle)" : "#fff",
                cursor: running ? "not-allowed" : "pointer",
              }}
            >
              {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              {running ? "Running…" : "Run Tests"}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {testFiles.length === 0 && (
          <div className="p-3 flex flex-col gap-2.5">
            <div className="px-3 py-3 rounded-xl flex items-start gap-2.5"
              style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}>
              <Info size={13} style={{ color: "var(--color-accent)", marginTop: 1, flexShrink: 0 }} />
              <div>
                <p className="text-[12px] font-semibold" style={{ color: "var(--color-text)" }}>
                  Drag in exactly these files to test everything
                </p>
                <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                  Each file covers one category. The suite auto-runs every logical conversion — no cross-category attempts.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="px-3 py-2.5 rounded-xl"
                style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                  Images — drop any 1 raster + 1 vector:
                </p>
                {[
                  { ext: ".jpg or .png", why: "→ PNG / WebP / AVIF / TIFF / BMP" },
                  { ext: ".svg",         why: "→ PNG / JPEG / WebP (rasterise)" },
                ].map(({ ext, why }) => (
                  <div key={ext} className="flex items-baseline gap-2 mb-1">
                    <span className="text-[11px] font-mono font-semibold shrink-0" style={{ color: "var(--color-accent)" }}>{ext}</span>
                    <span className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>{why}</span>
                  </div>
                ))}
              </div>

              <div className="px-3 py-2.5 rounded-xl"
                style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                  Data — drop both:
                </p>
                {[
                  { ext: ".csv",  why: "→ JSON" },
                  { ext: ".json", why: "→ CSV" },
                ].map(({ ext, why }) => (
                  <div key={ext} className="flex items-baseline gap-2 mb-1">
                    <span className="text-[11px] font-mono font-semibold shrink-0" style={{ color: "var(--color-accent)" }}>{ext}</span>
                    <span className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>{why}</span>
                  </div>
                ))}
              </div>

              <div className="px-3 py-2.5 rounded-xl"
                style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}>
                <p className="text-[11px] font-semibold mb-1.5" style={{ color: "var(--color-text-muted)" }}>
                  Documents — drop one:
                </p>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-[11px] font-mono font-semibold shrink-0" style={{ color: "var(--color-accent)" }}>.md</span>
                  <span className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>→ HTML / TXT (native, no sidecar needed)</span>
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-subtle)" }}>
                  DOCX / PDF require LibreOffice sidecars — not covered here.
                </p>
              </div>
            </div>

            <button onClick={handleBrowse}
              className="w-full py-2.5 rounded-xl text-[13px] font-medium transition-all"
              style={{ background: "var(--color-panel-strong)", color: "var(--color-text-muted)", border: "1px dashed var(--color-border)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.color = "var(--color-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
            >
              Browse Files
            </button>
          </div>
        )}


        {done && (
          <div className="mx-3 mt-3 px-3 py-2.5 rounded-xl flex items-center gap-3"
            style={{
              background: failedCount === 0 ? "rgba(34,197,94,0.08)" : "rgba(248,113,113,0.08)",
              border: `1px solid ${failedCount === 0 ? "rgba(34,197,94,0.25)" : "rgba(248,113,113,0.25)"}`,
            }}>
            {failedCount === 0
              ? <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} />
              : <AlertCircle size={14} style={{ color: "var(--color-error)" }} />
            }
            <p className="text-[12px] font-medium" style={{ color: "var(--color-text)" }}>
              {failedCount === 0
                ? `All ${doneCount} conversions passed`
                : `${doneCount} passed · ${failedCount} failed`
              }
            </p>
          </div>
        )}


        <div className="flex flex-col gap-2 px-3 py-3">
          {testFiles.map((file) => {
            const fmtInfo = file.detectedFormat ? getFormatInfo(file.detectedFormat) : null;
            const canPreview = file.detectedFormat !== null && PREVIEWABLE.has(file.detectedFormat);
            const thumbSrc = canPreview ? convertFileSrc(file.path) : null;
            const fileResults = results[file.id] ?? {};

            return (
              <motion.div key={file.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl overflow-hidden"
                style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}
              >
                <div className="flex items-center gap-2.5 px-3 py-2.5"
                  style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                  <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ background: "var(--color-panel-strong)" }}>
                    {thumbSrc
                      ? <img src={thumbSrc} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      : <span className="text-xs" style={{ color: "var(--color-text-subtle)" }}>{fmtInfo?.label?.slice(0, 3) ?? "?"}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium truncate" style={{ color: "var(--color-text)" }}>{file.name}</p>
                    <p className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>
                      {fmtInfo?.label ?? "Unknown"} · {file.targets.length} conversions
                    </p>
                  </div>
                  {!running && !done && (
                    <button onClick={() => setTestFiles((prev) => prev.filter((f) => f.id !== file.id))}
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ color: "var(--color-text-subtle)" }}>
                      <X size={11} />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5 px-3 py-2.5">
                  {file.targets.map((t) => {
                    const cs = fileResults[t.id];
                    const status = cs?.status ?? "pending";
                    const tgtInfo = getFormatInfo(t.format);
                    const color =
                      status === "done"       ? "var(--color-success)"  :
                      status === "failed"     ? "var(--color-error)"    :
                      status === "converting" ? "var(--color-accent)"   :
                      "var(--color-text-subtle)";

                    return (
                      <button key={t.id}
                        title={cs?.error ?? (cs?.outputPath ? `→ ${cs.outputPath}` : tgtInfo?.label ?? t.format)}
                        onClick={() => cs?.outputPath && revealFile(cs.outputPath)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all duration-200"
                        style={{ background: "var(--color-panel-strong)", border: `1px solid ${color}40`, color }}
                      >
                        {status === "converting" && <Loader2 size={9} className="animate-spin" />}
                        {status === "done"        && <CheckCircle2 size={9} />}
                        {status === "failed"      && <AlertCircle size={9} />}
                        {tgtInfo?.label ?? t.format}
                        {status === "done" && cs?.outputPath && <FolderOpen size={9} className="ml-0.5 opacity-60" />}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}

          {testFiles.length > 0 && (
            <button onClick={handleBrowse}
              className="py-2 rounded-xl text-[11px] transition-all"
              style={{ background: "var(--color-panel)", border: "1px dashed var(--color-border-light)", color: "var(--color-text-subtle)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.color = "var(--color-accent)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border-light)"; e.currentTarget.style.color = "var(--color-text-subtle)"; }}
            >
              + Add more files
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
