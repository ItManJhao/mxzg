# 场景入口

唯一有效入口为 `Remake.scene`。在 Creator 打开并选择预览当前场景。

Canvas 上的 RemakeApp 负责装配新 HTTP API、模块服务及统一 UIManager。StartupHost 展示加载过渡，PageHost 承载登录和主城；功能页面复用主城内容宿主，出阵和选服使用弹层。

使用 `scripts/start-remake-backend.bat` 启动新后端，默认地址 `http://127.0.0.1:18080`。

Boot/Main 及历史空战斗场景已经删除。战斗由现有 BattlePanelLayer/BattlePage Prefab 与新 Campaign 流程展示，不增加独立场景。

当前以本机预览为主，不自动构建任何平台包。Prefab 保留静态层级、布局、图片和 Inspector 绑定；只在确有独立生命周期时新增场景。
