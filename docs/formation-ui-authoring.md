# 主线阵容页面维护

更新：2026-11-16。主线阵容编辑保存、前三关挑战/结算和挂机演出已接入；升级、穿脱、宝箱领取、快速战斗和购买仍未开放。

入口：英雄列表阵容按钮或主线出战按钮 → UIManager的remake-formation弹窗。页面参数在features/hero/ui/FormationView.ts的@UIRegistry.view定义；完整资源为client/assets/bundles/module/hero/prefabs/FormationView.prefab，列表格子为同目录FormationHeroCellView.prefab，复用HeroIconCellView与原美术。静态布局归Prefab，根窗口适配复用现有ViewportLayoutUtils。

页面只读HeroRosterModel统一快照，打开不额外查询英雄或阵容。点击英雄，再点可用阵位放置；无选中英雄时点击阵位撤下。阵型按钮循环当前已解锁阵型，切换仅改变草稿；确认才发送formation.save。关闭放弃草稿，确认回执不直接修改资产Model。

列表统一SuperScroll＋SuperContent：五列、格子引用、间距和边距均由Prefab保存；View只setData，不计算Cell坐标或content高度。保留原Mask和窗口适配，静态FormGrid占位已停用并移出列表content，防止布局混入非列表节点。

阵位开放及助战条件由服务端options投影。客户端只能编辑允许位置，不自行重算永久解锁。保存仍由服务端按旧版归一化；空阵拒绝，同模板后续条目跳过。阵型与站位同事务持久化并递增阵容版本，通过state.changed统一下发。

FormationSaveModel保留原requestId、expectedVersion和参数至回执及权威阵容双确认。无ACK时结果不明只重试原请求；有ACK缺推送时每轮只补一次现有鉴权首包，绝不重发保存。mainFormation.version达到ACK版本才完成，不能把全局资产revision、本地Model版本或Promise结束当成功。仍缺状态时按钮显示“重试同步”，站位及阵型维持原提交内容只读，筛选仍可查看。服务端持久回执支持跨连接重试，复用同键修改参数拒绝；明确版本冲突按既有流程载入最新Model。

当前自动检查与实际画面验证范围见development-progress.md；不以结构检查替代完整视觉或Inspector验收。

## 当前生命周期

页面不再由createController工厂创建布阵控制器。应用初始化唯一FormationController，View默认读取唯一Model并自己绑定按钮与事件；configure仅供显式依赖注入和回归测试。关窗清理页面草稿与监听，不清理模块保存请求；应用层负责退出/换号时清理。

保存和鉴权任务按对象引用合并重复点击；重置撤销旧续段，但不在模块保存账号键。关页时清理本页submitted及出战回调，迟到确认不会误出战；重开可继续确认原意图，只有明确点击且原提交草稿被权威快照确认，closeAfterSave入口才继续一次挑战。普通断线仍保留内存过程，冷重登不持久恢复未保存草稿。

恢复专项26组、原状态/真实Prefab专项及本机真实WS丢一次状态交付已限定通过，详见[恢复记录](validation/formation-confirm-review-20261116.json)、[本机记录](validation/formation-confirm-preview-20261116.json)。失败、旧首包、并发和身份切换由专项覆盖，不作为目标真机或真实弱网结论；本批没有集中构建。
