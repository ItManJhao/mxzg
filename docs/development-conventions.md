# 开发写法与阅读约定

本指南落实用户 2026-11-02 的要求：用现代技术使人能维护，完整还原 mxzg 旧游戏。游爱项目只提供写法和阅读习惯参考，不是内容来源。本文件定义代码阅读方式；职责和生命周期以 [架构](architecture.md) 为准，注释硬性要求以 [AGENTS.md](../AGENTS.md) 为准。

## 三种参考各负责什么

| 参考 | 用途 | 不应替代的内容 |
|---|---|---|
| mxzg 旧客户端、服务端、策划表 | 确认玩法、规则、消耗、奖励、状态、流程、资源与配置含义 | 不能只看旧 UI 就猜服务端规则 |
| [旧正式服](https://mxzg-test.funsgamex.com/jp/) | 核对真实布局、交互、动画、战斗和反馈效果 | 单个测试号的等级/VIP/活动状态不等于通用数值规则 |
| G:/游爱/trunk | 模块名称、明确方法、收包→更新数据→通知界面的阅读路径 | 不复制玩法、协议编号、Sproto、Laya 类或全局管理框架 |

参考源码（相对 G:/游爱/trunk）：`src/game/main/model/SGModel.ts`、`src/game/main/controller/SGCtrl.ts`、`src/game/main/view/sg/SpiritGameMainView.ts`。SGModel 的 setData/setRecord、SGCtrl 的 onNotify 分发与明确业务方法、View 的 onShow/onHide 成对监听，是值得借鉴的可读性。mxzg 原源码路径和固定版本见 [架构核查](architecture.md#原项目架构核查2026-11-02)。

## 与游爱 SGModel/SGCtrl 的对应关系

2026-11-03 直接复核上述三份源码：**本项目模板与游爱在 MVC 职责、收包后更新数据再通知界面、中文方法说明和阅读顺序上相仿；不要求网络框架和调用形式完全一致。**

| 环节 | 游爱现有写法 | 本项目固定写法 |
|---|---|---|
| 发请求 | SpiritGameMainView.onShow/onClick 可直接 NetHelper.sendProto；SGCtrl 也会发后续请求 | View 转交 Controller 的业务方法，由身份边界、模块 API、统一 GameSocketClient 发送 |
| 收包 | SGCtrl.onNotify 按 Protocol/AOI 分发 | Protocol 登记真实消息，onNotify → onXxx → 唯一 Model → 事件；角色和背包按统一持久版本批量提交 |
| 更新状态 | getSGameData → sgModel.setData；getRecord → setRecord | BagController.onNotify → 对应处理方法 → BagModel，状态由唯一 Model 持有 |
| 通知界面 | setData 后 dispatch(SG_UPDATE_STATUS) | 提交后 notify → EventDispatcher → BagUpdate/BagSyncStateChanged |
| 界面刷新 | onShow 登记监听并 updateView；updateView 读取 DataMgr.ins.sgModel | onOpen 登记监听并读取 BagModel；refreshFromModel 负责刷新 |
| 关闭清理 | onHide 成对 offEvent，并清理页面定时器 | BaseView 清理本页目标监听；模块 Controller 独立存活 |

本项目额外明确入站校验、账号/区服代次、读写排序、持久幂等边界和断线恢复。这些是新版维护与正确性约束；上述三份游爱文件不足以证明其底层是否具备同类保护，不据此断言游爱没有这些能力。

后续保持完整类名、明确业务方法和中文注释，确保能沿“请求 → 收包 → 更新 Model → 通知 View”读懂代码；不为模仿 SGCtrl 增加巨大 switch、公开可写资产、Controller 直接开窗或 View 直接发资产协议。具体链路统一遵守[固定通信与状态模板](bag-mvc-maintenance.md#固定通信与状态模板)。玩法、内容与效果仍以 mxzg 旧项目为准。


## 当前项目从哪里找

以下是现有目录的维护入口，不是要求额外创建一套目录：

| 位置 | 内容与维护范围 |
|---|---|
| client/assets/scripts/app/remake | 启动、模块装配、页面入口和功能资源作用域 |
| client/assets/scripts/features | account、Bag、battle、city、hero、home 等模块；功能 UI 放本模块 ui |
| client/assets/scripts/framework | 事件、基础 Model/Controller、UIManager、资源作用域、SuperScroll 等公共能力 |
| client/assets/scripts/platform | WebSocket、Protobuf 编解码与协议目录；不反向依赖功能 UI |
| client/assets/scripts/core | 现有 GameLog 与通用错误辅助；不向此处堆业务 |
| client/assets/scripts/config | 配置查询、生成类型及资源登记相关入口 |
| client/assets/prefabs、resources、bundles | 静态界面、资源及按需加载包；修改保留对应 meta 和引用 |
| backend/src/main/java/com/funsgamex/mxzg | auth、role、hero、inventory、lineup、campaign、server 等服务端功能包 |
| config、tools | 根目录的配置来源/规范与生成审查工具；不与客户端运行时 config 混淆 |
| client/tools、backend/src/test | 客户端与后端验证入口，不能把测试夹具接入玩家流程 |
| scripts、backend/dev.ps1 | 本机启动、停止、状态与验证工作流 |
| docs | 需求、架构、规范、计划与维护指南；validation 只存历史证据 |

目前模块大小写、旧辅助类和个别生命周期并未全部统一。整理遵循“先确认引用和职责，再在对应功能批次改造”，不因看到旧目录或大文件就整批搬迁；进度中的待迁移项仍须实际完成。现有根 scripts/ui 无业务文件，不作为新模块 UI 的放置入口。

## 协议与生成代码

登录会话与背包使用 WebSocket + Protobuf，统一在 protocol/game.proto 定义强类型载荷；前端执行 node tools/generate_game_protocol.cjs，Java 由 Maven 自动生成。新增或修改协议同时更新中文契约说明、边界校验、生成漂移和真实前后端互通测试；字段号不可复用，删除时 reserved。编解码留在 platform/network，Controller 只处理业务 DTO，不能新增 JSON/Base64 回退或将 JSON 文本包在 bytes 中。生成文件不手改注释，中文属性/函数注释仍约束手写适配代码。

## 一次操作应当怎样读

```text
View 的点击方法
  → 本模块 Controller 的明确业务方法
  → 功能 API / 统一网络入口
  → 后端处理入口 → 业务用例 / 规则 / 持久化
  → 校验回包、检查会话与版本
  → 更新唯一 Model（涉及多个资产时统一提交）
  → 发送明确事件
  → View 读取 Model 刷新
```

角色与背包已接入服务端 state.changed；登录/恢复回包统一初始化，不再追加库存查询。其他模块入口暂停，不再保留游戏 HTTP。后续模块按[固定模板](bag-mvc-maintenance.md#固定通信与状态模板)恢复，持久状态仍由所属 Model 唯一管理。

阅读当前角色与背包时，按 Protocol → 应用统一快照校验 → RoleController/BagController.onNotify → 唯一 Model → 页面刷新查找；暂停模块不作为现行模板。

账号变化的跨模块协调放在应用层 AssetStateBinding；账号服务负责登录与凭证，RoleController 和 BagController 消费统一初始化/推送。背包不监听账号、不持有 token、不单独查询库存；旧 api.list 和 BagUpdateCoordinator 已退役，不再作为开发示例。

## 文件组织与职责

继续使用当前 features、framework、platform、app 和 config 结构，逐模块整理，不建立第二套 SG/DataMgr 架构。

| 文件 | 应当负责 | 避免 |
|---|---|---|
| XxxModel | 当前角色唯一状态、只读查询、明确更新方法 | 发网络请求、打开窗口、独立持有 token |
| XxxController | 业务操作、回包/推送校验、版本与生命周期、更新状态和通知 | 窗口关闭就销毁模块、重复资产缓存、静态 UI 布局 |
| XxxApi | 有实际需要时承载消息契约和边界校验 | 为一次调用叠加无用途 Service/Manager/Adapter |
| XxxEvent | 有业务含义的事件名称与类型 | 散落字符串、无含义的通用 change/data 事件 |
| ui/XxxView | 属性绑定、点击转交、显示状态、成对监听清理 | 直接读 token、修改钱包/库存、实现服务器规则 |
| ui/XxxCellView | Cell 显示和点击、复用时清理/迟到资源隔离 | 持有整个模块业务流程 |
| data/ | 有独立用途的数据类型/校验 | 每个简单字段都拆一份文件 |

采用完整名称，例如 HeroRosterController，而不是为模仿 SGCtrl 把现有类改成 HeroC、HeroM、HeroV。文件、类、Prefab 保持含义一致；更名必须同时检查 meta/UUID、动态路径、注册和工具引用。背包是本项目已落地的模块样板，游爱是阅读习惯参考，两者不构成两套冲突标准。

## 方法、排版与注释

- 文件头说明功能、角色、调用入口与重要状态归属；新增或修改函数用中文说明实际作用、结果和必要边界。
- 新增或修改属性也必须写中文注释，说明保存内容、用途及生命周期；依赖说明注入与空值，计数/布尔值说明含义，Map/Set 说明键值与去重范围，Promise 说明等待、复用与清理。包含私有、静态及构造函数参数属性，详见 [属性注释要求](../AGENTS.md#31-属性与成员变量注释)。
- 类内按属性绑定/依赖、状态、初始化与销毁、公开业务方法、回包处理、内部辅助分组。View 优先让人找到打开/关闭和按钮处理。
- 名称表达业务：refreshRoster、upgrade、saveLineup、applySnapshot；避免 doIt、handleData、processAll。只有真正按协议路由时才使用清晰的 switch/映射表，不为模仿 onNotify 把全部业务重新塞进一个大 switch。
- 状态改变、网络提交、通知等重要步骤独立成行；不同判断分支分段。不要把多个副作用写成一行，也不把普通逻辑过度压成三元表达式。
- 新方法按所在文件已有缩进和括号风格书写；参考游爱“展开、直白、易追踪”的习惯，不为括号换行方式全仓格式化。用户现有格式调整保留。
- 依赖明确列出；类型明确，不因参考代码使用 any 就照抄。简单函数保留直白实现，复杂规则有实质职责时才提取。
- 注释解释为什么、什么时候、单位、失败和迟到结果；不逐行翻译代码，不强制堆作者/时间模板。

下面只示意方法排版与注释，不表示项目中已有同名接口：

```ts
/** 保存玩家确认的阵容；失败时保留编辑草稿，成功后才结束编辑。 */
async confirmFormation(): Promise<void> {
    if (this.saving) {
        return;
    }

    this.saving = true;
    try {
        await this.controller.saveLineup(this.draft);
        this.close();
    } finally {
        this.saving = false;
    }
}
```

实际实现还需按本模块约束处理关闭、换号、冲突和错误展示；示意代码不是可直接复制的完整实现。

## 游爱式协议处理的固定阅读结构

Controller 采用 Protocol 登记 → onNotify 按真实消息分发 → onXxx → Model → 事件。背包登记 session.login/session.authenticate/state.changed，应用校验整包、身份与版本后交付。已移除 BagUpdateCoordinator 与单独查询；复杂度由后端事务/持久版本及统一应用提交承担，不能通过删掉正确性边界缩短代码。

全部已实现消息标识集中在 platform/Protocol.ts；当前以 Frame.name 字符串为线上标识，不为模仿数字编号额外维护未使用的编号。

开发预览的下发数据通过统一 [WS接收] 日志查看；默认隐藏心跳和请求/连接 ID，玩法消息附中文说明、字段含义与多行实际数据。日志在应用装配启用，隐藏凭证、限制长度，生产默认关闭。日志与协议事件分开，打印失败不能影响业务。

## 保留清晰写法，同时遵守当前边界

游爱 SGCtrl 的部分方法直接打开窗口，View 也会直接发协议；本项目采用 View 转交业务、UIManager 管窗口、模块独立于窗口的约定，不照搬这些耦合。SGModel 中公开可写字段也不意味着本项目应允许所有页面任意写状态。

资产以服务端为准；同一事务递增一个持久版本，提交后同步，回滚不推送。前端校验完整快照、身份和版本后批量更新，拒绝重复/过期数据；保留后端角色锁、业务幂等和持久化，禁止前端发奖或通过暂停模块回包写库存。

Prefab 保存固定布局、资源与控件绑定；业务列表使用 SuperScroll + SuperContent。页面只更新数据和必要的适配/动画，不能用代码另造一套更方便实现的界面来替代原效果。

## 每个功能的还原流程

1. 在旧源码、配置及正式服中确认入口、前置条件、正常/失败流程、内容和表现；保存来源版本与观察条件。
2. 列出当前实现与原版的差异，区分未实现、已发现错误、版本冲突、已确认本地化/平台差异。缺数据不是简化规则的理由。
3. 明确契约和状态归属，再按本指南实现；已有正确实现保留，临时子集不当成完整还原。
4. 验证真实请求、回包、资产、重登和异常恢复；再在相同视口、对应状态下比较正式服画面与交互。随机掉落比较规则与约束，不能为得到相同截图伪造数据。
5. 记录代码是否完成、规则是否一致、效果是否一致以及三端/人工维护验收，分别说明，不用一个“完成”掩盖未验项。

当旧客户端、旧服务端、配置与正式服有实质冲突，或修改会影响玩家规则/内容/效果时，带具体证据和选项向用户确认。在问题未澄清前继续独立工作，不把自己的猜测写成已确认需求。


## 角色基础资料约定

- 角色唯一状态仍归 AccountModel.role，RoleController.onNotify 接收统一初始化和 state.changed；不再创建另一份角色缓存或打开页面时查询。
- 原字段与配置依据见 [角色基础契约](role-data-contract.md)。experience 为角色本级经验，experienceToNextLevel 来自 mainlevel，不能套用英雄经验或把累计经验直接显示为本级经验。
- headId、imageId、borderId 分别是头像、形象和头像框，禁止互相代用。服务端 Unix 秒字段名必须带 Seconds；历史未知时间为 0，页面不能显示成 1970 年。
- 服务端变更基础资料须在角色锁事务内更新并调用 AssetSyncService.changed；同事务只递增一次版本，提交后同步，回滚不通知。禁止增加前端任意写角色属性的协议。
- basics 若存在必须完整校验，非法字段拒绝角色与背包整包；缺失表示尚未同步，不能伪造成全零资料。修改 .proto 后生成协议代码并验证真实 TS/Java 互通。


## 账号界面与窗口打开规范（2026-11-03 整理）

- 独立业务窗口必须使用 BaseView、同名 Prefab、UIManager 注册与打开/关闭。不得在主城手动 instantiate 角色弹窗、维护第二套 show/hide 和销毁逻辑。
- RoleProfileView 的 Prefab 位于 prefabs/ui/account，保留原 SettingLayer UUID。RemakeApp 注册 role-profile；头像点击经 HomeController 交回应用，UIManager 打开，窗口订阅唯一 AccountModel，关闭时退订。重复打开不累积监听；账号清空或忙于切换时关闭并取消未完成的打开。
- AccountLoginView 是登录页面，ServerPickerView 是选服弹窗，两者都由 UIManager 管理。ServerCellView 是列表子组件；LoginArtwork 是登录页面适配组件；LoginLayout 和 RolePortrait 是辅助函数，不要求一一对应独立窗口。
- 服务器和区域两列均为 SuperScroll → view/Mask → content/SuperContent。Prefab 保存 cellPrefab、尺寸、间距和方向；View 只 setData，不销毁重建所有格子、不计算格子坐标或 content 高度。
- LoadingLayer/BootChrome 是启动加载流程，用于资源准备、进度和提示；AccountLoginView 负责账号、选服与进入。共享背景或尺寸计算不代表同一界面。启动层独立管理不构成业务弹窗绕过 UIManager 的例外。
- 验收分别记录结构/自动检查与 Creator 实际效果；未实际打开不能声称完成视觉验收。

## 预制体节点命名

- 新增或修改的 Prefab/Scene 节点使用有业务含义的英文名称，禁止中文节点名；例如 CloseButton、HeroTabButton、SearchInput、StatusLabel。界面展示文字和源码注释仍使用中文。重命名时检查节点路径、动画轨道与代码查找，保留资源 UUID 和组件绑定；旧模块在涉及修改时逐步整改，不批量改动无关模块。

### 通用纸面面板 CommonPanel1

背包和英雄列表通过静态嵌套引用 assets/prefabs/ui/common/CommonPanel1.prefab，共享背景和标题，不复制独立节点。面板根 UITransform 尺寸就是可见纸面尺寸，背景填满根；标题由面板内部 Widget 居中并跟随上沿。页面只覆盖实例的位置、尺寸和标题文字；修改共用样式应编辑源预制体。不要解除嵌套关联，也不要在页面脚本重复移动内部标题。

## 格式化与工具类静态入口

2026-11-04新增用户约束；对后续新增和实际修改代码生效，现有文件按涉及范围逐步整改，不批量改无关模块。现有package.json未配置统一格式命令，本次只制定规范，不声称已安装/运行格式化工具。

- 多条语句、构造函数注入、复杂分支和对象初始化展开；默认新建TS/Java使用4空格，已有文件先保持局部风格。长参数和长条件换行，逻辑块使用大括号，方法之间留空行。交付前检查排版；禁止继续压成难读的一行。
- 无状态的数据转换/展示辅助用XxxUtils；面向某项协作任务的辅助用XxxHelper。统一使用完整英文名称，不混用help/util随意缩写。HeroSkillPresentation已迁为HeroSkillUtils，仍放在features/hero，不因Utils后缀移到通用层。
- 工具类显式public static暴露入口、private static封装内部方法、private constructor阻止实例化。Controller/Model/Service等具有状态和生命周期的对象保持实例方法；静态方法不是消除依赖、缓存或生命周期的手段。
- 允许类型/interface导出；引擎约定的函数、脚本入口、闭包工厂有理由时保留export function。迁移同步全部引用、测试与meta，保留资源UUID，不另留无必要旧入口。

目标写法示意（不是已落地的HeroSkillUtils API）：

```ts
/** 英雄技能显示辅助：只整理文案，不管理窗口或玩家状态。 */
export class HeroSkillUtils {
    /** 纯静态工具不允许实例化。 */
    private constructor() {}

    /** 将已校验的技能等级转换为展示文字。 */
    public static formatLevel(level: number): string {
        if (level <= 0) {
            return "未解锁";
        }

        return `Lv.${level}`;
    }
}
```

## 日志分层、颜色和失败处理

现状：core/GameLog保留环形缓冲及旧入口，新增LogLayer、classified和warnOnce，集中管理职责层颜色。openView归框架层，默认蓝色#4ea1ff；framework/ui/UIOpenLog由UIManager等调用。业务模块原有GameLog日志已显式分类，应用装配和框架调用也已迁移；少量底层直接console异常入口仍待逐一核对后迁移。

### 分类按职责，不按页面名称

| 所属层 | 标识建议 | 固定颜色 | 典型来源 |
|---|---|---|---|
| 应用层 | APP | 紫色 #B388FF | 启动装配、登录后协调、AssetStateBinding |
| 模块层 | MODULE | 绿色 #66BB6A | Hero/Bag/Role等Controller、Model、View及业务Utils |
| 框架层 | FRAMEWORK | 蓝色 #4EA1FF | UIManager、页面栈、事件派发、通用资源生命周期 |
| 平台通信层 | PLATFORM | 青色 #26C6DA | WebSocket、Protobuf、平台适配、网络收发 |
| 配置资源层 | CONFIG | 金色 #D4A72C | 配置解析/引用校验、资源目录查找与配置生成结果 |
| 开发工具层 | DEV | 灰色 #90A4AE | GM开发诊断、测试宿主与编辑器辅助 |

UIManager打印“打开HeroInfoView”仍是框架层蓝色；HeroInfoView打印“英雄技能配置缺失”属于模块层/Hero；配置加载器自身报告同一缺表属于配置资源层。业务调用点明确传所属层与来源，不按路径字符串自动猜测。只在真正负责处理失败的一层记录一次，避免同一错误在两层重复打印。

分层、来源、级别是三个维度。建议纯文本形态为`[mxzg][MODULE][HeroSkillUtils][error] 时间 内容`。debug/info常规文本沿分类色；warn/error保留分类前缀色，级别可额外使用橙色#FFB74D/红色#EF5350并走相应控制台通道。不能让错误把所属层信息覆盖掉；也不能只靠颜色辨识错误。无CSS控制台（Node/部分小游戏环境）保留完整文本，不输出裸%c或颜色控制字符。

色板/枚举统一放GameLog相关核心，不由每个模块维护。现有UI打开蓝色行为保留；迁移时兼容环形缓冲、纯文本format、订阅和收包脱敏。业务不直接调用console；日志核心、不可依赖核心的启动兜底及独立工具可按边界使用。后端继续使用现有Java日志体系，以分类标签对应上述职责，不要求把浏览器CSS输出搬到Java。

### 打印与中止不是同一件事

| 情况 | 日志与行为 |
|---|---|
| 正常开窗、状态同步完成 | info/debug，记录必要来源与耗时，不抛异常 |
| 可恢复展示缺配置/资源 | warn/error一次，返回明确缺失结果或中止本页打开；View展示缺失/失败状态，不造默认属性 |
| 非法协议、角色归属错误、资产不一致 | 拒绝整包/回滚；在接收边界记录一次，保留异常原因，不能仅打印后继续提交Model |
| 无法安全继续的配置缺失/程序不变量 | 中止该流程，保留throw或明确失败结果，上层负责统一记录与反馈 |

针对`throw new Error("缺少英雄技能配置：" + id + " / " + previewLevel)`，后续整改应把错误日志归为模块层/HeroSkillUtils，记录技能ID、等级及调用结果。若采用“打印并返回缺失”的方式，必须同步修改返回类型、调用方和测试，禁止只删除throw后继续访问row。整包协议和资产校验的throw不在这类展示提示替换范围。

重复刷新按来源/稳定错误码/配置键去重或限频；退出或会话切换按需要清理限频状态。网络日志仍脱敏凭证，默认不显示心跳，有界截断；任何日志故障不得导致业务失败。用户可见提示由View/Controller的失败流程负责，不直接将开发堆栈弹给玩家。

### 实施顺序与本轮边界

已接入GameLog.classified与warnOnce，集中管理层颜色、级别颜色和有界告警去重；UIManager打开日志归FRAMEWORK。HeroSkillUtils已替代HeroSkillPresentation并保留脚本meta UUID；技能展示缺行时返回available=false，禁用说明入口并记录MODULE告警。其余旧日志入口继续可用，尚未全库迁移。

## 当前模块归档标准（2026-11-04）

以用户整理的bag为准：模块目录小写，根目录保留业务Controller/Model及有生命周期的入口；data保存数据和交互类型；ui保存页面与格子组件；utils保存事件名、配置索引及展示工具。目录归档不强制将有缓存/订阅的对象变成静态类。

本批Bag已改为bag；HeroRosterUtils以public static present投影名册，HeroRosterSource/View归入data/HeroRosterData。英雄技能、配置索引、装备读取、事件和详情尺寸归入hero/utils；账号头像/布局归入account/utils；主城导航归入city/utils；战斗字体/只读资源目录归入battle/utils；GM两个View归入gm/ui。所有移动脚本保留原meta，背包展示工具的孤立meta已归位并恢复原UUID。

三个模块Controller对于非自身协议的直接通知改为MODULE去重告警后忽略，未更新Model；ProtocolRouter仍拒绝未登记/非法回包，应用仍原子校验整包资产。这不表示允许未知协议或错误数据入库。

## 主线阵容按背包模板收整（2026-11-04）

FormationController是应用持有的BaseController模块，构造只接收FormationSaveModel和HeroRosterModel，不接收View/Screen/绘制回调；不提供show/close页面生命周期。configure由应用注入已有鉴权写入口，initialize只登记FORMATION_SAVE和权威状态通知。应用层AssetStateBinding统一resetSession/dispose，模块不监听登录。

权威阵容仍唯一位于HeroRosterModel.mainFormation。FormationSaveModel只保存busy、未确认请求、回执等待版本与提示，不保存站位资产或页面草稿；Controller提交进度后发FormationEvent.SaveChanged。页面监听该事件和HeroRosterEvent.Updated，读取Model后自行绘制。

FormationView维护选中英雄、未保存站位/阵型、元素筛选与按钮监听；关闭丢弃草稿、清理本页监听，不销毁模块。保存期间关闭窗口，模块仍可接收回执并等待统一状态；结果不明请求保留原幂等键，重新打开仍可重试。角色变化才由应用统一清空请求。GameSocketClient负责连接代次，应用装配的AccountService.deliverAuthenticated统一决定是否交付成功/失败；BaseController不保存会话代次。各业务不新增账号监听、角色键比较、全局队列或独立会话去重体系。


## 连接、身份与业务的固定边界

- 通信层GameSocketClient持有连接代次、连接ID与请求关联；旧连接的回调不交付，切换连接统一结束在途请求。
- 应用通过AccountService.deliverAuthenticated装配写请求。它使用账号服务已有身份周期，在返回成功及失败前均检查当前身份；换号、退出、重新登录同一角色后都不向旧请求交付业务结果。不能只隔离成功而把旧失败交给模块恢复待重试状态。
- AssetStateBinding整包校验角色归属及服务器revision，身份改变时先调用应用页面清理入口，再统一重置模块，最后提交新身份的快照。恢复同一角色只提交快照，不关闭页面、不清空未确认请求。
- Controller只登记onNotify、校验业务回执、更新唯一Model和发布事件；不捕获会话代次、不比较角色键、不监听账号。Model/事件保留roleKey作为数据归属描述及应用重置参数，不据此建立第二套请求防护。
- View只管理页面草稿、选中、滚动和自身监听；应用关闭旧角色页面。closed、节点有效性和异步贴图代次属于页面/资源生命周期，应保留。
- 请求幂等键、重复点击保护、回执requestId匹配及服务器版本校验属于业务正确性，应保留。断网失败允许原请求显式重试；关窗不取消模块保存；客户端隔离不撤销旧角色已提交的服务端事务。


## 战斗输入的阵型属性约束

- 阵型ID、站位和版本从同一角色锁内的持久状态读取，不能采用客户端传来的属性或从当前英雄重新推断玩家选中的阵型。
- 复用MainFormationRules读取BattleMatrixAddition，按阵型和位置查询原始属性编号；比例值按旧配置保留万分比，治疗、减伤等编号不得误映射为四维面板。
- 每次战斗输入从基础及已恢复贡献重新构建。阵型贡献只加入该次输入，不修改HeroProfile.panelStats、数据库派生值或共享配置，不把上次输入继续累加。
- 对非法持久阵容拒绝生成，不用保存规则的过滤结果静默替代玩家数据；只读构建不得写回解锁、站位、资产版本或发送状态变化。
- 已接入来源才从pending中移除；缺口非空时禁止宣称完整战斗输入。测试必须覆盖换阵型、换位置、重复读取、合法零加成和面板隔离。


## 战斗折算与触发恢复边界

- 以旧实际调用链确定公式，不按方法名猜语义。普通入场生命比例与攻防速上限不同；攻击不重复折算，保留Java double后向零截断。
- 原始属性、入场基线、动态战斗状态与英雄面板分离；opening不是完整伤害结果，不能写回资产或当基础再加成。未知来源继续列pending。
- 技能按type/level读取，先完成已核对的进化覆盖，再解析排期。active_type编号沿旧枚举，保留列表顺序、cool_round+1周期及原始模运算边界。
- 候选技能、行动资格、动作执行、Buff触发是不同阶段。排期工具不得假装完成控制状态、概率、选目标或伤害；已贡献面板的count_stats被动不能重复加算。
- 看似异常的旧语义先记录并用边界测试固定，需改变玩法时再与用户确认；不自行增加初始回合下限、随机排序或通用概率默认值。
