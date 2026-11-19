/**
 * 用户本地配置持久化
 *
 * 记录上次成功安装的语言、安装路径以及启动器自动补丁配置，
 * 供启动器包装脚本在每次启动 Antigravity 前自动校验并按需重打补丁。
 * 配置文件位于项目根目录 .antigravity_i18n_config.json（已加入 .gitignore）。
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, '.antigravity_i18n_config.json');

const DEFAULT_CONFIG = {
  lang: null,
  installDir: null,
  lastPatchedAt: null,
  launcher: {
    enabled: false,
    // 模式: proxy_vbs (接入现有代理 VBS) | shortcut_vbs (新建 VBS 并接管快捷方式) | linux_desktop | macos_script
    mode: null,
    // 被注入或生成的启动脚本路径
    hookPath: null,
    // 接管的快捷方式原始信息 [{ lnkPath, targetPath, arguments, workingDirectory, iconLocation }]
    shortcuts: [],
  },
};

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return {
        ...DEFAULT_CONFIG,
        ...data,
        launcher: {
          ...DEFAULT_CONFIG.launcher,
          ...(data.launcher || {}),
          shortcuts: Array.isArray(data.launcher?.shortcuts) ? data.launcher.shortcuts : [],
        },
      };
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {}
  return false;
}

/**
 * 局部更新配置（launcher 字段单独浅合并）
 * @param {object} patch
 */
function updateConfig(patch) {
  const current = loadConfig();
  const next = {
    ...current,
    ...patch,
    launcher: {
      ...current.launcher,
      ...((patch && patch.launcher) || {}),
    },
  };
  saveConfig(next);
  return next;
}

module.exports = {
  rootDir,
  configPath,
  loadConfig,
  saveConfig,
  updateConfig,
};
