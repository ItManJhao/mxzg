"""按客户端显式配置规范生成表名、只读类型和运行时校验描述；核验全部现有行，不采样猜类型。"""
import argparse
import json
from pathlib import Path
from export_gameconfig import open_book

ROOT = Path(__file__).resolve().parents[1]


def type_text(field):
    """递归输出显式类型；空对象禁止任意字段，数组必须声明元素类型。"""
    kind = field['type']
    if kind == 'array':
        return 'ReadonlyArray<' + type_text(field['items']) + '>'
    if kind == 'object':
        fields = field['fields']
        return '{ ' + '; '.join('readonly ' + json.dumps(k) + ('' if v.get('required') else '?') + ': ' + type_text(v) for k, v in sorted(fields.items())) + ' }' if fields else 'Readonly<Record<string, never>>'
    assert all(x in ('number', 'string', 'boolean', 'null') for x in kind.split('|')), kind
    return kind.replace('|', ' | ')


def validate(value, field, location):
    """校验显式字段类型并在异常中保留表、行与嵌套字段位置。"""
    kind = field['type']
    if kind == 'array':
        assert isinstance(value, list), location
        for i, item in enumerate(value):
            validate(item, field['items'], f'{location}[{i}]')
    elif kind == 'object':
        assert isinstance(value, dict), location
        assert not set(value) - set(field['fields']), location + ': 未声明字段'
        for key, spec in field['fields'].items():
            assert key in value or not spec.get('required'), location + '.' + key
            if key in value:
                validate(value[key], spec, location + '.' + key)
    else:
        actual = 'null' if value is None else 'boolean' if isinstance(value, bool) else 'number' if isinstance(value, (int, float)) else 'string' if isinstance(value, str) else 'invalid'
        assert actual in kind.split('|'), f'{location}: 需要 {kind}，实际 {actual}'


def field_notes(path):
    """读取本项目表头中文业务说明；派生配置由规范填写说明，不写绝对路径。"""
    book = ROOT / 'config/gameconfig' / (path.split('/')[-1] + '.xlsx')
    if not book.exists():
        return {}
    wb = open_book(book)
    notes = {}
    try:
        for sheet in wb:
            rows = list(sheet.iter_rows(min_row=1, max_row=3, values_only=True))
            if len(rows) < 3:
                continue
            for i, name in enumerate(rows[2]):
                if isinstance(name, str) and i < len(rows[0]) and rows[0][i]:
                    notes[name] = str(rows[0][i]).replace('*/', '* /').replace('\n', ' ')
    finally:
        wb.close()
    return notes


def generate(check):
    """验证规范与实际 JSON 后稳定生成；check 模式只比较结果，不写文件。"""
    schema = json.loads((ROOT / 'config/client-schema.json').read_text(encoding='utf-8'))['tables']
    out = ['/** 由 tools/generate_config.py 生成；字段规范在 config/client-schema.json，业务注释来自本项目表头。 */']
    for name, spec in sorted(schema.items()):
        notes = field_notes(spec['path'])
        data = json.loads((ROOT / 'client/assets/bundles' / (spec['path'] + '.json')).read_text(encoding='utf-8'))
        rows = data[spec['container']]
        rows = list(rows.values()) if isinstance(rows, dict) else rows
        seen = set()
        for i, row in enumerate(rows):
            key = str(row.get(spec['key']))
            if key in spec.get('ignoreKeys', []):
                continue
            validate(row, {'type': 'object', 'fields': spec['fields']}, f'{name}.rows[{i}]')
            assert key not in seen, f'{name}.rows[{i}]: 主键重复 {key}'
            seen.add(key)
        out.append(f'export interface {name}Row {{')
        for field, rule in sorted(spec['fields'].items()):
            note = notes.get(field, rule['note'])
            out.append(f'  /** {note} */')
            out.append('  readonly ' + field + ('' if rule.get('required') else '?') + ': ' + type_text(rule) + ';')
        out.append('}')
    out.append('export const GConfig = {')
    out.extend(f'  {name}: "{name}",' for name in sorted(schema))
    out.extend(['} as const;', 'export interface ConfigRowMap {'])
    out.extend(f'  {name}: {name}Row;' for name in sorted(schema))
    out.extend(['}', 'export interface ConfigKeyMap {'])
    out.extend(f'  {name}: {type_text(spec["fields"][spec["key"]])};' for name, spec in sorted(schema.items()))
    out.extend(['}', 'export interface ConfigFileMap {'])
    for name, spec in sorted(schema.items()):
        value = f'Readonly<Record<string, {name}Row>>' if spec['container'] == 'act' else f'readonly {name}Row[]'
        out.append(f'  {name}: {{ readonly {spec["container"]}: {value} }};')
    out.extend(['}', 'export type ConfigName = keyof ConfigRowMap;', 'export const CONFIG_SCHEMA = ' + json.dumps(schema, ensure_ascii=False, sort_keys=True, indent=2) + ' as const;', ''])
    target = ROOT / 'client/assets/scripts/config/GConfig.ts'
    text = '\n'.join(out)
    if check:
        assert target.read_text(encoding='utf-8') == text, 'GConfig.ts 已过期，请重新生成'
    else:
        target.write_text(text, encoding='utf-8')
    print(f'配置规范与生成类型验证通过：{len(schema)} 张当前有效表')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    generate(parser.parse_args().check)
