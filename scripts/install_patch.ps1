<#
.SYNOPSIS
    Antigravity UI 简体中文汉化补丁安装脚本
.DESCRIPTION
    自动备份官方原版 app.asar，基于纯净原包解包，注入最新汉化补丁并重新封包替换。
#>

[CmdletBinding()]
param (
    [string]$InstallPath = "",
    [switch]$ForceClose
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "   Antigravity 简体中文汉化补丁安装工具 (v2.0)     " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# 0. 准备项目根路径与补丁产物
$rootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$distPatch = Join-Path $rootDir "dist\chinese_patch.js"
$dictFile = Join-Path $rootDir "locales\dict.json"
$buildScript = Join-Path $PSScriptRoot "build.js"

# 检查是否需要触发构建
$needBuild = $false
if (-not (Test-Path $distPatch)) {
    $needBuild = $true
} elseif (Test-Path $dictFile) {
    $dictTime = (Get-Item $dictFile).LastWriteTime
    $patchTime = (Get-Item $distPatch).LastWriteTime
    if ($dictTime -gt $patchTime) {
        $needBuild = $true
    }
}

if ($needBuild) {
    Write-Host "[构建] 检测到补丁需编译更新，正在执行构建..." -ForegroundColor Cyan
    node "$buildScript"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[错误] 补丁构建失败，退出安装。" -ForegroundColor Red
        exit 1
    }
}

# 1. 检测 Antigravity 进程
$procs = Get-Process Antigravity -ErrorAction SilentlyContinue
if ($procs) {
    Write-Host "[提示] 检测到 Antigravity 正在运行中。" -ForegroundColor Yellow
    if ($ForceClose) {
        Write-Host "正在退出 Antigravity 进程..." -ForegroundColor Yellow
        $procs | Stop-Process -Force
        Start-Sleep -Seconds 2
    } else {
        $confirm = Read-Host "安装汉化补丁需要先关闭 Antigravity 客户端，是否立即关闭？(Y/N)"
        if ($confirm -match '^[yY]') {
            Write-Host "正在退出 Antigravity 进程..." -ForegroundColor Yellow
            $procs | Stop-Process -Force
            Start-Sleep -Seconds 2
        } else {
            Write-Host "[取消] 用户取消操作，请手动关闭 Antigravity 后再次运行此脚本。" -ForegroundColor Red
            exit 1
        }
    }
}

# 2. 确定 Antigravity 安装目录
if (-not $InstallPath) {
    $defaultPath = Join-Path $env:LOCALAPPDATA "Programs\antigravity"
    if (Test-Path $defaultPath) {
        $InstallPath = $defaultPath
    }
}

if (-not $InstallPath -or -not (Test-Path $InstallPath)) {
    Write-Host "[错误] 未能自动定位 Antigravity 安装目录。" -ForegroundColor Red
    $InstallPath = Read-Host "请输入 Antigravity 安装根目录（例如 C:\Users\xxx\AppData\Local\Programs\antigravity）"
    if (-not (Test-Path $InstallPath)) {
        Write-Host "[错误] 路径不存在，退出。" -ForegroundColor Red
        exit 1
    }
}

Write-Host "[信息] Antigravity 安装路径: $InstallPath" -ForegroundColor Green

$resourcesDir = Join-Path $InstallPath "resources"
$appAsar = Join-Path $resourcesDir "app.asar"
$backupAsar = Join-Path $resourcesDir "app.asar.bak"

if (-not (Test-Path $appAsar) -and -not (Test-Path $backupAsar)) {
    Write-Host "[错误] 未在目标目录下找到 app.asar 或 app.asar.bak: $resourcesDir" -ForegroundColor Red
    exit 1
}

# 3. 备份官方原始 app.asar
if (-not (Test-Path $backupAsar)) {
    Write-Host "[备份] 正在创建官方原始包备份: $backupAsar ..." -ForegroundColor Cyan
    Copy-Item -Path $appAsar -Destination $backupAsar -Force
    Write-Host "[备份] 原始包备份成功！随时可运行一键还原恢复官方英文版。" -ForegroundColor Green
} else {
    Write-Host "[备份] 检测到已有官方原版备份文件，保留该纯净备份。" -ForegroundColor Gray
}

# 优先以官方纯净备份作为解包基准，彻底避免重复安装时的代码叠加污染
$sourceAsar = if (Test-Path $backupAsar) { $backupAsar } else { $appAsar }

# 4. 准备临时解包工作目录
$tempWorkDir = Join-Path $env:TEMP "antigravity_chinese_patch_tmp"
if (Test-Path $tempWorkDir) {
    Remove-Item -Recurse -Force $tempWorkDir -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Force -Path $tempWorkDir | Out-Null

try {
    # 5. 解包 asar
    Write-Host "[解包] 正在解压纯净包: $([System.IO.Path]::GetFileName($sourceAsar)) ..." -ForegroundColor Cyan
    npx --yes @electron/asar extract "$sourceAsar" "$tempWorkDir"
    if (-not (Test-Path (Join-Path $tempWorkDir "dist\preload.js"))) {
        throw "解包失败，未找到 dist\preload.js"
    }

    # 6. 执行注入脚本
    $applyScript = Join-Path $PSScriptRoot "apply_patch.js"
    Write-Host "[注入] 正在注入最新汉化引擎与原生菜单优化..." -ForegroundColor Cyan
    node "$applyScript" "$tempWorkDir"
    if ($LASTEXITCODE -ne 0) {
        throw "汉化模块注入过程返回错误代码 $LASTEXITCODE"
    }

    # 7. 重新封包
    $newAsar = Join-Path $resourcesDir "app.asar.patched"
    if (Test-Path $newAsar) { Remove-Item -Force $newAsar }

    Write-Host "[打包] 正在重新封包为 app.asar ..." -ForegroundColor Cyan
    npx --yes @electron/asar pack "$tempWorkDir" "$newAsar" --unpack-dir "node_modules/chrome-devtools-mcp"

    if (-not (Test-Path $newAsar)) {
        throw "重新封包失败，未生成 $newAsar"
    }

    # 8. 替换生效
    Move-Item -Path $newAsar -Destination $appAsar -Force
    Write-Host "[完成] 新的汉化包已成功替换！" -ForegroundColor Green

} catch {
    Write-Host "[异常] 安装过程发生错误: $_" -ForegroundColor Red
    if (Test-Path $backupAsar) {
        Write-Host "[安全机制] 正在从官方备份恢复原始文件..." -ForegroundColor Yellow
        Copy-Item -Path $backupAsar -Destination $appAsar -Force
        Write-Host "[安全机制] 已自动回滚至官方原版。" -ForegroundColor Green
    }
    exit 1
} finally {
    # 清理临时文件
    if (Test-Path $tempWorkDir) {
        Remove-Item -Recurse -Force $tempWorkDir -ErrorAction SilentlyContinue
    }
}

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "   🎉 恭喜！Antigravity 简体中文汉化补丁安装成功！   " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host "• 包含左侧主导航、对话控制、全部设置面板、辅助窗格及系统菜单汉化"
Write-Host "• 代码块、终端输出与路径已受智能保护，保持原汁原味"
Write-Host "• 若需还原官方英文版，随时运行 restore.bat 或 restore_original.ps1 即可"
Write-Host ""

$exePath = Join-Path $InstallPath "Antigravity.exe"
if (Test-Path $exePath) {
    $launch = Read-Host "是否现在启动 Antigravity 查看汉化效果？(Y/N)"
    if ($launch -match '^[yY]') {
        Write-Host "正在启动 Antigravity..." -ForegroundColor Cyan
        Start-Process -FilePath $exePath
    }
}
