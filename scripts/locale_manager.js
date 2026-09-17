const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const localesDir = path.join(rootDir, 'locales');

/**
 * 获取语言包根目录
 */
function getLocalesDir() {
  return localesDir;
}

/**
 * 扫描并获取所有可用的语言包列表
 * @returns {Array<{id: string, name: string, nativeName: string, description: string, dir: string, hasRules: boolean, hasMenu: boolean}>}
 */
function getAvailableLocales() {
  if (!fs.existsSync(localesDir)) {
    return [];
  }

  const entries = fs.readdirSync(localesDir, { withFileTypes: true });
  const locales = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const langId = entry.name;
    const langDir = path.join(localesDir, langId);
    const manifestPath = path.join(langDir, 'manifest.json');
    const dictPath = path.join(langDir, 'dict.json');

    // 必须具备 manifest.json 或 dict.json
    if (!fs.existsSync(manifestPath) && !fs.existsSync(dictPath)) {
      continue;
    }

    let manifest = {};
    if (fs.existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (e) {
        console.warn(`[警告] 解析语言包元数据失败: ${manifestPath}`);
      }
    }

    const id = manifest.id || langId;
    const name = manifest.name || id;
    const nativeName = manifest.nativeName || name;
    const description = manifest.description || '';

    locales.push({
      id,
      dirName: langId,
      name,
      nativeName,
      description,
      dir: langDir,
      hasDict: fs.existsSync(dictPath),
      hasRules: fs.existsSync(path.join(langDir, 'rules.js')),
      hasMenu: fs.existsSync(path.join(langDir, 'menu.json')),
      manifest,
    });
  }

  // zh-CN 优先排在第一位，其他按 ID 字典序排列
  locales.sort((a, b) => {
    if (a.id === 'zh-CN') return -1;
    if (b.id === 'zh-CN') return 1;
    return a.id.localeCompare(b.id);
  });

  return locales;
}

/**
 * 加载特定语言包的全部数据
 * @param {string} langId 语言代号，如 "zh-CN"
 */
function loadLocale(langId) {
  const locales = getAvailableLocales();
  const found = locales.find((l) => l.id.toLowerCase() === langId.toLowerCase() || l.dirName.toLowerCase() === langId.toLowerCase());

  if (!found) {
    throw new Error(`未找到语言包: ${langId}。可用的语言包: ${locales.map((l) => l.id).join(', ')}`);
  }

  const langDir = found.dir;
  const manifestPath = path.join(langDir, 'manifest.json');
  const dictPath = path.join(langDir, 'dict.json');
  const rulesPath = path.join(langDir, 'rules.js');
  const menuPath = path.join(langDir, 'menu.json');

  let manifest = found.manifest || {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      console.warn(`[警告] 重新解析 manifest 异常: ${e.message}`);
    }
  }

  let dict = {};
  if (fs.existsSync(dictPath)) {
    try {
      dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
    } catch (e) {
      throw new Error(`语言包 ${langId} 的 dict.json 解析失败: ${e.message}`);
    }
  }

  let rules = [];
  if (fs.existsSync(rulesPath)) {
    try {
      delete require.cache[require.resolve(rulesPath)];
      rules = require(rulesPath);
    } catch (e) {
      console.warn(`[警告] 加载 rules.js 异常: ${e.message}`);
    }
  }

  let menu = {};
  if (fs.existsSync(menuPath)) {
    try {
      menu = JSON.parse(fs.readFileSync(menuPath, 'utf8'));
    } catch (e) {
      console.warn(`[警告] 加载 menu.json 异常: ${e.message}`);
    }
  }

  return {
    meta: {
      id: found.id,
      name: found.name,
      nativeName: found.nativeName,
      description: found.description,
      fontFamily: manifest.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      tray: manifest.tray || {},
      ...manifest,
    },
    dir: langDir,
    dict,
    rules,
    menu,
  };
}

module.exports = {
  getLocalesDir,
  getAvailableLocales,
  loadLocale,
};
