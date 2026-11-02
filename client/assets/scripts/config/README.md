# 配置源码入口

GameConfig 是唯一配置存储与查询入口，GConfig 由显式规范和本项目表头生成；RemakeConfig 负责按组装配 Creator 读取器。

生成方式、加载状态、版本边界与使用示例见 [配置与资源维护](../../../../docs/config-pipeline.md)。不恢复 ConfigDb、loadAll 或旧全局展示缓存。
