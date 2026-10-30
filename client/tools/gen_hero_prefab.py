# -*- coding: utf-8 -*-
"""Generate Creator 3.8.8 Hero prefabs (not wired).

Writes:
  client/assets/prefabs/ui/hero/WireHeroPage.prefab
  client/assets/prefabs/ui/hero/HeroPage.prefab
and their .meta files, plus ui/hero.meta if it is missing.

WireHeroPage is a readonly real-server preview. Sample text follows
wireHero.ts for s2c 4001 / GResHeroList: formatWireHeroLine on the list and
formatWireHeroDetail on the detail (Chinese labels, including stage, elem,
occupation, and is_lock). No name field. Status is WIRE_HERO_FIELD_NOTE.

Title, note, status, empty, and unsynced are read from wireHero.ts when that
file is the 4001 decoder. The 18001 name / 字段号 note is not used.

HeroPage is the Mock page (HeroPage.ts list + detail). Upgrade button is
present and unwired.

SpriteFrame uuids come from client/assets/resources/**/*.meta (@f9941).
Does not touch Boot, MainApp, page scripts, protocol, or USE_*_PREFAB flags.
Same art as bag/mail: win-bg and the big blue / orange / green buttons.
"""
import hashlib
import json
import os
import re
import uuid
import base64

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RES = os.path.join(ROOT, "client", "assets", "resources")
OUT_DIR = os.path.join(ROOT, "client", "assets", "prefabs", "ui", "hero")
DIR_META = OUT_DIR + ".meta"
FONT_META = os.path.join(RES, "font", "FZCSJW-GB1-0.ttf.meta")

HERO_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "HeroPage.ts")
WIRE_TS = os.path.join(ROOT, "client", "assets", "scripts", "ui", "WireHeroPage.ts")
WIRE_PROTO = os.path.join(ROOT, "client", "assets", "scripts", "net", "protocol", "wireHero.ts")
GROWTH_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "hero", "growth.ts")
FORGE_TS = os.path.join(ROOT, "client", "assets", "scripts", "module", "smith", "forge.ts")
SESSION_TS = os.path.join(ROOT, "client", "assets", "scripts", "net", "MockGameSession.ts")

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
VISIBLE_ROWS = 8

# Preview entry. List text is formatWireHeroLine (type, id, level, star, fighting).
# Detail also shows stage, elem, occupation, and is_lock. No CHeroType note is loaded,
# so the type label stays "类型 N".
SAMPLE_HERO = {
    "hero_id": 10001,
    "hero_type": 101,
    "level": 1,
    "stage": 2,
    "star": 3,
    "elem": 1,
    "occupation": 2,
    "is_lock": 0,
    "fighting": 1200,
}

# Fallback chrome if wireHero.ts is not the 4001 file yet. Status matches the merged note.
SPEC_WIRE = {
    "title": "英雄（真服只读）",
    "note": "只读。不升级，不写金币",
    "status": "没有名字。类型对不上就写类型号",
    "empty": "空名册",
    "unsynced": "真服英雄未同步",
}

# Phrases that belong to #50's 18001 page.
# "无名字字段" is the 4001 status and must stay. Bare "无名" is the 18001 fallback.
BANNED_18001 = (
    "名字 ",
    "名字未解",
    "字段10",
    "字段3 ",
    "字段6 ",
    "字段7 ",
    "字段9 ",
    "字段11 ",
    "等级星级未解",
    "只展示解开的字段号",
    "18001",
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


def banned_18001(text):
    for phrase in BANNED_18001:
        if phrase in text:
            return phrase
    # "无名字" is allowed. The 18001 row fallback is the bare word 无名.
    if re.search(u"无名(?!字)", text):
        return "无名"
    return None


def protocol_is_gres_4001(proto):
    """True when wireHero.ts has left s2c 18001 for 4001 / GResHeroList."""
    if "wire.18001" in proto or "s2c 18001" in proto:
        return False
    if "4001" not in proto:
        return False
    return "GResHeroList" in proto or "hero_type" in proto


def wire_type_label(hero_type):
    """wireHeroTypeLabel with an empty CHeroType note map."""
    if hero_type is None:
        return "类型未解"
    return "类型 %d" % hero_type


def format_wire_row(sample):
    """Same concatenation as formatWireHeroLine. Stage and lock stay off the row."""
    text = wire_type_label(sample.get("hero_type"))
    hero_id = sample.get("hero_id")
    level = sample.get("level")
    star = sample.get("star")
    fighting = sample.get("fighting")
    if hero_id is not None:
        text += " · id %d" % hero_id
    if level is not None:
        text += " · Lv%d" % level
    if star is not None:
        text += " · %d星" % star
    if fighting is not None:
        text += " · 战力 %d" % fighting
    return text


def format_wire_detail(sample):
    """Same lines as formatWireHeroDetail. Chinese labels, not raw proto keys."""
    lines = []
    hero_type = sample.get("hero_type")
    if hero_type is None:
        lines.append("类型未解")
    else:
        label = wire_type_label(hero_type)
        type_number = "类型 %d" % hero_type
        lines.append(label if label == type_number else "%s · %s" % (label, type_number))
    hero_id = sample.get("hero_id")
    lines.append(("id %d" % hero_id) if hero_id is not None else "id 未解")
    for label, key in (
        ("等级", "level"),
        ("阶段", "stage"),
        ("星级", "star"),
        ("元素", "elem"),
        ("职业", "occupation"),
        ("锁定", "is_lock"),
        ("战力", "fighting"),
    ):
        value = sample.get(key)
        if value is None:
            continue
        lines.append("%s %d" % (label, value))
    return lines


def hero_stats(level, star):
    """Same arithmetic as heroStats. Callers pass already-clamped starter values."""
    return {
        "atk": 40 + (level - 1) * 12 + (star - 1) * 15,
        "hp": 200 + (level - 1) * 80 + (star - 1) * 60,
        "def": 10 + (level - 1) * 4 + (star - 1) * 5,
    }


def upgrade_cost(level, max_level):
    if level >= max_level:
        return 0
    return 30 + (level - 1) * 20


def weapon_atk_bonus(weapon_level, step):
    level = weapon_level if isinstance(weapon_level, int) and weapon_level >= 1 else 1
    return (level - 1) * step


def hero_row_label(name, level, star, weapon_level):
    """heroRowText plus the list suffix in HeroListController.render."""
    return "%s  Lv%d · %d星 · 武器Lv%d" % (name, level, star, weapon_level or 1)


def hero_level_label(level, star):
    return "Lv%d · %d星" % (level, star)


def upgrade_button_label(level, max_level):
    if level >= max_level:
        return "已满级"
    return "升级（金币 %d）" % upgrade_cost(level, max_level)


def owned_gold_label(gold):
    return "持有金币 %d" % gold


def weapon_line_label(name, level, bonus):
    return "武器 %s Lv%d · 攻击 +%d" % (name, level, bonus)


def parse_starters(text):
    body = re.search(r"export function starterRoster\(\)[\s\S]*?return \[([\s\S]*?)\];", text)
    if not body:
        raise SystemExit("starterRoster() missing from growth.ts")
    rows = re.findall(
        r'\{\s*id:\s*(\d+),\s*name:\s*"([^"]+)",\s*level:\s*(\d+),\s*star:\s*(\d+),\s*weaponLevel:\s*(\d+)\s*\}',
        body.group(1),
    )
    if len(rows) < 3:
        raise SystemExit("starterRoster did not yield 3 heroes")
    parsed = []
    for hero_id, name, level, star, weapon in rows:
        parsed.append({
            "id": int(hero_id),
            "name": name,
            "level": int(level),
            "star": int(star),
            "weaponLevel": int(weapon),
        })
    return parsed


def load_wire_strings():
    proto = read_text(WIRE_PROTO)
    title = ts_string(WIRE_PROTO, "WIRE_HERO_READONLY_TITLE")
    note = ts_string(WIRE_PROTO, "WIRE_HERO_READONLY_NOTE")
    empty = ts_string(WIRE_PROTO, "WIRE_HERO_EMPTY")
    unsynced = ts_string(WIRE_PROTO, "WIRE_HERO_UNSYNCED_TOAST")
    field_note = ts_string(WIRE_PROTO, "WIRE_HERO_FIELD_NOTE")
    if protocol_is_gres_4001(proto):
        strings = {
            "title": title,
            "note": note,
            "status": field_note,
            "empty": empty,
            "unsynced": unsynced,
        }
        for key, value in strings.items():
            hit = banned_18001(value)
            if hit:
                raise SystemExit("4001 wireHero.ts %s still has 18001 copy %r" % (key, hit))
        return strings
    # File is still 18001. Keep the spec. Do not copy WIRE_HERO_FIELD_NOTE.
    for key, got in (
        ("title", title),
        ("note", note),
        ("empty", empty),
        ("unsynced", unsynced),
    ):
        if got != SPEC_WIRE[key]:
            raise SystemExit(
                "wireHero.ts %s is %r while the file is still 18001; spec constant is %r"
                % (key, got, SPEC_WIRE[key])
            )
    hit = banned_18001(field_note)
    if not hit:
        raise SystemExit("expected the 18001 field note to stay out of the prefab, got %r" % field_note)
    if field_note == SPEC_WIRE["status"]:
        raise SystemExit("field note unexpectedly matches the 4001 status")
    strings = dict(SPEC_WIRE)
    hit = banned_18001(strings["status"])
    if hit:
        raise SystemExit("spec status contains banned copy %r" % hit)
    return strings


def load_copy():
    """Pull coordinates from the page scripts. Wire sample text stays on 4001."""
    require_snippet(WIRE_TS, "const VISIBLE_ROWS = 8;")
    require_snippet(WIRE_TS, "const PAGE_BG = new Color(8, 16, 32, 255);")
    require_snippet(WIRE_TS, "const ROW_FILL = new Color(28, 48, 84, 255);")
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_HERO_READONLY_TITLE, 40, { color: TITLE }), this.body, 0, 470);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_HERO_READONLY_NOTE, 22, { color: MUTED, width: 640 }), this.body, 0, 420);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_HERO_FIELD_NOTE, 20, { color: MUTED, width: 640 }), this.body, 0, 380);",
    )
    require_snippet(WIRE_PROTO, 'export const WIRE_HERO_FIELD_NOTE = "没有名字。类型对不上就写类型号";')
    require_snippet(WIRE_PROTO, "let text = wireHeroTypeLabel(entry.heroType);")
    require_snippet(WIRE_PROTO, 'if (entry.heroId !== null) text += " · id " + entry.heroId;')
    require_snippet(WIRE_PROTO, 'if (entry.level !== null) text += " · Lv" + entry.level;')
    require_snippet(WIRE_PROTO, 'if (entry.star !== null) text += " · " + entry.star + "星";')
    require_snippet(WIRE_PROTO, 'if (entry.fighting !== null) text += " · 战力 " + entry.fighting;')
    require_snippet(WIRE_PROTO, 'return "类型 " + heroType;')
    require_snippet(
        WIRE_PROTO,
        'lines.push(label === "类型 " + entry.heroType ? label : label + " · 类型 " + entry.heroType);',
    )
    require_snippet(WIRE_PROTO, 'lines.push(entry.heroId !== null ? "id " + entry.heroId : "id 未解");')
    require_snippet(WIRE_PROTO, 'pushNamed(lines, "等级", entry.level);')
    require_snippet(WIRE_PROTO, 'pushNamed(lines, "阶段", entry.stage);')
    require_snippet(WIRE_PROTO, 'pushNamed(lines, "星级", entry.star);')
    require_snippet(WIRE_PROTO, 'pushNamed(lines, "元素", entry.elem);')
    require_snippet(WIRE_PROTO, 'pushNamed(lines, "职业", entry.occupation);')
    require_snippet(WIRE_PROTO, 'pushNamed(lines, "锁定", entry.isLock);')
    require_snippet(WIRE_PROTO, 'pushNamed(lines, "战力", entry.fighting);')
    require_snippet(
        WIRE_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -460);',
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_HERO_UNSYNCED_TOAST, 28, { color: TITLE, width: 640 }), rows, 0, 280);",
    )
    require_snippet(
        WIRE_TS,
        "place(createLabel(WIRE_HERO_EMPTY, 28, { color: TITLE, width: 640 }), rows, 0, 280);",
    )
    require_snippet(WIRE_TS, "300 - i * 52")
    require_snippet(WIRE_TS, "640,\n          44,\n          ROW_FILL,\n          20")
    require_snippet(WIRE_TS, '"还有 " + (heroes.length - visible) + " 名"')
    require_snippet(WIRE_TS, "300 - visible * 52")
    require_snippet(WIRE_TS, 'createLabel(lines[i], 24, { color: TITLE, width: 640, align: "left" })')
    require_snippet(WIRE_TS, "300 - i * 40")
    require_snippet(
        WIRE_TS,
        'place(createButton("返回列表", () => this.closeDetail(), 240, 48, ROW_FILL), rows, 0, 300 - lines.length * 40 - 24);',
    )

    require_snippet(HERO_TS, "const PAGE_BG = new Color(8, 16, 32, 255);")
    require_snippet(HERO_TS, "const STAT = new Color(255, 214, 120, 255);")
    require_snippet(HERO_TS, "const ROW_FILL = new Color(36, 72, 120, 255);")
    require_snippet(HERO_TS, "const UPGRADE_FILL = new Color(168, 116, 42, 255);")
    require_snippet(HERO_TS, 'place(createLabel("英雄", 40, { color: TITLE }), this.body, 0, 470);')
    require_snippet(
        HERO_TS,
        'createLabel("读取英雄…", 20, { color: MUTED, width: 640 }), this.body, 0, 410',
    )
    require_snippet(
        HERO_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -420);',
    )
    require_snippet(HERO_TS, "const top = 300;")
    require_snippet(HERO_TS, "const step = 100;")
    require_snippet(
        HERO_TS,
        'heroRowText(hero.name, hero.level, hero.star) + " · 武器Lv" + (hero.weaponLevel || 1)',
    )
    require_snippet(HERO_TS, "600,\n        76,\n        ROW_FILL,\n        24")
    require_snippet(HERO_TS, "place(button, rows, 0, top - i * step);")
    require_snippet(HERO_TS, 'count + " 名英雄 · 点名字查看详情"')
    require_snippet(HERO_TS, 'place(createLabel("英雄详情", 40, { color: TITLE }), this.body, 0, 470);')
    require_snippet(
        HERO_TS,
        'createLabel("读取中…", 36, { color: TITLE, width: 640 }), this.body, 0, 390',
    )
    require_snippet(
        HERO_TS,
        'createLabel("", 24, { color: MUTED, width: 640 }), this.body, 0, 330',
    )
    require_snippet(HERO_TS, 'place(createRect("card", 640, 220, new Color(16, 28, 48, 255)), this.body, 0, 170);')
    require_snippet(HERO_TS, 'createLabel("攻击 --", 26, { color: STAT, width: 560 }), this.body, 0, 230')
    require_snippet(HERO_TS, 'createLabel("生命 --", 26, { color: STAT, width: 560 }), this.body, 0, 170')
    require_snippet(HERO_TS, 'createLabel("防御 --", 26, { color: STAT, width: 560 }), this.body, 0, 120')
    require_snippet(HERO_TS, 'createLabel("武器 --", 22, { color: STAT, width: 560 }), this.body, 0, 70')
    require_snippet(HERO_TS, 'createLabel("持有金币 --", 22, { color: MUTED, width: 640 }), this.body, 0, 0')
    require_snippet(HERO_TS, 'createButton("升级", () => void this.upgrade(), 460, 68, UPGRADE_FILL)')
    require_snippet(HERO_TS, "-80")
    require_snippet(
        HERO_TS,
        'createLabel("属性为占位。升级不改武器，武器到铁匠铺强化", 18, { color: MUTED, width: 640 })',
    )
    require_snippet(HERO_TS, "-160")
    require_snippet(
        HERO_TS,
        'place(createButton("返回", () => this.host.close(), 240, 48, BACK_FILL), this.body, 0, -250);',
    )
    require_snippet(HERO_TS, "heroLevelText(hero.level, hero.star)")
    require_snippet(HERO_TS, 'this.write(this.atkLabel, "攻击 " + hero.atk);')
    require_snippet(HERO_TS, 'this.write(this.hpLabel, "生命 " + hero.hp);')
    require_snippet(HERO_TS, 'this.write(this.defLabel, "防御 " + hero.def);')
    require_snippet(HERO_TS, "weaponLineText(hero.weaponName, hero.weaponLevel, hero.weaponAtk)")
    require_snippet(HERO_TS, "ownedGoldText(gold)")
    require_snippet(HERO_TS, "upgradeButtonText(hero.level)")

    require_snippet(GROWTH_TS, 'return name + "  Lv" + level + " · " + star + "星";')
    require_snippet(GROWTH_TS, 'return "Lv" + level + " · " + star + "星";')
    require_snippet(GROWTH_TS, 'return "升级（金币 " + upgradeCost(level) + "）";')
    require_snippet(GROWTH_TS, 'return "持有金币 " + value;')
    require_snippet(GROWTH_TS, "atk: 40 + (lv - 1) * 12 + (st - 1) * 15,")
    require_snippet(GROWTH_TS, "hp: 200 + (lv - 1) * 80 + (st - 1) * 60,")
    require_snippet(GROWTH_TS, "def: 10 + (lv - 1) * 4 + (st - 1) * 5,")
    require_snippet(GROWTH_TS, "return 30 + (lv - 1) * 20;")
    require_snippet(GROWTH_TS, "return (clampWeaponLevel(level) - 1) * WEAPON_ATK_STEP;")
    require_snippet(GROWTH_TS, "atk: stats.atk + weaponAtk,")
    require_snippet(
        FORGE_TS,
        'return "武器 " + name + " Lv" + lv + " · 攻击 +" + atk;',
    )

    if ts_int(WIRE_TS, "VISIBLE_ROWS") != VISIBLE_ROWS:
        raise SystemExit("VISIBLE_ROWS drifted")

    wire = load_wire_strings()
    row_text = format_wire_row(SAMPLE_HERO)
    detail_lines = format_wire_detail(SAMPLE_HERO)
    if row_text != "类型 101 · id 10001 · Lv1 · 3星 · 战力 1200":
        raise SystemExit("wire row sample drifted: " + row_text)
    if detail_lines != [
        "类型 101",
        "id 10001",
        "等级 1",
        "阶段 2",
        "星级 3",
        "元素 1",
        "职业 2",
        "锁定 0",
        "战力 1200",
    ]:
        raise SystemExit("wire detail sample drifted: %r" % (detail_lines,))
    for raw_key in ("hero_id", "hero_type", "fighting"):
        if any(raw_key in line for line in detail_lines):
            raise SystemExit("detail still uses a raw proto key: %r" % (detail_lines,))
    for text in [row_text, wire["status"], wire["title"], wire["note"]] + detail_lines:
        hit = banned_18001(text)
        if hit:
            raise SystemExit("4001 sample contains %r in %r" % (hit, text))
    back_list_y = 300 - len(detail_lines) * 40 - 24
    if back_list_y != -84:
        raise SystemExit("detail back y drifted: %s" % back_list_y)
    more_y = 300 - VISIBLE_ROWS * 52
    if more_y != -116:
        raise SystemExit("more y drifted: %s" % more_y)

    starters = parse_starters(read_text(GROWTH_TS))[:3]
    expected_names = ("光耀骑士", "林间游侠", "星辉法师")
    if tuple(row["name"] for row in starters) != expected_names:
        raise SystemExit("starter names drifted: %r" % (starters,))
    if starters[0]["id"] != 10001 or starters[0]["level"] != 1 or starters[0]["star"] != 3:
        raise SystemExit("lead starter drifted: %r" % (starters[0],))
    if any(row["weaponLevel"] != 1 or row["level"] != 1 for row in starters):
        raise SystemExit("starter levels drifted")
    if starters[1]["star"] != 2 or starters[2]["star"] != 1:
        raise SystemExit("starter stars drifted")

    max_level = ts_int(GROWTH_TS, "HERO_MAX_LEVEL")
    weapon_step = ts_int(GROWTH_TS, "WEAPON_ATK_STEP")
    weapon_name = ts_string(GROWTH_TS, "WEAPON_NAME")
    gold = ts_int(SESSION_TS, "MOCK_STARTER_GOLD")
    if weapon_name != "新手短剑":
        raise SystemExit("weapon name drifted: " + weapon_name)
    if weapon_step != 8:
        raise SystemExit("weapon step drifted")
    if gold != 100:
        raise SystemExit("starter gold drifted: %s" % gold)

    lead = starters[0]
    stats = hero_stats(lead["level"], lead["star"])
    bonus = weapon_atk_bonus(lead["weaponLevel"], weapon_step)
    atk = stats["atk"] + bonus
    if (atk, stats["hp"], stats["def"], bonus) != (70, 320, 20, 0):
        raise SystemExit("lead stats drifted: %s %s bonus %s" % (atk, stats, bonus))

    mock_rows = [
        hero_row_label(row["name"], row["level"], row["star"], row["weaponLevel"]) for row in starters
    ]
    if mock_rows != [
        "光耀骑士  Lv1 · 3星 · 武器Lv1",
        "林间游侠  Lv1 · 2星 · 武器Lv1",
        "星辉法师  Lv1 · 1星 · 武器Lv1",
    ]:
        raise SystemExit("mock rows drifted: %r" % (mock_rows,))

    level_text = hero_level_label(lead["level"], lead["star"])
    if level_text != "Lv1 · 3星":
        raise SystemExit("level text drifted: " + level_text)
    upgrade = upgrade_button_label(lead["level"], max_level)
    if upgrade != "升级（金币 30）":
        raise SystemExit("upgrade button drifted: " + upgrade)
    gold_text = owned_gold_label(gold)
    if gold_text != "持有金币 100":
        raise SystemExit("gold text drifted: " + gold_text)
    weapon_text = weapon_line_label(weapon_name, lead["weaponLevel"], bonus)
    if weapon_text != "武器 新手短剑 Lv1 · 攻击 +0":
        raise SystemExit("weapon line drifted: " + weapon_text)
    count = "%d 名英雄 · 点名字查看详情" % len(starters)
    if count != "3 名英雄 · 点名字查看详情":
        raise SystemExit("count drifted: " + count)

    return {
        "wire_title": wire["title"],
        "wire_note": wire["note"],
        "wire_status": wire["status"],
        "wire_empty": wire["empty"],
        "wire_unsynced": wire["unsynced"],
        "wire_rows": [row_text for _ in range(VISIBLE_ROWS)],
        "wire_more": "还有 2 名",
        "wire_detail": detail_lines,
        "wire_back_list_y": back_list_y,
        "wire_more_y": more_y,
        "mock_count": count,
        "mock_rows": mock_rows,
        "mock_name": lead["name"],
        "mock_level": level_text,
        "mock_atk": "攻击 %d" % atk,
        "mock_hp": "生命 %d" % stats["hp"],
        "mock_def": "防御 %d" % stats["def"],
        "mock_weapon": weapon_text,
        "mock_gold": gold_text,
        "mock_upgrade": upgrade,
        "mock_hint": "属性为占位。升级不改武器，武器到铁匠铺强化",
    }


SF = {key: load_sprite_frame(rel) for key, rel in SPRITE_FILES.items()}
FONT = load_font_uuid()

WHITE = color(255, 255, 255, 255)
TITLE_COLOR = color(255, 228, 170, 255)
MUTED = color(190, 205, 225, 255)
STAT = color(255, 214, 120, 255)
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

    def make_sprite_node(self, name, parent_id, x, y, w, h, sf, col=None, grayscale=False, active=True):
        nid = self.make_node(name, parent_id, x, y, w, h, active=active)
        self.add_sprite(nid, sf, col=col, grayscale=grayscale)
        return nid

    def make_button(
        self, name, parent_id, x, y, w, h, text, font_size, bg, pressed,
        grayscale=False, col=None, active=True,
    ):
        nid = self.make_node(name, parent_id, x, y, w, h, active=active)
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

    def label_strings(self):
        found = []
        for obj in self.objs:
            if obj.get("__type__") == "cc.Label":
                found.append(obj.get("_string") or "")
        return found


def label_box(font_size, width):
    return width, font_size + 16


def build_wire(copy):
    b = Builder("WireHeroPage")
    root = b.make_node("WireHeroPage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", root, 0, 470, title_w, title_h, copy["wire_title"], 40, TITLE_COLOR, outline=True)
    note_w, note_h = label_box(22, 640)
    b.make_label_node("Note", root, 0, 420, note_w, note_h, copy["wire_note"], 22, MUTED)
    status_w, status_h = label_box(20, 640)
    b.make_label_node("Status", root, 0, 380, status_w, status_h, copy["wire_status"], 20, MUTED)

    # Hosts sit at the page origin so child y matches place() on the code page.
    # Runtime render() destroys and rebuilds rows. These children are a preview.
    list_host = b.make_node("ListHost", root, 0, 0, PAGE_W, PAGE_H)
    rows = b.make_node("Rows", list_host, 0, 0, PAGE_W, PAGE_H)
    state_w, state_h = label_box(28, 640)
    b.make_label_node(
        "Unsynced", rows, 0, 280, state_w, state_h, copy["wire_unsynced"], 28, TITLE_COLOR, active=True,
    )
    b.make_label_node(
        "Empty", rows, 0, 280, state_w, state_h, copy["wire_empty"], 28, TITLE_COLOR, active=False,
    )
    for i, text in enumerate(copy["wire_rows"]):
        b.make_button(
            "Row_%d" % i, rows, 0, 300 - i * 52, 640, 44, text, 20,
            SF["btn_blue"], SF["btn_blue_p"], active=False,
        )
    more_w, more_h = label_box(20, 640)
    b.make_label_node(
        "More", rows, 0, copy["wire_more_y"], more_w, more_h, copy["wire_more"], 20, MUTED, active=False,
    )
    detail = b.make_node("Detail", rows, 0, 0, PAGE_W, PAGE_H, active=False)
    line_w, line_h = label_box(24, 640)
    for i, text in enumerate(copy["wire_detail"]):
        b.make_label_node(
            "Line_%d" % i, detail, 0, 300 - i * 40, line_w, line_h, text, 24, TITLE_COLOR, h_align=0,
        )
    b.make_button(
        "BtnBackList", detail, 0, copy["wire_back_list_y"], 240, 48, "返回列表", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    b.make_button(
        "BtnBack", root, 0, -460, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_wire(b, copy)
    return b


def build_hero(copy):
    b = Builder("HeroPage")
    root = b.make_node("HeroPage", None, 0, 0, PAGE_W, PAGE_H)
    if root != 1:
        raise SystemExit("root id drifted")

    # One page fill. Code paints a rect on each page; the prefab shares the tinted win-bg.
    b.make_sprite_node("Bg", root, 0, 0, PAGE_W, PAGE_H, SF["win_bg"], col=PAGE_BG)
    panel_list = b.make_node("PanelList", root, 0, 0, PAGE_W, PAGE_H, active=True)
    title_w, title_h = label_box(40, 680)
    b.make_label_node("Title", panel_list, 0, 470, title_w, title_h, "英雄", 40, TITLE_COLOR, outline=True)
    count_w, count_h = label_box(20, 640)
    b.make_label_node("Count", panel_list, 0, 410, count_w, count_h, copy["mock_count"], 20, MUTED)
    rows_host = b.make_node("RowsHost", panel_list, 0, 0, PAGE_W, PAGE_H)
    rows = b.make_node("Rows", rows_host, 0, 0, PAGE_W, PAGE_H)
    for i, text in enumerate(copy["mock_rows"]):
        b.make_button(
            "Row_%d" % i, rows, 0, 300 - i * 100, 600, 76, text, 24,
            SF["btn_blue"], SF["btn_blue_p"],
        )
    b.make_button(
        "BtnBack", panel_list, 0, -420, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )

    panel_detail = b.make_node("PanelDetail", root, 0, 0, PAGE_W, PAGE_H, active=False)
    b.make_label_node("Title", panel_detail, 0, 470, title_w, title_h, "英雄详情", 40, TITLE_COLOR, outline=True)
    name_w, name_h = label_box(36, 640)
    b.make_label_node("Name", panel_detail, 0, 390, name_w, name_h, copy["mock_name"], 36, TITLE_COLOR)
    level_w, level_h = label_box(24, 640)
    b.make_label_node("Level", panel_detail, 0, 330, level_w, level_h, copy["mock_level"], 24, MUTED)
    b.make_sprite_node("Card", panel_detail, 0, 170, 640, 220, SF["block"], col=CARD_BG)
    stat_w, stat_h = label_box(26, 560)
    b.make_label_node("Atk", panel_detail, 0, 230, stat_w, stat_h, copy["mock_atk"], 26, STAT)
    b.make_label_node("Hp", panel_detail, 0, 170, stat_w, stat_h, copy["mock_hp"], 26, STAT)
    b.make_label_node("Def", panel_detail, 0, 120, stat_w, stat_h, copy["mock_def"], 26, STAT)
    weapon_w, weapon_h = label_box(22, 560)
    b.make_label_node("Weapon", panel_detail, 0, 70, weapon_w, weapon_h, copy["mock_weapon"], 22, STAT)
    gold_w, gold_h = label_box(22, 640)
    b.make_label_node("Gold", panel_detail, 0, 0, gold_w, gold_h, copy["mock_gold"], 22, MUTED)
    b.make_button(
        "BtnUpgrade", panel_detail, 0, -80, 460, 68, copy["mock_upgrade"], 24,
        SF["btn_orange"], SF["btn_orange_p"],
    )
    hint_w, hint_h = label_box(18, 640)
    b.make_label_node("Hint", panel_detail, 0, -160, hint_w, hint_h, copy["mock_hint"], 18, MUTED)
    b.make_button(
        "BtnBack", panel_detail, 0, -250, 240, 48, "返回", 24,
        SF["btn_blue"], SF["btn_blue_p"],
    )
    check_hero(b, copy)
    return b


def check_wire(b, copy):
    b.expect("WireHeroPage", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireHeroPage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint("WireHeroPage/Bg", PAGE_BG)
    b.expect_sprite("WireHeroPage/Bg", SF["win_bg"])
    b.expect("WireHeroPage/Title", 0, 470, 680, 56, copy["wire_title"])
    b.expect("WireHeroPage/Note", 0, 420, 640, 38, copy["wire_note"])
    b.expect("WireHeroPage/Status", 0, 380, 640, 36, copy["wire_status"])
    b.expect("WireHeroPage/ListHost", 0, 0, PAGE_W, PAGE_H)
    b.expect("WireHeroPage/ListHost/Rows", 0, 0, PAGE_W, PAGE_H)
    b.expect(
        "WireHeroPage/ListHost/Rows/Unsynced", 0, 280, 640, 44, copy["wire_unsynced"], active=True,
    )
    b.expect("WireHeroPage/ListHost/Rows/Empty", 0, 280, 640, 44, copy["wire_empty"], active=False)
    for i, text in enumerate(copy["wire_rows"]):
        path = "WireHeroPage/ListHost/Rows/Row_%d" % i
        b.expect(path, 0, 300 - i * 52, 640, 44, text, active=False)
        b.expect_sprite(path, SF["btn_blue"])
        b.expect_grayscale(path, False)
    b.expect(
        "WireHeroPage/ListHost/Rows/More",
        0, copy["wire_more_y"], 640, 36, copy["wire_more"], active=False,
    )
    b.expect("WireHeroPage/ListHost/Rows/Detail", 0, 0, PAGE_W, PAGE_H, active=False)
    for i, text in enumerate(copy["wire_detail"]):
        path = "WireHeroPage/ListHost/Rows/Detail/Line_%d" % i
        b.expect(path, 0, 300 - i * 40, 640, 40, text, active=True)
        b.expect_align(path, 0, 1)
    b.expect(
        "WireHeroPage/ListHost/Rows/Detail/BtnBackList",
        0, copy["wire_back_list_y"], 240, 48, "返回列表",
    )
    b.expect_sprite("WireHeroPage/ListHost/Rows/Detail/BtnBackList", SF["btn_blue"])
    b.expect("WireHeroPage/BtnBack", 0, -460, 240, 48, "返回")
    b.expect_sprite("WireHeroPage/BtnBack", SF["btn_blue"])
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in ("PanelList", "PanelDetail", "Top", "Bottom", "BtnUpgrade", "Name"):
        if banned in names:
            raise SystemExit("wire page picked up " + banned)
    for text in b.label_strings():
        hit = banned_18001(text)
        if hit:
            raise SystemExit("wire prefab label has 18001 copy %r in %r" % (hit, text))
    joined = "\n".join(b.label_strings())
    for required in ("类型 101", "id 10001", "等级 1", "阶段 2", "星级 3", "元素 1", "职业 2", "锁定 0", "战力 1200"):
        if required not in joined:
            raise SystemExit("wire prefab missing 4001 detail %s" % required)
    for raw_key in ("hero_id", "hero_type"):
        if raw_key in joined:
            raise SystemExit("wire prefab still uses raw key " + raw_key)
    check_common(b)


def check_hero(b, copy):
    b.expect("HeroPage", 0, 0, PAGE_W, PAGE_H)
    b.expect("HeroPage/Bg", 0, 0, PAGE_W, PAGE_H)
    b.expect_tint("HeroPage/Bg", PAGE_BG)
    b.expect_sprite("HeroPage/Bg", SF["win_bg"])
    b.expect("HeroPage/PanelList", 0, 0, PAGE_W, PAGE_H, active=True)
    b.expect("HeroPage/PanelList/Title", 0, 470, 680, 56, "英雄")
    b.expect("HeroPage/PanelList/Count", 0, 410, 640, 36, copy["mock_count"])
    b.expect("HeroPage/PanelList/RowsHost", 0, 0, PAGE_W, PAGE_H)
    b.expect("HeroPage/PanelList/RowsHost/Rows", 0, 0, PAGE_W, PAGE_H)
    for i, text in enumerate(copy["mock_rows"]):
        path = "HeroPage/PanelList/RowsHost/Rows/Row_%d" % i
        b.expect(path, 0, 300 - i * 100, 600, 76, text, active=True)
        b.expect_sprite(path, SF["btn_blue"])
        b.expect_grayscale(path, False)
    b.expect("HeroPage/PanelList/BtnBack", 0, -420, 240, 48, "返回")
    b.expect_sprite("HeroPage/PanelList/BtnBack", SF["btn_blue"])
    b.expect("HeroPage/PanelDetail", 0, 0, PAGE_W, PAGE_H, active=False)
    b.expect("HeroPage/PanelDetail/Title", 0, 470, 680, 56, "英雄详情")
    b.expect("HeroPage/PanelDetail/Name", 0, 390, 640, 52, copy["mock_name"])
    b.expect("HeroPage/PanelDetail/Level", 0, 330, 640, 40, copy["mock_level"])
    b.expect("HeroPage/PanelDetail/Card", 0, 170, 640, 220)
    b.expect_tint("HeroPage/PanelDetail/Card", CARD_BG)
    b.expect_sprite("HeroPage/PanelDetail/Card", SF["block"])
    b.expect("HeroPage/PanelDetail/Atk", 0, 230, 560, 42, copy["mock_atk"])
    b.expect("HeroPage/PanelDetail/Hp", 0, 170, 560, 42, copy["mock_hp"])
    b.expect("HeroPage/PanelDetail/Def", 0, 120, 560, 42, copy["mock_def"])
    b.expect("HeroPage/PanelDetail/Weapon", 0, 70, 560, 38, copy["mock_weapon"])
    b.expect("HeroPage/PanelDetail/Gold", 0, 0, 640, 38, copy["mock_gold"])
    b.expect("HeroPage/PanelDetail/BtnUpgrade", 0, -80, 460, 68, copy["mock_upgrade"])
    b.expect_sprite("HeroPage/PanelDetail/BtnUpgrade", SF["btn_orange"])
    b.expect_grayscale("HeroPage/PanelDetail/BtnUpgrade", False)
    b.expect("HeroPage/PanelDetail/Hint", 0, -160, 640, 34, copy["mock_hint"])
    b.expect("HeroPage/PanelDetail/BtnBack", 0, -250, 240, 48, "返回")
    b.expect_sprite("HeroPage/PanelDetail/BtnBack", SF["btn_blue"])
    names = [b.objs[i]["_name"] for i in b.path_of]
    for banned in ("ListHost", "Unsynced", "Empty", "More", "Status", "Top", "Bottom", "Line_0"):
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
    if builder.prefab_name == "WireHeroPage":
        hit = banned_18001(text)
        if hit:
            raise SystemExit("wire prefab embedded 18001 copy %r" % hit)
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
    proto = read_text(WIRE_PROTO)
    if protocol_is_gres_4001(proto):
        if copy["wire_status"] != ts_string(WIRE_PROTO, "WIRE_HERO_FIELD_NOTE"):
            raise SystemExit("status is not WIRE_HERO_FIELD_NOTE")
        if copy["wire_status"] != "没有名字。类型对不上就写类型号":
            raise SystemExit("wire status drifted: " + copy["wire_status"])
        if copy["wire_title"] != ts_string(WIRE_PROTO, "WIRE_HERO_READONLY_TITLE"):
            raise SystemExit("title is not the protocol constant")
    elif copy["wire_status"] != SPEC_WIRE["status"]:
        raise SystemExit("wire status drifted: " + copy["wire_status"])
    if len(copy["wire_rows"]) != VISIBLE_ROWS:
        raise SystemExit("wire row count drifted")
    wire = build_wire(copy)
    hero = build_hero(copy)
    write_dir_meta()
    write_prefab(wire)
    write_prefab(hero)
    print("OK")
    print("STATUS", copy["wire_status"])
    print("WIRE_ROW", copy["wire_rows"][0])
    print("DETAIL", " | ".join(copy["wire_detail"]))
    print("ROWS", " | ".join(copy["mock_rows"]))
    print("LEAD", copy["mock_name"], copy["mock_level"], copy["mock_atk"], copy["mock_upgrade"])


if __name__ == "__main__":
    main()
