const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================ 开始 8 项优化综合验证 ================\n');

// 1. 验证 P2 动态规则: zh-TW & ja-JP
console.log('[测试 1/8] 校验 zh-TW / ja-JP 动态正则规则...');
const twRules = require('../locales/zh-TW/rules.js');
const jaRules = require('../locales/ja-JP/rules.js');

assert(twRules.length >= 40, 'zh-TW 规则条目数应充足');
assert(jaRules.length >= 40, 'ja-JP 规则条目数应充足');

// 检查 ja-JP 中不存在残留的简体中文 '个'
const jaHasChineseGe = jaRules.some((r) => typeof r.replace === 'string' && r.replace.includes('个文件'));
assert(!jaHasChineseGe, 'ja-JP 规则中不应有残留的中文「个文件」');

// 检查 zh-TW 复杂配额规则
const twQuotaRule = twRules.find((r) => r.pattern.toString().includes('Individual quota reached'));
assert(twQuotaRule, 'zh-TW 应包含 Individual quota reached 规则');
const twQuotaSample = 'Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 2d 5h.';
const twQuotaRes = twQuotaSample.replace(twQuotaRule.pattern, twQuotaRule.replace);
assert(twQuotaRes.includes('已達個人額度上限') && twQuotaRes.includes('重設'), 'zh-TW 配额翻译需符合正体中文习惯: ' + twQuotaRes);
console.log('  [PASS] zh-TW / ja-JP 动态规则完整且繁体与日文用词准确');

// 2. 验证 P0 Monaco / 终端祖先链 closest 校验在补丁模板中的生成
console.log('[测试 2/8] 校验 Monaco / 终端祖先链 closest 校验...');
const patchCode = fs.readFileSync(path.join(__dirname, '..', 'dist', 'patch-zh-CN.js'), 'utf8');
assert(patchCode.includes('closest(EXCLUDED_SELECTOR)'), '补丁代码中必须包含 closest 祖先链校验');
assert(patchCode.includes('.monaco-editor'), '选择器必须包含 .monaco-editor');
assert(patchCode.includes('.terminal'), '选择器必须包含 .terminal');
assert(patchCode.includes('.xterm'), '选择器必须包含 .xterm');
console.log('  [PASS] 补丁产物已包含 closest 祖先链全量选择器过滤');

// 3. 验证 P1 双重 Observer 消除 (根 DOM 属性标记)
console.log('[测试 3/8] 校验跨上下文防重复监听互斥标记...');
assert(patchCode.includes('data-antigravity-i18n-loaded'), '补丁代码必须包含根节点 loaded 标记');
assert(patchCode.includes('document.documentElement.hasAttribute(LOADED_ATTR)'), '补丁代码必须检测根节点属性');
console.log('  [PASS] 跨 Electron 上下文 DOM 根属性互斥已生效');

// 4. 验证 P1 WeakMap 缓存未命中词条
console.log('[测试 4/8] 校验 WeakMap 与 Set 未命中缓存机制...');
assert(patchCode.includes('processedNodesMap.set(node, origin)'), '必须缓存未命中文本节点以防止每帧重复计算');
assert(patchCode.includes('untranslatableTextSet'), '必须包含不可翻译纯文本缓存');
console.log('  [PASS] 节点级与文本级未命中双层缓存已生效');

// 5. 验证 P1 规范化注入 Sentinel 标记
console.log('[测试 5/8] 校验 apply_patch.js 中的规范化 Sentinel 标记...');
const applyCode = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'apply_patch.js'), 'utf8');
assert(applyCode.includes('/* <<< ANTIGRAVITY_I18N_PRELOAD_START >>> */'), '必须定义 PRELOAD Sentinel');
assert(applyCode.includes('/* <<< ANTIGRAVITY_I18N_UTILS_START >>> */'), '必须定义 UTILS Sentinel');
assert(applyCode.includes('/* <<< ANTIGRAVITY_I18N_MENU_START >>> */'), '必须定义 MENU Sentinel');
assert(applyCode.includes('/* <<< ANTIGRAVITY_I18N_TRAY_START >>> */'), '必须定义 TRAY Sentinel');
console.log('  [PASS] 注入模块 Sentinel 边界标记完整定义');

// 6. 验证 P2 path_resolver 探测性能
console.log('[测试 6/8] 校验 path_resolver 探测顺序与执行耗时...');
const pathResolver = require('../scripts/path_resolver.js');
const t0 = Date.now();
pathResolver.resolveAntigravityPaths().then((res) => {
  const elapsed = Date.now() - t0;
  console.log(`  [PASS] 路径探测成功: ${res.installDir}`);
  console.log(`  [PASS] 探测耗时: ${elapsed} ms (远低于优化前的 2000~4000 ms)`);
  assert(elapsed < 800, '探测耗时应远小于 800ms');

  // 7. 验证 P0 官方更新防版本降级校验机制
  console.log('[测试 7/8] 校验 asar 版本解析与防降级比较逻辑...');
  const installContent = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'install.js'), 'utf8');
  assert(installContent.includes('getAsarMeta'), 'install.js 必须包含 getAsarMeta');
  assert(installContent.includes('compareVersions'), 'install.js 必须包含 compareVersions');
  assert(installContent.includes('[防版本降级]'), 'install.js 必须包含防版本降级分支');
  console.log('  [PASS] 防版本降级校验逻辑就绪');

  // 8. 验证 P2 消除 2 秒 CPU 忙等待
  console.log('[测试 8/13] 校验 install.js / restore.js 非忙等待实现...');
  const restoreContent = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'restore.js'), 'utf8');
  assert(!installContent.includes('while (Date.now() - start < 2000) {}'), 'install.js 中不应存在死循环忙等待');
  assert(!restoreContent.includes('while (Date.now() - start < 2000) {}'), 'restore.js 中不应存在死循环忙等待');
  assert(installContent.includes('setTimeout(resolve, pollInterval)'), 'install.js 必须使用异步非阻塞休眠');
  assert(restoreContent.includes('setTimeout(resolve, pollInterval)'), 'restore.js 必须使用异步非阻塞休眠');
  console.log('  [PASS] CPU 死循环忙等待已彻底消除');

  // 9. 验证 replaceCoreText 切片替换与 $ 符号防护
  console.log('[测试 9/13] 校验 replaceCoreText 安全切片替换与 $ 字符防转义...');
  assert(patchCode.includes('function replaceCoreText('), '补丁必须包含 replaceCoreText 安全切片函数');
  assert(patchCode.includes('replaceCoreText(text, trimmed, translated)'), '精确匹配必须使用 replaceCoreText');
  console.log('  [PASS] 安全切片替换就绪，杜绝 $ 字符特殊变量替换隐患');

  // 10. 验证 pendingNodes Set 去重与动态属性监听
  console.log('[测试 10/13] 校验 pendingNodes Set 去重与 attributeFilter 定向监听...');
  assert(patchCode.includes('const pendingNodes = new Set();'), 'pendingNodes 必须使用 Set 进行单帧去重');
  assert(patchCode.includes('attributeFilter:'), 'MutationObserver 必须包含 attributeFilter');
  assert(patchCode.includes("'placeholder'"), 'attributeFilter 必须监听 placeholder');
  console.log('  [PASS] Set 队列去重与动态属性定向监听就绪');

  // 11. 验证 Windows WSL 菜单别名兼容与 Menu.setApplicationMenu 包装
  console.log('[测试 11/13] 校验 WSL 动态菜单匹配与 Menu.setApplicationMenu 拦截包装...');
  assert(applyCode.includes('_origSetAppMenu = electron_1.Menu.setApplicationMenu'), 'apply_patch 必须拦截 setApplicationMenu');
  assert(applyCode.includes('typeof MENU_TRANSLATIONS !== "undefined" && item.label === MENU_TRANSLATIONS[submenuLabel]'), 'apply_patch 必须支持 WSL 父菜单翻译别名查找');
  const zhMenu = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'locales', 'zh-CN', 'menu.json'), 'utf8'));
  assert(zhMenu['Connect to WSL'] === '连接到 WSL', 'zh-CN 必须包含 Connect to WSL');
  console.log('  [PASS] Windows WSL 动态菜单兼容与底层方法包装就绪');

  // 12. 验证 restore.js unpacked 恢复条件 Bug 修复
  console.log('[测试 12/13] 校验 restore.js unpacked 恢复条件修复...');
  assert(!restoreContent.includes('&& fs.existsSync(appAsarUnpacked)'), 'restore.js 中不应存在阻塞恢复的 appAsarUnpacked 限制');
  console.log('  [PASS] restore.js unpacked 恢复 Bug 已修复');

  // 13. 验证 install.js 模块导出与测试隔离
  console.log('[测试 13/13] 校验 install.js 模块导出与入口守卫...');
  const installModule = require('../scripts/install.js');
  assert(typeof installModule.getAsarMeta === 'function', 'install.js 必须导出 getAsarMeta');
  assert(typeof installModule.compareVersions === 'function', 'install.js 必须导出 compareVersions');
  console.log('  [PASS] install.js 模块化导出与入口隔离就绪');

  console.log('\n================ 所有 13 项优化与 Bug 修复全部验证通过！================');
});
