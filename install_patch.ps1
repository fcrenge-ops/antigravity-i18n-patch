<#
.SYNOPSIS
    Antigravity UI 简体中文汉化补丁安装脚本
.DESCRIPTION
    自动备份原版 app.asar，解包并注入汉化字典与 DOM 动态监听模块，重构原生菜单。
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

if (-not (Test-Path $appAsar)) {
    Write-Host "[错误] 未找到 app.asar: $appAsar" -ForegroundColor Red
    exit 1
}

# 3. 备份原始 app.asar
if (-not (Test-Path $backupAsar)) {
    Write-Host "[备份] 正在创建官方原始包备份: $backupAsar ..." -ForegroundColor Cyan
    Copy-Item -Path $appAsar -Destination $backupAsar -Force
    Write-Host "[备份] 原始包备份成功！随时可运行 restore_original.ps1 恢复。" -ForegroundColor Green
} else {
    Write-Host "[备份] 检测到已有官方备份文件，保留原始备份。" -ForegroundColor Gray
}

# 4. 准备临时解包工作目录
$tempWorkDir = Join-Path $env:TEMP "antigravity_chinese_patch_tmp"
if (Test-Path $tempWorkDir) {
    Remove-Item -Recurse -Force $tempWorkDir
}
New-Item -ItemType Directory -Force -Path $tempWorkDir | Out-Null

try {
    # 5. 解包 app.asar
    Write-Host "[解包] 正在解压 app.asar ..." -ForegroundColor Cyan
    npx --yes @electron/asar extract "$appAsar" "$tempWorkDir"
    if (-not (Test-Path (Join-Path $tempWorkDir "dist\preload.js"))) {
        throw "解包失败，未找到 dist\preload.js"
    }

    # 6. 执行注入脚本
    $applyScript = Join-Path $PSScriptRoot "apply_patch.js"
    Write-Host "[注入] 正在注入汉化核心模块与菜单优化..." -ForegroundColor Cyan
    node "$applyScript" "$tempWorkDir"
    if ($LASTEXITCODE -ne 0) {
        throw "汉化模块注入过程返回错误代码 $LASTEXITCODE"
    }

    # 7. 重新打包
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
        Write-Host "[安全机制] 正在从备份恢复原始文件..." -ForegroundColor Yellow
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
Write-Host "• 包含左侧侧边栏、对话控制、设置面板、辅助窗格及系统菜单汉化"
Write-Host "• 代码块、终端输出与路径已受智能保护，保持原汁原味"
Write-Host "• 若需还原官方英文版，随时运行 restore_original.ps1 即可"
Write-Host ""

$exePath = Join-Path $InstallPath "Antigravity.exe"
if (Test-Path $exePath) {
    $launch = Read-Host "是否现在启动 Antigravity 查看汉化效果？(Y/N)"
    if ($launch -match '^[yY]') {
        Write-Host "正在启动 Antigravity..." -ForegroundColor Cyan
        Start-Process -FilePath $exePath
    }
}
