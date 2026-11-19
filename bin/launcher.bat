@echo off
chcp 65001 >nul
setlocal

:: Antigravity i18n 启动器自动补丁管理入口
:: 用法: launcher.bat [enable|disable|status|repair|ensure]
:: 直接双击 (无参数) 时进入交互菜单

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 goto :no_node

if not "%~1"=="" (
    node "%~dp0..\scripts\launcher.js" %*
    exit /b %ERRORLEVEL%
)

node "%~dp0..\scripts\launcher.js" status
echo.
echo  [1] 启用启动器自动补丁 (启动前检测，更新后启动即自动重打补丁)
echo  [2] 停用并还原启动器
echo  [3] 立即检测并按需修复补丁
echo  [0] 退出
echo.
set /p choice=请输入选项编号: 
if "%choice%"=="1" node "%~dp0..\scripts\launcher.js" enable
if "%choice%"=="2" node "%~dp0..\scripts\launcher.js" disable
if "%choice%"=="3" node "%~dp0..\scripts\launcher.js" repair
echo.
pause
exit /b 0

:no_node
echo [错误] 未检测到 Node.js 运行环境，请先安装: https://nodejs.org/
pause
exit /b 1
