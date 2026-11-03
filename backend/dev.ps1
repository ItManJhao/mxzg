<# 本机后端启动和检查入口；复用进程前核实新长连接可握手，避免误复用旧 HTTP 后端。 #>
param([ValidateSet('run', 'test', 'package')][string]$Action = 'run')
$ErrorActionPreference = 'Stop'
$previousJavaHome = $env:JAVA_HOME
$previousPath = $env:PATH
$previousMavenHome = $env:MAVEN_USER_HOME
Push-Location -LiteralPath $PSScriptRoot
try {
    if ($Action -eq 'run') {
        $backendPort = if ($env:MXZG_PORT) { [int]$env:MXZG_PORT } else { 18080 }
        $backendSocket = New-Object System.Net.Sockets.TcpClient
        $backendRunning = $false
        try { $backendSocket.Connect('127.0.0.1', $backendPort); $backendRunning = $true }
        catch { }
        finally { $backendSocket.Dispose() }
        if ($backendRunning) {
            $probe = [System.Net.WebSockets.ClientWebSocket]::new()
            $probe.Options.AddSubProtocol("mxzg.protobuf.v2")
            $timeout = [System.Threading.CancellationTokenSource]::new(3000)
            try {
                $probe.ConnectAsync([Uri]"ws://127.0.0.1:$backendPort/api/v1/game/socket", $timeout.Token).GetAwaiter().GetResult()
                if ($probe.SubProtocol -ne "mxzg.protobuf.v2") { throw "协议版本不匹配" }
                Write-Host "[READY] WebSocket backend already running on port $backendPort (mxzg.protobuf.v2)."
                return
            } catch { throw "端口 $backendPort 的服务尚未更新为统一初始化协议，请关闭旧后端后重新启动。" }
            finally { $probe.Abort(); $probe.Dispose(); $timeout.Dispose() }
            throw "Port $backendPort is already in use. Reuse the running server, or stop it before restarting. This script does not stop other processes automatically."
        }
    }
    $localJdk = Get-ChildItem -LiteralPath (Join-Path $PSScriptRoot '.tools') -Directory -Filter 'jdk-*' -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($localJdk) { $env:JAVA_HOME = $localJdk.FullName }
    if ($env:JAVA_HOME) { $env:PATH = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:PATH }
    if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'Install Java 21 or set JAVA_HOME before running the remake backend.' }
    $env:MAVEN_USER_HOME = Join-Path $PSScriptRoot '.tools/maven-user'
    [string[]]$mavenArguments = @(switch ($Action) {
        'test' { @('test') }
        'package' { @('package') }
        'run' { @('spring-boot:run', '-Dspring-boot.run.profiles=local') }
    })
    & (Join-Path $PSScriptRoot 'mvnw.cmd') @mavenArguments
    if ($LASTEXITCODE -ne 0) { throw "Backend $Action failed (exit $LASTEXITCODE)." }
} finally {
    Pop-Location
    $env:JAVA_HOME = $previousJavaHome
    $env:PATH = $previousPath
    $env:MAVEN_USER_HOME = $previousMavenHome
}
