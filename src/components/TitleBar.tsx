import type React from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { Minus, Square, X } from "lucide-react";
import Logo from "./Logo";

const win = getCurrentWebviewWindow();

export default function TitleBar() {
  return (
    <div
      data-tauri-drag-region
      className="flex items-center justify-between h-10 px-4 shrink-0 select-none"
      style={{
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid var(--color-border)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
      }}
    >
      <div data-tauri-drag-region className="flex items-center gap-2">
        <Logo size={18} />
        <span className="text-[11px] font-semibold tracking-[0.15em] uppercase"
          style={{ color: "var(--color-text-muted)" }}>
          ZConvert
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        {([
          { label: "Minimize", action: () => win.minimize(),        icon: <Minus size={11} />, close: false },
          { label: "Maximize", action: () => win.toggleMaximize(), icon: <Square size={10} />, close: false },
          { label: "Close",    action: () => win.close(),           icon: <X size={11} />,     close: true  },
        ] as { label: string; action: () => void; icon: React.ReactNode; close: boolean }[]).map(({ label, action, icon, close }) => (
          <button key={label} aria-label={label} onClick={action}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 cursor-default"
            style={{ color: "var(--color-text-subtle)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = close ? "rgba(248,113,113,0.15)" : "var(--color-panel-hover)";
              e.currentTarget.style.color = close ? "#f87171" : "var(--color-text-muted)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--color-text-subtle)";
            }}
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
