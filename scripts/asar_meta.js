/**
 * ASAR 文件头极速解析工具
 *
 * 纯 Node.js 读取 asar 头部 JSON，获取 package.json 版本号与是否已注入 i18n 补丁，
 * 无需启动子进程、无需完整解包，单次耗时仅 1~2ms，
 * 可被安装脚本与自动守护进程高频安全调用。
 */

const fs = require('fs');

/**
 * 从 asar 中读取单个小文件的内容
 */
function readAsarEntry(fd, header, headerPayloadSize, name) {
  const entry = header.files && header.files[name];
  if (!entry || entry.offset === undefined || !entry.size) return null;
  const dataBase = 8 + headerPayloadSize;
  const buf = Buffer.alloc(entry.size);
  fs.readSync(fd, buf, 0, entry.size, dataBase + parseInt(entry.offset, 10));
  return buf.toString('utf8');
}

/**
 * 解析 asar 元信息
 * @param {string} asarPath
 * @returns {{version: string|null, isPatched: boolean, patchedLang: string|null, mtime: number, size: number}|null}
 */
function getAsarMeta(asarPath) {
  if (!fs.existsSync(asarPath)) return null;
  const stat = fs.statSync(asarPath);
  const result = {
    version: null,
    isPatched: false,
    patchedLang: null,
    mtime: stat.mtimeMs,
    size: stat.size,
  };

  let fd = null;
  try {
    fd = fs.openSync(asarPath, 'r');
    const hBuf = Buffer.alloc(16);
    fs.readSync(fd, hBuf, 0, 16, 0);
    const headerPayloadSize = hBuf.readUInt32LE(4);
    const jsonLen = hBuf.readUInt32LE(12);
    const headerJsonBuf = Buffer.alloc(jsonLen);
    fs.readSync(fd, headerJsonBuf, 0, jsonLen, 16);
    const header = JSON.parse(headerJsonBuf.toString('utf8'));

    result.isPatched = Boolean(header.files && header.files['.antigravity_i18n.json']);

    try {
      const pkgText = readAsarEntry(fd, header, headerPayloadSize, 'package.json');
      if (pkgText) result.version = JSON.parse(pkgText).version || null;
    } catch (e) {}

    if (result.isPatched) {
      try {
        const metaText = readAsarEntry(fd, header, headerPayloadSize, '.antigravity_i18n.json');
        if (metaText) result.patchedLang = JSON.parse(metaText).lang || null;
      } catch (e) {}
    }
  } catch (e) {
    // 文件头损坏或正在被写入时，按未补丁的纯净包处理
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch (e) {}
    }
  }
  return result;
}

/**
 * 语义化版本比较
 * @returns {number} 1: v1 > v2, -1: v1 < v2, 0: 相等或无法比较
 */
function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  const p1 = v1.split('.').map((n) => parseInt(n, 10) || 0);
  const p2 = v2.split('.').map((n) => parseInt(n, 10) || 0);
  const len = Math.max(p1.length, p2.length);
  for (let i = 0; i < len; i++) {
    const a = p1[i] || 0;
    const b = p2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

module.exports = {
  getAsarMeta,
  compareVersions,
};
