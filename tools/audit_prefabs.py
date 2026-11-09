"""审查所有保留 Prefab（包含 Bundle）的结构与绑定，合并文件指纹对应的人工视觉证据。只读源资源，不代签 Inspector。"""
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


def check_repaired_panels(data, name):
    """检查已修复窗口的内容包含与文字分栏，阻止父坐标错位、自动扩宽再次造成遮挡。"""
    if name not in ('BattleEditLayer', 'HeroInfoUpgradeLayer', 'UpgradeSuccessLayer',
                    'MailInfoLayer', 'ItemSelectLayer'):
        return
    root_id = data[0]['data']['__id__']

    def bounds(node):
        """把现有 UITransform 的矩形换算到根局部坐标，仅用于静态断言，不修改资源。"""
        ui = next(data[c['__id__']] for c in node['_components'] if data[c['__id__']]['__type__'] == 'cc.UITransform')
        size, anchor = ui['_contentSize'], ui['_anchorPoint']
        box = [-anchor['x'] * size['width'], -anchor['y'] * size['height'],
               (1 - anchor['x']) * size['width'], (1 - anchor['y']) * size['height']]
        while node is not data[root_id]:
            for i, axis in enumerate(('x', 'y', 'x', 'y')):
                box[i] = box[i] * node['_lscale'][axis] + node['_lpos'][axis]
            node = data[node['_parent']['__id__']]
        return box

    def separate(a, b):
        """判断两个正向轴对齐矩形没有互相覆盖，边缘相接允许。"""
        return a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1]

    nodes = [n for n in data if n.get('__type__') == 'cc.Node']
    if name == 'MailInfoLayer':
        box = bounds(next(n for n in nodes if n['_name'] == 'spr_bg'))
        root = data[root_id]
        assert (box[2] - box[0]) * root['_lscale']['x'] <= 576, (name, '底板实际宽度超出窄屏，不能只检查根尺寸')
        assert math.isclose(root['_lpos']['x'] + (box[0] + box[2]) / 2 * root['_lscale']['x'], 0), (name, '缩放后底板偏离中心')
        return
    if name == 'ItemSelectLayer':
        price = next(n for n in nodes if n['_name'] == 'node_price')
        children = [data[c['__id__']] for c in price['_children']]
        background = bounds(next(n for n in children if n['_name'] == 'CCScale9Sprite_1'))
        boxes = [bounds(next(n for n in children if n['_name'] == key)) for key in ('spr_res_need', 'lbl_res_need')]
        assert separate(*boxes), (name, '价格图标与数字重叠')
        for box in boxes:
            assert box[0] >= background[0] and box[1] >= background[1] and box[2] <= background[2] and box[3] <= background[3], (name, '价格内容越出底条')
        label_node = next(n for n in children if n['_name'] == 'lbl_res_need')
        label = next(data[c['__id__']] for c in label_node['_components'] if data[c['__id__']]['__type__'] == 'cc.Label')
        assert label['_overflow'] == 2, (name, '长价格必须限制在固定列宽')
        return
    if name == 'BattleEditLayer':
        background = bounds(next(n for n in nodes if n['_name'] == 'spr_bg'))
        parts = [bounds(next(n for n in nodes if n['_name'] == key))
                 for key in ('spr_send1', 'btn_send', 'UIMenuItemLabel_1', 'btn_close')]
        for box in parts:
            assert box[0] >= background[0] and box[1] >= background[1] and box[2] <= background[2] and box[3] <= background[3], (name, '内容或按钮越出底板')
        # 右上角关闭按钮可叠在底板装饰边缘；正文不能覆盖底部发送/清除操作区。
        assert all(separate(a, b) for i, a in enumerate(parts[:3]) for b in parts[i + 1:3]), (name, '内容和底部按钮互相覆盖')
        return
    skill = next(n for n in nodes if n['_name'] == 'skill_node')
    skill_box = bounds(data[skill['_children'][0]['__id__']])
    for row in nodes:
        children = [data[c['__id__']] for c in row['_children']]
        labels = [n for n in children if n['_name'].startswith('lbl_')]
        if not any(n['_name'].startswith('lbl_pre_') for n in labels):
            continue
        boxes = [bounds(n) for n in labels]
        assert all(separate(box, skill_box) for box in boxes), (name, '属性文字侵入技能区')
        assert all(separate(a, b) for i, a in enumerate(boxes) for b in boxes[i + 1:]), (name, '属性列互相覆盖')
        for node in labels:
            label = next(data[c['__id__']] for c in node['_components'] if data[c['__id__']]['__type__'] == 'cc.Label')
            assert label['_overflow'] == 2 and not label['_enableWrapText'], (name, '数字列必须按固定宽度缩小，不能自动扩宽')


def audit():
    """逐项审查并输出稳定报告；不把序列化检查等同于画面验收。"""
    assets = ROOT / 'client/assets'
    acceptance = read(ROOT / 'config/prefab-acceptance.json')['entries']
    accepted_paths = set()
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
        check_repaired_panels(data, file.stem)
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
        if file.stem in ('ChapterRewardLayer', 'ChapterPreviewLayer',
                         'HeroSuggestLayer', 'MailLayer', 'SettingLayer', 'QuickBattleLayer'):
            # 360×800 在当前固定高度策略下可见宽度为 576；静态缩放必须连同根原点一起校验。
            size, scale, anchor = ui['_contentSize'], root['_lscale'], ui['_anchorPoint']
            assert size['width'] * scale['x'] <= 576, (rel, '窄屏宽度裁切')
            for axis, dimension in [('x', 'width'), ('y', 'height')]:
                expected = (anchor[axis] - 0.5) * size[dimension] * scale[axis]
                assert math.isclose(root['_lpos'][axis], expected), (rel, '缩放后根位置未居中')
        if file.stem == 'BattleDetailLayer':
            # 统计页根负责全屏遮罩，旧600×750主体独立适配；不能再按旧根整体缩放断言。
            view = next(c for c in components if 'attackerList' in c and 'defenderList' in c)
            panel = data[view['panel']['__id__']]
            assert panel['_name'] == 'StatisticsPanel'
            assert math.isclose(panel['_lpos']['x'], -300 * panel['_lscale']['x'])
            assert math.isclose(panel['_lpos']['y'], -375 * panel['_lscale']['y'])
            assert 600 * panel['_lscale']['x'] <= 552
            for field in ('attackerList', 'defenderList'):
                scroll = data[view[field]['__id__']]
                assert scripts.get(scroll['__type__']) == 'SuperScroll', (rel, field)
                content = data[scroll['_content']['__id__']]
                port = data[content['_parent']['__id__']]
                assert port['_parent'] == scroll['node'], (rel, '统计列表层级错误')
                assert any(data[c['__id__']]['__type__'] == 'cc.Mask' for c in port['_components'])
                assert any(scripts.get(data[c['__id__']]['__type__']) == 'SuperContent' for c in content['_components'])
        if file.stem == 'ServerPickerView':
            # 选服已迁为两个SuperScroll；检查实际绑定，不能继续读取旧scrollHost字段。
            view = next(c for c in components if 'serverScroll' in c and 'regionScroll' in c)
            assert view['serverScroll'] != view['regionScroll'], (rel, '两列滚动不能复用同一组件')
            for field in ('serverScroll', 'regionScroll'):
                scroll = data[view[field]['__id__']]
                assert scripts.get(scroll['__type__']) == 'SuperScroll', (rel, field, '必须绑定SuperScroll')
                host = data[scroll['node']['__id__']]
                content = data[scroll['_content']['__id__']]
                port = data[content['_parent']['__id__']]
                assert port['_parent'] == scroll['node'], (rel, field, '需要Scroll/view/content层级')
                assert not any(data[c['__id__']]['__type__'] == 'cc.Mask' for c in host['_components'])
                assert any(data[c['__id__']]['__type__'] == 'cc.Mask' for c in port['_components'])
                assert any(scripts.get(data[c['__id__']]['__type__']) == 'SuperContent'
                           for c in content['_components']), (rel, field, '内容必须使用SuperContent')
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
        evidence = acceptance.get(rel)
        if evidence:
            accepted_paths.add(rel)
            assert evidence['sha256'] == report[-1]['sha256'], (rel, '人工验收记录对应旧 Prefab，须重新核对')
            assert evidence['status'] in ('实际预览通过', '结构检查通过但视觉待验收',
                                          '发现问题待修复', '依赖所属页面检查的组合资源'), rel
            report[-1]['reviewStatus'] = evidence['status']
            report[-1]['visual'] = evidence['scope']
            report[-1]['acceptance'] = evidence
    assert accepted_paths == set(acceptance), '人工验收记录含已移除资源'
    target = ROOT / 'docs/prefab-review.json'
    text = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    if '--check' in sys.argv:
        assert target.read_text(encoding='utf-8') == text, 'Prefab 审查报告已过期'
    else:
        target.write_text(text, encoding='utf-8')
    print(f'Prefab 结构审查通过：{len(report)} 份；不据结构结果签署完整视觉验收')


if __name__ == '__main__':
    audit()
