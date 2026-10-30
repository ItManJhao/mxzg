@echo off
rem 日常一次打开：另开窗口跑 start-local-server.bat，9902 起来后再另开窗口跑 start-ws-bridge.bat。
rem TCP 9902 已在听就跳过游戏服。WS 13111 已在听就跳过桥。不结束已有进程。
setlocal
chcp 65001 >nul
title mxzg-local-all

echo ============================================================
echo   mxzg 游戏服 + WebSocket 桥
echo   %date% %time%
echo   客户端默认连真服。桥 ws://127.0.0.1:13111/game 。Mock 仅 ?dev=mock
echo ============================================================
echo.

where powershell >nul 2>&1
if not errorlevel 1 goto :HavePs
echo [失败] 找不到 powershell。Windows 自带 Windows PowerShell 即可。
goto :End
:HavePs

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-local-all.ps1"

:End
echo.
pause
endlocal
exit /b 0
