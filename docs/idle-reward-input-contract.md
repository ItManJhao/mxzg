# 挂机完整加成输入与领取契约

初稿：2026-11-09；更新：2026-11-13。本文维护已实现的服务端只读输入与纯计算契约；持久累计、幂等回执、协议和事务的待实施设计统一见[新领取方案](main-chapter-idle-settlement.md)。VIP、世界等级、神职、礼包及三类活动已有读取或适用判断入口，IdleRewardUtils已串联为完整纯计算候选；前批补活动控制初始化、044可信发布及周期推进，默认关闭，缺可信配置或输入明确拒绝。本批修正通用同步/钱包前置，未接入生产领取、修改`.proto`或开放宝箱。旧规则依据见[奖励审计](idle-reward-rules.md)。

## 已有事实与缺口

- `protocol/game.proto:MainChapterIdleState`提供服务器时钟、起点、最大时长、周期、奖励关卡、基础速率和挂机选人；`rates`不是完整收益。`IdleEncounter`只提供演出战报，不是发奖凭证。
- `game_main_chapter_idle`仍只有角色键和起点；新主线没有累计随机窗口、保底计数和领取回执。旧`game_idle/game_idle_receipt`不得接回新页面。
- 持久`game_role.goddess_vip`已有容量和挂机输入读取；主线最大时长使用同角色VIP。羁绊养成写入未恢复，不新增第二份VIP字段，不从客户端倍速反推等级。
- V19保存合法已解锁神职初值；V20保存原始礼包持有记录；V21增加各区服开服秒与三活动控制只读结构。V22再保存控制调度点及044发布版本/指纹/配置；这些均不是领取回执或随机计数表，不表示养成、购买、兑换或资产清理已恢复。
- 世界等级按负责人确认的独立区服统计，合服范围另议。三张活动XLSX概率6936/0/6936已核实并定向投影，0与缺失分开；礼包按负责人确认沿旧奖励期限判断。

## 输入归属及冻结边界

以下是内部输入契约，实际已实现类型见`IdleRewardInputService.Input`；领取上下文和随机累计事务仍是后续设计，不是新增协议字段。客户端不提交加成、奖励数量或权威时钟。

| 输入 | 来源与所有者 | 当前冻结与校验 |
|---|---|---|
| 领取上下文 | 未来认证角色、区服、请求标识及内容指纹 | 未来按角色/请求标识持久幂等；同标识异内容拒绝 |
| 计算时刻 | 服务端入口捕获一次Unix秒 | 本次Input与礼包/活动判断共用，不从客户端取值 |
| 主线与累计状态 | 当前主线所有者及后续新挂机累计记录 | 角色锁内读取；实际挑战仍限前三关，不能用说明页选中关卡；随机计数/操作版本尚未接入 |
| 基础配置 | 当前IdleRules投影 | 保留周期、基础资源、分类随机和保底；读取输入时不抽样 |
| 羁绊VIP | game_role.goddess_vip及goddessvip | 同次读取决定基础加成与最大秒数；正VIP缺配置拒绝 |
| 神职 | game_role.clergy_level及clergyprivilege | 0与未知等级分开；6/10累计条目独立返回，不能从900007库存反推等级 |
| 世界等级 | WorldLevelService的本区已提交快照及worldlevelgainexp | 未达等级门槛可明确不适用；达到门槛必须有可信快照。保留等级/采样及生成信息，不把进程代次当持久revision |
| 礼包 | PrivilegeGiftService的game_privilege_gift原始持有记录 | 保留字符串记录ID、重复配置、active及期限；endTime=0永久，否则now<=endTime有效，active不参与奖励过滤；读取不清理 |
| 三活动控制 | IdleActivityService的game_idle_activity_control和game_server.opened_at_seconds | 单次SELECT冻结16/34/44完整控制、期次及revision；缺区服、缺行、空表或非法字段均拒绝，不补“未发布” |
| 活动掉落规则 | 独立backend资源idle-activities.json | 保留等级门槛、轮次、原奖励、固定周期和明确概率；构造校验，不在输入查询中抽样 |
| 随机源 | 未来新计算由服务器提供，纯规则可注入 | 不来自客户端；未来回执重放不重新抽样 |

VIP最大时长已接入主线只读快照：0级21600秒、2级25200秒、13级64800秒。`IdleRules.roll`的原入口保留基础上限，重载接受同次权威VIP规则的最大秒数，已有18小时跨两次累计重置回归。最大秒数不是客户端参数，也不表示VIP养成或领取已开放。

## 当前只读调用链

`IdleRewardInputService.current(roleId,nowSeconds)`在角色锁事务中读取角色上下文、一次世界快照、一次礼包持有快照和一次活动控制快照。Input冻结服务器秒、gifts、baseBonuses、clergyBonuses与ActivityInput；rulesVersion保留组合权益规则内容版本，新增idleRulesVersion单独保存普通挂机rules.data().version。IdleRewardUtils拒绝普通规则混版；查询不抽随机、不修改资产/计数/礼包或活动状态。

- `IdleRewardRules`保存system/goddessvip/worldlevelgainexp/clergyprivilege不可变规则。VIP0不追加；世界差按idx升序首个闭区间匹配，无区间明确不追加；神职合法0级与未知键分开。
- `WorldLevelService`在独立已提交只读事务中按本区前50名求平均，空服1，首次及后台每5分钟刷新已使用区服。成功提交后发布快照，失败使该区失效并保留重试入口。未来回执须冻结实际输入，不只保存generation。
- `PrivilegeGiftService.held`只读全部原始持有记录；可信表零行才代表无持有，缺表/读取失败拒绝。`PrivilegeGiftRules`筛三个IDLE效果；先统一期限后适用配置，有效缺配置拒绝，过期未知配置可跳过。记录/条目各自取整，不混入BUY_GOLD，不按show_level排除已持有权益。
- `renewedEndTime`只计算有限期限覆盖与0天保留旧期限，不叠剩余、不套用期限物品减1秒。购买资格、计数、订单与写事务尚未恢复。
- 主线只读显示只调用maximumSeconds；不会为计时读取整套活动控制，基础rates和既有挂机演出保持独立。

## 活动只读输入与控制维护

V21将`game_server.opened_at_seconds`保留为NULL，并新增按server_id/activity_id唯一的`game_idle_activity_control`。**不seed控制行、不用迁移执行时间充当开服时间。** 每个区服必须有16、34、44三行明确状态；零行或缺一行代表未初始化，整次完整输入拒绝。显式publication_state=0才表示已确认未发布；它不等于旧活动status结算标记。

`IdleActivityService.current`一次联合查询读取区服开服时刻及完整三控制。已发布期必须包含start/end/clear秒、turns、turns_time、limit_days及持久revision；016/034轮次从1开始，044旧运营发布可保留0且掉落不使用该字段。未发布保留明确状态，不生成可计算期。`ActivityInput`冻结openedAt、确实使用的openDays及按016→034→044排列的entries，每项保留原Control、期次/revision、适用原因与适用时Drop。

适用判断依次排除未发布、记录期外、角色等级不足，再按负责人确认的Asia/Shanghai旧零点ceil算法计算一次开服日数，判断持久limit_days，最后精确选掉落行。记录期两端均含，clearTime不延长掉落记录期。016要求角色等级>1，034要求>10；044不增加角色等级门槛。适用时缺开服时刻或掉落轮次则整体拒绝，不回退零收益。

最低开服天数来自旧`PromotionControl.limitDays/limit_days`，由活动权威控制维护；不是`promotioncontrol.xlsx.open_server_day`，后者只在旧周期初始化时生成首期startTime。旧`BasePromotionService.getPromotionInfo/tryResetPromotion`会创建并按全局turns/turnsTime重置角色记录；新版当前只读投影控制轮次，不创建角色活动对象。当前初始化、发布和周期推进已归IdleActivityMaintenanceService；角色活动进度重置及清理副作用仍未接入，不由只读层承担。

`IdleActivityRules`保存纯掉落规则：016/034同轮次取最大idx行，044取最小idx行；固定次数和随机命中次数先相加，再倍乘原奖励列表。随机沿[0,1000000)抽样并用<=判断，显式0仍抽样且抽到0命中；实际随机周期60秒，源表“每5秒”仅保留差异记录。读取输入只查门槛和行，不调用drop。

`tools/export_idle_rules.py`默认检查和`--write`同时处理原idle-rules.json与独立idle-activities.json；活动定向读真实sheet及未标记gain_chance，不全局放开未标记列，不恢复客户端活动表。活动输入批次共享47表/Maven打包32表不因该独立投影增加；后续精灵显示单独新增一份实际使用的派生表，当前数量见配置维护文档。

前批139项相关Java回归、23项Python配置回归见[活动输入证据](validation/idle-activity-review-20261113.json)，其中新增9项活动导出边界。第一次Java运行遇到H2的IN约束会话异常，保留约束语义改为CASE/BETWEEN；最终复核补齐044轮次0后整组139项重跑通过，不把首次失败记为通过。前批[礼包](validation/idle-gift-review-20261113.json)、[神职](validation/idle-clergy-review-20261113.json)及[世界/VIP](validation/idle-authority-review-20261113.json)保留各自API与范围。

## 已实现：可信控制维护与044配置保存

`IdleActivityMaintenanceService.initialize/configure/publish044/maintain`是实际事务入口：先锁区服行，再按16/34/44顺序维护同一持久控制。initialize只为缺失控制建立016/034首期及044明确未发布状态；同opening重试不重置旧期，不同已保存opening拒绝。真实开服秒必须由可信配置提供，不以迁移或启动时刻补齐。

首期从上海开服零点用long秒生成。当前016配置为首日开启、7天记录＋2天清理、0天间隔、cycle_type=0；034为第9999天开启、7天记录＋0清理/间隔、cycle_type=0，不能改成开服即开。034最大轮次按原promotionpve来源为1，不改成读取掉落表推断。周期规则支持0末轮停止、1复用末轮、2回到第1轮；严格now>next，每tick每类最多推进一轮，不把停机期间漏过的周期一次跑完。非0星期限制尚待核实，初始化遇到此配置明确拒绝。

V22持久保存可空next_start_seconds，不从当前配置重新推断既有期次。044发布时next=start，严格now>start后令turnsTime=start并把next置NULL；不使用INT_MAX哨兵，不把控制标记消费写成兑换/回收或资产清理已完成。

负责人已确认044发布同时保存并校验非空兑换配置。PublicationUtils保留旧idx/item/cost/limit/mark_icon/show_mark六字段，item/cost仍为规范JSON文本；内部ImmutableThing保留item_type/item_num和可省略、规范为0的chance。拒绝缺值、非法整数、未知字段、重复idx或空item，cost允许明确空列表；不查物品/玩家、不抽chance、不开放兑换。

publication_version是单调可信发布版本，区别于control.revision及turnsTime；规范内容指纹包含期限、limitDays和兑换配置，不含发布版本。同版同内容幂等，同版不同内容拒绝；新版相同内容不重新武装next开始标记。旧活动在[start,clear]内不允许把start后移，同start修改不作为新期。

044发布配置筛选沿旧默认开服日范围1..99999：发布start与opening分别取上海零点，实际秒差除86400按Java向0截断后取绝对值加1。它不是挂机资格的ceil日数，保留历史夏令时实际秒差，不因start早于opening就拒绝；计算超过99999时全配置被排除，发布拒绝，不能保存空配置冒充已发布。

`IdleActivityMaintenance`已接入ApplicationRunner和定时维护；默认false，启用时先校验全部可信外部配置，再逐服事务应用，只维护明确列出的servers。日期须带明确时区，缺日期/重复区服/坏发布形状先拒绝；同次tick统一取服务器秒，单服失败回滚但其他服继续。activity44配置省略表示不发布也不撤回已有发布，不把玩家WS消息或HTTP接口当作运营维护入口。

维护后的持久Snapshot仍经Input冻结后交纯候选，维护不改角色资产、挂机起点或领取计数。活动维护批221项相关Java及27项配置/路径/导出回归见[当批证据](validation/idle-activity-maintenance-review-20261113.json)。更早163项纯计算及24项配置证据保留各自范围，不代替新领取验证。该控制维护批共享47表/Maven32表不变，周期规则只进入服务端独立投影，维护状态保存在唯一控制表。

## 缺失与无加成必须分开

| 内部结果 | 当前示例 | 处理边界 |
|---|---|---|
| 可用 | 合法VIP0、神职等级、完整礼包表、完整活动控制及适用行 | 提供冻结输入；0必须是经验证的真实值 |
| 已确认不适用 | 明确未发布、记录期外、等级/开服天数不足、世界门槛未达、可信礼包表无持有 | 贡献0并保留原因；不用读取不适用活动的掉落行 |
| 无法确定 | 活动空表/缺行、适用时缺开服秒/轮次配置、缺表/读取失败、非法规则或世界快照不可用 | 当前整次完整输入拒绝；未来事务也不得消耗起点、提交部分奖励或回执 |

活动维护默认关闭且只操作可信配置列明的区服；未显式初始化的服仍不能把“没有活动控制行”变成无活动。只读主页不调用完整输入，因此仍可展示基础速率和演出。测试夹具写入的明确未发布/已发布记录不是生产初始化证明。

## 计算结果与后续事务

神职输入保留旧列表粒度：基础各项独立；普通随机在同一累计窗口先按物品合并，跨43200秒窗口仍分开；016/034/044分别保留整份倍乘后的奖励列表。之后拼接交神职逐分项ceil，不跨来源/跨窗口提前合并，也不把单次活动的每次掉落另拆为向上取整项。其他加成只以原基础资源为底数，各条独立截断，不连乘。

`IdleRewardUtils.calculate`已作为静态纯入口串联同一服务器随机源：先活动016→034→044，再普通随机，最后神职。抽样顺序与神职列表顺序分别保存；交给神职的原始列表依次是基础、普通分窗、三活动。活动使用Input已冻结的Drop静态计算入口，不查询current或重新选行；普通结果只使用baseRewards/dropRewards，不把已合并的roll.rewards重复加进总量。

Result冻结Input、关卡/本次秒数、计算前累计秒与counter副本、ordinary、按016/034/044排列的三份活动结果，以及outcome中的独立加成分项和最终总量。它不读数据库/时钟、不提交资产、没有生产领取调用；候选也不证明快照仍是最新，未来事务须校验持久版本和幂等。

首个抽样前统一校验完整三控制顺序、状态/期次/Drop的一致性、所有基础加成/神职条目、previous计数、时段及普通规则版本；还用冻结开服原值与同次秒核对日数，并拒绝明显矛盾的不适用原因。016/034具体等级资格仍归权威输入层，纯入口不认证或重查权益。可提前判定的非法输入不消费随机；晚期倍乘或合并溢出拒绝整份候选，previous保持不变，已消费的随机源不假装回滚。

前批纯装配纠正了旧随机调用差异：普通lucky的0/百万概率短路不抽；权重沿旧Hutool的nextDouble乘总权重，单行也抽；数量上下界相同仍走nextInt(min,max+1)。活动0/百万及神职0/满概率仍按各自旧循环抽样，零秒不能整链提前返回而跳过已解锁神职的抽样。早期批次只证明当时边界或结果，不能称其随机消费一直等价。

前批纯装配的163项Java与24项配置回归见[当批证据](validation/idle-calculation-review-20261113.json)，不替代后续控制维护或新领取验证。历史139/138范围及记录保持，均没有发布包或领取验收；该纯装配批共享47表/Maven32表保持。

领取授权且前置齐全后，由新事务在角色锁内先查回执，再读取一次Input并调用本纯入口。实际状态字段、回执存储、WS消息、恢复和原子提交步骤只维护在[新领取方案](main-chapter-idle-settlement.md)，不在本页重复一份接口定义。

负责人已确认未来首次挑战前起算、客户端65秒/服务端60秒；该计时与领取代码未改。2000002月兔精灵·蓝/type8的独立生成/持久/统一快照及背包只读展示已按后续授权接入，见[精灵批证据](validation/spirit-instance-review-20261113.json)，普通库存/GM拒绝假堆叠。共享实际发奖和新领取回执尚未接线；V19～V23均不替代新累计/回执表，不能凭已有纯候选或实例服务开放完整领取。控制维护未给日常服填真实日期或自动启用；购买/续购、羁绊/神职成长也有未恢复写链。宝箱领取、快速战斗、升级、穿脱仍关闭，清心/护盾待审保持。
