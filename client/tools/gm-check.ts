/**
 * GM 请求与独立窗口回归：覆盖幂等重试、二进制载荷、菜单分流、真实列表选择及全局反馈。
 * 使用轻量引擎替身验证重复开窗、关闭清理、迟到结果和 F9 监听释放，不代替 Creator 画面验收。
 */
import { Button, EditBox, Input, KeyCode, Label, Node, input } from "cc";
import { setEditorContext } from "./cc-env";
import { RemakeApp } from "../assets/scripts/app/remake/RemakeApp";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { GmController } from "../assets/scripts/features/gm/GmController";
import { GmBattleArgs, GmGrantArgs, GmOpenArgs } from "../assets/scripts/features/gm/data/GmViewArgs";
import { GmBattleView } from "../assets/scripts/features/gm/ui/GmBattleView";
import { GmGrantView } from "../assets/scripts/features/gm/ui/GmGrantView";
import { GmOptionCellView } from "../assets/scripts/features/gm/ui/GmOptionCellView";
import { GmView } from "../assets/scripts/features/gm/ui/GmView";
import { BaseView } from "../assets/scripts/framework/ui/BaseView";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";

/** 失败即终止本次专项，保留可读断言原因。 */
function assert(ok: unknown, text: string): asserts ok {
    if (!ok) {
        throw new Error(text);
    }
}

/** 创建可手动完成的承诺，用确定顺序覆盖迟到回包，不依赖计时等待。 */
function deferred<T>(): { promise: Promise<T>; resolve(value: T): void; reject(error: Error): void } {
    let resolve!: (value: T) => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<T>((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}

/** 等待窗口状态与发放承诺的微任务完成。 */
async function flushView(): Promise<void> {
    for (let index = 0; index < 16; index++) {
        await Promise.resolve();
    }
}

/** 只补齐测试引擎缺少的输入事件，不改变真实游戏脚本。 */
function prepareViewRuntime(): void {
    if (!EditBox.EventType) {
        Object.defineProperty(EditBox, "EventType", { value: { TEXT_CHANGED: "text-changed" } });
    }
}

/** 创建已由 Prefab 绑定的子节点，不模拟运行时界面装配。 */
function child(parent: Node, name: string): Node {
    const node = new Node(name);
    node.parent = parent;
    return node;
}

/** 为测试夹具创建一个静态按钮绑定。 */
function button(parent: Node, name: string): Button {
    return child(parent, name).addComponent(Button);
}

/** 为测试夹具创建一个静态文字绑定。 */
function label(parent: Node, name: string): Label {
    return child(parent, name).addComponent(Label);
}

/** 构造发放窗口反序列化后的引用，列表格子使用真实 GmOptionCellView。 */
function createGrantFixture(): { view: GmGrantView; chooseFirst(): void; destroy(): void } {
    const node = new Node("GmGrantView");
    const view = node.addComponent(GmGrantView);
    const cells: GmOptionCellView[] = [];
    view.title = label(node, "TitleLabel");
    view.owner = label(node, "CurrentRole");
    view.selection = label(node, "SelectionLabel");
    view.message = label(node, "StatusLabel");
    view.dropdownButton = button(node, "ConfigSelector");
    view.grantButton = button(node, "GrantButton");
    view.closeButton = button(node, "CloseButton");
    view.search = child(node, "SearchInput").addComponent(EditBox);
    view.quantity = child(node, "QuantityInput").addComponent(EditBox);
    view.dropdown = child(node, "Dropdown");
    view.options = {
        list: {
            setData: (rows: readonly { id: number; name: string }[], render: (target: Node, row: { id: number; name: string }) => void) => {
                for (const cell of cells.splice(0)) {
                    cell.node.destroy();
                }
                for (const row of rows) {
                    const target = child(node, "OptionCell");
                    const cell = target.addComponent(GmOptionCellView);
                    cell.button = button(target, "OptionButton");
                    cell.caption = label(target, "OptionLabel");
                    render(target, row);
                    cells.push(cell);
                }
            },
        },
        toStart: () => {},
    } as unknown as SuperScroll;
    return {
        view,
        chooseFirst: () => {
            assert(cells.length > 0, "配置选择应已有真实渲染格子");
            cells[0].button.node.emit(Button.EventType.CLICK);
        },
        destroy: () => {
            view.runDispose();
            node.destroy();
        },
    };
}

/** 构造总菜单静态绑定，子窗加载由测试替换 UIManager 外部边界。 */
function createMenuFixture(): GmView {
    const node = new Node("GmView");
    const view = node.addComponent(GmView);
    view.owner = label(node, "CurrentRole");
    view.message = label(node, "StatusLabel");
    view.heroButton = button(node, "HeroButton");
    view.itemButton = button(node, "ItemButton");
    view.skillButton = button(node, "SkillButton");
    view.battleButton = button(node, "BattleButton");
    view.closeButton = button(node, "CloseButton");
    return view;
}

/** 构造试战窗口静态绑定，真实应用动作通过参数注入。 */
function createBattleFixture(): GmBattleView {
    const node = new Node("GmBattleView");
    const view = node.addComponent(GmBattleView);
    view.owner = label(node, "CurrentRole");
    view.message = label(node, "StatusLabel");
    view.battleButtons = [1, 2, 3].map(mission => button(node, "Battle" + mission + "Button"));
    view.closeButton = button(node, "CloseButton");
    return view;
}

/** 结果未知只能用原请求重试，明确成功后重新生成幂等键，编码与解码保持业务载荷一致。 */
async function checkRequests(): Promise<void> {
    const bodies: { requestId: string; kind: string; configId: number; quantity: number }[] = [];
    let failed = true;
    const gm = new GmController(async () => ({ enabled: true }), async body => {
        bodies.push(body);
        if (failed) {
            throw new Error("timeout");
        }
        return body;
    });
    assert(await gm.enabled(), "真实开关");
    await gm.grant("role", "hero", 10101001, 1).catch(() => {});
    await gm.grant("role", "item", 900101, 1).then(() => {
        throw new Error("不应换参数重发");
    }, () => {});
    failed = false;
    await gm.grant("role", "hero", 10101001, 1);
    assert(bodies.length === 2 && bodies[0].requestId === bodies[1].requestId, "未知结果必须复用请求 ID");
    await gm.grant("role", "hero", 10101001, 1);
    assert(bodies[2].requestId !== bodies[1].requestId, "成功后新操作使用新 ID");
    for (const kind of ["request", "response"]) {
        const body = bodies[0];
        const frame = GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
            version: 1,
            kind,
            name: "gm.grant",
            id: "test",
            ok: kind === "response" ? true : undefined,
            body,
        }));
        assert(JSON.stringify(frame.body) === JSON.stringify(body), "GM Protobuf 互通");
    }
}

/** 发放通过真实配置格子，重复打开不叠监听，所有结果走飘字，关闭拒绝保持禁用。 */
async function checkGrantView(notices: string[]): Promise<void> {
    const fixture = createGrantFixture();
    const view = fixture.view;
    const sent: { kind: string; configId: number }[] = [];
    let failure: string | null = null;
    const controller = new GmController(async () => ({ enabled: true }), async body => {
        sent.push({ kind: body.kind, configId: body.configId });
        if (failure) {
            throw Object.assign(new Error(failure), { code: failure });
        }
        return body;
    });
    const args: GmGrantArgs = { controller, roleId: "gm-view-role", nickname: "窗口检查", kind: "hero" };
    try {
        view.runOpen(args);
        await flushView();
        assert(view.grantButton.interactable && view.title.string === "英雄 GM", "英雄发放独立标题和真实开关");
        view.grantButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(notices.at(-1)?.includes("请先选择") && !view.message.string.includes("请先选择"), "校验失败只走全局飘字");
        fixture.chooseFirst();
        view.grantButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(sent.length === 1 && sent[0].kind === "hero" && sent[0].configId === 10101001, "真实格子选择提交英雄配置");
        assert(notices.at(-1)?.includes("发放成功") && !view.message.string.includes("发放成功"), "成功不留在状态正文");
        view.runOpen({ ...args, kind: "item" });
        await flushView();
        assert(view.dropdown.active && view.title.string === "道具 GM", "重开固定道具类别");
        view.dropdownButton.node.emit(Button.EventType.CLICK);
        assert(!view.dropdown.active, "重复打开后的单击只切换一次，不累积监听");
        fixture.chooseFirst();
        assert(view.selection.string.includes("测试道具"), "道具选项名称直接使用统一语言索引");
        view.grantButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(sent.length === 2 && sent[1].kind === "item" && sent[1].configId === 900101, "独立道具窗口提交真实配置");
        failure = "GM_DISABLED";
        view.grantButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(!view.grantButton.interactable && notices.at(-1)?.includes("GM_DISABLED"), "GM 关闭拒绝后保持禁用并飘字");
        assert(!view.message.string.includes("GM_DISABLED"), "服务端错误不写状态正文");
        view.runOpen({ ...args });
        await flushView();
        fixture.chooseFirst();
        failure = "GM_CAPACITY_FULL";
        view.grantButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(view.grantButton.interactable, "其他明确业务失败保留后续重试能力");
        const before = sent.length;
        view.runClose();
        view.grantButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(sent.length === before, "关闭后旧按钮不能继续发放");
    } finally {
        fixture.destroy();
    }
}

/** 迟到的开关与发放结果不能禁用新窗口、修改正文或将旧结果飘到新窗口。 */
async function checkGrantLateResults(notices: string[]): Promise<void> {
    const fixture = createGrantFixture();
    const view = fixture.view;
    const status = deferred<unknown>();
    const grant = deferred<unknown>();
    let submitted: unknown;
    const oldController = new GmController(() => status.promise, async body => {
        submitted = body;
        return grant.promise;
    });
    const freshController = new GmController(async () => ({ enabled: true }), async body => body);
    const args: GmGrantArgs = { controller: oldController, roleId: "gm-role", nickname: "旧窗口", kind: "hero" };
    try {
        view.runOpen(args);
        view.runOpen({ ...args, controller: freshController, nickname: "新窗口" });
        await flushView();
        status.resolve({ enabled: false });
        await flushView();
        assert(view.grantButton.interactable && view.owner.string.includes("新窗口"), "迟到关闭开关不覆盖新窗口");
        view.runOpen({ ...args, controller: new GmController(async () => ({ enabled: true }), async body => {
            submitted = body;
            return grant.promise;
        }) });
        await flushView();
        fixture.chooseFirst();
        view.grantButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(submitted, "已提交待确认请求");
        view.runClose();
        view.runOpen({ ...args, controller: freshController, nickname: "又一次打开" });
        await flushView();
        const count = notices.length;
        grant.resolve(submitted);
        await flushView();
        assert(notices.length === count && view.grantButton.interactable, "关闭后的旧发放不向新窗口飘字或改按钮");
    } finally {
        fixture.destroy();
    }
}

/** 总菜单只分流，不保留表单；子窗复用同控制器，关闭时取消发放和试战窗口。 */
async function checkMenu(notices: string[]): Promise<void> {
    const view = createMenuFixture();
    const manager = UIManager.instance;
    const originalOpen = manager.open;
    const originalClose = manager.closeById;
    const opened: { ctor: unknown; args: any }[] = [];
    const closed: string[] = [];
    manager.open = (async (ctor: unknown, args: unknown) => {
        opened.push({ ctor, args });
        return {} as BaseView<unknown>;
    }) as typeof manager.open;
    manager.closeById = id => {
        closed.push(id);
        return true;
    };
    const controller = new GmController(async () => ({ enabled: true }), async body => body);
    let skills = 0;
    let skillError: Error | null = null;
    const args: GmOpenArgs = {
        controller,
        roleId: "gm-menu-role",
        nickname: "菜单检查",
        openSkillAudit: async () => {
            skills++;
            if (skillError) {
                throw skillError;
            }
        },
        openLineupBattle: async () => {},
    };
    try {
        view.runOpen(args);
        await flushView();
        view.heroButton.node.emit(Button.EventType.CLICK);
        view.heroButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(opened.length === 1 && opened[0].ctor === GmGrantView && opened[0].args.kind === "hero", "总菜单打开独立英雄窗并抑制重复点击");
        assert(opened[0].args.controller === controller, "子窗复用唯一控制器");
        view.itemButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(opened[1].ctor === GmGrantView && opened[1].args.kind === "item", "道具菜单打开同一表单的固定道具模式");
        view.battleButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(opened[2].ctor === GmBattleView && opened[2].args.openLineupBattle === args.openLineupBattle, "试战动作原样交独立窗口");
        view.runOpen({ ...args });
        await flushView();
        view.skillButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(skills === 1, "重复开菜单后技能按钮不叠监听");
        skillError = new Error("测试准备失败");
        const count = notices.length;
        view.skillButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(notices.length === count + 1 && notices.at(-1)?.includes("测试准备失败"), "业务失败在菜单边界只提示一次");
        assert(!view.message.string.includes("测试准备失败"), "错误不写菜单正文");
        view.runClose();
        assert(closed.includes("gm-grant") && closed.includes("gm-battle"), "菜单关闭取消所有独立子窗");
        const before = opened.length;
        view.heroButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(opened.length === before, "关闭后旧按钮不能再打开子窗");
    } finally {
        view.runDispose();
        view.node.destroy();
        manager.open = originalOpen;
        manager.closeById = originalClose;
    }
}

/** 三关试战保留真实异步结果、防双击，失败重试以及关闭后迟到结果不串窗。 */
async function checkBattle(notices: string[]): Promise<void> {
    const view = createBattleFixture();
    const pending = deferred<void>();
    const missions: number[] = [];
    let job: Promise<void> = pending.promise;
    const args: GmBattleArgs = {
        nickname: "试战检查",
        openLineupBattle: async mission => {
            missions.push(mission);
            await job;
        },
    };
    try {
        view.runOpen(args);
        view.battleButtons[2].node.emit(Button.EventType.CLICK);
        view.battleButtons[0].node.emit(Button.EventType.CLICK);
        assert(missions.length === 1 && missions[0] === 3, "试战按钮正确传第三关并禁止在途双击");
        assert(view.battleButtons.every(target => !target.interactable), "准备期间全部关卡暂时禁用");
        pending.reject(new Error("测试关卡失败"));
        await flushView();
        assert(view.battleButtons.every(target => target.interactable) && notices.at(-1)?.includes("测试关卡失败"), "失败恢复点击并统一飘字");
        assert(!view.message.string.includes("测试关卡失败"), "试战错误不写说明正文");
        job = Promise.resolve();
        view.runOpen({ ...args });
        view.battleButtons[1].node.emit(Button.EventType.CLICK);
        await flushView();
        assert(missions.length === 2 && missions[1] === 2, "重复打开后一次点击只准备一次第二关");
        const late = deferred<void>();
        job = late.promise;
        view.battleButtons[0].node.emit(Button.EventType.CLICK);
        view.runClose();
        view.runOpen({ ...args });
        const count = notices.length;
        late.reject(new Error("旧演示迟到失败"));
        await flushView();
        assert(notices.length === count && view.battleButtons.every(target => target.interactable), "旧演示失败不串到新窗口");
        view.runClose();
        const before = missions.length;
        view.battleButtons[0].node.emit(Button.EventType.CLICK);
        assert(missions.length === before, "关闭后试战按钮监听已移除");
    } finally {
        view.runDispose();
        view.node.destroy();
    }
}

/** F9 仅按键抬起切换一次；应用销毁解除原监听，发布模式不登记入口。 */
function checkShortcut(): void {
    const originalOn = input.on;
    const originalOff = input.off;
    let callback: ((event: { keyCode: number }) => void) | null = null;
    let removed = 0;
    let toggles = 0;
    input.on = (type, listener) => {
        assert(type === Input.EventType.KEY_UP, "F9 使用抬起事件避免长按反复开关");
        callback = listener;
    };
    input.off = (type, listener) => {
        assert(type === Input.EventType.KEY_UP && listener === callback, "销毁解除同一个 F9 监听");
        removed++;
    };
    const app = new RemakeApp();
    const bind = app as unknown as { bindGmShortcut(toggle: () => void): void };
    try {
        setEditorContext(false, true);
        bind.bindGmShortcut(() => toggles++);
        assert(callback, "预览已登记 F9");
        callback({ keyCode: KeyCode.BACKQUOTE });
        assert(toggles === 0, "旧快捷键不再触发 GM");
        callback({ keyCode: KeyCode.F9 });
        assert(toggles === 1, "F9 一次切换");
        app.onDestroy();
        assert(removed === 1, "应用销毁恰好移除一次 F9 监听");
        callback = null;
        setEditorContext(false, false);
        bind.bindGmShortcut(() => toggles++);
        assert(callback === null, "发布模式不登记 GM 快捷键");
    } finally {
        setEditorContext(false, true);
        input.on = originalOn;
        input.off = originalOff;
    }
}

/** 执行独立请求与窗口生命周期检查，最后恢复全局配置和提示绑定。 */
async function main(): Promise<void> {
    prepareViewRuntime();
    await checkRequests();
    const original = GameConfig.instance.getConfig;
    const languageKeys: unknown[] = [];
    GameConfig.instance.getConfig = ((name: string, key?: unknown) => {
        if (name === GConfig.HeroType) {
            return [{ type: 10101001, note: "测试英雄" }];
        }
        if (name === GConfig.Item) {
            return [{ idx: 900101, name: 100 }];
        }
        if (name === GConfig.Language) {
            languageKeys.push(key);
            assert(key === 100, "GM只查询当前物品的语言行，不能读取或复制完整语言表");
            return { key: 100, value: "测试道具" };
        }
        throw new Error("夹具未声明配置：" + name);
    }) as typeof original;
    const notices: string[] = [];
    const off = UIManager.instance.bindNotice(text => notices.push(text));
    try {
        for (const ctor of [GmView, GmGrantView, GmBattleView]) {
            const spec = UIRegistry.viewSpecOf(ctor);
            assert(spec?.cache === false && spec.modal?.mask === true && spec.modal.closeOnOutside === false, "每个 GM View 自行登记无缓存的共享模态参数");
        }
        await checkGrantView(notices);
        await checkGrantLateResults(notices);
        await checkMenu(notices);
        await checkBattle(notices);
        checkShortcut();
        assert(languageKeys.length > 0, "发放列表名称经过真实查询边界");
        console.log("PASS GM: Protobuf, safe retry, split windows, shared controller, toast, stale results, F9 cleanup");
    } finally {
        off();
        GameConfig.instance.getConfig = original;
    }
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
