import { motion } from "motion/react";
import { X, FolderOpen, Shuffle, Shield, Cpu, ArrowRight } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useJobStore } from "../store/jobStore";
import { saveSettings } from "../ipc/commands";
import type { ConflictResolution } from "../types/conversion";

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const settings = useJobStore((s) => s.settings);
  const updateSettings = useJobStore((s) => s.updateSettings);
  const addToast = useJobStore((s) => s.addToast);

  async function handleSave() {
    try {
      await saveSettings(settings);
      addToast({ type: "success", message: "Settings saved" });
    } catch {
      addToast({ type: "error", message: "Failed to save settings" });
    }
  }

  async function pickOutputDir() {
    const dir = await open({ directory: true, multiple: false });
    if (typeof dir === "string") updateSettings({ defaultOutputDir: dir });
  }

  const dirLabel = settings.defaultOutputDir
    ? settings.defaultOutputDir.split(/[\\/]/).pop() ?? settings.defaultOutputDir
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      className="absolute inset-y-0 right-0 w-[296px] flex flex-col z-30"
      style={{
        background: "rgba(255,255,255,0.055)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        borderLeft: "1px solid var(--color-border)",
        boxShadow: "-12px 0 48px rgba(0,0,0,0.25), inset 1px 0 0 rgba(255,255,255,0.07)",
      }}
    >

      <div className="flex items-center justify-between px-4 py-3.5 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}>
        <span className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>Settings</span>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
          style={{ color: "var(--color-text-subtle)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-panel-hover)"; e.currentTarget.style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-subtle)"; }}
        >
          <X size={13} />
        </button>
      </div>


      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-4">


        <Group label="Output">
          <button onClick={pickOutputDir}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
            style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-panel-hover)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "var(--color-panel)"; e.currentTarget.style.borderColor = "var(--color-border-light)"; }}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: "var(--color-accent-dim)", color: "var(--color-accent)" }}>
              <FolderOpen size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>Default output folder</p>
              <p className="text-[12px] font-medium truncate mt-0.5" style={{ color: dirLabel ? "var(--color-text)" : "var(--color-text-muted)" }}>
                {dirLabel ?? "Same folder as source"}
              </p>
            </div>
            <ArrowRight size={11} style={{ color: "var(--color-text-subtle)", flexShrink: 0 }} />
          </button>


          <div className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--color-border-light)" }}>
            <div className="flex items-center gap-2 px-3 py-2"
              style={{ background: "var(--color-panel)", borderBottom: "1px solid var(--color-border-light)" }}>
              <Shuffle size={11} style={{ color: "var(--color-text-subtle)" }} />
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--color-text-subtle)" }}>
                Conflict resolution
              </span>
            </div>
            {([ ["rename",    "Auto-rename",   "_1, _2… suffix"],
                 ["overwrite", "Overwrite",     "Replace silently"],
                 ["skip",      "Skip existing", "Leave untouched"],
            ] as [ConflictResolution, string, string][]).map(([value, label, hint], i, arr) => {
              const active = settings.conflictResolution === value;
              return (
                <button key={value}
                  onClick={() => updateSettings({ conflictResolution: value })}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                  style={{
                    background: active ? "var(--color-accent-dim)" : "var(--color-panel)",
                    borderBottom: i < arr.length - 1 ? "1px solid var(--color-border-light)" : "none",
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--color-panel-hover)"; }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "var(--color-panel)"; }}
                >
                  <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-all"
                    style={{ border: `2px solid ${active ? "var(--color-accent)" : "var(--color-border)"}` }}>
                    {active && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-accent)" }} />}
                  </div>
                  <div>
                    <span className="text-[12px] font-medium" style={{ color: active ? "var(--color-text)" : "var(--color-text-muted)" }}>
                      {label}
                    </span>
                    <span className="text-[10px] ml-1.5" style={{ color: "var(--color-text-subtle)" }}>{hint}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Group>


        <Group label="Conversion">
          <SliderRow icon={<Shield size={11} />} label="Default quality"
            value={settings.defaultQuality} min={10} max={100} step={5}
            display={`${settings.defaultQuality}`}
            onChange={(v) => updateSettings({ defaultQuality: v })} />
          <SliderRow icon={<Cpu size={11} />} label="Parallel jobs"
            value={settings.maxParallelJobs} min={1} max={8} step={1}
            display={`${settings.maxParallelJobs}×`}
            onChange={(v) => updateSettings({ maxParallelJobs: v })} />
          <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}>
            <div className="flex items-center gap-2">
              <Shield size={11} style={{ color: "var(--color-text-subtle)" }} />
              <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>Strip metadata by default</span>
            </div>
            <Toggle value={settings.stripMetadataDefault}
              onChange={(v) => updateSettings({ stripMetadataDefault: v })} />
          </div>
        </Group>


      </div>


      <div className="px-3 py-3 shrink-0" style={{ borderTop: "1px solid var(--color-border)" }}>
        <button onClick={handleSave}
          className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all"
          style={{ background: "var(--color-accent)", color: "#fff", boxShadow: "0 0 20px var(--color-accent-glow)" }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
        >
          Save Settings
        </button>
      </div>
    </motion.div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest px-1"
        style={{ color: "var(--color-text-subtle)" }}>{label}</p>
      {children}
    </div>
  );
}

function SliderRow({ icon, label, value, min, max, step, display, onChange }: {
  icon: React.ReactNode; label: string; value: number;
  min: number; max: number; step: number; display: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="px-3 py-2.5 rounded-xl flex flex-col gap-2"
      style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--color-text-subtle)" }}>{icon}</span>
          <span className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>{label}</span>
        </div>
        <span className="text-[12px] font-semibold tabular-nums" style={{ color: "var(--color-accent)" }}>{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{ accentColor: "var(--color-accent)" }}
      />
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className="relative rounded-full transition-all duration-200 shrink-0"
      style={{
        width: 36, height: 20,
        background: value ? "var(--color-accent)" : "var(--color-panel-strong)",
        border: `1px solid ${value ? "var(--color-accent)" : "var(--color-border)"}`,
        boxShadow: value ? "0 0 10px var(--color-accent-glow)" : "none",
      }}
    >
      <span className="absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all duration-200"
        style={{ background: "#fff", left: value ? "calc(100% - 16px)" : "2px", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
      />
    </button>
  );
}
