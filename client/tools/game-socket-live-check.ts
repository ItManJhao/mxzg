/** 真实 TS→Java 联调，在独立测试后端验证登录、日常玩法和实际资产同步。 */
import {strict as assert} from "node:assert";
import {randomUUID} from "node:crypto";
import { ServerClock } from "../assets/scripts/core/ServerClock";
import {GameSocketClient} from "../assets/scripts/platform/GameSocketClient";
import { GAME_SOCKET_PROTOCOL } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol, type ChapterProtocol, type ProtocolName } from "../assets/scripts/platform/Protocol";
import { ProtocolStateUtils } from "../assets/scripts/platform/ProtocolStateUtils";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import {AccountModel} from "../assets/scripts/features/account/AccountModel";
import {AccountController} from "../assets/scripts/features/account/AccountController";
import {RoleController} from "../assets/scripts/features/account/RoleController";
import {BagController} from "../assets/scripts/features/bag/BagController";
import {BagModel} from "../assets/scripts/features/bag/BagModel";
import { BagItemDataUtils } from "../assets/scripts/features/bag/data/BagItemDataUtils";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import type { DailyDungeonState } from "../assets/scripts/features/dungeon/DailyDungeonModel";
import {AssetStateBinding} from "../assets/scripts/app/remake/AssetStateBinding";
import type { HeroLevelReceipt } from "../assets/scripts/features/hero/data/HeroLevelData";
import type { RewardNotice } from "../assets/scripts/features/reward/data/RewardNoticeData";
/** 等待真实连接状态，超时明确失败。 */
async function until(check:()=>boolean):Promise<void>{for(let i=0;i<300;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}assert.fail("真实客户端状态超时");}
/** 装配真实模块，只有网络适配为 Node 原生 WebSocket。 */
function fixture(port:string){
 const account=new AccountModel(),model=new BagModel(),bag=new BagController(model),wires:WebSocket[]=[];
 const clock = new ServerClock();
 const socket=new GameSocketClient("ws://127.0.0.1:"+port+"/api/v1/game/socket",{
  clock, heartbeatMs: 150,
  create:url=>{const wire=new WebSocket(url,GAME_SOCKET_PROTOCOL);wires.push(wire);return wire;},retryDelay:()=>20,
  validateSnapshot:value=>{const row=value as any;AccountApi.readRole(row.role);BagItemDataUtils.readBagItems(row.inventory);assert(Number.isSafeInteger(row.revision));},
 });
 const service=new AccountController(account,new AccountApi(socket),{read:()=>null,write:()=>{},clear:()=>{}});
 bag.initialize();const role=new RoleController(account),assets=new AssetStateBinding(account,bag,role);
 service.onInitialized=frame=>assets.apply(frame);socket.onState=frame=>assets.apply(frame);
 socket.onReady=()=>{if(account.snapshot.role && socket.latestState)assets.apply(socket.latestState);};
 socket.onRejected=(token,message)=>service.rejectSession(token,message);
 const operations = new AccountOperations(service, socket);
 return {service,account,model,socket,wires,operations,clock,stop:()=>{socket.onReady=socket.onState=socket.onReward=socket.onRejected=null;socket.disconnect();assets.dispose();bag.dispose();}};
}

/** 登录首包、实际心跳和后台重新鉴权沿同一条连接管理逻辑为公共时钟校准。 */
async function checkServerClock(client: ReturnType<typeof fixture>): Promise<void> {
    const { socket, clock, wires } = client;
    const login = socket.latestState!;
    assert.equal(login.name, Protocol.SESSION_LOGIN);
    const loginBody = login.body as { serverTimeMs: number };
    const now = clock.nowSeconds();
    assert(now !== null && now >= Math.floor(loginBody.serverTimeMs / 1000), "登录首包应完成授时");
    const state = ProtocolStateUtils.statePayload(Protocol.SESSION_LOGIN, loginBody);
    const idle = state.mainChapterIdle as { startedAt: number; rewardStage: number };
    assert.equal(idle.rewardStage, 0);
    assert(now >= idle.startedAt + 60, "首胜前的挂机起点可用公共时钟计算");

    // 清除本地样本来单独验证实际心跳回包，不以等待一秒替代心跳断言。
    clock.invalidate();
    await until(() => clock.nowSeconds() !== null);
    assert(clock.nowSeconds()! >= now, "实际心跳回包应重新校准时钟");

    const count = wires.length;
    socket.setBackground(true);
    assert.equal(clock.nowSeconds(), null, "进入后台应使原时间样本失效");
    socket.setBackground(false);
    await until(() => wires.length > count && socket.latestState?.name === Protocol.SESSION_AUTHENTICATE
        && clock.nowSeconds() !== null);
    const accepted = socket.latestState!.body as { serverTimeMs: number };
    assert(clock.nowSeconds()! >= Math.floor(accepted.serverTimeMs / 1000), "新鉴权首包应校准公共时钟");
}
/** 用普通单抽完成首次发放，核对免费冷却、原回执和显式重登后的持久快照版本。 */
async function checkFirstSummon(client: ReturnType<typeof fixture>): Promise<void> {
    const account = "summon_" + randomUUID().slice(0, 12);
    const readState = () => {
        const frame = client.socket.latestState;
        assert(frame);
        return ProtocolStateUtils.statePayload(frame.name as ProtocolName, frame.body);
    };
    const request = (
        name: typeof Protocol.HERO_NORMAL_SUMMON | typeof Protocol.HERO_FIRST_SUMMON | typeof Protocol.HERO_FIRST_SUMMON_STATUS,
        requestId: string,
    ) => client.operations.request(name, { requestId });

    assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    const initial = readState();
    assert.deepEqual(initial.heroes, []);
    const initialSummon = initial.heroSummon as { schemaVersion: number; firstNormalCompleted: boolean; normalFreeAtSeconds: number };
    assert.equal(initialSummon.schemaVersion, 1);
    assert.equal(initialSummon.firstNormalCompleted, false);
    assert.equal(initialSummon.normalFreeAtSeconds, 0);
    const requestId = randomUUID();
    const receipt = (await request(Protocol.HERO_NORMAL_SUMMON, requestId)).body as Record<string, unknown>;
    assert.equal(receipt.requestId, requestId);
    assert.equal(receipt.roleId, client.account.snapshot.role!.id);
    await until(() => readState().revision === receipt.assetRevision);
    const committed = readState();
    assert.deepEqual(committed.heroSummon, receipt.state);
    const heroes = committed.heroes as { templateId: number; star: number; level: number }[];
    assert.equal(heroes.length, 1);
    assert.equal(heroes[0].templateId, 10304012);
    assert.equal(heroes[0].star, 4);
    assert.equal(heroes[0].level, 1);
    assert.equal(client.model.items.find(item => item.itemId === 900302)?.quantity, 1);
    assert.equal(client.model.items.some(item => item.itemId === 900201), false);
    assert.deepEqual((await request(Protocol.HERO_NORMAL_SUMMON, requestId)).body, receipt);
    assert.deepEqual((await request(Protocol.HERO_FIRST_SUMMON, requestId)).body, receipt);
    await assert.rejects(request(Protocol.HERO_NORMAL_SUMMON, randomUUID()), { code: "SUMMON_TICKET_INSUFFICIENT" });

    const lastLoginBefore = client.account.snapshot.role!.basics!.lastLoginAtSeconds;
    client.service.logout();
    assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    const relogged = readState();
    const lastLoginAfter = client.account.snapshot.role!.basics!.lastLoginAtSeconds;
    assert(lastLoginAfter >= lastLoginBefore, "显式重登的最后登录时间不能倒退");
    // 只有登录时间跨秒更新才额外提交一次角色版本，首抽回执仍保留原版本。
    assert.equal(relogged.revision, committed.revision + Number(lastLoginAfter > lastLoginBefore));
    assert.deepEqual(relogged.heroes, committed.heroes);
    assert.deepEqual(relogged.heroSummon, committed.heroSummon);
    assert.deepEqual(relogged.inventory, committed.inventory);
    assert.deepEqual((await request(Protocol.HERO_FIRST_SUMMON_STATUS, requestId)).body,
        { requestId, found: true, receipt });
    const unknownId = randomUUID();
    assert.deepEqual((await request(Protocol.HERO_FIRST_SUMMON_STATUS, unknownId)).body,
        { requestId: unknownId, found: false });
    assert.equal(readState().revision, relogged.revision, "查询原回执和不存在的回执都不写入角色状态");
    await checkAfterFirstBattle(client, readState, account);
}

/** 使用刚出新手礼包的独立角色检验高级免费、钻石授权上限、冻结回执和积分门槛。 */
async function checkExpandedSummon(client: ReturnType<typeof fixture>): Promise<void> {
    const readState = () => {
        const frame = client.socket.latestState;
        assert(frame);
        return ProtocolStateUtils.statePayload(frame.name as ProtocolName, frame.body);
    };
    const role = () => client.account.snapshot.role!;
    const summon = (requestId: string, pool: string, count: 1 | 10, maxDiamonds?: number) =>
        client.operations.request(Protocol.HERO_SUMMON, {
            requestId, pool, count, ...(maxDiamonds === undefined ? {} : { maxDiamonds }),
        });
    const initial = readState().heroSummon as { advancedFreeAtSeconds: number; pointsExchangeAvailable: boolean };
    assert.equal(initial.advancedFreeAtSeconds, 0);
    assert.equal(initial.pointsExchangeAvailable, false);
    const balance = role().diamonds;
    const free = (await summon(randomUUID(), "ADVANCED", 1)).body as {
        assetRevision: number;
        actual: { heroes: { templateId: number }[] };
    };
    await until(() => readState().revision === free.assetRevision);
    assert.deepEqual(free.actual.heroes.map(hero => hero.templateId), [10205020]);
    assert.equal(role().diamonds, balance);
    assert((readState().heroSummon as { advancedFreeAtSeconds: number }).advancedFreeAtSeconds > 0);

    const requestId = randomUUID();
    await assert.rejects(summon(requestId, "ADVANCED", 1), { code: "SUMMON_DIAMOND_CONFIRM_REQUIRED" });
    assert.equal(readState().revision, free.assetRevision);
    assert.equal(role().diamonds, balance);
    const paid = (await summon(requestId, "ADVANCED", 1, 220)).body as { assetRevision: number };
    await until(() => readState().revision === paid.assetRevision);
    assert.equal(role().diamonds, balance - 220);
    assert.deepEqual((await summon(requestId, "ADVANCED", 1, 220)).body, paid);
    await assert.rejects(summon(requestId, "ADVANCED", 1, 221), { code: "SUMMON_REQUEST_CONFLICT" });
    assert.equal(role().diamonds, balance - 220);
}

/** 从实际首抽结果出阵，验证装备、合成、升级扣费及冷重登原回执。 */
async function checkAfterFirstBattle(client: ReturnType<typeof fixture>, readState: () => Record<string, unknown>,
    account: string): Promise<void> {
    const formation = readState().mainFormation as { version: number; formationId: number };
    const [hero] = readState().heroes as { id: string }[];
    const chapter = (name: ChapterProtocol, input: unknown) =>
        client.service.authenticated(token => client.socket.requestFrame(token, name, input));
    const fragment = (name: typeof Protocol.HERO_FRAGMENT_COMBINE | typeof Protocol.HERO_FRAGMENT_COMBINE_STATUS, input: unknown) =>
        client.operations.request(name, input);
    const upgrade = (name: typeof Protocol.HERO_LEVEL_UPGRADE | typeof Protocol.HERO_LEVEL_UPGRADE_STATUS, input: unknown) =>
        client.operations.request(name, input);
    const quantity = (itemId: number) => client.model.items.find(item => item.itemId === itemId)?.quantity ?? 0;

    await assert.rejects(chapter(Protocol.CHAPTER_FIRST_REWARD_CLAIM, { chapter: 1 }), { code: "FIRST_REWARD_NOT_REACHED" });
    await client.service.authenticated(token => client.socket.requestFrame(token, Protocol.FORMATION_SAVE, {
        requestId: randomUUID(), expectedVersion: formation.version, formationId: formation.formationId,
        slots: [{ position: 2, heroId: hero.id }],
    }));
    const fight = (await chapter(Protocol.CHAPTER_CHALLENGE, { requestId: randomUUID() })).body as { battleId: string };
    await chapter(Protocol.CHAPTER_CLAIM, { battleId: fight.battleId });
    await until(() => quantity(20204004) === 30);

    const first = (await chapter(Protocol.CHAPTER_FIRST_REWARD_CLAIM, { chapter: 1 })).body as { assetRevision: number };
    await until(() => Number(readState().revision) >= first.assetRevision);
    assert(quantity(1001001) === 1 && quantity(1002001) === 1);
    assert.equal(quantity(20204004), 30);
    assert.deepEqual((await chapter(Protocol.CHAPTER_FIRST_REWARD_CLAIM, { chapter: 1 })).body, first);
    const requestId = randomUUID();
    const input = { requestId, itemId: 20204004, quantity: 1 };
    const combined = (await fragment(Protocol.HERO_FRAGMENT_COMBINE, input)).body as { assetRevision: number; costQuantity: number };
    assert.equal(combined.costQuantity, 30);
    await until(() => Number(readState().revision) >= combined.assetRevision);
    assert.equal(quantity(20204004), 0);
    const heroes = readState().heroes as { templateId: number }[];
    assert(heroes.some(entry => entry.templateId === 10204004));
    assert.equal(heroes.length, 2);
    assert.deepEqual((await fragment(Protocol.HERO_FRAGMENT_COMBINE, input)).body, combined);

    const upgradeInput = { requestId: randomUUID(), heroId: hero.id, expectedLevel: 1, levels: 5 };
    assert.equal(client.account.snapshot.role!.gold, 4000);
    assert.equal(quantity(900101), 500);
    const upgraded = (await upgrade(Protocol.HERO_LEVEL_UPGRADE, upgradeInput)).body as HeroLevelReceipt;
    assert.equal(upgraded.fromLevel, 1);
    assert.equal(upgraded.toLevel, 6);
    assert.equal(upgraded.roleId, client.account.snapshot.role!.id);
    await until(() => Number(readState().revision) >= upgraded.assetRevision);
    assert.equal(client.account.snapshot.role!.gold, 3590);
    assert.equal(quantity(900101), 395);
    assert.equal((readState().heroes as { id: string; level: number }[]).find(row => row.id === hero.id)?.level, 6);
    assert.deepEqual((await upgrade(Protocol.HERO_LEVEL_UPGRADE, upgradeInput)).body, upgraded);
    await assert.rejects(upgrade(Protocol.HERO_LEVEL_UPGRADE, { ...upgradeInput, levels: 4 }),
        { code: "IDEMPOTENCY_CONFLICT" });

    client.service.logout();
    assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    assert.deepEqual((await chapter(Protocol.CHAPTER_FIRST_REWARD_STATUS, { chapter: 1 })).body,
        { chapter: 1, found: true, receipt: first });
    assert.deepEqual((await fragment(Protocol.HERO_FRAGMENT_COMBINE_STATUS, { requestId })).body,
        { requestId, found: true, receipt: combined });
    assert.deepEqual((await upgrade(Protocol.HERO_LEVEL_UPGRADE_STATUS, { requestId: upgradeInput.requestId })).body,
        { requestId: upgradeInput.requestId, found: true, receipt: upgraded });
    assert.equal(client.account.snapshot.role!.gold, 3590);
    assert.equal(quantity(900101), 395);
    assert.equal(quantity(20204004), 0);
    assert(quantity(1001001) === 1 && quantity(1002001) === 1);
    assert.equal((readState().heroes as unknown[]).length, 2);
    await checkEquipment(client, readState, hero.id, account);
}

/** 真实首战装备支持逐件与批量穿脱，推送和重登入包返回权威槽位、属性及原请求回执。 */
async function checkEquipment(client: ReturnType<typeof fixture>, readState: () => Record<string, unknown>,
    heroId: string, account: string): Promise<void> {
    type WornEquipment = { instanceId: string; templateId: number; slot: number };
    const readHero = () => (readState().heroes as {
        id: string; equipment: { items: WornEquipment[] }; panelStats: { power: number };
    }[]).find(row => row.id === heroId)!;
    const quantity = (itemId: number) => client.model.items.find(item => item.itemId === itemId)?.quantity ?? 0;
    const change = (body: { requestId: string; action: string; equipmentId?: string; slot?: number;
        expectedTemplateId?: number }) => client.operations.request(Protocol.HERO_EQUIPMENT_CHANGE, { ...body, heroId });
    const sync = async (frame: Awaited<ReturnType<typeof change>>) => {
        const receipt = frame.body as { changed: boolean; assetRevision: number; heroId: string; roleId: string };
        assert.equal(receipt.heroId, heroId);
        assert.equal(receipt.roleId, client.account.snapshot.role!.id);
        assert.equal(receipt.changed, true);
        await until(() => Number(readState().revision) >= receipt.assetRevision);
        return receipt;
    };

    const initialPower = readHero().panelStats.power;
    const initialInventory = new Map(client.model.items.map(item => [item.itemId, item.quantity]));
    const sword = client.model.items.find(row => row.itemId === 1001001)!;
    assert.equal(typeof sword.instanceId, "string");
    const equip = { requestId: randomUUID(), action: "EQUIP", equipmentId: sword.instanceId };
    const equipped = await sync(await change(equip));
    assert.equal(quantity(1001001), 0);
    assert.equal(readHero().equipment.items[0]?.templateId, 1001001);
    assert(readHero().panelStats.power > initialPower, "穿戴后须刷新服务端个人战力");
    assert.deepEqual((await change(equip)).body, equipped);
    await assert.rejects(change({ requestId: equip.requestId, action: "EQUIP_ALL" }),
        { code: "IDEMPOTENCY_CONFLICT" });

    await sync(await change({ requestId: randomUUID(), action: "EQUIP_ALL" }));
    assert.equal(quantity(1002001), 0);
    const equippedBatch = readHero().equipment.items;
    assert(equippedBatch.some(item => item.slot === 2 && item.templateId === 1002001));
    for (const item of equippedBatch) {
        assert.equal(quantity(item.templateId), initialInventory.get(item.templateId)! - 1);
    }

    client.service.logout();
    assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    assert.deepEqual(readHero().equipment.items, equippedBatch);
    const [weapon] = readHero().equipment.items;
    assert(weapon && typeof weapon.instanceId === "string");
    const takeOff = { requestId: randomUUID(), action: "UNEQUIP", equipmentId: weapon.instanceId, slot: weapon.slot };
    await assert.rejects(change({ ...takeOff, expectedTemplateId: weapon.templateId + 1 }), { code: "HERO_EQUIPMENT_CHANGED" });
    const tookOff = await sync(await change({ ...takeOff, expectedTemplateId: weapon.templateId }));
    assert.equal(quantity(weapon.templateId), initialInventory.get(weapon.templateId));
    assert.deepEqual(readHero().equipment.items, equippedBatch.slice(1));
    assert.deepEqual((await change({ ...takeOff, expectedTemplateId: weapon.templateId })).body, tookOff);

    await sync(await change({ requestId: randomUUID(), action: "UNEQUIP_ALL" }));
    for (const item of equippedBatch) {
        assert.equal(quantity(item.templateId), initialInventory.get(item.templateId));
    }
    assert.deepEqual(readHero().equipment.items, []);
    assert.equal(readHero().panelStats.power, initialPower);
    const settledRevision = readState().revision;
    const unchanged = await change({ requestId: randomUUID(), action: "UNEQUIP_ALL" });
    assert.equal((unchanged.body as { changed: boolean }).changed, false);
    assert.equal((unchanged.body as { assetRevision: number }).assetRevision, settledRevision);
}

/** 验证随机候选无副作用、首次命名的权威快照、重试及同服重名。 */
async function checkRoleNaming(client: ReturnType<typeof fixture>): Promise<void> {
    const login = async (account: string) => {
        client.service.logout();
        assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    };
    const role = () => client.account.snapshot.role as { nickname: string; firstNamed?: boolean };
    const state = () => {
        const frame = client.socket.latestState!;
        return ProtocolStateUtils.statePayload(frame.name as ProtocolName, frame.body);
    };
    const setName = (nickname: string) => client.operations.request(Protocol.ROLE_NAME_SET, { nickname });

    const account = "naming_" + randomUUID().slice(0, 12);
    await login(account);
    assert.equal(role().firstNamed, false);
    const original = role().nickname;
    const initialRevision = Number(state().revision);
    const suggestion = await client.operations.request(Protocol.ROLE_NAME_RANDOM, {});
    const { nickname } = suggestion.body as { nickname: string };
    assert(nickname.length > 0);
    assert.equal(role().nickname, original);
    assert.equal(state().revision, initialRevision);
    await assert.rejects(setName(""), { code: "ROLE_NAME_INVALID" });
    assert.deepEqual((await setName(nickname)).body, {});
    await until(() => role().firstNamed === true && role().nickname === nickname);
    const namedRevision = Number(state().revision);
    assert(namedRevision > initialRevision);
    assert.deepEqual((await setName(nickname)).body, {});
    assert.equal(state().revision, namedRevision);

    await login("naming_" + randomUUID().slice(0, 12));
    const unnamed = role().nickname;
    await assert.rejects(setName(nickname), {
        code: "ROLE_NAME_EXISTS",
        message: "这个名字已被使用，请换一个",
    });
    assert.equal(role().firstNamed, false);
    assert.equal(role().nickname, unnamed);

    await login(account);
    assert.equal(role().firstNamed, true);
    assert.equal(role().nickname, nickname);
    assert.equal(state().revision, namedRevision);
}

/** 未命名角色领取会被拒绝；命名、领取、重试和重登都以权威快照和原回执为准。 */
async function checkWelcomeGift(client: ReturnType<typeof fixture>): Promise<void> {
    const account = "welcome_" + randomUUID().slice(0, 12);
    const login = async () => {
        client.service.logout();
        assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    };
    const role = () => client.account.snapshot.role!;
    const quantity = (itemId: number) => client.model.items.find(item => item.itemId === itemId)?.quantity ?? 0;
    const claim = () => client.operations.request(Protocol.ROLE_WELCOME_CLAIM, {});
    const notices: RewardNotice[] = [];
    client.socket.onReward = frame => notices.push(frame.body as RewardNotice);
    try {
        await login();
        assert.equal(role().welcomeGiftAvailable, false);
        const diamonds = role().diamonds;
        await assert.rejects(claim(), { code: "WELCOME_GIFT_UNAVAILABLE" });
        assert.equal(role().diamonds, diamonds);
        const suggestion = await client.operations.request(Protocol.ROLE_NAME_RANDOM, {});
        const { nickname } = suggestion.body as { nickname: string };
        await client.operations.request(Protocol.ROLE_NAME_SET, { nickname });
        await until(() => role().firstNamed === true && role().welcomeGiftAvailable === true);
        const reward = (await claim()).body as RewardNotice;
        await until(() => role().welcomeGiftAvailable === false && notices.length === 1);
        assert.deepEqual(notices[0], reward);
        assert.equal(reward.roleId, role().id);
        assert.equal(role().diamonds, diamonds + 492);
        assert.equal(quantity(900101), 2000);
        assert.equal(quantity(900102), 200);
        assert.equal(quantity(1001001), 1);
        assert.equal(quantity(900201), 0);
        assert.deepEqual((await claim()).body, reward);
        assert.equal(notices.length, 1);

        await login();
        assert.equal(role().welcomeGiftAvailable, false);
        assert.equal(role().diamonds, diamonds + 492);
        assert.equal(quantity(1001001), 1);
        assert.deepEqual((await claim()).body, reward);
        assert.equal(notices.length, 1);
    } finally {
        client.socket.onReward = null;
    }
}

/** 真实市场购买只扣费和发奖一次，重登保留购买数，刷新后拒绝旧货架的请求。 */
async function checkMarket(client: ReturnType<typeof fixture>, account: string): Promise<void> {
    type Offer = { productId: number; itemId: number; quantity: number; costItemId: number; costQuantity: number;
        purchaseLimit: number; purchased: number; purchasable: boolean };
    type Shelf = { shelfVersion: number; offers: Offer[]; freeRefreshes: number; freeRefreshLimit: number };
    type Receipt = { requestId: string; roleId: string; assetRevision: number; state: Shelf };
    const login = async () => {
        client.service.logout();
        assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    };
    const list = async () => (await client.operations.request(Protocol.MARKET_LIST, {})).body as Shelf;
    const role = () => client.account.snapshot.role!;
    const balance = (itemId: number) => itemId === 900001 ? role().gold : role().diamonds;
    const inventoryQuantity = (itemId: number) => client.model.quantity(itemId)
        + client.model.snapshot.spiritItems.filter(item => item.itemId === itemId).length;
    const notices: RewardNotice[] = [];
    await login();
    client.socket.onReward = frame => notices.push(frame.body as RewardNotice);
    try {
        const initial = await list();
        assert.equal(initial.offers.length, 6);
        assert.equal(initial.freeRefreshes, initial.freeRefreshLimit);
        const offer = initial.offers.find(row => row.purchasable && row.purchaseLimit > row.purchased);
        assert(offer);
        const before = balance(offer.costItemId);
        const inventoryBefore = inventoryQuantity(offer.itemId);
        const buy = { requestId: randomUUID(), shelfVersion: initial.shelfVersion,
            productId: offer.productId, count: offer.purchaseLimit - offer.purchased };
        const receipt = (await client.operations.request(Protocol.MARKET_BUY, buy)).body as Receipt;
        assert.equal(receipt.requestId, buy.requestId);
        assert.equal(receipt.roleId, role().id);
        const bought = receipt.state.offers.find(row => row.productId === offer.productId);
        assert.equal(bought?.purchased, offer.purchaseLimit);
        await until(() => notices.length === 1);
        assert.equal(notices[0].assetRevision, receipt.assetRevision);
        assert.equal(notices[0].mode, "POPUP");
        assert.equal(notices[0].items.find(row => row.itemId === offer.itemId)?.credited, offer.quantity * buy.count);
        const reimbursed = notices[0].items.find(row => row.itemId === offer.costItemId)?.credited ?? 0;
        const remaining = before - offer.costQuantity * buy.count + reimbursed;
        const inventoryAfter = inventoryBefore + offer.quantity * buy.count;
        await until(() => balance(offer.costItemId) === remaining && inventoryQuantity(offer.itemId) === inventoryAfter);
        assert.deepEqual((await client.operations.request(Protocol.MARKET_BUY, buy)).body, receipt);
        assert.equal(notices.length, 1);
        await assert.rejects(client.operations.request(Protocol.MARKET_BUY, {
            ...buy, requestId: randomUUID(), shelfVersion: receipt.state.shelfVersion, count: 1,
        }), { code: "MARKET_LIMIT" });

        await login();
        const reopened = await list();
        assert.equal(reopened.offers.find(row => row.productId === offer.productId)?.purchased, offer.purchaseLimit);
        assert.equal(balance(offer.costItemId), remaining);
        assert.equal(inventoryQuantity(offer.itemId), inventoryAfter);
        const refresh = { requestId: randomUUID(), shelfVersion: reopened.shelfVersion };
        const refreshed = (await client.operations.request(Protocol.MARKET_REFRESH, refresh)).body as Receipt;
        assert.equal(refreshed.state.shelfVersion > reopened.shelfVersion, true);
        assert.equal(refreshed.state.freeRefreshes, reopened.freeRefreshes - 1);
        assert(refreshed.state.offers.every(row => row.purchased === 0));
        assert.equal(balance(offer.costItemId), remaining);
        assert.deepEqual((await client.operations.request(Protocol.MARKET_REFRESH, refresh)).body, refreshed);
        await assert.rejects(client.operations.request(Protocol.MARKET_BUY, {
            ...buy, shelfVersion: reopened.shelfVersion, requestId: randomUUID(),
        }), { code: "MARKET_SHELF_CHANGED" });
        assert.equal(notices.length, 1);
    } finally {
        client.socket.onReward = null;
    }
}

/** 用独立强阵容验证真实金币副本战报、挑战和清扫的到账、扣费确认以及重登幂等。 */
async function checkDailyDungeon(client: ReturnType<typeof fixture>, account: string): Promise<void> {
    type State = {
        stageId: number; wins: number; freeLimit: number; totalLimit: number; nextCostDiamonds: number;
        resetAtSeconds: number; power: number; requiredPower: number; unlocked: boolean; canChallenge: boolean;
        cleared: boolean; rewardPreview: { itemId: number; quantity: number }[];
    };
    type Receipt = {
        requestId: string; roleId: string; battleId: string; assetRevision: number; won: boolean; sweep: boolean;
        replay?: { outcome: string; units: { templateId: number; faction: number }[] };
        actual?: { roleId: string; items: { itemId: number; credited: number }[] }; state: State;
    };
    const login = async () => {
        client.service.logout();
        assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    };
    const state = async () => (await client.operations.request(Protocol.DAILY_DUNGEON_LIST, {})).body as State;
    const challenge = async (requestId: string, sweep: boolean, maxDiamonds: number) =>
        (await client.operations.request(Protocol.DAILY_DUNGEON_CHALLENGE, { requestId, sweep, maxDiamonds })).body as Receipt;
    const role = () => client.account.snapshot.role!;
    const quantity = () => client.model.items.find(item => item.itemId === 900102)?.quantity ?? 0;
    const grants: RewardNotice[] = [];
    client.socket.onReward = frame => grants.push(frame.body as RewardNotice);

    await login();
    const initial = await state();
    assert.equal(initial.stageId, 1);
    assert.equal(initial.unlocked, true);
    assert.equal(initial.canChallenge, true);
    assert(initial.power > initial.requiredPower);
    assert(initial.resetAtSeconds > client.clock.nowSeconds()!);
    assert.equal(initial.cleared, false);
    assert.equal(initial.wins, 0);
    assert.equal(initial.freeLimit, 2);
    assert(initial.totalLimit > initial.freeLimit);
    assert.equal(initial.nextCostDiamonds, 0);
    assert.deepEqual(initial.rewardPreview, [{ itemId: 900001, quantity: 100_000 }, { itemId: 900102, quantity: 20 }]);
    await assert.rejects(challenge(randomUUID(), true, 0), { code: "DUNGEON_SWEEP_LOCKED" });

    const before = { gold: role().gold, diamonds: role().diamonds, items: quantity() };
    const first = await challenge(randomUUID(), false, 0);
    assert.equal(first.roleId, role().id);
    assert.equal(first.won, true);
    assert.equal(first.sweep, false);
    assert.equal(first.state.wins, 1);
    assert.equal(first.state.cleared, true);
    assert.equal(first.replay?.outcome, "ATTACKER_WIN");
    const enemies = first.replay!.units.filter(unit => unit.faction === 2);
    assert.equal(enemies.length, 6);
    assert(enemies.some(unit => unit.templateId === 10204004));
    assert(enemies.some(unit => unit.templateId === 10405005));
    assert.equal(first.actual?.roleId, role().id);
    assert.deepEqual(first.actual?.items.map(({ itemId, credited }) => ({ itemId, quantity: credited })),
        initial.rewardPreview);
    await until(() => role().gold === before.gold + 100_000 && quantity() === before.items + 20);
    assert.equal(role().diamonds, before.diamonds);

    assert.deepEqual(await challenge(first.requestId, false, 0), first);
    await assert.rejects(challenge(first.requestId, true, 0), { code: "DUNGEON_REQUEST_CONFLICT" });
    const swept = await challenge(randomUUID(), true, 0);
    assert.equal(swept.won, true);
    assert.equal(swept.sweep, true);
    assert.equal(swept.replay, undefined);
    assert.equal(swept.state.wins, 2);
    assert.equal(swept.state.nextCostDiamonds, 50);
    await until(() => role().gold === before.gold + 200_000 && quantity() === before.items + 40);
    const paidId = randomUUID();
    await assert.rejects(challenge(paidId, true, 0), { code: "DUNGEON_COST_CHANGED" });
    assert.equal(role().diamonds, before.diamonds);
    assert.equal((await state()).wins, 2);

    const paid = await challenge(paidId, true, 50);
    assert.equal(paid.state.wins, 3);
    assert.equal(paid.state.canChallenge, false);
    await until(() => role().gold === before.gold + 300_000 && quantity() === before.items + 60
        && role().diamonds === before.diamonds - 50);
    await assert.rejects(challenge(randomUUID(), true, 50), { code: "DUNGEON_COUNT" });
    // 结算页使用原回执展示奖励，静默到账不再排入第二个通用弹窗。
    assert.equal(grants.length, 0);
    await login();
    assert.deepEqual(await state(), paid.state);
    assert.deepEqual(await challenge(swept.requestId, true, 0), swept);
    assert.equal((await state()).wins, 3);
    assert.equal(role().diamonds, before.diamonds - 50);
    assert.equal(role().gold, before.gold + 300_000);
    assert.equal(quantity(), before.items + 60);
    console.log("PASS real TS gold dungeon → isolated H2: replay, free and paid sweep, reward, reconnect and receipt idempotency");
}

/** 以旧请求通过首关，再连续挑战至第 3 关，验证真实战报、付费扫荡、到账和冷重登。 */
async function checkGoldStageProgress(client: ReturnType<typeof fixture>, account: string): Promise<void> {
    interface Receipt {
        readonly state: DailyDungeonState;
        readonly won: boolean;
        readonly sweep: boolean;
        readonly replay?: object;
        readonly actual?: { readonly items: readonly { itemId: number; credited: number }[] };
    }
    const list = async () => (await client.operations.request(Protocol.DAILY_DUNGEON_LIST, {})).body as DailyDungeonState;
    const challenge = async (requestId: string, sweep: boolean, maxDiamonds: number, stageId?: number) =>
        (await client.operations.request(Protocol.DAILY_DUNGEON_CHALLENGE, {
            requestId, sweep, maxDiamonds, ...(stageId === undefined ? {} : { stageId }),
        })).body as Receipt;
    const role = () => client.account.snapshot.role!;
    const stones = () => client.model.quantity(900102);
    assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    const original = await list();
    const before = { gold: role().gold, diamonds: role().diamonds, stones: stones() };
    assert(original.stages?.length === 9);
    const secondPreview = original.stages[1];
    assert.equal(secondPreview.requiredPower, 30_000);
    assert.equal(secondPreview.ribbon, 2);
    assert.equal(secondPreview.unlocked, false);
    assert.deepEqual(secondPreview.rewardPreview,
        [{ itemId: 900001, quantity: 150_000 }, { itemId: 900102, quantity: 30 }]);
    const thirdPreview = original.stages[2];
    assert.equal(thirdPreview.requiredPower, 52_500);
    assert.equal(thirdPreview.unlocked, false);
    assert.deepEqual(thirdPreview.rewardPreview,
        [{ itemId: 900001, quantity: 200_000 }, { itemId: 900102, quantity: 40 }]);
    await assert.rejects(challenge(randomUUID(), false, 0, 10), { code: "DUNGEON_STAGE" });
    await assert.rejects(challenge(randomUUID(), false, 0, 3), { code: "DUNGEON_PREVIOUS_STAGE" });
    await assert.rejects(challenge(randomUUID(), false, 0, 2), { code: "DUNGEON_PREVIOUS_STAGE" });

    const firstId = randomUUID();
    const first = await challenge(firstId, false, 0);
    assert.equal(first.won, true);
    assert.equal(first.state.stageId, 1);
    assert.equal(first.state.wins, 1);
    assert.equal(first.state.stages?.[1].canChallenge, true);
    await assert.rejects(challenge(firstId, false, 0, 2), { code: "DUNGEON_REQUEST_CONFLICT" });
    await assert.rejects(challenge(randomUUID(), true, 0, 2), { code: "DUNGEON_SWEEP_LOCKED" });

    const secondId = randomUUID();
    const second = await challenge(secondId, false, 0, 2);
    assert.equal(second.won, true);
    assert.equal(second.state.stageId, 2);
    assert.equal(second.state.wins, 2);
    assert.equal(second.state.nextCostDiamonds, 50);
    assert.equal(second.state.stages?.filter(stage => stage.cleared).length, 2);
    assert(second.replay);
    const parsed = BattleReplayUtils.parse(BattleReplayUtils.encodeVerified(second.replay));
    assert.equal(parsed.units.filter(unit => unit.faction === 2).length, 6);
    assert(parsed.units.filter(unit => unit.faction === 2).every(unit => unit.level === 20));
    assert.deepEqual(second.actual?.items.map(item => ({ itemId: item.itemId, quantity: item.credited })),
        secondPreview.rewardPreview);
    await until(() => role().gold === before.gold + 250_000 && stones() === before.stones + 50);
    assert.equal(role().diamonds, before.diamonds);

    assert.equal(second.state.stages?.[2].canChallenge, true);
    await assert.rejects(challenge(randomUUID(), true, 50, 3), { code: "DUNGEON_SWEEP_LOCKED" });
    await assert.rejects(challenge(randomUUID(), false, 0, 3), { code: "DUNGEON_COST_CHANGED" });
    const thirdId = randomUUID();
    const third = await challenge(thirdId, false, 50, 3);
    assert.equal(third.won, true);
    assert.equal(third.state.stageId, 3);
    assert.equal(third.state.wins, 3);
    assert(third.replay);
    const thirdGuards = BattleReplayUtils.parse(BattleReplayUtils.encodeVerified(third.replay)).units
        .filter(unit => unit.faction === 2);
    assert.deepEqual(thirdGuards.map(unit => unit.templateId),
        [10404003, 10205007, 10305007, 10105007, 10505004, 10104004]);
    assert(thirdGuards.every(unit => unit.level === 40));
    assert.deepEqual(third.actual?.items.map(item => ({ itemId: item.itemId, quantity: item.credited })),
        thirdPreview.rewardPreview);
    await until(() => role().gold === before.gold + 450_000 && stones() === before.stones + 90
        && role().diamonds === before.diamonds - 50);

    const paidId = randomUUID();
    const paid = await challenge(paidId, true, 50, 3);
    assert.equal(paid.sweep, true);
    assert.equal(paid.replay, undefined);
    assert.equal(paid.state.wins, 4);
    await until(() => role().gold === before.gold + 650_000 && stones() === before.stones + 130
        && role().diamonds === before.diamonds - 100);
    await assert.rejects(challenge(randomUUID(), true, 50, 1), { code: "DUNGEON_COUNT" });
    const experience = (await client.operations.request(Protocol.EXPERIENCE_DUNGEON_LIST, {})).body as DailyDungeonState;
    assert.equal(experience.wins, 0);

    client.service.logout();
    assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    const restored = await list();
    assert.deepEqual(restored.stages, paid.state.stages);
    assert.equal(restored.wins, 4);
    assert.deepEqual(await challenge(secondId, false, 0, 2), second);
    assert.deepEqual(await challenge(thirdId, false, 50, 3), third);
    assert.deepEqual(await challenge(paidId, true, 50, 3), paid);
    assert.equal(role().gold, before.gold + 650_000);
    assert.equal(role().diamonds, before.diamonds - 100);
    assert.equal(stones(), before.stones + 130);
    console.log("PASS real TS gold dungeon progression: three stage replays, shared quota, paid sweep and reconnect");
}

/** 使用两类真实协议核对经验副本首关、守军、经验到账、独立胜次和跨类型请求拒绝。 */
async function checkExperienceDungeon(client: ReturnType<typeof fixture>, account: string): Promise<void> {
    interface Receipt {
        readonly requestId: string;
        readonly state: DailyDungeonState;
        readonly won: boolean;
        readonly sweep: boolean;
        readonly replay?: { readonly scenario: string };
        readonly actual?: { readonly items: readonly { itemId: number; credited: number }[] };
    }
    const experienceList = async () =>
        (await client.operations.request(Protocol.EXPERIENCE_DUNGEON_LIST, {})).body as DailyDungeonState;
    const goldList = async () =>
        (await client.operations.request(Protocol.DAILY_DUNGEON_LIST, {})).body as DailyDungeonState;
    const challenge = async (requestId: string, sweep: boolean, maxDiamonds: number) =>
        (await client.operations.request(Protocol.EXPERIENCE_DUNGEON_CHALLENGE, {
            requestId, sweep, maxDiamonds, stageId: 1,
        })).body as Receipt;
    const role = () => client.account.snapshot.role!;
    const heroExperience = () => client.model.quantity(900101);
    assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    const initial = await experienceList();
    const gold = await goldList();
    const before = { diamonds: role().diamonds, experience: heroExperience() };
    assert.equal(gold.wins, 0);
    assert.equal(initial.wins, 0);
    assert.equal(initial.canChallenge, true);
    assert.equal(initial.stages?.length, 9);
    assert.equal(initial.stages[0].minimumLevel, 17);
    assert.equal(initial.stages[0].requiredPower, 1);
    assert.deepEqual(initial.rewardPreview, [{ itemId: 900101, quantity: 60_000 }]);
    await assert.rejects(challenge(randomUUID(), true, 0), { code: "DUNGEON_SWEEP_LOCKED" });

    const first = await challenge(randomUUID(), false, 0);
    assert.equal(first.won, true);
    assert.equal(first.state.wins, 1);
    assert(first.replay);
    assert.equal(first.replay.scenario, "dungeon:experience:1");
    const report = BattleReplayUtils.parse(BattleReplayUtils.encodeVerified(first.replay));
    assert.deepEqual(report.units.filter(unit => unit.faction === 2).map(unit => unit.templateId),
        [10504002, 10305008, 10404002, 10102002, 10505005, 10503001]);
    assert(report.units.filter(unit => unit.faction === 2).every(unit => unit.level === 5));
    assert.deepEqual(first.actual?.items.map(({ itemId, credited }) => ({ itemId, quantity: credited })),
        initial.rewardPreview);
    await until(() => heroExperience() === before.experience + 60_000);
    await assert.rejects(client.operations.request(Protocol.DAILY_DUNGEON_CHALLENGE, {
        requestId: first.requestId, sweep: false, maxDiamonds: 0, stageId: 1,
    }), { code: "DUNGEON_REQUEST_CONFLICT" });

    const free = await challenge(randomUUID(), true, 0);
    assert.equal(free.state.nextCostDiamonds, 50);
    assert.equal(free.replay, undefined);
    assert.equal(role().diamonds, before.diamonds);
    const paid = await challenge(randomUUID(), true, 50);
    assert.equal(paid.state.wins, 3);
    await until(() => heroExperience() === before.experience + 180_000 && role().diamonds === before.diamonds - 50);
    assert.deepEqual(await goldList(), gold);
    await assert.rejects(challenge(randomUUID(), true, 50), { code: "DUNGEON_COUNT" });

    client.service.logout();
    assert(await client.service.login(account, "local-1"), client.account.snapshot.error);
    assert.deepEqual(await experienceList(), paid.state);
    assert.deepEqual(await challenge(first.requestId, false, 0), first);
    assert.deepEqual(await challenge(paid.requestId, true, 50), paid);
    assert.equal(heroExperience(), before.experience + 180_000);
    assert.equal(role().diamonds, before.diamonds - 50);
    assert.deepEqual(await goldList(), gold);
    console.log("PASS real TS experience dungeon: roster, independent quota, experience awards, paid sweep and reconnect");
}

/** 登录首包、断线、顶号、换服、命名、赠礼、市场及首战成长均使用独立测试账号。 */
async function main(){
 const [port,run,fixtureAccount]=process.argv.slice(2);assert(/^\d{4,5}$/.test(port)&&![18080,18081,3306].includes(Number(port)));assert(/^[0-9a-f-]{36}$/.test(run));assert(/^(?:market|gold_dungeon(?:_progress)?|experience_dungeon)_[0-9a-f]{8}$/.test(fixtureAccount));
 // 测试身份探针不是游戏业务接口，只有测试上下文存在。
 const identity=await(await fetch("http://127.0.0.1:"+port+"/api/v1/socket-test-identity")).json() as any;
 assert.equal(identity.kind,"mxzg-owned-socket-it");assert.equal(identity.run,run);
 if (fixtureAccount.startsWith("gold_dungeon_") || fixtureAccount.startsWith("experience_dungeon_")) {
  const client = fixture(port);
  try {
   if (fixtureAccount.startsWith("experience_dungeon_")) {
    await checkExperienceDungeon(client, fixtureAccount);
   } else if (fixtureAccount.startsWith("gold_dungeon_progress_")) {
    await checkGoldStageProgress(client, fixtureAccount);
   } else {
    await checkDailyDungeon(client, fixtureAccount);
   }
  }
  finally { client.stop(); }
  return;
 }
 const one=fixture(port),two=fixture(port);
 try{
  const servers=await one.socket.catalog() as any[];assert(servers.some(row=>row.id==="local-2"));
  const account="wsclient_"+randomUUID().slice(0,12);
  assert(await one.service.login(account,"local-1"),one.account.snapshot.error);assert.equal(one.model.snapshot.synced,true);
  await checkServerClock(one);
  const basics=one.account.snapshot.role!.basics!;assert(basics);assert.equal(basics.experience,0);assert.equal(basics.cup,1000);assert.equal(basics.imageId,410304012);assert.equal(basics.experienceToNextLevel,120);assert(basics.createdAtSeconds>0);assert(Object.isFrozen(basics));
  assert.deepEqual(one.model.items,[]);const role=one.account.snapshot.role!.id,count=one.wires.length;
  one.wires[one.wires.length-1].close();await until(()=>one.wires.length>count && one.socket.latestState?.name==="session.authenticate" && one.model.snapshot.synced && one.clock.nowSeconds() !== null);
  assert.deepEqual(one.account.snapshot.role!.basics,basics,"网络恢复不重置角色基础资料");
  // 使用第二个连接登录同角色，旧客户端不能自动抢回。
  assert(await two.service.login(account,"local-1"),two.account.snapshot.error);await until(()=>!one.service.hasSession);
  assert.equal(one.model.items.length,0);assert.equal(two.account.snapshot.role!.id,role);
  assert.equal(one.clock.nowSeconds(), null, "顶号后旧会话的时钟应失效");
  assert(await two.service.login(account,"local-2"),two.account.snapshot.error);assert.notEqual(two.account.snapshot.role!.id,role);assert.equal(two.model.snapshot.synced,true);
  two.service.logout();assert.equal(two.model.snapshot.status,"idle");assert.equal(two.model.snapshot.synced,false);assert.equal(two.model.items.length,0);
  assert.equal(two.clock.nowSeconds(), null, "退出登录应清空本次会话的时钟");
  await checkRoleNaming(two);
  await checkWelcomeGift(two);
  await checkExpandedSummon(two);
  await checkFirstSummon(two);
  await checkMarket(two, fixtureAccount);
  console.log("PASS real TS client → isolated H2: login, naming, welcome gift, heartbeat, authentication, idle clock, first battle, rewards, equipment, market and receipts");
 }finally{one.stop();two.stop();}
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
