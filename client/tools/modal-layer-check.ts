/**
 * 共享模态行为检查：三种配置、跨窗口恢复、真实实例关闭、准备取消和应用卸载。
 * 使用cc替身验证框架生命周期；触摸命中、颜色及实际视口另由本机浏览器复验。
 */
import assert from "node:assert/strict";
import { BlockInputEvents, Button, createdNodes, director, Director, Graphics, Node, Prefab, UITransform } from "cc";
import { BaseView } from "../assets/scripts/framework/ui/BaseView";
import { UIManager, PageNav } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry, ModalOptions, ViewClass } from "../assets/scripts/framework/ui/UIRegistry";
import { UILayer } from "../assets/scripts/framework/ui/UILayer";

/** 记录关闭次数，不发业务请求。 */
class DialogFixture extends BaseView {
    /** 每次真正退出该实例时递增，用于检查误关、重复关闭和释放。 */
    public closes = 0;
    /** 记录本实例的关闭生命周期。 */
    public onClose(): void { this.closes++; }
}
class MaskedDialog extends DialogFixture { }
class TransparentDialog extends DialogFixture { }
class LockedDialog extends DialogFixture { }
class PlainDialog extends DialogFixture { }
class MultipleDialog extends DialogFixture { }
class DelayedDialog extends DialogFixture { }
class HiddenDialog extends DialogFixture { }
class ConfiguredDialog extends DialogFixture { }
class ConfigCancelledDialog extends DialogFixture { }
/** 内容尚未准备好时也允许共享模态取消。 */
class WaitingDialog extends DialogFixture {
    /** 建立未兑现的ready，故意不在onClose中完成，检查框架自己的取消。 */
    public onOpen(): void { this.beginOpen(); }
    /** 测试中显式完成当前实例，不影响另一份已取消实例。 */
    public complete(): void { this.finishOpen(); }
}
/** 模拟配置准备失败，不可留下遮罩或假成功窗口。 */
class FailedDialog extends DialogFixture {
    /** 以真实ready拒绝路径报告失败。 */
    public onOpen(): void {
        this.beginOpen();
        this.failOpen(new Error("fixture prepare failed"));
    }
}

/** 等待固定数量微任务，覆盖加载/实例化/whenReady，不替代真实帧或计时器。 */
async function flush(): Promise<void> {
    for (let index = 0; index < 8; index++) {
        await Promise.resolve();
    }
}

/** 单管理器测试全部模式；同一实例的共享节点必须一直复用，卸载后才销毁。 */
async function main(): Promise<void> {
    const ui = new UIManager();
    const root = new Node("Canvas");
    root.addComponent(UITransform);
    const nav: PageNav = { current: "root", openChild: () => {}, back: () => false };
    ui.install(nav, { showToast: () => {} });
    ui.setResidentHost("popup", () => root);
    const createdAt = createdNodes.length;
    const mounted: DialogFixture[] = [];
    /** 注入可实例化的Prefab，沿用UIManager的统一实例化与拥有者生命周期。 */
    function register(ctor: ViewClass<unknown>, id: string, modal?: ModalOptions,
        multiple = false, load: () => Promise<Prefab> = async () => new Prefab(), hostId = "popup",
        prepare?: () => Promise<void>): void {
        /** 保留加载失败/取消时序，只由Prefab实例化回调构造测试节点。 */
        async function loadFixturePrefab(): Promise<Prefab> {
            const prefab = await load();
            return Object.assign(prefab, {
                _instantiate: () => {
                    const node = new Node(id);
                    node.addComponent(UITransform);
                    const view = node.addComponent(ctor) as DialogFixture;
                    mounted.push(view);
                    return node;
                },
            });
        }
        UIRegistry.registerView(ctor, {
            id, prefab: "test/" + id, layer: UILayer.Popup, cache: false, allowMultiple: multiple,
            hostId, modal, load: loadFixturePrefab, prepare,
        });
    }
    register(MaskedDialog, "shared-masked", { mask: true, closeOnOutside: true });
    register(TransparentDialog, "shared-transparent", { mask: false, closeOnOutside: true });
    register(LockedDialog, "shared-locked", { mask: true, closeOnOutside: false });
    register(PlainDialog, "shared-plain");
    register(MultipleDialog, "shared-multiple", { mask: true, closeOnOutside: true }, true);
    register(WaitingDialog, "shared-waiting", { mask: true, closeOnOutside: true });
    register(FailedDialog, "shared-failed", { mask: true, closeOnOutside: true });

    const ownSpec = UIRegistry.viewSpecOf(PlainDialog)!;
    const firstBinding = UIRegistry.bindViewRuntime(PlainDialog, { hostId: "first-runtime-host" });
    const secondBinding = UIRegistry.bindViewRuntime(PlainDialog, { hostId: "second-runtime-host" });
    assert.equal(UIRegistry.viewSpecOf(PlainDialog)!.prefab, ownSpec.prefab, "应用绑定不能改变页面唯一地址");
    firstBinding();
    assert.equal(UIRegistry.viewSpecOf(PlainDialog)!.hostId, "second-runtime-host", "旧应用迟到撤销不能覆盖新绑定");
    secondBinding();
    assert.equal(UIRegistry.viewSpecOf(PlainDialog), ownSpec, "按登记链恢复View自身定义，不复活已撤销绑定");
    assert.equal(UIRegistry.viewCtorById(ownSpec.id), PlainDialog);
    secondBinding();
    assert.equal(UIRegistry.viewSpecOf(PlainDialog), ownSpec, "重复撤销不删除静态登记");

    let configurationFails = true;
    let configuredLoads = 0;
    register(ConfiguredDialog, "configured-dialog", undefined, false, async () => {
        configuredLoads++;
        return new Prefab();
    }, "popup", async () => {
        if (configurationFails) throw new Error("fixture configuration failed");
    });
    await assert.rejects(ui.open(ConfiguredDialog), /fixture configuration failed/);
    assert.equal(configuredLoads, 0, "配置失败不能下载Prefab或留下假成功实例");
    assert.equal(ui.snapshot().pendingResident, 0);
    configurationFails = false;
    const configured = await ui.open(ConfiguredDialog);
    assert.equal(configuredLoads, 1, "配置失败后下一次开窗可重试");
    ui.close(configured);

    let finishConfiguration!: () => void;
    let cancelledLoads = 0;
    register(ConfigCancelledDialog, "config-cancelled", undefined, false, async () => {
        cancelledLoads++;
        return new Prefab();
    }, "popup", () => new Promise(resolve => { finishConfiguration = resolve; }));
    const configurationPending = ui.open(ConfigCancelledDialog);
    const configurationCancelled = assert.rejects(configurationPending, UIManager.isOpenCancelled);
    ui.closeById("config-cancelled");
    finishConfiguration();
    await configurationCancelled;
    assert.equal(cancelledLoads, 0, "配置等待期间关闭后不再下载或挂回页面");

    const masked = await ui.open(MaskedDialog) as DialogFixture;
    const shade = root.getChildByName("SharedModalLayer")!;
    assert(shade && shade.getComponent(BlockInputEvents), "共享节点必须拦截外部输入");
    const graphics = shade.getComponent(Graphics) as Graphics;
    assert(graphics.fillColor.a > 0);
    assert.equal(shade.getSiblingIndex() + 1, masked.node!.getSiblingIndex());
    const transparent = await ui.open(TransparentDialog) as DialogFixture;
    assert.equal(ui.releaseUnusedModal(), false, "其他窗口尚在时不能释放共享节点");
    assert.equal(root.getChildByName("SharedModalLayer"), shade, "透明模式不创建另一份节点");
    assert.equal(graphics.fillColor.a, 0, "无蒙版仍保留同一输入层");
    const locked = await ui.open(LockedDialog) as DialogFixture;
    assert(graphics.fillColor.a > 0);
    shade.emit(Button.EventType.CLICK);
    assert(ui.isOpen(locked) && locked.closes === 0, "禁止外部关闭时只拦截");
    ui.close(locked);
    assert.equal(graphics.fillColor.a, 0, "向下恢复透明关闭模式");
    shade.emit(Button.EventType.CLICK);
    assert(!ui.isOpen(transparent) && ui.isOpen(masked));
    assert(graphics.fillColor.a > 0, "再向下恢复蒙版关闭模式");
    const plain = await ui.open(PlainDialog);
    assert(plain.node!.getSiblingIndex() > shade.getSiblingIndex(), "更上层非模态窗口不被遮罩覆盖");
    shade.emit(Button.EventType.CLICK);
    assert(!ui.isOpen(masked) && ui.isOpen(plain), "模态点击只关所属实例，不关上层普通窗口");
    assert.equal(ui.snapshot().modalActive, 0);
    assert.equal(ui.snapshot().modalNodes, 1, "最后关闭后隐藏并复用节点");
    ui.close(plain);

    const first = await ui.open(MultipleDialog) as DialogFixture;
    const second = await ui.open(MultipleDialog) as DialogFixture;
    assert.notEqual(first, second);
    assert.equal(ui.snapshot().residents, 2);
    ui.close(first);
    assert(!ui.isOpen(first) && ui.isOpen(second), "关闭同id下层实例不误关上层");
    shade.emit(Button.EventType.CLICK);
    assert(!ui.isOpen(second));

    const lower = await ui.open(MaskedDialog);
    const upper = await ui.open(TransparentDialog);
    assert.equal(await ui.open(MaskedDialog), lower, "重复打开复用实例");
    assert(lower.node!.getSiblingIndex() > upper.node!.getSiblingIndex(), "重复打开真正置顶");
    shade.emit(Button.EventType.CLICK);
    assert(!ui.isOpen(lower) && ui.isOpen(upper));
    assert.equal(graphics.fillColor.a, 0);
    ui.close(upper);

    const cancelled = ui.open(WaitingDialog);
    const cancelledResult = assert.rejects(cancelled, UIManager.isOpenCancelled);
    await flush();
    assert.equal(ui.snapshot().pendingResident, 1);
    ui.closeById("shared-waiting");
    const replacement = ui.open(WaitingDialog);
    await flush();
    await cancelledResult;
    assert.equal(ui.snapshot().opening, 1, "旧取消清理不删除新一轮打开");
    const waiting = mounted[mounted.length - 1] as WaitingDialog;
    waiting.complete();
    await replacement;
    ui.close(waiting);

    let finishLoad!: (prefab: Prefab) => void;
    register(DelayedDialog, "shared-delayed", { mask: true, closeOnOutside: true }, false,
        () => new Promise(resolve => { finishLoad = resolve; }));
    const delayed = ui.open(DelayedDialog);
    const delayedResult = assert.rejects(delayed, UIManager.isOpenCancelled);
    ui.closeById("shared-delayed");
    finishLoad(new Prefab());
    await delayedResult;
    assert.equal(ui.snapshot().modalActive, 0, "取消的加载不能留下模态");
    await assert.rejects(ui.open(FailedDialog), /fixture prepare failed/);
    assert.equal(ui.snapshot().residents, 0);
    assert.equal(ui.snapshot().pendingResident, 0);
    assert.equal(ui.snapshot().modalActive, 0);

    const base = await ui.open(MaskedDialog);
    const group = new Node("NestedPopupHost");
    group.parent = root;
    group.addComponent(UITransform);
    ui.setResidentHost("nested", () => group);
    register(HiddenDialog, "shared-hidden", { mask: false, closeOnOutside: false }, false,
        async () => new Prefab(), "nested");
    const hidden = await ui.open(HiddenDialog);
    assert.equal(shade.parent, group);
    group.active = false;
    hidden.node!.emit(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED);
    director.emit(Director.EVENT_AFTER_UPDATE);
    assert.equal(shade.parent, root, "祖先隐藏时恢复下层模态");
    assert(graphics.fillColor.a > 0);
    group.active = true;
    hidden.node!.emit(Node.EventType.ACTIVE_IN_HIERARCHY_CHANGED);
    director.emit(Director.EVENT_AFTER_UPDATE);
    assert.equal(shade.parent, group, "祖先恢复时重新取得模态，无需业务View手动调用");
    assert.equal(graphics.fillColor.a, 0);
    hidden.node!.destroy();
    assert(!ui.isOpen(hidden) && ui.isOpen(base));
    assert.equal(shade.parent, root, "外部销毁也向下恢复");

    const pendingAtUnload = ui.open(WaitingDialog);
    const pendingAtUnloadResult = assert.rejects(pendingAtUnload, UIManager.isOpenCancelled);
    await flush();
    ui.uninstall(nav);
    await pendingAtUnloadResult;
    director.emit(Director.EVENT_AFTER_UPDATE);
    assert.equal(ui.snapshot().residents, 0);
    assert.equal(ui.snapshot().pendingResident, 0);
    assert.equal(ui.snapshot().opening, 0);
    assert.equal(ui.snapshot().modalNodes, 0, "应用卸载销毁共享节点");
    assert.equal(ui.releaseUnusedModal(), false, "重复释放无节点时安全返回false");
    assert.equal(createdNodes.slice(createdAt).filter(node => node.name === "SharedModalLayer").length, 1,
        "整个堆叠与恢复过程只创建过一份节点");
    assert.throws(() => UIRegistry.registerView(PlainDialog, { id: "bad-modal", prefab: "test", layer: UILayer.Page,
        cache: false, allowMultiple: false, modal: { mask: true, closeOnOutside: true } }), /仅支持Popup/);
    const standalone = new UIManager();
    standalone.setResidentHost("popup", () => root);
    const independent = await standalone.open(MaskedDialog);
    assert.equal(standalone.releaseUnusedModal(), false);
    standalone.close(independent);
    assert.equal(standalone.releaseUnusedModal(), true, "未安装导航的独立预览也能释放闲置节点");
    assert.equal(standalone.releaseUnusedModal(), false);
    root.destroy();
    console.log("PASS shared modal: 3 modes, one node, stacking, instances, cancel, activity and unload");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
