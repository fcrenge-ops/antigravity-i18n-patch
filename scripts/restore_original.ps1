<#
.SYNOPSIS
    Antigravity UI 官方英文版一键还原脚本
.DESCRIPTION
    将此前备份的官方原版 app.asar.bak 恢复为 app.asar，彻底清除所有汉化修改。
#>

[CmdletBinding()]
param (
    [string]$InstallPath = "",
    [switch]$ForceClose
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "     Antigravity 官方英文原版一键还原工具           " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检测运行中的进程
$procs = Get-Process Antigravity -ErrorAction SilentlyContinue
if ($procs) {
    Write-Host "[提示] 检测到 Antigravity 正在运行中。" -ForegroundColor Yellow
    if ($ForceClose) {
        Write-Host "正在退出 Antigravity 进程..." -ForegroundColor Yellow
        $procs | Stop-Process -Force
        Start-Sleep -Seconds 2
    } else {
        $confirm = Read-Host "还原需要先关闭 Antigravity，是否立即关闭？(Y/N)"
        if ($confirm -match '^[yY]') {
            Write-Host "正在退出 Antigravity 进程..." -ForegroundColor Yellow
            $procs | Stop-Process -Force
            Start-Sleep -Seconds 2
        } else {
            Write-Host "[取消] 用户取消操作，请手动退出 Antigravity 后再次运行。" -ForegroundColor Red
            exit 1
        }
    }
}

# 2. 定位安装目录
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

$resourcesDir = Join-Path $InstallPath "resources"
$appAsar = Join-Path $resourcesDir "app.asar"
$backupAsar = Join-Path $resourcesDir "app.asar.bak"

if (-not (Test-Path $backupAsar)) {
    Write-Host "[错误] 未找到官方备份文件 $backupAsar，无法执行自动恢复。" -ForegroundColor Red
    exit 1
}

Write-Host "[还原] 正在将备份文件 $backupAsar 恢复为 $appAsar ..." -ForegroundColor Cyan
Copy-Item -Path $backupAsar -Destination $appAsar -Force

Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "   ✅ 成功恢复！Antigravity 已还原为官方英文原版！   " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""

$exePath = Join-Path $InstallPath "Antigravity.exe"
if (Test-Path $exePath) {
    $launch = Read-Host "是否现在启动 Antigravity？(Y/N)"
    if ($launch -match '^[yY]') {
        Write-Host "正在启动 Antigravity..." -ForegroundColor Cyan
        Start-Process -FilePath $exePath
    }
}
