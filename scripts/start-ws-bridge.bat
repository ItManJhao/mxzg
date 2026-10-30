@echo off
rem 本机 WebSocket 桥：ws://127.0.0.1:13111/game 的二进制载荷原样转到 TCP 127.0.0.1:9902。
rem 先让 start-local-server.bat 把 9902 听上。不要改去连游戏服自带的 13101。
rem 关闭本窗口即停止。另一扇窗口也可以双击 stop-ws-bridge.bat。
setlocal
chcp 65001 >nul
title mxzg-ws-bridge

echo ============================================================
echo   mxzg WebSocket 桥
echo   ws://127.0.0.1:13111/game  转到  TCP 127.0.0.1:9902
echo   %date% %time%
echo ============================================================
echo.
echo 请先确认 start-local-server.bat 已经让 TCP 9902 在听。
echo 13101 仍会在听。预览不要连它，它不回这套登录帧。
echo 关闭本窗口即停止桥。
echo.

where powershell >nul 2>&1
if not errorlevel 1 goto :HavePs
echo [失败] 找不到 powershell。Windows 自带 Windows PowerShell 即可，不必另装。
goto :End
:HavePs

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-ws-bridge.ps1"
echo.
echo [桥已退出]

:End
echo.
pause
endlocal
exit /b 0
