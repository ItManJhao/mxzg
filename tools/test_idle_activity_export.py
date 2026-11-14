"""挂机活动定向导出回归：验证掉落与循环控制的真实来源及拒绝边界，不开放或写入玩家活动。"""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import openpyxl
import export_idle_rules


class IdleActivityExportTests(unittest.TestCase):
    """临时源表保留旧格式与错位sheet名称，检查生成输入而不依赖客户端表或target缓存。"""

    def setUp(self):
        """创建独立策划源样板；未标记概率列与明确0值保留，结束时清理全部临时文件。"""
        temporary = export_idle_rules.ROOT / 'client/temp'
        temporary.mkdir(parents=True, exist_ok=True)
        # 本用例专用工作区，销毁时自动清理，不改项目真实XLSX。
        self.temporary = tempfile.TemporaryDirectory(dir=temporary)
        self.addCleanup(self.temporary.cleanup)
        # 本次生成读取的源表根目录。
        self.source = Path(self.temporary.name)
        self.write_book('system', ['key', 'value'], [{'key': 'idle_drop_frequency', 'value': 60}])
        self.write_controls()
        self.write_book('promotionpve', ['idx', 'turns'], [{'idx': 100100, 'turns': 1}])
        for activity_id, table in export_idle_rules.ACTIVITY_TABLES:
            row = {'idx': 100100, 'turns': 1, 'reward': '[{"item_type":901701,"item_num":1}]',
                   'gain_frequency': 1234, 'gain_chance': 0 if activity_id == 34 else 6936}
            self.write_drops(table, [row])

    def write_book(self, name, fields, rows):
        """写入真实旧格式，活动sheet统一用历史名称，gain_chance导出标记故意留空。"""
        book = openpyxl.Workbook()
        sheet = book.active
        sheet.title = 'promotiondragonmarkdrops' if name.endswith('drops') else name
        sheet.append(fields)
        sheet.append([None if field == 'gain_chance' else 3 for field in fields])
        sheet.append(fields)
        for row in rows:
            sheet.append([row.get(field) for field in fields])
        try:
            book.save(self.source / (name + '.xlsx'))
        finally:
            book.close()

    def write_drops(self, name, rows):
        """重写临时掉落输入，保留完整列以区分字段为空与明确概率0。"""
        self.write_book(name, ['idx', 'turns', 'reward', 'gain_frequency', 'gain_chance'], rows)

    def write_controls(self, changes=None):
        """写入完整临时控制表，允许指定字段变更；保留034第9999开服日而非伪造即时开放。"""
        rows = [dict(id=16, open_level=1, open_server_day=1, time=7, clean_time=2,
                     interval_time=0, cycle_type=0, open_time_limit=0),
                dict(id=34, open_level=10, open_server_day=9999, time=7, clean_time=0,
                     interval_time=0, cycle_type=0, open_time_limit=0)]
        if changes:
            rows[0].update(changes)
        self.write_book('promotioncontrol', ['id', 'open_level', 'open_server_day', 'time',
                                            'clean_time', 'interval_time', 'cycle_type', 'open_time_limit'], rows)

    def test_actual_sources_and_outputs(self):
        """真实未标记概率与开放等级必须进入服务端投影；原基础输出和活动版本均保持可重复生成。"""
        actual = export_idle_rules.project_activities()
        self.assertEqual(actual['schema'], 1)
        self.assertEqual(actual['randomFrequencySeconds'], 60)
        activities = actual['activities']
        self.assertEqual([activity['id'] for activity in activities], [16, 34, 44])
        self.assertEqual([activity['minimumRoleLevelExclusive'] for activity in activities], [1, 10, None])
        self.assertEqual([activity['drops'][0]['gainChance'] for activity in activities], [6936, 0, 6936])
        self.assertEqual([activity['drops'][0]['turns'] for activity in activities], [1, 1, None])
        self.assertEqual([activity['drops'][0]['frequencySeconds'] for activity in activities], [1234, 3600, 1234])
        self.assertEqual(actual['controls'], [
            dict(activityId=16, openServerDay=1, durationDays=7, cleanDays=2,
                 intervalDays=0, cycleType=0, openTimeLimit=0, maxTurns=1),
            dict(activityId=34, openServerDay=9999, durationDays=7, cleanDays=0,
                 intervalDays=0, cycleType=0, openTimeLimit=0, maxTurns=1)])
        self.assertEqual(json.loads(export_idle_rules.ACTIVITY_OUTPUT.read_text(encoding='utf-8')), actual)
        baseline = json.dumps(export_idle_rules.project(), ensure_ascii=False, separators=(',', ':')) + '\n'
        self.assertEqual(export_idle_rules.OUTPUT.read_text(encoding='utf-8'), baseline)

    def test_basic_projection_keeps_old_idx_order_when_export_rows_are_reversed(self):
        """普通触发器和权重沿旧cache按idx排序；乱序JSON仍生成完全相同的内容及版本，不改真实源。"""
        baseline = export_idle_rules.project()
        temporary_source = self.source / 'exported'
        temporary_source.mkdir()
        for name in ('system', 'chapterreward', 'droptrigger', 'dropgroup'):
            document = json.loads((export_idle_rules.SOURCE / (name + '.json')).read_text(encoding='utf-8'))
            if name in ('droptrigger', 'dropgroup'):
                document['rows'] = list(reversed(document['rows']))
            (temporary_source / (name + '.json')).write_text(
                json.dumps(document, ensure_ascii=False), encoding='utf-8')
        with patch.object(export_idle_rules, 'SOURCE', temporary_source):
            self.assertEqual(export_idle_rules.project(), baseline)

    def test_control_maximum_turns_uses_the_actual_cache_source(self):
        """016取龙鳞掉落最大轮次，034取诸神阶段表；掉落轮次不同不能误改034控制上限。"""
        reward = '[{"item_type":901701,"item_num":1}]'
        self.write_drops('promotiondragonmarkdrops', [
            dict(idx=300, turns=3, reward=reward, gain_frequency=100, gain_chance=0),
            dict(idx=100, turns=1, reward=reward, gain_frequency=100, gain_chance=0)])
        self.write_drops('promotionpvedrops', [
            dict(idx=100, turns=9, reward=reward, gain_frequency=100, gain_chance=0)])
        self.write_book('promotionpve', ['idx', 'turns'], [
            dict(idx=200, turns=4), dict(idx=100, turns=2)])
        controls = export_idle_rules.project_activities(self.source)['controls']
        self.assertEqual([control['activityId'] for control in controls], [16, 34])
        self.assertEqual([control['maxTurns'] for control in controls], [3, 4])
        self.assertEqual(controls[1]['openServerDay'], 9999)

    def test_control_fields_and_cycle_boundaries_are_explicit(self):
        """控制字段缺失、非法周期/天数拒绝；非零星期限制保留给规则层明确拒绝，不擅自修旧分支。"""
        for changes in ({'open_server_day': 0}, {'time': None}, {'clean_time': -1},
                        {'interval_time': -1}, {'cycle_type': 3}, {'open_time_limit': 8},
                        {'time': 0, 'clean_time': 0, 'interval_time': 0}):
            with self.subTest(changes=changes):
                self.write_controls(changes)
                with self.assertRaises(ValueError):
                    export_idle_rules.project_activities(self.source)
        for cycle in (0, 1, 2):
            self.write_controls({'cycle_type': cycle, 'open_time_limit': 7})
            control = export_idle_rules.project_activities(self.source)['controls'][0]
            self.assertEqual(control['cycleType'], cycle)
            self.assertEqual(control['openTimeLimit'], 7)

    def test_control_maximum_turns_cannot_hide_a_missing_stage_field(self):
        """034阶段表缺轮次必须拒绝，不能改查仍完整的pvedrops或默认最大轮次1。"""
        self.write_book('promotionpve', ['idx', 'turns'], [{'idx': 100100, 'turns': None}])
        with self.assertRaisesRegex(ValueError, 'promotionpve.turns'):
            export_idle_rules.project_activities(self.source)

    def test_unmarked_zero_and_different_sheet_names(self):
        """活动文件名不同于sheet时仍读取未标记列，0概率不能被省略或变成缺失。"""
        actual = export_idle_rules.project_activities(self.source)
        self.assertEqual([activity['drops'][0]['gainChance'] for activity in actual['activities']], [6936, 0, 6936])
        self.assertIsNone(actual['activities'][2]['minimumRoleLevelExclusive'])
        self.assertIsNone(actual['activities'][2]['drops'][0]['turns'])

    def test_missing_probability_rejected(self):
        """概率缺失拒绝整份投影，不能用Java字段默认0或表头描述补值。"""
        self.write_drops('promotionpvedrops', [
            {'idx': 100100, 'turns': 1, 'reward': '[{"item_type":900502,"item_num":1}]',
             'gain_frequency': 3600}])
        with self.assertRaisesRegex(ValueError, 'gain_chance'):
            export_idle_rules.project_activities(self.source)

    def test_probability_range_and_integer_type(self):
        """仅允许明确百万分比整数，0与百万合法，负数、越界、布尔和小数拒绝。"""
        row = {'idx': 100100, 'turns': 1, 'reward': '[{"item_type":901701,"item_num":1}]',
               'gain_frequency': 1234}
        for chance in (0, 1000000):
            self.write_drops('promotiondragonmarkdrops', [dict(row, gain_chance=chance)])
            actual = export_idle_rules.project_activities(self.source)
            self.assertEqual(actual['activities'][0]['drops'][0]['gainChance'], chance)
        for chance in (-1, 1000001, True, 0.5):
            with self.subTest(chance=chance):
                self.write_drops('promotiondragonmarkdrops', [dict(row, gain_chance=chance)])
                with self.assertRaisesRegex(ValueError, 'gain_chance'):
                    export_idle_rules.project_activities(self.source)

    def test_missing_or_duplicate_controls_rejected(self):
        """016和034必须有唯一明确等级依据，044不借用不存在的控制行推断等级。"""
        self.write_book('promotioncontrol', ['id', 'open_level'], [{'id': 16, 'open_level': 1}])
        with self.assertRaisesRegex(ValueError, '控制行缺失或重复.*34'):
            export_idle_rules.project_activities(self.source)
        self.write_book('promotioncontrol', ['id', 'open_level'], [
            {'id': 16, 'open_level': 1}, {'id': 16, 'open_level': 2}, {'id': 34, 'open_level': 10}])
        with self.assertRaisesRegex(ValueError, '控制行缺失或重复.*16'):
            export_idle_rules.project_activities(self.source)

    def test_sort_and_preserve_turns_and_reward_parts(self):
        """按旧cache的idx排序，重复轮次和同ID原奖励分项保留，不能提前合并改变神职取整。"""
        rewards = '[{"item_type":901701,"item_num":1},{"item_type":901701,"item_num":3}]'
        self.write_drops('promotiondragonmarkdrops', [
            {'idx': 200, 'turns': 1, 'reward': rewards, 'gain_frequency': 100, 'gain_chance': 0},
            {'idx': 100, 'turns': 1, 'reward': rewards, 'gain_frequency': 200, 'gain_chance': 6936}])
        drops = export_idle_rules.project_activities(self.source)['activities'][0]['drops']
        self.assertEqual([drop['id'] for drop in drops], [100, 200])
        self.assertEqual([drop['turns'] for drop in drops], [1, 1])
        self.assertEqual(drops[0]['rewards'], [{'itemId': 901701, 'quantity': 1}, {'itemId': 901701, 'quantity': 3}])

    def test_invalid_drop_inputs_rejected(self):
        """重复ID、非正频率、缺轮次和非法奖励都拒绝，不返回部分可用投影。"""
        base = {'idx': 100, 'turns': 1, 'reward': '[{"item_type":901701,"item_num":1}]',
                'gain_frequency': 1234, 'gain_chance': 6936}
        changes = ({'gain_frequency': 0}, {'turns': None}, {'reward': '[]'},
                   {'reward': '[{"item_type":901701,"item_num":-1}]'}, {'reward': 'invalid'})
        for change in changes:
            with self.subTest(change=change):
                self.write_drops('promotiondragonmarkdrops', [dict(base, **change)])
                with self.assertRaises(ValueError):
                    export_idle_rules.project_activities(self.source)
        self.write_drops('promotiondragonmarkdrops', [base, base])
        with self.assertRaisesRegex(ValueError, 'ID重复'):
            export_idle_rules.project_activities(self.source)

    def test_main_checks_and_writes_both_outputs(self):
        """默认检查同时拒绝活动漂移；显式write更新两份独立输出，随后默认检查成功。"""
        basic_output = self.source / 'idle-rules.json'
        activity_output = self.source / 'idle-activities.json'
        activity_output.write_text('{}\n', encoding='utf-8')
        with patch.object(export_idle_rules, 'OUTPUT', basic_output), \
                patch.object(export_idle_rules, 'ACTIVITY_OUTPUT', activity_output), \
                patch.object(export_idle_rules, 'project', return_value={'version': 'unchanged'}), \
                patch.object(export_idle_rules, 'project_activities', return_value={'schema': 1}):
            basic_output.write_text('{"version":"unchanged"}\n', encoding='utf-8')
            with patch.object(sys, 'argv', ['export_idle_rules.py']), \
                    self.assertRaisesRegex(SystemExit, 'idle-activities.json'):
                export_idle_rules.main()
            with patch.object(sys, 'argv', ['export_idle_rules.py', '--write']):
                export_idle_rules.main()
            self.assertEqual(json.loads(activity_output.read_text(encoding='utf-8')), {'schema': 1})
            with patch.object(sys, 'argv', ['export_idle_rules.py']):
                export_idle_rules.main()

    def test_write_validates_all_inputs_before_output(self):
        """活动输入失败时write也不得先覆盖基础文件，避免生成半套新依据。"""
        basic_output = self.source / 'idle-rules.json'
        basic_output.write_text('original', encoding='utf-8')
        with patch.object(export_idle_rules, 'OUTPUT', basic_output), \
                patch.object(export_idle_rules, 'project', return_value={'version': 'new'}), \
                patch.object(export_idle_rules, 'project_activities', side_effect=ValueError('invalid activity')), \
                patch.object(sys, 'argv', ['export_idle_rules.py', '--write']), \
                self.assertRaisesRegex(ValueError, 'invalid activity'):
            export_idle_rules.main()
        self.assertEqual(basic_output.read_text(encoding='utf-8'), 'original')


if __name__ == '__main__':
    unittest.main()
