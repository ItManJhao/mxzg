# Bundle目录与三段加载维护

截至 2026-11-25，`client/assets/bundles` 下有 31 个业务与素材 Bundle。Creator 随主包发布 `bootstrap`，其余 30 个配置为远程包。远程资源在对应阶段或使用时按依赖加载。

| 源目录 | 内容 | 维护入口 |
|---|---|---|
| `assets/bundles/module` | 23 个页面及模块包，包括本地启动包、主城、背包、英雄、战斗、副本、公会、社交、黑市和铁匠铺 | 各模块根目录的 `.meta` 声明 Bundle，View 的 `@UIRegistry.view` 登记页面预制体 |
| `assets/bundles/resources` | 8 个共用素材包，分别为 audio、chapter、config、effects、font、icons、maps、spine | 美术按类别归包，阶段性准备目标由 [LoadingPlan](../client/assets/scripts/app/remake/LoadingPlan.ts) 统一配置 |

两个父目录用于组织源文件。运行时按包名和包内路径查找资源，例如背包页使用 `bag/prefabs/BagView`，特效使用 `effects/包内路径`。模块的自动图集由 Creator 在构建时处理。

聊天、好友、邮件、任务与成就、排行和发奖的预制体及专用图片分别归 `chat`、`friend`、`mail`、`quest`、`ranking`、`reward`。个人资料、设置、改名与装饰选择归 `role`，登录、选服、更新、首次命名和新手礼归 `login`。共用物品格、外框、确认、输入、规则、红点和跨业务图片归 `common`。打开业务入口时按 View 的当前注册地址加载，静态依赖继续用原 UUID。

目录与 UUID 的历史核对分别见[目录分组](validation/bundle-directory-groups-20261111.json)和[特效拆包](validation/battle-effects-move-20261113.json)。2026-11-14 的 [Web 发布产物](validation/config-package-release-review-20261114.json)对应当时的 16 个源 Bundle。近期功能与预览数据见[开发进度](development-progress.md)。

## 人工修改入口

登录成功后，`LoadingPlan.enterGame` 先安装配置包，再并行准备主城特效组。该组包含召唤阵、两组河流、光球、裂缝的 50 帧、`dx` 和 `chuanghu` 两套骨骼，以及 `dx` 播放失败时使用的 10 帧后备动画。主城沿用同一资源池和帧序列，完成后才进入页面，播放时直接复用已就绪资源。未在主城实际播放的同目录效果继续按需。

主城与背包的一级页面预制体在进城前准备。主城显示后，后台队列先准备英雄、主线、副本大厅、公会和 VIP 的入口预制体，然后准备背包详情和英雄详情，每项开始前让出一帧。副本大厅、公会沿用底栏配置和本次进城角色等级，锁定入口跳过预载。角色在本次登录内解锁后点击，可立即按正常开页流程加载。预载只涉及这些预制体及其静态依赖，角色骨骼和技能按玩法准备。

- 页面：assets/bundles/module/模块/prefabs。对应View的@UIRegistry.view保存唯一注册地址及缓存/模态配置；修改布局直接编辑Prefab，不到ApplicationPages重复登记地址。配置在进入主城前统一完成，页面不再登记配置prepare；必要的页面装配和美术资源prepare继续保留。
- 动态图：assets/bundles/module/模块/ui，取图使用ResManager.ui(模块, 文件名)，例如common/ui/other_rare-4。ui只是模块内图片子目录，不是旧顶层目录。
- 图集：模块atlas（共用物品选中图位于common/item-atlas），由Creator自动合图。
- 大图：模块background或共用maps/ui；不为合图强行缩小大图。
- 动态素材：icons、spine、audio、font、config、chapter、effects各按类别归包，保留原文件名与UUID；effects内的帧图不为拆包重新合图或重编码。
- 阶段：LoadingPlan.ts是唯一人工时机配置，页面写`{page:BagView}`等View类引用，登录后配置写`{configPackage:true}`，其余美术直接列资源目标；不把同模块全部美术自动加入预加载。

## 配置包与真实任务进度

登录前的启动表由 `LoadingPlan.login` 声明。以 2026-11-24 的包为准，2 张启动表独立读取，其余 67 张表打进 config Bundle 的一个 `game-config.bin`。进城阶段加载这一个资源，解压、校验并把索引安装进 `GameConfig`。页面打开后直接查询映射。

加载页的“加载游戏数据”“整理游戏数据”“准备游戏数据”分别反映准备、解包及建索引进度。进入游戏所需的一份压缩包、两张启动表和引擎元数据可在网络面板中分别辨认。包内表数以生成的 manifest 为准。

配置只由GameConfig持有，启动表与包表最终共用同一只读路径仓库。类型化表和按路径查询引用同一份数据，已就绪页面同步读取，不在开窗时补请求；未就绪和缺行仍明确失败，不返回假空表。包内未类型化的源表也经过结构/完整性检查并冻结，不产生第二套模块配置缓存。压缩BufferAsset通过现有资源池的临时作用域加载，成功、失败或取消都撤回本次引用，不列入应用长期阶段持有；解包对象移交GameConfig后不由装配工具继续缓存。

前两段进度以实际完成目标为基础；配置包内另报告已完成解码及索引准备的文件数。文字和比例描述任务阶段，不是网络下载字节百分比，不按计时器伪造下载；后台统计分别记录成功、失败和总任务，失败不算完成。取消或旧阶段迟到不能提交配置、更新新阶段进度或允许开主城。运行时检查启动源同版、ZIP目录、文件字节数与CRC32；CRC只能检测损坏，不是可信内容签名，远程签名安装与回滚尚未实现。

源 JSON 与原 meta 供策划导出和后端共享。生成器按启动目标和原 UUID 维护构建过滤规则。默认 Excel 导出会更新压缩包，手动编辑源 JSON 后执行 `node tools/generate_config_package.cjs --write`，提交前用 `--check` 核验包、过滤规则及解码器。[配置维护说明](config-pipeline.md#客户端压缩包与源表保留)

背包、英雄列表与英雄详情均直接加载对应完整页面Prefab，背景、纸面及英雄列表板是静态引用，不再额外加载PagePrefabShell或HeroListBoardView片段。Widget保存布局，ViewportScale只负责一个目标容器的统一比例；弹窗模态由ViewSpec配置，UIManager动态共用一份节点，不再加载各窗蒙版。它们不增加阶段资源清单。

普通装备EquipmentInfoView仍按需打开，配置改为直接读取已安装的GameConfig，不新增背包模块资源清单。完整Prefab静态绑定标题、分区及按钮，动态图标复用ResManager与原资源池；详情关闭只撤回本页引用，不扩大阶段美术常驻。普通装备前批核对24张既有依赖、17张修正原RGBA并保留UUID，证据见[记录](validation/equipment-detail-assets-20261114.json)，当批本机限定复验已完成三档装备、英雄往返及关闭/注销，详情按需打开和共享取图正常，见[最终记录](validation/equipment-detail-review-20261114.json)。设备选项393×852、浏览器1280×720，不扩大为本次配置包、真机或完整三段耗时结论；未新增发布包体量结论。

普通道具/精英碎片复用原BagInfoView和common包的BagItemView，不增加三段目标；打开详情时同步读取已安装配置，不再通过页面prepare准备表。星、角标、进度原图由既有Prefab依赖带入，动态物品图仍由ResManager/原资源池获取，关闭撤回本页引用。只有背包开启碎片库存进度，共享奖励和产物格不因此额外加载库存或合成业务。3张原图RGBA修正保留UUID，见[资源记录](validation/item-shard-assets-20261114.json)；前批本机限定复验见[最终复验](validation/item-shard-review-20261114.json)，不能替代本次配置包检查，没有新构建或下载体量结论。

正文改为Prefab内既有位置的cc.RichText，普通库存、奖励和产物Face由ItemDetailUtils.richText统一生成richBody，保留旧br/字面量`\n`换行及合法font颜色；不是把礼包内容简单剥成Label。584条纯投影/文字等值专项通过。此变更没有新增配置、模块资源清单、阶段目标或Bundle，仍复用现有资源池；追加本机只重验富文本颜色/换行、长文首末、随机碎片及关闭/注销，不将第一阶段UI矩阵称为全部重跑，完整范围见同一[最终证据](validation/item-shard-review-20261114.json)。

实际打开页面时，UIManager按@UIRegistry.view的唯一注册取得Prefab，页面同步查询GameConfig；当前页面注册不再挂配置prepare。阶段预加载同样只读取页面spec.prefab，统一经资源池准备目标，不调用View.load、不创建界面或查询玩家状态。ApplicationResources负责三段调度、任务状态和美术目标持有，配置包使用短期独立作用域。preparedPage/homePage/heroPage等各页取址包装已移除；应用依赖通过bindViewRuntime窄绑定createBinding或动态hostId，不能借此另写页面路径或加载清单。

主城子视图也同步读取已安装GameConfig，旧异步loadConfig注入和缺表默认布局兜底已删除，缺配置明确开页失败。挂机对话复用仓库已有语言主键索引；业务显示投影和按页面拥有的美术缓存仍按各自职责保留，不因改配置加载而删除必要的列表分组或资源作用域。

例如在LoadingPlan导入BagView后，将`{page:BagView}`放入enterGame；改页面Prefab路径只改BagView的@UIRegistry.view，加载计划自动读取同一地址。游戏配置统一由此前的`{configPackage:true}`完成，不在各页旁边重新列出所需表。装饰器只登记已导入的View，不扫描目录。

直接图片仍使用包名/包内路径，例如ResManager.ui("common", "other_rare-4")；ResManager负责SpriteFrame后缀，底层按Bundle加载。没有旧resources别名或运行时文件存在性清单。

## 集中构建

需要核对真实发布产物时使用 [Web 构建脚本](../scripts/build-remake-h5.bat)，也可从仓库根执行下列命令。日常开发按改动运行相关专项及 Creator 本机预览。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File client/tools/build-remake-h5.ps1
```

唯一默认选项在client/tools/remake-h5.build.json：Web手机端、竖屏、Remake场景、全部Bundle、本地主包、关闭MD5缓存/调试、开启自动图集；远程Bundle仍沿各自meta配置。默认资源服务器为http://127.0.0.1:7460/，可用-ResourceServer覆盖；-CreatorPath/MXZG_CREATOR_PATH与-PythonPath/MXZG_PYTHON指定本机工具，不提交个人安装路径。-PrepareOnly只准备并核验隔离输入，不启动Creator或替换可运行产物。

隔离目录client/temp/remake-h5-project/client保持Creator工程结构，兄弟tools/config保留构建扩展所需相对路径；复制当前源资源、脚本、扩展、依赖和工具，不复制旧profiles覆盖统一选项。仅完成Creator构建和产物检查后才复制到client/build/remake-h5，旧验收目录不在准备阶段清空。日志在client/temp/remake-h5-build，prepared.json记录本次真实输入；产物mxzg-build.json记录源摘要、配置包和资源服务器，不能仅凭旧目录存在判定本次已成功。

当前扩展应打印`config-package-artifact-v1 v1.8.1`及onBeforeBuild、onBeforeCompressSettings、onAfterBuild实际身份。稳定hooks.js每次重读build-hooks.cjs及源目录定位工具；before只读核验配置包、源表过滤与生成解码器，过期即拒绝，不在工作进程内生成尚未导入资源。after对所有Bundle执行配置包产物检查，再核对bootstrap与旧原图清理。包版本号或静态检查通过不能证明真实钩子执行，最终须核对本轮日志与实际输出；1.7.0仅配置前置核验以及更早bootstrap-preload-v1结论均只作历史，见[旧证据](validation/bundles-auto-build-20261111.json)。

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

图集继续构建；所有源图迁入Bundle后具有动态加载路径，config/ui-atlas-dedupe.json的删除名单为空。当前UI资源构建检查1.8.1的旧原图清理应报告0项，不再按历史43项删图。配置散表使用构建前的官方Bundle过滤，不进入这份删图名单；构建体积仍需检查，不以合图或过滤规则存在等同于实际产物已去重。

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
| 已关闭页面实例 | [UIManager.ts](../client/assets/scripts/framework/ui/UIManager.ts) | `cacheIdleMs = 600_000` 毫秒（10 分钟），`maxCachedPages = 6` |
| 闲置预制体模板 | [PrefabLoader.ts](../client/assets/scripts/framework/assets/PrefabLoader.ts) | `PREFAB_IDLE_MS = 600_000` 毫秒，`MAX_IDLE_PREFABS = 16` |
| 预制体维护频率 | [RemakeApp.ts](../client/assets/scripts/app/remake/RemakeApp.ts) | 前台累计每 30 秒检查一次 |

除已标明仓库根的工具外，以上路径相对client/assets/scripts。参数只在代码入口维护，不增加模块清单。

阶段预载的美术由 ApplicationResources 持有至应用销毁。配置包 BufferAsset 的引用持续到本次安装结束，已解析配置由 GameConfig 持有。背包等已启用页面缓存的实例在关闭后可保留 600 秒，期间移除页面监听，重开时读取最新 Model。第七个页面进入缓存时立即淘汰最早关闭的页面。根页面替换和卸载会清空闲置页面。

PrefabLoader 在最后一个实例销毁后开始计算预制体的闲置时间。应用前台每 30 秒维护一次，淘汰超时的闲置预制体，数量超过 16 份时优先淘汰最久未用的。按时长到期的预制体在前台通常闲置 600～630 秒后回收，后台暂停会推迟。页面和模板分别计时，例如背包实例关闭 600 秒后销毁，此时模板才开始独立的 600 秒闲置计时。应用仍持有的预载引用继续生效。

加载器只撤回自己的引用，阶段目标或其他实例仍持有时资源继续有效。ResManager.setSprite为每个图片节点保留当前显示与本次在途候选：新图赋值后才释放旧显示，相同当前图/在途任务复用，null、失效或销毁清理，不累积虚拟Cell访问过的历史图片。getSpriteFrame(owner)仍用显式节点作用域直到owner销毁；setSprite(null)不撤回该引用。图片的生命周期按其持有者管理，实际进程和 GPU 内存由引擎及平台回收。


## 前批自然回收实测边界

2026-11-11 使用当时的 120 秒策略实测，背包首次打开 10.5 ms，短期重开复用同一实例，耗时 3.7 ms。关闭 120,001 ms 后实例销毁，重开 7.3 ms。未预载的资料页模板约在 141.8 秒后回收，重开耗时 88.5 ms。当前 600 秒策略下的副本重进数据见[本机复验](development-progress.md#11-月-24-日的体验与性能复验)。

上述时间是UIManager打开Promise；背包实例到期重开仍有按需角色骨骼等后续请求，英雄/挂机重开也不保证零下载。资源拥有者退出后可撤回引用，缓存条目消失不等于GPU或进程内存已立即降低；不能据此认定长期无泄漏。
