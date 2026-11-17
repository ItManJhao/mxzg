"""全目录挂机投影回归：跨难度按全局idx取原收益，校验断档、重复和损坏奖励拒绝。"""
import json
import unittest

import export_idle_rules


class IdleCatalogTests(unittest.TestCase):
    """直接执行生产投影，避免以手写列表掩盖mode过滤或只保留前20关。"""

    def stage(self, index, mode=1, amount=200):
        """创建最小原格式奖励行；mode变化不改变全局idx身份。"""
        return dict(idx=index, mode_id=mode, drop_group=1001,
                    reward_base=json.dumps([dict(item_type=900001, item_num=amount)]))

    def test_all_modes_and_source_rows_are_preserved(self):
        """真实850目录每行均投影同一原收益，包含重复三维定位的后300行而不猜换怪。"""
        source = json.loads((export_idle_rules.SOURCE / 'chapterreward.json').read_text(encoding='utf-8'))['rows']
        actual = export_idle_rules.project()
        projected = {stage['id']: stage for stage in actual['stages']}
        self.assertEqual(len(projected), len(source))
        self.assertGreater(len(projected), 20)
        for row in source:
            self.assertEqual(projected[row['idx']]['group'], row['drop_group'])
            self.assertEqual(projected[row['idx']]['base'], [
                dict(itemId=value['item_type'], quantity=value['item_num'])
                for value in json.loads(row['reward_base'])])
        self.assertEqual({row['mode_id'] for row in source}, {1, 2, 3, 4, 5})
        self.assertEqual({row['group'] for row in actual['triggers']},
                         {row['group'] for row in actual['stages']})

    def test_global_index_sort_ignores_mode(self):
        """乱序输入、不同难度和重复三维定位都按稳定全局idx保留。"""
        actual = export_idle_rules.project_stages([
            self.stage(3, 5, 300), self.stage(1), self.stage(2, 2, 250)])
        self.assertEqual([row['id'] for row in actual], [1, 2, 3])
        self.assertEqual([row['base'][0]['quantity'] for row in actual], [200, 250, 300])

    def test_duplicate_or_missing_indices_are_rejected(self):
        """不把重复、断档及空目录当成可默认回退第1关的收益。"""
        for rows in [[], [self.stage(1), self.stage(1)], [self.stage(1), self.stage(3)]]:
            with self.subTest(rows=rows), self.assertRaisesRegex(ValueError, 'idx'):
                export_idle_rules.project_stages(rows)

    def test_invalid_rewards_are_rejected(self):
        """负数、布尔数量、坏JSON与空奖励都拒绝，不能伪造零收益通过。"""
        for value in ['{}', '[]', 'bad', '[{"item_type":900001,"item_num":-1}]',
                      '[{"item_type":900001,"item_num":true}]']:
            row = self.stage(1)
            row['reward_base'] = value
            with self.subTest(value=value), self.assertRaises(ValueError):
                export_idle_rules.project_stages([row])


if __name__ == '__main__':
    unittest.main()
