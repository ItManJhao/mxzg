# 背包当前界面资源归属清单

目录更新：2026-11-14。当前入口包括BagView、普通道具/碎片共用BagInfoView、普通装备EquipmentInfoView、精灵专用SpiritInfoView、BagTabView和共用BagItemView。前批普通道具/碎片复用两个既有Prefab，新增ItemDetailUtils，不新增View或Bundle；只读表现专项通过、本机限定复验已完成。下表18张直接图片绑定来自原BagView、BagInfoView、BagTabView、BagItemView扫描，不是后续详情和碎片样式调整后的全部绑定统计。表中“归属”使用Bundle名/包内路径，物理目录另见下方resources/module树；两者不混用。同名资源不能据文件名直接替换或删除。“其他预制体”来自[原始引用扫描](validation/bag-resource-inventory-20261110.json)，部分已退役，仅供追溯；[旧构建证据](validation/bundles-auto-build-20261111.json)不能充当新路径与源码的构建验收。精灵专用详情的前批独立本机限定复验见[11-14专用详情复验](validation/spirit-detail-review-20261114.json)，未据此宣称98技能逐项画面。

本轮仅整理配置使用：GameConfig保存唯一文件与类型化主键索引，BagItemCatalog/HeroCatalog改为静态无缓存显示计算，View不再构造或持有Catalog、传入整表建立重复Map。简单字段直接getConfig，实际美术仍按Prefab绑定或ResManager作用域加载。本轮没有移动图片、Prefab或meta；保留现有文件名和UUID。此前配置包20:14发布属于前一批，本轮源码与预览结果统一见[开发进度](development-progress.md)，不以旧包代替当前验收。

## 原扫描的静态绑定（18张）

| 图片 | 背包使用位置 | Bundle逻辑归属 | 历史其他预制体引用举例 |
|---|---|---|---|
| backpack_900001.png | BagInfoView | icons/item | CampaignView、MainChapterView、ChapterPreviewLayer |
| backpack_item-frame-1.png | BagInfoView | common/atlas | InfoCard、HeroInfoUpStarLayer |
| backpack_spr-default.png | BagItemView | common/ui | ChapterExtraRewardCell、InfoCard、HeroInfoUpStarLayer |
| button_btn-close-1.png | BagInfoView | common/ui | AbilityInfoLayer、RoleProfileView、BattleDetailLayer |
| button_btn-green-big-1.png | BagView | common/atlas | HeroInfoUpStarLayer、HeroInfoView、HeroStrongInfoCell |
| button_btn-old-1.png | BagInfoView | common/atlas | SkillAuditCellView、SkillAuditView、GmOptionCellView |
| button_btn-orange-big-1.png | BagView | common/atlas | BattlePage、CommonBtnPrimaryShell、HeroInfoView |
| button_btn-src.png | BagInfoView | common/atlas | AbilityInfoLayer |
| button_btn-tab-23.png | BagTabView | common/ui | SkillAuditView、ChapterStageChip、GmView |
| button_btn-tab-24.png | BagTabView | common/ui | SkillAuditView、GmView、HeroListView |
| loading_bg-white.png | BagInfoView | bootstrap/images | RemakeHomeView、AccountLoginView、RoleProfileView |
| other_kuang.png | BagView | common/atlas | ChapterExtraRewardCell、HeroListView |
| other_rare-0.png | BagItemView | common/ui | BattleDetailCell |
| win-bg_block-bg-24.png | BagInfoView | common/atlas | AbilityInfoLayer、InfoCard、HeroSkillInfoLayer |
| win-bg_block-bg-5.png | BagView | common/ui | BattlePage、ChapterRewardInfoView、SkillAuditView |
| backpack-info_spr-line.png | BagInfoView | bag/atlas | 无 |
| backpack_spr-select.png | BagItemView | common/item-atlas | 随共用BagItemView用于结算、奖励和产物说明 |
| map-bg-backpack-1.jpg | BagView | bag/background | 无 |

## 详情还原差异

2026-11-14前次对照只做审计；随后普通mode=1装备专用只读详情及本批普通道具/精英碎片表现已完成本机限定复验。灵器专页和未拥有英雄图鉴仍是缺口，使用、合成、分解、穿脱等操作均未开放。精灵、装备和本批道具/碎片保留各自限定证据，不能据此认为背包所有类型及写操作已完整还原。

详情分路应依据物品配置的`mode`与真实实例种类，不能只看页签`place`。`place`决定物品显示在哪个分类，`mode`决定它采用哪一类详情；同一页签可能包含不同系统的物品。旧道具与碎片本来共用`BackpackInfoLayer`，通过内容与按钮条件形成不同效果，不要求每个页签机械新增一个View。

| 真实种类 | 旧源码/已观察的正式服效果 | 当前实现及缺口 | 后续需要的真实依据 |
|---|---|---|---|
| 普通装备，`mode=1` | 旧`BackpackLayer.onShowInfo`打开`AbilityInfoCtr`；显示品质标题、装备图标/彩色名称、评分、装备位置、基础属性、套装、说明及装备入口。正式服银制利剑已只读看到绿色标题、星级、类型武器、评分33、攻击33、来源/装备按钮和说明；该件没有套装，不显示套装区 | 已由`BagView`按mode=1打开完整`EquipmentInfoView`，显示品质、旧星级、评分、位置、基础属性、套装及说明；来源/装备只提示未开放，本机限定复验已通过 | 已有68条`equipmenttype`及物品/语言表；`scorecount`、`equipmentsettype`与`attrshow`已接入同源显示类型。旧背包传装备配置和空穿戴列表，有套装时未激活为0/4，不需要伪造或新增装备实例才能显示静态基础属性 |
| 普通道具，`mode=2` | 与碎片共用基础详情，按配置显示类型、说明及来源/使用/分解的组合；正式服强化石和召唤点有来源，诸神挑战券无按钮 | ItemDetailUtils已接入真实条件，BagInfoView显示类型和相应按钮；专项通过，本机限定复验已完成。来源/使用/分解均只全局飘字，不执行写业务 | 直接读取已有`item.mode/use_type/source/decomposition`及语言，不按页签猜类型。仅inventory上下文显示条件按钮，奖励/产物说明保留自己的副标题和确定关闭 |
| 精英碎片，`mode=8` | 旧`isPiece`使用专用英雄碎片格：星级、拼图角标；背包格下为持有数/`use_value`进度。正式服随机3星列表28/20，详情有类型、星角、来源和使用 | 共用BagItemView已增加静态星角；仅BagView显式启用实际持有数/需求数，奖励保留本次数量，产物0隐藏，BagInfoView详情无进度；专项通过，本机限定复验已完成 | 星级、图标、所需数和持有量使用真实配置/快照。具体英雄碎片的旧判断是`itemId-10000000`命中HeroType；图鉴按钮本批只飘字，不将未拥有英雄接入当前HeroInfoView |
| 英雄材料，`mode=9` | 旧`isPiece`不将其视为精英碎片；虽然同在碎片页，走普通物品显示规则 | 已明确不套用mode8星角或进度，仍按真实类型/按钮显示；23条同源正文缺失显示明确提示并限频记录 | `use_value`是英雄配置标识，不能作合成需求或借用英雄碎片图鉴入口；缺正文不得伪造 |
| 精灵，`mode=6`且有真实精灵实例 | 旧`RunesTipsCtr`为独立详情，显示真实属性与技能；正式服格子不显示数量 | 已按实例键分路至`SpiritInfoView`，其余边界及资源证据见下节；98技能尚未逐项画面验收 | 使用服务端持久的`abilityId/skillId/level`和唯一`spirit-display`投影，禁止普通数量堆叠或客户端重抽。合成、重生、分解、穿戴仍未开放 |
| 灵器，`mode=18` | 旧`BackpackLayer`走`ArtifactTipsCtr`专用详情；908101“灵戒”属于此类，虽然也位于装备页 | 当前仍落通用详情，灵器领域/专用展示未恢复；不能拿普通装备属性模板填充 | 当前装备页含8种此类物品；须另核灵器配置、状态与旧详情。此前背包夹具使用908101，只证明通用入口可打开，不能充当普通装备详情的验收证据 |

正式服普通装备以[银制利剑详情](images/equipment-official-sword-20261114.jpg)为准；前批[强化石详情](images/bag-official-item-20261114.jpg)和[随机碎片详情](images/bag-official-shard-20261114.jpg)保留为分类审计记录。本轮补只读核对[召唤点来源](images/item-official-source-20261114.jpg)、[诸神挑战券无按钮](images/item-official-no-actions-20261114.jpg)、随机3星[碎片列表28/20](images/shard-official-list-20261114.jpg)及[详情来源/使用](images/shard-official-detail-20261114.jpg)。只打开详情，未点击正式服使用、装备或来源操作；不把源码结构审查、正式服对照或专项通过写成新版完整UI验收。

本批独立环境的900102真实名为“英雄进阶石”；前批正式服“强化石”截图保留原审计来源，不据显示名推定它的配置ID是900102。主要本机已复验道具按钮组合、随机3星28/20与具体1星2/5、长文滚动、mode9缺正文、精灵和普通装备隔离、只读产物说明及双窗返回；NoActionSpacer无操作底部留白及注销也已通过。历史关闭异常日志保留，已补失效节点保护和反例，mode9缺正文警告属于预期。

复核入口是旧项目`client/cocos_mxzg/client/idle/src/layer/BackpackLayer.lua`第302–304、345–356、363–387、468–493行，`BackpackInfoCtr.lua`第142–169、186–198、240–267、372–389行，`AbilityInfoCtr.lua`第64–90、111–165、198–267、446–454行，以及`comp/menu/UIMenuItemHeroPiece.lua`的`setStar/setCompleted`。当前入口为`BagView.showInfo`、`BagInfoView`、`BagItemCatalog.face`和`ItemDetailUtils`，普通装备单独使用`EquipmentInfoView`和`EquipmentDetailUtils`，精灵使用`SpiritInfoView`。

普通装备评分按旧`data/EquipData.lua`实际代码逐属性先算`ratio = scorecount.ratio / 10000`，再计算`ceil(value × ratio)`后求和，保留浮点求值顺序，不能照其过时注释另写生命固定0.16系数。基础装备属性涉及220、222、223、210、291、200，套装属性涉及102、201；旧代码用`attrshow.icon`选择图标，不能把本批精灵的四属性图映射直接套过去。三张显示表已接入；不新增运行时资源名称清单。

## 普通道具与碎片共用详情

ItemDetailUtils只做同源配置投影，mode2/8/9/17共584条纯投影及文字等值专项已通过，不持有库存、资源缓存或请求。当前read(item, context)直接查询GameConfig的Language主键，不再由BagInfoView传整张语言表；富文本、类型和条件按钮的真实计算继续保留。BagInfoView从稳定库存key重读BagModel，按真实mode与source/use_type/decomposition决定只读按钮；期限实例继续保留真实倒计时。来源、使用、分解及具体英雄图鉴目前只全局飘字，不能把按钮外观恢复记为相应玩法开放。description上下文继续保留“产物说明（只读）”或“本次获得”副标题和唯一确定按钮。

正文组件使用cc.RichText，ItemDetailUtils.richText作为唯一转换入口，保留旧br与字面量`\n`换行、合法font颜色；普通库存和奖励/产物Face共用richBody，不再把礼包颜色/换行直接剥除，也不增加逐物品清单。追加独立预览已核900504的11行/10橙色项、900505的3行/2橙色项、553字长文末行、随机3星28/20和关闭/注销，相关最终截图为RichText画面；其余UI矩阵保留第一阶段结果，不标为全场景重新验收。版本及范围见[最终证据](validation/item-shard-review-20261114.json)。

BagItemView由调用方明确是否显示碎片库存进度：只有BagView传true，实际数量超过需求仍完整显示，进度条最多填满；ChapterEndView奖励格显示本次数量，ChapterRewardInfoCell产物候选quantity=0隐藏数量，二者不读取当前库存。详情图标只显示星级/拼图角标，不附数量和进度。mode9、普通装备、灵器及精灵不继承碎片样式，复用空槽清除旧状态。

BagInfoView.prefab保留静态结构、Layout/Widget、RichText正文及单段长说明ScrollView；共享模态仍归ViewSpec/UIManager，不放入Prefab。说明高度参数为60～300，同源最长553字可滚动，不另建业务列表或运行时界面。新增样式复用原包中图片：bag/ui/backpack_shop-sp为拼图角标，hero/ui/hero-icon_spr-bg-1和spr-bg-2为进度底/填充，三张均恢复旧RGBA并保留原UUID，见[资源证据](validation/item-shard-assets-20261114.json)。未新增View、Prefab或Bundle，未加模块资源清单；当前本机限定复验已完成，最终记录见[本批复验](validation/item-shard-review-20261114.json)。

## 普通装备专用详情

EquipmentDetailUtils.read(itemId)直接读取唯一GameConfig，原EquipmentDetailSource六表包装和窗口配置字段已删除；不在开窗时复制Language或ScoreCount Map。ScoreCount按非主键mapping匹配属性，套装按type/num匹配档位，均使用同一只读行，不改变评分取整或套装条件。需要整表遍历不等于要在页面建立另一份缓存。

EquipmentInfoView保存完整只读面板，品质标题与名字颜色在Prefab选择；旧1～5星为黄星，6星为一颗红星。当前68条普通装备最多两条基础属性，套装固定2/3/4件三档，使用有限静态槽；Layout随隐藏分区收缩，不运行时拼节点或手排坐标。无套装隐藏整个分区，有套装按旧背包空穿戴上下文显示0/4；缺配置明确拒绝，不补默认属性、评分或伪造套装激活。

窗口只传背包稳定key，库存事件重读BagModel；物品删除、类型改变或换号后关闭，数量变化不改变装备配置属性。图标按需取图，关闭撤回本页拥有者。来源、装备按钮只统一飘字说明未开放；只读详情不新增库存/穿戴协议，不更改资产。

旧图依赖24张已逐像素核对，17张恢复原RGBA，既有UUID保留；图片、字段绑定与布局依据见[资源记录](validation/equipment-detail-assets-20261114.json)。正式服新核对[银制利剑](images/equipment-official-sword-20261114.jpg)的绿1星、武器、评分33、攻击33和无套装；套装、高品质尚无正式服逐项实测。本机限定复验已通过绿1星银剑、紫3星套装及红6星双属性样本，旧6星显示一颗红星；来源/装备只全局飘字，X/空白关闭、套装后普通面板收缩、英雄往返和注销正常。设备选项393×852、浏览器1280×720，独立H2/WS三库存各1，只读阶段revision保持5，无新增state.changed；刷新后15:50（上海，07:50Z）无新warn/error，历史旧编译错误保留，PID9080已核身份停止。最终见[本批记录](validation/equipment-detail-review-20261114.json)，不作为真机、发布包、新Java/MySQL或正式服套装/六星逐项签收。

## 精灵专用详情

SpiritInfoView.onOpen仅保存当前实例key和登记监听；refresh从BagModel取得该精灵后调用静态BagItemCatalog.spiritDetail(spirit)。它按GameConfig中的Item/SpiritDisplay及语言主键生成当前显示，不再传四张整表new Catalog；真实属性和技能仍来自服务器保存的实例，配置加载完成不意味着可以脱离实例生成玩家数据。

SpiritInfoView.prefab保存完整面板：蓝色标题、精灵名称与类型、基础属性、技能圆框、技能文字区，以及来源和两行操作按钮。背景、圆框、按钮等静态图片由Prefab直接引用；动态精灵图标、属性图和技能图由真实实例决定。布局、文字区域和Widget/ViewportScale均在Prefab维护，不运行时组装另一套面板。

BagItemView仍是各类库存共用格子：真实spirit实例隐藏数量并清除上件文字，普通道具数量不受影响；mode8库存碎片改用独立完成度区域，奖励/产物数量另按上节上下文处理。点击精灵后由BagView打开SpiritInfoView，按`spirit:instanceId`读取BagModel；普通道具及只读产物说明继续使用BagInfoView。专用详情沿用UIManager共享模态，面板外可关闭，不额外叠加Prefab蒙版。来源、合成、重生、分解和装备按钮当前仅提示未开放。

本页复用原有图片而非另造一份资源：

| 资源 | 当前逻辑地址与使用方式 |
|---|---|
| 蓝色标题底图 | bag/ui/backpack-info_spr-banner-backpack-2，Prefab静态绑定 |
| 属性图标 | bag/ui/backpack-info_spr-attr-101、220、223、224，由真实特性的attributeId经ResManager.ui取得 |
| 技能圆框 | hero/ui/skill-icon_spr-skill-runes-bg-1，Prefab静态绑定 |
| 技能图 | hero/ui/skill-icon_原图编号，BagItemCatalog.spiritDetail读取spirit-display中的精确技能等级图标，再经ResManager.skill取得 |
| 月兔精灵图 | icons/item/backpack_2000002，沿用item.icon与ResManager.item规则 |

98项技能图和圆框沿用hero包现有地址与UUID，不把文件另拷到bag包，也不新增逐图加载清单。本轮按旧RunesTipsLayer/RunesTipsCell及PVR/plist取样修正本页原图透明像素，109张图逐像素记录见[资源证据](validation/spirit-detail-assets-20261114.json)；其中106张原图片有像素修正，原有UUID和SpriteFrame子UUID保留。原RGBA恢复时直接复制像素，不能再把自身alpha当蒙版而重复衰减透明度；Creator据修复后的透明边缘更新裁切/UV是允许的导入结果，不代表更换资源身份。此证据只说明源图、布局来源和像素核对，不代替98技能逐项画面或发布包验收。

## 动态资源

- 库存图由 BagItemCatalog.iconSource 读取 item.icon，通常定位 icons/item；配置指定的英雄图标位于 hero/ui。ResManager 解析路径，不维护逐ID存在性清单。
- 品质框 other_rare-0 至 other_rare-6、缺图占位和页签位于 common/ui，按展示需求加载。
- 精灵属性和技能由BagItemCatalog.spiritDetail从spirit-display同源投影读取；按实例保存的abilityId、skillId和level定位，不由客户端重新随机，也不拿其他等级或实例补图。
- 店员为 spine/shangcheng，由 BagView.shopkeeperSkeleton 声明；骨骼和附件保持原格式。
- 字体按现有 Prefab 绑定加载，属于 font 或本地 bootstrap 依赖，不因背包打开另建字体清单。

## 当前目录与维护边界

    assets/bundles/module/bag/prefabs/       BagView、BagInfoView、EquipmentInfoView、SpiritInfoView、BagTabView
    assets/bundles/module/bag/atlas/         详情分隔线、BagAtlas.pac
    assets/bundles/module/bag/background/    当前背包背景
    assets/bundles/module/bag/ui/            标题、属性图等背包素材
    assets/bundles/module/common/prefabs/    共用BagItemView
    assets/bundles/module/common/item-atlas/ 共用选中图、CommonAtlas.pac
    assets/bundles/module/common/atlas/      7张共用静态图、CommonAtlas.pac
    assets/bundles/module/common/ui/         动态共用图
    assets/bundles/module/hero/ui/           沿用技能图片与精灵技能圆框
    assets/bundles/resources/icons/item/        物品内容图标
    assets/bundles/resources/spine/             骨骼与附件

原顶层 ui、resources、prefabs 已整合并移除。bag/ui 中仍保留旧背包分类素材，它们不全是当前背包预制体的直接依赖；没有静态引用也不能据此认定未使用，动态配置可能组合资源名。本页不是运行时加载或删除名单。

页面地址只在View的@UIRegistry.view注册中维护；三段准备目标只在LoadingPlan配置。当前BagView在进入主城前准备，BagInfoView在主城后后台准备，SpiritInfoView未列入三段目标、首次点击时按需加载。准备页面包含其直接依赖，动态图标按需取得；加载一个Bundle的元数据不等于下载全部包内资源，引用hero包技能图片也不等于预载整个英雄模块。完整操作见[自动图集维护](bag-auto-atlas.md)和[Bundle维护说明](staged-resource-loading.md)。

## 历史 common 迁移边界

2026-11-10最初核对14张共用图，其中9张是静态合图候选，首批最终迁移7张；选服依赖、品质框、页签和占位图当时保留原动态路径。随后整体 Bundle 迁移已统一修改加载路径，提示白图归本地 bootstrap，共用格子和选中图归 common。历史“仍留resources”与“清理9张”不能作为当前目录或删除依据。核对原始依据见[common历史审计](validation/bag-common-audit-20261110.json)。
