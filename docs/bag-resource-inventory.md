# 背包当前界面资源归属清单

核对：2026-11-11。覆盖 BagView、BagInfoView、BagTabView 和共用 BagItemView 的18张直接图片绑定。表中目录相对 client/assets/bundles，描述当前 Prefab 指向；同名资源不能据文件名直接替换或删除。原始图片/引用扫描见[历史清单](validation/bag-resource-inventory-20261110.json)，当前 Bundle 验收见[构建证据](validation/bundles-auto-build-20261111.json)。

## 静态绑定（18张）

| 图片 | 背包使用位置 | 归属 | 其他预制体引用举例 |
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

## 动态资源

- 库存图由 BagItemCatalog.iconSource 读取 item.icon，通常定位 icons/item；配置指定的英雄图标位于 hero/ui。ResManager 解析路径，不维护逐ID存在性清单。
- 品质框 other_rare-0 至 other_rare-6、缺图占位和页签位于 common/ui，按展示需求加载。
- 店员为 spine/shangcheng，由 BagView.shopkeeperSkeleton 声明；骨骼和附件保持原格式。
- 字体按现有 Prefab 绑定加载，属于 font 或本地 bootstrap 依赖，不因背包打开另建字体清单。

## 当前目录与维护边界

    assets/bundles/bag/prefabs/       BagView、BagInfoView、BagTabView
    assets/bundles/bag/atlas/         详情分隔线、BagAtlas.pac
    assets/bundles/bag/background/    当前背包背景
    assets/bundles/common/prefabs/    共用BagItemView
    assets/bundles/common/item-atlas/ 共用选中图、CommonAtlas.pac
    assets/bundles/common/atlas/      7张共用静态图、CommonAtlas.pac
    assets/bundles/common/ui/         动态共用图
    assets/bundles/icons/item/        物品内容图标
    assets/bundles/spine/             骨骼与附件

原顶层 ui、resources、prefabs 已整合并移除。bag/ui 中仍保留旧背包分类素材，它们不全是当前四个资源预制体的直接依赖；没有静态引用也不能据此认定未使用，动态配置可能组合资源名。本页不是运行时加载或删除名单。

页面地址只在 View 的 @view 注册中维护；三段准备目标只在 LoadingPlan 配置。准备页面包含其直接依赖，动态图标按需取得；加载一个 Bundle 的元数据不等于下载全部包内资源。完整操作见[自动图集维护](bag-auto-atlas.md)和[Bundle维护说明](staged-resource-loading.md)。

## 历史 common 迁移边界

2026-11-10最初核对14张共用图，其中9张是静态合图候选，首批最终迁移7张；选服依赖、品质框、页签和占位图当时保留原动态路径。随后整体 Bundle 迁移已统一修改加载路径，提示白图归本地 bootstrap，共用格子和选中图归 common。历史“仍留resources”与“清理9张”不能作为当前目录或删除依据。核对原始依据见[common历史审计](validation/bag-common-audit-20261110.json)。
