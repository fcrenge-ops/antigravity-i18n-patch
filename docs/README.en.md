# Antigravity i18n Localization Patch Suite

<p align="center">
  <a href="../README.md">简体中文</a> | <b>English</b> | <a href="README.zh-TW.md">繁體中文</a> | <a href="README.ja.md">日本語</a>
</p>

<p align="center">
  <a href="https://github.com/fcrenge-ops/antigravity-i18n-patch/actions/workflows/ci.yml"><img src="https://github.com/fcrenge-ops/antigravity-i18n-patch/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
  <a href="https://github.com/fcrenge-ops/antigravity-i18n-patch/releases"><img src="https://img.shields.io/github/v/release/fcrenge-ops/antigravity-i18n-patch?color=3388ff&label=Release" alt="Release"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <a href="https://github.com/fcrenge-ops/antigravity-i18n-patch/pulls"><img src="https://img.shields.io/badge/PRs-Welcome-brightgreen" alt="PRs Welcome"></a>
</p>

A high-compatibility, non-destructive, and cross-platform (Windows / macOS / Linux) multi-language internationalization (i18n) patch suite designed specifically for the **Google Antigravity 2.0** desktop client. It supports **interactive language selection during installation** (or headless specification via CLI flags) and provides a **zero-friction plug-and-play extension mechanism** for custom language packs.

---

## 🌟 Key Features

1. **Modular Multi-Language i18n Architecture**
   - Not limited to a single language. Built with a modular Language Pack architecture. Currently includes **Simplified Chinese (`zh-CN`, 2100+ entries)**, **Traditional Chinese (`zh-TW`)**, **Japanese (`ja-JP`)**, and an **English benchmark template (`en-US`)**.
2. **Interactive Language Selection at Install Time**
   - Running the installer automatically scans available language packs and renders an interactive terminal menu (hit Enter to choose the default language).
   - Also supports silent/headless installation via command-line arguments, e.g., `--lang ja-JP`, `--lang zh-TW`, or `-l zh-CN`.
3. **Plug-and-Play Extensibility**
   - Want to add a new language (e.g., French `fr-FR`, German `de-DE`, Korean `ko-KR`)? No core bundling code modifications required. Simply create a directory under `locales/` with your dictionary files, and the installer detects and lists it automatically!
4. **Cross-Platform Native Support (Windows / macOS / Linux)**
   - Powered by pure Node.js scripts that automatically detect official installation directories, process management, and ASAR archive structures across all operating systems.
5. **Dual-Track Injection Mechanism**
   - The localization engine is injected into `dist/preload.js` and reinforced with a fallback hook in `dist/utils.js` when windows are ready, completely eliminating language flickering during page reloads or view switching.
6. **Native System Menu & Tray Localization**
   - Electron's native top menus (File, Edit, View, Window, Help) and system tray context menus are dynamically patched based on the selected language.
7. **Smart Code Block & Terminal Protection**
   - Monaco Editor instances, code blocks (`<pre>`, `<code>`), terminal consoles (`xterm`), and user input fields are strictly preserved, ensuring your code, file paths, and terminal commands remain untranslated and intact.
8. **One-Click Installation & Instant Rollback**
   - Windows: double-click `bin/install.bat` / `bin/restore.bat`.
   - macOS / Linux: execute `./bin/install.sh` / `./bin/restore.sh`.

---

## 📁 Project Layout

```text
antigravity-i18n-patch/
├── bin/                           # Convenient execution entry scripts
│   ├── install.bat                # [Windows] 1-Click installer with interactive language selection
│   ├── restore.bat                # [Windows] 1-Click restore to official English version
│   ├── install.sh                 # [macOS / Linux] Terminal installer
│   └── restore.sh                 # [macOS / Linux] Terminal restore script
├── dist/                          # Compiled patch engine artifacts
│   ├── patch-zh-CN.js             # Simplified Chinese runtime patch engine
│   ├── patch-zh-TW.js             # Traditional Chinese runtime patch engine
│   ├── patch-ja-JP.js             # Japanese runtime patch engine
│   ├── patch-en-US.js             # English benchmark patch artifact
│   └── chinese_patch.js           # Backwards-compatibility alias (mirroring zh-CN)
├── locales/                       # Modular language packs & resources
│   ├── zh-CN/                     # Simplified Chinese language pack (2100+ entries)
│   │   ├── manifest.json          # Metadata, font stack, and tray text
│   │   ├── dict.json              # Exact translation dictionary
│   │   ├── rules.js               # Dynamic regular expressions (duration, relative time, quotas)
│   │   └── menu.json              # Native top menu translations
│   ├── zh-TW/                     # Traditional Chinese language pack
│   │   ├── manifest.json
│   │   ├── dict.json
│   │   ├── rules.js
│   │   └── menu.json
│   ├── ja-JP/                     # Japanese language pack
│   │   ├── manifest.json
│   │   ├── dict.json
│   │   ├── rules.js
│   │   └── menu.json
│   ├── en-US/                     # English template / benchmark pack
│   │   ├── manifest.json
│   │   └── dict.json
│   ├── extracted_strings.json     # All extracted official UI strings from client
│   ├── missing_strings.json       # Untranslated strings list
│   └── README.md                  # Language pack contributor & extension guide
├── scripts/                       # Cross-platform Node.js automation scripts
│   ├── locale_manager.js          # Language pack discovery, validation, and loader
│   ├── build.js                   # Dynamic patch compiler and bundler
│   ├── install.js                 # Cross-platform installer with interactive prompt
│   ├── apply_patch.js             # Electron ASAR unpacking and injection logic
│   ├── restore.js                 # Cross-platform rollback engine
│   └── check_missing.js           # Dictionary coverage and difference analyzer
├── docs/                          # Multi-language documentation directory
│   ├── README.en.md               # English documentation
│   ├── README.ja.md               # Japanese documentation
│   └── README.zh-TW.md            # Traditional Chinese documentation
├── package.json                   # NPM configuration and script commands
├── CHANGELOG.md                   # Release history and changelog
├── CONTRIBUTING.md                # Open source contribution guide
├── LICENSE                        # MIT License
├── .gitignore
└── README.md                      # Main documentation (Simplified Chinese)
```

---

## 🚀 Quick Start

### Method 1: Windows Users (Double-Click)

1. Open the `bin/` directory and double-click **`install.bat`**.
2. An interactive language selection menu will be displayed in the terminal:
   ```text
   ----------------------------------------------------
   Select Language to Install:
     [1] zh-CN - 简体中文 (Simplified Chinese) [Default]
     [2] en-US - English (US)
     [3] ja-JP - 日本語 (Japanese)
     [4] zh-TW - 繁體中文 (Traditional Chinese)
   ----------------------------------------------------
   Enter option number [1-4] or language code (Press Enter for [1]):
   ```
3. **Press Enter directly** to install Simplified Chinese (`zh-CN`), or type the corresponding number (e.g., `3` for Japanese) or language code.
4. The script automatically handles process detection, clean backup creation, on-demand compilation, injection, and ASAR repacking.

---

### Method 2: macOS / Linux Users (Terminal)

```bash
# Grant execution permissions (first time only)
chmod +x bin/install.sh bin/restore.sh

# Interactive installation
./bin/install.sh

# Or install silently with CLI parameters
./bin/install.sh --lang zh-CN -y

# Or install Japanese
./bin/install.sh --lang ja-JP -y

# Restore official English version in seconds
./bin/restore.sh
```

---

### Method 3: NPM Shortcuts

```bash
# Interactive installation
npm run install-patch

# Specify language via CLI
node scripts/install.js --lang zh-CN

# Rebuild all language patches
npm run build

# Build a specific language patch
npm run build:zh-CN
npm run build:ja-JP

# Check translation dictionary coverage against client strings
npm run check
# Or check coverage for Japanese:
npm run check:ja-JP

# Restore official English version
npm run restore
```

---

## 🌐 Extending and Adding New Languages

This project makes adding new languages straightforward. To add a new language (for instance, German `de-DE` or French `fr-FR`):

1. Create a new directory under `locales/`, such as `locales/de-DE/`.
2. Add a `manifest.json` file for metadata:
   ```json
   {
     "id": "de-DE",
     "name": "Deutsch",
     "nativeName": "Deutsch (German)",
     "version": "1.0.0",
     "fontFamily": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif !important",
     "tray": {
       "runningTemplate": "{count} Agent(en) aktiv",
       "noAgents": "Keine Agenten aktiv"
     }
   }
   ```
3. Add a `dict.json` dictionary:
   ```json
   {
     "Settings": "Einstellungen",
     "About": "Über"
   }
   ```
4. *(Optional)* Add `menu.json` and `rules.js` to customize top-level menus and regex replacement rules.
5. **No changes to any source code needed!** Run `bin/install.bat` or `./bin/install.sh`, and the new language will be automatically discovered in the selection menu!
6. For detailed specifications and examples, check [`locales/README.md`](../locales/README.md) (or [`locales/README.en.md`](../locales/README.en.md)).

---

## ❓ Frequently Asked Questions (FAQ)

#### Q1: If I want to switch to another language, do I need to run restore first?
- **No.** Simply run `install.bat` or `install.sh` and select the new language. The installer always builds upon the pristine official backup (`app.asar.bak`), so switching languages is clean and leaves no leftover traces or code corruption.

#### Q2: How do I restore the official English version?
- Run `bin/restore.bat` (Windows) or `./bin/restore.sh` (macOS/Linux), or execute `npm run restore`. It will restore the original `app.asar` from the backup within seconds.

---

## 📄 License

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT). Pull requests and contributions for new language packs are welcome!
