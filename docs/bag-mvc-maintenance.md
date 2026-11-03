# 背包标准模块：维护与验收入口

更新：2026-11-03。当前采用登录统一初始化与服务端资产同步，保留现有 Prefab、只读详情、SuperScroll 和唯一 BagModel。其他玩法暂停；旧查询模板已经退役。

## 固定目录与文件职责

- features/Bag/BagController.ts：声明协议，onNotify → onInventoryState → Model → BagEvent。
- features/Bag/BagModel.ts：唯一库存状态、全量校验与界面 revision，不联网。
- features/Bag/BagEvent.ts、data/：界面事件、状态、变更集和物品类型。
- features/Bag/ui/：BagView、BagItemView、BagInfoView、BagTabView 和挂载辅助。
- features/account/RoleController.ts：角色协议入口，提交 AccountModel 中唯一角色资料，不处理登录。
- app/remake/AssetStateBinding.ts：应用协调身份、持久版本、角色与背包原子通知。
- platform/Protocol.ts / ProtocolRouter.ts：统一消息目录与真实消息定向分发，不保存玩家资产。

BagApi、BagUpdateCoordinator、bindBagSession 已删除；不再保留背包查询、其他玩法回包写库存或无版本资产增量入口。暂停模块的 PausedFeatures 只明确报错，不执行请求回调，不提供假成功或第二条通信链；对应模块重做时删除其暂停边界。

## 代码阅读与注释约定

按 Protocol → AssetStateBinding → BagController.onNotify → onInventoryState → BagModel.replaceAll → BagEvent → BagView.refreshFromModel 阅读。账号协调在应用层，背包只接收已核验的状态。

本模块手写源码已补齐文件头、函数、类属性、数据字段和界面绑定的中文说明。修改时同时更新作用、取值、设置/清理时机；Prefab 绑定为空的行为按方法说明判断，不以注释代替校验。

- 服务端 Snapshot.revision 是持久资产版本；BagState.revision 是本地提交序号；BagItemView.revision 是异步贴图代次，三者不得混用。
- BagAdd 表示“新增库存种类”，不能代替旧 5002 的获得弹窗/文字提示；首次同步不播放奖励。
- 当前 itemId 是配置 ID，尚未完成旧版实例 ID、到期字段和全部物品操作的还原。
- BagModel.beginSync/fail/applyDelta 与事件 reason 的历史枚举仍有预留代码，当前统一首包和完整状态同步不调用；禁止把它们接成第二条查询或客户端发奖链。
- 详情当前只读，“确定”是关闭，来源/分解/使用尚未恢复；注释不能写成已实现操作。

## 游爱式背包流程与接入前提

参考 SGCtrl 的集中协议登记、onNotify 明确分发、onXxx 更新 Model、通知 View 的阅读路径；内容与规则仍以 mxzg 旧源码为准。独立新版以 Frame.name 字符串作为协议标识，Protocol 集中登记，不为相似外观维护另一套未使用数字号。

打开 BagController 即可看到三个实际协议：session.login、session.authenticate、state.changed。前两个从 body.initial.inventory 取首包，第三个从 body.inventory 取同步；全部走 onInventoryState，不通过 Promise 伪造背包协议。

## 固定通信与状态模板

### 1. 登录统一初始化

AccountApi → GameSocketClient.login/connect → 服务端会话验证与一致读 → 单条 Accepted.initial → AccountService.onInitialized → AssetStateBinding → 两个模块 onNotify → 唯一 Model → 事件 → View。

账号服务只管理凭证与登录；背包不 import 账号、不持有 token、不选择库存归属。服务端从有效会话决定角色；客户端检查归属是拒绝迟到旧数据，不能代替后端鉴权。

### 2. 数据变化由服务端同步

领域事务 → 钱包/库存持久写入 → AssetSyncService.changed（同事务版本）→ 提交成功 → GameSocketHandler.assetsChanged → state.changed → GameSocketClient.onState → AssetStateBinding.apply → RoleController/BagController.onNotify → Model → 事件。

先校验整包，再批量更新角色和库存，最后交付通知；非法库存不能先更新钱包。回滚不发事件，重复/较低持久版本不提交。完整状态代替当前无版本增量，不能从收到的消息盲目累加物品。

### 3. 断线、换号与页面生命周期

断线显示恢复提示并保留缓存；重连鉴权成功回包本身就是恢复数据，不发 session.sync/inventory.list。换号、切服、退出先使旧连接失效并清库存；旧连接回调受本地连接代次隔离。被顶号停止自动重连。

页面打开只订阅 BagEvent、读取 Model；切分类不联网。页面关闭解除自身事件与资源，不销毁模块；应用销毁才解除协议登记。静态布局保持在 Prefab，列表只向 SuperScroll 绑定数据。

### 4. 后续模块恢复前提

先核对旧源码/策划规则，再增加 .proto 与 Protocol，开发后端事务及持久幂等；前端明确 onNotify/onXxx、唯一 Model、事件及恢复快照。所有资产修改接入提交后同步，不能重新加入 HTTP、客户端发奖或本地库存写队列。获得弹窗/文字等提示依原 5002 类型恢复，不从 BagAdd 猜测业务原因。

### 5. 必须验证

真实 TS/Java 互通、一次登录首包、空背包、无重复查询；同步完整校验、原子通知、重复/乱序帧、重连、旧连接、顶号、换服；提交后推送与回滚无推送；HTTP 旧路由全部退役；数据库迁移和重启保留数据。当前测试结果与页面复验边界见[进度](development-progress.md)。

### 服务端下发数据怎样查看

Creator 控制台筛选 WS接收。日志显示协议含义、物品种类和 Item{itemId,quantity} 的实际结构，角色与库存同屏打印；默认过滤心跳并隐藏凭证，且有长度限制。日志失败不能影响协议处理。

## 在 Creator 修改 UI

页面：[client/assets/prefabs/ui/Bag/BagView.prefab](../client/assets/prefabs/ui/Bag/BagView.prefab)。列表节点路径不变：

- `BagView/spr_box/BagScroll`：SuperScroll，Content 只绑定一次。
- `BagView/spr_box/BagScroll/view`：UITransform/Mask，手动调整裁剪范围。
- `BagView/spr_box/BagScroll/view/content`：SuperContent，修改布局、列/行、方向、间距、四边距、Cell Prefab 与明确的尺寸覆盖开关。
- Cell：[BagItemView.prefab](../client/assets/prefabs/ui/Bag/BagItemView.prefab)，组件现名 BagItemView；外观/数量字/选中图片在 Cell 内编辑。
- 详情：[BagInfoView.prefab](../client/assets/prefabs/ui/Bag/BagInfoView.prefab)，组件 BagInfoView；页签：[BagTabView.prefab](../client/assets/prefabs/ui/Bag/BagTabView.prefab)，组件 BagTabView。

[SuperScroll Inspector 指南](super-scroll-authoring.md) 的布局规则和无业务编辑器预览继续有效。本批没改源 Prefab、SuperScroll、SuperContent、资源路径与加载边界；10 个移动脚本 UUID 均逐一核对保留，BagView 仍是 `7b14e0a2-3c58-4d1f-8e6a-9f0b2c4d5e61`。Prefab 内稳定的 CompPrefabInfo.fileId 不是脚本路径，不因改名替换。目录实际名及导入统一为 `features/Bag`，旧 backpack 脚本目录已移除。

尺寸/位置仍由以下入口控制，不宣称整页静态 UI 已全部整改：SuperContent 算 content/Cell 根尺寸，原生 Layout 排动态 Cell，ScrollView 管滚动；BagView 仅提供条目/渲染回调，保留同分类滚动、分类回起点和缩短限制。空槽至少 20/按四补齐是背包规则。`BagMount.mountBagPage` 只装配共享壳与可见区域；PrefabLayout 不再补偿静态文字/九宫格位置。BagView 保留动态分类排列，BagMount.openBagInfo/seatCenter 只按宿主尺寸居中详情。

## 旧协议还原清单

依据旧工作目录 G:/work/FsGame/Demo/mj/program；以下为源码核查结果，尚未完成正式服画面验收。

| 原依据 | 当前差异与推进要求 |
|---|---|
| mxzg-protofiles/protofiles/game/BackPack.proto，ResBackPackItem | 旧 item_id 为数据 ID，item_type 为配置 ID，num 为数量；当前 Item.itemId 实为配置 ID。不可把旧数据 ID 强转成配置 ID；实例引入前需补持久模型与安全的 int64 编解码 |
| 同文件，5010 / ResTimeLimitItem | 独立期限列表包含数据 ID、类型和 end_time；当前未实现。须核对服务器时间单位与过期回收，再合入登录快照，不能仅 UI 隐藏当作资产扣除 |
| client/cocos_mxzg/client/idle/src/data/BackpackData.lua，getItemsByPageSign 487–697 行 | 普通道具按 sort 降序，本次恢复；旧 Lua 同权重无次序，配置说明提及物品类型次序，最终需正式服对照。装备增加装备稀有度，碎片按合成条件与 sort，特殊页依实例数据，不能共用普通道具排序 |
| client/cocos_mxzg/client/idle/src/net/BackpackResponse.lua，backpackGain | 5002 同时包含增减与提示：0 静默、1 弹窗、2 文字；还排除英雄、符文、神装等由专用模块更新的数据。当前 state.changed 只有快照，不含演出原因；需另加明确提示载荷和重复消息处理，不能从差值猜演出 |
| server/mxzg-server/mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/backpack/observer/ThingObserver.java | 获得事件按业务 NoticeType 发 5002，消耗使用静默负数；当前事务后同步保留资产权威，后续提示应与同一次已提交事务关联 |
| BackPack.proto 5004/5005/5006/5007/5008/5009 | 装备合成、一键合成、开箱、普通/精英英雄碎片、自选礼包；逐项查配置和服务端条件再恢复，不能创建通用“使用成功”接口替代 |
| BackPack.proto 5011/5012/5013/5014 | 道具分解、充值卡、宠物碎片、装备合成日志；目前均未恢复。依赖英雄/宠物的操作在相关模块暂停期间不得开放 |
| mxzg-protofiles/protofiles/game/Role.proto，GResRoleInfo 2001 | 当前仅基础身份、等级、金币与宝石；经验/英雄经验、精力、头像/形象/边框、VIP、创号及服务器时间、军团/引导、虹石/神权等仍有缺口。逐字段核对持久来源，不以固定默认值伪装已还原 |

下一步先补身份字段映射与期限物品存储设计，再选择无英雄依赖的背包操作核对完整事务规则。此清单只记录已见源码和缺口，不表示全部旧背包功能已审完。
