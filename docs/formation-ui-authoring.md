# 主线阵容页面维护

本批仅恢复主线阵容编辑和保存；战斗、挂机、升级、穿脱和购买仍未开放。

入口：英雄列表原阵容按钮 → UIManager的remake-formation弹窗。静态资源为client/assets/prefabs/ui/hero/FormationView.prefab；列表格子为FormationHeroCellView.prefab，复用HeroIconCellView与原美术，根缩放0.85保存在预制体。

页面只读HeroRosterModel统一快照，打开不额外查询英雄或阵容。点击英雄，再点可用阵位放置；无选中英雄时点击阵位撤下。阵型按钮循环当前已解锁阵型，切换仅改变草稿；确认才发送formation.save。关闭放弃草稿，确认回执不直接修改资产Model。

列表统一SuperScroll＋SuperContent：五列、格子引用、间距和边距均由Prefab保存；View只setData，不计算Cell坐标或content高度。保留原Mask和窗口适配，静态FormGrid占位已停用并移出列表content，防止布局混入非列表节点。

阵位开放及助战条件由服务端options投影。客户端只能编辑允许位置，不自行重算永久解锁。保存仍由服务端按旧版归一化；空阵拒绝，同模板后续条目跳过。阵型与站位同事务持久化并递增阵容版本，通过state.changed统一下发。

结果不明时页面保留原requestId、expectedVersion和参数，仅允许原样重试；服务端持久回执支持跨连接重试，复用同键修改参数拒绝。明确版本冲突重新载入Model，关闭/换号后的迟到回包不再操作旧页面。关闭窗口后的新请求仍受服务端版本保护。

当前自动检查与实际画面验证范围见development-progress.md；不以结构检查替代完整视觉或Inspector验收。

## 当前生命周期

页面不再由createController工厂创建布阵控制器。应用初始化唯一FormationController，View默认读取唯一Model并自己绑定按钮与事件；configure仅供显式依赖注入和回归测试。关窗清理页面草稿与监听，不清理模块保存请求；应用层负责退出/换号时清理。
