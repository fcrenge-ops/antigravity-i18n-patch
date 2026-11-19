/**
 * ASAR 解包 / 封包工具封装
 *
 * 优先使用项目本地依赖 @electron/asar（npm install 后可离线运行，速度快、无需联网），
 * 本地依赖缺失时自动降级为 npx 在线调用，保证向下兼容。
 * 自动守护进程在后台静默重打补丁时，依赖本地模块可避免因网络不可用而失败。
 */

const { execSync } = require('child_process');

let localAsar = null;
try {
  // @electron/asar 3.x 为 CommonJS 模块，可直接 require
  localAsar = require('@electron/asar');
} catch (e) {
  localAsar = null;
}

function hasLocalAsar() {
  return Boolean(localAsar);
}

/**
 * 解包 asar 到指定目录
 * @param {string} archive asar 文件路径
 * @param {string} dest 输出目录
 */
async function extract(archive, dest) {
  if (localAsar) {
    localAsar.extractAll(archive, dest);
    return;
  }
  execSync(`npx --yes @electron/asar extract "${archive}" "${dest}"`, { stdio: 'inherit', windowsHide: true });
}

/**
 * 将目录封包为 asar
 * @param {string} srcDir 源目录
 * @param {string} dest 输出 asar 路径
 * @param {{unpackDir?: string}} options 封包选项
 */
async function pack(srcDir, dest, options = {}) {
  if (localAsar) {
    const opts = {};
    if (options.unpackDir) opts.unpackDir = options.unpackDir;
    await localAsar.createPackageWithOptions(srcDir, dest, opts);
    return;
  }
  const unpackArg = options.unpackDir ? ` --unpack-dir "${options.unpackDir}"` : '';
  execSync(`npx --yes @electron/asar pack "${srcDir}" "${dest}"${unpackArg}`, { stdio: 'inherit', windowsHide: true });
}

module.exports = {
  hasLocalAsar,
  extract,
  pack,
};
