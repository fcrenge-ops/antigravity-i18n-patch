# Antigravity Language Pack Extension & Contribution Guide

<p align="center">
  <a href="README.md">简体中文</a> | <b>English</b>
</p>

This project adopts a modular, plug-and-play multi-language (i18n) architecture. If you want to contribute support for a new language (such as Japanese `ja-JP`, Korean `ko-KR`, French `fr-FR`, German `de-DE`, etc.), simply create a corresponding directory under `locales/` following these guidelines:

---

## 📁 Language Pack Structure

Each language pack lives in an independent subdirectory. We recommend naming the directory using standard BCP 47 language tags (e.g., `ja-JP`, `de-DE`):

```text
locales/<lang-id>/
├── manifest.json      # [Required] Language metadata and font/tray configuration
├── dict.json          # [Required] Exact translation dictionary (Key-Value JSON)
├── rules.js           # [Optional] Dynamic regex replacement rules for numbers/durations
└── menu.json          # [Optional] Native desktop application top-level menu translations
```

---

## 📄 Configuration Details

### 1. `manifest.json` (Metadata Configuration)
```json
{
  "id": "de-DE",
  "name": "Deutsch",
  "nativeName": "Deutsch (German)",
  "version": "1.0.0",
  "author": "YourName",
  "description": "Antigravity 2.0 German localization patch",
  "fontFamily": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif !important",
  "tray": {
    "runningTemplate": "{count} Agent(en) aktiv",
    "noAgents": "Keine Agenten aktiv"
  }
}
```
- `id`: Unique language identifier (e.g., `de-DE`).
- `name` / `nativeName`: Display names shown in the installation prompt menu.
- `fontFamily`: CSS font-family stack optimized for this language.
- `tray`: Context menu template strings for the system tray (supports `{count}` placeholder).

---

### 2. `dict.json` (Exact Translation Dictionary)
Standard JSON object where Keys represent the original English client strings, and Values represent translations:
```json
{
  "Settings": "Einstellungen",
  "New Window": "Neues Fenster",
  "Agent Behavior": "Agentenverhalten"
}
```
> **Tip**: Check `locales/extracted_strings.json` for a comprehensive list of all original strings extracted from the Antigravity client.

---

### 3. `rules.js` (Dynamic Regular Expression Rules - Optional)
For UI text containing dynamic numbers, relative timestamps, or sentence templates, you can define regex replacement rules in `rules.js`:
```javascript
module.exports = [
  { pattern: /^Thought for (\d+)(s|m|h)$/i, replace: 'Nachgedacht für $1$2' },
  { pattern: /^(\d+)\s+tasks?$/i, replace: '$1 Aufgabe(n)' },
  { pattern: /^(\d+)\s+files?\s+changed$/i, replace: '$1 Datei(en) geändert' },
  {
    pattern: /^Resets in (\d+)d$/i,
    replace: function(match, days) {
      return 'Wird in ' + days + ' Tag(en) zurückgesetzt';
    }
  }
];
```

---

### 4. `menu.json` (Top-Level Native Window Menu - Optional)
Overrides Electron's native menu items (File, Edit, View, Window, Help, etc.):
```json
{
  "File": "Datei",
  "Edit": "Bearbeiten",
  "View": "Ansicht",
  "Window": "Fenster",
  "Help": "Hilfe",
  "Quit": "Beenden"
}
```

---

## 🚀 Debugging and Testing a New Language Pack

1. **Automatic Discovery**: Once placed under `locales/<lang-id>`, running `node scripts/build.js` or `node scripts/install.js` will automatically detect the new language and include it in the selection menu.
2. **Build Individually**:
   ```bash
   node scripts/build.js --lang <your-lang-id>
   ```
3. **Test Installation**:
   ```bash
   node scripts/install.js --lang <your-lang-id>
   ```
4. **Check Dictionary Coverage**:
   ```bash
   node scripts/check_missing.js --lang <your-lang-id>
   ```
