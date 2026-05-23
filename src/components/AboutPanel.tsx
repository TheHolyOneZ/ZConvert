import { Github, Globe, Scale, ArrowUpRight, Code2, Layers, FileJson, FileImage, FileText } from "lucide-react";
import Logo from "./Logo";
import { openUrl } from "../ipc/commands";

const TECH = [
  { icon: <Code2 size={11} />,    label: "Rust + Tauri 2",   desc: "Native core, IPC, file system" },
  { icon: <Layers size={11} />,   label: "React + TypeScript", desc: "UI, Zustand state, motion" },
  { icon: <FileImage size={11} />,label: "image / ravif / resvg", desc: "Image conversion pipeline" },
  { icon: <FileJson size={11} />, label: "serde / csv / calamine", desc: "Data format handling" },
  { icon: <FileText size={11} />, label: "pulldown-cmark",    desc: "Markdown → HTML / TXT" },
];

const CAPABILITIES = [
  "Batch convert images between JPEG, PNG, WebP, AVIF, TIFF, BMP, SVG",
  "Convert data files between CSV and JSON",
  "Convert Markdown to HTML and plain text",
  "Per-file output format and destination folder",
  "EXIF / GPS metadata stripping",
  "Conflict resolution: rename, overwrite, or skip",
  "Conversion history with reveal-in-folder",
  "Built-in test suite to verify all conversion paths",
  "100 % offline — no data ever leaves your machine",
];

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <button
      onClick={() => openUrl(href)}
      className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all duration-150"
      style={{ color: "var(--color-text-muted)", background: "var(--color-panel)", border: "1px solid var(--color-border-light)", cursor: "pointer" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-panel-hover)";
        e.currentTarget.style.borderColor = "rgba(99,102,241,0.35)";
        e.currentTarget.style.color = "var(--color-text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "var(--color-panel)";
        e.currentTarget.style.borderColor = "var(--color-border-light)";
        e.currentTarget.style.color = "var(--color-text-muted)";
      }}
    >
      {children}
      <ArrowUpRight size={10} style={{ opacity: 0.5 }} />
    </button>
  );
}

export default function AboutPanel() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 shrink-0"
        style={{ borderBottom: "1px solid var(--color-border-light)" }}>
        <span className="text-xs font-semibold" style={{ color: "var(--color-text-muted)" }}>About</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 py-6 flex flex-col gap-6 max-w-lg">

          {/* Identity */}
          <div className="flex items-center gap-4">
            <Logo size={52} />
            <div>
              <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
                ZConvert
              </h1>
              <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
                Privacy-first local file converter
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "var(--color-panel-strong)", color: "var(--color-text-subtle)" }}>
                  GPL 3.0
                </span>
                <Scale size={10} style={{ color: "var(--color-text-subtle)" }} />
                <span className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>Open source</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="px-4 py-3.5 rounded-xl"
            style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}>
            <p className="text-[12px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>
              ZConvert is a fast, offline-only batch file converter built with Rust and Tauri.
              It runs entirely on your machine — no uploads, no telemetry, no internet required.
              Convert images, data files, and documents while keeping sensitive files completely private.
            </p>
          </div>

          {/* What it can do */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-1"
              style={{ color: "var(--color-text-subtle)" }}>Capabilities</p>
            <div className="flex flex-col gap-1">
              {CAPABILITIES.map((cap) => (
                <div key={cap} className="flex items-start gap-2 px-1 py-0.5">
                  <div className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                    style={{ background: "var(--color-accent)" }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{cap}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Tech stack */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-1"
              style={{ color: "var(--color-text-subtle)" }}>Tech Stack</p>
            <div className="flex flex-col gap-1">
              {TECH.map(({ icon, label, desc }) => (
                <div key={label} className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                  style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}>
                  <span style={{ color: "var(--color-accent)" }}>{icon}</span>
                  <span className="text-[11px] font-medium" style={{ color: "var(--color-text)" }}>{label}</span>
                  <span className="text-[10px] ml-auto" style={{ color: "var(--color-text-subtle)" }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Author */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-1"
              style={{ color: "var(--color-text-subtle)" }}>Author</p>
            <div className="flex items-center justify-between px-3 py-3 rounded-xl"
              style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--color-text)" }}>TheHolyOneZ</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--color-text-subtle)" }}>
                  More projects at zsync.eu
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <ExternalLink href="https:
                  <Github size={11} /> GitHub
                </ExternalLink>
                <ExternalLink href="https://zsync.eu">
                  <Globe size={11} /> zsync.eu
                </ExternalLink>
              </div>
            </div>
          </div>


          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest px-1"
              style={{ color: "var(--color-text-subtle)" }}>Project</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}>
                <div>
                  <p className="text-[11px] font-medium" style={{ color: "var(--color-text)" }}>Source code</p>
                  <p className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>github.com/TheHolyOneZ/ZConvert</p>
                </div>
                <ExternalLink href="https://github.com/TheHolyOneZ/ZConvert">
                  <Github size={11} /> Repository
                </ExternalLink>
              </div>
              <div className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: "var(--color-panel)", border: "1px solid var(--color-border-light)" }}>
                <div>
                  <p className="text-[11px] font-medium" style={{ color: "var(--color-text)" }}>Download &amp; info</p>
                  <p className="text-[10px]" style={{ color: "var(--color-text-subtle)" }}>zsync.eu/zconvert</p>
                </div>
                <ExternalLink href="https://zsync.eu/zconvert/">
                  <Globe size={11} /> Website
                </ExternalLink>
              </div>
            </div>
          </div>


          <p className="text-[10px] text-center pb-2" style={{ color: "var(--color-text-subtle)" }}>
            ZConvert is free software licensed under the GNU General Public License v3.0
          </p>

        </div>
      </div>
    </div>
  );
}
