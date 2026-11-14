# 挂机随机保底与完整加成依赖

初审：2026-11-09；输入复核：2026-11-13。本文记录旧挂机随机/加成依据及新版接入边界。11-13已核实并补齐VIP/世界/神职/礼包/三活动只读输入、完整纯装配及活动控制维护，维护默认关闭，空表/缺行明确拒绝。本批继续核对领取时钟、累计和真实发奖，形成[新领取方案](main-chapter-idle-settlement.md)，没有接入生产领取、协议或资产事务，入口继续关闭。历史测试数量只对应下文注明的实现批次，不是本批文档检查结果。

旧路径以 `G:/work/FsGame/Demo/mj/program/server/` 为根。下文 `game` 指 `mxzg-server/mxzg-gameserver/src/main/java/com/ayjs/mxzg/gameserver/`，`config` 指 `mxzg-server/mxzg-config/src/main/java/com/ayjs/mxzg/config/`。配置数值来自新版已导入的同源表，不能当作正式服当前活动配置。

## 计算链与时钟

1. `game/module/battle/handler/BattleHandler.java:324` 的3005入口取当前秒数减持久起点，限制到 `21600 + 羁绊VIP.extra_idle_time`；至少一个完整60秒才继续。客户端65秒门槛仍见[宝箱核对](idle-chest-audit.md)。
2. 活跃代码调用 `RoleMissionService.idleBattleReward`，不是该处理器中已注释的旧计算块。奖励按已通关最大关卡，0回退1；在领取时读取关卡及加成状态，没有按挂机期间每次升级、活动开启或到期分段追溯。
3. 基础资源乘 `floor(领取秒数/60)`。随机道具独立按累计窗口切片，每片 `round(片段秒数/60)`；累计43200秒清空掉落数量和未中计数，恰好到界也清空。超出本次最大时长的离线时间不参与累计，尾数不结转到下次领取起点。
4. 旧入口先更新起点，再计算与发奖；这是旧实现顺序，不能当作新版事务安全证明。新入口将来须把随机结果、全部计数、起点、资产和回执放入同一事务，提交后统一状态推送，重放不再抽奖。

例如89秒基础1次、随机1次；90秒基础1次、随机2次。累计43170秒再领60秒，会切成30+30秒，各四舍五入为1次，中间清计数；不能先把60秒合为一次随机后再重置。累计43140秒再领60秒，旧窗口处理一次后清零，最终累计0。

## 随机、保底和上限

依据 `RoleMissionService.java:155–259`、`config/excel/cache/DropTriggerSysCache.java`、`DropGroupSysCache.java`、`mxzg-common/.../util/RandomUtil.java:lucky`。

- 关卡 `drop_group` 找触发器列表。每轮遍历每类触发器；不是各类互斥抽一次。`trigger_times` 未被这条服务端路径读取，当前102条均为1，不擅自扩充它的含义。
- 持久 `RoleMission.dropData` 以 `item_group_type` 为键，值为累计数量 `num` 与连续未中 `missTimes`；不以关卡、掉落组或物品ID为键。切关不清保底；相同类别跨组继续使用原计数，直到累计窗口重置。
- 先判断 `num >= drop_item_max`，达到则跳过，未中计数也不增。未达上限时，若 `missTimes >= guarantee-1` 直接成功，否则用 `[0,1000000)` 随机数严格小于 `trigger_chance` 判断。
- 成功后按 `drop_trigger_id` 对应表的相对权重抽一项，数量为 `[item_min,item_max]` 闭区间；数量加入累计，未中归0。失败才将未中加1。保底分支不再抽命中概率。
- 上限是抽取前门槛，成功数量不裁剪到剩余额度。例如剩1但本次抽11，旧代码会记入11，下一轮才停止。计数约束的是原始随机奖励；神职额外奖励不回写这份掉落计数。
- `getRandomReward` 是另一条无保底/上限的纯随机方法，3005当前主链调用的是 `dropReward → getRewardUnique`，不能混用。

当前前三关及旧20关投影均使用1001组：

| 类别 | 百万分概率 | 第几次连续尝试必出 | 累计原始数量上限 | 单次数量 |
|---|---:|---:|---:|---:|
| 钻石 | 152800 | 7 | 120 | 1 |
| 进阶石 | 69400 | 24 | 70 | 1 |
| 符文 | 2800 | 360 | 3 | 1 |
| 碎片 | 20800 | 72 | 30 | 1 |
| 装备 | 104200 | 12 | 80 | 四种装备等权，各1 |
| 酒馆点数 | 1000000 | 配置100，概率必出 | 1000000 | 11 |

## 加成顺序与权威依赖

`RoleMissionService.java:268–329` 先构造基础资源、随机道具、活动016/034/044奖励之和，计算神职额外奖励并暂存；随后依次加VIP、世界等级、三类礼包加成，最后追加神职结果并合并物品。

| 来源 | 计算底数和取整 | 必需的服务端状态/配置 | 新版只读输入与剩余缺口 |
|---|---|---|---|
| 羁绊VIP | 仅基础角色经验/金币/英雄经验；配置百分比先×100转万分比，每项乘底数后转long，正数向下取整；不是乘前一加成结果 | `role.goddessVip`、`goddessvip`；同一等级还决定最大挂机时长 | 持久VIP已用于主线最大时长及已恢复来源输入，完整领取仍未接入；不能以客户端默认档作为VIP事实 |
| 神职 | 基础＋随机＋三活动奖励；每个已解锁匹配特权分别判概率，再逐奖励项 `ceil(数量×value/10000)`，最后才合并 | `role.clergyLevel`、`clergyprivilege`、领取回执冻结随机结果 | 已保存并读取已解锁等级，返回累计挂机条目；完整领取与神职解锁/经验流程未开放 |
| 世界等级 | 仅基础角色经验；本人等级≥70且世界等级更高，差值匹配闭区间首条配置；万分比逐项截断 | 当前角色等级、权威世界等级、`worldlevelgainexp`、`system.world_gain_level` | 旧主线已调用WorldLevelManager；新版按独立区服实现已提交快照及基础加成输入，完整领取仍未接入 |
| 特权礼包 | 按 `IDLE_ROLE_EXP/IDLE_GOLD/IDLE_HERO_EXP` 过滤，仍以基础资源为底数，各礼包各项独立截断后相加 | 持久已购礼包、结束秒数、礼包配置、权威当前秒数 | V20持有/期限原始记录已只读接入；沿确认的旧奖励期限，active不参与收益过滤；购买/续购写维护未恢复 |
| 活动016/034 | 固定次数 `floor(秒数/gain_frequency)` 加 `floor(秒数/60)` 次独立概率命中的次数，再乘活动奖励 | 活动记录期、开服天数、角色等级严格大于open_level、角色活动轮次及轮次掉落配置 | V21控制及区服开服秒已只读接入，等级/期限/开服条件可判定；初始化、发布和轮次推进已由显式可信维护入口接入，默认不启用 |
| 活动044 | 同上，但这条入口只检查活动记录期/开服天数，不调用角色等级条件；取掉落表首行 | 活动记录期、开服天数、活动角色记录、掉落配置 | 同上，保留044无角色等级门槛；只读输入不创建角色活动记录 |

神职依据 `ClergyService.clergyEarnings` 和 `ImmutableThingUtil.multiplyThing(float)`；其他三类加成依据 `ThingService.addBonus`，不能把全部百分比先相加统一取整，也不能改为连乘。神职当前6级、10级各解锁一条必中的50%：10级同时应用两条，各自向上取整。单个输入分项数量为1时因此可能额外获得1+1件，不等同于先合为100%再取整。

2026-11-13补明神职的输入粒度：基础资源保留各项；随机掉落在同一累计窗口内先按物品合并，跨43200秒重置窗口仍保留为不同分项；016/034/044分别保留各自返回列表。随后按旧主线拼接这些列表并交给神职，不提前跨来源或跨窗口合并，也不能把同一窗口每次原始掉落都当成独立神职取整项。本轮IdleRules.Roll透出baseRewards/dropRewards用于纯计算衔接，既有rewards仍为基础与随机的合并结果；没有因此接入生产发奖。

配置核对结果：VIP0/1最大6小时，VIP2开始每级增加1小时，VIP13最大18小时；角色经验加成从VIP4的10%到VIP6及以上20%，英雄经验从VIP9的10%到VIP11及以上20%，金币从VIP11的10%到VIP13的20%。各项独立。世界等级差1～39每级增加5%，40～999为200%；超出配置区间返回无匹配，不能自行扩展封顶。礼包100300/100400/100500分别50%角色经验/英雄经验/金币，100610为角色及英雄经验各50%，100620为金币50%；这里只是配置，不意味着角色持有。

## 不能默认补齐的依据缺口

以下为2026-11-13复核后的状态，替代11-09的三项初步判断。

1. **世界等级旧调用已闭合，新版按区服统计。** `RoleMissionService.java:39,87`实际导入、注入的是`WorldLevelManager`，字段名虽为worldLevelService，不能据此误判为同名空Service。`:311–312`通过该Manager读取世界等级。`WorldLevelManager`首次读取立即计算，之后每5分钟刷新：从同进程RoleService/数据库可见的全部角色按等级降序取前`world_level_people=50`名，求平均并转int截断，空集合返回1；不按7天登录筛选，活跃人数是另一统计。旧部署数据库范围可能覆盖同进程多个子服，因此不能直接把“按serverId分组”当作已确认新版规则；11-13负责人确认新版各区服独立统计，合服范围另行确认；新版WorldLevelService已持有各区服已提交不可变快照；本轮完整输入读取一次，未来回执仍须冻结实际依据。
2. **活动概率源值已找到，保留旧边界与表头差异。** 三个实体均声明`gain_chance`。`config/gameconfig`现有XLSX包含下表值，只因该列第二行导出标记为空，客户端JSON未导出；不是服务端配置缺值。旧`mxzg-common/.../excel/ExcelExporter.java:27–29,63–79`按第三行字段名读取全部列，不检查第二行。恢复时应定向读取已核实的服务端列，不能全局放开所有未标记列。`RandomUtil.randomUpperLimit`对`[0,1000000)`随机数使用`<=range`：6936对应6937/1000000命中，显式0仍有1/1000000；普通掉落`lucky`严格小于，两者不得合并改写。源表头写“每5秒”，实际主线`RoleMissionService.java:287–289`均调用`randomQuickDrops`，依据`IdleConst.DROP_FREQUENCY`和`system.xlsx!C123/D123`的`idle_drop_frequency=60`计算随机次数；该表头差异保留，不能据表头改为5秒。当前已实现控制、开服秒与期次的只读读取和适用判断，V22及本批维护服务再补显式控制写链；未配置服不自动初始化。
3. **礼包奖励期限已由负责人确认。** 旧`getPrivilegeGifts`会在`now>=endTime`时清active，但`getPrivilegeBonus`只排除`now>endTime`且不读active。11-13确认新版奖励沿后者：`endTime=0`视为永久，否则`now<=endTime`仍参与收益；不以active过滤，不换用`isPrivilegeActive`或客户端剩余时间。一次领取计算冻结同一个服务端秒数；读取输入不照搬旧查询清active的副作用。V20已恢复原始持有记录只读输入，购买/续购/计数及权益写维护仍未恢复；口径确认与只读接入均不等于领取开放。

| 活动/源表 | 原始概率单元格 | gain_chance | 固定周期 | 备注 |
|---|---|---:|---:|---|
| 016 / promotiondragonmarkdrops.xlsx | E3字段，E4值；E2空 | 6936 | D4=1234秒 | 按持久轮次选行 |
| 034 / promotionpvedrops.xlsx | E3字段，E4值；E2空 | 0 | D4=3600秒 | 0是显式配置，不是缺失占位 |
| 044 / promotionfiredrops.xlsx | D3字段，D4值；D2空 | 6936 | C4=1234秒 | 旧cache按idx排序后取首行，即最小idx；不补016的角色等级条件 |

上述源值只代表仓库已有配置，不是对正式服当前活动配置的声明。已查明的旧调用和源值无需再列为“完全无依据”；当前只读状态和纯候选不等于日常服活动已运行；本批可信控制维护默认关闭，完整领取事务仍未恢复，不能直接开放领取。清心概率、护盾统计和大型胜利模型裁边待审不变。

## 新版差距与下一步

- `IdleRules.roll`已保留基础取整、分片随机、跨窗口清计数、分类保底、相对权重和闭区间数量；当前投影仅20关、6触发器、9掉落项。完整850关说明不等于850关奖励服务已恢复，真实挑战仍限前三关。
- `MainChapterIdleService.snapshot`只维护新主线持久起点和基础速率。它不调用roll、不发奖；本批已从当前持久VIP读取动态时长上限，基础速率不变。旧简化`IdleService/IdleTest`仍是历史领域链；其收据和测试不能证明新主线已有完整领取事务，也不得把旧game_idle接回新页面。
- 2026-11-09审计只做引用闭包、概率/权重/数量合法性及组内类别唯一性检查：850关、17组、102触发器、573掉落项无缺失引用；未新增测试代码或运行资产领取。检查证据及配置摘要见[审计记录](validation/idle-reward-audit-20261109.json)。
- 已完成下节所述基础随机纯规则边界回归，原审计要求为：跨关共享保底、恰好重置、窗口切片四舍五入、上限超出、概率0/满值、独立加成取整。各来源已分批接入只读状态及适用判断，完整计算装配及显式控制维护已接通，后续仍需完整领取持久化链；领取新协议、事务与入口仍待明确授权，不在只读说明中展示伪造的完整到账数。

## 纯规则边界回归（2026-11-09）

新增`backend/src/test/java/com/funsgamex/mxzg/IdleRulesBoundaryTest.java`，直接调用当前IdleRules：真实配置89/90秒取整、跨关跨组共享保底、上限优先于保底、单次数量越过上限、恰好12小时重置、30+30秒独立取整、封顶后跨窗恢复、概率0/满值/阈值、权重分界及数量闭区间、非法时段不修改输入。

合成配置经测试解析器注入；不新增生产配置、不改生产规则、不启动Spring或数据库、不调用历史领取链。普通概率0/满值只验证奖励结果，不宣称与旧工具消耗完全相同的随机序列。该基础随机批次未覆盖加成；当时后续纯加成尚未接输入；11-13已分批恢复只读来源，不将旧批次未接入状态作为当前结论。三项依据的11-13复核结果见上文；该历史测试记录不代替本轮输入分项与未来权威接入验证。

## 完整加成输入契约（2026-11-09）

已按当时协议、V10/V17表结构及读取链整理[输入契约](idle-reward-input-contract.md)。其中明确区分权威零值、不适用与依赖不可用，保留神职计算前的原始奖励分项，并要求重放先查回执、不重新读取变化后的权益。更正：VIP持久字段已经存在，缺口是权威权益维护与挂机输入链，不是缺少数据库列。当批未新增协议、表结构或空服务；后续恢复范围见文末。

## 已核实加成纯计算（2026-11-09）

IdleBonusUtils接收已确认适用的条目，VIP百分比转万分比；VIP/世界/礼包只以原基础资源为底数，各条double计算后long截断。神职按条目独立抽一次万分比概率，命中后对基础、随机、活动的原始分项分别沿旧float乘法再ceil；最后合并。输出保留追加明细与不可变总量。缺权益状态不能以空列表冒充无加成。11-09当批尚未接输入；11-13后续来源已恢复只读装配，当前范围见文末。

重复基础ID、负金额/系数、非法概率/随机返回值拒绝；数量计算和合并溢出拒绝，不返回部分结果。保留旧float精度边界，未擅自改成精确十进制。新增10项公式回归，连同现有10项基础随机测试共20项通过。11-09当批生产引用只有工具自身，未改数据库/协议；后续只读来源恢复不改变当前无生产领取调用的边界。见[测试证据](validation/idle-bonus-20261109.json)。

## 前批：VIP和世界两来源恢复（2026-11-13）

已恢复各区服世界等级快照和角色锁内VIP读取，规则与适用判断由IdleRewardRules/IdleRewardInputService承担；主线只读时长使用VIP动态上限，基础随机可按权威上限跨多个重置窗口。63项相关Java检查通过，见[本批证据](validation/idle-authority-review-20261113.json)。当时BaseInput仅代表两种来源，礼包/活动及完整领取尚缺；后续已由current()/Input承接并加入神职、礼包及活动只读输入。旧证据保留当时范围，当前实现见文末，不以空条目补成无权益。

## 神职只读输入恢复（2026-11-13）

旧Role初值0及clergyprivilege的0行证明合法未解锁状态。新版从未实现46001等级写入，V19只为独立新版角色补同一持久初值，不把900007库存视为神职经验或已解锁等级。IdleRewardInputService.current单次锁内查询clergy_level，IdleRewardRules按合法键0～11筛累计IDLE_AWARD；输入查询不抽样，6/10两条继续交给已有纯计算独立处理。78项Java及14项配置回归通过，迁移保留原资产/起点/库存，见[本批证据](validation/idle-clergy-review-20261113.json)。该批当时未接礼包/活动；后续已恢复它们的只读输入。完整领取与神职升级仍未接通。

## 礼包只读持有输入（2026-11-13）

V20新增独立新版空持有表，保留独立字符串ID及同配置多记录，不转换库存/充值卡。输入按冻结服务器时刻先期限后配置，active/count不参与收益过滤；各记录各条目分别截断，不混入BUY_GOLD，不按show_level排除已持有收益。续购期限纯函数保留有限期覆盖和0天保留旧期限分支；购买计数/资格/商品及写事务仍未恢复。104项Java与14项配置回归通过，见[本批证据](validation/idle-gift-review-20261113.json)。该批当时尚未接活动输入或控制维护；后续已分批恢复只读链及显式可信控制维护，新主线完整领取仍未恢复。


## 前批：三活动规则与只读控制输入（2026-11-13）

服务端单独生成idle-activities.json，不把原活动表或未标记列导回客户端。源等级门槛取promotioncontrol.xlsx!C5=1（id16）及C23=10（id34），沿旧canRecordPromotionData的严格大于；044不读角色等级。每份掉落表定位真实主sheet后定向读取gain_chance：三表实际sheet均叫promotiondragonmarkdrops，不能直接用文件名取sheet。export_idle_rules.py默认检查/--write处理基础与活动两份独立版本，原idle-rules.json内容保持不变。

3005主链的RoleMissionService.java:287–289实际调用三活动randomQuickDrops。固定次数为floor(idleTime/gain_frequency)，随机次数为floor(idleTime/60)，两者先相加再倍乘原奖励列表；不保留另一randomIdleDrops路径的lastDropTime尾数。原列表内部重复ID也保留，神职前不跨活动合并。016/034按控制轮次选行：旧cache按idx升序填turnsMap，同turns后面的最大idx覆盖；044取最小idx行。纯IdleActivityRules保留此行为与<=百万边界，显式0仍按规定次数抽样。

活动控制与静态掉落配置职责分开：旧PromotionControlService.java:110–139判断记录期闭区间、开服天数及角色门槛；最低开服天数来自持久PromotionControl.limitDays，不是静态open_server_day。旧web/api/ActivityApi.java:89–93会写期限和limit_days；静态open_server_day只在旧周期初始化中生成首期startTime，不可直接当作本次最低日数。旧角色getPromotionInfo会对照全局turns/turnsTime创建或重置记录，新版只读层不复制这些副作用。

V21仅增加game_server.opened_at_seconds（缺失保持NULL）及按区服区分的game_idle_activity_control空表，不seed控制、不推定开服时刻。IdleActivityService一次SELECT冻结16/34/44三项明确状态；缺区服、空表、缺行、非法期次/版本均整体拒绝。明确未发布与控制未初始化分别处理；未发布状态并非旧status结算标记。

IdleRewardInputService.current保留ActivityInput中的openedAt、确实使用的openDays和每项原Control/期次/revision/适用状态/适用时Drop。先排除未发布、记录期外、等级不足，再以负责人确认的Asia/Shanghai零点ceil算法计算一次开服日数，判断持久limit_days，最后选掉落行。记录期含起止秒，clearTime不延长掉落；适用时缺开服秒或轮次配置则拒绝。查询不调用drop、不抽随机、不创建角色活动记录、不更新权益或资产。

044旧运营发布不写turns，后续计时更新也只写turnsTime，因此已发布控制可以保留轮次0；它按最小idx选行，不套用016/034的正轮次条件。V21及只读映射已保留此差异，补过服务和输入回归。

该批139项相关Java回归和23项Python配置回归通过，含新增9项活动导出边界，见[活动规则与输入证据](validation/idle-activity-review-20261113.json)。首次Java运行存在H2的IN约束会话异常，已在保留校验含义的前提下改为CASE/BETWEEN；最终补齐044轮次0后整组139项重跑通过。当前47张共享表及Maven实际32表保持，独立活动投影不增加客户端活动表。

当批尚未完成完整纯计算装配；后续已按下节串联。当时尚无活动控制维护；本批已按文末恢复显式控制入口。新领取协议、累计计数/回执/资产同事务和界面按钮仍未接入。测试夹具明确写入活动状态不证明生产已初始化，空表不得默认成没有活动。

## 前批：完整纯计算候选与随机调用修正（2026-11-13）

IdleRewardUtils.calculate接收冻结Input、关卡、时段、previous累计状态和同一个RandomGenerator，不读取当前权益/数据库/时钟、不发奖。活动按016→034→044先抽，普通随机随后，神职最后；神职输入列表仍按基础、普通分窗、三个活动排列。使用冻结Drop的静态入口，不再选当前行；ordinary.rewards不重复计入总量。

Result冻结Input/关卡/秒数、计算前累计秒和counter副本、ordinary、三份活动结果与outcome最终总量；不适用活动保留对应空列表位置。Input新增idleRulesVersion，必须匹配rules.data().version，组合rulesVersion仍保留。完整结构、所有bonus/clergy及previous计数在首个抽样前检查；晚期溢出不返回部分结果、不修改previous，也不承诺回滚已经消费的随机源。

该纯装配批次发现并修正此前普通随机调用与旧源码的差别：旧RandomUtil.lucky在概率0和百万时直接返回，不消费概率随机；普通权重由旧Hutool WeightRandom.next调用nextDouble乘累计总权重，单行也抽，不能以整数抽权重代替；固定数量也继续消费nextInt(min,max+1)。活动0/百万和神职0/满概率仍抽样，零秒仅停止活动/普通掉落，不能跳过神职条目的概率调用。早期结果边界测试不证明随机消费顺序等价，原证据保持不改；这些差异从该批修正后生效。

旧mxzg-common/pom.xml声明Hutool5.8.4，DropGroupSysCache直接使用该权重类；抽样依据已核对[官方5.8.4实现](https://github.com/dromara/hutool/blob/5.8.4/hutool-core/src/main/java/cn/hutool/core/lang/WeightRandom.java#L140)。旧缓存按idx升序填充触发器/权重，生成器现已显式排序；反转源行仍生成同一内容和版本，不把当前偶然有序当作长期保证。

该批163项相关Java与24项配置/路径/导出回归通过，覆盖全链随机顺序、分来源/分窗ceil、矛盾输入预拒绝、溢出、不可变结果和真实持久输入下的资产不变，见[完整纯装配证据](validation/idle-calculation-review-20261113.json)。没有新的发布或领取验收；共享47表/Maven32表保持，两份现有投影字节未变。

该纯计算批次之后，控制维护已按下节接入；首期开服时间仍必须来自可信配置，不能默认为now。完整领取协议与同事务持久化另获授权后实施，当前宝箱及快速战斗入口继续关闭。


## 已实现批：活动控制显式初始化、发布与周期维护（2026-11-13）

IdleActivityControlRules从服务端独立投影读取旧周期依据；首期按上海开服零点、long秒运算。016当前open_server_day=1、time=7、clean_time=2、interval_time=0、cycle_type=0；034当前open_server_day=9999、time=7、clean_time=0、interval_time=0、cycle_type=0，最大轮次按promotionpve源为1。不能为了联调把034改成开服即开。0末轮停止、1末轮复用、2回第1轮分别保留；非0星期限制尚未核实，遇到时先拒绝。

周期维护保留严格now>next，每tick每类最多推进一期；清理窗口单独落在旧周期时间中，不等于资产清理完成。V22的next_start_seconds可空持久保存，不从新配置回算旧期。044发布后next=start，严格超过后只消费开始标记、令turnsTime=start、next=NULL；不使用INT_MAX，不递增044运营轮次，不执行角色活动reset/兑换/回收钩子。

IdleActivityMaintenanceService已有initialize/configure/publish044/maintain事务方法，均先锁game_server行再按固定三控制顺序维护。显式opening相同重试不重置期次，冲突拒绝；控制、开服秒与发布配置同事务写入，不改角色资产revision。缺日期、缺配置或失败回滚不得换成now、空状态或部分发布。

044按负责人确认同时保存旧非空兑换配置。PublicationUtils校验并规范化六字段idx/item/cost/limit/mark_icon/show_mark；item/cost仍保存JSON文本，ImmutableThing允许可选chance并规范缺省为0，保留条目次序与重复物品，不静默丢字段或抽样。发布配置不读取物品/玩家，不开放兑换或回收。

发布版本publication_version与control.revision、turnsTime分别持有职责；指纹覆盖期限、limitDays与规范配置，不含发布版本。同版同内容幂等、同版异内容拒绝；新版本同内容不重触发next。旧[start,clear]窗口内start不能后移，同start修改不视为新期。

旧044默认发布筛选日数为abs((上海start零点秒－上海opening零点秒)/86400向0截断)+1，默认允许1..99999；不使用挂机ceil算法、不以LocalDate日差替换历史夏令时秒差，不因start早于开服就拒绝。大于99999时全配置不适用，必须拒绝发布，不能把空兑换配置保存成成功。

IdleActivityMaintenance是实际ApplicationRunner＋定时入口，默认false；可信外部配置显式列出区服与带时区开服日期，日期不自动生成。启用时先全配置校验再逐服事务处理；每tick统一时刻，失败服回滚而其余服继续。未列区服不初始化，未提供activity44不发布也不撤回旧发布；没有新增玩家协议、HTTP管理接口或资产写入口。

该实现批221项相关Java及27项配置/路径/导出回归通过，见[控制维护与发布证据](validation/idle-activity-maintenance-review-20261113.json)，前批163/24证据保持原范围。维护Snapshot、只读Input与完整纯候选继续分层：计算不写资产，控制维护不发奖。完整领取协议、累计计数/回执/资产同事务仍待另行授权；兑换、回收、角色活动reset和日常服启用也未因此恢复。当前47张共享表/Maven32表保持，规则与输入见[输入契约](idle-reward-input-contract.md)。

## 方案初稿批源码复核：新领取设计（2026-11-13）

旧BattleHandler.idleAwardReceive按领取前VIP截时，服务端60秒起接受；成功把起点直接置当前秒，基础不足周期尾数和超限时间丢弃。RoleMissionService.dropReward却把截顶后的完整秒数加入43200秒窗口，按片段round并在满窗结算后清类别计数，不能把两类尾数混为一谈。

负责人确认未来恢复首次挑战前的now-60起点、胜利不重置，以及旧按钮65秒/服务端60秒双门槛。当前代码尚未修改；已有V17起点保留，不猜补未记录的首次挑战时间。旧客户端未通关不进入挂机，旧服务端却有第1关回退，新方案不借计时调整开放该旁路，差异显式保留。

奖励关卡按领取时最高通关关卡，待领挑战奖励不退回前关；权益资格以本次发奖前等级冻结。本次升级及附赠需要真实RoleExperienceService，不接旧简化IdleService的game_campaign经验写法。酒馆点按当前关卡chapterreward.tavern_point_max截取，已超上限不倒扣；旧TavernProcessor返回理论ThingSet不能当作实际到账。

当前普通＋三活动奖励ID并集15项；2000002/type8在普通group1001的表10013，前三关同样可掉落。旧RuneProcessor每件随机生成并保存独立实例，新版缺真实发放链，是领取开放前阻塞，不能写入普通堆叠或删奖励。协议、持久状态、回执、原子提交、恢复和待执行验证集中在[领取事务方案](main-chapter-idle-settlement.md)，方案初稿批仅源码及文档核查，不增加业务测试通过数。

前置修复批已核实2000002为月兔精灵·蓝、place=4，旧真实生成单能力、固定1技能但保留完整随机步骤。通用AssetSync事务隔离与钱包溢出修正的75项关联及最后16项定向复验见[前置证据](validation/idle-settlement-prerequisites-review-20261113.json)，只证明当时范围。

## 本批：最小精灵真实实例接入（2026-11-13）

负责人已授权最小范围，SpiritRules/SpiritInventoryService现已逐件真实生成2000002，V23保存独立UUID及能力/技能，Snapshot统一下发给唯一BagModel；没有普通堆叠、GM精灵写入口或玩家养成请求。生成按旧顺序调用四次有界整数随机：能力4、固定技能数10000、技能等级10000、技能ID权重141或233；等级1/2为8000/2000，不能以均匀技能或跳过固定数量抽样替代。

定向工具export_spirit_rules.py从原三表及item/heroskill/language生成服务端规则和客户端只读显示投影；当前98项技能全文及权重保留。共享配置现48表、类型规范17表，Maven共享打包仍32表；新规则是服务端独立资源，客户端只增加一份实际使用的spirit-display派生表，不恢复全量旧表或模块资源清单。

真实13类88项Java、32项合并配置专项、工程类型和五套相关前端检查通过，Java实际WS二进制与TS互通通过；详情精简后392组能力/技能正文检查及本机八实例、两只属性切换、空白/确认关闭返回已验。证据见[精灵批记录](validation/spirit-instance-review-20261113.json)，具体范围和旧显示差异见[最小精灵实现](main-chapter-idle-settlement.md#精灵最小范围已实现)。普通挂机/加成公式未改，共享实际发奖、新累计状态/回执/领取事务仍未接通，领取继续关闭。
