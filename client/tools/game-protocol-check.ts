/** 强类型二进制契约回归：初始化/精灵实例、主线与副本实际奖励、日志脱敏、错误载荷与无Node浏览器环境。
 * 可显式读取本轮Java真实帧互通；旧主线回执缺实际明细仍保留缺失，不借当前资产补数据。
 */
import {strict as assert} from "node:assert";
import {createRequire} from "node:module";
import {runInNewContext} from "node:vm";
import {readFileSync} from "node:fs";
import { GameProtocolCodecUtils, GAME_FRAME_LIMIT } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { CHAT_CHANNEL_IDS } from "../assets/scripts/features/chat/data/ChatData";
import { BLACK_MARKET_STALL, type BlackMarketReceipt } from "../assets/scripts/features/blackmarket/data/BlackMarketData";
import { BattleReplayUtils } from "../assets/scripts/features/battle/utils/BattleReplayUtils";
import {ProtocolRouter} from "../assets/scripts/platform/ProtocolRouter";
import { GameProtocolLogUtils } from "../assets/scripts/platform/GameProtocolLogUtils";
import {mxzg} from "../assets/scripts/platform/GameProtocol.generated";
const state={revision:2,role:{id:"role",nickname:"测试😀",level:1,gold:0,diamonds:0,serverId:"local-1"},heroes:[],heroRoster:{capacity:325,buySpaceTimes:1},inventory:[{itemId:900101,quantity:4}]};

/** 验证试炼实际节点和换周报价需要的字段，可同时交叉解析隔离服务端导出的二进制战报。 */
function checkTrialWire(): void {
    const requestId = "d2775714-1086-4271-aa41-2178d5b2e14e";
    const roleId = "12d69bcd-16c2-418d-986e-f27764156e68";
    const resetAt = 1795708800;
    const rewards = [{ itemId: 901201, quantity: 55 }, { itemId: 900001, quantity: 30000 }];
    const request = { version: 1, kind: "request", id: requestId } as const;
    const response = { ...request, kind: "response", ok: true } as const;
    const act = { ...request, name: Protocol.TRIAL_ACT,
        body: { requestId, expectedVersion: 4, action: "fight", choice: 1, slots: [], heroIds: [] } };
    roundTrip(act);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...act, body: { ...act.body, choice: 21 } }));

    const nodes = Array.from({ length: 20 }, (_, index) => {
        const node = index + 1;
        const chest = node % 4 === 0;
        return { node, type: chest ? "chest" : "battle", status: node === 1 ? "available" : "locked",
            displayLevel: chest ? 0 : node - Math.floor(node / 4), rewards };
    });
    const selected = { version: 4, minimumLevel: 30, resetAtSeconds: resetAt, difficulty: 1, maxDifficulty: 1,
        completedDifficulty: 0, currentNode: 1, reviveUsed: 0, reviveLimit: 0, formationId: 1,
        slots: [], nodes, heroHealth: [], todayRewards: [],
        difficulties: [0, 1000000, 1800000].map((minimumPower, index) => ({
            id: index + 1, minimumPower, rewards, combatReady: index === 0,
        })) };
    const selection = { ...response, name: Protocol.TRIAL_ACT,
        body: { requestId, roleId, assetRevision: 0, action: "selectDifficulty", state: selected } };
    roundTrip(selection);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...selection, body: { ...selection.body,
            state: { ...selected, nodes: nodes.map(row => row.node === 4 ? { ...row, displayLevel: 4 } : row) } },
    }), /试炼地图/);
    const buy = { ...request, name: Protocol.TRIAL_SHOP_BUY, body: { requestId, offerId: 1, count: 1, refreshAt: resetAt } };
    roundTrip(buy);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...buy, body: { ...buy.body, price: 1250 } }));

    for (const argument of process.argv.filter(value => value.startsWith("--trial-java="))) {
        const path = argument.slice("--trial-java=".length);
        const frame = GameProtocolCodecUtils.decodeGameFrame(readFileSync(path));
        if (frame.name === Protocol.TRIAL_SHOP_BUY) {
            const receipt = frame.body as import("../assets/scripts/platform/Protocol").TrialShopReceipt;
            assert.equal(receipt.state.offers[0].price, 1250);
            const result = receipt.actual as { items: readonly { itemId: number; credited: number }[] };
            assert(result.items.some(item => item.itemId === 901503 && item.credited === 5));
            console.log(`PASS Java/TS Trial purchase ${path}`);
            continue;
        }
        assert.equal(frame.name, Protocol.TRIAL_ACT);
        const actual = frame.body as import("../assets/scripts/platform/Protocol").TrialSettlement;
        const replay = actual.state.battle?.replay;
        assert(replay, "真实试炼回执应包含战报");
        assert.equal(replay.scenario, `trial:${actual.state.difficulty}:${actual.state.battle?.node}`);
        assert.doesNotThrow(() => BattleReplayUtils.encodeVerified(replay));
        console.log(`PASS Java/TS Trial replay ${path}`);
    }
}

/** 校验梦境命令字段，并可读取指定范围内 Java 实际连战的战报验证客户端解析。 */
function checkDreamlandWire(): void {
    const requestId = "d2775714-1086-4271-aa41-2178d5b2e14e";
    const request = { version: 1, kind: "request", name: Protocol.DREAMLAND_ACT, id: requestId } as const;
    const body = { requestId, expectedVersion: 0, action: "START" };
    roundTrip({ ...request, body: { ...body, slots: [] } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { ...body, choice: 1 } }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { ...body, action: "SELECT_BUFF" } }));
    const javaFixtureArgument = process.argv.find(arg => arg === "--dreamland-java" || arg.startsWith("--dreamland-java="));
    if (javaFixtureArgument) {
        const fixtureFolder = javaFixtureArgument.split("=", 2)[1] ?? "backend/target";
        const limitArgument = process.argv.find(arg => arg.startsWith("--dreamland-floors="));
        const lastFloor = limitArgument ? Number(limitArgument.split("=", 2)[1]) : 35;
        assert(Number.isSafeInteger(lastFloor) && lastFloor > 0 && lastFloor <= 1500, "梦境校验楼层必须在配置范围内");
        for (let floor = 1; floor <= lastFloor; floor++) {
            const frame = GameProtocolCodecUtils.decodeGameFrame(readFileSync(`${fixtureFolder}/chapter-dreamland-floor-${floor}.pb`));
            assert.equal(frame.name, Protocol.DREAMLAND_ACT);
            const receipt = frame.body as import("../assets/scripts/platform/Protocol").DreamlandActData;
            assert.equal(receipt.state.maxFloor, lastFloor);
            assert.equal(receipt.state.highestFloor, floor - 1);
            assert.equal(receipt.state.battle?.floor, floor);
            assert.equal(receipt.state.battle?.won, true);
            const replay = receipt.state.battle?.replay;
            assert(replay);
            assert.equal(replay.scenario, `dreamland:${floor}`);
            assert.doesNotThrow(() => BattleReplayUtils.encodeVerified(replay), `第 ${floor} 层连战战报应可回放`);
        }
        console.log(`PASS Java/TS Dreamland floor 1–${lastFloor} battle reports`);
    }
    const guardFixtureArgument = process.argv.find(arg => arg.startsWith("--dreamland-guards-from="));
    if (guardFixtureArgument) {
        const firstFloor = Number(guardFixtureArgument.split("=", 2)[1]);
        const lastFloor = Number(process.argv.find(arg => arg.startsWith("--dreamland-floors="))?.split("=", 2)[1]);
        assert(Number.isSafeInteger(firstFloor) && Number.isSafeInteger(lastFloor)
            && firstFloor >= 1 && firstFloor <= lastFloor && lastFloor <= 1500);
        for (let floor = firstFloor; floor <= lastFloor; floor++) {
            const bytes = readFileSync(`backend/target/dreamland-guard-replays/floor-${floor}.pb`);
            const replay = BattleReplayUtils.parse(bytes);
            assert(replay.steps.some(step => step.kind === "skill.begin" && step.sourceId > 8),
                `第 ${floor} 层的守军必须真实出手`);
        }
        console.log(`PASS Java/TS Dreamland guard replays ${firstFloor}–${lastFloor}`);
    }
}

/** 核对好友支援、绑定助战和排行独立回包，拒绝跨请求夹带字段与损坏的列表。 */
function checkDreamlandSocialWire(): void {
    const roleId = "12d69bcd-16c2-418d-986e-f27764156e68";
    const peerId = "b21eb5c2-5d40-47cb-af0c-8ca04f92d513";
    const heroId = "65d961c9-ba29-424f-8986-d47a502a5098";
    const requestId = "b7fa5fe7-6231-42ea-92f5-c140aec03bf1";
    const request = { version: 1, kind: "request", id: requestId } as const;
    const response = { ...request, kind: "response", ok: true } as const;
    const assistQuery = { ...request, name: Protocol.DREAMLAND_ASSISTANCE, body: {} };
    const rankQuery = { ...request, name: Protocol.DREAMLAND_RANKING, body: {} };
    roundTrip(assistQuery);
    roundTrip(rankQuery);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...assistQuery, body: { roleId } }), /梦境查询/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...rankQuery, body: { floor: 3 } }), /梦境查询/);

    const hero = { roleId: peerId, roleName: "好友", heroId, templateId: 10304012, level: 35, star: 4, power: 6000 };
    const resetAtSeconds = 1795708800;
    const dispatchRewards = [{ itemId: 900101, quantity: 5000 }];
    const assist = { version: 3, resetAtSeconds, canSelect: true, maxAssistPower: 7500, selected: hero,
        available: [hero], dispatchRewards };
    const assistReply = { ...response, name: Protocol.DREAMLAND_ASSISTANCE, body: assist };
    roundTrip(assistReply);
    roundTrip({ ...assistReply, body: { ...assist, dispatched: { ...hero, roleId, roleName: "自己" }, available: [] } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...assistReply, body: { ...assist, available: [hero, hero] },
    }), /梦境好友支援/);

    const operation = { ...request, name: Protocol.DREAMLAND_ACT, body: { requestId, expectedVersion: 3,
        action: "SELECT_ASSIST", targetId: peerId, slots: [] } };
    roundTrip(operation);
    roundTrip({ ...operation, body: { ...operation.body, action: "DISPATCH_ASSIST", targetId: heroId } });
    roundTrip({ ...operation, body: { requestId, expectedVersion: 3, action: "CLEAR_ASSIST", slots: [] } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...operation, body: { ...operation.body, targetId: "bad-id" },
    }), /梦境操作参数/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...operation, body: { ...operation.body, action: "CLEAR_ASSIST" },
    }), /梦境操作参数/);

    const leader = { roleId: peerId, name: "好友", level: 35, headId: 1, headBorderId: 0,
        power: 6020, floor: 8, rank: 1, achievedAtSeconds: 1795698800 };
    const own = { ...leader, roleId, name: "自己", floor: 0, rank: 0, achievedAtSeconds: 0 };
    const ranking = { entries: [leader], own, resetAtSeconds,
        rewardTiers: [{ minRank: 1, maxRank: 1, rewards: [{ itemId: 900202, quantity: 10 }] }] };
    const rankReply = { ...response, name: Protocol.DREAMLAND_RANKING, body: ranking };
    roundTrip(rankReply);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...rankReply, body: { ...ranking, entries: [{ ...leader, rank: 2 }] },
    }), /梦境榜单/);
}

/** 梦境预估保留版本及普通站位，禁止额外角色身份、重复站位和负数分值。 */
function checkDreamlandFormationPowerWire(): void {
    const requestId = "b7fa5fe7-6231-42ea-92f5-c140aec03bf1";
    const first = { position: 2, heroId: "65d961c9-ba29-424f-8986-d47a502a5098" };
    const second = { position: 3, heroId: "b21eb5c2-5d40-47cb-af0c-8ca04f92d513" };
    const body = { requestId, expectedVersion: 3, formationId: 1, slots: [first, second] };
    const request = { version: 1, kind: "request", name: Protocol.DREAMLAND_FORMATION_POWER, id: requestId, body } as const;
    const response = { ...request, kind: "response", ok: true, body: { requestId, version: 3, power: 12000 } };
    roundTrip(request);
    roundTrip({ ...request, body: { ...body, slots: [] } });
    roundTrip(response);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { ...body, roleId: first.heroId } }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...request, body: { ...body, slots: [first, { ...second, position: 2 }] },
    }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
        ...request, body: { ...body, slots: [{ ...first, position: 9 }] },
    }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, body: { requestId, version: 3, power: -1 } }));
}

/** 聊天保留精确游标及范围，拒绝混合范围和乱序消息，开发日志隐藏正文。 */
function checkChatWire(): void {
    const requestId = "aad15d1b-be88-4b9e-8c84-075cbb9a52df";
    const roleId = "5f1b01d5-16e4-4dad-9d51-6f7b65a223a3";
    const text = "测试世界消息 🌟 #1#";
    const id = "9007199254740993";
    const message = { id, roleId, text, name: "角色", avatarId: 1, borderId: 0, level: 18, sentAtSeconds: 1795622400 };
    const page = { messages: [message], latestId: id, readThroughId: "0", unreadCount: 1,
        hasMore: false, hasNewer: false, canSend: true };
    const request = { version: 1, kind: "request", name: Protocol.CHAT_HISTORY, body: { afterId: id } };
    const response = { ...request, kind: "response", ok: true, body: page };
    roundTrip(request);
    roundTrip(response);
    roundTrip({ ...request, name: Protocol.CHAT_SEND, body: { requestId, text } });
    roundTrip({ ...response, name: Protocol.CHAT_SEND, body: { requestId, message } });
    roundTrip({ ...request, name: Protocol.CHAT_READ, body: { throughId: id } });
    roundTrip({ ...response, name: Protocol.CHAT_READ, body: { ...page, messages: [], readThroughId: id, unreadCount: 0 } });
    roundTrip({ version: 1, kind: "event", name: Protocol.CHAT_CHANGED, body: {} });
    const peerRoleId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const privateScope = { channel: CHAT_CHANNEL_IDS.private, peerRoleId };
    const privateMessage = { ...message, channel: CHAT_CHANNEL_IDS.private, serverId: "local-1" };
    const privatePage = { ...page, ...privateScope, scopeId: `${roleId}:${peerRoleId}`, messages: [privateMessage] };
    roundTrip({ ...request, body: { ...privateScope, beforeId: id } });
    roundTrip({ ...response, body: privatePage });
    roundTrip({ ...request, name: Protocol.CHAT_SEND, body: { ...privateScope, requestId, text } });
    roundTrip({ ...response, name: Protocol.CHAT_SEND, body: { requestId, message: privateMessage, peerRoleId } });
    roundTrip({ ...request, name: Protocol.CHAT_READ, body: { ...privateScope, throughId: id } });
    roundTrip({ ...request, name: Protocol.CHAT_OVERVIEW, body: {} });
    const channels = Object.values(CHAT_CHANNEL_IDS).map(channel => ({ channel, available: true, unreadCount: 1 }));
    const conversations = [{ roleId: peerRoleId, name: "私聊玩家", level: 24, avatarId: 1, borderId: 0,
        latestMessageId: id, unreadCount: 1 }];
    roundTrip({ ...response, name: Protocol.CHAT_OVERVIEW, body: { channels, conversations } });
    roundTrip({ ...response, body: { ...page, channel: CHAT_CHANNEL_IDS.system, scopeId: "local-1", canSend: false,
        messages: [{ ...message, roleId: "", name: "系统", level: 0, avatarId: 0, noticeId: 2, channel: CHAT_CHANNEL_IDS.system }] } });
    roundTrip({ ...response, body: { ...page, scopeId: "local-1",
        messages: [{ ...message, roleId: "", name: "系统", level: 0, avatarId: 0, noticeId: 1 }] } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { peerRoleId, afterId: id } }), /私聊对象/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, body: { ...privatePage, messages: [message] } }), /聊天消息/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, body: { ...page,
        messages: [{ ...message, noticeId: 1 }] } }), /聊天消息/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, name: Protocol.CHAT_OVERVIEW,
        body: { channels, conversations: [...conversations, ...conversations] } }), /私聊摘要/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { beforeId: id, afterId: id } }), /聊天请求参数/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { afterId: "9223372036854775808" } }), /聊天请求参数/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, body: { ...page, messages: [message, message] } }),
        /聊天记录顺序/);
    assert(!GameProtocolLogUtils.formatServerFrame(response).includes(text));
    if (process.argv.includes("--chat-java")) {
        const frame = GameProtocolCodecUtils.decodeGameFrame(readFileSync("backend/target/world-chat-history.pb"));
        assert.equal(frame.name, Protocol.CHAT_HISTORY);
        assert.equal((frame.body as { messages: readonly { text: string }[] }).messages[0]?.text, "离线期间的世界消息");
        console.log("PASS Java/TS world chat history and unread");
    }
}

/** 排行协议保留五种榜类、真实名次及已结算的点赞奖励。 */
function checkRankingWire(): void {
    const requestId = "aad15d1b-be88-4b9e-8c84-075cbb9a52df";
    const id = "5f1b01d5-16e4-4dad-9d51-6f7b65a223a3";
    const leader = { rank: 1, id, serverId: "local-2", name: "排行验收", score: 123456,
        level: 45, headId: 1, borderId: 0, badgeId: 0, leaderName: "" };
    const overview = { crossLevel: 40, resetAt: 1795622400, crossUnlocked: true,
        boards: [{ kind: "CROSS_POWER", leader, liked: true }] };
    const request = { version: 1, kind: "request" };
    const response = { version: 1, kind: "response", id: "rank", ok: true };
    const likeBody = { requestId, targetId: id, kind: "CROSS_POWER", resetAt: overview.resetAt };
    const notice = { schemaVersion: 1, receiptId: "20000000-2222-4222-8222-222222222222",
        requestId, roleId: id, assetRevision: 3, mode: "TIPS", items: [{ itemId: 900001, credited: 30000 }], heroes: [] };
    roundTrip({ ...request, name: Protocol.RANKING_OVERVIEW, body: {} });
    roundTrip({ ...request, name: Protocol.RANKING_LIST, body: { kind: "CHAPTER" } });
    roundTrip({ ...request, name: Protocol.RANKING_LIKE, body: likeBody });
    roundTrip({ ...response, name: Protocol.RANKING_OVERVIEW, body: overview });
    roundTrip({ ...response, name: Protocol.RANKING_LIST,
        body: { kind: "CROSS_POWER", entries: [leader], own: { ...leader, rank: 55 } } });
    roundTrip({ ...response, name: Protocol.RANKING_LIKE, body: { requestId, overview, notice } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, name: Protocol.RANKING_LIKE,
        body: { ...likeBody, serverId: "other" } }), /排行榜操作参数无效/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, name: Protocol.RANKING_OVERVIEW,
        body: { ...overview, crossUnlocked: false } }), /排行总览无效/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, name: Protocol.RANKING_LIST,
        body: { kind: "CROSS_POWER", entries: [{ ...leader, rank: 2 }] } }), /榜单名次或条目无效/);
}

/** 邮件附件和好友礼物随认证信封往返，回执须绑定当前命令。 */
function checkSocialWire(): void {
    const requestId = "aad15d1b-be88-4b9e-8c84-075cbb9a52df";
    const id = "5f1b01d5-16e4-4dad-9d51-6f7b65a223a3";
    const request = { version: 1, kind: "request" };
    const response = { version: 1, kind: "response", id: "social", ok: true };
    const event = { version: 1, kind: "event", connectionId: "c", body: {} };
    const attachment = { itemId: 900001, quantity: 80 };
    const mailbox = { entries: [{ id, title: "远征纪念", createdAt: 1795622400,
        read: true, claimed: false, hasAttachments: true }] };
    const detail = { id, content: "公会远征附件", attachments: [attachment] };
    roundTrip({ ...request, name: Protocol.MAIL_LIST, body: {} });
    roundTrip({ ...request, name: Protocol.MAIL_CHANGE, body: { requestId, action: "OPEN", mailId: id } });
    roundTrip({ ...response, name: Protocol.MAIL_LIST, body: mailbox });
    roundTrip({ ...response, name: Protocol.MAIL_CHANGE, body: { requestId, state: mailbox, detail } });
    roundTrip({ ...event, name: Protocol.MAIL_CHANGED });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, name: Protocol.MAIL_CHANGE,
        body: { requestId, action: "CLAIM_ALL", mailId: id } }), /邮件操作参数无效/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, name: Protocol.MAIL_CHANGE,
        body: { requestId, state: { entries: [] }, detail } }), /邮件详情无效/);

    const friend = { roleId: id, serverId: "local-1", name: "好友验收", level: 18, headId: 0, borderId: 0,
        power: 1200, lastLoginAt: 1795622400, giftState: 0, sentToday: false, requested: false };
    const friendState = { resetAt: 1795708800, friendLimit: 100, blockLimit: 50, sendLimit: 100, sentToday: 1,
        friendship: 10, friends: [friend], gifts: [], applications: [], blocked: [] };
    const notice = { schemaVersion: 1, receiptId: "20000000-2222-4222-8222-222222222222", requestId,
        roleId: id, assetRevision: 3, mode: "TIPS", items: [{ itemId: 900001, credited: 3000 }], heroes: [] };
    roundTrip({ ...request, name: Protocol.FRIEND_STATE, body: {} });
    roundTrip({ ...request, name: Protocol.FRIEND_SEARCH, body: { query: "" } });
    roundTrip({ ...request, name: Protocol.FRIEND_CHANGE,
        body: { requestId, action: "SEND", targetId: id, resetAt: friendState.resetAt } });
    roundTrip({ ...response, name: Protocol.FRIEND_STATE, body: friendState });
    roundTrip({ ...response, name: Protocol.FRIEND_SEARCH, body: { query: "", entries: [friend] } });
    roundTrip({ ...response, name: Protocol.FRIEND_CHANGE, body: { requestId, state: friendState, notice } });
    roundTrip({ ...event, name: Protocol.FRIEND_CHANGED });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, name: Protocol.FRIEND_CHANGE,
        body: { requestId, state: friendState, notice: { ...notice, requestId: id } } }), /奖励与社交操作回执不符/);
}

/** 已有账号的超额成就、领取期次与提交后通知均能二进制往返。 */
function checkQuestWire(): void {
    const request = { version: 1, kind: "request", name: Protocol.QUEST_CLAIM };
    const quote = { requestId: "aad15d1b-be88-4b9e-8c84-075cbb9a52df", kind: "MILESTONE", id: 1, resetAt: 1795622400 };
    const achievement = { id: 104100, title: "加入公会", current: 3, target: 1, claimed: false,
        destination: "main_clan", rewards: [{ itemId: 900001, quantity: 50000 }] };
    const snapshot = { resetAt: quote.resetAt, activityPoints: 20, daily: [], achievements: [achievement],
        milestones: [{ id: 1, points: 20, claimed: false, rewards: [{ itemId: 900002, quantity: 50 }] }] };
    const event = { version: 1, kind: "event", name: Protocol.QUEST_CHANGED, connectionId: "c" };
    roundTrip({ ...request, name: Protocol.QUEST_LIST, body: {} });
    roundTrip({ ...request, body: quote });
    roundTrip({ version: 1, kind: "response", name: Protocol.QUEST_LIST, id: "q", ok: true, body: snapshot });
    roundTrip({ version: 1, kind: "response", name: Protocol.QUEST_CLAIM, id: "q", ok: true,
        body: { requestId: quote.requestId, snapshot } });
    roundTrip({ ...event, body: { completed: [{ id: achievement.id, title: achievement.title }] } });
    roundTrip({ ...event, body: { completed: [] } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, body: { ...quote, roleId: "other" } }), /任务领取请求无效/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...event, body: { completed: [{ id: 0, title: "加入公会" }] } }), /成就完成通知无效/);
}
/** 公会进度、空公告及真实零战力继续走原有二进制协议。 */
function checkGuildWire(): void {
    roundTrip({ version: 1, kind: "request", name: Protocol.GUILD_LIST, body: { query: "远征", page: 2 } });
    const command = { requestId: "aad15d1b-be88-4b9e-8c84-075cbb9a52df", action: "APPROVE", applicantId: "role" };
    roundTrip({ version: 1, kind: "request", name: Protocol.GUILD_CHANGE, body: command });
    roundTrip({ version: 1, kind: "request", name: Protocol.GUILD_CHANGE,
        body: { requestId: command.requestId, action: "CREATE", name: "远征", badgeId: 43 } });
    roundTrip({ version: 1, kind: "request", name: Protocol.GUILD_CHANGE,
        body: { requestId: command.requestId, action: "UPDATE_NOTICE", guildId: "guild", description: "" } });
    const guild = { id: "guild", name: "远征", memberCount: 2, capacity: 15, description: "", badgeId: 43,
        level: 1, experience: 0, nextLevelExperience: 750 };
    for (const name of [Protocol.GUILD_LIST, Protocol.GUILD_CHANGE]) {
        roundTrip({ version: 1, kind: "response", name, id: "req", ok: true,
            body: { ...(name === Protocol.GUILD_CHANGE ? { requestId: command.requestId, guild } : {}),
                levelRequired: 18, createCostDiamonds: 100, nameLimit: 64,
                members: [{ id: "role", nickname: "测试", level: 18, leader: true, headId: 1, borderId: 0, power: 0 }],
                applications: [],
                guilds: [guild], page: 1, hasMore: false, appliedGuildIds: [], rejoinAtSeconds: 0 } });
    }
    roundTrip({ version: 1, kind: "event", name: Protocol.GUILD_UPDATED, connectionId: "c", body: {} });
    const guildId = "406060e1-5c6a-4ab8-9b03-24c759fb791f";
    const quote = { requestId: command.requestId, guildId, productId: 1, count: 2, resetAtSeconds: 1795968000 };
    roundTrip({ version: 1, kind: "request", name: Protocol.GUILD_SHOP_BUY, body: quote });
    roundTrip({ version: 1, kind: "response", name: Protocol.GUILD_SHOP_BUY, id: "req", ok: true,
        body: { requestId: quote.requestId, guildId, resetAtSeconds: quote.resetAtSeconds,
            products: [{ productId: 1, itemId: 20104016, quantity: 30, cost: 1500, limit: 2, purchased: 2, purchasable: true }] } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ version: 1, kind: "request", name: Protocol.GUILD_SHOP_BUY,
        body: { ...quote, count: 0 } }), /公会兑换或捐献请求无效/);
    roundTrip({ version: 1, kind: "request", name: Protocol.GUILD_DONATION_CLAIM,
        body: { requestId: command.requestId, guildId, resetAt: 1795622400, optionId: 1 } });
    const ranked = { rank: 1, guildId, serverId: "local-1", name: "远征", badgeId: 4, leaderName: "测试", power: 2294226 };
    roundTrip({ version: 1, kind: "response", name: Protocol.GUILD_RANKING, id: "req", ok: true,
        body: { entries: [ranked], own: ranked } });
    for (const guildName of [guild.name, ""]) {
        roundTrip({ version: 1, kind: "event", name: Protocol.STATE_CHANGED,
            body: { ...state, role: { ...state.role, guildName, power: guildName ? 2294226 : 0 } } });
    }
    const invalid: import("../assets/scripts/platform/GameProtocolCodecUtils").GameFrame = {
        version: 1, kind: "response", name: Protocol.GUILD_LIST, id: "req", ok: true,
        body: { levelRequired: 18, createCostDiamonds: 100, nameLimit: 64, guild, page: 1,
            hasMore: false, rejoinAtSeconds: 0, members: [{ id: "role", nickname: "测试", level: 18, leader: true, power: -1 }] },
    };
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame(invalid), /成员战力无效/);
}

/** 草稿战力只允许队员身份随请求交付，空队与资产版本按原值回包。 */
function checkFormationPowerWire(): void {
    const requestId = "aad15d1b-be88-4b9e-8c84-075cbb9a52df";
    const request = { version: 1, kind: "request" as const, name: Protocol.FORMATION_POWER,
        id: "formation-power-test", body: { requestId, heroIds: [] } };
    roundTrip(request);
    roundTrip({ version: 1, kind: "response", name: Protocol.FORMATION_POWER,
        id: request.id, ok: true, body: { ...request.body, power: 0, assetRevision: 20 } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request,
        body: { requestId, heroIds: ["hero", "hero"] } }), /队员回显无效/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request,
        body: { requestId, heroIds: ["hero"], power: 123 } }), /队员回显无效/);
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

/** 快速战斗报价与实际奖励通过同一二进制请求往返，拒绝不一致的回执。 */
function checkQuickBattleWire(): void {
    const info = { version: 1, kind: "request" as const, name: Protocol.CHAPTER_QUICK_BATTLE_INFO };
    roundTrip({ ...info, body: {} });
    const quote = { unlocked: true, usedCount: 3, maxCount: 4, costDiamonds: 200,
        resetAt: 1795536000, tavernFull: false };
    roundTrip({ ...info, kind: "response", ok: true, body: quote });
    const roleId = "10000000-1111-4111-8111-111111111111";
    const requestId = "20000000-1111-4111-8111-111111111111";
    const receiptId = "30000000-1111-4111-8111-111111111111";
    const command = { requestId, resetAt: quote.resetAt, usedCount: quote.usedCount };
    const request = { ...info, name: Protocol.CHAPTER_QUICK_BATTLE_CLAIM, body: command };
    roundTrip(request);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request,
        body: { ...command, resetAt: 0 } }), /报价凭据无效/);
    const receipt = { requestId, receiptId, roleId, assetRevision: 8,
        state: { ...quote, usedCount: 4, costDiamonds: 0 },
        actual: { roleId, items: [{ itemId: 900001, requested: 100, credited: 100, ignored: 0, reason: "NONE" }],
            wallet: { goldBefore: 0, goldAfter: 100, diamondsBefore: 200, diamondsAfter: 200 },
            stacks: [], experience: [], tavern: [], bonuses: [], timedItems: [],
            spirits: { schemaVersion: 1, items: [] }, heroes: [] },
        notice: { schemaVersion: 1, roleId, receiptId, requestId, assetRevision: 8, mode: "POPUP",
            items: [{ itemId: 900001, credited: 100 }], heroes: [] } };
    const response = { ...request, kind: "response" as const, ok: true, body: receipt };
    roundTrip(response);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response,
        body: { ...receipt, state: { ...receipt.state, usedCount: 5 } } }), /报价无效/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response,
        body: { ...receipt, notice: { ...receipt.notice, receiptId: requestId } } }), /与回执不一致/);

    if (process.argv.includes("--quick-battle-java")) {
        const frame = GameProtocolCodecUtils.decodeGameFrame(readFileSync("backend/target/chapter-quick-battle.pb"));
        assert.equal(frame.name, Protocol.CHAPTER_QUICK_BATTLE_CLAIM);
        const body = frame.body as typeof receipt;
        assert.equal(body.state.usedCount, 1);
        assert.equal(body.state.costDiamonds, 50);
        assert(body.actual.items.length > 0);
    }
}

/** 协议帧往返必须保持结构和整数，不截取 Buffer 池其他字节。 */
function roundTrip(frame:any){const bytes=GameProtocolCodecUtils.encodeGameFrame(frame);assert(bytes instanceof ArrayBuffer);assert.deepEqual(GameProtocolCodecUtils.decodeGameFrame(bytes),frame);}
/** 验证统一状态、玩法指令和原奖励往返。显式 wire 参数只读取独立 Java 测试输出。 */
function main(){
 checkGuildWire();
 checkQuestWire();
 checkRankingWire();
 checkSocialWire();
 checkChatWire();
 checkArenaSeasonWire();
 checkFormationPowerWire();
 checkVipWire();
 checkQuickBattleWire();
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
 checkBlackMarketWire();
 checkSmithWire();
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

/** 核对黑市页签、宽整数货架及限购；可附加核对 Java 实际购买回执。 */
function checkBlackMarketWire(): void {
    const requestId = "10000000-1111-4111-8111-111111111111";
    const roleId = "20000000-2222-4222-8222-222222222222";
    const offer = { productId: 22, itemId: 900102, quantity: 250, costItemId: 900002,
        costQuantity: 80, purchaseLimit: 2, purchased: 0, discount: 80, purchasable: true };
    const tab = { shopType: 100800, name: "摊位", minimumLevel: 1, available: true };
    const unknownTab = { shopType: 101000, name: "英雄", minimumLevel: 1, available: false };
    const shelf = { shopType: tab.shopType, shelfVersion: 4_294_967_311, nextRefreshAt: 1710000000,
        currencyItemId: 900002, offers: [offer], tabs: [tab, unknownTab] };
    const buy = { requestId, shopType: tab.shopType, shelfVersion: shelf.shelfVersion, productId: offer.productId, count: 1 };
    const receipt = { requestId, roleId, assetRevision: 6, state: shelf };
    const request = { version: 1, kind: "request", id: "black-market" };
    const response = { ...request, kind: "response", ok: true };
    roundTrip({ ...request, name: Protocol.BLACK_MARKET_LIST, body: { shopType: tab.shopType } });
    roundTrip({ ...response, name: Protocol.BLACK_MARKET_LIST, body: shelf });
    roundTrip({ ...request, name: Protocol.BLACK_MARKET_BUY, body: buy });
    roundTrip({ ...response, name: Protocol.BLACK_MARKET_BUY, body: receipt });
    const preview = { ...shelf, shopType: unknownTab.shopType, nextRefreshAt: 0,
        offers: [{ ...offer, purchaseLimit: 0, purchased: 7, purchasable: false }] };
    roundTrip({ ...response, name: Protocol.BLACK_MARKET_LIST, body: preview });
    const frame = (mxzg as any).game.Frame;
    for (const invalid of [
        { ...shelf, shopType: 555555 },
        { ...shelf, nextRefreshAt: -1 },
        { ...shelf, tabs: [tab, tab] },
        { ...shelf, offers: [offer, offer] },
        { ...shelf, offers: [{ ...offer, purchased: 3 }] },
        { ...preview, offers: [offer] },
    ]) {
        const binary = frame.encode({ ...response, name: Protocol.BLACK_MARKET_LIST, blackMarketState: invalid }).finish();
        assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(binary));
    }
    for (const body of [{ ...buy, roleId }, { ...buy, count: 0 }, { ...buy, shopType: -1 }]) {
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, name: Protocol.BLACK_MARKET_BUY, body }));
    }
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, name: Protocol.BLACK_MARKET_BUY,
        body: { ...receipt, state: preview } }));
    if (process.argv.includes("--black-market-java")) {
        const javaFrame = GameProtocolCodecUtils.decodeGameFrame(readFileSync("backend/target/black-market-receipt.pb"));
        assert.equal(javaFrame.name, Protocol.BLACK_MARKET_BUY);
        assert.equal(javaFrame.kind, "response");
        assert.equal(javaFrame.ok, true);
        const javaReceipt = javaFrame.body as BlackMarketReceipt;
        assert.ok(javaReceipt.requestId && javaReceipt.roleId && javaReceipt.assetRevision > 0);
        assert.equal(javaReceipt.state.shopType, BLACK_MARKET_STALL);
        assert.ok(javaReceipt.state.nextRefreshAt > 0);
        assert.equal(javaReceipt.state.offers[0]?.purchased, 1);
        console.log("PASS Java/TS black market receipt");
    }
}

/** 校验装备预演、确认绑定版本与 Java 实际成交回执。 */
function checkSmithWire(): void {
    const requestId = "10000000-1111-4111-8111-111111111111";
    const roleId = "20000000-2222-4222-8222-222222222222";
    const request = { version: 1, kind: "request", id: "smith" };
    const response = { ...request, kind: "response", ok: true };
    const quote = { slot: 1, assetRevision: 1, goldCost: 10982, rewards: [{ itemId: 1001003, quantity: 1 }] };
    const command = { requestId, slot: 1, expectedRevision: 1 };
    const receipt = { requestId, roleId, ...quote, itemId: 0, count: 0, assetRevision: 2 };
    roundTrip({ ...request, name: Protocol.SMITH_PREVIEW, body: { slot: 1 } });
    roundTrip({ ...response, name: Protocol.SMITH_PREVIEW, body: quote });
    roundTrip({ ...request, name: Protocol.SMITH_FORGE, body: { requestId, itemId: 1001002, count: 1 } });
    roundTrip({ ...request, name: Protocol.SMITH_FORGE_ALL, body: command });
    roundTrip({ ...response, name: Protocol.SMITH_FORGE_ALL, body: receipt });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, name: Protocol.SMITH_FORGE_ALL,
        body: { ...command, expectedRevision: -1 } }));
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, name: Protocol.SMITH_FORGE_ALL,
        body: { ...receipt, itemId: 1001003 } }));
    if (process.argv.includes("--smith-java")) {
        const actual = GameProtocolCodecUtils.decodeGameFrame(readFileSync("backend/target/smith-receipt.pb"));
        assert.equal(actual.name, Protocol.SMITH_FORGE_ALL);
        assert.equal(actual.ok, true);
        assert.deepEqual((actual.body as typeof receipt).rewards, quote.rewards);
        console.log("PASS Java/TS smith equipment receipt");
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

/** 竞技场真人目标与机器人互斥，赛季周箱、防守与商店的新二进制载荷完整往返。 */
function checkArenaSeasonWire(): void {
    const requestId = "10000000-1111-4111-8111-111111111111";
    const self = "20000000-2222-4222-8222-222222222222";
    const target = "30000000-3333-4333-8333-333333333333";
    const request = { version: 1, kind: "request", id: "arena-request" };
    const response = { version: 1, kind: "response", id: "arena-request", ok: true };
    const ends = 1795708800;
    const reward = { itemId: 900901, quantity: 500 };
    const notice = { schemaVersion: 1, receiptId: target, requestId, roleId: self, assetRevision: 3,
        mode: "POPUP", items: [{ itemId: reward.itemId, credited: reward.quantity }], heroes: [] };
    const row = { rank: 1, roleId: target, name: "竞技测试", level: 20, score: 1200, power: 2200,
        headId: 1, borderId: 0, receivedLikes: 2, liked: true };
    const ranking = { entries: [row], own: { ...row, roleId: self, rank: 0, liked: false }, likesRemaining: 9, dailyEndsAt: ends };
    const tier = { minRank: 1, maxRank: 1, rewards: [reward] };
    const season = { seasonEndsAt: ends, dailyEndsAt: ends, seasonChallenges: 10,
        dailyTiers: [tier], seasonTiers: [tier], chests: [{ id: 1, requiredChallenges: 10, boxPic: 1, rewards: [reward], claimed: true }] };
    const defense = { formationId: 1, version: 1, slots: [{ position: 2, heroId: target }], fallback: false };
    const shop = { currencyBalance: 0, refreshAt: ends,
        offers: [{ id: 8, requiredLevel: 1, purchaseLimit: 0, purchased: 1, price: 250, rewards: [reward] }] };
    roundTrip({ ...request, name: Protocol.ARENA_CHALLENGE, body: { requestId, opponentId: 0, opponentRoleId: target } });
    roundTrip({ ...request, name: Protocol.ARENA_CHEST_CLAIM, body: { requestId, chestId: 1, seasonEndsAt: ends } });
    roundTrip({ ...request, name: Protocol.ARENA_LIKE, body: { requestId, targetRoleId: target, dailyEndsAt: ends } });
    roundTrip({ ...request, name: Protocol.ARENA_DEFENSE_SAVE,
        body: { requestId, expectedVersion: 0, formationId: defense.formationId, slots: defense.slots } });
    roundTrip({ ...request, name: Protocol.ARENA_SHOP_BUY, body: { requestId, offerId: 8, quantity: 1, refreshAt: ends } });
    roundTrip({ ...response, name: Protocol.ARENA_RANKING, body: ranking });
    roundTrip({ ...response, name: Protocol.ARENA_SEASON, body: season });
    roundTrip({ ...response, name: Protocol.ARENA_CHEST_CLAIM, body: { requestId, state: season, notice } });
    roundTrip({ ...response, name: Protocol.ARENA_LIKE, body: { requestId, ranking, notice } });
    roundTrip({ ...response, name: Protocol.ARENA_DEFENSE_SAVE, body: { requestId, defense } });
    roundTrip({ ...response, name: Protocol.ARENA_SHOP_BUY, body: { requestId, state: shop, notice } });
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...request, name: Protocol.ARENA_CHALLENGE,
        body: { requestId, opponentId: 1, opponentRoleId: target } }), /对手编号无效/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, name: Protocol.ARENA_DEFENSE,
        body: { ...defense, slots: [{ position: 9, heroId: target }] } }), /防守阵容无效/);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...response, name: Protocol.ARENA_SHOP_BUY,
        body: { requestId, state: shop, notice: { ...notice, requestId: target } } }), /操作回执不符/);
    if (process.argv.includes("--arena-java")) {
        const bytes = readFileSync("backend/target/arena-pvp-settlement.pb");
        const frame = GameProtocolCodecUtils.decodeGameFrame(bytes);
        assert.equal(frame.name, Protocol.ARENA_CHALLENGE);
        const receipt = frame.body as { replay: object; record: { opponentRoleId: string } };
        assert(receipt.record.opponentRoleId);
        const parsed = BattleReplayUtils.parse(BattleReplayUtils.encodeVerified(receipt.replay));
        assert.equal(parsed.maxRounds, 20);
        assert(parsed.units.some(unit => unit.faction === 1));
        assert(parsed.units.some(unit => unit.faction === 2));
        assert(parsed.steps.length > 0);
        console.log("PASS Java/TS authoritative player arena settlement and replay");
    }
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
checkDreamlandWire();
checkDreamlandSocialWire();
checkTrialWire();
checkDreamlandFormationPowerWire();
main();
