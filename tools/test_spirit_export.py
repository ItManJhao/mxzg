"""月兔精灵定向投影回归：检查真实权重、语言闭包、坏字段拒绝及客户端同源派生。

隔离夹具只写临时XLSX，不修改原始策划表，不运行Creator或开放任何玩法入口。
"""

import copy
import json
from pathlib import Path
import tempfile
import unittest

import openpyxl
import export_spirit_rules as spirit


class SpiritExportTest(unittest.TestCase):
    """覆盖当前唯一精灵的生成和显示配置，不顺带导出高稀有养成表。"""

    def setUp(self):
        """为每项边界检查建立完整、最小且互不共享的源表。"""
        self.temporary = tempfile.TemporaryDirectory()
        self.source = Path(self.temporary.name)
        self.item = dict(idx=2000002, type=8, place=4)
        self.rune = dict(type=2000002, rare=2, skill_max=1,
                         skill_num_chance='[{"num":1,"chance":10000}]',
                         skill1_level='[{"level":1,"chance":8000},{"level":2,"chance":2000}]')
        self.skills = [dict(idx=10, skill_id=150010001, level=1, chance=3),
                       dict(idx=20, skill_id=150010001, level=2, chance=5)]
        self.write_book("item", [self.item])
        self.write_book("runestype", [self.rune])
        self.write_book("runesability", [
            dict(idx=ability, rare=2, type=ability, ability=json.dumps([{str(attribute): value}]))
            for ability, attribute, value in ((1, 223, 1476), (2, 220, 146), (3, 224, 21), (4, 101, 5))])
        self.write_book("runeskilltype", self.skills)
        self.write_book("heroskill", [dict(idx=1, type=150010001, level=1, lan_name=10, lan_describe=11),
                                      dict(idx=2, type=150010001, level=2, lan_name=20, lan_describe=21)])
        self.languages = [dict(key=10, value="低级迅捷"), dict(key=11, value="速度增加10点并额外提升3%"),
                          dict(key=20, value="中级迅捷"), dict(key=21, value="速度增加20点并额外提升9%")]
        self.languages.extend(dict(key=2150000 + attr, value=name) for attr, name in
                              ((223, "生命"), (220, "攻击"), (224, "护甲"), (101, "速度")))
        self.write_book("language", self.languages)

    def tearDown(self):
        """释放本项临时源表，测试不产生真实项目资源或缓存。"""
        self.temporary.cleanup()

    def write_book(self, name, rows):
        """写旧三行表头；chance列故意不标客户端导出，证明规则读取真实未标列。"""
        fields = list(dict.fromkeys(key for row in rows for key in row))
        book = openpyxl.Workbook()
        sheet = book.active
        sheet.title = name
        sheet.append(fields)
        sheet.append([None if field in {"chance", "skill_num_chance", "skill1_level"} else 3
                      for field in fields])
        sheet.append(fields)
        for row in rows:
            sheet.append([row.get(field) for field in fields])
        try:
            book.save(self.source / (name + ".xlsx"))
        finally:
            book.close()

    def test_actual_projection_and_both_generated_outputs(self):
        """当前实际49×2技能、真实非均匀权重及两份已生成产物必须完全同源。"""
        projection = spirit.build_projection()
        self.assertEqual(projection["item"], dict(itemId=2000002, rare=2, skillMaximum=1,
                                                skillCounts=[dict(count=1, weight=10000)],
                                                skillLevels=[dict(level=1, weight=8000), dict(level=2, weight=2000)]))
        self.assertEqual(len(projection["skills"]), 98)
        self.assertEqual([sum(row["weight"] for row in projection["skills"] if row["level"] == level)
                          for level in (1, 2)], [141, 233])
        self.assertEqual(projection["abilities"][0]["description"], "生命+1476")
        self.assertEqual(len({row["icon"] for row in projection["skills"]}), 98)
        self.assertEqual(json.loads(spirit.OUTPUT.read_text(encoding="utf-8")), projection)
        self.assertEqual(spirit.DISPLAY_OUTPUT.read_text(encoding="utf-8"),
                         spirit.encode(spirit.build_display(projection)))

    def test_unmarked_weights_and_language_keys_are_preserved(self):
        """未标随机列仍进入服务端；客户端只派生只读内容，不复制权重或新增模块资源清单。"""
        projection = spirit.build_projection(self.source)
        self.assertEqual([row["weight"] for row in projection["skills"]], [3, 5])
        display = spirit.build_display(projection)
        row = display["rows"][0]
        self.assertEqual(row["idx"], 2000002)
        self.assertEqual(row["skills"][0], dict(skillId=150010001, level=1, name="低级迅捷",
                                               description="速度增加10点并额外提升3%",
                                               icon="skill-icon/150010001"))
        self.assertNotIn("weight", row["skills"][0])
        self.assertNotIn("skillCounts", row)

    def test_missing_weight_or_display_text_is_not_zero_or_note_fallback(self):
        """合法奖励可能缺列时直接拒绝，不等抽中后才暴露缺失或用策划备注冒充说明。"""
        broken = copy.deepcopy(self.skills)
        broken[0].pop("chance")
        self.write_book("runeskilltype", broken)
        with self.assertRaisesRegex(ValueError, "chance"):
            spirit.build_projection(self.source)
        self.write_book("runeskilltype", self.skills)
        self.write_book("language", [row for row in self.languages if row["key"] != 11])
        with self.assertRaisesRegex(ValueError, "显示语言缺失"):
            spirit.build_projection(self.source)

    def test_unknown_scope_and_duplicate_skill_are_rejected(self):
        """当前授权只有单技能精灵；不接受双技能配置或同技能等级重复的隐式覆盖。"""
        self.write_book("runestype", [{**self.rune, "skill_max": 2}])
        with self.assertRaisesRegex(ValueError, "超出本批范围"):
            spirit.build_projection(self.source)
        self.write_book("runestype", [self.rune])
        self.write_book("runeskilltype", self.skills + [{**self.skills[0], "idx": 30}])
        with self.assertRaisesRegex(ValueError, "重复"):
            spirit.build_projection(self.source)

    def test_source_index_orders_weight_intervals_and_empty_levels_fail(self):
        """源行打乱仍按旧idx安排权重区间；缺2级候选时不缩成仅1级或均匀抽。"""
        self.write_book("runeskilltype", list(reversed(self.skills)))
        self.assertEqual([row["index"] for row in spirit.build_projection(self.source)["skills"]], [10, 20])
        self.write_book("runeskilltype", self.skills[:1])
        with self.assertRaisesRegex(ValueError, "等级缺行"):
            spirit.build_projection(self.source)


if __name__ == "__main__":
    unittest.main()
