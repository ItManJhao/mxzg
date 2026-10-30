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
            $heroStatus = $null
            try {
                $heroProbe = Invoke-WebRequest -Uri "http://127.0.0.1:$backendPort/api/v1/heroes" -UseBasicParsing -TimeoutSec 3
                $heroStatus = [int]$heroProbe.StatusCode
            } catch {
                if ($_.Exception.Response) { $heroStatus = [int]$_.Exception.Response.StatusCode }
            }
            if ($heroStatus -eq 404) {
                throw "Port $backendPort is running an OLD backend: /api/v1/heroes returned HTTP 404. Stop the old backend (Ctrl+C in its window), then run this script again."
            }
            if ($heroStatus -eq 401) {
                $catalogStatus = $null
                $catalog = $null
                try {
                    $catalog = Invoke-RestMethod -Uri "http://127.0.0.1:$backendPort/api/v1/servers" -TimeoutSec 3
                    $catalogStatus = 200
                } catch {
                    if ($_.Exception.Response) { $catalogStatus = [int]$_.Exception.Response.StatusCode }
                }
                if ($catalogStatus -eq 404) {
                    throw "Port $backendPort is running an OLD backend: /api/v1/servers returned HTTP 404. Stop the old backend, then run this script again."
                }
                $catalogValid = $catalogStatus -eq 200 -and $catalog.Count -gt 0
                foreach ($server in $catalog) {
                    if (-not $server.id -or -not $server.regionId -or -not $server.regionName -or
                        -not $server.name -or $server.enabled -isnot [bool]) { $catalogValid = $false }
                }
                if ($catalogValid) {
                    $featuresReady = $true
                    foreach ($endpoint in @('inventory', 'campaign')) {
                        $featureStatus = $null
                        try {
                            $null = Invoke-WebRequest -Uri "http://127.0.0.1:$backendPort/api/v1/$endpoint" -UseBasicParsing -TimeoutSec 3
                        } catch {
                            if ($_.Exception.Response) { $featureStatus = [int]$_.Exception.Response.StatusCode }
                        }
                        if ($featureStatus -eq 404) {
                            throw "Port $backendPort is running an OLD backend: /api/v1/$endpoint returned HTTP 404. Stop the old backend, then run this script again."
                        }
                        if ($featureStatus -ne 401) { $featuresReady = $false }
                    }
                    if ($featuresReady) {
                        Write-Host "[READY] Remake backend is already running at http://127.0.0.1:$backendPort. Reusing the existing server."
                        Write-Host 'No second process was started. Closing this launcher will not stop the existing server.'
                        return
                    }
                }
            }
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
