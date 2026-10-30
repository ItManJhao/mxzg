#Requires -Version 5.1
<#
.SYNOPSIS
  在 Windows 上按 2026-10-19 分析启动本机 center 和 gameserver。

.DESCRIPTION
  只使用分析里的路径、端口和 classpath java 命令。
  不启动 MySQL / Redis（分析没写启动命令），不使用 java -jar，默认不启动 cross，不启动 large-cross。
  停止方式是在各自窗口输入 stop。-Stop 只打印该说明。
#>
param(
    [switch]$IncludeCross,
    [switch]$Stop
)

$ErrorActionPreference = 'Continue'

if ($Stop) {
    & (Join-Path $PSScriptRoot 'stop-local-server.ps1')
    if ($null -eq $LASTEXITCODE) { exit 0 }
    exit $LASTEXITCODE
}

function Fail([string]$Message) {
    Write-Host $Message
    Write-StopHint
    exit 1
}

function Test-PortListening {
    param([Parameter(Mandatory = $true)][int]$Port)
    $pattern = ":$Port "
    $lines = @(& netstat.exe -ano | & findstr.exe ('/C:' + $pattern))
    foreach ($line in $lines) {
        $text = "$line"
        if ($text -match 'LISTENING|侦听') {
            return $true
        }
    }
    return $false
}

function Wait-ForPorts {
    param(
        [Parameter(Mandatory = $true)][int[]]$Ports,
        [Parameter(Mandatory = $true)][int]$TimeoutSeconds,
        [Parameter(Mandatory = $true)][string]$Label
    )
    # 分析没有写进程起来要等多久。244 张游戏库表是启动时自动建的，这里只设一个轮询上限。
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    Write-Host "$Label ：等待端口 $($Ports -join '、')，最多 $TimeoutSeconds 秒。"
    do {
        $pending = @($Ports | Where-Object { -not (Test-PortListening -Port $_) })
        if ($pending.Count -eq 0) {
            Write-Host "$Label 已在听：$($Ports -join '、')"
            return $true
        }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)
    $pending = @($Ports | Where-Object { -not (Test-PortListening -Port $_) })
    Write-Host "$Label 在 $TimeoutSeconds 秒内还没听全。缺：$($pending -join '、')。请看对应窗口里的日志。"
    return $false
}

function Assert-ReadyFiles {
    param(
        [Parameter(Mandatory = $true)][string]$WorkDir,
        [Parameter(Mandatory = $true)][string[]]$RelativePaths,
        [Parameter(Mandatory = $true)][string]$Name
    )
    foreach ($rel in $RelativePaths) {
        $full = Join-Path $WorkDir $rel
        if (-not (Test-Path -LiteralPath $full)) {
            Fail "$Name 还不能启动，找不到 $full 。先按 docs/server-local-run.md 第 3 节构建、第 4 节把 .temp 复制成 properties，并按 Q13 同步到 target\classes。脚本不会代做构建，也不会改配置。"
        }
    }
}

function Copy-RuntimeLibs {
    param(
        [Parameter(Mandatory = $true)][string]$WorkDir,
        [Parameter(Mandatory = $true)][string]$Name
    )
    Write-Host "$Name ：mvn -o dependency:copy-dependencies -DoutputDirectory=target/lib"
    Push-Location -LiteralPath $WorkDir
    & $script:Mvn -o dependency:copy-dependencies '-DoutputDirectory=target/lib'
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) {
        Fail "$Name 的 dependency:copy-dependencies 退出码是 $code 。分析要求前面已经 mvn 构建过，所以这里用 -o。不要再加 -Dmaven.test.skip。"
    }
    $lib = Join-Path $WorkDir 'target\lib'
    if (-not (Test-Path -LiteralPath $lib)) {
        Fail "$Name 没有生成 $lib 。"
    }
}

function Open-JavaWindow {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [Parameter(Mandatory = $true)][string]$WorkDir,
        [Parameter(Mandatory = $true)][string]$MainClass
    )
    $launcher = Join-Path $env:TEMP ($Title + '.ps1')
    $javaExe = $script:JavaExe
    $content = @"
try { `$Host.UI.RawUI.WindowTitle = '$Title' } catch { }
Set-Location -LiteralPath '$WorkDir'
Write-Host '在本窗口输入 stop 然后回车，停止本进程。'
Write-Host '命令：java -Xms512m -Xmx2048m -cp target/classes;target/lib/* $MainClass'
& '$javaExe' -Xms512m -Xmx2048m -cp 'target/classes;target/lib/*' $MainClass
Write-Host '进程已退出。这个窗口可以关闭。'
"@
    $utf8 = New-Object System.Text.UTF8Encoding $true
    [System.IO.File]::WriteAllText($launcher, $content, $utf8)
    $ps = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    if (-not (Test-Path -LiteralPath $ps)) {
        Fail "没有找到 $ps 。"
    }
    $argLine = "-NoExit -NoProfile -ExecutionPolicy Bypass -File `"$launcher`""
    Start-Process -FilePath $ps -ArgumentList $argLine | Out-Null
    Write-Host "已打开窗口 $Title （$MainClass）"
}

function Invoke-AnalysisCurl {
    param([Parameter(Mandatory = $true)][string]$Url)
    Write-Host "curl.exe -fsS --max-time 10 $Url"
    & curl.exe -fsS --max-time 10 $Url
    $script:LastCurlCode = $LASTEXITCODE
    Write-Host ''
    if ($script:LastCurlCode -ne 0) {
        Write-Host "curl.exe 退出码 $($script:LastCurlCode) ：$Url 没有成功响应。"
        return $false
    }
    return $true
}

function Show-Netstat {
    Write-Host 'netstat -ano | findstr "11122 9902 13101"'
    & netstat.exe -ano | & findstr.exe "11122 9902 13101"
    Write-Host ''
}

function Write-StopHint {
    Write-Host '停止：在 mxzg-gameserver 窗口输入 stop 回车。'
    if ($IncludeCross) {
        Write-Host '然后在 mxzg-cross 窗口输入 stop 回车。'
    }
    Write-Host '最后在 mxzg-center 窗口输入 stop 回车。'
    Write-Host '说明：powershell -NoProfile -ExecutionPolicy Bypass -File F:\project\mxzg\scripts\stop-local-server.ps1'
    Write-Host '也可以：powershell -NoProfile -ExecutionPolicy Bypass -File F:\project\mxzg\scripts\start-local-server.ps1 -Stop'
}

if ($env:OS -ne 'Windows_NT') {
    Fail '这个脚本只在 Windows 上启动本机服。当前系统不是 Windows。'
}

$script:JavaExe = 'C:\dev\jdk1.8\bin\java.exe'
if (-not (Test-Path -LiteralPath $script:JavaExe)) {
    Fail "没有找到 $($script:JavaExe) 。分析要求 JDK 1.8，安装路径是 C:\dev\jdk1.8 。脚本不会改用 PATH 上的 java。"
}
$versionText = & $script:JavaExe -version 2>&1 | Out-String
Write-Host $versionText.Trim()
if ($versionText -notmatch '1\.8') {
    Fail 'C:\dev\jdk1.8\bin\java.exe 的版本输出里没有 1.8。分析要求 JDK 1.8，不能换更高版本。'
}

$mvnCmd = Get-Command mvn -ErrorAction SilentlyContinue
if (-not $mvnCmd) {
    Fail 'PATH 上没有 mvn。分析记录 Maven 装在 C:\dev\maven，并且已经配过 MAVEN_HOME 和 PATH。脚本不会改去别的目录找。'
}
$script:Mvn = $mvnCmd.Source
Write-Host "使用 mvn：$($script:Mvn)"

$preferred = 'F:\源码\mj\program\server'
$junction = 'F:\project\mxzg\server'
if (Test-Path -LiteralPath $preferred) {
    $serverRoot = $preferred
} elseif (Test-Path -LiteralPath $junction) {
    $serverRoot = $junction
} else {
    Fail "找不到服目录。分析的工作目录是 $preferred ，本仓库 junction 是 $junction 。两边都不存在。"
}
Write-Host "工作目录：$serverRoot"

if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
    Fail '找不到 curl.exe。分析步骤 8 的检查是 curl http://127.0.0.1:9801/actuator/health 。PowerShell 里的 curl 是别名，脚本只调用 curl.exe。'
}

if (-not (Test-PortListening -Port 3306)) {
    Fail "MySQL 没有在端口 3306 监听（分析里的地址是 127.0.0.1:3306）。分析写的是 Windows 服务 MySQL80，开机自启，没有给出启动命令。这个脚本不会去启动 MySQL。请先确认 MySQL80 已经在跑，再重新执行。"
}
if (-not (Test-PortListening -Port 11001)) {
    Fail "Redis 没有在端口 11001 监听（分析里的地址是 127.0.0.1:11001）。分析写的是 Windows 服务 RedisDev，开机自启，没有给出启动命令。这个脚本不会去启动 Redis。请先确认 RedisDev 已经在跑，再重新执行。"
}
Write-Host 'MySQL 3306 在听，Redis 11001 在听。'

$centerDir = Join-Path $serverRoot 'mxzg-server\mxzg-center'
$gameDir = Join-Path $serverRoot 'mxzg-server\mxzg-gameserver'
$crossDir = Join-Path $serverRoot 'mxzg-server\mxzg-cross'
$waitSeconds = 180

if ((Test-PortListening -Port 9801) -and -not (Test-PortListening -Port 11122)) {
    Fail 'HTTP 9801 已经在听，但 TCP 11122 没有。分析里的 center 是 HTTP 9801 加 TCP 11122。脚本不再开一个 center。'
}

$centerReady = (Test-PortListening -Port 11122) -and (Test-PortListening -Port 9801)
if (Test-PortListening -Port 11122) {
    Write-Host 'TCP 11122 已经在听，不再启动第二个 center。若这不是要留的进程，先在原窗口输入 stop。'
    if (-not (Test-PortListening -Port 9801)) {
        Write-Host '11122 在听，但 HTTP 9801 还没在听。不启动 gameserver。'
        Show-Netstat
        Write-StopHint
        exit 1
    }
} else {
    Assert-ReadyFiles -WorkDir $centerDir -Name '中心服' -RelativePaths @(
        'target\classes\application.properties',
        'target\classes\database.properties',
        'target\classes\com\ayjs\mxzg\center\CenterBootstrap.class'
    )
    Copy-RuntimeLibs -WorkDir $centerDir -Name '中心服'
    Open-JavaWindow -Title 'mxzg-center' -WorkDir $centerDir -MainClass 'com.ayjs.mxzg.center.CenterBootstrap'
    $centerReady = Wait-ForPorts -Ports @(11122, 9801) -TimeoutSeconds $waitSeconds -Label '中心服'
}

if (-not $centerReady) {
    Write-Host '中心服还没同时听 TCP 11122 和 HTTP 9801，不启动 gameserver。窗口里成功时会打出：Center Server started...'
    Write-Host '中心服窗口可以留着。等 11122 和 9801 都在听之后再执行一次本脚本，它会跳过已在听的 center，接着开 gameserver。'
    Show-Netstat
    Invoke-AnalysisCurl -Url 'http://127.0.0.1:9801/actuator/health' | Out-Null
    Write-StopHint
    exit 1
}

if ($IncludeCross) {
    Write-Host '将启动 mxzg-cross。2026-10-19 分析记录它因讨伐团（CRUSADE_GROUP_WORKER）周期数据失败。单机默认不启。'
    Write-Host '模板里 cross 的 HTTP 也是 9801，分析没有写要改成别的口。若窗口里端口冲突，先不要管 cross。'
    Assert-ReadyFiles -WorkDir $crossDir -Name '跨服' -RelativePaths @(
        'target\classes\application.properties',
        'target\classes\database.properties',
        'target\classes\com\ayjs\mxzg\cross\CrossBootstrap.class'
    )
    Copy-RuntimeLibs -WorkDir $crossDir -Name '跨服'
    Open-JavaWindow -Title 'mxzg-cross' -WorkDir $crossDir -MainClass 'com.ayjs.mxzg.cross.CrossBootstrap'
    Write-Host 'cross 的 TCP 端口分析只写了「配置」，脚本不等待一个固定端口。请看 mxzg-cross 窗口。'
} else {
    Write-Host 'cross 默认不启动。2026-10-19 它因讨伐团（CRUSADE_GROUP_WORKER）周期数据失败。需要时加 -IncludeCross。large-cross 不启动。'
}

$gameReady = (Test-PortListening -Port 9902) -and (Test-PortListening -Port 13101)
if ($gameReady) {
    Write-Host 'TCP 9902 和 WS 13101 已经在听，不再启动第二个 gameserver。'
} elseif ((Test-PortListening -Port 9902) -or (Test-PortListening -Port 13101)) {
    Show-Netstat
    Fail '9902 和 13101 只听到其中一个。请先在 gameserver 窗口输入 stop，或按文档 Q7 处理占用，再重新执行。脚本不会再开一个游戏服。'
} else {
    Assert-ReadyFiles -WorkDir $gameDir -Name '游戏服' -RelativePaths @(
        'target\classes\application.properties',
        'target\classes\database-game.properties',
        'target\classes\database-log.properties',
        'target\classes\com\ayjs\mxzg\gameserver\Bootstrap.class'
    )
    Copy-RuntimeLibs -WorkDir $gameDir -Name '游戏服'
    Open-JavaWindow -Title 'mxzg-gameserver' -WorkDir $gameDir -MainClass 'com.ayjs.mxzg.gameserver.Bootstrap'
    $gameReady = Wait-ForPorts -Ports @(9902, 13101) -TimeoutSeconds $waitSeconds -Label '游戏服'
}

Write-Host ''
if (Test-PortListening -Port 9801) {
    $httpCenter = Invoke-AnalysisCurl -Url 'http://127.0.0.1:9801/actuator/health'
    if (-not $httpCenter) {
        if ($script:LastCurlCode -eq 22) {
            Write-Host '[警告] 9801 端口已在听，curl 退出码 22，多半是 HTTP 404。actuator 可能不存在。这不算启动失败。'
        } else {
            Write-Host '[警告] 9801 端口已在听，但 http://127.0.0.1:9801/actuator/health 没有成功响应。这不算启动失败。'
        }
    }
} else {
    Write-Host '[警告] HTTP 9801 没有在听，跳过这条健康检查。成功判定不看 9801。'
}
$httpGame = Invoke-AnalysisCurl -Url 'http://127.0.0.1:9804/actuator/health'
if (-not $httpGame) {
    Write-Host '[警告] http://127.0.0.1:9804/actuator/health 没有成功响应。三个关键端口若已在听，脚本仍算成功。'
}
Show-Netstat

$ok11122 = Test-PortListening -Port 11122
$ok9902 = Test-PortListening -Port 9902
$ok13101 = Test-PortListening -Port 13101
if ($ok11122 -and $ok9902 -and $ok13101) {
    Write-Host '[启动成功] TCP 11122、TCP 9902、WS 13101 都在听。'
    Write-Host '没启动 cross 时，游戏服连 127.0.0.1:11422 失败、中心服跨服加载失败是预期，不算启动失败。'
    Write-Host '客户端默认连真服，预览不必加 transport=ws。桥没开时双击 scripts\start-ws-bridge.bat，或下次用 scripts\start-local-all.bat。Mock 仅 ?dev=mock。不要直连 13101。'
    Write-StopHint
    exit 0
}

$missing = @()
if (-not $ok11122) { $missing += '11122' }
if (-not $ok9902) { $missing += '9902' }
if (-not $ok13101) { $missing += '13101' }
Write-Host ("关键端口没听全。缺：" + ($missing -join '、') + "。成功要同时听到 TCP 11122、TCP 9902、WS 13101。")
Write-StopHint
exit 1
