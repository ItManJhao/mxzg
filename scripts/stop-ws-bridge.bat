@echo off
rem 停掉 WebSocket 桥（13111）。不在游戏服窗口输入 stop，也不结束 center。
setlocal
chcp 65001 >nul

echo 停止 WebSocket 桥。游戏服窗口保持开着。
echo.

where powershell >nul 2>&1
if not errorlevel 1 goto :HavePs
echo [失败] 找不到 powershell。
goto :End
:HavePs

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-ws-bridge.ps1"

:End
echo.
pause
endlocal
exit /b 0
