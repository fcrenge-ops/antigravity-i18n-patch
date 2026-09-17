@echo off
chcp 65001 >nul
echo 正在准备恢复 Antigravity 官方英文原版...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\restore_original.ps1" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [错误] 还原过程中遇到问题，请检查上方日志。
)
pause
