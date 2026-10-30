# Process ownership checks shared by local stop/restart/status commands.
# A port number alone is never sufficient authorization to stop a process.
function Get-BackendListener([int]$Port) {
    $lines = & netstat.exe -ano -p tcp
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect local TCP listeners.' }
    $owners = @($lines | ForEach-Object {
        if ($_ -match ('^\s*TCP\s+\S+:' + $Port + '\s+\S+\s+LISTENING\s+(\d+)\s*$')) { [int]$Matches[1] }
    } | Select-Object -Unique)
    if ($owners.Count -gt 1) { throw "Multiple processes listen on port $Port; stop them manually." }
    if ($owners.Count -eq 1) { return $owners[0] }
    return $null
}

function Assert-WorkspaceBackend($Process, [string]$BackendRoot) {
    if (-not $Process -or $Process.Name -notin @('java.exe', 'javaw.exe') -or -not $Process.CommandLine) {
        throw 'Refusing to stop an unknown process: it is not an identifiable Java backend.'
    }
    $command = [string]$Process.CommandLine
    if ($command -notmatch '--spring\.profiles\.active=(?:"?local"?)(?=\s|$)') {
        throw 'Refusing to stop a backend without the local development profile.'
    }
    $backend = [IO.Path]::GetFullPath($BackendRoot).TrimEnd('\', '/')
    $owned = $false
    if ($command -match '-jar\s+(?:"([^"]+)"|(\S+))') {
        $jar = if ($Matches[1]) { $Matches[1] } else { $Matches[2] }
        if ([IO.Path]::IsPathRooted($jar)) {
            $expectedJar = Join-Path $backend 'target/mxzg-remake-0.1.0-SNAPSHOT.jar'
            $owned = [IO.Path]::GetFullPath($jar) -eq $expectedJar
        }
    } elseif ($command -match '(?:^|\s)com\.funsgamex\.mxzg\.GameApplication(?:\s|$)') {
        $classpath = $command
        if ($command -match '@(?:"([^"]+)"|(\S+))') {
            $argFile = if ($Matches[1]) { $Matches[1] } else { $Matches[2] }
            if (-not (Test-Path -LiteralPath $argFile -PathType Leaf)) { throw 'Backend argument file is unavailable; refusing to stop it.' }
            # Java argument files escape Windows backslashes inside quoted classpaths.
            $classpath = (Get-Content -LiteralPath $argFile -Raw).Replace('\\', '\')
        }
        $classes = (Join-Path $backend 'target/classes').Replace('/', '\')
        $owned = $classpath.Replace('/', '\') -match ([regex]::Escape($classes) + '(?=;|"|\s|$)')
    }
    if (-not $owned) { throw 'Refusing to stop a Java process that does not belong to this workspace backend.' }
}

function Stop-WorkspaceBackend([int]$Port, [string]$BackendRoot) {
    $ownerId = Get-BackendListener $Port
    if ($null -eq $ownerId) { Write-Host "[STOPPED] No backend listens on port $Port."; return }
    $backendProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerId" -ErrorAction Stop
    Assert-WorkspaceBackend $backendProcess $BackendRoot
    # Re-read identity before terminating, so a stale PID cannot stop a replacement process.
    $current = Get-CimInstance Win32_Process -Filter "ProcessId=$ownerId" -ErrorAction Stop
    if (-not $current -or $current.CreationDate -ne $backendProcess.CreationDate -or $current.CommandLine -ne $backendProcess.CommandLine) {
        throw 'Backend process changed while checking it; run the command again.'
    }
    # Identity was verified above; avoid an ownership confirmation prompt in a bat window.
    Stop-Process -Id $ownerId -Force -ErrorAction Stop
    $deadline = [DateTime]::UtcNow.AddSeconds(20)
    do {
        Start-Sleep -Milliseconds 200
        $remaining = Get-BackendListener $Port
        if ($null -eq $remaining) { Write-Host "[STOPPED] Workspace backend PID $ownerId; port $Port is free."; return }
        if ($remaining -ne $ownerId) { throw 'Another process took the backend port. It was not stopped.' }
    } while ([DateTime]::UtcNow -lt $deadline)
    throw "Port $Port did not close after stopping PID $ownerId."
}
