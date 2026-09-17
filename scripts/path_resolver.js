const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const cacheFilePath = path.join(rootDir, '.antigravity_path');

/**
 * 校验并归一化候选路径，识别其是否包含合法的 app.asar 或 resources 结构
 * 支持传入根目录、可执行文件、resources 目录或 app.asar 文件本身
 * @param {string} candidate
 * @returns {{installDir: string, resourcesDir: string, appAsar: string}|null}
 */
function inspectAntigravityPath(candidate) {
  if (!candidate || typeof candidate !== 'string') return null;

  let raw = candidate.trim();
  // 去除包裹的引号（用户在终端或拖拽路径时可能包含引号）
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1).trim();
  }
  if (!raw) return null;

  let normalized = path.resolve(raw);
  if (!fs.existsSync(normalized)) return null;

  const stat = fs.statSync(normalized);
  let baseDir = stat.isDirectory() ? normalized : path.dirname(normalized);

  // 1. 如果 baseDir 本身包含 app.asar 或 app.asar.bak (即它本身就是 resources 目录)
  if (fs.existsSync(path.join(baseDir, 'app.asar')) || fs.existsSync(path.join(baseDir, 'app.asar.bak'))) {
    let installDir = path.dirname(baseDir);
    // 兼容 macOS: xxx.app/Contents/Resources -> installDir 为 xxx.app
    if (path.basename(baseDir).toLowerCase() === 'resources' && path.basename(installDir).toLowerCase() === 'contents') {
      installDir = path.dirname(installDir);
    }
    return {
      installDir,
      resourcesDir: baseDir,
      appAsar: path.join(baseDir, 'app.asar'),
    };
  }

  // 2. 检查 baseDir 下的 resources 子目录
  const subResources = path.join(baseDir, 'resources');
  if (fs.existsSync(path.join(subResources, 'app.asar')) || fs.existsSync(path.join(subResources, 'app.asar.bak'))) {
    return {
      installDir: baseDir,
      resourcesDir: subResources,
      appAsar: path.join(subResources, 'app.asar'),
    };
  }

  // 3. 兼容 macOS Contents/Resources 目录
  const macResources = path.join(baseDir, 'Contents', 'Resources');
  if (fs.existsSync(path.join(macResources, 'app.asar')) || fs.existsSync(path.join(macResources, 'app.asar.bak'))) {
    return {
      installDir: baseDir,
      resourcesDir: macResources,
      appAsar: path.join(macResources, 'app.asar'),
    };
  }

  // 4. Linux 直接解包或定制路径结构
  if (fs.existsSync(path.join(baseDir, 'app.asar')) || fs.existsSync(path.join(baseDir, 'app.asar.bak'))) {
    return {
      installDir: baseDir,
      resourcesDir: baseDir,
      appAsar: path.join(baseDir, 'app.asar'),
    };
  }

  return null;
}

/**
 * 策略 1: 从正在运行的 Antigravity 进程中提取真实物理路径
 * 在任何安装在任何自定义目录/盘符的机器上，只要程序正在运行即可精准获取
 */
function detectFromRunningProcess() {
  try {
    if (process.platform === 'win32') {
      const psCmd = '(Get-Process -Name Antigravity -ErrorAction SilentlyContinue | Select-Object -First 1).Path';
      const out = execSync(`powershell -NoProfile -Command "${psCmd}"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      if (out && fs.existsSync(out)) {
        return path.dirname(out);
      }
    } else if (process.platform === 'darwin') {
      const out = execSync("pgrep -il antigravity | awk '{print $2}' | head -n 1", {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      if (out && out.includes('.app')) {
        const appIdx = out.indexOf('.app');
        return out.substring(0, appIdx + 4);
      }
    } else {
      // Linux
      const out = execSync('readlink -f /proc/$(pgrep -i antigravity | head -n 1)/exe', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      }).trim();
      if (out && fs.existsSync(out)) {
        return path.dirname(out);
      }
    }
  } catch (e) {}
  return null;
}

/**
 * 策略 2: 从本地机器历史缓存中读取上次验证有效的路径
 */
function detectFromLocalCache() {
  if (fs.existsSync(cacheFilePath)) {
    try {
      const cached = fs.readFileSync(cacheFilePath, 'utf8').trim();
      if (cached && inspectAntigravityPath(cached)) {
        return cached;
      }
    } catch (e) {}
  }
  return null;
}

/**
 * 将成功探测到的有效路径缓存到本地文件，下次运行同一机器免配置
 */
function saveLocalPathCache(validPath) {
  try {
    fs.writeFileSync(cacheFilePath, validPath.trim(), 'utf8');
  } catch (e) {}
}

/**
 * 策略 3: 从环境变量中探测
 */
function detectFromEnv() {
  const envKeys = ['ANTIGRAVITY_PATH', 'ANTIGRAVITY_HOME', 'ANTIGRAVITY_RESOURCES', 'ANTIGRAVITY_DIR'];
  for (const key of envKeys) {
    const val = process.env[key];
    if (val && inspectAntigravityPath(val)) {
      return val;
    }
  }
  return null;
}

/**
 * 策略 4: Windows 注册表智能查询 (HKCU & HKLM 卸载项)
 * 只要在 Windows 上安装过 Antigravity（不论装在哪个盘符），注册表均有记录
 */
function detectFromWindowsRegistry() {
  if (process.platform !== 'win32') return null;

  const hives = [
    'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
    'HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  ];

  for (const hive of hives) {
    try {
      const output = execSync(`reg query "${hive}" /s /f "antigravity"`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });

      const lines = output.split(/[\r\n]+/);
      for (const line of lines) {
        if (/DisplayIcon|InstallLocation|UninstallString/i.test(line)) {
          const match = line.match(/REG_SZ\s+(.+)$/i);
          if (match && match[1]) {
            let rawVal = match[1].trim();
            // 剥离可能的前后引号与快捷命令参数
            let cleanPath = '';
            if (rawVal.startsWith('"')) {
              const secondQuote = rawVal.indexOf('"', 1);
              cleanPath = secondQuote !== -1 ? rawVal.substring(1, secondQuote) : rawVal.replace(/"/g, '');
            } else {
              cleanPath = rawVal.split(',')[0].trim();
            }

            if (cleanPath.toLowerCase().endsWith('.exe')) {
              cleanPath = path.dirname(cleanPath);
            }

            const inspected = inspectAntigravityPath(cleanPath);
            if (inspected) {
              return inspected.installDir;
            }
          }
        }
      }
    } catch (e) {}
  }
  return null;
}

/**
 * 策略 5: 从系统 PATH (where / which) 中探测
 */
function detectFromPathCommand() {
  try {
    const cmd = process.platform === 'win32' ? 'where antigravity.exe' : 'which antigravity';
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    const firstLine = out.split(/[\r\n]+/)[0];
    if (firstLine && fs.existsSync(firstLine)) {
      const dir = path.dirname(firstLine);
      if (inspectAntigravityPath(dir)) return dir;
    }
  } catch (e) {}
  return null;
}

/**
 * 策略 6: 扫描全盘盘符与常见操作系统候选路径
 */
function getSystemCandidatePaths() {
  const candidates = [];
  const platform = process.platform;

  if (platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    const appData = process.env.APPDATA || '';
    const progFiles = process.env.ProgramFiles || '';
    const progFilesX86 = process.env['ProgramFiles(x86)'] || '';
    const userProfile = process.env.USERPROFILE || '';

    // 当前用户标准应用目录
    if (localAppData) {
      candidates.push(path.join(localAppData, 'Programs', 'antigravity'));
      candidates.push(path.join(localAppData, 'Programs', 'Antigravity'));
      candidates.push(path.join(localAppData, 'antigravity'));
      candidates.push(path.join(localAppData, 'Antigravity'));
    }
    if (userProfile) {
      candidates.push(path.join(userProfile, 'AppData', 'Local', 'Programs', 'antigravity'));
      candidates.push(path.join(userProfile, 'AppData', 'Local', 'Programs', 'Antigravity'));
    }
    if (appData) {
      candidates.push(path.join(appData, 'antigravity'));
      candidates.push(path.join(appData, 'Antigravity'));
    }

    // 全局 Program Files
    if (progFiles) {
      candidates.push(path.join(progFiles, 'Antigravity'));
      candidates.push(path.join(progFiles, 'antigravity'));
    }
    if (progFilesX86) {
      candidates.push(path.join(progFilesX86, 'Antigravity'));
      candidates.push(path.join(progFilesX86, 'antigravity'));
    }

    // 动态探测其它盘符 (D:, E:, F:, G:) 的常见自定义安装位置
    const drives = ['C:', 'D:', 'E:', 'F:', 'G:'];
    for (const d of drives) {
      try {
        if (fs.existsSync(d + '\\')) {
          candidates.push(path.join(d, 'Antigravity'));
          candidates.push(path.join(d, 'antigravity'));
          candidates.push(path.join(d, 'Programs', 'Antigravity'));
          candidates.push(path.join(d, 'Programs', 'antigravity'));
          candidates.push(path.join(d, 'Program Files', 'Antigravity'));
          candidates.push(path.join(d, 'Program Files (x86)', 'Antigravity'));
          candidates.push(path.join(d, 'Software', 'Antigravity'));
          candidates.push(path.join(d, 'Apps', 'Antigravity'));
          candidates.push(path.join(d, 'Tools', 'Antigravity'));
        }
      } catch (e) {}
    }
  } else if (platform === 'darwin') {
    candidates.push('/Applications/Antigravity.app');
    candidates.push(path.join(os.homedir(), 'Applications', 'Antigravity.app'));
    candidates.push('/Applications/Google Antigravity.app');
  } else {
    // Linux
    candidates.push('/opt/Antigravity');
    candidates.push('/opt/antigravity');
    candidates.push('/usr/lib/antigravity');
    candidates.push('/usr/share/antigravity');
    candidates.push(path.join(os.homedir(), '.local', 'share', 'antigravity'));
  }

  return candidates;
}

/**
 * 跨平台全自动探测与解析 Antigravity 安装与资源路径
 * 综合进程探测、注册表、环境变量、本地缓存、全盘扫描与交互式回退
 * @param {string} customInput 用户通过 --path 传入的路径
 * @param {Function} askFn 交互式提问函数 (query) => Promise<string>
 * @returns {Promise<{installDir: string, resourcesDir: string, appAsar: string}>}
 */
async function resolveAntigravityPaths(customInput, askFn) {
  // 1. 优先使用用户命令行传入的参数
  if (customInput) {
    const inspected = inspectAntigravityPath(customInput);
    if (inspected) {
      saveLocalPathCache(inspected.installDir);
      return inspected;
    } else {
      console.warn(`[警告] 命令行指定的路径未找到有效的 Antigravity 安装: ${customInput}`);
    }
  }

  // 2. 优先探测当前正在运行的进程
  const runningProcessDir = detectFromRunningProcess();
  if (runningProcessDir) {
    const inspected = inspectAntigravityPath(runningProcessDir);
    if (inspected) {
      saveLocalPathCache(inspected.installDir);
      return inspected;
    }
  }

  // 3. 检查环境变量
  const envDir = detectFromEnv();
  if (envDir) {
    const inspected = inspectAntigravityPath(envDir);
    if (inspected) {
      saveLocalPathCache(inspected.installDir);
      return inspected;
    }
  }

  // 4. 检查本地机器历史成功缓存
  const cachedDir = detectFromLocalCache();
  if (cachedDir) {
    const inspected = inspectAntigravityPath(cachedDir);
    if (inspected) {
      return inspected;
    }
  }

  // 5. Windows 注册表扫描
  const regDir = detectFromWindowsRegistry();
  if (regDir) {
    const inspected = inspectAntigravityPath(regDir);
    if (inspected) {
      saveLocalPathCache(inspected.installDir);
      return inspected;
    }
  }

  // 6. 系统 PATH 查询 (where / which)
  const pathDir = detectFromPathCommand();
  if (pathDir) {
    const inspected = inspectAntigravityPath(pathDir);
    if (inspected) {
      saveLocalPathCache(inspected.installDir);
      return inspected;
    }
  }

  // 7. 系统候选路径及各驱动器常见安装路径扫描
  const candidates = getSystemCandidatePaths();
  for (const cand of candidates) {
    const inspected = inspectAntigravityPath(cand);
    if (inspected) {
      saveLocalPathCache(inspected.installDir);
      return inspected;
    }
  }

  // 8. 自动检测全部未果，进入交互式引导输入
  if (typeof askFn === 'function') {
    console.log('\n[提示] 未能全自动定位到 Antigravity 安装路径。');
    console.log('这通常是因为您将客户端安装在了非标准磁盘分区或自定义文件夹中。');

    while (true) {
      const input = await askFn('请输入 Antigravity 安装目录（可直接拖拽文件夹或 Antigravity.exe 到窗口中）: ');
      if (!input) {
        throw new Error('用户取消了路径输入，安装中止。');
      }

      const inspected = inspectAntigravityPath(input);
      if (inspected) {
        saveLocalPathCache(inspected.installDir);
        return inspected;
      }

      console.log(`[错误] 输入的路径中未检测到 app.asar 或 resources 资源，请重新输入或确认路径是否正确。`);
    }
  }

  throw new Error('无法自动定位 Antigravity 安装路径，请通过 --path 参数明确指定。');
}

module.exports = {
  inspectAntigravityPath,
  detectFromRunningProcess,
  detectFromWindowsRegistry,
  detectFromLocalCache,
  saveLocalPathCache,
  resolveAntigravityPaths,
};
