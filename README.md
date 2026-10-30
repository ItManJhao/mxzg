# mxzg

面向中国大陆的简体中文 H5、App 和微信小游戏重做版。当前工程使用 Cocos Creator 3.8.8/TypeScript，后续技术以三端验证和维护成本选择。日服用于玩法、美术与已有服务能力参考，新架构和交互按重做版需求设计；资源或界面存在不代表功能已完整接入。

## 当前开发基线

- [从 0 到 1 实施路线与验收清单](docs/restructuring-plan.md)：P0–P9 的细化任务、依赖、状态与阶段出口，作为主计划。
- [核心产品需求](docs/product-requirements.md)：三端范围、真实玩法闭环与完成标准。
- [架构与维护指南](docs/architecture.md)：轻量 MVC、UIManager 职责、后端取舍与人工修改入口。
- [资源加载与依赖审计](docs/resource-loading.md)：资源登记、作用域、主城按需 Bundle、检查命令与实测边界。
- [配置分组加载](docs/config-loading.md)：登录前 2 张表、主城另 5 份配置、原子提交及旧全量路径隔离。
- [英雄与阵容接口](docs/hero-lineup-contract.md)：新后端查询/保存契约、版本冲突、站位依据与客户端接入边界。
- [Prefab 清理结果](docs/prefab-cleanup.md)：90 项保留范围、517 项删除清单、备份和防回流检查。
- [登录入口职责](docs/login-entries.md)：account 当前入口、login 共用组件和 legacy-login 旧版对照。
- [实际开发进度](docs/development-progress.md)：新样板运行方式、已验证内容与下一批工作。
- [当前工程问题](docs/project-audit.md)：源码证据、平台缺口和保留/删除边界。

后续开发先读上述基线，优先保证人能阅读、修改和排错；其他批次与迁移文档保留历史参考，运行说明以当前代码核对。当前检查仍有背包布局失败，详见问题清单。

统一工程根目录：`F:\project\mxzg`

| 目录 | 说明 |
|------|------|
| `client/` | Cocos Creator 3.8.8 新前端（用 Creator 打开此目录） |
| `backend/` | 重做版 Java 21 后端，独立构建与数据库，见 [启动和维护说明](backend/README.md) |
| `config/gameconfig/` | 策划表 xlsx。源路径 `F:\project\mxzg\config\gameconfig`。客户端运行时读导出的 JSON |
| `server/` | 服务端。本机当前为目录联接 → `F:\源码\mj\program\server`（暂不进 Git） |

## 本地联接说明

`server/` 仍用 junction 复用服代码。策划表在仓库 `config/gameconfig`。`ip2region.db` 留在本机。  
导出与服的 `config.path` 见 [`docs/config-pipeline.md`](docs/config-pipeline.md)。

当前启动始终连本机真服桥 `ws://127.0.0.1:13111/game`，`?dev=mock` 也不会切换离线；Mock 仍由无引擎检查使用。日常启动见 `scripts/start-local-all.bat`。此桥属于开发工具，正式网关与渠道配置尚需建立。

## 打开方式

重做版样板：双击 `scripts/start-remake-backend.bat`，再在 Creator 打开 `client/assets/scenes/Remake.scene` 预览。开发账号如 player_1；成功后进入基础主城，退出返回登录。新服务当前提供 API，尚无网页管理后台。以下 Boot 说明属于仍保留的旧链路。

Cocos Creator 3.8.8 → 打开 `F:\project\mxzg\client`

预览登录 → 主城 → 主线（新 Prefab 壳、开关和缺口）见 [`docs/prefab-demo-path.md`](docs/prefab-demo-path.md)。
