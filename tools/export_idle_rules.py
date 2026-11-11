"""从策划导出生成普通挂机规则；默认检查，--write 更新。仅包含已开放主线及其掉落依赖。"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'client/assets/bundles/config'
OUTPUT = ROOT / 'backend/src/main/resources/gameplay/idle-rules.json'


def project():
    """提取时间、基础收益、保底和权重，拒绝缺失引用或非法概率。"""
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
    triggers = [{'group': r['drop_group'], 'type': r['item_group_type'], 'table': r['drop_trigger_id'],
        'chance': r['trigger_chance'], 'guarantee': r['drop_trigger_guarantee'], 'maximum': r['drop_item_max']}
        for r in rows('droptrigger') if r['drop_group'] in groups]
    ids = {r['table'] for r in triggers}
    drops = [{'table': r['drop_trigger_id'], 'itemId': r['item_type'], 'weight': r['chance'],
        'minimum': r['item_min'], 'maximum': r['item_max']} for r in rows('dropgroup') if r['drop_trigger_id'] in ids]
    assert ids == {r['table'] for r in drops}
    assert all(0 <= r['chance'] <= 1000000 and r['guarantee'] > 0 and r['maximum'] > 0 for r in triggers)
    assert all(r['weight'] > 0 and 0 < r['minimum'] <= r['maximum'] for r in drops)
    result.update(stages=stages, triggers=triggers, drops=drops)
    digest = hashlib.sha256(json.dumps(result, sort_keys=True).encode()).hexdigest()[:16]
    return dict(version='idle-' + digest, **result)


def main():
    """检查生成漂移或显式写入版本化投影。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    args = parser.parse_args()
    text = json.dumps(project(), ensure_ascii=False, separators=(',', ':')) + '\n'
    if args.write:
        OUTPUT.write_text(text, encoding='utf-8')
    elif OUTPUT.read_text(encoding='utf-8') != text:
        raise SystemExit('挂机投影过期，请核对后 --write')
    print('idle rules projection passed')


if __name__ == '__main__':
    main()
