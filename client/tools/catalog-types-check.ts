/** 仅编译的契约断言：表名推导、主键类型、只读配置及资源分组/类型不能退化为任意字符串。 */
import { ResourceAssetsUtils, createAssetScope } from "../assets/scripts/framework/assets/ResourceAssets";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";

/** 不执行，只通过 Creator strict 验证调用边界。 */
function verifyCatalogTypes(): void {
    const row = GameConfig.instance.getConfig(GConfig.Item, 900001);
    const id: number | undefined = row?.idx;
    void id;
    // @ts-expect-error 数字道具主键不能接收任意字符串。
    GameConfig.instance.getConfig(GConfig.Item, "900001");
    // @ts-expect-error 不存在的配置表名应拒绝。
    GameConfig.instance.getConfig("missing");
    // @ts-expect-error 整表与行字段都是只读。
    GameConfig.instance.getConfig(GConfig.Item).push({ idx: 1 });
    // @ts-expect-error 行字段不可写。
    if (row) row.idx = 2;
    const scope = createAssetScope();
    const sprite = scope.load(ResourceAssetsUtils.describe("common", "ui/button_btn-tab-24", "SpriteFrame"));
    sprite.then(frame => { frame.originalSize; });
    // @ts-expect-error SpriteFrame 加载结果不能当成 Prefab。
    sprite.then(frame => { frame.data; });
    scope.dispose();
}
void verifyCatalogTypes;
