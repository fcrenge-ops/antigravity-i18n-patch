@echo off
chcp 65001 >nul
setlocal

:: 检查系统是否安装了 Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ====================================================================
    echo   [错误] 未检测到系统 Node.js 运行环境！
    echo --------------------------------------------------------------------
    echo   本还原程序采用纯 Node.js 驱动，需要基础的 Node.js 运行环境。
    echo   请前往官方网站下载并安装 Node.js (推荐 LTS 长期支持版):
    echo   👉 https://nodejs.org/
    echo ====================================================================
    echo.
    pause
    exit /b 1
)

:: 启动还原主程序
node "%~dp0..\scripts\restore.js" %*
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [错误] 还原过程中遇到问题，请检查上方日志。
    pause
)
