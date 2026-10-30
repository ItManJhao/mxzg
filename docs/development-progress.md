# mxzg 重做版开发进度

更新日期：2026-10-30。本文件记录实际完成情况与接续工作，架构意图见 architecture.md。

## 当前快照（优先阅读）

- 最新范围：背包库存事件及必要调用方，沿用 features/Bag、完整名称、BaseModel/BaseController、全局 EventDispatcher/EventScope；不扩展全项目架构或玩法。
- 技术结果：**27/27**、Creator 3.8.8 strict 通过；真实本机查询、开/关背包领奖、详情、旧 GET、重复领取、开关/换号/换服通过，两轮浏览器错误 0。没有构建包、提交推送、发布或修改后端/数据库结构。
- 事件：BagAdd/BagRemove/BagQuantityChanged 按类聚合，最后一次 BagUpdate；首次和 reset 只汇总，重复相同库存不发库存事件，状态独立通知。Model 返回只读差异，Controller 派发，旧 Changed 路径删除。
- 入口见 [事件规则](bag-inventory-events.md)、[维护指南](bag-mvc-maintenance.md)、[本批证据](validation/bag-events-20261030/README.md)。此前标准模块/列表样板是历史技术结果，人工阅读和 Inspector 体验仍待用户，未代签。

## 2026-10-30 背包库存批次事件（当前批次，技术验证通过）

- 起始 main / 2022a566，工作区干净，上一批标准模块已提交。本批沿用已有实现，不新增私有派发器或窗口框架；Prefab、脚本 UUID、SuperScroll/SuperContent、HTTP 协议、后端和数据库结构保持不变。
- 确认真实协议 itemId/quantity，服务端 game_inventory 以 role_id/item_id 为主键并查询 quantity>0。本批按当前角色内 itemId 比较，不给不存在的实例 ID 编造规则；未来实例协议需重新明确标识。
- 新增 data/BagChangeSet：Model 全量/增量先整批校验、局部计算差异、一次提交并返回冻结清单。新增/删除完整条目，数量变化含旧/新/差值；Model 不派发。Controller 先校验会话与顺序，按 Add→Remove→QuantityChanged 聚合，最后 Update；无对应变化不发送细分事件。
- 首次同步原因 initial-sync，只汇总且变化数组为空；角色 reset 以 session-reset 清理，只汇总，不当消耗。相同已同步库存不发库存事件；加载/失败/恢复用 BagSyncStateChanged。战斗调用显式传 reward，其他未明确来源默认 unknown，不根据数量正负推断。
- Controller 通知保护持续到全局派发器完成本批汇总回调，再放行同步回调排队的新库存提交，覆盖直接派发和外层 batchNotifications 场景。查询代数、串行写入、重复响应和跨号隔离保留；applyDelta 为 Promise<boolean>，等待进行中写入并要求调用方 await。
- BagView 打开先监听 BagUpdate 再读 Model；状态事件只更新提示，不重新排列列表。只使用汇总刷新而不同时监听全部细分，BaseView 清理本页两类监听，其他模块订阅保留。
- 专项检查覆盖首次、增加多条、已有数量增/减、归零移除、混合三类变化、重复库存、非法快照/增量、失败恢复、旧会话、回调重入下一批与重置；每个库存回调断言 Model 版本/整批数据一致，事件次数与参数匹配，包含不可变和 TS 负向约束。
- 初次真实预览明确读到旧 Changed 常量，探针停止并保留失败日志；用户完成 Creator 导入刷新后，新契约实测通过。两种领奖路径均有真实服务器响应：新增三种条目聚合为一次 Add、已有两种数量变化聚合为一次 QuantityChanged、最后一次 Update，回调读取钱包与完整库存一致。打开背包时仅一次列表刷新，相同查询只更新加载/恢复文字，零次列表刷新；奖励后详情显示真实新数量。
- 两轮还通过闭页查询、立即打开、三轮开关、状态监听清理/外部监听保留、旧 GET 在领奖后真实交付不回滚、重复实际领取、退出/换号/同账号换服。运行错误 0，源码和日志见本批证据。
- 未验证：真实库存删除/消耗的服务器功能尚无入口，删除/减量/混合与回调重入由可控业务检查覆盖；未让真实服务器故意返回非法响应/401/断网，相关保护由业务检查覆盖。未重复整套中性列表运行矩阵，未构建任何三端包、评估大库存性能或迁移其他模块。

## 2026-10-30 背包标准模块（历史批次，事件以顶部新规则为准）

- 基线 main / d7ea90a0 + 上一批未提交修改；先保存当前差异及背包源文件副本，不重置现有人工工作。源 Prefab、SuperScroll/SuperContent、资源路径和 UUID 绑定不改；10 个移动脚本的 meta UUID 逐一核对保留，目录实际大小写及导入统一 features/Bag。
- UI 为 BagView/BagItemView/BagInfoView/BagTabView；库存、状态和事件参数进入 data。BagModel 不再从 API 文件取校验；readBagItems 在 data/BagItemData，网络适配与 Model 共用。现有 BagApi、BagItemCatalog、ui/BagMount 明确保留为 HTTP、配置与挂载辅助，不是平行状态或新增转发层。
- BaseModel 只负责角色、版本、reset/dispose 与版本递增；BagModel 保存唯一库存与缓存只读快照。BaseController 只负责显式初始化、会话代次、resetSession/dispose、Scope 和 emit；请求队列/旧查询拒绝/响应去重仍在 BagController。
- 原 TypedEvents 改为唯一 EventDispatcher.instance，BagController 私有事件实例已移除。on/once/emit 类型化，once 回调前解除，可提前取消；错误含事件/拥有者与堆栈，单个监听异常不阻断其他监听。批处理保留相关 Model 全部提交后通知，不以事件存历史。
- EventScope 只收集退订；BaseController 拥有模块 Scope，BaseView.runClose 的 finally 清理本次开页 Scope，不依赖 super.onClose。BagView 先监听再读 Model。背包注册无 createController，BagController 不提供 show/close，类型及运行时禁止把模块 Controller 当页面适配器。
- 初始化重复调用、dispose 重复调用、销毁后重新初始化、空角色非有效会话、同角色查询乱序、串行库存更新、同步事件回调重复请求、旧会话 401/迟到读写、全量/增量/错误及重复奖励均有业务检查。错误事件名/参数与将模块 Controller 赋给页面 Controller 的代码纳入 Creator strict 负向断言。
- 真实本机运行：闭页查询/立即开页/事件刷新/三轮开关与外部订阅保留，关战斗与背包页期间领奖后钱包库存一致，交付真实迟到 GET 不回滚，重复实际领取不重复提交；退出、换号及同账号换服库存隔离通过，浏览器错误 0。
- 真实列表回归：四分类、详情、拖动不误触、刷新一次点击、滚动保留/缩短限制、104×104 兼容 Cell、切页重开；中性夹具覆盖横/竖/两种网格、0/1/3/18 条和非中心锚点。测试浏览器夹具不写玩家库存，不改源 Prefab。首次列表尝试因工具固定两秒等待遇到冷加载失败，改为等待真实 View 挂载后重新通过，失败记录保留。
- 检查工具的旧脚本路径已更新；已删除的缩写类、旧 InventoryController、背包开关和兼容链不留别名。旧协议类型与位置保持原样，未为命名迁移改协议。旧入口与其他页面状态仍明确隔离。
- 未迁移：AccountModel/AccountService、HeroRoster 多层实现、FormationController、CampaignController/挂机状态，以及 Boot/Main 的其他旧网络/状态依赖。全项目统一保持未完成；当前 H5 包未重建/未验收此源码，历史 H5 不能替代。人工阅读和编辑体验等待用户亲手确认。

## 2026-10-30 背包缩写 MVC（历史方案，命名与事件机制已被替代）

- 起始 HEAD `d7ea90a0`（main）。发现 BackpackView 已有人工格式修改，先保留副本并在原文件基础上改名，未回退人工修改；本批不改源 Prefab，保留 Creator 已保存的重排索引与已删除装饰节点。当前改动留在工作区，未提交/推送。
- BagC/BagM 是角色会话级模块，应用只绑定一次；Model 为唯一库存、只读且冻结，区分 idle/loading/ready-empty/error。BagV 开页先监听再读 M，关闭通过 BaseView.ownListener 清理自己的事件和点击，不请求另一份数据。
- TypedEvents 与 BagEvent 提供有类型事件；库存查询代数、会话代数、串行写入、全量/增量分离和响应标识去重已检查。账号旧资料 GET 不能回滚权威领奖钱包，旧账号 401 不使新账号退出。
- 战斗领奖通过 BagC.runInventoryUpdate 接原 CampaignApi，先提交账号和库存再通知；背包或战斗页关闭时仍完成当前角色有效结果，过时角色结果丢弃。服务器接口、持久化、鉴权、阵容 409 和奖励幂等未删除或改传输方式。
- 删除旧 InventoryController、BackpackFeatureFlag；BackpackView 改名 BagV 并保留脚本 UUID。旧 Main/screenFill 背包入口退役并明确提示 Remake，不再兼容新库存与旧 GameStore/WireSession。共享 Prefab、Cell、图标和资源边界保留；移除 bagBoard 已无引用的旧辅助逻辑和对应已解决依赖例外。
- 用户完成导入刷新后，实际运行验证：页面从未打开时查询成功、打开无新增查询且立即显示、打开期间一次 loading/ready 各刷新一次、三轮开关订阅不累积、详情正常；真实结算回包延迟到切出战斗后交付，库存/钱包仍同步提交，重复真实领取不重复广播。
- 迟到 GET 的早期探针曾被真实传输超时取消，不能作为迟到回包证据。最终探针在结算前捕获真实 GET，断言领取后其仍未结束，再交付原始响应并核对返回 false、库存不回滚；最终日志无该超时。旧读/写跨会话的可控延迟、取消和旧 401 另有业务检查；实际页面也通过退出、换号、同账号换服清理与新角色独立库存。
- SuperScroll 回归实际通过：四分类、真实库存/详情、拖动不误触、刷新一次点击、滚动保留、兼容 104×104 Cell、切页重开；隔离中性夹具覆盖横/竖/两种网格、0/1/3/18 条、缩短限制和非中心锚点。未把测试库存写入玩家数据。
- `bag-mvc-check`、既有 backpack/remake-playable/super-scroll/legacy 与全量 26 组通过；strict 通过。运行脚本早期还暴露了固定等待/按 View 后缀识别新 BagV 的测试定位问题，已修复工具并重新验收，未隐藏为运行成功。最终证据与源码哈希见 [bag-mvc-20261030](validation/bag-mvc-20261030/README.md)。
- 未迁移：AccountModel/AccountService、HeroRoster 的多层实现、FormationController、CampaignController/挂机状态，以及 Boot/Main 的其他 WireSession/GameStore 依赖。全项目统一保持进行中，只有背包本批技术链完成。后端仍是本地 H2；无后端/数据库代码改动，不宣称正式 MySQL 验收。

## 2026-10-30 SuperScroll 背包列表样板（历史批次）

- 开始时 main 已有上一批出阵页与工具/文档的未提交修改，基线 HEAD 为 `9c7732ae`；本批保留这些工作，没有回退或清理。没有更改数据库、后端协议或重新构建任何包。
- 新增的运行组件仅 SuperScroll 与 SuperContent，分别继承原生 ScrollView/Layout。Content 只填一次；布局类型/网格方向/列行数/间距/边距/Cell Prefab/显式尺寸覆盖在 SuperContent Inspector，原生派生字段隐藏，避免重复维护。没有新增 Manager、多层基类或虚拟列表框架。
- Backpack Prefab 结构已固定为 `BackpackLayer/spr_box/BagScroll/view/content`；Mask 保存到 view。BackpackView 不再执行 prepareScroll、重挂父子节点、补/关闭 Mask、计算格子坐标或 content 尺寸/归零位置。Cell 根尺寸与 content 范围由 SuperContent 计算，Cell 位置由原生 Layout 计算，滚动位置由 ScrollView 控制。
- 默认 4 列、96×96 自然 Cell、22/22 间距、左/右/上/下边距 35/35/8/38；20 个槽的范围为 520×614，viewport 为 520×555。空槽最少 20、按四个补齐仍由背包提供展示条目，与 Inspector 列数独立；bagBoard 的旧坐标/高度公式已移除。
- 同分类刷新复用节点并保留位置，内容缩短会限制范围，切换分类回到起点。库存请求期间保留上次真实快照，失败明确提示显示上次库存；换号/退出/关闭仍清空并拒绝迟到回包。Cell 显式绑定 Button，每次 show 解绑旧点击，图标/边框异步加载按展示版本丢弃迟到结果。
- 当时共享 Prefab/Cell UUID 和功能资源加载边界保留，旧 `?bag=old` 的 fillBag 仍读旧数据；此兼容链现已由后续 MVC 批次退役，以本文顶部为准。旧生成器检测到 SuperContent 后拒绝覆盖人工 Prefab。
- 编辑器预览使用 previewCount 生成无业务数据的 Cell，设 0 清理。节点为 DontSave/EditorOnly，参数为 editorOnly，运行模式不生成样例；未向服务器写测试库存。编辑器预览生成/清理和边界通过组件检查，实际 Inspector 编辑体验仍由用户确认。
- 用户完成导入刷新后，临时源 Prefab 的 3 列、30/18 间距、左/右/上/下 24/24/18/26 边距在实际 7456 预览及切页重开生效；分类、拖动、刷新、详情和兼容 Cell 均通过，错误 0。随后源参数已恢复默认，用户再次完成导入刷新，默认四列流程也通过。临时探针已撤回，不覆盖并发人工修改。
- 原生引擎验证覆盖竖向、横向、网格竖滚/横滚，0/1/3/18 条、不足一屏/超过一屏、刷新和缩短限制；真实背包覆盖库存、四分类、选中、详情、滑动不误触、重复刷新仅一次点击、兼容 104×104 Cell 与切页重开。通用夹具与玩家列表分离，只存在于独立测试浏览器。
- 收尾补充了非中心 Cell 锚点的排列路径与检查，统一使用原生横向排列并转置横滚网格的兄弟顺序，不手写 Cell 坐标。用户完成最后一次脚本编译刷新后，四种方向的非中心锚点补测及完整背包流程通过，运行错误 0；冻结的运行源码 SHA 核对一致，源临时探针 active=false。
- 完整检查 25/25，strict 使用当前 Creator 3.8.8 声明与编译器。新检查覆盖尺寸范围、Cell 复用、位置保留/缩短、显式绑定、点击去重、迟到图标和编辑器样例隔离；旧背包检查改为验证源层级与共享入口，不再要求保留已移除的运行时修补代码。
- 本批没有构建或运行最新独立 H5/App/小游戏产物。18081 是上一批旧包，不能与本批源码等同；未将本机结果代替包验收。当前规模证据不足以决定虚拟化，不声称已完成大库存性能验证。

本批入口与截图见维护指南；日志、实际参数、通用矩阵和源 SHA 见 [本批验证记录](validation/super-scroll-20261030/README.md)。最终日志 `super-scroll-acceptance.log`，完整检查 `super-scroll-project-final.log`。人工体验保持待验收，当前改动仍在 main 工作区，未提交/推送。

## 2026-10-30 出阵页人工维护样板（上一批）

### 基线与边界

- 开始时 main 工作区干净，HEAD 为 `9c7732ae`，未覆盖或清理其他工作。18080 后端、18081 H5 服务及本地文件库保持运行，没有清库或改后端业务。
- 基线 H5 的 `builtAt=2026-10-30T08:36:47.2144910Z`，`sourceCommit=faaab51f`、`sourceDirty=true`，因此不能直接称为纯 9c7732ae 产物。重新实跑登录、进城、直接打开出阵、取消/保存/战斗成功，浏览器错误 0；此前 `packs`、`target.getComponent`、无法进城阻塞未复现，本批没有重复修它们。
- 基线证据在 `client/temp/project-checks/formation-baseline.log` 与 `formation-baseline-build.json`。旧产物修复详情保留在下方“独立 H5 与启停工具”。

### 已落地的维护入口

- HeroSelectLayer 保存标题、按钮、阵位、列表层级和样式；Mask 在 view，Content 在 view 下，ScrollView.content 显式绑定。遮罩和阻止穿透也保存于 Prefab，不在打开时补建 UI。
- FormationView 不再覆盖静态标题/按钮位置、字体和尺寸，不重挂列表父子节点。仅集中适配根节点/Backdrop，动态 Cell 坐标、间距、列数、缩放和留白有 Inspector 参数；Content 只更新动态高度。
- 九个阵位绑定必要的 FormationSlotView，编号与数组顺序解耦。共享 HeroIconCell 显式绑定 Button，星排列迁到 Prefab 的标准 Layout；保留原资源 UUID 和头像按需加载。缺失绑定报告具体 Prefab/字段，不静默生成替代 UI；Cell 绑定也在打开前校验。
- 真实查询/选择/撤下/取消/PUT expectedVersion/409/进入战斗沿用原有轻量业务结构；没有新增 Manager、平行状态或后端协议。当前请求及类型仍是手写，接口生成与契约漂移检查继续作为未完成项。
- product-requirements、architecture、restructuring-plan 已同步本批范围和正式服目标；准确节点/代码入口和编辑步骤见维护指南。

### 技术验证

- 完整客户端检查 24/24，strict 类型检查通过。新 formation-view 检查读取实际序列化 Prefab，验证手改样式/位置/列表参数经过重复渲染与三次开关仍保留，以及缺字段定位；原 formation 业务检查保留空阵容、重复提交、取消及 409 等行为。
- 用户完成 Creator 导入刷新后，实际 7456 预览的默认布局和临时布局均走通，浏览器错误 0；仅使用独立测试浏览器，没有操作 Creator 窗口。曾运行旧编译脚本的预览失败如实保留，不冒充当前源码结果。
- 临时源 Prefab 探针：标题 44、确认按钮 `(344,96)`、2 列、间距 `124×148`。Creator 预览及隔离构建后的独立 H5 均确认运行值，并通过取消草稿、重开、保存、进入战斗、结算与刷新恢复，错误 0。H5 阻断 7456，未退回编辑器预览。探针已撤回，交付默认为 56、`(320,84)`、5 列、`112×130`。
- 探针包 `builtAt=2026-10-30T10:06:04.1582328Z`，源基线 `9c7732ae` + dirty；输入出阵 SHA `b7ab530dc24d9e03b863ba542ead479f3676d65e95afda3d393de4dd1237ec2e`。日志 `formation-h5-probe.log`，参数 `formation-h5-probe-formation-layout.json`，构建身份 `formation-h5-probe-build.json`。
- 临时布局追加独立 H5 检查：取消出阵 → 切到英雄 → 返回战斗 → 重开，样式/列表参数仍保留，草稿未落库，保存与战斗继续通过，错误 0。证据为 `formation-h5-probe-switch.log` 与同名前缀的布局 JSON。
- 最终默认布局 Creator 预览已通过，包含共享 Cell 一颗星显示，日志 `formation-editor-final.log` 与 `formation-editor-final-formation-layout.json`。用户随后要求暂停 H5 构建、本机优先：已只终止隔离工程 `client/temp/remake-h5-project` 的命令行构建进程树（PID 20016），未停止编辑器或后端；该次驱动退出 1 属于用户取消，**不是构建成功**。
- 当前已发布 H5 仍是 18:06 的临时布局验证包（44 字号/两列），不能作为默认布局交付截图；源 Prefab 已恢复默认。本批 H5“能通及修改后能生效”的证据已取得，不再重复构建默认包。本机完整流程收尾和截图单独记录。
- 本机最终收尾实际通过：登录/选服/显式开始 → 英雄/背包 → 挂机 → 出阵修改后取消 → 切英雄页再返回重开 → 保存阵容 → 战斗/跳过/领取 → 道具详情 → 刷新停留登录 → 明确开始并恢复第 2 关，页面/控制台错误 0。新账号一颗星可见，默认字号/位置/列表参数与源 Prefab 一致。收尾统一“出阵”提示文案后，formation、formation-view、hero 与 strict 再次通过，差异空白检查通过。
- 该次中间尝试在刷新后状态为空时被固定九秒等待误判为进城，失败日志 `formation-local-delivery.log` 保留。探针改为等待真实入口出现，再验证必须停留登录；最终通过日志为 `formation-local-delivery-verified.log`。没有把该失败或用户取消构建隐藏成成功。
- 可随源码查看的关键日志、实际布局/预期参数、H5 构建身份保存在 [本批证据](validation/formation-20261030/README.md)；[维护指南](formation-ui-authoring.md)包含最终 Canvas 截图及正式服参考图。当前改动留在 main 工作区，尚未提交或推送；人工体验仍待用户确认。

### 用户验收门槛

本批代码与技术探针不等于“人工体验已验收”。用户需按维护指南亲手改按钮、字体、列表参数，保存后检查本机预览，确认好找、好改、重开不复原。按最新要求不强制现在重复构建 H5；以后需要验收 H5 修改时再重建。正式服尚缺的交互/规则及比例差异单列，未宣称 1:1。其他页面和新玩法不在本批扩展。

## 上一批功能快照（历史）

- 更新：2026-10-30。用户提供日服正式服与旧预览视频后，本批集中完成选服登录、统一启动适配、底栏切页、背包与基础战斗闭环。逐项验收见 [本批验收说明](night-acceptance-2026-10-30.md)，从 0 到 1 的固定任务编号仍见 [实施路线](restructuring-plan.md)。
- 入口仍为 `assets/scenes/Remake.scene`：加载资源/配置 → 登录和选服 → 明确点击开始 → 初始化角色 → 主城。恢复身份不会自动进城。
- 加载与登录保留两个职责不同的 Prefab，改为同一底图、同一人物缩放/位置规则。底栏按日服宽度公式适配，选中项为其他项的 1.5 倍，内容页用 280 ms 指数缓动；顶底栏常驻。
- 新后端已有区服目录、账号在各服的独立角色、英雄/阵容、背包和基础战报/奖励。local 是 `backend/.local/game.mv.db` 文件数据库，提交即时落盘；不是 MySQL，也不连接旧服数据库。
- 客户端英雄、背包分类/道具详情、基础战斗/跳过/领奖/关卡推进已接真实 API。新手初始化只发一次三名英雄及经验材料；已有英雄/阵容保留。当前战斗是 `basic-attacks-v1` 普攻规则，投影前 20 关的敌方和首通奖励，完整技能、等级成长和平衡尚未还原。
- 客户端完整检查最新 23/23（新增 Creator 发布转换回归）、strict 类型检查通过；后端业务测试 24/24。隔离文件库经历两次强制结束进程后，角色、会话、未领取战报、背包、金币和关卡均保持；重复领奖只发一次。
- 独立 H5 已在 18081 实际点击通过选服、账号输入、开始、英雄、背包、挂机、出阵、战斗、跳过、领取、道具详情和刷新恢复；阻断 Creator 的 7456 后仍可运行，页面及控制台错误为 0。截图在 `client/temp/project-checks/h5-*.png`，此前 Creator 预览截图为 night-*。这属于桌面 Chrome 手机尺寸的技术验收，最终视觉由用户确认；App/微信小游戏与 MySQL 尚未验收。
- 未操作或检查用户的 Creator 窗口。未推送本批改动；下方历史批次中的版本、测试数和“未完成”不覆盖本段。

## 2026-10-30 独立 H5 与启停工具（本批）

- P7-01：新增固定 Remake.scene 的 web-mobile 构建参数和命令行脚本，使用独立 `client/temp/remake-h5-project`，输出 `client/build/remake-h5`。已通过完整构建、产物校验和实际 H5 点击。修复 Creator 发布转换把 Set 展开当普通数组的问题，配置分组、选服区域、挂机演员及旧日志/网络监听快照改用 Array.from。
- 新增 creator-compat 检查，用安装的 Creator Babel 转换执行实际配置分组检查，包含复现原错误的负例。完整客户端检查为 23/23、strict 通过，不能用这些结果代替独立 H5 的实际点击。
- 新增独立静态服务与 start-remake-h5，绑定 18081，仅接受构建身份为 Remake 且通过包引用校验的产物，禁用缓存与目录列表。完整流程和首次直接进入战斗的独立路径均通过，见 `client/temp/project-checks/h5-acceptance.log` 与 `h5-direct-acceptance.log`；页面/控制台错误均为 0。首次完整流程曾记录 3 个连接失败，两条路径复跑未复现；日志现记录失败请求地址并把控制台错误列为失败，不能只看截图或按钮已走通。
- 修复 ChooseServerCell 的 Button 指向 CompPrefabInfo 的错误，绑定检查现验证目标必须为 Node。自定义 Bundle 不再使用 priority 0：resources 8、prefabs 2、remake-home 1，修复主城生成配置中包条目指向 67 个缺失 UUID 的错误。`tools/check_h5_artifact.py` 在发布前核对入口、包内引用及重定向；已用错误产物验证会拒绝发布，修复版五个 Bundle 均通过。
- 首个调试全包约 656.13 MiB / 61,351 文件，其中 resources 645.14 MiB；这是完整产物大小，不等于首屏下载。当前 393×852 测试在登录时记录 79 个同源资源请求 / 39,341,262 字节传输（约 37.52 MiB）。这不是生产压缩、弱网耗时或峰值内存结论，作为后续 P2/P7 优化基线。
- 后端新增 status/stop/restart 入口，核对 Java/local profile/当前仓库路径及进程创建时间后才停止指定 PID。随机端口、隔离 H2 文件库的实测通过：拒绝停止其他程序；打包 Java 与 Maven 启动均可识别；会话、角色和主线跨重启保留。证据：`backend/.local/h5-control-check.log`。
- 后端仅在 local 增加 localhost/127.0.0.1 的 18081 来源，仍拒绝其他来源；24 项业务测试通过。实际 18080 已重启并恢复 READY；停服期间复制数据库备份到 `backend/.local/database-backups/game-before-h5-20261030-153825.mv.db`。Windows 开发停止使用终止已核对 JVM，不等于生产优雅停服。
- 启动占用检查 5/5，本地预览/产物/进程归属检查 7/7（含七种身份案例）。实际重复启动检查发现 Windows 的 SO_REUSEADDR 允许双进程监听，现改为独占监听并增加回归；重复启动输出复用，netstat 核对仅一个 18081 监听者。操作入口与边界见 [本机工作流](local-remake-workflow.md)。MySQL、服务端挂机收益与完整战斗规则仍未推进完成。

## 2026-10-30 正式服视频对照与调整

参考：用户提供的 `F:\效果\夢境 - Google Chrome 2026-10-30 14-15-35.mp4`（62.875 秒、1920×1052）和正式服 `https://mxzg-test.funsgamex.com/jp/`。网页可打开；交互工具在提交测试登录时超时，因此流程/视觉结论以实际逐段查看的视频为依据，不宣称已独立游玩完整正式服。

- 0–15 秒：外层开发账号、游戏加载与登录。重做版保留自己的开发身份入口与显式开始，加载/登录继续共用背景与人物适配。正式渠道登录、中文品牌美术仍另有任务。
- 24–25.5 秒：主城/英雄。发现顶栏原图应将中心放在屏幕上沿、裁掉上半张；此前整张显示导致蓝色区域约高一倍。已修正 TopBar 高度、背景锚位及名字/货币的宽度比例。英雄名册继续显示本账号实际拥有的英雄，不照抄视频四名英雄、等级和战力；详情/养成尚未开放。
- 27–30 秒：背包。原商店人物、四分类、格子和详情继续复用，库存数量来自自己的服务器；不新增视频中的付费/运营功能或虚构道具。
- 31.5–33.5 秒：挂机。已接真实出阵英雄与当前关敌方模板，复用旧模块完成跑步、天空/地砖双图循环、遇敌停步停背景、敌方从右入场、击杀后恢复。演出不写钱包、不推进主线；真实挂机产出、离线收益与领取仍待 P5-04。
- 34–35 秒：出阵。已复用 HeroSelectLayer，读取 GET heroes/lineups，支持元素筛选、上阵/撤下、取消，确认后以 PUT expectedVersion 保存再挑战。实例使用 UUID；空阵容不能开战，连点只提交一次，版本冲突/不确定保存先重新读取。当前主阵容政策仍是服务端已有的七个合法位置；完整解锁/阵法/助阵待核对。
- 36–51 秒：主线。已在挂机与挑战之间加出阵步骤；背景暂停，消费服务器战报，跳过/倍速不改变结算；复用 ZDKS 开场动画，修正击杀后仍站立与攻击末帧停住的表现，并按正式服改为紧凑血条与等级显示。基础规则仍是 basic-attacks-v1，未宣称复刻正式服全部技能/成长。
- 51.5–53.5 秒：结算返回。仍由服务器事务发奖、推进关卡，之后重建当前阵容并恢复挂机循环。视频中的 MVP、经验条、收益提升和更多奖励不能由缺失字段补造；已隐藏出阵页未接入的战力/契约等默认显示。

本批已通过客户端完整检查 22/22 与 strict；新的出阵检查覆盖草稿、PUT、空阵容、重复提交和 409 重新读取。实际预览覆盖挂机背景移动、取消出阵、选择后保存、主线、领奖和刷新恢复，完整复跑见 `client/temp/project-checks/formal-preview-final.log`；跳过英雄/背包直接进入战斗的独立路径见 `formal-preview-direct.log`。用户未要求操作 Creator 窗口，本批仍只使用独立浏览器验收。

### 项目目录清理

- 用户要求先保存全部本地改动，已提交 main：`44a689a9`，仅移除 Creator 自动写入的临时会话参数。
- 清理 `F:\project` 下四个旧 PR 工作树、PR294 的完整重复 overlay、检查源码副本、三批资源暂存目录、四个 zip/暂存脚本及空证据目录。当前根目录只保留 `mxzg`。
- 四个工作树的提交仍在 Git 历史；未跟踪文件、独有资源与源包归档在 `backend/.local/project-cleanup-20261030`，共 12 个校验通过的 zip 和 manifest。PR294 overlay 已逐文件确认与原工作树一致。归档约 35.7 MiB，清除约 3.6 GiB 的重复/历史目录内容；没有清理主工程、参考日服项目或运行数据库。
- 独立 H5 构建预览、MySQL、完整技能/成长与挂机收益仍按实施路线推进，不以本批表现调整替代这些验收。

## 2026-10-30 本批完成与接续

- P1：统一加载/登录几何，服务器列表来自后端；区服选择持久化，切服使用同一开发账号重新获取对应角色。
- P2：背包/战斗配置和 Prefab 按功能加载并纳入资源作用域，沿用现有 90 个计划内 Prefab；不另建临时业务页面。
- P3：V3 迁移新增区服、背包、主线与战报。修复 H2 默认延迟写盘在进程强制终止时丢失近期提交的问题，local 配置 `WRITE_DELAY=0`。
- P4/P5：服务器初始化、背包读取、基础挑战和结算形成闭环；领奖以角色锁和事务保证幂等，战报保存后再播放，重开页面可恢复未领取结果。
- 真实预览修正：跳过按钮移离底栏、隐藏旧 VS/999 占位、按服务端阵位摆人、支持主阵容七名参与者、修正道具标题高度、结算只显示实际服务器奖励。
- 下一步（按 10 月 30 日用户补充调整）：挂机/出阵/主线/结算返回已接入基础表现；继续完善脱离 Creator 的 H5 构建预览、MySQL 独立开发库与挂机收益。养成、技能、挂机收益与召唤继续后续任务。

## 2026-10-30 启服与流程纠正

- 18080 的后端是上一批实际验收时启动的独立进程，未再双击 bat 也能玩是因为服务仍在运行。
- `backend/dev.ps1 run` 现在验证英雄鉴权、服务器目录及背包/主线接口：可用实例输出 READY 并返回成功，不重复启动；未知服务、旧接口仍提示处理，不自动停止其他进程。Windows 黑盒测试 5/5，现有真实 18080 复用验证通过。
- 用户确认正式服底栏战斗页是挂机入口。当前只完成基础主线 API/回放/结算闭环；完整挂机、出阵与返回路线尚未接入重做版。旧迁移代码已保留 `idleHangSkirmish.ts` 的跑步/无缝背景/停步遇敌等实现，将核对后复用。
- 关闭 Creator 后可继续写代码、运行后端和测试；目前最新画面的 7456 预览依赖 Creator。独立 H5 新构建流程尚未验证，不宣称已可关编辑器验收最新改动。
- H2 是本地开发数据库。工程已有 MySQL 驱动与 Flyway MySQL 支持，但实际 MySQL 迁移、事务与恢复未验收，不能称为正式数据库已就绪。

## 已完成

- backend 独立 Java 21/Spring Boot 工程、Maven Wrapper、JDBC 与 Flyway；local 使用隔离 H2，保留原 Java 8 服务。
- 开发登录、角色资料、持久会话哈希、过期校验、生产环境排除开发身份入口。
- 后端 7 项测试通过，覆盖真实 HTTP、重复和并发登录、状态保存、身份隔离、过期、生产入口隔离，以及 Creator 本地预览的 CORS 预检与未知来源拒绝。
- 客户端 account 功能的 Model、Controller、Service、API 边界与平台 HTTP 适配；不引用旧 WireSession。
- 登录检查覆盖数据校验、会话恢复、退出后的迟到响应、交错登录、网络失败与 401 的区别，以及 Controller 绑定与退订。
- 英雄列表已有 HeroApi、HeroRosterModel/Service、HeroRosterController/Presentation 与独立 HeroCatalog；共用 AccountService.authenticated，不读取旧协议状态。已装配到 RemakeApp，复用现有英雄列表和格子；验证加载/空数据/错误重试/筛选、会话隔离、关闭与销毁、返回主城和取消重进。视觉与实际三端运行仍待验收。
- AccountLogin.prefab 与独立 Remake.scene，显式绑定 View、输入框、按钮和标签，可在 Creator 中编辑。
- 新客户端代码通过 Creator 3.8.8 自带 TypeScript 编译器与引擎声明的 strict 类型检查，Prefab/scene 脚本绑定检查通过。
- 同一 AccountService/AccountApi 已通过 Node 测试 HTTP 适配器实连打包后的新后端，开发登录与会话恢复通过。实连使用隔离 H2 内存库；第一次服务启动等待 30 秒超时，后以更长等待及隔离库完成验证，不能据此判定原文件库故障。
- 已启用当前聊天每 30 分钟持续推进任务，仅有实质进展、完成、失败或需要用户行动时通知。
- 新登录与基础主城使用同一个既有 UIManager。应用显式注册 View、Prefab 加载与 Controller 工厂；Controller 生命周期随框架打开/关闭，旧页面路径不强制切换。
- 角色同步成功进入 RemakeHome，显示账户 Model 的真实资料；退出返回登录，不复制第二份角色状态。视图与注册、导航引用在关闭/销毁时清理，过时的打开意图作废。
- 新增 remake-navigation 检查，覆盖重复打开、页面替换、加载失败保留旧页、取消、Controller 初始化失败清理、常驻层生命周期、注册所有权清理、退出与主城绑定。
- 初始统一检查为 7/9；新增检查与最新结果见“当前快照”，旧 backpack 与 legacy 的背包布局失败仍保留。
- 新后端增加可双击入口 scripts/start-remake-backend.bat，以子进程 ExecutionPolicy Bypass 避免 Windows 默认策略阻止本机开发脚本，不修改系统策略。

## 现在如何查看

1. 双击 scripts/start-remake-backend.bat，启动本机新后端，默认 18080。或执行 `powershell.exe -NoProfile -ExecutionPolicy Bypass -File "F:\project\mxzg\backend\dev.ps1" run`。当前是游戏 API，尚无网页管理后台。
2. Creator 3.8.8 打开 client，等待导入后打开 `assets/scenes/Remake.scene` 并预览当前场景。原 Boot 入口未切换。
3. 资源加载完成后停留登录页，默认开发账号 player_1；已恢复身份时点击“开始游戏”会重新校验会话，否则使用输入的开发账号登录，成功后进入主城。右上角“开发账号”可恢复或清除本机会话；已有身份时清除会话可重新输入并切换账号。刷新可以准备保存的身份，但不会自动进入主城。主城“账号”面板可退出，仅清除本机会话，不代表服务端全局撤销。
4. 调整界面打开 `assets/prefabs/ui/account/AccountLogin.prefab`；按钮流程看 AccountController，状态看 AccountModel，请求与会话流程看 AccountService/AccountApi，依赖装配看 app/remake/RemakeApp。
5. 点击底栏“英雄”查看服务器名册；新账号首次初始化会获得三名英雄，旧账号保留原有数据。点击“背包”查看库存与道具详情；点击“战斗”进入挂机展示，再点击页内“战斗”打开出阵，确认保存后进入主线，结算领取后返回挂机。主城账号面板可退出。英雄详情、图鉴、圣龙、养成及真实挂机收益仍待后续接入。

仅允许本机 Creator 标准预览来源 http://localhost:7456 和 http://127.0.0.1:7456；使用其他端口或域名时需显式调整 LocalPreviewConfiguration 并验证，不直接放开所有来源。

## 可复跑检查

- 后端：`backend/dev.ps1 test`；打包 `backend/dev.ps1 package`。
- 客户端：`node client/tools/check-project.mjs --suite account`，esbuild 使用 client 开发依赖或 MXZG_ESBUILD_MODULE 指定的现有模块。
- UI 生命周期与主城：`node client/tools/check-project.mjs --suite remake-navigation`。
- 功能打开意图：`node client/tools/check-project.mjs --suite feature-navigation`；英雄 View/Controller：`--suite hero`；英雄配置与 Prefab 资源作用域：`--suite home-bundle`。
- 登录资源、旧控件复用与真实 Spine 数据兼容：`node client/tools/check-project.mjs --suite login-presentation`。
- 绑定：`python client/tools/check_script_type_ids.py`。
- 新代码 strict 检查：使用 Creator 自带 TypeScript 编译器执行 `-p client/tools/tsconfig.remake.json`；先让编辑器生成 client/temp/declarations。
- 实际 Service 联调：先启动新后端，将 MXZG_REMAKE_API 设为 http://127.0.0.1:18080，再执行 account 检查。Node 使用 fetch 作为测试适配器，业务 Model/Service/API 与样板共用。
- 英雄数据层：`node client/tools/check-project.mjs --suite hero-roster`；可选 MXZG_REMAKE_API 进行实连，此模式会创建测试账号，使用隔离库。本轮验证使用随机端口和 H2 内存库，服务已停止；日志 client/temp/project-checks/hero-roster-live.log。

## 尚未验收

用户较早截图确认了浏览器登录与角色资料页；后续已接原主城地图/顶底栏、启动动画、显式开始确认和只读英雄列表，最新效果仍待预览。严格类型、绑定与无引擎检查不能代替渲染。原生和微信 HTTP/存储适配、三端构建、正式渠道身份与 MySQL 8.4 集成尚未完成，主城尚无完整玩法闭环。

已有接口类型与运行时校验按当前 Java DTO 对齐；OpenAPI 的类型生成流程尚未接入。下一步先冻结最小接口契约，再建立生成与同步检查，避免扩展更多手工重复类型。

旧综合检查和旧背包检查的失败仍属于既有基线，不能归为新样板通过或失败，也不能静默删除。

## 接续顺序

1. 用户要求在此前进度上改进，而不是另起简陋页面。已有登录 Prefab 控件、日服背景与角色动画已接入同一个 AccountLogin.prefab，输入锚点已修正；下一步根据用户预览截图验收动态美术、窄屏与输入，并继续核查缺失 Logo。Creator 窗口操作已由用户要求停止。
2. 新 MVC 页面已接入统一 UIManager；后续扩展功能继续使用显式注册和同一生命周期，不另建管理器。
3. 只读英雄列表已适配原 Prefab 和主城返回路径；下一步接新 UUID 详情数据与原 HeroInfoLayer 的只读展示，隐藏未接入写操作，补齐详情需要的配置依赖和真实空态。继续核对初始英雄发放规则，为用户实际验收非空列表和出阵准备业务数据，不向用户库植入测试样本。
4. 继续 P3-02 的机器可读契约/类型同步，以及新后端出阵、一次战斗与结算用例；复用规则必须先有输入/输出对照。
5. MySQL 持久化和三端样包验证，再逐步替换旧入口。

自动任务应先核对当前 Git 状态与本文件，延续而非重做已完成事项；保留用户已有修改，不清库、不擅自部署或购买服务。

## 登录视觉修正依据（2026-10-29）

- 日服实际入口是 `jp-overlay/src/scene/LogoSceneCtr.lua`，不是开发用的 UserLoginCtr。它使用 `ccbi-res/map-bg-loading.jpg` 铺底、`spine/jiemian` 的 `stand` 循环、Logo、区服条和开始游戏按钮；应以此为视觉基准，保留新 MVC 与后端会话逻辑。
- 当前客户端已找到 `resources/ui/maps/map-bg-loading.jpg`、`resources/spine/jiemian`、`resources/ui/login/logo-scene_btn-start-game-1.png` 等资源。开始游戏图片本身为简体中文；`logo-scene_spr-logo.png` 目前是 3×3 透明占位，须核查日服实际资源来源，不能当成有效 Logo。
- 开发账号、恢复会话和本机联调状态属于开发工具，应与玩家登录主体区分。正式界面修改必须保存为可编辑 Prefab，不能靠运行时拼节点替代。
- 输入溢出的原因已查明：Creator EditBox 自动将文字定位到输入框左上角，而样板文字子节点采用中心锚点。应将 Text 与 Placeholder 改为左上锚点和左对齐，再验证输入。

## 本批完成：复用已有登录成果（2026-10-29）

- 保留 AccountLogin.prefab 的资源 UUID 和 Remake.scene 绑定，替换临时浅灰布局；直接复用 LoginPanel.prefab 已有的 AccountField、BtnEnter（包含按下态贴图）与 ServerBg，原 LoginPanel、Boot 和旧登录链路未改动。
- 背景引用日服 map-bg-loading，角色引用现有 jiemian/stand。LoginArtwork 只负责屏幕尺寸适配，资源、节点和设计布局仍保存在可编辑 Prefab。
- 原 Spine 3.7 JSON 兼容转换提取到 framework/assets/SpineJson，旧 spineUpgrade 保留重导出，旧战斗与新登录共用一份转换实现；新 CompatibleSpine 用独立内存副本播放，并在销毁时清理，不改资源原文件。
- 开发账号与会话按钮默认折叠在右上角“开发账号”面板，默认 player_1；开始游戏仍调用已完成的新 AccountService。未添加假区服列表或假公告接口。主城仍是资料联调页，尚未迁回已有主城 UI。
- Text/Placeholder 已修正为左上锚点、左对齐和单行；错误/连接状态显示在开始按钮下方。
- 验证：Creator 3.8.8 strict 编译通过，脚本绑定与 Prefab 图引用检查通过；account、remake-navigation、login-presentation、architecture、bindings、hero、city、battle 通过。backpack 与 legacy 仍在既有背包布局断言失败。新登录资源测试最初错误地要求转换前后曲线编码相同，修正为验证非曲线动画内容保持一致后通过；不声称引擎渲染已验收。
- 待完成：有效 Logo 来源、实际动画与裁切截图验收、已有主城 UI 与新服务端能力逐步整合；启动入口尚未合并。

## 场景目录整理（2026-10-29）

- 顶层保留 Remake.scene，作为当前新后端开发入口。
- 旧 Boot.scene 与 Main.scene 移到 scenes/legacy；Boot 登录后按场景名加载 Main 并添加 MainApp，因此二者继续保留。Main 单独预览不能初始化旧主城。
- 未被代码加载、未挂战斗脚本的 Battle.scene 移到 scenes/legacy/placeholders；现有战斗走主城页面，不走该场景。
- 所有场景与 .meta 成对移动，UUID 与文件内容保留；同步本机构建历史中的资源 URL、Boot 注释和旧预览说明，不改构建任务的原参数或首场景 UUID。
- scenes/README.md 已重写为实际入口说明，覆盖新旧服务器、预览方式、场景生命周期与构建选择。后续页面继续使用 Prefab，而非每页增加场景。

## 修复登录页切换时的 Spine 销毁异常（2026-10-29）

- 用户截图显示：自动恢复会话后已打开 RemakeHome，销毁 AccountLogin 时 CompatibleSpine.onDestroy 调用 skeletonData setter，进入引擎 Skeleton._updateUITransform 后读到已销毁的 UITransform 数据，触发 width 空引用及后续重复销毁提示。
- 移除 onDestroy 中的 skeletonData 赋值；渲染组件由引擎清理，运行时 SkeletonData 在下一次任务回调中释放，确保当前节点的组件销毁完成。回调捕获资源前先清除所有权，重复清理不会再次调度释放；每份运行时数据使用独立 UUID，避免快速重开与上一份释放回调碰撞。
- login-presentation 回归检查模拟 UITransform 已销毁但 Skeleton.isValid 仍为 true 的顺序，验证不调用数据 setter、资源晚于渲染器释放、重复清理只释放一次、快速重开使用独立缓存键；同时保留真实 jiemian 数据转换与 Prefab 检查。
- 测试替身的 property 装饰器补齐裸 @property 形式，避免测试实例中的 clip 被错误定义为只读。login-presentation、remake-navigation、account 与真实 Creator 声明的 strict 检查通过；实际预览需刷新验证，不声称已操作 Creator 或完成渲染验收。

## 复用已有主城与分辨率核查（2026-10-29）

- 用户询问日服设计尺寸及 640/720 的区别。已从日服 engine_changes.patch 的 AppDelegate 启动代码确认：通常设置 640×1280 FIXED_HEIGHT；height/width <= 1.34 时分支设置 768×1280 FIXED_HEIGHT。当前 Creator 已是 640×1280、仅 Fit Height，保持一致；新功能逻辑坐标以 640 为准，高清素材另行定义像素倍率。详见 safe-area.md 的证据与适配说明。没有修改全局分辨率。
- RemakeHome.prefab 保留原 UUID，直接引用 canonical CityHub.prefab 与 CityChrome.prefab，不复制两套地图/顶底栏，不启动旧 MainApp、旧会话或 WebSocket。UIManager 继续管理 Home 页面；Home 负责这两个既有子 View 的打开、等待和销毁。
- 昵称、等级、金币与钻石直接来自同一 AccountModel；不编造战力、头像、开服天数或玩法进度。未接入的业务入口提示暂未开放；旧运营活动与月卡入口暂不展示。账号详情与退出收在独立面板。
- 处理 CityHubView 的 private start 与引擎自动 start 同名问题，改为 initializeCity，仅由 onOpen 初始化；配置加载结束时检查 cleaned，阻止关闭后再启动特效和绑定事件。退出时子 View 清理只执行一次，加载中关闭会结束父页面的等待。
- 既有 battleSpine 与 visibleFit 的两个类型边界补齐注解，未改其业务行为，使复用的主城代码纳入真实 Creator 声明的 strict 检查。
- 新增 home-presentation 检查：真实角色字段/零货币、未开放提示、既有 Prefab 引用、页面关闭、加载中关闭、640×1280 基准及引擎 start 冲突检查；account、remake-navigation、login-presentation、home-presentation、architecture、bindings、hero、city 通过。综合检查中的旧 backpack/legacy 仍存在原有背包布局失败，不静默跳过。
- 新主城实际渲染、地图拖动、窄屏和安全区仍待 Creator 预览；原生/微信适配与英雄、主线等新后端业务仍未完成。主城加载失败会保留账号退出途径与可见提示。

## 恢复启动加载与过渡（2026-10-29）

- 用户指出新入口立即进主城，遗漏此前完成的读配置、加载数据、进度条与渐进动画。本批复用既有 playLogoSplash、BootChrome 和原 LoadingLayer.prefab，不另造加载画面。
- Remake.scene 增加显式 PageHost / StartupHost 绑定；启动层位于页面之上，阻挡加载期间点击，加载 Prefab 也由场景引用以保留依赖与编辑入口。需重新打开更新后的 Remake.scene 再预览，避免旧场景内存快照缺少新绑定。
- 启动任务按顺序读取配置（manifest 当前 536 张表）、预载界面资源、恢复账号与角色、等待目标页面就绪。只有实际任务完成才推进加权进度，核心配置失败不会进入目标页；失败可重试，无会话则进登录，有会话也先显示启动加载再进主城。
- 复用原开场淡入/停留/淡出；目标页准备完成后等待两次真实 EVENT_AFTER_DRAW，再以 0.3 秒淡出加载层。手动登录同步角色和切换主城也使用该加载层。淡出可被后续加载或销毁取消，过期路由不能把新加载层藏掉；销毁时清理音乐、动画、重试等待和绘制等待。
- BootChrome 兼容旧调用，新增可注入 Prefab 加载器与可取消淡出；旧链路仍保留原顺序。未接入旧服的远程版本/热更地址，不假称已有线上更新校验。
- 新增 startup 检查，验证角色恢复等待、真实/单调进度、失败阻断、过时回调、取消、旧加载资源引用、绘制等待、淡出取消和场景销毁清理。真实 Creator strict 编译通过，综合检查 10/12 通过；仅原有 backpack/legacy 背包布局断言失败。实际 Creator 动画与加载效果仍需预览确认。

## 按正式服顺序保留登录确认（2026-10-29）

- 用户明确要求：资源加载完成后显示登录页，玩家点击登录才进入主城。此要求覆盖上一批“有效会话自动进城”的行为；后续不得以会话恢复成功为由跳过登录页。
- 新增 LoginEntry，区分已准备的角色身份与玩家进入确认；初始、刷新和开发面板恢复会话均保持登录路由。AccountController 只在“开始游戏”请求成功、且当前 Controller 仍打开时发出进入确认。退出或身份清空后重置确认。
- 已准备身份时点击开始重新校验当前会话，不把保存的身份替换为输入框默认 player_1；开发账号输入框在身份已准备时隐藏，清除会话后可换账号。恢复失败或登录失败保持登录页与可见错误。
- 账号检查新增保存会话不跳过登录、恢复按钮不进城、显式开始且重新校验后进城、失败不进城、页面关闭后的晚到请求不进城等用例；account、startup、remake-navigation 和 Creator strict 检查通过。实际按钮与页面效果仍需预览确认。

## P2-02/P2-03：启动资源管理第一批（2026-10-29）

- 从 0 到 1 计划已细化为 P0–P9 的任务 ID、依赖、输出和验收条件；本文顶部是当前快照，下方保留每批历史。
- ResourcePool 负责共享加载与持有：同资源并发只请求一次，同作用域只持有一次，多作用域共享，失败可重试，关闭后拒绝迟到结果，最后持有方退出只撤销一次引用。
- StartupResources 集中登记 loginCast、loadingBar、loginBackdrop、loginMusic 四项 ID、路径与类型；RemakeApp 启动改走作用域，销毁时撤销持有，进度仍按真实完成计数。
- Cocos 使用 addRef/decRef(false)，暂不主动清空引擎缓存；旧直接加载路径仍使用共享资源，完成所有权迁移前不提前释放。不声称已降低包体、首屏或内存。
- resources 检查覆盖并发共享、重复持有/释放、失败重试、关闭后加载、迟到结果、取消后重开；resources、startup、架构边界、脚本绑定与 Creator strict 通过。源资源基础统计为 21,596 个文件、613.33 MiB（不含 .meta，不等于包体）；完整依赖/首屏清单尚待 P2-01。真实渲染与内存指标待验证。
- 下一批：P2-01 全量依赖/首屏清单和 P2-04 最小 Bundle 样本；P1 视觉验收按用户截图推进。

## P2-01/P2-04：静态依赖审计与主城按需 Bundle（2026-10-29）

- 新增只读 tools/resource_audit.py，输出元数据/序列化 UUID 与 atlas 图片页依赖、场景闭包、Bundle 作者归属、大文件、动态加载候选及可选 SHA-256 相同内容分组；2 个隔离样本测试验证闭包、atlas、未知 UUID 和重复内容。静态结果不作为删文件依据。
- 源码审计发现 Remake.scene.homePrefab 把主城组合及地图/HUD 带入启动静态依赖。RemakeHome 移到 assets/bundles/remake-home，文件与 .meta 成对移动、Prefab UUID 保持；场景不再直引，HomeResources 在显式开始成功后才加载。
- 共享依赖顺序 resources → prefabs → remake-home，优先级 8 → 1 → 0；加载失败可重试，不通过 UUID 回退掩盖 Bundle 配置错误。当前 feature 作用域仍由 app 持有到销毁，未启用页面级淘汰。
- 改造前后场景静态闭包从 87 文件/10,392,683 源字节降为 21 文件/6,864,554 源字节；不等于构建下载字节或 GPU 内存。完整报告在本机 client/temp/resource-audit/before.json 和 after.json，摘要和复跑命令见 resource-loading.md。
- 完全相同内容 835 组、额外源副本 36,082,208 字节，仅列候选未删除；5 组 UUID 未解析需核对内建资源，98 处加载候选待人工归类。
- 首次综合检查出现登录按钮引用断言失败：Creator 补写 __expectedType__，实际两态贴图 UUID 不变。调整为验证 UUID、按钮过渡和合法类型字段，保留视觉/锚点断言，单项恢复通过。未改登录资源来迎合测试。
- 资源池、按需 Bundle 依赖顺序/不提前加载/重试、旧主城复用、启动入口与 strict 检查通过；实际导入/构建/Network/内存尚未验证，P2-01/P2-04 不标已完成。

## P2-05：配置依赖隔离与分组读取（2026-10-29）

- 确认当前重做版启动消费者只需要 language/loadingtips；主城再需要 opencondition/system_gate 及三份 maincity 布局。RemakeApp 不再调用全量 loadAll，旧 legacy/Boot 保持原路径。
- 新 GroupedConfig 提供并发去重、校验、整组成功后提交、失败请求重试和迟到进度抑制。RemakeConfig 单独缓存这两组，不写旧 ConfigDb、不调用旧英雄/战斗的全量 bindConfigTables，避免半套表被误认为完整配置。
- loadBootCopy 注入缓存读取器；CityHubView 可注入配置读取器，旧调用方仍用原缺省值。HomeResources 先准备必要配置，失败时不请求主城 Bundle，由上层加载页提供重试；配置等待中关闭页面不会实例化子界面。
- 源文件统计：旧 manifest 536 表共 38,034,698 字节；新启动两表 1,599,539 字节，主城另五份 57,398 字节，其中三份布局不在旧根 manifest 内。只证明显式读取依赖变化，不代表真实下载、包体或内存。
- 新增 config-groups 检查，以真实七份配置验证结构/缓存/提示复用/旧 DB 隔离，并测试原子提交、加载与校验失败重试、并发及失败后迟到进度。home-bundle 验证配置失败时不请求包且可重试。
- 综合检查 14/16 通过，两项既有背包布局失败仍保留；strict、差异格式检查通过。实际加载画面、主城与三端验证待完成，P2-05 仍为进行中。未来英雄、战斗配置组与投影绑定未实现，不能直接开放旧业务页面。
- 下一步优先补主城 Bundle/配置分组的实际预览与构建证据；同时继续整理英雄/阵容最小接口和配置依赖，为 P3/P4 切片准备。

## P3-02/P4-01–03：英雄与主阵容后端切片（2026-10-29）

- 在 P2 等待实际构建/视觉证据期间，推进不依赖该证据的后端基础。新增当前角色英雄列表/详情、主阵容查询/版本保存四项接口，身份均从 Bearer 会话取得。
- V2 迁移新增英雄与阵容槽位表、角色阵容版本；英雄实例使用 UUID 字符串，与模板整数和旧数值实例 ID 分离。新角色返回真实空列表，未实现赠送/召唤，也未向用户本地库注入测试英雄。
- 主阵容保存校验合法站位、重复站位/英雄和拥有权，事务内锁角色版本再替换阵容；相同版本并发写只有一个生效，过时写 409，当前版本相同内容不重复递增。数字小数/字符串转换关闭，真实 HTTP 验证非法类型为 400。
- 当前位置集合沿用既有真服路径的阵法 1 映射 2/3/5/6/7/8/9，不采用旧 Mock 的最多八个规则；其他阵法、助阵及完整玩法限制未完成对照。依据与边界见 hero-lineup-contract.md。
- 新增 8 项 HeroLineupTest，后端合计 15 项通过，覆盖空数据、英雄查询隔离、重登读取、非法请求不改变原阵容、冲突/并发、真实 HTTP、PUT 预检和已有 V1 数据升级保留角色/货币/会话。全部使用隔离 H2，不触碰旧服 MySQL 或用户本地数据。
- 英雄 UI 仍依赖旧 GameStore/WireSession，未直接开放；新客户端 Model/Service、配置组/投影、旧 Prefab 适配及生成接口类型待继续。OpenAPI/生成/漂移检查未完成，契约文档为当前实现说明而非最终冻结协议。
- P3-02/P4-01/P4-02/P4-03 更新为进行中；MySQL 迁移/并发、进程重启及真实客户端玩法仍待验收。本批不声称完整英雄/出阵功能完成，也未再次推送 main。

## 按用户要求提前清理计划外 Prefab（2026-10-29）

- 用户明确要求清除不在计划内的全部残留 Prefab，优先于原先最终阶段才清理全部旧壳的顺序。新增 tools/prefab-plan.json，以阶段与理由明确保留名称，不把高级系统因旧代码引用而加入首测。
- 607 个 Prefab 中删除 517 对资源/.meta、保留 90 个；空目录同步清理，图片/音频/配置未删。保留项全部校验内容和 UUID 不变，用户 ChapterMapLayer 修改原样保留。
- 删除前保存原字节与父目录元数据到 assets 外的本机 ZIP，已验证全部 517 对可恢复。详细记录 docs/prefab-cleanup-manifest.json，说明 docs/prefab-cleanup.md。
- 移除失效页面壳映射与 UUID 回退登记；统一 loadPrefab 用生成的计划清单拒绝计划外请求，避免旧业务发起资源加载。旧业务代码本身未全清，旧 Boot/Main 只保留核心对照。
- 新增 prefab-plan 检查；resources 增加运行时拦截与核心允许加载检查。综合 15/17 通过，仅原有两项背包布局断言失败；strict、孤立元数据/已删 UUID/备份完整性检查通过。
- 待 Creator 完成资源删除导入后重新预览和构建。没有以源码删除字节宣称实际包体收益。本批未推送 main。

## login/account 职责核查与同步准备（2026-10-29）

- 用户要求同步 main 并检查 login/account 重复。核对确认：account 是重做版唯一登录页，login 同时混放共享启动组件与旧 Boot 登录入口，属于新旧入口并存而非重复的账号状态源。
- 将 LoginPanel、UserLoginLayer 成对移动到 prefabs/ui/legacy-login，保持 UUID；更新旧常量、回退路径、清理保留策略及美术参照检查。login 只保留加载/公告/选服/角色初始化等共用组件，account 继续作为当前唯一登录入口。
- 新增 login-entries.md 说明维护位置与旧入口移除条件；startup 检查显式验证当前场景绑定 AccountLogin，不能意外绑定旧页。Prefab 仍为保留 90、已删 517。
- 本轮提交将包含此前资源/配置分组、英雄阵容后端、文档与 Prefab 清理；排除用户已有 ChapterMapLayer 修改、Creator 设置和资源导入元数据。推送结果以最终 Git 校验为准。

## P4-01/P4-02：英雄列表客户端数据层（2026-10-29）

- 新增 HeroApi，读取当前角色的英雄数组并校验运行时结构。实例 UUID、模板整数、实际等级与星级各自保留；拒绝重复实例、坏 UUID、小数和字符串数值，同模板的多个实例允许共存。
- 新增 HeroRosterModel/Service，数据流与旧 GameStore/WireSession 分离。明确 idle/loading/ready/error；新角色 ready + [] 是正常结果，不回退图鉴或生成测试英雄。支持并发去重和错误重试，换号、退出、关闭与销毁会作废旧请求并清除名册。
- AccountService 增加共用 authenticated 能力，请求前及回包后检查会话有效期；当前会话 401 清除保存身份并通知现有账号 Model，旧账号的迟到 401 不影响新账号。网络失败保留会话，token 不进入英雄展示状态。
- hero 配置组只含 herotype/item，按需准备，不增加登录或进城必需表。HeroCatalog 使用现有简体名称、元素、图标索引和 item 图标回退，保持旧目录与 ConfigDb 不变；模板星级不替代实例星级。已核对 10101001 对应独眼梦魇与现有 20101001 图标。
- 使用最新打包的新后端、随机本机端口、隔离 H2 内存库完成真实客户端 Service/API 联调：开发登录、空名册、无效 token 401、恢复会话后再读取。测试进程已停止，用户文件库未使用。首次测试适配器误用了同名局部 fetch，修正为 globalThis.fetch 后实连通过。
- 回归发现旧战斗绘制检查跨秒比较真实时间会偶发失败，改为固定绘制测试时钟，仍精确要求显示 01:30；测试结束和失败时恢复时钟，未修改战斗业务。
- 最终客户端综合检查 16/18，仅既有 backpack 第一格位置与 legacy 背包布局两项失败；新 strict 检查通过。后端 15/15 通过并完成 package。未操作 Creator 窗口，实际渲染与三端构建未验收。
- 本批尚未装配到 RemakeApp，主城英雄/出阵入口仍未开放。下一步直接适配已有英雄列表/格子与返回路径，再补详情和出阵，不新建另一套列表美术。本批在本地保存，不自动推送 main。

## P4-02：原英雄列表接入与主城返回（2026-10-29）

- HeroRosterController/Presentation 在页面打开前向既有 HeroListView 注入新数据源，继续使用 HeroListLayer、HeroListHeroLayer、HeroIconCell、原岩洞底和羊皮纸，不增加或复制 Prefab。旧 Boot 保持默认路径；重做路径不读 GameStore/WireSession，不把 UUID 转成数值 ID。
- RemakeApp 已装配新列表 API/Model/Service/Controller，主城底栏英雄入口开放。支持加载、真实空名册、元素筛选、筛选空态和失败后点击上方英雄页签重试；不猜测容量、战力和出阵状态。图鉴、圣龙、永久皮肤、进化隐藏；格子仅提示详情未开放，不进入旧写操作。
- RemakeNavigation 为功能保留主城根，在内容宿主挂英雄页；顶底栏和账号面板仍由主城持有。返回只销毁英雄页，退出登录清理两页；不新增 UIManager，也不把玩法页加入会话入口判断。
- HomeFeatureNavigation 独立处理功能打开意图，点击主城取消待打开的英雄页，快速“英雄→主城→英雄”会在旧共享任务取消后重开最新意图；退出及应用销毁作废旧回调。单独的 feature-navigation 检查覆盖这些竞态。
- HeroResources 在准备 herotype/item 后按需持有五个原有 Prefab；应用销毁撤销自身引用，仍保留引擎缓存。没有新增英雄 Bundle、登录前预载或主动释放动态贴图。配置失败留在主城，支持底栏再次尝试。
- 检查扩展覆盖被旧状态污染时仍只画新名册、加载/空态/失败重试/筛选、实际等级星级、禁用旧详情、关闭后迟到结果、返回及退出清理、保留共享顶底栏和资源引用。接入旧 View 后 strict 检查触及旧依赖，补齐四处旧文件的空值收窄/类型标注，未改变协议或玩法规则。
- 客户端全量 17/19 通过，仍仅两项已知背包布局失败；真实 Creator 声明 strict 通过，绑定和 Prefab 计划检查通过。后端本批未改，沿用上批 15/15 与隔离实连结果。未操作 Creator 窗口，实际英雄页渲染和三端运行待验收。
- 下一步：只读英雄详情及其配置/资源依赖、初始英雄获取规则、主阵容客户端交互。P4-02 仍为进行中。本批保存为本地提交，不自动推送 main；用户原有场景和 Creator 导入修改保留。

## 英雄页截图：旧后端 404 与提示文字过小（2026-10-29）

- 用户截图已显示原英雄列表、筛选、主城顶底栏成功挂载，但中间为请求失败 404。这说明页面挂载与数据成功读取需要分别验收，不能把这张画面当成有效空名册。
- 只读核对本机 18080：当时为本项目 18:12 启动的 Java 进程，角色接口返回 401，英雄/阵容返回 404；新增英雄 Controller 的编译时间为 20:10，确认是运行中旧版本尚未重启，而不是修改客户端 API 路径。
- 后续复查时进程已于 21:01 更新，三个未携带凭据的接口都返回正常的 401。代理没有执行停止或重启操作，没有继续干预已更新的运行服务，也未读写用户数据库或创建测试账号。
- HeroApi 将列表 404 显示为“英雄接口不存在，请更新并重启新后端”，保留 HttpFailure 状态；401 继续由统一鉴权处理。dev.ps1 run 在编译启动前检查端口占用及英雄接口，旧版本 404 给出明确重启步骤，其他占用避免再启动第二个 Maven。
- 文字过小来自 emptyLabel 的 SHRINK：两行提示放在 28 高文本框。保持原 Prefab/UUID，改为 24 字号、32 行高、480×112 文本框；三行错误/操作文字有足够高度。新增 Prefab 字号/多行空间检查、404 提示与 401 保留检查。
- 启服脚本黑盒检查 3/3，覆盖旧接口 404、现有鉴权接口 401 和其他服务占用 200，均使用随机端口临时 HTTP 服务并确认不启动 Maven。客户端回归结果记录在顶部快照；实际新文字和成功空名册仍待用户刷新预览确认。
