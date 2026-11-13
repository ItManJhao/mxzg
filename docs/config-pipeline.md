# 配置与资源维护

运行时入口为 GameConfig 和 ResManager，不保存玩家数据，不因 import 预加载美术。开发约束只维护在 [AGENTS.md](../AGENTS.md)。

## 配置来源与生成

策划源在 config/gameconfig/*.xlsx。现有格式：第一行中文说明，第二行导出标记 1/2/3，第三行字段名，第四行起数据；部分表采用类型词。空单元格省略，空表保留 rows: []。system_gate 与 opencondition 是导出投影；三张 maincity JSON 分别使用 main 数组、act 字典、maincityeffect 数组。

1. python tools/export_gameconfig.py 导出 JSON，保留已有 meta UUID。
2. [client-schema.json](../config/client-schema.json) 维护明确字段、主键、必需性与结构规范。
3. python tools/generate_config.py 生成 GConfig.ts；--check 只核验，不写入。

截至2026-11-13，client-schema.json定义16张类型化表；assets/bundles/resources/config保留31张实际依赖JSON表，二者统计范围不同。保留表或类型不表示对应玩法已开放：普通升级入口已关闭，旧升级窗口与客户端请求链已删除；HeroLevel等规则投影仍供后续恢复与检查使用。不是对全部历史536张表猜类型。新增类型化表先声明规范，再接入实际需要的加载入口。数组必须声明items，对象必须声明fields，空对象禁止额外字段；原JSON中数组文本仍为string，不擅自改变格式。字段注释优先来自本项目表头，派生及JSON-only字段在规范维护。生成顺序稳定，不写本机绝对路径。

语言表 key=# 为注释行，规范显式排除；数字文本语言键可用数字查询。所有有效配置主键均必须唯一；生成器和 GameConfig 同时拒绝重复键，失败不提交整组。

2026-11-02 负责人确认两项功能分开，已在 opencondition.xlsx 的 opencondition 工作表完成标识拆分：

| 源行 / idx | 功能 | atom / 导出 id | 开放等级 |
| --- | --- | --- | --- |
| 88 / 85 | 福利-积天豪礼 | act_recharge_day_reward | 6 |
| 138 / 135 | 积天累充 | act_recharge_accumulated_days | 13 |

仅源表 B138 改名，两个功能分别按自身条件查询，不互相覆盖、不取较低等级。两行 open=5、condition_type=1、world_level=1、导出 open_server_day=0 均保持不变；表格样式与其他单元格也保持不变。此处只确定功能标识与原有开放条件，不定义充值金额、累计天数、活动周期、领奖重置等未提供规则，不开放支付或新玩法。

背包标签使用 item.xlsx 的 place：0 不在背包显示、1 装备、2 道具、3 碎片、4 特殊（当前页签美术为精灵）。type 是效用类型，不代表背包标签；隐藏显示不删除 Model 中库存，也不影响结算发奖。

## 普通升级最小投影（保留规则，入口关闭）

herolevel.xlsx → 导出 herolevel.json → client-schema 的 HeroLevel（level、exp_need、gold_need）→ generate_config.py。服务端由 `python tools/export_hero_growth.py --write` 从现有五张导出表生成 gameplay/hero-growth.json，只保留消耗、阶/星上限和四属性所需字段；默认调用只检查稳定性，统一检查已接入。版本为内容哈希，收据和新战报记录实际成长版本；历史已保存战报不重算。历史普通升级窗口曾展示服务端current/next并校验成本，该窗口现已退役，不属于当前开页流程。后续恢复仍须保持服务端权威，配置缺失拒绝操作，不免费升级。规则出处见[英雄契约](hero-lineup-contract.md)。

## 加载与查询

    await RemakeConfigUtils.prepareInventoryConfig();
    const item = GameConfig.instance.getConfig(GConfig.Item, itemId); // ItemRow | undefined
    const rows = GameConfig.instance.getConfig(GConfig.Item);        // 稳定只读数组
    const required = GameConfig.instance.requireConfig(GConfig.Item, itemId);
    const state = GameConfig.instance.status(GConfig.Item);

RemakeConfigUtils当前按页面实际需要提供四组配置：city读取五张主城表；hero读取HeroType/Item；heroDetail读取EquipmentType、HeroType、HeroSkill、HeroStar、HeroUpgrade、Language、Item；inventory读取Item、Language、TimeLimitItem。阶段中需要提前准备的表在LoadingPlan显式配置，不另保留startup分组。表未加载或首次加载失败抛ConfigUnavailable，status区分unloaded/failed；已加载空表返回空数组，缺行返回undefined，requireConfig缺行抛ConfigRowMissing。

加载先复制、逐字段校验、建索引并递归冻结，再原子提交整组；失败保留此前有效数据，status.error 记录最近失败。整表和嵌套数据不可写，不暴露内部 Map。并发同版本请求去重，失败可重试，成功复用。

prepare 的 version 参数隔离不同版本：新组全部成功才切换并清除旧版本其余表，旧代次拒绝迟到提交。当前 Creator 读取器只支持 initial，拒绝未知版本。远程版本下载、签名、安装及回滚尚未实现。

旧 ConfigDb、GroupedConfig、loadAll、gameCatalog/rosterCatalog/bindTables/lookups 已删除；BagItemCatalog/HeroCatalog 仅为显示投影，不是第二份玩家或配置状态仓库。

## 类型化资源

图片统一经ResManager按目录和原始文件名获取；不维护资源名或可用ID清单。CommonUiResources、ResourceCatalog和config/resource-catalog.json已删除。ResourceTypes只保存类型契约，ResourceAssetsUtils/ResourcePool负责请求合并与持有释放。

```ts
ResManager.setSprite(iconNode, ResManager.ui("common", "other_rare-4"));
const frame = await ResManager.getSpriteFrame(ownerNode, ResManager.ui("hero", "hero-icon_elem-1"));
const target = ResourceAssetsUtils.describe("spine", "jiemian", "SkeletonData");
```

静态图片优先直接绑定Prefab。动态缺图在实际加载失败时记录路径/原因，候选默认图由调用方指定。直接getSpriteFrame返回Promise，失败交给调用方处理；不承诺未加载资源同步可取。

LoadingPlan显式配置三个阶段。tools/generate_resources.cjs只生成Prefab UUID身份索引和PrefabPlanUtils准入，不扫描图片、不生成模块资源描述；运行加载没有UUID地址回退。保留Prefab序列化引用和原UUID。[resource-missing.json](../config/resource-missing.json)仅为历史审计。

ResourceAssetsUtils复用ResourcePool的请求去重、失败重试、持有计数与关闭隔离。decRef(false)只撤回作用域持有，避免破坏仍由其他页面或序列化依赖共享的资源。页面实例与闲置Prefab回收已实现，阶段预加载和活动实例继续受保护；完整纹理内存预算、真实CDN下载和长期性能测量尚待完成，具体参数见[加载与缓存维护](staged-resource-loading.md)。

## 历史查缺记录（2026-11-02）

以下保留当时的入口、路径、数量和验证结论，不代表当前资源结构；IconCatalog、ItemIconById等旧入口现已退役。

2026-11-02 此前批次复核发现旧 1172 条缺图记录大部分来自生成器误用物品 ID 拼接路径，忽略 item.icon 的 backpack/ 共享图片声明。现已按显式配置生成 IconCatalog，缺图降为 16 个引用、8 个不同路径；这是复用正确的现有图片，不是补造图片。当前三名初始英雄、初始库存及前 20 关奖励范围未发现必需缺图；保留配置引用仍有效，不能以未开放为由删除。

本批收尾（2026-11-02）对旧项目的裸 Git 仓库 `G:/work/FsGame/Demo/mj/program/client/cocos_mxzg.git` 只读追溯：38 个现有 ref 的资源树，6,822 个去重的 plist/atlas/资源 JSON，113,887 条图集帧记录（含 aliases），33 个 item/herotype 配置版本。核对显式 icon、共享 ID 和命名差异；当前客户端扫描 22,361 份 meta、464 份 atlas 和 1 份 plist，并对照 asset-provenance.json。检索范围是这些分支尖端及本机现有来源，不等于穷尽所有历史提交或外部美术源。

| 原缺失路径（ui/ 下） | 配置与影响 | 本批结论 |
| --- | --- | --- |
| bag/backpack_900006 | 900006 虹石，place=0；奖励/货币展示，当前背包隐藏 | 已检查来源未找到准确子图或可证实替代映射，待补美术 |
| bag/backpack_900303 | 900303 冒险点数，place=0；保留冒险/奖励展示 | 已检查来源未找到，待补美术 |
| bag/backpack_902038 | 902038 传承灵石，place=2；若获得则影响背包道具/详情 | 已检查来源未找到，待补美术 |
| bag/backpack_906411 | 906411 蝙蝠侠盗（永久），place=2；保留皮肤道具/详情 | 找到准确原图并迁入：日本分支 jpn/backpack 图集的 backpack/906411.png |
| bag/backpack_906431 | 906431 皮肤道具，名称键 706431 当前无语言行；place=2 | 找到准确原图并迁入：同图集 backpack/906431.png；不凭头像猜名称 |
| bag/backpack_1100507 | 1300004 异空间碎片显式共享图，place=2；背包道具/详情 | 配置映射错误已修正：源表 item.xlsx 的 J1493 改为 backpack/1300004，重新导出，复用现有准确异空间碎片图 |
| bag/backpack_3010001 | 3010001/3010003/3010004/3010007～3010012，九档自选充值包共图；保留物品展示 | 找到准确原图并迁入：魔兽梦境分支 hd/backpack-5 图集的 backpack/3010001.png；不开放充值功能 |
| hero/hero-icon_20505001 | 物品 10505021 功夫大侠·胖达，place=0；保留英雄物品/奖励展示，非初始英雄 | 已检查来源未找到准确子图；不擅自换成相似英雄头像，待补美术 |

三张源图按 plist 的 frame/sourceColorRect/sourceSize 从 RGBA8888 PVR 无损还原为 102×102 PNG，未改像素风格、未导入整套图集。906411/906431 源提交 `1d0ea5dc5b28201963cfb007305d5e80fb16faeb`（bucket/TW/日本），目录 `client/idle/res/jpn/ccbi-res/`；3010001 源提交 `71902442d3e832417892f2ac607ee930de3b2f37`（bucket/TW/魔兽梦境），目录 `client/idle/res/hd/ccbi-res/`。源配置分别确认相同 icon、物品类型和使用规则；完整来源条目已合入 asset-provenance.json。

重新生成后剩 **4 个引用 / 4 张图**，均保留为待补美术，未判为可删除历史引用。异空间碎片另核对日本/多语言/魔兽梦境配置使用 backpack/1300004（名称键 710404、说明键 870004、用途一致），当前中国简体来源遗留的 1100507 在已查图集无对应帧。只改源表 J1493 并通过现有导出器重新生成 item.json；未改变用途或活动规则。当前 1300004 原图与日本同名图集帧美术一致，但像素版本不同，保留现有图片与 UUID，不用另一分支像素覆盖。三张新图未由本批正常首胜发放，不把资源加载验证算作对应皮肤/充值玩法验收。三张新增图片已通过真实 Creator 的既有资源作用域加载，尺寸 102×102，共享礼包 ID 指向同一 UUID。异空间碎片运行时复核已于 2026-11-02 后续独立验证批完成：当前 Creator 预览的 GameConfig 返回 backpack/1300004，ItemIconById[1300004] 指向 resources/ui/bag/backpack_1300004，既有资源作用域加载为 102×102 SpriteFrame，UUID 为 ad66e79b-695c-4c69-8a0a-18ae4e7adf8b@f9941。实际加载的原生 PNG 与仓库图片 SHA256 同为 5ac2f5035672f3fc7bf64e94d0a85ba5c34b14698f92ea4ddede624597c8d6a8，目视为蓝色晶体碎片，未回退旧地址或通用占位图。源表 item!J1493、导出、目录与 meta 再次一致；作用域已释放。证据保留在忽略目录 client/temp/mysql-phase-20261102。此次仅验证配置与资源加载，未写库存、伪造领奖或验收未开放玩法。全部保留 Prefab 序列化 UUID 另由结构审查验证。

## 美术追溯

历史迁入记录的源包、stem、尺寸和映射集中在 [asset-provenance.json](asset-provenance.json)，只用于追溯。当前真值为资源/meta、生成目录和序列化引用。Spine、帧动画、字体及音频按现有导入器维护；不重铸 UUID，不为规范化键名改原图文件名。素材版权与渠道包体仍需独立验收。
