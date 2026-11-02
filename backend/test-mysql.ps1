<#
运行独立 MySQL 8.4 集成验证。必须显式提供官方 ZIP 解压目录，测试只创建新的专用实例。
不读取 MXZG_DATABASE_*、不连接已有服务、不安装系统服务；测试结束停止自己启动的进程并保留数据及归属记录。
#>
param([Parameter(Mandatory=$true)][string]$MysqlHome)
$ErrorActionPreference = 'Stop'
$mysqlRoot = (Resolve-Path -LiteralPath $MysqlHome).Path
if (-not (Test-Path -LiteralPath (Join-Path $mysqlRoot 'bin/mysqld.exe'))) { throw '需要 MySQL 8.4 Windows ZIP 解压目录。' }
$previousJavaHome = $env:JAVA_HOME
$previousPath = $env:PATH
$previousMavenHome = $env:MAVEN_USER_HOME
Push-Location -LiteralPath $PSScriptRoot
try {
    $jdk = if (Test-Path -LiteralPath '.tools') { Get-ChildItem -LiteralPath '.tools' -Directory -Filter 'jdk-*' | Select-Object -First 1 }
    if ($jdk) { $env:JAVA_HOME = $jdk.FullName }
    if ($env:JAVA_HOME) { $env:PATH = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:PATH }
    $env:MAVEN_USER_HOME = Join-Path $PSScriptRoot '.tools/maven-user'
    & .\mvnw.cmd '-Pmysql-it' "-Dmxzg.mysql.home=$mysqlRoot" test
    if ($LASTEXITCODE -ne 0) { throw "MySQL 集成验证失败（$LASTEXITCODE），查看 target/surefire-reports 和 target/mysql-it。" }
} finally {
    Pop-Location
    $env:JAVA_HOME = $previousJavaHome
    $env:PATH = $previousPath
    $env:MAVEN_USER_HOME = $previousMavenHome
}
