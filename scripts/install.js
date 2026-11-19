#!/usr/bin/env node
/**
 * Antigravity 多语言 i18n 补丁跨平台安装脚本
 * 支持系统: Windows, macOS, Linux
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const localeManager = require('./locale_manager');
const pathResolver = require('./path_resolver');
const asarTool = require('./asar_tool');
const userConfig = require('./user_config');
const { getAsarMeta, compareVersions } = require('./asar_meta');

// 仅当本地尚未建立有效路径缓存时，尝试从正在运行的进程中抢先捕捉一次路径
try {
  if (!pathResolver.detectFromLocalCache()) {
    const liveProcessPath = pathResolver.detectFromRunningProcess();
    if (liveProcessPath) {
      pathResolver.saveLocalPathCache(liveProcessPath);
    }
  }
} catch (e) {}

// 终端高亮色彩辅助工具
const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

function log(text, color = colors.reset) {
  console.log(`${color}${text}${colors.reset}`);
}

// 解析命令行参数
const argv = process.argv.slice(2);
function hasArg(arg) {
  return argv.includes(arg);
}
function getArgValue(arg) {
  const index = argv.indexOf(arg);
  if (index !== -1 && index + 1 < argv.length) {
    return argv[index + 1];
  }
  return null;
}

const customPath = getArgValue('--path') || process.env.ANTIGRAVITY_PATH || '';
const forceClose = hasArg('--force-close') || hasArg('-f');
const noPrompt = hasArg('--no-prompt') || hasArg('-y');
const autoLaunch = hasArg('--auto-launch');
const skipProcessCheck = hasArg('--skip-process-check');
const paramLang = getArgValue('--lang') || getArgValue('-l');
// --launcher (兼容 --guard): 安装成功后直接启用启动器自动补丁；--no-launcher (兼容 --no-guard): 不再询问
const enableLauncherArg = hasArg('--launcher') || hasArg('--guard');
const skipLauncherPrompt = hasArg('--no-launcher') || hasArg('--no-guard');

// 简单封装命令行交互提问
function askQuestion(query) {
  return new Promise((resolve) => {
    if (noPrompt) return resolve('');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// 1. 检测并选择目标安装语言
async function selectTargetLocale() {
  const locales = localeManager.getAvailableLocales();
  if (!locales.length) {
    log('[错误] 未在 locales/ 目录下检测到任何可用语言包！', colors.red);
    process.exit(1);
  }

  // 命令行明确传参指定了语言
  if (paramLang) {
    const matched = locales.find(
      (l) => l.id.toLowerCase() === paramLang.toLowerCase() || l.dirName.toLowerCase() === paramLang.toLowerCase()
    );
    if (matched) {
      log(`[语言] 已通过命令行参数指定安装语言: ${matched.id} (${matched.nativeName})`, colors.green);
      return matched;
    } else {
      log(`[错误] 未找到指定的语言 [${paramLang}]！当前可用语言包:`, colors.red);
      locales.forEach((l) => console.log(`  • ${l.id} (${l.nativeName})`));
      process.exit(1);
    }
  }

  // 无交互模式且未指定参数时，默认优先 zh-CN，否则选第一个
  if (noPrompt) {
    const defaultLocale = locales.find((l) => l.id.toLowerCase() === 'zh-cn') || locales[0];
    log(`[语言] 非交互模式，默认选用: ${defaultLocale.id} (${defaultLocale.nativeName})`, colors.green);
    return defaultLocale;
  }

  // 交互式菜单展示与选择
  log('----------------------------------------------------', colors.cyan);
  log('请选择要安装的界面语言 (Select Language to Install):', colors.bold);
  locales.forEach((l, index) => {
    const isDefault = l.id.toLowerCase() === 'zh-cn' || index === 0;
    const defaultTag = isDefault ? ' [默认 (Default)]' : '';
    console.log(`  [${index + 1}] ${l.id} - ${l.nativeName}${defaultTag}`);
  });
  log('----------------------------------------------------', colors.cyan);

  const defaultIndex = locales.findIndex((l) => l.id.toLowerCase() === 'zh-cn');
  const fallbackIndex = defaultIndex !== -1 ? defaultIndex : 0;
  const promptText = `请输入选项编号 [1-${locales.length}] 或语言代码 (直接回车默认选择 [${fallbackIndex + 1}]): `;

  const answer = await askQuestion(promptText);
  if (!answer) {
    return locales[fallbackIndex];
  }

  // 数字编号匹配
  const num = parseInt(answer, 10);
  if (!isNaN(num) && num >= 1 && num <= locales.length) {
    return locales[num - 1];
  }

  // 语言代码匹配
  const byCode = locales.find(
    (l) => l.id.toLowerCase() === answer.toLowerCase() || l.dirName.toLowerCase() === answer.toLowerCase()
  );
  if (byCode) {
    return byCode;
  }

  log(`[提示] 输入无效，默认选用: ${locales[fallbackIndex].id} (${locales[fallbackIndex].nativeName})`, colors.yellow);
  return locales[fallbackIndex];
}

function isAntigravityRunning() {
  try {
    if (process.platform === 'win32') {
      const output = execSync('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
      return output.toLowerCase().includes('antigravity.exe');
    } else {
      execSync('pgrep -i antigravity', { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
      return true;
    }
  } catch (e) {
    return false;
  }
}

async function terminateProcess() {
  log('正在退出 Antigravity 进程...', colors.yellow);
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM Antigravity.exe', { stdio: 'ignore', windowsHide: true });
    } else {
      execSync('pkill -i antigravity || killall -9 Antigravity', { stdio: 'ignore', windowsHide: true });
    }
  } catch (e) {
    // 忽略可能已经退出的报错
  }

  // 异步非阻塞轮询等待进程释放句柄，消除 CPU 100% 忙等待峰值
  const maxWait = 2000;
  const pollInterval = 100;
  let elapsed = 0;
  while (elapsed < maxWait) {
    if (!isAntigravityRunning()) break;
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    elapsed += pollInterval;
  }
}

// 2. 检测与关闭运行中的 Antigravity 进程
async function checkAndCloseProcess() {
  if (skipProcessCheck) return;

  if (!isAntigravityRunning()) return;

  log('[提示] 检测到 Antigravity 客户端正在运行中。', colors.yellow);

  if (forceClose) {
    await terminateProcess();
    return;
  }

  const answer = await askQuestion('安装补丁需要先关闭 Antigravity 客户端，是否立即关闭？(Y/N): ');
  if (/^[yY]/i.test(answer)) {
    await terminateProcess();
  } else {
    log('[取消] 用户取消操作，请手动退出 Antigravity 后重新运行。', colors.red);
    process.exit(1);
  }
}

// 3. 跨平台全自动探测 Antigravity 安装与 resources 目录 (支持不同电脑、自定义盘符与任意安装位置)
async function resolveAntigravityPaths() {
  const result = await pathResolver.resolveAntigravityPaths(customPath, askQuestion);
  log(`[信息] Antigravity 安装目录: ${result.installDir}`, colors.green);
  log(`[信息] Antigravity 资源目录: ${result.resourcesDir}`, colors.green);
  return result;
}

// getAsarMeta (极速解析 asar 文件头) 与 compareVersions (语义化版本比较) 已抽离至 ./asar_meta.js，
// 供安装脚本与启动器自动补丁 (launcher.js) 共同复用

/**
 * 记录本次成功安装的语言与路径，并按需引导接入启动器自动补丁
 */
async function persistAndOfferLauncher(targetLocale, installDir) {
  const config = userConfig.updateConfig({
    lang: targetLocale.id,
    installDir,
    lastPatchedAt: new Date().toISOString(),
  });

  let launcher = null;
  try {
    launcher = require('./launcher');
  } catch (e) {
    return;
  }

  if (config.launcher && config.launcher.enabled) {
    // 若用户显式传参 --launcher，或挂载文件不存在 / Sentinel 丢失（如更换目录或重装代理脚本），自动刷新接入
    const hookMissing = !config.launcher.hookPath || !fs.existsSync(config.launcher.hookPath);
    let hookStale = hookMissing;
    if (!hookMissing && config.launcher.mode === 'proxy_vbs') {
      try {
        const raw = fs.readFileSync(config.launcher.hookPath, 'latin1');
        hookStale = !raw.includes(launcher.VBS_SENTINEL_START);
      } catch (e) {
        hookStale = true;
      }
    }
    if (enableLauncherArg || hookStale) {
      console.log('');
      launcher.cmdEnable([]);
      console.log('');
    } else {
      log(`• 启动器自动补丁已启用 (${config.launcher.mode || '已接入'})：更新后启动即自动重打 [${targetLocale.id}] 补丁`, colors.green);
    }
    return;
  }

  let enable = enableLauncherArg;
  if (!enable && !noPrompt && !skipLauncherPrompt) {
    const proxyVbs = launcher.findProxyVbsPath(installDir);
    log('----------------------------------------------------', colors.cyan);
    log('[推荐] Antigravity 每次官方更新都会覆盖 app.asar，导致补丁失效。', colors.yellow);
    if (proxyVbs) {
      log(`       检测到您已在使用代理启动器: ${proxyVbs}`, colors.yellow);
      log('       接入后每次打开客户端前自动检查（平时仅 ~40ms 放行），更新后自动重打补丁，零后台常驻。', colors.yellow);
    } else {
      log('       启用"启动器自动补丁"后，每次通过快捷方式打开客户端前自动检查，更新后自动重打补丁，零后台常驻。', colors.yellow);
    }
    const answer = await askQuestion('是否接入启动器自动补丁 (更新后打开即自动重打)？(Y/N，回车默认 Y): ');
    enable = !answer || /^[yY]/i.test(answer);
  }

  if (enable) {
    console.log('');
    launcher.cmdEnable([]);
    console.log('');
  } else if (!noPrompt) {
    log('[提示] 之后可随时运行 bin\\launcher.bat enable 或 npm run launcher:enable 启用启动器自动补丁。', colors.gray);
  }
}


// 主流程
async function main() {
  log('====================================================', colors.cyan);
  log('     Antigravity 多语言 i18n 补丁安装工具 (跨平台)  ', colors.cyan);
  log('====================================================', colors.cyan);
  console.log('');

  // 1. 选择目标语言
  const targetLocale = await selectTargetLocale();
  log(`[确定] 准备安装语言包: ${targetLocale.id} - ${targetLocale.nativeName}\n`, colors.green);

  const rootDir = path.resolve(__dirname, '..');
  const patchFileName = `patch-${targetLocale.id}.js`;
  const distPatch = path.join(rootDir, 'dist', patchFileName);
  const langDir = targetLocale.dir;
  const dictFile = path.join(langDir, 'dict.json');
  const manifestFile = path.join(langDir, 'manifest.json');
  const rulesFile = path.join(langDir, 'rules.js');
  const buildScript = path.join(__dirname, 'build.js');

  // 检查是否需要自动构建补丁代码
  let needBuild = false;
  if (!fs.existsSync(distPatch)) {
    needBuild = true;
  } else {
    const patchMtime = fs.statSync(distPatch).mtimeMs;
    const sourceFiles = [dictFile, manifestFile, rulesFile].filter((f) => fs.existsSync(f));
    for (const sf of sourceFiles) {
      if (fs.statSync(sf).mtimeMs > patchMtime) {
        needBuild = true;
        break;
      }
    }
  }

  if (needBuild) {
    log(`[构建] 正在为 [${targetLocale.id}] 编译补丁引擎...`, colors.cyan);
    try {
      execSync(`"${process.execPath}" "${buildScript}" --lang "${targetLocale.id}"`, { stdio: 'inherit', windowsHide: true });
    } catch (e) {
      log('[错误] 补丁构建失败，退出安装。', colors.red);
      process.exit(1);
    }
  }

  // 2. 检查并关闭进程
  await checkAndCloseProcess();

  // 3. 解析路径
  const { installDir, resourcesDir } = await resolveAntigravityPaths();

  const appAsar = path.join(resourcesDir, 'app.asar');
  const appAsarUnpacked = path.join(resourcesDir, 'app.asar.unpacked');
  const backupAsar = path.join(resourcesDir, 'app.asar.bak');
  const backupUnpacked = path.join(resourcesDir, 'app.asar.bak.unpacked');

  if (!fs.existsSync(appAsar) && !fs.existsSync(backupAsar)) {
    log(`[错误] 未在 ${resourcesDir} 中找到 app.asar 或官方备份文件。`, colors.red);
    process.exit(1);
  }

  // 4. 备份与官方更新防版本降级校验
  const appMeta = fs.existsSync(appAsar) ? getAsarMeta(appAsar) : null;
  const backupMeta = fs.existsSync(backupAsar) ? getAsarMeta(backupAsar) : null;
  let needRefreshBackup = false;

  if (backupMeta && appMeta) {
    // 校验 A: 官方自动升级使得 app.asar 的语义化版本高于现有备份
    if (appMeta.version && backupMeta.version && compareVersions(appMeta.version, backupMeta.version) > 0) {
      log(`[防版本降级] 检测到官方客户端已升级: v${backupMeta.version} -> v${appMeta.version}！`, colors.yellow);
      needRefreshBackup = true;
    }
    // 校验 B: 当前 app.asar 是纯净官方包且与旧备份不一致（体积/版本变化或修改时间晚于备份），说明被官方热修复或覆盖更新
    else if (
      !appMeta.isPatched &&
      (appMeta.size !== backupMeta.size || appMeta.version !== backupMeta.version || appMeta.mtime > backupMeta.mtime)
    ) {
      log(`[防版本降级] 检测到官方全新覆盖的纯净包 app.asar，准备更新基准源备份...`, colors.yellow);
      needRefreshBackup = true;
    }
  }

  if (needRefreshBackup || !fs.existsSync(backupAsar)) {
    const verTag = appMeta?.version ? ` (v${appMeta.version})` : '';
    log(`[备份] 正在创建官方原始纯净包备份: ${path.basename(backupAsar)}${verTag} ...`, colors.cyan);
    fs.copyFileSync(appAsar, backupAsar);
    if (fs.existsSync(appAsarUnpacked)) {
      log(`[备份] 正在备份配套 unpacked 资源目录: ${path.basename(backupUnpacked)} ...`, colors.cyan);
      if (fs.existsSync(backupUnpacked)) {
        fs.rmSync(backupUnpacked, { recursive: true, force: true });
      }
      fs.cpSync(appAsarUnpacked, backupUnpacked, { recursive: true });
    }
    log('[备份] 官方纯净包备份就绪！杜绝新版被旧备份降级回退。', colors.green);
  } else {
    log(`[备份] 检测到已有官方原版备份${backupMeta?.version ? ` (v${backupMeta.version})` : ''}，保留该纯净备份。`, colors.gray);
    if (fs.existsSync(appAsarUnpacked) && !fs.existsSync(backupUnpacked)) {
      log('[备份] 检测到缺失配套 unpacked 纯净备份，正在自动补全...', colors.cyan);
      fs.cpSync(appAsarUnpacked, backupUnpacked, { recursive: true });
    }
  }

  // 始终以经过防降级验证的官方纯净包 backupAsar 作为基准源
  const sourceAsar = fs.existsSync(backupAsar) ? backupAsar : appAsar;
  const sourceUnpacked = `${sourceAsar}.unpacked`;

  // 准备临时工作目录
  const tempBase = path.join(os.tmpdir(), `antigravity_i18n_patch_${Date.now()}`);
  const tempExtractDir = path.join(tempBase, 'extracted');
  const tempPackDir = path.join(tempBase, 'packed');

  fs.mkdirSync(tempExtractDir, { recursive: true });
  fs.mkdirSync(tempPackDir, { recursive: true });

  let tempLinkedUnpacked = false;

  try {
    // 确保解包源的同名 .unpacked 目录存在，避免 ENOENT 异常
    if (!fs.existsSync(sourceUnpacked)) {
      const fallbackUnpacked = fs.existsSync(backupUnpacked) ? backupUnpacked : (fs.existsSync(appAsarUnpacked) ? appAsarUnpacked : null);
      if (fallbackUnpacked) {
        log('[解包] 为解包源安全关联配套 unpacked 资源...', colors.gray);
        try {
          if (process.platform === 'win32') {
            fs.symlinkSync(fallbackUnpacked, sourceUnpacked, 'junction');
          } else {
            fs.symlinkSync(fallbackUnpacked, sourceUnpacked, 'dir');
          }
          tempLinkedUnpacked = true;
        } catch (symlinkErr) {
          fs.cpSync(fallbackUnpacked, sourceUnpacked, { recursive: true });
          tempLinkedUnpacked = true;
        }
      }
    }

    // 5. 解包 asar (优先使用本地 @electron/asar 依赖，可离线运行)
    log(`[解包] 正在解压基准包: ${path.basename(sourceAsar)} ...`, colors.cyan);
    await asarTool.extract(sourceAsar, tempExtractDir);

    if (!fs.existsSync(path.join(tempExtractDir, 'dist', 'preload.js'))) {
      throw new Error('解包不完整，未找到 dist/preload.js');
    }

    if (tempLinkedUnpacked && fs.existsSync(sourceUnpacked)) {
      try {
        const stat = fs.lstatSync(sourceUnpacked);
        if (stat.isSymbolicLink()) {
          fs.unlinkSync(sourceUnpacked);
        }
      } catch (e) {}
      tempLinkedUnpacked = false;
    }

    // 6. 调用 apply_patch.js 注入补丁
    const applyScript = path.join(__dirname, 'apply_patch.js');
    log(`[注入] 正在应用 [${targetLocale.id} - ${targetLocale.nativeName}] 补丁与原生配置...`, colors.cyan);
    execSync(`"${process.execPath}" "${applyScript}" "${tempExtractDir}" "${targetLocale.id}"`, { stdio: 'inherit', windowsHide: true });

    // 7. 在临时目录重新封包
    const tempPackedAsar = path.join(tempPackDir, 'app.asar');
    const tempPackedUnpacked = path.join(tempPackDir, 'app.asar.unpacked');

    log('[打包] 正在重新封包为 app.asar ...', colors.cyan);
    await asarTool.pack(tempExtractDir, tempPackedAsar, { unpackDir: 'node_modules/chrome-devtools-mcp' });

    if (!fs.existsSync(tempPackedAsar)) {
      throw new Error(`封包失败，未生成 ${tempPackedAsar}`);
    }

    // 8. 原子替换生效
    log('[替换] 正在应用新版补丁包...', colors.cyan);
    fs.copyFileSync(tempPackedAsar, appAsar);

    if (fs.existsSync(tempPackedUnpacked) && fs.existsSync(appAsarUnpacked)) {
      fs.cpSync(tempPackedUnpacked, appAsarUnpacked, { recursive: true });
    }

    // 清理历史可能遗留的临时文件
    const legacyPatched = path.join(resourcesDir, 'app.asar.patched');
    if (fs.existsSync(legacyPatched)) fs.rmSync(legacyPatched, { force: true });
    const legacyPatchedUnpacked = path.join(resourcesDir, 'app.asar.patched.unpacked');
    if (fs.existsSync(legacyPatchedUnpacked)) fs.rmSync(legacyPatchedUnpacked, { recursive: true, force: true });

    console.log('');
    log('====================================================', colors.green);
    log(`   🎉 恭喜！Antigravity [${targetLocale.id} - ${targetLocale.nativeName}] 补丁安装成功！   `, colors.green);
    log('====================================================', colors.green);
    log(`• 界面已全面切换为: ${targetLocale.nativeName} (${targetLocale.id})`);
    log('• 包含左侧导航、设置面板、对话流、辅助窗格及系统菜单多语言支持');
    log('• 代码编辑区、终端输出与核心数据已受智能保护，保持原汁原味');
    log('• 若需切换其他语言或还原官方英文版，随时重新运行 install 或 restore 脚本');
    console.log('');

    // 记录安装配置，并引导接入启动器自动补丁
    await persistAndOfferLauncher(targetLocale, installDir);

    // 9. 启动引导
    let launchCmd = null;
    let launchArgs = [];
    if (process.platform === 'win32') {
      const vbsLauncher = path.join(process.env.APPDATA || '', 'Antigravity', 'launcher', 'launch-with-proxy.vbs');
      const localVbs = path.join(installDir, 'launch-with-proxy.vbs');
      const exeCandidates = [
        path.join(installDir, 'Antigravity.exe'),
        path.join(installDir, 'antigravity.exe'),
      ];
      const exePath = exeCandidates.find((f) => fs.existsSync(f));

      if (fs.existsSync(vbsLauncher)) {
        launchCmd = 'wscript.exe';
        launchArgs = [vbsLauncher];
      } else if (fs.existsSync(localVbs)) {
        launchCmd = 'wscript.exe';
        launchArgs = [localVbs];
      } else if (exePath) {
        launchCmd = exePath;
      }
    } else if (process.platform === 'darwin') {
      launchCmd = 'open';
      launchArgs = ['-a', installDir];
    } else {
      const linuxBin = path.join(installDir, 'antigravity');
      if (fs.existsSync(linuxBin)) launchCmd = linuxBin;
    }

    if (launchCmd) {
      if (autoLaunch) {
        log('正在启动 Antigravity...', colors.cyan);
        const child = spawn(launchCmd, launchArgs, { detached: true, stdio: 'ignore' });
        child.unref();
      } else if (!noPrompt) {
        const startNow = await askQuestion('是否现在启动 Antigravity 查看语言效果？(Y/N): ');
        if (/^[yY]/i.test(startNow)) {
          log('正在启动 Antigravity...', colors.cyan);
          const child = spawn(launchCmd, launchArgs, { detached: true, stdio: 'ignore' });
          child.unref();
        }
      }
    }

  } catch (err) {
    log(`[异常] 安装过程发生错误: ${err.message}`, colors.red);
    if (fs.existsSync(backupAsar)) {
      log('[安全机制] 正在从官方备份恢复原始文件...', colors.yellow);
      fs.copyFileSync(backupAsar, appAsar);
      if (fs.existsSync(backupUnpacked) && fs.existsSync(appAsarUnpacked)) {
        fs.cpSync(backupUnpacked, appAsarUnpacked, { recursive: true });
      }
      log('[安全机制] 已自动回滚至官方原版。', colors.green);
    }
    process.exit(1);
  } finally {
    if (tempLinkedUnpacked && fs.existsSync(sourceUnpacked)) {
      try {
        const stat = fs.lstatSync(sourceUnpacked);
        if (stat.isSymbolicLink()) fs.unlinkSync(sourceUnpacked);
      } catch (e) {}
    }
    if (fs.existsSync(tempBase)) {
      try {
        fs.rmSync(tempBase, { recursive: true, force: true });
      } catch (e) {}
    }
  }
}

if (require.main === module) {
  main().catch((err) => {
    log(`[未捕获异常]: ${err.message}`, colors.red);
    process.exit(1);
  });
}

module.exports = {
  getAsarMeta,
  compareVersions,
  checkAndCloseProcess,
  main,
};
