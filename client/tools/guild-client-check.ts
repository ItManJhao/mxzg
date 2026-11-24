/** 公会客户端回归，覆盖搜索保留、提交互斥、状态通知与页面销毁。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { Button, Label, Node, ScrollView } from "cc";
import { GuildController } from "../assets/scripts/features/guild/GuildController";
import { GuildModel, type GuildState } from "../assets/scripts/features/guild/GuildModel";
import { GuildApprovalCell } from "../assets/scripts/features/guild/ui/GuildApprovalCell";
import { GuildListCell } from "../assets/scripts/features/guild/ui/GuildListCell";
import { GuildView } from "../assets/scripts/features/guild/ui/GuildView";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import type { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { GameRedDotKey } from "../assets/scripts/features/common/utils/GameRedDotKey";
import { RedDotManager } from "../assets/scripts/framework/ui/RedDotManager";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol, type AuthenticatedGameProtocol } from "../assets/scripts/platform/Protocol";
import { ProtocolRouter, type ProtocolReceiver } from "../assets/scripts/platform/ProtocolRouter";

interface Request {
    readonly name: AuthenticatedGameProtocol;
    readonly body: unknown;
    readonly receive: (frame: GameFrame) => void;
}

const requests: Request[] = [];
const fixture = {
    /** 由测试手动交付下一条真实目录回包。 */
    async deliver(name: AuthenticatedGameProtocol, body: unknown, receive: Request["receive"]): Promise<void> {
        requests.push({ name, body, receive });
    },
    /** 模拟账号层校验请求 ID 后向生产路由交付。 */
    send(owner: ProtocolReceiver, name: AuthenticatedGameProtocol, body: unknown): void {
        requests.push({ name, body, receive: frame => ProtocolRouter.instance.dispatch(owner, frame) });
    },
};
const state: GuildState = {
    levelRequired: 18,
    createCostDiamonds: 100,
    nameLimit: 64,
    members: [],
    applications: [],
    guilds: [{ id: "featured", name: "星火", memberCount: 1, capacity: 15 }],
    page: 1,
    hasMore: false,
    appliedGuildIds: [],
    rejoinAtSeconds: 0,
};

/** 核对请求名称和入参后交付本次业务返回。 */
function accept(index: number, name: AuthenticatedGameProtocol, body: unknown, snapshot: GuildState): void {
    const request = requests[index];
    assert.ok(request);
    assert.equal(request.name, name);
    assert.deepEqual(request.body, body);
    request.receive({ version: 1, kind: "response", name, ok: true, body: snapshot });
}

/** 切页或应用回到后台时，Creator 可先销毁子按钮再销毁列表格。 */
function checkCellTeardown(): void {
    const approval = new GuildApprovalCell() as any;
    const approve = new Node("Approve");
    const reject = new Node("Reject");
    approval._approve = approve.addComponent(Button);
    approval._reject = reject.addComponent(Button);
    let decisions = 0;
    let otherListeners = 0;
    reject.on(Button.EventType.CLICK, () => { otherListeners++; });
    approval.onLoad();
    approval.decide = () => { decisions++; };
    reject.emit(Button.EventType.CLICK);
    assert.equal(decisions, 1, "清理前审批按钮能处理本行操作");
    approve.destroy();
    approval._approve.node = null;
    assert.doesNotThrow(() => approval.onDestroy());
    assert.equal(approval.decide, null, "销毁后释放原申请回调");
    approval.decide = () => { decisions++; };
    reject.emit(Button.EventType.CLICK);
    assert.equal(decisions, 1, "存活按钮上的公会监听也须解除");
    assert.equal(otherListeners, 2, "清理仅解除本格监听");
    assert.doesNotThrow(() => approval.onDestroy());

    const directory = new GuildListCell() as any;
    const action = new Node("Join");
    directory._action = action.addComponent(Button);
    directory.onLoad();
    directory.row = { action: () => { decisions++; } };
    action.destroy();
    directory._action.node = null;
    assert.doesNotThrow(() => directory.onDestroy());
    assert.equal(directory.row, null, "切页后释放旧目录格的加入操作");
}

/** 公会大厅沿原位置装配公共红点，审批按钮继续按当前角色权限显示。 */
function checkApprovalEntry(): void {
    const objects = JSON.parse(readFileSync("client/assets/bundles/module/guild/prefabs/GuildView.prefab", "utf8"));
    const viewBinding = objects.find((row: any) => row._applicationDotAnchor);
    assert(viewBinding);
    const anchor = objects[viewBinding._applicationDotAnchor.__id__];
    const button = objects[viewBinding._applications.__id__];
    assert.equal(anchor._active, true);
    assert.equal(anchor._parent.__id__, button.node.__id__);
    assert.equal(anchor._lpos.x, 75);
    assert.equal(anchor._lpos.y, 20);
    const transforms = anchor._components.map((ref: any) => objects[ref.__id__]);
    assert.deepEqual(transforms.map((row: any) => row.__type__), ["cc.UITransform"]);
    assert.equal(transforms[0]._contentSize.width, 25);
    assert.equal(transforms[0]._contentSize.height, 25);
    const view = new GuildView();
    const name = new Node().addComponent(Label);
    const applications = new Node().addComponent(Button);
    const role = { id: "leader" };
    Object.assign(view, {
        args: { account: { snapshot: { role } } },
        _guildName: name,
        _leader: new Node().addComponent(Label),
        _memberCount: new Node().addComponent(Label),
        _notice: new Node().addComponent(Label),
        _noticeScroll: new Node().addComponent(ScrollView),
        _applications: applications,
    });
    const guild = state.guilds[0];
    const snapshot = {
        ...state,
        guild,
        members: [{ id: "leader", nickname: "会长", level: 20, leader: true }],
        applications: [{ id: "requester", nickname: "申请人", level: 20, leader: false }],
    };
    const render = Reflect.get(view, "renderHall").bind(view);
    render(guild, snapshot);
    assert.equal(applications.node.active, true);
    render(guild, { ...snapshot, applications: [] });
    assert.equal(applications.node.active, true, "没有待处理申请仍保留会长入口");
    role.id = "member";
    render(guild, snapshot);
    assert.equal(applications.node.active, false);
    role.id = "leader";
    render(guild, snapshot);
    assert.equal(name.string, guild.name);
    assert.equal(applications.node.active, true);
}

checkCellTeardown();
checkApprovalEntry();
const controller = GuildController.instance;
const account = new AccountModel();
controller.configure(fixture as unknown as AccountOperations, account);
controller.initialize();
try {
    controller.setVisible(true);
    accept(0, Protocol.GUILD_LIST, { query: "", page: 1 }, state);
    controller.list(" 星火 ", 1);
    accept(1, Protocol.GUILD_LIST, { query: "星火", page: 1 }, state);
    controller.change({ action: "APPLY", guildId: "featured" });
    controller.change({ action: "APPLY", guildId: "featured" });
    controller.onNotify(Protocol.GUILD_UPDATED, {});
    controller.onNotify(Protocol.GUILD_UPDATED, {});
    const applied = { ...state, guilds: [], appliedGuildIds: ["featured"] };
    accept(2, Protocol.GUILD_CHANGE, { action: "APPLY", guildId: "featured" }, applied);
    assert.deepEqual(GuildModel.instance.snapshot?.guilds, state.guilds, "申请回包不应把目录切回默认搜索");
    assert.deepEqual(GuildModel.instance.snapshot?.appliedGuildIds, ["featured"]);
    accept(3, Protocol.GUILD_LIST, { query: "星火", page: 1 }, { ...applied, guilds: state.guilds });
    assert.equal(requests.length, 4, "多次变化合并成一份搜索请求");
    // 旧查询仍在途时离开公会，前台鉴权和迟到回包都无需替已关闭的页面再请求。
    controller.list("近卫", 1);
    controller.onNotify(Protocol.GUILD_UPDATED, {});
    controller.setVisible(false);
    controller.onNotify(Protocol.GUILD_UPDATED, {});
    controller.refreshRoleState(true, false);
    accept(4, Protocol.GUILD_LIST, { query: "近卫", page: 1 }, { ...state, guilds: [] });
    assert.equal(requests.length, 5, "关闭后的实时通知、鉴权刷新和迟到回包不再读取目录");
    controller.setVisible(true);
    accept(5, Protocol.GUILD_LIST, { query: "", page: 1 }, state);
    assert.deepEqual(GuildModel.instance.snapshot?.guilds, state.guilds, "再次进入时读取最新的推荐目录");
    controller.resetSession();
    assert.equal(GuildModel.instance.snapshot, null, "换号后清理旧公会资料");

    // 新会话先确认角色公会身份，准备底栏前保持静默。
    const guild = state.guilds[0];
    const role = { id: "leader", nickname: "会长", level: 20, gold: 0, diamonds: 0, guildName: guild.name };
    account.replace({ busy: false, role, error: "" });
    controller.refreshRoleState(false, true);
    assert.equal(requests.length, 6);
    controller.setHomeReady(true);
    controller.setHomeReady(true);
    assert.equal(requests.length, 7, "主城首次就绪只读取一次当前公会");
    const guildQuery = { query: "", page: 1 };
    const memberState = {
        ...state,
        guild,
        guilds: [],
        members: [{ id: role.id, nickname: role.nickname, level: role.level, leader: true }],
    };
    const pendingState = {
        ...memberState,
        applications: [{ id: "requester", nickname: "申请人", level: 20, leader: false }],
    };
    const dots = RedDotManager.instance;
    accept(6, Protocol.GUILD_LIST, guildQuery, memberState);
    assert.equal(dots.isVisible(GameRedDotKey.GUILD), false);
    controller.onNotify(Protocol.GUILD_UPDATED, {});
    accept(7, Protocol.GUILD_LIST, guildQuery, pendingState);
    assert.equal(dots.isVisible(GameRedDotKey.GUILD), true, "大厅关闭时仍汇总新申请到公会底栏");
    controller.refreshRoleState(true, false);
    accept(8, Protocol.GUILD_LIST, guildQuery, memberState);
    assert.equal(dots.isVisible(GameRedDotKey.GUILD), false, "重连后用最新名单熄灭红点");
    controller.onNotify(Protocol.GUILD_UPDATED, {});
    account.replace({ busy: false, role: { ...role, guildName: "" }, error: "" });
    controller.refreshRoleState(false, true);
    controller.onNotify(Protocol.GUILD_UPDATED, {});
    accept(9, Protocol.GUILD_LIST, guildQuery, pendingState);
    assert.equal(dots.isVisible(GameRedDotKey.GUILD), false, "离开公会后旧名单不恢复提醒");
    assert.equal(requests.length, 10, "未入会时不会后台读取目录");
    controller.resetSession();
    assert.equal(GuildModel.instance.snapshot, null);
} finally {
    controller.dispose();
}

console.log("公会客户端搜索、申请互斥、通知合并及生命周期回归通过");
