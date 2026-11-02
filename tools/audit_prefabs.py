"""审查所有保留 Prefab（包含 Bundle）：结构、布局关系、绑定类、特殊锚点和视觉待验收范围。只读源资源。"""
import hashlib
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'client/tools'))
from check_citychrome_shell_id import class_id


def read(path):
    """读取 Creator JSON，兼容编辑器写出的 UTF-8 BOM。"""
    return json.loads(path.read_text(encoding='utf-8-sig'))


def audit():
    """逐项审查并输出稳定报告；不把序列化检查等同于画面验收。"""
    assets = ROOT / 'client/assets'
    known_uuids = set()

    def collect_uuids(value):
        """收集主资源和子资源 UUID，精确检查 Prefab 序列化资源引用。"""
        if isinstance(value, dict):
            if isinstance(value.get('uuid'), str):
                known_uuids.add(value['uuid'])
            for item in value.values():
                collect_uuids(item)
        elif isinstance(value, list):
            for item in value:
                collect_uuids(item)
    for meta in assets.rglob('*.meta'):
        collect_uuids(read(meta))
    scripts = {}
    for meta in assets.rglob('*.ts.meta'):
        source = meta.with_suffix('').read_text(encoding='utf-8-sig')
        match = re.search(r'@ccclass\(["\']([^"\']+)', source)
        if match:
            scripts[class_id(read(meta)['uuid'])] = match[1]
    changes = {row['path']: row for row in read(ROOT / 'config/prefab-layout-changes.json')}
    renames = {row['to']: row for row in read(ROOT / 'config/prefab-renames.json')}
    report = []
    for file in sorted(assets.rglob('*.prefab')):
        data = read(file)
        root_id = data[0]['data']['__id__']
        root = data[root_id]
        rel = file.relative_to(ROOT).as_posix()
        assert root['_name'] == file.stem, (rel, '根节点名与资源名不同')
        assert read(Path(str(file) + '.meta'))['uuid'], rel
        if rel in renames:
            assert read(Path(str(file) + '.meta'))['uuid'] == renames[rel]['uuid'], (rel, '重命名 UUID 变化')
        counts = {key: 0 for key in ['Widget', 'Layout', 'Mask', 'ScrollView', 'Animation', 'PrefabInstance']}
        anchors, roots, scrolls, warnings = [], [], [], []

        def refs(value):
            """检查所有局部引用索引，包含嵌套 Prefab 与动画组件引用。"""
            if isinstance(value, dict):
                if '__uuid__' in value:
                    assert value['__uuid__'] in known_uuids, (rel, '资源 UUID 不存在', value['__uuid__'])
                if '__id__' in value:
                    assert isinstance(value['__id__'], int) and 0 <= value['__id__'] < len(data), (rel, value)
                for item in value.values():
                    refs(item)
            elif isinstance(value, list):
                for item in value:
                    refs(item)
        refs(data)
        for index, item in enumerate(data):
            kind = item.get('__type__', '')
            short = kind.replace('cc.', '') if isinstance(kind, str) else ''
            if short in counts:
                counts[short] += 1
            if kind == 'cc.Node':
                for field in ['_lpos', '_lscale', '_lrot']:
                    for key, value in item.get(field, {}).items():
                        if key != '__type__':
                            assert isinstance(value, (int, float)) and math.isfinite(value), (rel, index, field)
                for comp in item.get('_components', []):
                    assert data[comp['__id__']].get('node', {}).get('__id__') == index, (rel, index, '组件归属错误')
            if kind == 'cc.UITransform':
                size, anchor = item['_contentSize'], item['_anchorPoint']
                assert size['width'] >= 0 and size['height'] >= 0, (rel, index, '负尺寸')
                node = data[item['node']['__id__']]
                if anchor['x'] != 0.5 or anchor['y'] != 0.5:
                    anchors.append({'node': node['_name'], 'anchor': [anchor['x'], anchor['y']]})
            if kind == 'cc.ScrollView':
                content = item.get('_content') or item.get('content')
                scrolls.append({'node': data[item['node']['__id__']]['_name'], 'content': content})
                if content:
                    assert data[content['__id__']]['__type__'] == 'cc.Node', (rel, 'ScrollView content 非节点')
                else:
                    warnings.append('组合资源 ScrollView 未绑定 content；开放业务前须绑定并实际滚动验收')
        components = [data[c['__id__']] for c in root.get('_components', [])]
        classes = [scripts[c['__type__']] for c in components if c['__type__'] in scripts]
        views = [name for name in classes if name.endswith('View')]
        if views:
            assert file.stem in views, (rel, classes, '界面资源与实际类不一致')
        ui = next((c for c in components if c['__type__'] == 'cc.UITransform'), None)
        assert ui is not None, (rel, '根缺少 UITransform')
        if file.stem == 'ChapterRewardLayer':
            # 360×800 在当前固定高度策略下可见宽度为 576；静态缩放必须连同根原点一起校验。
            size, scale, anchor = ui['_contentSize'], root['_lscale'], ui['_anchorPoint']
            assert size['width'] * scale['x'] <= 576, (rel, '窄屏宽度裁切')
            for axis, dimension in [('x', 'width'), ('y', 'height')]:
                expected = (anchor[axis] - 0.5) * size[dimension] * scale[axis]
                assert math.isclose(root['_lpos'][axis], expected), (rel, '缩放后根位置未居中')
        if file.stem == 'ServerPickerView':
            view = next(c for c in components if 'scrollHost' in c)
            host, port = data[view['scrollHost']['__id__']], data[view['scrollPort']['__id__']]
            assert not any(data[c['__id__']]['__type__'] == 'cc.Mask' for c in host['_components'])
            assert any(data[c['__id__']]['__type__'] == 'cc.Mask' for c in port['_components'])
        if file.stem == 'HeroListBoardView':
            view = next(c for c in components if 'heroScroll' in c)
            host, port, content = [data[view[key]['__id__']] for key in ['heroScroll', 'heroPort', 'heroContent']]
            assert content['_parent'] == view['heroPort'], (rel, '内容必须静态挂在视口下')
            assert not any(data[c['__id__']]['__type__'] == 'cc.Mask' for c in host['_components'])
            assert any(data[c['__id__']]['__type__'] == 'cc.Mask' for c in port['_components'])
        report.append({'path': rel, 'classes': classes, 'root': {'position': root['_lpos'], 'scale': root['_lscale'], 'size': ui['_contentSize'], 'anchor': ui['_anchorPoint']},
                       'components': counts, 'specialAnchors': anchors, 'scrolls': scrolls, 'warnings': warnings,
                       'decision': '已按 Bag 挂载约定修正根位置或静态遮罩；子节点锚点保留' if rel in changes else '保留：组件/组合局部坐标与布局关系不机械转换',
                       'reviewStatus': '依赖所属页面检查的组合资源' if re.search(r'(?:Cell(?:View)?|ItemView|TabView|BoardView|SlotView|Shell|Chip(?:View)?)$', file.stem) else '结构检查通过但视觉待验收',
                       'visual': '未完成三尺寸全项视觉验收；局部实测与修复复验范围见 prefab-layout.md', 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    target = ROOT / 'docs/prefab-review.json'
    text = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if '--check' in sys.argv:
        assert target.read_text(encoding='utf-8') == text, 'Prefab 审查报告已过期'
    else:
        target.write_text(text, encoding='utf-8')
    print(f'Prefab 结构审查通过：{len(report)} 份；不据结构结果签署完整视觉验收')


if __name__ == '__main__':
    audit()
