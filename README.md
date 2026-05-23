<img src="src/assets/logo.png" width="64" alt="ZConvert" />

# ZConvert

**Privacy-first, local-only batch file converter** — no uploads, no accounts, no telemetry. All conversion happens on your machine.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Version](https://img.shields.io/badge/version-0.1.0-informational)]()
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)]()

---

## What it does

Drop files in. Pick output formats per file. Convert. That's it.

ZConvert handles images, documents, and data formats with built-in metadata stripping — useful for removing GPS/EXIF data before sharing photos, or sanitising documents before sending them externally.

---

## Features

- **Batch conversion** — drop multiple files, assign different output formats to each
- **Per-file output targets** — each file can produce multiple output formats simultaneously
- **Per-file output directory** — save each file's output to a different location if needed
- **Metadata stripping** — strips EXIF/GPS/timestamps from images and PDF metadata from documents
- **Preset system** — save reusable format + quality + strip combinations
- **Format auto-detection** — magic-byte detection, not just extension guessing
- **Conversion history** — searchable log of past jobs
- **Fully offline** — zero network calls, no cloud dependency
- **Cross-platform** — Windows, macOS, Linux

---

## Supported Formats

### Images
| Source | Output |
|--------|--------|
| JPEG | PNG, WebP, AVIF, TIFF, BMP |
| PNG | JPEG, WebP, AVIF, TIFF, BMP |
| WebP | JPEG, PNG, AVIF, TIFF |
| AVIF | JPEG, PNG, WebP, TIFF |
| TIFF | JPEG, PNG, WebP, AVIF, BMP |
| BMP | JPEG, PNG, WebP, TIFF |
| SVG | PNG, JPEG, WebP |
| HEIC | JPEG, PNG, WebP, TIFF |
| RAW (NEF, CR2, DNG, ARW) | JPEG, PNG, TIFF |

### Documents
| Source | Output |
|--------|--------|
| Markdown | HTML, TXT, DOCX, PDF |
| HTML | Markdown, DOCX, PDF, TXT |
| DOCX | PDF, ODT, HTML, TXT |
| ODT | PDF, DOCX, HTML |
| EPUB | PDF, DOCX, HTML |
| PDF | DOCX, ODT, HTML, TXT |
| XLSX / XLS | CSV, JSON |
| TXT | HTML, Markdown, DOCX |

### Data
| Source | Output |
|--------|--------|
| CSV | JSON |
| JSON | CSV |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 19, TypeScript, Tailwind CSS v4, Motion |
| State | Zustand |
| Shell | Tauri v2 (Rust core) |
| Image | `image`, `ravif`, `libheif-rs`, `rawler`, `resvg` |
| Documents | Pandoc (sidecar), LibreOffice headless (sidecar) |
| Metadata | `little_exif`, `lopdf` |
| Data | `calamine`, `csv`, `serde_json` |
| Async | Tokio, Rayon |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 8+
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Install dependencies

```bash
pnpm install
```

### Fetch sidecar binaries

Pandoc and LibreOffice headless are bundled as platform-specific sidecars. Download them with:

```bash
pnpm fetch-sidecars
```

This downloads pinned builds for all target triples into `src-tauri/binaries/` and verifies SHA-256 checksums.

### Development

```bash
pnpm tauri dev
```

### Build (production)

```bash
pnpm tauri build
```

Produces platform installers in `src-tauri/target/release/bundle/`:
- **Windows** — NSIS `.exe` installer
- **macOS** — `.dmg`
- **Linux** — `.AppImage`, `.deb`

---

## Project Structure

```
ZConvert/
├── src/                        # React UI
│   ├── components/             # UI components
│   ├── store/jobStore.ts       # Zustand state
│   ├── ipc/                    # Typed Tauri IPC wrappers
│   ├── lib/formats.ts          # Format catalog + compatibility map
│   └── types/conversion.ts     # Shared types (mirrors Rust structs)
├── src-tauri/
│   ├── binaries/               # Pandoc + LibreOffice sidecars (per platform)
│   ├── icons/                  # App icons (all sizes)
│   └── src/
│       ├── commands.rs         # Tauri command surface
│       ├── detect.rs           # Magic-byte format detection
│       ├── converters/         # Per-format conversion pipelines
│       │   ├── image.rs
│       │   ├── document.rs
│       │   ├── data.rs
│       │   └── metadata.rs
│       └── sidecar.rs          # Pandoc / soffice invocation
└── scripts/
    └── fetch-sidecars.ts       # Sidecar download + verify script
```

---

## Privacy

ZConvert makes **no network requests**. There is no telemetry, no update check, no analytics. Sidecar binaries run locally with no outbound access. You can verify this with a firewall or network monitor while running conversions.

---

## License

[GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0) — see [LICENSE](LICENSE) for details.

---

## Author

**TheHolyOneZ**

- GitHub: [github.com/TheHolyOneZ](https://github.com/TheHolyOneZ)
- Projects: [zsync.eu](https://zsync.eu)

## Links

- Repository: [github.com/TheHolyOneZ/ZConvert](https://github.com/TheHolyOneZ/ZConvert)
- Website / Download: [zsync.eu/zconvert](https://zsync.eu/zconvert/)
