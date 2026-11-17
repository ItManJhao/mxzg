"""角色升级预告投影回归：核对原Lua覆盖、父键集合和旧筛选，不修改导航或开放玩法。

只读取仓库内原样快照及派生产物；小型反例不执行Lua、不依赖外部旧工程或Creator。
"""

import json
import unittest

from export_role_upgrade_features import (
    SOURCE, SOURCE_METADATA, build_projection, check_generated, parse_definitions, project_definitions,
)


class RoleUpgradeFeatureTests(unittest.TestCase):
    """用已核对旧源及边界反例验证候选生成，避免再维护人工候选名单。"""

    @staticmethod
    def row(atom, line, *, parent="", level=5, opened=1, condition=1, world=1):
        """构造可独立调整父节点、门槛和预告开关的原定义，不经过真实文件写入。"""
        return {"atom": atom, "source_line": line, "idx": line, "parent": parent,
                "condition_value": level, "open": opened, "condition_type": condition,
                "world_level": world}

    def test_real_snapshot_reproduces_legacy_counts_and_last_duplicate(self):
        """205原定义最后键覆盖为204项，父键190项、预告34项；保留已核实重复来源。"""
        payload, metadata = build_projection()
        self.assertEqual((metadata["definition_count"], metadata["unique_count"],
                          metadata["system_key_count"], metadata["candidate_count"]), (205, 204, 190, 34))
        duplicate = metadata["duplicates"]
        self.assertEqual(len(duplicate), 1)
        self.assertEqual(duplicate[0]["atom"], "act_recharge_day_reward")
        self.assertEqual([row["idx"] for row in duplicate[0]["definitions"]], [85, 135])
        self.assertEqual(duplicate[0]["retained_line"], 1611)
        self.assertEqual(len(payload["rows"]), 34)
        rank = next(row for row in payload["rows"] if row["id"] == "main_rank")
        self.assertEqual(rank["condition_value"], 1)

    def test_real_candidates_are_all_parentless_but_algorithm_uses_actual_parent_keys(self):
        """当前34项恰好全是根项是配置事实；算法仍按父键构造，不能简化为扫全表。"""
        definitions = parse_definitions(SOURCE.read_text(encoding="utf-8-sig"))
        runtime = {row["atom"]: row for row in definitions}
        payload, _ = build_projection()
        self.assertTrue(all(runtime[row["id"]]["parent"] == "" for row in payload["rows"]))
        rows, _ = project_definitions([self.row("parent", 1), self.row("child", 2, parent="parent")])
        self.assertEqual([row["id"] for row in rows], ["parent"])

    def test_legacy_preview_does_not_apply_navigation_visibility_world_or_open_two(self):
        """旧预告只排除4/5及非等级条件，不能额外套已实现模块、world或NOT_OPEN筛选。"""
        definitions = [self.row("default", 1, opened=0), self.row("not-open", 2, opened=2),
                       self.row("notice-no-show", 3, opened=3, world=99),
                       self.row("excluded-four", 4, opened=4), self.row("excluded-five", 5, opened=5),
                       self.row("vip", 6, condition=4)]
        rows, _ = project_definitions(definitions)
        self.assertEqual([row["id"] for row in rows], ["default", "not-open", "notice-no-show"])

    def test_equal_thresholds_keep_source_order_without_idx_priority(self):
        """同阈值保持源定义顺序，不能偷偷按idx或atom重排制造旧规则不存在的优先级。"""
        first = {**self.row("z-first", 1, level=18), "idx": 500}
        second = {**self.row("a-second", 2, level=18), "idx": 1}
        rows, _ = project_definitions([first, second])
        self.assertEqual([row["id"] for row in rows], ["z-first", "a-second"])

    def test_duplicate_uses_last_fields_before_filtering(self):
        """重复键先覆盖再筛选；最后定义关闭预告时，不能让前条残留在候选中。"""
        rows, stats = project_definitions([self.row("same", 1), self.row("same", 2, opened=5)])
        self.assertEqual(rows, [])
        self.assertEqual(stats["unique_count"], 1)

    def test_projection_maps_language_ids_without_inventing_empty_values(self):
        """只映射旧语言ID及说明，空文案省略，供现有GameConfig统一取表取文案。"""
        rows, _ = project_definitions([{**self.row("name", 1), "name": 4308, "desc": 4207, "note": "铁匠铺"},
                                       {**self.row("empty", 2), "name": "", "desc": ""}])
        self.assertEqual(rows[0], {"id": "name", "atom": "name", "condition_value": 5,
                                   "name_lang": 4308, "desc": 4207, "note": "铁匠铺"})
        self.assertNotIn("name_lang", rows[1])
        self.assertNotIn("desc", rows[1])

    def test_missing_parent_rejects_instead_of_silently_skipping_candidate(self):
        """旧父键必须可回查配置，缺失明确失败，不能用缺资源方式吞掉规则损坏。"""
        with self.assertRaisesRegex(ValueError, "父系统不存在"):
            project_definitions([self.row("child", 1, parent="missing")])

    def test_parser_rejects_expression_and_mismatched_key(self):
        """配置快照不允许执行表达式，键与atom不一致不能继续导出假成功。"""
        text = SOURCE.read_text(encoding="utf-8-sig")
        with self.assertRaisesRegex(ValueError, "不允许表达式"):
            parse_definitions(text.replace("condition_value = 18,", "condition_value = os.execute(1),", 1))
        with self.assertRaisesRegex(ValueError, "键与atom不一致"):
            parse_definitions(text.replace('atom = "main_clan",', 'atom = "different",', 1))

    def test_generated_projection_and_metadata_are_current(self):
        """读取当前派生表、来源哈希和meta，原源与候选漂移必须由正常导出修复。"""
        check_generated()
        _, metadata = build_projection()
        self.assertEqual(json.loads(SOURCE_METADATA.read_text(encoding="utf-8-sig")), metadata)


if __name__ == "__main__":
    unittest.main()
