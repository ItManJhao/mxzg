<#
个人服清档适配器。桌面清档入口用配置定位原有项目、个人库及其 Java/H2。
个人服由开发者前台启动；此脚本等待原进程释放库，清档完成后交还给原启动入口。
#>

# 只接收现有本地普通文件，沿用入口统一的绝对路径及重解析点检查。
function Get-PersonalResetFile([string]$File, [string]$Purpose) {
    $resolved = Get-LocalResetPath $File
    if (-not [IO.File]::Exists($resolved)) {
        throw "$Purpose 文件不存在：$resolved"
    }
    return $resolved
}

# 优先采用原项目随附的 JDK，再使用 JAVA_HOME 或当前可执行路径。允许配置确切的 java.exe。
function Get-PersonalResetJava([string]$Backend, [string]$Explicit) {
    if ($Explicit) {
        $java = Get-PersonalResetFile $Explicit 'Java'
    } else {
        $local = Get-ChildItem -LiteralPath (Join-Path $Backend '.tools') -Directory -Filter 'jdk-*' -ErrorAction SilentlyContinue |
            Select-Object -First 1
        if ($local) {
            $java = Get-PersonalResetFile (Join-Path $local.FullName 'bin/java.exe') '项目 JDK'
        } elseif ($env:JAVA_HOME) {
            $java = Get-PersonalResetFile (Join-Path $env:JAVA_HOME 'bin/java.exe') 'JAVA_HOME'
        } else {
            $command = Get-Command java.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
            if (-not $command) { throw '请配置 JDK 21 的 javaPath 或 JAVA_HOME。' }
            $java = Get-PersonalResetFile $command.Source 'Java'
        }
    }
    if ([IO.Path]::GetFileName($java) -ine 'java.exe') {
        throw 'javaPath 必须指向 JDK 的 bin/java.exe。'
    }
    $jdk = [IO.Directory]::GetParent([IO.Path]::GetDirectoryName($java)).FullName
    $release = Get-PersonalResetFile (Join-Path $jdk 'release') 'JDK 版本'
    if ([IO.File]::ReadAllText($release) -notmatch '(?m)^JAVA_VERSION="21(?:\.|[+\-]|")') {
        throw "请为此项目选择 JDK 21：$java"
    }
    return $java
}

# 从项目声明或对应 Spring Boot BOM 取得 H2 版本；只在已核对的 Boot 4.1.2 上使用其固定版本。
function Get-PersonalH2Version($Pom, [string[]]$Repositories) {
    $h2 = $Pom.SelectSingleNode("/*[local-name()='project']/*[local-name()='dependencies']/*[local-name()='dependency'][*[local-name()='groupId']='com.h2database' and *[local-name()='artifactId']='h2']")
    if (-not $h2) { throw '项目 pom.xml 未声明 H2 运行依赖。' }
    $direct = $h2.SelectSingleNode("*[local-name()='version']")
    $property = $Pom.SelectSingleNode("/*[local-name()='project']/*[local-name()='properties']/*[local-name()='h2.version']")
    if ($direct -and $direct.InnerText -ne '${h2.version}') {
        $version = $direct.InnerText
    } elseif ($property) {
        $version = $property.InnerText
    } else {
        $parent = $Pom.SelectSingleNode("/*[local-name()='project']/*[local-name()='parent'][*[local-name()='groupId']='org.springframework.boot' and *[local-name()='artifactId']='spring-boot-starter-parent']/*[local-name()='version']")
        if (-not $parent -or $parent.InnerText -notmatch '^[0-9A-Za-z.-]+$') { throw '无法确定项目 Spring Boot 版本。' }
        $boot = $parent.InnerText
        $version = $null
        foreach ($repository in $Repositories) {
            $bom = Join-Path $repository "org/springframework/boot/spring-boot-dependencies/$boot/spring-boot-dependencies-$boot.pom"
            if ([IO.File]::Exists($bom)) {
                $model = [xml][IO.File]::ReadAllText((Get-LocalResetPath $bom))
                $entry = $model.SelectSingleNode("/*[local-name()='project']/*[local-name()='properties']/*[local-name()='h2.version']")
                if ($entry) { $version = $entry.InnerText; break }
            }
        }
        if (-not $version -and $boot -ceq '4.1.2') { $version = '2.4.240' }
    }
    if ($version -notmatch '^\d+\.\d+\.\d+$') { throw '无法从项目或对应 Spring Boot BOM 确定 H2 版本。' }
    return $version
}

# 查找与 Maven 实际依赖版本一致的驱动；显式路径及自动发现的文件都核对 JAR 内部版本。
function Get-PersonalResetDriver([string]$Backend, [string]$Explicit) {
    $repos = @((Join-Path ([Environment]::GetFolderPath('UserProfile')) '.m2/repository'),
               (Join-Path $Backend '.tools/maven-user/repository'))
    if ($env:MAVEN_USER_HOME) { $repos += Join-Path $env:MAVEN_USER_HOME 'repository' }
    $candidates = @()
    if ($Explicit) {
        $candidates += Get-PersonalResetFile $Explicit 'H2 驱动'
    } else {
        # Surefire 记录的真实 classpath 可找到开发者通过 settings.xml 定制的 Maven 仓库。
        $report = Get-ChildItem -LiteralPath (Join-Path $Backend 'target/surefire-reports') -Filter 'TEST-*.xml' -File -ErrorAction SilentlyContinue |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($report) {
            $xml = [xml][IO.File]::ReadAllText((Get-LocalResetPath $report.FullName))
            $cp = $xml.SelectSingleNode("//property[@name='java.class.path']/@value")
            if ($cp) {
                $candidates += @($cp.Value.Split(';') | Where-Object { $_ -match '[\\/]com[\\/]h2database[\\/]h2[\\/][\d.]+[\\/]h2-[\d.]+\.jar$' })
            }
        }
    }
    foreach ($file in $candidates) {
        if ($file -match '^(.+)[\\/]com[\\/]h2database[\\/]h2[\\/][^\\/]+[\\/]h2-[^\\/]+\.jar$') { $repos = @($Matches[1]) + $repos }
    }
    $pom = [xml][IO.File]::ReadAllText((Get-PersonalResetFile (Join-Path $Backend 'pom.xml') '后端 Maven 配置'))
    $version = Get-PersonalH2Version $pom $repos
    if (-not $Explicit) {
        $candidates = @($candidates | Where-Object { [IO.Path]::GetFileName($_) -ceq "h2-$version.jar" })
        foreach ($repository in $repos) { $candidates += Join-Path $repository "com/h2database/h2/$version/h2-$version.jar" }
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    foreach ($candidate in $candidates) {
        if (-not [IO.File]::Exists($candidate)) { continue }
        $path = Get-LocalResetPath $candidate
        $jar = [IO.Compression.ZipFile]::OpenRead($path)
        try {
            $manifest = $jar.GetEntry('META-INF/MANIFEST.MF')
            if (-not $manifest -or -not $jar.GetEntry('org/h2/Driver.class')) { throw "不是 H2 驱动：$path" }
            $reader = [IO.StreamReader]::new($manifest.Open())
            try { $text = $reader.ReadToEnd() } finally { $reader.Dispose() }
            if ($text -notmatch ('(?m)^Implementation-Version: ' + [regex]::Escape($version) + '\r?$')) {
                throw "H2 驱动与项目要求的 $version 不符：$path"
            }
        } finally { $jar.Dispose() }
        return $path
    }
    throw "请在个人配置 h2Jar 填写项目 Maven 仓库中的 h2-$version.jar 绝对路径。"
}

# 读取个人服配置并派生目标，只允许原有独立库和证书所在的同一个开发项目。
function Get-PersonalResetTarget($Settings) {
    $id = [string]$Settings.id
    $name = ([string]$Settings.name).Trim()
    if ($Settings.mode -cne 'personal' -or $id -cnotmatch '^dev-[a-z0-9][a-z0-9_-]{0,26}$' -or
        -not $name -or $name.Length -gt 64 -or $name -match '\p{Cc}') { throw '个人服身份或名称不正确。' }
    $address = [string]$Settings.address
    $ip = $null
    if (-not [Net.IPAddress]::TryParse($address,[ref]$ip) -or $ip.AddressFamily -ne 'InterNetwork' -or $ip.ToString() -cne $address) {
        throw 'address 必须是个人开发机的内网 IPv4。'
    }
    $bytes = $ip.GetAddressBytes()
    if (-not ($bytes[0] -eq 10 -or ($bytes[0] -eq 172 -and $bytes[1] -ge 16 -and $bytes[1] -le 31) -or
            ($bytes[0] -eq 192 -and $bytes[1] -eq 168))) { throw 'address 只接受内网 IPv4。' }
    $port = 0
    if (-not [int]::TryParse([string]$Settings.port,[ref]$port) -or $port -lt 1 -or $port -gt 65535) { throw '个人服端口范围是 1 至 65535。' }
    $origin = $null
    if (-not [Uri]::TryCreate([string]$Settings.sharedOrigin,[UriKind]::Absolute,[ref]$origin) -or $origin.Scheme -ne 'https' -or
            $origin.UserInfo -or $origin.Query -or $origin.Fragment -or $origin.AbsolutePath -ne '/' -or $origin.Host.Contains('*')) {
        throw 'sharedOrigin 必须是共享 H5 的完整 HTTPS 来源，例如 https://192.168.0.38:18082。'
    }
    $checkout = Get-LocalResetPath ([string]$Settings.checkout)
    $backend = Join-Path $checkout 'backend'
    $devScript = Get-PersonalResetFile (Join-Path $backend 'dev.ps1') '个人服启动脚本'
    $data = Join-Path $backend ".local/lan-personal/$id"
    $db = Get-PersonalResetFile (Join-Path $data 'game.mv.db') '个人服既有数据库'
    $null = Get-PersonalResetFile (Join-Path $data 'server.p12') '个人服证书'
    if ($Settings -is [Collections.IDictionary]) {
        $javaPath = $Settings['javaPath']
        $h2Jar = $Settings['h2Jar']
    } else {
        $javaProperty = $Settings.PSObject.Properties['javaPath']
        $driverProperty = $Settings.PSObject.Properties['h2Jar']
        $javaPath = if ($javaProperty) { $javaProperty.Value }
        $h2Jar = if ($driverProperty) { $driverProperty.Value }
    }
    $java = Get-PersonalResetJava $backend $javaPath
    $driver = Get-PersonalResetDriver $backend $h2Jar
    return [pscustomobject]@{ Mode='personal'; Id=$id; Name=$name; Address=$address; Port=$port; SharedOrigin=$origin.GetLeftPart([UriPartial]::Authority);
        Checkout=$checkout; DbFile=$db; DevScript=$devScript; Java=$java; Driver=$driver }
}

# 确认原个人服释放监听和数据库；用户可在原终端 Ctrl+C，满两分钟退出且保持现有数据。
function Wait-PersonalStop($Target) {
    $address = [Net.IPAddress]::Parse($Target.Address)
    $local = @([Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() | Where-Object { $_.OperationalStatus -eq 'Up' } |
        ForEach-Object { $_.GetIPProperties().UnicastAddresses } | Where-Object { $_.Address.Equals($address) })
    if (-not $local.Count) { throw "本机没有正在使用的地址 $address，请在目标开发机执行清档。" }
    $deadline = [DateTime]::UtcNow.AddMinutes(2)
    $notified = $false
    do {
        $listeners = @([Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties().GetActiveTcpListeners() | Where-Object {
            $_.Port -eq $Target.Port -and ($_.Address.Equals($address) -or $_.Address.Equals([Net.IPAddress]::Any) -or $_.Address.Equals([Net.IPAddress]::IPv6Any))
        })
        if ($listeners.Count -eq 0) {
            $file = Get-PersonalResetFile $Target.DbFile '个人服数据库'
            try {
                $handle = [IO.File]::Open($file,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::None)
                $handle.Dispose()
                return
            } catch [IO.IOException] {
                # 未监听时 Maven 或 H2 仍可能正启动或退出，继续等文件解锁。
            }
        }
        if (-not $notified) {
            Write-Host "请在原个人服终端按 Ctrl+C，等待 $($Target.Id) 停服。本窗口最多等待两分钟。"
            $notified = $true
        }
        Start-Sleep -Milliseconds 750
    } while ([DateTime]::UtcNow -lt $deadline)
    throw '个人服监听或数据库仍被占用。彻底停止原服务后再清档。'
}

# 在清档事务和互斥锁结束后，用原项目入口前台编译启动。证书口令由启动脚本当场读取。
function Start-PersonalResetTarget($Target) {
    $previousJava = $env:JAVA_HOME
    try {
        $env:JAVA_HOME = [IO.Directory]::GetParent([IO.Path]::GetDirectoryName($Target.Java)).FullName
        & $Target.DevScript personal -Id $Target.Id -Name $Target.Name -Address $Target.Address -Port $Target.Port -SharedOrigin $Target.SharedOrigin
    } finally { $env:JAVA_HOME = $previousJava }
}
