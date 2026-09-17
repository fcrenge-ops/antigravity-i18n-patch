# Antigravity 语言包扩展与贡献指南 (Language Pack Guide)

<p align="center">
  <b>简体中文</b> | <a href="README.en.md">English</a>
</p>

本项目采用模块化、可插拔的多语言（i18n）架构。若想为 Antigravity 添加新的语言支持（如日语 `ja-JP`、韩语 `ko-KR`、法语 `fr-FR`、德语 `de-DE` 等），只需在 `locales/` 目录下新增对应文件夹并遵循如下规范：

---

## 📁 语言包结构规范

每个语言包为一个独立的文件夹，目录名建议采用标准的 BCP 47 语言代号（如 `ja-JP`, `ko-KR`）：

```text
locales/<lang-id>/
├── manifest.json      # 【必须】语言包元数据与基础配置
├── dict.json          # 【必须】精准文本翻译字典 (JSON 键值对)
├── rules.js           # 【可选】针对该语种语法的动态正则匹配规则
└── menu.json          # 【可选】桌面客户端顶层原生菜单翻译
```

---

## 📄 配置文件详解

### 1. `manifest.json` (元数据配置)
```json
{
  "id": "ja-JP",
  "name": "日本語",
  "nativeName": "日本語 (Japanese)",
  "version": "1.0.0",
  "author": "YourName",
  "description": "Antigravity 2.0 クライアント日本語ローカライズパッチ",
  "fontFamily": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Meiryo\", \"Hiragino Kaku Gothic ProN\", sans-serif !important",
  "tray": {
    "runningTemplate": "{count} 個のエージェントが実行中",
    "noAgents": "実行中のエージェントはありません"
  }
}
```
- `id`: 语言唯一标识（如 `ja-JP`）
- `name` / `nativeName`: 显示在安装选择菜单中的语言名称
- `fontFamily`: 针对该语种推荐的 CSS 字体栈
- `tray`: 托盘图标右键菜单文案模板（支持 `{count}` 占位符）

---

### 2. `dict.json` (精确翻译字典)
格式为标准的 JSON 对象，Key 为官方原始英文界面词条，Value 为对应语种的翻译：
```json
{
  "Settings": "設定",
  "New Window": "新規ウィンドウ",
  "Agent Behavior": "エージェント動作"
}
```
> **提示**：可参考项目提供的 `locales/extracted_strings.json` 获取客户端抽取出来的全部官方英文词条清单。

---

### 3. `rules.js` (动态正则规则 - 可选)
当界面文本包含动态数字、时间、计数或特定句式时，可在 `rules.js` 中定义正则替换规则：
```javascript
module.exports = [
  { pattern: /^Thought for (\d+)(s|m|h)$/i, replace: '思考時間 $1$2' },
  { pattern: /^(\d+)\s+tasks?$/i, replace: '$1 個のタスク' },
  { pattern: /^(\d+)\s+files?\s+changed$/i, replace: '$1 個のファイルが変更されました' },
  {
    pattern: /^Resets in (\d+)d$/i,
    replace: function(match, days) {
      return days + ' 日後にリセットされます';
    }
  }
];
```

---

### 4. `menu.json` (窗口原生主菜单 - 可选)
用于覆盖 Electron 原生菜单项（如 File, Edit, View, Window, Help 等）：
```json
{
  "File": "ファイル",
  "Edit": "編集",
  "View": "表示",
  "Window": "ウィンドウ",
  "Help": "ヘルプ",
  "Quit": "終了"
}
```

---

## 🚀 调试与测试新语言包

1. **自动识别**：放置好目录后，运行 `node scripts/build.js` 或 `node scripts/install.js`，系统将自动识别出新语言并加入选择列表。
2. **单独编译**：
   ```bash
   node scripts/build.js --lang <your-lang-id>
   ```
3. **测试安装**：
   ```bash
   node scripts/install.js --lang <your-lang-id>
   ```
4. **覆盖率统计**：
   ```bash
   node scripts/check_missing.js --lang <your-lang-id>
   ```
