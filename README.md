# mxzg

mxzg 重做工程使用 Cocos Creator 3.8.8 / TypeScript 和 Java 21 / Spring Boot。游戏业务统一走 WebSocket + Protobuf。工作约定见 [AGENTS.md](AGENTS.md)。

## 本机启动

1. 双击 [start-remake-backend.bat](scripts/start-remake-backend.bat)。修改 Java 后使用 [restart-remake-backend.bat](scripts/restart-remake-backend.bat)。
2. 在 Creator 中打开 client 项目，预览 [Remake.scene](client/assets/scenes/Remake.scene)。
3. 选服、登录后进入主城。已开放功能和当前验证范围见 [项目进度](docs/development-progress.md)。

日常开发使用本机预览。后端配置、独立测试及集中构建步骤见 [本机工作流](docs/local-remake-workflow.md)。

## 阅读入口

| 要找的内容 | 文档 |
|---|---|
| 当前功能和验证结果 | [项目进度](docs/development-progress.md) |
| 剩余工作与优先级 | [实施路线](docs/restructuring-plan.md) |
| 接手步骤和代码入口 | [交接文档](docs/handoff.md) |
| 职责、状态和生命周期 | [架构](docs/architecture.md)、[开发约定](docs/development-conventions.md) |
| 各功能的专题说明 | [文档索引](docs/README.md) |

后续开发使用 hao 分支。提交、推送及 main 合并按当次授权执行。

## 检查

从仓库根目录运行 node client/tools/check-project.mjs --help 查看专项。日常改动运行对应专项即可，完整检查通过 client 下的 npm run check 启动。Python 路径、后端测试和预览入口见 [交接文档](docs/handoff.md#常用检查)。
