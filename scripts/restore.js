#!/usr/bin/env node
/**
 * Antigravity 官方英文原版跨平台还原脚本
 * 支持系统: Windows, macOS, Linux
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const pathResolver = require('./path_resolver');

// 在脚本启动之初，如果进程在运行，优先捕捉一次当前进程路径，避免关闭后无法探测
try {
  const liveProcessPath = pathResolver.detectFromRunningProcess();
  if (liveProcessPath) {
    pathResolver.saveLocalPathCache(liveProcessPath);
  }
} catch (e) {}

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function log(text, color = colors.reset) {
  console.log(`${color}${text}${colors.reset}`);
}

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
const skipProcessCheck = hasArg('--skip-process-check');

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

// 1. 检查并关闭进程
function checkAndCloseProcess() {
  if (skipProcessCheck) return Promise.resolve();

  let isRunning = false;
  try {
    if (process.platform === 'win32') {
      const output = execSync('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      isRunning = output.toLowerCase().includes('antigravity.exe');
    } else {
      execSync('pgrep -i antigravity', { stdio: ['pipe', 'pipe', 'ignore'] });
      isRunning = true;
    }
  } catch (e) {
    isRunning = false;
  }

  if (!isRunning) return Promise.resolve();

  log('[提示] 检测到 Antigravity 客户端正在运行中。', colors.yellow);

  const terminateProcess = () => {
    log('正在退出 Antigravity 进程...', colors.yellow);
    try {
      if (process.platform === 'win32') {
        execSync('taskkill /F /IM Antigravity.exe', { stdio: 'ignore' });
      } else {
        execSync('pkill -i antigravity || killall -9 Antigravity', { stdio: 'ignore' });
      }
    } catch (e) {}
    const start = Date.now();
    while (Date.now() - start < 2000) {}
  };

  if (forceClose) {
    terminateProcess();
    return Promise.resolve();
  }

  return askQuestion('还原官方英文版需要先关闭 Antigravity 客户端，是否立即关闭？(Y/N): ').then((answer) => {
    if (/^[yY]/i.test(answer)) {
      terminateProcess();
    } else {
      log('[取消] 用户取消操作，请手动退出 Antigravity 后重新运行。', colors.red);
      process.exit(1);
    }
  });
}

// 2. 跨平台全自动探测 Antigravity 安装与 resources 目录
async function resolveAntigravityPaths() {
  const result = await pathResolver.resolveAntigravityPaths(customPath, askQuestion);
  log(`[信息] Antigravity 安装目录: ${result.installDir}`, colors.green);
  log(`[信息] Antigravity 资源目录: ${result.resourcesDir}`, colors.green);
  return result;
}

async function main() {
  log('====================================================', colors.cyan);
  log('     Antigravity 官方英文原版一键还原工具 (跨平台)  ', colors.cyan);
  log('====================================================', colors.cyan);
  console.log('');

  // 1. 关闭进程
  await checkAndCloseProcess();

  // 2. 全自动多策略定位安装路径
  const { installDir, resourcesDir } = await resolveAntigravityPaths();

  const appAsar = path.join(resourcesDir, 'app.asar');
  const appAsarUnpacked = path.join(resourcesDir, 'app.asar.unpacked');
  const backupAsar = path.join(resourcesDir, 'app.asar.bak');
  const backupUnpacked = path.join(resourcesDir, 'app.asar.bak.unpacked');

  if (!fs.existsSync(backupAsar)) {
    log(`[错误] 未找到官方纯净备份文件: ${backupAsar}，无法执行自动恢复。`, colors.red);
    process.exit(1);
  }

  log(`[还原] 正在将官方备份文件恢复为 app.asar ...`, colors.cyan);
  fs.copyFileSync(backupAsar, appAsar);

  if (fs.existsSync(backupUnpacked) && fs.existsSync(appAsarUnpacked)) {
    log('[还原] 正在恢复官方配套 unpacked 资源目录...', colors.cyan);
    fs.cpSync(backupUnpacked, appAsarUnpacked, { recursive: true });
  }

  // 清理遗留临时文件
  const legacyPatched = path.join(resourcesDir, 'app.asar.patched');
  if (fs.existsSync(legacyPatched)) fs.rmSync(legacyPatched, { force: true });
  const legacyPatchedUnpacked = path.join(resourcesDir, 'app.asar.patched.unpacked');
  if (fs.existsSync(legacyPatchedUnpacked)) fs.rmSync(legacyPatchedUnpacked, { recursive: true, force: true });

  console.log('');
  log('====================================================', colors.green);
  log('   ✅ 成功恢复！Antigravity 已还原为官方英文原版！   ', colors.green);
  log('====================================================', colors.green);
  console.log('');

  // 启动引导
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

  if (launchCmd && !noPrompt) {
    const startNow = await askQuestion('是否现在启动 Antigravity？(Y/N): ');
    if (/^[yY]/i.test(startNow)) {
      log('正在启动 Antigravity...', colors.cyan);
      const child = spawn(launchCmd, launchArgs, { detached: true, stdio: 'ignore' });
      child.unref();
    }
  }
}

main().catch((err) => {
  log(`[异常] 还原失败: ${err.message}`, colors.red);
  process.exit(1);
});
