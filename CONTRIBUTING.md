# 贡献指南 (Contributing Guide)

感谢您对 **Antigravity 多语言本地化补丁套件** 项目的关注与支持！无论是修复翻译错别字、改进表达，还是扩展全新的语种支持，我们都非常欢迎您的贡献。

---

## 🛠️ 本地开发环境准备

1. **环境依赖**：Node.js (>= 18.x) 与 Git。
2. **克隆仓库**：
   ```bash
   git clone https://github.com/fcrenge-ops/antigravity-i18n-patch.git
   cd antigravity-i18n-patch
   ```

---

## 🌐 如何贡献新的语言包 (Contributing a New Language)

本项目采用全模块化、即插即用的架构设计。若想为 Antigravity 新增一种语言：

1. **新建语言目录**：在 `locales/` 下新建以 BCP 47 命名的目录（如 `locales/ko-KR/`）。
2. **创建必要文件**：
   - `manifest.json`：配置语言代号、展示名称、推荐字体栈与托盘文案。
   - `dict.json`：键值对翻译字典（以官方英文为 Key，译文为 Value）。
   - *(可选)* `rules.js`：正则匹配动态时间、计数模板等。
   - *(可选)* `menu.json`：Electron 原生主菜单项翻译。
3. **验证与编译测试**：
   ```bash
   # 验证覆盖率与未翻译词条
   node scripts/check_missing.js --lang <your-lang-id>

   # 单独构建编译该语言补丁
   node scripts/build.js --lang <your-lang-id>

   # 本地测试安装
   node scripts/install.js --lang <your-lang-id>
   ```
4. 详尽技术规范请参阅：[locales/README.md](locales/README.md) 或 [locales/README.en.md](locales/README.en.md)。

---

## 📝 提交 Pull Request 规范

1. 基于 `main` 分支创建您自己的特性分支：
   ```bash
   git checkout -b feature/lang-ko-KR
   ```
2. 提交代码时遵循语义化 Commit 规范：
   - `feat: add Korean (ko-KR) language pack support`
   - `fix: correct typo in zh-CN settings menu`
   - `docs: update translation guidelines`
3. 确保本地运行 `npm run build` 和 `npm run check` 没有任何报错。
4. 推送分支并向本项目发起 Pull Request，CI 自动化流水线将自动运行语法与覆盖率检验。
