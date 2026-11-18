/** 契约阵型专项：检查旧表显示规则和 Creator 实际窗口、列表格的绑定。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { PREFAB_UUID } from "../assets/scripts/config/PrefabCatalog";
import { PrefabPlanUtils } from "../assets/scripts/config/PrefabPlanUtils";
import { FormationMatrixView } from "../assets/scripts/features/hero/ui/FormationMatrixView";
import { FormationMatrixUtils } from "../assets/scripts/features/hero/utils/FormationMatrixUtils";
import { SuperLayout } from "../assets/scripts/framework/ui/SuperContent";
import { UILayer } from "../assets/scripts/framework/ui/UILayer";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** Creator 预制体内部指针，编号指向同一资源的序列化对象。 */
interface PrefabReference {
    readonly __id__: number;
}

/** 本专项读取的序列化节点及组件字段，其他字段仍检查内部指针完整性。 */
interface PrefabObject {
    readonly __type__: string;
    readonly _name?: string;
    readonly _parent?: PrefabReference;
    readonly _components?: readonly PrefabReference[];
    readonly _lpos?: { readonly x: number; readonly y: number };
    readonly [key: string]: unknown;
}

/** 读取真实资源及 meta 的 JSON 原文，不重建或写入 Prefab。 */
function readJson<T>(path: string): T {
    return JSON.parse(readFileSync(path, "utf8"));
}

/** 使用 Creator 对脚本 UUID 的压缩格式定位实际绑定组件。 */
function componentId(path: string): string {
    const hex = readJson<{ uuid: string }>("client/assets/scripts/" + path + ".ts.meta").uuid.replace(/-/g, "");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let id = hex.slice(0, 5);
    for (let index = 5; index < hex.length; index += 3) {
        const segment = parseInt(hex.slice(index, index + 3), 16);
        id += alphabet[segment >> 6] + alphabet[segment & 63];
    }
    return id;
}

/** 获得对应绑定并验证组件类别，失败消息携带具体字段。 */
function bound(prefab: readonly PrefabObject[], ref: unknown, type: string, field: string): PrefabObject {
    const index = (ref as PrefabReference | undefined)?.__id__;
    const object = index === undefined ? undefined : prefab[index];
    assert(object, "缺少 Prefab 绑定 " + field);
    assert.equal(object.__type__, type, field);
    return object;
}

/** 检查每个本地指针仍解析到同一预制体对象，防止生成布局后引用漂移。 */
function checkReferences(prefab: readonly PrefabObject[], value: unknown): void {
    if (!value || typeof value !== "object") {
        return;
    }
    if ("__id__" in value) {
        assert(typeof value.__id__ === "number" && Number.isInteger(value.__id__) && prefab[value.__id__],
            "Prefab 悬空引用 " + value.__id__);
        return;
    }
    for (const child of Object.values(value)) {
        checkReferences(prefab, child);
    }
}

/** 用真实窗口及格子检查 Dialog 注册、旧阵位顺序、横滑宿主和资源准入。 */
function checkPrefabs(): void {
    const spec = UIRegistry.viewSpecOf(FormationMatrixView);
    assert(spec && spec.id === "formation-matrix" && spec.layer === UILayer.Dialog && !spec.allowMultiple);
    assert.deepEqual(spec.modal, { mask: true, closeOnOutside: true });
    const assetDirectory = "bundles/module/hero/prefabs/";
    const prefabPath = "client/assets/" + spec.prefab + ".prefab";
    const cellPath = "client/assets/" + assetDirectory + "FormationMatrixCellView.prefab";
    const page = readJson<PrefabObject[]>(prefabPath);
    const cell = readJson<PrefabObject[]>(cellPath);
    const cellUuid = readJson<{ uuid: string }>(cellPath + ".meta").uuid;
    assert(PrefabPlanUtils.prefabInPlan(spec.prefab));
    assert(PrefabPlanUtils.prefabInPlan(assetDirectory + "FormationMatrixCellView"));
    assert.equal(PREFAB_UUID[spec.prefab], readJson<{ uuid: string }>(prefabPath + ".meta").uuid);
    assert.equal(PREFAB_UUID[assetDirectory + "FormationMatrixCellView"], cellUuid);
    checkReferences(page, page);
    checkReferences(cell, cell);

    const scriptDirectory = "features/hero/ui/";
    const view = page.find(row => row.__type__ === componentId(scriptDirectory + "FormationMatrixView"));
    const cellView = cell.find(row => row.__type__ === componentId(scriptDirectory + "FormationMatrixCellView"));
    assert(view && cellView, "窗和格都应绑定正确脚本");
    const panel = bound(page, view.panel, "cc.UITransform", "Panel");
    const panelNode = bound(page, panel.node, "cc.Node", "Panel.node");
    assert(panelNode._components?.some(ref => page[ref.__id__].__type__ === "cc.BlockInputEvents"));
    assert(!bound(page, view.node, "cc.Node", "Window.node")._components?.some(ref => page[ref.__id__].__type__ === "cc.BlockInputEvents"),
        "屏幕根应让共享模态接收窗外点击");
    bound(page, view.closeButton, "cc.Button", "CloseButton");
    bound(page, view.confirmButton, "cc.Button", "ConfirmButton");
    bound(page, view.requirementLabel, "cc.Label", "RequirementLabel");

    const scroll = bound(page, view.matrices, componentId("framework/ui/SuperScroll"), "Matrices");
    const content = bound(page, scroll._content, "cc.Node", "Scroll.content");
    const clip = bound(page, content._parent, "cc.Node", "Scroll.view");
    assert.equal(clip._parent?.__id__, (scroll.node as PrefabReference).__id__);
    assert(clip._components?.some(ref => page[ref.__id__].__type__ === "cc.Mask" && page[ref.__id__]._enabled === true));
    const list = content._components?.map(ref => page[ref.__id__]).find(row => row.__type__ === componentId("framework/ui/SuperContent"));
    assert(list && list.layoutType === SuperLayout.Horizontal && scroll.horizontal === true && scroll.vertical === false);
    assert.equal((list.cellPrefab as { __uuid__: string }).__uuid__, cellUuid);
    const card = bound(cell, cellView.node, "cc.Node", "Cell.node");
    assert(card._components?.some(ref => cell[ref.__id__].__type__ === "cc.Button"));
    bound(cell, cellView.icon, "cc.Sprite", "MatrixIcon");
    for (const field of ["nameLabel", "kindLabel", "lockLabel"]) {
        bound(cell, cellView[field], "cc.Label", field);
    }
    const states = ["lock", "current", "selected"].map(field => bound(cell, cellView[field], "cc.Node", field));
    assert.equal(new Set(states).size, 3, "锁定、当前和选中态应分开显示");

    const locks = view.slotLocks as readonly PrefabReference[];
    const bonuses = view.slotBonuses as readonly PrefabReference[];
    assert.equal(locks.length, 8);
    assert.equal(bonuses.length, 8);
    const positions = locks.map((ref, index) => {
        const lock = bound(page, ref, "cc.Node", "SlotLock" + (index + 1));
        const label = bound(page, bonuses[index], "cc.Label", "SlotBonus" + (index + 1));
        const bonus = bound(page, label.node, "cc.Node", "SlotBonus.node" + (index + 1));
        assert.equal(lock._parent?.__id__, bonus._parent?.__id__);
        return { id: index + 1, ...bound(page, lock._parent, "cc.Node", "Slot")._lpos! };
    });
    positions.sort((left, right) => right.y - left.y || left.x - right.x);
    assert.deepEqual(positions.map(slot => slot.id), [4, 3, 2, 1, 8, 7, 6, 5]);
    assert.equal(new Set(positions.map(slot => slot.y)).size, 2);
}

/** 在专项中替换一张说明表，仍使用真实语言查询，不修改已安装配置。 */
function withTable(config: GameConfig, path: string, table: unknown): GameConfig {
    return Object.assign(new GameConfig(), {
        getFileByPath(key: string): unknown {
            return key === path ? table : config.getFileByPath(key);
        },
        requireConfig: config.requireConfig.bind(config),
    });
}

/** 检查正常投影，再模拟真实表缺失、普通格缺失以及无效加成。 */
async function main(): Promise<void> {
    checkPrefabs();
    assert.throws(() => FormationMatrixUtils.list(new GameConfig()), /battlematrix.*尚未加载/);
    const config = await ConfigFixtureUtils.installReal(new GameConfig());
    const matrices = FormationMatrixUtils.list(config);
    assert.deepEqual(matrices.map(matrix => matrix.id), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert(matrices.every(matrix => matrix.slots.length === 8 && matrix.slots.every((slot, index) => slot.position === index + 1)));
    assert.deepEqual([matrices[0].name, matrices[0].kind, matrices[0].requirement], ["起源", "平衡型", "默认开启"]);
    assert.deepEqual(matrices[0].slots.filter(slot => !slot.open).map(slot => slot.position), [1, 4]);
    assert.deepEqual(matrices[0].slots.map(slot => slot.bonus), ["", "免伤+3%", "免伤+3%", "", "生命+3%", "治疗+5%", "攻击+3%", "攻击+3%"]);
    assert.deepEqual([matrices[1].name, matrices[1].shortRequirement, matrices[1].requirement],
        ["逆转", "6星开启", "任意1个英雄达到6星"]);
    assert.deepEqual(matrices[1].slots.filter(slot => !slot.open).map(slot => slot.position), [5, 8]);
    assert.deepEqual(matrices[1].slots.map(slot => slot.bonus),
        ["免伤+8%", "免伤+8%", "免伤+8%", "免伤+8%", "", "免伤+6%", "免伤+6%", ""]);

    const configPath = "config/battlematrixaddition";
    const { rows } = config.getFileByPath(configPath) as { rows: Record<string, unknown>[] };
    assert.throws(() => FormationMatrixUtils.list(withTable(config, configPath, { rows: rows.slice(1) })), /缺少普通格位：1\/1/);
    assert.throws(() => FormationMatrixUtils.list(withTable(config, configPath, { rows: [...rows, rows[0]] })), /格位无效或重复：1\/1/);
    const invalid = rows.map((row, index) => index === 1 ? { ...row, ability: '[{"291":"300"}]' } : row);
    assert.throws(() => FormationMatrixUtils.list(withTable(config, configPath, { rows: invalid })), /加成值无效：1\/2/);
    console.log("PASS 契约阵型：旧表说明、站位顺序、横向列表、Dialog、真实 Prefab 与引用校验");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
