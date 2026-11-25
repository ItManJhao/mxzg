# mxzg

mxzg 使用 Cocos Creator 3.8.8、TypeScript、Java 21 和 Spring Boot 重做原游戏。玩法与数值按原项目还原，界面与交互对照正式服。游戏业务使用 WebSocket 和 Protobuf。

## 项目总计划

下一步先从主城聊天入口接通实际收发，随后恢复黑市，再推进副本大厅其余玩法及公会科技、公会副本、世界 Boss、公会战。每项的开发顺序、依赖与验收条件统一维护在[项目总计划](docs/restructuring-plan.md)。

- 查哪些操作已经接通、哪些经过实际验证，读[开发进度](docs/development-progress.md)。
- 接手开发、定位页面与服务端入口、选择检查命令，读[开发交接](docs/handoff.md)。
- 查协议、架构和各玩法的专题说明，读[文档索引](docs/README.md)。
- 评估海外发行，读[多语言现状与试点](docs/localization-plan.md)，其中列出旧译覆盖、界面改造量和首轮验收方法。

## 本机启动

1. 双击 [start-remake-backend.bat](scripts/start-remake-backend.bat)。修改 Java 后使用 [restart-remake-backend.bat](scripts/restart-remake-backend.bat)。
2. 在 Creator 中打开 client 项目，预览 [Remake.scene](client/assets/scenes/Remake.scene)。
3. 选服、登录后进入主城。需要验证扣费、发奖和双角色交互时使用独立测试库，环境配置见[本机工作流](docs/local-remake-workflow.md)。

## 开发约定与检查

开发使用 `hao` 分支，提交、推送与合并 `main` 按当次授权执行。修改前阅读[仓库约定](AGENTS.md)。模块职责见[架构](docs/architecture.md)与[开发约定](docs/development-conventions.md)。

从仓库根目录运行 `node client/tools/check-project.mjs --help` 列出专项。在 `client` 目录运行 `npm run check` 可执行整套检查。后端测试命令和工具路径见[常用检查](docs/handoff.md#常用检查)。
