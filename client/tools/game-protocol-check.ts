/** 强类型二进制契约回归：初始化/精灵实例、主线与副本实际奖励、日志脱敏、错误载荷与无Node浏览器环境。
 * 可显式读取本轮Java真实帧互通；旧主线回执缺实际明细仍保留缺失，不借当前资产补数据。
 */
import {strict as assert} from "node:assert";
import {createRequire} from "node:module";
import {runInNewContext} from "node:vm";
import {readFileSync} from "node:fs";
import { GameProtocolCodecUtils, GAME_FRAME_LIMIT } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import {ProtocolRouter} from "../assets/scripts/platform/ProtocolRouter";
import { GameProtocolLogUtils } from "../assets/scripts/platform/GameProtocolLogUtils";
import {mxzg} from "../assets/scripts/platform/GameProtocol.generated";
const state={revision:2,role:{id:"role",nickname:"测试😀",level:1,gold:0,diamonds:0,serverId:"local-1"},heroes:[],heroRoster:{capacity:325,buySpaceTimes:1},inventory:[{itemId:900101,quantity:4}]};
/** 公会空列表、审批回包、通知和角色首包继续使用同一份二进制协议。 */
function checkGuildWire(): void {
    roundTrip({ version: 1, kind: "request", name: Protocol.GUILD_LIST, body: { query: "远征", page: 2 } });
    const command = { requestId: "aad15d1b-be88-4b9e-8c84-075cbb9a52df", action: "APPROVE", applicantId: "role" };
    roundTrip({ version: 1, kind: "request", name: Protocol.GUILD_CHANGE, body: command });
    roundTrip({ version: 1, kind: "request", name: Protocol.GUILD_CHANGE,
        body: { requestId: command.requestId, action: "CREATE", name: "远征", badgeId: 43 } });
    const guild = { id: "guild", name: "远征", memberCount: 2, capacity: 15, description: "", badgeId: 43 };
    for (const name of [Protocol.GUILD_LIST, Protocol.GUILD_CHANGE]) {
        roundTrip({ version: 1, kind: "response", name, id: "req", ok: true,
            body: { ...(name === Protocol.GUILD_CHANGE ? { requestId: command.requestId, guild } : {}),
                levelRequired: 18, createCostDiamonds: 100, nameLimit: 64,
                members: [{ id: "role", nickname: "测试", level: 18, leader: true, headId: 1, borderId: 0 }],
                applications: [],
                guilds: [guild], page: 1, hasMore: false, appliedGuildIds: [], rejoinAtSeconds: 0 } });
    }
    roundTrip({ version: 1, kind: "event", name: Protocol.GUILD_UPDATED, connectionId: "c", body: {} });
    for (const guildName of [guild.name, ""]) {
        roundTrip({ version: 1, kind: "event", name: Protocol.STATE_CHANGED,
            body: { ...state, role: { ...state.role, guildName } } });
    }
}
/** VIP 首包保留未同步进度。领取回包中的原奖励只能属于同角色和资产版本。 */
function checkVipWire(): void {
    const roleId = "d5b56852-e92e-42cd-a2c0-c1de31dbf65a";
    const requestId = "c9f13dc0-a332-482c-8b11-caf560f7bf58";
    const command = { requestId, taskId: 100100 };
    const request = { version: 1, kind: "request" as const, name: Protocol.VIP_CLAIM, id: "request-vip", body: command };
    roundTrip(request);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { ...command, level: 13 } }), /请求字段/);
    const vip = { level: 1, tasks: [{ id: 100500, target: 20, progress: 0, claimed: false },
        { id: 100700, target: 3, claimed: false }] };
    const snap = { version: 1, kind: "event" as const, name: Protocol.STATE_CHANGED, body: { ...state, vip } };
    roundTrip(snap);
    roundTrip({ ...snap, body: { ...state, vip: { level: 13, tasks: [] } } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...snap, body: { ...state,
        vip: { ...vip, tasks: [...vip.tasks, vip.tasks[0]] } } }), /进度无效/);
    const notice = { schemaVersion: 1, roleId, receiptId: "20e8c72b-51ac-450e-930b-d5d06eedd153",
        assetRevision: 3, mode: "POPUP", requestId, items: [{ itemId: 900002, credited: 20 }], heroes: [] };
    const response = { ...request, kind: "response" as const, ok: true,
        body: { ...command, roleId, assetRevision: 3, notice } };
    roundTrip(response);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response,
        body: { ...response.body, assetRevision: 4 } }), /回执与奖励不符/);
    if (process.argv.includes("--vip-java")) {
        const javaReceipt = GameProtocolCodecUtils.decodeGameFrame(readFileSync("backend/target/vip-claim-wire.pb"));
        const javaState = GameProtocolCodecUtils.decodeGameFrame(readFileSync("backend/target/vip-state-wire.pb"));
        const body = javaReceipt.body as typeof response.body;
        const snapshot = javaState.body as typeof snap.body;
        assert.equal(javaReceipt.name, Protocol.VIP_CLAIM);
        assert.equal(javaState.name, Protocol.STATE_CHANGED);
        assert.equal(body.roleId, snapshot.role.id);
        assert.equal(body.assetRevision, snapshot.revision);
        assert.deepEqual(body.notice.items, [{ itemId: 900002, credited: 20 }]);
        assert(snapshot.vip.tasks.some(task => task.id === body.taskId && task.claimed));
    }
}
/** 协议帧往返必须保持结构和整数，不截取 Buffer 池其他字节。 */
function roundTrip(frame:any){const bytes=GameProtocolCodecUtils.encodeGameFrame(frame);assert(bytes instanceof ArrayBuffer);assert.deepEqual(GameProtocolCodecUtils.decodeGameFrame(bytes),frame);}
/** 验证统一状态、玩法指令和原奖励往返。显式 wire 参数只读取独立 Java 测试输出。 */
function main(){
 checkGuildWire();
 checkVipWire();
 for(const locked of [true,false]) roundTrip({version:1,kind:"event",name:Protocol.STATE_CHANGED,body:{...state,heroes:[{id:"hero",templateId:1,level:1,star:1,locked,deployed:true,stage:0,baseStats:{hp:120,atk:30,def:10,spd:100}}]}});
 const instance="9223372036854775807";
 roundTrip({version:1,kind:"event",name:Protocol.STATE_CHANGED,connectionId:"conn",body:{...state,
 inventory:[{itemId:900102,quantity:2,instanceId:instance}],
 timedInventory:{serverTimeSeconds:100,items:[{instanceId:instance,itemId:123,activeAtSeconds:50,expiresAtSeconds:200},{instanceId:"other-instance",itemId:123,activeAtSeconds:60,expiresAtSeconds:300}]}}});

 const spirits = {schemaVersion: 1, items: [instance, "another-spirit"].map(instanceId => ({
     instanceId, itemId: 2000002, abilityId: 1, skills: [{sort: 1, skillId: 1, level: 1}]
 }))};
 roundTrip({version: 1, kind: "event", name: Protocol.STATE_CHANGED,
     body: {...state, spiritInventory: spirits}});
 roundTrip({version: 1, kind: "event", name: Protocol.STATE_CHANGED,
     body: {...state, spiritInventory: {schemaVersion: 1, items: []}}});

 roundTrip({version:1,kind:"request",name:Protocol.SESSION_LOGIN,id:"req",body:{account:"test",serverId:"local-1",clientInstanceId:"instance"}});
 roundTrip({version:1,kind:"request",name:Protocol.SESSION_AUTHENTICATE,id:"req",body:{accessToken:"a".repeat(43),clientInstanceId:"instance"}});
 for(const name of [Protocol.SESSION_HEARTBEAT,Protocol.SERVERS_LIST])roundTrip({version:1,kind:"request",name,id:"req",body:{}});
 const accepted={version:1,kind:"response",name:Protocol.SESSION_LOGIN,id:"req",ok:true,body:{connectionId:"conn",roleId:"role",serverTimeMs:1,initial:state,session:{accessToken:"a".repeat(43),expiresAt:"2099-01-01T00:00:00Z"}}};roundTrip(accepted);
 const change={version:1,kind:"event",name:Protocol.STATE_CHANGED,connectionId:"conn",body:state};roundTrip(change);
 roundTrip({version:1,kind:"response",name:Protocol.SERVERS_LIST,id:"req",ok:true,body:{items:[]}});
 roundTrip({version:1,kind:"response",name:Protocol.SESSION_HEARTBEAT,id:"req",ok:false,body:null,error:{code:"BUSY",message:"BUSY",retryable:true}});
 for(const value of ["text",new Uint8Array(GAME_FRAME_LIMIT+1),new Uint8Array([10,127])])assert.throws(()=>GameProtocolCodecUtils.decodeGameFrame(value));
 assert.throws(()=>GameProtocolCodecUtils.encodeGameFrame({...change,body:{...state,revision:2**53}}));
 const Frame=(mxzg as any).game.Frame;
 // 生成器encode会为required标量写0，须构造真正缺字段的字节，不能把0误当协议缺失。
 const {Writer} = createRequire(process.cwd()+"/client/package.json")("protobufjs/minimal");
 const brokenItem = Writer.create().uint32(10).string(instance).uint32(16).uint32(2000002).finish();
 const brokenInventory = Writer.create().uint32(8).uint32(1).uint32(18).bytes(brokenItem).finish();
 const snapshotBytes = (mxzg as any).game.Snapshot.encode(state).finish();
 const spiritField = Writer.create().uint32(82).bytes(brokenInventory).finish();
 const missingAbility = Writer.create().uint32(8).uint32(1).uint32(18).string("event")
     .uint32(26).string(Protocol.STATE_CHANGED).uint32(98)
     .bytes(new Uint8Array([...snapshotBytes, ...spiritField])).finish();
 assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(missingAbility));
 assert.throws(()=>GameProtocolCodecUtils.decodeGameFrame(Frame.encode({version:1,kind:"event",name:Protocol.STATE_CHANGED,empty:{}}).finish()));
 const unsafe=Frame.encode(Frame.fromObject({version:1,kind:"event",name:Protocol.STATE_CHANGED,snapshot:{...state,revision:"9007199254740993"}})).finish();assert.throws(()=>GameProtocolCodecUtils.decodeGameFrame(unsafe));
 assert.throws(()=>GameProtocolCodecUtils.decodeGameFrame(Frame.encode({version:1,kind:"response",name:Protocol.SESSION_LOGIN,ok:true,accepted:{connectionId:"c",roleId:"r",serverTimeMs:1}}).finish()));
 const log=GameProtocolLogUtils.formatServerFrame(accepted);assert(log.includes("物品种类数：1")&&log.includes('"quantity": 4')&&log.includes("role"));assert(!log.includes("a".repeat(43)));assert.equal((accepted.body.session as any).accessToken,"a".repeat(43));
 assert.equal(GameProtocolLogUtils.formatServerFrame({version:1,kind:"response",name:Protocol.SESSION_HEARTBEAT,body:{serverTimeMs:1}}),"");
 const router=new ProtocolRouter(),handled:any[]=[];const receiver={onNotify:(name:any,data:any)=>handled.push({name,data})},stop=router.register(receiver,[Protocol.STATE_CHANGED]);router.dispatch(receiver,change);assert.equal(handled[0].name,Protocol.STATE_CHANGED);assert.throws(()=>router.dispatch(receiver,accepted));stop();assert.throws(()=>router.dispatch(receiver,change));
 const {buildSync}=createRequire(process.cwd()+"/client/package.json")("esbuild");const browser=buildSync({entryPoints:["client/assets/scripts/platform/GameProtocolCodecUtils.ts"],bundle:true,platform:"browser",format:"iife",globalName:"Codec",write:false,target:"es2017"}).outputFiles[0].text;
 const sandbox:any={};runInNewContext(browser,sandbox);const codec=sandbox.Codec.GameProtocolCodecUtils;const value=codec.decodeGameFrame(codec.encodeGameFrame(change));assert.equal(value.body.role.nickname,"测试😀");assert.equal(value.body.role.gold,0);
 assert.throws(()=>GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(GAME_FRAME_LIMIT+1)));
 assert.throws(()=>GameProtocolCodecUtils.encodeGameFrame({version:1,kind:"request",name:"session.login",body:{account:"x".repeat(GAME_FRAME_LIMIT+1),serverId:"local-1"}}));
 assert(GAME_FRAME_LIMIT===262144);console.log("PASS PB login/init/state contracts, required fields, safe integers, routing, readable redacted logs, browser runtime");
 if (process.argv.includes("--spirit-wire")) {
     checkSpiritWire();
 }
 checkChapterRewardWire();
 checkNormalSummonWire();
 checkRoleNameWire();
 checkWelcomeGiftWire();
 checkFullSummonWire();
 checkEquipmentWire();
 checkHeroLockWire();
 checkArtifactAndGodShopWire();
 checkMarketWire();
 checkDailyDungeonWire();
 checkProgressionBattleWire();
 checkGmToolsWire();
}

/** 圣器独立实例和神装商店日周期都保留在统一快照和各自的二进制回包中。 */
function checkArtifactAndGodShopWire(): void {
    const roleId = "701cd02e-38af-4093-a435-5216f8b2a421";
    const heroId = "5e26f085-cc45-4aa0-8080-697c37e748f1";
    const instanceId = "54589b2b-7357-4dce-a83d-17026925c149";
    const requestId = "d6aec724-6097-4f52-9c47-8d78a49a30ba";
    const resetAt = 2_500_000_000;
    const artifact = { version: 1, id: "artifact", name: Protocol.HERO_ARTIFACT_CHANGE };
    const activation = {
        requestId, heroId, slot: 1, action: "ACTIVATE",
        materialInstanceIds: [], materialHeroIds: [], replacementItemIds: [],
    };
    roundTrip({ ...artifact, kind: "request", body: activation });
    roundTrip({ ...artifact, kind: "response", ok: true,
        body: { requestId, roleId, heroId, slot: 1, action: "ACTIVATE", instanceId, templateId: 908101, assetRevision: 3 } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...artifact, kind: "request", body: { ...activation, slot: 3 },
    }));

    const shop = { version: 1, id: "god-shop", name: Protocol.HERO_GOD_EQUIPMENT_SHOP_BUY };
    const order = { requestId, productId: 1, count: 2, resetAt };
    roundTrip({ ...shop, kind: "request", body: order });
    roundTrip({ ...shop, kind: "response", ok: true, body: { ...order, roleId, purchased: 2, assetRevision: 4 } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...shop, kind: "request", body: { ...order, resetAt: 2 ** 53 },
    }));
    roundTrip({ version: 1, kind: "event", name: Protocol.STATE_CHANGED, body: {
        ...state,
        artifacts: { items: [{ heroId, instanceId, templateId: 908101, slot: 1 }], slots: [{ heroId, slot: 1 }] },
        godEquipment: {
            requiredRoleLevel: 70, requiredWorldLevel: 1, requiredHeroStar: 6, worldLevel: 1,
            items: [], drawCount: 0, freeDraw: true, shop: { resetAt, purchases: [{ productId: 1, purchased: 2 }] },
        },
    } });
}

/** 验证二进制锁定和解锁保留明确的布尔值，禁止缺失设值或越权字段。 */
function checkHeroLockWire(): void {
    const request = { version: 1, id: "hero-lock", kind: "request", name: Protocol.HERO_LOCK_SET };
    const response = { ...request, kind: "response", ok: true };
    const requestId = "701cd02e-38af-4093-a435-5216f8b2a421";
    const heroId = "5e26f085-cc45-4aa0-8080-697c37e748f1";
    for (const locked of [true, false]) {
        const body = { requestId, heroId, locked };
        roundTrip({ ...request, body });
        roundTrip({ ...response, body: { ...body, assetRevision: 5 } });
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { ...body, roleId: "other" } }));
    }
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { requestId, heroId } }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, body: { requestId, heroId, locked: false } }));
}

/** 验证大额货币、大于32位的时间和专用 GM 载荷，修改请求不接受客户端指定角色。 */
function checkGmToolsWire(): void {
    const request = { version: 1, kind: "request", id: "gm-test", connectionId: "conn" };
    const response = { ...request, kind: "response", ok: true };
    const requestId = "701cd02e-38af-4093-a435-5216f8b2a421";
    const grant = { requestId, kind: "item", configId: 900001, quantity: 10_000_000 };
    roundTrip({ ...request, name: Protocol.GM_GRANT, body: grant });
    roundTrip({ ...response, name: Protocol.GM_GRANT, body: grant });
    for (const { name, body } of [
        { name: Protocol.GM_LEVEL_SET, body: { requestId, level: 15 } },
        { name: Protocol.GM_CHAPTER_SET, body: { requestId, mission: 20 } },
    ]) {
        roundTrip({ ...request, name, body });
        roundTrip({ ...response, name, body });
        const bytes = GameProtocolCodecUtils.encodeGameFrame({ ...request, name,
            body: { ...body, roleId: "another-role" } });
        assert.deepEqual(GameProtocolCodecUtils.decodeGameFrame(bytes).body, body);
    }
    roundTrip({ ...request, name: Protocol.GM_TIME_GET, body: {} });
    for (const unixSeconds of [0, 2_500_000_000]) {
        roundTrip({ ...request, name: Protocol.GM_TIME_SET, body: { unixSeconds } });
    }
    roundTrip({ ...response, name: Protocol.GM_TIME_GET, body: { serverTimeMs: 2_500_000_000_000, overridden: false } });
    roundTrip({ ...response, name: Protocol.GM_TIME_SET, body: { serverTimeMs: 2_500_000_000_000, overridden: true } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request,
        name: Protocol.GM_TIME_SET, body: { unixSeconds: 2 ** 53 } }));
}

/** 命名只发送昵称，确认状态随角色快照同步，保留未命名与旧快照缺字段的区别。 */
function checkRoleNameWire(): void {
    const randomRequest = { version: 1, kind: "request", name: Protocol.ROLE_NAME_RANDOM, id: "random" };
    const setRequest = { version: 1, kind: "request", name: Protocol.ROLE_NAME_SET, id: "set" };
    const randomResponse = { ...randomRequest, kind: "response", ok: true };
    const setResponse = { ...setRequest, kind: "response", ok: true };
    const nickname = "苍穹";
    roundTrip({ ...randomRequest, body: {} });
    roundTrip({ ...randomResponse, body: { nickname } });
    roundTrip({ ...setRequest, body: { nickname } });
    roundTrip({ ...setResponse, body: {} });
    roundTrip({ ...setResponse, ok: false, body: null,
        error: { code: "ROLE_NAME_EXISTS", message: "ROLE_NAME_EXISTS", retryable: false } });
    for (const firstNamed of [false, true]) {
        const snapshot = { ...state, role: { ...state.role, firstNamed } };
        roundTrip({ version: 1, kind: "event", name: Protocol.STATE_CHANGED, body: snapshot });
    }
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...setRequest, body: {} }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...setRequest, body: { nickname, roleId: "other" } }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...setResponse, body: { nickname } }));
    const Frame = (mxzg as any).game.Frame;
    assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(Frame.encode({ ...randomResponse, empty: {} }).finish()));
}

/** 新手赠礼只请求当前角色，复用实际到账回执并保持快照缺字段和 false 的区别。 */
function checkWelcomeGiftWire(): void {
    const request = { version: 1, kind: "request", name: Protocol.ROLE_WELCOME_CLAIM, id: "welcome" };
    const response = { ...request, kind: "response", ok: true };
    const notice = {
        schemaVersion: 1, receiptId: "20000000-2222-4222-8222-222222222222",
        roleId: state.role.id, assetRevision: state.revision + 1, mode: "POPUP",
        items: [{ itemId: 900002, credited: 492 }], heroes: [],
    };
    roundTrip({ ...request, body: {} });
    roundTrip({ ...response, body: notice });
    roundTrip({ ...response, body: null, ok: false,
        error: { code: "WELCOME_GIFT_UNAVAILABLE", message: "当前没有可领取的新手赠礼", retryable: false } });
    for (const welcomeGiftAvailable of [false, true]) {
        roundTrip({ version: 1, kind: "event", name: Protocol.STATE_CHANGED,
            body: { ...state, role: { ...state.role, welcomeGiftAvailable } } });
    }
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { roleId: "other" } }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, body: { ...notice, mode: "TIPS" } }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, body: { ...notice, assetRevision: 0 } }));
    const Frame = (mxzg as any).game.Frame;
    assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(Frame.encode({ ...response, empty: {} }).finish()));
    assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(
        Frame.encode({ ...response, rewardNotice: { ...notice, items: [] } }).finish()));
}

/** 普通单抽和历史首抽共用请求与到账结构；客户端只能提交操作编号。 */
function checkNormalSummonWire(): void {
    const requestId = "10000000-1111-4111-8111-111111111111";
    const receiptId = "20000000-2222-4222-8222-222222222222";
    const hero = { instanceId: "30000000-3333-4333-8333-333333333333", templateId: 1234, level: 1, star: 2, stage: 0 };
    const actual = {
        roleId: "role-A", heroes: [hero],
        items: [{ itemId: hero.templateId, requested: 1, credited: 1, ignored: 0, reason: "NONE" }],
        wallet: { goldBefore: 0, goldAfter: 0, diamondsBefore: 0, diamondsAfter: 0 },
        stacks: [], experience: [], tavern: [], bonuses: [], timedItems: [], spirits: { schemaVersion: 1, items: [] },
    };
    const receipt = {
        schemaVersion: 1, requestId, receiptId, roleId: actual.roleId, assetRevision: 2, actual,
        state: { schemaVersion: 1, firstNormalCompleted: true, normalFreeAtSeconds: 1234567890 },
    };
    const frame = { version: 1, kind: "response", name: Protocol.HERO_FIRST_SUMMON, id: "req", ok: true };
    const lookup = { ...frame, name: Protocol.HERO_FIRST_SUMMON_STATUS };
    const normal = { ...frame, name: Protocol.HERO_NORMAL_SUMMON };
    const request = { version: 1, kind: "request", name: Protocol.HERO_NORMAL_SUMMON, id: "req" };
    roundTrip({ ...request, body: { requestId } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { requestId, free: true } }));
    roundTrip({ ...normal, body: receipt });
    roundTrip({ ...frame, body: receipt });
    roundTrip({ ...lookup, body: { requestId, found: true, receipt } });
    roundTrip({ ...lookup, body: { requestId, found: false } });
    const Frame = (mxzg as any).game.Frame;
    for (const invalid of [
        { ...receipt, receiptId: "bad-id" },
        { ...receipt, assetRevision: 0 },
        { ...receipt, roleId: "role-B" },
        { ...receipt, state: { ...receipt.state, firstNormalCompleted: false } },
        { ...receipt, actual: { ...actual, heroes: [] } },
        { ...receipt, actual: { ...actual, items: [{ ...actual.items[0], credited: 2 }] } },
    ]) {
        assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(
            Frame.encode({ ...frame, heroFirstSummonReceipt: invalid }).finish()));
        assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(
            Frame.encode({ ...normal, heroFirstSummonReceipt: invalid }).finish()));
        assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(
            Frame.encode({ ...lookup, heroFirstSummonStatus: { requestId, found: true, receipt: invalid } }).finish()));
    }
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...lookup, body: { requestId: receiptId, found: true, receipt },
    }));
}

/** 六种抽取与积分兑换共用强类型协议，回包中重复模板各有真实实例。 */
function checkFullSummonWire(): void {
    const requestId = "10000000-1111-4111-8111-111111111111";
    const receiptId = "20000000-2222-4222-8222-222222222222";
    const request = { version: 1, kind: "request", name: Protocol.HERO_SUMMON, id: "summon" };
    const response = { ...request, kind: "response", ok: true };
    const summonState = { schemaVersion: 1, firstNormalCompleted: false, normalFreeAtSeconds: 0,
        advancedFreeAtSeconds: 1700000000, pointsExchangeAvailable: false, pointRechargeRequired: 200000,
        pointsCost: 1000, prayerEndsAtSeconds: 0 };
    roundTrip({ version: 1, kind: "event", name: Protocol.STATE_CHANGED, body: { ...state, heroSummon: summonState } });
    const Frame = (mxzg as any).game.Frame;
    for (const [pool, count] of [
        ["NORMAL", 1], ["NORMAL", 10], ["FRIENDSHIP", 1], ["FRIENDSHIP", 10],
        ["ADVANCED", 1], ["ADVANCED", 10], ["POINTS", 1],
    ] as const) {
        const body = { requestId, pool, count };
        const templateId = 10405001;
        const heroes = Array.from({ length: count }, (_, index) => ({
            instanceId: "30000000-3333-4333-8333-3333333333" + String(index).padStart(2, "0"),
            templateId, level: 1, star: 5, stage: 0,
        }));
        const actual = {
            roleId: state.role.id, heroes,
            items: [{ itemId: templateId, requested: count, credited: count, ignored: 0, reason: "NONE" }],
            wallet: { goldBefore: 0, goldAfter: 0, diamondsBefore: 0, diamondsAfter: 0 },
            stacks: [], experience: [], tavern: [], bonuses: [], timedItems: [],
            spirits: { schemaVersion: 1, items: [] },
        };
        const receipt = { ...body, schemaVersion: 1, receiptId, roleId: state.role.id, assetRevision: 3,
            state: summonState, actual };
        roundTrip({ ...request, body });
        roundTrip({ ...response, body: receipt });
        if (pool === "ADVANCED") {
            roundTrip({ ...request, body: { ...body, maxDiamonds: 198 } });
        }
        assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(Frame.encode({
            ...response, heroSummonReceipt: { ...receipt, actual: { ...actual, heroes: heroes.slice(1) } },
        }).finish()));
        assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(Frame.encode({
            ...response, heroSummonReceipt: { ...receipt, state: { ...summonState, advancedFreeAtSeconds: -1 } },
        }).finish()));
    }
    for (const invalid of [
        { requestId, pool: "PVP", count: 1 },
        { requestId, pool: "POINTS", count: 10 },
        { requestId, pool: "ADVANCED", count: 2 },
        { requestId, pool: "ADVANCED", count: 1, maxDiamonds: -1 },
        { requestId, pool: "NORMAL", count: 1, maxDiamonds: 220 },
        { requestId, pool: "NORMAL", count: 1, roleId: state.role.id },
    ]) {
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: invalid }));
    }
    roundTrip({ ...response, body: null, ok: false,
        error: { code: "SUMMON_DIAMOND_CONFIRM_REQUIRED", message: "需重新确认钻石消耗", retryable: false } });
}

/** 普通市场端到端载荷携带真实售罄和停售标记，拒绝越权字段、重复商品和非法计时。 */
function checkMarketWire(): void {
    const requestId = "10000000-1111-4111-8111-111111111111";
    const roleId = "20000000-2222-4222-8222-222222222222";
    const offer = { productId: 22, itemId: 900102, quantity: 250, costItemId: 900001,
        costQuantity: 1000, purchaseLimit: 2, purchased: 2, discount: 80, purchasable: false };
    const shelf = { shelfVersion: 9, offers: [offer], freeRefreshes: 5, freeRefreshLimit: 5,
        paidRefreshes: 0, paidRefreshLimit: 10, nextFreeRefreshAt: 0, nextPaidResetAt: 1700000000,
        refreshCostItemId: 900002, refreshCostQuantity: 50 };
    const buy = { requestId, shelfVersion: 9, productId: offer.productId, count: 1 };
    const refresh = { requestId, shelfVersion: 9 };
    const receipt = { requestId, roleId, assetRevision: 6, state: shelf };
    const request = { version: 1, kind: "request", id: "market" };
    const response = { ...request, kind: "response", ok: true };
    roundTrip({ ...request, name: Protocol.MARKET_LIST, body: {} });
    roundTrip({ ...response, name: Protocol.MARKET_LIST, body: shelf });
    roundTrip({ ...request, name: Protocol.MARKET_BUY, body: buy });
    roundTrip({ ...response, name: Protocol.MARKET_BUY, body: receipt });
    roundTrip({ ...request, name: Protocol.MARKET_REFRESH, body: refresh });
    roundTrip({ ...response, name: Protocol.MARKET_REFRESH, body: { ...receipt, assetRevision: 0 } });
    roundTrip({ ...response, name: Protocol.MARKET_BUY, ok: false, body: null,
        error: { code: "MARKET_SHELF_CHANGED", message: "货架已更新", retryable: false } });
    for (const body of [{ ...buy, costQuantity: 1 }, { ...buy, count: 0 }, { ...buy, shelfVersion: 0 }]) {
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, name: Protocol.MARKET_BUY, body }));
    }
    const Frame = (mxzg as any).game.Frame;
    for (const invalid of [
        { ...shelf, freeRefreshes: 6 },
        { ...shelf, nextFreeRefreshAt: 1700000000 },
        { ...shelf, offers: [offer, offer] },
        { ...shelf, offers: [{ ...offer, purchased: 3 }] },
    ]) {
        const wire = Frame.encode({ ...response, name: Protocol.MARKET_LIST, marketState: invalid }).finish();
        assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(wire));
    }
}

/** 五类日常副本按关卡交付独立次数和结算，战报必须对应正确类型。 */
function checkDailyDungeonWire(): void {
    const requestId = "10000000-1111-4111-8111-111111111111";
    const roleId = "20000000-2222-4222-8222-222222222222";
    const battleId = "30000000-3333-4333-8333-333333333333";
    const request = { version: 1, kind: "request", id: "dailyDungeon" };
    const response = { ...request, kind: "response", ok: true };
    const preview = [{ itemId: 900001, quantity: 100_000 }, { itemId: 900102, quantity: 20 }];
    const state = { stageId: 1, titleLanguageId: 1, wins: 0, freeLimit: 2, totalLimit: 4,
        nextCostDiamonds: 0, resetAtSeconds: 1700000000, power: 100, requiredPower: 1,
        // 空 repeated 不发送到线上，解码旧回执时仍返回空数组。
        cleared: false, unlocked: true, canChallenge: true, rewardPreview: preview, stages: [] };
    const replay = { schemaVersion: 1, scenario: "dungeon:gold:1", outcome: "ATTACKER_WIN", rounds: 1, units: [], phases: [] };
    const actual = { roleId, items: preview.map(row => ({
        itemId: row.itemId, requested: row.quantity, credited: row.quantity, ignored: 0, reason: "NONE",
    })), wallet: { goldBefore: 0, diamondsBefore: 80, goldAfter: 100_000, diamondsAfter: 80 },
    stacks: [], experience: [], tavern: [], bonuses: [], timedItems: [], spirits: { schemaVersion: 1, items: [] }, heroes: [] };
    const won = { requestId, roleId, assetRevision: 6, battleId, won: true, sweep: false, replay,
        state: { ...state, wins: 1, cleared: true }, actual };
    const lost = { ...won, won: false, assetRevision: 0, replay: { ...replay, outcome: "DEFENDER_WIN" }, state };
    delete (lost as Partial<typeof won>).actual;
    const swept = { ...won, sweep: true, state: { ...won.state, wins: 2, nextCostDiamonds: 50 } };
    delete (swept as Partial<typeof won>).replay;
    roundTrip({ ...request, name: Protocol.DAILY_DUNGEON_LIST, body: {} });
    roundTrip({ ...response, name: Protocol.DAILY_DUNGEON_LIST, body: state });
    for (const sweep of [false, true]) {
        roundTrip({ ...request, name: Protocol.DAILY_DUNGEON_CHALLENGE, body: { requestId, sweep, maxDiamonds: 0 } });
    }
    roundTrip({ ...request, name: Protocol.DAILY_DUNGEON_CHALLENGE,
        body: { requestId, stageId: 2, sweep: false, maxDiamonds: 0 } });
    for (const body of [won, lost, swept]) {
        roundTrip({ ...response, name: Protocol.DAILY_DUNGEON_CHALLENGE, body });
    }
    const stageOne = { stageId: 1, titleLanguageId: 1, minimumLevel: 15, ribbon: 1, requiredPower: 1,
        cleared: true, unlocked: true, canChallenge: true, rewardPreview: preview };
    const stageTwo = { stageId: 2, titleLanguageId: 2, minimumLevel: 15, ribbon: 2, requiredPower: 30_000,
        cleared: false, unlocked: true, canChallenge: true,
        rewardPreview: [{ itemId: 900001, quantity: 150_000 }, { itemId: 900102, quantity: 30 }] };
    const list = { ...state, power: 31_000, cleared: true, wins: 1, stages: [stageOne, stageTwo] };
    roundTrip({ ...response, name: Protocol.DAILY_DUNGEON_LIST, body: list });
    const second = { ...list, stageId: 2, titleLanguageId: 2, requiredPower: 30_000, wins: 2, nextCostDiamonds: 50,
        rewardPreview: stageTwo.rewardPreview, stages: [stageOne, { ...stageTwo, cleared: true }] };
    const secondResult = { ...won, replay: { ...replay, scenario: "dungeon:gold:2" }, state: second };
    roundTrip({ ...response, name: Protocol.DAILY_DUNGEON_CHALLENGE, body: secondResult });
    const experienceRewards = [{ itemId: 900101, quantity: 60_000 }];
    const experience = { ...state, rewardPreview: experienceRewards,
        stages: [{ ...stageOne, minimumLevel: 17, cleared: false, rewardPreview: experienceRewards }] };
    roundTrip({ ...request, name: Protocol.EXPERIENCE_DUNGEON_LIST, body: {} });
    roundTrip({ ...response, name: Protocol.EXPERIENCE_DUNGEON_LIST, body: experience });
    roundTrip({ ...request, name: Protocol.EXPERIENCE_DUNGEON_CHALLENGE,
        body: { requestId, stageId: 1, sweep: false, maxDiamonds: 0 } });
    const experienceResult = { ...won,
        replay: { ...replay, scenario: "dungeon:experience:1" },
        state: { ...experience, cleared: true, wins: 1, stages: [{ ...experience.stages[0], cleared: true }] },
        actual: { ...actual, items: [{ itemId: 900101, requested: 60_000, credited: 60_000, ignored: 0, reason: "NONE" }],
            wallet: { ...actual.wallet, goldAfter: 0 } },
    };
    roundTrip({ ...response, name: Protocol.EXPERIENCE_DUNGEON_CHALLENGE, body: experienceResult });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...response, name: Protocol.EXPERIENCE_DUNGEON_CHALLENGE, body: { ...experienceResult, replay },
    }), /战报与结算/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...response, name: Protocol.DAILY_DUNGEON_CHALLENGE, body: experienceResult,
    }), /战报与结算/);
    for (const [kind, list, challenge, level, itemId, quantity] of [
        ["hero", Protocol.HERO_DUNGEON_LIST, Protocol.HERO_DUNGEON_CHALLENGE, 18, 20_003_000, 10],
        ["fetter", Protocol.FETTER_DUNGEON_LIST, Protocol.FETTER_DUNGEON_CHALLENGE, 22, 901501, 4],
        ["spirit", Protocol.SPIRIT_DUNGEON_LIST, Protocol.SPIRIT_DUNGEON_CHALLENGE, 60, 901401, 60],
    ] as const) {
        const rewardPreview = [{ itemId, quantity }];
        const snapshot = { ...state, rewardPreview,
            stages: [{ ...stageOne, minimumLevel: level, cleared: false, rewardPreview }] };
        const receipt = { ...experienceResult, replay: { ...replay, scenario: `dungeon:${kind}:1` },
            state: { ...snapshot, wins: 1, cleared: true, stages: [{ ...snapshot.stages[0], cleared: true }] },
            actual: { ...experienceResult.actual,
                items: [{ itemId, requested: quantity, credited: quantity, ignored: 0, reason: "NONE" }] } };
        roundTrip({ ...request, name: list, body: {} });
        roundTrip({ ...response, name: list, body: snapshot });
        roundTrip({ ...request, name: challenge, body: { requestId, stageId: 1, sweep: false, maxDiamonds: 0 } });
        roundTrip({ ...response, name: challenge, body: receipt });
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
            ...response, name: challenge, body: { ...receipt, replay },
        }), /战报与结算/);
    }
    for (const body of [
        { requestId, sweep: false, maxDiamonds: 0, roleId },
        { requestId, sweep: true, maxDiamonds: -1 },
        { requestId, maxDiamonds: 0 },
        { requestId, stageId: 0, sweep: false, maxDiamonds: 0 },
        { requestId, stageId: 0x80000000, sweep: false, maxDiamonds: 0 },
    ]) {
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, name: Protocol.DAILY_DUNGEON_CHALLENGE, body }));
    }
    const Frame = (mxzg as any).game.Frame;
    for (const body of [
        { ...won, won: false }, { ...won, sweep: true },
        { ...won, replay: { ...replay, outcome: "DEFENDER_WIN" } },
        { ...won, replay: { ...replay, scenario: "audit:lineup:1" } },
        { ...won, actual: { ...actual, roleId: battleId } },
        { ...won, state: { ...state, wins: state.totalLimit + 1 } },
        { ...secondResult, replay },
        { ...secondResult, state: { ...second, stages: [] } },
        { ...secondResult, state: { ...second, stages: [stageOne, stageOne] } },
        { ...secondResult, state: { ...second, stages: [{ ...stageOne, cleared: false }, second.stages[1]] } },
        { ...secondResult, state: { ...second, rewardPreview: preview } },
    ]) {
        const wire = Frame.encode({ ...response, name: Protocol.DAILY_DUNGEON_CHALLENGE, dailyDungeonReceipt: body }).finish();
        assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(wire));
    }
}

/** 验证爬塔与竞技场的业务请求；支持逐份解码 Java 实战的冻结战报。 */
function checkProgressionBattleWire(): void {
    const requestId = "10000000-1111-4111-8111-111111111111";
    const request = { version: 1, kind: "request", id: requestId };
    roundTrip({ ...request, name: Protocol.TOWER_STATE, body: {} });
    roundTrip({ ...request, name: Protocol.TOWER_FORMATION_SAVE, body: {
        expectedVersion: 0, formationId: 1, slots: [{ position: 2, heroId: requestId }],
    } });
    roundTrip({ ...request, name: Protocol.TOWER_CHALLENGE, body: { requestId, floor: 1 } });
    roundTrip({ ...request, name: Protocol.TOWER_SWEEP, body: { requestId, floor: 1, maxDiamonds: 0 } });
    roundTrip({ ...request, name: Protocol.TOWER_MILESTONE_CLAIM, body: { requestId, milestoneId: 1 } });
    roundTrip({ ...request, name: Protocol.ARENA_STATE, body: {} });
    roundTrip({ ...request, name: Protocol.ARENA_REFRESH, body: {} });
    roundTrip({ ...request, name: Protocol.ARENA_CHALLENGE, body: { requestId, opponentId: 1 } });
    roundTrip({ ...request, name: Protocol.ARENA_REPLAY, body: { battleId: requestId } });
    roundTrip({ ...request, name: Protocol.ARENA_TICKET_BUY, body: { requestId, quantity: 1 } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...request, name: Protocol.TOWER_CHALLENGE, body: { requestId, floor: 1, milestoneId: 1 },
    }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...request, name: Protocol.TOWER_SWEEP, body: { requestId, floor: 1, maxDiamonds: -1 },
    }));
    if (!process.argv.includes("--progression-battle-java")) {
        return;
    }
    const names = Array.from({ length: 10 }, (_, index) => "tower-" + (index + 1));
    names.push("arena-loss", "arena-win-2", "arena-win-3");
    for (const name of names) {
        const bytes = readFileSync("backend/target/chapter-vip-" + name + ".pb");
        const frame = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(bytes));
        const replay = (frame.body as { replay: object }).replay;
        const parsed = BattleReplayUtils.parse(BattleReplayUtils.encodeVerified(replay));
        assert(parsed.steps.length > 0);
        assert.equal(parsed.maxRounds, name.startsWith("tower") ? 15 : 20);
    }
    console.log("PASS Java/TS Fantasy Tower and Arena settlements and replay parsing");
}

/** 四种装备操作保留字符串实例和来源配置，回执版本与实际变更状态自洽。 */
function checkEquipmentWire(): void {
    const heroId = "20000000-2222-4222-8222-222222222222";
    const requestId = "10000000-1111-4111-8111-111111111111";
    const equipmentId = "9223372036854775807";
    const request = { version: 1, kind: "request", name: Protocol.HERO_EQUIPMENT_CHANGE, id: "equipment" };
    const response = { ...request, kind: "response", ok: true };
    const unchanged = { roleId: state.role.id, changed: false, assetRevision: 0 };
    const changed = { ...unchanged, changed: true, assetRevision: 4 };
    const equip = { requestId, heroId, action: "EQUIP", equipmentId: "stack:" + heroId + ":1001001" };
    const unequip = { requestId, heroId, action: "UNEQUIP", equipmentId, slot: 1, expectedTemplateId: 1001001 };
    const equipAll = { requestId, heroId, action: "EQUIP_ALL" };
    const unequipAll = { ...equipAll, action: "UNEQUIP_ALL" };
    for (const body of [equip, unequip, equipAll, unequipAll]) {
        roundTrip({ ...request, body });
        roundTrip({ ...response, body: { ...body, ...changed } });
    }
    roundTrip({ ...response, body: { ...unequipAll, slot: 0, expectedTemplateId: 0, ...unchanged } });
    roundTrip({ ...response, ok: false, body: null,
        error: { code: "HERO_EQUIPMENT_CHANGED", message: "装备已变化", retryable: false } });
    for (const body of [
        { ...equip, equipmentId: 9223372036854776 },
        { ...equip, heroId: "hero-A" },
        { ...equip, roleId: state.role.id },
        { ...equip, slot: 0 },
        { ...equipAll, equipmentId },
        { ...unequipAll, expectedTemplateId: 0 },
        { ...unequip, equipmentId: " " },
        { ...unequip, slot: 5 },
        { ...unequip, expectedTemplateId: 0 },
        { ...unequip, expectedTemplateId: undefined },
        { ...unequip, action: "REPLACE" },
    ]) {
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body }));
    }
    const Frame = (mxzg as any).game.Frame;
    assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(
        Frame.encode({ ...response, heroEquipmentChangeRequest: equip }).finish()));
    for (const invalid of [
        { ...unequip, ...changed, assetRevision: 0 },
        { ...unequip, ...changed, roleId: "" },
        { ...unequip, ...changed, expectedTemplateId: 0 },
        { ...equipAll, ...changed, slot: 1 },
    ]) {
        assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(
            Frame.encode({ ...response, heroEquipmentChangeReceipt: invalid }).finish()));
    }
    const hero = { id: heroId, templateId: 1, level: 1, star: 1,
        equipment: { items: [{ instanceId: equipmentId, templateId: 1001001, slot: 1, soulLevel: 0 }] },
        panelStats: { values: { hp: 100, atk: 20, def: 8, spd: 12 },
            includedSources: ["GROWTH", "EQUIPMENT"], pendingSources: [], complete: false, power: 148 } };
    roundTrip({ version: 1, kind: "event", name: Protocol.STATE_CHANGED, body: { ...state, heroes: [hero] } });
}

/** 主线追加的实际明细复用原协议类型；旧回执缺扩展保持缺失，历史钱包只用于核对不提交资产。 */
function checkChapterRewardWire(): void {
    const actual = {
        roleId: "chapter-role",
        items: [{ itemId: 900003, requested: 60, credited: 60, ignored: 0, reason: "NONE" }],
        wallet: { goldBefore: 100, goldAfter: 100, diamondsBefore: 10, diamondsAfter: 20 },
        stacks: [],
        experience: [{ beforeLevel: 1, beforeExperience: 119, requested: 60, accepted: 60,
            ignored: 0, level: 2, experience: 59, diamonds: 10 }],
        tavern: [],
        bonuses: [{ source: "ROLE_LEVEL_UP", itemId: 900002, quantity: 10 }],
        timedItems: [],
        spirits: { schemaVersion: 1, items: [] },
        heroes: [],
    };
    const receipt = { action: "SETTLED", battleId: "11223344-1122-4122-8122-112233441122",
        state: { maxCleared: 1, assetRevision: 5 }, rewards: [{ itemId: 900003, quantity: 60 }],
        experience: { beforeLevel: 1, beforeExp: 119, beforeThreshold: 120,
            afterLevel: 2, afterExp: 59, afterThreshold: 360 }, actual };
    const frame = { version: 1, kind: "response", name: Protocol.CHAPTER_CLAIM,
        id: "chapter-reward", ok: true, body: receipt };
    roundTrip(frame);
    const { actual: _actual, ...legacy } = receipt;
    roundTrip({ ...frame, body: legacy });
    const { buildSync } = createRequire(process.cwd() + "/client/package.json")("esbuild");
    const source = buildSync({ entryPoints: ["client/assets/scripts/platform/GameProtocolCodecUtils.ts"],
        bundle: true, platform: "browser", format: "iife", globalName: "ChapterCodec", write: false,
        target: "es2017" }).outputFiles[0].text;
    const sandbox: any = {};
    runInNewContext(source, sandbox);
    const codec = sandbox.ChapterCodec.GameProtocolCodecUtils;
    const restored = codec.decodeGameFrame(codec.encodeGameFrame(frame));
    assert.equal(restored.body.actual.bonuses[0].quantity, 10);
    assert.equal(restored.body.actual.experience[0].beforeExperience, 119);
    assert.equal(restored.body.rewards.some((row: any) => row.itemId === 900002), false,
        "升级赠钻不混进原首通基础奖励");
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...frame,
        body: { ...receipt, actual: { ...actual, bonuses: [{ source: "ROLE_LEVEL_UP", itemId: 900002,
            quantity: Number.MAX_SAFE_INTEGER + 1 }] } } }));
    const wire = process.argv.find(value => value.startsWith("--chapter-reward-java="))?.slice(22);
    if (wire) {
        const javaFrame = GameProtocolCodecUtils.decodeGameFrame(readFileSync(wire));
        const body = javaFrame.body as any;
        assert.equal(javaFrame.name, Protocol.CHAPTER_CLAIM);
        assert.equal(body.action, "SETTLED");
        assert(body.actual.bonuses.some((row: any) => row.source === "ROLE_LEVEL_UP"
            && row.itemId === 900002 && row.quantity > 0));
        assert(!body.rewards.some((row: any) => row.itemId === 900002));
        console.log("PASS Java/TS actual chapter reward frame");
    }
    console.log("PASS chapter actual rewards, separate level bonuses, legacy absence and browser codec");
}

/** 对照独立Java测试收到的实际WS二进制，核对事件/重连实例身份和属性均不变。 */
function checkSpiritWire(): void {
    const event = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync("backend/target/spirit-event.pb")));
    const restored = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync("backend/target/spirit-restored.pb")));
    const current = event.body as any;
    const initial = (restored.body as any).initial;
    assert.equal(event.name, Protocol.STATE_CHANGED);
    assert.equal(restored.name, Protocol.SESSION_AUTHENTICATE);
    assert.equal((restored.body as any).session, undefined, "跨语言夹具不得携带凭证");
    assert.deepEqual(initial.spiritInventory, current.spiritInventory);
    assert.equal(initial.revision, current.revision);
    assert.equal(current.spiritInventory.schemaVersion, 1);
    const items = current.spiritInventory.items;
    assert.equal(items.length, 2);
    assert.equal(new Set(items.map((item: any) => item.instanceId)).size, 2);
    for (const item of items) {
        assert.equal(item.itemId, 2000002);
        assert.equal(typeof item.instanceId, "string");
        assert(item.abilityId > 0);
        assert.equal(item.skills.length, 1);
        assert(item.skills[0].skillId > 0);
    }
    assert(!current.inventory.some((item: any) => item.itemId === 2000002));
    console.log("PASS Java/TS SpiritInventory binary event/reconnect identity and attributes");
}
main();
