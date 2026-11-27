<#
管理开发机上的 dev-hao 个人服。双击入口共用这里的启停、状态和编译更新逻辑。
运行固定的独立 JAR，证书、口令、H2 和日志均位于 Git 忽略的个人服目录。
#>
param(
    [ValidateSet('Start', 'Stop', 'Status', 'Update', 'BuildOnly')][string]$Action = 'Status'
)

$ErrorActionPreference = 'Stop'
$serverId = 'dev-hao'
$serverName = 'Hao 个人开发服'
$address = '192.168.0.33'
$port = 18083
$sharedOrigin = 'https://192.168.0.38:18082'
$socketUrl = 'wss://{0}:{1}/api/v1/game/socket' -f $address, $port
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$backend = Join-Path $repository 'backend'
$runtime = Join-Path $backend '.local\lan-personal\dev-hao'
$jar = Join-Path $runtime 'personal-server.jar'
$marker = "-Dmxzg.personal.launcher=$serverId"

# 查询个人服专用端口的实际监听。按端口查询即可发现其他地址上的冲突进程。
function Get-PersonalListeners {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
}

# 通过启动标记和完整 JAR 路径核对进程，即使尚在启动中也能识别。
# 取到进程句柄后复核命令行，确保稍后停止的是同一个进程。
function Get-PersonalProcess {
    $process = $null
    $jarArgument = '(?i)(?:^|\s)-jar\s+(?:"{0}"|{0})(?:\s|$)' -f [regex]::Escape($jar)
    $markerArgument = '(?:^|\s){0}(?:\s|$)' -f [regex]::Escape($marker)
    try {
        $candidates = Get-CimInstance Win32_Process -Filter "Name='java.exe' AND CommandLine LIKE '%$marker%'"
        foreach ($candidate in $candidates) {
            if ($candidate.CommandLine -notmatch $jarArgument -or $candidate.CommandLine -notmatch $markerArgument) {
                continue
            }
            $candidateProcess = Get-Process -Id $candidate.ProcessId -ErrorAction SilentlyContinue
            if (!$candidateProcess) {
                continue
            }
            try {
                $null = $candidateProcess.Handle
                $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($candidate.ProcessId)"
                if ($candidateProcess.HasExited -or !$owner -or $owner.CreationDate -ne $candidate.CreationDate -or
                    $owner.CommandLine -ne $candidate.CommandLine) {
                    continue
                }
                if ($process) {
                    throw '发现多个个人服进程，请先核对进程归属。'
                }
                $process = $candidateProcess
                $candidateProcess = $null
            } finally {
                if ($candidateProcess) {
                    $candidateProcess.Dispose()
                }
            }
        }
        return $process
    } catch {
        if ($process) {
            $process.Dispose()
        }
        throw
    }
}

# 只结束已持有句柄的个人服 JVM，等待它释放独立数据库。
function Stop-PersonalProcess([Diagnostics.Process]$Process) {
    if (!$Process.HasExited) {
        $Process.Kill()
        if (!$Process.WaitForExit(15000)) {
            throw "等待个人服 PID $($Process.Id) 退出超时。"
        }
    }
}

# 选择项目内可用的 JDK 21，编译与运行沿用同一项目工具链。
function Get-PersonalJava {
    $java = Get-ChildItem -LiteralPath (Join-Path $backend '.tools') -Directory -Filter 'jdk-21*' |
        ForEach-Object { Join-Path $_.FullName 'bin\java.exe' } |
        Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } |
        Select-Object -First 1
    if (!$java) {
        throw '个人服需要项目 backend\.tools 下的 JDK 21。'
    }
    return $java
}

# 在停服之前验证运行文件、本机地址和 CA，返回供子进程使用的配置。
function Get-PersonalStartSettings {
    $keyStore = Join-Path $runtime 'server.p12'
    $passwordFile = Join-Path $runtime 'server-password.txt'
    $caPath = Join-Path $runtime 'mxzg-phone-wifi-ca.cer'
    foreach ($path in @($jar, $keyStore, $passwordFile, $caPath)) {
        if (!(Test-Path -LiteralPath $path -PathType Leaf)) {
            throw "缺少个人服文件 $path"
        }
    }
    if (!(Get-NetIPAddress -AddressFamily IPv4 -IPAddress $address -ErrorAction SilentlyContinue)) {
        throw "本机尚未取得 $address。连接内网后再启动。"
    }
    $ca = [Security.Cryptography.X509Certificates.X509Certificate2]::new($caPath)
    try {
        $now = Get-Date
        if ($now -lt $ca.NotBefore -or $now -gt $ca.NotAfter) {
            throw '个人服 CA 当前无效。请换发证书并更新测试设备的信任。'
        }
    } finally {
        $ca.Dispose()
    }
    return @{
        server = @{
            address = $address
            port = $port
            ssl = @{
                enabled = $true
                'key-store' = ([Uri]$keyStore).AbsoluteUri
                'key-store-type' = 'PKCS12'
                'key-store-password' = [IO.File]::ReadAllText($passwordFile).Trim()
            }
        }
        spring = @{
            datasource = @{
                url = 'jdbc:h2:file:./game;MODE=MySQL;DATABASE_TO_LOWER=TRUE;WRITE_DELAY=0'
                username = 'sa'
                password = ''
            }
        }
        mxzg = @{
            lan = @{
                'personal-id' = $serverId
                'personal-name' = $serverName
                'shared-origin' = $sharedOrigin
                'directory-file' = ''
            }
        }
    }

}

# 启动独立 JAR。只有本次 JVM 监听并完成 Spring 启动才报告成功，失败时结束本次进程。
# 此个人服的 GM 开关随游戏启动参数传入，可按 PID 核对。证书口令只通过子进程环境传入。
function Start-PersonalProcess([hashtable]$Settings, [string]$Java) {
    $run = Get-Date -Format 'yyyyMMdd-HHmmss-fff'
    $log = Join-Path $runtime "personal-$run.stdout.log"
    $previousSettings = $env:SPRING_APPLICATION_JSON
    try {
        $env:SPRING_APPLICATION_JSON = $settings | ConvertTo-Json -Depth 8 -Compress
        $launch = @{
            FilePath = $Java
            WorkingDirectory = $runtime
            ArgumentList = @($marker, '-jar', ('"' + $jar + '"'), '--spring.profiles.active=local', '--mxzg.gm.enabled=true',
                '--spring.config.additional-location=optional:file:./idle-activity.yml')
            PassThru = $true
            WindowStyle = 'Hidden'
            RedirectStandardOutput = $log
            RedirectStandardError = Join-Path $runtime "personal-$run.stderr.log"
        }
        $started = Start-Process @launch
    } finally {
        $env:SPRING_APPLICATION_JSON = $previousSettings
    }

    Write-Host "正在启动 $serverName，PID $($started.Id)。"
    try {
        $null = $started.Handle
        $deadline = (Get-Date).AddSeconds(55)
        do {
            if ($started.HasExited) {
                throw "个人服启动失败。日志 $log"
            }
            $listener = Get-PersonalListeners |
                Where-Object { $_.LocalAddress -eq $address -and $_.OwningProcess -eq $started.Id }
            if ($listener -and (Select-String -LiteralPath $log -Pattern 'Started GameApplication in' -SimpleMatch -Quiet)) {
                Write-Host "[运行中] $serverName，PID $($started.Id)"
                Write-Host $socketUrl
                return
            }
            Start-Sleep -Milliseconds 600
        } while ((Get-Date) -lt $deadline)
        throw "等待个人服监听超时。日志 $log"
    } catch {
        Stop-PersonalProcess $started
        throw
    } finally {
        $started.Dispose()
    }
}

# 用当前 hao 工作区打包，包含保存到磁盘的未提交代码。只清理个人服专用构建目录。
# 检查成品是否为包含内网选服入口的 Spring Boot JAR 后返回其路径。
function Build-PersonalJar([string]$Java) {
    $branch = & git -C $repository branch --show-current
    if ($LASTEXITCODE -ne 0 -or $branch -cne 'hao') {
        throw '请在当前仓库的 hao 分支构建个人服。'
    }
    $buildDirectory = Join-Path $backend '.local\dev-hao-build'
    $previousJava = $env:JAVA_HOME
    $previousPath = $env:PATH
    $previousMaven = $env:MAVEN_USER_HOME
    Push-Location -LiteralPath $backend
    try {
        $env:JAVA_HOME = [IO.Directory]::GetParent([IO.Path]::GetDirectoryName($Java)).FullName
        $env:PATH = [IO.Path]::GetDirectoryName($Java) + ';' + $env:PATH
        $env:MAVEN_USER_HOME = Join-Path $backend '.tools\maven-user'
        & .\mvnw.cmd "-Dmxzg.build.directory=$buildDirectory" '-DskipTests' clean package | Out-Host
        if ($LASTEXITCODE -ne 0) {
            throw "个人服编译失败，退出码 $LASTEXITCODE。"
        }
    } finally {
        Pop-Location
        $env:JAVA_HOME = $previousJava
        $env:PATH = $previousPath
        $env:MAVEN_USER_HOME = $previousMaven
    }

    $builtJar = Join-Path $buildDirectory 'mxzg-remake-0.1.0-SNAPSHOT.jar'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::OpenRead($builtJar)
    try {
        if (!$archive.GetEntry('BOOT-INF/classes/com/funsgamex/mxzg/GameApplication.class') -or
            !$archive.GetEntry('BOOT-INF/classes/com/funsgamex/mxzg/server/LanServerDirectory.class')) {
            throw "编译产物缺少个人服入口。$builtJar"
        }
    } finally {
        $archive.Dispose()
    }
    return $builtJar
}

# 停服后独占读取原库并落盘备份。遇到数据库仍被打开时退出，避免复制半写入状态。
function Backup-PersonalDatabase([string]$Database, [string]$Backup) {
    $source = [IO.File]::Open($Database, 'Open', 'Read', 'None')
    try {
        $destination = [IO.File]::Open($Backup, 'CreateNew', 'Write', 'None')
        try {
            $source.CopyTo($destination)
            $destination.Flush($true)
        } finally {
            $destination.Dispose()
        }
    } finally {
        $source.Dispose()
    }
}

# 仅发布到 dev-hao。备份原包及离线库后换包，新版本使用原数据路径。
# 新包启动失败时，等待它退出后回滚包和可能已迁移的 H2 数据，再恢复原运行状态。
function Update-PersonalServer([string]$BuiltJar, [Diagnostics.Process]$Running, [hashtable]$Settings, [string]$Java) {
    $database = Join-Path $runtime 'game.mv.db'
    if (!(Test-Path -LiteralPath $database -PathType Leaf)) {
        throw "找不到需保留的个人服数据库。$database"
    }
    $backupDir = Join-Path $runtime ('update-backups\' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
    [void][IO.Directory]::CreateDirectory($backupDir)
    $staged = Join-Path $backupDir 'candidate.jar'
    $oldJar = Join-Path $backupDir 'previous.jar'
    $oldDb = Join-Path $backupDir 'previous.mv.db'
    [IO.File]::Copy($BuiltJar, $staged)
    if ($Running) {
        Stop-PersonalProcess $Running
    }

    $swapped = $false
    try {
        Backup-PersonalDatabase $database $oldDb
        [IO.File]::Replace($staged, $jar, $oldJar)
        $swapped = $true
        Start-PersonalProcess $Settings $Java
        Write-Host "个人服已更新。更新前备份 $backupDir"
    } catch {
        $failure = $_
        try {
            if ($swapped) {
                $remaining = Get-PersonalProcess
                if ($remaining) {
                    $remaining.Dispose()
                    throw '候选进程仍在运行。'
                }
                if (Get-PersonalListeners) {
                    throw '个人服端口仍被占用。'
                }
                [IO.File]::Replace($oldJar, $jar, (Join-Path $backupDir 'failed.jar'))
                $restore = Join-Path $backupDir 'restore.mv.db'
                [IO.File]::Copy($oldDb, $restore)
                if ([IO.File]::Exists($database)) {
                    [IO.File]::Replace($restore, $database, (Join-Path $backupDir 'failed.mv.db'))
                } else {
                    [IO.File]::Move($restore, $database)
                }
            }
            if ($Running) {
                Start-PersonalProcess $Settings $Java
            }
        } catch {
            throw "个人服更新失败：$failure。自动恢复未完成：$_。备份目录 $backupDir"
        }
        throw "个人服更新失败，已恢复原状态：$failure。备份目录 $backupDir"
    }
}

# 使用同一个锁串行处理双击操作，避免重复启动或启动时同时停服。
$lock = [Threading.Mutex]::new($false, 'Global\MXZG.Personal.dev-hao.18083')
$locked = $false
$running = $null
$databaseLock = $null
try {
    try {
        $locked = $lock.WaitOne(65000)
    } catch [Threading.AbandonedMutexException] {
        $locked = $true
    }
    if (!$locked) {
        throw '个人服正在执行其他操作，请稍后重试。'
    }

    if ($Action -in @('Update', 'BuildOnly')) {
        $java = Get-PersonalJava
        $builtJar = Build-PersonalJar $java
        if ($Action -eq 'BuildOnly') {
            Write-Host "编译检查通过。$builtJar"
            return
        }
    }

    $running = Get-PersonalProcess
    $listeners = @(Get-PersonalListeners)
    $foreign = @($listeners | Where-Object {
        !$running -or $_.OwningProcess -ne $running.Id -or $_.LocalAddress -ne $address
    })
    if ($foreign.Count -gt 0) {
        $owners = ($foreign.OwningProcess | Sort-Object -Unique) -join ', '
        throw "端口 $port 被未识别的进程占用，PID $owners。"
    }

    if ($Action -eq 'Update' -or ($Action -eq 'Start' -and !$running)) {
        $settings = Get-PersonalStartSettings
        # 与清档工具共用目标库锁。停服仍可独立执行，供清档工具等待数据库释放。
        $databaseLock = [IO.File]::Open((Join-Path $runtime '.mxzg-reset.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
    }
    if ($Action -eq 'Update') {
        Update-PersonalServer $builtJar $running $settings $java
    } elseif ($Action -eq 'Stop') {
        if ($running) {
            Stop-PersonalProcess $running
        }
        Write-Host "[已停止] $serverName，端口 $port。"
    } elseif ($running) {
        $state = if ($listeners.Count) { '运行中' } else { '未监听' }
        Write-Host "[$state] $serverName，PID $($running.Id)"
        Write-Host $socketUrl
    } elseif ($Action -eq 'Start') {
        Start-PersonalProcess $settings (Get-PersonalJava)
    } else {
        Write-Host "[未启动] $serverName，端口 $port。"
    }
} finally {
    if ($databaseLock) {
        $databaseLock.Dispose()
    }
    if ($running) {
        $running.Dispose()
    }
    if ($locked) {
        $lock.ReleaseMutex()
    }
    $lock.Dispose()
}
