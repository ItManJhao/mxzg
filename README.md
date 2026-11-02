# mxzg

当前客户端为 Cocos Creator 3.8.8 / TypeScript，后端为 Java 21 / Spring Boot。开发约束见 [AGENTS.md](AGENTS.md)。

## 启动

1. 运行 scripts/start-remake-backend.bat，新后端监听 http://127.0.0.1:18080。
2. Creator 打开 client，打开 assets/scenes/Remake.scene，预览当前场景。
3. 登录/选服 → 主城 → 英雄/背包 → 出阵 → 主线战斗 → 结算 → 返回。

本机预览优先；未明确要求时不构建 H5/App/小游戏包。旧 module、Boot/Main、WebSocket 桥与旧网络链已删除。

## 文档入口

- [产品需求](docs/product-requirements.md)：有效需求与首测范围。
- [架构与职责](docs/architecture.md)：MVC、状态、事件、生命周期及后端边界。
- [运行维护](docs/local-remake-workflow.md)：本机启停、日志和排错。
- [配置与资源](docs/config-pipeline.md)：生成、分组查询、资源目录与作用域。
- [Prefab 编辑](docs/prefab-layout.md)：命名、坐标、逐项审查及视觉待验收。
- [当前计划](docs/restructuring-plan.md) / [实际进度](docs/development-progress.md)。

功能维护：[背包](docs/bag-mvc-maintenance.md)、[库存事件](docs/bag-inventory-events.md)、[列表](docs/super-scroll-authoring.md)、[出阵](docs/formation-ui-authoring.md)、[英雄/阵容接口](docs/hero-lineup-contract.md)。

## 常见代码入口

app 负责启动装配；features 负责功能数据、业务、接口和 UI；framework 负责事件、资源及页面生命周期；platform 负责 HTTP/平台；config 负责生成配置与统一查询。Prefab 保存静态结构与样式。

在 client 执行 npm run check。若 Python 为商店占位入口，将当前进程 MXZG_PYTHON 指向实际 Python。配置与资源生成检查、脚本/Prefab 绑定、业务和生命周期均在综合入口中；检查不读取玩家文件数据库。Creator strict 保持 ES2017。
