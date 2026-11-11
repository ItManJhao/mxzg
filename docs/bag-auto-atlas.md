# 背包自动图集：人工维护步骤

更新：2026-11-11。当前目录和加载策略见[Bundle维护说明](staged-resource-loading.md)。资源迁移及本地远程构建已随 `f3cd64a3` 推送到 `hao`，未合并 `main`；本轮工具、文档和加载/缓存实测尚在进行，先不提交推送。

## 当前资源放置

| 内容 | 目录或预制体 |
|---|---|
| 背包主体、页签和详情 | assets/bundles/bag/prefabs |
| 共用物品格子 BagItemView | assets/bundles/common/prefabs |
| 背包详情分隔线及 BagAtlas.pac | assets/bundles/bag/atlas |
| 共用物品选中图及 CommonAtlas.pac | assets/bundles/common/item-atlas |
| 7张共用静态小图及 CommonAtlas.pac | assets/bundles/common/atlas |
| 动态页签、品质框、占位图 | assets/bundles/common/ui |
| 背包背景 | assets/bundles/bag/background |
| 物品图标 | assets/bundles/icons/item |
| 店员骨骼及附件 | assets/bundles/spine |

共用格子也被结算页、奖励弹窗和章节产物说明引用，因此格子及选中图归 common。原图、SpriteFrame、meta UUID 和九宫格信息仍须保留；不能因移动目录另生成一套 UUID。

## 日常修改

1. 背包专用界面小图放入 assets/bundles/bag/atlas；跨模块共用小图放入对应 common 图集目录。
2. 将图片的 SpriteFrame 直接绑定到 Prefab 的 Sprite 或脚本图片属性，保存预制体。静态绑定不用登记逐图加载数组。
3. 在 Creator 预览检查布局、透明边缘和九宫格。预览使用原图；构建时 Creator 根据同目录的 pac 自动合图。
4. 调整图集参数时选中 pac；图集预览只展示打包方案，不代表游戏预览改为加载构建图集。
5. 大背景独立存放并绑定 Prefab；物品图标仍按库存按需加载，不因模块归属而全部塞入界面图集。

页面地址和属性在 View 的 @view 注册中定义。LoadingPlan 只决定三个阶段的准备时机；Prefab 的直接依赖由引擎加载。代码不加载 pac，不按自动生成的图集文件名取帧。

动态图统一通过 ResManager。新增 icons/item/backpack_编号.png 后遵循物品配置的共图/命名规则即可；不生成 IconCatalog 或 ResourceCatalog，也不添加图片存在性清单。只有新增/移动 Prefab 等实际索引输入变化时，才运行 node tools/generate_resources.cjs。

## 构建检查

项目扩展 client/extensions/mxzg-bag-build 当前显示“UI资源构建检查”，版本 1.6.2。固定 hooks 入口每次重读实现；日志必须包含 bootstrap-preload-v1 v1.6.2 的 before、after 两行。它在场景启动前登记本地 bootstrap 预载，并核验实际启动配置。

所有原图进入 Bundle 后都有可加载路径，config/ui-atlas-dedupe.json 当前删除名单为空。自动构建应报告0项删除；不能再以历史“删除9张/43张”为成功标准，不能绕过引用检查手动删原图。图集与原图都存在也不直接证明重复，需看实际路径、引用和加载需求。

常用只读检查：

    node client/tools/check-project.mjs --suite ui-atlas
    node client/tools/check-project.mjs --suite common-atlas
    node client/tools/bag-build-hook-check.cjs
    node client/tools/remote-bundles-check.cjs client/build/bag-atlas-review
    node client/tools/ui-atlas-check.cjs --build-output client/build/bag-atlas-review

源码检查保护原图、UUID 和绑定；构建检查核对包归属和启动依赖；实际画面另在独立环境验证。构建后检查不是运行时加载清单，也不能代替包体或内存实测。

## 独立环境与历史证据

发布包的隔离入口、资源服务和构建要求见[Bundle维护说明](staged-resource-loading.md)。四类背包、英雄、布阵及主线闭环见[运行证据](validation/bundles-final-review-20261111.json)，1.6.2自动钩子见[自动构建证据](validation/bundles-auto-build-20261111.json)。

2026-11-10曾在普通目录阶段验证2张背包原图、7张common原图的限定副本清理；这些删除口径已停止用于当前 Bundle 目录。原始证据保留在[背包去重](validation/bag-atlas-dedupe-20261110.json)、[旧自动钩子](validation/bag-build-hook-20261110.json)、[common去重](validation/common-dedupe-20261110.json)，不作为当前日常操作步骤。

机制参考：[Creator 3.8 自动图集说明](https://docs.cocos.com/creator/3.8/manual/zh/asset/auto-atlas.html)。
