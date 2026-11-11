"""校验战斗统计使用的58张进化头像与13帧高星光效，逐像素比较旧图集；不修改资源。"""
import argparse
import importlib.util
import json
import plistlib
import tempfile
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('statistics_atlas', ROOT / 'client/tools/extract_pvr_atlas.py')
atlas = importlib.util.module_from_spec(spec)
spec.loader.exec_module(atlas)


def verify(legacy):
    """只核对本批进化头像和光效，不把通用素材或全英雄表现算入本次验收。"""
    rows = json.loads((ROOT / 'client/assets/bundles/config/heroevolvelevel.json').read_text(encoding='utf-8'))['rows']
    wanted = {f'hero-icon/{row["evolve_icon_id"]}.png': ROOT / f'client/assets/bundles/hero/ui/hero-icon_{row["evolve_icon_id"]}.png' for row in rows}
    wanted.update({f'backpack-effect/effect-star-{i}.png': ROOT / f'client/assets/bundles/bag/ui/backpack-effect_effect-star-{i}.png' for i in range(13)})
    found = set()
    with tempfile.TemporaryDirectory() as temp:
        for file in sorted(legacy.glob('*.plist')):
            if not (file.stem.startswith('hero-icon') or file.stem == 'backpack-effect'):
                continue
            frames = plistlib.loads(file.read_bytes())['frames']
            selected = {key: value for key, value in frames.items() if key in wanted}
            if not selected:
                continue
            atlas.slice_frames(atlas.load_ccz_pvr(file.with_suffix('.pvr.ccz')), selected, Path(temp), '', True)
            for key in selected:
                expected = Image.open(Path(temp) / key.replace('/', '_')).convert('RGBA')
                actual = Image.open(wanted[key]).convert('RGBA')
                assert actual.size == expected.size and actual.tobytes() == expected.tobytes(), key
                found.add(key)
    assert found == set(wanted), sorted(set(wanted) - found)
    print(f'PASS {len(found)}统计图片与旧图集一致（58进化头像、13高星帧）')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--legacy', type=Path, required=True)
    verify(parser.parse_args().legacy)
