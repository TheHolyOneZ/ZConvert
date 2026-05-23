import { useEffect, useRef, useState } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { motion, AnimatePresence } from "motion/react";
import { Upload, FolderOpen } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { detectFiles } from "../ipc/commands";
import { useJobStore } from "../store/jobStore";
import type { FileState } from "../types/conversion";

export default function DropZone() {
  const [hovering, setHovering] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const addFiles = useJobStore((s) => s.addFiles);
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const win = getCurrentWebviewWindow();
    win.onDragDropEvent((e) => {
      const { type } = e.payload;
      if (type === "enter" || type === "over") setHovering(true);
      else if (type === "leave") setHovering(false);
      else if (type === "drop") {
        setHovering(false);
        const paths: string[] = (e.payload as any).paths ?? [];
        if (paths.length > 0) handlePaths(paths);
      }
    }).then((u) => { unlistenRef.current = u; });
    return () => { unlistenRef.current?.(); };
  }, []);

  async function handlePaths(paths: string[]) {
    setDetecting(true);
    try {
      const entries = await detectFiles(paths);
      const states: FileState[] = entries.map((e) => ({ ...e, conversions: {}, targets: [] }));
      addFiles(states);
    } finally {
      setDetecting(false);
    }
  }

  async function handleBrowse() {
    const selected = await open({ multiple: true, filters: [{ name: "All Files", extensions: ["*"] }] });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    if (paths.length > 0) handlePaths(paths);
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <motion.div
        animate={hovering ? { scale: 1.015 } : { scale: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className="w-full max-w-md"
      >
        <div
          onClick={handleBrowse}
          className="relative rounded-2xl cursor-pointer transition-all duration-200 overflow-hidden"
          style={{
            border: `1.5px dashed ${hovering ? "var(--color-accent)" : "var(--color-border)"}`,
            background: hovering ? "rgba(99,102,241,0.06)" : "var(--color-panel)",
            backdropFilter: "blur(28px) saturate(180%)",
            WebkitBackdropFilter: "blur(28px) saturate(180%)",
            boxShadow: hovering
              ? "0 0 40px rgba(99,102,241,0.18), inset 0 1px 0 rgba(255,255,255,0.06)"
              : "0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          <AnimatePresence>
            {hovering && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)" }}
              />
            )}
          </AnimatePresence>

          <div className="relative flex flex-col items-center gap-5 py-14 px-10">
            <AnimatePresence mode="wait">
              <motion.div key={hovering ? "h" : "i"}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.14 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  animate={hovering ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: hovering ? "var(--color-accent)" : "var(--color-panel-strong)",
                    boxShadow: hovering ? "0 0 28px rgba(99,102,241,0.5)" : "none",
                  }}
                >
                  {hovering
                    ? <Upload size={26} color="#fff" />
                    : <FolderOpen size={26} style={{ color: "var(--color-text-muted)" }} />}
                </motion.div>

                <div className="text-center space-y-1.5">
                  <p className="text-[15px] font-semibold" style={{ color: "var(--color-text)" }}>
                    {hovering ? "Release to add files" : "Drop files here"}
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    {hovering ? "Files will be queued" : "or click to browse"}
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: "var(--color-panel-strong)", color: "var(--color-text-subtle)", border: "1px solid var(--color-border-light)" }}>
                  Images · Documents · Data
                </div>
                {detecting && (
                  <div className="text-xs mt-2" style={{ color: "var(--color-text-subtle)" }}>
                    Detecting formats…
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
