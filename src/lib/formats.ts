import type { Format, FormatCategory } from "../types/conversion";

export interface FormatInfo {
  id: Format;
  label: string;
  ext: string;
  category: FormatCategory;
  description: string;
}

export const ALL_FORMATS: FormatInfo[] = [

  { id: "jpeg",     label: "JPEG",     ext: "jpg",  category: "image",    description: "Universal photo format" },
  { id: "png",      label: "PNG",      ext: "png",  category: "image",    description: "Lossless with transparency" },
  { id: "web_p",    label: "WebP",     ext: "webp", category: "image",    description: "Modern web format" },
  { id: "avif",     label: "AVIF",     ext: "avif", category: "image",    description: "High-efficiency modern format" },
  { id: "heic",     label: "HEIC",     ext: "heic", category: "image",    description: "Apple high-efficiency format" },
  { id: "tiff",     label: "TIFF",     ext: "tiff", category: "image",    description: "Lossless archival format" },
  { id: "bmp",      label: "BMP",      ext: "bmp",  category: "image",    description: "Uncompressed bitmap" },
  { id: "svg",      label: "SVG",      ext: "svg",  category: "image",    description: "Scalable vector format" },
  { id: "raw",      label: "RAW",      ext: "tiff", category: "image",    description: "Camera RAW → TIFF/JPEG" },

  { id: "pdf",      label: "PDF",      ext: "pdf",  category: "document", description: "Portable document format" },
  { id: "docx",     label: "DOCX",     ext: "docx", category: "document", description: "Microsoft Word" },
  { id: "xlsx",     label: "XLSX",     ext: "xlsx", category: "document", description: "Microsoft Excel" },
  { id: "pptx",     label: "PPTX",     ext: "pptx", category: "document", description: "Microsoft PowerPoint" },
  { id: "odt",      label: "ODT",      ext: "odt",  category: "document", description: "OpenDocument text" },
  { id: "markdown", label: "Markdown", ext: "md",   category: "document", description: "Lightweight markup" },
  { id: "epub",     label: "EPUB",     ext: "epub", category: "document", description: "E-book format" },
  { id: "html",     label: "HTML",     ext: "html", category: "document", description: "Web markup" },
  { id: "txt",      label: "TXT",      ext: "txt",  category: "document", description: "Plain text" },

  { id: "csv",      label: "CSV",      ext: "csv",  category: "data",     description: "Comma-separated values" },
  { id: "json",     label: "JSON",     ext: "json", category: "data",     description: "Structured data" },
];

export const FORMAT_MAP = new Map<Format, FormatInfo>(
  ALL_FORMATS.map((f) => [f.id, f])
);

export function getFormatInfo(fmt: Format): FormatInfo | undefined {
  return FORMAT_MAP.get(fmt);
}

export function formatsByCategory(category: FormatCategory): FormatInfo[] {
  return ALL_FORMATS.filter((f) => f.category === category);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export const TARGET_FORMATS_FOR: Record<FormatCategory, Format[]> = {
  image: ["jpeg", "png", "web_p", "avif", "tiff", "bmp"],
  document: ["pdf", "docx", "html", "txt", "markdown", "odt", "epub"],
  data: ["csv", "json"],
};

export const CONVERTIBLE_TO: Partial<Record<Format, Format[]>> = {
  jpeg:     ["png", "web_p", "avif", "tiff", "bmp"],
  png:      ["jpeg", "web_p", "avif", "tiff", "bmp"],
  web_p:    ["jpeg", "png", "avif", "tiff"],
  tiff:     ["jpeg", "png", "web_p", "bmp"],
  bmp:      ["jpeg", "png", "web_p"],
  svg:      ["png", "jpeg", "web_p"],
  heic:     ["jpeg", "png", "web_p", "tiff"],
  raw:      ["jpeg", "tiff"],
  avif:     ["jpeg", "png", "web_p", "tiff"],
  csv:      ["json"],
  json:     ["csv"],
  markdown: ["html", "txt"],
  html:     ["txt"],
  pdf:      ["docx", "txt"],
  docx:     ["pdf", "html", "txt", "odt"],
  xlsx:     ["csv", "json"],
  xls:      ["csv", "json"],
};
