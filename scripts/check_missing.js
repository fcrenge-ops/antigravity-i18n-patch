const fs = require('fs');
const path = require('path');
const localeManager = require('./locale_manager');

const rootDir = path.resolve(__dirname, '..');
const extractedPath = path.join(rootDir, 'locales', 'extracted_strings.json');

// 解析参数
const argv = process.argv.slice(2);
function getArgValue(arg) {
  const index = argv.indexOf(arg);
  if (index !== -1 && index + 1 < argv.length) {
    return argv[index + 1];
  }
  return null;
}

const targetLang = getArgValue('--lang') || getArgValue('-l') || argv[0] || 'zh-CN';

if (!fs.existsSync(extractedPath)) {
  console.error('[错误] 未找到提取词条库:', extractedPath);
  process.exit(1);
}

let localeData;
try {
  localeData = localeManager.loadLocale(targetLang);
} catch (e) {
  console.error(`[错误] 加载语言包 [${targetLang}] 失败:`, e.message);
  process.exit(1);
}

const dict = localeData.dict;
const extracted = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

const dictKeys = new Set(Object.keys(dict).map((s) => s.trim()));

// 找出未翻译词条
const missing = [];
for (const item of extracted) {
  if (typeof item !== 'string') continue;
  const trimmed = item.trim();
  if (!trimmed) continue;
  // 过滤纯代码碎片或无实际翻译意义的符号与数学公式
  if (trimmed.startsWith('${') || trimmed.startsWith('){') || trimmed.startsWith(',l)')) continue;
  if (/^\\\\[a-zA-Z]+$/.test(trimmed) || /^\\u[0-9a-fA-F]+$/.test(trimmed) || /^[><= ≥≤\u2265\u2212] ?\d+[smhd]$/.test(trimmed)) continue;
  if (trimmed === '..' || trimmed === '\u2212') continue;
  // 过滤内部模块标签 [AppState]、[ExtensibilityPlugins] 等
  if (/^\[[A-Z][a-zA-Z]+\]$/.test(trimmed)) continue;
  // 过滤代码片段（包含代码特征字符）
  if (/[{};=]/.test(trimmed) && trimmed.length < 80) continue;
  // 过滤纯 URL
  if (/^https?:\/\//.test(trimmed)) continue;
  // 过滤仓库路径 (如 chromium/chromium/src)
  if (/^[a-z0-9_-]+\/[a-z0-9_/-]+$/.test(trimmed)) continue;
  // 过滤纯技术命令列表 (如 run_command, view_file ...)
  if (/^[a-z_]+([ ,]+[a-z_]+)*$/.test(trimmed)) continue;
  // 过滤 Workspace 占位符
  if (/^Workspace_\d+$/.test(trimmed)) continue;
  // 过滤带 Unicode 转义的阈值标记 (如 \u2265 15s, \u2265 1m 等)
  if (/^\\u[0-9a-fA-F]{4}\s+\d+[smhd]$/.test(trimmed)) continue;
  // 过滤已知不需翻译的专有名词/内部产品名
  const skipExact = new Set(['Chromium', 'Google3', 'Android (main)', 'Welcome to Cider with Jetski']);
  if (skipExact.has(trimmed)) continue;

  // 尝试多种归一化形式匹配字典
  const normalizedUnicode = trimmed.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const normalizedBackslash = trimmed.replace(/\\\\/g, '\\');
  const normalizedBoth = normalizedUnicode.replace(/\\\\/g, '\\');

  if (dictKeys.has(trimmed) || dictKeys.has(normalizedUnicode) || dictKeys.has(normalizedBackslash) || dictKeys.has(normalizedBoth)) {
    continue;
  }
  missing.push(trimmed);
}

// 去重并排序
const uniqueMissing = Array.from(new Set(missing)).sort((a, b) => a.localeCompare(b));

// 写入该语言专属的 missing_strings.json
const langMissingPath = path.join(localeData.dir, 'missing_strings.json');
fs.writeFileSync(langMissingPath, JSON.stringify(uniqueMissing, null, 2), 'utf8');

// 若是 zh-CN，同时更新根目录 locales/missing_strings.json 保证向下兼容
if (localeData.meta.id === 'zh-CN') {
  const rootMissingPath = path.join(rootDir, 'locales', 'missing_strings.json');
  fs.writeFileSync(rootMissingPath, JSON.stringify(uniqueMissing, null, 2), 'utf8');
}

const totalExtracted = extracted.length;
const totalDict = Object.keys(dict).length;
const totalMissing = uniqueMissing.length;
const coverage = (((totalExtracted - totalMissing) / totalExtracted) * 100).toFixed(1);

console.log('====================================================');
console.log(`     Antigravity 语言覆盖率统计报告 [${localeData.meta.id}]     `);
console.log('====================================================');
console.log(`• 目标语言:           ${localeData.meta.id} - ${localeData.meta.nativeName}`);
console.log(`• 提取原始词条总量:   ${totalExtracted} 条`);
console.log(`• 核心字典已收录条目: ${totalDict} 条`);
console.log(`• 待翻译/未覆盖词条:  ${totalMissing} 条`);
console.log(`• 估算整体覆盖率:     ${coverage}%`);
console.log('----------------------------------------------------');
console.log(`[成功] 已更新待翻译清单: ${path.relative(rootDir, langMissingPath)}`);
console.log(`提示: 欢迎在 locales/${localeData.meta.id}/dict.json 中添加待翻译词条！`);
console.log('====================================================');
