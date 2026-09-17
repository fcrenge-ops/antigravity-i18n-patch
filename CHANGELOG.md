# 更新日志 (Changelog)

本项目的所有重要变更均记录在此文件中。
版本号遵循 [语义化版本 2.0.0 (Semantic Versioning)](https://semver.org/lang/zh-CN/) 规范。

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
