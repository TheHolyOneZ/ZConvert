#!/usr/bin/env tsx
/**
 * Downloads and verifies Pandoc sidecar binaries for each target triple.
 * Run: pnpm fetch-sidecars
 *
 * LibreOffice note: soffice is typically too large to bundle directly (~300 MB).
 * For production builds, install LibreOffice on the target system or create a
 * platform-specific installer that includes it. The soffice sidecar entry in
 * tauri.conf.json is used when a wrapper script (thin launcher) is provided.
 *
 * Pandoc is ~12–18 MB and can be bundled directly.
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PANDOC_VERSION = "3.6.4";

interface SidecarTarget {
  triple: string;
  url: string;
  sha256: string;
  archiveType: "zip" | "tar.gz";
  pandocBin: string;
}

const PANDOC_TARGETS: SidecarTarget[] = [
  {
    triple: "x86_64-pc-windows-msvc",
    url: `https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-windows-x86_64.zip`,
    sha256: "REPLACE_WITH_ACTUAL_SHA256",
    archiveType: "zip",
    pandocBin: "pandoc.exe",
  },
  {
    triple: "x86_64-unknown-linux-gnu",
    url: `https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-linux-amd64.tar.gz`,
    sha256: "REPLACE_WITH_ACTUAL_SHA256",
    archiveType: "tar.gz",
    pandocBin: "pandoc",
  },
  {
    triple: "aarch64-apple-darwin",
    url: `https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-arm64-macOS.zip`,
    sha256: "REPLACE_WITH_ACTUAL_SHA256",
    archiveType: "zip",
    pandocBin: "pandoc",
  },
  {
    triple: "x86_64-apple-darwin",
    url: `https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-x86_64-macOS.zip`,
    sha256: "REPLACE_WITH_ACTUAL_SHA256",
    archiveType: "zip",
    pandocBin: "pandoc",
  },
];

const BIN_DIR = path.resolve(__dirname, "../src-tauri/binaries");
fs.mkdirSync(BIN_DIR, { recursive: true });

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`  Downloading ${url.split("/").pop()}...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await pipeline(res.body as any, createWriteStream(dest));
}

function sha256File(file: string): string {
  const data = fs.readFileSync(file);
  return crypto.createHash("sha256").update(data).digest("hex");
}

async function main() {
  // Detect current triple so we only fetch the host binary in dev
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  const platform =
    process.platform === "win32"
      ? "pc-windows-msvc"
      : process.platform === "darwin"
      ? "apple-darwin"
      : "unknown-linux-gnu";
  const hostTriple = `${arch}-${platform}`;

  const targets = process.argv.includes("--all")
    ? PANDOC_TARGETS
    : PANDOC_TARGETS.filter((t) => t.triple === hostTriple);

  for (const target of targets) {
    const destName = `pandoc-${target.triple}${target.triple.includes("windows") ? ".exe" : ""}`;
    const dest = path.join(BIN_DIR, destName);

    if (fs.existsSync(dest)) {
      console.log(`✓ ${destName} already present`);
      continue;
    }

    console.log(`\nFetching pandoc for ${target.triple}...`);
    const archivePath = path.join(BIN_DIR, `_pandoc-${target.triple}.archive`);

    try {
      await downloadFile(target.url, archivePath);

      // Skip SHA check if placeholder hash is set
      if (!target.sha256.startsWith("REPLACE")) {
        const actual = sha256File(archivePath);
        if (actual !== target.sha256) {
          throw new Error(`SHA256 mismatch for ${target.triple}: got ${actual}`);
        }
      }

      // Extract the binary
      if (target.archiveType === "zip") {
        const { execSync } = await import("child_process");
        const tmpDir = path.join(BIN_DIR, "_extract_tmp");
        fs.mkdirSync(tmpDir, { recursive: true });
        execSync(`unzip -qo "${archivePath}" -d "${tmpDir}"`);
        const extracted = findFile(tmpDir, target.pandocBin);
        if (!extracted) throw new Error(`Could not find ${target.pandocBin} in archive`);
        fs.renameSync(extracted, dest);
        fs.rmSync(tmpDir, { recursive: true });
      } else {
        const { execSync } = await import("child_process");
        execSync(`tar -xzf "${archivePath}" -C "${BIN_DIR}" --wildcards "*/${target.pandocBin}" --strip-components=2`);
        const extracted = path.join(BIN_DIR, target.pandocBin);
        if (fs.existsSync(extracted)) fs.renameSync(extracted, dest);
      }

      if (!target.triple.includes("windows")) {
        fs.chmodSync(dest, 0o755);
      }

      console.log(`  ✓ Written: ${destName}`);
    } finally {
      if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
    }
  }

  console.log("\nSidecar fetch complete.");
}

function findFile(dir: string, name: string): string | null {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findFile(full, name);
      if (found) return found;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

main().catch((err) => {
  console.error("fetch-sidecars failed:", err);
  process.exit(1);
});
