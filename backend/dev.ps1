<# 本机后端启动和检查入口。run 复用已验证的回环开发服，personal 从本工作树启动独立的内网 WSS 与 H2。 #>
# 启动时可载入已确认的.local/idle-activity.yml；不生成开服日期或活动状态。
# 已有显式外部配置优先保留，命令结束后恢复当前终端环境。
param(
    [ValidateSet('run', 'personal', 'test', 'package')][string]$Action = 'run',
    [string]$Id,
    [string]$Name,
    [string]$Address,
    [string]$SharedOrigin,
    [ValidateRange(1, 65535)][int]$Port = 18082,
    [Security.SecureString]$KeyStorePassword
)
$ErrorActionPreference = 'Stop'
$previousJavaHome = $env:JAVA_HOME
$previousPath = $env:PATH
$previousMavenHome = $env:MAVEN_USER_HOME
$previousAdditionalLocation = $env:SPRING_CONFIG_ADDITIONAL_LOCATION
$previousPersonalEnvironment = @{}

# 根据已登记的个人服身份构造本次 Maven 子进程的配置。证书和 H2 固定在该 ID 的忽略目录，GM 沿用 local 配置。
function Get-PersonalServerEnvironment {
    if ($Id -cnotmatch '^dev-[a-z0-9][a-z0-9_-]{0,26}$' -or [string]::IsNullOrWhiteSpace($Name) -or
        $Name.Length -gt 64 -or $Name -match '\p{Cc}') {
        throw '请指定登记的 -Id（dev- 开头，最长 31 字符）和 -Name（最长 64 字符）。'
    }
    $ip = $null
    if (![Net.IPAddress]::TryParse($Address, [ref]$ip) -or
        $ip.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork -or $Address -ne $ip.ToString()) {
        throw '-Address 应为个人开发机的内网 IPv4 地址。'
    }
    $bytes = $ip.GetAddressBytes()
    if (!($bytes[0] -eq 10 -or ($bytes[0] -eq 172 -and $bytes[1] -ge 16 -and $bytes[1] -le 31) -or
          ($bytes[0] -eq 192 -and $bytes[1] -eq 168))) {
        throw '-Address 必须属于 10.0.0.0/8、172.16.0.0/12 或 192.168.0.0/16 内网。'
    }
    $origin = $null
    if (![Uri]::TryCreate($SharedOrigin, [UriKind]::Absolute, [ref]$origin) -or $origin.Scheme -ne 'https' -or
        $origin.UserInfo -or $origin.Query -or $origin.Fragment -or $origin.AbsolutePath -ne '/' -or $origin.Host.Contains('*')) {
        throw '-SharedOrigin 应为共享 H5 的 HTTPS 来源，例如 https://game.lan:18082。'
    }
    $relativeHome = ".local/lan-personal/$Id"
    $store = Join-Path $PSScriptRoot "$relativeHome/server.p12"
    if (!(Test-Path -LiteralPath $store -PathType Leaf)) {
        throw "缺少个人服证书 $store。参照 docs/intranet-build-handoff.md 申请并导入证书。"
    }
    $password = $KeyStorePassword
    if (!$password) {
        $password = Read-Host '个人服 server.p12 口令' -AsSecureString
    }
    if ($password.Length -eq 0) { throw '证书口令不能为空。' }
    $settings = @{
        server = @{
            address = $Address
            port = $Port
            ssl = @{
                enabled = $true
                'key-store' = ([Uri]$store).AbsoluteUri
                'key-store-type' = 'PKCS12'
                'key-store-password' = [Net.NetworkCredential]::new('', $password).Password
            }
        }
        spring = @{
            datasource = @{
                url = "jdbc:h2:file:./$relativeHome/game;MODE=MySQL;DATABASE_TO_LOWER=TRUE;WRITE_DELAY=0"
                username = 'sa'
                password = ''
            }
        }
    }
    return @{
        SPRING_APPLICATION_JSON = $settings | ConvertTo-Json -Depth 8 -Compress
        SPRING_CONFIG_ADDITIONAL_LOCATION = "optional:file:./$relativeHome/idle-activity.yml"
        MXZG_LAN_PERSONAL_ID = $Id
        MXZG_LAN_PERSONAL_NAME = $Name.Trim()
        MXZG_LAN_SHARED_ORIGIN = $origin.GetLeftPart([UriPartial]::Authority)
        MXZG_LAN_DIRECTORY_FILE = $null
    }
}

Push-Location -LiteralPath $PSScriptRoot
try {
    if ($Action -eq 'personal') {
        $personalEnvironment = Get-PersonalServerEnvironment
        foreach ($key in $personalEnvironment.Keys) {
            $previousPersonalEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
            [Environment]::SetEnvironmentVariable($key, $personalEnvironment[$key], 'Process')
        }
        Write-Host "[个人服] $Id ($Name) TLS ${Address}:$Port，Ctrl+C 停止。"
    }
    if ($Action -eq 'run') {
        # 只自动载入已存在的可信配置；缺文件保持未配置，不创建默认活动或猜开服时间。
        $localActivityConfig = Join-Path $PSScriptRoot '.local/idle-activity.yml'
        if ([string]::IsNullOrWhiteSpace($previousAdditionalLocation) -and
                (Test-Path -LiteralPath $localActivityConfig -PathType Leaf)) {
            $env:SPRING_CONFIG_ADDITIONAL_LOCATION = 'file:./.local/idle-activity.yml'
            Write-Host '[CONFIG] Loading confirmed local idle activity configuration.'
        }
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
        'personal' { @('spring-boot:run', '-Dspring-boot.run.profiles=local') }
    })
    & (Join-Path $PSScriptRoot 'mvnw.cmd') @mavenArguments
    if ($LASTEXITCODE -ne 0) { throw "Backend $Action failed (exit $LASTEXITCODE)." }
} finally {
    Pop-Location
    $env:JAVA_HOME = $previousJavaHome
    $env:PATH = $previousPath
    $env:MAVEN_USER_HOME = $previousMavenHome
    $env:SPRING_CONFIG_ADDITIONAL_LOCATION = $previousAdditionalLocation
    foreach ($key in $previousPersonalEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($key, $previousPersonalEnvironment[$key], 'Process')
    }
}
