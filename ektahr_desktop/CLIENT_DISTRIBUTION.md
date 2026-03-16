# EktaHR Desktop Agent – Client distribution

The agent is built as a **single .exe** (self-contained, no .NET install required) with **all features** (attendance, screenshots, Tesseract OCR, SQLite, etc.). No features are removed.

## What to share with clients

Share **one file**:

| Artifact | Use case |
|----------|----------|
| **`output\EktaHR-Agent.exe`** | Single executable. Clients run it directly (no zip, no extra files). |
| **`output\EktaHR-Agent-Setup.exe`** | Optional: installer (desktop/startup shortcuts, uninstall). Run `build-and-package.ps1`. |

The single exe is produced by both build scripts.

## How to build (single .exe)

From repo root:

```powershell
cd ektahr_desktop
.\build-agent.ps1
```

Output: **`ektahr_desktop\output\EktaHR-Agent.exe`** — share this one file with clients.

With installer (requires Inno Setup 6):

```powershell
.\build-and-package.ps1
```

Output: **`output\EktaHR-Agent.exe`** (single exe to share) and **`output\EktaHR-Agent-Setup.exe`** (installer).

## Single-file behavior (no feature loss)

- **One exe:** All managed code, native SQLite, and Tesseract tessdata are bundled; they extract at runtime to a temp folder. Clients only need the one .exe.
- **InvariantGlobalization:** Culture DLLs omitted for smaller size.
- **Self-contained:** Clients do not need to install .NET.

## Client usage

- **Single exe:** Send `EktaHR-Agent.exe`. Client double-clicks to run. No install, no unzip.
- **Installer:** Run `EktaHR-Agent-Setup.exe` for shortcuts and “Run at Windows startup”.
