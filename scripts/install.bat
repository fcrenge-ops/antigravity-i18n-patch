@echo off
chcp 65001 >nul
echo 正在准备安装 Antigravity 简体中文汉化补丁...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_patch.ps1" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [错误] 安装过程中遇到问题，请检查上方日志。
)
pause
