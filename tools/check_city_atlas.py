"""核对主城两段河流的原始画布、帧偏移与RGBA，防止裁切帧居中播放造成跳动。"""
import argparse
import importlib.util
import plistlib
import re
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def main():
    """从旧图集独立还原每帧，并检查两段河流各10帧与资源像素完全一致。"""
    parser = argparse.ArgumentParser()
    parser.add_argument('--legacy', type=Path, required=True)
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location('atlas', ROOT / 'client/tools/extract_pvr_atlas.py')
    atlas = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(atlas)
    source = atlas.load_ccz_pvr(args.legacy / 'main-city-effect.pvr.ccz')
    frames = plistlib.loads((args.legacy / 'main-city-effect.plist').read_bytes())['frames']
    count = 0
    for group, size in [('rivers1', (431, 211)), ('rivers2', (346, 138))]:
        for index in range(10):
            key = f'main-city-effect/{group}-{index}.png'
            frame = frames[key]
            assert not frame['textureRotated']
            x, y, w, h = map(int, re.findall(r'-?\d+', frame['textureRect']))
            sw, sh = map(int, re.findall(r'\d+', frame['spriteSourceSize']))
            ox, oy = map(float, re.findall(r'-?\d+(?:\.\d+)?', frame['spriteOffset']))
            assert (sw, sh) == size
            actual = Image.open(ROOT / 'client/assets/resources/ui/city' / key.replace('/', '_')).convert('RGBA')
            assert actual.size == size, key + ': 原始画布丢失'
            left = (sw - w) / 2 + ox
            top = (sh - h) / 2 - oy
            assert left.is_integer() and top.is_integer()
            expected = Image.new('RGBA', size)
            expected.paste(source.crop((x, y, x+w, y+h)), (int(left), int(top)))
            assert actual.tobytes() == expected.tobytes(), key + ': 偏移或透明度错误'
            count += 1
    print(f'PASS 主城河流{count}帧：固定原始画布、旧偏移与RGBA一致')


if __name__ == '__main__':
    main()
