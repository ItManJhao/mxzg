/** 使用真实宝石表验证铁匠铺素材槽、连锁净产物及预览版本的二进制校验。 */
import { strict as assert } from "node:assert";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { HeroJewelUtils } from "../assets/scripts/features/hero/utils/HeroJewelUtils";
import { SmithJewelUtils } from "../assets/scripts/features/smith/utils/SmithJewelUtils";
import { GameProtocolCodecUtils, type GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** 校验一键预览与 Java 的同槽递增顺序，并核对旧客户端仍能省略预览版本。 */
async function main(): Promise<void> {
    const config = await ConfigFixtureUtils.installReal(new GameConfig());
    const recipes = SmithJewelUtils.recipes(2, config);
    assert.equal(recipes.length, 8);
    assert.equal(recipes[0].itemId, 1021002);
    assert.equal(recipes[recipes.length - 1].itemId, 1021009);
    const items = [{ itemId: 1021001, quantity: 17 }, { itemId: 1011001, quantity: 30 }];
    assert.equal(HeroJewelUtils.combineLimit(recipes[0].itemId, items, config), 5);
    assert.deepEqual(SmithJewelUtils.materials(recipes[0], [{ itemId: 1021001, quantity: 2 }]), [
        { itemId: 1021001, quantity: 1, available: 1 },
        { itemId: 1021001, quantity: 1, available: 1 },
        { itemId: 1021001, quantity: 1, available: 0 },
    ]);
    assert.deepEqual(SmithJewelUtils.preview(2, items, config), [
        { itemId: 1021002, quantity: 2 }, { itemId: 1021003, quantity: 1 },
    ]);
    assert.deepEqual(SmithJewelUtils.preview(3, items, config), []);
    assert.equal(items[0].quantity, 17);
    // 两个有效的库存量相加可超过安全整数；确认窗仍应显示准确的中间档和最终档产物。
    const largeStock = [1021001, 1021002].map(itemId => ({ itemId, quantity: Number.MAX_SAFE_INTEGER }));
    assert.deepEqual(SmithJewelUtils.preview(2, largeStock, config), [
        { itemId: 1021003, quantity: 2 }, { itemId: 1021004, quantity: 2 },
        { itemId: 1021005, quantity: 1 }, { itemId: 1021006, quantity: 1 },
        { itemId: 1021008, quantity: 1 }, { itemId: 1021009, quantity: 5_491_357_570_334 },
    ]);

    const requestId = "00000000-0000-4000-8000-000000000001";
    const roleId = "00000000-0000-4000-8000-000000000002";
    const body = { requestId, action: "COMBINE_ALL", slot: 2 };
    const request: GameFrame = { version: 1, kind: "request", name: Protocol.HERO_JEWEL_CHANGE, id: requestId, body };
    const response: GameFrame = { ...request, kind: "response", ok: true, body: {
        ...body, expectedRevision: 0, roleId, assetRevision: 1, changed: true, rewards: [{ itemId: 1021003, quantity: 1 }],
    } };
    for (const frame of [request, { ...request, body: { ...body, expectedRevision: 0 } }, response]) {
        assert.deepEqual(GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame(frame)), frame);
    }
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { ...body, expectedRevision: -1 } }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: {
        requestId, action: "COMBINE", itemId: 1021002, count: 1, expectedRevision: 0,
    } }));
    console.log("PASS 铁匠铺宝石配方、素材槽、净产物和一键预览版本");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
