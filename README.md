<p align="center">
  <img src="assets/aether-logo.png" alt="Aether Logo" width="110" />
</p>

<h1 align="center">Aether</h1>

<p align="center">
  An aesthetic, GPU-accelerated Windows terminal for CMD &amp; PowerShell with custom themes, live Git branch tracking, smart cross-drive <code>cd</code>, and native File Explorer integration.
</p>

---

## Features

- **Real Windows Shells** — Runs interactive `cmd.exe` and `powershell.exe` sessions over Windows ConPTY (`node-pty`) with full ANSI truecolor, tab completion, and command history.
- **4 Built-In Aesthetic Themes** — Switch live between **Obsidian Glass**, **Tokyo Night**, **Cyberpunk Neon**, and **Retro CRT** (with toggleable scanlines & phosphor glow).
- **Live Appearance Customizer** — Tune font family, font size, line height, cursor style/blink, window opacity, solid opaque mode (disable transparency), and default shell profile. All settings persist automatically.
- **Git Bash-Style Branch Tracking** — Automatically displays `(branch)` when clean and `(branch *)` when dirty in both CMD and PowerShell prompts, plus a live per-tab Git branch pill in the bottom status bar.
- **Smarter `cd` in CMD** — Fixes Windows CMD's cross-drive limitation (`cd D:\Projects` just works without `/d`) and adds `cd ~`, `cd ~/Desktop`, `cd -` (previous directory), and `clear`.
- **GPU & Inline Graphics Ready** — Powered by `xterm.js` with WebGL hardware acceleration (`customGlyphs` for seamless Unicode block logos) and Sixel / iTerm2 inline image support.
- **File Explorer Integration** — Right-click any folder, folder background, or drive to **Open in Aether**, or type `aether` directly in File Explorer's address bar to launch in that folder.
- **Flagship Quality of Life** — Multi-tab support with clean sanitized tab titles, floating `Ctrl+F` search bar, searchable `?` Command Reference modal, middle-click tab close, and copy toast notifications.

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + T` | New tab (default profile) |
| `Ctrl + Shift + T` | New tab (alternate shell) |
| `Ctrl + W` | Close active tab *(or middle-click tab)* |
| `Ctrl + Tab` / `Ctrl + 1–9` | Switch between tabs |
| `Ctrl + F` | Find in terminal output |
| `Ctrl + L` | Clear terminal screen |
| `Ctrl + ,` | Open Appearance & Settings drawer |
| `Ctrl + /` or `F1` | Open Command Reference (`?`) |
| `Ctrl + Shift + C` / `V` | Copy / Paste *(or right-click)* |
| `Ctrl + =` / `-` / `0` | Zoom font size in / out / reset |

---

## Getting Started

### Install via Windows Installer
Download and run **`Aether Setup`** from Releases.  
The installer automatically registers:
- **"Open in Aether"** in File Explorer's right-click menu
- The `aether` command in File Explorer's address bar, `Win + R`, and user `PATH`
- Desktop and Start Menu shortcuts

---

## Tech Stack

- **Runtime**: [Electron](https://www.electronjs.org/)
- **Terminal Emulator**: [xterm.js](https://xtermjs.org/) (`@xterm/addon-webgl`, `@xterm/addon-image`, `@xterm/addon-fit`, `@xterm/addon-search`, `@xterm/addon-web-links`)
- **PTY Backend**: [node-pty](https://github.com/microsoft/node-pty) with bundled Windows ConPTY (`conpty.dll` + `OpenConsole.exe`)
- **Packaging**: [electron-builder](https://www.electron.build/) (NSIS Windows installer)

---

## Project Structure

```text
├── assets/                   # Aether app icon (.png & .ico)
├── build/
│   └── installer.nsh         # NSIS hooks for File Explorer menu & PATH
├── src/
│   ├── main.js               # Electron main process & PTY lifecycle
│   ├── preload.js            # Context-isolated IPC bridge
│   ├── explorer-integration.js # Launch CWD resolution & HKCU registry helpers
│   ├── renderer/             # UI (index.html, styles.css, themes.js, app.js)
│   └── shell/                # CMD & PowerShell init, smart cd, Git prompt hooks
└── tests/
    └── verify.js             # Automated end-to-end verification suite
```

---

## License

MIT
