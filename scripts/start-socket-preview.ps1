<#
长连接登录/背包的独立预览入口：先运行真实客户端联调，再使用已验证测试类路径启动内存 H2。
只监听本机随机端口；不读取日常玩家库，不修改场景默认开关。关闭此进程后测试数据消失。
#>
$ErrorActionPreference = 'Stop'
$socketBackend = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../backend'))
$socketJavaHomeBefore = $env:JAVA_HOME
$socketPathBefore = $env:PATH
$socketMavenBefore = $env:MAVEN_USER_HOME
Push-Location -LiteralPath $socketBackend
try {
    $socketJdk = Get-ChildItem -LiteralPath '.tools' -Directory -Filter 'jdk-*' | Select-Object -First 1
    if ($socketJdk) { $env:JAVA_HOME = $socketJdk.FullName }
    if ($env:JAVA_HOME) { $env:PATH = (Join-Path $env:JAVA_HOME 'bin') + ';' + $env:PATH }
    $env:MAVEN_USER_HOME = Join-Path $socketBackend '.tools/maven-user'
    & './mvnw.cmd' '-Dtest=GameSocketTest#typescriptLoginAndBagRoundTrip' test
    if ($LASTEXITCODE -ne 0) { throw 'Socket client integration failed; preview was not started.' }
    [xml]$socketReport = Get-Content -LiteralPath 'target/surefire-reports/TEST-com.funsgamex.mxzg.GameSocketTest.xml'
    $socketClasspath = ($socketReport.testsuite.properties.property | Where-Object name -eq 'java.class.path').value
    if (-not $socketClasspath) { throw 'Missing tested Java classpath.' }
    & java '-cp' $socketClasspath 'com.funsgamex.mxzg.SocketPreviewServer'
    if ($LASTEXITCODE -ne 0) { throw 'Isolated socket preview stopped with an error.' }
} finally {
    Pop-Location
    $env:JAVA_HOME = $socketJavaHomeBefore
    $env:PATH = $socketPathBefore
    $env:MAVEN_USER_HOME = $socketMavenBefore
}
