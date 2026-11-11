# 当前主城配置生成输入

这三份 JSON 是当前主城已在使用的配置投影，保留完整容器、行和原始字节。`tools/export_gameconfig.py` 默认从这里导出到客户端；其他当前表仍读取 `config/gameconfig` 中的 XLSX。客户端资源的原 `.meta` 和 UUID 不重建。

这次整理发现当前投影与仓库 XLSX 的版本存在差异：

- `createmaincitybtn.json` 当前为 33 行；XLSX 为 34 行，多出 `act_destroy`。
- `maincitypos.json` 当前为 19 行，包含 `main_crusade_group`、`main_country_war`；XLSX 为 18 行，包含 `main_battlefield`，部分条目编号也不同。
- `maincityeffect.json` 当前内容与 XLSX 主表一致；同样保留既有特殊容器。

本批保持当前页面状态，不在资源清理时选择另一套主城规则。主城原始规则与版本差异仍需专项核对，不能据此标记完整 1:1 还原。修改这里后，先导出到临时目录比较，再按任务授权更新实际资源并复验。
