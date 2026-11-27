<#
清理一台 MXZG 内网游戏实例的玩家数据。桌面入口加载本地配置，实际执行前显示目标并要求输入区服 ID。
共享服与构建/启停脚本共用互斥锁；在离线状态构造新 H2，校验后同卷替换，并保留原库以便恢复。
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Config,
    [switch]$Preview
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
# 只接受本机绝对磁盘路径，拒绝 UNC、设备路径和联接目录。
function Get-LocalResetPath([string]$Path) {
    if ($Path -notmatch '^[A-Za-z]:[\\/]') { throw "需要本机绝对路径：$Path" }
    $full = [IO.Path]::GetFullPath($Path)
    if ($full.Substring(2).Contains(':')) { throw "不支持备用数据流：$full" }
    $drive = New-Object IO.DriveInfo ([IO.Path]::GetPathRoot($full))
    if ($drive.DriveType -ne [IO.DriveType]::Fixed) { throw "工作目录需要位于本机固定磁盘：$full" }
    $ancestor = $full
    while ($ancestor) {
        if (Test-Path -LiteralPath $ancestor) {
            if ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "路径经过联接或符号链接：$ancestor"
            }
        }
        $ancestor = [IO.Path]::GetDirectoryName($ancestor)
    }
    return $full
}

# 在停服前确认必要文件存在，只允许本机常规文件。
function Get-ResetFile([string]$Path) {
    $file = Get-LocalResetPath $Path
    if (-not [IO.File]::Exists($file)) { throw "找不到文件：$file" }
    return $file
}

. (Join-Path $PSScriptRoot 'Personal.ps1')

# 从当前已部署的 Spring Boot JAR 读取 H2 版本；拒绝混用 Maven 缓存里的其他版本。
function Get-SharedH2Driver([string]$Runtime, [string]$Cache) {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $jar = Get-ResetFile (Join-Path $Runtime 'backend\target\mxzg-remake-0.1.0-SNAPSHOT.jar')
    $zip = [IO.Compression.ZipFile]::OpenRead($jar)
    try {
        $matchesH2 = @($zip.Entries | Where-Object FullName -match '^BOOT-INF/lib/h2-([0-9.]+)\.jar$')
        if ($matchesH2.Count -ne 1) { throw '已部署 JAR 中未找到唯一 H2 版本。' }
        $file = $matchesH2[0].Name
        $version = $file.Substring(3, $file.Length - 7)
        return Get-ResetFile (Join-Path $Cache "com\h2database\h2\$version\$file")
    } finally {
        $zip.Dispose()
    }
}

# 共享库、工具及启停参数直接取自独立构建台的 MXZG 配置。
function Get-SharedResetTarget($Settings) {
    $root = Get-LocalResetPath $Settings.installRoot
    $project = [IO.File]::ReadAllText((Get-ResetFile (Join-Path $root 'project-configs\mxzg.json'))) | ConvertFrom-Json
    $url = [Uri]$project.gameUrl
    if ($url.Scheme -ne 'https' -or $url.HostNameType -ne 'IPv4' -or $url.Port -eq 18080 -or
        $url.AbsolutePath -ne '/index.html' -or $url.UserInfo -or $url.Query -or $url.Fragment) {
        throw '共享游戏配置需要内网 IPv4 的 HTTPS 游戏入口。'
    }
    $runtime = Get-LocalResetPath $project.runtimeDirectory
    $state = Get-LocalResetPath $project.stateDirectory
    if (-not [IO.Directory]::Exists($state)) { throw "构建状态目录不存在：$state" }
    $java = Get-ResetFile $project.javaPath
    return [pscustomobject]@{
        Id = 'local-1'; Name = '共享验收服'; Address = $url.Host; Port = $url.Port
        DbFile = Get-ResetFile (Join-Path $runtime 'data\phone-wifi-test.mv.db')
        Java = $java; Driver = Get-SharedH2Driver $runtime (Get-LocalResetPath $project.mavenCache)
        Launcher = Get-ResetFile (Join-Path $root 'adapters\mxzg\Start-PhoneH5.ps1')
        BuildLock = Get-LocalResetPath (Join-Path $state 'build-runner.lock')
        Node = Get-ResetFile (Join-Path $root 'tools\node\node.exe')
        HealthScript = Get-ResetFile (Join-Path $root 'adapters\mxzg\Check-PhoneH5.cjs')
        GameUrl = $url.AbsoluteUri; CA = Get-ResetFile (Join-Path $runtime 'certs\mxzg-phone-wifi-ca.cer')
        Arguments = @{
            Address = $url.Host; Port = $url.Port; RuntimeDirectory = $runtime
            StaticRoot = Get-LocalResetPath $project.staticRoot; JavaPath = $java
        }
    }
}

# 实例启动后用构建台实际使用的受信 HTTPS/WSS 检查，在资源就绪前允许短暂重试。
function Test-SharedResetServer($Target) {
    for ($attempt = 1; $attempt -le 4; $attempt++) {
        & $Target.Node $Target.HealthScript $Target.GameUrl $Target.CA | Out-Host
        if ($LASTEXITCODE -eq 0) { return }
        if ($attempt -lt 4) { Start-Sleep -Seconds 2 }
    }
    throw '共享服 HTTPS/WSS 健康检查失败。'
}

# 生成新文件前确认没有进程持有当前库，并确认从预检到交换期间源库没有被更改。
function Get-ClosedDatabaseHash([string]$File) {
    $stream = [IO.File]::Open($File, 'Open', 'Read', 'None')
    $sha = [Security.Cryptography.SHA256]::Create()
    try {
        return [BitConverter]::ToString($sha.ComputeHash($stream))
    } finally {
        $sha.Dispose()
        $stream.Dispose()
    }
}

# 一次仅处理一个已确认的目标。原库在替换的同一个文件操作中归档，构造新库失败时保持原件。
function Invoke-GameReset([string]$Mode, $Target, [string]$Helper) {
    $parent = Get-LocalResetPath ([IO.Path]::GetDirectoryName($Target.DbFile))
    $archive = Get-LocalResetPath (Join-Path $parent 'reset-backups')
    $tag = (Get-Date -Format 'yyyyMMdd-HHmmss-fff') + '-' + [Guid]::NewGuid().ToString('N').Substring(0,8)
    $stem = $Target.Id + '-' + $tag
    $staged = Get-LocalResetPath (Join-Path $parent ("reset-stage-$tag.mv.db"))
    $backup = Get-LocalResetPath (Join-Path $archive ($stem + '.mv.db'))
    $failed = Get-LocalResetPath (Join-Path $archive ($stem + '.failed.mv.db'))
    $lockPath = Get-LocalResetPath (Join-Path $parent '.mxzg-reset.lock')
    $instanceLock = [IO.File]::Open($lockPath, 'OpenOrCreate', 'ReadWrite', 'None')
    $buildLock = $null
    $mutex = $null
    $ownsMutex = $false
    $resumeShared = $false
    $swapped = $false
    $buildingStage = $false
    try {
        if ($Mode -eq 'shared') {
            $buildLock = [IO.File]::Open($Target.BuildLock, 'OpenOrCreate', 'ReadWrite', 'None')
            $mutex = New-Object Threading.Mutex($false, ("Local\MXZG.PhoneH5." + $Target.Port))
            try { $ownsMutex = $mutex.WaitOne(5000) } catch [Threading.AbandonedMutexException] { $ownsMutex = $true }
            if (-not $ownsMutex) { throw '构建台正在启停此服务，请稍后再试。' }
            $launchArgs = $Target.Arguments
            $state = (& $Target.Launcher @launchArgs -Action Status) | ConvertFrom-Json
            if ($state.state -notin @('running','stopped')) { throw '未能确认共享服状态。' }
            if ($state.state -eq 'running') {
                $resumeShared = $true
                & $Target.Launcher @launchArgs -Action Stop | Out-Host
            }
        } else {
            Wait-PersonalStop $Target
        }
        $originalHash = Get-ClosedDatabaseHash $Target.DbFile
        [void][IO.Directory]::CreateDirectory($archive)
        if (Test-Path -LiteralPath $staged) { throw '本次临时数据库名称已被占用。' }
        $buildingStage = $true
        Write-Host '正在建立新的游戏库并核对区服、迁移历史和空玩家表……'
        & $Target.Java '-Dfile.encoding=UTF-8' '-Dstdout.encoding=UTF-8' '-Dstderr.encoding=UTF-8' -cp $Target.Driver $Helper $Mode $Target.Id $Target.DbFile $staged | Out-Host
        if ($LASTEXITCODE -ne 0 -or -not [IO.File]::Exists($staged)) { throw '新数据库未通过构造或校验。' }
        if ((Get-ClosedDatabaseHash $Target.DbFile) -ne $originalHash) { throw '原库在离线构造期间发生变化。' }
        [IO.File]::Replace($staged, $Target.DbFile, $backup)
        $swapped = $true
        Write-Host "原库备份：$backup"
        if ($resumeShared) {
            & $Target.Launcher @launchArgs -Action Start | Out-Host
            Test-SharedResetServer $Target
        }
        Write-Host "已清档：$($Target.Name)（$($Target.Id)）。"
        if ($Mode -eq 'shared' -and -not $resumeShared) { Write-Host '共享服原先已停止，仍处于停止状态。' }
    } catch {
        $cause = $_.Exception.Message
        if ($resumeShared) {
            try {
                if ($swapped) {
                    & $Target.Launcher @launchArgs -Action Stop | Out-Host
                    [void](Get-ClosedDatabaseHash $Target.DbFile)
                    [IO.File]::Replace($backup, $Target.DbFile, $failed)
                    Write-Host '已将原数据库恢复到原位。'
                }
                & $Target.Launcher @launchArgs -Action Start | Out-Host
                Test-SharedResetServer $Target
            } catch {
                throw "清档失败：$cause。恢复服务时也发生错误：$($_.Exception.Message)。请核对当前服务与备份位置 $backup"
            }
        }
        throw "清档未完成：$cause"
    } finally {
        if ($ownsMutex) { $mutex.ReleaseMutex() }
        if ($null -ne $mutex) { $mutex.Dispose() }
        if ($null -ne $buildLock) { $buildLock.Dispose() }
        $instanceLock.Dispose()
        if ($buildingStage -and [IO.File]::Exists($staged)) {
            try {
                [IO.File]::Delete((Get-ResetFile $staged))
            } catch {
                Write-Warning "未能清理本次未发布的临时库：$staged"
            }
        }
    }
}

try {
    $configFile = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Config)
    $settings = [IO.File]::ReadAllText((Get-ResetFile $configFile)) | ConvertFrom-Json
    $mode = [string]$settings.mode
    if ($mode -ceq 'shared') { $target = Get-SharedResetTarget $settings }
    elseif ($mode -ceq 'personal') { $target = Get-PersonalResetTarget $settings }
    else { throw 'reset.json 的 mode 应为 shared 或 personal。' }
    $helper = Get-ResetFile (Join-Path $PSScriptRoot 'ResetGameDatabase.java')
    Write-Host "目标：$($target.Name)（$($target.Id)） $($target.Address):$($target.Port)"
    Write-Host "数据库：$($target.DbFile)"
    Write-Host '清除范围：此实例的玩家、角色、背包、进度及玩法记录。区服配置和证书保留。'
    if ($Preview) { Write-Host '预览完成。'; return }
    if ((Read-Host "确认清档请输入 $($target.Id)，直接回车取消") -cne $target.Id) {
        Write-Host '已取消。'
        return
    }
    Invoke-GameReset $mode $target $helper
    if ($mode -eq 'personal') {
        Write-Host '现在将启动个人服。若启动失败，清档前的数据库仍可从刚才显示的备份位置恢复。'
        Start-PersonalResetTarget $target
    }
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
