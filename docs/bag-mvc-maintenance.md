> 2026-10-31 Bag 命名收紧：四个专属预制体统一位于 `client/assets/prefabs/ui/Bag/`，分别为 BagView、BagItemView、BagInfoView、BagTabView；目录和资源 meta UUID 保留。共享 PagePrefabShell、ListBackdrop、DimSheet 保持通用归属，美术资源路径不改。详情只读，确认关闭；已删除旧使用协议分支，来源暂未开放。当前验证见进度文档顶部，以下旧日期的预览记录仅作历史证据。

# 背包标准模块：维护与验收入口

2026-10-30，沿用完整命名、目录、基类与全局事件规则。2026-10-31 已完成旧业务链清理与目标作用域事件改造，背包继续保持库存规则及必要调用方，保留真实业务和 Prefab/SuperScroll 配置；不构建包、不清库、不提交推送或发布。**技术验证完成，人工阅读与编辑体验待用户验收，真实界面回归因浏览器权限待验收；目录清理与代码检查见 architecture.md。**

## 固定目录与文件职责

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
  BagApi.ts              # 必要的现有手写 HTTP 适配
  BagItemCatalog.ts      # 必要的现有配置查询
```

- [BagController](../client/assets/scripts/features/Bag/BagController.ts)：请求、回包、失败、查询乱序、库存写入顺序、重复响应处理。固定入口 `BagController.instance`，继承 BaseController。应用明确 initialize({account, authorization, api})；不在构造/访问单例时联网，不按窗口 show/close 工作。
- [BagModel](../client/assets/scripts/features/Bag/BagModel.ts)：当前角色唯一库存、同步和错误状态，继承 BaseModel。查询 `snapshot/items/getItem/quantity`；更新 `replaceAll/applyDelta` 校验并一次提交后返回只读变化清单；同步/失败由 beginSync/fail，重置/清理沿用 reset/dispose。只由 Controller 提交，其他功能只读查询，不通过事件累加资产。
- [BagItemData](../client/assets/scripts/features/Bag/data/BagItemData.ts)：itemId/quantity、signed delta、物品展示数据类型与纯数据校验 readBagItems；Model/API 共用，不从网络文件反向调用校验。[BagState](../client/assets/scripts/features/Bag/data/BagState.ts) 定义状态，[BagEventData](../client/assets/scripts/features/Bag/data/BagEventData.ts) 定义通知参数并为全局 EventPayloads 声明类型。
- [BagEvent](../client/assets/scripts/features/Bag/BagEvent.ts)：集中声明 BagUpdate/BagAdd/BagRemove/BagQuantityChanged 和独立 BagSyncStateChanged，不持有派发器或历史数据。
- [BagView](../client/assets/scripts/features/Bag/ui/BagView.ts)：页面绑定、分类、选中、详情与输入；继承 BaseView。onOpen 先监听再读 Model，refreshFromModel/paint 展示，visibleItems 分类，showInfo 打开详情。
- [BagItemView](../client/assets/scripts/features/Bag/ui/BagItemView.ts)、[BagInfoView](../client/assets/scripts/features/Bag/ui/BagInfoView.ts)、[BagTabView](../client/assets/scripts/features/Bag/ui/BagTabView.ts)：实际 Cell、详情和页签，无空类。
- [BagApi](../client/assets/scripts/features/Bag/BagApi.ts)：现有手写 GET /api/v1/inventory，调用统一 platform/http 的 JsonClient；没有状态。生成协议/底层 HTTP 没有搬进 Model，也没新增转发层。[BagItemCatalog](../client/assets/scripts/features/Bag/BagItemCatalog.ts) 只查询名称、图标、分类等配置，不保存角色数量。
- [RemakeApp](../client/assets/scripts/app/remake/RemakeApp.ts)：显式提供依赖、初始化模块、注册 BagView；应用销毁才 dispose 模块。背包注册没有 createController。

## 基类、全局事件与监听归属

[BaseModel](../client/assets/scripts/framework/BaseModel.ts) 只有 roleKey/version、reset(roleKey)、dispose 和受保护的 incrementVersion。BagState.revision 来自基类 version，不另存计数。模块库存保存在 BagModel，基类没有全局数据字典或监听器。

[BaseController](../client/assets/scripts/framework/BaseController.ts) 提供 initialize、resetSession、captureSession/isCurrent、dispose、ownListener 和 emit；重复初始化不增加监听，重复销毁安全，支持销毁后显式重新初始化。空角色不算有效会话。背包队列、协议字段和奖励去重保留在 BagController，不放到基类；基类不保存 View/节点、不自动扫描模块。

[EventDispatcher](../client/assets/scripts/framework/EventDispatcher.ts) 是唯一全局通知入口，原 TypedEvents 已迁名改造，没有并行模块事件实例。直接使用 `EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refreshFromModel)`；`on/once` 返回解除方法，`once` 可提前取消，并在执行回调前退订。每次 emit 均交付，批处理不把 first-once 改成末次参数；事件不是状态仓库，回调应读 Model 当前快照。背包通过通知保护使每批回调都读取本批已完整提交的 Model；回调触发的新库存操作排队到当前汇总回调结束后。详见 [库存事件参数与规则](bag-inventory-events.md)。

[EventScope](../client/assets/scripts/framework/EventScope.ts) 只收集解除函数和 clear，清理失败会记录拥有者且继续清理。BaseController 持有模块 Scope，[BaseView](../client/assets/scripts/framework/ui/BaseView.ts) 持有本次开页 Scope，runClose 的 finally 自动清理，不依赖业务调用 super.onClose。关页、换号或模块销毁都不会清空全局派发器。一个订阅抛异常会记录事件名与堆栈，不影响其他订阅。

BagView 开页先登记目标式 BagUpdate 监听，再读取 BagModel.snapshot 刷新；BaseView 关闭、打开失败或销毁时统一 offTarget(this)，无需保存全局事件的 stop；另监听 BagSyncStateChanged 仅更新提示文字，不订阅增删改细分事件。关闭只移除本页监听及按钮回调；其他模块的订阅仍有效，模块请求继续完成。

UIRegistry 的 createController/show/close 只暂留给未迁移页面适配器。BagController 没有 show/close，类型不兼容页面 Controller，BaseView.attachController 也有运行时检查；**不能把 BagController 注入窗口并在关闭窗口时 dispose。**

## 一次“查询背包”如何执行

1. RemakeApp 调用 `BagController.instance.initialize({account, authorization, api: new BagApi(http)})`。BagController.onInitialize 通过自身 EventScope 订阅 AccountModel；有效角色变化时 syncSession → resetSession(serverId/roleId) → refresh，背包页面无需存在。
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
