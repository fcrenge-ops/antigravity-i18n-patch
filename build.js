const fs = require('fs');
const path = require('path');

const dictPath = path.join(__dirname, 'dict.json');
const outputPath = path.join(__dirname, 'chinese_patch.js');

if (!fs.existsSync(dictPath)) {
  console.error('[错误] 未找到 dict.json 文件！');
  process.exit(1);
}

const dictData = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const dictJson = JSON.stringify(dictData, null, 2);

const jsTemplate = `/**
 * Antigravity UI 界面全量简体中文汉化补丁
 * Antigravity Full Chinese Localization Patch
 * (由 build.js 依据 dict.json 自动构建生成)
 */

(function () {
  'use strict';

  // 1. 词典配置：精确匹配字典
  const EXACT_DICT = ${dictJson};

  // 2. 正则动态匹配规则（处理数字、相对时间、前缀短句）
  const REGEX_RULES = [
    { pattern: /^Thought for (\\d+)(s|m|h)$/i, replace: '思考耗时 $1$2' },
    { pattern: /^Worked for (\\d+)(s|m|h)$/i, replace: '工作耗时 $1$2' },
    { pattern: /^Updated\\s+(\\d{1,2}:\\d{2})$/i, replace: '更新于 $1' },
    { pattern: /^(\\d+)\\s+commands?$/i, replace: '$1 条命令' },
    { pattern: /^(\\d+)\\s+conversations?$/i, replace: '$1 个对话' },
    { pattern: /^(\\d+)\\s+tasks?$/i, replace: '$1 个任务' },
    { pattern: /^(\\d+)\\s+files?\\s+changed$/i, replace: '$1 个文件已更改' },
    { pattern: /^(\\d+)\\s+subagents?$/i, replace: '$1 个子智能体' },
    { pattern: /^(\\d+)m\\s+ago$/i, replace: '$1 分钟前' },
    { pattern: /^(\\d+)h\\s+ago$/i, replace: '$1 小时前' },
    { pattern: /^(\\d+)d\\s+ago$/i, replace: '$1 天前' },
    { pattern: /^Just now$/i, replace: '刚刚' },
    { pattern: /^Yesterday$/i, replace: '昨天' },
    { pattern: /Learn more about (.*)/i, replace: '了解更多关于 $1 的信息' },
    { pattern: /Controls the actions the agent can take\\.?/i, replace: '控制智能体可以执行的操作。' },
    { pattern: /Whether the agent asks you to review its documents\\.?/i, replace: '智能体生成文档工件时是否需要您进行审查。' },
  ];

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

    const attrs = ['placeholder', 'title', 'aria-label', 'data-tooltip'];
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
  }

  const translatedNodes = new WeakSet();

  function processNode(node) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      if (translatedNodes.has(node)) return;
      const parent = node.parentElement;
      if (parent && shouldSkipElement(parent)) return;

      const origin = node.nodeValue;
      if (origin && origin.trim()) {
        const translated = translateText(origin);
        if (translated !== origin) {
          translatedNodes.add(node);
          node.nodeValue = translated;
        }
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

  function injectChineseFont() {
    try {
      if (document.getElementById('antigravity-chinese-font')) return;
      const style = document.createElement('style');
      style.id = 'antigravity-chinese-font';
      style.textContent = \`
        body, button, input, select, textarea {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif !important;
        }
        code, pre, .terminal, .monaco-editor {
          font-family: Consolas, "Cascadia Code", monospace !important;
        }
      \`;
      (document.head || document.documentElement).appendChild(style);
    } catch (e) {
      console.error('[Antigravity-CN] 字体注入失败:', e);
    }
  }

  function initialize() {
    injectChineseFont();
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

fs.writeFileSync(outputPath, jsTemplate, 'utf8');
console.log(`[成功] 已根据 dict.json（共 ${Object.keys(dictData).length} 条词汇）重新构建生成 chinese_patch.js (${fs.statSync(outputPath).size} 字节)！`);
