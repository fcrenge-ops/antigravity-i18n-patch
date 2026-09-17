# Antigravity 多语言本地化补丁套件 (Antigravity i18n Patch Suite)

<p align="center">
  <b>简体中文</b> | <a href="docs/README.en.md">English</a> | <a href="docs/README.zh-TW.md">繁體中文</a> | <a href="docs/README.ja.md">日本語</a>
</p>

<p align="center">
  <a href="https://github.com/fcrenge-ops/antigravity-i18n-patch/actions/workflows/ci.yml"><img src="https://github.com/fcrenge-ops/antigravity-i18n-patch/actions/workflows/ci.yml/badge.svg" alt="CI Status"></a>
  <a href="https://github.com/fcrenge-ops/antigravity-i18n-patch/releases"><img src="https://img.shields.io/github/v/release/fcrenge-ops/antigravity-i18n-patch?color=3388ff&label=Release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-blue" alt="Platform">
  <a href="https://github.com/fcrenge-ops/antigravity-i18n-patch/pulls"><img src="https://img.shields.io/badge/PRs-Welcome-brightgreen" alt="PRs Welcome"></a>
</p>

专为 **Google Antigravity 2.0** 桌面客户端定制的高兼容、零破坏、全跨平台（Windows / macOS / Linux）多语言国际化（i18n）补丁套件。支持**安装时交互式选择语言**或通过参数指定安装，并提供**零门槛的对外语言包扩展机制**。

---

## 🌟 核心特性 (Key Features)

1. **全新多语言 i18n 架构**
   - 不再局限于单一语言，采用模块化语言包（Language Pack）设计。目前内置**全量简体中文 (`zh-CN`, 2100+ 词条)**、**繁体中文 (`zh-TW`)**、**日语 (`ja-JP`)** 与 **英文基准模版 (`en-US`)**。
2. **安装阶段自由选择语言**
   - 运行安装脚本时，系统会自动扫描已就绪的语言包，并在终端呈现交互式选择菜单（直接回车默认安装简体中文）。
   - 同时支持命令行参数一键静默指定，如 `--lang zh-TW`、`--lang ja-JP` 或 `-l zh-CN`。
3. **极简对外扩展机制 (Plug-and-Play)**
   - 想扩展新语言（如日语 `ja-JP`、韩语 `ko-KR`、法语 `fr-FR` 等）？无需修改任何核心打包代码，只需在 `locales/` 下新建对应文件夹并放入字典，安装程序便能自动识别并支持安装！
4. **全跨平台原生支持 (Windows / macOS / Linux)**
   - 纯 Node.js 跨平台驱动，智能自动探测各操作系统的官方安装路径、进程管理与目录结构。
5. **双轨双保险注入机制**
   - 补丁内联注入至 `dist/preload.js`，辅以 `dist/utils.js` 窗口就绪时的二次兜底，根除页面刷新、子视图切换时的语言闪烁。
6. **原生系统主菜单与托盘深度国际化**
   - 随选定语言动态修补 Electron 原生顶层菜单（文件、编辑、查看、窗口、帮助）及系统托盘菜单。
7. **代码块与终端智能保护**
   - 精准跳过代码编辑区（`Monaco Editor`）、代码块（`<pre>`, `<code>`）、终端（`xterm`, `terminal`）及用户输入流，确保开发代码、路径与数据内容原汁原味。
8. **一键安装与秒级官方还原**
   - Windows 直接双击 `bin/install.bat` / `bin/restore.bat`；macOS / Linux 运行 `./bin/install.sh` / `./bin/restore.sh`。

---

## 📁 项目目录结构 (Project Layout)

```text
antigravity-i18n-patch/
├── bin/                           # 统一执行入口目录 (快捷启动脚本)
│   ├── install.bat                # 【Windows】双击一键安装补丁 (带语言交互选择)
│   ├── restore.bat                # 【Windows】双击一键还原官方英文版
│   ├── install.sh                 # 【macOS / Linux】终端一键安装补丁
│   └── restore.sh                 # 【macOS / Linux】终端一键还原官方英文版
├── dist/                          # 编译产物目录
│   ├── patch-zh-CN.js             # 简体中文补丁引擎产物
│   ├── patch-zh-TW.js             # 繁体中文补丁引擎产物
│   ├── patch-ja-JP.js             # 日语补丁引擎产物
│   ├── patch-en-US.js             # 英文基准补丁产物
│   └── chinese_patch.js           # 向下兼容产物 (zh-CN 镜像)
├── locales/                       # 模块化多语言数据中心
│   ├── zh-CN/                     # 【简体中文语言包】(2100+ 条全量词库)
│   │   ├── manifest.json          # 语言元数据、字体栈与托盘文案
│   │   ├── dict.json              # 核心精确翻译字典
│   │   ├── rules.js               # 动态正则规则 (耗时、相对时间、额度等)
│   │   └── menu.json              # 原生主菜单翻译配置
│   ├── zh-TW/                     # 【繁体中文语言包】
│   │   ├── manifest.json
│   │   ├── dict.json
│   │   ├── rules.js
│   │   └── menu.json
│   ├── ja-JP/                     # 【日语语言包】
│   │   ├── manifest.json
│   │   ├── dict.json
│   │   ├── rules.js
│   │   └── menu.json
│   ├── en-US/                     # 【英文模版/基准包】
│   │   ├── manifest.json
│   │   └── dict.json
│   ├── extracted_strings.json     # 从客户端提取的全量英文 UI 词条清单
│   ├── missing_strings.json       # 待翻译词条清单
│   └── README.md                  # 语言包扩展规范与贡献指南
├── scripts/                       # 跨平台 Node.js 核心脚本
│   ├── locale_manager.js          # 语言包自动发现、加载与校验管理器
│   ├── build.js                   # 多语言补丁动态编译构建工具
│   ├── install.js                 # 跨平台自动化安装主程序 (含语言选择交互)
│   ├── apply_patch.js             # Electron ASAR 解包注入主逻辑
│   ├── restore.js                 # 跨平台官方英文还原主程序
│   └── check_missing.js           # 多语言词条比对与覆盖率统计分析工具
├── docs/                          # 多语言说明文档目录
│   ├── README.en.md               # 英文说明文档 (English)
│   ├── README.ja.md               # 日文说明文档 (日本語)
│   └── README.zh-TW.md            # 繁体中文说明文档
├── package.json                   # NPM 工程管理与快捷指令
├── CHANGELOG.md                   # 版本发布与更新履历
├── CONTRIBUTING.md                # 开源贡献指南
├── LICENSE                        # MIT 开源授权协议
├── .gitignore
└── README.md                      # 项目主文档 (简体中文)
```

---

## 🚀 快速上手与语言选择 (Quick Start)

### 方式一：Windows 用户（桌面双击即用）

1. 进入 `bin/` 目录，直接双击运行 **`install.bat`**。
2. 终端将展示语言选择菜单：
   ```text
   ----------------------------------------------------
   请选择要安装的界面语言 (Select Language to Install):
     [1] zh-CN - 简体中文 (Simplified Chinese) [默认 (Default)]
     [2] en-US - English (US)
     [3] ja-JP - 日本語 (Japanese)
     [4] zh-TW - 繁體中文 (Traditional Chinese)
   ----------------------------------------------------
   请输入选项编号 [1-4] 或语言代码 (直接回车默认选择 [1]):
   ```
3. **直接按下回车**：立即安装官方推荐的简体中文（zh-CN）；或输入对应数字编号（如 `3`）安装日语或其他已添加的语言。
4. 脚本会自动完成进程检测、备份原版、按需编译补丁、注入与替换封包。

---

### 方式二：macOS / Linux 用户（终端交互与静默安装）

```bash
# 赋予执行权限（首次）
chmod +x bin/install.sh bin/restore.sh

# 交互式选择语言安装
./bin/install.sh

# 或通过命令行参数直接指定语言静默安装 (如简体中文)
./bin/install.sh --lang zh-CN -y

# 或安装繁体中文
./bin/install.sh --lang zh-TW -y

# 一键秒级还原官方英文版
./bin/restore.sh
```

---

### 方式三：NPM 快捷指令

```bash
# 交互式安装补丁 (可选择语言)
npm run install-patch

# 指定语言安装
node scripts/install.js --lang zh-CN

# 一键全量重新编译所有语言包
npm run build

# 单独编译指定语言包
npm run build:zh-CN
npm run build:zh-TW

# 检查指定语言词典覆盖率
npm run check
# 或检查繁体中文覆盖率:
node scripts/check_missing.js --lang zh-TW

# 还原官方英文原版
npm run restore
```

---

## 🌐 如何扩展新语言包 (Extending Languages)

本项目保留了极简的对外拓展能力。若需添加新语言（如日语 `ja-JP`）：

1. 在 `locales/` 目录下创建新文件夹 `locales/ja-JP/`。
2. 创建 `manifest.json` 配置元数据：
   ```json
   {
     "id": "ja-JP",
     "name": "日本語",
     "nativeName": "日本語 (Japanese)",
     "version": "1.0.0",
     "fontFamily": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Meiryo\", sans-serif !important",
     "tray": {
       "runningTemplate": "{count} 個のエージェントが実行中",
       "noAgents": "実行中のエージェントはありません"
     }
   }
   ```
3. 创建 `dict.json` 翻译字典：
   ```json
   {
     "Settings": "設定",
     "About": "バージョン情報"
   }
   ```
4. （可选）创建 `menu.json` 与 `rules.js` 定制菜单与正则替换规则。
5. **无需修改任何程序代码**，重新运行 `bin/install.bat`，选择列表中即可直接看到 `ja-JP` 并支持安装！
6. 更多规范与样例详见 [`locales/README.md`](locales/README.md)。

---

## ❓ 常见问题 (FAQ)

#### Q1: 安装不同语言后想切换，需要先运行 restore 吗？
- **不需要**。直接运行 `install.bat` 或 `install.sh` 并选择新语言，脚本内部会自动基于官方纯净备份（`app.asar.bak`）进行全新注入替换，无论切换多少次语言都不会产生任何历史残留与代码污染。

#### Q2: 还原官方原版如何操作？
- 直接运行 `bin/restore.bat`（Windows）或 `./bin/restore.sh`（macOS/Linux），或执行 `npm run restore`，即可秒级恢复官方纯英文版。

---

## 📄 开源协议 (License)

本项目基于 [MIT License](https://opensource.org/licenses/MIT) 开源。欢迎提交 PR 贡献更多语种支持！
