# 主线阵容页面维护

更新于 2026-11-18。当前玩法范围见 [开发进度](development-progress.md)。

入口：英雄列表阵容按钮或主线出战按钮 → UIManager的remake-formation弹窗。页面参数在features/hero/ui/FormationView.ts的@UIRegistry.view定义；完整资源为client/assets/bundles/module/hero/prefabs/FormationView.prefab，列表格子为同目录FormationHeroCellView.prefab，复用HeroIconCellView与原美术。静态布局归Prefab，根窗口适配复用现有ViewportLayoutUtils。

页面从 `HeroRosterModel` 的统一快照建立草稿。点击未上阵英雄时按格号填入首个开放空位，点击已上阵英雄或短按占用的阵位可以撤下。拖到开放空位会移动，拖到已占用的开放位置会交换，拖到无效位置、手势取消、关闭或重绘时头像回原位。九槽由预制体中的 `SlotInput` 统一接收触摸，同时覆盖前后排的有效格。进行中只移动原头像，更新草稿后才重新绘制。确认发送 `formation.save`，关闭放弃草稿。

列表使用 SuperScroll＋SuperContent，五列、格子引用、间距和边距在 Prefab 中维护。`FormationHeroCellView` 的 `DeploymentOverlay` 依次绘制压暗和绿色勾，按草稿中的实例 ID 更新，格子复用时重设状态。实际布局沿用原 Mask 和窗口适配。

阵位开放及助战条件由服务端options投影。客户端只能编辑允许位置，不自行重算永久解锁。保存仍由服务端按旧版归一化；空阵拒绝，同模板后续条目跳过。阵型与站位同事务持久化并递增阵容版本，通过state.changed统一下发。

现有阵型按钮循环已解锁阵型。切换时按新旧开放普通格的相同序号迁移英雄，空格也占一个序号。基础阵型的第 5 格切换到阵型 2 后对应第 3 格。第 9 格助战在前后阵型都允许时留在原位。整个切换只更新草稿。

FormationSaveModel保留原requestId、expectedVersion和参数至回执及权威阵容双确认。无ACK时结果不明只重试原请求；有ACK缺推送时每轮只补一次现有鉴权首包，绝不重发保存。mainFormation.version达到ACK版本才完成，不能把全局资产revision、本地Model版本或Promise结束当成功。仍缺状态时按钮显示“重试同步”，站位及阵型维持原提交内容只读，筛选仍可查看。服务端持久回执支持跨连接重试，复用同键修改参数拒绝；明确版本冲突按既有流程载入最新Model。

当前自动检查与实际画面验证范围见development-progress.md；不以结构检查替代完整视觉或Inspector验收。

## 当前生命周期

页面不再由createController工厂创建布阵控制器。应用初始化唯一FormationController，View默认读取唯一Model并自己绑定按钮与事件；configure仅供显式依赖注入和回归测试。关窗清理页面草稿与监听，不清理模块保存请求；应用层负责退出/换号时清理。

保存和鉴权任务按对象引用合并重复点击；重置撤销旧续段，但不在模块保存账号键。关页时清理本页submitted及出战回调，迟到确认不会误出战；重开可继续确认原意图，只有明确点击且原提交草稿被权威快照确认，closeAfterSave入口才继续一次挑战。普通断线仍保留内存过程，冷重登不持久恢复未保存草稿。

恢复专项26组、原状态/真实Prefab专项及本机真实WS丢一次状态交付已限定通过，详见[恢复记录](validation/formation-confirm-review-20261116.json)、[本机记录](validation/formation-confirm-preview-20261116.json)。失败、旧首包、并发和身份切换由专项覆盖，不作为目标真机或真实弱网结论；本批没有集中构建。
