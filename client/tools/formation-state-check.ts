/** 阵容模块回归：核对一次保存、在途防重和统一权威阵容确认。 */
import { strict as assert } from "node:assert";
import { FormationController } from "../assets/scripts/features/hero/FormationController";
import { FormationSaveModel } from "../assets/scripts/features/hero/FormationSaveModel";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { EventDispatcher } from "../assets/scripts/framework/EventDispatcher";
import { HeroRosterEvent } from "../assets/scripts/features/hero/utils/HeroRosterEvent";
import { FormationEvent } from "../assets/scripts/features/hero/utils/FormationEvent";
import { Protocol } from "../assets/scripts/platform/Protocol";
import { GameProtocolCodecUtils, GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import type { FormationSaveRequest } from "../assets/scripts/features/hero/data/FormationData";

const hero = { id: "00000000-0000-4000-8000-000000000001", templateId: 10105008, level: 1, star: 5 };
const draft = { expectedVersion: 0, formationId: 1, slots: [{ position: 2, heroId: hero.id }] };
/** 权威Model只能由同步流程写入，本测试模拟已校验的模块提交。 */
function sync(model: HeroRosterModel, version: number): void {
    model.replace({ status: "ready", heroes: [hero], error: "", mainFormation: { version,
        slots: version ? draft.slots : [], formationId: 1, unlockedIds: [1], assistanceUnlocked: false,
        options: [{ formationId: 1, openPositions: [2, 3, 5, 6, 7, 8] }],
    } });
    EventDispatcher.instance.emit(HeroRosterEvent.Updated, { revision: model.version });
}
/** 通过真实二进制编码生成回执，模块仍须校验关联。 */
function receipt(body: FormationSaveRequest): GameFrame {
    return GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame({ version: 1, kind: "response", name: Protocol.FORMATION_SAVE,
        id: "response", ok: true, body: { requestId: body.requestId, version: 1 } }));
}
/** 每个用例使用独立模块和Model，不依赖账号或UI。 */
function setup(send: (body: FormationSaveRequest) => Promise<GameFrame>) {
    const heroes = new HeroRosterModel(), saves = new FormationSaveModel();
    heroes.reset(); sync(heroes, 0);
    const controller = new FormationController(saves, heroes);
    controller.configure({
        async deliver(name, body, received, failed) {
            assert.equal(name, Protocol.FORMATION_SAVE);
            try {
                received(await send(body as FormationSaveRequest));
            } catch (error) {
                failed(error);
            }
        },
    });
    controller.initialize();
    controller.resetSession();
    return { heroes, saves, controller };
}

/** 等待本轮已登记任务进入交付口，不提前等待仍由用例控制的网络结果。 */
async function settleTasks(): Promise<void> {
    await new Promise<void>(resolve => setImmediate(resolve));
}

/** 单次提交期间合并连点，按服务器确认版本结束等待。 */
async function main(): Promise<void> {
    const requests: FormationSaveRequest[] = [];
    let finish!: (frame: GameFrame) => void;
    const pending = setup(body => {
        requests.push(body);
        return new Promise(resolve => { finish = resolve; });
    });
    try {
        const first = pending.controller.save(draft);
        assert.equal(first, pending.controller.save(draft));
        await settleTasks();
        assert.equal(requests.length, 1);
        assert.match(requests[0].requestId, /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i);
        finish(receipt(requests[0]));
        await first;
        assert.equal(pending.heroes.snapshot.mainFormation!.version, 0, "回包不能写权威阵容");
        assert.deepEqual(pending.saves.snapshot, { busy: true, savedVersion: 1 });
        await pending.controller.save({ ...draft, slots: [] });
        assert.equal(requests.length, 1, "等待权威状态期间不重复保存");
        sync(pending.heroes, 1);
        assert.deepEqual(pending.saves.snapshot, { busy: false, savedVersion: 1 });
    } finally {
        pending.controller.dispose();
    }
    assert.equal(EventDispatcher.instance.targetListenerCount(pending.controller), 0);
    assert.equal("view" in pending.controller, false);

    let fail = true;
    const later: FormationSaveRequest[] = [];
    const disconnected = setup(async body => {
        later.push(structuredClone(body));
        if (fail) {
            throw new Error("断线");
        }
        return receipt(body);
    });
    try {
        await disconnected.controller.save(draft);
        assert.deepEqual(disconnected.saves.snapshot, { busy: false, savedVersion: null });
        const owner = {};
        let notices = 0;
        EventDispatcher.instance.on(FormationEvent.SaveChanged, owner, () => notices++);
        EventDispatcher.instance.offTarget(owner);
        fail = false;
        await disconnected.controller.save({ ...draft, slots: [{ ...draft.slots[0], position: 3 }] });
        assert.notEqual(later[1].requestId, later[0].requestId);
        assert.equal(later[1].slots[0].position, 3);
        assert.equal(notices, 0, "关页释放监听，模块仍能完成保存");
    } finally {
        disconnected.controller.dispose();
    }
    console.log("PASS formation module: one send, concurrent click protection, authoritative confirmation and current draft");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
