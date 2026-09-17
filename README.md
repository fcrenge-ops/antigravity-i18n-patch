# Antigravity 简体中文汉化补丁套件 (Antigravity Chinese Localization Patch)

专为 **Google Antigravity 2.0** 桌面客户端定制的高兼容、零破坏、可一键安装与秒级还原的简体中文汉化补丁独立维护项目。

项目目录：`D:\work\private_project\antigravity-chinese-patch`

---

## 🌟 汉化特性

1. **零二进制修改**：不修改 160MB+ 的 `language_server.exe` 核心程序，绝不破坏程序签名与通讯协议。
2. **超大词典全量覆盖**：内置 **451+ 条官方真实 UI 条目**，深度覆盖：
   - 左侧主导航与历史会话（新建对话、项目、计划任务、技能与自定义、设置等）
   - 主聊天画布操作与状态（运行、停止、批准、思考耗时、工作耗时、输入提示等）
   - 辅助窗格（子智能体、后台任务、工件、文件更改、终端、浏览器）
   - 全部设置面板（通用、应用、模型、外观主题色值、工件/表格宽度、权限管理、沙箱策略）
3. **原生系统菜单中文化**：将 Electron 顶层菜单栏（文件/编辑/查看/窗口/帮助）及托盘右键菜单同步汉化。
4. **代码与终端智能保护**：自动识别并跳过代码块（`<pre>`, `<code>`, `.monaco-editor`）、终端控制台（`.terminal`, `.xterm`）与数据内容，确保代码与数据原汁原味。
5. **Windows 中文字体优化**：注入系统级优雅中文字体（微软雅黑 / PingFang SC），提升排版清晰度。
6. **一键备份与秒级还原**：安装前自动将官方包备份为 `app.asar.bak`，随时可一键无损回滚。

---

## 📁 项目结构

```text
antigravity-chinese-patch/
├── dict.json               # 核心汉化中英对照字典主文件 (可自由扩充)
├── build.js                # 字典构建编译脚本 (根据 dict.json 编译生成 chinese_patch.js)
├── chinese_patch.js        # 编译生成的最终汉化引擎 (高精度 DOM 监听与属性汉化)
├── apply_patch.js          # ASAR 解包与代码内联注入主逻辑
├── install_patch.ps1       # 一键安装汉化补丁脚本 (PowerShell)
├── restore_original.ps1    # 一键还原官方原版脚本 (PowerShell)
├── package.json            # 项目工程配置与 NPM 快捷脚本
├── .gitignore              # Git 忽略配置
└── README.md               # 本项目说明文档
```

---

## 🚀 常用操作指令

### 1. 一键安装 / 更新汉化补丁

打开 PowerShell 终端，直接执行：
```powershell
powershell -ExecutionPolicy Bypass -File D:\work\private_project\antigravity-chinese-patch\install_patch.ps1
```
或者在项目根目录下使用 npm：
```powershell
npm run install-patch
```

### 2. 一键还原官方纯英文版

随时运行还原脚本即可秒级恢复官方纯英文版本：
```powershell
powershell -ExecutionPolicy Bypass -File D:\work\private_project\antigravity-chinese-patch\restore_original.ps1
```
或者使用 npm：
```powershell
npm run restore
```

---

## 🛠️ 后续维护与扩充指南

当 Antigravity 版本更新出现新词汇，或您想修改某个词的中文翻译时：
1. 用编辑器打开 `dict.json`，在其中修改或添加新的中英对照条目：
   ```json
   "New English Term": "新中文翻译"
   ```
2. 运行构建脚本重新编译：
   ```powershell
   node build.js
   ```
3. 运行安装脚本重新打包生效：
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install_patch.ps1
   ```
