<#
执行内网构建站固定任务。独立 main 镜像和临时工作树分别承载同步与构建。
两端产物先验收再切换到联调服，失败时恢复旧产物和测试库。
#>
param(
    [Parameter(Mandatory)][ValidateSet('pull','frontend','backend','restart','config','all')][string]$Action,
    [Parameter(Mandatory)][string]$Configuration,
    [Parameter(Mandatory)][string]$JobDirectory
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$env:PYTHONIOENCODING = 'utf-8'

# 返回物理绝对路径，拒绝经过联接目录的写入和移动。
function Get-PlainPath([string]$Path) {
    if ([string]::IsNullOrWhiteSpace($Path) -or -not [IO.Path]::IsPathRooted($Path)) {
        throw '路径必须是绝对路径。'
    }
    $absolute = [IO.Path]::GetFullPath($Path)
    if ($absolute.Length -gt [IO.Path]::GetPathRoot($absolute).Length) {
        $absolute = $absolute.TrimEnd([char[]]'\/')
    }
    $ancestor = $absolute
    while ($ancestor) {
        if ((Test-Path -LiteralPath $ancestor) -and
                ((Get-Item -LiteralPath $ancestor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
            throw "拒绝联接路径：$ancestor"
        }
        $ancestor = [IO.Path]::GetDirectoryName($ancestor)
    }
    return $absolute
}

# 将固定外部命令输出写入任务日志，并检查退出码。
function Invoke-Checked([string]$Program, [string[]]$Arguments, [string]$Description) {
    & $Program @Arguments | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "$Description 失败，退出码 $LASTEXITCODE。"
    }
}

# 原子替换状态文件，避免页面在写入过程中读到不完整的 JSON。
function Write-Json([string]$Path, [object]$Value) {
    $temporary = $Path + '.writing'
    [IO.File]::WriteAllText($temporary, ($Value | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
    if ([IO.File]::Exists($Path)) {
        [IO.File]::Replace($temporary, $Path, ($Path + '.previous'))
    } else {
        [IO.File]::Move($temporary, $Path)
    }
}

# 仅克隆或快进内网 main 镜像，成功后记录分支与已同步提交。
function Get-SourceCommit([bool]$Synchronize) {
    if (-not (Test-Path -LiteralPath $syncRoot)) {
        Invoke-Checked 'git' @('clone','--depth','1','--config','core.longpaths=true','--branch',$sourceBranch,'--single-branch','--',$config.gitRemote,$syncRoot) "克隆 $sourceBranch"
    } else {
        $remote = & git -C $syncRoot remote get-url origin
        if ($LASTEXITCODE -ne 0 -or $remote -ne $config.gitRemote) {
            throw '同步目录的 origin 和构建站配置不一致。'
        }
        $branch = & git -C $syncRoot branch --show-current
        if ($LASTEXITCODE -ne 0 -or $branch -ne $sourceBranch) {
            throw "同步目录应位于 $sourceBranch 分支。"
        }
        $dirty = & git -C $syncRoot status --porcelain
        if ($LASTEXITCODE -ne 0 -or $dirty) {
            throw '同步目录内有未提交修改，请先核对目录内容。'
        }
        if ($Synchronize) {
            Invoke-Checked 'git' @('-C',$syncRoot,'pull','--ff-only','origin',$sourceBranch) "同步 origin/$sourceBranch"
        }
    }
    $commit = & git -C $syncRoot rev-parse HEAD
    if ($LASTEXITCODE -ne 0 -or $commit -notmatch '^[0-9a-f]{40}$') {
        throw '同步目录没有有效 Git 提交。'
    }
    $remoteCommit = & git -C $syncRoot rev-parse "refs/remotes/origin/$sourceBranch"
    if ($LASTEXITCODE -ne 0 -or $remoteCommit -ne $commit) {
        throw "镜像的 $sourceBranch 必须与已同步的 origin/$sourceBranch 提交完全一致。"
    }
    Write-Json $sourceStatePath @{
        commit = $commit
        branch = $sourceBranch
        updatedAt = [DateTime]::UtcNow.ToString('o')
    }
    Write-Host "[SOURCE] $commit"
    return $commit
}

# 在任务工作树导出共享表、客户端类型和配置包，不访问游戏数据库。
function Export-SharedConfig([string]$Source) {
    $python = Get-PlainPath $config.pythonPath
    $sourceTables = Join-Path $Source 'config/gameconfig'
    $outputTables = Join-Path $Source 'client/assets/bundles/resources/config'
    $oldModules = $env:PYTHONPATH
    Push-Location -LiteralPath $Source
    try {
        if ($config.pythonModulePath) {
            $env:PYTHONPATH = Get-PlainPath $config.pythonModulePath
        }
        Invoke-Checked $python @('tools/export_gameconfig.py','--src',$sourceTables,'--out',$outputTables) '导出共享配置'
        Invoke-Checked $python @('tools/generate_config.py') '生成客户端配置类型'
        Invoke-Checked $python @('tools/generate_config.py','--check') '校验客户端配置类型'
        Invoke-Checked 'node' @('tools/generate_config_package.cjs','--write') '生成客户端配置包'
        Invoke-Checked 'node' @('tools/generate_config_package.cjs','--check') '校验客户端配置包'
    } finally {
        Pop-Location
        $env:PYTHONPATH = $oldModules
    }
}

# 在隔离场景中注入 WSS 地址，然后复用 Creator 验收流程并恢复桌面竖屏。
function Build-Frontend([string]$Source) {
    $scenePath = Join-Path $Source 'client/assets/scenes/Remake.scene'
    $scene = [IO.File]::ReadAllText($scenePath)
    $pattern = '("socketUrl"\s*:\s*)"[^"\r\n]+"'
    if ([regex]::Matches($scene, $pattern).Count -ne 1) {
        throw '无法确认独立场景中唯一的 socketUrl。'
    }
    $socketUrl = 'wss://{0}/api/v1/game/socket' -f $gameUri.Authority
    $scene = [regex]::Replace($scene, $pattern, ('$1"' + $socketUrl + '"'))
    [IO.File]::WriteAllText($scenePath, $scene, [Text.UTF8Encoding]::new($false))

    $builder = Join-Path $Source 'client/tools/build-remake-h5.ps1'
    # 用当前 Windows PowerShell 的内置模块，避免另一层子进程继承不兼容的 PSModulePath。
    $utility = Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Utility/Microsoft.PowerShell.Utility.psd1'
    Import-Module -Name $utility -ErrorAction Stop
    Get-Command 'Get-FileHash' -ErrorAction Stop | Out-Null
    $builderArgs = @{
        CreatorPath = Get-PlainPath $config.creatorPath
        PythonPath = Get-PlainPath $config.pythonPath
        ResourceServer = $gameUri.GetLeftPart([UriPartial]::Authority) + '/'
    }
    & $builder @builderArgs | Out-Host
    $artifact = Join-Path $Source 'client/build/remake-h5'
    & (Join-Path $PSScriptRoot 'Set-H5DesktopPortrait.ps1') -IndexFile (Join-Path $artifact 'index.html')
    $resourceRoot = $gameUri.GetLeftPart([UriPartial]::Authority) + '/'
    $builtSettings = [IO.File]::ReadAllText((Join-Path $artifact 'src/settings.json')) | ConvertFrom-Json
    if ($builtSettings.assets.server -ne $resourceRoot) {
        throw '前端产物的 HTTPS 资源根与联调配置不一致。'
    }
    $socketAsset = Get-ChildItem -LiteralPath (Join-Path $artifact 'assets/main/import') -Filter '*.json' -File -Recurse |
        Where-Object { [IO.File]::ReadAllText($_.FullName).Contains($socketUrl) } | Select-Object -First 1
    if (-not $socketAsset) {
        throw '前端产物中找不到联调 WSS 场景配置。'
    }
    return $artifact
}

# 用 Java 21 的 Maven Wrapper 打包，不访问当前运行的后端。
function Build-Backend([string]$Source) {
    $javaBin = [IO.Path]::GetDirectoryName((Get-PlainPath $config.javaPath))
    $oldJavaHome = $env:JAVA_HOME
    $oldPath = $env:Path
    $oldMavenHome = $env:MAVEN_USER_HOME
    $oldMavenOpts = $env:MAVEN_OPTS
    $cache = if ($config.mavenCache) { Get-PlainPath $config.mavenCache } else { Join-Path $stateRoot 'maven-cache' }
    Push-Location -LiteralPath (Join-Path $Source 'backend')
    try {
        $env:JAVA_HOME = [IO.Path]::GetDirectoryName($javaBin)
        $env:Path = "$javaBin;$oldPath"
        $env:MAVEN_USER_HOME = Join-Path ([IO.Path]::GetDirectoryName($cache)) 'maven-user'
        $env:MAVEN_OPTS = ("$oldMavenOpts -Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8").Trim()
        Invoke-Checked '.\mvnw.cmd' @('-B',"-Dmaven.repo.local=$cache",'-DskipTests','package') '后端打包'
        $builtJar = Join-Path $Source 'backend/target/mxzg-remake-0.1.0-SNAPSHOT.jar'
        if (-not [IO.File]::Exists($builtJar)) {
            throw '后端构建未生成预期的联调 JAR。'
        }
        return $builtJar
    } finally {
        Pop-Location
        $env:JAVA_HOME = $oldJavaHome
        $env:Path = $oldPath
        $env:MAVEN_USER_HOME = $oldMavenHome
        $env:MAVEN_OPTS = $oldMavenOpts
    }
}

# 原样复用独立测试服的进程归属、证书及启动检查。
function Invoke-TestServer([string]$Operation) {
    $serverArgs = @{
        Action = $Operation
        Address = $gameUri.Host
        Port = $gameUri.Port
        RuntimeDirectory = $runtimeRoot
        StaticRoot = $staticRoot
        JarPath = $liveJar
        JavaPath = Get-PlainPath $config.javaPath
    }
    & $launcher @serverArgs
}

# 用联调 CA 验证上线后的 HTTPS 页面和真实 WebSocket 握手。
function Test-TestServer {
    $ca = Join-Path $runtimeRoot 'certs/mxzg-phone-wifi-ca.cer'
    for ($attempt = 1; $attempt -le 4; $attempt++) {
        & node (Join-Path $PSScriptRoot 'Check-PhoneH5.cjs') $gameUri.AbsoluteUri $ca
        if ($LASTEXITCODE -eq 0) {
            return
        }
        Start-Sleep -Seconds 2
    }
    throw '测试服的页面或 WebSocket 健康检查失败。'
}

# 先准备产物，再停服备份和切换。任一步失败时恢复旧版本及测试库。
function Publish-Artifacts([string]$Frontend, [string]$Backend, [string]$Commit) {
    $jobId = [IO.Path]::GetFileName($jobRoot)
    $stagedStatic = Get-PlainPath ($staticRoot + '.staged-' + $jobId)
    $oldStatic = Get-PlainPath ($staticRoot + '.previous-' + $jobId)
    $failedStatic = Get-PlainPath ($staticRoot + '.failed-' + $jobId)
    $stagedJar = Get-PlainPath ($liveJar + '.staged-' + $jobId)
    $oldJar = Get-PlainPath ($liveJar + '.previous-' + $jobId)
    $failedJar = Get-PlainPath ($liveJar + '.failed-' + $jobId)
    $hasLiveFrontend = [IO.Directory]::Exists($staticRoot)
    $hasLiveBackend = [IO.File]::Exists($liveJar)
    if ((-not $hasLiveFrontend -or -not $hasLiveBackend) -and -not ($Frontend -and $Backend)) {
        throw '测试服初次安装请执行全量更新，同时生成 H5 和后端 JAR。'
    }
    if (([IO.File]::Exists($staticRoot)) -or ([IO.Directory]::Exists($liveJar))) {
        throw '测试服产物目标路径有意外占用。'
    }
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($staticRoot))
    [void][IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($liveJar))
    foreach ($path in @($stagedStatic,$oldStatic,$failedStatic,$stagedJar,$oldJar,$failedJar)) {
        if (Test-Path -LiteralPath $path) {
            throw "检测到同批发布目录，请核对历史文件：$path"
        }
    }
    if ($Frontend) {
        & robocopy.exe $Frontend $stagedStatic /E /XJ /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
        if ($LASTEXITCODE -gt 7) {
            throw "H5 产物复制失败，退出码 $LASTEXITCODE。"
        }
    }
    if ($Backend) {
        [IO.File]::Copy($Backend, $stagedJar)
    }
    $database = Get-PlainPath (Join-Path $runtimeRoot 'data/phone-wifi-test.mv.db')
    $databaseBackup = Get-PlainPath (Join-Path $jobRoot 'previous-test-database.mv.db')
    $releasePath = Get-PlainPath (Join-Path $stateRoot 'release.json')
    $release = if ([IO.File]::Exists($releasePath)) {
        [IO.File]::ReadAllText($releasePath) | ConvertFrom-Json
    } else { [pscustomobject]@{ frontend = $null; backend = $null } }
    if ($Frontend) {
        $release | Add-Member -NotePropertyName frontend -NotePropertyValue $Commit -Force
    }
    if ($Backend) {
        $release | Add-Member -NotePropertyName backend -NotePropertyValue $Commit -Force
    }
    $serverLock = [Threading.Mutex]::new($false, "Local\MXZG.PhoneH5.$($gameUri.Port)")
    $serverLocked = $false
    try {
        try {
            $serverLocked = $serverLock.WaitOne(30000)
        } catch [Threading.AbandonedMutexException] {
            $serverLocked = $true
        }
        if (-not $serverLocked) {
            throw '联调服正在执行其他启停操作。'
        }
        $previousStatus = Invoke-TestServer 'Status' | ConvertFrom-Json
        $newStatic = $false
        $newJar = $false
        $databaseExisted = [IO.File]::Exists($database)
        $databaseSaved = $false
        try {
            Invoke-TestServer 'Stop'
            if ($Backend -and $databaseExisted) {
                [IO.File]::Copy($database, $databaseBackup)
                $databaseSaved = $true
            }
            if ($Frontend) {
                if ($hasLiveFrontend) {
                    [IO.Directory]::Move($staticRoot, $oldStatic)
                }
                [IO.Directory]::Move($stagedStatic, $staticRoot)
                $newStatic = $true
            }
            if ($Backend) {
                if ($hasLiveBackend) {
                    [IO.File]::Move($liveJar, $oldJar)
                }
                [IO.File]::Move($stagedJar, $liveJar)
                $newJar = $true
            }
            Invoke-TestServer 'Start'
            Test-TestServer
            Write-Json $releasePath $release
            Write-Host "[RELEASE] $Commit"
        } catch {
            # 停止本批 JAR，防止恢复测试库期间仍有 Flyway 或玩家事务写入。
            $failure = $_
            if ($newStatic -or $newJar) {
                Invoke-TestServer 'Stop'
            }
            if ($newStatic) {
                [IO.Directory]::Move($staticRoot, $failedStatic)
            }
            if ([IO.Directory]::Exists($oldStatic)) {
                [IO.Directory]::Move($oldStatic, $staticRoot)
            }
            if ($newJar) {
                [IO.File]::Move($liveJar, $failedJar)
            }
            if ([IO.File]::Exists($oldJar)) {
                [IO.File]::Move($oldJar, $liveJar)
            }
            if ($databaseSaved) {
                [IO.File]::Copy($databaseBackup, $database, $true)
            } elseif ($newJar -and -not $databaseExisted -and [IO.File]::Exists($database)) {
                [IO.File]::Move($database, (Join-Path $jobRoot 'failed-test-database.mv.db'))
            }
            if ($previousStatus.state -eq 'running') {
                Invoke-TestServer 'Start'
                Test-TestServer
            }
            throw $failure
        }
    } finally {
        if ($serverLocked) {
            $serverLock.ReleaseMutex()
        }
        $serverLock.Dispose()
    }
}

$configPath = Get-PlainPath $Configuration
$config = [IO.File]::ReadAllText($configPath) | ConvertFrom-Json
$stateRoot = Get-PlainPath $config.stateDirectory
$jobRoot = Get-PlainPath $JobDirectory
$jobsRoot = Get-PlainPath (Join-Path $stateRoot 'jobs')
if ([IO.Path]::GetDirectoryName($jobRoot) -ne $jobsRoot -or
        [IO.Path]::GetFileName($jobRoot) -notmatch '^[A-Za-z0-9_-]{1,100}$' -or
        -not [IO.Directory]::Exists($jobRoot)) {
    throw '任务目录必须是状态目录 jobs 下已创建的直属目录。'
}
$sourceBranch = 'main'
# 给内网分支单独保留镜像与状态，旧 hao 记录留给既有任务核对。
$syncRoot = Get-PlainPath (Join-Path $stateRoot "source-$sourceBranch")
$sourceStatePath = Get-PlainPath (Join-Path $stateRoot "source-$sourceBranch.json")
# 保持 Creator 隔离目录与资源路径足够短，避免 Windows 工具达到路径限制。
$workRoot = Get-PlainPath (Join-Path $stateRoot 'work')
$worktree = Get-PlainPath (Join-Path $workRoot ([Guid]::NewGuid().ToString('N').Substring(0, 10)))
$runtimeRoot = Get-PlainPath $config.runtimeDirectory
$staticRoot = Get-PlainPath $config.staticRoot
$liveJar = Get-PlainPath (Join-Path $runtimeRoot 'backend/target/mxzg-remake-0.1.0-SNAPSHOT.jar')
$launcher = Join-Path ([IO.Path]::GetDirectoryName($PSScriptRoot)) 'Start-PhoneH5.ps1'
$gameUri = $null
if (-not [Uri]::TryCreate($config.gameUrl,[UriKind]::Absolute,[ref]$gameUri) -or
        $gameUri.Scheme -ne 'https' -or $gameUri.HostNameType -ne [UriHostNameType]::IPv4 -or
        $gameUri.Port -eq 18080 -or $gameUri.AbsolutePath -ne '/index.html' -or
        $gameUri.UserInfo -or $gameUri.Query -or $gameUri.Fragment) {
    throw '测试页必须是独立端口的 IPv4 HTTPS /index.html。'
}
$gitUri = $null
if (-not [Uri]::TryCreate($config.gitRemote,[UriKind]::Absolute,[ref]$gitUri) -or
        $gitUri.Scheme -notin @('https','ssh','file') -or $gitUri.Query -or $gitUri.Fragment -or
        $gitUri.UserInfo.Contains(':') -or ($gitUri.Scheme -ne 'ssh' -and $gitUri.UserInfo)) {
    throw 'Git 地址必须是无内嵌密码的 HTTPS、SSH 或本地镜像地址。'
}

$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'
if ($gitUri.Scheme -eq 'ssh' -and -not $env:GIT_SSH_COMMAND) {
    # 未提前装配凭据或 known_hosts 时直接报错，网页任务不能等终端输入。
    $env:GIT_SSH_COMMAND = 'ssh -o BatchMode=yes -o StrictHostKeyChecking=yes'
}
$lock = [IO.File]::Open((Join-Path $stateRoot 'build-runner.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
$worktreeAdded = $false
try {
    if ($Action -eq 'restart') {
        Invoke-TestServer 'Restart'
        Test-TestServer
        return
    }
    $commit = Get-SourceCommit ($Action -in @('pull','config','all'))
    if ($Action -eq 'pull') {
        return
    }

    [void][IO.Directory]::CreateDirectory($workRoot)
    Invoke-Checked 'git' @('-C',$syncRoot,'-c','core.longpaths=true','worktree','add','--detach',$worktree,$commit) '创建隔离工作树'
    $worktreeAdded = $true
    if ($Action -in @('frontend','config','all')) {
        Invoke-Checked 'npm.cmd' @('ci','--prefer-offline','--no-audit','--no-fund','--prefix',(Join-Path $worktree 'client')) '安装客户端构建依赖'
    }
    if ($Action -in @('config','all')) {
        Export-SharedConfig $worktree
        Invoke-Checked 'git' @('-C',$worktree,'diff','--stat') '列出导表差异'
        if ($Action -eq 'config') {
            Write-Host '[CONFIG] 共享表与配置包校验通过。全量更新会再次导出并发布两端。'
            return
        }
    }

    $frontend = if ($Action -in @('frontend','all')) { Build-Frontend $worktree }
    $backend = if ($Action -in @('backend','all')) { Build-Backend $worktree }
    Publish-Artifacts $frontend $backend $commit
} finally {
    try {
        if ($worktreeAdded -and [IO.Directory]::Exists($worktree)) {
            # Git 只删除本任务已创建的工作树，并再次核对物理路径。
            if ([IO.Path]::GetDirectoryName((Get-PlainPath $worktree)) -eq $workRoot) {
                & git -C $syncRoot worktree remove --force $worktree | Out-Host
                if ($LASTEXITCODE -ne 0) {
                    Write-Warning '隔离工作树未清除，请检查构建站磁盘。'
                }
            }
        }
    } finally {
        $lock.Dispose()
    }
}
