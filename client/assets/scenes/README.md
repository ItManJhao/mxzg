# 场景入口与用途

当前开发入口是顶层的 **Remake.scene**。在 Creator 打开它并选择“预览当前场景”。README 是说明文档，不是场景。

## Remake.scene：当前新后端入口

- Canvas 挂载 RemakeApp，装配账号服务、统一 UIManager 和页面导航。
- PageHost 承载页面，位于其上方的 StartupHost 承载既有 LoadingLayer 与启动过渡。启动依次加载配置、界面资源、准备账号信息、等待登录页就绪，再淡出加载层；恢复会话也停留登录页，必须点击“开始游戏”才进入主城。
- 场景不再直接引用主城 Prefab；主城组合入口位于 assets/bundles/remake-home，点击开始后通过 HomeResources 按需加载。修改后须重新打开 Remake.scene，避免使用旧场景内存中的引用。
- 使用 backend 下的新 Java 服务，双击 scripts/start-remake-backend.bat 启动，默认地址 http://127.0.0.1:18080。
- 登录与角色资料页面使用 Prefab 切换，均在同一场景中；新增 UI 页面不需要新增场景。
- 默认账号 player_1，右上角“开发账号”可修改。登录后复用已有 CityHub 地图与 CityChrome 顶底栏，显示新后端真实角色资料；右上侧“账号”可查看角色 ID 并退出。英雄读取、背包分类/详情、出阵查询/版本保存和基础主线战斗/领奖已接新后端；完整技能、养成和服务端挂机收益未完成。背包采用会话级 BagController/BagModel，BagView 只负责展示。
- 当前登录页是 prefabs/ui/account/AccountLogin；prefabs/ui/login 是共用启动/选服组件，两个旧登录入口已隔离到 prefabs/ui/legacy-login，只给旧 Boot 对照使用。

## legacy/Boot.scene：旧游戏启动入口

计划外 Prefab 已按用户要求清理；该入口只保留核心页面的对照用途，不再承诺完整旧服的所有系统 UI。范围见 docs/prefab-cleanup.md。

- Canvas 挂载 Boot，负责旧资源加载、登录、角色同步与主城预加载。
- 使用旧服务器和 WebSocket 桥，对应 scripts/start-local-all 启服脚本。
- 登录成功后加载名为 Main 的场景，并给其 Canvas 添加 MainApp。
- 只用于旧链路对照，不是当前开发验收入口。其背包已经退役，点击提示使用 Remake；其余 WireSession/GameStore 历史依赖尚未迁移，不代表全项目统一完成。

## legacy/Main.scene：旧主城承载场景

- 提供 Canvas 和 Camera，MainApp 由 Boot 登录成功后动态挂载。
- 单独预览不会完成账号、网络和主城初始化，应通过 Boot 进入。
- 暂时必须保留：Boot 仍调用 director.loadScene("Main")。移动目录没有修改场景名或 UUID。

## legacy/placeholders/Battle.scene：历史空占位场景

- 当前仅有 Canvas、Camera 等基础配置，没有战斗入口脚本；现有代码也没有加载它。
- 已有战斗功能通过主城中的页面与 Prefab 展示，不经过此场景。
- 暂存供历史对照，日常预览和新后端构建不需要选择它。

## 构建与目录约定

- 新后端联调版本：首场景和场景列表选择 Remake，目前不代表完整游戏发行版。
- 旧游戏版本：首场景选择 legacy/Boot，列表包含 legacy/Boot 与 legacy/Main。
- 本次保留全部场景及其 .meta UUID，只调整旧场景目录；本机已有构建任务仅同步资源 URL，不改其历史启动选择或构建参数。重新构建前按目标核对首场景。
- 后续游戏 UI 优先使用可编辑 Prefab，交由统一 UIManager 管理；仅在确有独立运行生命周期时增加场景。
