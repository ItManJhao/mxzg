/** 里程碑协议专项，用 Java 独立 H2 生成的实际回包核对二进制互通和资产归属。 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GameProtocolCodecUtils } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { Protocol } from "../assets/scripts/platform/Protocol";

const root = "backend/target/chapter-milestone-";
const fixture = JSON.parse(readFileSync(root + "review.json", "utf8"));
const frame = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync(root + "claimed.pb")));

for (const part of ["claimed", "status", "snapshot"]) {
    const source = GameProtocolCodecUtils.decodeGameFrame(new Uint8Array(readFileSync(root + part + ".pb")));
    assert.deepEqual(GameProtocolCodecUtils.decodeGameFrame(GameProtocolCodecUtils.encodeGameFrame(source)), source);
}
for (const mutate of [
    (value: any) => { value.actual.roleId = "another-role"; },
    (value: any) => { value.actual.heroes.push({ ...value.actual.heroes[0] }); },
    (value: any) => { value.actual.heroes[0].templateId++; },
    (value: any) => { value.actual.heroes[0].stage = -1; },
    (value: any) => { value.state.milestoneProgress.claimedIds = []; },
    (value: any) => { value.assetRevision++; },
]) {
    const value = structuredClone(fixture.receipt);
    mutate(value);
    assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({ ...frame, body: value }));
}
assert.throws(() => GameProtocolCodecUtils.encodeGameFrame({
    version: 1, kind: "request", name: Protocol.CHAPTER_MILESTONE_CLAIM, body: { rewardId: 100, roleId: "forged" },
}));
console.log("里程碑 Java 与 TypeScript 协议互通及非法回包检查通过");
