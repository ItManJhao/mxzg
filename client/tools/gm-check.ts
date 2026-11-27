/**
 * GM 请求与独立窗口回归：覆盖发放幂等、角色与时间操作、二进制载荷和全局反馈。
 * 使用轻量引擎替身验证资料页与 F9 开窗、关闭清理和迟到结果，不代替 Creator 画面验收。
 */
import { Button, EditBox, Input, KeyCode, Label, Node, input } from "cc";
import { setEditorContext } from "./cc-env";
import { DevelopmentPreview } from "../assets/scripts/app/remake/DevelopmentPreview";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import type { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { BattleReplayPreview } from "../assets/scripts/features/battle/ui/BattleReplayPreview";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GConfig } from "../assets/scripts/config/GConfig";
import { ServerClock } from "../assets/scripts/core/ServerClock";
import { GmController } from "../assets/scripts/features/gm/GmController";
import type { GmGrant } from "../assets/scripts/features/gm/GmController";
import { GmBattleArgs, GmGrantArgs, GmOpenArgs } from "../assets/scripts/features/gm/data/GmViewArgs";
import { GmBattleView } from "../assets/scripts/features/gm/ui/GmBattleView";
import { GmGrantView } from "../assets/scripts/features/gm/ui/GmGrantView";
import { GmOptionCellView } from "../assets/scripts/features/gm/ui/GmOptionCellView";
import { GmToolsView } from "../assets/scripts/features/gm/ui/GmToolsView";
import { GmView } from "../assets/scripts/features/gm/ui/GmView";
import { BaseView } from "../assets/scripts/framework/ui/BaseView";
import { SuperScroll } from "../assets/scripts/framework/ui/SuperScroll";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { UIRegistry } from "../assets/scripts/framework/ui/UIRegistry";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";

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
    view.toolsButton = button(node, "ToolsButton");
    view.closeButton = button(node, "CloseButton");
    return view;
}

/** 构造角色与时间窗口的预制体绑定，操作仍走真实 GmController。 */
function createToolsFixture(): GmToolsView {
    const node = new Node("GmToolsView");
    const view = node.addComponent(GmToolsView);
    view.owner = label(node, "CurrentRole");
    view.message = label(node, "StatusLabel");
    view.levelInput = child(node, "LevelInput").addComponent(EditBox);
    view.chapterInput = child(node, "ChapterInput").addComponent(EditBox);
    view.timeInput = child(node, "TimeInput").addComponent(EditBox);
    view.levelButton = button(node, "LevelButton");
    view.chapterButton = button(node, "ChapterButton");
    view.setTimeButton = button(node, "SetTimeButton");
    view.readTimeButton = button(node, "ReadTimeButton");
    view.resetTimeButton = button(node, "ResetTimeButton");
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

/** 用与账号通道相同的协议信封响应 GM，仅允许开关查询和携带发放原单的请求。 */
function gmRequests(
    grant: (body: GmGrant) => unknown = body => body,
    status: () => unknown = () => ({ enabled: true }),
): Pick<AccountOperations, "request"> {
    return {
        async request(name, body) {
            switch (name) {
                case Protocol.GM_STATUS:
                    assert(body && Object.keys(body).length === 0, "GM 开关应发送空请求");
                    return { version: 1, kind: "response", name, ok: true, body: await status() };
                case Protocol.GM_GRANT:
                    return { version: 1, kind: "response", name, ok: true, body: await grant(body as GmGrant) };
                default:
                    throw new Error("意外的 GM 请求：" + name);
            }
        },
    };
}

/** 检查幂等重试和编码，确认金币、钻石及英雄经验可大额发放。 */
async function checkRequests(): Promise<void> {
    const bodies: { requestId: string; kind: string; configId: number; quantity: number }[] = [];
    let failed = true;
    const gm = new GmController(gmRequests(body => {
        bodies.push(body);
        if (failed) {
            throw new Error("timeout");
        }
        return body;
    }));
    assert(await gm.enabled(), "真实开关");
    await gm.grant("hero", 10101001, 1).catch(() => {});
    await gm.grant("item", 900101, 1).then(() => {
        throw new Error("不应换参数重发");
    }, () => {});
    failed = false;
    await gm.grant("hero", 10101001, 1);
    assert(bodies.length === 2 && bodies[0].requestId === bodies[1].requestId, "未知结果必须复用请求 ID");
    await gm.grant("hero", 10101001, 1);
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
    await gm.grant("item", 900001, 10_000_000);
    await gm.grant("item", 900002, 20_000);
    await gm.grant("item", 900101, 2_147_483_647);
    assert(bodies[3].quantity === 10_000_000 && bodies[4].quantity === 20_000
        && bodies[5].quantity === 2_147_483_647, "金币、钻石和英雄经验高于 9999 仍照常发包");
    const rejected = await gm.grant("item", 900102, 10_000).then(() => false, () => true);
    const overflow = await gm.grant("item", 900101, 2_147_483_648).then(() => false, () => true);
    assert(rejected && overflow && bodies.length === 6, "超过道具上限或协议上限时不发包");
}

/** 实际点按钮检查等级、关卡、北京时间、读时飘字、恢复和关窗迟到响应。 */
async function checkTools(notices: string[]): Promise<void> {
    const view = createToolsFixture();
    const requests: Array<{ name: string; body: Record<string, unknown> }> = [];
    const testTime = Date.parse("2026-11-19T04:30:00Z");
    let timeResponse = Promise.resolve({ serverTimeMs: testTime, overridden: true });
    const controller = new GmController({
        async request(name, input) {
            const body = (input || {}) as Record<string, unknown>;
            requests.push({ name, body });
            let result: unknown = body;
            if (name === Protocol.GM_STATUS) {
                result = { enabled: true };
            } else if (name === Protocol.GM_TIME_GET) {
                result = await timeResponse;
            } else if (name === Protocol.GM_TIME_SET) {
                result = { serverTimeMs: testTime, overridden: body.unixSeconds !== 0 };
            }
            return { version: 1, kind: "response", name, ok: true, body: result };
        },
    });
    try {
        view.runOpen({ controller, nickname: "工具测试", readRoleLevel: () => 4 });
        assert(view.levelInput.string === "4" && !view.levelButton.interactable, "显示真实等级，开关确认前按钮禁用");
        await flushView();
        view.levelInput.string = "15";
        view.levelButton.node.emit(Button.EventType.CLICK);
        view.levelButton.node.emit(Button.EventType.CLICK);
        await flushView();
        const levelRequest = requests.filter(row => row.name === Protocol.GM_LEVEL_SET);
        assert(levelRequest.length === 1 && levelRequest[0].body.level === 15, "等级发包使用输入并抑制双击");
        assert(typeof levelRequest[0].body.requestId === "string", "等级修改带请求 ID");
        view.chapterInput.string = "6";
        view.chapterButton.node.emit(Button.EventType.CLICK);
        await flushView();
        const chapterRequest = requests.find(row => row.name === Protocol.GM_CHAPTER_SET);
        assert(chapterRequest?.body.mission === 6 && notices.at(-1)?.includes("第 6 关"), "关卡操作提交下一挑战目标");
        view.timeInput.string = "2026-02-30 12:30:00";
        view.setTimeButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(!requests.some(row => row.name === Protocol.GM_TIME_SET), "不存在的日期被拦截");
        view.timeInput.string = "2026-11-19 12:30:00";
        view.setTimeButton.node.emit(Button.EventType.CLICK);
        await flushView();
        const timeRequest = requests.find(row => row.name === Protocol.GM_TIME_SET);
        assert(timeRequest?.body.unixSeconds === testTime / 1000, "北京时间输入按 +08:00 转成正确 Unix 秒");
        assert(ServerClock.instance.nowSeconds() === testTime / 1000, "GM 时间回包校准公共时钟");
        view.readTimeButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(notices.at(-1)?.includes("当前服务器时间 2026-11-19 12:30:00"), "查询以全局飘字显示实际服务端时间");
        view.resetTimeButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(requests.at(-1)?.body.unixSeconds === 0, "恢复操作使用协议规定的 0");
        const delayed = deferred<{ serverTimeMs: number; overridden: boolean }>();
        timeResponse = delayed.promise;
        const noticeCount = notices.length;
        view.readTimeButton.node.emit(Button.EventType.CLICK);
        view.runClose();
        delayed.resolve({ serverTimeMs: testTime, overridden: false });
        await flushView();
        assert(notices.length === noticeCount, "关窗后不展示旧操作飘字");
    } finally {
        view.runDispose();
        view.node.destroy();
        ServerClock.instance.invalidate();
    }
}

/** 重置立即释放原单；前一笔的完成不能清掉后一笔的等待或禁重状态。 */
async function checkGrantReset(): Promise<void> {
    for (const outcome of ["success", "rejected"] as const) {
        const first = deferred<void>();
        const second = deferred<void>();
        const ids: string[] = [];
        const gm = new GmController(gmRequests(async body => {
            ids.push(body.requestId);
            await (ids.length === 1 ? first : second).promise;
            return body;
        }));
        const oldGrant = gm.grant("hero", 10101001, 1).catch(() => undefined);
        gm.reset();
        const newGrant = gm.grant("item", 900101, 1);
        assert(ids.length === 2 && ids[0] !== ids[1], "重置后发放立即生成独立的新单");
        if (outcome === "success") {
            first.resolve();
        } else {
            first.reject(Object.assign(new Error("已拒绝"), {code: "GM_DISABLED"}));
        }
        await oldGrant;
        const duplicate = gm.grant("item", 900101, 1).then(() => false, () => true);
        assert(ids.length === 2, "原单的完成不能放开新单的并发限制");
        second.resolve();
        await newGrant;
        assert(await duplicate, "在途重复发放应收到拒绝");
    }
}

/** 发放通过真实配置格子，重复打开不叠监听，所有结果走飘字，关闭拒绝保持禁用。 */
async function checkGrantView(notices: string[]): Promise<void> {
    const fixture = createGrantFixture();
    const view = fixture.view;
    const sent: { kind: string; configId: number }[] = [];
    let failure: string | null = null;
    const controller = new GmController(gmRequests(body => {
        sent.push({ kind: body.kind, configId: body.configId });
        if (failure) {
            throw Object.assign(new Error(failure), { code: failure });
        }
        return body;
    }));
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
    const oldController = new GmController(gmRequests(body => {
        submitted = body;
        return grant.promise;
    }, () => status.promise));
    const freshController = new GmController(gmRequests());
    const args: GmGrantArgs = { controller: oldController, roleId: "gm-role", nickname: "旧窗口", kind: "hero" };
    try {
        view.runOpen(args);
        view.runOpen({ ...args, controller: freshController, nickname: "新窗口" });
        await flushView();
        status.resolve({ enabled: false });
        await flushView();
        assert(view.grantButton.interactable && view.owner.string.includes("新窗口"), "迟到关闭开关不覆盖新窗口");
        view.runOpen({ ...args, controller: new GmController(gmRequests(body => {
            submitted = body;
            return grant.promise;
        })) });
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

/** 总菜单分流到各子窗，共用控制器并在关闭时清理所属窗口。 */
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
    const controller = new GmController(gmRequests());
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
        view.toolsButton.node.emit(Button.EventType.CLICK);
        await flushView();
        assert(opened[3].ctor === GmToolsView && opened[3].args.controller === controller, "总菜单打开角色与时间窗并共用控制器");
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
        assert(["gm-grant", "gm-battle", "gm-tools"].every(id => closed.includes(id)), "菜单关闭取消所有独立子窗");
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
    const openChecks: Array<() => boolean> = [];
    let job: Promise<void> = pending.promise;
    const args: GmBattleArgs = {
        nickname: "试战检查",
        openLineupBattle: async (mission, stillOpen) => {
            missions.push(mission);
            openChecks.push(stillOpen);
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
        const originalOpen = openChecks[openChecks.length - 1];
        assert(originalOpen(), "准备时可向原窗口展示战报");
        view.runClose();
        view.runOpen(args);
        assert(!originalOpen(), "重开相同试战窗口不能让上一笔战报恢复展示资格");
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

/** 试战窗关闭只取消仍在装载的战场，已经完成装载的战场独立播放。 */
async function checkBattlePresentationLifetime(): Promise<void> {
    const host = new Node("BattleHost");
    const home = child(host, "Home");
    const preview = new DevelopmentPreview(host, null, () => true);
    const originalOpen = BattleReplayPreview.open;
    let loading = deferred<void>();
    let cancelled: (() => boolean) | undefined;
    let released = 0;
    BattleReplayPreview.open = async (...args) => {
        cancelled = args[9];
        await loading.promise;
        return () => { released++; };
    };
    try {
        const result = {mission: 1, assetRevision: 1, lineupVersion: 1, formationId: 1, pending: [], bytes: new Uint8Array()};
        let visible = true;
        const pending = preview.openLineupBattle(result, () => visible);
        visible = false;
        assert(cancelled?.(), "原试战窗关闭后战场准备应当取消");
        loading.resolve();
        const didCancel = await pending.then(() => false, error => UIManager.isOpenCancelled(error));
        assert(didCancel && released === 1 && home.active, "中途取消时归还主城并释放原场景");
        visible = true;
        loading = deferred<void>();
        const next = preview.openLineupBattle(result, () => visible);
        loading.resolve();
        await next;
        visible = false;
        assert(!cancelled?.() && !home.active, "战场接管后可以正常收起 GM 菜单");
        preview.cancelReplay();
        assert(Number(released) === 2 && home.active, "最后关闭演示时归还主城");
    } finally {
        preview.dispose();
        BattleReplayPreview.open = originalOpen;
        host.destroy();
    }
}

/** 验证预览 F9 与手机资料手势共用菜单，且构建版可开窗、无热键和本机技能目录。 */
async function checkShortcut(): Promise<void> {
    const originalOn = input.on;
    const originalOff = input.off;
    const ui = UIManager.instance;
    const originalOpen = ui.open;
    const originalOpenChild = ui.openChild;
    const originalIsOpen = ui.isOpen;
    const originalClose = ui.closeById;
    let callback: ((event: { keyCode: number }) => void) | null = null;
    let owner: unknown;
    const opened: GmOpenArgs[] = [];
    const closed: string[] = [];
    const active = new Set<string>();
    let inHome = false;
    const account = new AccountModel();
    const preview = new DevelopmentPreview(null, null, () => true);
    const profile = {} as BaseView<unknown>;
    const unused = async (): Promise<never> => { throw new Error("打开 GM 菜单的装配不应主动发协议"); };
    const configure = () => preview.configureGm(
        { get currentRole() { return account.snapshot.busy ? null : account.snapshot.role; } },
        { request: unused, deliver: unused }, () => inHome);
    const release = (keyCode: number) => {
        assert(callback, "预览已登记 F9");
        callback.call(owner, { keyCode });
    };
    input.on = (type, listener, target) => {
        assert(type === Input.EventType.KEY_UP, "F9 使用抬起事件避免长按反复开关");
        assert(!callback, "不重复登记 F9");
        callback = listener;
        owner = target;
    };
    input.off = (type, listener, target) => {
        assert(type === Input.EventType.KEY_UP && listener === callback && target === owner, "销毁解除同一个 F9 监听");
        callback = null;
    };
    ui.open = (async (ctor: unknown, args: GmOpenArgs) => {
        assert(ctor === GmView, "F9 只打开 GM 总入口");
        active.add("gm");
        opened.push(args);
        return {} as BaseView<unknown>;
    }) as typeof ui.open;
    ui.openChild = (async (view: BaseView<unknown>, ctor: typeof GmView, args: GmOpenArgs) => {
        assert(view === profile, "手机菜单归发起手势的资料窗口所有");
        return ui.open(ctor, args);
    }) as typeof ui.openChild;
    ui.isOpen = id => active.has(id);
    ui.closeById = id => {
        closed.push(id);
        return active.delete(id);
    };
    try {
        setEditorContext(false, true);
        configure();
        configure();
        inHome = true;
        release(KeyCode.F9);
        account.replace({ busy: false, error: "", role: {
            id: "gm-menu-role", nickname: "菜单检查", level: 1, gold: 0, diamonds: 0,
        } });
        inHome = false;
        release(KeyCode.F9);
        inHome = true;
        release(KeyCode.BACKQUOTE);
        assert(opened.length === 0, "缺角色、未进主城或其他键均不打开 GM");
        release(KeyCode.F9);
        await flushView();
        assert(opened.length === 1 && opened[0].roleId === "gm-menu-role", "主城 F9 把测试角色交给 GM");
        const skill = deferred<void>();
        preview.openSkillAudit = () => skill.promise;
        const outcome = opened[0].openSkillAudit!().then(() => false, error => UIManager.isOpenCancelled(error));
        release(KeyCode.F9);
        assert(!active.has("gm") && closed.includes("skill-audit"), "第二次 F9 关闭菜单和在途技能目录");
        skill.resolve();
        assert(await outcome, "迟到的技能开窗结束时不能复活已关闭菜单");
        release(KeyCode.F9);
        await flushView();
        const dismissedSkill = deferred<void>();
        preview.openSkillAudit = () => dismissedSkill.promise;
        const dismissedOutcome = opened[1].openSkillAudit!().then(() => false, error => UIManager.isOpenCancelled(error));
        const closedCount = closed.filter(id => id === "skill-audit").length;
        ui.closeById("gm");
        release(KeyCode.F9);
        await flushView();
        assert(closed.filter(id => id === "skill-audit").length === closedCount + 1, "关闭按钮退出后重开 GM 撤销原技能目录");
        dismissedSkill.resolve();
        assert(await dismissedOutcome && active.has("gm"), "旧技能异步完成不能关闭新打开的 GM");
        preview.resetSession();
        assert(!active.has("gm"), "角色页面重置清理已打开的 GM 窗口");
        preview.dispose();
        assert(callback === null, "应用销毁恰好移除一次 F9 监听");
        setEditorContext(false, false);
        configure();
        assert(callback === null, "H5 构建模式无需注册 GM 快捷键");
        const menusBeforeTouch = opened.length;
        inHome = false;
        preview.openGmFromProfile(profile);
        assert(opened.length === menusBeforeTouch, "未进入主城时忽略资料手势");
        inHome = true;
        preview.openGmFromProfile(profile);
        preview.openGmFromProfile(profile);
        await flushView();
        assert(opened.length === menusBeforeTouch + 1, "H5 资料手势只打开一个 GM 菜单");
        const touchMenu = opened[menusBeforeTouch];
        assert(touchMenu.roleId === "gm-menu-role" && !!touchMenu.openLineupBattle && !touchMenu.openSkillAudit,
            "H5 使用登录角色和同一试战接线，技能样本仍由本机 Creator 提供");
        preview.resetSession();
        assert(!active.has("gm"), "换角色清理 H5 资料手势打开的 GM 窗口");
    } finally {
        setEditorContext(false, true);
        preview.dispose();
        input.on = originalOn;
        input.off = originalOff;
        ui.open = originalOpen;
        ui.openChild = originalOpenChild;
        ui.isOpen = originalIsOpen;
        ui.closeById = originalClose;
    }
}

/** 执行独立请求与窗口生命周期检查，最后恢复全局配置和提示绑定。 */
async function main(): Promise<void> {
    prepareViewRuntime();
    await checkRequests();
    await checkGrantReset();
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
        for (const ctor of [GmView, GmGrantView, GmBattleView, GmToolsView]) {
            const spec = UIRegistry.viewSpecOf(ctor);
            assert(spec?.cache === false && spec.modal?.mask === true && spec.modal.closeOnOutside === false, "每个 GM View 自行登记无缓存的共享模态参数");
        }
        await checkGrantView(notices);
        await checkGrantLateResults(notices);
        await checkMenu(notices);
        await checkTools(notices);
        await checkBattle(notices);
        await checkBattlePresentationLifetime();
        await checkShortcut();
        assert(languageKeys.length > 0, "发放列表名称经过真实查询边界");
        console.log("PASS GM: Protobuf, wallet grants, level, chapter, server clock, split windows and F9 cleanup");
    } finally {
        off();
        GameConfig.instance.getConfig = original;
    }
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
