@echo off
chcp 65001 >nul
node "%~dp0..\scripts\restore.js" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [错误] 还原过程中遇到问题，请检查上方日志。
    pause
)
