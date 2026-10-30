# -*- coding: utf-8 -*-
"""Generate Creator 3.8.8 SevenDay prefabs (not wired).

Writes:
  client/assets/prefabs/ui/sevenday/WireSevenDayPage.prefab
  client/assets/prefabs/ui/sevenday/Login7Page.prefab
and their .meta files, plus ui/sevenday.meta if it is missing.

WireSevenDayPage is the readonly real-server page (WireSevenDayPage.ts /
wireSevenDay.ts, s2c 22000). Login7Page is the Mock page (Login7Page.ts /
module/login7/rewards.ts, cmds 2201–2203). They do not share a root.
There is no WireLogin7Page.

Bg is map-bg-seven-day-target-1 (@f9941), white, SIMPLE, stretched to
720x1280. Buttons reuse the #66 nine-slice common button SpriteFrames.
Does not touch Boot, page scripts, protocol, USE_* flags, B1–B3 prefabs,
or the #66 metas. Gift frames are not referenced.

File ids are hashed from node paths, so the prefab body is stable.
An existing .meta uuid is kept, so a second run rewrites the same files.
"""
import hashlib
import json
import os
import re
import uuid
import base64

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "sevenday")
DIR_META = OUT_DIR + ".meta"
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

WIRE_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "WireSevenDayPage.ts")
WIRE_PROTO = os.path.join(ROOT, "client", "assets", "scripts", "net", "protocol", "wireSevenDay.ts")
LOGIN7_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "Login7Page.ts")
REWARDS_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "login7", "rewards.ts")
IDLE_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "idle", "rewards.ts")
ITEMS_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "bag", "items.ts")

SPRITE_FILES = {
    "bg": "ui/sevenday/map-bg-seven-day-target-1.jpg",
    "btn_blue": "ui/common/button_btn-blue-big-1.png",
    "btn_blue_p": "ui/common/button_btn-blue-big-2.png",
    "btn_orange": "ui/common/button_btn-orange-big-1.png",
    "btn_orange_p": "ui/common/button_btn-orange-big-2.png",
    "btn_green": "ui/common/button_btn-green-big-1.png",
    "btn_green_p": "ui/common/button_btn-green-big-2.png",
}
# Normals validated in #66. Pressed mates are the ones existing prefabs already use.
SLICED_NORMALS = ("btn_blue", "btn_orange", "btn_green")

LAYER_UI = 33554432
PAGE_W = 720
PAGE_H = 1280
SIMPLE = 0
SLICED = 1
BG_UUID = "965ae853-f59c-4a36-94ac-d52ed4adca67@f9941"

# WireSevenDayPage.ts place() y. Field note is two lines, so its center
# sits 12px under the single-line slot at 400 and still clears Status.
TITLE_Y = 560
SIDE_Y = 510
PUSH_Y = 476
NOTE_Y = 442
FIELD_Y = 388
STATUS_Y = 340
UNSYNCED_Y = 340
EMPTY_Y = 290
TOP = 290
STEP = 36
BACK_Y = -560
MORE_TEXT = "还有 N 条"
ROW_SAMPLE = "idx=%d / status=0 · 未领"

TITLE_BOX = (680, 44)
SIDE_BOX = (640, 32)
PUSH_BOX = (640, 28)
NOTE_BOX = (640, 28)
FIELD_BOX = (640, 52)
STATUS_BOX = (640, 32)
STATE_BOX = (640, 44)
ROW_BOX = (640, 28)
MORE_BOX = (640, 28)

# Login7Page.ts place() y and createButton sizes.
L7_TITLE_Y = 500
L7_HINT_Y = 452
L7_HEAD_Y = 408
L7_OPEN_Y = 372
L7_WALLET_Y = 340
L7_ROW_TOP = 250
L7_ROW_STEP = 52
L7_CLAIM_Y = -168
L7_ACTION_Y = -240
L7_TITLE_BOX = (680, 48)
L7_HINT_BOX = (640, 28)
L7_HEAD_BOX = (640, 36)
L7_OPEN_BOX = (640, 26)
L7_WALLET_BOX = (640, 28)
L7_ROW_BOX = (640, 46)


def fid(seed):
    digest = hashlib.md5(seed.encode("utf-8")).digest()
    text = base64.b64encode(digest).decode("ascii").replace("+", "A").replace("/", "B").rstrip("=")
    return (text + "xxxxxxxxxxxxxxxxxxxxxx")[:22]


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


def read_text(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def require_snippet(path, snippet):
    if snippet not in read_text(path):
        raise SystemExit("layout snippet missing from %s: %s" % (path, snippet))


def ts_int(path, name):
    match = re.search(r"(?:export )?const %s = (\d+);" % re.escape(name), read_text(path))
    if not match:
        raise SystemExit("missing const %s in %s" % (name, path))
    return int(match.group(1))


def ts_string(path, name):
    match = re.search(r'export const %s = "([^"]*)";' % re.escape(name), read_text(path))
    if not match:
        raise SystemExit("missing const %s in %s" % (name, path))
    return match.group(1)


def load_sprite_frame(rel, require_slice=False):
    meta_path = os.path.join(RES, rel + ".meta")
    with open(meta_path, encoding="utf-8") as handle:
        data = json.load(handle)
    sub = data.get("subMetas", {}).get("f9941")
    if not sub or sub.get("importer") != "sprite-frame":
        raise SystemExit("missing sprite-frame f9941 in " + meta_path)
    value = sub.get("uuid") or ""
    if not value.endswith("@f9941"):
        raise SystemExit("spriteFrame uuid is not @f9941: " + meta_path)
    user = sub.get("userData") or {}
    if require_slice:
        left = int(user.get("borderLeft") or 0)
        right = int(user.get("borderRight") or 0)
        if left <= 0 or right <= 0:
            raise SystemExit("button is missing #66 horizontal borders: " + rel)
    return value, user


def load_font_uuid():
    with open(FONT_META, encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("uuid") or ""
    if data.get("importer") != "ttf-font" or len(value) < 32:
        raise SystemExit("font meta missing uuid: " + FONT_META)
    if "FZCSJW" not in os.path.basename(FONT_META):
        raise SystemExit("font is not FZCSJW")
    return value


def reward_text(rewards):
    """Same join as login7RewardText. Wallet ids use +, bag ids use ×."""
    parts = []
    for row in rewards:
        name = row["name"]
        count = row["count"]
        if row["id"] in (1, 2):
            parts.append(name + " +" + str(count))
        else:
            parts.append(name + " ×" + str(count))
    return "、".join(parts)


def login7_row_text(day, rewards, login_day):
    """login7RowText for an unclaimed day-1 view. Later days are 未到达."""
    if day == login_day:
        tag = "今日可领"
    elif day > login_day:
        tag = "未到达"
    else:
        tag = "可补领"
    return "第%d天 · %s · %s" % (day, reward_text(rewards), tag)


def load_wire_copy():
    require_snippet(WIRE_TS, "const PAGE_BG = new Color(36, 14, 24, 255);")
    require_snippet(WIRE_TS, "const TITLE = new Color(255, 214, 150, 255);")
    require_snippet(WIRE_TS, "const MUTED = new Color(214, 186, 186, 255);")
    require_snippet(WIRE_TS, "const BACK_FILL = new Color(36, 72, 120, 255);")
    require_snippet(WIRE_TS, "const VISIBLE_ROWS = 7;")
    require_snippet(WIRE_TS, 'this.node = uiNode("WireSevenDayPage");')
    require_snippet(WIRE_TS, 'place(createRect("bg", 720, 1280, PAGE_BG), this.node, 0, 0);')
    require_snippet(WIRE_TS, 'this.listHost = place(uiNode("list-host"), this.body, 0, 0);')
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_SEVEN_READONLY_TITLE, 36, { color: TITLE }), this.body, 0, 560);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_SEVEN_SIDE_EFFECT, 22, { color: TITLE, width: 640 }), this.body, 0, 510);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_SEVEN_PUSH_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 476);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_SEVEN_READONLY_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 442);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_SEVEN_FIELD_NOTE, 18, { color: MUTED, width: 640 }), this.body, 0, 400);",
    )
    require_snippet(
        WIRE_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -560);',
    )
    require_snippet(WIRE_TS, 'const rows = uiNode("rows");')
    require_snippet(WIRE_TS, "rows.parent = this.listHost;")
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_SEVEN_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 340);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(formatWireSevenHead(snap), 22, { color: TITLE, width: 640 }), rows, 0, 340);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_SEVEN_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, 290);",
    )
    require_snippet(WIRE_TS, "290 - i * 36")
    require_snippet(WIRE_TS, "const visible = Math.min(snap.rows.length, VISIBLE_ROWS);")
    require_snippet(WIRE_TS, '"还有 " + (snap.rows.length - visible) + " 条"')
    require_snippet(WIRE_TS, 'align: "left"')
    require_snippet(WIRE_TS, "没有领取按钮")
    require_snippet(WIRE_TS, "不发 22001")

    require_snippet(WIRE_PROTO, 'export const WIRE_SEVEN_CMD = "wire.22000";')
    require_snippet(WIRE_PROTO, 'export const WIRE_SEVEN_PUSH_CMD = "wire.22002";')
    require_snippet(
        WIRE_PROTO,
        'return "end_time=" + numText(snap.endTime) + " / cur_day=" + numText(snap.curDay);',
    )
    require_snippet(
        WIRE_PROTO,
        'return "idx=" + numText(row.idx) + " / status=" + statusText(row.status);',
    )
    require_snippet(WIRE_PROTO, 'if (status === 0) return "0 · 未领";')
    require_snippet(WIRE_PROTO, "不发 22001 领奖")

    visible = ts_int(WIRE_TS, "VISIBLE_ROWS")
    if visible != 7:
        raise SystemExit("VISIBLE_ROWS drifted to %s" % visible)

    title = ts_string(WIRE_PROTO, "WIRE_SEVEN_READONLY_TITLE")
    side = ts_string(WIRE_PROTO, "WIRE_SEVEN_SIDE_EFFECT")
    push = ts_string(WIRE_PROTO, "WIRE_SEVEN_PUSH_NOTE")
    note = ts_string(WIRE_PROTO, "WIRE_SEVEN_READONLY_NOTE")
    field = ts_string(WIRE_PROTO, "WIRE_SEVEN_FIELD_NOTE")
    empty = ts_string(WIRE_PROTO, "WIRE_SEVEN_EMPTY")
    unsynced = ts_string(WIRE_PROTO, "WIRE_SEVEN_UNSYNCED_TOAST")
    if title != "七日登录（真服只读）":
        raise SystemExit("wire title drifted: " + title)
    if side != "22000 只读，无写库，无自动领奖":
        raise SystemExit("wire side effect drifted: " + side)
    if push != "22002 是隔天推送，只改 cur_day，不是请求":
        raise SystemExit("wire push note drifted: " + push)
    if note != "只读。不领奖，不发 22001，不写金币":
        raise SystemExit("wire note drifted: " + note)
    if "end_time" not in field or "cur_day" not in field or "status 0 未领" not in field:
        raise SystemExit("wire field note drifted: " + field)
    if empty != "空表":
        raise SystemExit("wire empty drifted: " + empty)
    if unsynced != "真服未同步":
        raise SystemExit("wire unsynced drifted: " + unsynced)

    rows = [ROW_SAMPLE % (i + 1) for i in range(visible)]
    if rows[0] != "idx=1 / status=0 · 未领":
        raise SystemExit("first row drifted: " + rows[0])
    if rows[-1] != "idx=7 / status=0 · 未领":
        raise SystemExit("last row drifted: " + rows[-1])

    return {
        "visible": visible,
        "title": title,
        "side": side,
        "push": push,
        "note": note,
        "field": field,
        "empty": empty,
        "unsynced": unsynced,
        "status": "end_time=… / cur_day=…",
        "rows": rows,
        "more": MORE_TEXT,
    }


def load_login7_copy():
    require_snippet(LOGIN7_TS, "const TITLE = new Color(255, 214, 150, 255);")
    require_snippet(LOGIN7_TS, "const MUTED = new Color(214, 186, 186, 255);")
    require_snippet(LOGIN7_TS, "const STAT = new Color(255, 228, 170, 255);")
    require_snippet(LOGIN7_TS, 'this.node = uiNode("Login7Page");')
    require_snippet(LOGIN7_TS, 'place(createLabel("七日登录", 40, { color: TITLE }), this.body, 0, 500);')
    require_snippet(LOGIN7_TS, '"按角色登录天领取。点一行领那一天"')
    require_snippet(LOGIN7_TS, 'place(createLabel("读取中…", 26, { color: STAT, width: 640 }), this.body, 0, 408);')
    require_snippet(LOGIN7_TS, "this.openDayLabel = place(createLabel(\"\", 18, { color: MUTED, width: 640 }), this.body, 0, 372);")
    require_snippet(LOGIN7_TS, "this.walletLabel = place(createLabel(\"\", 20, { color: STAT, width: 640 }), this.body, 0, 340);")
    require_snippet(LOGIN7_TS, 'this.rowsHost = place(uiNode("rows-host"), this.body, 0, 0);')
    require_snippet(LOGIN7_TS, 'createButton("领取", () => void this.claimToday(), 420, 52, CLAIM_FILL, 22)')
    require_snippet(LOGIN7_TS, "createButton(login7AdvanceButton(), () => void this.advance(), 280, 46, DEBUG_FILL, 20)")
    require_snippet(LOGIN7_TS, 'place(createButton("返回", () => this.host.close(), 200, 46, BACK_FILL, 22), this.body, 180, -240);')
    require_snippet(LOGIN7_TS, "const top = 250;")
    require_snippet(LOGIN7_TS, "const step = 52;")
    require_snippet(LOGIN7_TS, "640,\n        46,")
    require_snippet(REWARDS_TS, 'return "下一天（调试）";')
    require_snippet(REWARDS_TS, 'return "第" + finite(day.day) + "天 · " + login7RewardText(day.rewards) + " · " + tag;')
    require_snippet(REWARDS_TS, 'if (row.id === 1 || row.id === 2) parts.push(name + " +" + count);')
    require_snippet(REWARDS_TS, 'else parts.push(name + " ×" + count);')
    require_snippet(REWARDS_TS, 'return "今日可领";')
    require_snippet(REWARDS_TS, 'if (day.state === "locked") return "未到达";')
    require_snippet(REWARDS_TS, "export const LOGIN7_DAYS = 7;")
    require_snippet(REWARDS_TS, '{ day: 1, rewards: [{ id: 1, name: "金币", count: 80 }] }')
    require_snippet(REWARDS_TS, '{ day: 2, rewards: [{ id: 2, name: "钻石", count: 15 }] }')
    require_snippet(IDLE_TS, 'export const IDLE_ITEM_NAME = "强化石";')
    stone = ts_string(IDLE_TS, "IDLE_ITEM_NAME")
    if stone != "强化石":
        raise SystemExit("idle item name drifted: " + stone)
    if ts_int(IDLE_TS, "IDLE_ITEM_ID") != 101:
        raise SystemExit("idle item id drifted")
    if ts_int(ITEMS_TS, "ITEM_GOLD_BAG") != 201:
        raise SystemExit("gold bag id drifted")
    if ts_int(ITEMS_TS, "ITEM_EXP_POTION") != 202:
        raise SystemExit("exp potion id drifted")
    require_snippet(ITEMS_TS, 'name: "小金币袋"')
    require_snippet(ITEMS_TS, 'name: "经验药水"')

    table = [
        {"day": 1, "rewards": [{"id": 1, "name": "金币", "count": 80}]},
        {"day": 2, "rewards": [{"id": 2, "name": "钻石", "count": 15}]},
        {"day": 3, "rewards": [{"id": 101, "name": stone, "count": 3}]},
        {
            "day": 4,
            "rewards": [
                {"id": 1, "name": "金币", "count": 120},
                {"id": 201, "name": "小金币袋", "count": 1},
            ],
        },
        {
            "day": 5,
            "rewards": [
                {"id": 2, "name": "钻石", "count": 30},
                {"id": 202, "name": "经验药水", "count": 1},
            ],
        },
        {
            "day": 6,
            "rewards": [
                {"id": 1, "name": "金币", "count": 200},
                {"id": 101, "name": stone, "count": 5},
            ],
        },
        {
            "day": 7,
            "rewards": [
                {"id": 1, "name": "金币", "count": 300},
                {"id": 2, "name": "钻石", "count": 50},
                {"id": 201, "name": "小金币袋", "count": 2},
            ],
        },
    ]
    literal_ids = {1, 2}
    for row in table:
        for reward in row["rewards"]:
            if reward["id"] in literal_ids:
                require_snippet(
                    REWARDS_TS,
                    '{ id: %d, name: "%s", count: %d }' % (reward["id"], reward["name"], reward["count"]),
                )
            elif reward["id"] == 101:
                require_snippet(
                    REWARDS_TS,
                    "{ id: IDLE_ITEM_ID, name: IDLE_ITEM_NAME, count: %d }" % reward["count"],
                )
            elif reward["id"] == 201:
                require_snippet(
                    REWARDS_TS,
                    '{ id: ITEM_GOLD_BAG, name: "小金币袋", count: %d }' % reward["count"],
                )
            elif reward["id"] == 202:
                require_snippet(
                    REWARDS_TS,
                    '{ id: ITEM_EXP_POTION, name: "经验药水", count: %d }' % reward["count"],
                )
            else:
                raise SystemExit("unmapped reward id %s" % reward["id"])
    rows = [login7_row_text(row["day"], row["rewards"], 1) for row in table]
    if rows[0] != "第1天 · 金币 +80 · 今日可领":
        raise SystemExit("login7 row 1 drifted: " + rows[0])
    if rows[2] != "第3天 · 强化石 ×3 · 未到达":
        raise SystemExit("login7 row 3 drifted: " + rows[2])
    if rows[6] != "第7天 · 金币 +300、钻石 +50、小金币袋 ×2 · 未到达":
        raise SystemExit("login7 row 7 drifted: " + rows[6])
    return {
        "title": "七日登录",
        "hint": "按角色登录天领取。点一行领那一天",
        "head": "读取中…",
        "open_day": "",
        "wallet": "",
        "rows": rows,
        "claim": "领取",
        "advance": "下一天（调试）",
        "back": "返回",
    }


SPRITE_META = {key: load_sprite_frame(rel, key in SLICED_NORMALS) for key, rel in SPRITE_FILES.items()}
SF = {key: pair[0] for key, pair in SPRITE_META.items()}
SF_USER = {key: pair[1] for key, pair in SPRITE_META.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
WIRE_TITLE = color(255, 214, 150, 255)
WIRE_MUTED = color(214, 186, 186, 255)
L7_TITLE = color(255, 214, 150, 255)
L7_MUTED = color(214, 186, 186, 255)
L7_STAT = color(255, 228, 170, 255)


class Builder(object):
    def __init__(self, prefab_name):
        self.prefab_name = prefab_name
        self.objs = []
        self.path_of = {}
        self.add({
            "__type__": "cc.Prefab",
            "_name": prefab_name,
            "_objFlags": 0,
            "__editorExtras__": {},
            "_native": "",
            "data": {"__id__": 1},
            "optimizationPolicy": 0,
            "persistent": False,
        })

    def add(self, obj):
        self.objs.append(obj)
        return len(self.objs) - 1

    def make_node(self, name, parent_id, x, y, w, h, active=True):
        if parent_id is None:
            path = name
        else:
            path = self.path_of[parent_id] + "/" + name
        if path in self.path_of.values():
            raise SystemExit("duplicate node path " + path)
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
            "_lscale": vec3(1, 1, 1),
            "_mobility": 0,
            "_layer": LAYER_UI,
            "_euler": vec3(0, 0, 0),
            "_id": "",
        }
        node_id = self.add(node)
        self.path_of[node_id] = path

        uit = {
            "__type__": "cc.UITransform",
            "_name": "",
            "_objFlags": 0,
            "__editorExtras__": {},
            "node": ref(node_id),
            "_enabled": True,
            "__prefab": None,
            "_contentSize": size(w, h),
            "_anchorPoint": vec2(0.5, 0.5),
            "_id": "",
        }
        uit_id = self.add(uit)
        cpi = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(path + ":UITransform")})
        uit["__prefab"] = ref(cpi)
        node["_components"].append(ref(uit_id))

        pi = self.add({
            "__type__": "cc.PrefabInfo",
            "root": ref(1),
            "asset": ref(0),
            "fileId": fid(path + ":Node"),
            "instance": None,
            "targetOverrides": None,
            "nestedPrefabInstanceRoots": None,
        })
        node["_prefab"] = ref(pi)

        if parent_id is not None:
            self.objs[parent_id]["_children"].append(ref(node_id))
        return node_id

    def append_comp(self, node_id, comp_obj, seed):
        cpi = self.add({"__type__": "cc.CompPrefabInfo", "fileId": fid(seed)})
        comp_obj["__prefab"] = ref(cpi)
        comp_obj["node"] = ref(node_id)
        cid = self.add(comp_obj)
        self.objs[node_id]["_components"].append(ref(cid))
        return cid

    def add_sprite(self, node_id, sf_uuid, typ=SLICED, size_mode=0, col=None):
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
            "_color": col or WHITE,
            "_spriteFrame": uuid_ref(sf_uuid),
            "_type": typ,
            "_fillType": 0,
            "_sizeMode": size_mode,
            "_fillCenter": vec2(0, 0),
            "_fillStart": 0,
            "_fillRange": 0,
            "_isTrimmedMode": True,
            "_useGrayscale": False,
            "_atlas": None,
            "_id": "",
        }
        return self.append_comp(node_id, spr, self.path_of[node_id] + ":Sprite")

    def add_label(self, node_id, text, font_size, col, overflow=1, h_align=1, v_align=1, wrap=False, outline=False):
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
            "_horizontalAlign": h_align,
            "_verticalAlign": v_align,
            "_actualFontSize": font_size,
            "_fontSize": font_size,
            "_fontFamily": "Arial",
            "_lineHeight": font_size + 8,
            "_overflow": overflow,
            "_enableWrapText": wrap,
            "_font": uuid_ref(FONT),
            "_isSystemFontUsed": False,
            "_spacingX": 0,
            "_isItalic": False,
            "_isBold": False,
            "_isUnderline": False,
            "_underlineHeight": 2,
            "_cacheMode": 0,
            "_enableOutline": outline,
            "_outlineColor": color(20, 16, 28, 220),
            "_outlineWidth": 2,
            "_enableShadow": False,
            "_shadowColor": color(0, 0, 0, 255),
            "_shadowOffset": vec2(2, -2),
            "_shadowBlur": 2,
            "_id": "",
        }
        return self.append_comp(node_id, lab, self.path_of[node_id] + ":Label")

    def add_button(self, node_id, normal_sf, pressed_sf):
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
            "_normalSprite": uuid_ref(normal_sf),
            "_hoverSprite": uuid_ref(normal_sf),
            "_pressedSprite": uuid_ref(pressed_sf),
            "_disabledSprite": uuid_ref(normal_sf),
            "_duration": 0.1,
            "_zoomScale": 1.05,
            "_target": ref(node_id),
            "_id": "",
        }
        return self.append_comp(node_id, btn, self.path_of[node_id] + ":Button")

    def make_label_node(
        self, name, parent_id, x, y, w, h, text, font_size, col,
        h_align=1, v_align=1, wrap=False, outline=False, active=True,
    ):
        nid = self.make_node(name, parent_id, x, y, w, h, active=active)
        self.add_label(
            nid, text, font_size, col,
            h_align=h_align, v_align=v_align, wrap=wrap, outline=outline,
        )
        return nid

    def make_sprite_node(self, name, parent_id, x, y, w, h, sf, typ, col=None):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, sf, typ=typ, col=col)
        return nid

    def make_button(self, name, parent_id, x, y, w, h, text, font_size, bg, pressed):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, bg, typ=SLICED, col=WHITE)
        self.add_button(nid, bg, pressed)
        self.make_label_node("Label", nid, 0, 0, w - 16, h - 8, text, font_size, WHITE, outline=True)
        return nid

    def id_of(self, path):
        for nid, node_path in self.path_of.items():
            if node_path == path:
                return nid
        raise SystemExit("missing node " + path)

    def label_comp(self, path):
        node = self.objs[self.id_of(path)]
        for cref in node["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Label":
                return comp
        for cref in node["_children"]:
            child = self.objs[cref["__id__"]]
            if child.get("_name") != "Label":
                continue
            for crefc in child["_components"]:
                comp = self.objs[crefc["__id__"]]
                if comp.get("__type__") == "cc.Label":
                    return comp
        raise SystemExit("missing label on " + path)

    def label_of(self, path):
        return self.label_comp(path)["_string"]

    def size_of(self, path):
        node = self.objs[self.id_of(path)]
        uit = self.objs[node["_components"][0]["__id__"]]
        if uit.get("__type__") != "cc.UITransform":
            raise SystemExit("first component is not UITransform on " + path)
        box = uit["_contentSize"]
        return box["width"], box["height"]

    def sprite_of(self, path):
        node = self.objs[self.id_of(path)]
        for cref in node["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Sprite":
                return comp
        raise SystemExit("missing sprite on " + path)

    def button_of(self, path):
        node = self.objs[self.id_of(path)]
        for cref in node["_components"]:
            comp = self.objs[cref["__id__"]]
            if comp.get("__type__") == "cc.Button":
                return comp
        raise SystemExit("missing button on " + path)

    def expect(self, path, x, y, w, h, text=None, active=True):
        node = self.objs[self.id_of(path)]
        pos = node["_lpos"]
        if pos["x"] != x or pos["y"] != y:
            raise SystemExit("%s position %s,%s != %s,%s" % (path, pos["x"], pos["y"], x, y))
        aw, ah = self.size_of(path)
        if aw != w or ah != h:
            raise SystemExit("%s size %s,%s != %s,%s" % (path, aw, ah, w, h))
        if bool(node["_active"]) != bool(active):
            raise SystemExit("%s active=%s" % (path, node["_active"]))
        if text is not None and self.label_of(path) != text:
            raise SystemExit("%s text %r" % (path, self.label_of(path)))

    def expect_align(self, path, h_align, v_align=1):
        lab = self.label_comp(path)
        if lab["_horizontalAlign"] != h_align or lab["_verticalAlign"] != v_align:
            raise SystemExit("%s align %s,%s" % (path, lab["_horizontalAlign"], lab["_verticalAlign"]))

    def expect_wrap(self, path, enabled):
        lab = self.label_comp(path)
        if bool(lab["_enableWrapText"]) != bool(enabled):
            raise SystemExit("%s wrap=%s" % (path, lab["_enableWrapText"]))

    def expect_font(self, path, font_size):
        lab = self.label_comp(path)
        if lab["_fontSize"] != font_size:
            raise SystemExit("%s font %s" % (path, lab["_fontSize"]))
        if lab["_font"]["__uuid__"] != FONT or lab["_isSystemFontUsed"]:
            raise SystemExit("%s is not FZCSJW" % path)

    def expect_label_color(self, path, tint):
        got = self.label_comp(path)["_color"]
        if (got["r"], got["g"], got["b"], got["a"]) != (tint["r"], tint["g"], tint["b"], tint["a"]):
            raise SystemExit("%s label color %s" % (path, got))

    def expect_tint(self, path, tint):
        got = self.sprite_of(path)["_color"]
        if (got["r"], got["g"], got["b"], got["a"]) != (tint["r"], tint["g"], tint["b"], tint["a"]):
            raise SystemExit("%s tint %s" % (path, got))

    def expect_sprite(self, path, sf_uuid, typ):
        spr = self.sprite_of(path)
        if spr["_spriteFrame"]["__uuid__"] != sf_uuid:
            raise SystemExit("%s sprite %s" % (path, spr["_spriteFrame"]))
        if spr["_type"] != typ or spr["_sizeMode"] != 0:
            raise SystemExit("%s sprite type %s sizeMode %s" % (path, spr["_type"], spr["_sizeMode"]))


def build_wire(copy):
    b = Builder("WireSevenDayPage")
    root = b.make_node("WireSevenDayPage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    # Photo bg, white SIMPLE, stretched from 640x1280 to the 720x1280 page.
    # The code still paints a rect; this shell does not.
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["bg"], SIMPLE, col=WHITE)
    b.make_label_node(
        "Title", root, 0, TITLE_Y, TITLE_BOX[0], TITLE_BOX[1],
        copy["title"], 36, WIRE_TITLE, outline=True,
    )
    b.make_label_node(
        "SideEffect", root, 0, SIDE_Y, SIDE_BOX[0], SIDE_BOX[1],
        copy["side"], 22, WIRE_TITLE,
    )
    # 22002 push copy sits with the other notes. Status is the 22000 head.
    b.make_label_node(
        "PushNote", root, 0, PUSH_Y, PUSH_BOX[0], PUSH_BOX[1],
        copy["push"], 20, WIRE_MUTED,
    )
    b.make_label_node(
        "Note", root, 0, NOTE_Y, NOTE_BOX[0], NOTE_BOX[1],
        copy["note"], 20, WIRE_MUTED,
    )
    b.make_label_node(
        "FieldNote", root, 0, FIELD_Y, FIELD_BOX[0], FIELD_BOX[1],
        copy["field"], 18, WIRE_MUTED, wrap=True,
    )
    b.make_label_node(
        "Status", root, 0, STATUS_Y, STATUS_BOX[0], STATUS_BOX[1],
        copy["status"], 22, WIRE_TITLE, outline=True,
    )

    # Hosts sit at the page origin so child y matches place() on the code page.
    # Runtime render() rebuilds rows. These children are the shell.
    # Empty / Unsynced / More stay inactive. Row_* are the visible samples.
    list_host = b.make_node("ListHost", root, 0, 0, PAGE_W, PAGE_H)
    rows = b.make_node("Rows", list_host, 0, 0, PAGE_W, PAGE_H)
    b.make_label_node(
        "Unsynced", rows, 0, UNSYNCED_Y, STATE_BOX[0], STATE_BOX[1],
        copy["unsynced"], 28, WIRE_TITLE, active=False,
    )
    b.make_label_node(
        "Empty", rows, 0, EMPTY_Y, STATE_BOX[0], STATE_BOX[1],
        copy["empty"], 28, WIRE_TITLE, active=False,
    )
    for i, text in enumerate(copy["rows"]):
        b.make_label_node(
            "Row_%d" % i, rows, 0, TOP - i * STEP, ROW_BOX[0], ROW_BOX[1],
            text, 22, WIRE_TITLE, h_align=0, active=True,
        )
    b.make_label_node(
        "More", rows, 0, TOP - copy["visible"] * STEP, MORE_BOX[0], MORE_BOX[1],
        copy["more"], 18, WIRE_MUTED, active=False,
    )
    b.make_button(
        "BtnBack", root, 0, BACK_Y, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_wire(b, copy)
    return b


def build_login7(copy):
    b = Builder("Login7Page")
    root = b.make_node("Login7Page", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["bg"], SIMPLE, col=WHITE)
    b.make_label_node(
        "Title", root, 0, L7_TITLE_Y, L7_TITLE_BOX[0], L7_TITLE_BOX[1],
        copy["title"], 40, L7_TITLE, outline=True,
    )
    b.make_label_node(
        "Hint", root, 0, L7_HINT_Y, L7_HINT_BOX[0], L7_HINT_BOX[1],
        copy["hint"], 18, L7_MUTED,
    )
    b.make_label_node(
        "Head", root, 0, L7_HEAD_Y, L7_HEAD_BOX[0], L7_HEAD_BOX[1],
        copy["head"], 26, L7_STAT,
    )
    b.make_label_node(
        "OpenDay", root, 0, L7_OPEN_Y, L7_OPEN_BOX[0], L7_OPEN_BOX[1],
        copy["open_day"], 18, L7_MUTED,
    )
    b.make_label_node(
        "Wallet", root, 0, L7_WALLET_Y, L7_WALLET_BOX[0], L7_WALLET_BOX[1],
        copy["wallet"], 20, L7_STAT,
    )
    rows_host = b.make_node("RowsHost", root, 0, 0, PAGE_W, PAGE_H)
    rows = b.make_node("Rows", rows_host, 0, 0, PAGE_W, PAGE_H)
    for i, text in enumerate(copy["rows"]):
        b.make_button(
            "Row_%d" % i, rows, 0, L7_ROW_TOP - i * L7_ROW_STEP,
            L7_ROW_BOX[0], L7_ROW_BOX[1], text, 18,
            SF["btn_orange"], SF["btn_orange_p"],
        )
    b.make_button(
        "BtnClaim", root, 0, L7_CLAIM_Y, 420, 52, copy["claim"], 22,
        SF["btn_green"], SF["btn_green_p"],
    )
    b.make_button(
        "BtnAdvance", root, -150, L7_ACTION_Y, 280, 46, copy["advance"], 20,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    b.make_button(
        "BtnBack", root, 180, L7_ACTION_Y, 200, 46, copy["back"], 22,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_login7(b, copy)
    return b


def check_wire(b, copy):
    root = "WireSevenDayPage"
    b.expect(root, 0, 0, PAGE_W, PAGE_H)
    b.expect(root + "/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint(root + "/Bg", WHITE)
    b.expect_sprite(root + "/Bg", SF["bg"], SIMPLE)
    b.expect(root + "/Title", 0, TITLE_Y, TITLE_BOX[0], TITLE_BOX[1], copy["title"])
    b.expect_font(root + "/Title", 36)
    b.expect_label_color(root + "/Title", WIRE_TITLE)
    b.expect(root + "/SideEffect", 0, SIDE_Y, SIDE_BOX[0], SIDE_BOX[1], copy["side"])
    b.expect_font(root + "/SideEffect", 22)
    b.expect(root + "/PushNote", 0, PUSH_Y, PUSH_BOX[0], PUSH_BOX[1], copy["push"])
    b.expect_font(root + "/PushNote", 20)
    b.expect_label_color(root + "/PushNote", WIRE_MUTED)
    b.expect(root + "/Note", 0, NOTE_Y, NOTE_BOX[0], NOTE_BOX[1], copy["note"])
    b.expect_font(root + "/Note", 20)
    b.expect_label_color(root + "/Note", WIRE_MUTED)
    b.expect(root + "/FieldNote", 0, FIELD_Y, FIELD_BOX[0], FIELD_BOX[1], copy["field"])
    b.expect_font(root + "/FieldNote", 18)
    b.expect_wrap(root + "/FieldNote", True)
    b.expect(root + "/Status", 0, STATUS_Y, STATUS_BOX[0], STATUS_BOX[1], copy["status"])
    b.expect_font(root + "/Status", 22)
    b.expect_label_color(root + "/Status", WIRE_TITLE)
    b.expect(root + "/ListHost", 0, 0, PAGE_W, PAGE_H)
    b.expect(root + "/ListHost/Rows", 0, 0, PAGE_W, PAGE_H)
    b.expect(
        root + "/ListHost/Rows/Unsynced", 0, UNSYNCED_Y, STATE_BOX[0], STATE_BOX[1],
        copy["unsynced"], active=False,
    )
    b.expect(
        root + "/ListHost/Rows/Empty", 0, EMPTY_Y, STATE_BOX[0], STATE_BOX[1],
        copy["empty"], active=False,
    )
    if len(copy["rows"]) != 7:
        raise SystemExit("row count drifted")
    for i, text in enumerate(copy["rows"]):
        path = root + "/ListHost/Rows/Row_%d" % i
        b.expect(path, 0, TOP - i * STEP, ROW_BOX[0], ROW_BOX[1], text, active=True)
        b.expect_font(path, 22)
        b.expect_align(path, 0, 1)
        if b.button_of_optional(path) is not None:
            raise SystemExit("wire row must not be a button: " + path)
    more_y = TOP - copy["visible"] * STEP
    if more_y != 38:
        raise SystemExit("more y drifted to %s" % more_y)
    b.expect(
        root + "/ListHost/Rows/More", 0, more_y, MORE_BOX[0], MORE_BOX[1], copy["more"], active=False,
    )
    b.expect(root + "/BtnBack", 0, BACK_Y, 240, 48, "返回")
    b.expect_font(root + "/BtnBack", 24)
    b.expect_sprite(root + "/BtnBack", SF["btn_blue"], SLICED)
    b.expect_tint(root + "/BtnBack", WHITE)
    expect_scale_button(b, root + "/BtnBack", SF["btn_blue_p"])
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in (
        "BtnClaim", "BtnAdvance", "BtnBuy", "WireLogin7Page", "Login7Page",
        "Goal7", "BtnGoal7", "body", "RowsHost",
    ):
        if banned in names:
            raise SystemExit("wire page picked up " + banned)
    if names.count("Row_0") != 1 or names.count("Row_6") != 1 or "Row_7" in names:
        raise SystemExit("expected Row_0 through Row_6 and no Row_7")
    root_children = [b.objs[c["__id__"]]["_name"] for c in b.objs[b.id_of(root)]["_children"]]
    if root_children != [
        "Bg", "Title", "SideEffect", "PushNote", "Note", "FieldNote", "Status", "ListHost", "BtnBack",
    ]:
        raise SystemExit("wire root child order drifted: %s" % root_children)
    child_names = [b.objs[c["__id__"]]["_name"] for c in b.objs[b.id_of(root + "/ListHost/Rows")]["_children"]]
    expected_children = ["Unsynced", "Empty"] + ["Row_%d" % i for i in range(7)] + ["More"]
    if child_names != expected_children:
        raise SystemExit("wire rows child order drifted: %s" % child_names)
    active_rows = [
        b.objs[c["__id__"]]["_name"]
        for c in b.objs[b.id_of(root + "/ListHost/Rows")]["_children"]
        if b.objs[c["__id__"]]["_active"]
    ]
    if active_rows != ["Row_%d" % i for i in range(7)]:
        raise SystemExit("wire sample rows drifted: %s" % active_rows)
    check_common(b)


def check_login7(b, copy):
    root = "Login7Page"
    b.expect(root, 0, 0, PAGE_W, PAGE_H)
    b.expect(root + "/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint(root + "/Bg", WHITE)
    b.expect_sprite(root + "/Bg", SF["bg"], SIMPLE)
    b.expect(root + "/Title", 0, L7_TITLE_Y, L7_TITLE_BOX[0], L7_TITLE_BOX[1], copy["title"])
    b.expect_font(root + "/Title", 40)
    b.expect(root + "/Hint", 0, L7_HINT_Y, L7_HINT_BOX[0], L7_HINT_BOX[1], copy["hint"])
    b.expect_font(root + "/Hint", 18)
    b.expect(root + "/Head", 0, L7_HEAD_Y, L7_HEAD_BOX[0], L7_HEAD_BOX[1], copy["head"])
    b.expect_font(root + "/Head", 26)
    b.expect_label_color(root + "/Head", L7_STAT)
    b.expect(root + "/OpenDay", 0, L7_OPEN_Y, L7_OPEN_BOX[0], L7_OPEN_BOX[1], copy["open_day"])
    b.expect(root + "/Wallet", 0, L7_WALLET_Y, L7_WALLET_BOX[0], L7_WALLET_BOX[1], copy["wallet"])
    b.expect(root + "/RowsHost", 0, 0, PAGE_W, PAGE_H)
    b.expect(root + "/RowsHost/Rows", 0, 0, PAGE_W, PAGE_H)
    if len(copy["rows"]) != 7:
        raise SystemExit("login7 row count drifted")
    for i, text in enumerate(copy["rows"]):
        path = root + "/RowsHost/Rows/Row_%d" % i
        b.expect(path, 0, L7_ROW_TOP - i * L7_ROW_STEP, L7_ROW_BOX[0], L7_ROW_BOX[1], text)
        b.expect_font(path, 18)
        b.expect_sprite(path, SF["btn_orange"], SLICED)
        b.expect_tint(path, WHITE)
        expect_scale_button(b, path, SF["btn_orange_p"])
        if b.child_names(path) != ["Label"]:
            raise SystemExit(path + " label is not the only child")
    b.expect(root + "/BtnClaim", 0, L7_CLAIM_Y, 420, 52, copy["claim"])
    b.expect_font(root + "/BtnClaim", 22)
    b.expect_sprite(root + "/BtnClaim", SF["btn_green"], SLICED)
    expect_scale_button(b, root + "/BtnClaim", SF["btn_green_p"])
    b.expect(root + "/BtnAdvance", -150, L7_ACTION_Y, 280, 46, copy["advance"])
    b.expect_font(root + "/BtnAdvance", 20)
    b.expect_sprite(root + "/BtnAdvance", SF["btn_blue"], SLICED)
    expect_scale_button(b, root + "/BtnAdvance", SF["btn_blue_p"])
    b.expect(root + "/BtnBack", 180, L7_ACTION_Y, 200, 46, copy["back"])
    b.expect_font(root + "/BtnBack", 22)
    b.expect_sprite(root + "/BtnBack", SF["btn_blue"], SLICED)
    expect_scale_button(b, root + "/BtnBack", SF["btn_blue_p"])
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in ("WireSevenDayPage", "WireLogin7Page", "BtnGoal7", "body", "ListHost"):
        if banned in names:
            raise SystemExit("login7 page picked up " + banned)
    if "BtnClaim" not in names or "BtnAdvance" not in names:
        raise SystemExit("login7 is missing claim or advance")
    root_children = [b.objs[c["__id__"]]["_name"] for c in b.objs[b.id_of(root)]["_children"]]
    if root_children != [
        "Bg", "Title", "Hint", "Head", "OpenDay", "Wallet", "RowsHost",
        "BtnClaim", "BtnAdvance", "BtnBack",
    ]:
        raise SystemExit("login7 root child order drifted: %s" % root_children)
    check_common(b)


def expect_scale_button(b, path, pressed):
    button = b.button_of(path)
    if button["clickEvents"] != []:
        raise SystemExit(path + " clickEvents must stay empty")
    if button["_transition"] != 3:
        raise SystemExit(path + " transition is not scale")
    if button["_pressedSprite"]["__uuid__"] != pressed:
        raise SystemExit(path + " pressed sprite drifted")
    if button["_normalSprite"]["__uuid__"] != b.sprite_of(path)["_spriteFrame"]["__uuid__"]:
        raise SystemExit(path + " normal sprite drifted")


def check_common(b):
    file_ids = []
    known = set(SF.values()) | {FONT}
    node_ids = []
    for index, obj in enumerate(b.objs):
        if "fileId" in obj:
            file_ids.append(obj["fileId"])
            if len(obj["fileId"]) != 22:
                raise SystemExit("bad fileId " + obj["fileId"])
        if obj.get("__type__") == "cc.Node":
            node_ids.append(index)
            info = b.objs[obj["_prefab"]["__id__"]]
            if info.get("__type__") != "cc.PrefabInfo":
                raise SystemExit("node missing PrefabInfo " + obj["_name"])
            if info["root"]["__id__"] != 1 or info["asset"]["__id__"] != 0:
                raise SystemExit("PrefabInfo root/asset drifted on " + obj["_name"])
            for cref in obj["_components"]:
                comp = b.objs[cref["__id__"]]
                if comp.get("node", {}).get("__id__") != index:
                    raise SystemExit("component does not point at " + obj["_name"])
                cpi = b.objs[comp["__prefab"]["__id__"]]
                if cpi.get("__type__") != "cc.CompPrefabInfo":
                    raise SystemExit("component missing CompPrefabInfo on " + obj["_name"])
            for cref in obj["_children"]:
                child = b.objs[cref["__id__"]]
                parent = child.get("_parent")
                if not parent or parent.get("__id__") != index:
                    raise SystemExit("child parent mismatch under " + obj["_name"])
            if obj["_parent"] is not None:
                parent = b.objs[obj["_parent"]["__id__"]]
                child_ids = [c["__id__"] for c in parent["_children"]]
                if index not in child_ids:
                    raise SystemExit("parent missing child " + obj["_name"])
        if obj.get("__type__") == "cc.Button":
            if obj.get("clickEvents") != []:
                raise SystemExit("button clickEvents must stay empty")
            if obj.get("_transition") != 3:
                raise SystemExit("button transition is not scale")
        if obj.get("__type__") == "cc.Graphics":
            raise SystemExit("prefab must not embed Graphics; use a spriteFrame")
        if obj.get("__type__") == "cc.Label":
            font = obj.get("_font") or {}
            if font.get("__uuid__") != FONT or obj.get("_isSystemFontUsed"):
                raise SystemExit("label is not FZCSJW")
        for key in ("_spriteFrame", "_font", "_normalSprite", "_hoverSprite", "_pressedSprite", "_disabledSprite"):
            val = obj.get(key)
            if isinstance(val, dict) and "__uuid__" in val:
                if val["__uuid__"] not in known:
                    raise SystemExit("unknown uuid " + val["__uuid__"])
                if key != "_font" and not val["__uuid__"].endswith("@f9941"):
                    raise SystemExit("sprite uuid is not @f9941: " + val["__uuid__"])
    if b.objs[0].get("__type__") != "cc.Prefab" or b.objs[0]["data"]["__id__"] != 1:
        raise SystemExit("prefab data is not the root node")
    if b.objs[1].get("_parent") is not None:
        raise SystemExit("root has a parent")
    if len(file_ids) != len(set(file_ids)):
        raise SystemExit("duplicate fileId in " + b.prefab_name)
    if len(node_ids) != len(b.path_of):
        raise SystemExit("node index drift")
    n = len(b.objs)
    for obj in b.objs:
        walk_refs(obj, n)


def walk_refs(obj, n):
    if isinstance(obj, dict):
        if set(obj.keys()) == {"__id__"}:
            if not isinstance(obj["__id__"], int) or obj["__id__"] < 0 or obj["__id__"] >= n:
                raise SystemExit("dangling __id__")
        for value in obj.values():
            walk_refs(value, n)
    elif isinstance(obj, list):
        for value in obj:
            walk_refs(value, n)


# Optional lookup so the wire rows can assert they are labels, not buttons.
def _button_of_optional(self, path):
    node = self.objs[self.id_of(path)]
    for cref in node["_components"]:
        comp = self.objs[cref["__id__"]]
        if comp.get("__type__") == "cc.Button":
            return comp
    return None


def _child_names(self, path):
    node = self.objs[self.id_of(path)]
    return [self.objs[child["__id__"]]["_name"] for child in node["_children"]]


Builder.button_of_optional = _button_of_optional
Builder.child_names = _child_names


def existing_uuid(meta_path):
    if not os.path.exists(meta_path):
        return None
    with open(meta_path, encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("uuid") or ""
    if not isinstance(value, str) or len(value) < 32:
        raise SystemExit("existing meta uuid is unusable: " + meta_path)
    return value


def fresh_uuid(taken):
    for _ in range(8):
        value = str(uuid.uuid4())
        if value not in taken:
            taken.add(value)
            return value
    raise SystemExit("uuid collision")


def collect_uuids():
    taken = set()
    assets = os.path.join(ROOT, "client", "assets")
    for dirpath, _dirs, files in os.walk(assets):
        for name in files:
            if not name.endswith(".meta"):
                continue
            path = os.path.join(dirpath, name)
            with open(path, encoding="utf-8") as handle:
                data = json.load(handle)
            value = data.get("uuid")
            if isinstance(value, str) and value:
                taken.add(value)
    return taken


def write_prefab(builder, taken):
    path = os.path.join(OUT_DIR, builder.prefab_name + ".prefab")
    meta_path = path + ".meta"
    os.makedirs(OUT_DIR, exist_ok=True)
    text = json.dumps(builder.objs, ensure_ascii=False, indent=2) + "\n"
    if ".png" in text or ".jpg" in text or "resources/" in text or "USE_" in text:
        raise SystemExit("prefab embedded a file path or a load flag")
    if "gift" in text or "WireLogin7" in text or "BtnGoal7" in text:
        raise SystemExit("prefab referenced a gift frame or an out-of-scope page")
    if BG_UUID not in text:
        raise SystemExit("prefab is missing the sevenday target sprite")
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    prefab_uuid = existing_uuid(meta_path) or fresh_uuid(taken)
    meta = {
        "ver": "1.1.50",
        "importer": "prefab",
        "imported": True,
        "uuid": prefab_uuid,
        "files": [".json"],
        "subMetas": {},
        "userData": {"syncNodeName": builder.prefab_name},
    }
    with open(meta_path, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("Wrote", path)
    print("UUID", prefab_uuid)
    print("Objects", len(builder.objs))
    print("NODE_TREE_START")
    walk(builder, 1, 0)
    print("NODE_TREE_END")
    return prefab_uuid


def walk(builder, nid, indent):
    node = builder.objs[nid]
    flag = "" if node.get("_active", True) else " [inactive]"
    print("  " * indent + node["_name"] + flag)
    for child in node["_children"]:
        walk(builder, child["__id__"], indent + 1)


def write_dir_meta(taken):
    if os.path.exists(DIR_META):
        print("Keep", DIR_META)
        return
    meta = {
        "ver": "1.2.0",
        "importer": "directory",
        "imported": True,
        "uuid": fresh_uuid(taken),
        "files": [],
        "subMetas": {},
        "userData": {},
    }
    with open(DIR_META, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("Wrote", DIR_META)


def reject_extras():
    for dirpath, _dirs, files in os.walk(OUT_DIR):
        for name in files:
            lower = name.lower()
            if lower.endswith(".png") or lower.endswith(".jpg"):
                raise SystemExit("image under prefabs: " + os.path.join(dirpath, name))
    for banned in ("WireLogin7Page.prefab", "WireGoal7Page.prefab"):
        if os.path.exists(os.path.join(OUT_DIR, banned)):
            raise SystemExit("out-of-scope prefab: " + banned)
    gift_meta_1 = os.path.join(RES, "ui", "sevenday", "map-bg-seven-day-gift-1.jpg.meta")
    gift_meta_2 = os.path.join(RES, "ui", "sevenday", "map-bg-seven-day-gift-2.png.meta")
    if os.path.exists(gift_meta_1) or os.path.exists(gift_meta_2):
        raise SystemExit("gift metas must stay untouched when the prefabs do not reference them")


def assert_bg_meta():
    user = SF_USER["bg"]
    if SF["bg"] != BG_UUID:
        raise SystemExit("bg uuid drifted: " + SF["bg"])
    if int(user.get("width") or 0) != 640 or int(user.get("height") or 0) != 1280:
        raise SystemExit("bg pixel size is not 640x1280")


def main():
    assert_bg_meta()
    wire_copy = load_wire_copy()
    login_copy = load_login7_copy()
    wire = build_wire(wire_copy)
    login = build_login7(login_copy)
    taken = collect_uuids()
    write_dir_meta(taken)
    write_prefab(wire, taken)
    write_prefab(login, taken)
    reject_extras()
    print("OK")
    print("WIRE_TITLE", wire_copy["title"])
    print("WIRE_PUSH", wire_copy["push"])
    print("WIRE_NOTE", wire_copy["note"])
    print("WIRE_STATUS", wire_copy["status"])
    print("WIRE_ROWS", " | ".join(wire_copy["rows"]))
    print("LOGIN_ROWS", " | ".join(login_copy["rows"]))
    print("BG", SF["bg"])
    print("FONT", FONT)


if __name__ == "__main__":
    main()
