# -*- coding: utf-8 -*-
"""Generate Creator 3.8.8 Mail prefabs (not wired).

Writes:
  client/assets/prefabs/ui/mail/WireMailPage.prefab
  client/assets/prefabs/ui/mail/MailPage.prefab
and their .meta files, plus ui/mail.meta if it is missing.

WireMailPage is the readonly real-server page (WireMailPage.ts / wireMail.ts).
MailPage is the Mock page (MailPage.ts / module/mail/inbox.ts). They do not share a root.

SpriteFrame uuids come from client/assets/resources/**/*.meta (@f9941).
Does not touch Boot, MainApp, page scripts, or USE_*_PREFAB flags.
No mail atlas: page chrome is common win-bg and button art.
"""
import hashlib
import json
import os
import re
import uuid
import base64

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "mail")
DIR_META = OUT_DIR + ".meta"
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

MAIL_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "MailPage.ts")
WIRE_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "WireMailPage.ts")
WIRE_PROTO = os.path.join(ROOT, "client", "assets", "scripts", "net", "protocol", "wireMail.ts")
INBOX_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "mail", "inbox.ts")
ITEMS_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "bag", "items.ts")
IDLE_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "idle", "rewards.ts")

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
VISIBLE_ROWS = 10
# Log sample title. formatWireMailLine appends the attachment word.
LOG_TITLE = "Hadiah Reservasi Peristiwa"
# Short Mock list: selected reward mail, then the read notice.
# detailAnchor for 2 rows is 178, so the card sits at (0, 162).
REWARD_BODY = "开服补给已送到。请领取金币、强化石和小金币袋。小金币袋可以在背包里使用。"
MOCK_ROWS = (
    {
        "title": "开服补给",
        "from": "系统",
        "unread": True,
        "has_attachment": True,
        "claimed": False,
        "selected": True,
        "body": REWARD_BODY,
    },
    {
        "title": "维护公告",
        "from": "系统",
        "unread": False,
        "has_attachment": False,
        "claimed": False,
        "selected": False,
        "body": "本周维护已结束。这是一封公告，没有附件，不能领取。",
    },
)


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


def attachment_label(state):
    """Same words as attachmentLabel in wireMail.ts."""
    if state == "yes":
        return "有附件"
    if state == "unknown":
        return "附件未解"
    return "无附件"


def format_wire_mail_line(title, mail_id, attachment):
    """Same concatenation as formatWireMailLine."""
    named = (title or "").strip()
    text = named
    if not text:
        text = ("无标题 · id %s" % mail_id) if mail_id is not None else "无标题"
    return text + " · " + attachment_label(attachment)


def mail_row_text(mail):
    """Same concatenation as mailRowText. The row label has no sender."""
    state = "未读" if mail["unread"] else "已读"
    extra = ""
    if mail["has_attachment"] and mail["claimed"]:
        extra = " · 已领取"
    elif mail["has_attachment"]:
        extra = " · 有附件"
    return state + " · " + (mail["title"] or "邮件") + extra


def mail_summary_text(total, unread, claimable):
    """Same concatenation as mailSummaryText."""
    if total <= 0:
        return "邮箱是空的"
    return "%d 封 · 未读 %d · 可领 %d" % (total, int(unread), int(claimable))


def claim_button_text(mail):
    """Same concatenation as claimButtonText."""
    if not mail:
        return "领取"
    if not mail["has_attachment"]:
        return "无附件"
    if mail["claimed"]:
        return "已领取"
    return "领取"


def claim_all_button_text(claimable):
    """Same concatenation as claimAllButtonText. Parentheses are fullwidth."""
    count = int(claimable)
    if count <= 0:
        return "全部领取"
    return "全部领取（%d）" % count


def attachment_name(item_id, idle_id, idle_name, gold_bag_id):
    """The three names this preview actually uses, matching attachmentName."""
    if item_id == 1:
        return "金币"
    if item_id == gold_bag_id:
        return "小金币袋"
    if item_id == idle_id:
        return idle_name
    raise SystemExit("preview attachment id is not gold, stone, or gold bag: %s" % item_id)


def attachment_text(parts, claimed):
    """Same concatenation as attachmentText when the mail has rows."""
    body = "、".join("%s ×%d" % (name, count) for name, count in parts)
    prefix = "附件已领取：" if claimed else "附件："
    return prefix + body


def detail_anchor(count):
    """MailPage.detailAnchor for a list of `count` rows."""
    step = 52
    top = 350
    last = top if count <= 0 else top - (count - 1) * step
    below = last - 120
    return -140 if below < -140 else below


def load_copy():
    """Pull the strings and coordinates the prefabs are standing in for."""
    require_snippet(WIRE_TS, "const VISIBLE_ROWS = 10;")
    require_snippet(WIRE_TS, "const PAGE_BG = new Color(8, 16, 32, 255);")
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_MAIL_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 470);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_MAIL_READONLY_NOTE, 22, { color: MUTED, width: 640 }), this.body, 0, 420);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_MAIL_STATUS_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 380);",
    )
    require_snippet(
        WIRE_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -460);',
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_MAIL_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 280);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_MAIL_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, 280);",
    )
    require_snippet(WIRE_TS, "320 - i * 44")
    require_snippet(WIRE_TS, 'align: "left"')
    require_snippet(WIRE_TS, "formatWireMailLine(entries[i]), 22")
    require_snippet(
        WIRE_TS,
        'createLabel("还有 " + (entries.length - visible) + " 封", 20, { color: MUTED, width: 640 })',
    )
    require_snippet(WIRE_TS, "320 - visible * 44")

    require_snippet(WIRE_PROTO, 'return title + " · " + attachmentLabel(entry.attachment);')
    require_snippet(WIRE_PROTO, 'title = entry.id !== null ? "无标题 · id " + entry.id : "无标题";')
    require_snippet(WIRE_PROTO, 'if (state === "yes") return "有附件";')
    require_snippet(WIRE_PROTO, 'if (state === "unknown") return "附件未解";')
    require_snippet(WIRE_PROTO, 'return "无附件";')
    require_snippet(WIRE_PROTO, "两例标题都是「Hadiah Reservasi Peristiwa」")

    require_snippet(MAIL_TS, "const PAGE_BG = new Color(8, 16, 32, 255);")
    require_snippet(MAIL_TS, "const BODY = new Color(214, 224, 236, 255);")
    require_snippet(MAIL_TS, "const LOCKED_FILL = new Color(78, 84, 98, 255);")
    require_snippet(MAIL_TS, "const CLAIM_FILL = new Color(36, 128, 96, 255);")
    require_snippet(MAIL_TS, 'place(createLabel("邮件", 40, { color: TITLE }), this.body, 0, 470);')
    require_snippet(
        MAIL_TS,
        'createLabel("读取邮件…", 20, { color: MUTED, width: 640 }),\n      this.body,\n      0,\n      418',
    )
    require_snippet(
        MAIL_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -430);',
    )
    require_snippet(MAIL_TS, "const top = 350;")
    require_snippet(MAIL_TS, "const step = 52;")
    require_snippet(MAIL_TS, '(selected ? "已选 " : "") + mailRowText(mail)')
    require_snippet(MAIL_TS, "selected ? SELECT_FILL : ROW_FILL,\n          20")
    require_snippet(
        MAIL_TS,
        'place(createRect("card", 640, 168, new Color(16, 28, 48, 255)), detail, 0, anchor - 16);',
    )
    require_snippet(MAIL_TS, 'createLabel(mail.from + " · " + mail.title, 22, { color: TITLE, width: 600 })')
    require_snippet(MAIL_TS, "anchor + 36")
    require_snippet(
        MAIL_TS,
        'createLabel(mail.body, 18, { color: BODY, width: 600, height: 64, align: "left" })',
    )
    require_snippet(MAIL_TS, "anchor - 8")
    require_snippet(MAIL_TS, "createLabel(attachmentText(mail), 18, { color: MUTED, width: 600, height: 40 })")
    require_snippet(MAIL_TS, "anchor - 70")
    require_snippet(MAIL_TS, "claimButtonText(mail)")
    require_snippet(MAIL_TS, "280,\n          52,\n          canClaim ? CLAIM_FILL : LOCKED_FILL")
    require_snippet(MAIL_TS, "-160,\n        anchor - 168")
    require_snippet(MAIL_TS, "claimAllButtonText(claimable)")
    require_snippet(MAIL_TS, "160,\n        anchor - 168")
    require_snippet(
        MAIL_TS,
        'createButton("删除", () => void this.removeSelected(), 280, 48, canDelete ? DELETE_FILL : LOCKED_FILL)',
    )
    require_snippet(MAIL_TS, "-160,\n        anchor - 232")
    require_snippet(MAIL_TS, "const below = last - 120;")
    require_snippet(MAIL_TS, "return below < -140 ? -140 : below;")

    require_snippet(
        INBOX_TS,
        'return total + " 封 · 未读 " + finiteInt(unread) + " · 可领 " + finiteInt(claimable);',
    )
    require_snippet(INBOX_TS, 'const state = mail.unread ? "未读" : "已读";')
    require_snippet(INBOX_TS, 'else if (mail.hasAttachment) extra = " · 有附件";')
    require_snippet(INBOX_TS, 'if (mail.hasAttachment && mail.claimed) extra = " · 已领取";')
    require_snippet(INBOX_TS, 'return state + " · " + (mail.title || "邮件") + extra;')
    require_snippet(INBOX_TS, 'return (mail.claimed ? "附件已领取：" : "附件：") + body;')
    require_snippet(INBOX_TS, 'if (!mail) return "领取";')
    require_snippet(INBOX_TS, 'if (!mail.hasAttachment) return "无附件";')
    require_snippet(INBOX_TS, 'if (mail.claimed) return "已领取";')
    require_snippet(INBOX_TS, 'return "领取";')
    require_snippet(INBOX_TS, 'return "全部领取（" + count + "）";')
    require_snippet(INBOX_TS, 'if (count <= 0) return "全部领取";')
    require_snippet(INBOX_TS, 'title: "开服补给"')
    require_snippet(INBOX_TS, 'title: "维护公告"')
    require_snippet(INBOX_TS, 'from: "系统"')
    require_snippet(INBOX_TS, 'body: "' + REWARD_BODY + '"')
    require_snippet(INBOX_TS, "{ id: 1, count: MAIL_REWARD_GOLD }")
    require_snippet(INBOX_TS, "{ id: IDLE_ITEM_ID, count: MAIL_REWARD_STONE }")
    require_snippet(INBOX_TS, "{ id: ITEM_GOLD_BAG, count: MAIL_REWARD_GOLD_BAG }")
    require_snippet(INBOX_TS, 'if (id === 1) return "金币";')
    require_snippet(INBOX_TS, 'if (id === ITEM_GOLD_BAG) return "小金币袋";')
    require_snippet(INBOX_TS, "if (id === IDLE_ITEM_ID) return IDLE_ITEM_NAME;")
    require_snippet(
        INBOX_TS,
        "unread: boolean;\n  title: string;\n  hasAttachment: boolean;\n  claimed: boolean;",
    )

    if ts_int(WIRE_TS, "VISIBLE_ROWS") != VISIBLE_ROWS:
        raise SystemExit("VISIBLE_ROWS drifted")
    if ts_int(INBOX_TS, "MAIL_REWARD_GOLD") != 80:
        raise SystemExit("MAIL_REWARD_GOLD drifted")
    if ts_int(INBOX_TS, "MAIL_REWARD_STONE") != 3:
        raise SystemExit("MAIL_REWARD_STONE drifted")
    if ts_int(INBOX_TS, "MAIL_REWARD_GOLD_BAG") != 1:
        raise SystemExit("MAIL_REWARD_GOLD_BAG drifted")
    if ts_int(ITEMS_TS, "ITEM_GOLD_BAG") != 201:
        raise SystemExit("ITEM_GOLD_BAG drifted")
    if ts_int(IDLE_TS, "IDLE_ITEM_ID") != 101:
        raise SystemExit("IDLE_ITEM_ID drifted")
    if ts_string(IDLE_TS, "IDLE_ITEM_NAME") != "强化石":
        raise SystemExit("stone name drifted")

    sample = format_wire_mail_line(LOG_TITLE, None, "yes")
    if sample != "Hadiah Reservasi Peristiwa · 有附件":
        raise SystemExit("wire line format drifted: " + sample)
    untitled_id = format_wire_mail_line("", 10000000001, "yes")
    if untitled_id != "无标题 · id 10000000001 · 有附件":
        raise SystemExit("untitled id line drifted: " + untitled_id)
    untitled = format_wire_mail_line("", None, "no")
    if untitled != "无标题 · 无附件":
        raise SystemExit("untitled line drifted: " + untitled)
    if format_wire_mail_line(LOG_TITLE, None, "unknown") != "Hadiah Reservasi Peristiwa · 附件未解":
        raise SystemExit("unknown attachment line drifted")
    if format_wire_mail_line(LOG_TITLE, None, "no") != "Hadiah Reservasi Peristiwa · 无附件":
        raise SystemExit("no attachment line drifted")

    anchor = detail_anchor(len(MOCK_ROWS))
    if anchor != 178:
        raise SystemExit("sample list no longer parks the detail card at y=162")

    selected = MOCK_ROWS[0]
    unread = len([row for row in MOCK_ROWS if row["unread"]])
    claimable = len([row for row in MOCK_ROWS if row["has_attachment"] and not row["claimed"]])
    summary = mail_summary_text(len(MOCK_ROWS), unread, claimable)
    if summary != "2 封 · 未读 1 · 可领 1":
        raise SystemExit("summary drifted: " + summary)

    row_labels = []
    for row in MOCK_ROWS:
        label = ("已选 " if row["selected"] else "") + mail_row_text(row)
        if row["from"] and row["from"] in label:
            raise SystemExit("row label picked up the sender: " + label)
        row_labels.append(label)
    if row_labels[0] != "已选 未读 · 开服补给 · 有附件":
        raise SystemExit("selected row drifted: " + row_labels[0])
    if row_labels[1] != "已读 · 维护公告":
        raise SystemExit("notice row drifted: " + row_labels[1])

    gold = ts_int(INBOX_TS, "MAIL_REWARD_GOLD")
    stone = ts_int(INBOX_TS, "MAIL_REWARD_STONE")
    bags = ts_int(INBOX_TS, "MAIL_REWARD_GOLD_BAG")
    idle_id = ts_int(IDLE_TS, "IDLE_ITEM_ID")
    idle_name = ts_string(IDLE_TS, "IDLE_ITEM_NAME")
    gold_bag_id = ts_int(ITEMS_TS, "ITEM_GOLD_BAG")
    parts = (
        (attachment_name(1, idle_id, idle_name, gold_bag_id), gold),
        (attachment_name(idle_id, idle_id, idle_name, gold_bag_id), stone),
        (attachment_name(gold_bag_id, idle_id, idle_name, gold_bag_id), bags),
    )
    attach = attachment_text(parts, selected["claimed"])
    if attach != "附件：金币 ×80、强化石 ×3、小金币袋 ×1":
        raise SystemExit("attachment line drifted: " + attach)

    from_title = selected["from"] + " · " + selected["title"]
    if from_title != "系统 · 开服补给":
        raise SystemExit("from title drifted: " + from_title)
    if claim_button_text(selected) != "领取":
        raise SystemExit("claim button drifted")
    claim_all = claim_all_button_text(claimable)
    if claim_all != "全部领取（1）":
        raise SystemExit("claim all drifted: " + claim_all)

    return {
        "wire_title": ts_string(WIRE_PROTO, "WIRE_MAIL_READONLY_TITLE"),
        "wire_note": ts_string(WIRE_PROTO, "WIRE_MAIL_READONLY_NOTE"),
        "wire_status": ts_string(WIRE_PROTO, "WIRE_MAIL_STATUS_NOTE"),
        "wire_empty": ts_string(WIRE_PROTO, "WIRE_MAIL_EMPTY"),
        "wire_unsynced": ts_string(WIRE_PROTO, "WIRE_MAIL_UNSYNCED_TOAST"),
        "wire_rows": [sample for _ in range(VISIBLE_ROWS)],
        "wire_more": "还有 3 封",
        "mock_summary": summary,
        "mock_rows": row_labels,
        "from_title": from_title,
        "body": selected["body"],
        "attach": attach,
        "claim": claim_button_text(selected),
        "claim_all": claim_all,
        "anchor": anchor,
    }


SF = {key: load_sprite_frame(rel) for key, rel in SPRITE_FILES.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE_COLOR = color(255, 228, 170, 255)
MUTED = color(190, 205, 225, 255)
BODY = color(214, 224, 236, 255)
PAGE_BG = color(8, 16, 32, 255)
CARD_BG = color(16, 28, 48, 255)
LOCKED_FILL = color(78, 84, 98, 255)


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
    b = Builder("WireMailPage")
    root = b.make_node("WireMailPage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    # Deep-blue page fill. The code paints a rect; the prefab tints common win-bg.
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", root, 0, 470, title_w, title_h, copy["wire_title"], 40, TITLE_COLOR, outline=True)
    note_w, note_h = label_box(22, 640)
    b.make_label_node("Note", root, 0, 420, note_w, note_h, copy["wire_note"], 22, MUTED)
    status_w, status_h = label_box(20, 640)
    b.make_label_node("Status", root, 0, 380, status_w, status_h, copy["wire_status"], 20, MUTED)

    # Hosts sit at the page origin so child y matches place() on the code page.
    # Runtime render() destroys and rebuilds the rows node; these children are a preview.
    list_host = b.make_node("ListHost", root, 0, 0, PAGE_W, PAGE_H)
    rows = b.make_node("Rows", list_host, 0, 0, PAGE_W, PAGE_H)
    state_w, state_h = label_box(28, 640)
    b.make_label_node(
        "Empty", rows, 0, 280, state_w, state_h, copy["wire_empty"], 28, TITLE_COLOR, active=False,
    )
    b.make_label_node(
        "Unsynced", rows, 0, 280, state_w, state_h, copy["wire_unsynced"], 28, TITLE_COLOR, active=True,
    )
    row_w, row_h = label_box(22, 640)
    for i, text in enumerate(copy["wire_rows"]):
        b.make_label_node(
            "Row_%d" % i, rows, 0, 320 - i * 44, row_w, row_h, text, 22, TITLE_COLOR,
            h_align=0, active=False,
        )
    more_w, more_h = label_box(20, 640)
    b.make_label_node(
        "More", rows, 0, 320 - VISIBLE_ROWS * 44, more_w, more_h, copy["wire_more"], 20, MUTED, active=False,
    )
    b.make_button(
        "BtnBack", root, 0, -460, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_wire(b, copy)
    return b


def build_mail(copy):
    b = Builder("MailPage")
    root = b.make_node("MailPage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", root, 0, 470, title_w, title_h, "邮件", 40, TITLE_COLOR, outline=True)
    summary_w, summary_h = label_box(20, 640)
    b.make_label_node("Summary", root, 0, 418, summary_w, summary_h, copy["mock_summary"], 20, MUTED)

    rows_host = b.make_node("RowsHost", root, 0, 0, PAGE_W, PAGE_H)
    rows = b.make_node("Rows", rows_host, 0, 0, PAGE_W, PAGE_H)
    for i, text in enumerate(copy["mock_rows"]):
        selected = MOCK_ROWS[i]["selected"]
        bg = SF["btn_orange"] if selected else SF["btn_blue"]
        pressed = SF["btn_orange_p"] if selected else SF["btn_blue_p"]
        b.make_button(
            "Row_%d" % i, rows, 0, 350 - i * 52, 640, 46, text, 20, bg, pressed,
        )

    anchor = copy["anchor"]
    detail_host = b.make_node("DetailHost", root, 0, 0, PAGE_W, PAGE_H)
    detail = b.make_node("Detail", detail_host, 0, 0, PAGE_W, PAGE_H)
    b.make_sprite_node("Card", detail, 0, anchor - 16, 640, 168, SF["block"], col=CARD_BG)
    from_w, from_h = label_box(22, 600)
    b.make_label_node(
        "FromTitle", detail, 0, anchor + 36, from_w, from_h, copy["from_title"], 22, TITLE_COLOR,
    )
    b.make_label_node(
        "Body", detail, 0, anchor - 8, 600, 64, copy["body"], 18, BODY,
        h_align=0, v_align=0, wrap=True,
    )
    b.make_label_node(
        "Attach", detail, 0, anchor - 70, 600, 40, copy["attach"], 18, MUTED,
        v_align=0, wrap=True,
    )
    b.make_button(
        "BtnClaim", detail, -160, anchor - 168, 280, 52, copy["claim"], 24,
        SF["btn_green"], SF["btn_green_p"],
    )
    b.make_button(
        "BtnClaimAll", detail, 160, anchor - 168, 280, 52, copy["claim_all"], 24,
        SF["btn_green"], SF["btn_green_p"],
    )
    # Attachment is still unclaimed, so delete uses the locked gray (LOCKED_FILL)
    # on the blue button, with grayscale so the preview reads as locked.
    b.make_button(
        "BtnDelete", detail, -160, anchor - 232, 280, 48, "删除", 24,
        SF["btn_blue"], SF["btn_blue_p"], grayscale=True, col=LOCKED_FILL,
    )
    b.make_button(
        "BtnBack", root, 0, -430, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_mail(b, copy)
    return b


def check_wire(b, copy):
    b.expect("WireMailPage", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireMailPage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint("WireMailPage/Bg", PAGE_BG)
    b.expect_sprite("WireMailPage/Bg", SF["win_bg"])
    b.expect("WireMailPage/Title", 0, 470, 680, 56, copy["wire_title"])
    b.expect("WireMailPage/Note", 0, 420, 640, 38, copy["wire_note"])
    b.expect("WireMailPage/Status", 0, 380, 640, 36, copy["wire_status"])
    b.expect("WireMailPage/ListHost", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireMailPage/ListHost/Rows", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireMailPage/ListHost/Rows/Empty", 0, 280, 640, 44, copy["wire_empty"], active=False)
    b.expect(
        "WireMailPage/ListHost/Rows/Unsynced", 0, 280, 640, 44, copy["wire_unsynced"], active=True,
    )
    for i, text in enumerate(copy["wire_rows"]):
        path = "WireMailPage/ListHost/Rows/Row_%d" % i
        b.expect(path, 0, 320 - i * 44, 640, 38, text, active=False)
        b.expect_align(path, 0, 1)
    b.expect(
        "WireMailPage/ListHost/Rows/More",
        0, 320 - VISIBLE_ROWS * 44, 640, 36, copy["wire_more"], active=False,
    )
    b.expect("WireMailPage/BtnBack", 0, -460, 240, 48, "返回")
    b.expect_sprite("WireMailPage/BtnBack", SF["btn_blue"])
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in ("PanelList", "Top", "Bottom", "RowsHost", "DetailHost", "BtnClaim", "Summary"):
        if banned in names:
            raise SystemExit("wire page picked up " + banned)
    check_common(b)


def check_mail(b, copy):
    anchor = copy["anchor"]
    b.expect("MailPage", 0, 0, PAGE_W, PAGE_H)
    b.expect("MailPage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint("MailPage/Bg", PAGE_BG)
    b.expect_sprite("MailPage/Bg", SF["win_bg"])
    b.expect("MailPage/Title", 0, 470, 680, 56, "邮件")
    b.expect("MailPage/Summary", 0, 418, 640, 36, copy["mock_summary"])
    b.expect("MailPage/RowsHost", 0, 0, PAGE_W, PAGE_H)
    b.expect("MailPage/RowsHost/Rows", 0, 0, PAGE_W, PAGE_H)
    for i, text in enumerate(copy["mock_rows"]):
        path = "MailPage/RowsHost/Rows/Row_%d" % i
        b.expect(path, 0, 350 - i * 52, 640, 46, text, active=True)
        if MOCK_ROWS[i]["selected"]:
            b.expect_sprite(path, SF["btn_orange"])
        else:
            b.expect_sprite(path, SF["btn_blue"])
        b.expect_grayscale(path, False)
    b.expect("MailPage/DetailHost", 0, 0, PAGE_W, PAGE_H)
    b.expect("MailPage/DetailHost/Detail", 0, 0, PAGE_W, PAGE_H)
    b.expect("MailPage/DetailHost/Detail/Card", 0, anchor - 16, 640, 168)
    b.expect_tint("MailPage/DetailHost/Detail/Card", CARD_BG)
    b.expect_sprite("MailPage/DetailHost/Detail/Card", SF["block"])
    b.expect("MailPage/DetailHost/Detail/FromTitle", 0, anchor + 36, 600, 38, copy["from_title"])
    b.expect("MailPage/DetailHost/Detail/Body", 0, anchor - 8, 600, 64, copy["body"])
    b.expect_align("MailPage/DetailHost/Detail/Body", 0, 0)
    b.expect("MailPage/DetailHost/Detail/Attach", 0, anchor - 70, 600, 40, copy["attach"])
    b.expect_align("MailPage/DetailHost/Detail/Attach", 1, 0)
    b.expect("MailPage/DetailHost/Detail/BtnClaim", -160, anchor - 168, 280, 52, copy["claim"])
    b.expect_sprite("MailPage/DetailHost/Detail/BtnClaim", SF["btn_green"])
    b.expect_grayscale("MailPage/DetailHost/Detail/BtnClaim", False)
    b.expect("MailPage/DetailHost/Detail/BtnClaimAll", 160, anchor - 168, 280, 52, copy["claim_all"])
    b.expect_sprite("MailPage/DetailHost/Detail/BtnClaimAll", SF["btn_green"])
    b.expect("MailPage/DetailHost/Detail/BtnDelete", -160, anchor - 232, 280, 48, "删除")
    b.expect_sprite("MailPage/DetailHost/Detail/BtnDelete", SF["btn_blue"])
    b.expect_tint("MailPage/DetailHost/Detail/BtnDelete", LOCKED_FILL)
    b.expect_grayscale("MailPage/DetailHost/Detail/BtnDelete", True)
    b.expect("MailPage/BtnBack", 0, -430, 240, 48, "返回")
    b.expect_sprite("MailPage/BtnBack", SF["btn_blue"])
    if anchor != 178:
        raise SystemExit("detail anchor is not 178")
    if anchor - 16 != 162 or anchor + 36 != 214 or anchor - 8 != 170:
        raise SystemExit("detail block is not on the short-list anchor")
    if anchor - 70 != 108 or anchor - 168 != 10 or anchor - 232 != -54:
        raise SystemExit("detail controls drifted off the short-list anchor")
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in ("ListHost", "Unsynced", "Empty", "More", "Status", "Top", "Bottom"):
        if banned in names:
            raise SystemExit("mock page picked up " + banned)
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


def main():
    copy = load_copy()
    if copy["wire_title"] != "邮件（真服只读）":
        raise SystemExit("wire title drifted: " + copy["wire_title"])
    if copy["wire_note"] != "只读。不领取，不删除，不写金币":
        raise SystemExit("wire note drifted: " + copy["wire_note"])
    if copy["wire_status"] != "已读未读未解。字段 3、字段 4 只记日志":
        raise SystemExit("wire status drifted: " + copy["wire_status"])
    if copy["wire_empty"] != "空邮箱":
        raise SystemExit("wire empty drifted: " + copy["wire_empty"])
    if copy["wire_unsynced"] != "真服邮件未同步":
        raise SystemExit("wire unsynced drifted: " + copy["wire_unsynced"])
    if len(copy["wire_rows"]) != VISIBLE_ROWS:
        raise SystemExit("wire row count drifted")
    wire = build_wire(copy)
    mail = build_mail(copy)
    write_dir_meta()
    write_prefab(wire)
    write_prefab(mail)
    print("OK")
    print("SUMMARY", copy["mock_summary"])
    print("ROWS", " | ".join(copy["mock_rows"]))
    print("DETAIL", copy["from_title"], copy["attach"], "anchor", copy["anchor"])
    print("WIRE_ROW", copy["wire_rows"][0])


if __name__ == "__main__":
    main()
