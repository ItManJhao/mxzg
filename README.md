# mxzg

旧项目因技术版本老、代码难以人工维护而重做：现代化技术和内部结构，旧玩法、内容、规则与效果以 **1:1 还原**为目标。当前客户端为 Cocos Creator 3.8.8 / TypeScript，后端为 Java 21 / Spring Boot。开发约束见 [AGENTS.md](AGENTS.md)。

## 启动

1. 运行 scripts/start-remake-backend.bat，长连接监听 ws://127.0.0.1:18080/api/v1/game/socket。
2. Creator 打开 client，打开 assets/scenes/Remake.scene，预览当前场景。
3. 选服/登录 → 主城 → 背包、角色详情、英雄只读列表/详情；主线阵容保存、前三关挑战/结算及挂机演出已接通；宝箱领取、快速战斗、升级和穿脱未开放。

本机预览优先；未明确要求时不构建 H5/App/小游戏包。旧 module、Boot/Main、WebSocket 桥与旧网络链已删除。

## 文档入口

最终目标：完整重做旧游戏，分批恢复玩法与社交；独立新版，不要求旧客户端兼容或旧玩家迁移。全部游戏业务 HTTP 已移除，登录、角色、背包采用 WS＋Protobuf；统一登录初始化、资产事务提交后同步。角色、背包模板已接通，当前重点为主线挂机主页与正式挑战流程还原；当前范围与缺口见进度和交接文档。

阅读顺序：产品需求（要做什么）→ 开发进度（现在做到哪）→ 实施计划（接下来做什么）→ 架构（怎样做及证据）。同一事实只在对应主文档维护，不让历史批次覆盖当前结论。


- [产品需求](docs/product-requirements.md)：有效需求与首测范围。
- [架构与职责](docs/architecture.md)：MVC、状态、事件、生命周期及后端边界。
- [开发写法与阅读约定](docs/development-conventions.md)：游爱写法的借鉴范围、方法/注释、明确调用链和还原流程。
- [交接文档](docs/handoff.md)：新聊天先读，包含路径、约束、代码入口、验证与下一步。
- [文档索引](docs/README.md)：按用途查阅，区分当前约束和历史证据。
- [首批通信契约](docs/network-contract.md)：登录、重连、幂等、迁移顺序与试点门槛；含独立预览入口。
- [运行维护](docs/local-remake-workflow.md)：本机启停、日志和排错。
- [配置与资源](docs/config-pipeline.md)：生成、分组查询、资源目录与作用域。
- [Prefab 编辑](docs/prefab-layout.md)：命名、坐标、逐项审查及视觉待验收。
- [当前计划](docs/restructuring-plan.md) / [实际进度](docs/development-progress.md)。

历史记录：[11月3–4日批次快照](docs/validation/development-history-20261104.md)；[截至 2026-11-02 的开发过程](docs/validation/development-history-20261102.md)。[开服规则参考](docs/day60-open-server.md)只用于核对配置，不再作为另一套删减玩法/排期方案。

文档目录的 JSON 是资源来源、Prefab 保留清单和审查数据，供工具/追溯使用；validation 保存历史证据。它们不作为当前计划，也不因文件多而删除。

功能维护：[背包](docs/bag-mvc-maintenance.md)、[库存事件](docs/bag-inventory-events.md)、[列表](docs/super-scroll-authoring.md)、[出阵](docs/formation-ui-authoring.md)、[英雄/阵容接口](docs/hero-lineup-contract.md)。

## 常见代码入口

app 负责启动装配；features 负责功能数据、业务、接口和 UI；framework 负责事件、资源及页面生命周期；platform 负责 WebSocket/Protobuf/平台；config 负责生成配置与统一查询。Prefab 保存静态结构与样式。

在 client 执行 npm run check。若 Python 为商店占位入口，将当前进程 MXZG_PYTHON 指向实际 Python。配置与资源生成检查、脚本/Prefab 绑定、业务和生命周期均在综合入口中；检查不读取玩家文件数据库。Creator strict 保持 ES2017。
