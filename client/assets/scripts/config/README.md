# 配置源码入口

GameConfig 是唯一配置存储与查询入口，GConfig 由显式规范和本项目表头生成；RemakeConfigUtils 负责按组装配 Creator 读取器。

| 文件 | 修改入口与保留原因 |
|---|---|
| GameConfig | 唯一配置存储、原子校验、只读查询与资源版本隔离 |
| GConfig | 从schema生成的表类型和加载地址，修改输入后重新生成 |
| RemakeConfigUtils | Creator读取装配及页面仍使用的主城、英雄、详情、背包配置准备，均为静态方法 |
| CityNavigationUtils、EntryGateUtils | 七个底栏槽与地图动态路由的标题、门槛查询；旧页面名字栈已删 |
| BattleTimingUtils | 当前战斗帧动画70毫秒基础间隔，不保存未接入的倍速等级状态 |
| PrefabCatalog | 主城两个Prefab地址及离线UUID身份索引；不是图标清单 |
| PrefabPlanUtils | PrefabLoader实际使用的准入，修改tools/prefab-plan.json后重新生成，不手改生成文件 |

重复types.ts已删除，表类型直接使用GConfig；只有测试使用的夹具类型留在测试。阶段目标统一在LoadingPlan配置，不恢复prepareStartupConfig或未接入的prepareHeroLevelConfig包装。

生成方式、加载状态、版本边界与使用示例见 [配置与资源维护](../../../../docs/config-pipeline.md)。不恢复 ConfigDb、loadAll 或旧全局展示缓存。
