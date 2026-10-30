# -*- coding: utf-8 -*-
"""Generate Creator 3.8.8 CityHub.prefab.

The hub middle is the old city: map-bg-city plates, building icons at
maincitypos, and a screen-fixed mainline entry. It is not the debug
button matrix (BtnIdle / BtnBag / …).

Reads spriteFrame uuids from client/assets/resources/**/*.meta (@f9941).
Does not invent art. Missing frames are listed and skipped.
Keeps the existing prefab uuid so loadAny fallback stays valid.
"""
import hashlib
import json
import os
import base64

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_PREFAB = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "city", "CityHub.prefab")
OUT_META = OUT_PREFAB + ".meta"
PREFAB_UUID = "118c08f7-43eb-477d-ab62-50f3ec65294f"

CITY_VIEW_W = 720
CITY_VIEW_H = 1280
CITY_MAP_W = 1500
CITY_MAP_H = 1280
CITY_PARALLAX_SPEEDS = [1.3, 1, 0.82, 0.63]
SCROLL = -390

FRAME_SIZE = {
    "1-1-1": (488, 937),
    "1-2-1": (238, 1085),
    "2-1-1": (1500, 890),
    "3-1-1": (1428, 689),
    "4-1-1": (1200, 900),
}

FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")
LAYER_UI = 33554432

objs = []
GAPS = []


def fid(seed: str) -> str:
    h = hashlib.md5(seed.encode("utf-8")).digest()
    s = base64.b64encode(h).decode("ascii").replace("+", "A").replace("/", "B").rstrip("=")
    return (s + "xxxxxxxxxxxxxxxxxxxxxx")[:22]


def add(obj):
    objs.append(obj)
    return len(objs) - 1


def vec3(x=0, y=0, z=0):
    return {"__type__": "cc.Vec3", "x": x, "y": y, "z": z}


def quat():
    return {"__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1}


def color(r, g, b, a=255):
    return {"__type__": "cc.Color", "r": r, "g": g, "b": b, "a": a}


def size(w, h):
    return {"__type__": "cc.Size", "width": w, "height": h}


def vec2(x, y):
    return {"__type__": "cc.Vec2", "x": x, "y": y}


def ref(i):
    return {"__id__": i}


def uuid_ref(u):
    return {"__uuid__": u}


def load_sprite(rel: str):
    meta_path = ""
    for ext in (".png.meta", ".jpg.meta", ".meta"):
        candidate = os.path.join(RES, rel + ext)
        if os.path.isfile(candidate):
            meta_path = candidate
            break
    if not meta_path:
        return None
    with open(meta_path, encoding="utf-8") as f:
        data = json.load(f)
    sub = data.get("subMetas", {}).get("f9941")
    if not sub or sub.get("importer") != "sprite-frame":
        return None
    u = sub.get("uuid") or ""
    if not u.endswith("@f9941"):
        return None
    user = sub.get("userData") or {}
    w = user.get("rawWidth") or user.get("width") or 64
    h = user.get("rawHeight") or user.get("height") or 64
    return u, float(w), float(h)


def load_font_uuid() -> str:
    with open(FONT_META, encoding="utf-8") as f:
        data = json.load(f)
    u = data.get("uuid") or ""
    if data.get("importer") != "ttf-font" or len(u) < 32:
        raise SystemExit("font meta missing uuid: " + FONT_META)
    return u


FONT = load_font_uuid()
WHITE = color(255, 255, 255, 255)
LABEL_COLOR = color(255, 244, 220, 255)
known_uuids = {FONT}


def remember(u):
    known_uuids.add(u)
    return u


add({
    "__type__": "cc.Prefab",
    "_name": "CityHub",
    "_objFlags": 0,
    "__editorExtras__": {},
    "_native": "",
    "data": {"__id__": 1},
    "optimizationPolicy": 0,
    "persistent": False,
})


def make_node(name, parent_id, x, y, w, h, active=True, ax=0.5, ay=0.5, sx=1.0, sy=1.0):
    node = {
        "__type__": "cc.Node",
        "_name": name,
        "_objFlags": 0,
        "__editorExtras__": {},
        "_parent": None if parent_id is None else ref(parent_id),
        "_children": [],
        "_active": active,
        "_components": [],
        "_prefab": None,
        "_lpos": vec3(x, y, 0),
        "_lrot": quat(),
        "_lscale": vec3(sx, sy, 1),
        "_mobility": 0,
        "_layer": LAYER_UI,
        "_euler": vec3(0, 0, 0),
        "_id": "",
    }
    node_id = add(node)

    uit = {
        "__type__": "cc.UITransform",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": ref(node_id),
        "_enabled": True,
        "__prefab": None,
        "_contentSize": size(w, h),
        "_anchorPoint": vec2(ax, ay),
        "_id": "",
    }
    uit_id = add(uit)
    cpi = add({"__type__": "cc.CompPrefabInfo", "fileId": fid(name + "@" + str(parent_id) + ":UITransform")})
    uit["__prefab"] = ref(cpi)
    node["_components"].append(ref(uit_id))

    pi = add({
        "__type__": "cc.PrefabInfo",
        "root": ref(1),
        "asset": ref(0),
        "fileId": fid(name + "@" + str(parent_id) + ":Node"),
        "instance": None,
        "targetOverrides": None,
        "nestedPrefabInstanceRoots": None,
    })
    node["_prefab"] = ref(pi)

    if parent_id is not None:
        objs[parent_id]["_children"].append(ref(node_id))
    return node_id


def append_comp(node_id, comp_obj, seed):
    cpi = add({"__type__": "cc.CompPrefabInfo", "fileId": fid(seed)})
    comp_obj["__prefab"] = ref(cpi)
    comp_obj["node"] = ref(node_id)
    cid = add(comp_obj)
    objs[node_id]["_components"].append(ref(cid))
    return cid


def add_sprite_comp(node_id, sf_uuid):
    spr = {
        "__type__": "cc.Sprite",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": ref(node_id),
        "_enabled": True,
        "__prefab": None,
        "_customMaterial": None,
        "_srcBlendFactor": 2,
        "_dstBlendFactor": 4,
        "_color": WHITE,
        "_spriteFrame": uuid_ref(sf_uuid),
        "_type": 0,
        "_fillType": 0,
        "_sizeMode": 0,
        "_fillCenter": vec2(0, 0),
        "_fillStart": 0,
        "_fillRange": 0,
        "_isTrimmedMode": True,
        "_useGrayscale": False,
        "_atlas": None,
        "_id": "",
    }
    return append_comp(node_id, spr, objs[node_id]["_name"] + "@" + str(node_id) + ":Sprite")


def add_label(node_id, text, font_size, col):
    lab = {
        "__type__": "cc.Label",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": ref(node_id),
        "_enabled": True,
        "__prefab": None,
        "_customMaterial": None,
        "_srcBlendFactor": 2,
        "_dstBlendFactor": 4,
        "_color": col,
        "_string": text,
        "_horizontalAlign": 1,
        "_verticalAlign": 1,
        "_actualFontSize": font_size,
        "_fontSize": font_size,
        "_fontFamily": "Arial",
        "_lineHeight": int(font_size * 1.25),
        "_overflow": 2,
        "_enableWrapText": False,
        "_font": uuid_ref(FONT),
        "_isSystemFontUsed": False,
        "_spacingX": 0,
        "_isItalic": False,
        "_isBold": False,
        "_isUnderline": False,
        "_underlineHeight": 2,
        "_cacheMode": 0,
        "_enableOutline": True,
        "_outlineColor": color(20, 16, 28, 220),
        "_outlineWidth": 2,
        "_enableShadow": False,
        "_shadowColor": color(0, 0, 0, 255),
        "_shadowOffset": vec2(2, -2),
        "_shadowBlur": 2,
        "_id": "",
    }
    return append_comp(node_id, lab, objs[node_id]["_name"] + "@" + str(node_id) + ":Label")


def add_button(node_id, sf_uuid):
    btn = {
        "__type__": "cc.Button",
        "_name": "",
        "_objFlags": 0,
        "__editorExtras__": {},
        "node": ref(node_id),
        "_enabled": True,
        "__prefab": None,
        "clickEvents": [],
        "_interactable": True,
        "_transition": 3,
        "_normalColor": WHITE,
        "_hoverColor": color(211, 211, 211, 255),
        "_pressedColor": color(200, 200, 200, 255),
        "_disabledColor": color(124, 124, 124, 255),
        "_normalSprite": uuid_ref(sf_uuid),
        "_hoverSprite": uuid_ref(sf_uuid),
        "_pressedSprite": uuid_ref(sf_uuid),
        "_disabledSprite": uuid_ref(sf_uuid),
        "_duration": 0.1,
        "_zoomScale": 0.94,
        "_target": ref(node_id),
        "_id": "",
    }
    return append_comp(node_id, btn, objs[node_id]["_name"] + "@" + str(node_id) + ":Button")


def place_bl(parent_id, x, y):
    """Anchor position in the parent's bottom-left space → local position."""
    ui = None
    for cid in objs[parent_id]["_components"]:
        comp = objs[cid["__id__"]]
        if comp.get("__type__") == "cc.UITransform":
            ui = comp
            break
    pw = ui["_contentSize"]["width"]
    ph = ui["_contentSize"]["height"]
    ax = ui["_anchorPoint"]["x"]
    ay = ui["_anchorPoint"]["y"]
    return x - pw * ax, y - ph * ay


def layer_anchor_x(scroll, ratio, ox):
    return scroll * (ratio - 1) + ox


def foreground_piece2_x(view_w, map_w, speed):
    p2 = view_w - map_w
    pos2x = -p2 + p2 * speed + map_w
    return map_w + map_w - pos2x


def parent_for_z(zorder):
    if zorder == 1:
        return "spr_map_bg1_1"
    if zorder == 3:
        return "spr_map_bg3"
    if zorder == 4:
        return "spr_map_bg4"
    return "spr_map_bg2"


def map_frame(layer, piece):
    return "ui/maps/map-bg-city-%d-%d-1" % (layer, piece)


def effect_frame(para):
    prefix = "eff_main_city_"
    if not para or not para.startswith(prefix):
        return None
    return "ui/city/main-city-effect_" + para[len(prefix):] + "-0"


# --- layout, same numbers as cityMapLayout.ts at variant 1 ---
map_scale = CITY_VIEW_H / CITY_MAP_H
content_w = CITY_MAP_W * map_scale
speeds = CITY_PARALLAX_SPEEDS
mid = CITY_MAP_W * 0.5 * map_scale
sky_scale = map_scale * 1.2
b11 = FRAME_SIZE["1-1-1"]
b12 = FRAME_SIZE["1-2-1"]
b21 = FRAME_SIZE["2-1-1"]
b31 = FRAME_SIZE["3-1-1"]
b41 = FRAME_SIZE["4-1-1"]

root = make_node("CityHub", None, 0, 0, CITY_VIEW_W, CITY_VIEW_H)
assert root == 1

parallax_x, parallax_y = place_bl(root, SCROLL, 0)
parallax = make_node(
    "CityParallax", root, parallax_x, parallax_y, content_w, CITY_VIEW_H, ax=0, ay=0
)

layers = {}


def add_layer(name, ratio, ox, oy, ax, ay, w, h, scale):
    x = layer_anchor_x(SCROLL, ratio, ox)
    lx, ly = place_bl(parallax, x, oy)
    nid = make_node(name, parallax, lx, ly, w, h, ax=ax, ay=ay, sx=scale, sy=scale)
    layers[name] = nid
    return nid


def add_map_sprite(name, parent_name, x, y, ax, ay, w, h, rel):
    loaded = load_sprite(rel)
    if not loaded:
        GAPS.append("map plate missing: " + rel)
        return None
    u, _rw, _rh = loaded
    remember(u)
    parent_id = layers[parent_name]
    lx, ly = place_bl(parent_id, x, y)
    nid = make_node(name, parent_id, lx, ly, w, h, ax=ax, ay=ay)
    add_sprite_comp(nid, u)
    layers[name] = nid
    return nid


add_layer("spr_map_bg4", speeds[3], mid, CITY_VIEW_H, 0.5, 1, b41[0], b41[1], sky_scale)
add_layer("spr_map_bg3", speeds[2], mid, 390, 0.5, 0, b31[0], b31[1], map_scale)
add_layer("spr_map_bg2", speeds[1], mid, 0, 0.5, 0, b21[0], b21[1], map_scale)
add_layer("spr_map_bg1", speeds[0], 0, 0, 0, 0, CITY_MAP_W, CITY_MAP_H, map_scale)
add_map_sprite("spr_map_bg4_1", "spr_map_bg4", b41[0] * 0.5, b41[1] * 0.5, 0.5, 0.5, b41[0], b41[1], map_frame(4, 1))
add_map_sprite("spr_map_bg3_1", "spr_map_bg3", b31[0] * 0.5, b31[1] * 0.5, 0.5, 0.5, b31[0], b31[1], map_frame(3, 1))
add_map_sprite("spr_map_bg2_1", "spr_map_bg2", b21[0] * 0.5, b21[1] * 0.5, 0.5, 0.5, b21[0], b21[1], map_frame(2, 1))
add_map_sprite("spr_map_bg1_1", "spr_map_bg1", 0, 0, 0, 0, b11[0], b11[1], map_frame(1, 1))
add_map_sprite(
    "spr_map_bg1_2",
    "spr_map_bg1",
    foreground_piece2_x(CITY_VIEW_W, CITY_MAP_W, speeds[0]),
    0,
    1,
    0,
    b12[0],
    b12[1],
    map_frame(1, 2),
)

with open(os.path.join(RES, "config", "maincity", "maincityeffect.json"), encoding="utf-8") as f:
    effect_file = json.load(f)
for row in effect_file.get("maincityeffect") or []:
    para = row.get("para") or ""
    parent_name = row.get("parent") or ""
    rel = effect_frame(para)
    if not rel:
        GAPS.append("spine effect has no bitmap: " + (para or "?"))
        continue
    if parent_name not in layers:
        GAPS.append("effect parent missing: " + parent_name + " " + para)
        continue
    loaded = load_sprite(rel)
    if not loaded:
        GAPS.append("effect frame missing: " + rel)
        continue
    u, w, h = loaded
    remember(u)
    parent_id = layers[parent_name]
    lx, ly = place_bl(parent_id, float(row.get("x") or 0), float(row.get("y") or 0))
    nid = make_node("fx-" + para, parent_id, lx, ly, w, h)
    add_sprite_comp(nid, u)

with open(os.path.join(RES, "config", "maincity", "maincitypos.json"), encoding="utf-8") as f:
    pos_file = json.load(f)
building_count = 0
for row in pos_file.get("main") or []:
    atom = row.get("atom") or ""
    if not atom:
        continue
    parent_name = parent_for_z(int(row.get("zorder") or 2))
    rel = "ui/city/main-city_icon-" + atom
    loaded = load_sprite(rel)
    if not loaded:
        GAPS.append("building icon missing: " + rel + ".png")
        continue
    if parent_name not in layers:
        GAPS.append("building parent missing: " + parent_name + " " + atom)
        continue
    u, w, h = loaded
    remember(u)
    z = int(row.get("zorder") or 2)
    scale_of = sky_scale if z == 4 else map_scale
    spot_scale = 0.9 if scale_of == 0 else (1 / scale_of) * 0.9
    parent_id = layers[parent_name]
    lx, ly = place_bl(parent_id, float(row.get("x") or 0), float(row.get("y") or 0))
    nid = make_node("spot-" + atom, parent_id, lx, ly, w, h, sx=spot_scale, sy=spot_scale)
    add_sprite_comp(nid, u)
    add_button(nid, u)
    building_count += 1

# Screen-fixed, parented on the root so a full-screen host does not eat map touches.
# Bottom bar covers about y < -505. Utility row is on the right.
mission = load_sprite("ui/city/main-city_icon-main_mission")
if not mission:
    GAPS.append("mainline icon missing: ui/city/main-city_icon-main_mission.png")
else:
    u, w, h = mission
    remember(u)
    btn = make_node("BtnMainline", root, -286, -400, w, h)
    add_sprite_comp(btn, u)
    add_button(btn, u)
    label = make_node("Label", btn, 0, -h * 0.5 - 16, 150, 28)
    add_label(label, "主线", 18, LABEL_COLOR)

# 33 act icons stay off this prefab. CityChrome ActGroup already draws the
# visible set, and a full strip covers the buildings. createmaincitybtn
# btn-login-2..7 and 9..14 are not in resources/ui/city.
GAPS.append("activity strip (33 createmaincitybtn icons) is not painted on CityHub; CityChrome ActGroup keeps the visible set, and 活动 still opens the full list")
GAPS.append("map variant 2 plates exist (map-bg-city-*-2) and are unused; hub uses variant 1, same as CityMap")
GAPS.append("bg-main-scene.jpg is not the scrolling city; hub uses map-bg-city plates")

objs[0]["data"] = ref(1)

os.makedirs(os.path.dirname(OUT_PREFAB), exist_ok=True)
with open(OUT_PREFAB, "w", encoding="utf-8", newline="\n") as f:
    json.dump(objs, f, ensure_ascii=False, indent=2)
    f.write("\n")

meta = {
    "ver": "1.1.50",
    "importer": "prefab",
    "imported": True,
    "uuid": PREFAB_UUID,
    "files": [".json"],
    "subMetas": {},
    "userData": {"syncNodeName": "CityHub"},
}
with open(OUT_META, "w", encoding="utf-8", newline="\n") as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)
    f.write("\n")

names = [o["_name"] for o in objs if o.get("__type__") == "cc.Node"]
for required in (
    "CityHub",
    "CityParallax",
    "spr_map_bg1",
    "spr_map_bg2",
    "spr_map_bg2_1",
    "spr_map_bg1_1",
    "spr_map_bg1_2",
    "spot-main_summon",
    "spot-main_smith_shop",
    "BtnMainline",
):
    assert required in names, "missing " + required
for banned in ("BtnIdle", "BtnBag", "BtnMail", "BtnLogin7", "BtnShop", "BtnGift", "Top", "Bottom", "TabCity"):
    assert banned not in names, "debug matrix or chrome leaked: " + banned
assert building_count == 19, building_count

file_ids = []
for o in objs:
    if "fileId" in o:
        file_ids.append(o["fileId"])
        assert len(o["fileId"]) == 22, o["fileId"]
assert len(file_ids) == len(set(file_ids)), "duplicate fileId"

for o in objs:
    for key in ("_spriteFrame", "_font", "_normalSprite", "_hoverSprite", "_pressedSprite", "_disabledSprite"):
        val = o.get(key)
        if isinstance(val, dict) and "__uuid__" in val:
            assert val["__uuid__"] in known_uuids, val["__uuid__"]

print("Wrote", OUT_PREFAB)
print("UUID", PREFAB_UUID)
print("buildings", building_count)
print("GAPS")
for gap in GAPS:
    print("- " + gap)
print("OK")
