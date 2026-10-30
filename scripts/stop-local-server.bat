@echo off
rem 打印分析里的停止方式。不结束进程。
rem 事实来源：2026-10-19《项目分析与启动指南》——Windows 在该服务的命令行窗口输入 stop 回车。
rem 分析没有写出从另一个窗口代为输入 stop 的命令，所以这里不调用 taskkill。
rem 文档 Q7 的 taskkill 只在窗口已经没了、端口仍被占用时作为可选说明打印，本脚本不执行。
setlocal
chcp 65001 >nul

echo 这个脚本不结束进程。
echo 分析写的停止方式：在该服务的命令行窗口输入 stop 然后回车。
echo.
echo 顺序与启动相反：
echo   1. 标题 mxzg-gameserver 的窗口
echo   2. 若另外开了 cross，再到标题 mxzg-cross 的窗口
echo   3. 最后是标题 mxzg-center 的窗口
echo start-local-server.bat 不打开 cross，也不打开 large-cross。
echo start-local-server.ps1 只有加了 -IncludeCross 才会开 cross。large-cross 两份脚本都不打开。
echo.
echo 窗口还在时，用上面的 stop。
echo 窗口已经没了、端口仍被占用时，用文档 Q7（可选，本脚本不执行）：
echo   netstat -ano ^| findstr ^<port^>
echo   taskkill /PID ^<pid^> /F
echo.
echo 启动：双击 F:\project\mxzg\scripts\start-local-server.bat
echo 也可以：powershell -NoProfile -ExecutionPolicy Bypass -File F:\project\mxzg\scripts\start-local-server.ps1
echo.
pause
endlocal
exit /b 0
