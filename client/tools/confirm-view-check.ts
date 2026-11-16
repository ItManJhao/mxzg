/**
 * 通用确认窗专项：验证调用方文案、共享模态、原UUID绑定以及确认/取消的单次回调。
 * 使用实际页面生命周期和引擎替身，不发业务请求；实际触摸及缩放仍由Creator预览核实。
 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { Button, Label, Node } from "cc";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { ConfirmView, type ConfirmArgs } from "../assets/scripts/features/common/ui/ConfirmView";

/** 读取真实工作区Prefab和meta，避免复制另一套绑定夹具。 */
function read(path: string): any {
    return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

/** 保留原脚本及Prefab标识，确认迁移后仍只有共享模态而非Prefab叠加蒙版。 */
function checkPrefab(): void {
    const path = "client/assets/bundles/module/common/prefabs/ConfirmView.prefab";
    const objects: any[] = read(path);
    const scriptMeta = read("client/assets/scripts/features/common/ui/ConfirmView.ts.meta");
    assert.equal(scriptMeta.uuid, "84d1c43c-5d4b-4bb5-8298-793f77809be6");
    assert.equal(read(path + ".meta").uuid, "5fe40211-db40-49eb-b968-51891bb9c26b");
    const hex = scriptMeta.uuid.replace(/-/g, "");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let id = hex.slice(0, 5);
    for (let index = 5; index < 32; index += 3) {
        const code = Number.parseInt(hex.slice(index, index + 3), 16);
        id += alphabet[code >> 6] + alphabet[code & 63];
    }
    const component = objects.find(row => row.__type__ === id);
    assert(component, "保留UUID后的原组件绑定必须存在");
    for (const field of ["title", "titleBackground", "content", "confirmButton", "cancelButton", "confirmLabel", "cancelLabel", "buttonsLayout", "buttonsAlignment"]) {
        assert(component[field] && objects[component[field].__id__], field + "必须绑定完整Prefab节点");
    }
    const layout = objects[component.buttonsLayout.__id__];
    assert.equal(layout.__type__, "cc.Layout");
    assert.equal(layout._layoutType, 1, "按钮行横向排列");
    assert.equal(layout._resizeMode, 1, "按钮行随有效子节点调整容器宽度");
    const alignment = objects[component.buttonsAlignment.__id__];
    assert.equal(alignment.__type__, "cc.Widget");
    assert.equal(alignment._alignFlags, 16, "横排容器水平居中");
    assert.equal(alignment.node.__id__, layout.node.__id__);
    assert.equal(objects[0]._name, "ConfirmView");
    assert.equal(objects.filter(row => row.__type__ === "cc.Mask").length, 0);
    const spec = UIRegistry.viewSpecOf(ConfirmView)!;
    assert.equal(spec.id, "confirm");
    assert.equal(spec.prefab, "bundles/module/common/prefabs/ConfirmView");
    assert.deepEqual(spec.modal, { mask: true, closeOnOutside: true });
    assert(!existsSync("client/assets/scripts/features/battle/ui/MainChapterIdleConfirmView.ts"));
    assert(!existsSync("client/assets/bundles/module/battle/prefabs/MainChapterIdleConfirmView.prefab"));
    const source = readFileSync("client/assets/scripts/features/common/ui/ConfirmView.ts", "utf8");
    assert(!source.includes("GameConfig") && !source.includes("3500") && !source.includes("2220"));
}

/** 只替身节点和UIManager的关闭请求，按钮及BaseView作用域使用真实代码。 */
function fixture(): { view: ConfirmView; root: Node } {
    const root = new Node("ConfirmRoot");
    const view = root.addComponent(ConfirmView);
    view.titleBackground = new Node("TitleBackground");
    view.titleBackground.parent = root;
    view.buttonsLayout = { updateLayout: () => {} } as any;
    view.buttonsAlignment = { updateAlignment: () => {} } as any;
    for (const field of ["title", "content", "confirmLabel", "cancelLabel"] as const) {
        const node = new Node(field);
        node.parent = root;
        view[field] = node.addComponent(Label);
    }
    for (const field of ["confirmButton", "cancelButton"] as const) {
        const node = new Node(field);
        node.parent = root;
        view[field] = node.addComponent(Button);
    }
    view.close = () => view.runClose();
    return { view, root };
}

/** 确定、取消、空白关闭和异常销毁分别只交付一次对应意图，且均在退订以后。 */
async function checkLifecycle(): Promise<void> {
    for (const action of ["confirm", "cancel", "outside", "destroy"] as const) {
        const { view, root } = fixture();
        let confirmed = 0;
        let cancelled = 0;
        let listenersCleared = false;
        const args: ConfirmArgs = {
            title: "调用方标题",
            message: "调用方正文\n保持原换行",
            confirmText: "继续",
            cancelText: "返回",
            onConfirm: () => { assert(listenersCleared); confirmed++; },
            onCancel: () => { assert(listenersCleared); cancelled++; },
        };
        view.runOpen(args);
        (view as any).ownListener(() => { listenersCleared = true; });
        assert.equal(view.title!.string, args.title);
        assert.equal(view.content!.string, args.message);
        assert.equal(view.confirmLabel!.string, "继续");
        assert.equal(view.cancelLabel!.string, "返回");
        if (action === "confirm") {
            view.confirmButton!.node.emit(Button.EventType.CLICK);
            view.confirmButton!.node.emit(Button.EventType.CLICK);
        } else if (action === "cancel") {
            view.cancelButton!.node.emit(Button.EventType.CLICK);
            view.confirmButton!.node.emit(Button.EventType.CLICK);
        } else if (action === "outside") {
            view.runClose();
        } else {
            view.onDestroy();
        }
        assert.equal(confirmed + cancelled, 0, "同步退订之前不能通知调用方");
        await Promise.resolve();
        view.runClose();
        view.runDispose();
        view.onDestroy();
        await Promise.resolve();
        assert.equal(confirmed, action === "confirm" ? 1 : 0);
        assert.equal(cancelled, action === "confirm" ? 0 : 1);
        assert.equal(view.confirmButton!.interactable, false);
        assert.equal(view.cancelButton!.interactable, false);
        root.destroy();
    }
}

/** UIManager重入打开被拒绝时，只取消先前已确认的意图，不执行未被接受的新回调。 */
async function checkRejectedReopen(): Promise<void> {
    const { view, root } = fixture();
    let originalCancelled = 0;
    let rejectedCancelled = 0;
    const args: ConfirmArgs = {
        title: "原窗口",
        message: "原意图",
        onConfirm: () => {},
        onCancel: () => { originalCancelled++; },
    };
    view.runOpen(args);
    assert.throws(() => view.runOpen({ ...args, title: "重入",
        onCancel: () => { rejectedCancelled++; } }), /不能替换操作意图/);
    await Promise.resolve();
    assert.equal(originalCancelled, 1);
    assert.equal(rejectedCancelled, 0);
    view.runDispose();
    root.destroy();
}

/** 默认按钮不依赖语言包；缺失的必需内容明确拒绝，不能误触确认回调。 */
function checkArguments(): void {
    const { view, root } = fixture();
    const args: ConfirmArgs = { title: "提示", message: "正文", onConfirm: () => {} };
    view.runOpen(args);
    assert.equal(view.confirmLabel!.string, "确定");
    assert.equal(view.cancelLabel!.string, "取消");
    assert.throws(() => view.onOpen({ ...args, message: "" }));
    assert.throws(() => view.onOpen({ ...args, onConfirm: undefined } as any));
    assert.throws(() => view.onOpen({ ...args, onCancel: 1 } as any));
    assert.throws(() => view.onOpen({ ...args, title: "替换" }), /不能替换操作意图/);
    view.runDispose();
    root.destroy();
}

/** 无标题和单按钮也是通用展示能力，只切换节点显隐并触发Prefab的布局约束。 */
async function checkSingleButton(): Promise<void> {
    const { view, root } = fixture();
    const updates: string[] = [];
    let confirmed = 0;
    let cancelled = 0;
    view.buttonsLayout!.updateLayout = () => { updates.push("layout"); };
    view.buttonsAlignment!.updateAlignment = () => { updates.push("widget"); };
    view.runOpen({ title: "", message: "无标题正文", showCancel: false,
        onConfirm: () => { confirmed++; }, onCancel: () => { cancelled++; } });
    assert.equal(view.title!.node.active, false);
    assert.equal(view.titleBackground!.active, false);
    assert.equal(view.cancelButton!.node.active, false);
    assert.equal(view.cancelButton!.interactable, false);
    assert.deepEqual(updates, ["layout", "widget"]);
    view.cancelButton!.node.emit(Button.EventType.CLICK);
    await Promise.resolve();
    assert.equal(cancelled, 0, "隐藏按钮不注册取消监听");
    view.confirmButton!.node.emit(Button.EventType.CLICK);
    await Promise.resolve();
    assert.equal(confirmed, 1);
    view.runDispose();
    root.destroy();
}

/** 执行无业务配置依赖、无网络和无资产写入的确认窗专项。 */
async function main(): Promise<void> {
    checkPrefab();
    checkArguments();
    await checkLifecycle();
    await checkRejectedReopen();
    await checkSingleButton();
    console.log("PASS generic confirm optional title/single button, preserved prefab UUIDs/shared modal and once-only confirm/cancel after cleanup");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
