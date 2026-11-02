# mxzg 重做版后端

独立于旧链的新工程。当前实现开发登录/选服、角色与会话、英雄/阵容、库存、主线挑战与幂等奖励；尚未接入正式渠道身份或付费。端口默认 18080，避免与旧服冲突。

## 开始运行

需要 Java 21 和 Maven。工程建立后使用 Maven Wrapper 固定构建工具；本机隔离 JDK 位于 `.tools/`，不修改系统 Java 8。

在 backend 目录执行：

```powershell
.\dev.ps1 test
.\dev.ps1 run
```

Windows 最方便的启动方式：双击 `scripts/start-remake-backend.bat`。若直接运行 ps1 提示“系统禁止运行脚本”，可用 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "G:\work\FsGame\Project\mxzg\backend\dev.ps1" run`；仅对本次子进程生效，不修改系统执行策略。首次启动会保持窗口运行，看到应用 Started 与 18080 监听后可进入游戏；已有可用后端时显示 `[READY]` 并复用，不再启动第二份。bat 成功返回或报错后都会等待按键，避免双击后窗口立即关闭；复用时关闭此提示窗口不会停止原后端。在 Remake.scene 预览中输入 player_1 进行开发登录。

修改后端后双击 `scripts/restart-remake-backend.bat`，会核对并停止当前仓库的 local Java 服务，再重新编译和启动。另有 stop/status 入口；详细说明及独立 H5 的构建、预览入口见 [本机工作流](../docs/local-remake-workflow.md)。Windows 开发停止采用终止已核对 JVM 的方式，不作为生产优雅停服工具。

当前后端是游戏 API 服务，尚无网页管理后台。浏览器直接打开根地址并不是登录入口；开发登录由客户端调用 `/api/v1/development/login`。

local 模式仅绑定本机 127.0.0.1，使用 `.local/game` 下的 H2 文件数据库，Flyway 自动执行版本化建表。它用于开发演示；目标 MySQL 8.4 的独立验证见下文，不把 H2 兼容模式当作 MySQL。默认不启用 local，需要显式设置 MXZG_DATABASE_URL、MXZG_DATABASE_USER、MXZG_DATABASE_PASSWORD。

dev.ps1 优先使用工程隔离 JDK，未找到时使用已有 JAVA_HOME/Java；只为当前命令设置工具环境，结束后恢复。构建产物用 `dev.ps1 package` 生成，工具、依赖缓存、构建输出和本地数据库均被 Git 忽略。

## 一条完整请求

`POST /api/v1/development/login`，JSON 请求 `{"account":"player_1"}`，返回 session（accessToken、expiresAt）和 role（id、nickname、level、gold、diamonds）。账号为 3–32 个英文字母、数字、下划线或连字符，去除两端空格并转小写。重复登录返回同一数据库角色，颁发新的会话。

`GET /api/v1/roles/me`，请求头 `Authorization: Bearer <accessToken>`，返回该会话的角色。角色身份从会话获得，客户端不能用角色 id 查询其他人的资料。

开发登录明确排除 production profile；local 与 production 同时启用时也不注册此身份提供者。正式登录后续接入服务端验证的渠道凭据。会话原文只在颁发时返回，数据库仅保存哈希，过期后返回 401。

## 从哪里修改

英雄查询与主阵容版本保存：`GET /api/v1/heroes`、`GET /api/v1/heroes/{heroId}`、`GET/PUT /api/v1/lineups/main`，都使用同一 Bearer 会话。主线初始化按现有业务发放初始英雄与库存；测试不向本地用户库种入数据。请求、错误、站位及未完成范围见 [英雄与阵容契约](../docs/hero-lineup-contract.md)。

V2 迁移新增英雄/阵容表与角色阵容版本，V3 增加区服、库存与主线。已执行的迁移不重写；本次 MySQL 验证只在全新独立实例执行 V1–V3，没有连接或迁移任何已有玩家库。

如果能登录，但英雄列表返回 404，先确认启服窗口是否仍运行修改前的 Java 进程。更新源码或重新编译不会替换已启动的进程：在旧启服窗口按 Ctrl+C，待服务停止后重新双击 start-remake-backend.bat，再重试英雄列表。无需删除 `.local` 数据库。未带会话请求 `/api/v1/heroes` 时，新后端应返回 401；404 表示当前地址没有这个接口。

dev.ps1 run 现在会先检查端口是否已有服务：识别到英雄接口 404 时明确提示重启旧后端，其他占用提示复用现有服务或先停止再启动；不会再直接启动第二个 Maven 进程撞端口。Windows 在项目根目录可执行 `python tools/test_backend_launcher.py` 检查三种占用情况，使用随机端口的临时 HTTP 服务，不访问用户数据库。

- 账号输入规则和开发创角：auth/DevelopmentLoginService。
- 会话颁发、校验与有效期：auth/SessionService。
- 角色 API：role/RoleController → RoleService → RoleRepository。
- 表结构：src/main/resources/db/migration，已经执行的版本不再修改，后续新增迁移。
- 环境配置：application.yml 与 application-local.yml。
- Creator 本地预览跨域：auth/LocalPreviewConfiguration，仅在 local 且非 production 时生效。
- 测试：src/test/java；覆盖真实 HTTP、重复登录、状态保存、账户隔离、过期和生产环境入口隔离。

默认测试数据库是独立 H2，不读取或修改玩家数据库。MySQL 验证须显式选择下列入口。

## 独立 MySQL 验证

需要 Java 21 和官方 [MySQL 8.4 Windows ZIP](https://dev.mysql.com/downloads/mysql/8.4.html?os=3)，先核对官方校验值并解压。无需安装系统服务、提供管理凭据或修改既有数据库配置。在 backend 目录执行（路径由执行者提供）：

```powershell
.\test-mysql.ps1 -MysqlHome '<官方 MySQL 8.4 ZIP 解压目录>'
```

入口仅为当前进程选择 JDK/Maven 环境，结束后恢复。已有 Java 21 环境也可执行 `./mvnw.cmd -Pmysql-it "-Dmxzg.mysql.home=<解压目录>" test`。没有显式目录即失败，不能回退到默认业务库；`dev.ps1 test/run` 的默认行为不变。测试 profile 位于 src/test/resources，不随应用发布。

每次创建唯一 `target/mysql-it/<运行标识>/data`、随机空闲回环端口、`mxzg_it_<运行标识>` 库和随机密码的专用用户。创建记录在初始化前写入 ownership.properties；该目录必须由本次原子创建，不复用已有库。程序使用 `--no-defaults`、仅绑定 127.0.0.1、关闭 X 协议；Windows 使用 [官方 --no-monitor 选项](https://dev.mysql.com/doc/refman/8.4/en/server-options.html)，确保持有的进程句柄就是实际服务器。

引导文件只创建该库/账号并锁定该实例的 root；应用、迁移和测试只使用专用库账号。授权中的下划线转义，权限仅涵盖准确库名，没有全局管理或授权转授权限。引导文件完成后立即删除，日志与归属记录不包含密码/令牌。每次启动迁移前核对实际 8.4 版本、地址端口、库、用户、服务器 UUID 与授权范围；身份不符即中止。Spring 测试环境排除终端业务配置和外部配置位置，独立固定数据源及 Flyway 连接，禁止 clean。没有连接共享实例的模式。

12 项测试使用真实 V1–V5 迁移与业务：空库列类型/索引/约束；启动身份拒绝；并发创角及区服隔离；阵容版本冲突、非法阵位/跨角色英雄；挑战与领奖幂等；奖励中途失败整笔回滚；会话过期及 UTC 时间；应用上下文和数据库进程重启持久化；独立 JVM 的真实 HTTP 全链路；挂机并发领取及重启后的计时和随机收据恢复。并发先锁住专用库 game_role，再观察两个真实 SQL 同时等待锁后释放，断言冲突或幂等结果。回滚通过专用测试库存溢出或收据约束制造，不新增生产故障入口。

HTTP 用例先关闭父测试的应用上下文，再通过 MySqlHttpProcess 启动独立 Java 进程，执行真实 GameApplication 和现有 Controller/业务。启动配置沿用隔离保护，子进程再次核对数据库 UUID/身份/权限；凭据仅由标准输入管道传递，不进入命令行、配置文件或日志。HTTP 使用 server.port=0 的随机回环端口，就绪文件原子记录运行标识、PID 和端口，父进程确认归属后才发送请求。逐代 http-process-N.properties 和 http-jvm-N.log 保留在该测试目录，停止只使用创建时持有的进程句柄。

HTTP 链覆盖选服列表、开发登录、角色、主线初始化、英雄列表/详情、库存、阵容读取/实际编辑/恢复/版本冲突、挑战/战报、领奖和重新登录。并发登录、挑战、领取另有三个真实 SQL 重叠观察。分别在未领奖与已领奖时停止 JVM，再启动全新 PID，比较角色、英雄、库存、阵容、战报、货币、关卡及数据库经验；同时验证旧有效会话恢复、跨区隔离、越权领奖和过期 401。阵容不变的保存保持原版本，测试不会为了递增版本修改该业务规则。该范围是后端 API 全链，不是 Creator 页面或发布包验收。

历史基线 25e4be89（本批升级之前）：2026-11-02 实跑 MySQL **8.4.13 Win64**、Connector/J **9.7.0**、Flyway **12.4.0**：扩展后的 9/9 通过；随后默认 H2 24/24 通过。JVM/JDBC 为 UTC，数据库会话为 +00:00。两次完整 Spring 上下文/连接池重建和一次本批 mysqld 终止后重启，验证未领奖战报、已领奖资产、经验、角色、英雄、阵容及关卡保留，迁移仍只有 3 条。同日续验补齐独立 JVM/HTTP：三代 JVM 的 PID 分别为 23660、25296、17180，均已停止；两次终止/重新启动后，未领与已领快照、旧有效会话和重复领取结果一致。HTTP 并发登录/挑战/领取各观察到两个真实 SQL 等锁。

测试结束只停止本对象启动的进程，保留停止的数据目录、日志及无凭据归属记录，不执行 DROP/clean。正常复跑创建新实例。人工清理前须再次核对 ownership.properties、精确目录、服务器 UUID 与进程已停止；不能只凭库名或端口删除资源。中断后归属无法确认则保留，不按进程名批量终止。此次保留的运行记录见 [开发进度](../docs/development-progress.md)。


## 普通升级及隔离 Creator 验证（2026-11-02）

新增 GET/POST /api/v1/heroes/{heroId}/level-up，规则、错误码与幂等语义见 [英雄契约](../docs/hero-lineup-contract.md)。V4 仅新增 stage 与持久请求收据；不重写 V1–V3。本批未对已有玩家库执行迁移，也不应为测试启动或重启日常后端。

默认 H2 增加 5 个普通升级用例；MySQL 增加 2 个用例，覆盖同请求/不同请求真实重叠、受控收据失败回滚，以及正常首胜奖励→升级→再战斗→独立 JVM 重启/重登/收据重放。空专用库先迁移 V3 写入明确合成角色/英雄/库存，再启动真实应用执行 V4，断言旧行和 stage=0 保留。

如需 Creator 连接本批独立服务，在上述 MySQL 命令增加 `-Preview`。测试完成后保持独立实例及随机端口 HTTP 子进程最多 45 分钟；终端显示 run、HTTP 端口及 creator-preview/preview.properties，不显示密码或令牌。创建其显示的精确 `creator-preview/stop-preview` 空文件即可结束等待，由原进程持有者停止自己的 HTTP/MySQL 进程并保留归属记录。不要用日常 start/restart 入口替代。

Creator 刷新并完成导入后，新开预览页，在原预览地址附加 `?mxzgTestApi=http%3A%2F%2F127.0.0.1%3A<本批HTTP端口>&mxzgTestRun=<本批run>`。测试代码中的 `/api/v1/test-identity` 必须匹配本批 run 才允许进入登录；只在 Creator PREVIEW 和回环来源接受参数，18080/3306 被拒绝，失败不回退到日常服务。会话存储使用独立 run 前缀。身份接口仅编译于 test 源，不打入应用。使用新建合成账号，不复制日常角色或资产。测试页关闭后再停止该批进程。

本批普通升级最终结果：2026-11-02 MySQL 11/11、H2 29/29；Creator 真实奖励→升级→再战斗→重登完成，三尺寸及迟到响应范围见开发进度。所有本批实例及 HTTP 子进程已停止，玩家库和日常后端未操作。

## 普通挂机接口（2026-11-02）

V5 新增 game_idle 与 game_idle_receipt。主线初始化或首次挂机查询在角色锁内创建计时；已有角色不追补迁移前离线时长。规则由 tools/export_idle_rules.py 从现有四类配置导出，当前覆盖普通角色前 20 关，不含 VIP、活动、特权和付费快速战斗。

- GET /api/v1/idle：返回 serverTime/startedAt（Unix 秒）、revision、elapsedSeconds、maxSeconds、frequency、rewardStage、rates、claimable、configVersion。rates 为每个 frequency 的基础收益；查询不随机抽奖。
- POST /api/v1/idle/claim：仅接收 requestId（小写 UUID）与 expectedRevision。返回原操作 receipt、当前 state、role、inventory、roleExperience。客户端不提交奖励、时间或随机数。
- 同角色同 requestId 与 revision 重放原随机收据，附带最新资产；同键不同参数为 409 IDEMPOTENCY_CONFLICT。新键旧版本为 409 IDLE_STATE_CHANGED，不足一个周期为 409 IDLE_NOT_READY；未初始化为 409 ROLE_NOT_INITIALIZED，非法参数为 400 INVALID_IDLE_REQUEST，无效会话为 401。
- 角色锁覆盖资产、计时、掉落保底和收据的单笔事务；失败全部回滚。领取后重置起点，超上限时间与不足完整周期的基础收益尾数不结转；随机次数沿用旧服四舍五入。掉落计数按累计 12 小时窗口重置。

本批自动回归：H2 35/35、独立 MySQL 12/12。MySQL 运行 65889279e26748cd805faa0131f0de39，端口 58003，结束 state=stopped。验证并发领取、独立 JVM/数据库重启及重登重放。日常本地 H2 在停止旧进程后备份到 .local/backups/idle-20261102-193035，升级 V4→V5；无清库操作。实际页面验收范围以开发进度为准。
