# 新版游戏后端

当前对外只开放登录、角色和背包长连接：选服、本地身份交换、恢复初始化、心跳、顶号、资产提交后同步。全部游戏业务 HTTP 控制器已删除；英雄/阵容/战斗/挂机入口暂停，保留领域服务和测试等待按旧项目重做。不是正式上线服务。

唯一协议见 [game.proto](../protocol/game.proto)，入口 /api/v1/game/socket，子协议 mxzg.protobuf.v2，Protobuf 二进制。登录和恢复成功回包一次包含角色、库存、持久版本，不再支持 session.sync/inventory.list。字段与时序见[通信契约](../docs/network-contract.md)。

## 本机运行

在 backend 目录执行：

~~~powershell
.\dev.ps1 test
.\dev.ps1 run
~~~

也可双击 scripts/start-remake-backend.bat。修改后端使用 restart-remake-backend.bat；只停止核对归属的本仓库 Java 进程。已有服务复用前验证 v2 子协议，不发英雄/角色/选服 HTTP 探针，不启动第二份进程。

Java 21 与 Maven Wrapper，优先采用 .tools 内隔离 JDK，不改系统 Java。local 仅绑定 127.0.0.1，默认 .local/game 文件 H2，Flyway 自动迁移 V1–V6；V6 只增加资产状态版本，不发放或清除玩家资产。正式配置必须显式提供数据源，开发身份提供方与本机 WS 处理器在 production 下不会装配。

浏览器根地址不是游戏登录页面；请在 Creator 打开 client/assets/scenes/Remake.scene 并预览。启动入口、故障排查见[本机工作流](../docs/local-remake-workflow.md)。

## 状态与持久化

- SessionService 持久化令牌摘要与过期时间，角色身份来自服务端会话。
- SessionSnapshotService 在角色锁内读取钱包、库存和持久版本，英雄字段暂空，避免把暂停范围描述为完整恢复。
- 业务用例在角色锁事务内改资产；RoleRepository/InventoryService 显式接入 AssetSyncService，写入前要求事务，同角色每事务递增一次版本，提交后发送 state.changed。
- 回滚没有新版本/推送；发送失败不重新发奖，重连从数据库恢复完整状态。禁止新增资产 SQL 绕过同步出口。
- 当前在线连接表只支持单进程。多实例会话协调、正式渠道身份、WSS/TLS 部署及三端发布仍待完成。

## 验证

当前默认回归 52 项，含真实 TS/Java 互通、统一首包、空背包、事务推送/回滚、无事务保护、顶号、过期、换服隔离与旧业务 HTTP 404。暂停模块保留领域规则回归，已删除的网络入口不再被当作仍可游玩。

独立 MySQL：

~~~powershell
.\test-mysql.ps1 -MysqlHome G:/work/FsGame/Project/mxzg/backend/.tools/mysql-download/mysql-8.4.13-winx64
~~~

此工具每轮新建专用 MySQL 实例、随机端口与受限库账号，核对 UUID、库名、授权后才运行；不接受现有玩家库地址。12 项验证包含 V1–V6 类型/约束、V3 合成数据保留、并发/回滚、UTC、WS 统一初始化、独立 JVM 与数据库进程重启。测试结束停止自己启动的进程，保留归属记录。当前结果见[开发进度](../docs/development-progress.md)。

启动器黑盒测试：仓库根目录运行 node tools/test_backend_launcher.cjs，只创建随机端口的合成握手服务，不连接数据库。

## 独立 Creator 预览

scripts/start-socket-preview.ps1 使用强制内存 H2 的测试宿主，输出带 mxzgTestApi/mxzgTestRun 的精确预览地址。参数仅选择独立实例与存储，所有游戏消息仍走 WS。实例身份探针只存在测试 classpath，不是游戏业务 HTTP；身份不匹配、参数缺失或测试服务停止时禁止回退日常服。

MySQL 测试追加 -Preview 可保留所属实例用于预览，按工具输出的精确地址与停止文件操作，不替换成日常启动入口。测试凭证不写命令行或输出日志，不复制日常角色。
