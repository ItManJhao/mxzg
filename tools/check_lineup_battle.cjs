/** 使用隔离H2通过真实WebSocket输出的响应，验证前端解码、Controller提交及损坏数据拒绝。 */
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const esbuild = require(path.join(root, "client/node_modules/esbuild"));
/** 在同一打包模块中加载通信边界与业务控制器，保持协议路由唯一。 */
const code = esbuild.buildSync({stdin:{contents:`
export { GameProtocolCodecUtils } from './client/assets/scripts/platform/GameProtocolCodecUtils';
export { BattlePreviewController } from './client/assets/scripts/features/battle/BattlePreviewController';
export { BattleReplayPlayer } from './client/assets/scripts/features/battle/BattleReplayPlayer';
`,resolveDir:root,loader:"ts"},bundle:true,platform:"node",format:"cjs",write:false}).outputFiles[0].text;
const loaded = {exports:{}};
new Function("module","exports","require",code)(loaded,loaded.exports,require);
const {GameProtocolCodecUtils,BattlePreviewController,BattleReplayPlayer} = loaded.exports;
/** 完整播放控制器已校验的真实混合阵容回包，逐单位与服务端最终生命核对，再导出原样播放数据。 */
async function checkMixedLineup() {
    for (const mission of [1, 2, 3]) {
        const frame = GameProtocolCodecUtils.decodeGameFrame(fs.readFileSync(path.join(root, `backend/target/lineup-mixed-${mission}.pb`)));
        const controller = new BattlePreviewController(async (selected, received) => {
            assert.equal(selected, mission);
            received(frame);
        });
        try {
            const result = await controller.preview(mission);
            assert.ok(result);
            const report = frame.body.replay;
            let last = null;
            let stops = 0;
            const player = new BattleReplayPlayer({
                play: async step => { last = step; },
                stop: () => { stops++; }
            });
            for (let repeat = 0; repeat < 2; repeat++) {
                assert.equal(await player.play(result.bytes), true);
                assert.equal(last.round, report.rounds);
                for (const unit of report.units) {
                    assert.equal(last.hpByUnit[unit.unitId], Number(unit.finalHp));
                }
                const allyHp = report.units.filter(unit => unit.faction === 1)
                    .reduce((total, unit) => total + last.hpByUnit[unit.unitId], 0);
                const enemyHp = report.units.filter(unit => unit.faction === 2)
                    .reduce((total, unit) => total + last.hpByUnit[unit.unitId], 0);
                assert.ok(allyHp > 0);
                assert.equal(enemyHp, 0);
                assert.equal(report.outcome, "ATTACKER_WIN");
            }
            assert.equal(stops, 2);
            const interrupted = new BattleReplayPlayer({
                play: async () => interrupted.stop(),
                stop: () => {}
            });
            assert.equal(await interrupted.play(result.bytes), false);
            fs.writeFileSync(path.join(root, `backend/target/lineup-mixed-${mission}-replay.pb`), result.bytes);
            const hp = report.units.map(unit => `${unit.unitId}=${unit.finalHp}`).join(", ");
            console.log(`PASS 混合阵容第${mission}关 第${report.rounds}回合 ${report.outcome} 单位生命 ${hp}`);
        } finally {
            controller.dispose();
        }
    }
}
/** 真实回包逐关进入onNotify，不在测试里重写客户端校验算法。 */
async function main() {
    for (let mission = 1; mission <= 3; mission++) {
        const frame = GameProtocolCodecUtils.decodeGameFrame(fs.readFileSync(path.join(root,`backend/target/lineup-preview-${mission}.pb`)));
        const ctrl = new BattlePreviewController(async (selected,received) => {
            assert.equal(selected,mission);received(frame);
        });
        const result = await ctrl.preview(mission);
        assert.equal(result.mission,mission);
        assert.ok(result.bytes.length);
        assert.ok(result.pending.includes("random_probability_pending_review"));
        ctrl.dispose();
        for (const corrupt of [
            data => data.mission = 4,
            data => data.replay.units.find(unit => unit.faction === 2).templateId = 999,
            data => data.replay.units.find(unit => unit.faction === 1).unitId = 99,
            data => data.replay.units[0].finalHp += 1,
            data => data.pending = null,
            data => delete data.lineupVersion,
        ]) {
            const broken = JSON.parse(JSON.stringify(frame));corrupt(broken.body);
            const reject = new BattlePreviewController(async (_,received) => received(broken));
            await assert.rejects(reject.preview(mission));reject.dispose();
        }
    }
    const charm = GameProtocolCodecUtils.decodeGameFrame(fs.readFileSync(path.join(root, "backend/target/lineup-preview-charm.pb")));
    const charmController = new BattlePreviewController(async (_, received) => received(charm));
    const charmResult = await charmController.preview(3);
    assert.ok(charmResult.bytes.length);
    assert.equal(charm.body.replay.units[0].templateId, 10105011);
    charmController.dispose();
    await checkMixedLineup();
    const stale = new BattlePreviewController(async () => {});
    assert.equal(await stale.preview(1),null,"应用未交付过期身份结果时不得打开画面");stale.dispose();
    console.log("PASS 真实WS Protobuf→Controller→Model：前三关、关卡/敌方/身份/生命/缺口校验及过期未交付");
}
main().catch(error => {console.error(error);process.exitCode=1;});
