# -*- coding: utf-8 -*-
"""Lock CityChromeShell's class id to the 23-char packer form.

Creator 3.8.8 always _RF.push-es compressUuid(uuid, false): reserved head 5,
23 characters. Prefab __type__ must be that same string. The old 22-char
compressUuid(uuid, true) does not match the chunk, so the inspector reports
MissingScript / 脚本编译失败.
"""
import json
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SHELL_META = os.path.join(ROOT, "client", "assets", "scripts", "ui", "CityChromeShell.ts.meta")
SHELL_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "CityChromeShell.ts")
PREFAB = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "city", "CityChrome.prefab")
ASSETS = os.path.join(ROOT, "client", "assets")

BASE64_KEYS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
HEX_CHARS = "0123456789abcdef"
TEXT_EXT = {".ts", ".js", ".meta", ".prefab", ".scene", ".json"}

# Locked pair. Meta uuid stays the canonical 36-char form. Do not remint it.
EXPECTED_UUID = "c4e8a1d2-7b63-4e90-8f15-6a2d9c0b47e3"
# compressUuid(uuid, false). Prefab __type__ and _RF.push must both be this.
EXPECTED_CLASS_ID = "c4e8aHSe2NOkI8Vai2cC0fj"
# compressUuid(uuid, true). Not a class id. Prefab must not use it as __type__.
OLD_PREFAB_TYPE = "c46KHSe2NOkI8Vai2cC0fj"


def hex_of(value):
    hex_str = value.replace("-", "").lower()
    if len(hex_str) != 32 or any(ch not in HEX_CHARS for ch in hex_str):
        raise SystemExit("script uuid is not a canonical uuid: " + value)
    return hex_str


def compress_hex(hex_str, reserved):
    chars = [hex_str[:reserved]]
    index = reserved
    while index < len(hex_str):
        h1 = int(hex_str[index], 16)
        h2 = int(hex_str[index + 1], 16)
        h3 = int(hex_str[index + 2], 16)
        chars.append(BASE64_KEYS[(h1 << 2) | (h2 >> 2)])
        chars.append(BASE64_KEYS[((h2 & 3) << 4) | h3])
        index += 3
    return "".join(chars)


def class_id(value):
    """23-char id. Prefab __type__ and _RF.push must share this."""
    return compress_hex(hex_of(value), 5)


def legacy_min_id(value):
    """22-char compressUuid(uuid, true). Reject this as a Prefab type."""
    return compress_hex(hex_of(value), 2)


def iter_asset_text():
    for dirpath, dirnames, filenames in os.walk(ASSETS):
        dirnames[:] = [name for name in dirnames if name != ".git"]
        for name in filenames:
            if os.path.splitext(name)[1].lower() not in TEXT_EXT:
                continue
            yield os.path.join(dirpath, name)


def main():
    if class_id(EXPECTED_UUID) != EXPECTED_CLASS_ID or len(EXPECTED_CLASS_ID) != 23:
        raise SystemExit("23-char class id drifted from " + EXPECTED_UUID)
    if legacy_min_id(EXPECTED_UUID) != OLD_PREFAB_TYPE or len(OLD_PREFAB_TYPE) != 22:
        raise SystemExit("22-char legacy id drifted from " + EXPECTED_UUID)

    with open(SHELL_META, encoding="utf-8") as handle:
        meta = json.load(handle)
    uuid = meta.get("uuid") or ""
    if meta.get("importer") != "typescript":
        raise SystemExit("CityChromeShell.ts.meta importer is not typescript")
    if uuid != EXPECTED_UUID:
        raise SystemExit(
            "CityChromeShell.ts.meta uuid must stay %s (got %s). "
            "A non-36-char uuid is returned unchanged by compressUuid and "
            "lands in _RF.push as-is." % (EXPECTED_UUID, uuid)
        )

    with open(SHELL_TS, encoding="utf-8") as handle:
        source = handle.read()
    if EXPECTED_CLASS_ID in source or OLD_PREFAB_TYPE in source:
        raise SystemExit("CityChromeShell.ts must not embed a compressed id")

    with open(PREFAB, encoding="utf-8") as handle:
        prefab = handle.read()
    type_needle = '"__type__": "%s"' % EXPECTED_CLASS_ID
    old_needle = '"__type__": "%s"' % OLD_PREFAB_TYPE
    if prefab.count(type_needle) != 1 or prefab.count(EXPECTED_CLASS_ID) != 1:
        raise SystemExit(
            "CityChrome.prefab __type__ must be class id %s once" % EXPECTED_CLASS_ID
        )
    if old_needle in prefab or OLD_PREFAB_TYPE in prefab:
        raise SystemExit(
            "CityChrome.prefab still uses 22-char type %s" % OLD_PREFAB_TYPE
        )

    hits = []
    for path in iter_asset_text():
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
        if old_needle in text:
            hits.append(os.path.relpath(path, ROOT))
    if hits:
        raise SystemExit(
            "22-char %s is not a Prefab type; found in:\n%s"
            % (OLD_PREFAB_TYPE, "\n".join(hits))
        )

    print("class id %s" % EXPECTED_CLASS_ID)
    print("meta uuid %s" % EXPECTED_UUID)
    print("_RF.push and prefab __type__ must be %s" % EXPECTED_CLASS_ID)
    print("rejected 22-char prefab type %s" % OLD_PREFAB_TYPE)
    return 0


if __name__ == "__main__":
    sys.exit(main())
