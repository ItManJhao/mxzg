@echo off
setlocal
title mxzg-remake-h5-build
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\client\tools\build-remake-h5.ps1"
set "BUILD_EXIT=%ERRORLEVEL%"
echo.
pause
endlocal & exit /b %BUILD_EXIT%
