@echo off
setlocal
rem Build the current hao checkout and restart its isolated dev-hao game service.
chcp 65001 >nul
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Manage-DevHao.ps1" -Action Update
set "DEV_HAO_EXIT=%ERRORLEVEL%"
echo.
pause
endlocal & exit /b %DEV_HAO_EXIT%
