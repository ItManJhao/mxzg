# Bundle目录与三段加载维护

当前资源已从顶层ui/resources/prefabs整合到assets/bundles；104远程包和本地bootstrap已完成集中构建验收。LoadingPlan仍是唯一三段显式配置，其余按需，沿用ResManager和ResourcePool，不另维护模块清单。目录迁移时21,902个非目录UUID保留是历史基线；本批主动退役旧布局资产后，当前96份Prefab（含场景共97份），仍用资源UUID保持不变。

已推送基线hao/f3cd64a3，main未合并；上一批工具及文档收尾、加载/开页/缓存实测已通过，见[工具证据](validation/migration-tools-review-20261111.json)。本批只改变共享模态和完整页面布局，不改三段配置或资源池；专项和本机限定预览通过，未提交推送、未重建发布包。当前状态与下一步集中验包统一见[进度页](development-progress.md)。

本机单轮配置目标准备：login 368.2ms、enterGame 547.5ms、background 470.6ms（4/4）；页面Promise不含过渡及按需图/骨骼。此测量没有重跑完整主线，不能代替正式CDN、真机或长期内存验证。见[测量边界与请求记录](validation/loading-cache-review-20261111.json)。后续仅列计划，未开始实施。

## 人工修改入口

- 页面：assets/bundles/模块/prefabs，与View的@view地址一致，例如bundles/bag/prefabs/BagView。修改页面布局直接编辑Prefab。
- 动态图：assets/bundles/模块/ui，取图使用ResManager.ui(模块, 文件名)，例如common/ui/other_rare-4。ui只是模块内图片子目录，不是旧顶层目录。
- 图集：模块atlas（共用物品选中图位于common/item-atlas），由Creator自动合图。
- 大图：模块background或共用maps/ui；不为合图强行缩小大图。
- 动态素材：icons、spine、audio、font、config各按类别归包，保留原文件名与UUID。
- 阶段：LoadingPlan.ts是唯一人工时机配置，不把同模块全部资源自动加入预加载。

背包、英雄列表与英雄详情均直接加载对应完整页面Prefab，背景、纸面及英雄列表板是静态引用，不再额外加载PagePrefabShell或HeroListBoardView片段。Widget保存布局，ViewportScale只负责一个目标容器的统一比例；弹窗模态由ViewSpec配置，UIManager动态共用一份节点，不再加载各窗蒙版。它们不增加阶段资源清单。

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


## 前批自然回收实测边界

背包首开10.5ms、短期重开3.7ms复用同一实例；关闭120001ms后实例自然销毁，再开7.3ms为新实例，预加载Prefab仍由应用持有。未预加载资料页的Prefab约141.8秒后在维护周期回收，再开88.5ms完成重载。没有缩短TTL、手动强制回收或强制GC。

上述时间是UIManager打开Promise；背包实例到期重开仍有按需角色骨骼等后续请求，英雄/挂机重开也不保证零下载。资源拥有者退出后可撤回引用，缓存条目消失不等于GPU或进程内存已立即降低；不能据此认定长期无泄漏。
