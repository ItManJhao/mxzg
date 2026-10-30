# 打印分析里的停止方式。不结束进程。
# 事实来源：2026-10-19《项目分析与启动指南》——Windows 在该服务的命令行窗口输入 stop 回车。
# 分析没有写出从另一个窗口代为输入 stop 的命令，所以这里不调用 taskkill。

$ErrorActionPreference = 'Continue'

Write-Host '这个脚本不结束进程。'
Write-Host '分析写的停止方式：在该服务的命令行窗口输入 stop 然后回车。'
Write-Host ''
Write-Host '顺序与启动相反：'
Write-Host '  1. 标题 mxzg-gameserver 的窗口'
Write-Host '  2. 若这次加了 -IncludeCross，再到标题 mxzg-cross 的窗口'
Write-Host '  3. 最后是标题 mxzg-center 的窗口'
Write-Host '这份启动脚本不打开 large-cross。'
Write-Host ''
Write-Host '窗口还在时，用上面的 stop。'
Write-Host '窗口已经没了、端口仍被占用时，用文档 Q7：'
Write-Host '  netstat -ano | findstr <port>'
Write-Host '  taskkill /PID <pid> /F'
Write-Host ''
Write-Host '启动脚本：powershell -NoProfile -ExecutionPolicy Bypass -File F:\project\mxzg\scripts\start-local-server.ps1'
exit 0
