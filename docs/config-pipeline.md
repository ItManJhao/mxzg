# 配置与资源维护

运行时入口为 GameConfig 和 ResourceCatalog，不保存玩家数据，不因 import 预加载美术。开发约束只维护在 [AGENTS.md](../AGENTS.md)。

## 配置来源与生成

策划源在 config/gameconfig/*.xlsx。现有格式：第一行中文说明，第二行导出标记 1/2/3，第三行字段名，第四行起数据；部分表采用类型词。空单元格省略，空表保留 rows: []。system_gate 与 opencondition 是导出投影；三张 maincity JSON 分别使用 main 数组、act 字典、maincityeffect 数组。

1. python tools/export_gameconfig.py 导出 JSON，保留已有 meta UUID。
2. [client-schema.json](../config/client-schema.json) 维护明确字段、主键、必需性与结构规范。
3. python tools/generate_config.py 生成 GConfig.ts；--check 只核验，不写入。

当前覆盖 10 张有效或保留能力表，现有九张按组加载，HeroTalk 仅提供保留详情的描述，未提前加载。不是对全部历史 536 张表猜类型。新增表先声明规范再加入分组。数组必须声明 items，对象必须声明 fields，空对象禁止额外字段；原 JSON 中数组文本仍为 string，不擅自改变格式。字段注释优先来自本项目表头，派生及 JSON-only 字段在规范维护。生成顺序稳定，不写本机绝对路径。

语言表 key=# 为注释行，规范显式排除；数字文本语言键可用数字查询。opencondition 的 act_recharge_day_reward 有两条不同等级，暂保留原 findOpen 首行语义与整表顺序，待策划确认；其余重复主键仍报错。

2026-10-31 接手续核对源表：opencondition.xlsx 的 opencondition 工作表第 88 行（idx=85）是“福利-积天豪礼”，condition_value=6；第 138 行（idx=135）是“积天累充”，condition_value=13。两者 atom 相同，open=5、condition_type=1、world_level=1；导出 level 分别为 6/13，open_server_day 均为 0。GameConfig 索引保留先出现的 6 级行，整表保留两行。负责人需决定是同功能取哪一行，还是两个功能应拆 atom；本次未改变任何开放规则。

背包标签使用 item.xlsx 的 place：0 不在背包显示、1 装备、2 道具、3 碎片、4 特殊（当前页签美术为精灵）。type 是效用类型，不代表背包标签；隐藏显示不删除 Model 中库存，也不影响结算发奖。

## 加载与查询

    await prepareInventoryConfig();
    const item = GameConfig.instance.getConfig(GConfig.Item, itemId); // ItemRow | undefined
    const rows = GameConfig.instance.getConfig(GConfig.Item);        // 稳定只读数组
    const required = GameConfig.instance.requireConfig(GConfig.Item, itemId);
    const state = GameConfig.instance.status(GConfig.Item);

RemakeConfig 的 startup 只读 Language/LoadingTips；city 再读五张主城表；hero 再读 HeroType/Item；inventory 复用 Item/Language。表未加载或首次加载失败抛 ConfigUnavailable，status 区分 unloaded/failed；已加载空表返回空数组，缺行返回 undefined，requireConfig 缺行抛 ConfigRowMissing。

加载先复制、逐字段校验、建索引并递归冻结，再原子提交整组；失败保留此前有效数据，status.error 记录最近失败。整表和嵌套数据不可写，不暴露内部 Map。并发同版本请求去重，失败可重试，成功复用。

prepare 的 version 参数隔离不同版本：新组全部成功才切换并清除旧版本其余表，旧代次拒绝迟到提交。当前 Creator 读取器只支持 initial，拒绝未知版本。远程版本下载、签名、安装及回滚尚未实现。

旧 ConfigDb、GroupedConfig、loadAll、gameCatalog/rosterCatalog/bindTables/lookups 已删除；BagItemCatalog/HeroCatalog 仅为显示投影，不是第二份玩家或配置状态仓库。

## 类型化资源

[resource-catalog.json](../config/resource-catalog.json) 声明静态范围和冲突覆盖。node tools/generate_resources.cjs 生成目录，--check 核验稳定结果；另扫描全部保留 Prefab（含 Bundle）及 item/herotype 指定的实际图标，不扫描全部美术。

    const descriptor = ResourceCatalog.common.button_btn_tab_24;
    const path = descriptor.path; // 只取得描述中的地址
    const scope = createAssetScope();
    const frame = await scope.load(descriptor); // 推导为 SpriteFrame
    scope.dispose(); // 释放持有，迟到结果拒绝
    const icon = ItemIconById[itemId]; // 未登记 ID 为 undefined

描述包含 bundle、Bundle 内 path、完整 assetPath、loadPath、资源类型和 UUID。独立图片使用 meta 的 SpriteFrame 子资源；图集及子图采用可区分命名。规范化重名与同路径不同类型默认报错，须显式设置键或扩展名，不能覆盖。

Common、启动和页面静态地址使用目录；动态图标放在独立 IconCatalog，缺失时选择明确占位图，不拼接未知路径。缺图记录见 [resource-missing.json](../config/resource-missing.json)，不代表本轮新增丢图。合理的 Prefab 序列化资源引用保留。

2026-10-31 缺图复核：共 1172 项，其中 1171 项仍对应 item 导出行，1 项对应英雄 10505021（ui/hero/hero-icon_20505001）。当前服务端三名初始英雄、初始库存及前 20 关全部 12 种奖励 ID 与缺图清单无交集，未发现此范围必需缺图。其余属于当前核心链外的保留配置缺图，不能仅因玩法未开放就判为历史无效引用；本次没有确认可删除的历史无效项，也没有以不对应图片补齐。全部保留 Prefab 的序列化资源 UUID 另由结构审查验证。

ResourceAssets 复用 ResourcePool 的去重、失败重试、持有计数与关闭隔离。decRef(false) 只解除作用域持有，避免破坏序列化和既有显示加载器共享资源；全面主动淘汰、内存预算、下载与性能测量仍待完成。

## 美术追溯

历史迁入记录的源包、stem、尺寸和映射集中在 [asset-provenance.json](asset-provenance.json)，只用于追溯。当前真值为资源/meta、生成目录和序列化引用。Spine、帧动画、字体及音频按现有导入器维护；不重铸 UUID，不为规范化键名改原图文件名。素材版权与渠道包体仍需独立验收。
