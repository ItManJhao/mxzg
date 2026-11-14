/**
 * 新挂机领取二进制边界专项：核对请求、历史回执、status条件及安全整数，不开启按钮或联网发包。
 * --idle-claim-wire仅消费本次Java测试输出的真实PB字节，确认实际发放和字符串实例ID跨语言不变。
 * --idle-claim-socket-wire分别核对真实WS用例A的回执/事件与用例B的status/重连首包，不混用两组角色。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { mxzg } from "../assets/scripts/platform/GameProtocol.generated";

/** 同一业务意图键在claim、status及历史回执中保持一致。 */
const requestId = "12345678-1234-1234-1234-123456789abc";
/** 超过JS安全整数的实例ID必须保持文本。 */
const instanceId = "9223372036854775807";
/** 真实发放最小强类型夹具，空集合是明确的本次没有该类型结果。 */
const actual = {
    roleId: "protocol-role",
    items: [{ itemId: 900003, requested: 10, credited: 10, ignored: 0, reason: "NONE" }],
    wallet: { goldBefore: 1, diamondsBefore: 2, goldAfter: 1, diamondsAfter: 5 },
    stacks: [{ itemId: 900101, instanceId: "stack:role:900101", beforeQuantity: 1, quantity: 2, afterQuantity: 3 }],
    experience: [{ beforeLevel: 1, beforeExperience: 0, requested: 10, accepted: 10, ignored: 0, level: 2, experience: 0, diamonds: 3 }],
    tavern: [{ beforeQuantity: 0, limit: 11000, afterQuantity: 0 }],
    bonuses: [{ source: "ROLE_LEVEL_UP", itemId: 900002, quantity: 3 }],
    timedItems: [{ instanceId, itemId: 1000001, activeAtSeconds: 100, expiresAtSeconds: 200 }],
    spirits: { schemaVersion: 1, items: [{ instanceId, itemId: 2000002, abilityId: 1, skills: [{ sort: 1, skillId: 1, level: 1 }] }] },
};
/** 历史receipt只描述已提交领取，assetRevision与操作版本各自有独立含义。 */
const receipt = {
    schemaVersion: 1, requestId, receiptId: "22345678-1234-1234-1234-123456789abc",
    expectedOperationVersion: 3, beforeOperationVersion: 3, afterOperationVersion: 4,
    committedAtSeconds: 160, previousStartedAtSeconds: 100, seconds: 60,
    maxSeconds: 43200, rewardStage: 1, assetRevision: 7,
    theoreticalRewards: [{ itemId: 900003, quantity: 10 }], actual,
    experience: { beforeLevel: 1, beforeExp: 0, beforeThreshold: 10, afterLevel: 2, afterExp: 0, afterThreshold: 20 },
};

/** 生成待编码的内部信封，成功响应显式携带ok，不使用网络凭证。 */
function frame(kind: string, name: string, body: unknown): GameFrame {
    return { version: 1, kind, name, id: requestId, ...(kind === "response" ? { ok: true } : {}), body };
}

/** 编解码往返必须保留类型和全部历史明细，不额外注入当前状态。 */
function roundTrip(value: GameFrame): void {
    assert.deepEqual(GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame(value)), value);
}

/** 校验服务端实际生成的历史回执与status字节，要求两份receipt逐字段相等。 */
function checkJavaWire(): void {
    const claim = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync("backend/target/idle-claim-receipt.pb")));
    const status = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync("backend/target/idle-claim-status.pb")));
    assert.equal(claim.name, Protocol.CHAPTER_IDLE_CLAIM);
    assert.equal(status.name, Protocol.CHAPTER_IDLE_CLAIM_STATUS);
    assert.deepEqual(claim.body, receipt);
    assert.deepEqual(status.body, { requestId, status: "COMMITTED", receipt });
    assert.equal(typeof (claim.body as typeof receipt).actual.spirits.items[0].instanceId, "string");
    console.log("PASS Java/TS idle claim binary receipt/status and frozen actual details");
}

/** 检查真实明细的数量/版本标量，不将数字字符串或不安全整数解释为已确认资产。 */
function assertSafeQuantity(value: unknown, minimum = 0): asserts value is number {
    assert.equal(typeof value, "number");
    assert(Number.isSafeInteger(value));
    assert((value as number) >= minimum);
}

/** 验证真实发放明细的结构及数量关系；实例可能未随机命中，空实例集合保持明确空集合。 */
function assertActualDetails(value: typeof receipt): void {
    assert.equal(typeof value.actual.roleId, "string");
    assert(value.actual.roleId.length > 0);
    assertSafeQuantity(value.previousStartedAtSeconds);
    assertSafeQuantity(value.committedAtSeconds);
    assertSafeQuantity(value.seconds, 1);
    assertSafeQuantity(value.maxSeconds, 1);
    assert(value.seconds <= value.maxSeconds);
    assert(value.committedAtSeconds - value.previousStartedAtSeconds >= value.seconds);
    assert(Array.isArray(value.theoreticalRewards));
    assert(Array.isArray(value.actual.items));
    assert(value.actual.items.length > 0);
    const theoretical = new Map(value.theoreticalRewards.map(row => [row.itemId, row.quantity]));
    assert.equal(theoretical.size, value.theoreticalRewards.length);
    assert.equal(value.actual.items.length, theoretical.size);
    for (const row of value.actual.items) {
        assertSafeQuantity(row.itemId, 1);
        assertSafeQuantity(row.requested, 1);
        assertSafeQuantity(row.credited);
        assertSafeQuantity(row.ignored);
        assert.equal(row.requested, row.credited + row.ignored);
        assert.equal(row.requested, theoretical.get(row.itemId));
        assert(["NONE", "ROLE_MAX_LEVEL", "TAVERN_CAP"].includes(row.reason));
    }
    for (const amount of Object.values(value.actual.wallet)) {
        assertSafeQuantity(amount);
    }
    assert(Array.isArray(value.actual.stacks));
    for (const row of value.actual.stacks) {
        assertSafeQuantity(row.itemId, 1);
        assert.equal(typeof row.instanceId, "string");
        assert(row.instanceId.length > 0);
        assertSafeQuantity(row.beforeQuantity);
        assertSafeQuantity(row.quantity, 1);
        assertSafeQuantity(row.afterQuantity);
        assert.equal(row.afterQuantity, row.beforeQuantity + row.quantity);
    }
    assert(Array.isArray(value.actual.experience));
    for (const row of value.actual.experience) {
        assertSafeQuantity(row.beforeLevel, 1);
        assertSafeQuantity(row.level, row.beforeLevel);
        for (const amount of [row.beforeExperience, row.accepted, row.ignored, row.experience, row.diamonds]) {
            assertSafeQuantity(amount);
        }
        assertSafeQuantity(row.requested, 1);
        assert.equal(row.requested, row.accepted + row.ignored);
    }
    assert(Array.isArray(value.actual.tavern));
    for (const row of value.actual.tavern) {
        assertSafeQuantity(row.beforeQuantity);
        assertSafeQuantity(row.limit);
        assertSafeQuantity(row.afterQuantity, row.beforeQuantity);
    }
    assert(Array.isArray(value.actual.bonuses));
    for (const row of value.actual.bonuses) {
        assert.equal(row.source, "ROLE_LEVEL_UP");
        assert.equal(row.itemId, 900002);
        assertSafeQuantity(row.quantity, 1);
    }
    assert(Array.isArray(value.actual.timedItems));
    for (const row of value.actual.timedItems) {
        assert.equal(typeof row.instanceId, "string");
        assert(row.instanceId.length > 0);
        assertSafeQuantity(row.itemId, 1);
        assertSafeQuantity(row.activeAtSeconds);
        assertSafeQuantity(row.expiresAtSeconds, row.activeAtSeconds + 1);
    }
    assert.equal(value.actual.spirits.schemaVersion, 1);
    assert(Array.isArray(value.actual.spirits.items));
    for (const row of value.actual.spirits.items) {
        assert.equal(typeof row.instanceId, "string");
        assert(row.instanceId.length > 0);
        assert.equal(row.itemId, 2000002);
        assertSafeQuantity(row.abilityId, 1);
        assert(Array.isArray(row.skills));
        for (const skill of row.skills) {
            assertSafeQuantity(skill.sort, 1);
            assertSafeQuantity(skill.skillId, 1);
            assertSafeQuantity(skill.level, 1);
        }
    }
}

/** 当前统一快照只需达到历史回执确认条件，允许其资产版本和消费版本已经继续前进。 */
function assertSnapshotConfirms(snapshot: unknown, committed: typeof receipt): void {
    const current = snapshot as {
        role: { id: string };
        revision: number;
        mainChapterIdle: { serverTime: number; startedAt: number;
            claimState: { schemaVersion: number; operationVersion: number; requestMode: string } };
    };
    assert.equal(current.role.id, committed.actual.roleId);
    assertSafeQuantity(current.revision, committed.assetRevision);
    assert.equal(current.mainChapterIdle.claimState.schemaVersion, 1);
    assertSafeQuantity(current.mainChapterIdle.claimState.operationVersion, committed.afterOperationVersion);
    assert.equal(current.mainChapterIdle.claimState.requestMode, "ENABLED");
    assertSafeQuantity(current.mainChapterIdle.startedAt, committed.committedAtSeconds);
    assertSafeQuantity(current.mainChapterIdle.serverTime, current.mainChapterIdle.startedAt);
    assertActualDetails(committed);
}

/** 分开读取两组真实WS夹具：A确认提交事件，B确认丢通知后的status及重新鉴权首包。 */
function checkSocketWire(): void {
    const claim = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync("backend/target/main-idle-claim-receipt.pb")));
    const event = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync("backend/target/main-idle-claim-event.pb")));
    assert.equal(claim.name, Protocol.CHAPTER_IDLE_CLAIM);
    assert.equal(claim.kind, "response");
    assert.equal(claim.ok, true);
    assert.equal(event.name, Protocol.STATE_CHANGED);
    assert.equal(event.kind, "event");
    assertSnapshotConfirms(event.body, claim.body as typeof receipt);

    const status = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync("backend/target/main-idle-claim-status.pb")));
    const restored = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync("backend/target/main-idle-claim-restored.pb")));
    assert.equal(status.name, Protocol.CHAPTER_IDLE_CLAIM_STATUS);
    assert.equal(status.kind, "response");
    assert.equal(status.ok, true);
    const confirmation = status.body as { requestId: string; status: string; receipt: typeof receipt };
    assert.equal(confirmation.status, "COMMITTED");
    assert.equal(confirmation.requestId, confirmation.receipt.requestId);
    assert.equal(restored.name, Protocol.SESSION_AUTHENTICATE);
    assert.equal(restored.kind, "response");
    assert.equal(restored.ok, true);
    const accepted = restored.body as { roleId: string; initial: unknown; session?: unknown };
    assert.equal(accepted.session, undefined, "恢复夹具不能携带新签发的session凭证");
    assert.equal(accepted.roleId, confirmation.receipt.actual.roleId);
    assertSnapshotConfirms(accepted.initial, confirmation.receipt);
    console.log("PASS Java/TS actual WS claim/event and separate status/reconnect confirmation pairs");
}

/** 执行协议边界与拒绝场景；不访问服务器、日常玩家库或本地持久待确认记录。 */
function main(): void {
    roundTrip(frame("request", Protocol.CHAPTER_IDLE_CLAIM, { requestId, expectedOperationVersion: Number.MAX_SAFE_INTEGER }));
    roundTrip(frame("request", Protocol.CHAPTER_IDLE_CLAIM_STATUS, { requestId }));
    roundTrip(frame("response", Protocol.CHAPTER_IDLE_CLAIM, receipt));
    roundTrip(frame("response", Protocol.CHAPTER_IDLE_CLAIM_STATUS, { requestId, status: "COMMITTED", receipt }));
    roundTrip(frame("response", Protocol.CHAPTER_IDLE_CLAIM_STATUS, { requestId, status: "NOT_FOUND" }));
    for (const expectedOperationVersion of [undefined, 0, -1, "1", Number.MAX_SAFE_INTEGER + 1]) {
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame(frame("request", Protocol.CHAPTER_IDLE_CLAIM,
            { requestId, expectedOperationVersion })));
    }
    for (const body of [
        { requestId, status: "PENDING" },
        { requestId, status: "COMMITTED" },
        { requestId, status: "NOT_FOUND", receipt },
        { requestId, status: "COMMITTED", receipt: { ...receipt, requestId: receipt.receiptId } },
    ]) {
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame(frame("response", Protocol.CHAPTER_IDLE_CLAIM_STATUS, body)));
    }
    for (const body of [
        { ...receipt, schemaVersion: 2 },
        { ...receipt, beforeOperationVersion: 0 },
        { ...receipt, expectedOperationVersion: 2 },
        { ...receipt, afterOperationVersion: 5 },
        { ...receipt, assetRevision: Number.MAX_SAFE_INTEGER + 1 },
    ]) {
        assert.throws(() => GameProtocolCodecUtils.encodeGameFrame(frame("response", Protocol.CHAPTER_IDLE_CLAIM, body)));
    }
    const generated = (mxzg as any).game.Frame;
    const unsafe = generated.encode(generated.fromObject({ version: 1, kind: "request", name: Protocol.CHAPTER_IDLE_CLAIM,
        chapterIdleClaim: { requestId, expectedOperationVersion: "9007199254740993" } })).finish();
    assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(unsafe));
    const wrongPayload = generated.encode({ version: 1, kind: "request", name: Protocol.CHAPTER_IDLE_CLAIM, empty: {} }).finish();
    assert.throws(() => GameProtocolCodecUtils.decodeGameFrame(wrongPayload));
    console.log("PASS idle claim/status binary schemas, safe versions, receipt consistency and string instance IDs");
    if (process.argv.includes("--idle-claim-wire")) {
        checkJavaWire();
    }
    if (process.argv.includes("--idle-claim-socket-wire")) {
        checkSocketWire();
    }
}

main();
