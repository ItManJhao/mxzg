# 本机起服（D1）

> **来源：** 本文按 2026-10-19《项目分析与启动指南》写成。端口、密码、路径和命令只取那份分析，不另补。  
> **D1 已在倩本机验证（2026-10-21，Asia/Shanghai）。** 双击 `scripts\start-local-server.bat`：`netstat` 见 TCP `11122`、TCP `9902`、WS `13101` 均在听，脚本打出「[启动成功]」。进度见本机 docs/mxzg-daily-progress.xlsx。  
> **cross 默认不启。** 游戏服连 `127.0.0.1:11422` 失败、中心服「游戏服加载跨服失败」类日志是预期，不算启动失败。分析里 cross 曾因讨伐团（`CRUSADE_GROUP_WORKER`）周期数据缺失而失败；单机只需 center + gameserver。  
> **客户端默认连真服。** 预览不必加 `?transport=ws`，走本机桥 `ws://127.0.0.1:13111/game`（转到 TCP 9902），不直连 13101。`?dev=mock` 才打开 Mock。日常双击一次 `scripts\start-local-all.bat`。只拉了客户端就刷新预览，不必重启服和桥。步骤见 `docs/h5-websocket.md`。D2 已在倩本机验证。

`server/` 仍是本机 junction，不在 Git 里。策划表在仓库 `config/gameconfig`（`F:\project\mxzg\config\gameconfig`）。`ip2region.db` 留在本机，不要推进 Git。

## 已经确定的路径

| 用途 | 路径 |
|------|------|
| 工程根 | `F:\project\mxzg` |
| 新客户端 | `F:\project\mxzg\client`（Creator 3.8.8 打开这个目录） |
| 策划表 | `F:\project\mxzg\config\gameconfig`（仓库内 `config/gameconfig`） |
| Java 服 junction | `F:\project\mxzg\server` → `F:\源码\mj\program\server` |
| 旧工程参考 | `F:\源码\mj\program` |
| 构建和启动的工作目录 | `F:\源码\mj\program\server`（与上面的 junction 是同一目录） |
| 分析里的一键 bat | `F:\源码\mj\program\start-services.bat`（在 `program` 目录，不在 `server` 里） |
| 本仓库一键启服 | 双击 `F:\project\mxzg\scripts\start-local-server.bat`。停止说明是 `scripts\stop-local-server.bat`。PowerShell 替代：`scripts/start-local-server.ps1`、`scripts/stop-local-server.ps1` |
| 本仓库日常（服 + 桥） | 双击一次 `scripts\start-local-all.bat`。9902 已在听就跳过游戏服，13111 已在听就跳过桥。停桥并看游戏服怎么停：`scripts\stop-local-all.bat` |
| 本仓库 WS 桥 | 游戏服起来之后双击 `scripts\start-ws-bridge.bat`。听 `ws://127.0.0.1:13111/game`，原字节转到 TCP `127.0.0.1:9902`。停止是 `scripts\stop-ws-bridge.bat`（不关游戏服）。13101 仍是游戏服自带口，D1 要看到它在听；H5 不要连它 |
| JDK 1.8 | `C:\dev\jdk1.8`（Temurin 1.8.0_504） |
| Maven 3.6.3 | `C:\dev\maven`（已配 `JAVA_HOME`、`MAVEN_HOME`、`PATH`） |
| MySQL 8.0.29 | `C:\dev\mysql`（Windows 服务 `MySQL80`，开机自启） |
| Redis 5.0.14 | `C:\dev\redis`（Windows 服务 `RedisDev`，开机自启） |
| 服读的策划表 | `F:\project\mxzg\config\gameconfig` |
| 策划表来源 | `F:\FansGameX\mxzg-h5\配置表\shared-config`（534 张，已复制服务端要的 232 张） |
| IP 归属地库 | `F:\mxzg-local\ip2region.db` |
| Maven 镜像 | `~/.m2/settings.xml` |
| 开服日口径 | `docs/day60-open-server.md`：开服当天 = 第 1 天 |

`.gitignore` 忽略 `/config/*` 和 `/server/`，但保留 `/config/gameconfig/`。`ip2region.db` 不进 Git。

服读的是 `F:\project\mxzg\config\gameconfig` 里的 xlsx，不是客户端导出的 JSON。properties 写绝对路径 `F:\\project\\mxzg\\config\\gameconfig`。服进程若从仓库根启动，也可以指相对的 `config/gameconfig`，只要读到同一批文件。`ip2region.file` 仍指向本机库，例如 `F:\\mxzg-local\\ip2region.db`。

## 客户端默认仍是 Mock

不加参数时，预览不需要起服。

- Boot 走 `mock://`，`MockTransport` 里一份 `MockGameSession`。
- 协议在 `client/assets/scripts/net/protocol/`。`CmdId` 是客户端占位号，**不是**旧服消息号。限时活动是 `2801`–`2804`，同样是占位。心跳占位是 **1002**。旧桥日志里的心跳是 **1004**，不要混。
- 编解码仍是明文对象。`?transport=ws` 不把 `encodeRequest` 的对象写到线上，只写旧桥日志里的长度前缀帧，经 `13111/game` 转到 TCP 9902。调用方继续用 `Proto.*` 走 Mock。
- 细节见 `docs/protocol-stubs.md`、`docs/mock-replay.md`、`docs/h5-websocket.md`。怎么把预览接到本机服、以及哪条协议灌进客户端 `GameStore`，见 `docs/local-link-and-store.md`。

D2 已在倩本机验证：`?transport=ws` 经桥 13111 看到 `收到 s2c 1001`。有角色会进主城壳。s2c 2001 的字段 9、6、2、1 同步角色名、等级、金币和钻石。缺字段仍是未同步，不当成 Mock 进度。开服天仍未同步。s2c 3007 的字段 2、3 只改主城「更多」里「主线」按钮上的 idx，点进去仍不打开 Mock 关卡页。空 c2s 3004 在 3007 之后发，挂机页只展示这一包的时间；没有数据时 Toast「真服挂机未同步」。3005 不改金币。细节见 `docs/h5-websocket.md`。

2026-10-19 另有一套旧 H5，目录是 `F:\FansGameX\mxzg-h5\客户端\web`。`serve.ps1` 听 `127.0.0.1:8080`，`dev-platform.ps1` 听 `127.0.0.1:18070`，页面上的 WebSocket `/game/9902` 由 `serve.ps1` 桥到游戏服 TCP `9902`。那是旧客户端。本仓库不启动那两个脚本，自己在 `scripts\start-ws-bridge.bat` 里做同样的字节转发，口改成 `13111/game`。

## 建议的联调顺序

进度见本机 docs/mxzg-daily-progress.xlsx。第 1 步的命令在后面几节；后面几步仍是接协议的顺序，D1 不做。

1. 在本机把 `server` junction 指到的 Java 工程跑起来，确认进程在听端口。
2. 登录。客户端现在的 `login` / `role.enter` / `role.create` 先对齐字段，再改占位 ID。
3. 进主城。顶栏要能读到角色名、等级、金币、钻石、开服天。
4. 主线 `stage.enter` / `stage.result`。
5. 背包，然后一次只接一个系统。限时活动、礼包、商店都先留在 Mock，等登录到主城稳定后再换。

开服自然日用旧服 `ServerParamService.getOpenDays()`，不要用角色登录天代替。七日登录看的是角色登录天，和开服天是两套。2026-10-19 的分析没有写怎样把 `getOpenDays()` 调成第 1 天，本文不补命令。

## 2026-10-19 那次的结果

分析第十节记的是当天已经发生的事，不是 2026-10-21 的复验。

| 进程 | 结果 |
|------|------|
| `mxzg-center` | 成功。HTTP `9801`，TCP `11122` |
| `mxzg-gameserver` | 成功。TCP `9902`，WS `13101`，HTTP `9804` |
| `mxzg-cross` | 失败。讨伐团（`CRUSADE_GROUP_WORKER`）周期数据缺失，跨服玩法数据问题 |
| `mxzg-large-cross` | 未启动。分析写「同上」 |

单机玩只需要 center 和 gameserver。cross、large-cross 可以不启。

为了那天能编译、能启动，分析在服目录里做了 3 处改动（都在 junction 那边，不在本 Git 仓库）：

1. `mxzg-common` 补了仓库漏交的 `RandomUtils.java`，否则编译不过（见 Q8）。
2. gameserver 的 `application.properties`：`sensitive.server.lang` 去掉方括号；`sub.server.id` 保留方括号；`network.webSocket.sslFile` 和 `sslPassword` 置空（见 Q11、Q12）。
3. 配置表 `floatingislandstime.xlsx` 删掉重复的 stage 行（见 Q10）。

当天自动建出的表数量：`mxzg_center_data` 6 张，`mxzg_1_data` 244 张，`mxzg_1_log` 52 张，`mxzg_cross_data` 36 张。不需要手工建表 SQL。

## 前置软件

分析要求，且当天已经装好：

- JDK **1.8**。不能用更高版本。Spring Boot 2.1 对高版本 JDK 有兼容问题。路径 `C:\dev\jdk1.8`。
- Maven **3.6+**。当天是 3.6.3，路径 `C:\dev\maven`。`JAVA_HOME`、`MAVEN_HOME`、`PATH` 已配过。
- MySQL **8**。当天是 8.0.29，路径 `C:\dev\mysql`，服务名 `MySQL80`，开机自启，账号 `root` / `123456`。
- Redis。版本不限，客户端是 Lettuce。当天是 5.0.14，路径 `C:\dev\redis`，服务名 `RedisDev`，开机自启。
- `config.path` 指向的 Excel 目录存在，且里面是完整策划表。
- `ip2region.db` 存在。
- 本机能解析 `center.server.host`、`redis.host`、`platform.uri`。本机步骤把前两个写成 `127.0.0.1`。模板里的 `platform.uri` 是 `http://192.168.0.131:8070/`，步骤 4 没有要求改它。

技术栈（只作对照）：Java 8、Spring Boot 2.1.9、Maven 多模块、自研 Netty + Protostuff、MySQL 8 + Druid、Redis（Lettuce）、Protobuf 2.6.1。私有 Nexus 是 `http://192.168.1.131:8081`，外网不可达，构建改用下面的阿里云镜像。

## 工作目录

命令都在 `F:\源码\mj\program\server` 下执行。`F:\project\mxzg\server` 是指到这里的 junction，进哪一个都是同一目录。分析里的 `cd program/server` 就是这个目录。

不要在本 Git 仓库里找 `mxzg-server` 源码，GitHub 上没有这份服。

## 日常：服和桥一起开

第 3、4、5 节的构建和配置仍要先做完一次。之后每天双击一次：

```
F:\project\mxzg\scripts\start-local-all.bat
```

它另开一扇窗口跑 `start-local-server.bat`（center、gameserver 仍是各自的窗口），等到 TCP `9902` 后再另开一扇窗口跑 `start-ws-bridge.bat`。`9902` 已经在听就写明不再启动第二个游戏服。`13111` 已经在听就不再启动第二个桥。只拉了客户端代码时，这两边都留着，刷新 Creator 预览即可，不必重启。

中文 Windows 的 Windows PowerShell 5.x 把没有 UTF-8 BOM 的 `.ps1` 按系统 ANSI（GBK）读。UTF-8 中文会被拆字节，句末的 `'` 可能被吃掉。双击 `start-local-all.bat` 若报 ParserError（Unexpected token、缺少 `)`、数组下标缺失、字符串没有结束符），窗口里的中文是乱码，先确认 `scripts/start-local-all.ps1` 和 `scripts/stop-local-all.ps1` 仍是 UTF-8 带 BOM（文件头 `EF BB BF`）。临时绕开：先双击 `scripts\start-local-server.bat`，等 TCP `9902` 起来后再双击 `scripts\start-ws-bridge.bat`。

停桥，并打印游戏服原来的停止说明（不结束 center / gameserver，也不结束别的进程）：

```
F:\project\mxzg\scripts\stop-local-all.bat
```

PowerShell 替代是 `scripts/start-local-all.ps1` 和 `scripts/stop-local-all.ps1`。只要游戏服、不要桥时，仍用下面的 `start-local-server.bat`。

## 一键启服

第 3、4 节的构建和配置仍要先做完一次。第 5 节的 `mvn -o dependency:copy-dependencies` 也要先做过，`target\lib` 里要已经有依赖。脚本放在本仓库，不放进 junction。

双击这个文件（拉完代码后的路径）：

```
F:\project\mxzg\scripts\start-local-server.bat
```

也可以在 `F:\project\mxzg` 的命令行里执行 `scripts\start-local-server.bat`。这是纯 bat，不经过 PowerShell。失败会 `pause`，成功也会 `pause`，避免双击后窗口立刻关掉，看不到中文报错或停止说明。

它会：

- 设 `JAVA_HOME=C:\dev\jdk1.8`，并把 `%JAVA_HOME%\bin` 加到 `PATH` 前面。先确认 `%JAVA_HOME%\bin\java.exe` 存在，再看 `java -version` 里有没有 `1.8`。
- 服目录优先 `F:\源码\mj\program\server`，没有再用 junction `F:\project\mxzg\server`。启动用的 `ROOT` 是这下面的 `mxzg-server`。
- 看端口 `3306`（MySQL，`127.0.0.1:3306`）和 `11001`（Redis，`127.0.0.1:11001`）是否已在听。分析没有写出如何启动服务 `MySQL80`、`RedisDev`，脚本不启动它们；不在听就用中文退出。
- 检查 `target\lib`，以及 `target\classes` 里的 properties 和启动类。中心服要有 `application.properties`、`database.properties`、`com\ayjs\mxzg\center\CenterBootstrap.class`。游戏服要有 `application.properties`、`database-game.properties`、`database-log.properties`、`com\ayjs\mxzg\gameserver\Bootstrap.class`。缺了就退出。不代做构建，不改配置，也不跑 `mvn`。
- 端口已经在听就跳过，不另开一个进程。旧 `start-all.bat` 会 `taskkill`。这个 bat 默认不结束已有进程。窗口没了但仍占端口时用 Q7，脚本自己不执行。
- `start "mxzg-center" cmd /k`，命令与第 5.1 节相同：`java -Xms512m -Xmx2048m -cp "target/classes;target/lib/*" com.ayjs.mxzg.center.CenterBootstrap`。等到 TCP `11122` 和 HTTP `9801`，再同样方式启动 `com.ayjs.mxzg.gameserver.Bootstrap`，等到 TCP `9902` 和 WS `13101`。分析没有写启动要等多久。两个端口共用最多约 180 秒（与 `start-local-server.ps1` 的上限相同）。
- 默认不启 cross，不启 large-cross。不启旧 H5 的 `dev-platform.ps1` / `serve.ps1`，也不开浏览器。Creator 默认连真服，经 13111 桥接游戏服。`?dev=mock` 才打开 Mock。
- 起来之后按第 7 节检查。调用 `curl.exe`，最多 10 秒，并执行 `netstat -ano | findstr "11122 9902 13101"`：

```
curl.exe -fsS --max-time 10 http://127.0.0.1:9801/actuator/health
curl.exe -fsS --max-time 10 http://127.0.0.1:9804/actuator/health
netstat -ano | findstr "11122 9902 13101"
```

一键脚本（bat 和 ps1）的成功标准只看三个端口：center 的 TCP `11122`、gameserver 的 TCP `9902`、gameserver 的 WS `13101`。三个都在听就打印成功并 `pause`（ps1 直接退出码 0）。

`http://127.0.0.1:9801/actuator/health` 若返回 HTTP 404，只要 9801 端口在听，脚本只打警告：actuator 可能不存在。这不导致启动失败。`http://127.0.0.1:9804/actuator/health` 失败同样只警告；三个关键端口已在听时，不因此判失败。

没启动 cross 时，gameserver 窗口里「远程服务器 127.0.0.1:11422 连接失败」，center 窗口里「游戏服加载跨服失败」，是预期日志。脚本不读这些日志，也不把它们当失败。

停止仍是分析里的做法：在该窗口输入 `stop` 回车。顺序是先 gameserver，再 center。本 bat 不打开 cross。若另外开了 cross，顺序是 gameserver、cross、center。分析没有写出从别的窗口代输入 `stop` 的命令，所以停止脚本不结束进程：

```
F:\project\mxzg\scripts\stop-local-server.bat
```

PowerShell 仍可用。执行策略只放宽这一次，不改系统策略。`start-local-server.ps1` 会自己跑第 5 节的 `mvn -o dependency:copy-dependencies`，Java 固定用 `C:\dev\jdk1.8\bin\java.exe`。要启 cross 才加 `-IncludeCross`。bat 没有这个开关。

```
powershell -NoProfile -ExecutionPolicy Bypass -File F:\project\mxzg\scripts\start-local-server.ps1
```

`stop-local-server.ps1` 和 `start-local-server.ps1 -Stop` 同样只打印停止说明。

分析里的 `F:\源码\mj\program\start-services.bat` 仍会各开一个窗口。2026-10-21 倩本机用本仓库 `start-local-server.bat` 验证：11122、9902、13101 在听即成功；9801 的 `/actuator/health` 可能 404（只警告）。没启 cross 时 11422 / 跨服日志噪声是预期。

## 1. MySQL

先确认 Windows 服务 `MySQL80` 在跑。分析写它开机自启，没有另给启动命令。

库（都在 `127.0.0.1:3306`）：

| 谁用 | 库 | 配置文件 |
|------|----|----------|
| center | `mxzg_center_data` | `database.properties` |
| gameserver（`server.id` 默认 1） | `mxzg_1_data` 和 `mxzg_1_log` | `database-game.properties`、`database-log.properties` |
| cross | `mxzg_cross_data` | `database.properties` |
| large-cross | `mxzg_cross_data`（和 cross 同一个库） | 同 cross |

账号：各服务模板用户名都是 `root`。center、gameserver 模板密码是 `123456`。cross、large-cross 模板密码写的是 `root`。本机统一用 `123456` 时，把 cross、large-cross 的密码也改成 `123456`。

分析给出的 URL 形态（问号后的其余参数沿用 `.temp`，分析只写出时区）：

```
url=jdbc:mysql://127.0.0.1:3306/mxzg_center_data?...&serverTimezone=GMT%2B8
username=root
password=123456
```

gameserver 把库名换成 `mxzg_1_data`、`mxzg_1_log`，cross / large-cross 换成 `mxzg_cross_data`。Druid 模板值：`initialSize=5`、`maxActive=50`、`minIdle=10`。

不需要手工执行建表 SQL。服务启动时 `JDBCRepository` 按实体建表。

## 2. Redis

先确认 Windows 服务 `RedisDev` 在跑。分析写它开机自启，不用再手动拉进程。

本机 properties：

```
spring.redis.host=127.0.0.1
spring.redis.port=11001
spring.redis.password=^-^ayjsgame!@#redis&201912
```

端口是 `11001`，不是 6379。密码与模板相同。模板里的 host 是 `192.168.0.131`，本机改成 `127.0.0.1`。

## 3. 构建

### 3.1 阿里云镜像

pom 声明了内网 Nexus `http://192.168.1.131:8081`。外网会卡住。先在 `~/.m2/settings.xml` 写上：

```xml
<mirrors>
  <mirror>
    <id>aliyun-public</id>
    <url>https://maven.aliyun.com/repository/public</url>
    <mirrorOf>*</mirrorOf>
  </mirror>
</mirrors>
```

`game.common.version=1.3.3` 只定义了属性，没有依赖引用它，不需要这个包。

### 3.2 顺序

先装三个独立工程，再打包主工程。分析里的第一行 `cd program/server` 就是 `F:\源码\mj\program\server`。在这个目录执行后面四行：

```
cd mxzg-agent  && mvn clean install && cd ..
cd mxzg-common && mvn clean install && cd ..
cd mxzg-rpc    && mvn clean install && cd ..
cd mxzg-server && mvn clean package
```

各 pom 已经写了 `maven.test.skip=true`，命令里不要再加 `-Dmaven.test.skip=true`。PowerShell 会把未加引号的参数拆开，报 `Unknown lifecycle phase '.test.skip=true'`。真要传就整段加引号：`"-Dmaven.test.skip=true"`。

编译若报找不到 `com.ayjs.mxzg.common.util.RandomUtils`，先按 Q8 补类，再从 `mxzg-common` 重新 `mvn clean install`。

产物是瘦包，只有本模块的 class，没有 `Main-Class`，也没有依赖：

- `mxzg-server/mxzg-center/target/mxzg-centerserver.jar`
- `mxzg-server/mxzg-gameserver/target/mxzg-gameserver.jar`
- `mxzg-server/mxzg-cross/target/mxzg-crossserver.jar`
- `mxzg-server/mxzg-large-cross/target/mxzg-large-cross-server.jar`

不要用 `java -jar` 跑这些文件。

## 4. 配置

模块只带 `.temp`。运行前要有同名最终文件。分析没有给出这步的复制命令，在各模块的 `src/main/resources/` 里把模板复制成最终文件名即可。`log4j2.xml` 直接用，不用复制。

每个要启动的模块：

- `application.properties.temp` → `application.properties`
- `database.properties.temp` → `database.properties`

gameserver 另外两份：

- `database-game.properties.temp` → `database-game.properties`
- `database-log.properties.temp` → `database-log.properties`

分析第十节还记录：cross 和 large-cross 已有 `database-log.properties`；gameserver 还有 `application-dev.properties`。分析没有写这两份的 temp 文件名。目录里已经有就保留，不要新造。模板里有 `spring.profiles.active=dev`。

运行时读的是 `target/classes` 里的同名文件。第十节说当天已经同步过去。改完 `src\main\resources` 后按 Q13 再复制，或重新 `mvn package`。

### 4.1 本机要写成的值

下面是步骤 4 和第十节给出的本机值。`config.path` 的反斜杠按分析原文写成双反斜杠。`ip2region.file` 的文件位置是 `F:\mxzg-local\ip2region.db`，properties 里用同样的双反斜杠写法。

center 和 gameserver 都要：

```
network.tcpSocket.ip=0.0.0.0
config.path=F:\\project\\mxzg\\config\\gameconfig
ip2region.file=F:\\mxzg-local\\ip2region.db
spring.redis.host=127.0.0.1
spring.redis.port=11001
spring.redis.password=^-^ayjsgame!@#redis&201912
```

库文件按第 1 节写到 `127.0.0.1:3306`，`username=root`，`password=123456`。

**中心服**的 TCP 用分析默认。步骤 4 把 `network.tcpSocket.port=9902` 写进本机字段，并注「每个实例端口不同」。第四节和步骤 5 把中心服默认口写成 `11122`，所以 `9902` 只写进 gameserver：

```
network.tcpSocket.port=11122
server.port=9801
```

步骤 5 写明中心服 TCP 听 `network.tcpSocket.port`，默认 `11122`。看到日志 `Center Server started...` 表示中心服起来了。

**游戏服**另写：

```
server.id=1
network.tcpSocket.port=9902
network.webSocket.port=13101
center.server.host=127.0.0.1
center.server.port=11122
sensitive.server.lang=1,2
sub.server.id=[1005,1105,7,8,9,10]
network.webSocket.sslFile=
network.webSocket.sslPassword=
```

`server.id=1` 对应库 `mxzg_1_data`、`mxzg_1_log`。多开区服就换 `server.id` 和 `network.tcpSocket.port`。模板示例 `server.id=1001` 不是这套已建库。

`sensitive.server.lang` 不能带方括号。`sub.server.id` 必须带方括号。两边的理由在 Q11。

游戏服 HTTP：第四节模板写 `server.port=9801`，第十节本机验证写成 **9804**。分析没有写出是哪一行改成 9804。校验时 center 看 9801，gameserver 看当天记下的 9804。本机若仍绑在别的口，以 netstat 为准，不要为了凑 9804 去发明一行分析里没有的配置。

**cross / large-cross**（可跳过）：同一组本机地址（`127.0.0.1`、`config.path`、Redis、`ip2region.file`），库 `mxzg_cross_data`，密码改成 `123456`。它们的 TCP 端口分析只写「配置」，本文不补数字。模板里 gameserver 去连大型跨服的项是 `large.server.host=192.168.0.140`、`large.server.port=11422`。步骤 4 没有要求改这两项。

步骤 4 没有要求改、就留在 `.temp` 里的还有：`server.debug=true`、`gm.cmd.open=true`、`server.platformId=1`、`server.lang=3`（1=cn，2=繁体，3=印尼，4=en，5=jp，6=kor，7=越南，8=泰国）、`network.tcpSocket.threads=10`、`network.tcpSocket.idle=60`、`platform.key=^-^ywgame!@#api`、`platform.uri=http://192.168.0.131:8070/`、`log.to.db=true`、`log.to.file=true`、`log.to.file.dir=gamelog`。center / cross / large-cross 的库文件键是 `database.game.file=classpath:database.properties`。gameserver 是 `database.game.file=classpath:database-game.properties` 和 `database.log.file=classpath:database-log.properties`。

模板里出现过、本机不要照抄的地址：TCP IP `192.168.0.199`、Redis `192.168.0.131`、策划表 `D:\config\gameconfig\config-test-xlsx`。

## 5. 启动

外部依赖先就绪，然后按这个顺序：MySQL、Redis → center →（可选）cross →（可选）large-cross → gameserver。

四个服的启动类都是同一套：`SpringApplication.run`，`DataSourceInitializer`，按 `Lifecycle` 拉起 RPC / TCP / 调度，注册 JVM 关闭钩子。Windows 下 `listenInput()` 接受输入 `stop`。

产物是瘦包。先把依赖拷到 `target/lib`，再用 classpath 启动。前面已经 `mvn` 过，依赖在本地仓库，所以 `copy-dependencies` 用 `-o`。`-D` 在 PowerShell 里要加引号。classpath 分隔符用分析里的分号（Windows）。

下面的 `cd` 相对 `F:\源码\mj\program\server`。构建结束时目录可能停在 `mxzg-server`，先回到 `F:\源码\mj\program\server` 再执行。

### 5.1 中心服

```
cd mxzg-server/mxzg-center
mvn -o dependency:copy-dependencies "-DoutputDirectory=target/lib"
java -Xms512m -Xmx2048m -cp "target/classes;target/lib/*" com.ayjs.mxzg.center.CenterBootstrap
```

成功日志：`Center Server started...`。TCP 默认 `11122`，HTTP `9801`。

### 5.2 跨服（可跳过）

单机可以不启。2026-10-19 这一步失败，原因是讨伐团周期数据，不是端口。

```
cd mxzg-server/mxzg-cross
mvn -o dependency:copy-dependencies "-DoutputDirectory=target/lib"
java -Xms512m -Xmx2048m -cp "target/classes;target/lib/*" com.ayjs.mxzg.cross.CrossBootstrap
```

大型跨服同样方式，启动类是 `com.ayjs.mxzg.largecross.LargeCrossBootstrap`。当天没有启动它。

旧 H5 日志里每 5 秒一次「连接 127.0.0.1:11422 失败」，分析解释为 `mxzg-cross` 没启动，不影响单机。

### 5.3 游戏服

center 起来之后再开。

```
cd mxzg-server/mxzg-gameserver
mvn -o dependency:copy-dependencies "-DoutputDirectory=target/lib"
java -Xms512m -Xmx2048m -cp "target/classes;target/lib/*" com.ayjs.mxzg.gameserver.Bootstrap
```

它会连 `center.server.host:center.server.port`，也就是 `127.0.0.1:11122`。

### 5.4 一键脚本

分析里还可以双击 `F:\源码\mj\program\start-services.bat`。它会依次打开 center 和 gameserver，各一个窗口，不含 cross。本仓库双击 `F:\project\mxzg\scripts\start-local-server.bat`，用的是第 5.1 节和第 5.3 节同一套 classpath 命令。细节见上面「一键启服」。

### 5.5 仓库里的 Linux 部署（不要拿来在本机跑）

原始部署在 Linux 上，由 `mxzg-deploy` 组装：`template/` 是模板（lib、启动脚本、配置模板），`serverconfig.txt` 是每个区服的 JSON（id、tcpPort、webPort、数据库地址）。`Deployer` 复制成 `service_1`、`service_2` 等，替换 `##tcpPort##`、`##gameDbUrl##` 这类占位符。`template/` 里的 lib 和启动脚本没有提交。本机用上面的 classpath。

## 6. 端口

| 服务 | 启动类 | HTTP | TCP | WebSocket |
|------|--------|------|-----|-----------|
| center | `com.ayjs.mxzg.center.CenterBootstrap` | `9801` | `11122` | 无 |
| gameserver | `com.ayjs.mxzg.gameserver.Bootstrap` | 模板 `9801`；2026-10-19 实测 `9804` | `9902` | `13101` |
| cross | `com.ayjs.mxzg.cross.CrossBootstrap` | 模板 `9801` | 分析只写「配置」 | 无 |
| large-cross | `com.ayjs.mxzg.largecross.LargeCrossBootstrap` | 模板 `9801` | 分析未单列监听口；模板里 gameserver 去连的是 `11422` | 无 |

本仓库 H5 的 `?transport=ws` 接 `scripts\start-ws-bridge.bat`（`13111/game` → TCP `9902`），不直连游戏服 WS `13101`。D1 的成功标准仍包含 13101 在听。center 给 gameserver / cross 连的口是 TCP `11122`。

## 7. 验证

分析步骤 8 的 HTTP 检查（各服务都有 actuator）：

```
curl http://127.0.0.1:9801/actuator/health
```

第十节把 gameserver 的 HTTP 记成 `9804`，路径仍是这个 actuator：

```
curl http://127.0.0.1:9804/actuator/health
```

TCP / WebSocket 监听：

```
netstat -ano | findstr "11122 9902 13101"
```

这条 `findstr` 不含 `9801`、`9804`、`3306`、`11001`。HTTP 用上面的 curl。

一键脚本认成功，只要求 `netstat` 里同时有 `11122`、`9902`、`13101`。9801 端口在听但 `/actuator/health` 返回 404 时，脚本警告 actuator 可能不存在，不因此失败。9804 的 curl 失败也只警告。

**2026-10-21（倩本机）** 已对照下面清单完成 D1 验证（cross 未启，11422 相关日志按预期忽略）：

- [x] `MySQL80`、`RedisDev` 已在跑
- [x] center 日志有 `Center Server started...`
- [x] `curl http://127.0.0.1:9801/actuator/health`：端口在听但返回 404 只是警告，不单独挡住一键脚本
- [x] gameserver 已启动；`curl http://127.0.0.1:9804/actuator/health` 失败只警告，不单独挡住一键脚本
- [x] `netstat -ano | findstr "11122 9902 13101"` 能看到 center 的 `11122`、gameserver 的 `9902` 和 `13101`
- [x] 新客户端预览仍走 Mock，没有改去连 `13101`

cross 失败不挡住这张清单。单机不要求它在听。游戏服日志里连接 `127.0.0.1:11422` 失败，以及中心服日志里游戏服加载跨服失败，是没启动 cross 时的预期。

## 8. 停止

Windows：在该服务的命令行窗口输入 `stop` 然后回车。`scripts\start-local-server.bat` 和 `scripts/start-local-server.ps1` 开出的窗口同样如此。`scripts\stop-local-server.bat`、`scripts/stop-local-server.ps1` 和 `start-local-server.ps1 -Stop` 只打印顺序，不结束进程。

停止顺序与启动相反：gameserver → large-cross → cross → center。

分析把 Linux 的停法写成 `kill <pid>`。本机是 Windows，用 `stop`。端口被占时用 Q7。

## 坑（Q1–Q13）

| | 现象 | 处理 |
|--|------|------|
| Q1 | `Could not find artifact com.ayjs.mxzg:mxzg-common` | 先在 `F:\源码\mj\program\server` 对 `mxzg-agent`、`mxzg-common`、`mxzg-rpc` 执行 `mvn clean install`，再构建 `mxzg-server` |
| Q2 | 依赖下载卡住，或 Nexus 超时 | 内网 `http://192.168.1.131:8081` 外网不可达。用第 3.1 节的阿里云 `<mirrorOf>*</mirrorOf>`。`game.common.version=1.3.3` 没有被引用 |
| Q3 | `DataSource` 初始化失败 | 查 `database*.properties` 的地址、账号、库名，以及 MySQL 是否已启动 |
| Q4 | gameserver 连不上 center | 查 `center.server.host` / `center.server.port`。center 要先起来，防火墙不要拦它的 TCP |
| Q5 | `config.path` 找不到配置 | 目录必须存在，且含策划 Excel。本机是 `F:\project\mxzg\config\gameconfig` |
| Q6 | Redis 超时 | `spring.redis.host` / `port` / `password` 要和 Redis 一致。本机是 `127.0.0.1`、`11001`、`^-^ayjsgame!@#redis&201912` |
| Q7 | 端口被占用 | `netstat -ano \| findstr <port>` 看 PID，`taskkill /PID <pid> /F`，或改 properties 里的端口 |
| Q8 | 找不到符号 `RandomUtils`（`com.ayjs.mxzg.common.util`） | `mxzg-config`、`mxzg-battle`、`mxzg-cross` 共 36 处引用它，仓库里原来只有 `RandomUtil`。在 `mxzg-common/src/main/java/com/ayjs/mxzg/common/util/RandomUtils.java` 补一个类，内部委托 `RandomUtil` 做 `isHit` / `nextInt`，再 `mvn install` |
| Q9 | `没有主清单属性` | 瘦包不能 `java -jar`。用第 5 节：`mvn -o dependency:copy-dependencies "-DoutputDirectory=target/lib"`，再 `java -cp "target/classes;target/lib/*" <启动类全名>` |
| Q10 | `加载 [xxx] 时出现错误` / `时出现重复的ID` | 表结构和服代码版本不一致。当天是 `floatingislandstime`（浮空岛时段）：每个 stage 按周几重复，代码要求 stage 唯一。每个 stage 只留第一行。只影响浮岛时段 |
| Q11 | `TypeMismatchException: Failed to convert String to int[]`，输入字符串 `"[1"` | `sensitive.server.lang=[1,2]` 被 Spring 注入 `int[]`，按逗号拆，不认方括号。改成 `sensitive.server.lang=1,2`。`sub.server.id` 相反：注入 `String` 后由 `ServerConfig.getSubServerIds()` 用 Gson 按 JSON 数组解析，必须保留方括号，写成 `sub.server.id=[1005,1105,7,8,9,10]`。删掉方括号时，点「开始游戏」会报 `JsonSyntaxException: Expected BEGIN_ARRAY but was NUMBER`，栈在 `getSubServerIds` / `matchServerId` / `LoginHandler.login`。2026-10-19 两个字段一起去掉方括号时，进程能起，客户端登录必现 1005，补回 `sub.server.id` 的方括号后登录成功 |
| Q12 | `FileNotFoundException: \project_home\xxx.jks` | 本地不要 wss。置空：`network.webSocket.sslFile=` 和 `network.webSocket.sslPassword=` |
| Q13 | 改了 `src/main/resources` 的 properties，启动后没生效 | 进程读 `target/classes`。改完后执行 `Copy-Item src\main\resources\application.properties target\classes\ -Force`，或重新 `mvn package` |
