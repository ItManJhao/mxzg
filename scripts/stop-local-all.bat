@echo off
rem 先停 13111 上的 WebSocket 桥。游戏服不在这里结束，只打印原来的 stop 说明。
setlocal
chcp 65001 >nul

echo 停止 WebSocket 桥，并打印游戏服的停止说明。
echo 本脚本不结束 center，也不结束 gameserver。
echo.

where powershell >nul 2>&1
if not errorlevel 1 goto :HavePs
echo [失败] 找不到 powershell。
goto :End
:HavePs

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-local-all.ps1"

:End
echo.
pause
endlocal
exit /b 0
