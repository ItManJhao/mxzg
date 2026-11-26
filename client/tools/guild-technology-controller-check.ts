/** 验证公会科技重试保持原请求号，并在钱包、贡献和战力同步后一次交付新进度。 */
import { strict as assert } from "node:assert";
import type { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { GuildTechnologyController } from "../assets/scripts/features/guild/GuildTechnologyController";
import { GuildTechnologyModel } from "../assets/scripts/features/guild/GuildTechnologyModel";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol, type AuthenticatedGameProtocol, type GuildTechnologyState } from "../assets/scripts/platform/Protocol";

/** 构造首次战士点亮前后的四职业整树。 */
function snapshot(step: number): GuildTechnologyState {
    return {
        version: step, member: true, maxStage: 60, stageGap: 15, resetDiamonds: 500,
        branches: Array.from({ length: 4 }, (_, index) => {
            const lit = index === 0 ? step : 0;
            return {
                profession: index + 1, stage: 1, step: lit,
                nodes: [102, 201, 207, 222, 101, 270].map((attributeId, slot) => ({
                    slot: slot + 1, attributeId, level: slot < lit ? 1 : 0, increment: 30, total: slot < lit ? 30 : 0,
                })),
                next: { stage: 1, slot: lit + 1, gold: lit ? 22_000 : 18_000, medals: 30, blocked: false },
                refundGold: lit * 18_000, refundMedals: lit * 30,
            };
        }),
    };
}

/** 模拟掉线、原交易补读和稍后到达的真实资产版本。 */
function run(): void {
    const controller = new GuildTechnologyController();
    const model = GuildTechnologyModel.instance;
    const requests: { name: AuthenticatedGameProtocol; body: object; reply: (body: unknown) => void;
        fail: (error: Error) => void }[] = [];
    const operations: Pick<AccountOperations, "deliver"> = {
        async deliver(name, body, received, failed): Promise<void> {
            requests.push({ name, body: body as object,
                reply: state => received({ version: 1, ok: true, kind: "response", name, body: state }), fail: failed });
        },
    };
    const toasts: string[] = [];
    const originalToast = UIManager.instance.toast;
    UIManager.instance.toast = text => { toasts.push(text); };
    try {
        controller.configure(operations as AccountOperations);
        controller.initialize();
        controller.observeAssets(3);
        controller.setVisible(true);
        const initial = requests.shift();
        assert.equal(initial?.name, Protocol.GUILD_TECHNOLOGY_INFO);
        initial?.reply(snapshot(0));
        controller.upgrade(1);
        const first = requests.shift();
        assert.equal(first?.name, Protocol.GUILD_TECHNOLOGY_UPGRADE);
        first?.fail(new SocketFailure("DISCONNECTED", "连接已断开"));
        assert.equal(controller.needsRetry, true);
        controller.refreshVisible();
        const retried = requests.shift();
        assert.deepEqual(retried?.body, first?.body);
        retried?.reply({ ...retried.body, action: "upgrade", version: 1, assetRevision: 4, state: snapshot(1) });
        assert.equal(model.state?.version, 0);
        assert.equal(controller.busy, true);
        controller.observeAssets(4);
        assert.equal(model.state?.version, 1);
        assert.equal(controller.busy, false);
        controller.observeAssets(4);
        assert.equal(toasts.filter(text => text === "科技已点亮").length, 1);
        controller.reset(1, 0);
        assert.equal(requests.shift()?.name, Protocol.GUILD_TECHNOLOGY_INFO);
    } finally {
        controller.dispose();
        UIManager.instance.toast = originalToast;
    }
}

run();
console.log("PASS public guild technology receipt sync and replay recovery");
