"""从原策划表投影彩虹圣殿席位、守军、技能展示和通知文案。

配置供新版服务端校验挑战资格和生成战报，同一份规则也用于玩家端展示。
"""

import argparse
from collections import defaultdict
import json
from pathlib import Path

from export_gameconfig import DEFAULT_SRC, ROOT, loose_rows


OUTPUT = ROOT / "backend/src/main/resources/gameplay/rainbow-rules.json"
REPLAY_OUTPUT = ROOT / "client/assets/scripts/features/rainbow/data/RainbowReplayConfig.ts"
SHRINE_TYPES = (1, 2, 3)
MAX_EVOLUTION = 1000


def rows(source, table, sheet=None):
    """按原工作表名称读取数据，保留服务端专用字段。"""
    return loose_rows(source / f"{table}.xlsx", sheet or table)


def attributes(raw):
    """转换旧版神位属性格式，数值沿用万分比。"""
    result = {}
    for entry in json.loads(raw):
        [(attr_id, amount)] = entry.items()
        if attr_id in result or not isinstance(amount, int) or amount <= 0:
            raise ValueError(f"彩虹圣殿神位属性无效：{entry}")
        result[attr_id] = amount
    if set(result) != {"102", "201"}:
        raise ValueError(f"彩虹圣殿神位属性缺项：{raw}")
    return result


def seats(source, language):
    """按原神位类型和席位顺序生成稳定编号，避免同服存档因导表顺序变化失效。"""
    result = []
    definitions = sorted(rows(source, "rainbow", "tower"), key=lambda row: row["rainbow_type"])
    if [(row["rainbow_type"], row["num"]) for row in definitions] != [(1, 1), (2, 2), (3, 3)]:
        raise ValueError("彩虹圣殿神位类型或席位数量变动")
    for row in definitions:
        name = language[str(row["name_lang"])]
        if not name or row["need_rank"] <= 0 or row["time"] <= 0:
            raise ValueError(f"彩虹圣殿神位名称、名次或期限无效：{row['rainbow_type']}")
        for position in range(1, row["num"] + 1):
            result.append({
                "id": len(result) + 1,
                "type": row["rainbow_type"],
                "position": position,
                "name": name,
                "requiredArenaRank": row["need_rank"],
                "occupationSeconds": row["time"],
                "attributes": attributes(row["attr"]),
            })
    return result


def skills(raw):
    """投影神位技能图标使用的原技能 ID 和等级。"""
    result = []
    for skill in json.loads(raw):
        if skill["type"] <= 0 or skill["level"] <= 0:
            raise ValueError(f"彩虹圣殿守军展示技能无效：{skill}")
        result.append({"id": skill["type"], "level": skill["level"]})
    return result


def missions(source):
    """归并原始进化档守军，检查站位、成长参数及战斗需要的数组格式。"""
    growth = {(row["type"], row["star"]) for row in rows(source, "herobase")}
    original = rows(source, "rainbowmission", "tower")
    if len({row["idx"] for row in original}) != len(original):
        raise ValueError("彩虹圣殿守军编号重复")
    groups = defaultdict(list)
    for row in original:
        if (row["hero_type"], row["hero_star"]) not in growth or row["hero_level"] <= 0:
            raise ValueError(f"彩虹圣殿守军成长数据无效：{row['idx']}")
        modifiers = json.loads(row["attr"])
        if sorted((attr["type"], attr["kind"]) for attr in modifiers) != [(220, 2), (223, 2)] or any(
            not isinstance(attr["value"], int) or attr["value"] <= 0 for attr in modifiers
        ):
            raise ValueError(f"彩虹圣殿守军初始属性变动：{row['idx']}")
        if json.loads(row["equipment"]) or json.loads(row["runes"]):
            raise ValueError(f"彩虹圣殿守军出现装备或符文配置：{row['idx']}")
        groups[row["rainbow_type"], row["level"]].append(row)

    keys = [(kind, level) for kind in SHRINE_TYPES for level in range(1, MAX_EVOLUTION + 1)]
    if sorted(groups) != keys:
        raise ValueError("彩虹圣殿神位进化档有缺行或多余数据")
    result = []
    for kind, level in keys:
        roster = sorted(groups[kind, level], key=lambda row: row["idx"])
        positions = {row["pos"] for row in roster}
        display = {(row["skill_show"], row["passive_skill_show"]) for row in roster}
        if len(roster) != 6 or len(positions) != 6 or not positions <= set(range(1, 9)) or len(display) != 1:
            raise ValueError(f"彩虹圣殿守军队伍站位或技能展示无效：{kind}/{level}")
        [(active, passive)] = display
        result.append({
            "type": kind,
            "evolution": level,
            "enemies": [{
                "configId": row["idx"], "position": row["pos"], "template": row["hero_type"],
                "level": row["hero_level"], "star": row["hero_star"], "modifiers": row["attr"],
                "equipment": row["equipment"], "runes": row["runes"],
            } for row in roster],
            "activeSkills": skills(active),
            "passiveSkills": skills(passive),
        })
    return result


def notices(source, language):
    """导出原场景 40/41 的无附件通知，正文由服务端代入所失神位。"""
    result = {}
    names = {40: "displacedMail", 41: "expiredMail"}
    for row in rows(source, "mail"):
        if row["idx"] not in names:
            continue
        subject = language[str(row["title_lang"])]
        content = language[str(row["content_lang"])]
        if not subject or content.count("[1]") != 1 or json.loads(row["content_param"]) != [10]:
            raise ValueError(f"彩虹圣殿通知模板无效：{row['idx']}")
        result[names[row["idx"]]] = {"subject": subject, "content": content}
    if set(result) != set(names.values()):
        raise ValueError("彩虹圣殿缺少公告邮件模板")
    return result


def configuration(source):
    """组合入口和挑战等级、战场规则、神位与所有原守军。"""
    gate = next(row["condition_value"] for row in rows(source, "opencondition") if row["atom"] == "main_chsd")
    system = {row["key"]: row.get("value") for row in rows(source, "system")}
    battle = next(row for row in rows(source, "battletype", "Sheet1") if row["type"] == 17)
    language = {str(row["key"]): row.get("value") for row in rows(source, "language")}
    return {
        "schemaVersion": 1,
        "minimumLevel": gate,
        "minimumChallengeLevel": system["rainbow_challenge_level"],
        "historyLimit": system["rainbow_record_count"],
        "challengeCooldownSeconds": system["rainbow_challenge_cd"],
        "battleRounds": battle["round_max"],
        "battleMap": battle["map"],
        "seats": seats(source, language),
        "missions": missions(source),
        **notices(source, language),
    }


def replay_rosters(mission_rules):
    """投影回放校验所需的守军站位、模板、等级和星级，复用每种神位的原阵型。"""
    output = [
        "/** 自动生成：tools/export_rainbow_rules.py。彩虹圣殿战报的原守军名册。 */",
        "export const RAINBOW_REPLAY_ROSTERS: Readonly<Partial<Record<number, {",
        "    readonly formations: readonly (readonly (readonly [position: number, templateId: number])[])[];",
        "    readonly levels: readonly (readonly [formationIndex: number, level: number, star: number])[];",
        "}>>> = {",
    ]
    for shrine_type in SHRINE_TYPES:
        formations = []
        levels = []
        for mission in (row for row in mission_rules if row["type"] == shrine_type):
            formation = [(enemy["position"], enemy["template"]) for enemy in mission["enemies"]]
            growth = {(enemy["level"], enemy["star"]) for enemy in mission["enemies"]}
            if len(growth) != 1:
                raise ValueError(f"彩虹圣殿回放守军本档成长不一致：{shrine_type}/{mission['evolution']}")
            if formation not in formations:
                formations.append(formation)
            [(level, star)] = growth
            levels.append((formations.index(formation), level, star))

        output.append(f"    {shrine_type}: {{")
        output.append("        formations: [")
        output.extend(f"            {json.dumps(formation)}," for formation in formations)
        output.append("        ],")
        output.append("        levels: [")
        for start in range(0, len(levels), 8):
            output.append("            " + ", ".join(json.dumps(level) for level in levels[start:start + 8]) + ",")
        output.append("        ],")
        output.append("    },")
    return "\n".join([*output, "};", ""])


def main():
    """生成服务端数据，或确认工作区产物与所选原表一致。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    config = configuration(args.src)
    backend = json.dumps(config, ensure_ascii=False, separators=(",", ":")) + "\n"
    for path, contents in ((OUTPUT, backend), (REPLAY_OUTPUT, replay_rosters(config["missions"]))):
        if args.check:
            if path.read_text(encoding="utf-8") != contents:
                raise ValueError(f"彩虹圣殿规则与原表不一致：{path}")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(contents, encoding="utf-8", newline="\n")
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
