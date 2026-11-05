"""检查战斗图集恢复：Y偏移、半像素、RGBA透明度及已接入战斗实际帧与旧sourceColorRect一致。"""
import argparse
import importlib.util
import plistlib
import re
import tempfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('atlas', ROOT / 'client/tools/extract_pvr_atlas.py')
atlas = importlib.util.module_from_spec(spec)
spec.loader.exec_module(atlas)

def main():
    """先用独立像素例验证转换边界，再逐帧比对旧图集的真实裁切矩形。"""
    parser = argparse.ArgumentParser()
    parser.add_argument('--legacy', type=Path, required=True)
    args = parser.parse_args()
    with tempfile.TemporaryDirectory() as temp:
        tile = Image.new('RGBA', (1, 1), (100, 150, 200, 128))
        atlas.slice_frames(tile, {'one.png': {'frame': '{{0,0},{1,1}}',
            'offset': '{0.5,0.5}', 'sourceSize': '{4,4}'}}, Path(temp), '', True)
        image = Image.open(Path(temp) / 'one.png')
        assert image.getpixel((2, 1)) == (100, 150, 200, 128), '偏移方向或透明度错误'
        assert image.getpixel((2, 2)) == (0, 0, 0, 0)
    total = 0
    for name in ['skill-102050230', 'skill-102050231', 'skill-102050233', 'skill-102050233_1',
                 'skill-101040050', 'skill-101020021', 'hero-skill']:
        source = atlas.load_ccz_pvr(args.legacy / (name + '.pvr.ccz'))
        data = plistlib.loads((args.legacy / (name + '.plist')).read_bytes())
        for key, frame in data['frames'].items():
            x, y, w, h = map(int, re.findall(r'-?\d+', frame['frame']))
            assert not frame['rotated'], '本批旧图集应无旋转帧；遇到新格式需扩展独立验证'
            px, py, pw, ph = map(int, re.findall(r'-?\d+', frame['sourceColorRect']))
            sw, sh = map(int, re.findall(r'\d+', frame['sourceSize']))
            assert (w, h) == (pw, ph)
            expected = Image.new('RGBA', (sw, sh))
            expected.paste(source.crop((x, y, x + w, y + h)), (px, py))
            actual = Image.open(ROOT / 'client/assets/resources/battle/skill' / name / key.replace('/', '_')).convert('RGBA')
            assert actual.size == expected.size and actual.tobytes() == expected.tobytes(), key
            total += 1
    print(f'PASS {total}帧与旧图集sourceColorRect逐像素一致；Y偏移、半像素及alpha不重复叠加')

if __name__ == '__main__':
    main()
