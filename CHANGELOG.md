# 更新日志 (Changelog)

本项目的所有重要变更均记录在此文件中。
版本号遵循 [语义化版本 2.0.0 (Semantic Versioning)](https://semver.org/lang/zh-CN/) 规范。

---

## [2.3.0] - 2026-11-19

### ✨ 全面适配 Antigravity v2.32.2（客户端版本 44.9.1）与启动器自动补丁
- **启动器自动补丁集成 (`scripts/launcher.js`)**：彻底解决"Antigravity 一更新补丁就失效、需要手动重打"的问题，**零后台常驻进程、零定时轮询盲区**。
  - **智能适配代理启动器**：在 Windows 上优先检测 `%APPDATA%\Antigravity\launcher\launch-with-proxy.vbs` 并安全嵌入启动前校验钩子（保留原有代理逻辑与文件编码，支持随时一键无损移除）；若无代理启动器，则自动生成包装脚本并接管桌面/开始菜单快捷方式。支持 Linux `.desktop` 覆盖与 macOS 启动脚本。
  - **启动前同步拦截**：平时补丁有效时仅耗数十毫秒极速放行；一旦检测到官方更新覆盖 `app.asar`，在拉起客户端前自动同步静默重打补丁，打开即为汉化版。
  - **并发防重入锁 (`.launcher.lock`)** 与运行日志轮转 (`logs/launcher.log`)，客户端已运行时自动跳过防止打断工作。
  - 新增 `bin/launcher.bat`、`bin/launcher.sh` 与 `npm run launcher:enable|disable|status|repair|ensure` 快捷命令。
  - 安装成功后自动记录语言与安装路径 (`.antigravity_i18n_config.json`)，并引导接入启动器自动补丁；新增 `--launcher` / `--no-launcher` 参数。
- **核心引擎与离线安装重大升级 (`apply_patch.js`, `build.js`, `install.js`, `restore.js`)**：
  - 适配新版客户端 `BaseWindow` + `WebContentsView (hubWcv)` 窗口架构，新增 `registerWindowWebContents(win, hubContents)` 挂载钩子，恢复 `did-finish-load` 二次保障注入。
  - 优化 `preload.js` 在 `document.documentElement` 尚未就绪时的生命周期互斥标记与字体注入时机。
  - 新增 `.textLayer` 与 `.mermaid-wrapper svg` 保护选择器，防止 PDF 阅读器正文及 Mermaid 图表内容被误翻译。
  - 将 `translateText()` 的单段文本长度上限由 `500` 放宽至 `1000` 字符，确保长技能 (Skill) 与斜杠指令描述也能完整汉化。
  - `@electron/asar` 改为项目本地依赖并通过模块 API 调用（缺失时自动降级为 npx），补丁与启动器自动重打可离线运行、速度更快；`getAsarMeta` / `compareVersions` 抽离至 `scripts/asar_meta.js`，新增 `scripts/asar_tool.js`、`scripts/user_config.js`。
  - 强化 `install.js` 防版本降级校验：官方热修复替换纯净 `app.asar` 时即使保留旧构建时间戳，只要大小或版本变化亦会同步更新基准备份；所有子进程调用增加 `windowsHide`；执行 `restore` 时自动停用启动器自动补丁。
- **词库大幅扩充（2692 条 → 4958 条，净增 2266 条）**：
  - 深度解包 `language_server.exe` 内嵌前端资源包、`app.asar` 主进程脚本以及内置技能/斜杠指令元数据，并通过词法全量审计补齐界面布局实验文案与设置页长/短词条，同步更新简体中文 (`zh-CN`)、繁体中文 (`zh-TW`) 与日语 (`ja-JP`) 三语全量词库（覆盖率达 99.0%）。
  - 重点覆盖新版功能模块：**通用设置界面布局 (`Knowledge Work` / `Software Engineering` / `Project 4K`)、执行/语音按钮与高级安全说明 (`Queue` / `Voice mode` / `Change` / `Turbo mode`)**、**内置 `/` 斜杠指令与内置技能 (`goal` / `compact` / `schedule` / `browser` / `plan` / `grill-me` / `teamwork` / `boost` / `learn`)**、**MySQL & Chrome DevTools MCP 提示词与技能描述**、**内置浏览器与站点权限控制**、**GitHub / GitLab / Gerrit 分支与仓库策略**、**自动化任务与 CEL 表达式/Hooks**、**旁白提问 (`/btw` Side Questions)**、**协调器 (Coordinators) 与 Best of N 模型对决**、**远程控制 (Remote Control) 与 SSH/WSL 向导**、**语音模式 (Voice Mode)**、**PDF 批注与 Mermaid 图表预览**、**AI 积分与配额提示**。
- **动态正则与原生菜单同步升级 (`rules.js` & `menu.json`)**：
  - 新增 `Thinking for ...`、`Thought for ...`、`Worked for ...`、欢迎语、设置页动态应用/配额/权限描述、快捷键录制提示、对话框/工具执行状态、`Question X of Y` 等 **170+ 条动态正则规则**。
  - 原生菜单补充 `Checking for Updates...`、`Downloading Update...`、`Restart to Update` 动态状态翻译。
- **自动化验证升级 (`test/verify_optimizations.js`)**：
  - 扩展至 17 项自动化验证用例，全面覆盖新架构注入钩子、规则匹配、菜单完整性、斜杠指令/MCP 描述、设置页实验文案、启动器自动补丁套件与长文本上限校验。

---

## [2.2.0] - 2026-10-13

### ✨ 新增与新特性覆盖 (Added & Feature Coverage)
- **全面适配 Antigravity 最新版 (v2.22.0)**：深入解包分析客户端最新渲染引擎与业务模块，提取 5100+ 条全量官方英文词条。
- **词库大幅扩充**：核心词典由 2198 条扩增至 **2692 条**（净增 494 条高质量界面词汇），繁体中文 (`zh-TW`) 与日语 (`ja-JP`) 字典同步扩容对齐。
- **全方位覆盖官方新特性**：
  - **Automations（自动化工作流）**：定时调度、任务执行状态、Cron 提示词与自动化面板完整汉化。
  - **Customizations（自定义套件中心）**：自定义右键上下文菜单、让智能体创建插件、全局权限设置与方案审查策略。
  - **Projects & Workspaces（多项目与工作区）**：项目视图、项目智能体设置、Cog / JJ 版本控制系统关联与仓库筛选。
  - **Review & Diff（审查与代码差异）**：分栏对比、合并对比、行内评论、暂存/放弃更改、空白字符显示切换与虚拟文件查看器。
  - **Project 4K & Chief of Staff（全新体验模式）**：Project 4K 体验切换、参谋长语音模式与全局协调状态。
  - **排队消息与语音交互**：待发消息排队折叠、智能体完成后自动发送、语音备忘录录制提示。
  - **界面与窗口导航**：辅助窗格（Auxiliary Pane）、新建标签页、关闭其他标签页、概览面板等。
- **全新动态正则规则 (`rules.js`)**：新增历史消息加载进度（如 `showing 60 of 467`）、模型选择器状态、排队消息操作前缀（`Send now:`、`Edit:`、`Delete:`）等动态句式转换。

### 🔄 优化与改进 (Changed & Optimized)
- **词条提取与校验工具升级 (`check_missing.js`)**：智能过滤内部 AST、Lexical 节点断言、SVG 路径与语法噪音，提升词库分析精准度。
- **全量产物重新编译**：更新 `dist/` 下所有语言包产物及兼容镜像文件。

---

## [2.1.0] - 2026-09-17

### ✨ 新增 (Added)
- **全新模块化多语言（i18n）架构**：告别单一硬编码翻译，支持即插即用式模块化语言包（Language Pack）。
- **四国/地区语言支持**：首发内置全量简体中文 (`zh-CN`, 2198+ 词条)、繁体中文 (`zh-TW`)、日语 (`ja-JP`) 与英文基准模版 (`en-US`)。
- **安装阶段交互式语言选择**：运行脚本时终端自动扫描可用语言包，支持按编号交互选择或通过命令行参数（如 `--lang ja-JP`）一键静默安装。
- **多语言文档体系**：在 `docs/` 目录下提供规范的英文 (`README.en.md`)、日文 (`README.ja.md`) 与繁体中文 (`README.zh-TW.md`) 说明文档。
- **语言包扩展与贡献规范**：提供中英双语的语言包扩展指南（`locales/README.md` 与 `locales/README.en.md`）。
- **工程化基础设施**：新增 GitHub Actions 自动化 CI 测试与 Release 资产自动打包挂载流水线，补充标准 Issue/PR 模板与 CONTRIBUTING 指南。
- **运行环境智能感知**：在入口脚本中加入自动化的 Node.js 环境探测与防闪退引导。

### 🔄 优化与重构 (Changed)
- **目录架构统一升级**：将各快捷执行入口收纳归档至 `bin/` 目录，文档归档至 `docs/`。
- **跨平台 Shell 权限强化**：在 Git 索引中赋予 `bin/*.sh` 可执行权限位（`100755`），并在 `.gitattributes` 中强制声明 `eol=lf`。
- **保护机制完善**：严格保护 Monaco Editor、Pre/Code 代码块、xterm 终端控制台与用户输入流，防止开发内容被误翻译。

### 🛡️ 安全与还原 (Fixed & Security)
- **双保险注入机制**：采用预加载层注入结合窗口就绪事件二次防闪烁兜底。
- **秒级官方原版还原**：内置跨平台 `restore` 程序，一键还原官方纯净无污染环境。

---

## [2.0.0] - 2026-09-16

### ✨ 新增 (Added)
- **跨平台原生支持**：支持 Windows、macOS（Intel & Apple Silicon）及主流 Linux 发行版。
- **自动化路径探测**：自动定位官方 Electron ASAR 存储目录与进程控制。

---

## [1.0.0] - 2026-09-15

### ✨ 新增 (Added)
- 首发针对 Google Antigravity 2.0 桌面客户端的汉化补丁原型。
- 支持基础精确字典匹配与动态正则替换。
