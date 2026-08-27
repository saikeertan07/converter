# Converter — High-Performance In-Browser Document & Media Engine ⚡

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero-Uploads](https://img.shields.io/badge/Privacy-100%25%20Client--Side-brightgreen.svg)](#privacy--security-model)
[![Engine](https://img.shields.io/badge/Stack-Vanilla%20ES6%20%7C%20Canvas%202D%20%7C%20PDF--Lib-orange.svg)](#technical-architecture)
[![Test Suite](https://img.shields.io/badge/Tests-Passed%20(100%25)-success.svg)](#test-suite--qa)

> **Converter** is an enterprise-grade, privacy-first document and media transformation workstation that executes 100% inside the user's browser. It processes images, rasterizes multi-page PDFs, re-encodes formats, merges, splits, and synthesizes documents without a single byte ever touching a remote server.

---

## 🌟 Key Engineering Capabilities

* **🔒 100% Air-Gapped Client-Side Processing**: Zero network transmission of user files. All decoding, pixel transforms, vector drawing, and encoding occur entirely in client RAM via the HTML5 File API, OffscreenCanvas, and WebAssembly modules.
* **🖼️ Multi-Format Image Pipeline**: Bidirectional conversions across **JPG, PNG, WEBP, AVIF, BMP, GIF, SVG, and HEIC/HEIF** with configurable quality factors, chroma subsampling parameters, and EXIF orientation normalization.
* **📄 Vector & Document Manipulation**:
  - **Images → PDF**: High-resolution vector synthesis, multi-image pagination, DPI scaling, and aspect-ratio preservation via jsPDF & pdf-lib.
  - **PDF → Images**: Sub-pixel rasterization of PDF viewports to lossless PNG or optimized JPG zip bundles using Mozilla PDF.js.
  - **PDF Merge & Split**: Non-destructive stream manipulation, page reordering, chapter extraction, and document deduplication.
* **⚡ High-Throughput Memory Hygiene**: Automatic Blob URL revocation (`URL.revokeObjectURL`) to eliminate memory leaks during bulk batches (100+ files).
* **🎨 Modern Responsive Interface**: Glassmorphism UI with CSS grid layout, dark mode by default, drag-and-drop batch queue, and live preview rendering.

---

## 📐 Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                         │
│                                                             │
│   ┌──────────────────┐          ┌───────────────────────┐   │
│   │  User Dropzone   │ ───────> │   File Type Sniffer   │   │
│   └──────────────────┘          └───────────┬───────────┘   │
│                                             │               │
│                     ┌───────────────────────┴──────────┐    │
│                     ▼                                  ▼    │
│          ┌──────────────────────┐           ┌───────────────────┐
│          │   Raster Pipeline    │           │  Vector / PDF     │
│          │  (Canvas2D / WASM)   │           │ (PDF.js / pdf-lib)│
│          └──────────┬───────────┘           └──────────┬────────┘
│                     │                                  │    │
│                     ▼                                  ▼    │
│          ┌──────────────────────────────────────────────┐   │
│          │    In-Memory ArrayBuffer / Blob Assembly     │   │
│          └──────────────────────┬───────────────────────┘   │
│                                 │                           │
│                                 ▼                           │
│          ┌──────────────────────────────────────────────┐   │
│          │      Zero-Latency Direct Client Download     │   │
│          └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Local Development
```bash
# Clone the repository
git clone https://github.com/saikeertan07/converter.git
cd converter

# Serve locally with any static web server
npx serve .
# Or with Python
python3 -m http.server 8080
```

Open your browser at `http://localhost:8080`.

---

## 🧪 Test Suite & QA

```bash
# Run unit and integration tests
npm test
```

* `tests/conversion_matrix.test.js`: Verifies file signature detection (magic bytes) and format transformation matrices.
* `tests/security_sandbox.test.js`: Validates CSP compliance, memory zeroing, and blob lifecycle disposal.

---

## 📄 License
This project is licensed under the [MIT License](LICENSE) © 2026 Sai Keertan.
