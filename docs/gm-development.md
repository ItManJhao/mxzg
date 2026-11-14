# 游戏内开发 GM

入口：登录进入主城后，在 Creator 浏览器预览中松开 **F9** 打开或关闭开发 GM；打开过程中再次按 F9 也会取消。角色资料/设置中的旧 GM 按钮已移除。入口仍仅限 Creator 预览，发布包不注册该快捷键。

`GmView` 只保存总菜单，点击功能后打开对应窗口：

| 入口 | 窗口及职责 |
| --- | --- |
| 英雄 | `GmGrantView` 的英雄类别，搜索配置并发放到当前角色 |
| 道具 | `GmGrantView` 的道具类别，包含已恢复的真实精灵 2000002 |
| 技能 | 已有技能验收窗口，继续使用原测试流程，不发放玩家技能 |
| 战斗测试 | `GmBattleView` 选择前三关，使用当前保存阵容，只试战、不推进主线或发奖 |

英雄和道具共用一份发放表单 Prefab，通过类别参数区分，不在总菜单拼装列表。`GmOptionCellView` 由 SuperScroll 复用。各窗口使用现有美术与 UIManager 共享模态，关闭子窗返回菜单；关闭总入口会清理发放、试战子窗和正在加载的窗口。节点使用英文名，展示文字及手写代码注释使用中文。

## 服务端开关与测试边界

- 2026-11-14负责人确认本机local默认开启GM：application-local.yml使用`${MXZG_GM_ENABLED:true}`，每次启动/重启都会读取，不再要求临时设置环境变量。需要关闭可显式设置`MXZG_GM_ENABLED=false`；production仍不装配GM服务，不能仅隐藏前端入口。
- 独立 MySQL 验收使用 `backend/test-mysql.ps1 -MysqlHome <官方 ZIP 解压目录> -Preview`。测试启动器创建并校验自己的数据目录、库、受限账号和回环端口，在测试专用配置中开启 GM；不读取日常数据库环境变量，也不连接玩家库。
- 当前只发给当前登录角色，客户端不能传入目标角色 ID。关闭入口不代替服务端鉴权和开关。

## 本机永久设置与重启

本机默认开启已保存到项目配置，重启继续生效；不需要修改Windows系统环境变量或执行策略。当前仍在运行的Java进程须重启一次，刷新Creator或重新打开GM窗口不会替换后端配置。

直接双击`G:/work/FsGame/Project/mxzg/scripts/restart-remake-backend.bat`。该入口已为自己的PowerShell子进程配置`-ExecutionPolicy Bypass`，可处理直接运行control.ps1时出现的“此系统禁止运行脚本”，不更改系统级执行策略。普通start入口可能只复用旧服务，因此本次应使用restart。

若从命令行启动，也可使用同一个进程级设置：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File 'G:\work\FsGame\Project\mxzg\backend\control.ps1' -Action restart
```

服务端仍检查会话、开关和持久幂等，生产profile排除GM服务；隐藏前端入口只能收起界面，不能阻止直接构造`gm.grant`请求。上线时保持服务端限制，不把本机默认开启配置当成生产授权。

此前负责人断点`enabled=false`对应当时的默认关闭，独立GM开启后的英雄/普通道具实发及统一推送见[先前检查](validation/gm-bag-battle-review-20261114.json)。本机现按负责人要求默认开启；本批进一步恢复 2000002 的真实精灵发放，不再沿用“所有 type8 均拒绝”的旧限制。其他未恢复精灵仍明确拒绝，不生成普通堆叠。

先前默认开关调整的31项回归见[永久默认设置记录](validation/gm-local-default-20261114.json)，只代表该批结果。当前源码还需对应后端进程和 Creator 脚本更新；不能用旧进程或历史截图证明本批已生效。

## 操作与协议

1. 按 F9 打开总菜单，进入英雄或道具窗口，输入名称或配置 ID 搜索；下拉最多显示 100 条，点选后填写数量。
2. `GmGrantView` 转交 `GmController`，应用注入当前会话的调用能力，经 `GameSocketClient` 发送 `Protocol.GM_GRANT`。
3. `protocol/game.proto` 定义 `gm.status` 的 `GmStatus`，及 `gm.grant` 的 `GmGrant` / `GmResult`。全程 WebSocket + Protobuf，不增加业务 HTTP。
4. 服务端核验身份、开关、配置及数量，在当前角色行锁下写资产与 `game_gm_grant` 回执（V11），提交后通过 `state.changed` 同步。
5. 应用校验整包版本，角色、英雄、背包 Controller 更新唯一 Model，View 收事件刷新。GM 不直接改客户端资产。

英雄从配置初始星级、等级 1、阶段 0 创建，每次最多 20 个，受英雄容量限制。普通道具每次 1～9999；期限道具最多 100 件并逐件生成，期限按现有北京时间自然日规则。金币、钻石进入钱包。GM 不启用英雄升级、扩容购买、道具使用或分解。

### 真实精灵发放

- 仍用 `gm.grant` 的 `kind=item`，当前只支持 `configId=2000002`（月兔精灵·蓝），不新增精灵发放协议。
- 单次数量为 1～1000，调用现有 `SpiritInventoryService` 逐件生成独立字符串 UUID、真实随机属性与技能，写入 `game_spirit`；不向 `game_inventory` 写入假堆叠。
- 1000 是单次技术批量保护，不是玩家持有容量，不裁剪请求。1001～9999 整笔拒绝，错误码为 `GM_SPIRIT_LIMIT`；其他未恢复的 type8 配置返回 `GM_UNSUPPORTED_ITEM_TYPE`。
- 原角色锁和事务边界保持：先核对 `game_gm_grant` 持久回执，再进行随机生成。实例、回执和资产版本同事务提交，回执写入失败则全部回滚，不发状态通知。
- 重放相同角色、请求 ID 和参数时直接返回原回执，不重新抽属性、不改实例 ID、不再递增版本或推送。成功提交后由统一 `state.changed.spiritInventory` 恢复完整真实实例集合，GM 窗口不改本地资产。
- 此入口仅准备测试数据；挂机领取、精灵穿戴、养成、洗练等玩法继续关闭。

相同角色和请求 ID 的重复提交只到账一次；复用 ID 改参数会拒绝。控制器在结果未知时保留请求 ID，禁止换参数重试；关闭窗口不清除未确认请求，换角色清除。这个前端保留只覆盖当前应用进程，不跨浏览器刷新；断线结果不明时应恢复连接核对资产，不能把重新打开浏览器后的再次发放当成原请求重试。

### 统一操作反馈

发放成功、服务端拒绝、开关查询失败和试战失败均走 `UIManager.toast → ToastManager`，窗口底部只保留使用限制与当前准备状态。错误提示保留具体原因，不能把服务端拒绝显示成“连接请求失败”或假成功。

`ToastManager` 复用 `Remake.scene` 已有的 ApplicationNotice 面板与 Label，不动态创建另一套提示节点。提示按顺序淡入、上浮、淡出；含当前最多八条，当前和队列同文去重，满时保留当前与最新七条。长中文保留场景宽度并换行撑高背景；应用每帧 `update(dt)` 推进，不额外创建定时器。换号 `clear()` 清除旧提示后仍可继续显示，应用结束 `dispose()` 终止并忽略迟到结果。

## 验证入口

- `node client/tools/check-project.mjs --suite gm`：请求回执、未知结果重试及二进制协议。
- `node client/tools/check-project.mjs --suite bindings`：全库脚本、按钮及预制体根元数据。
- `node client/tools/check-project.mjs --suite startup`：提示队列、去重、淡入淡出、长文字布局边界、换号和销毁清理；引擎替身不代表真实渲染验收。
- 后端 `GmTest`：真实事务、角色隔离、重复请求、容量与 WS 推送；新增精灵真实实例、1000边界、超限拒绝、回执写入故障回滚及二进制快照重放检查。`GameSocketTest`显式关闭GM并验证拒绝发放；`GameSocketActivationTest`核对local默认开启、显式关闭及production隔离。
- `MySqlIT.gmGrantsPersistAndRetrySafely`：独立 MySQL 发放英雄和道具，应用重启后重试仍不重复到账。

实际页面验收结果与本批运行标识见 `development-progress.md`。配置存在不代表对应玩法已经开放；GM 用于测试数据准备，不能作为玩法还原完成的证明。

2026-11-14本批后端实际运行 `GmTest`（9）、`SpiritInventoryServiceTest`（10）、`SpiritSocketTest`（3）、`GameSocketTest`（22）及 `GameSocketActivationTest`（4），共48项通过，日志位于本地 `backend/target/gm-hub-tests.log`。全局提示的 startup 专项通过。本机独立预览已验证F9和四入口、真实精灵/英雄发放、1001只拒绝的中文飘字、专用精灵详情、技能提示、只读试战胜利/返回，以及实际第三关结算回到挂机。退出后GM关闭，测试进程已停止；范围和截图见[本轮记录](validation/gm-toast-review-20261114.json)。本批未构建发布包、连接或修改日常玩家数据库，日常后端尚需负责人重启一次。

### 历史日常后端版本提示

刷新 Creator 不会替换已运行的 Java 后端。收到 UNKNOWN_MESSAGE 时，前端提示“服务端不支持此协议，请更新并重启后端”；应重启到包含 GM 的代码。2026-11-04 日常后端已以 MXZG_GM_ENABLED=true 启动并通过真实 gm.status 查询；该记录仅代表2026-11-04当时的进程，不代表当前开启；本机现已改为配置默认开启，重启按当前配置读取；历史临时变量说明不能覆盖本页当前设置。
