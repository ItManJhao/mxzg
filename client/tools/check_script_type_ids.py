# -*- coding: utf-8 -*-
"""Prefab and scene script __type__ must be the 23-char packer id.

Creator 3.8.8 _RF.push uses compressUuid(uuid, false): reserved head 5,
23 characters. compressUuid(uuid, true) is 22 characters and does not match
the chunk, so the inspector reports MissingScript.

cc.* names and numeric __type__ values are engine builtins, not script class
ids. This check does not remint meta uuids.
"""
import json
import os
import sys

from check_citychrome_shell_id import class_id, legacy_min_id

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ASSETS = os.path.join(ROOT, "client", "assets")
SCRIPT_IMPORTERS = {"typescript", "javascript"}

# Locked packer ids. Meta uuids stay canonical. Do not remint them.
ANCHORS = (
    (
        "7a774133-36cb-47c5-9fca-3c6664370c6c",
        "7a774EzNstHxZ/KPGZkNwxs",
        "7ad0EzNstHxZ/KPGZkNwxs",
    ),
    (
        "c4e8a1d2-7b63-4e90-8f15-6a2d9c0b47e3",
        "c4e8aHSe2NOkI8Vai2cC0fj",
        "c46KHSe2NOkI8Vai2cC0fj",
    ),
    (
        "266a134c-7061-4e2c-852d-74d2385fe11a",
        "266a1NMcGFOLIUtdNI4X+Ea",
        "26ahNMcGFOLIUtdNI4X+Ea",
    ),
)


def is_engine_type(value):
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return True
    if isinstance(value, str) and (value.startswith("cc.") or value.isdigit()):
        return True
    return False


def iter_files(suffixes):
    for dirpath, dirnames, filenames in os.walk(ASSETS):
        dirnames[:] = [name for name in dirnames if name != ".git"]
        for name in filenames:
            if name.endswith(suffixes):
                yield os.path.join(dirpath, name)


def load_script_metas():
    by_class = {}
    by_legacy = {}
    for path in iter_files((".ts.meta", ".js.meta")):
        with open(path, encoding="utf-8") as handle:
            meta = json.load(handle)
        if meta.get("importer") not in SCRIPT_IMPORTERS:
            continue
        uuid = meta.get("uuid") or ""
        packed = class_id(uuid)
        legacy = legacy_min_id(uuid)
        if len(packed) != 23 or len(legacy) != 22 or packed == legacy:
            raise SystemExit("class id drifted for " + path)
        rel = os.path.relpath(path, ROOT)
        if packed in by_class:
            raise SystemExit("duplicate 23-char class id in " + rel)
        by_class[packed] = (uuid, rel)
        by_legacy[legacy] = (uuid, rel, packed)
    return by_class, by_legacy


def walk_types(node, found):
    if isinstance(node, dict):
        if "__type__" in node:
            found.append(node["__type__"])
        for value in node.values():
            walk_types(value, found)
    elif isinstance(node, list):
        for value in node:
            walk_types(value, found)


def main():
    for uuid, packed, legacy in ANCHORS:
        if class_id(uuid) != packed or len(packed) != 23:
            raise SystemExit("23-char anchor drifted: " + uuid)
        if legacy_min_id(uuid) != legacy or len(legacy) != 22:
            raise SystemExit("22-char anchor drifted: " + uuid)

    by_class, by_legacy = load_script_metas()
    errors = []
    bindings = []
    for path in iter_files((".prefab", ".scene")):
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        types = []
        walk_types(data, types)
        rel = os.path.relpath(path, ROOT)
        if isinstance(data, list):
            for index, component in enumerate(data):
                if not isinstance(component, dict) or component.get("__type__") != "cc.Button":
                    continue
                target = component.get("_target")
                if target is None:
                    continue
                target_id = target.get("__id__") if isinstance(target, dict) else None
                if (not isinstance(target_id, int) or not 0 <= target_id < len(data)
                        or not isinstance(data[target_id], dict)
                        or data[target_id].get("__type__") != "cc.Node"):
                    errors.append("%s Button[%d] target must refer to a cc.Node" % (rel, index))
        for type_name in types:
            if is_engine_type(type_name):
                continue
            if not isinstance(type_name, str) or len(type_name) == 22 or type_name in by_legacy:
                hint = ""
                if isinstance(type_name, str) and type_name in by_legacy:
                    uuid, script, packed = by_legacy[type_name]
                    hint = " -> %s (%s, %s)" % (packed, uuid, script)
                errors.append("%s uses 22-char script type %r%s" % (rel, type_name, hint))
                continue
            if len(type_name) != 23 or type_name not in by_class:
                errors.append("%s has script type %r that is not a 23-char packer id" % (rel, type_name))
                continue
            uuid, script = by_class[type_name]
            bindings.append((rel, type_name, uuid, script))

    if errors:
        raise SystemExit("Invalid prefab/scene bindings:\n" + "\n".join(errors))

    print("script bindings %d" % len(bindings))
    for rel, type_name, uuid, script in bindings:
        print("%s %s %s %s" % (rel, type_name, uuid, script))
    print("no 22-char script __type__ in prefab/scene")
    print("Button targets refer to cc.Node")
    return 0


if __name__ == "__main__":
    sys.exit(main())
