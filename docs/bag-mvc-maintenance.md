> 2026-10-31 Bag 命名收紧：四个专属预制体统一位于 `client/assets/prefabs/ui/Bag/`，分别为 BagView、BagItemView、BagInfoView、BagTabView；目录和资源 meta UUID 保留。共享 PagePrefabShell、ListBackdrop、DimSheet 保持通用归属，美术资源路径不改。详情只读，确认关闭；已删除旧使用协议分支，来源暂未开放。当前验证见进度文档顶部，以下旧日期的预览记录仅作历史证据。

# 背包标准模块：维护与验收入口

背包沿用完整命名、目录、基类与全局事件规则，保留真实业务和 Prefab/SuperScroll 配置。2026-11-02 已完成长连接查询试点、隔离联调和登录/背包/详情/顶号重登页面复验；人工阅读与编辑体验、正式服 1:1 对照仍待验收。当前结果统一见开发进度，以下调用链说明现有职责。

## 固定目录与文件职责

2026-11-02 通信迁移顺序：优先登录与背包，背包作为其他模块模板。BagApi 只接受 GameSocketClient，通过 `inventory.list` 查询；没有 HTTP 分支或启用开关，旧库存 HTTP 路由已删除。BagController 的读写队列、会话代次和事件归属保持；恢复快照不直接覆盖 Model。详情和列表仍由 Prefab/SuperScroll 承载。实际进度见 [当前进度](development-progress.md)。

仓库根目录 `G:\work\FsGame\Project\mxzg`，运行脚本根目录 `client/assets/scripts`。

```text
features/Bag/
  ui/
    BagView.ts
    BagItemView.ts
    BagInfoView.ts
    BagTabView.ts
    BagMount.ts          # 保留的页面/详情挂载辅助
  data/
    BagItemData.ts
    BagState.ts
    BagChangeSet.ts
    BagEventData.ts
  BagController.ts
  BagModel.ts
  BagEvent.ts
  BagApi.ts              # 只使用 WebSocket 的无状态查询适配
  BagItemCatalog.ts      # 必要的现有配置查询
```

- [BagController](../client/assets/scripts/features/Bag/BagController.ts)：请求、回包、失败、查询乱序、库存写入顺序、重复响应处理。固定入口 `BagController.instance`，继承 BaseController。应用明确 initialize({account, authorization, api})；不在构造/访问单例时联网，不按窗口 show/close 工作。
- [BagModel](../client/assets/scripts/features/Bag/BagModel.ts)：当前角色唯一库存、同步和错误状态，继承 BaseModel。查询 `snapshot/items/getItem/quantity`；更新 `replaceAll/applyDelta` 校验并一次提交后返回只读变化清单；同步/失败由 beginSync/fail，重置/清理沿用 reset/dispose。只由 Controller 提交，其他功能只读查询，不通过事件累加资产。
- [BagItemData](../client/assets/scripts/features/Bag/data/BagItemData.ts)：itemId/quantity、signed delta、物品展示数据类型与纯数据校验 readBagItems；Model/API 共用，不从网络文件反向调用校验。[BagState](../client/assets/scripts/features/Bag/data/BagState.ts) 定义状态，[BagEventData](../client/assets/scripts/features/Bag/data/BagEventData.ts) 定义通知参数并为全局 EventPayloads 声明类型。
- [BagEvent](../client/assets/scripts/features/Bag/BagEvent.ts)：集中声明 BagUpdate/BagAdd/BagRemove/BagQuantityChanged 和独立 BagSyncStateChanged，不持有派发器或历史数据。
- [BagView](../client/assets/scripts/features/Bag/ui/BagView.ts)：页面绑定、分类、选中、详情与输入；继承 BaseView。onOpen 先监听再读 Model，refreshFromModel/refreshGrid/paint 展示，visibleItems 分类，showInfo 打开详情。
- [BagItemView](../client/assets/scripts/features/Bag/ui/BagItemView.ts)、[BagInfoView](../client/assets/scripts/features/Bag/ui/BagInfoView.ts)、[BagTabView](../client/assets/scripts/features/Bag/ui/BagTabView.ts)：实际 Cell、详情和页签，无空类。
- [BagApi](../client/assets/scripts/features/Bag/BagApi.ts)：只发送 inventory.list，统一校验 readBagItems，没有状态。传输状态留在 platform，不能搬进 Model。[BagItemCatalog](../client/assets/scripts/features/Bag/BagItemCatalog.ts) 只查询名称、图标、分类等配置，不保存角色数量。
- [RemakeApp](../client/assets/scripts/app/remake/RemakeApp.ts)：显式提供依赖、初始化模块、注册 BagView；应用销毁才 dispose 模块。背包注册没有 createController。

## 基类、全局事件与监听归属

[BaseModel](../client/assets/scripts/framework/BaseModel.ts) 只有 roleKey/version、reset(roleKey)、dispose 和受保护的 incrementVersion。BagState.revision 来自基类 version，不另存计数。模块库存保存在 BagModel，基类没有全局数据字典或监听器。

[BaseController](../client/assets/scripts/framework/BaseController.ts) 提供 initialize、resetSession、captureSession/isCurrent、dispose、ownListener 和 emit；重复初始化不增加监听，重复销毁安全，支持销毁后显式重新初始化。空角色不算有效会话。背包队列、协议字段和奖励去重保留在 BagController，不放到基类；基类不保存 View/节点、不自动扫描模块。

[EventDispatcher](../client/assets/scripts/framework/EventDispatcher.ts) 是唯一全局通知入口，原 TypedEvents 已迁名改造，没有并行模块事件实例。直接使用 `EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refreshFromModel)`；`on/once` 返回解除方法，`once` 可提前取消，并在执行回调前退订。每次 emit 均交付，批处理不把 first-once 改成末次参数；事件不是状态仓库，回调应读 Model 当前快照。背包通过通知保护使每批回调都读取本批已完整提交的 Model；回调触发的新库存操作排队到当前汇总回调结束后。详见 [库存事件参数与规则](bag-inventory-events.md)。

[EventScope](../client/assets/scripts/framework/EventScope.ts) 只收集解除函数和 clear，清理失败会记录拥有者且继续清理。BaseController 持有模块 Scope，[BaseView](../client/assets/scripts/framework/ui/BaseView.ts) 持有本次开页 Scope，runClose 的 finally 自动清理，不依赖业务调用 super.onClose。关页、换号或模块销毁都不会清空全局派发器。一个订阅抛异常会记录事件名与堆栈，不影响其他订阅。

BagView 开页先登记目标式 BagUpdate 监听，再读取 BagModel.snapshot 刷新；BaseView 关闭、打开失败或销毁时统一 offTarget(this)，无需保存全局事件的 stop；另监听 BagSyncStateChanged 仅更新提示文字，不订阅增删改细分事件。关闭只移除本页监听及按钮回调；其他模块的订阅仍有效，模块请求继续完成。

UIRegistry 的 createController/show/close 只暂留给未迁移页面适配器。BagController 没有 show/close，类型不兼容页面 Controller，BaseView.attachController 也有运行时检查；**不能把 BagController 注入窗口并在关闭窗口时 dispose。**

## 固定通信与状态模板

更新：2026-11-03。本节是新增及迁移联网模块的固定规范，以背包当前实现为样板；按实际职责复用，不要求复制整套库存队列。玩法与界面仍以旧项目和正式服为依据，消息字段及限制以[通信契约](network-contract.md)为准。

### 1. 职责与代码入口

| 层次 | 真实入口与方法 | 固定职责 |
|---|---|---|
| 应用装配 | [RemakeApp](../client/assets/scripts/app/remake/RemakeApp.ts) start/onDestroy | 创建并注入唯一连接，initialize 模块，设置连接回调，应用退出时清理 |
| 身份边界 | [AccountService](../client/assets/scripts/features/account/AccountService.ts) authenticated | 检查登录、有效期与传输就绪；等待后再次检查账号代次，旧账号失败不能踢掉新账号 |
| 传输层 | [GameSocketClient](../client/assets/scripts/platform/GameSocketClient.ts) request/send/receive | 请求关联、超时、信封与连接校验、心跳及重连；不保存或提交资产 |
| 模块 API | [BagApi](../client/assets/scripts/features/Bag/BagApi.ts) list | 发送 inventory.list，接收 unknown，以 readBagItems 校验后返回；无 Model、事件或 UI |
| 业务控制 | [BagController](../client/assets/scripts/features/Bag/BagController.ts) refresh/read/notify | 查询去重、会话/读代次、写后读协调、提交 Model、通知与失败处理 |
| 唯一状态 | [BagModel](../client/assets/scripts/features/Bag/BagModel.ts) replaceAll/beginSync/fail/reset | 保存只读库存与同步状态，整批校验后提交，返回变化清单；不联网、不发事件 |
| 业务事件 | [BagEvent](../client/assets/scripts/features/Bag/BagEvent.ts)、[EventDispatcher](../client/assets/scripts/framework/EventDispatcher.ts) | Controller 提交完成后发布有类型的通知；事件不存储或累加资产 |
| 界面展示 | [BagView](../client/assets/scripts/features/Bag/ui/BagView.ts) onOpen/refreshFromModel/onSyncStateChanged/onClose | 操作转交业务、读取 Model、SuperScroll.setData；不直接调用 socket/API 或修改资产 |
| 服务端 | [GameSocketHandler](../backend/src/main/java/com/funsgamex/mxzg/network/GameSocketHandler.java) dispatch → [SessionSnapshotService](../backend/src/main/java/com/funsgamex/mxzg/network/SessionSnapshotService.java) snapshot | 重新校验身份、连接归属、恢复阶段及参数；在一致读边界返回库存，不信任客户端指定角色 |

### 2. 正常请求与回包调用链

~~~text
触发：账号接受有效角色 → BagController.syncSession → resetSession → refresh
      或模块业务明确调用 refresh；打开 BagView 本身只读已有 Model
  → refresh：captureSession；复用 pendingRead，有库存写入则等待 writeTail
  → 登记 pendingRead/readEpoch，beginSync → BagSyncStateChanged（loading）
  → read → AccountService.authenticated(token => BagApi.list(token))
  → GameSocketClient.request(token, "inventory.list") → assertReady → send
  → 后端 GameSocketHandler.dispatch → snapshots.snapshot(token).inventory()
  → GameSocketClient.receive：校验信封，按 id/name/connectionId 关联请求
  → BagApi.list → readBagItems：校验完整业务数据
  → AccountService：再次检查登录代次与凭证有效期
  → BagController.read：afterBatch 内再次检查 isCurrent(session) 与 readEpoch
  → BagModel.replaceAll → 返回 BagChangeSet
  → BagController.notify → BaseController.emit → EventDispatcher
  → BagView.refreshFromModel → refreshGrid → paint → SuperScroll.setData
~~~

三道校验不能相互替代：

1. **传输校验**：消息长度、JSON 对象、version/kind、响应 id/name、connectionId、成功/失败形态；连接 generation 隔离旧回调。合法重复回包无待处理请求时忽略，畸形消息终止连接。
2. **业务数据校验**：readBagItems 接受数组，itemId/quantity 必须为正的安全整数，物品不能重复；整批通过后返回冻结副本。空数组代表已确认空库存；null、未同步和错误不能伪装为空数组。Model 再用同一校验函数保护提交入口。
3. **状态时效校验**：身份层 operation 隔离账号；ControllerSession 隔离角色会话，roleKey 为 serverId/roleId；readEpoch 阻止旧读覆盖新读/写。请求 id、connectionId、本地 revision 不能当作服务器资产版本或持久业务幂等键。

失败走 Controller 的同步/错误状态；有效快照未到达前保留旧库存，不先清空、不预扣。旧会话/失效读结果丢弃，不改当前 Model，不展示旧账号错误。查询返回 false 表示未提交成功，调用方不能当成成功。

### 3. Model 提交与事件刷新

- Controller 是模块提交入口，API 和 View 不直接写 Model。Model 校验完成后一次提交，并返回变化清单；Controller 才发事件。
- BagSyncStateChanged 负责 loading/ready/error 等提示；BagUpdate 负责列表汇总刷新。有变化时还可发 BagAdd/BagRemove/BagQuantityChanged，列表不同时订阅全部事件以免重复绘制。
- 首次同步发汇总，不能把初始物品都当作新获得奖励；相同库存只在同步状态变化时通知，不强制发 BagUpdate。奖励演出使用业务收据，不通过 BagAdd 猜测。
- View 开页先监听，再读当前 Model；关闭期间库存变化，重开也能显示最新状态。BaseView 清理页面目标监听，关页不 dispose 模块、不取消有效角色的在途资产提交。
- 多资产响应先完成所有字段、会话与版本校验，再在同步 batchNotifications 内提交相关 Model，最后通知。批处理只延后通知，没有回滚能力，不允许内部 await，不能代替服务端事务。

### 4. 断线与恢复调用链

~~~text
连接中断/请求超时 → GameSocketClient.drop
  → 清理旧 socket、心跳和待回包请求，递增 generation
  → 已建立会话按策略退避重连；onDisconnected(message)
  → RemakeApp 显示连接提示，保持 AccountModel.role/busy
  → BagController.refresh(true) 经就绪检查失败后记录同步错误，保留库存
  → 恢复：connect → establish → session.authenticate → session.sync
  → validateSnapshot（role/heroes/inventory）及角色身份校验 → ready → onReady
  → RemakeApp 清理连接提示；有效角色且非 busy 时：
       BagController.refresh(true)（等待 writeTail）
       AccountService.refreshRole（profileRevision 防旧钱包回滚）
  → 重新经过正常查询、校验、提交、事件、View 刷新链
~~~

- **连接 ready 不等于所有模块已刷新。** 现实现先校验握手快照，不把它直接写入资产 Model；背包的新查询完成后才进入库存 ready。应用连接提示可先消失，模块仍须展示自己的 loading/error。
- 首次登录 onReady 时账号可能尚未接受角色或处于 busy，回调会跳过模块刷新；后续接受角色由 syncSession 发起查询，不能依赖 onReady 恰好晚于登录完成。
- 普通断网不清账号角色、不伪造 busy，不把它当换号；未就绪时业务入口拒绝新请求，不排队扣费。保留缓存用于显示，不表示允许离线操作。
- 登出、换号、切服、凭证过期或 session.kicked 走账号失效/断开链：取消重连、清身份并重置模块会话。顶号/身份失败不自动抢回；INVALID_MESSAGE 停止自动恢复，提示返回登录。
- 首次连接失败由登录流程显示失败；自动重连用于已成功建立的会话。恢复只重建鉴权/同步，不自动重放业务请求，也不回退 HTTP。

### 5. 库存写入与推送的补充约束

当前 WS 只接会话与背包读取，英雄升级 WS 消息仍是预留；以下约束不代表 WS 写迁移已完成。现有升级/领奖等 HTTP 业务也经过同一个库存协调器。

1. 对应 Controller 调用 BagController.runInventoryUpdate(responseId, request, inventory, commitRelated, reason)，沿用真实业务 API；不得再建库存副本或用 HTTP/WS 双发。
2. 旧读失效，写操作串行，同一在途 responseId 共享 Promise；写后读等待 writeTail。回包校验及当前会话检查通过后，同步提交相关 Model 和完整库存，再统一通知。
3. responseId/receipts 只提供本角色会话内的提交去重，不是数据库幂等保证；已提交的键不再更新 Model/广播，但以后再次调用仍可能执行 request，服务端必须校验持久业务键和参数。
4. 没收到回包不能推断没有扣费。后续接入 WS 写操作必须按原业务键查结果或重发原参数确认；不得生成新键盲目重试。业务模块保存未决状态，传输层不做通用重放。
5. applyDelta 是独立显式入口，目前没有网络库存推送接入。将来接推送须先补契约、会话归属、服务器版本/游标及乱序/重复恢复策略，再交同一 Controller 提交，不能在 socket 回调直接累加 Model。

### 6. 后续模块交付清单

每个新接入模块的说明和评审至少交代以下内容；不为填表创建无用类。

- 消息名、方向、请求/响应结构、真实后端入口，标清已实现或预留；说明是否涉及资产和业务幂等键。
- 点击/触发方法 → Controller → 身份边界 → API → socket → 后端 → 校验 → Model → 事件 → View 的真实文件和方法。
- 字段校验函数、会话/区服归属、旧响应失效条件、错误展示和唯一 Model 提交入口。
- 普通断线、恢复查询、身份失效/顶号、换号切服、关页重开的行为；写操作不确定结果如何确认。
- 针对性验证：正常与空结果；非法回包不提交；旧会话/旧读不覆盖；重复/超时；关闭重开不重复监听；断线保留库存、恢复后刷新；涉及资产时验证幂等与写后读。
- 区分受控回归、真实页面复验和正式服效果对照；未完成项单列，不用类型检查代替真实断线/界面验收。


## 一次“查询背包”如何执行

1. RemakeApp 调用 `BagController.instance.initialize({account, authorization, api: new BagApi(socket)})`。应用直接创建唯一连接，账号接受角色前完成鉴权/同步。BagController.onInitialize 通过自身 EventScope 订阅 AccountModel；有效角色变化时 syncSession → resetSession(serverId/roleId) → refresh，背包页面无需存在。
2. `BagController.refresh` 捕获基类会话代次和本模块 readEpoch，登记 pendingRead，再 `BagModel.beginSync` 并独立通知同步状态。同步回调再请求时复用 pendingRead，不递归创建另一条查询。
3. `BagController.read` → `AccountService.authenticated` → `BagApi.list` → 纯校验 readBagItems。原鉴权、有效期、旧账号 401 保护保持。
4. 回包先检查 isCurrent(session) 和 readEpoch；有效结果 `BagModel.replaceAll` 返回 BagChangeSet，`BagController.notify` 聚合派发细分事件，最后 `EventDispatcher.instance.emit(BagEvent.BagUpdate, payload)`。首次仅汇总，相同库存仅状态。旧结果返回 false，不覆盖新快照。
5. BagView 已打开时，全局监听调用 refreshFromModel → paint；未打开也已更新 Model。打开先监听再读当前 Model，不创建新库存 Controller，也不额外发请求。开始游戏的服务器初始化后仍 refresh(true)，避免初始化前查询留下空库存。

## 一次“战斗领奖更新背包”如何执行

1. [CampaignController.claim](../client/assets/scripts/features/battle/CampaignController.ts) 调用 `BagController.runInventoryUpdate("campaign-claim:" + battleId, request, inventory, commitRelated, "reward")`，request 仍是原 `AccountService.authenticated → CampaignApi.claim`。
2. BagController 使旧查询失效、串行处理库存写入，并在通知 loading 前登记 inFlight/writeTail；同步回调中的重复调用也复用同一个 Promise。写操作进行时新查询等待，旧查询不能回滚奖励。
3. 校验 battleId、库存 DTO 和当前会话后，在 batchNotifications 内先 `AccountService.acceptRole`，更新仍打开的主线状态，再 `BagModel.replaceAll` 并登记已提交响应标识。
4. 然后 BagController.notify → BaseController.emit → 有变化的细分事件 → 全局 BagEvent.BagUpdate；账号观察者和 BagView 读到的相关 Model 均已提交。战斗页或背包已关闭也正常更新；已关闭 View 不继续渲染。
5. 重复已提交结果不再次替换库存/钱包、不重复广播；客户端去重只在角色会话内生效，服务器仍负责持久幂等。全量与增量分开，不把快照当 delta 累加。

batchNotifications 只延后同步通知，不是可回滚事务，内部不执行异步工作。协议校验在提交前完成；服务器事务、HTTP 传输、鉴权、阵容版本冲突、奖励幂等和持久化未改动。

## 在 Creator 修改 UI

页面：[client/assets/prefabs/ui/Bag/BagView.prefab](../client/assets/prefabs/ui/Bag/BagView.prefab)。列表节点路径不变：

- `BagView/spr_box/BagScroll`：SuperScroll，Content 只绑定一次。
- `BagView/spr_box/BagScroll/view`：UITransform/Mask，手动调整裁剪范围。
- `BagView/spr_box/BagScroll/view/content`：SuperContent，修改布局、列/行、方向、间距、四边距、Cell Prefab 与明确的尺寸覆盖开关。
- Cell：[BagItemView.prefab](../client/assets/prefabs/ui/Bag/BagItemView.prefab)，组件现名 BagItemView；外观/数量字/选中图片在 Cell 内编辑。
- 详情：[BagInfoView.prefab](../client/assets/prefabs/ui/Bag/BagInfoView.prefab)，组件 BagInfoView；页签：[BagTabView.prefab](../client/assets/prefabs/ui/Bag/BagTabView.prefab)，组件 BagTabView。

[SuperScroll Inspector 指南](super-scroll-authoring.md) 的布局规则和无业务编辑器预览继续有效。本批没改源 Prefab、SuperScroll、SuperContent、资源路径与加载边界；10 个移动脚本 UUID 均逐一核对保留，BagView 仍是 `7b14e0a2-3c58-4d1f-8e6a-9f0b2c4d5e61`。Prefab 内稳定的 CompPrefabInfo.fileId 不是脚本路径，不因改名替换。目录实际名及导入统一为 `features/Bag`，旧 backpack 脚本目录已移除。

尺寸/位置仍由以下入口控制，不宣称整页静态 UI 已全部整改：SuperContent 算 content/Cell 根尺寸，原生 Layout 排动态 Cell，ScrollView 管滚动；BagView 仅提供条目/渲染回调，保留同分类滚动、分类回起点和缩短限制。空槽至少 20/按四补齐是背包规则。`BagMount.mountBagPage` 只装配共享壳与可见区域；PrefabLayout 不再补偿静态文字/九宫格位置。BagView 保留动态分类排列，BagMount.openBagInfo/seatCenter 只按宿主尺寸居中详情。

## 删除、退役和剩余模块

原 BagC/BagM/BagV、BagItemCellView/BackpackInfoView/BagTabButtonView、InventoryApi/ItemCatalog/BackpackMount 脚本已移动为新完整名称并保留 meta，无转发别名。旧 InventoryController、BackpackFeatureFlag 和背包 GameStore/WireSession 条件分支此前已删除，本批保持退役；TypedEvents 已被唯一 EventDispatcher 替代。旧 Main/screenFill 业务入口及 module 已删除；不删除共享图片、Prefab 或其他人的修改。

当前 Account、HeroRoster、Formation 和 Campaign 继续使用已有新接口实现；英雄名册改为应用会话持有，旧 Boot/Main/WireSession/GameStore 链已删除。本轮整理代码职责，不把目录清理当作全部产品功能完成。旧目录清理已完成，未将尚未开放玩法接回旧实现。本批不扩展养成、召唤、活动、技能或道具使用。

## 验证与人工验收

当前检查结果统一见 [开发进度](development-progress.md)，不得把历史截图与旧预览当作本轮通过。编辑 BagView / BagItemView / BagInfoView / BagTabView Prefab 后保存并等待 Creator 导入，按默认、窄屏、较宽屏验收分类、滚动、详情、奖励更新与反复开关。布局只在 Prefab 维护，资源地址见 [统一入口](config-pipeline.md)。
