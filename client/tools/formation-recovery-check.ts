/**
 * 阵容保存专项：用真实二进制回包验证通用快照顺序、无变化保存和错误回包。
 * 跨账号与真实连接重连由会话和页面生命周期专项覆盖。
 */
import { strict as assert } from "node:assert";
import { FormationController } from "../assets/scripts/features/hero/FormationController";
import { FormationSaveModel } from "../assets/scripts/features/hero/FormationSaveModel";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import type { FormationSaveRequest } from "../assets/scripts/features/hero/data/FormationData";
import { FormationEvent } from "../assets/scripts/features/hero/utils/FormationEvent";
import { HeroRosterEvent } from "../assets/scripts/features/hero/utils/HeroRosterEvent";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";

const HERO = { id: "11111111-1111-4111-8111-111111111111", templateId: 10105008, level: 1, star: 5 };
const DRAFT = { expectedVersion: 3, formationId: 1, slots: [{ position: 3, heroId: HERO.id }] };
const OTHER_REQUEST_ID = "22222222-2222-4222-8222-222222222222";

/** 模拟统一状态入口提交已通过校验的阵容，保存回包不能直接写入名册。 */
function applyRoster(heroes: HeroRosterModel, version: number): void {
    heroes.replace({
        status: "ready",
        heroes: [HERO],
        error: "",
        mainFormation: {
            version,
            formationId: 1,
            slots: version > DRAFT.expectedVersion ? DRAFT.slots : [],
            unlockedIds: [1],
            assistanceUnlocked: false,
            options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }],
        },
    });
    EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: heroes.version });
}

/** 通过真实协议编解码交付服务器成功回包。 */
function receipt(requestId: string, version: number): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
        version: 1, kind: "response", name: Protocol.FORMATION_SAVE, ok: true,
        body: { requestId, version },
    }));
}

type SaveResult = (request: FormationSaveRequest, heroes: HeroRosterModel) => GameFrame;

/** 各案例使用已初始化的生产模块，并记录实际发送数量及失败回调。 */
function fixture(result: SaveResult) {
    const heroes = new HeroRosterModel();
    const saves = new FormationSaveModel();
    const controller = new FormationController(saves, heroes);
    const failures: unknown[] = [];
    const requests: FormationSaveRequest[] = [];
    controller.configure({
        async deliver(protocol, body, received, failed) {
            assert.equal(protocol, Protocol.FORMATION_SAVE);
            const request = GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({
                version: 1, kind: "request", name: Protocol.FORMATION_SAVE, body,
            })).body as FormationSaveRequest;
            requests.push(request);
            try {
                received(result(request, heroes));
            } catch (error) {
                failures.push(error);
                failed(error);
            }
        },
    });
    controller.initialize();
    applyRoster(heroes, DRAFT.expectedVersion);
    return { controller, heroes, saves, failures, requests };
}

/** 验证状态先到、阵容不变、服务器拒绝和旧会话异步发送。 */
async function main(): Promise<void> {
    const cases: Array<[string, SaveResult, { busy: boolean; savedVersion: number | null }]> = [
        ["快照早于回包", (request, heroes) => {
            applyRoster(heroes, 4);
            return receipt(request.requestId, 4);
        }, { busy: false, savedVersion: 4 }],
        ["没有改动时版本不递增", request => receipt(request.requestId, 3), { busy: false, savedVersion: 3 }],
        ["请求编号不匹配", () => receipt(OTHER_REQUEST_ID, 4), { busy: false, savedVersion: null }],
        ["版本早于草稿", request => receipt(request.requestId, 2), { busy: false, savedVersion: null }],
        ["服务器拒绝", () => { throw new SocketFailure("FORMATION_CHANGED"); }, { busy: false, savedVersion: null }],
    ];
    for (const [description, result, expected] of cases) {
        const test = fixture(result);
        try {
            const statuses: boolean[] = [];
            const stop = EventDispatcher.instance.on(FormationEvent.SaveChanged, statuses, () => {
                statuses.push(test.saves.snapshot.busy);
            });
            try {
                await test.controller.save(DRAFT);
                assert.deepEqual(test.saves.snapshot, expected, description);
                assert.equal(test.requests.length, 1, description);
                assert.equal(test.failures.length, expected.savedVersion === null ? 1 : 0, description);
                applyRoster(test.heroes, 9);
                assert.deepEqual(statuses, [true, false], "后续权威状态不重复成功通知");
            } finally {
                stop();
            }
        } finally {
            test.controller.dispose();
        }
    }

    const test = fixture(request => receipt(request.requestId, 3));
    try {
        const saving = test.controller.save(DRAFT);
        test.controller.resetSession();
        await saving;
        assert.equal(test.requests.length, 0, "发送前注销会丢弃旧页面的操作");
        assert.deepEqual(test.saves.snapshot, { busy: false, savedVersion: null });
    } finally {
        test.controller.dispose();
    }
    console.log("PASS formation save: snapshot order, unchanged version, authoritative rejection, logout before send");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
