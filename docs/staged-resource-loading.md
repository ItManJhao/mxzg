# Bundle目录与三段加载维护

当前目录采用两层普通分组；2026-11-13将章节地图归入resources，并将战斗帧特效拆为独立effects包：

```text
assets/bundles/
├─ resources/                 通用素材分类；不是Bundle
│  ├─ audio/
│  ├─ chapter/                章节地图及挂机场景素材
│  ├─ config/
│  ├─ effects/                战斗帧特效，独立远程Bundle
│  ├─ font/
│  ├─ icons/
│  ├─ maps/
│  └─ spine/
└─ module/                    页面与模块素材；不是Bundle
   ├─ bootstrap/              启动必需，本地Bundle
   ├─ login/
   ├─ home/
   ├─ bag/
   ├─ hero/
   ├─ battle/
   ├─ common/                 跨页面共用格子、底板与界面图片
   └─ gm/                     当前开发入口，local默认开启、production不装配
```

上述16个子目录是Bundle，其中15个远程、bootstrap本地；两个父目录均不勾选“配置为Bundle”。原15包的名称、优先级与远程配置不变，新增effects沿用原特效目录UUID并声明为远程包。这里的resources在assets/bundles内，是普通分组，不是Creator内置的顶层assets/resources目录，也不合并成一个大包。新增模块时在module内建立自己的Bundle，不需要另维护包名到目录的资源清单。

物理源路径与运行时加载键分开。例如背包页面的唯一注册源路径为`bundles/module/bag/prefabs/BagView`，加载器交给引擎的仍是Bundle `bag`内的`prefabs/BagView`；品质框仍用`common/ui/other_rare-4`。CDN输出继续是`remote/bag`、`remote/common`等，不因为分组而多加resources/module。三段配置、缓存和按需加载规则保持。

战斗特效现位于`assets/bundles/resources/effects`，运行时使用`effects/包内路径`，不再使用`battle/effects/包内路径`。该目录内12,841份原文件（含6,237张图片、6,603份meta及1份效果文件）哈希全部保持；只有原根目录meta新增effects包声明，UUID不变。旧`battle/effects`物理地址只供离线工具定位历史证据，不是运行时兼容入口。见[特效拆包记录](validation/battle-effects-move-20261113.json)。本轮按指令未运行Creator预览或构建，不以源目录检查代替新包下载验收。

common、bag、hero、battle的自动图集全部保留：目录分类负责人工查找，pac负责构建合并小图。common两份图集服务跨模块公共UI，bag图集保留背包专用分隔线；背景、立绘、物品图标和骨骼仍独立存放。代码不加载pac，也不为这次目录整理改为实体图集。

保留不表示每个图集都是功能必需：common/atlas当前有7张小图，common/item-atlas和bag/atlas各只有1张，后两者当前合图收益有限，可以后续单独精简pac而保留原图。本次只迁目录，未删除或重建图集及UUID。

2026-11-11的15包目录分组批次通过52项、类型、原文件字节及新目录独立环境预览检查，见[当批记录](validation/bundle-directory-groups-20261111.json)；当时背包、英雄、850关和真实第二关结算返回正常。该轮未构建，不能替代后续chapter/effects迁移。2026-11-14已用统一入口检查当前16源Bundle的实际输出（含引擎共18包）、依赖、配置过滤及本地远程下载，并完成限定发布运行，见[新发布记录](validation/config-package-release-review-20261114.json)。真实CDN与真机体量另验。

资源统一在assets/bundles，当前16包（15远程＋bootstrap）、36份Prefab及49份共享目录JSON（含前批attrshow；类型化20表、Maven共享32表）。配置包接入前最近一次资源检查记录为170份TS、21个独立View，37份Prefab/Scene共86处绑定；本批增加配置包解码及生成脚本，不新增Prefab、View或Bundle。此前90未实现包和64旧Prefab清理的[15包历史记录](validation/current-resource-scope-cleanup-20261111.json)保持原样，范围检查已合并effects拆包、精灵专用详情、两份GM子窗、普通装备详情，以及既有道具/碎片组件调整。SpiritInfoView与EquipmentInfoView按需加载，未加入LoadingPlan，不新增模块资源清单。历史104远程包＋bootstrap、96Prefab及21,902个UUID不能写成当前范围；此前源目录减少约203.30MiB，不是新构建或下载体积。LoadingPlan仍是唯一三段显式配置，美术其余按需，复用ResManager和ResourcePool，不维护模块清单。

目录分组之前的51项、类型和本机背包/英雄/850关/真实第二关闭环见[前批证据](validation/virtual-list-resource-review-20261111.json)。上述记录中的未提交状态、包数量和路径均是当时快照，当前交付状态统一见[开发进度](development-progress.md)。历史预览或构建包不能替代新路径的发布验证；真实CDN和真机仍待完成。

2026-11-11使用当时发布包测得单轮配置目标准备：login 368.2ms、enterGame 547.5ms、background 470.6ms（4/4）；页面Promise不含过渡及按需图/骨骼。此测量没有重跑完整主线，不代表当前源码的耗时，也不能代替正式CDN、真机或长期内存验证。见[测量边界与请求记录](validation/loading-cache-review-20261111.json)。

## 人工修改入口

- 页面：assets/bundles/module/模块/prefabs。对应View的@UIRegistry.view保存唯一注册地址及缓存/模态配置；修改布局直接编辑Prefab，不到ApplicationPages重复登记地址。配置在进入主城前统一完成，页面不再登记配置prepare；必要的页面装配和美术资源prepare继续保留。
- 动态图：assets/bundles/module/模块/ui，取图使用ResManager.ui(模块, 文件名)，例如common/ui/other_rare-4。ui只是模块内图片子目录，不是旧顶层目录。
- 图集：模块atlas（共用物品选中图位于common/item-atlas），由Creator自动合图。
- 大图：模块background或共用maps/ui；不为合图强行缩小大图。
- 动态素材：icons、spine、audio、font、config、chapter、effects各按类别归包，保留原文件名与UUID；effects内的帧图不为拆包重新合图或重编码。
- 阶段：LoadingPlan.ts是唯一人工时机配置，页面写`{page:BagView}`等View类引用，登录后配置写`{configPackage:true}`，其余美术直接列资源目标；不把同模块全部美术自动加入预加载。

## 配置包与真实任务进度

login中的`{config:GConfig.X}`声明登录前启动表，当前为2份；生成器直接读取这段配置确定包外源表，其他47份共享JSON统一写入config Bundle的`game-config.bin`。enterGame先准备这个BufferAsset，再解压、校验、逐表解析和建索引，全部完成才允许打开主城。background继续现有页面Prefab或美术目标，不另外分配city、hero、heroDetail、inventory四组配置；原四组和开页prepare属于此前的历史实现。

这47份是一个压缩包里的配置表，不是47次网络下载。旧文案中的9/47、20/47反映包内解析或索引任务；本批去掉玩家文案中的表数，显示“加载游戏数据”“整理游戏数据”“准备游戏数据”，进度仍根据真实任务推进。两张启动表以及引擎Bundle/BufferAsset元数据分别读取，不能把元数据请求算成游戏配置逐表下载。

配置只由GameConfig持有，启动表与包表最终共用同一只读路径仓库。类型化表和按路径查询引用同一份数据，已就绪页面同步读取，不在开窗时补请求；未就绪和缺行仍明确失败，不返回假空表。包内未类型化的源表也经过结构/完整性检查并冻结，不产生第二套模块配置缓存。压缩BufferAsset通过现有资源池的临时作用域加载，成功、失败或取消都撤回本次引用，不列入应用长期阶段持有；解包对象移交GameConfig后不由装配工具继续缓存。

前两段进度以实际完成目标为基础；配置包内另报告已完成解码及索引准备的文件数。文字和比例描述任务阶段，不是网络下载字节百分比，不按计时器伪造下载；后台统计分别记录成功、失败和总任务，失败不算完成。取消或旧阶段迟到不能提交配置、更新新阶段进度或允许开主城。运行时检查启动源同版、ZIP目录、文件字节数与CRC32；CRC只能检测损坏，不是可信内容签名，远程签名安装与回滚尚未实现。

49份源JSON及原meta继续供Excel导出和后端共享。生成器用原UUID自动维护官方Bundle Asset排除规则，让47份非启动散表不再作为构建入口；不维护47表人工清单，不删源表，也不在构建结束后删JSON引用。正常默认Excel导出自动更新压缩包，直接改共享JSON后运行`node tools/generate_config_package.cjs --write`；`--check`只读核验包、过滤及生成解码器。生成细节与命令见[配置维护](config-pipeline.md#客户端压缩包与源表保留)。11-14新发布产物已确认全部包无47份源表副本，config仅两张启动表和唯一408,367字节bin；独立运行解压及开页不再补表已通过，具体网络与限制见[发布记录](validation/config-package-release-review-20261114.json)。

背包、英雄列表与英雄详情均直接加载对应完整页面Prefab，背景、纸面及英雄列表板是静态引用，不再额外加载PagePrefabShell或HeroListBoardView片段。Widget保存布局，ViewportScale只负责一个目标容器的统一比例；弹窗模态由ViewSpec配置，UIManager动态共用一份节点，不再加载各窗蒙版。它们不增加阶段资源清单。

普通装备EquipmentInfoView仍按需打开，配置改为直接读取已安装的GameConfig，不新增背包模块资源清单。完整Prefab静态绑定标题、分区及按钮，动态图标复用ResManager与原资源池；详情关闭只撤回本页引用，不扩大阶段美术常驻。普通装备前批核对24张既有依赖、17张修正原RGBA并保留UUID，证据见[记录](validation/equipment-detail-assets-20261114.json)，当批本机限定复验已完成三档装备、英雄往返及关闭/注销，详情按需打开和共享取图正常，见[最终记录](validation/equipment-detail-review-20261114.json)。设备选项393×852、浏览器1280×720，不扩大为本次配置包、真机或完整三段耗时结论；未新增发布包体量结论。

普通道具/精英碎片复用原BagInfoView和common包的BagItemView，不增加三段目标；打开详情时同步读取已安装配置，不再通过页面prepare准备表。星、角标、进度原图由既有Prefab依赖带入，动态物品图仍由ResManager/原资源池获取，关闭撤回本页引用。只有背包开启碎片库存进度，共享奖励和产物格不因此额外加载库存或合成业务。3张原图RGBA修正保留UUID，见[资源记录](validation/item-shard-assets-20261114.json)；前批本机限定复验见[最终复验](validation/item-shard-review-20261114.json)，不能替代本次配置包检查，没有新构建或下载体量结论。

正文改为Prefab内既有位置的cc.RichText，普通库存、奖励和产物Face由ItemDetailUtils.richText统一生成richBody，保留旧br/字面量`\n`换行及合法font颜色；不是把礼包内容简单剥成Label。584条纯投影/文字等值专项通过。此变更没有新增配置、模块资源清单、阶段目标或Bundle，仍复用现有资源池；追加本机只重验富文本颜色/换行、长文首末、随机碎片及关闭/注销，不将第一阶段UI矩阵称为全部重跑，完整范围见同一[最终证据](validation/item-shard-review-20261114.json)。

实际打开页面时，UIManager按@UIRegistry.view的唯一注册取得Prefab，页面同步查询GameConfig；当前页面注册不再挂配置prepare。阶段预加载同样只读取页面spec.prefab，统一经资源池准备目标，不调用View.load、不创建界面或查询玩家状态。ApplicationResources负责三段调度、任务状态和美术目标持有，配置包使用短期独立作用域。preparedPage/homePage/heroPage等各页取址包装已移除；应用依赖通过bindViewRuntime窄绑定createController或动态hostId，不能借此另写页面路径或加载清单。

主城子视图也同步读取已安装GameConfig，旧异步loadConfig注入和缺表默认布局兜底已删除，缺配置明确开页失败。挂机对话复用仓库已有语言主键索引；业务显示投影和按页面拥有的美术缓存仍按各自职责保留，不因改配置加载而删除必要的列表分组或资源作用域。

例如在LoadingPlan导入BagView后，将`{page:BagView}`放入enterGame；改页面Prefab路径只改BagView的@UIRegistry.view，加载计划自动读取同一地址。游戏配置统一由此前的`{configPackage:true}`完成，不在各页旁边重新列出所需表。装饰器只登记已导入的View，不扫描目录。

直接图片仍使用包名/包内路径，例如ResManager.ui("common", "other_rare-4")；ResManager负责SpriteFrame后缀，底层按Bundle加载。没有旧resources别名或运行时文件存在性清单。

## 集中构建

统一验收入口为[scripts/build-remake-h5.bat](../scripts/build-remake-h5.bat)，也可从仓库根执行：

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File client/tools/build-remake-h5.ps1
```

唯一默认选项在client/tools/remake-h5.build.json：Web手机端、竖屏、Remake场景、全部Bundle、本地主包、关闭MD5缓存/调试、开启自动图集；远程Bundle仍沿各自meta配置。默认资源服务器为http://127.0.0.1:7460/，可用-ResourceServer覆盖；-CreatorPath/MXZG_CREATOR_PATH与-PythonPath/MXZG_PYTHON指定本机工具，不提交个人安装路径。-PrepareOnly只准备并核验隔离输入，不启动Creator或替换可运行产物。

隔离目录client/temp/remake-h5-project/client保持Creator工程结构，兄弟tools/config保留构建扩展所需相对路径；复制当前源资源、脚本、扩展、依赖和工具，不复制旧profiles覆盖统一选项。仅完成Creator构建和产物检查后才复制到client/build/remake-h5，旧验收目录不在准备阶段清空。日志在client/temp/remake-h5-build，prepared.json记录本次真实输入；产物mxzg-build.json记录源摘要、配置包和资源服务器，不能仅凭旧目录存在判定本次已成功。

当前扩展应打印`config-package-artifact-v1 v1.8.0`及onBeforeBuild、onBeforeCompressSettings、onAfterBuild实际身份。稳定hooks.js每次重读build-hooks.cjs及源目录定位工具；before只读核验配置包、源表过滤与生成解码器，过期即拒绝，不在工作进程内生成尚未导入资源。after对所有Bundle执行配置包产物检查，再核对bootstrap与旧原图清理。包版本号或静态检查通过不能证明真实钩子执行，最终须核对本轮日志与实际输出；1.7.0仅配置前置核验以及更早bootstrap-preload-v1结论均只作历史，见[旧证据](validation/bundles-auto-build-20261111.json)。

手动Creator任务继续沿用相同选项。首次使用新增固定钩子入口需完整退出Creator并重新打开工程；扩展重载可能保留旧构建工作进程。手动任务与隔离CLI都运行同一扩展，不能用未带扩展的旧隔离输出替代当前验收。

扩展1.6.2在写settings前将bootstrap加入assets.preloadBundles（只准备元数据，不预载远程整包），构建后复读最终文件并补齐缺失。main有deps不代表引擎会自动预载这些包，不能等RemakeApp启动后再补。19:22初包曾因此失败，详细复验见[记录](validation/bundles-release-20261111.json)。

重新打开Creator让它导入迁移并识别所有Bundle。沿用Web手机端、竖屏、Remake场景；“包含的Bundles”选全部，bootstrap本地，其余沿用远程游戏资源配置；主包不要勾远程。资源服务器地址保持http://127.0.0.1:7460/。当前检查按关闭MD5缓存和调试模式的产物验证。

    node client/tools/config-package-build-check.cjs client/build/remake-h5
    node client/tools/remote-bundles-check.cjs client/build/remake-h5
    node client/tools/ui-atlas-check.cjs --build-output client/build/remake-h5
    node client/tools/serve-remote-bundles.cjs client/build/remake-h5 7460

四个命令依次检查配置包/全部Bundle中的散表归属、资源依赖与产物大小、图集引用，以及启动本机远程资源服务；最后一个不提供游戏API。浏览器仍使用独立测试服WS＋Protobuf。其他手动输出将参数改为其实际目录，不修改旧产物使它伪装成新包；本轮真实构建结论以当前进度的最终记录为准。

远程包不等于整包立即下载或常驻内存；元数据准备后只加载目标及依赖。只保留当前实现模块资源不改变最终完整还原目标，恢复其他模块时从旧项目补回资源并审查路径、UUID与构建归属；不能因旧包目录删除就重新开放玩法。离线启动、重试和下载体积仍需新包实测。

## 自动图集与旧删除扩展

图集继续构建；所有源图迁入Bundle后具有动态加载路径，config/ui-atlas-dedupe.json的删除名单为空。当前UI资源构建检查1.8.0的旧原图清理应报告0项，不再按历史43项删图。配置散表使用构建前的官方Bundle过滤，不进入这份删图名单；构建体积仍需检查，不以合图或过滤规则存在等同于实际产物已去重。

## 人工维护入口与缓存边界

| 修改目标 | 代码入口 | 当前参数或规则 |
|---|---|---|
| 三阶段准备目标 | app/remake/LoadingPlan.ts | login、enterGame、background三个数组 |
| 页面地址与实例缓存 | 对应View的@UIRegistry.view注册 | 背包启用cache:true，英雄/战斗不启用 |
| 登录前启动表 | LoadingPlan.login的config目标 | 生成器自动识别包外表，不另存启动清单 |
| 登录后游戏配置 | LoadingPlan.enterGame的configPackage目标、config/GameConfig.ts | 完整安装后开主城；页面同步读唯一仓库 |
| 配置包生成与过滤 | tools/generate_config_package.cjs（仓库根） | 默认检查；--write更新包、官方UUID过滤和生成解码器 |
| 当前应用装配 | UIRegistry.bindViewRuntime、app/remake/ApplicationPages.ts | 仅注入Controller工厂或动态宿主，不覆盖页面静态定义 |
| 统一取图 | framework/assets/ResManager.ts | 路径规则、获取、赋图及迟到保护 |
| 页面闲置回收 | framework/ui/UIManager.ts | cacheIdleMs=120000毫秒，maxCachedPages=2 |
| 预制体闲置回收 | framework/assets/PrefabLoader.ts | PREFAB_IDLE_MS=120000毫秒，MAX_IDLE_PREFABS=16 |
| 预制体维护频率 | app/remake/RemakeApp.ts | 前台累计每30秒检查 |

除已标明仓库根的工具外，以上路径相对client/assets/scripts。参数只在代码入口维护，不增加模块清单。

阶段美术预加载由ApplicationResources持有至应用销毁；配置包BufferAsset的引用只持续到本次安装结束，已解析配置由GameConfig继续持有。背包关闭后保留实例120秒，隐藏期间清理业务监听，重开读取最新Model；根页面替换和卸载清空闲置页面。当前显示与在途打开不参与淘汰。

PrefabLoader保护实际实例，最后一个实例退出后开始闲置计时。维护时淘汰超时或最久未使用的超额项；16份仅指闲置条目，不是内存预算或全部资源上限。前台通常120–150秒回收，后台暂停会推迟。页面实例和预制体计时独立，背包可能先等待实例120秒，再开始预制体120秒。

加载器只撤回自己的引用，阶段目标或其他实例仍持有时资源继续有效。ResManager.setSprite为每个图片节点保留当前显示与本次在途候选：新图赋值后才释放旧显示，相同当前图/在途任务复用，null、失效或销毁清理，不累积虚拟Cell访问过的历史图片。getSpriteFrame(owner)仍用显式节点作用域直到owner销毁；setSprite(null)不撤回该引用。未改TTL、增加图片闲置池或强制GC，释放引用不等于进程/GPU内存立即下降。


## 前批自然回收实测边界

背包首开10.5ms、短期重开3.7ms复用同一实例；关闭120001ms后实例自然销毁，再开7.3ms为新实例，预加载Prefab仍由应用持有。未预加载资料页的Prefab约141.8秒后在维护周期回收，再开88.5ms完成重载。没有缩短TTL、手动强制回收或强制GC。

上述时间是UIManager打开Promise；背包实例到期重开仍有按需角色骨骼等后续请求，英雄/挂机重开也不保证零下载。资源拥有者退出后可撤回引用，缓存条目消失不等于GPU或进程内存已立即降低；不能据此认定长期无泄漏。
