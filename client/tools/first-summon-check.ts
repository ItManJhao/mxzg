/**
 * 免费首抽的客户端专项：真实应用装配、统一快照、Protobuf与原回执投影。
 * 只替换持久存储、连接响应和展示宿主，验证断线续段和实际发奖反馈时机。
 */
import { strict as assert } from "node:assert";
import { Button, Label, Node, UITransform } from "cc";
import { AssetStateBinding } from "../assets/scripts/app/remake/AssetStateBinding";
import { FirstSummonBinding } from "../assets/scripts/app/remake/FirstSummonBinding";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import type { AccountService } from "../assets/scripts/features/account/AccountService";
import { RoleController } from "../assets/scripts/features/account/RoleController";
import { BagController } from "../assets/scripts/features/bag/BagController";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import type { FirstSummonIntent, FirstSummonProtocol } from "../assets/scripts/features/hero/data/FirstSummonData";
import { FirstSummonView } from "../assets/scripts/features/hero/ui/FirstSummonView";
import type { RewardNotice } from "../assets/scripts/features/reward/data/RewardNoticeData";
import type { OperationJournalPort } from "../assets/scripts/framework/PersistentOperationJournal";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import type { GameSocketClient } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";

const role = Object.freeze({ id: "role-A", nickname: "独立首抽", serverId: "local-1", level: 1, gold: 0, diamonds: 0 });
const priorKey = "10304012-1111-4111-8111-111111111111";
const receiptId = "10304012-2222-4222-8222-222222222222";
const heroId = "10304012-3333-4333-8333-333333333333";
const hero = Object.freeze({ instanceId: heroId, templateId: 10304012, star: 4, level: 1, stage: 1 });
const state = Object.freeze({ schemaVersion: 1, normalFreeAtSeconds: 1795010000, firstNormalCompleted: true });

/** 使用发布协议的二进制投影，测试调用不得绕过打包及解码。 */
function encoded(frame: GameFrame): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame(frame));
}

/** 同次英雄与非固定数量积分来自服务端真实回执，验证展示只投影英雄。 */
function receipt(requestId: string, roleId = role.id): Record<string, unknown> {
    return {
        schemaVersion: 1, requestId, receiptId, roleId, assetRevision: 8, state,
        actual: {
            roleId,
            items: [
                { itemId: hero.templateId, requested: 1, credited: 1, ignored: 0, reason: "NONE" },
                { itemId: 900302, requested: 3, credited: 3, ignored: 0, reason: "NONE" },
            ],
            heroes: [hero], bonuses: [], experience: [], stacks: [], tavern: [], timedItems: [],
            wallet: { goldBefore: 0, goldAfter: 0, diamondsBefore: 0, diamondsAfter: 0 },
            spirits: { schemaVersion: 1, items: [] },
        },
    };
}

/** 固定协议帧，不重新计算历史奖励。 */
function response(name: FirstSummonProtocol, body: unknown): GameFrame {
    return encoded({ version: 1, kind: "response", name, id: "stub-frame", ok: true, body });
}

/** 有界等待业务进度，避免以固定延时猜测异步顺序。 */
async function waitFor(check: () => boolean, message: string): Promise<void> {
    for (let i = 0; i < 80 && !check(); i++) {
        await new Promise(resolve => setTimeout(resolve, 2));
    }
    assert(check(), message);
}

/** 独立测试应用，保留统一资产和协议；不访问日常浏览器存储或玩家服务器。 */
class Harness {
    /** 应用唯一认证状态，供资产入口验证回执及角色归属。 */
    public readonly account = new AccountModel();
    /** 应用唯一实际背包，确保回执不直接写积分。 */
    public readonly bag = new BagModel();
    /** 回执排队历史，只记录真实交付，不自动视为窗已显示。 */
    public readonly queued: RewardNotice[] = [];
    /** 单次请求的实际协议名与已编码原键。 */
    public readonly requests: Array<{ name: FirstSummonProtocol; requestId: string }> = [];
    /** 假存储的不同认证角色各自原键。 */
    public readonly persisted = new Map<string, FirstSummonIntent>();
    /** 可控制回包时序及丢失，不修改生产逻辑。 */
    public onRequest: (name: FirstSummonProtocol, key: string) => Promise<GameFrame> = async (name, key) =>
        response(name, receipt(key));
    /** 模拟缺推送时请求统一鉴权状态；是否交付由案例控制。 */
    public onRefresh: () => Promise<void> = async () => this.snapshot(true);
    /** 应用已有的真实首抽装配。 */
    public readonly binding: FirstSummonBinding;
    /** 唯一资产同步装配，测试登入或不完整数据以这里是否接纳为准。 */
    private readonly assets: AssetStateBinding;

    /** 注入可控请求及事务日志，保留原应用对状态、展示和角色的校验。 */
    public constructor() {
        const service = { authenticated: <T>(run: (token: string) => Promise<T>) => run("test-token") };
        const socket = {
            firstSummon: async (_token: string, name: FirstSummonProtocol, requestId: string): Promise<GameFrame> => {
                const frame = encoded({ version: 1, kind: "request", name, id: "stub-frame", body: { requestId } });
                assert.deepEqual(frame.body, { requestId });
                assert.equal(this.persisted.get(this.account.snapshot.role!.id)?.requestId, requestId);
                this.requests.push({ name, requestId });
                return this.onRequest(name, requestId);
            },
            refreshSnapshot: () => this.onRefresh(),
        };
        this.binding = new FirstSummonBinding(this.account, service as unknown as AccountService,
            socket as unknown as GameSocketClient, "default", notice => { this.queued.push(notice); }, () => {}, {
                forScope: async keys => this.port(keys[1]),
                dispose: () => {},
            });
        const bagController = new BagController(this.bag);
        const roleController = new RoleController(() => {});
        bagController.initialize();
        this.assets = new AssetStateBinding(this.account, bagController, roleController, undefined, undefined,
            () => this.binding.deactivate(), undefined, this.binding.controller);
    }

    /** 投递同角色的最新统一首包；是否展示英雄和积分由快照决定。 */
    public snapshot(completed: boolean | null, authenticate = true, roleId = role.id): void {
        const currentRole = { ...role, id: roleId };
        const revision = completed ? 8 : 7;
        const initial = {
            role: currentRole, heroes: completed ? [{ ...hero, id: hero.instanceId }] : [],
            inventory: completed ? [{ itemId: 900302, quantity: 3 }] : [], revision,
            ...(completed !== null ? { heroSummon: completed ? state :
                { schemaVersion: 1, firstNormalCompleted: false, normalFreeAtSeconds: 0 } } : {}),
        };
        if (this.account.snapshot.role?.id !== roleId) {
            this.account.replace({ busy: false, role: currentRole, error: "" });
        }
        const frame = authenticate ? encoded({ version: 1, kind: "response", name: Protocol.SESSION_AUTHENTICATE,
            connectionId: "wire", id: "auth", ok: true,
            body: { connectionId: "wire", roleId, serverTimeMs: 1794966800000, initial } })
            : encoded({ version: 1, kind: "event", name: Protocol.STATE_CHANGED, body: initial });
        if (this.assets.apply(frame)) {
            this.binding.afterSnapshot(frame.name);
        }
    }

    /** 释放各模块和认证装配，避免下一案例残留监听。 */
    public dispose(): void {
        this.assets.dispose();
        this.binding.dispose();
    }

    /** 附着到当前角色的事务端口，删除必须精确匹配最初原键。 */
    private port(roleId: string): OperationJournalPort<FirstSummonIntent> {
        return {
            read: async () => this.persisted.get(roleId) ?? null,
            create: async intent => {
                const result = this.persisted.get(roleId) ?? intent;
                this.persisted.set(roleId, result);
                return result;
            },
            clear: async intent => {
                if (this.persisted.get(roleId)?.requestId !== intent.requestId) {
                    return false;
                }
                return this.persisted.delete(roleId);
            },
        };
    }
}

/** 资格缺失不能点击发奖；回执先到时必须等待快照才显示，积分只从背包获得。 */
async function confirmsWithSnapshot(): Promise<void> {
    const app = new Harness();
    let refresh: (() => void) | undefined;
    app.onRefresh = () => new Promise(resolve => { refresh = resolve; });
    try {
        app.snapshot(null);
        await waitFor(() => !app.binding.controller.model.snapshot.busy, "资格初始化未结束");
        app.binding.begin();
        await waitFor(() => !app.binding.controller.model.snapshot.busy, "无资格检查未结束");
        assert.equal(app.requests.length, 0);
        app.snapshot(false);
        await waitFor(() => !app.binding.controller.model.snapshot.busy, "资格更新未结束");
        app.binding.begin();
        app.binding.begin();
        await waitFor(() => !!refresh, "缺少统一状态刷新");
        assert.equal(app.queued.length, 0);
        assert.equal(app.requests.length, 1);
        assert.equal(app.bag.quantity(900302), 0);
        app.snapshot(true);
        refresh!();
        await waitFor(() => app.queued.length === 1, "双确认未入队");
        assert.equal(app.bag.quantity(900302), 3);
        assert.deepEqual(app.queued[0].items, [{ itemId: hero.templateId, credited: 1 }]);
        assert.deepEqual(app.queued[0].heroes, [hero]);
        assert(app.persisted.has(role.id));
        app.binding.presented(receiptId);
        await waitFor(() => !app.persisted.has(role.id), "原回执已显示但日志未清");
        app.binding.begin();
        await waitFor(() => !app.binding.controller.model.snapshot.busy, "重复点击检查未结束");
        assert.equal(app.requests.length, 1);
    } finally {
        app.dispose();
    }
}

/** 断线后认证已到了，旧请求故障稍后才结束；仍须用原键查询、成功一次。 */
async function reconnectRace(): Promise<void> {
    const app = new Harness();
    let reject: ((error: unknown) => void) | undefined;
    app.onRequest = (name, requestId) => name === Protocol.HERO_FIRST_SUMMON
        ? new Promise((_resolve, fail) => { reject = fail; })
        : Promise.resolve(response(name, { requestId, found: true, receipt: receipt(requestId) }));
    try {
        app.snapshot(false);
        await waitFor(() => !app.binding.controller.model.snapshot.busy, "未完成初始同步");
        app.binding.begin();
        await waitFor(() => !!reject, "未发送首抽原请求");
        app.snapshot(true);
        reject!(new SocketFailure("DISCONNECTED"));
        await waitFor(() => app.queued.length === 1, "丢包后的并发认证未恢复");
        assert.deepEqual(app.requests.map(request => request.name), [
            Protocol.HERO_FIRST_SUMMON, Protocol.HERO_FIRST_SUMMON_STATUS,
        ]);
        assert.equal(app.requests[0].requestId, app.requests[1].requestId);
        app.snapshot(true);
        app.binding.presented(receiptId);
        await waitFor(() => !app.persisted.has(role.id), "恢复回执展示后未清理");
        assert.equal(app.queued.length, 1);
    } finally {
        app.dispose();
    }
}

/** 冷重登查原键；换号中迟到的跨角色回执不能展示或删除旧意图。 */
async function coldRecoveryAndSwitch(): Promise<void> {
    const app = new Harness();
    let resolve: ((frame: GameFrame) => void) | undefined;
    app.persisted.set(role.id, { schemaVersion: 1, requestId: priorKey });
    app.onRequest = () => new Promise(done => { resolve = done; });
    try {
        app.snapshot(true);
        await waitFor(() => !!resolve, "冷登录没有查原回执");
        assert.deepEqual(app.requests, [{ name: Protocol.HERO_FIRST_SUMMON_STATUS, requestId: priorKey }]);
        app.snapshot(false, true, "role-B");
        resolve!(response(Protocol.HERO_FIRST_SUMMON_STATUS, { requestId: priorKey, found: true, receipt: receipt(priorKey) }));
        await waitFor(() => !app.binding.controller.model.snapshot.busy, "新角色未同步完");
        assert.equal(app.queued.length, 0);
        assert(app.persisted.has(role.id));
        assert.equal(app.binding.controller.model.snapshot.requestId, null);
        assert.equal(app.binding.controller.model.snapshot.state?.firstNormalCompleted, false);
    } finally {
        app.dispose();
    }
}

/** 其他设备已完成且没有该键回执，只接受其快照，不显示没有归属的资产。 */
async function completedElsewhere(): Promise<void> {
    const app = new Harness();
    app.persisted.set(role.id, { schemaVersion: 1, requestId: priorKey });
    app.onRequest = async (name, requestId) => response(name, { requestId, found: false });
    try {
        app.snapshot(true);
        await waitFor(() => !app.persisted.has(role.id), "其他设备已完成后保留了无效原意图");
        assert.equal(app.requests.length, 1);
        assert.equal(app.queued.length, 0);
    } finally {
        app.dispose();
    }
}

/** 已完成且无原意图时隐藏免费按钮，仍待确认时保留恢复入口。 */
async function rendersOnlyAvailableAction(): Promise<void> {
    const app = new Harness();
    const root = new Node("FirstSummon");
    const panel = new Node("Panel");
    panel.parent = root;
    const view = root.addComponent(FirstSummonView);
    view.panel = panel.addComponent(UITransform);
    view.panel.setContentSize(518, 494);
    view.closeButton = new Node("Close").addComponent(Button);
    view.summonButton = new Node("Apply").addComponent(Button);
    view.summonLabel = new Node("ApplyLabel").addComponent(Label);
    view.stateLabel = new Node("Message").addComponent(Label);
    view.pointsLabel = new Node("Points").addComponent(Label);
    try {
        view.runOpen({ model: app.binding.controller.model, requestSummon: () => app.binding.begin() });
        assert.equal(view.summonButton.node.active, false);
        app.snapshot(false);
        await waitFor(() => view.summonButton!.interactable, "有免费资格时未启用按钮");
        assert.equal(view.summonLabel.string, "免费召唤");
        app.snapshot(true);
        await waitFor(() => !app.binding.controller.model.snapshot.busy, "完成快照未同步");
        assert.equal(view.summonButton.node.active, false);
        assert.equal(view.stateLabel.string, "首次普通召唤已完成");
        app.binding.controller.setPending(priorKey, false);
        assert.equal(view.summonButton.node.active, true);
        assert.equal(view.summonLabel.string, "恢复结果");
        view.runClose();
        app.binding.controller.setPending(null, false);
        assert.equal(view.summonLabel.string, "恢复结果", "关闭后未解除渲染监听");
    } finally {
        root.destroy();
        app.dispose();
    }
}

/** 顺序运行共享协议路由与事件环境中的独立案例。 */
async function main(): Promise<void> {
    await confirmsWithSnapshot();
    await reconnectRace();
    await coldRecoveryAndSwitch();
    await completedElsewhere();
    await rendersOnlyAvailableAction();
    console.log("首抽客户端：资格、原键、双确认、重连竞态、换号及积分静默检查通过");
}

void main().catch(error => { console.error(error); process.exitCode = 1; });
