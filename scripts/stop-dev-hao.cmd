@echo off
setlocal
rem Open the selected dev-hao management action.
chcp 65001 >nul
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Manage-DevHao.ps1" -Action Stop
set "DEV_HAO_EXIT=%ERRORLEVEL%"
echo.
pause
endlocal & exit /b %DEV_HAO_EXIT%
