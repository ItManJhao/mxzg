# 客户端代码入口

唯一有效启动链：`app/remake/RemakeApp.ts`。场景为 `assets/scenes/Remake.scene`。

- `app`：启动资源、登录/主城流程、页面注册和模块服务生命周期。
- `features/account`：开发登录、服务器选择、会话与鉴权。
- `features/home`、`features/city`：主城组合和主城显示。
- `features/hero`：真实名册、筛选、阵容版本保存和出阵 UI。
- `features/Bag`：唯一库存 Model、模块 Controller、库存事件与界面。
- `features/battle`：主线请求、战报播放、领奖及战斗显示素材规则。
- `framework`：全局事件、作用域、资源加载、UIManager、通用显示适配。
- `platform`：HTTP 与平台能力；`config`：策划配置读取和资源目录。
- `core`：现有日志与错误说明，不保存角色业务状态。

`module` 和旧 `net` 已删除；没有兼容转发或旧数据源回退。通用框架不反向导入功能 UI。

事件示例：`EventDispatcher.instance.on(BagEvent.BagUpdate, this, this.refreshFromModel)`。BaseView 在关闭、绑定失败和销毁时解除该目标的全部事件；其他资源订阅使用 EventScope。模块服务不随窗口关闭释放。

实际维护入口和本轮验证范围见仓库 `docs/architecture.md`、`docs/architecture.md`。
