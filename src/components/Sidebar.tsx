import { motion } from "motion/react";
import { Settings2, History, FlaskConical, ArrowLeftRight, Info } from "lucide-react";
import { useJobStore, type AppPanel } from "../store/jobStore";
import Logo from "./Logo";

export default function Sidebar() {
  const panel = useJobStore((s) => s.panel);
  const setPanel = useJobStore((s) => s.setPanel);

  const items: { icon: React.ReactNode; id: AppPanel; label: string }[] = [
    { icon: <ArrowLeftRight size={17} />, id: "convert",  label: "Convert" },
    { icon: <FlaskConical size={17} />,   id: "test",     label: "Test Suite" },
    { icon: <History size={17} />,        id: "history",  label: "History" },
    { icon: <Settings2 size={17} />,      id: "settings", label: "Settings" },
    { icon: <Info size={17} />,           id: "about",    label: "About" },
  ];

  return (
    <div
      className="flex flex-col items-center py-3 shrink-0 w-14"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderRight: "1px solid var(--color-border)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >

      <Logo size={28} className="mb-3" />

      <div className="w-8 h-px mb-2" style={{ background: "var(--color-border)" }} />


      {items.map(({ icon, id, label }) => {
        const active = panel === id;
        return (
          <button
            key={id}
            title={label}
            onClick={() => setPanel(id)}
            className="relative w-10 h-8 rounded-md flex items-center justify-center transition-all duration-150 cursor-default mb-0.5"
            style={{
              color: active ? "var(--color-accent)" : "var(--color-text-muted)",
              background: active ? "rgba(99,102,241,0.1)" : "transparent",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = "var(--color-panel-hover)";
                e.currentTarget.style.color = "var(--color-text)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--color-text-muted)";
              }
            }}
          >
            {icon}
            {active && (
              <motion.div
                layoutId="sidebar-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4"
                style={{ background: "var(--color-accent)", marginLeft: -1, borderRadius: "0 2px 2px 0" }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
