# mxzg 项目结构与 UI 迁移规范

> 历史记录：客户端当前标准以 [architecture.md](architecture.md) 和 [背包标准模块样板](bag-mvc-maintenance.md) 为准。背包已迁入 features/Bag，采用完整名称、BaseModel/BaseController 和单一全局 EventDispatcher；下方旧目录/开关/分层不再作为现行要求。指定核心流程的正式服视觉、交互和规则对照目标继续有效。

> 适用项目：Cocos Creator 3.8.8 / TypeScript
>
> 参考项目：`mxzg-h5-jp`（Cocos2d-x Lua + CCBI）
>
> 历史目标：在保持日服视觉和行为 1:1 的前提下整理迁移工程。
>
> 2026-10-29 定位更新：mxzg 是现代化重做版。本文保留为旧实现的结构参考；1:1、旧目录映射和迁移顺序不再约束新设计。后续以 product-requirements.md 与 restructuring-plan.md 为准，仍有价值的生命周期、资源引用和依赖边界要求继续参考。

## 1. 为什么要调整

当前工程同时存在三种实现：

1. `assets/prefabs/ui/**`：从 CCBI 迁移的视觉资源；
2. `scripts/ui/screenFill.ts`、`pagePrefabShell.ts`：通过节点名查找并填充数据的迁移层；
3. `scripts/module/**`：Mock 玩法规则、数据格式化和部分正式页面共用逻辑。

这会导致一个功能散落在多个目录。例如背包同时涉及：

```text
scripts/module/bag/
scripts/ui/screenFill.ts
scripts/ui/pagePrefabShell.ts
assets/prefabs/ui/backpack/
```

新增的 View 不能继续平铺到 `scripts/ui/view/`。否则随着英雄、邮件、商店等页面迁移，该目录会再次变成巨型杂物目录。

## 2. 核心原则

### 2.1 按功能组织业务代码

打开 `features/backpack/` 应能找到背包的大部分规则、模型和界面代码。

### 2.2 框架不能依赖具体业务

`framework/ui/UIManager.ts` 不得 import `BackpackView`、`backpackMount` 或任何具体功能。

依赖方向必须是：

```text
app → features → framework/core
features/ui → features/model → features/domain
```

禁止：

```text
framework → features
domain/model → ui
module → ui
```

### 2.3 Prefab 是界面结构的事实来源

- 位置、尺寸、层级、Sprite、Label、Button 和 ScrollView 应在 Prefab 中配置；
- View 使用 `@property` 绑定节点；
- 禁止在新 View 中递归搜索整棵节点树；
- 禁止用运行时代码重新搭建已有 Prefab；
- 允许动态创建列表 Cell，但 Cell 本身必须来自 Prefab。

### 2.4 迁移期间一页可以双轨，迁移完成后只能保留一条正式路径

迁移页面时允许：

```text
新 View：默认路径
旧 screenFill：?xxx=old 回退路径
```

验收完成后必须建立删除旧路径的后续任务，不能永久维护两套实现。

## 3. 目标目录

```text
client/assets/scripts/
  app/
    MainApp.ts
    BootFlow.ts

  core/
    GameStore.ts
    Session.ts
    GameLog.ts
    errors.ts

  net/
    NetClient.ts
    WireSession.ts
    protocol/
    transport/

  framework/
    ui/
      BaseView.ts
      UIManager.ts
      UIRegistry.ts
      UILayer.ts
      UIViewSpec.ts
      ViewClose.ts
    navigation/
      UIShell.ts
      PanelNav.ts
      PageStack.ts
      PopupQueue.ts
      StackView.ts
    resource/
      PrefabLoader.ts
    layout/
      SafeArea.ts
      VisibleFit.ts
      CcbiPlace.ts
    kit/
      UiKit.ts
      SpritePaint.ts
      Toast.ts

  features/
    backpack/
      domain/
        BagRules.ts
        BagTypes.ts
      model/
        BagViewModel.ts
      ui/
        BackpackView.ts
        BackpackInfoView.ts
        BackpackItemCellView.ts
        BackpackTabButtonView.ts
        BackpackMount.ts
      config/
        BackpackFeatureFlag.ts

    hero/
      domain/
      model/
      ui/
      config/

    mainline/
    idle/
    battle/
    mail/
    summon/
    smith/
    arena/
    tower/

  legacy/
    PagePrefabShell.ts
    PrefabShellMap.ts
    ScreenFill.ts

  test-support/
    # 仅运行时测试辅助；正式工具仍放 client/tools/
```

资源目录保持稳定，不因 TypeScript 整理而批量移动：

```text
client/assets/prefabs/ui/<feature>/
client/assets/resources/ui/<feature>/
```

## 4. 当前文件的目标归属

### 4.1 通用框架

| 当前文件 | 目标位置 |
|---|---|
| `ui/UIShell.ts` | `framework/navigation/UIShell.ts` |
| `ui/PanelNav.ts` | `framework/navigation/PanelNav.ts` |
| `ui/PageStack.ts` | `framework/navigation/PageStack.ts` |
| `ui/PopupQueue.ts` | `framework/navigation/PopupQueue.ts` |
| `ui/StackView.ts` | `framework/navigation/StackView.ts` |
| `ui/SafeArea.ts` | `framework/layout/SafeArea.ts` |
| `ui/visibleFit.ts` | `framework/layout/VisibleFit.ts` |
| `ui/ccbiPlace.ts` | `framework/layout/CcbiPlace.ts` |
| `ui/prefabLoad.ts` | `framework/resource/PrefabLoader.ts` |
| `ui/UiKit.ts` | `framework/kit/UiKit.ts` |
| `ui/Toast.ts` | `framework/kit/Toast.ts` |

这些文件暂时不要求一次全部移动。先保证新代码放在目标位置，旧文件按功能迁移逐步移动。

### 4.2 PR #290 中的新增文件

| PR #290 当前文件 | 目标位置 |
|---|---|
| `ui/view/BaseView.ts` | `framework/ui/BaseView.ts` |
| `ui/view/UIManager.ts` | `framework/ui/UIManager.ts` |
| `ui/view/UIRegistry.ts` | `framework/ui/UIRegistry.ts` |
| `ui/view/UILayer.ts` | `framework/ui/UILayer.ts` |
| `ui/view/viewClose.ts` | `framework/ui/ViewClose.ts` |
| `ui/view/spritePaint.ts` | `framework/kit/SpritePaint.ts` |
| `ui/view/BackpackView.ts` | `features/backpack/ui/BackpackView.ts` |
| `ui/view/BackpackInfoView.ts` | `features/backpack/ui/BackpackInfoView.ts` |
| `ui/view/BackpackItemCellView.ts` | `features/backpack/ui/BackpackItemCellView.ts` |
| `ui/view/BackpackTabButtonView.ts` | `features/backpack/ui/BackpackTabButtonView.ts` |
| `ui/view/backpackMount.ts` | `features/backpack/ui/BackpackMount.ts` |
| `ui/view/backpackFlag.ts` | `features/backpack/config/BackpackFeatureFlag.ts` |
| `module/bag/bagBoard.ts` | `features/backpack/model/BagViewModel.ts` |
| `module/bag/items.ts` | 逐步拆到 `features/backpack/domain/BagRules.ts` |

### 4.3 暂时保留在 legacy 的文件

以下文件在页面逐个迁移完成前不能删除：

- `ui/pagePrefabShell.ts`
- `ui/prefabShellMap.ts`
- `ui/screenFill.ts`

每迁移一个页面，只删除该页面在 legacy 中的对应分支，不能顺手重写其他页面。

## 5. BaseView 标准

```ts
export abstract class BaseView<TArgs = void> extends Component {
  protected args: TArgs | undefined;

  /** Component 创建后仅执行一次。 */
  protected onCreate(): void {}

  /** 绑定按钮、Store 和事件。每个实例仅执行一次。 */
  protected onBind(): void {}

  /** 每次打开或重复激活时执行。 */
  protected onOpen(args: TArgs): void {}

  /** 页面关闭或隐藏时执行。 */
  protected onClose(): void {}

  /** 与 onBind 成对，解除事件和 Store 订阅。 */
  protected onUnbind(): void {}

  /** 销毁前执行，仅执行一次。 */
  protected dispose(): void {}
}
```

生命周期必须由框架驱动，不允许每个 View 自己猜调用时机。

必须满足：

```text
首次打开：onCreate → onBind → onOpen
重复打开：onOpen
关闭缓存页：onClose
销毁页：onClose → onUnbind → dispose
```

任何异常都必须使 `UIManager.open()` reject，不能 catch 后伪装成功。

## 6. View 注册标准

```ts
@view({
  id: "bag",
  prefab: "prefabs/ui/backpack/BackpackLayer",
  layer: UILayer.Page,
  cache: ViewCachePolicy.None,
  allowMultiple: false,
  mount: mountBackpackPage,
})
@ccclass("BackpackView")
export class BackpackView extends BaseView<BagOpenArgs> {
  @property(Button)
  private btnClose: Button | null = null;
}
```

`UIViewSpec` 至少包含：

```ts
interface UIViewSpec {
  id: string;
  prefab: string;
  layer: UILayer;
  cache: ViewCachePolicy;
  allowMultiple: boolean;
  mount?: ViewMountStrategy;
}
```

业务挂载策略可以登记在 ViewSpec，但 `UIManager` 不能硬编码某个业务页面。

## 7. UIManager 行为契约

`UIManager` 至少提供：

```ts
open(ViewClass, args)
openById(id, args)
close(ViewClass | id)
back()
isOpen(ViewClass | id)
```

必须保证：

1. 同一页面并发 `open` 只加载一次；
2. `allowMultiple=false` 时不能生成两个实例；
3. 未注册 ID 明确失败；
4. Prefab 加载失败明确失败；
5. Prefab 缺少 View 组件明确失败；
6. 页面装好后才进入导航栈；
7. 打开期间用户切换页面时，旧打开请求必须通过 token 取消；
8. 取消请求不能重新压栈、改变底栏高亮或留下空节点；
9. 页面成功入栈后才能刷新 Chrome；
10. 关闭后事件、Store 和 `director` 监听必须解除。

## 8. `module` 的处理方式

`scripts/module/**` 不是 UI 目录，大部分是 Mock 规则或纯业务函数，不能因为真服暂未使用就批量删除。

按以下状态分类：

| 状态 | 含义 | 处理 |
|---|---|---|
| `ACTIVE` | 正式运行路径直接使用 | 保留并逐步迁移到 feature |
| `MOCK_ONLY` | 仅 `?dev=mock` 使用 | 保留，除非明确删除 Mock |
| `TEST_ONLY` | 只由检查脚本调用 | 先确认测试契约 |
| `PREFAB_ONLY` | 只有 Prefab，没有 View/数据 | 保留为待迁移资产 |
| `REFERENCE` | 只用于 1:1 对照 | 文档标记 |
| `UNUSED` | 无运行、Prefab、工具和测试引用 | 才能提出删除 |

已知注意项：

- `module/idle/rewards.ts` 被正式挂机 UI 和协议代码使用；
- `module/mainline/battle.ts` 被正式战斗路径使用；
- `module/bag/items.ts` 被正式背包路径使用；
- 其余许多 module 被 `MockGameSession` 和 `skeleton-check` 使用；
- 不得直接删除整个 `module`。

## 9. Prefab 与 `.meta` 规则

1. 移动 Cocos 脚本时必须同时移动 `.ts` 与 `.ts.meta`；
2. 不得重新生成已被 Prefab 引用的脚本 UUID；
3. 移动后运行 `check_script_type_ids.py`；
4. 无 TypeScript import 不代表无引用，Prefab 可通过 `__type__` 引用脚本；
5. `ui/common/*Shell.ts`、`CityChromeShell.ts` 等不能按普通死代码删除；
6. Prefab 路径变化必须同步 ViewSpec 和资源预热表。

推荐移动方式：

```bash
git mv Old.ts New.ts
git mv Old.ts.meta New.ts.meta
```

禁止删除 `.meta` 后让 Creator 自动生成新的 UUID。

## 10. 1:1 验收规则

目录整理不能改变画面。每个迁移页面必须经过：

```text
代码与生命周期检查
→ Prefab 脚本绑定检查
→ 功能测试
→ 日服网页和 Creator 网页同状态截图
→ 叠加/差异检查
→ 回归测试
```

视觉对照必须固定：

- 视口尺寸；
- DPR；
- 浏览器缩放；
- 语言；
- 账号数据；
- 页签和 ScrollView 位置；
- 动画阶段。

开发智能体只能报告差异和修复，不能以“编译通过”代替 1:1 验收。

## 11. 迁移顺序

### Phase 0：修正 UI 框架

在合并 PR #290 前完成：

- 修复异步打开后错误压栈；
- 页面真正入栈后刷新 Chrome；
- View 初始化失败必须 reject；
- UIManager 移除背包硬编码；
- 补全 BaseView 生命周期；
- ViewSpec 增加 `cache`、`allowMultiple` 和可选 `mount`；
- 增加并发、取消、失败和重复打开测试。

### Phase 1：整理框架与背包目录

- 把通用 View 文件移动到 `framework/ui/`；
- 把背包 View 移动到 `features/backpack/ui/`；
- `.meta` 同步移动；
- 不移动其他功能；
- 保留 `?bag=old`。

### Phase 2：背包 1:1 验收

- 对照日服背包所有状态；
- 当前四页签与日服九页签差异必须记录，不得宣称完整 1:1；
- 修复布局后保存参考截图与回归基线；
- 验收通过后再计划删除 `fillBag`。

### Phase 3：英雄列表样板

- 创建 `features/hero/`；
- 复用已经稳定的 BaseView/UIManager；
- 禁止修改框架来迁就英雄页面；
- 完成列表、图鉴、圣龙、详情跳转后验收。

### Phase 4：按界面族迁移

推荐顺序：

```text
登录 → 主城 → 邮件 → 召唤 → 铁匠 → 竞技场 → 塔 → 活动
```

不要并行迁移多个界面族。

## 12. 删除标准

删除文件前必须提供：

1. TypeScript import 搜索；
2. Prefab/Scene `__type__` 搜索；
3. 生成工具引用搜索；
4. 测试和文档契约搜索；
5. 替代实现路径；
6. Creator 预览结果。

满足全部条件才可以删除。

当前不能批量删除：

- `assets/prefabs/ui/**`
- `scripts/module/**`
- `screenFill.ts`
- `pagePrefabShell.ts`
- `ui/common/*Shell.ts`
- 只因“没有 import”而被怀疑的 Component

## 13. 每次提交的完成标准

开发智能体必须输出：

```text
【任务范围】
【移动/修改文件】
【保留 UUID 的证据】
【依赖方向】
【生命周期变化】
【旧实现开关】
【自动化检查】
【Creator 实际测试】
【日服视觉对照】
【已知差异】
【是否允许删除旧实现】
```

以下情况不得标记完成：

- 只创建了空 View；
- 只存在 Prefab；
- 只通过 TypeScript 编译；
- 只通过 Node Stub 测试；
- 没有 Creator 实际运行；
- 没有日服视觉对照；
- 新旧实现同时运行；
- 用假数据掩盖未同步数据。

## 14. 给开发智能体的执行提示词

```text
你必须遵守 docs/project-structure-and-ui-migration.md。

本轮只处理 UI 框架和背包目录，不迁移英雄或其他页面。

先修复 PR #290 的阻断问题：
1. 异步 open 必须支持取消，加载期间切换页面后不得再次压栈；
2. 页面成功入栈后再刷新 Chrome；
3. View 初始化错误必须 reject；
4. UIManager 不得硬编码 mountBackpackPage；
5. BaseView 补齐 onCreate/onBind/onOpen/onClose/onUnbind/dispose；
6. ViewSpec 补 cache、allowMultiple、mount；
7. 增加并发 open、取消 open、加载失败、缺组件、重复打开测试。

修复后按文档执行目录迁移：
- 通用框架放 framework/ui；
- 背包业务放 features/backpack；
- .ts 与 .ts.meta 必须一起移动；
- 不得批量移动 ui 目录；
- 不得删除 module、Prefab 或旧 fillBag；
- 不得修改 WireSession；
- 不得使用运行时节点递归查找代替 @property。

完成后提交固定格式交接单，并等待独立测试智能体验收。
```

## 15. 给测试智能体的结构验收

```text
检查开发结果是否符合 docs/project-structure-and-ui-migration.md：

1. framework 不得 import features；
2. domain/model 不得 import ui；
3. UIManager 不得出现 Backpack、Hero 等业务类名；
4. Cocos 脚本移动后 UUID 必须保持不变；
5. Prefab 自定义组件绑定必须全部有效；
6. 旧 ?bag=old 路径必须仍能打开；
7. 新背包失败时不得留下空页面；
8. 打开中切换页面不得稍后弹回背包；
9. 背包打开后底栏高亮必须正确；
10. Node Stub 测试不能替代 Creator 和双网页视觉验收。

任意一项失败则本轮 FAIL，不得直接修改代码。
```
