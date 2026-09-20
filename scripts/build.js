const fs = require('fs');
const path = require('path');
const localeManager = require('./locale_manager');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 解析命令行参数
const argv = process.argv.slice(2);
function getArgValue(arg) {
  const index = argv.indexOf(arg);
  if (index !== -1 && index + 1 < argv.length) {
    return argv[index + 1];
  }
  return null;
}

const targetLang = getArgValue('--lang') || getArgValue('-l');
const buildAll = argv.includes('--all') || !targetLang;

function serializeRules(rules) {
  if (!rules || !rules.length) return '[]';
  const items = rules.map((r) => {
    const pat = r.pattern ? r.pattern.toString() : '/^$/';
    let rep;
    if (typeof r.replace === 'function') {
      rep = r.replace.toString();
    } else {
      rep = JSON.stringify(r.replace || '');
    }
    return `    { pattern: ${pat}, replace: ${rep} }`;
  });
  return `[\n${items.join(',\n')}\n  ]`;
}

function generatePatchCode(localeData) {
  const { meta, dict, rules } = localeData;
  const dictJson = JSON.stringify(dict, null, 2);
  const serializedRules = serializeRules(rules);
  const fontFamily = meta.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important';

  return `/**
 * Antigravity UI 界面多语言国际化补丁 [${meta.id} - ${meta.nativeName}]
 * Antigravity UI Multi-Language i18n Patch
 * (由 scripts/build.js 依据 locales/${meta.id} 自动构建生成)
 */

(function () {
  'use strict';

  if (typeof window !== 'undefined') {
    if (window.__antigravity_i18n_patch_loaded__) return;
    window.__antigravity_i18n_patch_loaded__ = true;
    window.__antigravity_i18n_lang__ = ${JSON.stringify(meta.id)};
  }

  // 1. 词典配置：精确匹配字典 (${Object.keys(dict).length} 条)
  const EXACT_DICT = ${dictJson};

  // 2. 正则动态匹配规则（处理数字、相对时间、前缀短句、配额与积分）
  const REGEX_RULES = ${serializedRules};

  // 3. 需排除的标签与类名（保护代码、终端与用户输入文本）
  const EXCLUDED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA']);
  const EXCLUDED_CLASSES = [
    'monaco-editor',
    'monaco-diff-editor',
    'terminal',
    'xterm',
    'hljs',
    'prism-code',
    'code-block',
  ];

  function shouldSkipElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (EXCLUDED_TAGS.has(element.tagName)) return true;
    if (element.isContentEditable) return true;
    
    const className = element.className;
    if (typeof className === 'string') {
      for (let i = 0; i < EXCLUDED_CLASSES.length; i++) {
        if (className.includes(EXCLUDED_CLASSES[i])) return true;
      }
    }

    if (element.hasAttribute('data-lexical-editor') || element.hasAttribute('data-slate-editor')) {
      return true;
    }

    return false;
  }

  function translateText(text) {
    if (!text || typeof text !== 'string') return text;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 500) return text;

    // 1. 精确匹配
    if (EXACT_DICT.hasOwnProperty(trimmed)) {
      const translated = EXACT_DICT[trimmed];
      return text.replace(trimmed, translated);
    }

    // 2. 正则规则匹配
    for (let i = 0; i < REGEX_RULES.length; i++) {
      const rule = REGEX_RULES[i];
      if (rule.pattern.test(trimmed)) {
        return text.replace(trimmed, trimmed.replace(rule.pattern, rule.replace));
      }
    }

    return text;
  }

  function translateAttributes(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;

    const attrs = ['placeholder', 'title', 'aria-label', 'data-tooltip', 'data-tooltip-content', 'data-tip'];
    for (let i = 0; i < attrs.length; i++) {
      const attr = attrs[i];
      const val = element.getAttribute(attr);
      if (val) {
        const translated = translateText(val);
        if (translated !== val) {
          element.setAttribute(attr, translated);
        }
      }
    }

    if (element.tagName === 'INPUT' && (element.type === 'button' || element.type === 'submit')) {
      const val = element.value;
      if (val) {
        const translated = translateText(val);
        if (translated !== val) {
          element.value = translated;
        }
      }
    }
  }

  const translatedNodesMap = new WeakMap();

  function processNode(node) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const origin = node.nodeValue;
      if (!origin || !origin.trim()) return;

      const lastTranslated = translatedNodesMap.get(node);
      if (lastTranslated === origin) return;

      const parent = node.parentElement;
      if (parent && shouldSkipElement(parent)) return;

      const translated = translateText(origin);
      if (translated !== origin) {
        translatedNodesMap.set(node, translated);
        node.nodeValue = translated;
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (shouldSkipElement(node)) return;

      translateAttributes(node);

      let child = node.firstChild;
      while (child) {
        processNode(child);
        child = child.nextSibling;
      }
    }
  }

  let pendingNodes = [];
  let isScheduled = false;

  function flushPendingNodes() {
    isScheduled = false;
    const nodes = pendingNodes;
    pendingNodes = [];
    for (let i = 0; i < nodes.length; i++) {
      processNode(nodes[i]);
    }
  }

  function scheduleNode(node) {
    pendingNodes.push(node);
    if (!isScheduled) {
      isScheduled = true;
      if (window.requestAnimationFrame) {
        window.requestAnimationFrame(flushPendingNodes);
      } else {
        setTimeout(flushPendingNodes, 16);
      }
    }
  }

  function initObserver() {
    const observer = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        if (mutation.type === 'childList') {
          for (let j = 0; j < mutation.addedNodes.length; j++) {
            scheduleNode(mutation.addedNodes[j]);
          }
        } else if (mutation.type === 'characterData') {
          scheduleNode(mutation.target);
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    processNode(document.body || document.documentElement);
  }

  function injectCustomFont() {
    try {
      if (document.getElementById('antigravity-i18n-font')) return;
      const style = document.createElement('style');
      style.id = 'antigravity-i18n-font';
      style.textContent = \`
        body, button, input, select, textarea {
          font-family: ${fontFamily};
        }
        code, pre, .terminal, .monaco-editor {
          font-family: Consolas, "Cascadia Code", monospace !important;
        }
      \`;
      (document.head || document.documentElement).appendChild(style);
    } catch (e) {
      console.error('[Antigravity-i18n] 字体注入失败:', e);
    }
  }

  function initialize() {
    injectCustomFont();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initObserver();
      });
    } else {
      initObserver();
    }
  }

  initialize();
})();
`;
}

function buildLocale(langId) {
  const localeData = localeManager.loadLocale(langId);
  const patchCode = generatePatchCode(localeData);
  const outFileName = `patch-${localeData.meta.id}.js`;
  const outPath = path.join(distDir, outFileName);

  fs.writeFileSync(outPath, patchCode, 'utf8');
  console.log(`[成功] 已为 [${localeData.meta.id}] (${localeData.meta.nativeName}) 构建补丁: ${path.relative(rootDir, outPath)} (${fs.statSync(outPath).size} 字节，词汇 ${Object.keys(localeData.dict).length} 条)`);

  // 针对 zh-CN，同时保留并更新旧产物 dist/chinese_patch.js 保证完全向下兼容
  if (localeData.meta.id === 'zh-CN') {
    const legacyOutPath = path.join(distDir, 'chinese_patch.js');
    fs.writeFileSync(legacyOutPath, patchCode, 'utf8');
    console.log(`[兼容] 已同步更新兼容产物: ${path.relative(rootDir, legacyOutPath)}`);
  }

  return outPath;
}

function ensureScriptLineEndings() {
  const binDir = path.join(rootDir, 'bin');
  if (fs.existsSync(binDir)) {
    const files = fs.readdirSync(binDir);
    for (const f of files) {
      const full = path.join(binDir, f);
      if (f.endsWith('.bat') || f.endsWith('.cmd')) {
        let content = fs.readFileSync(full, 'utf8');
        content = content.replace(/\r?\n/g, '\r\n');
        fs.writeFileSync(full, content, 'utf8');
      } else if (f.endsWith('.sh')) {
        let content = fs.readFileSync(full, 'utf8');
        content = content.replace(/\r?\n/g, '\n');
        fs.writeFileSync(full, content, 'utf8');
      }
    }
  }
}

function main() {
  console.log('====================================================');
  console.log('       Antigravity 多语言 i18n 补丁构建编译工具     ');
  console.log('====================================================');

  const available = localeManager.getAvailableLocales();
  if (!available.length) {
    console.error('[错误] 未在 locales/ 目录下扫描到任何有效语言包！');
    process.exit(1);
  }

  if (targetLang) {
    buildLocale(targetLang);
  } else {
    console.log(`[信息] 开始全量构建所有语言包 (${available.length} 个)...`);
    for (const item of available) {
      buildLocale(item.id);
    }
  }

  // 规范化启动脚本换行符：.bat 为 CRLF，.sh 为 LF
  ensureScriptLineEndings();

  console.log('====================================================');
  console.log('[完成] 补丁构建编译任务全部完成！');
  console.log('====================================================\n');
}

if (require.main === module) {
  main();
}

module.exports = {
  buildLocale,
  generatePatchCode,
};
