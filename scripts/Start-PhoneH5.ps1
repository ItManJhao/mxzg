<#
管理手机 H5 联调服务的启动、状态、停止与重启。默认复用本机隔离的 H5、证书和测试库。
由 start-phone-h5.cmd 或内网构建工具调用，只管理指定内网地址上运行独立 JAR 的进程。
#>
param(
    [ValidateSet('Start', 'Status', 'Stop', 'Restart')][string]$Action = 'Start',
    [string]$Address = '192.168.0.33',
    [ValidateRange(1, 65535)][int]$Port = 18082,
    [string]$RuntimeDirectory,
    [string]$StaticRoot,
    [string]$JarPath,
    [string]$JavaPath
)

$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$defaultDirectory = Join-Path $repository 'client/temp/phone-wifi-h5'
$runtime = if ($RuntimeDirectory) { [IO.Path]::GetFullPath($RuntimeDirectory) } else { Join-Path $defaultDirectory 'runtime' }
$static = if ($StaticRoot) { [IO.Path]::GetFullPath($StaticRoot) } else { Join-Path $defaultDirectory 'client/build/remake-h5' }
$jar = if ($JarPath) { [IO.Path]::GetFullPath($JarPath) } else { Join-Path $runtime 'backend/target/mxzg-remake-0.1.0-SNAPSHOT.jar' }
$url = 'https://{0}:{1}/index.html' -f $Address, $Port

if ($Port -eq 18080) {
    throw '18080 是日常开发服，请使用独立的手机联调端口。'
}
$parsedAddress = $null
if (-not [Net.IPAddress]::TryParse($Address, [ref]$parsedAddress) -or
        $parsedAddress.AddressFamily -ne [Net.Sockets.AddressFamily]::InterNetwork -or
        $Address -ne $parsedAddress.ToString() -or $parsedAddress.Equals([Net.IPAddress]::Any)) {
    throw '手机联调服务必须绑定一个具体的 IPv4 地址。'
}

# 确认目标监听的进程仍然存活且以该独立 JAR 启动。未知占用交给操作者处理。
function Find-PhoneH5Process {
    $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    if ($listeners.Count -eq 0) {
        return $null
    }
    $listener = $listeners | Where-Object LocalAddress -eq $Address | Select-Object -First 1
    if ($listener) {
        $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            # 保留操作系统句柄，后续停止的仍是本次确认的进程。
            $null = $process.Handle
            $owner = Get-CimInstance Win32_Process -Filter "ProcessId = $($listener.OwningProcess)"
            $escapedJar = [regex]::Escape($jar)
            $jarArgument = '(?i)(?:^|\s)-jar\s+(?:"{0}"|{0})(?:\s|$)' -f $escapedJar
            if ($owner -and $owner.Name -eq 'java.exe' -and $owner.CommandLine -match $jarArgument -and
                    -not $process.HasExited) {
                return $process
            }
            $process.Dispose()
        }
    }
    throw "端口 $Port 有其他服务监听，请先核对进程。"
}

# 停止已核实归属的实例，等待进程退出后才允许再次打开同一个测试库。
function Stop-PhoneH5Process([Diagnostics.Process]$Process) {
    try {
        if (-not $Process.HasExited) {
            $Process.Kill()
            if (-not $Process.WaitForExit(15000)) {
                throw "等待手机联调服务退出超时，PID $($Process.Id)。"
            }
        }
    } finally {
        $Process.Dispose()
    }
}

# 检查部署输入并返回新进程的 Java 路径与 Spring 配置。证书密码只传给子进程，GM 沿用 local 配置。
function Get-PhoneH5StartSettings {
    $java = if ($JavaPath) {
        [IO.Path]::GetFullPath($JavaPath)
    } else {
        Get-ChildItem -LiteralPath (Join-Path $repository 'backend/.tools') -Directory -Filter 'jdk-21*' |
            ForEach-Object { Join-Path $_.FullName 'bin/java.exe' } |
            Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
            Select-Object -First 1
    }
    if (-not $java -or -not (Test-Path -LiteralPath $java -PathType Leaf)) {
        throw '找不到 Java 21，请指定 -JavaPath。'
    }
    $caPath = Join-Path $runtime 'certs/mxzg-phone-wifi-ca.cer'
    $keyStore = Join-Path $runtime 'certs/server.p12'
    $passwordFile = Join-Path $runtime 'certs/server-password.txt'
    foreach ($path in @($jar, $caPath, $keyStore, $passwordFile, (Join-Path $static 'index.html'))) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "手机联调所需文件不存在。$path"
        }
    }
    if (-not (Get-NetIPAddress -AddressFamily IPv4 -IPAddress $Address -ErrorAction SilentlyContinue)) {
        throw "本机当前没有 $Address。请核对联调地址和证书。"
    }
    $certificate = [Security.Cryptography.X509Certificates.X509Certificate2]::new($caPath)
    try {
        if ((Get-Date) -gt $certificate.NotAfter) {
            throw '手机联调证书已过期，需先续签。'
        }
    } finally {
        $certificate.Dispose()
    }
    return @{
        Java = $java
        Properties = @{
            server = @{
                address = $Address
                port = $Port
                ssl = @{
                    enabled = $true
                    'key-store' = ([Uri]$keyStore).AbsoluteUri
                    'key-store-type' = 'PKCS12'
                    'key-store-password' = [IO.File]::ReadAllText($passwordFile).Trim()
                    'key-alias' = 'phone-wifi'
                }
            }
            spring = @{
                datasource = @{ url = 'jdbc:h2:file:./data/phone-wifi-test;MODE=MySQL;DATABASE_TO_LOWER=TRUE;WRITE_DELAY=0' }
                web = @{ resources = @{ 'static-locations' = @(([Uri]($static.TrimEnd('\', '/') + '\')).AbsoluteUri) } }
            }
        }
    }
}

# 以独立窗口和日志启动后端，确认本次启动的 PID 完成端口监听。
# 启动失败时先结束本次进程，保证发布方可以安全恢复 JAR 和测试数据库。
function Start-PhoneH5Process([hashtable]$Settings) {
    $run = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $stdout = Join-Path $runtime "phone-backend-$run.stdout.log"
    $stderr = Join-Path $runtime "phone-backend-$run.stderr.log"
    $launch = @{
        FilePath = $Settings.Java
        WorkingDirectory = $runtime
        ArgumentList = @('-jar', ('"' + $jar + '"'), '--spring.profiles.active=local', '--spring.config.additional-location=optional:file:./idle-activity.yml')
        PassThru = $true
        WindowStyle = 'Hidden'
        RedirectStandardOutput = $stdout
        RedirectStandardError = $stderr
    }
    $previousSettings = $env:SPRING_APPLICATION_JSON
    try {
        $env:SPRING_APPLICATION_JSON = $Settings.Properties | ConvertTo-Json -Depth 8 -Compress
        $process = Start-Process @launch
    } finally {
        $env:SPRING_APPLICATION_JSON = $previousSettings
    }

    Write-Host "[START] 手机联调服务 PID $($process.Id)"
    try {
        # 即使尚未监听端口，也能通过本次启动得到的句柄清理进程。
        $null = $process.Handle
        $deadline = (Get-Date).AddSeconds(45)
        do {
            $process.Refresh()
            if ($process.HasExited) {
                throw "手机联调服务启动失败。查看 $stdout"
            }
            $listener = Get-NetTCPConnection -LocalAddress $Address -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
                Where-Object OwningProcess -eq $process.Id
            if ($listener) {
                Write-Host "[READY] $url"
                return
            }
            Start-Sleep -Milliseconds 700
        } while ((Get-Date) -lt $deadline)
        throw "手机联调服务尚未开始监听。查看 $stdout"
    } catch {
        $failedProcess = $process
        $process = $null
        Stop-PhoneH5Process $failedProcess
        throw
    } finally {
        if ($process) {
            $process.Dispose()
        }
    }
}

$lock = [Threading.Mutex]::new($false, "Local\MXZG.PhoneH5.$Port")
$locked = $false
try {
    try {
        $locked = $lock.WaitOne(55000)
    } catch [Threading.AbandonedMutexException] {
        # 上一次操作意外退出后，重新检查实际监听和进程归属。
        $locked = $true
    }
    if (-not $locked) {
        throw "端口 $Port 上的联调服务正在执行其他操作。"
    }

    $running = Find-PhoneH5Process
    if ($Action -eq 'Status') {
        try {
            $state = if ($running) { 'running' } else { 'stopped' }
            $currentPid = if ($running) { $running.Id } else { $null }
            @{ state = $state; pid = $currentPid; url = $url } | ConvertTo-Json -Compress
        } finally {
            if ($running) {
                $running.Dispose()
            }
        }
        return
    }
    if ($Action -eq 'Stop') {
        if ($running) {
            Stop-PhoneH5Process $running
        }
        Write-Host "[STOPPED] $url"
        return
    }
    if ($Action -eq 'Start' -and $running) {
        $running.Dispose()
        Write-Host "[READY] $url"
        return
    }

    try {
        $settings = Get-PhoneH5StartSettings
    } catch {
        if ($running) {
            $running.Dispose()
        }
        throw
    }
    if ($running) {
        Stop-PhoneH5Process $running
    }
    Start-PhoneH5Process $settings
} finally {
    if ($locked) {
        $lock.ReleaseMutex()
    }
    $lock.Dispose()
}
