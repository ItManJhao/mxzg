/**
 * 道具与碎片只读详情纯规则检查：直接读取同源Item、Language及HeroType，不复制产品配置清单。
 * 核对旧mode分类、碎片样式和完成度、库存按钮上下文、长正文及明确缺失；不打开UI或修改玩家资产。
 */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { GConfig, ItemRow, LanguageRow } from "../assets/scripts/config/GConfig";
import { GameConfig } from "../assets/scripts/config/GameConfig";
import { GameLog } from "../assets/scripts/core/GameLog";
import { ItemDetailUtils } from "../assets/scripts/features/bag/utils/ItemDetailUtils";

const { resolveBundleFile } = require(process.cwd() + "/tools/bundle-paths.cjs");

/** 读取当前导出的真实配置，不另建道具/语言映射。 */
function file(name: string): any {
    return JSON.parse(readFileSync(resolveBundleFile("config/" + name + ".json"), "utf8"));
}

const items: readonly ItemRow[] = file("item").rows;
const language: { rows: readonly LanguageRow[] } = file("language");
const heroes: readonly { type: number }[] = file("herotype").rows;

/** 缺少测试选用的真实样本时立即失败，不造临时产品配置弥补。 */
function item(id: number): ItemRow {
    const row = items.find(value => value.idx === id);
    assert(row, "真实物品样本缺失：" + id);
    return row;
}

/** 用真实仓库校验独立语言副本，缺语反例不污染业务单例或其他用例。 */
async function languageConfig(source: { rows: readonly LanguageRow[] }): Promise<GameConfig> {
    const config = new GameConfig(async path => {
        assert.equal(path, "config/language");
        return source;
    });
    await config.prepare([GConfig.Language]);
    return config;
}

/** 对已加载的统一索引运行完整显示矩阵，规则查询不触发额外配置读取。 */
async function main(): Promise<void> {
    const config = await languageConfig(language);
    const before = JSON.stringify({ items, language, heroes });
    const stone = ItemDetailUtils.read(item(900102), { inventory: true }, config)!;
    assert(stone);
    assert.equal(stone.typeLine, "类型:道具");
    assert.equal(stone.description, "英雄升阶所需的石头");
    assert.equal(stone.richDescription, "英雄升阶所需的石头");
    assert.equal(stone.missingDescription, false);
    assert.equal(stone.piece, null);
    assert.equal(stone.bottomAction, "source");
    assert.equal(stone.showSourceIcon, false);
    assert.equal(stone.showUse, false);
    assert.equal(stone.showDecompose, false);
    assert.equal(stone.useLabel, "使 用");
    assert.equal(stone.detailLabel, "来 源");
    assert.equal(stone.decomposeLabel, "分解");

    const random = item(20003000);
    assert.equal(heroes.some(row => row.type === random.idx - 10000000), false);
    const randomDetail = ItemDetailUtils.read(random, { inventory: true, specificHero: false }, config)!;
    assert.equal(randomDetail.typeLine, "类型:精英碎片");
    assert.deepEqual(randomDetail.piece, { star: 3, required: 20 });
    assert.equal(randomDetail.bottomAction, "source");
    assert.equal(randomDetail.showSourceIcon, false);
    assert.equal(randomDetail.showUse, true);
    assert.equal(randomDetail.showDecompose, false);

    const specific = item(20101001);
    assert(heroes.some(row => row.type === specific.idx - 10000000));
    const specificDetail = ItemDetailUtils.read(specific, { inventory: true, specificHero: true }, config)!;
    assert.deepEqual(specificDetail.piece, { star: 1, required: 5 });
    assert.equal(specificDetail.bottomAction, "detail");
    assert.equal(specificDetail.detailLabel, "详 情");
    assert.equal(specificDetail.showSourceIcon, true);
    assert.equal(specificDetail.showUse, true);
    assert.equal(specificDetail.showDecompose, false);
    const noSourceSpecific = ItemDetailUtils.read({ ...specific, source: "[]" }, { inventory: true, specificHero: true }, config)!;
    assert.equal(noSourceSpecific.bottomAction, "detail");
    assert.equal(noSourceSpecific.showSourceIcon, false);
    const preview = ItemDetailUtils.read(specific, { inventory: false, specificHero: true }, config)!;
    assert.equal(preview.bottomAction, "source", "奖励说明没有旧show_detail上下文，不能冒充可打开的英雄图鉴");
    assert.equal(preview.showSourceIcon, false);
    assert.equal(preview.showUse, false);
    assert.equal(preview.showDecompose, false);

    const fiveStarRandom = ItemDetailUtils.read(item(950001), { inventory: true }, config)!;
    assert.deepEqual(fiveStarRandom.piece, { star: 5, required: 50 });
    assert.equal(fiveStarRandom.bottomAction, null, "没有真实source的随机碎片不捏造来源按钮");
    assert.equal(fiveStarRandom.showUse, true);

    assert.deepEqual(ItemDetailUtils.progress(randomDetail.piece!, 0),
        { current: 0, required: 20, ratio: 0, text: "0/20" });
    assert.deepEqual(ItemDetailUtils.progress(randomDetail.piece!, 19),
        { current: 19, required: 20, ratio: 0.95, text: "19/20" });
    assert.deepEqual(ItemDetailUtils.progress(randomDetail.piece!, 20),
        { current: 20, required: 20, ratio: 1, text: "20/20" });
    assert.deepEqual(ItemDetailUtils.progress(randomDetail.piece!, 63),
        { current: 63, required: 20, ratio: 1, text: "63/20" });
    assert.equal(ItemDetailUtils.progress(randomDetail.piece!, -1), null);
    assert.equal(ItemDetailUtils.progress(randomDetail.piece!, NaN), null);
    assert.equal(ItemDetailUtils.progress(randomDetail.piece!, 1.5), null);
    assert.equal(ItemDetailUtils.progress({ star: 3, required: 0 }, 1), null);

    const usable = ItemDetailUtils.read(item(900507), { inventory: true }, config)!;
    assert.equal(usable.bottomAction, "source");
    assert.equal(usable.showUse, true);
    const petSelection = ItemDetailUtils.read(item(900504), { inventory: true }, config)!;
    assert.equal(petSelection.description.split("\n").length, 11, "礼包标题与10项候选逐行显示，不能去掉br后拼成一行");
    assert.equal(petSelection.description.split("\n")[1], "熔岩龙.橙*1");
    assert.equal(petSelection.description.split("\n")[10], "食梦兽.橙*1");
    assert.equal((petSelection.richDescription.match(/<color=#ef6b00>/g) || []).length, 10);
    assert(petSelection.richDescription.includes("\n<color=#ef6b00>熔岩龙.橙*1</color>\n"));
    assert(petSelection.richDescription.endsWith("<color=#ef6b00>食梦兽.橙*1</color>"));
    const materialSelection = ItemDetailUtils.read(item(900505), { inventory: true }, config)!;
    assert.equal(materialSelection.description, "打开后可选择以下材料之一领取：\n血痕之印*16\n共鸣之印*8");
    assert.equal(materialSelection.richDescription,
        "打开后可选择以下材料之一领取：\n<color=#ef6b00>血痕之印*16</color>\n<color=#ef6b00>共鸣之印*8</color>");
    assert.equal(ItemDetailUtils.richText("<font color='#98368C'>紫色选项</font><br/>下一项\\n末项"),
        "<color=#98368C>紫色选项</color>\n下一项\n末项");
    assert.equal(ItemDetailUtils.richText("<on click='attack'>选择</on><img src='missing'/><size=99>说明</size><color=#ff0000>旧输入</color>"),
        "选择说明旧输入", "未知标签不能作为Cocos点击、图片、字号或颜色指令执行");
    assert.equal(ItemDetailUtils.richText("<font color='#ef6b00'>甲<font size='20'>乙</font>丙</font>"),
        "<color=#ef6b00>甲乙丙</color>", "不支持的嵌套font不能提前关闭外层合法颜色");
    assert.equal(ItemDetailUtils.richText("<font color='#ef6b00'>未闭合颜色"),
        "<color=#ef6b00>未闭合颜色</color>");
    assert.equal(ItemDetailUtils.richText("无格式正文"), "无格式正文", "两次投影之间不保留颜色栈");
    const decomposable = ItemDetailUtils.read(item(901819), { inventory: true }, config)!;
    assert.equal(decomposable.bottomAction, null);
    assert.equal(decomposable.showUse, false);
    assert.equal(decomposable.showDecompose, true);
    const readonlyDecomposition = ItemDetailUtils.read(item(901819), { inventory: false }, config)!;
    assert.equal(readonlyDecomposition.showDecompose, false);
    const long = ItemDetailUtils.read(item(3010007), { inventory: true }, config)!;
    assert.equal(long.description.length, 553, "长正文完整保留，由页面滚动显示而不是截断");
    assert(long.description.includes("\n"));
    assert(!long.description.includes("\\n"));
    assert.equal(long.showUse, true);
    assert.equal(long.bottomAction, null);
    const jumping = items.find(row => row.mode === 2 && row.use_type === 99)!;
    assert(jumping);
    assert.equal(ItemDetailUtils.read(jumping, { inventory: true }, config)!.useLabel, "使 用",
        "use_type只决定旧行为与可见性，不能擅自改为前往或合成");

    const timed = ItemDetailUtils.read(item(902025), { inventory: true, timed: true }, config)!;
    assert.equal(timed.typeLine, "类型:道具");
    assert.equal(timed.piece, null);
    assert.equal(timed.showDecompose, false);
    assert.equal(timed.showUse, false);
    assert.equal("expiresAtSeconds" in timed, false, "期限来自真实库存实例，不从配置天数或本机时刻造到期时间");
    assert.equal(ItemDetailUtils.read({ ...item(901819), mode: 17 }, { inventory: true, timed: true }, config)!.showDecompose, false);

    GameLog.shared.clear();
    const material = ItemDetailUtils.read(item(30104004), { inventory: true, specificHero: true }, config)!;
    assert(material);
    assert.equal(material.typeLine, "类型:特殊");
    assert.equal(material.piece, null, "mode9的use_value为英雄ID，不能当作碎片需求");
    assert.equal(material.description, "物品说明缺失");
    assert.equal(material.richDescription, "物品说明缺失");
    assert.equal(material.missingDescription, true);
    assert.equal(material.bottomAction, null);
    assert.equal(material.showSourceIcon, false);
    assert.equal(material.showUse, false);
    assert.equal(material.showDecompose, false);
    ItemDetailUtils.read(item(30104004), { inventory: true }, config);
    const missingLogs = GameLog.shared.recent().filter(row => row.tag === "ItemDetailUtils");
    assert.equal(missingLogs.length, 1, "同物品正文缺失限频，不能每次刷新重复告警");
    assert(missingLogs[0].message.includes("itemId=30104004"));
    assert.equal(missingLogs[0].level, "warn");

    const counts: Record<number, number> = { 2: 0, 8: 0, 9: 0, 17: 0 };
    let missingDescriptions = 0;
    let specificCount = 0;
    for (const row of items.filter(value => value.mode === 2 || value.mode === 8 || value.mode === 9 || value.mode === 17)) {
        const specificHero = row.mode === 8 && heroes.some(hero => hero.type === row.idx - 10000000);
        const detail = ItemDetailUtils.read(row, { inventory: true, timed: row.mode === 17, specificHero }, config);
        assert(detail, "全部现有配置应有可展示的真实或明确缺失投影：" + row.idx);
        assert(!/<\/?(?:font|br)\b/i.test(detail.description), "纯文本没有残留旧富文本标记：" + row.idx);
        assert(!/<\/?(?:font|br)\b/i.test(detail.richDescription), "RichText没有残留旧富文本标记：" + row.idx);
        assert.equal(detail.richDescription.replace(/<\/?color(?:=#[0-9a-f]{6})?>/gi, ""), detail.description,
            "颜色表现和纯文本必须保留同一完整正文及换行：" + row.idx);
        counts[row.mode!]++;
        if (detail.missingDescription) {
            missingDescriptions++;
            assert.equal(row.mode, 9);
        }
        if (row.mode === 8) {
            assert(detail.piece && detail.piece.star >= 1 && detail.piece.star <= 5 && detail.piece.required > 0);
            assert.equal(detail.showUse, true);
            assert.equal(detail.showDecompose, false);
            if (specificHero) {
                specificCount++;
            }
        } else {
            assert.equal(detail.piece, null);
        }
    }
    assert.deepEqual(counts, { 2: 422, 8: 136, 9: 23, 17: 3 });
    assert.equal(missingDescriptions, 23);
    assert.equal(specificCount, 109);
    assert.equal(JSON.stringify({ items, language, heroes }), before, "投影不排序或改写源配置");

    assert.equal(ItemDetailUtils.read(item(1001001), { inventory: true }, config), null);
    assert.equal(ItemDetailUtils.read(item(2000002), { inventory: true }, config), null);
    assert.equal(ItemDetailUtils.read(item(908101), { inventory: true }, config), null);
    assert.equal(ItemDetailUtils.piece(item(30104004)), null);
    assert.equal(ItemDetailUtils.piece(item(900102)), null);
    for (const star of [undefined, 0, 6, 1.5]) {
        assert.equal(ItemDetailUtils.piece({ ...random, star }), null);
        assert.equal(ItemDetailUtils.read({ ...random, star }, { inventory: true }, config), null);
    }
    for (const required of [undefined, 0, -1, 1.5]) {
        assert.equal(ItemDetailUtils.piece({ ...random, use_value: required }), null);
        assert.equal(ItemDetailUtils.read({ ...random, use_value: required }, { inventory: true }, config), null);
    }
    for (const source of ["[]", "", "   ", undefined]) {
        assert.equal(ItemDetailUtils.read({ ...item(900102), source }, { inventory: true }, config)!.bottomAction, null);
    }
    for (const source of ["[", "{}", "null", '"[]"', "[null]", "[1]", "[[]]"]) {
        assert.equal(ItemDetailUtils.read({ ...item(900102), source }, { inventory: true }, config), null,
            "无效source不以字符串长度判定真实来源：" + source);
    }
    assert.equal(ItemDetailUtils.read({ ...item(900102), use_type: undefined }, { inventory: true }, config), null);
    assert.equal(ItemDetailUtils.read({ ...item(900102), decomposition: undefined }, { inventory: true }, config), null);
    const emptyLanguage = await languageConfig({ rows: [] });
    assert.equal(ItemDetailUtils.read(item(900102), { inventory: true }, emptyLanguage), null);
    const withoutType = await languageConfig({
        rows: language.rows.filter(row => Number(row.key) !== 47215),
    });
    assert.equal(ItemDetailUtils.read(item(900102), { inventory: true }, withoutType), null,
        "类型语言缺失不能生成虚假类型");
    // 原语言表的999999999是真实“表尾”键；明确删去独立副本中的正文，不能猜一个缺失ID。
    const withoutDescription = {
        rows: language.rows.filter(row => Number(row.key) !== Number(item(900102).content)),
    };
    const missingDescription = ItemDetailUtils.read(item(900102), { inventory: true }, await languageConfig(withoutDescription))!;
    assert(missingDescription && missingDescription.missingDescription);
    assert.equal(missingDescription.description, "物品说明缺失");
    assert.equal(missingDescription.richDescription, "物品说明缺失");
    assert.equal(JSON.stringify({ items, language, heroes }), before, "全部缺失及损坏反例只改副本，不污染真实配置或后续断言");
    console.log("道具与碎片详情检查通过：584条配置、109条具体英雄碎片、数量进度、旧按钮条件及明确缺失边界");
}

void main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
