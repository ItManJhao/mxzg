@echo off
setlocal
rem Launch the isolated phone H5 runtime with the checked PowerShell entry point.
chcp 65001 >nul
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-PhoneH5.ps1" %*
set "PHONE_EXIT=%ERRORLEVEL%"
echo.
pause
endlocal & exit /b %PHONE_EXIT%
