# 挂机宝箱恢复依据

核对日期：2026-11-09。本批只核对源码与当前实现，不开放领取，不将本记录视为画面或完整奖励验收。

## 旧版表现

以下客户端路径相对旧项目 `client/cocos_mxzg/client/idle/src/`。

- `layer/battle/BattlePanelLayer.lua:getBattleHarvestProgress/getBattleHarvestStatus`：用服务器当前秒数减领取起点，除以服务器最大累计时长，限制到0～100后向下取整。整数百分比≤2、≤5、≤10、>10分别使用状态1、2、3、4；不能直接用未取整的小数判断边界。
- `updateBtnHarvestSpineAction`：资源为`spine/res-block`，循环`normal-1`至`normal-4`；状态不变时不重建骨骼。计时显示小时:分钟并限制上限；累计时间严格大于`battle_bubble_show_time=600`秒才显示气泡。
- 静态挂点需包含`BattlePanelLayer.ccb`内`menu.y=85`，按640设计宽与面板中心换算，宝箱y为240+85-184.5=140.5；不能漏掉菜单偏移，否则覆盖收益栏。气泡父节点`node_bubble`没有额外位置偏移。
- `runBtnHarvestCollectSpineAction`：播放`collect-{原状态}`，队列加入`normal-0`，参数延迟1.5秒；领取后2秒内普通刷新不覆盖动作。实际衔接时机仍需结合骨骼时长验收，不能把队列参数直接当完整动画时长。
- `runResCollectAction`：击杀播放8～12个资源图标飞向收集点，用时1秒；这是表现，不是每次击杀实际到账。旧代码虽列5种图标，却只从前4种随机，后续还原不得自行“修正”。
- `MissionRewardInfoCtr:updateScrollView`：两页分别展示首次奖励、挂机产物种类；挂机页合并`reward_base`和`reward_unique`并按物品类型去重。它不是当前待领取实物清单，也不保证随机物品必得。

## 旧版领取与收益

服务端路径相对旧项目 `server/mxzg-server/mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/`。

- `module/battle/handler/BattleHandler.java:idleLineupAwardList/idleAwardReceive`：3004读取时钟，3005领取；3002是挑战结算，不可混用。领取时长为当前秒数减持久起点，再限制到最大时长；基础收益次数为时长/60向下取整，至少1次才可领取。成功路径把起点置为当前时间，因此不足一分钟余数不结转。
- 客户端`BattlePanelLayer:onIdleReward`额外要求累计至少`idle_drop_frequency+5`，当前为65秒；服务端只要求至少60秒。此处明确为两层不同门槛，后续实现保留证据，不静默统一。
- `module/role/service/RoleVipService.java:getIdleMaxTime`：基础21600秒（6小时）加羁绊VIP配置的额外秒数；当前新版尚无该权威状态。`system.lua`同时确认初始60秒、掉落周期60秒、掉落上限重置43200秒。
- `module/battle/service/RoleMissionService.java:idleBattleReward`：按最大已通关关卡计算，0时回退1。基础收益之外还有随机道具、活动掉落、神职收益、VIP基础资源加成、世界等级经验增益、特权礼包加成；不能把基础每分钟速率描述成全部到账预估。
- `dropReward`按累计收益时长跨43200秒分段，清理掉落计数；不是自然日零点重置。随机判定次数使用四舍五入，与基础资源向下取整不同。
- 客户端`goCoffeeCtr`在冒险次数达到章节`tavern_point_max`时弹二次确认；该权威状态尚未接入。旧客户端发送前先清空本地累计值，回包处理仅读取`reward_time`；新版不得照搬为资产事实，应等服务端事务与统一状态推送。

## 当前新版与后续切分

`MainChapterIdleService.snapshot`只初始化/读取持久时钟并投影基础速率；未通关不启动。`IdleRules.roll`保留基础随机规则，但不代表领取入口开放。`MainChapterView`点击宝箱只提示未恢复。本批不修改上述行为。

四档待机、计时气泡、产物说明、累计进度条和阵亡资源飞行现已分批恢复，边界与关闭复验见下方证据；它们仅读服务器快照，不触发领取或伪造资产。后续执行顺序以development-progress.md与restructuring-plan.md为准。

领取另列授权阶段：先逐项核对随机保底与加成配置，再确定权威依赖接入范围；设计同事务持久回执、随机结果、起点、计数和资产版本，验证重复请求、断线恢复、并发、跨重置周期及失败回滚。缺失VIP/活动等不能默认为已完整等价。清心、护盾和大型胜利翅膀裁边待审保持不变。

本节最初核对仅涉及源码/配置与文档；后续实现和验证见下方分节，不能将这里的历史范围当作最新进度。

## 后续产物说明恢复（2026-11-09）

负责人确认展示全部850关，只读展示不改变前三关挑战范围。`ChapterRewardInfoUtils`按旧表顺序投影首通产物、基础与随机产物去重列表；当前全部850关共41种物品，均有物品配置。

入口沿用旧`BattlePanelLayer.ccb`的`btn_icon → onRewardInfo`，对应新版面板中央章节图标。`ChapterRewardInfoView`与`ChapterRewardInfoCell`使用独立静态Prefab，纵向关卡/横向产物均用SuperScroll。关卡行全部保留，只有可视行创建物品格；离开可视区域清空图标，避免同时加载数千物品。详情复用只读BagInfoView，隐藏获取跳转，明确不是当前持有数量。

首轮浏览器发现详情资源误从resources包读取，现已改为资源目录中的prefabs包引用；最终画面与交互验收另记，不将首轮失败计作通过。资产协议、奖励事务和领取入口未改变。

## 累计进度与阵亡资源飞行（2026-11-09）

累计条沿旧`getBattleHarvestProgress`取整百分比，由服务器时钟快照外推，横向从左到右填充。Prefab保存`IdleProgress`位置和填充方式，与四档宝箱共用计算，不新增收益状态。

`BattleIdleLayer`监听`HeroDead`并转发`HANG_HERO_DEAD`，旧事件没有阵营过滤；新版在挂机回放的真实阵亡动作开始时触发，正式挑战不触发。沿`runResCollectAction`随机8～12张图标，仅取900001/900002/900003/900101，起始偏移每轴-49～50，缩放0.605～0.8，1秒飞向旧收集点(80,270)，同时用0.905～1秒缩到0.6。新面板坐标为(-240,85.5)，世界坐标转换归飞行显示类。图标不含数量，不读取或修改库存。

真实遇敌已在三种手机竖屏检查；飞行自然结束、重复清理、关页与重开均有证据。首次关闭触发旧归还链的引擎排序错误：`stop`归还英雄到行军槽，随后同帧销毁槽，Cocos延迟排序访问已释放子列表。现先标记行军显示释放，再停止遇敌，借出英雄随临时战场销毁；正常结束仍归还。增加延迟销毁回归并在Creator刷新后重验，未修改引擎。详见[本批证据](validation/idle-resources-20261109.json)。领取与其他资产入口保持关闭。

## 随机保底与完整加成专项核对（2026-11-09）

已继续追踪分类保底、累计12小时重置、活动奖励、神职、羁绊VIP、世界等级和特权礼包。详见[随机保底与加成依赖](idle-reward-rules.md)。完整850关引用闭包检查通过；旧服务接线、活动概率字段及礼包到期秒判断仍有明确缺口，不将已保留的IdleRules或历史IdleTest当作完整新主线领取验收。本批没有开放领取或修改游戏逻辑。
