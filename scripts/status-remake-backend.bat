@echo off
setlocal
title mxzg-remake-backend-status
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\backend\control.ps1" -Action status
set "BACKEND_EXIT=%ERRORLEVEL%"
echo.
pause
endlocal & exit /b %BACKEND_EXIT%
