# 日常一次打开：游戏服（start-local-server.bat）+ WebSocket 桥（start-ws-bridge.bat）。
# TCP 9902 已经在听就不再开第二个游戏服。WS 13111 已经在听就不再开第二个桥。
# 游戏服窗口和桥窗口分开留着。本窗口只负责拉起并等到端口。
# 只拉了客户端时不必再跑本脚本，刷新预览即可。

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

function Test-PortListening {
    param([Parameter(Mandatory = $true)][int]$Port)
    $pattern = ':' + $Port + ' '
    $lines = @(& netstat.exe -ano | & findstr.exe ('/C:' + $pattern))
    foreach ($line in $lines) {
        if ("$line" -match 'LISTENING|侦听') { return $true }
    }
    return $false
}

function Wait-Port {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [Parameter(Mandatory = $true)][int]$TimeoutSeconds,
        [Parameter(Mandatory = $true)][string]$Label
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    Write-Host ($Label + ' ：等待端口 ' + $Port + ' ，最多 ' + $TimeoutSeconds + ' 秒。')
    do {
        if (Test-PortListening -Port $Port) {
            Write-Host ($Label + ' 已在听：' + $Port)
            return $true
        }
        Start-Sleep -Seconds 3
    } while ((Get-Date) -lt $deadline)
    Write-Host ($Label + ' 在 ' + $TimeoutSeconds + ' 秒内还没听到 ' + $Port + ' 。请看对应窗口里的日志。')
    return $false
}

function Start-BatWindow {
    param([Parameter(Mandatory = $true)][string]$BatPath)
    # 直接打开 bat。窗口标题由 bat 自己的 title 决定，避免再套一层 cmd 引号。
    Start-Process -FilePath $BatPath -WorkingDirectory $PSScriptRoot | Out-Null
}

Write-Host '============================================================'
Write-Host '  mxzg 游戏服 + WebSocket 桥'
Write-Host ('  ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Write-Host '  客户端默认连真服。桥 ws://127.0.0.1:13111/game 。Mock 仅 ?dev=mock'
Write-Host '============================================================'
Write-Host ''

$serverBat = Join-Path $PSScriptRoot 'start-local-server.bat'
$bridgeBat = Join-Path $PSScriptRoot 'start-ws-bridge.bat'
if (-not (Test-Path -LiteralPath $serverBat)) { Write-Host '[失败] 找不到 start-local-server.bat'; exit 1 }
if (-not (Test-Path -LiteralPath $bridgeBat)) { Write-Host '[失败] 找不到 start-ws-bridge.bat'; exit 1 }

$gameUp = Test-PortListening -Port 9902
if ($gameUp) {
    Write-Host 'TCP 9902 已经在听，不再启动第二个游戏服。'
    if (-not (Test-PortListening -Port 13101)) {
        Write-Host 'WS 13101 这次没在听。桥只转到 9902。若游戏服不完整，请看原来的 gameserver 窗口。'
    }
} else {
    Write-Host 'TCP 9902 还没在听，另开窗口执行 start-local-server.bat 。'
    Start-BatWindow -BatPath $serverBat
    # center 最多等约 180 秒，gameserver 再约 180 秒。这里给到 9902 出现为止。
    $gameUp = Wait-Port -Port 9902 -TimeoutSeconds 400 -Label '游戏服'
}

if (-not $gameUp) {
    Write-Host '[失败] 9902 还没在听，不启动桥。请看标题 mxzg-local-server 的窗口。'
    exit 1
}

$bridgeUp = Test-PortListening -Port 13111
if ($bridgeUp) {
    Write-Host 'WS 13111 已经在听，不再启动第二个桥。'
} else {
    Write-Host 'WS 13111 还没在听，另开窗口执行 start-ws-bridge.bat 。'
    Start-BatWindow -BatPath $bridgeBat
    $bridgeUp = Wait-Port -Port 13111 -TimeoutSeconds 40 -Label 'WebSocket 桥'
}

Write-Host ''
if ($bridgeUp) {
    Write-Host '[就绪] TCP 9902 和 WS 13111 都在听。'
    Write-Host '游戏服窗口和桥窗口请留着。只拉了客户端代码时，刷新预览即可，不必重启这两边。'
    Write-Host '预览：http://127.0.0.1:7456/  （不必加 ?transport=ws）'
    Write-Host 'Mock 仅 ?dev=mock。不要直连 13101。'
    Write-Host '停桥并查看游戏服怎么停：双击 scripts\stop-local-all.bat'
    exit 0
}

Write-Host '[失败] 13111 还没在听。请看标题 mxzg-ws-bridge 的窗口。游戏服不用因此关掉。'
exit 1
