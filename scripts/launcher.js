#!/usr/bin/env node
/**
 * Antigravity i18n 启动器自动补丁集成 (Launcher Pre-Launch Hook)
 *
 * 原理：将极速补丁检查集成到客户端启动入口（如现有的 launch-with-proxy.vbs 代理启动器，
 * 或自动接管桌面/开始菜单快捷方式）。每次双击启动客户端前：
 *   1. 补丁有效 -> 极速放行（~40ms，几乎无感）；
 *   2. 官方更新覆盖导致补丁失效 -> 先同步静默重打补丁，再拉起客户端，一打开即是汉化版。
 * 全程零后台常驻进程、零开机自启项、零扫描时间盲区。
 *
 * 用法:
 *   node scripts/launcher.js enable     接入启动器 (自动优先复用 launch-with-proxy.vbs)
 *   node scripts/launcher.js disable    移除启动器集成并恢复原状
 *   node scripts/launcher.js status     查看当前接入模式与补丁状态
 *   node scripts/launcher.js ensure     启动前检查并按需重打补丁 (由启动器自动调用)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');
const { execSync, spawnSync } = require('child_process');
const pathResolver = require('./path_resolver');
const { getAsarMeta } = require('./asar_meta');
const userConfig = require('./user_config');

const rootDir = userConfig.rootDir;
const launcherScript = path.join(__dirname, 'launcher.js');
const installScript = path.join(__dirname, 'install.js');
const lockFile = path.join(rootDir, '.launcher.lock');
const logDir = path.join(rootDir, 'logs');
const logFile = path.join(logDir, 'launcher.log');

const VBS_SENTINEL_START = "' <<< ANTIGRAVITY_I18N_LAUNCHER_START >>>";
const VBS_SENTINEL_END = "' <<< ANTIGRAVITY_I18N_LAUNCHER_END >>>";
const LOG_MAX_BYTES = 1024 * 1024;
const LOCK_WAIT_MS = 90 * 1000;

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

function print(text, color = colors.reset) {
  console.log(`${color}${text}${colors.reset}`);
}

function stripAnsi(text) {
  return String(text).replace(/\x1b\[[0-9;]*m/g, '');
}

function writeLog(message) {
  const line = `[${new Date().toLocaleString()}] ${stripAnsi(message)}`;
  try {
    fs.mkdirSync(logDir, { recursive: true });
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > LOG_MAX_BYTES) {
      fs.renameSync(logFile, `${logFile}.old`);
    }
    fs.appendFileSync(logFile, line + os.EOL, 'utf8');
  } catch (e) {}
}

function execQuiet(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
}

function runPowerShell(script) {
  const encoded = Buffer.from(script, 'utf16le').toString('base64');
  return execQuiet(`powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`).trim();
}

function isAntigravityRunning() {
  try {
    if (process.platform === 'win32') {
      const output = execQuiet('tasklist /FI "IMAGENAME eq Antigravity.exe" /NH');
      return output.toLowerCase().includes('antigravity.exe');
    }
    execQuiet('pgrep -i antigravity');
    return true;
  } catch (e) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 并发防重入锁 (防止连点两次桌面图标导致同时解包/写 app.asar)
// ---------------------------------------------------------------------------
function isLockOwnerAlive(pid) {
  if (!pid || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
  } catch (e) {
    return false;
  }
  try {
    if (process.platform === 'win32') {
      return execQuiet(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`).toLowerCase().includes('node');
    }
    return execQuiet(`ps -p ${pid} -o command=`).includes('launcher.js');
  } catch (e) {
    return true;
  }
}

function readLockPid() {
  try {
    return parseInt(fs.readFileSync(lockFile, 'utf8').trim(), 10) || null;
  } catch (e) {
    return null;
  }
}

function tryAcquireLock() {
  const existing = readLockPid();
  if (existing && isLockOwnerAlive(existing)) return false;
  fs.writeFileSync(lockFile, String(process.pid), 'utf8');
  return true;
}

function releaseLock() {
  try {
    if (readLockPid() === process.pid) fs.rmSync(lockFile, { force: true });
  } catch (e) {}
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// ---------------------------------------------------------------------------
// 路径与配置解析
// ---------------------------------------------------------------------------
function resolveTargetPaths(config) {
  const candidates = [config.installDir, pathResolver.detectFromLocalCache()].filter(Boolean);
  for (const cand of candidates) {
    const inspected = pathResolver.inspectAntigravityPath(cand);
    if (inspected) return inspected;
  }
  return null;
}

function hydrateConfigFromEnvironment(config, explicitLang) {
  let lang = explicitLang || config.lang;
  let installDir = config.installDir;

  const target = resolveTargetPaths(config);
  if (target) {
    if (!installDir) installDir = target.installDir;
    if (!lang) {
      const meta = getAsarMeta(target.appAsar);
      if (meta && meta.isPatched && meta.patchedLang) {
        lang = meta.patchedLang;
      }
    }
  }

  if (lang !== config.lang || installDir !== config.installDir) {
    return userConfig.updateConfig({
      lang: lang || config.lang,
      installDir: installDir || config.installDir,
    });
  }
  return config;
}

function findProxyVbsPath(installDir) {
  if (process.platform !== 'win32') return null;
  const candidates = [];
  if (process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, 'Antigravity', 'launcher', 'launch-with-proxy.vbs'));
  }
  if (installDir) {
    candidates.push(path.join(installDir, 'launch-with-proxy.vbs'));
  }
  return candidates.find((p) => fs.existsSync(p)) || null;
}

// ---------------------------------------------------------------------------
// VBS 编码安全读写与 Sentinel 注入/卸载
// ---------------------------------------------------------------------------
function readVbsPreserveEncoding(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return { encoding: 'utf16le-bom', text: buf.slice(2).toString('utf16le') };
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return { encoding: 'utf8-bom', text: buf.slice(3).toString('utf8') };
  }
  // 无 BOM 时用 latin1 逐字节映射，可原封不动保留原文件中的 UTF-8 / GBK 中文注释字节
  return { encoding: 'raw-bytes', text: buf.toString('latin1') };
}

function writeVbsWithEncoding(filePath, text, encoding) {
  if (encoding === 'utf16le-bom') {
    fs.writeFileSync(filePath, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]));
  } else if (encoding === 'utf8-bom') {
    fs.writeFileSync(filePath, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text, 'utf8')]));
  } else {
    fs.writeFileSync(filePath, Buffer.from(text, 'latin1'));
  }
}

function vbsEscapeStr(s) {
  return String(s).replace(/"/g, '""');
}

function buildVbsHookBlock(eol) {
  const cmd = `"""${vbsEscapeStr(process.execPath)}"" ""${vbsEscapeStr(launcherScript)}"" ensure"`;
  return [
    VBS_SENTINEL_START,
    'On Error Resume Next',
    `CreateObject("WScript.Shell").Run ${cmd}, 0, True`,
    'On Error GoTo 0',
    VBS_SENTINEL_END,
  ].join(eol);
}

function stripVbsHookBlock(text) {
  return text.replace(
    /[ \t]*' <<< ANTIGRAVITY_I18N_LAUNCHER_START >>>[\s\S]*?' <<< ANTIGRAVITY_I18N_LAUNCHER_END >>>[ \t]*(?:\r?\n)?/g,
    ''
  );
}

function injectIntoProxyVbs(vbsPath) {
  const loaded = readVbsPreserveEncoding(vbsPath);
  const eol = loaded.text.includes('\r\n') ? '\r\n' : '\n';
  let content = stripVbsHookBlock(loaded.text);
  const hookBlock = buildVbsHookBlock(eol);

  // 若待插入路径包含非 ASCII 字符（如中文路径），必须升级为 UTF-16LE BOM 才能被 wscript 正确解析
  const hookAsciiOnly = /^[\x00-\x7F]*$/.test(hookBlock);
  let targetEncoding = loaded.encoding;
  if (!hookAsciiOnly && targetEncoding === 'raw-bytes') {
    // 将无 BOM 的原文本按 UTF-8 解析（若无合法多字节则同样安全）再转 UTF-16LE BOM
    content = fs.readFileSync(vbsPath, 'utf8');
    content = stripVbsHookBlock(content);
    targetEncoding = 'utf16le-bom';
  }

  // 插入到最后一条启动客户端的 .Run 语句之前
  const lines = content.split(/\r?\n/);
  let insertIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("'")) continue;
    if (/\.Run\b/i.test(trimmed) && /(exePath|Antigravity\.exe)/i.test(trimmed)) {
      insertIdx = i;
      break;
    }
  }
  if (insertIdx === -1) {
    for (let i = lines.length - 1; i >= 0; i--) {
      const trimmed = lines[i].trim();
      if (!trimmed.startsWith("'") && /\.Run\b/i.test(trimmed)) {
        insertIdx = i;
        break;
      }
    }
  }

  if (insertIdx !== -1) {
    lines.splice(insertIdx, 0, hookBlock);
    content = lines.join(eol);
  } else {
    content = content.replace(/\s*$/, '') + eol + eol + hookBlock + eol;
  }

  writeVbsWithEncoding(vbsPath, content, targetEncoding);
}

function removeFromProxyVbs(vbsPath) {
  if (!fs.existsSync(vbsPath)) return false;
  const loaded = readVbsPreserveEncoding(vbsPath);
  const cleaned = stripVbsHookBlock(loaded.text);
  if (cleaned === loaded.text) return false;
  writeVbsWithEncoding(vbsPath, cleaned, loaded.encoding);
  return true;
}

// ---------------------------------------------------------------------------
// Windows 通用兜底: 无 proxy VBS 时生成独立 VBS 并接管快捷方式
// ---------------------------------------------------------------------------
function getDefaultWrapperVbsPath() {
  const appData = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(appData, 'Antigravity', 'launcher', 'launch-with-i18n.vbs');
}

function createWrapperVbs(installDir, wrapperPath) {
  const exePath = [path.join(installDir, 'Antigravity.exe'), path.join(installDir, 'antigravity.exe')].find((f) =>
    fs.existsSync(f)
  );
  if (!exePath) {
    throw new Error(`未在 ${installDir} 中找到 Antigravity.exe`);
  }
  fs.mkdirSync(path.dirname(wrapperPath), { recursive: true });
  const content = [
    "' Antigravity i18n 自动补丁启动器 (由 scripts/launcher.js 自动生成)",
    "Set WshShell = CreateObject(\"WScript.Shell\")",
    'On Error Resume Next',
    `WshShell.Run """${vbsEscapeStr(process.execPath)}"" ""${vbsEscapeStr(launcherScript)}"" ensure", 0, True`,
    'On Error GoTo 0',
    '',
    'args = ""',
    'For i = 0 To WScript.Arguments.Count - 1',
    '    args = args & " """ & WScript.Arguments(i) & """"',
    'Next',
    `WshShell.CurrentDirectory = "${vbsEscapeStr(installDir)}"`,
    `WshShell.Run """${vbsEscapeStr(exePath)}""" & args, 1, False`,
    '',
  ].join('\r\n');
  writeVbsWithEncoding(wrapperPath, content, 'utf16le-bom');
}

function findAndWrapWindowsShortcuts(installDir, wrapperPath) {
  const exeLower = path.join(installDir, 'Antigravity.exe').toLowerCase();
  const psScript = `
$sh = New-Object -ComObject WScript.Shell
$roots = @(
  [Environment]::GetFolderPath('Desktop'),
  [Environment]::GetFolderPath('Programs')
) | Where-Object { $_ -and (Test-Path $_) }
$results = @()
foreach ($r in $roots) {
  Get-ChildItem -Path $r -Filter '*.lnk' -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $sc = $sh.CreateShortcut($_.FullName)
      if ($sc.TargetPath -and $sc.TargetPath.ToLower() -eq '${exeLower.replace(/'/g, "''")}') {
        $results += [PSCustomObject]@{
          lnkPath = $_.FullName
          targetPath = $sc.TargetPath
          arguments = $sc.Arguments
          workingDirectory = $sc.WorkingDirectory
          iconLocation = $sc.IconLocation
        }
        $sc.TargetPath = "$env:SystemRoot\\System32\\wscript.exe"
        $sc.Arguments = '"${wrapperPath.replace(/'/g, "''")}"'
        if (-not $sc.WorkingDirectory) { $sc.WorkingDirectory = '${installDir.replace(/'/g, "''")}' }
        if (-not $sc.IconLocation -or $sc.IconLocation.StartsWith(',')) {
          $sc.IconLocation = '${exeLower.replace(/'/g, "''")},0'
        }
        $sc.Save()
      }
    } catch {}
  }
}
if ($results.Count -gt 0) { $results | ConvertTo-Json -Compress }
`;
  const out = runPowerShell(psScript);
  if (!out) return [];
  const parsed = JSON.parse(out);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function restoreWindowsShortcuts(shortcuts) {
  if (!Array.isArray(shortcuts) || shortcuts.length === 0) return 0;
  let count = 0;
  for (const item of shortcuts) {
    if (!item || !item.lnkPath || !fs.existsSync(item.lnkPath) || !item.targetPath) continue;
    const ps = `
$sh = New-Object -ComObject WScript.Shell
$sc = $sh.CreateShortcut('${item.lnkPath.replace(/'/g, "''")}')
$sc.TargetPath = '${String(item.targetPath).replace(/'/g, "''")}'
$sc.Arguments = '${String(item.arguments || '').replace(/'/g, "''")}'
$sc.WorkingDirectory = '${String(item.workingDirectory || '').replace(/'/g, "''")}'
$sc.IconLocation = '${String(item.iconLocation || '').replace(/'/g, "''")}'
$sc.Save()
`;
    try {
      runPowerShell(ps);
      count += 1;
    } catch (e) {}
  }
  return count;
}

// ---------------------------------------------------------------------------
// Unix (Linux / macOS) 启动包装器
// ---------------------------------------------------------------------------
function getUnixWrapperPath() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), '.local', 'bin', 'antigravity-i18n');
  }
  return path.join(os.homedir(), '.local', 'share', 'antigravity-i18n', 'launch.sh');
}

function setupUnixLauncher(installDir) {
  const wrapperPath = getUnixWrapperPath();
  fs.mkdirSync(path.dirname(wrapperPath), { recursive: true });

  let launchLine;
  if (process.platform === 'darwin') {
    launchLine = `exec open -a "${installDir}" "$@"`;
  } else {
    const binPath = path.join(installDir, 'antigravity');
    launchLine = `exec "${binPath}" "$@"`;
  }

  const script = [
    '#!/usr/bin/env bash',
    '# Antigravity i18n 自动补丁启动器 (由 scripts/launcher.js 自动生成)',
    `"${process.execPath}" "${launcherScript}" ensure >/dev/null 2>&1 || true`,
    launchLine,
    '',
  ].join('\n');
  fs.writeFileSync(wrapperPath, script, { mode: 0o755 });

  if (process.platform === 'linux') {
    const desktopDir = path.join(os.homedir(), '.local', 'share', 'applications');
    const desktopFile = path.join(desktopDir, 'antigravity.desktop');
    fs.mkdirSync(desktopDir, { recursive: true });
    const desktop = [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Antigravity',
      'Comment=Antigravity (with i18n Auto-Patch Launcher)',
      `Exec="${wrapperPath}" %U`,
      'Terminal=false',
      'Categories=Development;IDE;',
      '',
    ].join('\n');
    fs.writeFileSync(desktopFile, desktop, 'utf8');
    return { mode: 'linux_desktop', hookPath: wrapperPath, shortcuts: [{ desktopFile }] };
  }

  return { mode: 'macos_script', hookPath: wrapperPath, shortcuts: [] };
}

// ---------------------------------------------------------------------------
// 命令实现
// ---------------------------------------------------------------------------
function getArgValue(argv, name) {
  const idx = argv.indexOf(name);
  return idx !== -1 && idx + 1 < argv.length ? argv[idx + 1] : null;
}

function askQuestion(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * 在 Windows 桌面会话弹出系统原生确认框 (30s 无操作自动超时，绝不永久阻塞启动)
 * 返回 true 表示用户点击了"是"
 */
function askYesNoPopupOnWindows(verTag, lang) {
  if (process.platform !== 'win32' || process.env.AG_LAUNCHER_NO_POPUP === '1') {
    return false;
  }
  const tmpVbs = path.join(os.tmpdir(), `ag_i18n_confirm_${process.pid}_${Date.now()}.vbs`);
  const msg =
    `检测到 Antigravity 已更新${verTag}（${lang} 补丁已失效），但仍有 Antigravity 进程在后台运行（可能是系统托盘驻留或已打开窗口）。\\n\\n` +
    `是否立即关闭现有进程、自动重打 [${lang}] 补丁后再启动？\\n` +
    `（点击"是"立即修复并启动汉化版；点击"否"跳过本次直接打开）`;
  const vbs = [
    'Set sh = CreateObject("WScript.Shell")',
    `msg = "${msg.replace(/"/g, '""').replace(/\\n/g, '" & vbCrLf & "')}"`,
    'ret = sh.Popup(msg, 30, "Antigravity i18n 自动补丁", 4 + 32 + 4096)',
    'WScript.Quit ret',
  ].join('\r\n');
  try {
    writeVbsWithEncoding(tmpVbs, vbs, 'utf16le-bom');
    const res = spawnSync('wscript.exe', [tmpVbs], { windowsHide: true, timeout: 35 * 1000 });
    return res.status === 6; // IDYES
  } catch (e) {
    return false;
  } finally {
    try {
      fs.rmSync(tmpVbs, { force: true });
    } catch (e) {}
  }
}

function runInstall(config, installDir, extraArgs = [], echoToConsole = false) {
  const args = [
    installScript,
    '--lang',
    config.lang,
    '--no-prompt',
    '--no-launcher',
    '--path',
    installDir,
    ...extraArgs,
  ];
  const res = spawnSync(process.execPath, args, {
    cwd: rootDir,
    encoding: 'utf8',
    windowsHide: true,
    timeout: 10 * 60 * 1000,
  });
  const output = `${res.stdout || ''}${res.stderr || ''}`
    .split(/\r?\n/)
    .map((l) => stripAnsi(l).trimEnd())
    .filter((l) => l && !/^=+$/.test(l.trim()));
  output.forEach((l) => {
    writeLog(`  | ${l}`);
    if (echoToConsole) console.log(`  ${l}`);
  });
  return res.status === 0;
}

function cmdEnsure() {
  let config = hydrateConfigFromEnvironment(userConfig.loadConfig());
  if (!config.lang) return;

  const target = resolveTargetPaths(config);
  if (!target || !fs.existsSync(target.appAsar)) return;

  // 极速检查：补丁有效时直接退出，耗时仅数毫秒
  const meta = getAsarMeta(target.appAsar);
  if (meta && meta.isPatched) return;

  // 补丁已失效（官方刚完成更新）→ 获取互斥锁，防止双击多次并发打补丁
  let acquired = tryAcquireLock();
  if (!acquired) {
    const deadline = Date.now() + LOCK_WAIT_MS;
    while (Date.now() < deadline) {
      sleepSync(250);
      if (tryAcquireLock()) {
        acquired = true;
        break;
      }
    }
    // 其他实例可能已经补好，重新验证一次
    const recheck = getAsarMeta(target.appAsar);
    if (recheck && recheck.isPatched) {
      if (acquired) releaseLock();
      return;
    }
  }

  try {
    const verTag = meta && meta.version ? ` v${meta.version}` : '';
    const extraArgs = [];

    if (isAntigravityRunning()) {
      // 客户端正在运行中（可能是托盘常驻进程或已打开窗口），弹窗征求用户确认后再关闭重打
      const confirmed = askYesNoPopupOnWindows(verTag, config.lang);
      if (!confirmed) {
        writeLog('[跳过] 检测到补丁已失效，但 Antigravity 正在运行中；下次关闭后重新启动将自动重打补丁。');
        return;
      }
      writeLog(`[确认] 用户确认关闭运行中的 Antigravity 并重打 [${config.lang}] 补丁${verTag}...`);
      // 注意不加 --auto-launch，因为外层启动器紧接着就会拉起客户端
      extraArgs.push('--force-close');
    } else {
      extraArgs.push('--skip-process-check');
    }

    writeLog(`[检测] app.asar 已被官方更新覆盖${verTag}，启动前自动重打 [${config.lang}] 补丁...`);
    const ok = runInstall(config, target.installDir, extraArgs, false);
    if (ok) {
      writeLog(`[成功] 已在启动前自动重新应用 [${config.lang}] 语言补丁${verTag}。`);
    } else {
      writeLog('[失败] 启动前自动重打补丁失败，将直接放行启动客户端。');
    }
  } catch (err) {
    writeLog(`[异常] ${err && err.stack ? err.stack : err}`);
  } finally {
    if (acquired) releaseLock();
  }
}

async function cmdRepair(argv = []) {
  const explicitLang = getArgValue(argv, '--lang') || getArgValue(argv, '-l');
  const forceClose = argv.includes('--force-close') || argv.includes('-f') || argv.includes('-y');
  const config = hydrateConfigFromEnvironment(userConfig.loadConfig(), explicitLang);
  if (!config.lang) {
    print('[错误] 尚未记录过安装语言，请先运行一次 bin/install.bat 完成安装。', colors.red);
    process.exitCode = 1;
    return;
  }

  const target = resolveTargetPaths(config);
  if (!target || !fs.existsSync(target.appAsar)) {
    print('[错误] 未找到 Antigravity 安装目录或 app.asar，请先运行 bin/install.bat。', colors.red);
    process.exitCode = 1;
    return;
  }

  const meta = getAsarMeta(target.appAsar);
  const verTag = meta && meta.version ? ` v${meta.version}` : '';
  if (meta && meta.isPatched) {
    print(`[正常] 当前客户端${verTag} 已应用 [${meta.patchedLang || config.lang}] 补丁，无需修复。`, colors.green);
    return;
  }

  print(`[检测] 当前客户端${verTag} 补丁已失效（官方更新覆盖），准备重打 [${config.lang}] 补丁...`, colors.yellow);

  const running = isAntigravityRunning();
  const extraArgs = [];
  if (running) {
    let shouldClose = forceClose;
    if (!shouldClose) {
      print('[提示] 检测到 Antigravity 进程正在运行（可能是已打开的窗口或系统托盘驻留进程）。', colors.yellow);
      const ans = await askQuestion(`是否立即关闭 Antigravity、重打 [${config.lang}] 补丁并重新启动？(Y/N，回车默认 Y): `);
      shouldClose = !ans || /^[yY]/i.test(ans);
    }
    if (!shouldClose) {
      print('[取消] 已取消操作。请先完全退出 Antigravity（含托盘图标）后再重试。', colors.red);
      process.exitCode = 2;
      return;
    }
    extraArgs.push('--force-close', '--auto-launch');
  } else {
    extraArgs.push('--skip-process-check');
  }

  const ok = runInstall(config, target.installDir, extraArgs, true);
  if (ok) {
    print(`[成功] 已为客户端${verTag} 重新应用 [${config.lang}] 补丁！`, colors.green);
  } else {
    print(`[失败] 重打补丁失败，请检查上方输出或日志文件: ${logFile}`, colors.red);
    process.exitCode = 1;
  }
}

function cmdEnable(argv) {
  const explicitLang = getArgValue(argv, '--lang') || getArgValue(argv, '-l');
  const config = hydrateConfigFromEnvironment(userConfig.loadConfig(), explicitLang);
  if (!config.lang || !config.installDir) {
    print('[错误] 尚未记录过成功安装的语言与路径，请先运行一次 bin/install.bat (或 npm run install-patch) 完成补丁安装。', colors.red);
    process.exitCode = 1;
    return;
  }

  const target = resolveTargetPaths(config);
  const installDir = target ? target.installDir : config.installDir;

  if (process.platform === 'win32') {
    const proxyVbs = findProxyVbsPath(installDir);
    if (proxyVbs) {
      injectIntoProxyVbs(proxyVbs);
      userConfig.updateConfig({
        launcher: { enabled: true, mode: 'proxy_vbs', hookPath: proxyVbs, shortcuts: [] },
      });
      print('====================================================', colors.green);
      print('   ✅ 已接入您的代理启动器！更新后启动即自动重打补丁', colors.green);
      print('====================================================', colors.green);
      print(`• 接入位置: ${proxyVbs}`);
      print(`• 守护语言: ${config.lang}`);
      print('• 工作方式: 零后台常驻进程；平时启动仅 ~40ms 放行，检测到更新后启动前自动重打补丁');
      print(`• 运行日志: ${logFile}`, colors.gray);
      print('• 卸载方法: bin\\launcher.bat disable 或 npm run launcher:disable', colors.gray);
      print('[提示] 请保持通过桌面快捷方式或该 VBS 启动 Antigravity，且勿移动当前项目目录。', colors.yellow);
      return;
    }

    const wrapperPath = getDefaultWrapperVbsPath();
    createWrapperVbs(installDir, wrapperPath);
    const wrapped = findAndWrapWindowsShortcuts(installDir, wrapperPath);
    userConfig.updateConfig({
      launcher: { enabled: true, mode: 'shortcut_vbs', hookPath: wrapperPath, shortcuts: wrapped },
    });
    print('====================================================', colors.green);
    print('   ✅ 已启用启动器自动补丁！更新后启动即自动重打补丁', colors.green);
    print('====================================================', colors.green);
    print(`• 启动包装器: ${wrapperPath}`);
    print(`• 已接管快捷方式: ${wrapped.length} 个`);
    wrapped.forEach((s) => print(`    - ${s.lnkPath}`, colors.gray));
    if (wrapped.length === 0) {
      print('[提示] 未在桌面或开始菜单检测到指向 Antigravity.exe 的快捷方式，可直接双击上方 VBS 启动。', colors.yellow);
    }
    print(`• 守护语言: ${config.lang}`);
    print('• 卸载方法: bin\\launcher.bat disable 或 npm run launcher:disable', colors.gray);
    return;
  }

  const res = setupUnixLauncher(installDir);
  userConfig.updateConfig({
    launcher: { enabled: true, mode: res.mode, hookPath: res.hookPath, shortcuts: res.shortcuts },
  });
  print('====================================================', colors.green);
  print('   ✅ 已创建启动器包装脚本！更新后启动即自动重打补丁', colors.green);
  print('====================================================', colors.green);
  print(`• 启动脚本: ${res.hookPath}`);
  if (res.mode === 'linux_desktop') {
    print(`• 桌面菜单覆盖: ${res.shortcuts[0].desktopFile}`);
  } else {
    print(`• 使用方法: 可通过 ${res.hookPath} 启动 Antigravity`);
  }
  print(`• 守护语言: ${config.lang}`);
}

function cmdDisable() {
  const config = userConfig.loadConfig();
  const l = config.launcher || {};
  let detail = '';

  if (l.mode === 'proxy_vbs' && l.hookPath) {
    const removed = removeFromProxyVbs(l.hookPath);
    detail = removed ? `已从 ${l.hookPath} 移除注入代码（原代理逻辑完整保留）` : '未检测到注入代码，无需清理';
  } else if (l.mode === 'shortcut_vbs') {
    const restored = restoreWindowsShortcuts(l.shortcuts);
    if (l.hookPath && fs.existsSync(l.hookPath)) {
      fs.rmSync(l.hookPath, { force: true });
    }
    detail = `已还原 ${restored} 个快捷方式并移除包装启动脚本`;
  } else if (l.mode === 'linux_desktop' || l.mode === 'macos_script') {
    if (l.hookPath && fs.existsSync(l.hookPath)) fs.rmSync(l.hookPath, { force: true });
    if (Array.isArray(l.shortcuts)) {
      l.shortcuts.forEach((s) => {
        if (s && s.desktopFile && fs.existsSync(s.desktopFile)) fs.rmSync(s.desktopFile, { force: true });
      });
    }
    detail = '已移除启动包装脚本';
  } else {
    // 兜底检查：即使配置被清空，也尝试清理一次现有代理 VBS 中的标记
    const proxyVbs = findProxyVbsPath(config.installDir);
    if (proxyVbs && removeFromProxyVbs(proxyVbs)) {
      detail = `已从 ${proxyVbs} 移除注入代码`;
    } else {
      detail = '当前未启用启动器集成';
    }
  }

  userConfig.updateConfig({
    launcher: { enabled: false, mode: null, hookPath: null, shortcuts: [] },
  });
  print('[完成] 已停用启动器自动补丁。', colors.green);
  print(`• 处理结果: ${detail}`, colors.gray);
}

function cmdStatus() {
  const config = hydrateConfigFromEnvironment(userConfig.loadConfig());
  const l = config.launcher || {};
  const target = resolveTargetPaths(config);
  const meta = target ? getAsarMeta(target.appAsar) : null;
  const proxyVbs = findProxyVbsPath(target ? target.installDir : config.installDir);

  print('================ Antigravity i18n 启动器状态 ================', colors.cyan);
  print(`• 启动器集成: ${l.enabled ? `已启用 (${l.mode || '未知模式'})` : '未启用'}`, l.enabled ? colors.green : colors.yellow);
  if (l.hookPath) print(`• 挂载脚本: ${l.hookPath}`);
  if (proxyVbs && !l.enabled) {
    print(`• 检测到现有代理启动器: ${proxyVbs} (可直接执行 enable 接入)`, colors.cyan);
  }
  print(`• 守护语言: ${config.lang || '(未记录)'}`);
  print(`• 安装目录: ${target ? target.installDir : config.installDir || '(未记录)'}`);
  if (meta) {
    const state = meta.isPatched ? `已补丁 [${meta.patchedLang || '未知语言'}]` : '未补丁 (官方原版)';
    print(`• 客户端版本: ${meta.version || '未知'}  |  补丁状态: ${state}`, meta.isPatched ? colors.green : colors.yellow);
  }
  if (config.lastPatchedAt) print(`• 最近一次补丁: ${new Date(config.lastPatchedAt).toLocaleString()}`);
  print(`• 运行日志: ${logFile}`, colors.gray);
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = (argv[0] || 'status').toLowerCase();
  switch (cmd) {
    case 'enable':
    case 'install':
      return cmdEnable(argv);
    case 'disable':
    case 'uninstall':
      return cmdDisable();
    case 'status':
      return cmdStatus();
    case 'ensure':
      return cmdEnsure();
    case 'repair':
    case 'fix':
      return cmdRepair(argv);
    default:
      print(`[错误] 未知命令: ${cmd}`, colors.red);
      print('可用命令: enable | disable | status | repair [--force-close] | ensure');
      process.exitCode = 1;
  }
}

if (require.main === module) {
  Promise.resolve(main()).catch((err) => {
    print(`[异常] ${err && err.message ? err.message : err}`, colors.red);
    process.exitCode = 1;
  });
}

module.exports = {
  VBS_SENTINEL_START,
  VBS_SENTINEL_END,
  findProxyVbsPath,
  injectIntoProxyVbs,
  removeFromProxyVbs,
  cmdEnable,
  cmdDisable,
  cmdEnsure,
  cmdRepair,
  cmdStatus,
};
