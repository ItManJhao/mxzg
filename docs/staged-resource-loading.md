# Bundle目录与三段加载维护

当前目录于2026-11-12整理为两层普通分组：

```text
assets/bundles/
├─ resources/                 通用素材分类；不是Bundle
│  ├─ audio/
│  ├─ config/
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
   ├─ chapter/
   ├─ common/                 跨页面共用格子、底板与界面图片
   └─ gm/                     当前已有开发入口，默认关闭
```

只有上述15个原目录仍是Bundle，名称、优先级与远程配置不变；两个父目录均不勾选“配置为Bundle”。这里的resources在assets/bundles内，是普通分组，不是Creator内置的顶层assets/resources目录，也不合并成一个大包。新增模块时在module内建立自己的Bundle，不需要另维护包名到目录的资源清单。

物理源路径与运行时加载键分开。例如背包页面的唯一注册源路径为`bundles/module/bag/prefabs/BagView`，加载器交给引擎的仍是Bundle `bag`内的`prefabs/BagView`；品质框仍用`common/ui/other_rare-4`。CDN输出继续是`remote/bag`、`remote/common`等，不因为分组而多加resources/module。三段配置、缓存和按需加载规则保持。

common、bag、hero、battle的自动图集全部保留：目录分类负责人工查找，pac负责构建合并小图。common两份图集服务跨模块公共UI，bag图集保留背包专用分隔线；背景、立绘、物品图标和骨骼仍独立存放。代码不加载pac，也不为这次目录整理改为实体图集。

保留不表示每个图集都是功能必需：common/atlas当前有7张小图，common/item-atlas和bag/atlas各只有1张，后两者当前合图收益有限，可以后续单独精简pac而保留原图。本次只迁目录，未删除或重建图集及UUID。

本次目录归档的52项、类型、原文件字节和新目录独立环境预览已通过，见[本次记录](validation/bundle-directory-groups-20261111.json)。背包、英雄、850关和真实第二关结算返回正常；未构建发布包，实际合图/包归属和下载体量仍须集中验收。

资源统一在assets/bundles，本批保留15包（14远程＋bootstrap）、32份Prefab及31张实际依赖配置表；90未实现包和64旧Prefab已清理，详见[清理记录](validation/current-resource-scope-cleanup-20261111.json)。历史104远程包＋bootstrap、96Prefab及21,902个UUID不能写成当前范围；源目录减少约203.30MiB，不是新构建或下载体积。LoadingPlan仍是唯一三段显式配置，其余按需，复用ResManager和ResourcePool，不维护模块清单。

负责人于2026-11-12授权本轮成果推送hao并同步main，实际提交以Git为准，后续开发继续hao。目录归档前的51项、类型和本机背包/英雄/850关/真实第二关闭环见[前批证据](validation/virtual-list-resource-review-20261111.json)。新目录检查见[本次归档记录](validation/bundle-directory-groups-20261111.json)，不能以旧预览或构建包代替新路径的重新导入验证；验证记录中的未提交状态是当时快照，真实CDN和真机尚待完成。

本机单轮配置目标准备：login 368.2ms、enterGame 547.5ms、background 470.6ms（4/4）；页面Promise不含过渡及按需图/骨骼。此测量没有重跑完整主线，不能代替正式CDN、真机或长期内存验证。见[测量边界与请求记录](validation/loading-cache-review-20261111.json)。后续仅列计划，未开始实施。

## 人工修改入口

- 页面：assets/bundles/module/模块/prefabs。对应View的@view保存唯一注册地址、缓存/模态及prepare配置前置；修改布局直接编辑Prefab，不到ApplicationPages重复登记地址。
- 动态图：assets/bundles/module/模块/ui，取图使用ResManager.ui(模块, 文件名)，例如common/ui/other_rare-4。ui只是模块内图片子目录，不是旧顶层目录。
- 图集：模块atlas（共用物品选中图位于common/item-atlas），由Creator自动合图。
- 大图：模块background或共用maps/ui；不为合图强行缩小大图。
- 动态素材：icons、spine、audio、font、config各按类别归包，保留原文件名与UUID。
- 阶段：LoadingPlan.ts是唯一人工时机配置，页面写`{page:BagView}`等View类引用，其余资源/配置直接列目标；不把同模块全部资源自动加入预加载。

背包、英雄列表与英雄详情均直接加载对应完整页面Prefab，背景、纸面及英雄列表板是静态引用，不再额外加载PagePrefabShell或HeroListBoardView片段。Widget保存布局，ViewportScale只负责一个目标容器的统一比例；弹窗模态由ViewSpec配置，UIManager动态共用一份节点，不再加载各窗蒙版。它们不增加阶段资源清单。

实际打开页面时，UIManager先执行@view的prepare准备页面必需配置，再按同一注册取得Prefab；阶段预加载只读取页面spec.prefab，统一经资源池准备目标，不调用prepare/load，不创建界面或查询玩家状态。ApplicationResources只负责三段调度和目标持有，移除preparedPage/homePage/heroPage等各页取址包装。应用依赖通过bindViewRuntime窄绑定createController或动态hostId，不能借此另写页面路径或加载清单。

例如在LoadingPlan导入BagView后，将`{page:BagView}`放入enterGame；改页面Prefab路径只改BagView的@view，加载计划自动读取同一地址。需要提前准备的道具配置可在同一数组显式写`{config:GConfig.Item}`，不因预载页面自动扩大为模块全量准备。装饰器只登记已导入的View，不扫描目录。

直接图片仍使用包名/包内路径，例如ResManager.ui("common", "other_rare-4")；ResManager负责SpriteFrame后缀，底层按Bundle加载。没有旧resources别名或运行时文件存在性清单。

## 集中构建

首次使用固定钩子入口需完整退出Creator并重新打开工程。扩展重载可能保留旧构建工作进程，包版本号不能证明代码已更新。本次扩展更新为1.6.3，集中构建需看到before、after两行bootstrap-preload-v1 v1.6.3；稳定hooks.js每次重读build-hooks.cjs及源目录定位工具，防止迁移前的目录索引残留。after读取最终settings并在缺失时补齐bootstrap，再复读校验。19:56的1.6.2真实自动钩子结论仅作历史，见[旧证据](validation/bundles-auto-build-20261111.json)，不代表本次已构建。

扩展1.6.2在写settings前将bootstrap加入assets.preloadBundles（只准备元数据，不预载远程整包），构建后复读最终文件并补齐缺失。main有deps不代表引擎会自动预载这些包，不能等RemakeApp启动后再补。19:22初包曾因此失败，详细复验见[记录](validation/bundles-release-20261111.json)。

重新打开Creator让它导入迁移并识别所有Bundle。沿用Web手机端、竖屏、Remake场景；“包含的Bundles”选全部，bootstrap本地，其余沿用远程游戏资源配置；主包不要勾远程。资源服务器地址保持http://127.0.0.1:7460/。当前检查按关闭MD5缓存和调试模式的产物验证。

    node client/tools/remote-bundles-check.cjs client/build/bag-atlas-review
    node client/tools/ui-atlas-check.cjs --build-output client/build/bag-atlas-review
    node client/tools/serve-remote-bundles.cjs client/build/bag-atlas-review 7460

第一个命令检查源码/构建包一致、循环依赖、本地启动依赖和产物大小。第二个验证背包与共用格子归属。第三个只提供本机远程资源，不提供游戏API。浏览器仍使用独立测试服WS＋Protobuf。

远程包不等于整包立即下载或常驻内存；元数据准备后只加载目标及依赖。只保留当前实现模块资源不改变最终完整还原目标，恢复其他模块时从旧项目补回资源并审查路径、UUID与构建归属；不能因旧包目录删除就重新开放玩法。离线启动、重试和下载体积仍需新包实测。

## 自动图集与旧删除扩展

图集继续构建；所有源图迁入Bundle后具有动态加载路径，config/ui-atlas-dedupe.json的删除名单为空。当前UI资源构建检查1.6.3应报告0项，不再按历史43项删图。构建体积仍需检查，不以合图等同于去重。

## 人工维护入口与缓存边界

| 修改目标 | 代码入口 | 当前参数或规则 |
|---|---|---|
| 三阶段准备目标 | app/remake/LoadingPlan.ts | login、enterGame、background三个数组 |
| 页面地址与实例缓存 | 对应View的@view注册 | 背包启用cache:true，英雄/战斗不启用 |
| 实际开页前配置 | 同一@view的prepare | 仅准备该页必要配置；阶段预加载不执行 |
| 当前应用装配 | UIRegistry.bindViewRuntime、app/remake/ApplicationPages.ts | 仅注入Controller工厂或动态宿主，不覆盖页面静态定义 |
| 统一取图 | framework/assets/ResManager.ts | 路径规则、获取、赋图及迟到保护 |
| 页面闲置回收 | framework/ui/UIManager.ts | cacheIdleMs=120000毫秒，maxCachedPages=2 |
| 预制体闲置回收 | framework/assets/PrefabLoader.ts | PREFAB_IDLE_MS=120000毫秒，MAX_IDLE_PREFABS=16 |
| 预制体维护频率 | app/remake/RemakeApp.ts | 前台累计每30秒检查 |

以上路径相对client/assets/scripts。参数只在代码入口维护，不增加模块清单。

阶段预加载由ApplicationResources持有至应用销毁。背包关闭后保留实例120秒，隐藏期间清理业务监听，重开读取最新Model；根页面替换和卸载清空闲置页面。当前显示与在途打开不参与淘汰。

PrefabLoader保护实际实例，最后一个实例退出后开始闲置计时。维护时淘汰超时或最久未使用的超额项；16份仅指闲置条目，不是内存预算或全部资源上限。前台通常120–150秒回收，后台暂停会推迟。页面实例和预制体计时独立，背包可能先等待实例120秒，再开始预制体120秒。

加载器只撤回自己的引用，阶段目标或其他实例仍持有时资源继续有效。ResManager.setSprite为每个图片节点保留当前显示与本次在途候选：新图赋值后才释放旧显示，相同当前图/在途任务复用，null、失效或销毁清理，不累积虚拟Cell访问过的历史图片。getSpriteFrame(owner)仍用显式节点作用域直到owner销毁；setSprite(null)不撤回该引用。未改TTL、增加图片闲置池或强制GC，释放引用不等于进程/GPU内存立即下降。


## 前批自然回收实测边界

背包首开10.5ms、短期重开3.7ms复用同一实例；关闭120001ms后实例自然销毁，再开7.3ms为新实例，预加载Prefab仍由应用持有。未预加载资料页的Prefab约141.8秒后在维护周期回收，再开88.5ms完成重载。没有缩短TTL、手动强制回收或强制GC。

上述时间是UIManager打开Promise；背包实例到期重开仍有按需角色骨骼等后续请求，英雄/挂机重开也不保证零下载。资源拥有者退出后可撤回引用，缓存条目消失不等于GPU或进程内存已立即降低；不能据此认定长期无泄漏。
