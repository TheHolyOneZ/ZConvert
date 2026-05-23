import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import TitleBar from "./components/TitleBar";
import Sidebar from "./components/Sidebar";
import DropZone from "./components/DropZone";
import FileList from "./components/FileList";
import ConvertBar from "./components/ConvertBar";
import SettingsPanel from "./components/SettingsPanel";
import HistoryPanel from "./components/HistoryPanel";
import TestPanel from "./components/TestPanel";
import AboutPanel from "./components/AboutPanel";
import ToastStack from "./components/Toast";
import { useJobStore } from "./store/jobStore";
import { listPresets, loadSettings } from "./ipc/commands";
import { onJobProgress, onJobDone } from "./ipc/events";
import type { HistoryEntry } from "./types/conversion";

export default function App() {
  const view = useJobStore((s) => s.view);
  const panel = useJobStore((s) => s.panel);
  const setPanel = useJobStore((s) => s.setPanel);
  const setPresets = useJobStore((s) => s.setPresets);
  const updateConversion = useJobStore((s) => s.updateConversion);
  const oneBatchJobDone = useJobStore((s) => s.oneBatchJobDone);
  const updateSettings = useJobStore((s) => s.updateSettings);
  const addToast = useJobStore((s) => s.addToast);
  const addHistoryEntries = useJobStore((s) => s.addHistoryEntries);

  useEffect(() => {
    listPresets().then(setPresets).catch(() => {});
    loadSettings().then(updateSettings).catch(() => {});
  }, []);

  const unlistenProgress = useRef<(() => void) | null>(null);
  const unlistenDone = useRef<(() => void) | null>(null);

  useEffect(() => {
    onJobProgress((event) => {
      updateConversion(event.fileId, event.targetId, {
        status: event.status as any,
        outputPath: event.outputPath ?? null,
        error: event.error ?? null,
      });
    }).then((fn) => { unlistenProgress.current = fn; });

    onJobDone((jobId) => {
      const store = useJobStore.getState();
      if (!store.activeJobId || !jobId.startsWith(store.activeJobId + "-")) return;

      const fileId = jobId.slice(store.activeJobId.length + 1);
      const file = store.files.find((f) => f.id === fileId);
      const now = Date.now();


      if (file) {
        const entries: HistoryEntry[] = file.targets.map((t) => {
          const cs = file.conversions[t.id];
          if (!cs || cs.status === "pending" || cs.status === "converting") return null;
          return {
            id: `${file.id}-${t.id}-${now}`,
            timestamp: now,
            fileName: file.name,
            sourcePath: file.path,
            detectedFormat: file.detectedFormat,
            targetFormat: t.format,
            outputPath: cs.outputPath,
            status: cs.status as "done" | "failed" | "skipped",
            error: cs.error,
          } satisfies HistoryEntry;
        }).filter((e): e is HistoryEntry => e !== null);
        if (entries.length > 0) addHistoryEntries(entries);
      }

      const allDone = oneBatchJobDone();
      if (allDone) {
        const allConversions = store.files.flatMap((f) => Object.values(f.conversions));
        const done = allConversions.filter((c) => c.status === "done").length;
        const failed = allConversions.filter((c) => c.status === "failed").length;
        if (failed === 0) {
          addToast({ type: "success", message: `${done} ${done === 1 ? "conversion" : "conversions"} complete` });
        } else {
          addToast({ type: "error", message: `${done} done · ${failed} failed` });
        }
      }
    }).then((fn) => { unlistenDone.current = fn; });

    return () => { unlistenProgress.current?.(); unlistenDone.current?.(); };
  }, []);

  const isOverlay = panel === "settings";
  const isFullPanel = panel === "history" || panel === "test" || panel === "about";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--color-base)" }}>
      <TitleBar />

      <div className="flex flex-1 min-h-0">
        <Sidebar />

        <div className="flex flex-col flex-1 min-h-0 min-w-0 relative">


          <AnimatePresence mode="wait">
            {isFullPanel ? (
              <motion.div key={panel} className="flex-1 flex flex-col min-h-0"
                initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.15 }}>
                {panel === "history" && <HistoryPanel />}
                {panel === "test"    && <TestPanel />}
                {panel === "about"   && <AboutPanel />}
              </motion.div>
            ) : (
              <motion.div key="convert-area" className="flex-1 flex flex-col min-h-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}>
                <AnimatePresence mode="wait">
                  {view === "drop" ? (
                    <motion.div key="drop" className="flex-1"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}>
                      <DropZone />
                    </motion.div>
                  ) : (
                    <motion.div key="list" className="flex-1 flex flex-col min-h-0"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.12 }}>
                      <FileList />
                      <ConvertBar />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>


          <AnimatePresence>
            {isOverlay && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0 z-20"
                  style={{ background: "rgba(0,0,0,0.3)" }}
                  onClick={() => setPanel("convert")}
                />
                <SettingsPanel onClose={() => setPanel("convert")} />
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ToastStack />
    </div>
  );
}
