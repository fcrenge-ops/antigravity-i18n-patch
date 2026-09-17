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
  // 过滤纯代码碎片或无实际翻译意义的符号
  if (trimmed.startsWith('${') || trimmed.startsWith(')){') || trimmed.startsWith(',l)')) continue;
  if (!dictKeys.has(trimmed)) {
    missing.push(trimmed);
  }
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
