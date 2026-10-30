@echo off
rem ============================================================
rem   mxzg 一键启动（双击本文件）
rem   顺序: 前置检查 -> center -> gameserver
rem   不启动 MySQL / Redis（分析没写启动命令）
rem   不启动 cross / large-cross
rem   不启动旧 H5（dev-platform.ps1 / serve.ps1 / 浏览器）
rem   旧 start-all.bat 会 taskkill 已占用端口。
rem   本脚本默认不结束已有进程：端口已在听就跳过，与 start-local-server.ps1 相同。
rem   窗口没了但仍占端口时，可选做法见文档 Q7，本脚本不执行。
rem   分析没写进程起来要等多久。游戏库表启动时会自动建（分析记 mxzg_1_data 244 张）。
rem   ps1 最多轮询约 180 秒。旧 start-all 单端口等 120 秒。这里两个端口共用 180 秒。
rem   成功标准: TCP 11122、TCP 9902、WS 13101 都在听。
rem   9801 的 actuator 若返回 404 且端口在听，只警告。9804 的 curl 失败只警告。
rem   没启 cross 时，11422 连不上和游戏服加载跨服失败是预期，不算失败。
rem ============================================================
setlocal
chcp 65001 >nul
title mxzg-local-server

set "JAVA_HOME=C:\dev\jdk1.8"
set "PATH=%JAVA_HOME%\bin;%PATH%"

echo ============================================================
echo   mxzg 一键启动
echo   %date% %time%
echo   只开 center 和 gameserver
echo ============================================================
echo.

echo [前置检查]

if exist "%JAVA_HOME%\bin\java.exe" goto :HaveJava
echo [失败] 没有找到 %JAVA_HOME%\bin\java.exe 。分析要求 JDK 1.8，安装路径是 C:\dev\jdk1.8 。脚本不会改用别的目录。
goto :Fatal
:HaveJava

where java >nul 2>&1
if not errorlevel 1 goto :JavaOnPath
echo [失败] 找不到 java, 请确认 JAVA_HOME=%JAVA_HOME% 指向正确的 JDK 1.8
goto :Fatal
:JavaOnPath

echo   java -version:
java -version 2>&1
java -version 2>&1 | findstr /C:"1.8" >nul
if not errorlevel 1 goto :JavaVerOk
echo [失败] %JAVA_HOME%\bin\java.exe 的版本输出里没有 1.8。分析要求 JDK 1.8，不能换更高版本。
goto :Fatal
:JavaVerOk
echo   java OK: %JAVA_HOME%

rem 优先分析里的工作目录，否则用本仓库 junction。ROOT 是其下的 mxzg-server。
set "SERVER_ROOT="
if exist "F:\源码\mj\program\server\" set "SERVER_ROOT=F:\源码\mj\program\server"
if not defined SERVER_ROOT if exist "F:\project\mxzg\server\" set "SERVER_ROOT=F:\project\mxzg\server"
if defined SERVER_ROOT goto :HaveRoot
echo [失败] 找不到服目录。分析的工作目录是 F:\源码\mj\program\server ，本仓库 junction 是 F:\project\mxzg\server 。两边都不存在。
goto :Fatal
:HaveRoot
set "ROOT=%SERVER_ROOT%\mxzg-server"
echo   工作目录: %SERVER_ROOT%
echo   ROOT: %ROOT%

call :PortListening 3306
if not errorlevel 1 goto :MySqlUp
echo [失败] MySQL 没有在端口 3306 监听（分析里的地址是 127.0.0.1:3306）。分析写的是 Windows 服务 MySQL80，开机自启，没有给出启动命令。这个脚本不会去启动 MySQL。请先确认 MySQL80 已经在跑，再重新双击。
goto :Fatal
:MySqlUp
echo   MySQL OK（端口 3306）

call :PortListening 11001
if not errorlevel 1 goto :RedisUp
echo [失败] Redis 没有在端口 11001 监听（分析里的地址是 127.0.0.1:11001）。分析写的是 Windows 服务 RedisDev，开机自启，没有给出启动命令。这个脚本不会去启动 Redis。请先确认 RedisDev 已经在跑，再重新双击。
goto :Fatal
:RedisUp
echo   Redis OK（端口 11001）
echo   前置检查通过
echo.

set "UP_9801=0"
set "UP_11122=0"
call :PortListening 9801
if not errorlevel 1 set "UP_9801=1"
call :PortListening 11122
if not errorlevel 1 set "UP_11122=1"

if "%UP_9801%"=="1" if "%UP_11122%"=="0" (
  echo [失败] HTTP 9801 已经在听，但 TCP 11122 没有。分析里的 center 是 HTTP 9801 加 TCP 11122。脚本不再开一个 center。
  goto :Fatal
)
if "%UP_11122%"=="1" if "%UP_9801%"=="0" (
  echo [失败] 11122 在听，但 HTTP 9801 还没在听。不启动 gameserver。
  goto :Fatal
)
if "%UP_11122%"=="1" (
  echo   TCP 11122 和 HTTP 9801 已经在听，不再启动第二个 center。若这不是要留的进程，先在原窗口输入 stop。
  goto :CenterReady
)

echo.
echo [1/2] 启动 mxzg-center ...
call :CheckCenterFiles
if errorlevel 1 goto :Fatal
echo   java -Xms512m -Xmx2048m -cp ^"target/classes;target/lib/*^" com.ayjs.mxzg.center.CenterBootstrap
start "mxzg-center" cmd /k "cd /d %ROOT%\mxzg-center && java -Xms512m -Xmx2048m -cp ""target/classes;target/lib/*"" com.ayjs.mxzg.center.CenterBootstrap"
call :WaitTwoPorts 11122 9801 180 "中心服"
if errorlevel 1 goto :CenterWaitFail
goto :CenterReady

:CenterWaitFail
echo 中心服还没同时听 TCP 11122 和 HTTP 9801，不启动 gameserver。窗口里成功时会打出：Center Server started...
echo 中心服窗口可以留着。等 11122 和 9801 都在听之后再执行一次本脚本，它会跳过已在听的 center，接着开 gameserver。
goto :Fatal

:CenterReady
echo   cross 默认不启动。2026-10-19 它因讨伐团（CRUSADE_GROUP_WORKER）周期数据失败。large-cross 不启动。
echo   不启动旧 H5 的 dev-platform.ps1、serve.ps1，也不开浏览器。Creator 客户端默认连真服。

set "UP_9902=0"
set "UP_13101=0"
call :PortListening 9902
if not errorlevel 1 set "UP_9902=1"
call :PortListening 13101
if not errorlevel 1 set "UP_13101=1"

if "%UP_9902%"=="1" if "%UP_13101%"=="1" (
  echo   TCP 9902 和 WS 13101 已经在听，不再启动第二个 gameserver。
  goto :GameReady
)
if "%UP_9902%"=="1" goto :GamePartial
if "%UP_13101%"=="1" goto :GamePartial
goto :StartGame

:GamePartial
call :ShowNetstat
echo [失败] 9902 和 13101 只听到其中一个。请先在 gameserver 窗口输入 stop，或按文档 Q7 处理占用，再重新执行。脚本不会再开一个游戏服。
goto :Fatal

:StartGame
echo.
echo [2/2] 启动 mxzg-gameserver ...
call :CheckGameFiles
if errorlevel 1 goto :Fatal
echo   java -Xms512m -Xmx2048m -cp ^"target/classes;target/lib/*^" com.ayjs.mxzg.gameserver.Bootstrap
start "mxzg-gameserver" cmd /k "cd /d %ROOT%\mxzg-gameserver && java -Xms512m -Xmx2048m -cp ""target/classes;target/lib/*"" com.ayjs.mxzg.gameserver.Bootstrap"
call :WaitTwoPorts 9902 13101 180 "游戏服"
if errorlevel 1 goto :Fatal
goto :GameReady

:GameReady
echo.
echo ============================================================
echo   端口等待结束，开始第 7 节检查
echo ============================================================
call :HealthCheck
if errorlevel 1 goto :Fatal
call :StopHint
echo.
pause
exit /b 0

rem ============================================================
rem 中心服 / 游戏服要有的 target\classes 与 target\lib
rem ============================================================
:CheckCenterFiles
call :RequireFile "%ROOT%\mxzg-center\target\classes\application.properties" "中心服"
if errorlevel 1 exit /b 1
call :RequireFile "%ROOT%\mxzg-center\target\classes\database.properties" "中心服"
if errorlevel 1 exit /b 1
call :RequireFile "%ROOT%\mxzg-center\target\classes\com\ayjs\mxzg\center\CenterBootstrap.class" "中心服"
if errorlevel 1 exit /b 1
call :RequireLib "%ROOT%\mxzg-center\target\lib"
if errorlevel 1 exit /b 1
exit /b 0

:CheckGameFiles
call :RequireFile "%ROOT%\mxzg-gameserver\target\classes\application.properties" "游戏服"
if errorlevel 1 exit /b 1
call :RequireFile "%ROOT%\mxzg-gameserver\target\classes\database-game.properties" "游戏服"
if errorlevel 1 exit /b 1
call :RequireFile "%ROOT%\mxzg-gameserver\target\classes\database-log.properties" "游戏服"
if errorlevel 1 exit /b 1
call :RequireFile "%ROOT%\mxzg-gameserver\target\classes\com\ayjs\mxzg\gameserver\Bootstrap.class" "游戏服"
if errorlevel 1 exit /b 1
call :RequireLib "%ROOT%\mxzg-gameserver\target\lib"
if errorlevel 1 exit /b 1
exit /b 0

:RequireFile
if exist "%~1" exit /b 0
echo [失败] %~2 还不能启动，找不到 %~1 。先按 docs\server-local-run.md 第 3 节构建、第 4 节把 .temp 复制成 properties，并按 Q13 同步到 target\classes。脚本不会代做构建，也不会改配置。
exit /b 1

:RequireLib
if exist "%~1\" exit /b 0
echo [失败] %~1 不存在, 请先 Maven 构建，并在该模块执行 mvn -o dependency:copy-dependencies -DoutputDirectory=target/lib 。本脚本不代做这一步，也不改配置。
exit /b 1

rem ============================================================
rem 端口已在听则 errorlevel 0。中文 netstat 把 LISTENING 显示成「侦听」。
rem 外部地址 0.0.0.0:0 或 [::]:0 是同一条 netstat -ano 监听行，不依赖代码页能否对上「侦听」。
rem ============================================================
:PortListening
netstat -ano 2>nul | findstr ":%~1 " | findstr /C:"LISTENING" /C:"侦听" /C:"0.0.0.0:0" /C:"[::]:0" >nul
if errorlevel 1 exit /b 1
exit /b 0

rem ============================================================
rem 用法: call :WaitTwoPorts 端口1 端口2 超时秒 名称
rem ============================================================
:WaitTwoPorts
setlocal EnableDelayedExpansion
set "P1=%~1"
set "P2=%~2"
set /a TOTAL=%~3
set "LABEL=%~4"
set /a ELAPSED=0
echo !LABEL! ：等待端口 !P1!、!P2!，最多 !TOTAL! 秒。
:WaitTwoLoop
call :PortListening !P1!
set "E1=!ERRORLEVEL!"
call :PortListening !P2!
set "E2=!ERRORLEVEL!"
if "!E1!"=="0" if "!E2!"=="0" goto :WaitTwoOk
set /a ELAPSED+=5
if !ELAPSED! GEQ !TOTAL! goto :WaitTwoLast
timeout /t 5 /nobreak >nul
goto :WaitTwoLoop
:WaitTwoLast
call :PortListening !P1!
set "E1=!ERRORLEVEL!"
call :PortListening !P2!
set "E2=!ERRORLEVEL!"
if "!E1!"=="0" if "!E2!"=="0" goto :WaitTwoOk
set "MISS="
if not "!E1!"=="0" set "MISS=!P1!"
if not "!E2!"=="0" (
  if "!MISS!"=="" (
    set "MISS=!P2!"
  ) else (
    set "MISS=!MISS!、!P2!"
  )
)
echo [失败] !LABEL! 在 !TOTAL! 秒内还没听全。缺：!MISS!。请看对应窗口里的日志。
endlocal
exit /b 1
:WaitTwoOk
echo   端口 !P1! 和 !P2! 就绪，用时 !ELAPSED! 秒。
endlocal
exit /b 0

:ShowNetstat
echo netstat -ano ^| findstr "11122 9902 13101"
netstat -ano | findstr "11122 9902 13101"
echo.
exit /b 0

:HealthCheck
set "BAD=0"
where curl.exe >nul 2>&1
if errorlevel 1 goto :NoCurl
goto :Curl9801
:NoCurl
echo [警告] 找不到 curl.exe。HTTP 检查跳过。成功只看端口 11122、9902、13101。
goto :CheckCriticalPorts
:Curl9801
call :PortListening 9801
if errorlevel 1 goto :Warn9801Down
echo curl.exe -fsS --max-time 10 http://127.0.0.1:9801/actuator/health
curl.exe -fsS --max-time 10 http://127.0.0.1:9801/actuator/health
set "CODE=%ERRORLEVEL%"
echo.
if "%CODE%"=="0" goto :Curl9804
if "%CODE%"=="22" goto :Warn9801NoActuator
echo [警告] curl.exe 退出码 %CODE% ：http://127.0.0.1:9801/actuator/health 没有成功响应。端口已在听，不算启动失败。
goto :Curl9804
:Warn9801NoActuator
echo [警告] 9801 端口已在听，curl 退出码 22，多半是 HTTP 404。actuator 可能不存在。这不算启动失败。
goto :Curl9804
:Warn9801Down
echo [警告] HTTP 9801 没有在听，跳过这条健康检查。成功判定不看 9801。
:Curl9804
echo curl.exe -fsS --max-time 10 http://127.0.0.1:9804/actuator/health
curl.exe -fsS --max-time 10 http://127.0.0.1:9804/actuator/health
set "CODE=%ERRORLEVEL%"
echo.
if "%CODE%"=="0" goto :CheckCriticalPorts
echo [警告] curl.exe 退出码 %CODE% ：http://127.0.0.1:9804/actuator/health 没有成功响应。三个关键端口若已在听，脚本仍算成功。
:CheckCriticalPorts
call :ShowNetstat
call :PortListening 11122
if not errorlevel 1 goto :Still11122
echo [失败] 检查时 TCP 11122 不在听。
set "BAD=1"
:Still11122
call :PortListening 9902
if not errorlevel 1 goto :Still9902
echo [失败] 检查时 TCP 9902 不在听。
set "BAD=1"
:Still9902
call :PortListening 13101
if not errorlevel 1 goto :Still13101
echo [失败] 检查时 WS 13101 不在听。
set "BAD=1"
:Still13101
if "%BAD%"=="0" goto :HealthOk
echo 关键端口没听全。成功要同时听到 TCP 11122、TCP 9902、WS 13101。
exit /b 1
:HealthOk
echo [启动成功] TCP 11122、TCP 9902、WS 13101 都在听。
echo 没启动 cross 时，游戏服连 127.0.0.1:11422 失败、中心服跨服加载失败是预期，不算启动失败。
echo 客户端默认连真服，预览不必加 transport=ws。桥没开时双击 scripts\start-ws-bridge.bat，或下次用 scripts\start-local-all.bat。Mock 仅 ?dev=mock。不要直连 13101。
exit /b 0

:StopHint
echo.
echo   停止: 在各窗口输入 stop 然后回车。
echo   顺序: 先 mxzg-gameserver，再 mxzg-center。
echo   本脚本不启动 cross，也不启动 large-cross。
echo   若另外开了 cross，先停 gameserver，再停 cross，最后停 center。
echo   同目录的停止说明脚本只打印说明，不结束进程。
exit /b 0

rem ============================================================
rem 致命错误。pause 留给双击的人看上面的中文。
rem ============================================================
:Fatal
call :StopHint
echo.
echo [启动失败] 上一步出错, 请看上面日志排查
pause
exit /b 1
