import { describe, it, expect } from "vitest";
import {
  ALL_FORMATS,
  getFormatInfo,
  formatFileSize,
  formatsByCategory,
} from "../lib/formats";
import type { Format } from "../types/conversion";


describe("ALL_FORMATS", () => {
  const EXPECTED_IDS: Format[] = [
    "jpeg", "png", "web_p", "avif", "heic", "tiff", "bmp", "svg", "raw",
    "pdf", "docx", "xlsx", "markdown", "html", "txt", "epub", "pptx", "odt",
    "csv", "json",
  ];

  it("contains all expected format ids", () => {
    const ids = new Set(ALL_FORMATS.map((f) => f.id));
    for (const id of EXPECTED_IDS) {
      expect(ids.has(id), `Missing format id: ${id}`).toBe(true);
    }
  });

  it("each entry has non-empty id, label, ext, category, description", () => {
    for (const f of ALL_FORMATS) {
      expect(f.id, `${f.id}.id empty`).toBeTruthy();
      expect(f.label, `${f.id}.label empty`).toBeTruthy();
      expect(f.ext, `${f.id}.ext empty`).toBeTruthy();
      expect(f.category, `${f.id}.category empty`).toBeTruthy();
      expect(f.description, `${f.id}.description empty`).toBeTruthy();
    }
  });

  it("every category is one of image | document | data", () => {
    const valid = new Set(["image", "document", "data"]);
    for (const f of ALL_FORMATS) {
      expect(valid.has(f.category), `${f.id} has invalid category: ${f.category}`).toBe(true);
    }
  });

  it("has no duplicate ids", () => {
    const ids = ALL_FORMATS.map((f) => f.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("has no duplicate extensions (raw shares 'tiff' with tiff — excluded)", () => {

    const ALLOWED_SHARED_EXT = new Set(["tiff"]);
    const seen = new Map<string, string>();
    for (const f of ALL_FORMATS) {
      if (ALLOWED_SHARED_EXT.has(f.ext)) continue;
      if (seen.has(f.ext)) {
        throw new Error(
          `Duplicate extension "${f.ext}" on both "${seen.get(f.ext)}" and "${f.id}"`
        );
      }
      seen.set(f.ext, f.id);
    }
  });
});


describe("getFormatInfo", () => {
  it('returns correct info for "jpeg"', () => {
    const info = getFormatInfo("jpeg");
    expect(info).toBeDefined();
    expect(info!.label).toBe("JPEG");
    expect(info!.ext).toBe("jpg");
    expect(info!.category).toBe("image");
  });

  it('returns correct info for "web_p"', () => {
    const info = getFormatInfo("web_p");
    expect(info).toBeDefined();
    expect(info!.label).toBe("WebP");
    expect(info!.ext).toBe("webp");
  });

  it('returns correct info for "csv"', () => {
    const info = getFormatInfo("csv");
    expect(info).toBeDefined();
    expect(info!.category).toBe("data");
  });

  it("returns undefined for unknown format", () => {

    const info = getFormatInfo("nonexistent_format" as Format);
    expect(info).toBeUndefined();
  });
});


describe("formatFileSize", () => {
  it("formats 0 bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("formats 512 bytes", () => {
    expect(formatFileSize(512)).toBe("512 B");
  });

  it("formats 1024 bytes as 1.0 KB", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
  });

  it("formats 1 MB", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
  });

  it("formats 1 GB starting with a number ending in ' GB'", () => {
    const result = formatFileSize(1024 * 1024 * 1024);
    expect(result).toMatch(/^\d.*GB$/);
  });

  it("formats 1.5 KB correctly", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats 2.5 MB correctly", () => {
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });
});


describe("formatsByCategory", () => {
  it('returns only image formats for "image"', () => {
    const results = formatsByCategory("image");
    expect(results.length).toBeGreaterThan(0);
    for (const f of results) {
      expect(f.category).toBe("image");
    }
  });

  it('returns csv and json for "data"', () => {
    const results = formatsByCategory("data");
    const ids = results.map((f) => f.id);
    expect(ids).toContain("csv");
    expect(ids).toContain("json");
  });

  it('returns only data formats for "data"', () => {
    const results = formatsByCategory("data");
    for (const f of results) {
      expect(f.category).toBe("data");
    }
  });

  it('returns document formats for "document"', () => {
    const results = formatsByCategory("document");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((f) => f.id);
    expect(ids).toContain("pdf");
    expect(ids).toContain("markdown");
    expect(ids).toContain("html");
  });
});
