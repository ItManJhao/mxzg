# 英雄与主线阵容维护契约

更新于 2026-11-24。当前事实以本节、[英雄数据契约](hero-data-contract.md)、[通信契约](network-contract.md)和[开发进度](development-progress.md)为准。旧战斗规则、退役协议和当时的验收过程见文末历史记录。

## 当前公开战力

旧版 `HeroLineUpService` 的角色战力和 `ClanService` 成员行取同一份已保存主阵容；历史峰值另外保存。新版由 [HeroMainPowerService](../backend/src/main/java/com/funsgamex/mxzg/hero/HeroMainPowerService.java) 选取主阵队员，把配置中的队伍元素光环合入各自个人属性，再按原权重逐人评分求和。不计阵型格位、敌方元素克制和战斗临时效果，也不把未上阵英雄或未保存草稿算进去。

V62 给角色增加当前值投影。阵容与已有养成事务更新当前值和历史峰值，登录、恢复和资产变化快照复用已读取的英雄名册并下发当前值。公会名单读取同一投影，仅历史角色还没投影时用其真实已保存阵容只读计算。英雄详情继续展示个人战力，不含队伍光环。未恢复的公会科技、部分英雄养成和账号属性不计入，不能视为旧服全部来源已齐。

布阵窗口的草稿通过同一评分函数只读预览，不写角色公开战力；保存成功后顶栏仍按统一快照刷新。

## 当前代码与开放范围

| 功能 | 当前调用链 | 当前范围 |
|---|---|---|
| 名册与详情 | 登录、恢复、state.changed → AssetStateBinding → HeroRosterController → HeroRosterModel → HeroListView / HeroInfoView | 统一提供技能、普通四槽、已有属性和个人战力。详情按进入时的筛选顺序切换实际英雄与立绘 |
| 主线布阵 | FormationView 草稿 → FormationController → formation.save → FormationSaveModel；权威阵容仍随统一快照写 HeroRosterModel | 持久幂等保存及版本等待已接入；页面关闭不销毁模块，草稿不提前写 Model |
| 主线战斗 | MainChapterController → chapter.challenge/claim/replay/idle.encounter | 默认第 1～550 关挑战、幂等结算及挂机演出 |
| 普通升级 | HeroInfoView → HeroLevelController → hero.level.upgrade → 统一快照 | 按旧级数、金币/经验消耗及阶星上限普通升级，持久回执确认后更新界面 |
| 强化进阶 | HeroInfoView → HeroLevelController → hero.stage.advance → 统一快照 | 到达本阶等级及星级要求后消耗旧表对应金币和进阶石，提升阶段、更新等级上限和解锁技能 |
| 英雄锁定 | HeroInfoView 设置 → HeroRosterController → hero.lock.set → 统一快照 | 锁定或解锁真实英雄实例，重登保持。相同请求编号重放只返回原结果 |
| 普通装备 | HeroInfoView、HeroEquipmentPickerView 或 EquipmentInfoView → HeroEquipmentController → hero.equipment.change | 单件穿戴、换装、卸下、一键穿装及卸下。库存和槽位由同一版快照刷新 |
| 升星 | HeroGrowthPanel → HeroStarController → hero.star.upgrade | 按原配方选择当前名册素材，服务端精确校验星级与归属，在同一事务扣料、返还培养投入和升星 |
| 宝石 | HeroGrowthPanel → HeroJewelController → hero.jewel.change | 三槽按 8、8、9 星解锁，支持单镶、替换、单卸、一键镶卸及配方合成 |
| 神装 | HeroGrowthPanel → HeroGodEquipmentController → hero.god-equipment.change / draw | 四槽按实例穿、换、卸，支持按旧配置探宝取得独立实例 |
| 圣器 | HeroInfoView → HeroArtifactView → HeroArtifactController → hero.artifact.change | 戒指和项链独立激活、选装、卸下、升星与转换，属性和套装使用同一版本的持久佩戴 |
| 创造法阵 | 主城或升星页 → HeroCreationView → HeroStarController | 按旧配方筛选英雄模板和实际材料，复用同一升星事务及返还反馈 |
| 神装图鉴与商店 | HeroGodEquipmentCatalogView / HeroGodEquipmentShopView → HeroGodEquipmentController | 图鉴读登录配置，商店库存数随角色快照同步。购买复用通用购买确认窗和奖励窗 |

HeroInfoView 以实际英雄实例打开。培养页签与材料、宝石、神装共用一个虚拟列表选择窗，玩家选择只保留在当前页面。普通装备与常规培养沿用已有入口。符文穿戴、神装洗炼、评论、分享和手动扩容待恢复。

## 升星、宝石与神装

英雄详情的三个页签分别沿旧版 `HeroInfoUpStarLayer.ccb`、`HeroInfoUpStoneLayer.ccb`、`HeroInfoGodEquipLayer.ccb` 编排在同一预制体。升星显示星级、等级上限、技能成长与各行材料进度。宝石盘和右侧属性栏共用三槽快照，神装四槽依服务端部位顺序映射到左上、左下、右上、右下。素材、宝石、神装和探宝继续复用培养选择窗。

- 升星输入沿旧 `HeroHandler.heroUpStar` 和 `herotype.to_*_star`。服务器校验实际星级与角色归属，保护目标自身、锁定和已上阵英雄，同一材料实例仅使用一次。消耗时按旧 `herostar` 取固定费用和逐行替代道具。素材的普通培养费用、装备和宝石随同一事务返还，神装保留原独立实例及词条。最高星图鉴保留。
- 宝石按 `jeweltype` 和 `jewelsettype` 计算。三槽全满时，以最小宝石星级选套装档位并在英雄面板和主线使用。库存里同类型宝石堆叠，已镶实例随名册。策划表的可用合成止于 9 星，旧端 10 星展示残行依赖尚不存在的权威配置。攻击和生命宝石的原黑市来源、速度宝石的原周礼包来源待接入。
- 神装按角色 70 级、世界等级 1 和英雄 6 星判定穿戴。探宝用原每日免费单抽、足额券优先和 15 抽保底，实际价格、各次结果和词条由服务端决定。独立实例随统一快照交付，面板和战斗应用静态属性。同一英雄穿齐四个不同部位的同套神装时，按套装中最低星级选择套装技能等级，由服务端在开战时安装真实的旧配置监听。
- 创造法阵沿 `HeroCreatLayer` 和同一份升星配方显示四升五、五升六英雄。主城入口先选元素与目标，升星页进入时预选当前英雄模板。服务端只接受实际实例和素材，不单独维护一次合成发奖。旧版升星成功后可触发的限时礼包跳转待活动模块接入。
- 圣器沿 `reikiequipactive` 在八星显示两格，戒指和项链分别要求英雄 190、200 级。激活扣 1000 钻并佩戴对应初始圣器。升星读取目标配方，完美转换沿旧表核定的同部位目标和费用。素材英雄卸下其他装备和实例，但圣器升星不返还其普通培养费用。静态属性应用于英雄和战斗，完美圣器两类套装技能沿原出手后监听、20% 概率及两回合期限处理。
- 神装图鉴按一至五星展示各套红色神装和实际套装属性。固定商城显示原套装分组，消耗神装碎片。两种石头每日各限五件，上海零点重置。神装兑换品走原权重转换并生成包含真实词条的独立神装实例。

### 神装四件套战斗效果

| 套装 | 触发和战报 |
|---|---|
| 反噬者 | 穿戴者存活并受到符合触发条件的普攻或技能伤害时，对原攻击者造成穿戴者最大生命的 2.5%～2.9% 的伤害。额外伤害计入穿戴者的伤害统计。 |
| 强蓄力 | 每回合开始增加 3%～3.4% 的最终伤害。每层独立持续 5 回合，先添加新层、再清理到期层。战报记录状态变化，战场用单个图标显示当前层数。 |
| 致命伤 | 符合触发条件的暴击以 25%～29% 概率追加伤害，取目标最大生命的 15% 与施放者攻击的 120% 中较小值。负责人确认沿用旧服务端配置。 |
| 治疗盾 | 穿戴者施放有效治疗时，为原治疗目标生成基础治疗量的 20%～24% 的护盾，持续 2 回合。满血目标也可获盾，已有护盾时复用其原期限。 |

四套共用原战斗回放的伤害、状态与统计。致命伤和反噬是固定命中的额外伤害，不再触发反击链。护盾的报告伤害和血量扣减沿当前旧源码口径，见 [BRULE-002](battle-known-issues.md#当前未解决)。

旧日服致命伤说明写的是 8% 和 1200%，与同版服务端 buff 表不同。当前神装图鉴只显示技能名和等级，后续接入套装说明时使用已确认的 15% 和 120%。

## 英雄名册看板

日服 `HeroListLayer.lua` 使用 `spine/act` 的 `act` 循环与原气泡资源。HeroListView 复用同一骨骼、资源池和颜色标签转换，位置、字号和宽度保存在 Prefab。定位 Widget 置于独立锚点，骨骼加载时改变自身尺寸也可保持原位置。切换元素只刷新列表，看板随页面关闭清理。

对白来自原 `herobagjump.xlsx` 中的唯一当前配置，正文和按钮语言分别为 `3603` 和 `3602`。随登录后的 GameConfig 包加载。旧版点击指向特权面板的每日礼包页，当前入口使用统一飘字提示未开放。[正式服名册画面](images/official-hero-list-20261103.png)

## 普通装备穿脱

旧 `HeroInfoLayer:onClickEquip` 点击空槽直接打开 `HeroEquipCtr`，已穿槽先打开同一件装备的属性、套装、更换和卸下。候选只显示同部位、不同于当前模板的背包物品，按品质及模板编号降序。单件可人工换低评分装备，一键穿装填充空槽并且只替换评分严格更高的装备。一键卸下在没有可提升项且已穿装备时出现。

服务端 `HeroEquipmentService` 持有当前角色资产锁。穿戴从已同步的库存记录扣除一件，替换或卸下的装备退回背包。`game_equipment` 保留槽位记录和附魂等级，V37 增加穿戴状态及幂等回执；数据、资产版本、快照推送在同一事务协调。相同请求重放原结果，单件卸下核对槽位及当时的装备模板。面板、个人战力和主线输入共用已恢复的装备及套装来源。[通信契约](network-contract.md) · [后端事务](../backend/src/main/java/com/funsgamex/mxzg/hero/HeroEquipmentService.java)

日服英雄详情依据 `jp-overlay/src/layer/heroinfo/HeroInfoLayer.lua`、`JpHeroPortrait.lua` 和正式服存档截图。当前把正式服映射实际引用的 115 张全身图收录在英雄 Bundle 内，由 `HeroPortraitUtils` 按星级和进化分支选择，缺图时沿用 Spine。培养栏复用旧页签、强化印记和技能角标。属性窗展示当前服务器同步的数值，附魂技能等未接入的面板来源继续由快照标识。[正式服外观](images/official-hero-info-20261103.png) · [立绘导入工具](../client/tools/import_hero_portraits.py)

人工修改从对应 View 的 @UIRegistry.view 进入模块 Controller。英雄普通召唤由 HeroRosterController 收发，布阵由 FormationController 收发，普通升级由 HeroLevelController 收发。会话隔离由 GameSocketClient 与 AccountController 统一负责。

布阵保存回包记录服务器阵容版本。HeroRosterModel 更新至该版本后，仍打开的原提交页面才继续出战。保存期间禁用重复提交，结束页面撤销出战回调。正常推送或重连鉴权提供当前阵容。见 [页面维护](formation-ui-authoring.md)。

## 普通英雄升级

旧 `HeroInfoUpLevelLayer.lua` 的费用栏使用 `system.hero_level_jump_limit`（60）和 `hero_level_jump_max`（5）。60级前点击一次，升当前能负担的级数，上限5级；从60级起界面一次升一级。每级取升级前等级的 `herolevel` 费用，金币由角色钱包扣除，英雄经验为背包物品 `900101`。旧 `HeroHandler.heroUpLevel`（4018）在服务端校验实例归属、请求级数和本阶或星级上限。当前0阶上限为30级。

客户端 `HeroLevelQuoteUtils` 读取已加载的配置及现有名册、角色和背包。费用不足时展示下一等级的成本，优先提示金币，再提示英雄经验。确认本次手动升级后 `HeroInfoView` 使用原 `upexp` 的30帧光效，60毫秒每帧，前100毫秒渐入，关页归还引用。

服务端 HeroLevelService 在同一角色锁事务内完成等级与两项扣费，递增统一资产版本并保存回执。V32 保留旧单级回执并允许多级跨度，同幂等键不同参数拒绝。客户端每次点击只发一次，成功回包只供本次光效，等级和消耗由统一快照更新。见 [通信契约](network-contract.md)。

## 历史合同与规则核查

早期 HTTP 合同、阵容迁移、战斗规则核对与截图按原日期保存在[历史核查记录](validation/hero-lineup-history.md)。
