# 背包库存事件：参数、顺序与订阅

2026-10-30。本批只完善 `features/Bag` 和战斗领奖的必要调用，保留 BaseModel/BaseController、单一全局 EventDispatcher、BaseView/EventScope。旧 `BagEvent.Changed` 已被替代，代码不保留转发或双通知路径。

## 四种库存事件

名称集中在 [BagEvent.ts](../client/assets/scripts/features/Bag/BagEvent.ts)，参数类型在 [data/BagEventData.ts](../client/assets/scripts/features/Bag/data/BagEventData.ts)，Model 返回结构在 [data/BagChangeSet.ts](../client/assets/scripts/features/Bag/data/BagChangeSet.ts)。

- `BagEvent.BagUpdate` / `bag.update`：一批成功库存变化的汇总。包括 roleKey、revision、reason、initialSync、added、quantityChanged、removed；普通页面监听此事件。
- `BagEvent.BagAdd` / `bag.add`：从不存在变为存在的新条目；added 保留新条目完整数据。已有条目数量增加不属于 Add。
- `BagEvent.BagRemove` / `bag.remove`：更新后不存在的条目；removed 保留删除前的完整数据。数量归零的增量转换成移除，不同时再发 QuantityChanged。
- `BagEvent.BagQuantityChanged` / `bag.quantity-changed`：前后都存在而数量不同；quantityChanged 每项为 itemId、oldQuantity、newQuantity、delta，增减都走此类型。

细分参数也包含 roleKey、revision、reason。同类多条只派发一次，没有该类差异就不派发。顺序固定为 Add → Remove → QuantityChanged（跳过空类）→ 最后一次 Update。不是逐个物品派发。

当前实际 HTTP 库存为 `{itemId, quantity}`，数据库 `game_inventory` 主键 `(role_id, item_id)`，因此本批的身份是角色内的 itemId。没有伪造实例 UUID，也不假设装备/英雄等未来协议仍以模板 ID 为唯一身份；引入实例库存时必须按新契约扩展 DTO 与比较键。

所有数组、条目、数量变化对象和事件对象都是冻结的只读快照，监听方不能通过参数改 Model。revision 来自 Model 的提交版本，状态提交也递增；不能把它当作连续奖励序号。事件不是资产变更指令，监听者不要再次按 delta 改库存。

本批运行代码修改为：BagController（派发、顺序和通知保护）、BagModel（计算并返回差异）、BagEvent（常量）、data/BagEventData（参数）、新增 data/BagChangeSet（变化清单）、ui/BagView（订阅）及 CampaignController（传入真实 reward 原因）。通用 EventDispatcher、基类、Prefab 和协议不改。验证入口为 tools/bag-events-check、bag-mvc-check、backpack-view-check、bag-module-types-check 和真实预览脚本 bag-mvc-preview；完整入口仍为 check-project.mjs。

## 首次、重置、重复与状态

- 首次成功同步：仅一次 BagUpdate，reason=`initial-sync`、initialSync=true，三个变化数组为空；页面从 Model 读取初始快照，不将其当获得。
- 换号/换服/退出/模块清理：清空 Model 后仅汇总 BagUpdate，reason=`session-reset`，变化数组为空；不把旧角色清理当真实消耗，也不发 Remove。
- 已同步普通查询：有真实差异时按四种规则派发，reason=`query`；无变化不派发库存事件或汇总。
- 战斗领取：调用方显式传 `reward`；未来明确消耗可传 `consume`。未提供来源默认 `unknown`，不根据正负数或响应标识猜原因。
- 独立 `BagEvent.BagSyncStateChanged` / `bag.sync-state-changed`：传 roleKey/revision/status/synced/error，表达 loading/error/ready 恢复及角色状态变化。它可先于本批细分通知，不算物品变化。失败不派发成功库存事件。

失败保留上次有效库存，重试得到相同库存只通知状态恢复。无效批次先整批校验，不能部分改库存；合法空快照会移除原有全部条目，首次空快照仍只初始汇总。全量数据中的非法零数量不接收，协议正常全量列表省略零数量条目；显式 delta 可将数量减至零。

## 从请求到通知

查询：`BagController.refresh → read → AccountService.authenticated → BagApi.list → readBagItems → BagModel.replaceAll → BagChangeSet → BagController.notify`。Controller 复核会话和查询代数，Model 先校验整批数据并计算差异，再一次提交新状态后返回清单；notify 派发细分事件，最后 Update。

领奖：`CampaignController.claim → BagController.runInventoryUpdate(..., "reward") → 原 CampaignApi.claim`。Controller 校验响应与会话，在原同步通知批次中先提交账号钱包、相关主线状态和 `BagModel.replaceAll`，然后发送库存事件。所有回调看到完整库存；钱包也已提交。重复响应、旧查询失效、串行写入、换号/换服隔离仍保留。

BagController 的 notifying 保护持续到全局派发器真正完成本批 Update 回调，再放行 queued mutations，不是发完 emit 调用就解锁。回调中触发的新查询、增量、写操作或角色重置不会在当前细分通知中途提交。此保护也覆盖外层 batchNotifications 正在投递的场景，不新增私有派发器或改全局事件框架。

`BagController.applyDelta(session, responseId, changes, reason)` 现在返回 **Promise<boolean>**，调用方必须 await；进行中的写操作完成后再应用。过时会话/重复标识返回 false，无效数据 reject，合法提交返回 true。尚未接入虚构的服务器增量推送。Controller 的请求重入复用与库存提交排队是两回事，同一进行中请求仍复用原 Promise。

奖励弹窗和获得动画沿用真实战报/领奖结果；本批没有给细分事件附加新特效。BagAdd 只表达新增条目，不能作为奖励次数或奖励种类的唯一判断。

## 实际界面订阅

[BagView.onOpen](../client/assets/scripts/features/Bag/ui/BagView.ts) 先调用 `EventDispatcher.instance.on(BagEvent.BagUpdate, () => this.refreshFromModel())`，把退订交给 BaseView.ownListener，再立即读取 Model 展示。另订阅 BagSyncStateChanged，仅调用 writeTalk 更新加载/错误提示，避免一批变更多次重绘列表；不监听全部细分事件。

BaseView.runClose 的 EventScope 自动清理这两个本页订阅和按钮监听，其他模块订阅保留。页面关闭不影响 BagController。其他功能可以直接监听全局 BagEvent，然后读 BagModel；只有明确需要局部行为时才选细分事件。Prefab/SuperScroll 配置与节点路径不改，仍见 [维护指南](bag-mvc-maintenance.md)。

## 验证边界

事件专项检查覆盖初次同步、新增多条、已有数量增减、归零移除、混合三类变化、相同库存、无效批次、错误恢复、旧会话响应、直接/外层批处理中的回调重入与重置。每个库存回调都检查 Model 的版本和整批数据，防止派发器吞掉断言后误报通过；类型检查包含事件只读约束。

本机运行结果及尚未验证内容以 [本批证据](validation/bag-events-20261030/README.md) 为准，不用类型检查替代真实查询/领奖/详情流程。独立包按用户要求不构建；其他模块不在本批重构。
