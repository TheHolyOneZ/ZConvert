import { create } from "zustand";
import type {
  AppSettings,
  ConversionState,
  FileState,
  Format,
  HistoryEntry,
  OutputTarget,
  Preset,
} from "../types/conversion";
import { CONVERTIBLE_TO } from "../lib/formats";

export type AppPanel = "convert" | "settings" | "history" | "test" | "about";

export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  action?: { label: string; onClick: () => void };
}

interface JobStore {
  view: "drop" | "list";
  panel: AppPanel;
  files: FileState[];
  presets: Preset[];
  activeJobId: string | null;
  pendingBatchJobs: number;
  settings: AppSettings;
  toasts: Toast[];
  history: HistoryEntry[];

  setView: (v: "drop" | "list") => void;
  setPanel: (p: AppPanel) => void;

  addFiles: (files: FileState[]) => void;
  clearFiles: () => void;
  removeFile: (id: string) => void;

  toggleFileTarget: (fileId: string, format: Format) => void;
  setFileOutputDir: (fileId: string, dir: string | null) => void;

  setPresets: (p: Preset[]) => void;
  applyPreset: (preset: Preset) => void;

  setActiveJobId: (id: string | null) => void;
  startBatch: (prefix: string, count: number) => void;
  oneBatchJobDone: () => boolean;
  updateConversion: (fileId: string, targetId: string, update: Partial<ConversionState>) => void;

  updateSettings: (s: Partial<AppSettings>) => void;
  addToast: (t: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  addHistoryEntries: (entries: HistoryEntry[]) => void;
  clearHistory: () => void;
}

let toastSeq = 0;

const DEFAULT_SETTINGS: AppSettings = {
  defaultOutputDir: null,
  stripMetadataDefault: true,
  maxParallelJobs: 4,
  conflictResolution: "rename",
  theme: "system",
  defaultQuality: 85,
};

export const useJobStore = create<JobStore>((set, get) => ({
  view: "drop",
  panel: "convert",
  files: [],
  presets: [],
  activeJobId: null,
  pendingBatchJobs: 0,
  settings: DEFAULT_SETTINGS,
  toasts: [],
  history: [],

  setView: (view) => set({ view }),
  setPanel: (panel) => set({ panel }),

  addFiles: (incoming) =>
    set((s) => {
      const existing = new Set(s.files.map((f) => f.path));
      const fresh = incoming.filter((f) => !existing.has(f.path));
      if (fresh.length === 0) return {};
      return { files: [...s.files, ...fresh], view: "list" as const };
    }),

  clearFiles: () => set({ files: [], view: "drop", activeJobId: null, pendingBatchJobs: 0 }),

  removeFile: (id) =>
    set((s) => {
      const files = s.files.filter((f) => f.id !== id);
      return { files, view: files.length === 0 ? ("drop" as const) : s.view };
    }),

  toggleFileTarget: (fileId, format) =>
    set((s) => {
      const settings = s.settings;
      return {
        files: s.files.map((f) => {
          if (f.id !== fileId) return f;
          const existing = f.targets.findIndex((t) => t.format === format);
          if (existing >= 0) {
            return { ...f, targets: f.targets.filter((_, i) => i !== existing) };
          }
          const newTarget: OutputTarget = {
            id: crypto.randomUUID(),
            format,
            quality: settings.defaultQuality,
            maxDimension: null,
            stripMetadata: settings.stripMetadataDefault,
            outputDir: settings.defaultOutputDir,
          };
          return { ...f, targets: [...f.targets, newTarget] };
        }),
      };
    }),

  setFileOutputDir: (fileId, dir) =>
    set((s) => ({
      files: s.files.map((f) => {
        if (f.id !== fileId) return f;
        return { ...f, targets: f.targets.map((t) => ({ ...t, outputDir: dir })) };
      }),
    })),

  setPresets: (presets) => set({ presets }),

  applyPreset: (preset) => {
    set((s) => ({
      files: s.files.map((f) => {
        if (!f.detectedFormat) return f;
        const compatible = CONVERTIBLE_TO[f.detectedFormat] ?? [];
        if (!compatible.includes(preset.targetFormat)) return f;
        if (f.targets.some((t) => t.format === preset.targetFormat)) return f;
        const target: OutputTarget = {
          id: crypto.randomUUID(),
          format: preset.targetFormat,
          quality: preset.quality,
          maxDimension: preset.maxDimension,
          stripMetadata: preset.stripMetadata,
          outputDir: s.settings.defaultOutputDir,
        };
        return { ...f, targets: [...f.targets, target] };
      }),
    }));
  },

  setActiveJobId: (activeJobId) => set({ activeJobId }),

  startBatch: (prefix, count) =>
    set({ activeJobId: prefix, pendingBatchJobs: count }),

  oneBatchJobDone: () => {
    const pending = get().pendingBatchJobs - 1;
    if (pending <= 0) {
      set({ pendingBatchJobs: 0, activeJobId: null });
      return true;
    }
    set({ pendingBatchJobs: pending });
    return false;
  },

  updateConversion: (fileId, targetId, update) =>
    set((s) => ({
      files: s.files.map((f) => {
        if (f.id !== fileId) return f;
        const prev = f.conversions[targetId] ?? { status: "pending", outputPath: null, error: null };
        return { ...f, conversions: { ...f.conversions, [targetId]: { ...prev, ...update } } };
      }),
    })),

  updateSettings: (s) => set((store) => ({ settings: { ...store.settings, ...s } })),

  addToast: (t) =>
    set((s) => ({ toasts: [...s.toasts, { ...t, id: String(toastSeq++) }] })),

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  addHistoryEntries: (entries) =>
    set((s) => ({ history: [...entries, ...s.history].slice(0, 500) })),

  clearHistory: () => set({ history: [] }),
}));
