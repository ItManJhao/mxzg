"""从现有策划导出生成普通升级的最小服务端投影；默认校验，--write 才更新生成文件。"""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'backend/src/main/resources/gameplay/hero-growth.json'
FIELDS = {
    'herolevel': ('level', 'exp_need', 'gold_need'),
    'heroupgrade': ('grade', 'begin_level', 'level'),
    'heroupgraderate': ('idx', 'hero_id', 'grade', 'hp_rate', 'atk_rate', 'def_rate', 'spd_rate', 'hp_grow', 'atk_grow', 'def_grow', 'spd_grow'),
    'herobase': ('idx', 'type', 'star', 'hp', 'atk', 'def', 'spd'),
    'herostar': ('star', 'level_limit'),
}


def project():
    """只取普通升级用到的列，拒绝缺字段、重复主键和非法数值，内容哈希作为配置版本。"""
    result = {}
    for name, fields in FIELDS.items():
        rows = json.loads((ROOT / 'client/assets/bundles/config' / (name + '.json')).read_text(encoding='utf-8'))['rows']
        selected = [{field: row[field] for field in fields} for row in rows]
        if len({row[fields[0]] for row in selected}) != len(selected):
            raise ValueError('重复配置主键：' + name)
        if not selected or any(type(value) is not int or value < 0 for row in selected for value in row.values()):
            raise ValueError('无效普通升级配置：' + name)
        result[name] = selected
    digest = hashlib.sha256(json.dumps(result, sort_keys=True, separators=(',', ':')).encode()).hexdigest()[:16]
    return {'version': 'hero-growth-' + digest, **result}


def main():
    """执行稳定生成或漂移检查，不触碰策划源表和数据库。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true')
    options = parser.parse_args()
    text = json.dumps(project(), ensure_ascii=False, separators=(',', ':')) + '\n'
    if options.write:
        OUTPUT.write_text(text, encoding='utf-8')
    elif OUTPUT.read_text(encoding='utf-8') != text:
        raise SystemExit('普通升级配置投影过期，请核对来源后使用 --write')
    print('普通升级配置投影一致')


if __name__ == '__main__':
    main()
