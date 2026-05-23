import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useJobStore, type Toast } from "../store/jobStore";

export default function ToastStack() {
  const toasts = useJobStore((s) => s.toasts);
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => <ToastItem key={t.id} toast={t} />)}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useJobStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 4200);
    return () => clearTimeout(timer);
  }, [toast.id]);

  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? AlertCircle : Info;
  const iconColor = toast.type === "success" ? "var(--color-success)" : toast.type === "error" ? "var(--color-error)" : "var(--color-accent)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl min-w-[220px] max-w-xs"
      style={{
        background: "var(--color-panel-strong)",
        backdropFilter: "blur(28px) saturate(180%)",
        WebkitBackdropFilter: "blur(28px) saturate(180%)",
        border: "1px solid var(--color-border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
    >
      <Icon size={15} style={{ color: iconColor, flexShrink: 0 }} />
      <p className="flex-1 text-[13px]" style={{ color: "var(--color-text)" }}>{toast.message}</p>
      {toast.action && (
        <button onClick={toast.action.onClick}
          className="text-xs font-medium whitespace-nowrap"
          style={{ color: "var(--color-accent)" }}>
          {toast.action.label}
        </button>
      )}
      <button onClick={() => removeToast(toast.id)} style={{ color: "var(--color-text-subtle)", flexShrink: 0 }}>
        <X size={12} />
      </button>
    </motion.div>
  );
}
