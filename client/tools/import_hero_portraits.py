"""从已取回的日服公开立绘资源生成英雄详情 WebP、Creator meta 及模型映射。

输入为公开 res_index.json、jp_hero_portrait.lua 和 PNG 的本地副本。
工具比对公开索引，保留全图画布尺寸和 alpha，生成运行时按英雄形态选择的本地映射。
重复导入保留已有 UUID，不修改功能界面、预制体和游戏配置。
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
from uuid import NAMESPACE_URL, uuid5

from PIL import Image, ImageChops


CLIENT = Path(__file__).resolve().parents[1]
PORTRAIT_DIR = CLIENT / "assets/bundles/module/hero/portraits"
UTILS = CLIENT / "assets/scripts/features/hero/utils"
CONFIG = CLIENT / "assets/bundles/resources/config"
IMAGE_NAME = re.compile(r"jp_portrait_\d+_\d+_full\.png")
LUA_ROW = re.compile(r'^\s*\[(\d+)\]\s*=\s*\{\s*file\s*=\s*"(\d+_\d+)",\s*full\s*=\s*\{(.*)\}\s*\},\s*$', re.M)


def read_json(path):
    """读取 Creator 配置、公开索引和既有 meta，兼容源文件 BOM。"""
    return json.loads(path.read_text(encoding="utf-8-sig"))


def read_layout(path):
    """解析实际部署的全身图与布局参数，Lua 表中省略的偏移按原逻辑取零。"""
    text = path.read_text(encoding="utf-8-sig")
    rows = {}
    for key, image, body in LUA_ROW.findall(text):
        bounds = re.search(r"box\s*=\s*\{([\d, ]+)\}", body)
        if not bounds or int(key) in rows:
            raise ValueError(f"公开立绘布局不完整或重复：{key}")
        box = tuple(map(int, bounds[1].split(",")))
        if len(box) != 4 or not (0 <= box[0] < box[2] and 0 <= box[1] < box[3]):
            raise ValueError(f"公开立绘范围无效：{key}")
        fields = dict(re.findall(r"\b(zoom|dx|dy)\s*=\s*(-?\d+(?:\.\d+)?)", body))
        rows[int(key)] = image, box, float(fields.get("zoom", "1")), float(fields.get("dx", "0")), float(fields.get("dy", "0"))
    expected = re.findall(r'^\s*\[(\d+)\]\s*=\s*\{\s*file\s*=', text, re.M)
    if not rows or len(rows) != len(expected):
        raise ValueError("公开立绘表包含未识别的图像映射")
    return rows


def verified_source(index, source):
    """确认所有正式服索引中的全身 PNG 存在，尺寸与索引一致，记录源文件哈希。"""
    sizes = {}
    for entry in read_json(index):
        path = entry["path"]
        name = Path(path).name
        if path.startswith("res/jpn/spine/") and IMAGE_NAME.fullmatch(name):
            sizes[name] = entry["size"]
    if not sizes:
        raise ValueError("公开资源索引不包含英雄全身立绘")
    report = {}
    for name, expected in sorted(sizes.items()):
        data = (source / name).read_bytes()
        if len(data) != expected or not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError(f"公开索引尺寸与源 PNG 不符：{name}")
        report[name] = {"size": expected, "sha256": sha256(data).hexdigest()}
    return report


def encode_portrait(source, image_name):
    """按原画布将源图片转换为高质量 WebP，逐像素校验 alpha 与原图一致。"""
    name = f"jp_portrait_{image_name}_full.png"
    with Image.open(source / name) as png:
        original = png.convert("RGBA")
    blob = BytesIO()
    original.save(blob, format="WEBP", quality=93, method=5, alpha_quality=100)
    with Image.open(blob) as encoded:
        same_alpha = ImageChops.difference(original.getchannel("A"), encoded.getchannel("A")).getbbox() is None
        if encoded.size != original.size or not same_alpha:
            raise ValueError(f"压缩改变立绘尺寸或 alpha：{name}")
    return original.size, blob.getvalue()


def uuid_for(path):
    """保留已导入 UUID，新资源使用不依赖工作目录的稳定 UUID。"""
    if path.exists():
        return read_json(path)["uuid"]
    return str(uuid5(NAMESPACE_URL, "mxzg/" + path.relative_to(CLIENT).as_posix()))


def write_bytes(path, data):
    """仅写变更后的内容，减少 Creator 对批量资源的重复导入。"""
    if not path.exists() or path.read_bytes() != data:
        path.write_bytes(data)


def write_json(path, data):
    """以项目既有的可读格式写入 Creator meta 或来源记录。"""
    write_bytes(path, (json.dumps(data, ensure_ascii=False, indent=2) + "\n").encode())


def write_asset(image_name, size, blob):
    """沿用本项目的 ImageAsset、Texture2D 与 SpriteFrame 元数据格式，保留完整透明画布。"""
    output = PORTRAIT_DIR / f"{image_name}.webp"
    meta_path = output.with_suffix(".webp.meta")
    image_uuid = uuid_for(meta_path)
    meta = read_json(PORTRAIT_DIR.parent / "ui/hero-info_spr-new-9.png.meta")
    meta["uuid"] = image_uuid
    meta["files"] = [".json", ".webp"]
    for suffix, sub_meta in meta["subMetas"].items():
        sub_meta["uuid"] = f"{image_uuid}@{suffix}"
        sub_meta["displayName"] = image_name
    texture = meta["subMetas"]["6c48a"]["userData"]
    texture["imageUuidOrDatabaseUri"] = image_uuid
    frame = meta["subMetas"]["f9941"]["userData"]
    width, height = size
    half_w, half_h = width / 2, height / 2
    frame.update({
        "width": width, "height": height, "rawWidth": width, "rawHeight": height,
        "trimX": 0, "trimY": 0, "trimType": "none", "rotated": False,
        "offsetX": 0, "offsetY": 0, "packable": False,
        "imageUuidOrDatabaseUri": f"{image_uuid}@6c48a",
        "vertices": {
            "rawPosition": [-half_w, -half_h, 0, half_w, -half_h, 0, -half_w, half_h, 0, half_w, half_h, 0],
            "indexes": [0, 1, 2, 2, 1, 3],
            "uv": [0, height, width, height, 0, 0, width, 0],
            "nuv": [0, 0, 1, 0, 0, 1, 1, 1],
            "minPos": [-half_w, -half_h, 0],
            "maxPos": [half_w, half_h, 0],
        },
    })
    meta["userData"]["redirect"] = f"{image_uuid}@6c48a"
    write_json(meta_path, meta)
    write_bytes(output, blob)


def source_tables(portraits):
    """从既有形态和进化表投影与详情立绘有关的模型 ID，遵从旧客户端按星级挑选顺序。"""
    shapes = {}
    for row in read_json(CONFIG / "skin.json")["rows"]:
        template = row["type"]
        if not isinstance(template, int) or not row.get("skin"):
            continue
        limits, models = json.loads(row["star_limit"]), json.loads(row["skin"])
        if len(limits) != len(models) or not limits or limits != sorted(limits):
            raise ValueError(f"英雄外观形态配置无效：{template}")
        if template in portraits or any(model in portraits for model in models):
            shapes[template] = [limits, models]
    evolution = {}
    for row in read_json(CONFIG / "heroevolvelevel.json")["rows"]:
        template = row.get("hero_type")
        model = row.get("evolve_fashion_id")
        if not isinstance(model, int) or model < 1:
            continue
        if template in shapes or template in portraits or model in portraits:
            key = f'{template}:{row["evolve_type"]}:{row["level"]}'
            if key in evolution and evolution[key] != model:
                raise ValueError(f"进化外观模型重复：{key}")
            evolution[key] = model
    return shapes, evolution


def write_catalog(rows, sizes, overlay_hash):
    """生成去除召唤和部署数据后的只读映射，供英雄详情按当前实例选择图片。"""
    shapes, evolution = source_tables(rows)
    lines = [
        "/**",
        " * 日服英雄详情全身立绘配置，由 client/tools/import_hero_portraits.py 生成。",
        " * 原表为正式服 /jp/jp-overlay/src/config/jp_hero_portrait.lua，定点数据使用日服设计单位。",
        f" * 来源文件 SHA-256 {overlay_hash}。",
        " */",
        "export type HeroPortraitRow = readonly [image: string, width: number, height: number,",
        "    left: number, top: number, right: number, bottom: number, zoom: number, dx: number, dy: number];",
        "",
        "export const HERO_PORTRAITS: Readonly<Partial<Record<number, HeroPortraitRow>>> = {",
    ]
    for model, (image, box, zoom, dx, dy) in sorted(rows.items()):
        lines.append(f"    {model}: {json.dumps([image, *sizes[image], *box, zoom, dx, dy])},")
    lines.extend(["};", "", "export const HERO_SKIN_MODELS: Readonly<Partial<Record<number,",
                  "    readonly [limits: readonly number[], models: readonly number[]]>>> = {"])
    for key, shape in sorted(shapes.items()):
        lines.append(f"    {key}: {json.dumps(shape)},")
    lines.extend(["};", "", "export const HERO_EVOLUTION_MODELS: Readonly<Partial<Record<string, number>>> = {"])
    for key, model in sorted(evolution.items()):
        lines.append(f'    "{key}": {model},')
    lines.extend(["};", ""])
    output = UTILS / "HeroPortraitData.ts"
    create_meta(output.with_suffix(".ts.meta"), "typescript")
    write_bytes(output, "\n".join(lines).encode())


def create_meta(path, importer):
    """只在首次导入时生成目录或 TypeScript 资源 UUID。"""
    if not path.exists():
        write_json(path, {"ver": "1.2.0" if importer == "directory" else "4.0.24", "importer": importer,
                          "imported": True, "uuid": uuid_for(path), "files": [], "subMetas": {}, "userData": {}})


def main():
    """检查全部来源后批量转换，任一图片校验失败时不写入项目。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path, help="公开 PNG 的本地目录")
    parser.add_argument("--index", required=True, type=Path, help="公开 res_index.json 的本地副本")
    parser.add_argument("--layout", required=True, type=Path, help="公开 jp_hero_portrait.lua 的本地副本")
    args = parser.parse_args()
    rows = read_layout(args.layout)
    report = verified_source(args.index, args.source)
    images = sorted({row[0] for row in rows.values()})
    if any(f"jp_portrait_{image}_full.png" not in report for image in images):
        raise ValueError("存在不在正式服公开索引中的立绘映射")
    with ThreadPoolExecutor(max_workers=5) as pool:
        encoded = dict(zip(images, pool.map(lambda name: encode_portrait(args.source, name), images)))
    create_meta(PORTRAIT_DIR.with_suffix(".meta"), "directory")
    PORTRAIT_DIR.mkdir(exist_ok=True)
    for name, (size, blob) in encoded.items():
        write_asset(name, size, blob)
    write_catalog(rows, {name: value[0] for name, value in encoded.items()}, sha256(args.layout.read_bytes()).hexdigest())
    write_json(args.source / "source-report.json", report)
    print(f"已验证 {len(report)} 张正式服 PNG，导入 {len(encoded)} 张 WebP、{len(rows)} 条模型映射，"
          f"合计 {sum(len(item[1]) for item in encoded.values()):,} 字节。")


if __name__ == "__main__":
    main()
