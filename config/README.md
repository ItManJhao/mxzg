# config

策划表在 `gameconfig/*.xlsx`。这是工程内的源，本机路径 `G:\work\FsGame\Project\mxzg\config\gameconfig`。当前主城的三份特殊投影输入在 [client-maincity](client-maincity/README.md)，与部分 XLSX 的已知版本差异先保留当前状态，后续专项核对。

`tools/export_gameconfig.py` 默认只导出当前读取闭包的31表，范围由 schema、当前源码、统一检查登记的实际配置读取及规则投影得出；含战斗美术专项通过 `rows(name)` 间接读取的 `buffart`，不再将全部旧模块表复制回客户端。`--list` 列出每表读取证据，`--check-scope` 只读检查；`--all` 全量旧表仅允许显式导出到 `client/assets` 之外归档。正常导出保留已有 meta 和 UUID。配置流程说明见 [配置与资源维护](../docs/config-pipeline.md)。

`gameconfig/`、`client-maincity/` 和明确放行的生成/检查输入进 Git；其他本机配置仍忽略。`ip2region.db` 留在本机，不放进这个目录的版本库。

旧服路径配置已随旧链退役；策划源路径为 `G:\work\FsGame\Project\mxzg\config\gameconfig`。
