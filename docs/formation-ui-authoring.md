# 主线阵容页面维护

更新于 2026-11-18。当前玩法范围见 [开发进度](development-progress.md)。

入口：英雄列表阵容按钮或主线出战按钮 → UIManager的remake-formation弹窗。页面参数在features/hero/ui/FormationView.ts的@UIRegistry.view定义；完整资源为client/assets/bundles/module/hero/prefabs/FormationView.prefab，列表格子为同目录FormationHeroCellView.prefab，复用HeroIconCellView与原美术。静态布局归Prefab，根窗口适配复用现有ViewportLayoutUtils。

页面从 `HeroRosterModel` 的统一快照建立草稿。点击未上阵英雄时按格号填入首个开放空位，点击已上阵英雄或短按占用的阵位可以撤下。拖到开放空位会移动，拖到已占用的开放位置会交换，拖到无效位置、手势取消、关闭或重绘时头像回原位。九槽由预制体中的 `SlotInput` 统一接收触摸，同时覆盖前后排的有效格。进行中只移动原头像，更新草稿后才重新绘制。确认发送 `formation.save`，关闭放弃草稿。

列表使用 SuperScroll＋SuperContent，按旧版四列纵向滚动。已保存的主线上阵英雄优先，同组按星级、等级、模板编号降序。格子、间距、边距和内收的 Mask 在 Prefab 中维护，默认视口完整显示两行英雄及星级。`FormationHeroCellView` 的 `DeploymentOverlay` 依次绘制压暗和绿色勾，随草稿中的实例 ID 更新，草稿编辑时保持列表顺序。

阵位开放及助战条件由服务端options投影。客户端只能编辑允许位置，不自行重算永久解锁。保存仍由服务端按旧版归一化；空阵拒绝，同模板后续条目跳过。阵型与站位同事务持久化并递增阵容版本，通过state.changed统一下发。

阵型按钮通过 `UIManager.openChild` 打开 `FormationMatrixView`，使用 `Dialog` 层及共享模态，随出阵页关闭。窗口展示登录配置包中的 `battlematrix`、`battlematrixaddition` 和原语言标签。锁定阵型可以查看开放格、格位加成和解锁条件。只有统一快照已解锁的阵型可以确认，父页在应用选择时复核当前允许站位。

阵型窗确认只更新出阵草稿。切换时按新旧开放普通格的相同序号迁移英雄，空格也占一个序号。基础阵型的第 5 格切换到阵型 2 后对应第 3 格。第 9 格助战在前后阵型都允许时留在原位，阵型窗只预览八个普通格。点击出阵才发起保存。

出阵右上方的元素图标通过 `UIManager.openChild` 打开 `FormationElementView`，使用 `Dialog` 和共享模态。`FormationElementUtils` 从 `heroelemmul` 读取对敌克制倍率，从 `elementaddition` 读取同元素和五元素混合光环。光环按与主线战斗相同的表顺序取各组最后达标档，不同组的同属性相加。只统计当前草稿开放的普通参战位。对敌克制单列在图上，队伍汇总只显示已激活光环。

上阵、撤下、拖动或切换阵型后，出阵页的汇总与元素图标使用同一次草稿投影。普通开放格在头像下方显示当前阵型的配置属性，空位也显示。切换草稿阵型时即时更新，关闭格隐藏，助阵位保留原标识。元素说明已打开时刷新同一实例，关闭出阵页时一并释放。

FormationController 发送保存请求并记录成功回包的阵容版本，FormationSaveModel 只保存按钮忙态和该版本。HeroRosterModel 的权威阵容达到该版本后，当前提交页面才继续出战。快照通过正常推送或重连鉴权更新。保存结果不明时，查看同步后的当前阵容；普通保存不追查或自动重放上次操作。

当前自动检查与实际画面验证范围见development-progress.md；不以结构检查替代完整视觉或Inspector验收。

## 当前生命周期

应用初始化唯一FormationController，View默认读取唯一Model并自己绑定按钮与事件；configure仅供显式依赖注入和回归测试。关窗清理页面草稿与监听，不清理模块保存请求；应用层负责退出/换号时清理。

在途保存合并重复点击。关窗清理草稿、监听和本页出战回调，迟到确认不会触发出战。账号结束时统一清理模块保存进度。冷重登重新读取服务器的当前阵容。

历史缺推送和本机验证记录见 [恢复记录](validation/formation-confirm-review-20261116.json)、[本机记录](validation/formation-confirm-preview-20261116.json)。该版本的主动补快照行为已被当前的正常推送与重连同步替换。
