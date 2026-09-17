const fs = require('fs');
const path = require('path');

// 优先查找 locales/dict.json，兼容根目录 dict.json
const rootDir = path.resolve(__dirname, '..');
let dictPath = path.join(rootDir, 'locales', 'dict.json');
if (!fs.existsSync(dictPath)) {
  dictPath = path.join(rootDir, 'dict.json');
}

const distDir = path.join(rootDir, 'dist');
const outputPath = path.join(distDir, 'chinese_patch.js');

if (!fs.existsSync(dictPath)) {
  console.error('[错误] 未找到 dict.json 文件！请确保文件存在于 locales/dict.json');
  process.exit(1);
}

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const dictData = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const dictJson = JSON.stringify(dictData, null, 2);

const jsTemplate = `/**
 * Antigravity UI 界面全量简体中文汉化补丁
 * Antigravity Full Chinese Localization Patch
 * (由 scripts/build.js 依据 locales/dict.json 自动构建生成)
 */

(function () {
  'use strict';

  if (typeof window !== 'undefined') {
    if (window.__antigravity_chinese_patch_loaded__) return;
    window.__antigravity_chinese_patch_loaded__ = true;
  }

  // 1. 词典配置：精确匹配字典
  const EXACT_DICT = ${dictJson};

  // 2. 正则动态匹配规则（处理数字、相对时间、前缀短句、配额与积分）
  const REGEX_RULES = [
    { pattern: /^Thought for (\\d+)(s|m|h)$/i, replace: '思考耗时 $1$2' },
    { pattern: /^Worked for (\\d+)(s|m|h)$/i, replace: '工作耗时 $1$2' },
    { pattern: /^Updated\\s+(\\d{1,2}:\\d{2})$/i, replace: '更新于 $1' },
    { pattern: /^(\\d+)\\s+commands?$/i, replace: '$1 条命令' },
    { pattern: /^(\\d+)\\s+conversations?$/i, replace: '$1 个对话' },
    { pattern: /^(\\d+)\\s+tasks?$/i, replace: '$1 个任务' },
    { pattern: /^(\\d+)\\s+files?\\s+changed$/i, replace: '$1 个文件已更改' },
    { pattern: /^(\\d+)\\s+subagents?$/i, replace: '$1 个子智能体' },
    { pattern: /^(\\d+)\\s*m\\s+ago$/i, replace: '$1 分钟前' },
    { pattern: /^(\\d+)\\s*h\\s+ago$/i, replace: '$1 小时前' },
    { pattern: /^(\\d+)\\s*d\\s+ago$/i, replace: '$1 天前' },
    { pattern: /^(\\d+)\\s+days?\\s+ago$/i, replace: '$1 天前' },
    { pattern: /^(\\d+)\\s+hours?\\s+ago$/i, replace: '$1 小时前' },
    { pattern: /^(\\d+)\\s+minutes?\\s+ago$/i, replace: '$1 分钟前' },
    { pattern: /^(\\d+)\\s+seconds?\\s+ago$/i, replace: '$1 秒前' },
    { pattern: /^Just now$/i, replace: '刚刚' },
    { pattern: /^Yesterday$/i, replace: '昨天' },
    { pattern: /^Your Plan:\\s*(.*)$/i, replace: '当前方案: $1' },
    { pattern: /^Available AI Credits:\\s*(.*)$/i, replace: '可用 AI 积分: $1' },
    { pattern: /^Shared with:\\s*(.*)$/i, replace: '共享对象: $1' },
    { pattern: /^Resets in <1m$/i, replace: '将在 1 分钟内重置' },
    { pattern: /^Resets in (\\d+)d (\\d+)h$/i, replace: '将在 $1 天 $2 小时后重置' },
    { pattern: /^Resets in (\\d+)d$/i, replace: '将在 $1 天后重置' },
    { pattern: /^Resets in (\\d+)h (\\d+)m$/i, replace: '将在 $1 小时 $2 分钟后重置' },
    { pattern: /^Resets in (\\d+)h$/i, replace: '将在 $1 小时后重置' },
    { pattern: /^Resets in (\\d+)m$/i, replace: '将在 $1 分钟后重置' },
    {
      pattern: /^Resets in (?:(\\d+)d)?\\s*(?:(\\d+)h)?\\s*(?:(\\d+)m)?\\s*(?:(\\d+)s)?\\.?$/i,
      replace: function(match, d, h, m, s) {
        var parts = [];
        if (d) parts.push(d + ' 天');
        if (h) parts.push(h + ' 小时');
        if (m) parts.push(m + ' 分钟');
        if (s) parts.push(s + ' 秒');
        return parts.length ? ('将在 ' + parts.join(' ') + '后重置') : match;
      }
    },
    { pattern: /^Step (\\d+) of (\\d+)$/i, replace: '步骤 $1 / $2' },
    { pattern: /^Showing (\\d+) of (\\d+) results$/i, replace: '显示第 $1 / $2 项结果' },
    { pattern: /^(\\d+)\\s+files?$/i, replace: '$1 个文件' },
    { pattern: /^(\\d+)\\s+folders?$/i, replace: '$1 个文件夹' },
    { pattern: /^(\\d+)\\s+search(?:es)?$/i, replace: '$1 次搜索' },
    { pattern: /^(\\d+)\\s+folders?,\\s*(\\d+)\\s+search(?:es)?$/i, replace: '$1 个文件夹，$2 次搜索' },
    { pattern: /^(\\d+)\\s+files?,\\s*(\\d+)\\s+folders?$/i, replace: '$1 个文件，$2 个文件夹' },
    { pattern: /^(\\d+)\\s+files?,\\s*(\\d+)\\s+search(?:es)?$/i, replace: '$1 个文件，$2 次搜索' },
    { pattern: /^(\\d+)\\s+files?,\\s*(\\d+)\\s+folders?,\\s*(\\d+)\\s+search(?:es)?$/i, replace: '$1 个文件，$2 个文件夹，$3 次搜索' },
    { pattern: /^(\\d+)\\s+seconds?$/i, replace: '$1 秒' },
    { pattern: /^(\\d+)\\s+minutes?$/i, replace: '$1 分钟' },
    { pattern: /^(\\d+)\\s+hours?$/i, replace: '$1 小时' },
    { pattern: /^(\\d+)\\s+days?$/i, replace: '$1 天' },
    { pattern: /^Wait for task:\\s*(.*)$/i, replace: '等待任务: $1' },
    { pattern: /^Timed:\\s*(\\d+)\\s*seconds?$/i, replace: '已耗时: $1 秒' },
    { pattern: /^Unknown:\\s*Agent execution terminated due to error\\.?$/i, replace: '未知错误: 智能体执行因错误终止。' },
    { pattern: /^Agent execution terminated due to error\\.?$/i, replace: '智能体执行因错误终止。' },
    { pattern: /^Error ID:\\s*(.*)$/i, replace: '错误 ID: $1' },
    {
      pattern: /^Individual quota reached\\. Please upgrade your subscription to increase your limits\\. Resets in (.*?)\\.?$/i,
      replace: function(match, timeStr) {
        var formatted = timeStr
          .replace(/(\\d+)d/g, '$1 天 ')
          .replace(/(\\d+)h/g, '$1 小时 ')
          .replace(/(\\d+)m/g, '$1 分钟 ')
          .replace(/(\\d+)s/g, '$1 秒')
          .trim();
        return '已达个人配额上限。请升级订阅以提升额度。将在 ' + formatted + '后重置。';
      }
    },
    {
      pattern: /^You have used (some|all) of your ([\\w\\- ]+?) limit, it will fully refresh in (.*?)\\.?$/i,
      replace: function(match, usageType, limitType, timeStr) {
        var usage = usageType.toLowerCase() === 'all' ? '已用尽' : '已使用部分';
        var limit = limitType.trim();
        if (/weekly/i.test(limit)) limit = '周';
        else if (/5-hour|5 hour/i.test(limit)) limit = '5 小时';
        else if (/daily/i.test(limit)) limit = '日';
        else if (/hourly/i.test(limit)) limit = '小时';
        
        var formattedTime = timeStr
          .replace(/(\\d+)\\s*days?/gi, '$1 天')
          .replace(/(\\d+)\\s*hours?/gi, '$1 小时')
          .replace(/(\\d+)\\s*minutes?/gi, '$1 分钟')
          .replace(/(\\d+)\\s*seconds?/gi, '$1 秒')
          .replace(/,\\s*/g, ' ')
          .replace(/\\s+/g, ' ')
          .trim();
        var limitWithSpace = /^\\d/.test(limit) ? (' ' + limit) : limit;
        return '您' + usage + limitWithSpace + '配额，将在 ' + formattedTime + ' 后完全刷新。';
      }
    },
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
console.log(`[成功] 已根据 ${path.relative(rootDir, dictPath)}（共 ${Object.keys(dictData).length} 条词汇）重新构建生成 ${path.relative(rootDir, outputPath)} (${fs.statSync(outputPath).size} 字节)！`);
