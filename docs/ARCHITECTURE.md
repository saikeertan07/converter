# Converter Architecture & Systems Engineering

## Overview
Converter is designed with zero-trust privacy and zero server dependencies. All operations are sandboxed in the client browser.

### In-Memory Pipeline
1. **File Ingest**: Uses `FileReader` and `Blob.arrayBuffer()` to load binaries into TypedArrays.
2. **Format Detection**: Analyzes leading binary magic bytes:
   - PNG: `89 50 4E 47 0D 0A 1A 0A`
   - JPEG: `FF D8 FF`
   - PDF: `25 50 44 46` (`%PDF-`)
   - HEIC: `ftypheic` / `ftypmif1`
3. **Canvas 2D Acceleration**: Uses hardware-accelerated OffscreenCanvas where available for high-throughput image scaling and colorspace conversion.
4. **Blob Lifecycle Management**: Explicitly cleans up blob object URLs to prevent browser heap exhaustion during large batch exports.
