@echo off
setlocal
chcp 65001 >nul
title mxzg-remake-backend
echo ============================================================
echo   mxzg remake backend - local development
echo   Address: http://127.0.0.1:18080
echo   Existing compatible backend: reuse it without starting twice.
echo   New backend: keep this window open. Press Ctrl+C to stop.
echo ============================================================
echo.
rem ExecutionPolicy applies only to this child process, not system settings.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\backend\dev.ps1" -Action run
set "BACKEND_EXIT=%ERRORLEVEL%"
if "%BACKEND_EXIT%"=="0" goto :KeepWindow
echo.
echo Backend did not start or stopped with an error. Read the output above.
:KeepWindow
echo.
pause
endlocal & exit /b %BACKEND_EXIT%
