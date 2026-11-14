# 配置与资源维护

运行时入口为 GameConfig 和 ResManager，不保存玩家数据，不因 import 预加载美术。开发约束只维护在 [AGENTS.md](../AGENTS.md)。

## 配置来源与生成

策划源在 config/gameconfig/*.xlsx。现有格式：第一行中文说明，第二行导出标记 1/2/3，第三行字段名，第四行起数据；部分表采用类型词。空单元格省略，空表保留 rows: []。system_gate 与 opencondition 是导出投影；三张 maincity JSON 分别使用 main 数组、act 字典、maincityeffect 数组。

1. python tools/export_gameconfig.py 导出原表JSON，保留已有meta UUID；默认共享目录导出成功后自动运行配置包生成器。
2. 涉及当前精灵时，python tools/export_spirit_rules.py --write同步生成服务端规则和唯一客户端派生展示；默认不带--write只检查漂移。
3. [client-schema.json](../config/client-schema.json)维护明确字段、主键、必需性与结构规范。
4. python tools/generate_config.py生成GConfig.ts；--check只核验，不写入。

截至2026-11-14，client-schema.json定义20张类型化表；assets/bundles/resources/config保留49份共享JSON，Maven直接共享32表，三项统计范围不同。保留配置不表示对应玩法开放：普通升级、精灵养成和穿脱仍关，HeroLevel等投影继续供后续恢复。此前已恢复13张真实后端依赖及原UUID；导出器从POM读取既有include，不另维护表清单，检查拒绝旧target缓存掩盖缺源。新增类型先声明规范，再接实际查询；数组声明items，对象声明fields，空对象禁止额外字段。原JSON数组文本仍为string，注释来自表头，派生字段在规范维护，生成顺序稳定且不写本机绝对路径。

### 客户端压缩包与源表保留

tools/generate_config_package.cjs从LoadingPlan.login现有`{config:GConfig.X}`自动推导启动表，当前为2份；其余47份共享JSON生成config Bundle内的`game-config.bin`，以ZIP字节交给Creator的BufferAsset导入器。源JSON及各自meta继续供Excel导出核对和Maven读取，不能删除，也不能以包内文件反向替换策划源；启动表不重复放入ZIP。不维护另一份启动表、模块分组或47表人工清单。

登录后配置正文只请求这一份bin，随后在内存中解压、解析47份表并建立索引。此前画面的“整理游戏数据9/47”“准备游戏数据20/47”是包内任务完成数，不是下载47个文件；现在玩家文案统一为“加载游戏数据”“整理游戏数据”“准备游戏数据”，进度条仍由实际任务完成量推进，不用计时模拟，也不冒充下载字节进度。Bundle元数据、启动脚本及BufferAsset元数据的请求与配置正文分开统计。

ZIP含自动生成的manifest.json及其余表，保留maincity等相对路径。所有源表先JSON.parse再JSON.stringify规范化；清单记录源路径、包内文件名、UTF-8字节数和CRC32。`config-v1:<SHA256>`版本由全部49表、schema与启动归属生成，固定ZIP时间保证相同输入得到相同字节。启动表虽然在包外，其变化也使版本失效；运行时核对启动源CRC与包清单，并检查包内文件目录、大小、CRC和JSON结构。CRC用于发现损坏，不是安全签名；当前不提供可信远程版本发布、签名安装或回滚。

直接修改共享JSON，或单独运行会改写共享JSON的定向生成器后，执行：

```powershell
node tools/generate_config_package.cjs --write
node tools/generate_config_package.cjs --check
```

`--write`只在内容变化时更新包、目录过滤和生成解码器；已有源meta、包meta及解码器meta UUID不重造。`--check`只读，默认不带参数也为检查模式。默认Excel共享导出会自动更新这些产物，临时导出与全量离线归档不触碰运行包。专项目令为`node tools/test_config_package.cjs`。

运行时ZIP入口为自动生成的ConfigZip.generated.ts：固定esbuild把fflate 0.8.2浏览器实现仅按strFromU8、strToU8、unzipSync三个出口捆绑为ESM，目标es2017，保留MIT许可；禁止手改生成文件或node_modules。Creator会依据.ts、.mjs和package.json的type判断模块格式，而fflate的browser.js没有type:module，直接交给Creator会被判为CommonJS。本机预览已触发该格式错误，因此采用可再生的项目内TypeScript ESM；原包声明只用于类型位置，运行时不再导入npm包。该处理遵循[Creator模块规范](https://docs.cocos.com/creator/3.8/manual/zh/scripting/modules/spec.html)及[外部模块预打包示例](https://docs.cocos.com/creator/3.8/manual/en/scripting/modules/example.html)，不新建全局ZIP对象或配置缓存。编译检查不能替代实际预览和发布验收。

生成器根据实际非启动源表的原UUID维护config目录meta中的官方`userData.bundleFilterConfig` Asset排除规则，保留其他用户过滤，使构建收集资源时排除47份散表。机制依据[Creator 3.8 Bundle资源过滤](https://docs.cocos.com/creator/3.8/manual/zh/asset/bundle.html#bundle-资源过滤)，没有删除源JSON、改写构建JSON引用或重造UUID。Creator构建前只读检查包、源表和过滤是否一致，过期则拒绝；统一H5入口在复制源文件前生成并检查。

构建扩展实际身份为`config-package-artifact-v1 v1.8.0`。构建后调用[配置包产物检查](../client/tools/config-package-build-check.cjs)，从同一manifest和原meta推导身份并扫描全部本地、远程Bundle，检查两份启动JSON、唯一bin及其内容版本，并拒绝47份散表因依赖进入其他包；生成解码器的模块登记和依赖也做静态检查。这份工具只读产物，不维护手写配置名单、不修改旧包或把失败产物标为可运行。before在普通Node子进程核验，避免Creator工作线程不支持同步esbuild Worker的问题。

2026-11-14上海19:54的新H5真实构建已通过三阶段钩子及18包检查：两张启动表、一份408,367字节bin、47份源表零副本。独立发布运行也已验证解包、GameConfig的49文件/20类型表，以及背包、英雄和二三关闭环，见[发布证据](validation/config-package-release-review-20261114.json)。静态build记录继续保留codecRuntimeVerified=false，浏览器证明单独记录，不将静态模块字符串检查冒充运行成功。两张启动表和引擎元数据仍分别请求；登录后一份bin不等于全流程只有一次HTTP请求。真实CDN和目标真机另验。

三类挂机活动的未标记gain_chance由tools/export_idle_rules.py定向读取原XLSX，输出backend/src/main/resources/gameplay/idle-activities.json，不恢复客户端活动表、不全局放开未标记列。三表实际sheet均为promotiondragonmarkdrops，按读取结果定位；0概率必须显式存在。工具默认同时检查基础和活动投影，--write统一更新；活动有独立版本，不改变基础idle-rules.json。该活动投影是服务端计算资源，不计入共享目录49份JSON，也不是额外预载清单，见[活动输入记录](validation/idle-activity-review-20261113.json)。

同一服务端活动投影的controls读取016/034首期、持续、清理、间隔、循环及星期参数。016最大轮次取promotiondragonmarkdrops，034取promotionpve真实sheet（promotionpve.csv），不能因同为1就改用pvedrops；034首期保留9999，44无策划循环行。该控制维护增量不增加共享JSON或Maven表，基础idle-rules.json保持；044兑换配置由可信入口存验，不混入客户端清单。见[控制维护记录](validation/idle-activity-maintenance-review-20261113.json)。

普通挂机触发器与权重行在投影前显式按原idx升序，沿旧BaseExcelCache及DropGroupSysCache的构建顺序固定随机调用和累计权重区间，不依赖工作表当前行序。反转两个源rows的回归仍生成相同完整内容及版本；本批没有改变两份现有投影字节。完整纯计算还校验Input冻结的idleRulesVersion，拒绝与传入普通规则混版，见[装配验证](validation/idle-calculation-review-20261113.json)。

### 最小精灵的规则与展示派生

tools/export_spirit_rules.py只恢复2000002闭包：定向读取runestype、runesability、runeskilltype，并引用item、heroskill和language的真实说明，生成后端`gameplay/spirit-rules.json`及共享目录`spirit-display.json`。默认同时检查两份结果，--write统一更新；客户端只得到能力/技能的只读说明，不接收随机权重或重新生成玩家属性。不要手改两份派生结果，也不全量恢复精灵旧表。

SpiritDisplay引入时是第17张类型化表，曾由inventory配置组准备；四组入口已在本批退役，现在随完整配置包安装，不新增模块资源清单。V23实例的随机结果由服务端持久化，通过Snapshot.spirit_inventory传输，前端按实例key读取展示配置；缺展示配置明确提示，不生成假技能或退化成普通库存。32项合并配置/路径/活动/精灵检查及真实WS帧互通见[当批证据](validation/spirit-instance-review-20261113.json)。11-14专用SpiritInfoView批次当时为163份TS/33份Prefab/16包、共享JSON48和Maven32；这些是该批历史快照，不能互相替换或当作当前总数。

展示闭包为4种能力、98项技能，392种全文组合检查通过；393×852独立H2本机预览实际检查8实例列表、两只不同属性/技能详情及关闭返回。上述是11-13通用详情的历史范围。11-14专用详情复用同一展示表，不新增映射清单；精确等级技能图及原图修正见[资源证据](validation/spirit-detail-assets-20261114.json)。392组合检查不等于98种技能逐项画面，也不替代发布包/MySQL验证。

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

    // 登录后配置包已安装，页面同步读取唯一配置仓库。
    const item = GameConfig.instance.getConfig(GConfig.Item, itemId); // ItemRow | undefined
    const rows = GameConfig.instance.getConfig(GConfig.Item);        // 稳定只读数组
    const required = GameConfig.instance.requireConfig(GConfig.Item, itemId);
    const state = GameConfig.instance.status(GConfig.Item);
    const file = GameConfig.instance.getFile(GConfig.Item);         // 同一份类型化只读文件，不发请求
    const buff = GameConfig.instance.getFileByPath("config/buff");  // 未类型化的同一包内文件，不发请求

LoadingPlan是唯一人工加载时机入口：login准备2份启动表；enterGame先执行`{configPackage:true}`，由RemakeConfigUtils准备完整配置包，再允许进入主城；background只按现有页面或美术目标继续。原city、hero、heroDetail、inventory四组方法，以及各页面注册中的配置prepare已移除，不再在开页时补下载或扩大模块准备范围。普通资源目标即使类型为JsonAsset，也只加载该资产，不再根据路径隐式提交GameConfig；需要启动配置时显式使用config目标。“文件已下载”与“配置已校验提交”分别记录完成，同地址实际下载仍由原资源池合并；先加载原始JSON也不能跳过后续显式配置解析，已有回归覆盖。游戏页面直接查询同一仓库，缺必需配置明确失败，不用静默空表或另一套缓存兜底。

业务代码优先用现有GConfig类型查询，尚未类型化的表使用getFileByPath读取同一仓库，不新增路径映射或模块加载清单。CityHubView已移除旧loadConfig注入、三表Promise.all及缺表回退null，直接同步读取三张主城表，未安装时由开页就绪状态明确失败；图片、特效和骨骼的真实异步加载仍保留。MainChapterHeroTalk通过纯查询回调复用GameConfig的Language主键索引，不再在每个挂机页复制整张语言表建立Map。

GameConfig是业务配置唯一驻留仓库：启动源复制隔离；解包后的对象直接移交仓库，类型化表逐字段校验、建立唯一主键索引并深冻结，其余包内源表也深冻结并支持按路径同步查询。类型化查询、路径查询和索引共享同一份行对象，不再建立另一套解析结果缓存；临时ZIP字节和解包容器不保存在静态工具中。安装全部校验完成后原子提交，失败、取消或迟到结果保留原先可用快照，成功前不更新包版本。BufferAsset使用现有资源池的临时作用域，成功、失败或取消均在finally撤回持有，不作为应用长期预载目标；撤回引用不等于进程内存立即下降。

getConfig未就绪抛ConfigUnavailable；status区分unloaded/failed，有有效旧表时仍为ready并保留最近错误；已加载空表返回空数组，缺行返回undefined，requireConfig缺行抛ConfigRowMissing。getFileByPath只读已提交路径，不存在时抛ConfigUnavailable，不补发资源请求。启动prepare的version仍隔离迟到请求，应用启动读取器只接受initial；完整包使用manifest内容版本，同版成功安装后重登复用。配置进度来自真实加载、逐表解码和索引准备任务，不是下载字节百分比，也不表示签名验证完成。

旧ConfigDb、GroupedConfig、loadAll、gameCatalog/rosterCatalog/bindTables/lookups已删除。BagItemCatalog和HeroCatalog现在都是无状态静态显示工具：不需要new，不保存配置Map，不由View持有，也不接收页面传来的整张Item/Language表。名称、品质等简单字段直接getConfig；涉及物品分类、期限排序、精灵实例技能、头像回退等真实显示规则时才调用已有工具，不为一次取字段再加包装层。

```ts
// 已安装配置直接查主键；没有当前行时按该页面的缺失语义处理，不触发下载。
const item = GameConfig.instance.getConfig(GConfig.Item, itemId);
const typePrefix = GameConfig.instance.getConfig(GConfig.Language, 47086)?.value;

// 需要组合真实实例与配置才能得到显示结果时，复用无状态计算。
const spiritDetail = BagItemCatalog.spiritDetail(spirit);
const heroFace = HeroCatalog.find(hero.templateId);
const equipmentDetail = EquipmentDetailUtils.read(itemId);
const itemDetail = item ? ItemDetailUtils.read(item, { inventory: true }) : null;
```

SpiritInfoView.onOpen只登记当前实例键、按钮和库存监听；refresh从BagModel重读该精灵后调用静态spiritDetail，不再每次打开传四张表建Catalog。EquipmentDetailSource已删除，装备详情不再组装六表参数，EquipmentDetailUtils直接查询同一GameConfig；ItemDetailUtils.read直接查Language主键，不再传语言整表。仍保留旧评分逐条ceil、套装阈值、富文本和按钮条件等规则，不能将这些计算误删为重复映射。

GameConfig拥有已安装文件和类型化主键索引，但不表示所有业务字段都是主键：ScoreCount的主键为idx，装备按mapping匹配属性；套装按type/num组合筛选；未类型化mainlevel仍从同一只读文件按level匹配。当前这些查询直接匹配只读行，不在页面重建Map，也不将属性编号当成ScoreCount主键。页面搜索/筛选列表、库存投影、布阵草稿、战斗单位/血量/Buff及本场表现资源Map有各自运行职责，继续保留。

本轮沿用BagItemCatalog/HeroCatalog现有路径、类名和meta UUID，不为统一命名再加一层工具或兼容转发。前述19:54/20:14发布记录属于配置包接入批次，不能覆盖本轮无状态查询改造；当前源码、画面和发布验证范围以[开发进度](development-progress.md)为准。

## 类型化资源

图片统一经ResManager按目录和原始文件名获取；不维护资源名或可用ID清单。CommonUiResources、ResourceCatalog和config/resource-catalog.json已删除。ResourceTypes只保存类型契约，ResourceAssetsUtils/ResourcePool负责请求合并与持有释放。

```ts
ResManager.setSprite(iconNode, ResManager.ui("common", "other_rare-4"));
const frame = await ResManager.getSpriteFrame(ownerNode, ResManager.ui("hero", "hero-icon_elem-1"));
const target = ResourceAssetsUtils.describe("spine", "jiemian", "SkeletonData");
```

静态图片优先直接绑定Prefab。动态缺图在实际加载失败时记录路径/原因，候选默认图由调用方指定。直接getSpriteFrame返回Promise，失败交给调用方处理；不承诺未加载资源同步可取。

LoadingPlan显式配置三个阶段。tools/generate_resources.cjs只生成Prefab UUID身份索引和PrefabPlanUtils准入，不扫描图片、不生成模块资源描述；运行加载没有UUID地址回退。保留Prefab序列化引用和原UUID。[resource-missing.json](../config/resource-missing.json)仅为历史审计。

ResourceAssetsUtils复用ResourcePool的请求去重、失败重试、持有计数与关闭隔离；作用域退出只撤回自己的引用，由引擎按现有依赖和引用决定回收，不强制releaseAsset。页面实例与闲置Prefab回收已实现，阶段美术预加载和活动实例继续受保护；完整纹理内存预算、真实CDN下载和长期性能测量尚待完成，具体参数见[加载与缓存维护](staged-resource-loading.md)。

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
