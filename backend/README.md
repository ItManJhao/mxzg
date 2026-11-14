# 新版游戏后端

当前通过长连接接通开发登录、角色/背包、英雄只读/主线布阵及前三关挑战结算；挂机演出与说明已接，新挂机累计/真实发奖/持久回执及WS领取/status事务已实现但默认关闭。客户端持久待确认和按钮尚未接入，宝箱领取、快速战斗、升级和穿脱未向玩家开放。全部游戏业务HTTP控制器已删除；这仍是分期恢复版本，不是正式上线服务。最新范围以[项目进度](../docs/development-progress.md)为准。

唯一协议见 [game.proto](../protocol/game.proto)，入口 /api/v1/game/socket，子协议 mxzg.protobuf.v2，Protobuf 二进制。登录和恢复成功回包一次包含角色、库存、持久版本，不再支持 session.sync/inventory.list。字段与时序见[通信契约](../docs/network-contract.md)。

## 本机运行

在 backend 目录执行：

~~~powershell
.\dev.ps1 test
.\dev.ps1 run
~~~

也可双击 scripts/start-remake-backend.bat。修改后端使用 restart-remake-backend.bat；只停止核对归属的本仓库 Java 进程。已有服务复用前验证 v2 子协议，不发英雄/角色/选服 HTTP 探针，不启动第二份进程。

Java 21 与 Maven Wrapper，优先采用 .tools 内隔离 JDK，不改系统 Java。local 仅绑定127.0.0.1，默认`.local/game`文件H2；当前Flyway至V23，新增精灵实例表但不迁移普通库存或自动发放。正式配置必须显式提供数据源，开发身份提供方与本机WS处理器在production下不会装配。

本机local的GM已按负责人确认默认开启，重启读取项目配置；显式`MXZG_GM_ENABLED=false`可关闭，production仍不装配GM。直接运行ps1被执行策略阻止时，使用上面的restart-remake-backend.bat，其Bypass仅作用于子进程，不改系统策略。使用说明见[开发GM](../docs/gm-development.md)。

活动控制维护默认关闭，需由可信外部配置给出真实开服时间及可选044发布；使用标准`SPRING_CONFIG_ADDITIONAL_LOCATION`加载忽略提交的本地配置，不增加玩家协议或HTTP管理接口。步骤与精确边界见[活动控制维护](../docs/idle-activity-maintenance.md)。

浏览器根地址不是游戏登录页面；请在 Creator 打开 client/assets/scenes/Remake.scene 并预览。启动入口、故障排查见[本机工作流](../docs/local-remake-workflow.md)。

## 状态与持久化

- SessionService 持久化令牌摘要与过期时间，角色身份来自服务端会话。
- SessionSnapshotService 在角色锁内读取钱包、库存和持久版本，包含持久英雄名册、容量及普通四槽装备；养成写入口仍暂停。
- 业务用例在角色锁事务内改资产；RoleRepository/InventoryService 显式接入 AssetSyncService，写入前要求事务，同角色每事务递增一次版本，提交后发送 state.changed。
- AssetSync自定义去重资源随独立事务挂起/恢复；提交后快照若回收期限物品，使用自己的revision与通知。通知异常不改变已提交结果，不阻断同次其他角色；不是重新发奖入口。
- 钱包入账在真实角色行锁内分别精确相加金币/钻石，全部校验通过再单条更新；任一溢出不部分入账。当前75项关联及最后16项复验见[前置证据](../docs/validation/idle-settlement-prerequisites-review-20261113.json)，未运行MySQL或日常库。
- SpiritInventoryService只在可信外层事务内逐件生成2000002；Snapshot统一携带schemaVersion=1的独立实例。普通库存和GM拒type8假堆叠，读取不生成实例，精灵养成未开放；新挂机领取虽已接真实实例发放，但日常默认关闭。历史领域/通信证据见[精灵记录](../docs/validation/spirit-instance-review-20261113.json)，不代替本批事务验证。
- 回滚没有新版本/推送；发送失败不重新发奖，重连从数据库恢复完整状态。禁止新增资产 SQL 绕过同步出口。
- 当前在线连接表只支持单进程。多实例会话协调、正式渠道身份、WSS/TLS 部署及三端发布仍待完成。

## 验证

按改动执行相关专项，包括协议互通、统一首包、事务、会话隔离、主线与挂机规则等。最新批次的命令、数量及限制见[项目进度](../docs/development-progress.md)和对应验证记录；不将历史52项或保留领域服务当作当前全部模块已验收。

独立 MySQL：

~~~powershell
.\test-mysql.ps1 -MysqlHome G:/work/FsGame/Project/mxzg/backend/.tools/mysql-download/mysql-8.4.13-winx64
~~~

此工具每轮新建专用MySQL实例、随机端口与受限库账号，核对UUID、库名、授权后才运行；不接受现有玩家库地址。测试结束只停止自己启动的进程并保留归属记录。覆盖范围以脚本和对应批次证据为准；V22活动及V23精灵本批仅运行独立H2，未以历史MySQL结果代替验证。

启动器黑盒测试：仓库根目录运行 node tools/test_backend_launcher.cjs，只创建随机端口的合成握手服务，不连接数据库。

## 独立 Creator 预览

scripts/start-socket-preview.ps1 使用强制内存 H2 的测试宿主，输出带 mxzgTestApi/mxzgTestRun 的精确预览地址。参数仅选择独立实例与存储，所有游戏消息仍走 WS。实例身份探针只存在测试 classpath，不是游戏业务 HTTP；身份不匹配、参数缺失或测试服务停止时禁止回退日常服。

MySQL 测试追加 -Preview 可保留所属实例用于预览，按工具输出的精确地址与停止文件操作，不替换成日常启动入口。测试凭证不写命令行或输出日志，不复制日常角色。
