export type Format =
  | "jpeg" | "png" | "web_p" | "heic" | "avif" | "tiff" | "bmp" | "svg" | "raw"
  | "pdf" | "docx" | "doc" | "xlsx" | "xls" | "pptx" | "ppt" | "odt"
  | "markdown" | "epub" | "html" | "txt"
  | "csv" | "json";

export type FormatCategory = "image" | "document" | "data";
export type FileStatus = "pending" | "converting" | "done" | "failed" | "skipped";
export type JobStatus = "pending" | "running" | "done" | "failed" | "cancelled";
export type ConflictResolution = "rename" | "overwrite" | "skip";

export interface FileEntry {
  id: string;
  path: string;
  name: string;
  size: number;
  detectedFormat: Format | null;
}

export interface OutputTarget {
  id: string;
  format: Format;
  quality: number;
  maxDimension: number | null;
  stripMetadata: boolean;
  outputDir: string | null;
}

export interface ConversionJob {
  id: string;
  files: FileEntry[];
  outputTargets: OutputTarget[];
  conflictResolution: ConflictResolution;
  status: JobStatus;
}

export interface Preset {
  id: string;
  name: string;
  targetFormat: Format;
  quality: number;
  maxDimension: number | null;
  stripMetadata: boolean;
  builtin: boolean;
}

export interface ProgressEvent {
  jobId: string;
  fileId: string;
  targetId: string;
  fileIndex: number;
  fileTotal: number;
  targetIndex: number;
  targetTotal: number;
  status: FileStatus;
  outputPath: string | null;
  error: string | null;
}

export interface ConversionState {
  status: FileStatus;
  outputPath: string | null;
  error: string | null;
}

export interface FileState extends FileEntry {
  conversions: Record<string, ConversionState>;
  targets: OutputTarget[];
}

export interface SidecarStatus {
  pandoc: boolean;
  soffice: boolean;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  fileName: string;
  sourcePath: string;
  detectedFormat: Format | null;
  targetFormat: Format;
  outputPath: string | null;
  status: "done" | "failed" | "skipped";
  error: string | null;
}

export interface AppSettings {
  defaultOutputDir: string | null;
  stripMetadataDefault: boolean;
  maxParallelJobs: number;
  conflictResolution: ConflictResolution;
  theme: "system" | "dark" | "light";
  defaultQuality: number;
}
