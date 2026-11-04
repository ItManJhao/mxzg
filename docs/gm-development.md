# 游戏内开发 GM

入口：主城头像 → 设置 → 开发 GM。只在 Creator 预览显示入口，窗口和选项分别为 `GmView.prefab`、`GmOptionCellView.prefab`，使用项目已有美术和 SuperScroll。节点使用英文名，展示文字及手写代码注释使用中文。

## 服务端开关与测试边界

- 日常 local 后端默认关闭。需要开发发放时，在启动后端的 PowerShell 设置 `$env:MXZG_GM_ENABLED='true'`，再启动新进程；已运行的进程不会因设置变量自动变化。生产 profile 不装配 GM 服务。
- 独立 MySQL 验收使用 `backend/test-mysql.ps1 -MysqlHome <官方 ZIP 解压目录> -Preview`。测试启动器创建并校验自己的数据目录、库、受限账号和回环端口，在测试专用配置中开启 GM；不读取日常数据库环境变量，也不连接玩家库。
- 当前只发给当前登录角色，客户端不能传入目标角色 ID。关闭入口不代替服务端鉴权和开关。

## 操作与协议

1. 选择英雄或道具，输入名称或配置 ID 搜索；下拉最多显示 100 条，点选后填写数量。
2. `GmView` 转交 `GmController`，应用注入当前会话的调用能力，经 `GameSocketClient` 发送 `Protocol.GM_GRANT`。
3. `protocol/game.proto` 定义 `gm.status` 的 `GmStatus`，及 `gm.grant` 的 `GmGrant` / `GmResult`。全程 WebSocket + Protobuf，不增加业务 HTTP。
4. 服务端核验身份、开关、配置及数量，在当前角色行锁下写资产与 `game_gm_grant` 回执（V11），提交后通过 `state.changed` 同步。
5. 应用校验整包版本，角色、英雄、背包 Controller 更新唯一 Model，View 收事件刷新。GM 不直接改客户端资产。

英雄从配置初始星级、等级 1、阶段 0 创建，每次最多 20 个，受英雄容量限制。普通道具每次 1～9999；期限道具最多 100 件并逐件生成，期限按现有北京时间自然日规则。金币、钻石进入钱包。GM 不启用英雄升级、扩容购买、道具使用或分解。

相同角色和请求 ID 的重复提交只到账一次；复用 ID 改参数会拒绝。控制器在结果未知时保留请求 ID，禁止换参数重试；关闭窗口不清除未确认请求，换角色清除。这个前端保留只覆盖当前应用进程，不跨浏览器刷新；断线结果不明时应恢复连接核对资产，不能把重新打开浏览器后的再次发放当成原请求重试。

## 验证入口

- `node client/tools/check-project.mjs --suite gm`：请求回执、未知结果重试及二进制协议。
- `node client/tools/check-project.mjs --suite bindings`：全库脚本、按钮及预制体根元数据。
- 后端 `GmTest`：真实事务、角色隔离、重复请求、容量与 WS 推送；`GameSocketTest` 校验默认关闭拒绝发放。
- `MySqlIT.gmGrantsPersistAndRetrySafely`：独立 MySQL 发放英雄和道具，应用重启后重试仍不重复到账。

实际页面验收结果与本批运行标识见 `development-progress.md`。配置存在不代表对应玩法已经开放；GM 用于测试数据准备，不能作为玩法还原完成的证明。

### 日常后端版本提示

刷新 Creator 不会替换已运行的 Java 后端。收到 UNKNOWN_MESSAGE 时，前端提示“服务端不支持此协议，请更新并重启后端”；应重启到包含 GM 的代码。2026-11-04 日常后端已以 MXZG_GM_ENABLED=true 启动并通过真实 gm.status 查询；该开关只对本次启动进程生效，重新启动时仍须显式设置。
