# -*- coding: utf-8 -*-
"""Generate Creator 3.8.8 Idle prefabs (not wired).

Writes:
  client/assets/prefabs/ui/idle/WireIdlePage.prefab
  client/assets/prefabs/ui/idle/IdlePage.prefab
and their .meta files, plus ui/idle.meta if it is missing.

WireIdlePage is the real-server page (WireIdlePage.ts / wireIdle.ts, cmds 3004/3005).
IdlePage is the Mock page (IdlePage.ts). They do not share a root.

SpriteFrame uuids come from client/assets/resources/**/*.meta (@f9941).
Does not touch Boot, MainApp, page scripts, protocol, or USE_*_PREFAB flags.
No idle atlas: page chrome is common win-bg and button art.
"""
import hashlib
import json
import os
import re
import uuid
import base64

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "idle")
DIR_META = OUT_DIR + ".meta"
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

IDLE_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "IdlePage.ts")
WIRE_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "WireIdlePage.ts")
WIRE_PROTO = os.path.join(ROOT, "client", "assets", "scripts", "net", "protocol", "wireIdle.ts")
REWARDS_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "idle", "rewards.ts")
BATTLE_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "mainline", "battle.ts")

SPRITE_FILES = {
    "win_bg": "ui/common/win-bg_win-bg-12.png",
    "block": "ui/common/win-bg_block-bg-5.png",
    "btn_blue": "ui/common/button_btn-blue-big-1.png",
    "btn_blue_p": "ui/common/button_btn-blue-big-2.png",
    "btn_orange": "ui/common/button_btn-orange-big-1.png",
    "btn_orange_p": "ui/common/button_btn-orange-big-2.png",
    "btn_green": "ui/common/button_btn-green-big-1.png",
    "btn_green_p": "ui/common/button_btn-green-big-2.png",
}

LAYER_UI = 33554432
PAGE_W = 720
PAGE_H = 1280
# Fresh Mock query: nothing cleared, clock still at the anchor, nothing owned.
FRESH_CLEARED = 0
FRESH_ELAPSED_MS = 0
FRESH_OWNED = 0
FRESH_STAGE = 1


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


def load_sprite_frame(rel):
    meta_path = os.path.join(RES, rel + ".meta")
    with open(meta_path, encoding="utf-8") as handle:
        data = json.load(handle)
    sub = data.get("subMetas", {}).get("f9941")
    if not sub or sub.get("importer") != "sprite-frame":
        raise SystemExit("missing sprite-frame f9941 in " + meta_path)
    value = sub.get("uuid") or ""
    if not value.endswith("@f9941"):
        raise SystemExit("spriteFrame uuid is not @f9941: " + meta_path)
    return value


def load_font_uuid():
    with open(FONT_META, encoding="utf-8") as handle:
        data = json.load(handle)
    value = data.get("uuid") or ""
    if data.get("importer") != "ttf-font" or len(value) < 32:
        raise SystemExit("font meta missing uuid: " + FONT_META)
    return value


def gold_per_min(cleared):
    """Same formula as goldPerMin after normalizeCleared."""
    return 6 + cleared * 4


def item_every_ms(cleared):
    """Same formula as itemEveryMs after normalizeCleared."""
    every = 30 * 1000 - cleared * 1000
    return 10 * 1000 if every < 10 * 1000 else every


def preview_idle(elapsed_ms, cleared, cap_ms):
    """Same clamp and floors as previewIdle."""
    capped = elapsed_ms >= cap_ms
    elapsed = elapsed_ms
    if elapsed < 0:
        elapsed = 0
    if elapsed > cap_ms:
        elapsed = cap_ms
    per_min = gold_per_min(cleared)
    every = item_every_ms(cleared)
    gold = int((elapsed * per_min) / 60000)
    item = int(elapsed / every) if every > 0 else 0
    return {
        "elapsed_ms": int(elapsed),
        "capped": capped,
        "gold": gold,
        "item": item,
        "gold_per_min": per_min,
        "item_every_ms": every,
    }


def format_duration(ms):
    """Same pad as formatDuration."""
    total = int(ms / 1000)
    if total < 0:
        total = 0
    hours = total // 3600
    minutes = (total % 3600) // 60
    seconds = total % 60
    return "%02d:%02d:%02d" % (hours, minutes, seconds)


def format_item_every(every_ms):
    """Same words as formatItemEvery."""
    sec = max(0, int(round(every_ms / 1000.0)))
    if sec >= 60 and sec % 60 == 0:
        return "每 %d 分钟 1 个" % (sec // 60)
    return "每 %d 秒 1 个" % sec


def cap_preview_line(gold, item, item_name):
    """Same concatenation as capPreviewLine."""
    return "挂满 8 小时约可领 金币 %d、%s %d" % (int(gold), item_name, int(item))


def push_button_text(stage):
    """Same concatenation as pushButtonText."""
    return "推关到%d（调试）" % stage


def quick_label(stage_id, count):
    """Same concatenation as IdlePage.quickLabel."""
    stage = stage_id if stage_id >= 1 else 1
    if count > 1:
        return "快速作战 · 第%d关起 %d 关" % (stage, count)
    return "快速作战 · 第%d关" % stage


def load_copy():
    """Pull the strings and coordinates the prefabs are standing in for."""
    require_snippet(WIRE_TS, "const PAGE_BG = new Color(8, 16, 32, 255);")
    require_snippet(WIRE_TS, 'place(createLabel("挂机", 40, { color: TITLE }), this.body, 0, 470);')
    require_snippet(
        WIRE_TS,
        'place(createLabel("上次领取 未同步", 20, { color: MUTED, width: 640 }), this.body, 0, 400);',
    )
    require_snippet(
        WIRE_TS,
        'place(createLabel("已挂机 未同步", 28, { color: TITLE, width: 640 }), this.body, 0, 340);',
    )
    require_snippet(
        WIRE_TS,
        'place(createLabel("", 18, { color: MUTED, width: 640 }), this.body, 0, 285);',
    )
    require_snippet(
        WIRE_TS,
        'place(createRect("card", 640, 180, new Color(16, 28, 48, 255)), this.body, 0, 150);',
    )
    require_snippet(WIRE_TS, 'place(createLabel("当前可领", 18, { color: MUTED }), this.body, 0, 210);')
    require_snippet(
        WIRE_TS,
        'place(createLabel("", 22, { color: GOLD, width: 600, height: 80 }), this.body, 0, 150);',
    )
    require_snippet(
        WIRE_TS,
        'place(createLabel("", 18, { color: MUTED, width: 600 }), this.body, 0, 80);',
    )
    require_snippet(
        WIRE_TS,
        'place(createButton("领取", () => this.claim(), 420, 64, CLAIM_FILL), this.body, 0, -40);',
    )
    require_snippet(
        WIRE_TS,
        'createLabel("领取只发空的 3005 并记下回包。没有奖励清单，不改金币。快速作战仍是 Mock，这一页不放", 16, {',
    )
    require_snippet(WIRE_TS, "width: 640,")
    require_snippet(WIRE_TS, "height: 64,")
    require_snippet(WIRE_TS, "0,\n      -140")
    require_snippet(
        WIRE_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -230);',
    )
    require_snippet(
        WIRE_TS,
        'view.capped ? "已达上限。奖励清单仍不在这包里" : "时长只按 3004 的时间推。不按 Mock 的每分钟金币计算"',
    )
    require_snippet(WIRE_PROTO, 'preview: "这一包没有奖励清单。不写金币，不写强化石",')
    require_snippet(WIRE_PROTO, ': "已挂机 未同步";')
    require_snippet(WIRE_PROTO, 'if (max === null) cap = "最大挂机 未同步";')
    require_snippet(WIRE_PROTO, 'if (reward === null) last = "上次领取 未同步";')

    require_snippet(IDLE_TS, "const PAGE_BG = new Color(8, 16, 32, 255);")
    require_snippet(IDLE_TS, 'place(createLabel("挂机", 40, { color: TITLE }), this.body, 0, 470);')
    require_snippet(
        IDLE_TS,
        'this.progressLabel = place(createLabel("读取进度…", 20, { color: MUTED, width: 640 }), this.body, 0, 415);',
    )
    require_snippet(
        IDLE_TS,
        'this.durationLabel = place(createLabel("已挂机 --:--:-- / 08:00:00", 28, { color: TITLE, width: 640 }), this.body, 0, 360);',
    )
    require_snippet(
        IDLE_TS,
        'this.statusLabel = place(createLabel("", 18, { color: MUTED, width: 640 }), this.body, 0, 315);',
    )
    require_snippet(
        IDLE_TS,
        'place(createRect("card", 640, 250, new Color(16, 28, 48, 255)), this.body, 0, 150);',
    )
    require_snippet(IDLE_TS, 'place(createLabel("当前可领", 18, { color: MUTED }), this.body, 0, 245);')
    require_snippet(
        IDLE_TS,
        'this.goldLabel = place(createLabel("金币 +0", 26, { color: GOLD, width: 600 }), this.body, 0, 195);',
    )
    require_snippet(
        IDLE_TS,
        'this.itemLabel = place(createLabel(IDLE_ITEM_NAME + " +0", 26, { color: ITEM, width: 600 }), this.body, 0, 145);',
    )
    require_snippet(
        IDLE_TS,
        'this.capLabel = place(createLabel("", 18, { color: MUTED, width: 600 }), this.body, 0, 90);',
    )
    require_snippet(
        IDLE_TS,
        'this.ownedLabel = place(createLabel("", 18, { color: MUTED, width: 640 }), this.body, 0, -10);',
    )
    require_snippet(
        IDLE_TS,
        'place(createButton("领取", () => void this.claim(), 420, 64, CLAIM_FILL), this.body, 0, -80);',
    )
    require_snippet(
        IDLE_TS,
        "createButton(this.quickLabel(this.host.stageId()), () => void this.quick(), 420, 64),",
    )
    require_snippet(IDLE_TS, "0,\n      -165")
    require_snippet(
        IDLE_TS,
        "createButton(pushButtonText(), () => void this.pushToGoal(), 420, 52, DEBUG_FILL, 22),",
    )
    require_snippet(IDLE_TS, "0,\n      -245")
    require_snippet(
        IDLE_TS,
        'createLabel("快速作战结算当前关。调试按钮连推到第70关，每关金币相同，不播战报", 16, { color: MUTED, width: 640 }),',
    )
    require_snippet(IDLE_TS, "0,\n      -310")
    require_snippet(
        IDLE_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -375);',
    )
    require_snippet(
        IDLE_TS,
        'this.write(this.progressLabel, "已通关 " + cleared + " 关 · 当前第 " + stageId + " 关");',
    )
    require_snippet(
        IDLE_TS,
        '"已挂机 " + formatDuration(view.elapsedMs) + " / " + formatDuration(view.capMs)',
    )
    require_snippet(
        IDLE_TS,
        'view.capped ? "已达 8 小时上限，请领取" : "未到上限。整段时长按当前已通关关数计算"',
    )
    require_snippet(
        IDLE_TS,
        '"金币 +" + view.pendingGold + "（每分钟 " + view.goldPerMin + "）"',
    )
    require_snippet(
        IDLE_TS,
        'view.itemName + " +" + view.pendingItem + "（" + formatItemEvery(view.itemEveryMs) + "）"',
    )
    require_snippet(IDLE_TS, "this.write(this.capLabel, capPreviewLine(view.capGold, view.capItem));")
    require_snippet(
        IDLE_TS,
        'this.write(this.ownedLabel, "已有" + view.itemName + " " + view.ownedItem + "（可在背包查看）");',
    )
    require_snippet(
        IDLE_TS,
        'if (QUICK_BATTLE_COUNT > 1) return "快速作战 · 第" + id + "关起 " + QUICK_BATTLE_COUNT + " 关";',
    )
    require_snippet(IDLE_TS, 'return "快速作战 · 第" + id + "关";')

    require_snippet(REWARDS_TS, "export const IDLE_CAP_MS = 8 * 60 * 60 * 1000;")
    require_snippet(REWARDS_TS, "return 6 + normalizeCleared(clearedStage) * 4;")
    require_snippet(REWARDS_TS, "const every = 30 * 1000 - normalizeCleared(clearedStage) * 1000;")
    require_snippet(REWARDS_TS, "return every < 10 * 1000 ? 10 * 1000 : every;")
    require_snippet(REWARDS_TS, 'return pad(h) + ":" + pad(m) + ":" + pad(s);')
    require_snippet(REWARDS_TS, 'if (sec >= 60 && sec % 60 === 0) return "每 " + sec / 60 + " 分钟 1 个";')
    require_snippet(REWARDS_TS, 'return "每 " + sec + " 秒 1 个";')
    require_snippet(
        REWARDS_TS,
        'return "挂满 8 小时约可领 金币 " + Math.floor(gold) + "、" + IDLE_ITEM_NAME + " " + Math.floor(item);',
    )
    require_snippet(BATTLE_TS, 'return "推关到" + MAINLINE_PUSH_STAGE + "（调试）";')

    item_name = ts_string(REWARDS_TS, "IDLE_ITEM_NAME")
    quick_count = ts_int(REWARDS_TS, "QUICK_BATTLE_COUNT")
    push_stage = ts_int(BATTLE_TS, "MAINLINE_PUSH_STAGE")
    cap_ms = 8 * 60 * 60 * 1000
    pending = preview_idle(FRESH_ELAPSED_MS, FRESH_CLEARED, cap_ms)
    full = preview_idle(cap_ms, FRESH_CLEARED, cap_ms)
    if pending["gold"] != 0 or pending["item"] != 0 or pending["capped"]:
        raise SystemExit("fresh idle preview is not empty")
    if pending["gold_per_min"] != 6 or pending["item_every_ms"] != 30000:
        raise SystemExit("fresh rates drifted")
    if full["gold"] != 2880 or full["item"] != 960:
        raise SystemExit("eight-hour cap drifted: %s %s" % (full["gold"], full["item"]))
    if format_duration(0) != "00:00:00" or format_duration(cap_ms) != "08:00:00":
        raise SystemExit("duration format drifted")

    every = format_item_every(pending["item_every_ms"])
    if every != "每 30 秒 1 个":
        raise SystemExit("item cadence drifted: " + every)
    cap_line = cap_preview_line(full["gold"], full["item"], item_name)
    if cap_line != "挂满 8 小时约可领 金币 2880、%s 960" % item_name:
        raise SystemExit("cap line drifted: " + cap_line)
    push = push_button_text(push_stage)
    if push != "推关到%d（调试）" % push_stage:
        raise SystemExit("push label drifted: " + push)
    quick = quick_label(FRESH_STAGE, quick_count)
    if quick_count != 1 or quick != "快速作战 · 第1关":
        raise SystemExit("quick label drifted: " + quick)

    # render() after a fresh query. build() still says 「读取进度…」 and 「金币 +0」
    # until that query lands; the prefab shows the loaded sentences.
    gold = "金币 +%d（每分钟 %d）" % (pending["gold"], pending["gold_per_min"])
    item = "%s +%d（%s）" % (item_name, pending["item"], every)
    owned = "已有%s %d（可在背包查看）" % (item_name, FRESH_OWNED)
    return {
        "wire_status": "时长只按 3004 的时间推。不按 Mock 的每分钟金币计算",
        "wire_preview": "这一包没有奖励清单。不写金币，不写强化石",
        "wire_hint": "领取只发空的 3005 并记下回包。没有奖励清单，不改金币。快速作战仍是 Mock，这一页不放",
        "progress": "已通关 %d 关 · 当前第 %d 关" % (FRESH_CLEARED, FRESH_STAGE),
        "duration": "已挂机 %s / %s" % (format_duration(pending["elapsed_ms"]), format_duration(cap_ms)),
        "status": "未到上限。整段时长按当前已通关关数计算",
        "gold": gold,
        "item": item,
        "cap": cap_line,
        "owned": owned,
        "quick": quick,
        "push": push,
        "hint": "快速作战结算当前关。调试按钮连推到第70关，每关金币相同，不播战报",
        "item_name": item_name,
    }


SF = {key: load_sprite_frame(rel) for key, rel in SPRITE_FILES.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE_COLOR = color(255, 228, 170, 255)
MUTED = color(190, 205, 225, 255)
GOLD = color(255, 214, 120, 255)
ITEM = color(186, 214, 170, 255)
PAGE_BG = color(8, 16, 32, 255)
CARD_BG = color(16, 28, 48, 255)


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

    def add_sprite(self, node_id, sf_uuid, typ=1, size_mode=0, col=None, grayscale=False):
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
            "_useGrayscale": grayscale,
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

    def make_sprite_node(self, name, parent_id, x, y, w, h, sf, col=None, grayscale=False):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, sf, col=col, grayscale=grayscale)
        return nid

    def make_button(self, name, parent_id, x, y, w, h, text, font_size, bg, pressed, grayscale=False, col=None):
        nid = self.make_node(name, parent_id, x, y, w, h)
        self.add_sprite(nid, bg, col=col, grayscale=grayscale)
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

    def child_names(self, path):
        node = self.objs[self.id_of(path)]
        return [self.objs[child["__id__"]]["_name"] for child in node["_children"]]

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
            raise SystemExit(
                "%s align %s,%s" % (path, lab["_horizontalAlign"], lab["_verticalAlign"])
            )

    def expect_font(self, path, font_size):
        lab = self.label_comp(path)
        if lab["_fontSize"] != font_size:
            raise SystemExit("%s font %s" % (path, lab["_fontSize"]))

    def expect_label_color(self, path, tint):
        got = self.label_comp(path)["_color"]
        if (got["r"], got["g"], got["b"], got["a"]) != (tint["r"], tint["g"], tint["b"], tint["a"]):
            raise SystemExit("%s label color %s" % (path, got))

    def expect_tint(self, path, tint):
        got = self.sprite_of(path)["_color"]
        if (got["r"], got["g"], got["b"], got["a"]) != (tint["r"], tint["g"], tint["b"], tint["a"]):
            raise SystemExit("%s tint %s" % (path, got))

    def expect_sprite(self, path, sf_uuid):
        got = self.sprite_of(path)["_spriteFrame"]["__uuid__"]
        if got != sf_uuid:
            raise SystemExit("%s sprite %s" % (path, got))

    def expect_grayscale(self, path, enabled):
        got = self.sprite_of(path)["_useGrayscale"]
        if bool(got) != bool(enabled):
            raise SystemExit("%s grayscale=%s" % (path, got))


def label_box(font_size, width):
    return width, font_size + 16


def build_wire(copy):
    b = Builder("WireIdlePage")
    root = b.make_node("WireIdlePage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    # Deep-blue page fill. The code paints a rect; the prefab tints common win-bg.
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", root, 0, 470, title_w, title_h, "挂机", 40, TITLE_COLOR, outline=True)
    last_w, last_h = label_box(20, 640)
    b.make_label_node("Last", root, 0, 400, last_w, last_h, "上次领取 未同步", 20, MUTED)
    dur_w, dur_h = label_box(28, 640)
    b.make_label_node("Duration", root, 0, 340, dur_w, dur_h, "已挂机 未同步", 28, TITLE_COLOR)
    status_w, status_h = label_box(18, 640)
    b.make_label_node("Status", root, 0, 285, status_w, status_h, copy["wire_status"], 18, MUTED)
    b.make_sprite_node("Card", root, 0, 150, 640, 180, SF["block"], col=CARD_BG)
    preview_title_w, preview_title_h = label_box(18, 680)
    b.make_label_node(
        "PreviewTitle", root, 0, 210, preview_title_w, preview_title_h, "当前可领", 18, MUTED,
    )
    b.make_label_node(
        "Preview", root, 0, 150, 600, 80, copy["wire_preview"], 22, GOLD,
        v_align=0, wrap=True,
    )
    cap_w, cap_h = label_box(18, 600)
    b.make_label_node("Cap", root, 0, 80, cap_w, cap_h, "最大挂机 未同步", 18, MUTED)
    b.make_button(
        "BtnClaim", root, 0, -40, 420, 64, "领取", 24,
        SF["btn_orange"], SF["btn_orange_p"],
    )
    b.make_label_node(
        "Hint", root, 0, -140, 640, 64, copy["wire_hint"], 16, MUTED,
        v_align=0, wrap=True,
    )
    b.make_button(
        "BtnBack", root, 0, -230, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_wire(b, copy)
    return b


def build_idle(copy):
    b = Builder("IdlePage")
    root = b.make_node("IdlePage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", root, 0, 470, title_w, title_h, "挂机", 40, TITLE_COLOR, outline=True)
    prog_w, prog_h = label_box(20, 640)
    b.make_label_node("Progress", root, 0, 415, prog_w, prog_h, copy["progress"], 20, MUTED)
    dur_w, dur_h = label_box(28, 640)
    b.make_label_node("Duration", root, 0, 360, dur_w, dur_h, copy["duration"], 28, TITLE_COLOR)
    status_w, status_h = label_box(18, 640)
    b.make_label_node("Status", root, 0, 315, status_w, status_h, copy["status"], 18, MUTED)
    b.make_sprite_node("Card", root, 0, 150, 640, 250, SF["block"], col=CARD_BG)
    preview_title_w, preview_title_h = label_box(18, 680)
    b.make_label_node(
        "PreviewTitle", root, 0, 245, preview_title_w, preview_title_h, "当前可领", 18, MUTED,
    )
    gold_w, gold_h = label_box(26, 600)
    b.make_label_node("Gold", root, 0, 195, gold_w, gold_h, copy["gold"], 26, GOLD)
    item_w, item_h = label_box(26, 600)
    b.make_label_node("Item", root, 0, 145, item_w, item_h, copy["item"], 26, ITEM)
    cap_w, cap_h = label_box(18, 600)
    b.make_label_node("Cap", root, 0, 90, cap_w, cap_h, copy["cap"], 18, MUTED)
    owned_w, owned_h = label_box(18, 640)
    b.make_label_node("Owned", root, 0, -10, owned_w, owned_h, copy["owned"], 18, MUTED)
    b.make_button(
        "BtnClaim", root, 0, -80, 420, 64, "领取", 24,
        SF["btn_orange"], SF["btn_orange_p"],
    )
    b.make_button(
        "BtnQuick", root, 0, -165, 420, 64, copy["quick"], 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    # Debug push. Code fills DEBUG_FILL; there is no purple button art.
    # Green keeps it distinct from claim (orange) and quick/back (blue).
    b.make_button(
        "BtnPush", root, 0, -245, 420, 52, copy["push"], 22,
        SF["btn_green"], SF["btn_green_p"],
    )
    hint_w, hint_h = label_box(16, 640)
    b.make_label_node("Hint", root, 0, -310, hint_w, hint_h, copy["hint"], 16, MUTED)
    b.make_button(
        "BtnBack", root, 0, -375, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_idle(b, copy)
    return b


def check_wire(b, copy):
    b.expect("WireIdlePage", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireIdlePage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint("WireIdlePage/Bg", PAGE_BG)
    b.expect_sprite("WireIdlePage/Bg", SF["win_bg"])
    b.expect("WireIdlePage/Title", 0, 470, 680, 56, "挂机")
    b.expect_font("WireIdlePage/Title", 40)
    b.expect_label_color("WireIdlePage/Title", TITLE_COLOR)
    b.expect("WireIdlePage/Last", 0, 400, 640, 36, "上次领取 未同步")
    b.expect("WireIdlePage/Duration", 0, 340, 640, 44, "已挂机 未同步")
    b.expect_label_color("WireIdlePage/Duration", TITLE_COLOR)
    b.expect("WireIdlePage/Status", 0, 285, 640, 34, copy["wire_status"])
    b.expect("WireIdlePage/Card", 0, 150, 640, 180)
    b.expect_tint("WireIdlePage/Card", CARD_BG)
    b.expect_sprite("WireIdlePage/Card", SF["block"])
    b.expect("WireIdlePage/PreviewTitle", 0, 210, 680, 34, "当前可领")
    b.expect("WireIdlePage/Preview", 0, 150, 600, 80, copy["wire_preview"])
    b.expect_align("WireIdlePage/Preview", 1, 0)
    b.expect_font("WireIdlePage/Preview", 22)
    b.expect_label_color("WireIdlePage/Preview", GOLD)
    b.expect("WireIdlePage/Cap", 0, 80, 600, 34, "最大挂机 未同步")
    b.expect("WireIdlePage/BtnClaim", 0, -40, 420, 64, "领取")
    b.expect_sprite("WireIdlePage/BtnClaim", SF["btn_orange"])
    b.expect_font("WireIdlePage/BtnClaim", 24)
    b.expect("WireIdlePage/Hint", 0, -140, 640, 64, copy["wire_hint"])
    b.expect_align("WireIdlePage/Hint", 1, 0)
    b.expect_font("WireIdlePage/Hint", 16)
    b.expect("WireIdlePage/BtnBack", 0, -230, 240, 48, "返回")
    b.expect_sprite("WireIdlePage/BtnBack", SF["btn_blue"])
    names = b.child_names("WireIdlePage")
    expected = [
        "Bg", "Title", "Last", "Duration", "Status", "Card", "PreviewTitle",
        "Preview", "Cap", "BtnClaim", "Hint", "BtnBack",
    ]
    if names != expected:
        raise SystemExit("wire children %s" % names)
    for banned in ("BtnQuick", "BtnPush", "Progress", "Gold", "Item", "Owned", "PanelList", "Top", "Bottom"):
        if banned in names:
            raise SystemExit("wire page picked up " + banned)
    check_common(b)


def check_idle(b, copy):
    b.expect("IdlePage", 0, 0, PAGE_W, PAGE_H)
    b.expect("IdlePage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint("IdlePage/Bg", PAGE_BG)
    b.expect_sprite("IdlePage/Bg", SF["win_bg"])
    b.expect("IdlePage/Title", 0, 470, 680, 56, "挂机")
    b.expect_font("IdlePage/Title", 40)
    b.expect("IdlePage/Progress", 0, 415, 640, 36, copy["progress"])
    b.expect("IdlePage/Duration", 0, 360, 640, 44, copy["duration"])
    b.expect_label_color("IdlePage/Duration", TITLE_COLOR)
    b.expect("IdlePage/Status", 0, 315, 640, 34, copy["status"])
    b.expect("IdlePage/Card", 0, 150, 640, 250)
    b.expect_tint("IdlePage/Card", CARD_BG)
    b.expect_sprite("IdlePage/Card", SF["block"])
    b.expect("IdlePage/PreviewTitle", 0, 245, 680, 34, "当前可领")
    b.expect("IdlePage/Gold", 0, 195, 600, 42, copy["gold"])
    b.expect_font("IdlePage/Gold", 26)
    b.expect_label_color("IdlePage/Gold", GOLD)
    b.expect("IdlePage/Item", 0, 145, 600, 42, copy["item"])
    b.expect_font("IdlePage/Item", 26)
    b.expect_label_color("IdlePage/Item", ITEM)
    b.expect("IdlePage/Cap", 0, 90, 600, 34, copy["cap"])
    b.expect("IdlePage/Owned", 0, -10, 640, 34, copy["owned"])
    b.expect("IdlePage/BtnClaim", 0, -80, 420, 64, "领取")
    b.expect_sprite("IdlePage/BtnClaim", SF["btn_orange"])
    b.expect("IdlePage/BtnQuick", 0, -165, 420, 64, copy["quick"])
    b.expect_sprite("IdlePage/BtnQuick", SF["btn_blue"])
    b.expect_font("IdlePage/BtnQuick", 24)
    b.expect("IdlePage/BtnPush", 0, -245, 420, 52, copy["push"])
    b.expect_sprite("IdlePage/BtnPush", SF["btn_green"])
    b.expect_font("IdlePage/BtnPush", 22)
    b.expect_grayscale("IdlePage/BtnPush", False)
    b.expect("IdlePage/Hint", 0, -310, 640, 32, copy["hint"])
    b.expect_font("IdlePage/Hint", 16)
    b.expect("IdlePage/BtnBack", 0, -375, 240, 48, "返回")
    b.expect_sprite("IdlePage/BtnBack", SF["btn_blue"])
    names = b.child_names("IdlePage")
    expected = [
        "Bg", "Title", "Progress", "Duration", "Status", "Card", "PreviewTitle",
        "Gold", "Item", "Cap", "Owned", "BtnClaim", "BtnQuick", "BtnPush", "Hint", "BtnBack",
    ]
    if names != expected:
        raise SystemExit("mock children %s" % names)
    for banned in ("Last", "Unsynced", "ListHost", "RowsHost", "Top", "Bottom", "PanelList"):
        if banned in names:
            raise SystemExit("mock page picked up " + banned)
    if copy["gold"] != "金币 +0（每分钟 6）":
        raise SystemExit("fresh gold line drifted: " + copy["gold"])
    if copy["item"] != copy["item_name"] + " +0（每 30 秒 1 个）":
        raise SystemExit("fresh item line drifted: " + copy["item"])
    if copy["owned"] != "已有" + copy["item_name"] + " 0（可在背包查看）":
        raise SystemExit("owned line drifted: " + copy["owned"])
    if copy["progress"] != "已通关 0 关 · 当前第 1 关":
        raise SystemExit("progress drifted: " + copy["progress"])
    if copy["duration"] != "已挂机 00:00:00 / 08:00:00":
        raise SystemExit("duration drifted: " + copy["duration"])
    check_common(b)


def check_common(b):
    file_ids = []
    known = set(SF.values()) | {FONT}
    for obj in b.objs:
        if "fileId" in obj:
            file_ids.append(obj["fileId"])
            if len(obj["fileId"]) != 22:
                raise SystemExit("bad fileId " + obj["fileId"])
        if obj.get("__type__") == "cc.Button":
            if obj.get("clickEvents") != []:
                raise SystemExit("button clickEvents must stay empty")
            if obj.get("_transition") != 3:
                raise SystemExit("button transition is not scale")
        if obj.get("__type__") == "cc.Graphics":
            raise SystemExit("prefab must not embed Graphics; use a spriteFrame")
        for key in ("_spriteFrame", "_font", "_normalSprite", "_hoverSprite", "_pressedSprite", "_disabledSprite"):
            val = obj.get(key)
            if isinstance(val, dict) and "__uuid__" in val:
                if val["__uuid__"] not in known:
                    raise SystemExit("unknown uuid " + val["__uuid__"])
                if key != "_font" and not val["__uuid__"].endswith("@f9941"):
                    raise SystemExit("sprite uuid is not @f9941: " + val["__uuid__"])
        if obj.get("__type__") == "cc.Node" and obj["_parent"] is not None:
            parent = b.objs[obj["_parent"]["__id__"]]
            child_ids = [c["__id__"] for c in parent["_children"]]
            if b.objs.index(obj) not in child_ids:
                raise SystemExit("parent missing child " + obj["_name"])
    if len(file_ids) != len(set(file_ids)):
        raise SystemExit("duplicate fileId in " + b.prefab_name)
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


def write_prefab(builder):
    path = os.path.join(OUT_DIR, builder.prefab_name + ".prefab")
    meta_path = path + ".meta"
    os.makedirs(OUT_DIR, exist_ok=True)
    text = json.dumps(builder.objs, ensure_ascii=False, indent=2) + "\n"
    if ".png" in text or "resources/" in text or "USE_" in text:
        raise SystemExit("prefab embedded a file path or a load flag")
    with open(path, "w", encoding="utf-8", newline="\n") as handle:
        handle.write(text)
    prefab_uuid = str(uuid.uuid4())
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


def write_dir_meta():
    if os.path.exists(DIR_META):
        print("Keep", DIR_META)
        return
    meta = {
        "ver": "1.2.0",
        "importer": "directory",
        "imported": True,
        "uuid": str(uuid.uuid4()),
        "files": [],
        "subMetas": {},
        "userData": {},
    }
    with open(DIR_META, "w", encoding="utf-8", newline="\n") as handle:
        json.dump(meta, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print("Wrote", DIR_META)


def reject_png():
    for dirpath, _dirs, files in os.walk(OUT_DIR):
        for name in files:
            if name.lower().endswith(".png"):
                raise SystemExit("png under prefabs: " + os.path.join(dirpath, name))


def main():
    copy = load_copy()
    if copy["wire_preview"] != "这一包没有奖励清单。不写金币，不写强化石":
        raise SystemExit("wire preview drifted: " + copy["wire_preview"])
    if copy["wire_status"] != "时长只按 3004 的时间推。不按 Mock 的每分钟金币计算":
        raise SystemExit("wire status drifted: " + copy["wire_status"])
    if copy["item_name"] != "强化石":
        raise SystemExit("item name drifted: " + copy["item_name"])
    if copy["push"] != "推关到70（调试）":
        raise SystemExit("push drifted: " + copy["push"])
    wire = build_wire(copy)
    idle = build_idle(copy)
    write_dir_meta()
    write_prefab(wire)
    write_prefab(idle)
    reject_png()
    print("OK")
    print("WIRE", copy["wire_preview"])
    print("GOLD", copy["gold"])
    print("ITEM", copy["item"])
    print("CAP", copy["cap"])
    print("OWNED", copy["owned"])
    print("QUICK", copy["quick"])
    print("PUSH", copy["push"])


if __name__ == "__main__":
    main()
