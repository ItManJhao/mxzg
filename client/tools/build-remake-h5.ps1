param([string]$CreatorPath = $env:MXZG_CREATOR_PATH)
$ErrorActionPreference = 'Stop'
$clientRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$workspace = Join-Path $clientRoot 'temp/remake-h5-project'
$published = Join-Path $clientRoot 'build/remake-h5'
$logs = Join-Path $clientRoot 'temp/remake-h5-build'
if (-not $CreatorPath) { $CreatorPath = 'C:/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe' }
if (-not (Test-Path -LiteralPath $CreatorPath -PathType Leaf)) {
    throw 'Creator 3.8.8 was not found. Set MXZG_CREATOR_PATH to its CocosCreator.exe.'
}
if ((Get-Item -LiteralPath $CreatorPath).VersionInfo.ProductVersion -ne '3.8.8') {
    throw 'This build configuration requires Creator 3.8.8.'
}

function Sync-BuildDirectory([string]$source, [string]$destination) {
    # /MIR removes stale destination files. Only these two ignored build roots are allowed.
    $resolved = [IO.Path]::GetFullPath($destination)
    $insideWorkspace = $resolved.StartsWith($workspace + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)
    if (-not $insideWorkspace -and $resolved -ne $published) { throw "Unsafe build destination: $resolved" }
    $ancestor = $resolved
    while ($ancestor -ne $clientRoot) {
        if (Test-Path -LiteralPath $ancestor) {
            if ((Get-Item -LiteralPath $ancestor).Attributes -band [IO.FileAttributes]::ReparsePoint) {
                throw "Build destination must not contain a junction: $ancestor"
            }
        }
        $ancestor = [IO.Path]::GetDirectoryName($ancestor)
        if (-not $ancestor) { throw "Build destination escaped the client workspace: $resolved" }
    }
    & robocopy.exe $source $resolved /MIR /XJ /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -gt 7) { throw "Copy failed: $source (robocopy $LASTEXITCODE)" }
}

New-Item -ItemType Directory -Force -Path $workspace, $logs | Out-Null
$buildLock = [IO.File]::Open((Join-Path $logs 'build.lock'), 'OpenOrCreate', 'ReadWrite', 'None')
try {
$sourceCommit = & git -C $clientRoot rev-parse HEAD
$sourceDirty = [bool](& git -C $clientRoot status --porcelain -- assets settings package.json tools)
Write-Host '[BUILD] Copying sources to an isolated Creator project; the active editor is not used.'
Sync-BuildDirectory (Join-Path $clientRoot 'assets') (Join-Path $workspace 'assets')
Sync-BuildDirectory (Join-Path $clientRoot 'settings') (Join-Path $workspace 'settings')
foreach ($name in @('package.json', 'tsconfig.json')) {
    Copy-Item -LiteralPath (Join-Path $clientRoot $name) -Destination $workspace -Force
}
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'remake-h5.build.json') -Destination (Join-Path $workspace 'remake-h5.build.json') -Force
$sourceSha256 = [ordered]@{}
foreach ($inputPath in @('assets/prefabs/ui/hero/HeroSelectLayer.prefab', 'assets/prefabs/ui/hero/HeroIconCell.prefab', 'assets/scripts/features/hero/ui/FormationView.ts', 'assets/scripts/features/hero/ui/FormationSlotView.ts')) {
    $sourceSha256[$inputPath] = (Get-FileHash -LiteralPath (Join-Path $workspace $inputPath) -Algorithm SHA256).Hash.ToLowerInvariant()
}
$stdout = Join-Path $logs 'creator.stdout.log'
$stderr = Join-Path $logs 'creator.stderr.log'
Write-Host "[BUILD] Creator 3.8.8 / web-mobile / Remake.scene. Logs: $logs"
$arguments = @('--disable-gpu', '--project', ('"' + $workspace + '"'), '--build', ('"configPath=' + (Join-Path $workspace 'remake-h5.build.json') + '"'))
$process = Start-Process -FilePath $CreatorPath -ArgumentList $arguments -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
# Start-Process -Wait also waits for Electron descendants such as crash handlers.
# Hold the main process handle instead; only its documented build exit code counts.
$null = $process.Handle
$process.WaitForExit()
# Creator documents 36 as successful command-line build, not 0.
if ($process.ExitCode -ne 36) {
    Get-Content -LiteralPath $stdout -Tail 25
    Get-Content -LiteralPath $stderr -Tail 15
    throw "Creator build failed (exit $($process.ExitCode)). See $logs"
}
$result = Join-Path $workspace 'build/remake-h5'
& python (Join-Path $clientRoot '../tools/check_h5_artifact.py') $result
if ($LASTEXITCODE -ne 0) { throw 'H5 artifact validation failed; this build was not published.' }
Sync-BuildDirectory $result $published
[ordered]@{
    application = 'mxzg-remake-h5'; creator = '3.8.8'; builtAt = [DateTime]::UtcNow.ToString('o')
    entryScene = 'db://assets/scenes/Remake.scene'; sourceCommit = $sourceCommit; sourceDirty = $sourceDirty
    sourceSha256 = $sourceSha256
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $published 'mxzg-build.json') -Encoding UTF8
Write-Host "[READY] H5 build published to $published"
} finally { $buildLock.Dispose() }
