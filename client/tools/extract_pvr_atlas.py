#!/usr/bin/env python3
"""Extract Cocos2d-x .pvr.ccz + .plist atlases to per-frame PNGs (legacy PVR RGBA8888)."""
from __future__ import annotations
import argparse, re, struct, zlib
from pathlib import Path
from xml.etree import ElementTree as ET
from PIL import Image

def load_ccz_pvr(path: Path) -> Image.Image:
    data = path.read_bytes()
    if data[:4] != b"CCZ!":
        raise ValueError(f"not CCZ!: {path}")
    ctype, ver, reserved, length = struct.unpack(">HHII", data[4:16])
    raw = zlib.decompress(data[16:])
    if len(raw) != length:
        raise ValueError(f"ccz length mismatch {len(raw)}!={length}")
    (headerLength, height, width, mipmapCount, flags, dataLength, bpp,
     bmR, bmG, bmB, bmA, pvrTag, numSurfs) = struct.unpack("<13I", raw[:52])
    if headerLength != 52 or pvrTag != 0x21525650:
        raise ValueError(f"bad PVR header in {path}")
    pixfmt = flags & 0xFF
    pixels = raw[52:52 + dataLength]
    if pixfmt == 0x12 and bpp == 32:
        img = Image.frombytes("RGBA", (width, height), pixels)
    else:
        raise ValueError(f"unsupported pixfmt=0x{pixfmt:x} bpp={bpp} in {path}")
    if flags & 0x10000:
        img = img.transpose(Image.FLIP_TOP_BOTTOM)
    return img

def _dict(el):
    d = {}
    kids = list(el)
    i = 0
    while i < len(kids):
        if kids[i].tag == "key":
            k = kids[i].text
            v = kids[i + 1]
            if v.tag == "dict":
                d[k] = _dict(v)
            elif v.tag == "string":
                d[k] = v.text
            elif v.tag == "integer":
                d[k] = int(v.text)
            elif v.tag == "real":
                d[k] = float(v.text)
            elif v.tag == "true":
                d[k] = True
            elif v.tag == "false":
                d[k] = False
            else:
                d[k] = v.text
            i += 2
        else:
            i += 1
    return d

def parse_plist(path: Path):
    text = path.read_text(encoding="utf-8")
    if text.startswith("bplist"):
        raise ValueError(f"binary plist not supported: {path}")
    top = _dict(ET.fromstring(text).find("dict"))
    return top.get("frames", {}), top.get("metadata", {})

def parse_rect(s: str):
    return tuple(map(float, re.findall(r"[-+]?\d*\.?\d+", s)))

def slice_frames(img: Image.Image, frames: dict, out_dir: Path, prefix: str, pad_source: bool = False):
    out_dir.mkdir(parents=True, exist_ok=True)
    n = 0
    for fname, info in frames.items():
        if "textureRect" in info:
            x, y, w, h = map(int, parse_rect(info["textureRect"]))
            rotated = bool(info.get("textureRotated", False))
            offset = parse_rect(info.get("spriteOffset", "{0,0}")) if pad_source else None
            src_size = parse_rect(info.get("spriteSourceSize", "")) if pad_source else None
        else:
            x, y, w, h = map(int, parse_rect(info["frame"]))
            rotated = bool(info.get("rotated", False))
            offset = parse_rect(info.get("offset", "{0,0}")) if pad_source else None
            src_size = parse_rect(info.get("sourceSize", "")) if pad_source else None
        if rotated:
            crop = img.crop((x, y, x + h, y + w)).transpose(Image.ROTATE_90)
        else:
            crop = img.crop((x, y, x + w, y + h))
        if pad_source and src_size and len(src_size) >= 2:
            sw, sh = map(int, src_size[:2])
            canvas = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
            ox, oy = (0, 0) if not offset else (int(offset[0]), int(offset[1]))
            # TexturePacker offset is from center; convert to top-left
            px = (sw - crop.size[0]) // 2 + ox
            py = (sh - crop.size[1]) // 2 + oy
            canvas.paste(crop, (px, py), crop)
            crop = canvas
        safe = fname.replace("/", "_").replace("\\", "_")
        if prefix and not safe.startswith(prefix):
            # keep original path-based name; prefix only if bare
            pass
        if not safe.lower().endswith(".png"):
            safe += ".png"
        crop.save(out_dir / safe)
        n += 1
    return n

def extract_one(ccz: Path, plist: Path, out_dir: Path, sheet_path: Path | None = None, pad_source: bool = False):
    img = load_ccz_pvr(ccz)
    if sheet_path:
        sheet_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(sheet_path)
    frames, meta = parse_plist(plist)
    n = slice_frames(img, frames, out_dir, prefix="", pad_source=pad_source)
    return {"frames": n, "size": img.size, "format": meta.get("format"), "meta_size": meta.get("size")}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("inputs", nargs="+", help="atlas basenames or path/to/name (expects .pvr.ccz + .plist)")
    ap.add_argument("-o", "--out", type=Path, required=True)
    ap.add_argument("--sheet", action="store_true")
    ap.add_argument("--pad-source", action="store_true")
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    for item in args.inputs:
        p = Path(item)
        if p.suffix == ".ccz" or p.name.endswith(".pvr.ccz"):
            ccz = p
            plist = Path(str(p).replace(".pvr.ccz", ".plist"))
            name = ccz.name.replace(".pvr.ccz", "")
        else:
            # basename in same dir or path without ext
            if p.suffix:
                base = p.with_suffix("")
            else:
                base = p
            # handle .pvr as part of stem
            ccz = Path(str(base) + ".pvr.ccz") if not str(base).endswith(".pvr") else Path(str(base) + ".ccz")
            if not ccz.exists():
                ccz = base.parent / (base.name + ".pvr.ccz")
            plist = base.parent / (base.name.replace(".pvr", "") + ".plist")
            if not plist.exists():
                plist = Path(str(ccz).replace(".pvr.ccz", ".plist"))
            name = ccz.name.replace(".pvr.ccz", "")
        out_dir = args.out / name
        sheet = (args.out / f"{name}_sheet.png") if args.sheet else None
        info = extract_one(ccz, plist, out_dir, sheet, pad_source=args.pad_source)
        print(f"OK {name}: {info}")

if __name__ == "__main__":
    main()
