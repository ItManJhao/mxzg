param([ValidateSet('status', 'stop', 'restart')][string]$Action = 'status')
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'BackendProcess.ps1')
$backendPort = if ($env:MXZG_PORT) { [int]$env:MXZG_PORT } else { 18080 }
if ($backendPort -lt 1 -or $backendPort -gt 65535) { throw 'MXZG_PORT must be between 1 and 65535.' }
if ($Action -eq 'status') {
    $ownerId = Get-BackendListener $backendPort
    if ($null -eq $ownerId) { Write-Host "[STOPPED] No backend listens on port $backendPort."; return }
    $backendProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerId" -ErrorAction Stop
    Assert-WorkspaceBackend $backendProcess $PSScriptRoot
    try {
        $servers = Invoke-RestMethod -Uri "http://127.0.0.1:$backendPort/api/v1/servers" -TimeoutSec 3
        if (-not $servers) { throw 'Empty server catalog.' }
        Write-Host "[READY] Workspace backend PID $ownerId at http://127.0.0.1:$backendPort"
    } catch { Write-Host "[RUNNING] Workspace backend PID $ownerId; API is not ready yet." }
    return
}
Stop-WorkspaceBackend $backendPort $PSScriptRoot
if ($Action -eq 'restart') {
    Write-Host '[RESTART] Compiling and starting the current workspace backend. Keep this window open.'
    & (Join-Path $PSScriptRoot 'dev.ps1') -Action run
}
