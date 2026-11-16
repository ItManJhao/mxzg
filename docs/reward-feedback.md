# 通用发奖反馈与确认框

更新：2026-11-16。本文维护通用发奖反馈、奖励窗和确认框的现行职责。领取入口和日常新领取开关继续关闭；本机与专项证据不代替发布包验收。Git交付状态以实际分支为准，后续范围见[实施路线](restructuring-plan.md)。

## 旧源码依据

旧挂机由BattleHandler的三参数ThingService.add走默认NORMAL，ThingAddEvent经ThingObserver发送5002，BackpackResponse按通知类型打开共用ItemRewardCtr或飘字。主线首通显式SLIENT，正常有战报走胜利页；重登后实际创建BattleLayer会补结算，无战报且非引导时走ItemRewardCtr。不能所有资产增加一律弹窗。ConfirmCtr本来也是共用确认框，挂机只提供满额文案与回调。

阅读旧版入口：`server/mxzg-server/mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/backpack/service/ThingService.java`、同模块`observer/ThingObserver.java`，以及`client/cocos_mxzg/client/idle/src/net/BackpackResponse.lua`、`layer/ItemRewardCtr.lua`、`layer/ConfirmCtr.lua`。旧根为AGENTS.md指定的正常工作目录。

## 新版完整调用链

1. 业务仍负责资格、请求幂等及持久回执。原资产事务调用RewardGrantService获得真实结果，保存成功回执后调用RewardFeedbackService.publish，参数为该receiptId、角色、提交版本、模式和真实结果。
2. 反馈服务只合并items.credited及另列的升级bonuses；过滤零量、精确加法并拒绝坏记录。同事务同回执去重，回滚不通知；提交后交付失败不重做资产。SILENT和零到账不发展示事件。
3. `reward.granted`是Frame字段35的强类型服务端事件。通知携带schemaVersion=1、receiptId、roleId、assetRevision、mode及正实际到账items，不含当前钱包；GameSocketClient核对连接与角色，不因此推进状态版本。
4. RewardBinding在应用层再次核对认证归属；AssetStateBinding成功提交整包后才交付对应revision。RewardController等待主城及配置包就绪，按回执编号冻结和去重；POPUP逐批等待关闭后继续，TIPS复用UIManager.toast，SILENT只去重。
5. 挂机恢复只在原请求完整匹配、资产及操作双版本确认且持久条件清理成功后交付feedback。实时通知先到或历史恢复先到均只展示一次，不伪造协议、不把旧资产重新提交。
6. 冷主线恢复在首次打开主线页时，原battleId回执与快照双确认后经RewardBinding.restoreItems进入同一队列；不把回执伪装成服务端事件。应用读取当前角色，按原UUID/版本合并实际正量；无正量不造空通知。MainChapterModel先固定reward归属，正常battle归属只走胜利页。

反馈队列是当前应用会话的展示状态，不是第二份资产缓存，也不是永久离线消息箱。页面刷新/应用崩溃后，仍依原业务未确认回执恢复；已经清除待确认记录的纯视觉中断不承诺跨进程续播。完整断线场景重现另在实施计划中，不以本批替代。

restore/restoreItems仅表示已交队列，不能据此标为已显示。RewardBinding可选onPresented回调只在同作用域RewardView真正打开后报告receiptId；应用按原主线归属登记presented。准备失败由原RewardModel保留failed队首，现有retry只重试显示，不再claim/replay。重置或销毁后的旧窗口不报告新身份。此链与冷主线实测见[首次进入记录](validation/chapter-entry-recovery-review-20261116.json)，当前主线协议只含基础实际奖励，不扩充其未下发的升级赠钻。

## 人工修改入口

| 职责 | 文件 |
|---|---|
| 事务后反馈与实际量投影 | [RewardFeedbackService](../backend/src/main/java/com/funsgamex/mxzg/reward/RewardFeedbackService.java) |
| 强类型字段 | [game.proto](../protocol/game.proto) |
| 认证归属、开窗/重试与飘字装配 | [RewardBinding](../client/assets/scripts/app/remake/RewardBinding.ts) |
| 队列、版本门槛及本会话去重 | [RewardController](../client/assets/scripts/features/reward/RewardController.ts)、[RewardModel](../client/assets/scripts/features/reward/RewardModel.ts) |
| 共用奖励画面 | [RewardView](../client/assets/scripts/features/reward/ui/RewardView.ts)、[完整Prefab](../client/assets/bundles/module/common/prefabs/RewardView.prefab) |
| 共用确认参数与交互 | [ConfirmView](../client/assets/scripts/features/common/ui/ConfirmView.ts)、[完整Prefab](../client/assets/bundles/module/common/prefabs/ConfirmView.prefab) |

新业务复用原事务及同一反馈服务，选择明确模式；不加模块奖励窗、不从BagAdd猜测奖励。打开确认框使用`UIManager.open(ConfirmView, {title, message, onConfirm, onCancel?, confirmText?, cancelText?, showCancel?})`；空标题隐藏标题条，showCancel默认true，单按钮通过Prefab Layout居中。关闭先退订，确定/取消只交付一次。

奖励窗复用common原图和原资源池；SuperScroll四列、124×134，逻辑总量不足四格才居中，多行末行不居中。原标题每帧0.12秒循环，彩带每帧0.08秒一次；主体与格子入场、音效和所有迟到清理由本窗管理。确认与奖励均使用UIManager共享模态，叠窗不增加蒙版颜色。

## 验证与保留缺口

后端43项相关测试通过，包含真实随机端口WS、回滚、内外事务、静默/零量、接管和旁观角色隔离；Java真实事件与TS互通通过。协议、Controller、应用重试绑定、两共用UI、挂机恢复和列表相关专项通过。独立真实WS＋原生IDB三组正常/丢回执/丢状态，各只发一次领取、接纳一笔反馈并交付一次，见[本轮记录](validation/reward-live-notice-review-20261116.json)。这份无引擎记录只证明交付，不代签Creator视觉。

Creator本机393×852设备选项、1280×720浏览器限定复验通过：确认/取消、真实8项奖励、金币详情叠窗、上下层空白关闭；模态节点始终1，全部关闭后residents/modalActive为0，钱包不变。见[画面记录](validation/reward-preview-review-20261116.json)；单按钮、短行居中、失败重试等其他边界由专项证明，不代签全部画面。后续同日已补独立冒险点领域/V26及权威快照，旧>=cap条件与通用确认接入IdleClaimBinding.begin，明确默认关闭，不以900401库存替代当前值；初始化/迁移规则见[领取依赖](main-chapter-idle-settlement.md#已实现的共享发奖与实际明细11-14)。65秒客户端、60秒服务端规则仍保留。未运行新发布构建、MySQL、真机或APP/小游戏适配；完整断线场景重现另待推进。旧奖励窗两处彩带创建可能重叠仍待观察，不为猜测重复播放两份；超出当前玩法的英雄时装/宠物等特殊奖励格不作为已恢复内容。
