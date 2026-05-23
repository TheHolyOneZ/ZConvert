import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, X } from "lucide-react";
import { useJobStore } from "../store/jobStore";
import { startJob, cancelJob } from "../ipc/commands";

export default function ConvertBar() {
  const files = useJobStore((s) => s.files);
  const settings = useJobStore((s) => s.settings);
  const activeJobId = useJobStore((s) => s.activeJobId);
  const startBatch = useJobStore((s) => s.startBatch);
  const addToast = useJobStore((s) => s.addToast);

  const filesToConvert = files.filter((f) =>
    f.targets.length > 0 &&
    f.targets.some((t) => {
      const cs = f.conversions[t.id];
      return !cs || cs.status === "pending" || cs.status === "failed";
    })
  );

  const totalTargets = filesToConvert.reduce((acc, f) => acc + f.targets.filter((t) => {
    const cs = f.conversions[t.id];
    return !cs || cs.status === "pending" || cs.status === "failed";
  }).length, 0);

  const canConvert = filesToConvert.length > 0 && !activeJobId;

  async function handleConvert() {
    if (!canConvert) return;

    const batchPrefix = crypto.randomUUID();
    startBatch(batchPrefix, filesToConvert.length);

    for (const file of filesToConvert) {
      const pendingTargets = file.targets.filter((t) => {
        const cs = file.conversions[t.id];
        return !cs || cs.status === "pending" || cs.status === "failed";
      });
      if (!pendingTargets.length) continue;

      await startJob({
        id: `${batchPrefix}-${file.id}`,
        files: [{ id: file.id, path: file.path, name: file.name, size: file.size, detectedFormat: file.detectedFormat }],
        outputTargets: pendingTargets,
        conflictResolution: settings.conflictResolution,
        status: "running",
      }).catch((err: unknown) => {
        addToast({ type: "error", message: `Failed: ${err}` });
      });
    }
  }

  async function handleCancel() {
    if (!activeJobId) return;

    for (const file of files) {
      await cancelJob(`${activeJobId}-${file.id}`).catch(() => {});
    }
    useJobStore.getState().setActiveJobId(null);
    addToast({ type: "info", message: "Conversion cancelled" });
  }

  if (files.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 shrink-0"
      style={{ borderTop: "1px solid var(--color-border)" }}>

      <AnimatePresence mode="wait">
        {activeJobId ? (
          <motion.button
            key="cancel"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            onClick={handleCancel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "var(--color-panel-strong)", color: "var(--color-text-muted)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.12)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-panel-strong)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
          >
            <X size={14} /> Cancel
          </motion.button>
        ) : (
          <motion.button
            key="convert"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
            whileTap={canConvert ? { scale: 0.97 } : undefined}
            onClick={handleConvert}
            disabled={!canConvert}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={canConvert
              ? { background: "var(--color-accent)", color: "#fff", boxShadow: "0 0 20px rgba(99,102,241,0.35)", cursor: "pointer" }
              : { background: "var(--color-panel-strong)", color: "var(--color-text-subtle)", opacity: 0.5, cursor: "not-allowed" }
            }
            onMouseEnter={(e) => { if (canConvert) e.currentTarget.style.filter = "brightness(1.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
          >
            <ArrowRight size={14} />
            {canConvert
              ? `Convert ${totalTargets} output${totalTargets === 1 ? "" : "s"} across ${filesToConvert.length} file${filesToConvert.length === 1 ? "" : "s"}`
              : "Select output formats above"
            }
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
