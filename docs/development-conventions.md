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
| 更新状态 | getSGameData → sgModel.setData；getRecord → setRecord | BagController.read → BagModel.replaceAll，状态由唯一 Model 持有 |
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

阅读现有普通升级时依次看 HeroInfoUpLevelLayer.submit、HeroLevelController.upgrade、HeroLevelApi.upgrade、后端 HeroLevelController/Service，再回到 BagController.runInventoryUpdate 的状态提交和页面通知。点击方法里应看得出调用哪个业务，不能把身份、联网、扣资源和绘制挤在一个匿名回调中。

账号变化的跨模块协调放在应用层：账号负责登录与凭证，应用通知背包清理/加载；背包只请求、提交库存并发事件。统一鉴权封装在应用注入的 api.list() 内，BagController 不依赖 AccountModel/AccountService，不接收 token。客户端会话标识只防止旧结果污染，服务端决定真实库存归属。该边界已落实背包；其他存量模块按批迁移。游爱继续提供明确业务方法、Model 更新与事件通知的阅读参考；需要补齐的后端以旧游戏规则和已核实的前端需求定义契约，不凭界面猜消耗与奖励。

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
