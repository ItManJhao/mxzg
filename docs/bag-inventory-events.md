# 背包库存事件：参数、顺序与订阅

更新：2026-11-03。背包由统一登录初始化和服务端 state.changed 驱动，界面事件名称、参数与订阅生命周期保留；旧主动查询和玩法回包写库存已删除。

## 四种库存事件

名称集中在 [BagEvent.ts](../client/assets/scripts/features/Bag/BagEvent.ts)，参数类型在 [data/BagEventData.ts](../client/assets/scripts/features/Bag/data/BagEventData.ts)，Model 返回结构在 [data/BagChangeSet.ts](../client/assets/scripts/features/Bag/data/BagChangeSet.ts)。

- `BagEvent.BagUpdate` / `bag.update`：一批成功库存变化的汇总。包括 roleKey、revision、reason、initialSync、added、quantityChanged、removed；普通页面监听此事件。
- `BagEvent.BagAdd` / `bag.add`：从不存在变为存在的新条目；added 保留新条目完整数据。已有条目数量增加不属于 Add。
- `BagEvent.BagRemove` / `bag.remove`：更新后不存在的条目；removed 保留删除前的完整数据。数量归零的增量转换成移除，不同时再发 QuantityChanged。
- `BagEvent.BagQuantityChanged` / `bag.quantity-changed`：前后都存在而数量不同；quantityChanged 每项为 itemId、oldQuantity、newQuantity、delta，增减都走此类型。

细分参数也包含 roleKey、revision、reason。同类多条只派发一次，没有该类差异就不派发。顺序固定为 Add → Remove → QuantityChanged（跳过空类）→ 最后一次 Update。不是逐个物品派发。

当前 Protobuf 库存为 `{itemId, quantity}`，数据库 `game_inventory` 主键 `(role_id, item_id)`，因此本批的身份是角色内的 itemId。没有伪造实例 UUID，也不假设装备/英雄等未来协议仍以模板 ID 为唯一身份；引入实例库存时必须按新契约扩展 DTO 与比较键。

所有数组、条目、数量变化对象和事件对象都是冻结的只读快照，监听方不能通过参数改 Model。revision 来自 Model 的提交版本，状态提交也递增；不能把它当作连续奖励序号。事件不是资产变更指令，监听者不要再次按 delta 改库存。

当前验证为统一 session-state-check、backpack-view-check 和后端真实 WS/事务测试，旧查询调度测试已经由新链路取代。

## 首次、重置、重复与状态

- 首次成功同步：仅一次 BagUpdate，reason=`initial-sync`、initialSync=true，三个变化数组为空；页面从 Model 读取初始快照，不将其当获得。
- 换号/换服/退出/模块清理：清空 Model 后仅汇总 BagUpdate，reason=`session-reset`，变化数组为空；不把旧角色清理当真实消耗，也不发 Remove。
- 已同步服务端推送：先校验持久版本与整包，再按真实差异派发；无差异不派发库存变化事件。
- 目前推送 reason=unknown，不从数量变化猜测发奖原因。其他玩法暂停，获得提示类型须后续按旧 5002 恢复。
- 独立 `BagEvent.BagSyncStateChanged` / `bag.sync-state-changed`：传 roleKey/revision/status/synced/error，表达 loading/error/ready 恢复及角色状态变化。它可先于本批细分通知，不算物品变化。失败不派发成功库存事件。

失败保留上次有效库存，重试得到相同库存只通知状态恢复。无效批次先整批校验，不能部分改库存；合法空快照会移除原有全部条目，首次空快照仍只初始汇总。全量数据中的非法零数量不接收，协议正常全量列表省略零数量条目；零库存由完整快照省略该条目表达。

## 从服务端状态到通知

session.login/session.authenticate 回包内的 initial，或 state.changed 事件 → GameSocketClient → AssetStateBinding 整体校验身份/持久版本/角色/库存 → 批次提交 RoleController 和 BagController → 唯一 Model → BagEvent → View。

应用在任何通知发出前完成角色和库存提交；客户端不执行背包查询或资产写请求回调。重复/较低版本和旧连接数据不提交，非法整包不先改钱包。BagModel 的本地 revision 仅供界面通知，服务端 state_revision 才是资产同步版本，两者不能互换。

获得弹窗和动画必须依真实业务提示类型恢复，不能从 BagAdd 猜测。细分事件只描述快照差异，监听者不能再次按 delta 修改库存。

## 实际界面订阅

[BagView.onOpen](../client/assets/scripts/features/Bag/ui/BagView.ts) 先调用 `EventDispatcher.instance.on(BagEvent.BagUpdate, () => this.refreshFromModel())`，把退订交给 BaseView.ownListener，再立即读取 Model 展示。另订阅 BagSyncStateChanged，仅调用 writeTalk 更新加载/错误提示，避免一批变更多次重绘列表；不监听全部细分事件。

BaseView.runClose 的 EventScope 自动清理这两个本页订阅和按钮监听，其他模块订阅保留。页面关闭不影响 BagController。其他功能可以直接监听全局 BagEvent，然后读 BagModel；只有明确需要局部行为时才选细分事件。Prefab/SuperScroll 配置与节点路径不改，仍见 [维护指南](bag-mvc-maintenance.md)。

## 验证边界

当前 session-state-check 验证初始化、角色/背包整批可见、重复/较低版本、非法整包、旧连接、换服、重连及退出；backpack-view-check 验证显示与订阅，严格类型检查验证只读事件约束。服务端回归验证提交后推送与回滚，当前结果见[进度](development-progress.md)。

[2026-10-30 事件证据](validation/bag-events-20261030/README.md)是旧查询/写队列方案的历史记录，不作为当前实现通过证明。独立包本轮不构建；其他玩法暂停。
