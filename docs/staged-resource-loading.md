# Bundle目录与三段加载维护

## 当前批次已完成：Bundle目录整合与本地远程验收

2026-11-11 19:56集中构建已确认自动链路生效。before/after均执行bootstrap-preload-v1 v1.6.2，最终预载包含main、bootstrap，startupPreloadRepaired=false；本轮检查没有修改构建配置。104个远程包输出、循环依赖、本地启动依赖及背包共用资源归属均通过。本地资源6,220,784字节，远程资源665,636,594字节；字体仍是本地资源主要来源，未裁剪。见[自动构建证据](validation/bundles-auto-build-20261111.json)。

资源已实际从顶层ui/resources/prefabs整合到assets/bundles，assets下仅保留bundles、scenes、scripts。原有21,902个非目录资源UUID全部保留，100个Prefab索引已重生成。页面、图片、图集和背景按模块归属；图标、骨骼、音频、字体、配置按素材类别归包。未开放模块的旧素材保留所属类别。加载统一为包名/包内路径，沿用原ResourcePool及LoadingPlan三段显式配置，其余按需；原图进入Bundle后有动态地址，旧副本删除名单为空。

运行验收使用独立内存测试环境：背包四分类详情、英雄六元素/详情/技能、布阵、真实主线胜利/失败、奖励、经验动画、双方战报及返回挂机均已检查。经验实测80/360逐步增至280/360，与服务器回执一致；正常流程无资源警告/错误。19:42包运行证据与19:56包自动链路证据分开保存，不把之前手工补启动配置当成自动构建成功。见[运行证据](validation/bundles-final-review-20261111.json)。

本批可以收口，不再重复要求构建。真实CDN、原生/微信/真机及长期内存仍待后续授权；Python工具路径已调整但专项尚未运行。字体裁剪仅记录为体积来源，不在本批改变表现。玩法范围、WS＋Protobuf、服务端权威与幂等结算保持；宝箱领取、快速战斗、升级及穿脱继续关闭。

在hao开发，未提交推送，main合并由负责人决定；独立测试服务已关闭。后续工作由负责人选择，不自动恢复暂停玩法。

## 人工修改入口

- 页面：assets/bundles/模块/prefabs，与View的@view地址一致，例如bundles/bag/prefabs/BagView。修改页面布局直接编辑Prefab。
- 动态图：assets/bundles/模块/ui，取图使用ResManager.ui(模块, 文件名)，例如common/ui/other_rare-4。ui只是模块内图片子目录，不是旧顶层目录。
- 图集：模块atlas（共用物品选中图位于common/item-atlas），由Creator自动合图。
- 大图：模块background或共用maps/ui；不为合图强行缩小大图。
- 动态素材：icons、spine、audio、font、config各按类别归包，保留原文件名与UUID。
- 阶段：LoadingPlan.ts是唯一人工时机配置，不把同模块全部资源自动加入预加载。

示例：ResourceAssetsUtils.describe("hero", "prefabs/HeroListView", "Prefab")；其源地址自动为bundles/hero/prefabs/HeroListView。直接图片路径为包名/包内路径，ResManager负责SpriteFrame后缀，底层按Bundle加载。没有旧resources别名或运行时文件存在性清单。

## 集中构建

首次使用固定钩子入口需完整退出Creator并重新打开工程。扩展重载可能保留旧构建工作进程，包版本号不能证明代码已更新。必须看到before、after两行bootstrap-preload-v1 v1.6.2；稳定hooks.js会每次重读build-hooks.cjs，after读取最终settings并在缺失时补齐bootstrap，再复读校验。19:56真实自动钩子已通过；日志及最终配置见[证据](validation/bundles-auto-build-20261111.json)。

扩展1.6.2在写settings前将bootstrap加入assets.preloadBundles（只准备元数据，不预载远程整包），构建后复读最终文件并补齐缺失。main有deps不代表引擎会自动预载这些包，不能等RemakeApp启动后再补。19:22初包曾因此失败，详细复验见[记录](validation/bundles-release-20261111.json)。

重新打开Creator让它导入迁移并识别所有Bundle。沿用Web手机端、竖屏、Remake场景；“包含的Bundles”选全部，bootstrap本地，其余沿用远程游戏资源配置；主包不要勾远程。资源服务器地址保持http://127.0.0.1:7460/。当前检查按关闭MD5缓存和调试模式的产物验证。

    node client/tools/remote-bundles-check.cjs client/build/bag-atlas-review
    node client/tools/ui-atlas-check.cjs --build-output client/build/bag-atlas-review
    node client/tools/serve-remote-bundles.cjs client/build/bag-atlas-review 7460

第一个命令检查源码/构建包一致、循环依赖、本地启动依赖和产物大小。第二个验证背包与共用格子归属。第三个只提供本机远程资源，不提供游戏API。浏览器仍使用独立测试服WS＋Protobuf。

远程包不等于整包立即下载，也不等于常驻内存；加载元数据后只加载目标及依赖。离线启动、真实下载重试及首包体积以新构建实测为准。105个目录包含未开放模块的旧素材分类，不等于105个已开放功能。

## 自动图集与旧删除扩展

图集继续构建；所有源图迁入Bundle后具有动态加载路径，config/ui-atlas-dedupe.json的删除名单为空。UI资源构建检查1.6.2因此应报告0项，不再按历史43项删图。构建体积仍需检查，不以合图等同于去重。

## 人工维护入口与缓存边界

| 修改目标 | 代码入口 | 当前参数或规则 |
|---|---|---|
| 三阶段准备目标 | app/remake/LoadingPlan.ts | login、enterGame、background三个数组 |
| 页面地址与实例缓存 | 对应View的@view注册 | 背包启用cache:true，英雄/战斗不启用 |
| 统一取图 | framework/assets/ResManager.ts | 路径规则、获取、赋图及迟到保护 |
| 页面闲置回收 | framework/ui/UIManager.ts | cacheIdleMs=120000毫秒，maxCachedPages=2 |
| 预制体闲置回收 | framework/assets/PrefabLoader.ts | PREFAB_IDLE_MS=120000毫秒，MAX_IDLE_PREFABS=16 |
| 预制体维护频率 | app/remake/RemakeApp.ts | 前台累计每30秒检查 |

以上路径相对client/assets/scripts。参数只在代码入口维护，不增加模块清单。

阶段预加载由ApplicationResources持有至应用销毁。背包关闭后保留实例120秒，隐藏期间清理业务监听，重开读取最新Model；根页面替换和卸载清空闲置页面。当前显示与在途打开不参与淘汰。

PrefabLoader保护实际实例，最后一个实例退出后开始闲置计时。维护时淘汰超时或最久未使用的超额项；16份仅指闲置条目，不是内存预算或全部资源上限。前台通常120–150秒回收，后台暂停会推迟。页面实例和预制体计时独立，背包可能先等待实例120秒，再开始预制体120秒。

加载器只撤回自己的引用，阶段预加载或其他实例仍持有时资源继续有效。普通动态图沿用ResourcePool最后拥有者退出即撤回引用；部分公共资源有独立常驻拥有者。未新增通用图片闲置池或强制GC，引用释放不等于进程内存立即下降，JavaScript堆也不代表GPU内存。
