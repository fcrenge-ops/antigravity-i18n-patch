# Antigravity 简体中文汉化补丁套件 (Antigravity Chinese Localization Patch)

专为 **Google Antigravity 2.0** 桌面客户端定制的高兼容、零破坏、可一键安装与秒级还原的简体中文汉化补丁独立套件。

---

## 🌟 核心特性 (Key Features)

1. **零二进制篡改**
   - 不修改任何二进制可执行文件（如 `language_server.exe` 等核心进程），不破坏官方程序签名与内部通信协议。
2. **纯净原版基准构建**
   - 首次安装自动备份官方原版为 `app.asar.bak`。后续每一次更新汉化时，均自动基于官方纯净备份重新解包注入，彻底杜绝重复安装带来的冗余代码堆叠与脏状态。
3. **双轨双保险注入机制**
   - 核心汉化引擎直接内联注入至 `dist/preload.js`，并辅以 `dist/utils.js` 窗口就绪时的二次兜底，彻底根除页面刷新、子视图切换时可能出现的英文闪烁。
4. **原生系统菜单与托盘深度汉化**
   - 深度修补 Electron 原生顶层菜单（文件、编辑、查看、窗口、帮助）及系统托盘菜单（运行中的智能体状态提示），带来一体化的中文桌面体验。
5. **代码块与终端智能保护**
   - 自动识别并严格跳过代码编辑区（`Monaco Editor`）、代码块（`<pre>`, `<code>`）、终端控制台（`xterm`, `terminal`）及用户输入流，确保开发代码、路径与数据内容原汁原味。
6. **Windows 字体渲染优化**
   - 自动注入系统级优雅中文字体栈（微软雅黑 `Microsoft YaHei` / `PingFang SC`），并为终端与代码保持等宽字体，视觉效果清爽舒适。
7. **极简操作：双击即用与秒级还原**
   - 提供专属的 `.bat` 批处理入口，Windows 用户直接双击即可一键安装或秒级回滚官方英文版，免除手动输入终端命令与权限策略困扰。

---

## 📁 项目目录结构 (Project Layout)

```text
antigravity-chinese-patch/
├── dist/                          # 编译产物目录
│   └── chinese_patch.js           # 编译生成的最终汉化引擎 (内置词典与 DOM 监听)
├── locales/                       # 词典与语料数据中心
│   ├── dict.json                  # 核心中英对照字典 (主维护词库)
│   ├── extracted_strings.json     # 从客户端抽取的全量英文 UI 词条清单
│   └── missing_strings.json       # 尚未汉化的待补充词条清单 (由 check 脚本自动更新)
├── scripts/                       # 核心执行、构建与注入脚本统一收拢目录
│   ├── install.bat                # 【双击即用】Windows 批处理一键安装/更新脚本
│   ├── restore.bat                # 【双击即用】Windows 批处理一键还原官方英文脚本
│   ├── install_patch.ps1          # 自动化安装汉化核心脚本 (备份、解包、注入、封包、替换)
│   ├── restore_original.ps1       # 自动化还原官方原版核心脚本
│   ├── apply_patch.js             # Electron ASAR 解包注入主逻辑 (preload/utils/menu/tray)
│   ├── build.js                   # 字典编译构建脚本 (将 locales/dict.json 编译为 dist/chinese_patch.js)
│   └── check_missing.js           # 词条比对与覆盖率统计分析工具
├── package.json                   # NPM 工程管理与快捷指令配置
├── .gitignore                     # Git 忽略配置
└── README.md                      # 本项目说明文档
```

---

## 🚀 快速上手 (Quick Start)

### 方式一：Windows 桌面双击（最推荐）

所有可执行快捷脚本统一存放于 **`scripts/`** 目录中：

1. **安装 / 更新汉化**：进入 `scripts/` 目录，直接双击运行 **`install.bat`**。
   - 脚本会自动检测 Antigravity 运行状态并提示关闭。
   - 自动执行依赖检查、官方原版备份、补丁构建、注入与 ASAR 重新封包。
   - 安装完成后可直接选择启动 Antigravity 查看效果。
2. **还原官方原版**：随时双击运行 `scripts/` 目录下的 **`restore.bat`** 即可秒级还原为纯英文官方版本。

---

### 方式二：PowerShell 命令行

在项目根目录下打开 PowerShell（无需特别提升为管理员权限），执行：

```powershell
# 一键安装 / 更新汉化
powershell -ExecutionPolicy Bypass -File .\scripts\install_patch.ps1

# 一键还原为官方英文版
powershell -ExecutionPolicy Bypass -File .\scripts\restore_original.ps1
```

> **提示**：脚本会自动扫描常用安装路径（默认 `$env:LOCALAPPDATA\Programs\antigravity`）。若安装在非默认目录，脚本会交互式引导输入路径。

---

### 方式三：NPM 快捷命令

对于习惯使用 Node.js / NPM 的开发者，在根目录下直接执行：

```bash
# 一键安装 / 更新补丁
npm run install-patch

# 一键还原官方英文
npm run restore

# 重新编译补丁产物
npm run build

# 检查词库覆盖率并更新待翻译列表
npm run check
```

---

## 🛠️ 词库维护与二次开发指南 (Maintenance)

### 1. 修改或扩充词汇

1. 打开 [`locales/dict.json`](file:///d:/work/private_project/antigravity-chinese-patch/locales/dict.json)，添加或修改中英对照条目：
   ```json
   {
     "Agent Behavior": "智能体行为偏好",
     "Allow Once": "本次允许"
   }
   ```
2. 保存后，直接运行 `npm run build`（或运行 `scripts/install.bat`，安装脚本会自动检测词典更新并自动重新编译）。
3. 运行 `scripts/install.bat`（或 `npm run install-patch`）重新打包生效。

### 2. 统计汉化覆盖率并提取未翻译词条

本项目内置了覆盖率分析脚本，运行：
```bash
npm run check
# 或者: node scripts/check_missing.js
```
控制台将输出详细统计报告，并自动将所有未翻译的 UI 词条提取并排序写入 [`locales/missing_strings.json`](file:///d:/work/private_project/antigravity-chinese-patch/locales/missing_strings.json)：
```text
====================================================
       Antigravity 汉化补丁词典覆盖率统计报告       
====================================================
• 提取原始词条总量:   888 条
• 核心字典已收录条目: 451 条
• 待翻译/未覆盖词条:  651 条
• 估算整体覆盖率:     26.7%
----------------------------------------------------
[成功] 已自动更新待翻译清单: locales\missing_strings.json
提示: 欢迎在 locales/dict.json 中添加待翻译词条以扩充词库！
====================================================
```
您可以参考 `locales/missing_strings.json` 中的英文短语，挑选需要汉化的条目补充至 `locales/dict.json` 中。

---

## 🧩 技术原理解析 (How It Works)

1. **ASAR 提取与重构**：
   通过 `@electron/asar` 解压客户端的核心资源包 `resources/app.asar`，获取前端运行所需的 `dist/preload.js`、`dist/utils.js`、`dist/menu.js` 等模块。
2. **无侵入 DOM 动态拦截**：
   汉化引擎依托于高精度的 `MutationObserver` 监听 DOM 树的动态渲染与节点插入，并通过 `requestAnimationFrame` 微任务批处理队列合并更新，确保在高并发会话和长文本输出时保持零卡顿、无感知的流畅体验。
3. **标签与类名过滤黑名单**：
   精准跳过包含 `.monaco-editor`、`.terminal`、`.xterm`、`<code>`、`<pre>` 以及 `isContentEditable` 的元素，杜绝误翻代码、日志或破坏正在输入的 Prompt。
4. **属性与占位符汉化**：
   同步递归翻译各控件的 `placeholder`、`title`、`aria-label`、`data-tooltip` 等 HTML 属性。
5. **系统菜单与托盘拦截**：
   在应用主进程中拦截 `Menu.setApplicationMenu(menu)`，对 Native 窗口菜单及托盘右键菜单实施精准翻译。

---

## ❓ 常见问题 (FAQ)

#### Q1: Antigravity 官方客户端更新后，汉化失效了怎么办？
- 官方更新会重新拉取官方的 `app.asar`。此时只需重新双击运行根目录的 **`install.bat`**，脚本将自动基于新版重新备份并完成汉化注入。

#### Q2: 运行 PowerShell 提示“因为在此系统上禁止运行脚本...”？
- 这是 Windows 系统的默认安全限制。请直接双击根目录下的 **`install.bat`**，或者在 PowerShell 中以 bypass 参数执行：
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\install_patch.ps1
  ```

#### Q3: 汉化会影响客户端的性能或通讯安全吗？
- 完全不会。汉化补丁仅运行于前端视图层，不干预与 Google 服务器之间的 gRPC / HTTP 通信协议，更不会修改本地代理与权限配置。

---

## 📄 开源协议 (License)

本项目基于 [MIT License](https://opensource.org/licenses/MIT) 开源。
欢迎提交 Issue 或 Pull Request 为 Antigravity 贡献更完善的中文化词条！
