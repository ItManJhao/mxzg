"""从原策划表导出日常任务、活跃奖励和成就链。"""

import argparse
import json
import re

from export_gameconfig import DEFAULT_SRC, ROOT, json_content, loose_rows, open_book


TARGET = ROOT / "backend/src/main/resources/gameplay/quest-rules.json"


def rows(table):
    """取得原表的全部有效记录，保留原配置编号。"""
    return loose_rows(DEFAULT_SRC / f"{table}.xlsx", table)


def language():
    """按旧客户端语言键索引已确认的简体中文策划文本。"""
    workbook = open_book(DEFAULT_SRC / "language.xlsx")
    try:
        return {
            str(key): value
            for _, key, value, *_ in workbook["language"].iter_rows(min_row=4, values_only=True)
            if key is not None and value
        }
    finally:
        workbook.close()


def rewards(raw):
    """将原物品和数量转换为通用发奖明细。"""
    return [{"itemId": row["item_type"], "quantity": row["item_num"]} for row in json.loads(raw)]


def task(row, text, daily):
    """解析原目标、前置、前往入口、简体文字和奖励。"""
    criterion = json.loads(re.sub(r'("type":\s*)([A-Z_]+)', r'\1"\2"', row["task"]))
    jump = json.loads(row["jump_info"])
    condition = criterion.get("condition", 0)
    title = re.sub(r"</?font\b[^>]*>", "", text[str(row["lang"])])
    if row["lang"] in (53216, 53217, 53219, 53220) and "[2]" in title:
        title = title.replace("[2]", text[str(41311 + condition)])
    title = title.replace("[1]", str(criterion["target"])).replace("[2]", str(condition))
    return {
        "id": row["idx"],
        "metric": criterion["type"],
        "condition": condition,
        "target": criterion["target"],
        "title": title,
        "destination": jump["event_arg"] if jump["event_type"] == 1 else "",
        "requiredLevel": row["open_level"] if daily else 0,
        "points": row["point"] if daily else 0,
        "previousId": 0 if daily else row["prev_task"],
        "rewards": rewards(row["reward"]),
    }


def project():
    """导出公用等级门槛、原任务配置和活跃里程碑。"""
    text = language()
    gate = next(row for row in rows("opencondition") if row["atom"] == "act_achievement")
    if gate["condition_type"] != 1:
        raise ValueError("日常成就开放条件不再是等级")
    return {
        "requiredLevel": gate["condition_value"],
        "daily": [task(row, text, True) for row in rows("dailytaskmain")],
        "achievements": [task(row, text, False) for row in rows("achievement")],
        "milestones": [
            {"id": row["idx"], "points": row["point"], "rewards": rewards(row["reward"])}
            for row in rows("dailytaskpoint")
        ],
    }


def main():
    """默认校验漂移，显式指定 --write 时导出服务端配置。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    options = parser.parse_args()
    expected = json_content(project())
    if options.write:
        TARGET.write_text(expected, encoding="utf-8")
    elif TARGET.read_text(encoding="utf-8") != expected:
        raise SystemExit("日常及成就配置已漂移，请检查策划表并显式重新导出")
    print("日常任务、活跃奖励和成就配置一致")


if __name__ == "__main__":
    main()
