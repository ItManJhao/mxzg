# 配置与资源维护

运行时入口为 GameConfig 和 ResourceCatalog，不保存玩家数据，不因 import 预加载美术。开发约束只维护在 [AGENTS.md](../AGENTS.md)。

## 配置来源与生成

策划源在 config/gameconfig/*.xlsx。现有格式：第一行中文说明，第二行导出标记 1/2/3，第三行字段名，第四行起数据；部分表采用类型词。空单元格省略，空表保留 rows: []。system_gate 与 opencondition 是导出投影；三张 maincity JSON 分别使用 main 数组、act 字典、maincityeffect 数组。

1. python tools/export_gameconfig.py 导出 JSON，保留已有 meta UUID。
2. [client-schema.json](../config/client-schema.json) 维护明确字段、主键、必需性与结构规范。
3. python tools/generate_config.py 生成 GConfig.ts；--check 只核验，不写入。

当前覆盖 10 张有效或保留能力表，现有九张按组加载，HeroTalk 仅提供保留详情的描述，未提前加载。不是对全部历史 536 张表猜类型。新增表先声明规范再加入分组。数组必须声明 items，对象必须声明 fields，空对象禁止额外字段；原 JSON 中数组文本仍为 string，不擅自改变格式。字段注释优先来自本项目表头，派生及 JSON-only 字段在规范维护。生成顺序稳定，不写本机绝对路径。

语言表 key=# 为注释行，规范显式排除；数字文本语言键可用数字查询。所有有效配置主键均必须唯一；生成器和 GameConfig 同时拒绝重复键，失败不提交整组。

2026-11-02 负责人确认两项功能分开，已在 opencondition.xlsx 的 opencondition 工作表完成标识拆分：

| 源行 / idx | 功能 | atom / 导出 id | 开放等级 |
| --- | --- | --- | --- |
| 88 / 85 | 福利-积天豪礼 | act_recharge_day_reward | 6 |
| 138 / 135 | 积天累充 | act_recharge_accumulated_days | 13 |

仅源表 B138 改名，两个功能分别按自身条件查询，不互相覆盖、不取较低等级。两行 open=5、condition_type=1、world_level=1、导出 open_server_day=0 均保持不变；表格样式与其他单元格也保持不变。此处只确定功能标识与原有开放条件，不定义充值金额、累计天数、活动周期、领奖重置等未提供规则，不开放支付或新玩法。

背包标签使用 item.xlsx 的 place：0 不在背包显示、1 装备、2 道具、3 碎片、4 特殊（当前页签美术为精灵）。type 是效用类型，不代表背包标签；隐藏显示不删除 Model 中库存，也不影响结算发奖。

## 加载与查询

    await prepareInventoryConfig();
    const item = GameConfig.instance.getConfig(GConfig.Item, itemId); // ItemRow | undefined
    const rows = GameConfig.instance.getConfig(GConfig.Item);        // 稳定只读数组
    const required = GameConfig.instance.requireConfig(GConfig.Item, itemId);
    const state = GameConfig.instance.status(GConfig.Item);

RemakeConfig 的 startup 只读 Language/LoadingTips；city 再读五张主城表；hero 再读 HeroType/Item；inventory 复用 Item/Language。表未加载或首次加载失败抛 ConfigUnavailable，status 区分 unloaded/failed；已加载空表返回空数组，缺行返回 undefined，requireConfig 缺行抛 ConfigRowMissing。

加载先复制、逐字段校验、建索引并递归冻结，再原子提交整组；失败保留此前有效数据，status.error 记录最近失败。整表和嵌套数据不可写，不暴露内部 Map。并发同版本请求去重，失败可重试，成功复用。

prepare 的 version 参数隔离不同版本：新组全部成功才切换并清除旧版本其余表，旧代次拒绝迟到提交。当前 Creator 读取器只支持 initial，拒绝未知版本。远程版本下载、签名、安装及回滚尚未实现。

旧 ConfigDb、GroupedConfig、loadAll、gameCatalog/rosterCatalog/bindTables/lookups 已删除；BagItemCatalog/HeroCatalog 仅为显示投影，不是第二份玩家或配置状态仓库。

## 类型化资源

[resource-catalog.json](../config/resource-catalog.json) 声明静态范围和冲突覆盖。node tools/generate_resources.cjs 生成目录，--check 核验稳定结果；另扫描全部保留 Prefab（含 Bundle）及 item/herotype 指定的实际图标，不扫描全部美术。

    const descriptor = ResourceCatalog.common.button_btn_tab_24;
    const path = descriptor.path; // 只取得描述中的地址
    const scope = createAssetScope();
    const frame = await scope.load(descriptor); // 推导为 SpriteFrame
    scope.dispose(); // 释放持有，迟到结果拒绝
    const icon = ItemIconById[itemId]; // 未登记 ID 为 undefined

描述包含 bundle、Bundle 内 path、完整 assetPath、loadPath、资源类型和 UUID。独立图片使用 meta 的 SpriteFrame 子资源；图集及子图采用可区分命名。规范化重名与同路径不同类型默认报错，须显式设置键或扩展名，不能覆盖。

Common、启动和页面静态地址使用目录；动态图标放在独立 IconCatalog，缺失时选择明确占位图，不拼接未知路径。缺图记录见 [resource-missing.json](../config/resource-missing.json)，不代表本轮新增丢图。合理的 Prefab 序列化资源引用保留。

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

ResourceAssets 复用 ResourcePool 的去重、失败重试、持有计数与关闭隔离。decRef(false) 只解除作用域持有，避免破坏序列化和既有显示加载器共享资源；全面主动淘汰、内存预算、下载与性能测量仍待完成。

## 美术追溯

历史迁入记录的源包、stem、尺寸和映射集中在 [asset-provenance.json](asset-provenance.json)，只用于追溯。当前真值为资源/meta、生成目录和序列化引用。Spine、帧动画、字体及音频按现有导入器维护；不重铸 UUID，不为规范化键名改原图文件名。素材版权与渠道包体仍需独立验收。
