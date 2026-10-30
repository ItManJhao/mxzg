# 先停 WebSocket 桥（与 stop-ws-bridge.ps1 相同，只动 13111 上的桥进程）。
# 不结束 center / gameserver，也不结束别的进程。游戏服仍在各自窗口输入 stop。

$ErrorActionPreference = 'Continue'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

Write-Host '先停 WebSocket 桥。游戏服窗口保持开着。'
Write-Host ''
& (Join-Path $PSScriptRoot 'start-ws-bridge.ps1') -Stop
Write-Host ''
Write-Host '桥已按 stop-ws-bridge 处理。这里不结束游戏服，避免关掉无关进程。'
Write-Host '游戏服仍按原来的说明，在该窗口输入 stop：'
Write-Host ''
& (Join-Path $PSScriptRoot 'stop-local-server.ps1')
exit 0
