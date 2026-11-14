"""生成服务端挂机规则及三活动掉落投影；默认检查，--write更新，不开放领取或活动入口。

基础规则继续来自现用JSON；活动定向读取掉落与循环控制字段，包括未标记的gain_chance。
两份输出独立版本化，不将服务端未标记列恢复到客户端，不修改原始XLSX或现有基础规则格式。
"""
import argparse
import hashlib
import json
from pathlib import Path
from bundle_paths import bundle_directory
from export_gameconfig import DEFAULT_SRC, loose_rows, pick_primary, read_book

ROOT = Path(__file__).resolve().parents[1]
SOURCE = bundle_directory('config')
OUTPUT = ROOT / 'backend/src/main/resources/gameplay/idle-rules.json'
# 三活动是RoleMissionService.idleBattleReward实际调用顺序，不是页面预载资源清单。
ACTIVITY_TABLES = ((16, 'promotiondragonmarkdrops'), (34, 'promotionpvedrops'), (44, 'promotionfiredrops'))
# 旧PromotionType指定的最大轮次来源；034来自阶段表，不能借用掉落表的轮次上限。
ACTIVITY_CONTROL_SOURCES = ((16, 'promotiondragonmarkdrops'), (34, 'promotionpve'))
# 单独生成活动依据，不让恢复活动源字段改变已有基础挂机版本和冻结结果。
ACTIVITY_OUTPUT = ROOT / 'backend/src/main/resources/gameplay/idle-activities.json'


def project():
    """提取时间、基础收益、保底和权重；沿旧cache的idx升序固定随机消费及权重区间顺序。"""
    def rows(name):
        """读取现有导出，不修改策划表。"""
        return json.loads((SOURCE / (name + '.json')).read_text(encoding='utf-8'))['rows']
    system = {r['key']: r['value'] for r in rows('system')}
    result = {key: system[value] for key, value in {
        'frequency': 'idle_drop_frequency', 'initialSeconds': 'idle_initial_time',
        'maxSeconds': 'idle_max_time', 'resetSeconds': 'idle_drops_max_reset_time'}.items()}
    assert all(type(v) is int and v > 0 for v in result.values())
    stages = [{'id': r['idx'], 'group': r['drop_group'], 'base': [
        {'itemId': x['item_type'], 'quantity': x['item_num']} for x in json.loads(r['reward_base'])]}
        for r in rows('chapterreward') if r['mode_id'] == 1 and 1 <= r['idx'] <= 20]
    assert len(stages) == 20
    groups = {r['group'] for r in stages}
    # 旧BaseExcelCache先按idx排序，再顺序组装触发器与权重，不能依赖JSON导出时的行序。
    trigger_rows = sorted(rows('droptrigger'), key=lambda row: row['idx'])
    triggers = [{'group': r['drop_group'], 'type': r['item_group_type'], 'table': r['drop_trigger_id'],
        'chance': r['trigger_chance'], 'guarantee': r['drop_trigger_guarantee'], 'maximum': r['drop_item_max']}
        for r in trigger_rows if r['drop_group'] in groups]
    ids = {r['table'] for r in triggers}
    drop_rows = sorted(rows('dropgroup'), key=lambda row: row['idx'])
    drops = [{'table': r['drop_trigger_id'], 'itemId': r['item_type'], 'weight': r['chance'],
        'minimum': r['item_min'], 'maximum': r['item_max']} for r in drop_rows if r['drop_trigger_id'] in ids]
    assert ids == {r['table'] for r in drops}
    assert all(0 <= r['chance'] <= 1000000 and r['guarantee'] > 0 and r['maximum'] > 0 for r in triggers)
    assert all(r['weight'] > 0 and 0 < r['minimum'] <= r['maximum'] for r in drops)
    result.update(stages=stages, triggers=triggers, drops=drops)
    digest = hashlib.sha256(json.dumps(result, sort_keys=True).encode()).hexdigest()[:16]
    return dict(version='idle-' + digest, **result)


def activity_source_rows(source, name):
    """定位真实主sheet并读取全部原列；三份活动表的sheet均叫promotiondragonmarkdrops，不能用文件名代替。"""
    path = source / (name + '.xlsx')
    sheets = read_book(path)
    if not sheets:
        raise ValueError('挂机活动源表无有效sheet：' + name)
    primary = pick_primary(name, sheets)
    rows = loose_rows(path, primary['sheet'])
    if not rows:
        raise ValueError('挂机活动源表无有效数据：' + name)
    return rows


def require_integer(row, field, location, minimum=0, maximum=2147483647):
    """读取明确存在的整数并检查业务范围；0与缺失分开，拒绝布尔值和浮点占位。"""
    value = row.get(field)
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(f'挂机活动字段缺失或非法：{location}.{field}={value!r}')
    return value


def project_activity_controls(source, rows):
    """导出016/034真实循环参数与各自cache的最大轮次；044运营发布不制造策划周期。"""
    controls = []
    for activity_id, turns_table in ACTIVITY_CONTROL_SOURCES:
        matching = [row for row in rows if row.get('id') == activity_id]
        if len(matching) != 1:
            raise ValueError(f'挂机活动控制行缺失或重复：promotioncontrol.id={activity_id}')
        row = matching[0]
        location = f'promotioncontrol.id={activity_id}'
        projected = {'activityId': activity_id,
                     'openServerDay': require_integer(row, 'open_server_day', location, minimum=1),
                     'durationDays': require_integer(row, 'time', location),
                     'cleanDays': require_integer(row, 'clean_time', location),
                     'intervalDays': require_integer(row, 'interval_time', location),
                     'cycleType': require_integer(row, 'cycle_type', location, maximum=2),
                     'openTimeLimit': require_integer(row, 'open_time_limit', location, maximum=7)}
        if projected['durationDays'] + projected['cleanDays'] + projected['intervalDays'] <= 0:
            raise ValueError('挂机活动周期总天数必须大于0：' + location)
        turns = [require_integer(turn, 'turns', turns_table, minimum=1)
                 for turn in activity_source_rows(source, turns_table)]
        projected['maxTurns'] = max(turns)
        controls.append(projected)
    return controls


def project_activities(source=DEFAULT_SRC):
    """导出三活动掉落及016/034控制配置；不判断已发布状态、不改持久轮次或开放玩法。"""
    system = activity_source_rows(source, 'system')
    frequencies = [row for row in system if row.get('key') == 'idle_drop_frequency']
    if len(frequencies) != 1:
        raise ValueError('挂机活动随机频率配置缺失或重复：system.idle_drop_frequency')
    frequency = require_integer(frequencies[0], 'value', 'system.idle_drop_frequency', minimum=1)
    controls = activity_source_rows(source, 'promotioncontrol')
    activities = []
    for activity_id, table in ACTIVITY_TABLES:
        level = None
        if activity_id != 44:
            matching = [row for row in controls if row.get('id') == activity_id]
            if len(matching) != 1:
                raise ValueError(f'挂机活动控制行缺失或重复：promotioncontrol.id={activity_id}')
            level = require_integer(matching[0], 'open_level', f'promotioncontrol.id={activity_id}')
        drops = []
        ids = set()
        for row in activity_source_rows(source, table):
            drop_id = require_integer(row, 'idx', table, minimum=1)
            if drop_id in ids:
                raise ValueError(f'挂机活动掉落ID重复：{table}.idx={drop_id}')
            ids.add(drop_id)
            location = f'{table}.idx={drop_id}'
            turns = require_integer(row, 'turns', location, minimum=1) if activity_id != 44 else None
            interval = require_integer(row, 'gain_frequency', location, minimum=1)
            chance = require_integer(row, 'gain_chance', location, maximum=1000000)
            try:
                rewards = json.loads(row['reward'])
            except (KeyError, TypeError, json.JSONDecodeError) as error:
                raise ValueError('挂机活动奖励缺失或非法：' + location) from error
            if not isinstance(rewards, list) or not rewards:
                raise ValueError('挂机活动奖励必须为非空列表：' + location)
            projected_rewards = []
            for index, reward in enumerate(rewards):
                if not isinstance(reward, dict):
                    raise ValueError(f'挂机活动奖励条目非法：{location}.reward[{index}]')
                item = require_integer(reward, 'item_type', f'{location}.reward[{index}]', minimum=1)
                quantity = require_integer(reward, 'item_num', f'{location}.reward[{index}]', minimum=1,
                                           maximum=9223372036854775807)
                projected_rewards.append({'itemId': item, 'quantity': quantity})
            drops.append({'id': drop_id, 'turns': turns, 'rewards': projected_rewards,
                          'frequencySeconds': interval, 'gainChance': chance})
        # 旧BaseExcelCache先按idx升序；044取最小idx，016/034相同turns由后面的最大idx覆盖。
        # 这里只保留全部行，不在生成阶段合并奖励或裁掉重复turns，具体选行归规则层。
        drops.sort(key=lambda drop: drop['id'])
        activities.append({'id': activity_id, 'minimumRoleLevelExclusive': level, 'drops': drops})
    result = {'schema': 1, 'randomFrequencySeconds': frequency, 'activities': activities,
              'controls': project_activity_controls(source, controls)}
    digest = hashlib.sha256(json.dumps(result, sort_keys=True).encode()).hexdigest()[:16]
    return dict(version='idle-activities-' + digest, **result)


def main():
    """先完成两份纯投影校验，再一起检查漂移或显式写入；不修改客户端表和原始策划数据。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    outputs = ((OUTPUT, project()), (ACTIVITY_OUTPUT, project_activities()))
    for path, result in outputs:
        text = json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n'
        if args.write:
            path.write_text(text, encoding='utf-8')
        elif not path.exists() or path.read_text(encoding='utf-8') != text:
            raise SystemExit('挂机投影过期，请核对后 --write：' + path.name)
    print('idle rules and activity projection passed')


if __name__ == '__main__':
    main()
