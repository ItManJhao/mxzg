# mxzg 重做版后端

独立于旧 `server/` 目录联接的新工程。当前实现开发登录、角色创建/查询、随机会话及过期校验；尚未接入正式渠道身份、战斗或付费。端口默认 18080，避免与旧服冲突。

## 开始运行

需要 Java 21 和 Maven。工程建立后使用 Maven Wrapper 固定构建工具；本机隔离 JDK 位于 `.tools/`，不修改系统 Java 8。

在 backend 目录执行：

```powershell
.\dev.ps1 test
.\dev.ps1 run
```

Windows 最方便的启动方式：双击 `scripts/start-remake-backend.bat`。若直接运行 ps1 提示“系统禁止运行脚本”，可用 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "F:\project\mxzg\backend\dev.ps1" run`；仅对本次子进程生效，不修改系统执行策略。首次启动会保持窗口运行，看到应用 Started 与 18080 监听后可进入游戏；已有可用后端时显示 `[READY]` 并复用，不再启动第二份。bat 成功返回或报错后都会等待按键，避免双击后窗口立即关闭；复用时关闭此提示窗口不会停止原后端。在 Remake.scene 预览中输入 player_1 进行开发登录。

修改后端后双击 `scripts/restart-remake-backend.bat`，会核对并停止当前仓库的 local Java 服务，再重新编译和启动。另有 stop/status 入口；详细说明及独立 H5 的构建、预览入口见 [本机工作流](../docs/local-remake-workflow.md)。Windows 开发停止采用终止已核对 JVM 的方式，不作为生产优雅停服工具。

当前后端是游戏 API 服务，尚无网页管理后台。浏览器直接打开根地址并不是登录入口；开发登录由客户端调用 `/api/v1/development/login`。

local 模式仅绑定本机 127.0.0.1，使用 `.local/game` 下的 H2 文件数据库，Flyway 自动执行版本化建表。它用于开发演示；生产目标仍为 MySQL 8.4，MySQL 兼容性需独立集成测试。默认不启用 local，需要显式设置 MXZG_DATABASE_URL、MXZG_DATABASE_USER、MXZG_DATABASE_PASSWORD。

dev.ps1 优先使用工程隔离 JDK，未找到时使用已有 JAVA_HOME/Java；只为当前命令设置工具环境，结束后恢复。构建产物用 `dev.ps1 package` 生成，工具、依赖缓存、构建输出和本地数据库均被 Git 忽略。

## 一条完整请求

`POST /api/v1/development/login`，JSON 请求 `{"account":"player_1"}`，返回 session（accessToken、expiresAt）和 role（id、nickname、level、gold、diamonds）。账号为 3–32 个英文字母、数字、下划线或连字符，去除两端空格并转小写。重复登录返回同一数据库角色，颁发新的会话。

`GET /api/v1/roles/me`，请求头 `Authorization: Bearer <accessToken>`，返回该会话的角色。角色身份从会话获得，客户端不能用角色 id 查询其他人的资料。

开发登录明确排除 production profile；local 与 production 同时启用时也不注册此身份提供者。正式登录后续接入服务端验证的渠道凭据。会话原文只在颁发时返回，数据库仅保存哈希，过期后返回 401。

## 从哪里修改

新增英雄查询与主阵容版本保存：`GET /api/v1/heroes`、`GET /api/v1/heroes/{heroId}`、`GET/PUT /api/v1/lineups/main`，都使用同一 Bearer 会话。新角色目前没有英雄；测试不向本地用户库种入数据。请求、错误、站位及未完成范围见 [英雄与阵容契约](../docs/hero-lineup-contract.md)。

V2 迁移新增英雄/阵容表与角色阵容版本。按正常方式重启新后端后由 Flyway 执行，不需要删除已有 `.local` 数据库；旧服数据库不受影响。MySQL 真实验证仍待完成。

如果能登录，但英雄列表返回 404，先确认启服窗口是否仍运行修改前的 Java 进程。更新源码或重新编译不会替换已启动的进程：在旧启服窗口按 Ctrl+C，待服务停止后重新双击 start-remake-backend.bat，再重试英雄列表。无需删除 `.local` 数据库。未带会话请求 `/api/v1/heroes` 时，新后端应返回 401；404 表示当前地址没有这个接口。

dev.ps1 run 现在会先检查端口是否已有服务：识别到英雄接口 404 时明确提示重启旧后端，其他占用提示复用现有服务或先停止再启动；不会再直接启动第二个 Maven 进程撞端口。Windows 在项目根目录可执行 `python tools/test_backend_launcher.py` 检查三种占用情况，使用随机端口的临时 HTTP 服务，不访问用户数据库。

- 账号输入规则和开发创角：auth/DevelopmentLoginService。
- 会话颁发、校验与有效期：auth/SessionService。
- 角色 API：role/RoleController → RoleService → RoleRepository。
- 表结构：src/main/resources/db/migration，已经执行的版本不再修改，后续新增迁移。
- 环境配置：application.yml 与 application-local.yml。
- Creator 本地预览跨域：auth/LocalPreviewConfiguration，仅在 local 且非 production 时生效。
- 测试：src/test/java；覆盖真实 HTTP、重复登录、状态保存、账户隔离、过期和生产环境入口隔离。

测试数据库是独立 H2，不读取或修改旧服 MySQL。新旧服务后续通过明确的适配边界衔接，不把旧框架依赖直接引入本工程。
