@echo off
chcp 65001 >nul
node "%~dp0build-console\server.cjs" %*
if errorlevel 1 pause
