import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  ConversionJob,
  FileEntry,
  Preset,
  SidecarStatus,
} from "../types/conversion";

export const detectFiles = (paths: string[]): Promise<FileEntry[]> =>
  invoke("detect_files", { paths });

export const listPresets = (): Promise<Preset[]> =>
  invoke("list_presets");

export const startJob = (job: ConversionJob): Promise<string> =>
  invoke("start_job", { job });

export const cancelJob = (jobId: string): Promise<void> =>
  invoke("cancel_job", { jobId });

export const revealFile = (path: string): Promise<void> =>
  invoke("reveal_file", { path });

export const openUrl = (url: string): Promise<void> =>
  invoke("open_url", { url });

export const loadSettings = (): Promise<AppSettings> =>
  invoke("load_settings");

export const saveSettings = (cfg: AppSettings): Promise<void> =>
  invoke("save_settings", { cfg });

export const checkSidecars = (): Promise<SidecarStatus> =>
  invoke("check_sidecars");
