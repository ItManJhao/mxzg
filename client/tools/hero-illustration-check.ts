/**
 * 英雄图鉴专项。使用真实配置验证五系图鉴、历史解锁、列表资源和原版属性参考点。
 * 不启动 Creator，不请求服务器，不向角色名册插入测试数据。
 */
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { GConfig } from "../assets/scripts/config/GConfig";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { HeroIllustrationUtils } from "../assets/scripts/features/hero/utils/HeroIllustrationUtils";
import type {
    HeroIllustrationEntry, HeroIllustrationPreview,
} from "../assets/scripts/features/hero/utils/HeroIllustrationUtils";
import { ConfigFixtureUtils } from "./ConfigFixtureUtils";

/** 使用仓库统一资源地址规则复核动态 Sprite 和 Spine 的依赖。 */
const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");

/** 图鉴的四个属性始终按照攻击、生命、防御、速度比较原版参考值。 */
function stats(preview: HeroIllustrationPreview | null): readonly number[] {
    assert(preview, "有配置的图鉴条目必须生成基础成长属性");
    return [preview.attack, preview.hp, preview.defense, preview.speed];
}

/** 核对图鉴全部格子有静态头像、动态骨骼与可展示的技能文本。 */
function checkEntry(entry: HeroIllustrationEntry, config: GameConfig): void {
    assert(entry.face && existsSync(resolveBundleFile(entry.face + ".png.meta")), `图鉴头像缺失 ${entry.templateId}:${entry.stars}`);
    assert(existsSync(resolveBundleFile(`spine/${entry.skinId}.json.meta`)), `图鉴小人资源缺失 ${entry.skinId}`);
    const preview = HeroIllustrationUtils.preview(entry, undefined, config);
    assert(stats(preview).every(value => Number.isSafeInteger(value) && value > 0));
    assert.equal(preview!.skills.length, 4);
    assert(preview!.skills.every(skill => skill.available));
}

/** 安装完整真实配置，再检查正式服火、光及两路进化参考点。 */
async function main(): Promise<void> {
    const config = await ConfigFixtureUtils.installReal(new GameConfig());
    const legacySource = readFileSync("config/legacy-client/hero-illustration.json", "utf8");
    const resource = readFileSync(resolveBundleFile("config/hero-illustration.json"), "utf8");
    assert.equal(resource, legacySource, "正式服图鉴补充必须从原版快照导出");
    const elements = [1, 2, 3, 4, 5];
    const catalogs = elements.map(elem => HeroIllustrationUtils.list(elem, [], undefined, config));
    assert.deepEqual(catalogs.map(rows => rows.length), [53, 51, 53, 55, 56]);
    for (const [index, catalog] of catalogs.entries()) {
        assert(catalog.every(entry => entry.elem === elements[index] && !entry.unlocked));
        for (const [offset, entry] of catalog.entries()) {
            const previous = catalog[offset - 1];
            assert(!previous || previous.stars > entry.stars ||
                previous.stars === entry.stars && previous.templateId > entry.templateId);
            checkEntry(entry, config);
        }
    }
    const fire = catalogs[0][0];
    assert.deepEqual([fire.templateId, fire.stars, fire.level, fire.skinId], [10105023, 10, 250, 10110023]);
    const firePreview = HeroIllustrationUtils.preview(fire, undefined, config);
    assert.deepEqual(stats(firePreview), [37180, 254632, 1812, 1522]);
    assert.deepEqual(firePreview!.skills.map(skill => skill.level), [3, 3, 3, 3]);
    const progress = [{ templateId: fire.templateId, maxStar: 6 }];
    assert.deepEqual(HeroIllustrationUtils.list(1, [], progress, config)
        .filter(entry => entry.templateId === fire.templateId).map(entry => entry.unlocked), [false, true, true]);
    const owned = [{ templateId: fire.templateId, star: 10 }];
    assert.equal(HeroIllustrationUtils.list(1, owned, [], config)[0].unlocked, false,
        "完整服务端解锁数据必须优先于名册回退");
    assert.equal(HeroIllustrationUtils.list(1, owned, undefined, config)[0].unlocked, true,
        "旧服务端仍可依据当前持有确认历史下限");

    const light = catalogs[3][0];
    assert.equal(light.templateId, 10405021);
    assert(!config.getConfig(GConfig.HeroType, light.templateId), "旧版补充只能用于客户端只读图鉴");
    const lightPreview = HeroIllustrationUtils.preview(light, undefined, config);
    assert.deepEqual(stats(lightPreview), [46686, 274159, 1866, 1549]);
    assert.deepEqual(lightPreview!.skills.map(skill => skill.level), [3, 3, 3, 3]);

    const evolutions = elements.map(elem => HeroIllustrationUtils.evolutions(elem, config));
    assert.deepEqual(evolutions.map(rows => rows.length), [7, 5, 3, 7, 7]);
    for (const entry of evolutions.flat()) {
        const branches = entry.evolutionBranches!;
        assert.deepEqual(branches.map(branch => [branch.type, branch.level]), [[1, 3], [2, 3]]);
        assert(branches[0].fashionId !== branches[1].fashionId);
        for (const branch of branches) {
            const preview = HeroIllustrationUtils.preview(entry, branch, config);
            assert(preview?.evolutionSkills?.before.available && preview.evolutionSkills.after.available);
            assert(existsSync(resolveBundleFile(`spine/${branch.fashionId}.json.meta`)));
        }
    }
    const nile = evolutions[0].find(entry => entry.templateId === 10105020)!;
    assert.deepEqual([nile.stars, nile.level], [14, 400]);
    assert.deepEqual(stats(HeroIllustrationUtils.preview(nile, nile.evolutionBranches![0], config)),
        [106700, 999504, 2933, 2397]);
    console.log("PASS 英雄图鉴 268 格、进化图鉴 29 英雄与双分支");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
