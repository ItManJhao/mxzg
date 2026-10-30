# 按重做计划清理 Prefab

执行日期：2026-10-29。用户要求清除不在当前计划中的全部残留 Prefab。本批只处理 Prefab、配套 .meta、空目录及失效加载登记；原图片、音频、配置和业务代码不作为本批删除对象。

## 清理结果

- 清理前 607 个 Prefab，保留 90 个，删除 517 个及其配套 .meta。
- 删除 Prefab 源文件合计 29,388,541 字节，保留源文件合计 5,322,202 字节；均不等同于构建下载量或运行内存。
- 保留文件和 .meta 在清理前后逐个做 SHA-256 比较，没有修改内容或 UUID。用户已有 ChapterMapLayer.prefab 修改保留。
- 已检查没有残留的孤立 .prefab.meta，也没有保留场景/Prefab 指向已删 Prefab 的 UUID。
- 移除已删除目标的旧 PAGE_PREFAB_SHELLS 映射与 UUID 回退登记；loadPrefab 对不在计划内的目标在引擎请求前拒绝，避免旧调用继续请求不存在资源。

## 保留标准

只保留 P0–P9 首个可玩/发行范围内已选定的表现组件，以及它们实际序列化引用的 Prefab。不能因为旧代码提到某系统，就把该系统加回计划。

保留范围：启动/登录/公告/选服/角色初始化，主城，英雄列表/详情/技能/基础养成/阵容选择，背包/道具，主线战斗/战报/结算，挂机，基础召唤，邮件，基本角色资料与设置，必要通用 UI。

删除范围包括：竞技/跨服/冠军/组队竞技、公会门户、好友聊天排行、远征/梦境/爬塔等额外玩法、宠物/圣龙/神器/符文/神装/光环/图腾等高级养成、活动福利与其他非首测功能壳，以及重复的旧通用控件与旧调试面板。英雄目录也按具体 Prefab 筛选，没有整目录放行。

90 个保留项不代表 90 个功能已实现。尚未接新后端的英雄/阵容页面仍不在新主城开放，按路线图继续接入。

后续核查 login/account 后，两个旧登录 Prefab 已移到 legacy-login，数量和 UUID 不变。login 仅放共用启动/选服等组件，account 是唯一重做版登录页，职责与维护入口见 [登录入口说明](login-entries.md)。

## 清单与恢复

- 唯一保留策略：[tools/prefab-plan.json](../tools/prefab-plan.json)，每组包含阶段、理由和具体名称。
- 详细结果：[prefab-cleanup-manifest.json](prefab-cleanup-manifest.json)，记录全部保留/删除路径、已删 UUID、源字节与发现的旧代码调用点。
- 清理时的完整文件备份：`client/temp/prefab-cleanup/removed-330ebc693a804d3780f2347b49db93c0.zip`。已校验 ZIP 完整性及全部 517 对 Prefab/.meta，亦包含相关父目录 .meta。备份不在 assets，不参与编辑器导入或打包，属于本机临时文件。
- Git 中已跟踪的原文件也可从清理前版本恢复；若将来恢复某系统，先变更计划与依赖，再选择性恢复资产，不能直接整包解压回 assets。

## 维护与检查

```powershell
python tools/prune_prefabs.py
python tools/check_prefab_plan.py
node client/tools/check-project.mjs --suite resources
```

prune_prefabs 默认只读预览，显式 --apply 才会清理，并在删除前创建备份；重复执行且无待删项时保留原删除记录。工具只删除核验过绝对路径的 .prefab/.meta 对和实际为空的目录，不递归清空目录。

config/PrefabPlan.ts 是由保留策略生成的运行时清单，修改策略后通过清理工具同步；prefab-plan 检查防止计划外 Prefab 回流或出现已删 UUID 引用。旧全量 UI 生成器不能不加筛选地重跑，否则会被该检查拒绝。

旧业务逻辑仍有部分高级系统路径，本批未把所有旧代码删除；这些路径已失去壳映射，统一加载器会拒绝计划外 Prefab。legacy/Boot/Main 仅继续作为保留核心页面的参考，不再承诺旧服全量 UI 功能。

## 验证边界

检查包括保留策略、UUID 引用、失效登记、拒绝计划外加载且允许核心加载、备份完整性、真实 Creator 声明的 strict，以及既有页面检查。综合检查 15/17 通过，原有 backpack/legacy 背包布局断言仍失败，未删除或跳过。

尚未完成 Creator 实际导入、核心页面视觉与三端构建验收；请等待编辑器完成删除/导入后重新打开 Remake.scene 再预览。清理后运行状态不以静态检查替代。
