<#
隔离 H5 构建入口：生成配置包后复制完整的客户端与构建工具依赖，使用同一套 Creator 构建钩子验收。
临时目录保留仓库的 client/tools/config 相对结构，不借用当前编辑器；仅校验通过的完整产物写入本地验收目录。
PrepareOnly 只准备并核验隔离输入，不启动 Creator，也不替换已发布的本地验收包。
#>
param(
    [string]$CreatorPath = $env:MXZG_CREATOR_PATH,
    [string]$ResourceServer,
    [string]$PythonPath = $env:MXZG_PYTHON,
    [switch]$PrepareOnly
)
$ErrorActionPreference = 'Stop'
$clientRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$repositoryRoot = [IO.Path]::GetFullPath((Join-Path $clientRoot '..'))
$isolationRoot = Join-Path $clientRoot 'temp/remake-h5-project'
$workspace = Join-Path $isolationRoot 'client'
$published = Join-Path $clientRoot 'build/remake-h5'
$logs = Join-Path $clientRoot 'temp/remake-h5-build'
$buildOptions = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'remake-h5.build.json') -Raw | ConvertFrom-Json
if ($ResourceServer) {
    $buildOptions.server = $ResourceServer
}
$resourceUri = $null
if (-not [Uri]::TryCreate($buildOptions.server, [UriKind]::Absolute, [ref]$resourceUri) -or
    $resourceUri.Scheme -notin @('http', 'https') -or $resourceUri.UserInfo -or $resourceUri.Query -or $resourceUri.Fragment) {
    throw 'ResourceServer must be an absolute HTTP/HTTPS resource root without credentials, query or fragment.'
}
$buildOptions.server = $resourceUri.AbsoluteUri.TrimEnd('/') + '/'
if (-not $PythonPath) {
    $PythonPath = 'python'
}
if (-not $CreatorPath) {
    $CreatorPath = 'C:/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe'
}
if (-not $PrepareOnly) {
    if (-not (Test-Path -LiteralPath $CreatorPath -PathType Leaf)) {
        throw 'Creator 3.8.8 was not found. Set MXZG_CREATOR_PATH to its CocosCreator.exe.'
    }
    if ((Get-Item -LiteralPath $CreatorPath).VersionInfo.ProductVersion -ne '3.8.8') {
        throw 'This build configuration requires Creator 3.8.8.'
    }
}

<#
镜像本次构建输入或已通过校验的产物；/MIR 会删除目标中的过期文件。
每次复制前校验绝对路径及其已有父目录，拒绝越出本脚本管理目录和经过目录联接。
#>
function Sync-BuildDirectory([string]$source, [string]$destination) {
    $resolved = [IO.Path]::GetFullPath($destination)
    $insideWorkspace = $resolved.StartsWith($isolationRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
    if (-not $insideWorkspace -and $resolved -ne $published) {
        throw "Unsafe build destination: $resolved"
    }
    $ancestor = $resolved
    while ($ancestor -ne $clientRoot) {
        if (Test-Path -LiteralPath $ancestor) {
            if ((Get-Item -LiteralPath $ancestor).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Build destination must not contain a junction: $ancestor"
            }
        }
        $ancestor = [IO.Path]::GetDirectoryName($ancestor)
        if (-not $ancestor) {
            throw "Build destination escaped the client workspace: $resolved"
        }
    }
    if (-not (Test-Path -LiteralPath $source -PathType Container)) {
        throw "Build source directory is missing: $source"
    }
    Write-Host "[BUILD] Mirror: $source -> $resolved"
    & robocopy.exe $source $resolved /MIR /XJ /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -gt 7) {
        throw "Copy failed: $source (robocopy $LASTEXITCODE)"
    }
}

<#
核对本次新日志包含同一实现身份的全部构建阶段，返回实际证据。
身份由隔离扩展的常量导出，不能仅凭包版本或旧日志把未执行的扩展当作通过。
#>
function Get-BuildHookEvidence([string]$logFile, [object]$identity) {
    if (-not $identity.id -or -not $identity.version) {
        throw 'Build extension implementation identity is missing.'
    }
    $content = [IO.File]::ReadAllText($logFile)
    $stages = @('onBeforeBuild', 'onBeforeCompressSettings', 'onAfterBuild')
    foreach ($stage in $stages) {
        $expected = $identity.id + ' v' + $identity.version + '] ' + $stage
        if (-not $content.Contains($expected)) {
            throw "Current Creator log is missing the actual build hook: $expected"
        }
    }
    return [ordered]@{
        id = $identity.id
        version = $identity.version
        stages = $stages
    }
}

New-Item -ItemType Directory -Force -Path $workspace, $logs | Out-Null
$buildLock = [IO.File]::Open((Join-Path $logs 'build.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
try {
    $packageGenerator = Join-Path $repositoryRoot 'tools/generate_config_package.cjs'
    & node $packageGenerator --write
    if ($LASTEXITCODE -ne 0) {
        throw 'Configuration package generation failed; no sources were copied.'
    }
    $summaryJson = & node -e 'console.log(JSON.stringify(require(process.argv[1]).generateConfigPackage({check:true})))' $packageGenerator
    if ($LASTEXITCODE -ne 0) {
        throw 'Configuration package validation failed; no sources were copied.'
    }
    $packageSummary = $summaryJson | ConvertFrom-Json
    Write-Host '[BUILD] Copying sources to an isolated repository-shaped Creator project.'
    foreach ($directory in @('assets', 'settings', 'extensions', 'node_modules', 'tools')) {
        Sync-BuildDirectory (Join-Path $clientRoot $directory) (Join-Path $workspace $directory)
    }
    # 固定构建钩子沿用仓库相对路径；复制工具与其配置，不另列游戏模块或资源清单。
    Sync-BuildDirectory (Join-Path $repositoryRoot 'tools') (Join-Path $isolationRoot 'tools')
    Sync-BuildDirectory (Join-Path $repositoryRoot 'config') (Join-Path $isolationRoot 'config')
    foreach ($name in @('package.json', 'package-lock.json', 'tsconfig.json')) {
        Copy-Item -LiteralPath (Join-Path $clientRoot $name) -Destination $workspace -Force
    }
    $buildConfig = Join-Path $workspace 'remake-h5.build.json'
    $buildOptions | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $buildConfig -Encoding UTF8
    & node (Join-Path $isolationRoot 'tools/generate_config_package.cjs') --check
    if ($LASTEXITCODE -ne 0) {
        throw 'Copied configuration package is invalid; Creator was not started.'
    }
    $preparation = [ordered]@{
        application = 'mxzg-remake-h5-inputs'
        project = $workspace
        buildOutput = Join-Path $workspace 'build/remake-h5'
        published = $published
        buildConfig = $buildConfig
        resourceServer = $buildOptions.server
        configPackage = $packageSummary
    }
    $preparation | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $logs 'prepared.json') -Encoding UTF8
    if ($PrepareOnly) {
        Write-Host "[PREPARED] Isolated inputs validated: $workspace"
        return
    }

    $sourceCommit = & git -C $clientRoot rev-parse HEAD
    if ($LASTEXITCODE -ne 0) {
        throw 'Cannot identify the source commit; Creator was not started.'
    }
    $sourceDirty = [bool](& git -C $clientRoot status --porcelain -- assets settings package.json package-lock.json tools extensions ../tools ../config)
    if ($LASTEXITCODE -ne 0) {
        throw 'Cannot inspect the source working tree; Creator was not started.'
    }
    # 脚本摘要来自实际复制目录，取代旧的四个布阵文件固定名单。
    $sourceSha256 = [ordered]@{}
    $scriptsRoot = Join-Path $workspace 'assets/scripts'
    foreach ($inputFile in Get-ChildItem -LiteralPath $scriptsRoot -Filter '*.ts' -File -Recurse | Sort-Object FullName) {
        $relative = $inputFile.FullName.Substring($workspace.Length + 1).Replace('\', '/')
        $sourceSha256[$relative] = (Get-FileHash -LiteralPath $inputFile.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
    $stdout = Join-Path $logs 'creator.stdout.log'
    $stderr = Join-Path $logs 'creator.stderr.log'
    $extension = Join-Path $workspace 'extensions/mxzg-bag-build'
    $identityJson = & node -e 'const p=require(process.argv[1]);const i=require(process.argv[2]).implementationIdentity;if(!i||i.version!==p.version)process.exit(2);console.log(JSON.stringify(i));' (Join-Path $extension 'package.json') (Join-Path $extension 'build-hooks.cjs')
    if ($LASTEXITCODE -ne 0) {
        throw 'Cannot identify the copied build extension; Creator was not started.'
    }
    $buildIdentity = $identityJson | ConvertFrom-Json
    Write-Host "[BUILD] Creator 3.8.8 / web-mobile / Remake.scene. Logs: $logs"
    $arguments = @('--disable-gpu', '--project', ('"' + $workspace + '"'), '--build', ('"configPath=' + $buildConfig + '"'))
    $process = Start-Process -FilePath $CreatorPath -ArgumentList $arguments -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
    # 只等待主构建进程，避免 Electron 崩溃收集子进程导致脚本无法结束。
    $null = $process.Handle
    $process.WaitForExit()
    if ($process.ExitCode -ne 36) {
        Get-Content -LiteralPath $stdout -Tail 25
        Get-Content -LiteralPath $stderr -Tail 15
        throw "Creator build failed (exit $($process.ExitCode)). See $logs"
    }
    $result = Join-Path $workspace 'build/remake-h5'
    $hookEvidence = Get-BuildHookEvidence $stdout $buildIdentity
    $artifactChecker = Join-Path $workspace 'tools/config-package-build-check.cjs'
    $artifactJson = & node -e 'console.log(JSON.stringify(require(process.argv[1]).checkConfigPackageBuild(process.argv[2])))' $artifactChecker $result
    if ($LASTEXITCODE -ne 0) {
        throw 'Configuration package artifact validation failed; this build was not published.'
    }
    $configArtifact = $artifactJson | ConvertFrom-Json
    if ($configArtifact.version -ne $packageSummary.version) {
        throw 'The built configuration package does not match copied inputs; this build was not published.'
    }
    # 仍校验原始输出；不把缺包产物或未经钩子验收的字节拷贝为本地可运行版本。
    & $PythonPath (Join-Path $repositoryRoot 'tools/check_h5_artifact.py') $result
    if ($LASTEXITCODE -ne 0) {
        throw 'H5 artifact validation failed; this build was not published.'
    }
    Sync-BuildDirectory $result $published
    [ordered]@{
        application = 'mxzg-remake-h5'
        creator = '3.8.8'
        builtAt = [DateTime]::UtcNow.ToString('o')
        entryScene = 'db://assets/scenes/Remake.scene'
        sourceCommit = $sourceCommit
        sourceDirty = $sourceDirty
        sourceSha256 = $sourceSha256
        resourceServer = $buildOptions.server
        configPackage = $packageSummary
        configArtifact = $configArtifact
        buildHooks = $hookEvidence
    } | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $published 'mxzg-build.json') -Encoding UTF8
    Write-Host "[READY] H5 build published to $published"
} finally {
    $buildLock.Dispose()
}
