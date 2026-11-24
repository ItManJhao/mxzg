/**
 * 英雄普通升级与进阶专项，使用实际控制器和 Protobuf 编解码。
 * 覆盖报价、单次请求、成功反馈和断线后由统一快照恢复。
 */
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { BagModel } from "../assets/scripts/features/bag/BagModel";
import { HeroLevelController } from "../assets/scripts/features/hero/HeroLevelController";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import type { HeroLevelRequest, HeroStageReceipt } from "../assets/scripts/features/hero/data/HeroLevelData";
import { HeroLevelEvent } from "../assets/scripts/features/hero/utils/HeroLevelEvent";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { ProtocolRouter } from "../assets/scripts/platform/ProtocolRouter";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

const HERO = { id: "11111111-1111-4111-8111-111111111111", templateId: 10304012, level: 1, star: 4, stage: 0 };
const ROLE = { id: "33333333-3333-4333-8333-333333333333", nickname: "测试", level: 1, gold: 4000, diamonds: 0 };

/** 校验真实请求和回包可在同名的独立 Protobuf 载荷中往返。 */
function roundTrip(
    kind: "request" | "response",
    body: unknown,
    name: GameFrame["name"] = Protocol.HERO_LEVEL_UPGRADE,
): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
        version: 1, kind, name, ...(kind === "response" ? { ok: true } : {}), body,
    }));
}

/** 返回测试服务端的成功回包，其中的等级和版本只用于本次操作反馈。 */
function success(request: HeroLevelRequest): GameFrame {
    return roundTrip("response", {
        requestId: request.requestId, heroId: request.heroId, roleId: ROLE.id,
        fromLevel: request.expectedLevel, toLevel: request.expectedLevel + request.levels,
        configVersion: "hero-growth-test", assetRevision: 8,
    });
}

class Fixture {
    /** 当前角色的权威钱包。 */
    public readonly account = new AccountModel();
    /** 当前英雄的服务端名册。 */
    public readonly roster = new HeroRosterModel();
    /** 当前角色的英雄经验库存。 */
    public readonly bag = new BagModel();
    /** 每个用例单独装配的升级入口。 */
    public readonly controller = new HeroLevelController(this.roster, this.bag);
    /** 经 Protobuf 投影的普通升级请求。 */
    public readonly sent: HeroLevelRequest[] = [];
    /** 经 Protobuf 投影的进阶请求。 */
    public readonly stageSent: { requestId: string; heroId: string; expectedStage: number }[] = [];
    /** 从真实成功回包交付给详情的光效事件。 */
    public readonly completed: unknown[] = [];
    /** 把测试回包交给本次请求的校验与协议路由。 */
    public reply!: (frame: GameFrame) => void;
    /** 将服务端拒绝或断线交给本次请求的失败回调。 */
    public fail!: (error: unknown) => void;

    /** 使用权威快照报价，由用例决定何时送达成功或失败回包。 */
    public constructor() {
        this.account.replace({ busy: false, error: "", role: ROLE });
        this.apply(1, 500);
        this.controller.configure({
            send: (receiver, name, raw, failed, validate) => {
                const body = roundTrip("request", { ...raw, requestId: randomUUID() }, name).body;
                if (name === Protocol.HERO_STAGE_ADVANCE) {
                    assert.deepEqual(Object.keys(raw).sort(), ["expectedStage", "heroId"]);
                    this.stageSent.push(body as Fixture["stageSent"][number]);
                } else {
                    assert.equal(name, Protocol.HERO_LEVEL_UPGRADE);
                    assert.deepEqual(Object.keys(raw).sort(), ["expectedLevel", "heroId", "levels"]);
                    this.sent.push(body as HeroLevelRequest);
                }
                this.fail = failed;
                this.reply = frame => {
                    try {
                        validate?.(frame.body);
                        ProtocolRouter.instance.dispatch(receiver, frame);
                    } catch (error) {
                        failed(error);
                    }
                };
            },
        }, this.account);
        this.controller.initialize();
        EventDispatcher.instance.on(HeroLevelEvent.Updated, this, event => {
            if (event.heroId) {
                this.completed.push(event);
            }
        });
    }

    /** 模拟统一快照已同步名册与背包，余额取两份独立 Model。 */
    public apply(level: number, heroExp: number): void {
        this.roster.replace({ status: "ready", heroes: [{ ...HERO, level }], error: "" });
        this.bag.replaceAll([{ itemId: 900101, quantity: heroExp }]);
    }

    /** 释放本场景的协议和事件监听。 */
    public dispose(): void {
        this.controller.dispose();
        EventDispatcher.instance.offTarget(this);
    }
}

/** 读实时钱包和背包报价，余额不足时也把明确的一级意图交服务器判定。 */
function quotesAndSubmits(fixture: Fixture): void {
    fixture.bag.reset();
    assert.equal(fixture.controller.describe(HERO.id).status, "unavailable");
    fixture.bag.replaceAll([{ itemId: 900302, quantity: 500 }]);
    const insufficient = fixture.controller.describe(HERO.id);
    assert.equal(insufficient.levels, 0);
    assert.equal(insufficient.heroExpEnough, false);
    fixture.controller.upgrade(HERO.id);
    assert.equal(fixture.sent.length, 1);
    assert.equal(fixture.sent[0].levels, 1);
    fixture.fail(new SocketFailure("INSUFFICIENT_HERO_EXP", "英雄经验不足"));
    assert.equal(fixture.completed.length, 0);
    fixture.apply(1, 500);
    const ready = fixture.controller.describe(HERO.id);
    assert.equal(ready.levels, 5);
    assert.equal(ready.heroExp, 105);
    fixture.account.replace({ busy: false, error: "", role: { ...ROLE, gold: 0 } });
    assert.equal(fixture.controller.describe(HERO.id).goldEnough, false);
}

/** 连点只发送一笔，成功回包只触发光效；资产仍等待统一快照。 */
function updatesOnlyFromSnapshot(fixture: Fixture): void {
    fixture.controller.upgrade(HERO.id);
    fixture.controller.upgrade(HERO.id);
    assert.equal(fixture.controller.busy, true);
    assert.equal(fixture.controller.describe(HERO.id).status, "ready");
    assert.equal(fixture.controller.describe(HERO.id).heroExp, 105);
    assert.equal(fixture.sent.length, 1);
    fixture.reply(success(fixture.sent[0]));
    assert.equal(fixture.controller.busy, false);
    assert.deepEqual(fixture.completed, [{ heroId: HERO.id, fromLevel: 1, toLevel: 6 }]);
    assert.equal(fixture.roster.snapshot.heroes[0].level, 1);
    assert.equal(fixture.bag.quantity(900101), 500);
    fixture.apply(6, 395);
    assert.equal(fixture.roster.snapshot.heroes[0].level, 6);
    assert.equal(fixture.bag.quantity(900101), 395);
    assert.equal(fixture.sent.length, 1);
}

/** 断线后只接收鉴权首包，直接使用新的等级及余额。 */
function acceptsReconnectSnapshot(fixture: Fixture): void {
    fixture.controller.upgrade(HERO.id);
    fixture.fail(new SocketFailure("DISCONNECTED"));
    fixture.apply(6, 395);
    assert.equal(fixture.controller.describe(HERO.id).fromLevel, 6);
    assert.equal(fixture.sent.length, 1);
    assert.equal(fixture.completed.length, 0);
}

/** 操作编号相同但英雄或等级不匹配时恢复按钮，不播放错误光效。 */
function rejectsOtherUpgrade(fixture: Fixture): void {
    for (const fields of [{ heroId: ROLE.id }, { expectedLevel: 2 }, { levels: 1 }]) {
        fixture.controller.upgrade(HERO.id);
        const request = fixture.sent[fixture.sent.length - 1];
        fixture.reply(success({ ...request, ...fields }));
        assert.equal(fixture.completed.length, 0);
        assert.equal(fixture.controller.describe(HERO.id).status, "ready");
    }
    assert.equal(fixture.sent.length, 3);
}

/** 进阶只接受匹配回执且只提交一次，成功后等待权威快照更新阶级及库存。 */
function stageUsesAuthoritativeSnapshot(fixture: Fixture): void {
    fixture.account.replace({ busy: false, error: "", role: { ...ROLE, gold: 10000 } });
    fixture.roster.replace({ status: "ready", heroes: [{ ...HERO, level: 30 }], error: "" });
    fixture.bag.replaceAll([{ itemId: 900102, quantity: 49 }]);
    fixture.controller.advanceStage(HERO.id);
    assert.equal(fixture.stageSent.length, 0);
    fixture.bag.replaceAll([{ itemId: 900102, quantity: 50 }]);
    fixture.controller.advanceStage(HERO.id);
    fixture.controller.advanceStage(HERO.id);
    assert.equal(fixture.stageSent.length, 1);
    assert.equal(fixture.controller.busy, true);
    assert.equal(fixture.controller.describeStage(HERO.id).status, "ready");
    assert.equal(fixture.controller.describeStage(HERO.id).stone, 50);
    const { requestId } = fixture.stageSent[0];
    const receipt: HeroStageReceipt = {
        requestId, heroId: HERO.id, fromStage: 0, toStage: 1, roleId: ROLE.id,
        configVersion: "hero-growth-test", assetRevision: 8,
    };
    assert.throws(() => roundTrip("response", { ...receipt, toStage: 2 }, Protocol.HERO_STAGE_ADVANCE));
    const status = { requestId, found: true, receipt };
    assert.deepEqual(roundTrip("response", status, Protocol.HERO_STAGE_ADVANCE_STATUS).body, status);
    fixture.reply(roundTrip("response", receipt, Protocol.HERO_STAGE_ADVANCE));
    assert.equal(fixture.controller.busy, false);
    assert.deepEqual(fixture.completed, [{ heroId: HERO.id, fromStage: 0, toStage: 1 }]);
    assert.equal(fixture.roster.snapshot.heroes[0].stage, 0);
    assert.equal(fixture.bag.quantity(900102), 50);
    fixture.roster.replace({ status: "ready", heroes: [{ ...HERO, level: 30, stage: 1 }], error: "" });
    fixture.bag.replaceAll([]);
    assert.equal(fixture.controller.describeStage(HERO.id).status, "locked");
    assert.equal(fixture.controller.describe(HERO.id).levelLimit, 40);
}

/** 隔离运行成长场景，核对失败提示和成功展示。 */
async function main(): Promise<void> {
    await ConfigFixtureUtils.installReal();
    const toast = UIManager.instance.toast;
    const messages: string[] = [];
    UIManager.instance.toast = text => { messages.push(text); };
    try {
        for (const check of [quotesAndSubmits, updatesOnlyFromSnapshot, acceptsReconnectSnapshot,
            rejectsOtherUpgrade, stageUsesAuthoritativeSnapshot]) {
            const fixture = new Fixture();
            try {
                check(fixture);
            } finally {
                fixture.dispose();
            }
        }
        assert.deepEqual(messages, ["英雄经验不足", "升级结果待同步，恢复连接后请查看英雄等级",
            ...Array(3).fill("升级回执与本次请求不符"), "英雄进阶石不足"]);
    } finally {
        UIManager.instance.toast = toast;
    }
    console.log("PASS hero growth: request validation, single submission, receipt and authoritative snapshot");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
