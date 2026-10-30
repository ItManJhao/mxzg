@echo off
setlocal
title mxzg-remake-h5
python "%~dp0..\tools\serve_remake_h5.py"
set "PREVIEW_EXIT=%ERRORLEVEL%"
echo.
pause
endlocal & exit /b %PREVIEW_EXIT%
