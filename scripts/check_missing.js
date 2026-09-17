const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dictPath = path.join(rootDir, 'locales', 'dict.json');
const extractedPath = path.join(rootDir, 'locales', 'extracted_strings.json');
const missingPath = path.join(rootDir, 'locales', 'missing_strings.json');

if (!fs.existsSync(dictPath)) {
  console.error('[错误] 未找到字典文件:', dictPath);
  process.exit(1);
}

if (!fs.existsSync(extractedPath)) {
  console.error('[错误] 未找到提取词条库:', extractedPath);
  process.exit(1);
}

const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const extracted = JSON.parse(fs.readFileSync(extractedPath, 'utf8'));

const dictKeys = new Set(Object.keys(dict).map(s => s.trim()));

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

fs.writeFileSync(missingPath, JSON.stringify(uniqueMissing, null, 2), 'utf8');

const totalExtracted = extracted.length;
const totalDict = Object.keys(dict).length;
const totalMissing = uniqueMissing.length;
const coverage = (((totalExtracted - totalMissing) / totalExtracted) * 100).toFixed(1);

console.log('====================================================');
console.log('       Antigravity 汉化补丁词典覆盖率统计报告       ');
console.log('====================================================');
console.log(`• 提取原始词条总量:   ${totalExtracted} 条`);
console.log(`• 核心字典已收录条目: ${totalDict} 条`);
console.log(`• 待翻译/未覆盖词条:  ${totalMissing} 条`);
console.log(`• 估算整体覆盖率:     ${coverage}%`);
console.log('----------------------------------------------------');
console.log(`[成功] 已自动更新待翻译清单: ${path.relative(rootDir, missingPath)}`);
console.log('提示: 欢迎在 locales/dict.json 中添加待翻译词条以扩充词库！');
console.log('====================================================');
