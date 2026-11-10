# 背包当前界面资源归属清单

核对日期：2026-11-10。覆盖 BagView、BagItemView、BagTabView、BagInfoView 的直接图片绑定，并扫描全项目 Prefab/Scene 的同 UUID 引用。保留预制体中的引用不等于对应玩法已开放。

## 静态绑定（18张）

| 图片 | 背包使用位置 | 归属 | 其他预制体引用举例 |
|---|---|---|---|
| backpack_900001.png | BagInfoView | icons/item（物品内容） | CampaignView、MainChapterView、ChapterPreviewLayer |
| backpack_item-frame-1.png | BagInfoView | common（共用） | InfoCard、HeroInfoUpStarLayer |
| backpack_spr-default.png | BagItemView | common（共用） | ChapterExtraRewardCell、InfoCard、HeroInfoUpStarLayer |
| button_btn-close-1.png | BagInfoView | common（共用） | AbilityInfoLayer、RoleProfileView、BattleDetailLayer |
| button_btn-green-big-1.png | BagView | common（共用） | HeroInfoUpStarLayer、HeroInfoView、HeroStrongInfoCell |
| button_btn-old-1.png | BagInfoView | common（共用） | SkillAuditCellView、SkillAuditView、GmOptionCellView |
| button_btn-orange-big-1.png | BagView | common（共用） | BattlePage、CommonBtnPrimaryShell、HeroInfoView |
| button_btn-src.png | BagInfoView | common（共用） | AbilityInfoLayer |
| button_btn-tab-23.png | BagTabView | common（共用） | SkillAuditView、ChapterStageChip、GmView |
| button_btn-tab-24.png | BagTabView | common（共用） | SkillAuditView、GmView、HeroListView |
| loading_bg-white.png | BagInfoView | common（共用） | RemakeHomeView、AccountLoginView、RoleProfileView |
| other_kuang.png | BagView | common（共用） | ChapterExtraRewardCell、HeroListView |
| other_rare-0.png | BagItemView | common（共用） | BattleDetailCell |
| win-bg_block-bg-24.png | BagInfoView | common（共用） | AbilityInfoLayer、InfoCard、HeroSkillInfoLayer |
| win-bg_block-bg-5.png | BagView | common（共用） | BattlePage、ChapterRewardInfoView、SkillAuditView |
| backpack-info_spr-line.png | BagInfoView | ui/bag/atlas（专用小图） | 无 |
| backpack_spr-select.png | BagItemView | ui/bag/atlas（专用小图） | 无 |
| map-bg-backpack-1.jpg | BagView | ui/bag/background（专用大图） | 无 |

## 动态资源

- 库存物品图片由BagItemCatalog.iconSource读取item.icon定位，通常归icons/item；英雄图标按配置指向ui/hero。已移除逐物品ItemIconById映射，不是界面图集成员。
- 品质框 other_rare-0 至 other_rare-6 和缺图占位归 common，按物品展示需要准备。
- 店员使用 resources/spine/shangcheng 骨骼，由 BagView.shopkeeperSkeleton 声明；骨骼及其纹理保持专有格式。
- 文字使用原有字体及 Label，背包当前标题不是待合图的独立标题 PNG。

## 当前目录与边界

```text
assets/ui/bag/
  atlas/       BagAtlas.pac、选中框、详情分隔线
  background/  map-bg-backpack-1.jpg
assets/resources/ui/common/  共用按钮、页签、底框、占位图
assets/resources/icons/item/  物品内容图标
assets/resources/spine/shangcheng...  店员骨骼
```

原 resources/ui/bag 的其余旧资源不是这四个当前页面的静态依赖，不能按目录名全合进背包。存在账号头像边框的动态使用，以及旧页面/效果资源，本批不删除、不重新分类其他模块。动态配置还可能组合资源名，本清单不宣称这些存量资源都未使用。

结论：两张专用小图已经覆盖当前背包页面的专用小图范围；公共图片不复制到背包图集。专用大背景已归档但不合图，保持原文件和 UUID，页面预加载依赖仍由预制体负责。

只读明细见 validation/bag-resource-inventory-20261110.json。背景归档后独立预览已通过：背包背景、道具详情、返回重开正常，新增资源请求0、库存不变，无警告错误；本批未重新构建发布包。

## common 下一批边界（2026-11-10复核）

14张共用图不能整体搬进普通目录。源码中仍有按路径加载页签、品质框和缺图占位的调用；这些路径应先保留。

| 图片 | 原图尺寸 | 处理判断 |
|---|---|---|
| backpack_item-frame-1.png | 106×106 | 公共静态图集候选 |
| backpack_spr-default.png | 34×47 | 保留动态路径 |
| button_btn-close-1.png | 55×58 | 公共静态图集候选 |
| button_btn-green-big-1.png | 136×58 | 公共静态图集候选 |
| button_btn-old-1.png | 136×58 | 公共静态图集候选 |
| button_btn-orange-big-1.png | 136×58 | 公共静态图集候选 |
| button_btn-src.png | 67×55 | 公共静态图集候选 |
| button_btn-tab-23.png | 111×43 | 保留动态路径 |
| button_btn-tab-24.png | 111×43 | 保留动态路径 |
| loading_bg-white.png | 10×10 | 登录共用，单独评审 |
| other_kuang.png | 174×91 | 公共静态图集候选 |
| other_rare-0.png | 106×106 | 保留动态路径 |
| win-bg_block-bg-24.png | 50×50 | 公共静态图集候选 |
| win-bg_block-bg-5.png | 42×42 | 公共静态图集候选 |

- 9张公共静态图作为首批 common 自动图集候选，后续迁移必须保留图片、SpriteFrame、九宫格边距和 meta UUID，再检查所有受影响页面。候选中的7张现已迁移，2张选服依赖保留原位。
- 两张页签由 HeroListView 使用；缺图占位由 BagItemCatalog、battleEndView 使用；品质框0至6由 BagItemCatalog、HeroInfoView 使用。不能直接移动并删除旧动态路径。
- loading_bg-white 同时属于登录及多页依赖，虽只有10×10，也不宜让登录因它提前加载整张主城公共图集。先保留独立。
- 现已为7张静态图片新增 CommonAtlas.pac；没有改变加载阶段；后续去重名单已明确扩至背包2张与common7张，也没有宣称合图必然缩小包体。

复核明细见 [common核对记录](validation/bag-common-audit-20261110.json)。

### 迁移前进一步复核

当前ServerPickerView直接绑定button_btn-close-1与win-bg_block-bg-5。为保持登录加载范围，首批实际迁移范围由9张候选收为其余7张，上述两张仍留resources/ui/common。此判断来自当前使用页面，不仅依据旧登录预制体命名。修正后的发布包完整背包验收已通过，7张迁移已执行，18:28新包合图已通过，7张原图副本随后已校验备份清理。

### 当前执行状态

18:20发布包已通过独立登录、四分类详情和返回重开，库存及版本未变。随后已迁移7张公共静态候选至assets/ui/common/atlas，并增加CommonAtlas.pac；原图片、meta、UUID和九宫格数据保持。当前跨模块Prefab绑定、生成一致性及类型检查通过，18:28新包已确认7张共用252×281图集，背包四分类详情、返回、英雄空列表通过，英雄详情及战斗预制体资源加载通过；7张公共原图副本随后已校验备份清理，完整英雄/战斗交互未重跑。
