const fs = require('fs');
const path = require('path');

const targetDir = process.argv[2];
if (!targetDir || !fs.existsSync(targetDir)) {
  console.error('[错误] 目标解包目录不存在:', targetDir);
  process.exit(1);
}

const patchSource = path.join(__dirname, 'chinese_patch.js');
const patchCode = fs.readFileSync(patchSource, 'utf8');

// 1. 直接将汉化代码整体内联注入到 dist/preload.js
const preloadPath = path.join(targetDir, 'dist', 'preload.js');
let preloadContent = fs.readFileSync(preloadPath, 'utf8');

// 清除旧的 require 语句（如果存在）
preloadContent = preloadContent.replace(/\/\/ =*[\s\S]*?require\('\.\/chinese_patch\.js'\);[\s\S]*?}/g, '');
preloadContent = preloadContent.replace(/\/\/ --- Antigravity 简体中文汉化补丁 ---[\s\S]*?}/g, '');

const inlineInjection = `
// ==========================================
// Antigravity 简体中文汉化补丁 (内联完整注入)
// ==========================================
try {
  ${patchCode}
} catch (err) {
  console.error('[Antigravity-CN] 汉化补丁内联执行异常:', err);
}
`;

if (!preloadContent.includes('Antigravity 简体中文汉化补丁 (内联完整注入)')) {
  console.log('正在向 dist/preload.js 内联注入完整汉化引擎...');
  preloadContent += '\n' + inlineInjection;
  fs.writeFileSync(preloadPath, preloadContent, 'utf8');
} else {
  console.log('dist/preload.js 已包含内联汉化补丁。');
}

// 2. 在 dist/utils.js 里的 createWindow 中添加 did-finish-load 注入，形成双保险
const utilsPath = path.join(targetDir, 'dist', 'utils.js');
if (fs.existsSync(utilsPath)) {
  let utilsContent = fs.readFileSync(utilsPath, 'utf8');
  if (!utilsContent.includes('antigravity_chinese_patch_injected')) {
    console.log('正在向 dist/utils.js 注入二次保障逻辑...');
    // 在 win.webContents.on('did-finish-load', () => { ... }) 附近加入 executeJavaScript
    const hookCode = `
        win.webContents.on('did-finish-load', () => {
            void win.webContents.executeJavaScript(${JSON.stringify(patchCode)}).catch(() => {});
        });
    `;
    if (utilsContent.includes("win.webContents.on('did-finish-load', () => {")) {
      utilsContent = utilsContent.replace(
        "win.webContents.on('did-finish-load', () => {",
        "win.webContents.on('did-finish-load', () => {\n            void win.webContents.executeJavaScript(" + JSON.stringify(patchCode) + ").catch(() => {});"
      );
      fs.writeFileSync(utilsPath, utilsContent, 'utf8');
    }
  }
}

// 3. 修改 dist/menu.js 原生菜单汉化
const menuPath = path.join(targetDir, 'dist', 'menu.js');
if (fs.existsSync(menuPath)) {
  let menuContent = fs.readFileSync(menuPath, 'utf8');
  if (!menuContent.includes('MENU_TRANSLATIONS')) {
    console.log('正在汉化 dist/menu.js 原生菜单...');
    const menuTranslateCode = `
    const MENU_TRANSLATIONS = {
        'File': '文件',
        'Edit': '编辑',
        'View': '查看',
        'Window': '窗口',
        'Help': '帮助',
        'New Window': '新建窗口',
        'Docs': '官方文档',
        'Check for Updates': '检查更新',
        'Undo': '撤销',
        'Redo': '重做',
        'Cut': '剪切',
        'Copy': '复制',
        'Paste': '粘贴',
        'Select All': '全选',
        'Reload': '重新加载',
        'Force Reload': '强制重新加载',
        'Toggle Developer Tools': '开发者工具',
        'Actual Size': '实际大小',
        'Zoom In': '放大',
        'Zoom Out': '缩小',
        'Toggle Full Screen': '切换全屏',
        'Minimize': '最小化',
        'Zoom': '缩放',
        'Close': '关闭',
        'Close Window': '关闭窗口',
        'Quit Antigravity': '退出 Antigravity',
        'Quit': '退出',
    };
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
    translateSubmenu(menu);
`;
    if (menuContent.includes('electron_1.Menu.setApplicationMenu(menu);')) {
      menuContent = menuContent.replace(
        'electron_1.Menu.setApplicationMenu(menu);',
        menuTranslateCode + '\n    electron_1.Menu.setApplicationMenu(menu);'
      );
      fs.writeFileSync(menuPath, menuContent, 'utf8');
    }
  }
}

// 4. 修改 dist/tray.js 托盘菜单汉化
const trayPath = path.join(targetDir, 'dist', 'tray.js');
if (fs.existsSync(trayPath)) {
  let trayContent = fs.readFileSync(trayPath, 'utf8');
  if (!trayContent.includes('智能体')) {
    console.log('正在汉化 dist/tray.js 托盘菜单...');
    trayContent = trayContent.replace(
      /countItem\.label\s*=\s*\(count > 0 \? `\$\{count\}` : 'No'\)\s*\+\s*' agent'\s*\+\s*\(count === 1 \? '' : 's'\)\s*\+\s*' running';/g,
      "countItem.label = (count > 0 ? `${count} 个正在运行的智能体` : '没有运行中的智能体');"
    );
    fs.writeFileSync(trayPath, trayContent, 'utf8');
  }
}

console.log('[成功] 增强版补丁注入完毕！');
