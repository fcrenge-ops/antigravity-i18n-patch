# Antigravity 多語言在地化修補套件 (Antigravity i18n Patch Suite)

<p align="center">
  <a href="../README.md">简体中文</a> | <a href="README.en.md">English</a> | <b>繁體中文</b> | <a href="README.ja.md">日本語</a>
</p>

專為 **Google Antigravity 2.0** 桌面用戶端量身打造的高相容、零破壞、全跨平台（Windows / macOS / Linux）多語言國際化（i18n）修補套件。支援**安裝時互動式選擇語言**或透過參數指定安裝，並提供**零門檻的對外語言包擴充機制**。

---

## 🌟 核心特色 (Key Features)

1. **全新模組化多語言 i18n 架構**
   - 不再侷限於單一語系，採用模組化語言包（Language Pack）設計。目前已內建**全量簡體中文 (`zh-CN`, 2100+ 詞條)**、**繁體中文 (`zh-TW`)**、**日語 (`ja-JP`)** 與 **英文基準範本 (`en-US`)**。
2. **安裝階段自由選擇語言**
   - 執行安裝指令稿時，系統會自動掃描就緒的語言包，並在終端機呈現互動式選單（直接按 Enter 鍵預設安裝簡體中文）。
   - 同時支援命令列參數一鍵無干擾安裝，例如 `--lang zh-TW`、`--lang ja-JP` 或 `-l zh-CN`。
3. **極簡對外擴充機制 (Plug-and-Play)**
   - 想擴充新語言（如法語 `fr-FR`、德語 `de-DE`、韓語 `ko-KR` 等）？無須修改任何核心打包程式碼，只需在 `locales/` 下新增對應資料夾並放入字典，安裝程式即可自動識別並支援安裝！
4. **全跨平台原生支援 (Windows / macOS / Linux)**
   - 純 Node.js 跨平台驅動，智慧自動偵測各作業系統的官方安裝路徑、處理程序管理與目錄結構。
5. **雙軌雙保險注入機制**
   - 修補程式內聯注入至 `dist/preload.js`，輔以 `dist/utils.js` 視窗就緒時的二次保險機制，徹底根除頁面重新載入、子視圖切換時的語言閃爍現象。
6. **原生系統主選單與通知區托盤深度在地化**
   - 隨選定語言動態修補 Electron 原生頂層選單（檔案、編輯、檢視、視窗、說明）及系統托盤選單。
7. **程式碼區塊與終端機智慧保護**
   - 精準略過程式碼編輯區（`Monaco Editor`）、程式碼區塊（`<pre>`, `<code>`）、終端機（`xterm`, `terminal`）及使用者輸入欄位，確保開發程式碼、路徑與資料內容原汁原味。
8. **一鍵安裝與秒級官方還原**
   - Windows 直接按兩下 `bin/install.bat` / `bin/restore.bat`；macOS / Linux 執行 `./bin/install.sh` / `./bin/restore.sh`。

---

## 📁 專案目錄結構 (Project Layout)

```text
antigravity-i18n-patch/
├── bin/                           # 統一執行入口目錄 (捷徑啟動指令稿)
│   ├── install.bat                # 【Windows】按兩下一鍵安裝修補程式 (含語言互動選擇)
│   ├── restore.bat                # 【Windows】按兩下一鍵還原官方英文版
│   ├── install.sh                 # 【macOS / Linux】終端機一鍵安裝修補程式
│   └── restore.sh                 # 【macOS / Linux】終端機一鍵還原官方英文版
├── dist/                          # 編譯產物目錄
│   ├── patch-zh-CN.js             # 簡體中文修補引擎產物
│   ├── patch-zh-TW.js             # 繁體中文修補引擎產物
│   ├── patch-ja-JP.js             # 日語修補引擎產物
│   ├── patch-en-US.js             # 英文基準修補產物
│   └── chinese_patch.js           # 向下相容產物 (zh-CN 鏡像)
├── locales/                       # 模組化多語言資料中心
│   ├── zh-CN/                     # 【簡體中文語言包】(2100+ 條全量詞庫)
│   │   ├── manifest.json          # 語言詮釋資料、字型堆疊與托盤文字
│   │   ├── dict.json              # 核心精準翻譯字典
│   │   ├── rules.js               # 動態正規表達式規則 (耗時、相對時間、額度等)
│   │   └── menu.json              # 原生主選單翻譯設定
│   ├── zh-TW/                     # 【繁體中文語言包】
│   │   ├── manifest.json
│   │   ├── dict.json
│   │   ├── rules.js
│   │   └── menu.json
│   ├── ja-JP/                     # 【日語語言包】
│   │   ├── manifest.json
│   │   ├── dict.json
│   │   ├── rules.js
│   │   └── menu.json
│   ├── en-US/                     # 【英文範本/基準包】
│   │   ├── manifest.json
│   │   └── dict.json
│   ├── extracted_strings.json     # 從用戶端擷取的完整官方英文 UI 詞條清單
│   ├── missing_strings.json       # 待翻譯詞條清單
│   └── README.md                  # 語言包擴充規範與貢獻指南
├── scripts/                       # 跨平台 Node.js 核心指令稿
│   ├── locale_manager.js          # 語言包自動探索、載入與驗證管理器
│   ├── build.js                   # 多語言修補動態編譯建置工具
│   ├── install.js                 # 跨平台自動化安裝主程式 (含語言選擇互動)
│   ├── apply_patch.js             # Electron ASAR 解包注入主邏輯
│   ├── restore.js                 # 跨平台官方英文還原主程式
│   └── check_missing.js           # 多語言詞條比對與覆蓋率分析工具
├── docs/                          # 多語言說明文件目錄
│   ├── README.en.md               # 英文說明文件 (English)
│   ├── README.ja.md               # 日文說明文件 (日本語)
│   └── README.zh-TW.md            # 繁體中文說明文件
├── package.json                   # NPM 專案管理與快捷指令
├── .gitignore
└── README.md                      # 專案主說明文件 (簡體中文)
```

---

## 🚀 快速上手與語言選擇 (Quick Start)

### 方式一：Windows 使用者（桌面按兩下即用）

1. 進入 `bin/` 目錄，直接按兩下執行 **`install.bat`**。
2. 終端機將呈現語言選擇選單：
   ```text
   ----------------------------------------------------
   請選擇要安裝的介面語言 (Select Language to Install):
     [1] zh-CN - 简体中文 (Simplified Chinese) [預設 (Default)]
     [2] en-US - English (US)
     [3] ja-JP - 日本語 (Japanese)
     [4] zh-TW - 繁體中文 (Traditional Chinese)
   ----------------------------------------------------
   請輸入選項編號 [1-4] 或語言代碼 (直接按 Enter 預設選擇 [1]):
   ```
3. **直接按 Enter 鍵**：立即安裝官方推薦的簡體中文（zh-CN）；或輸入對應數字編號（如 `4`）安裝繁體中文或其他已新增的語言。
4. 指令稿會自動完成處理程序偵測、備份原版、依需求編譯修補、注入與置換封包。

---

### 方式二：macOS / Linux 使用者（終端機互動與靜默安裝）

```bash
# 賦予執行權限（初次使用）
chmod +x bin/install.sh bin/restore.sh

# 互動式選擇語言安裝
./bin/install.sh

# 或透過命令列參數直接指定語言靜默安裝 (如繁體中文)
./bin/install.sh --lang zh-TW -y

# 或安裝日文
./bin/install.sh --lang ja-JP -y

# 一鍵秒級還原官方英文版
./bin/restore.sh
```

---

### 方式三：NPM 快捷指令

```bash
# 互動式安裝修補套件 (可選擇語言)
npm run install-patch

# 指定語言安裝
node scripts/install.js --lang zh-TW

# 一鍵全量重新編譯所有語言包
npm run build

# 單獨編譯指定語言包
npm run build:zh-TW
npm run build:ja-JP

# 檢查指定語言字典覆蓋率
npm run check
# 或檢查繁體中文覆蓋率:
node scripts/check_missing.js --lang zh-TW

# 還原官方英文原版
npm run restore
```

---

## 🌐 如何擴充新語言包 (Extending Languages)

本專案保留了極簡的對外擴充能力。若需新增語言（如德語 `de-DE`）：

1. 在 `locales/` 目錄下建立新資料夾 `locales/de-DE/`。
2. 建立 `manifest.json` 設定詮釋資料：
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
3. 建立 `dict.json` 翻譯字典：
   ```json
   {
     "Settings": "Einstellungen",
     "About": "Über"
   }
   ```
4. （可選）建立 `menu.json` 與 `rules.js` 定制選單與正規表達式替換規則。
5. **無須修改任何程式碼**，重新執行 `bin/install.bat`，選項清單中即可直接看到 `de-DE` 並支援安裝！
6. 更多規範與範例詳見 [`locales/README.md`](../locales/README.md)（或 [`locales/README.en.md`](../locales/README.en.md)）。

---

## ❓ 常見問題 (FAQ)

#### Q1: 安裝不同語言後想切換，需要先執行 restore 嗎？
- **不需要**。直接執行 `install.bat` 或 `install.sh` 並選擇新語言，指令稿內部會自動基於官方乾淨備份（`app.asar.bak`）進行全新注入置換，無論切換多少次語言都不會產生任何歷史殘留與程式碼污染。

#### Q2: 還原官方原版如何操作？
- 直接執行 `bin/restore.bat`（Windows）或 `./bin/restore.sh`（macOS/Linux），或執行 `npm run restore`，即可秒級恢復官方純英文版。

---

## 📄 開源授權 (License)

本專案基於 [MIT License](https://opensource.org/licenses/MIT) 開源。歡迎提交 PR 貢獻更多語系支援！
