/**
 * Antigravity UI 界面多语言国际化补丁 [en-US - English (US)]
 * Antigravity UI Multi-Language i18n Patch
 * (由 scripts/build.js 依据 locales/en-US 自动构建生成)
 */

(function () {
  'use strict';

  if (typeof window !== 'undefined') {
    if (window.__antigravity_i18n_patch_loaded__) return;
    window.__antigravity_i18n_patch_loaded__ = true;
    window.__antigravity_i18n_lang__ = "en-US";
  }

  // 1. 词典配置：精确匹配字典 (0 条)
  const EXACT_DICT = {};

  // 2. 正则动态匹配规则（处理数字、相对时间、前缀短句、配额与积分）
  const REGEX_RULES = [];

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
      style.textContent = `
        body, button, input, select, textarea {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
        }
        code, pre, .terminal, .monaco-editor {
          font-family: Consolas, "Cascadia Code", monospace !important;
        }
      `;
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
