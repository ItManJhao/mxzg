# 停掉 scripts\start-ws-bridge.ps1 。不结束 center / gameserver。
& "$PSScriptRoot\start-ws-bridge.ps1" -Stop
exit $LASTEXITCODE
