/**
 * Antigravity UI 界面多语言国际化补丁 [en-US - English (US)]
 * Antigravity UI Multi-Language i18n Patch
 * (由 scripts/build.js 依据 locales/en-US 自动构建生成)
 */

(function () {
  'use strict';

  // 0. 消除 preload 与 did-finish-load 的重复监听 (跨 Electron 上下文互斥)
  const LOADED_ATTR = 'data-antigravity-i18n-loaded';
  if (typeof document !== 'undefined' && document.documentElement) {
    if (document.documentElement.hasAttribute(LOADED_ATTR)) return;
    document.documentElement.setAttribute(LOADED_ATTR, 'true');
  }

  if (typeof window !== 'undefined') {
    if (window.__antigravity_i18n_patch_loaded__) return;
    window.__antigravity_i18n_patch_loaded__ = true;
    window.__antigravity_i18n_lang__ = "en-US";
  }

  // 1. 词典配置：精确匹配字典 (0 条)
  const EXACT_DICT = {};

  // 2. 正则动态匹配规则（处理数字、相对时间、前缀短句、配额与积分）
  const REGEX_RULES = [];

  // 3. 需排除的标签与选择器（保护代码、终端与用户输入文本）
  const EXCLUDED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'TEXTAREA']);
  const EXCLUDED_SELECTOR = [
    'code',
    'pre',
    'script',
    'style',
    'noscript',
    'textarea',
    '.monaco-editor',
    '.monaco-diff-editor',
    '.terminal',
    '.xterm',
    '.hljs',
    '.prism-code',
    '.code-block',
    '[contenteditable="true"]',
    '[data-lexical-editor]',
    '[data-slate-editor]',
  ].join(', ');

  function shouldSkipElement(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (EXCLUDED_TAGS.has(element.tagName)) return true;
    if (element.isContentEditable) return true;

    // Monaco/终端祖先链 closest 校验，彻底杜绝内层 DOM 节点汉化误伤代码
    if (typeof element.closest === 'function') {
      try {
        if (element.closest(EXCLUDED_SELECTOR)) return true;
      } catch (e) {}
    }

    const className = element.className;
    if (typeof className === 'string') {
      if (
        className.includes('monaco-editor') ||
        className.includes('terminal') ||
        className.includes('xterm') ||
        className.includes('hljs') ||
        className.includes('code-block')
      ) {
        return true;
      }
    }

    if (element.hasAttribute('data-lexical-editor') || element.hasAttribute('data-slate-editor')) {
      return true;
    }

    return false;
  }

  const untranslatableTextSet = new Set();

  function replaceCoreText(fullText, oldCore, newCore) {
    if (fullText === oldCore) return newCore;
    const idx = fullText.indexOf(oldCore);
    if (idx === -1) return fullText;
    return fullText.slice(0, idx) + newCore + fullText.slice(idx + oldCore.length);
  }

  function translateText(text) {
    if (!text || typeof text !== 'string') return text;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 500) return text;

    // 快速未命中缓存过滤
    if (untranslatableTextSet.has(trimmed)) return text;

    // 1. 精确匹配 (安全切片替换，杜绝 $ 字符特殊变量替换隐患)
    if (EXACT_DICT.hasOwnProperty(trimmed)) {
      const translated = EXACT_DICT[trimmed];
      return replaceCoreText(text, trimmed, translated);
    }

    // 2. 正则规则匹配
    for (let i = 0; i < REGEX_RULES.length; i++) {
      const rule = REGEX_RULES[i];
      if (rule.pattern.test(trimmed)) {
        const replacedTrimmed = trimmed.replace(rule.pattern, rule.replace);
        return replaceCoreText(text, trimmed, replacedTrimmed);
      }
    }

    // 未命中文本缓存（上限 10000 条防内存膨胀）
    if (untranslatableTextSet.size < 10000) {
      untranslatableTextSet.add(trimmed);
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

  const processedNodesMap = new WeakMap();

  function processNode(node) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const origin = node.nodeValue;
      if (!origin || !origin.trim()) return;

      // WeakMap 节点级缓存：如果文本内容未发生变化，直接跳过
      const lastText = processedNodesMap.get(node);
      if (lastText === origin) return;

      const parent = node.parentElement;
      if (parent && shouldSkipElement(parent)) {
        // 标记已处理，防止同一排除节点在每一帧无休止重走判断
        processedNodesMap.set(node, origin);
        return;
      }

      const translated = translateText(origin);
      if (translated !== origin) {
        processedNodesMap.set(node, translated);
        node.nodeValue = translated;
      } else {
        // 关键修复：未命中词条同样缓存，消除不可翻译文本每一帧遍历时的无效字典与正则查找
        processedNodesMap.set(node, origin);
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

  const pendingNodes = new Set();
  let isScheduled = false;

  function flushPendingNodes() {
    isScheduled = false;
    const nodes = Array.from(pendingNodes);
    pendingNodes.clear();
    for (let i = 0; i < nodes.length; i++) {
      processNode(nodes[i]);
    }
  }

  function scheduleNode(node) {
    if (!node) return;
    pendingNodes.add(node);
    if (!isScheduled) {
      isScheduled = true;
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
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
        } else if (mutation.type === 'attributes') {
          if (mutation.target && mutation.target.nodeType === Node.ELEMENT_NODE) {
            translateAttributes(mutation.target);
          }
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label', 'data-tooltip', 'data-tooltip-content', 'data-tip'],
    });

    processNode(document.body || document.documentElement);
  }

  function injectCustomFont() {
    try {
      if (document.getElementById('antigravity-i18n-font')) return;
      const style = document.createElement('style');
      style.id = 'antigravity-i18n-font';
      style.textContent = `
        body, button:not([class*="codicon"]):not([class*="icon"]), input, select, textarea {
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
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute(LOADED_ATTR, 'true');
    }
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
