const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const localeManager = require('./locale_manager');

const targetDir = process.argv[2];
const targetLang = process.argv[3] || 'zh-CN';

if (!targetDir || !fs.existsSync(targetDir)) {
  console.error('[错误] 目标解包目录不存在:', targetDir);
  process.exit(1);
}

const rootDir = path.resolve(__dirname, '..');
const localeData = localeManager.loadLocale(targetLang);
const patchFileName = `patch-${localeData.meta.id}.js`;
let patchSource = path.join(rootDir, 'dist', patchFileName);

// 如果对应的编译产物不存在，自动调用 build.js 进行构建
if (!fs.existsSync(patchSource)) {
  console.log(`[提示] 未找到 dist/${patchFileName}，正在为 [${localeData.meta.id}] 自动构建...`);
  try {
    const buildScript = path.join(__dirname, 'build.js');
    execSync(`node "${buildScript}" --lang "${localeData.meta.id}"`, { stdio: 'inherit' });
  } catch (e) {
    console.error('[错误] 自动构建补丁产物失败:', e);
    process.exit(1);
  }
}

if (!fs.existsSync(patchSource)) {
  // 降级检查兼容文件 chinese_patch.js
  const fallback = path.join(rootDir, 'dist', 'chinese_patch.js');
  if (fs.existsSync(fallback)) patchSource = fallback;
}

const patchCode = fs.readFileSync(patchSource, 'utf8');

// 1. 将语言补丁代码内联注入到 dist/preload.js
const preloadPath = path.join(targetDir, 'dist', 'preload.js');
if (!fs.existsSync(preloadPath)) {
  console.error('[错误] 未在目标目录中找到 dist/preload.js');
  process.exit(1);
}

let preloadContent = fs.readFileSync(preloadPath, 'utf8');

// 清除历史版本注入标记（支持重复安装与任意语言互相切换）
preloadContent = preloadContent.replace(/\/\/ =*[\s\S]*?require\('\.\/chinese_patch\.js'\);[\s\S]*?}/g, '');
preloadContent = preloadContent.replace(/\/\/ --- Antigravity (?:简体中文汉化|多语言 i18n)补丁 ---[\s\S]*?}/g, '');
preloadContent = preloadContent.replace(/\/\/ =*[\r\n]+\/\/\s*Antigravity\s*(?:简体中文汉化|多语言 i18n|UI)[\s\S]*?\/\/ =*[\r\n]+try\s*\{[\s\S]*?\}\s*catch\s*\(err\)\s*\{[\s\S]*?\}/g, '');

const inlineInjection = `
// ====================================================
// Antigravity 多语言 i18n 补丁 [${localeData.meta.id} - ${localeData.meta.nativeName}] (内联完整注入)
// ====================================================
try {
${patchCode}
} catch (err) {
  console.error('[Antigravity-i18n] 补丁内联执行异常:', err);
}
`;

console.log(`正在向 dist/preload.js 注入 [${localeData.meta.id} - ${localeData.meta.nativeName}] 界面语言引擎...`);
preloadContent += '\n' + inlineInjection;
fs.writeFileSync(preloadPath, preloadContent, 'utf8');

// 2. 在 dist/utils.js 里的 createWindow 中添加 did-finish-load 注入，形成双保险
const utilsPath = path.join(targetDir, 'dist', 'utils.js');
if (fs.existsSync(utilsPath)) {
  let utilsContent = fs.readFileSync(utilsPath, 'utf8');
  // 如果已存在注入标记，先清理旧注入保障代码
  if (utilsContent.includes('/* antigravity_chinese_patch_injected */') || utilsContent.includes('/* antigravity_i18n_patch_injected */')) {
    utilsContent = utilsContent.replace(
      /win\.webContents\.on\('did-finish-load',\s*\(\)\s*=>\s*\{\s*\/\*\s*antigravity_[a-z0-9_]+_injected\s*\*\/[\s\S]*?void win\.webContents\.executeJavaScript\([\s\S]*?\)\.catch\(\(\)\s*=>\s*\{\}\);/g,
      "win.webContents.on('did-finish-load', () => {"
    );
  }

  console.log(`正在向 dist/utils.js 注入 [${localeData.meta.id}] 二次保障逻辑...`);
  if (utilsContent.includes("win.webContents.on('did-finish-load', () => {")) {
    utilsContent = utilsContent.replace(
      "win.webContents.on('did-finish-load', () => {",
      "win.webContents.on('did-finish-load', () => { /* antigravity_i18n_patch_injected */\n            void win.webContents.executeJavaScript(" + JSON.stringify(patchCode) + ").catch(() => {});"
    );
    fs.writeFileSync(utilsPath, utilsContent, 'utf8');
  }
}

// 3. 修改 dist/menu.js 原生主菜单
const menuPath = path.join(targetDir, 'dist', 'menu.js');
if (fs.existsSync(menuPath)) {
  let menuContent = fs.readFileSync(menuPath, 'utf8');
  const menuMap = localeData.menu || {};

  // 清除旧的菜单翻译代码（支持多语言互相切换覆盖）
  menuContent = menuContent.replace(/\s*const MENU_TRANSLATIONS = [\s\S]*?translateSubmenu\(menu\);/g, '');

  if (Object.keys(menuMap).length > 0) {
    console.log(`正在本地化 dist/menu.js 原生菜单 [${localeData.meta.id}] (${Object.keys(menuMap).length} 条)...`);
    const menuTranslateCode = `
    const MENU_TRANSLATIONS = ${JSON.stringify(menuMap, null, 8)};
    function translateSubmenu(menuObj) {
        if (!menuObj || !menuObj.items) return;
        menuObj.items.forEach(it => {
            if (it.label && MENU_TRANSLATIONS[it.label]) {
                it.label = MENU_TRANSLATIONS[it.label];
            }
            if (it.submenu) {
                translateSubmenu(it.submenu);
            }
        });
    }
    translateSubmenu(menu);`;

    if (menuContent.includes('electron_1.Menu.setApplicationMenu(menu);')) {
      menuContent = menuContent.replace(
        'electron_1.Menu.setApplicationMenu(menu);',
        menuTranslateCode + '\n    electron_1.Menu.setApplicationMenu(menu);'
      );
      fs.writeFileSync(menuPath, menuContent, 'utf8');
    }
  }
}

// 4. 修改 dist/tray.js 托盘菜单
const trayPath = path.join(targetDir, 'dist', 'tray.js');
if (fs.existsSync(trayPath)) {
  let trayContent = fs.readFileSync(trayPath, 'utf8');
  const trayConfig = localeData.meta.tray || {};
  const runningTpl = trayConfig.runningTemplate;
  const noAgentsText = trayConfig.noAgents;

  if (runningTpl && noAgentsText) {
    console.log(`正在本地化 dist/tray.js 托盘菜单 [${localeData.meta.id}]...`);
    // 还原已有的托盘匹配
    trayContent = trayContent.replace(
      /countItem\.label\s*=\s*\(count > 0 \? [^;]+ : [^;]+\);/g,
      "countItem.label = (count > 0 ? `${count}` : 'No') + ' agent' + (count === 1 ? '' : 's') + ' running';"
    );

    let replacement;
    if (runningTpl.includes('{plural}')) {
      replacement = `countItem.label = (count > 0 ? \`${runningTpl.replace('{count}', '${count}').replace('{plural}', "${count === 1 ? '' : 's'}")}\` : ${JSON.stringify(noAgentsText)});`;
    } else {
      replacement = `countItem.label = (count > 0 ? \`${runningTpl.replace('{count}', '${count}')}\` : ${JSON.stringify(noAgentsText)});`;
    }

    trayContent = trayContent.replace(
      /countItem\.label\s*=\s*\(count > 0 \? `\$\{count\}` : 'No'\)\s*\+\s*' agent'\s*\+\s*\(count === 1 \? '' : 's'\)\s*\+\s*' running';/g,
      replacement
    );
    fs.writeFileSync(trayPath, trayContent, 'utf8');
  }
}

// 5. 写入当前安装语言标记文件
try {
  const metaRecord = {
    lang: localeData.meta.id,
    name: localeData.meta.name,
    nativeName: localeData.meta.nativeName,
    installedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(targetDir, '.antigravity_i18n.json'), JSON.stringify(metaRecord, null, 2), 'utf8');
} catch (e) {}

console.log(`[成功] [${localeData.meta.id} - ${localeData.meta.nativeName}] 语言补丁注入完毕！`);
