# 通用发奖反馈与确认框

更新：2026-11-16。本文维护通用发奖反馈、奖励窗和确认框的现行职责。主线actual及升级附赠已复用本链完成正常/冷恢复限定检查和本机复验，见[本批检查](validation/chapter-reward-review-20261116.json)、[本机记录](validation/chapter-reward-preview-20261116.json)。本批另接挂机双确认后的现场收取与通用反馈并行，现场、重复通知、实际关页及冷重登已完成限定Creator复验，见[收取记录](validation/idle-collect-preview-20261116.json)。领取入口和日常新领取开关继续关闭；本机与专项证据不代替发布包验收。Git交付状态以实际分支为准，后续范围见[实施路线](restructuring-plan.md)。

同日继续补齐通用角色升级反馈：原成功回执、实时通知和现有奖励队列共用`roleUpgrade`，主线及挂机复用common的RoleUpgradeView。后端、Controller和应用装配专项已通过；本轮新增升级页的Creator实际画面仍在复验，不能用前述奖励窗/宝箱记录代替。

## 旧源码依据

旧挂机由BattleHandler的三参数ThingService.add走默认NORMAL，ThingAddEvent经ThingObserver发送5002，BackpackResponse按通知类型打开共用ItemRewardCtr或飘字。主线首通显式SLIENT，正常有战报走胜利页；重登后实际创建BattleLayer会补结算，无战报且非引导时走ItemRewardCtr。不能所有资产增加一律弹窗。ConfirmCtr本来也是共用确认框，挂机只提供满额文案与回调。

阅读旧版入口：`server/mxzg-server/mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/module/backpack/service/ThingService.java`、同模块`observer/ThingObserver.java`，以及`client/cocos_mxzg/client/idle/src/net/BackpackResponse.lua`、`layer/ItemRewardCtr.lua`、`layer/ConfirmCtr.lua`。旧根为AGENTS.md指定的正常工作目录。

旧挂机的3005点击链立即播放`collect-N`，不等待成功回包；5002到达后独立打开共用奖励窗，3005回复只读领取时间。动作后1.5秒排`normal-0`及两秒刷新守卫都不推迟弹奖。旧最终零实际奖励不发5002，但点击动画已经开始；冷3004只恢复当前计时，不补播收取。新版保留动画与通用奖励并行，改为匹配回执和统一状态双确认后才交付成功表现，属于明确的可靠性差异，不宣称点击时序完全相同。详见[旧收取审计](validation/idle-collect-legacy-audit-20261116.json)。

主线升级赠钻旧链须另行区分：RoleExpProcessor先调用RoleService.addExp，逐级累计离开等级的mainlevel.reward；升级附赠另以SLIENT发放，再由2014交RoleUpgradeCtr展示升级前后等级及合并奖励。3002首通回包只含first_reward，不含这笔附赠；前三关顺序新角色样本分别产生10、0、10升级钻石，第二关151钻属于基础首通。chapterextrareward是3008独立里程碑领取，首项第15关，旧胜利页的相关文字只是下一目标提示，不能当作前三关已到账奖励。新版已恢复该提示的完整同源表、V27权威已领集合和原show_rich只读区域，见[里程碑记录](validation/chapter-milestone-review-20261116.json)；它仍不是本次到账奖励，不开放独立3008领取。完整路径和行号见[本批旧源码审计](validation/chapter-reward-legacy-audit-20261116.json)。

旧RoleService的2014独立于通用5002模式：内部升级赠钻虽然使用拼写为`SLIENT`的静默发放，真实升级仍发送2014并开升级页。新版通用`SILENT`继续保持不展示，和该旧独立推送语义存在明确差异，不能声称所有静默经验来源已等价恢复。当前生产只完整接通主线与新挂机两个真实角色经验来源：主线通过原actual恢复显式POPUP，挂机首次成功通过POPUP通知并由双确认恢复；尚无生产SILENT/TIPS发奖调用。其他暂停简化链写`game_campaign.role_exp`，开发GM也不等于真实角色经验来源。依据见[升级源码审计](validation/role-upgrade-legacy-audit-20261116.json)。

## 新版完整调用链

1. 业务仍负责资格、请求幂等及持久回执。原资产事务调用RewardGrantService获得真实结果，保存成功回执后调用RewardFeedbackService.publish，参数为该receiptId、角色、提交版本、模式和真实结果。
2. 反馈服务合并items.credited及另列的升级bonuses，并从actual.experience的真实连续前后链提取升级摘要；过滤零量、精确加法并拒绝坏记录。同事务同回执去重，回滚不通知；提交后交付失败不重做资产。SILENT不发展示事件；可见模式只要有正物品或真实升级即可交付，两者均无才跳过。
3. `reward.granted`是Frame字段35的强类型服务端事件。通知携带schemaVersion=1、receiptId、roleId、assetRevision、mode及实际到账items，不含当前钱包；可选`request_id=7`只关联原业务请求，不成为新的发奖/展示身份。新增可选`role_upgrade=8`为RewardRoleUpgrade，运行时`roleUpgrade`只含beforeLevel/afterLevel，后者必须严格更高。挂机传原回执requestId，其他五参publish调用不带此字段。GameSocketClient核对连接与角色，不因此推进状态版本。
4. RewardBinding在应用层再次核对认证归属；AssetStateBinding成功提交整包后才交付对应revision。RewardController等待主城及配置包就绪，按回执编号冻结和去重，内容指纹包括升级前后等级。仍只有一份队列：POPUP由RewardBinding按有无roleUpgrade选择common的RoleUpgradeView或原RewardView，逐批等实际关闭再继续；TIPS复用UIManager.toast显示等级变化及已有物品，SILENT只去重、不展示。
5. 挂机只接管requestId匹配本应用持久待确认请求的提前通知，等待原请求完整匹配、资产及操作双版本确认且持久条件清理成功后统一交付；无关联或不匹配的其他奖励继续原通用队列。确认信号先同步通知原页面显示期启动收取，随即交付同回执的实际量及升级反馈，窗口不等动画结束。实时通知或历史恢复均按同一receiptId去重，不伪造协议、不把旧资产重新提交。
6. 主线原battleId回执与快照双确认后才进入展示，MainChapterModel提前固定battle/reward归属。新ChapterReceipt.actual复用RewardGrantResult，基础rewards语义不变，前端保留冻结experience链。正常battle先走胜利页，关闭后只选择actual.bonuses作为物品，并保留同笔升级；冷reward首次进主线时选择actual.items实际量及bonuses，升级信息相同。两条路径由原归属只选一次，仍用原battleId及回执版本去重，不把回执伪装成服务端事件；主线不另发一份全量通知与正常附赠投影竞争。没有正物品但真实升级仍可开升级页，两者均无不造空通知；历史缺actual只展示原rewards，不猜附赠或升级。

反馈队列是当前应用会话的展示状态，不是第二份资产缓存，也不是永久离线消息箱。页面刷新/应用崩溃后，仍依原业务未确认回执恢复；已经清除待确认记录的纯视觉中断不承诺跨进程续播。完整断线场景重现另在实施计划中，不以本批替代。

现场收取以回执冻结的seconds/maxSeconds决定档位，仅本次新请求携带的原页面显示期可以播放。零实际到账仍可播放收取；无正物品且无真实升级不造空奖励窗。冷恢复、关页及关后重开不补播、不补开主线。资源/节点未就绪或正在战斗/收取时跳过本次动作，不阻止通用反馈，不重领、不再飞一份阵亡资源；关页销毁与迟到回调继续由原生命周期清理。通知的可选requestId不改变发奖资格和事务，重复登记的关联也必须一致；不按requestId另建去重表。

restore/restoreItems/restoreActual仅表示已交队列，不能据此标为已显示。restoreActual的all选择基础实际量与附赠，bonuses只选择升级附赠物品；真实experience升级在两种投影中都保留，不能因零赠钻丢失。两者复用原回执编号，不生成第二笔资产奖励。RewardBinding可选onPresented只在同作用域RewardView或RoleUpgradeView真正打开后报告receiptId；应用按原主线归属登记展示进度。准备失败由原RewardModel保留failed队首，retry只重试显示，不再claim/replay。重置或销毁后的旧窗口不报告新身份。首次进入原链实测见[前批记录](validation/chapter-entry-recovery-review-20261116.json)；本批升级附赠以持久actual为唯一来源，历史回执缺字段明确未记录，不读取当前mainlevel重算。actual钱包及经验前后值只供审计/展示，不提交资产Model。

## 升级信息与只读功能预告

roleUpgrade由同次actual.experience的首个beforeLevel与末个level提取并冻结，不看当前Snapshot等级或赠钻量。经验条目须为安全整数，requested为正且等于accepted＋ignored，等级不得倒退；升级必须接纳经验，同级不得附赠升级钻石，后段beforeLevel/beforeExperience须接上前段level/experience。未升级不携带摘要。同receiptId增加、删除或改变升级信息都是内容冲突，不能覆盖已接纳结果或新造一个升级回执；挂机提前通知仍按原requestId等待双确认，后来相同通知交同一队列去重。

RoleUpgradeView把等级对比、该通知已有的实际奖励和下一功能预告保存在完整common预制体，复用原资源池与四列SuperScroll。奖励区标题为“本次获得”，避免把基础量误说成升级附赠；奖励视口固定134设计单位并裁剪，冷恢复all超过一行时在本区域滚动，避免遮住下方预告；原RewardView保持原有普通奖励表现。升级页关闭/销毁后才推进同一队列，失败重试、迟到资源、叠窗及换号均沿原生命周期，不新增升级发奖或第二份队列。

负责人已选择旧客户端Lua作为下一功能预告依据。现有配置生成器自动投影`RoleUpgradeFeature`并随登录配置包装载，页面从GameConfig读取；不手写候选清单，不修改当前OpenCondition导航及实际门槛。候选按旧根原子、parent、type/open筛选，取严格高于历史afterLevel的最小等级，只展示旧名称、说明、图标及等级条件，不打开或开放该功能。旧pairs＋table.sort没有规定同门槛顺序，新版仅稳定保留投影源顺序，不宣称这是旧版保证的优先级。具体差异与负责人选择见[升级审计](validation/role-upgrade-legacy-audit-20261116.json)。

## 人工修改入口

| 职责 | 文件 |
|---|---|
| 事务后反馈与实际量投影 | [RewardFeedbackService](../backend/src/main/java/com/funsgamex/mxzg/reward/RewardFeedbackService.java) |
| 强类型字段 | [game.proto](../protocol/game.proto) |
| 认证归属、开窗/重试与飘字装配 | [RewardBinding](../client/assets/scripts/app/remake/RewardBinding.ts) |
| 队列、版本门槛及本会话去重 | [RewardController](../client/assets/scripts/features/reward/RewardController.ts)、[RewardModel](../client/assets/scripts/features/reward/RewardModel.ts) |
| 共用奖励画面 | [RewardView](../client/assets/scripts/features/reward/ui/RewardView.ts)、[完整Prefab](../client/assets/bundles/module/common/prefabs/RewardView.prefab) |
| 共用升级画面与只读预告 | [RoleUpgradeView](../client/assets/scripts/features/reward/ui/RoleUpgradeView.ts)、[完整Prefab](../client/assets/bundles/module/common/prefabs/RoleUpgradeView.prefab)、[RoleUpgradeUtils](../client/assets/scripts/features/reward/utils/RoleUpgradeUtils.ts) |
| 共用确认参数与交互 | [ConfirmView](../client/assets/scripts/features/common/ui/ConfirmView.ts)、[完整Prefab](../client/assets/bundles/module/common/prefabs/ConfirmView.prefab) |

新业务复用原事务及同一反馈服务，选择明确模式；不加模块奖励窗、不从BagAdd猜测奖励。打开确认框使用`UIManager.open(ConfirmView, {title, message, onConfirm, onCancel?, confirmText?, cancelText?, showCancel?})`；空标题隐藏标题条，showCancel默认true，单按钮通过Prefab Layout居中。关闭先退订，确定/取消只交付一次。

奖励窗复用common原图和原资源池；SuperScroll四列、124×134，逻辑总量不足四格才居中，多行末行不居中。原标题每帧0.12秒循环，彩带每帧0.08秒一次；主体与格子入场、音效和所有迟到清理由本窗管理。确认与奖励均使用UIManager共享模态，叠窗不增加蒙版颜色。

## 验证与保留缺口

本轮升级接线后端`RewardFeedbackServiceTest`17项与`MainChapterIdleClaimSocketTest`5项通过，覆盖连续经验链、非法数值/断链回滚、同回执异升级、SILENT及空items真实升级。`reward-controller`15组、`reward-binding`31组通过，包含统一revision门槛、升级指纹/冻结、开窗失败与显式重试、旧身份迟到、TIPS及主线两种投影。Java真实WS通知在`backend/target/reward-notice.pb`，仅升级空物品通知在`backend/target/reward-notice-upgrade-empty.pb`；协议生成检查通过。本轮RoleUpgradeView已完成正常主线、冷恢复、挂机联动及最终标题的限定[本机复验](validation/role-upgrade-preview-20261116.json)，完整检查见[升级记录](validation/role-upgrade-review-20261116.json)。这些结果不代替真机、发布包或全旧经验来源验收。

此前现场收取接线的后端专项18项通过：`RewardFeedbackServiceTest`13项及`MainChapterIdleClaimSocketTest`5项，包含请求关联的协议保留、泛型通知字段缺失、坏UUID原事务回滚、同回执异请求冲突、嵌套事务去重与真实WS。proto生成检查通过，Java实际通知字节在`backend/target/reward-notice.pb`供互通。另有15套客户端专项、类型及Java/TS互通通过；Creator现场、重复通知、实际关页及冷恢复已有[独立本机证据](validation/idle-collect-preview-20261116.json)，零到账与四档仍仅按专项覆盖；玩家领取入口、应用入口和日常服务端开关仍关闭，本批不做集中构建、不提交推送。

此前主线奖励14套相关检查、严格类型及真实Java/TS回执互通通过；后端19项与最后持久化12项为重叠复验。独立H2/真实WS的Creator预览中，关1正常胜利后仅弹10钻附赠，关2基础151钻且无附赠不弹窗，关3BATTLE回包后重载、停留主城不结算，首次进主线把6项基础和10钻附赠合为7格一次显示。显示时真实Socket重连一次，实例、打开计数和资产不变；关闭切页后队列idle、残留弹窗及激活模态归零，见[本批记录](validation/chapter-reward-preview-20261116.json)。仅有1条预期网络恢复遇敌告警，没有应用错误；不扩大为所有奖励或旧RoleUpgrade专页等价验收。

此前通用发奖批次后端43项相关测试通过，包含真实随机端口WS、回滚、内外事务、静默/零量、接管和旁观角色隔离；Java真实事件与TS互通通过。协议、Controller、应用重试绑定、两共用UI、挂机恢复和列表相关专项通过。独立真实WS＋原生IDB三组正常/丢回执/丢状态，各只发一次领取、接纳一笔反馈并交付一次，见[原批记录](validation/reward-live-notice-review-20261116.json)。这份无引擎记录只证明交付，不代签Creator视觉。

Creator本机393×852设备选项、1280×720浏览器限定复验通过：确认/取消、真实8项奖励、金币详情叠窗、上下层空白关闭；模态节点始终1，全部关闭后residents/modalActive为0，钱包不变。见[画面记录](validation/reward-preview-review-20261116.json)；单按钮、短行居中、失败重试等其他边界由专项证明，不代签全部画面。后续同日已补独立冒险点领域/V26及权威快照，旧>=cap条件与通用确认接入IdleClaimBinding.begin，明确默认关闭，不以900401库存替代当前值；初始化/迁移规则见[领取依赖](main-chapter-idle-settlement.md#已实现的共享发奖与实际明细11-14)。65秒客户端、60秒服务端规则仍保留。未运行新发布构建、MySQL、真机或APP/小游戏适配；完整断线场景重现另待推进。旧奖励窗两处彩带创建可能重叠仍待观察，不为猜测重复播放两份；超出当前玩法的英雄时装/宠物等特殊奖励格不作为已恢复内容。
