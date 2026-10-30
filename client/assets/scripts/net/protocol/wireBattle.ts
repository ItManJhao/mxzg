/**
 * 真服主线进战。c2s / s2c 都是 3001。
 * c2s 是 GReqBattleMatch，没有字段。整帧 04 00 00 00 b9 0b 00 00，即 04000000b90b0000。
 * 3001 = 0x0BB9，小端是 b9 0b 00 00。
 * 服侧 BattleHandler.challenge：读 RoleMission.chapterId，打 chapterId+1，invokePVEBattle(BattleType.MAIN)。
 * 3007 的 max_idx 就是 chapterId。须先有 3007。3101 若登录链已经拉过，这里不重发。
 *
 * 不进 pullIdle，不接在活动链末（不接 76251 后面），不夹活动号。
 * 主线页「挑战」才发。Boot.ts 不改。
 * 胜则服写 receiveReward / chapterId / missionRankTime，并记战斗日志。
 * 已有未领通关奖时服可能另走 3002 发 first_reward。本端不发 3002。
 * Handler 内未见扣体力。win_id 对上 atk_id 或当前角色 id 之后，再拉一次已有的空 c2s 3007。
 * battle_type 单独不回拉。不是登录链加发。
 *
 * 不发领奖写 3002、3005、3008、3011、3013。3102 请求战报另帧，不从 3001 自动发。3006 挂机战报另帧，不从 3001 发。3103 预计算另帧，不从 3102 自动发，不播 spine。
 * 不发 3100、3097、3098、18002、18001。
 * 不重发已挂的 3007（登录链）、3004、3099、3101、3203。
 * 硬禁 4601、29001。
 * 不把 Mock 1201 / 1202 当这帧战报。不写金币，不写钻石。不回落 Mock。
 *
 * s2c 是 GResBattleMatch。report 是字段 1，length-delimited 的 BattleReport。
 * 仓库没有 Battle.proto 全文。字段 2 已确认是 battle_type，不是胜负。出现的 0 仍是 0。
 * 日服旧客户端的战报 JSON（attack_info / skill_id / unit_id）若整段或字段 1 就是这份 JSON，按攻击拍收，不改下面的 protobuf 字段号。
 * 其余号按声明顺序锁在本文件：3 atk_id，4 def_id，5 win_id，6 repeated rounds，
 * 7 攻方英雄，8 守方英雄。回合 1 序号、2 行动；行动 1 atk_pos、2 skill_id、3 hits、4 camp；
 * 命中 1 def_pos、2 hurt、3 hp；英雄 1 pos、2 hero_id、3 hp、4 max_hp。
 * camp 只有 1（我方）和 2（敌方）参与对位。其它值（含出现的 0）不当阵营。
 * 没有的数保持 null，不写成 0。有 report 才在主线页播 resources/spine 首批套的站场和回合动作。
 * 回合 skill_id 对 batch2 技能套取模，挂一个命名特效；hits 挂 yanwu。没有技能号、没有 hits，或表是空的，就不挂，站场和攻击照旧。
 * hero_id 对得上 resources/spine 里的套时用那套。8 位套有 attack 和 hit。对不上仍用原来的三套默认。
 * 受击者的套里有 hit 才播英雄受击。没有这个动作就留 stand。hp 已经到 0 的人下一拍停在 hit，有 die 才播 die。不播 bisha。不是旧技能表。
 * batch2 仍是 Spine 3.7.94。Creator 3.8.8 用 spine-3.8，曲线、约束、裁剪可能播不出。播不出就跳过该特效。
 */
import { heroSkinClips } from "./battleAssetIndex";
import { wireHeroTypeLabel } from "./wireHero";

const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.battleMatch。 */
export const WIRE_BATTLE_MATCH_CMD = "wire.3001";

export const WIRE_BATTLE_MATCH_FRAME = "04000000b90b0000";

/** GResBattleMatch.report。声明顺序第 1 个字段。 */
export const WIRE_BATTLE_REPORT_FIELD = 1;

/** BattleReport.battle_type。不是胜负。出现的 0 仍是 0。 */
export const WIRE_BATTLE_TYPE_FIELD = 2;

export const WIRE_BATTLE_ATK_FIELD = 3;
export const WIRE_BATTLE_DEF_FIELD = 4;
export const WIRE_BATTLE_WIN_ID_FIELD = 5;
export const WIRE_BATTLE_ROUNDS_FIELD = 6;
export const WIRE_BATTLE_ATK_HERO_FIELD = 7;
export const WIRE_BATTLE_DEF_HERO_FIELD = 8;

/** 行动字段 4。1 我方，2 敌方。 */
export const WIRE_BATTLE_CAMP_ALLY = 1;
export const WIRE_BATTLE_CAMP_ENEMY = 2;

/**
 * 攻击者阵营的对面。受击位置经常和攻击者用同一个号，带了阵营才分得开。
 * 没带、或不是 1/2，返回 null。调用方保持「阵营未带」，不猜人。
 */
export function wireBattleDefenderCamp(camp: number | null): number | null {
  if (camp === WIRE_BATTLE_CAMP_ALLY) return WIRE_BATTLE_CAMP_ENEMY;
  if (camp === WIRE_BATTLE_CAMP_ENEMY) return WIRE_BATTLE_CAMP_ALLY;
  return null;
}

export const WIRE_BATTLE_EMPTY = "已同步空表";
export const WIRE_BATTLE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_BATTLE_NO_REPORT = "没有 report";
export const WIRE_SPINE_LOAD_FAIL = "spine 未加载";

/** 能播 attack 的我方默认套。英雄号对上已知套时不用这组。 */
export const WIRE_SPINE_ALLY_STEMS = ["10105008", "10405005", "10505005"];
/** 能播 attack 的敌方默认套。 */
export const WIRE_SPINE_ENEMY_STEMS = ["10405006", "10405007", "10505010"];
export const WIRE_SPINE_FLAG = "zhandoujijian";
export const WIRE_SPINE_SWORD = "battle-sword";
export const WIRE_SPINE_BOSS = "crusade_boss_die";

/**
 * #145 batch2 技能套，顺序就是取模表。不含 yanwu（受击尘单独挂）。
 * 不是旧技能配置。skill_id 对这张表取模，只为了真服回放能看出不同技能号。
 */
export const WIRE_SPINE_SKILL_STEMS = [
  "zadan",
  "zadan_tx",
  "heidong",
  "guangzhu",
  "jiban",
  "Dragon-1",
  "Dragon-2",
  "Dragon-3",
  "Dragon-4",
  "act",
  "chaihong",
  "ZDKS",
  "hytx",
  "lizi",
  "dx",
  "lijijihuo",
  "zhihuanfazhen",
  "prophet-tree-effect-1",
  "prophet-tree-effect-2",
];

/** 烟尘。有 hits 才挂。英雄受击另看套里有没有 hit。不播 bisha。 */
export const WIRE_SPINE_HIT_STEM = "yanwu";

export const WIRE_BATTLE_MATCH_NOTE =
  "挑战发空 c2s 3001（GReqBattleMatch，整帧 04000000b90b0000）。须已有 3007 的 idx。3101 已有则不重发。字段 2 是 battle_type，不是胜负。胜负看 win_id，对照 atk_id 或角色 id。rounds 驱动 spine 站场和回合动作，技能和受击挂 batch2 命名特效。3102 请求战报另帧，不从 3001 自动发。3103 预计算战斗力另帧，挂在 3102 之后，不从 3102 自动发，不播 spine。3006 挂机战报另帧，不从 3001 发。不发 3002、3005、3008、3011、3013、3100、3097、3098、18002、18001。不重发 3004、3099、3203。硬禁 4601、29001。不把 Mock 1201/1202 当战报。缺字段不写成 0。空包体是已同步空表。未同步 Toast「真服未同步」。不回落 Mock。不写金币，不写钻石。不夹活动号。不进 pullIdle。不改 Boot";

export const WIRE_BATTLE_MATCH_SIDE_EFFECT =
  "服侧胜则写 receiveReward、chapterId、missionRankTime 和战斗日志。已有未领通关奖可能另推 3002 first_reward，本端不发 3002。Handler 内未见扣体力。win_id 对上 atk_id 或角色 id 才再拉已有的空 c2s 3007。battle_type 单独不回拉。不进活动链";

export interface WireBattleMark {
  field: number;
  text: string;
}

export interface WireBattleHero {
  pos: number | null;
  heroId: number | null;
  hp: number | null;
  maxHp: number | null;
  marks: WireBattleMark[];
}

export interface WireBattleHit {
  defPos: number | null;
  hurt: number | null;
  hp: number | null;
  marks: WireBattleMark[];
}

export interface WireBattleAction {
  atkPos: number | null;
  skillId: number | null;
  /** 1 我方，2 敌方。没有或不是这两个数时是原值或 null，不参与对位。 */
  camp: number | null;
  hits: WireBattleHit[];
  marks: WireBattleMark[];
}

export interface WireBattleRound {
  index: number | null;
  actions: WireBattleAction[];
  marks: WireBattleMark[];
}

export interface WireBattleReport {
  battleId: number | null;
  battleType: number | null;
  atkId: number | null;
  defId: number | null;
  winId: number | null;
  rounds: WireBattleRound[];
  atkHeroes: WireBattleHero[];
  defHeroes: WireBattleHero[];
  marks: WireBattleMark[];
}

export interface WireBattleMatch {
  /** 空包体。report 保持缺省。 */
  empty: boolean;
  /** 字段 1。没有时是 null。 */
  report: WireBattleReport | null;
  /** 外层对不上 report 的号。 */
  marks: WireBattleMark[];
}

/** 这一份里能播的攻击拍。只有空壳、没有位置、技能和命中的行动不算。 */
export function wireBattleActionCount(report: WireBattleReport): number {
  let count = 0;
  for (let r = 0; r < report.rounds.length; r++) {
    const actions = report.rounds[r].actions;
    for (let a = 0; a < actions.length; a++) {
      if (actionHasBeat(actions[a])) count += 1;
    }
  }
  return count;
}

function actionHasBeat(action: WireBattleAction): boolean {
  if (action.atkPos !== null || action.skillId !== null) return true;
  if (action.camp === WIRE_BATTLE_CAMP_ALLY || action.camp === WIRE_BATTLE_CAMP_ENEMY) return true;
  for (let i = 0; i < action.hits.length; i++) {
    const hit = action.hits[i];
    if (hit.defPos !== null || hit.hurt !== null || hit.hp !== null) return true;
  }
  return false;
}

export type WireSpineClip = "stand" | "attack" | "hit" | "die" | "idle";
export type WireSpineSide = "ally" | "enemy" | "sword" | "flag";

export interface WireSpineSlot {
  side: WireSpineSide;
  stem: string;
  pos: number | null;
  hp: number | null;
  maxHp: number | null;
  label: string;
}

export interface WireSpineCue {
  slot: number;
  clip: WireSpineClip;
}

/** 一拍上的命名特效。anchor 是 slots 下标；对不上人时是 null，画在两排中间。 */
export interface WireSpineVfxCue {
  stem: string;
  anchor: number | null;
  role: "skill" | "hit";
}

export interface WireSpineBeat {
  line: string;
  cues: WireSpineCue[];
  /** 与 slots 对齐。null 表示这一拍不改这条血。缺血不写成 0。 */
  hp: (number | null)[];
  /** 这一拍要挂的 batch2 特效。空数组表示不挂，站场和攻击照旧。 */
  vfx: WireSpineVfxCue[];
}

export interface WireSpineReplay {
  stageId: number;
  win: boolean | null;
  slots: WireSpineSlot[];
  beats: WireSpineBeat[];
  stems: string[];
}

const STEM_CLIPS: { [stem: string]: WireSpineClip[] } = {
  "10101": ["stand"],
  "10201": ["stand"],
  "10301": ["stand"],
  "10401": ["stand"],
  "10501": ["stand"],
  "10701": ["stand"],
  "battle-sword": ["stand"],
  "10405005": ["stand", "attack", "hit"],
  "10405006": ["stand", "attack", "hit"],
  "10405007": ["stand", "attack", "hit"],
  "10505005": ["stand", "attack", "hit"],
  "10505010": ["stand", "attack", "hit"],
  "10105008": ["stand", "attack", "hit"],
  zhandoujijian: ["idle"],
  crusade_boss_die: ["stand", "die"],
};

/**
 * 解 s2c 3001。空包体返回已同步空表。
 * 超长、坏 varint、report 有包但整段解不开时返回 null，调用方保持上一次。
 * 某一条 round / hero 解不开时留在 marks，不把整份 report 丢掉。
 */
export function decodeWireBattleMatch(body: Uint8Array | null | undefined): WireBattleMatch | null {
  if (!body) return null;
  if (body.length === 0) return { empty: true, report: null, marks: [] };
  if (body.length > MAX_BODY) return null;
  const json = battleReportFromJson(body);
  if (json && wireBattleActionCount(json) > 0) return { empty: false, report: json, marks: [] };
  const fields = readRawFields(body);
  if (!fields) return null;
  const marks: WireBattleMark[] = [];
  let report: WireBattleReport | null = null;
  let blobs = 0;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === WIRE_BATTLE_REPORT_FIELD && row.kind === "bytes" && row.bytes) {
      blobs += 1;
      const parsed = decodeWireBattleReport(row.bytes);
      if (!parsed) continue;
      report = parsed;
      continue;
    }
    const mark = markOf(row);
    if (mark) marks.push(mark);
  }
  if (blobs > 0 && !report) return null;
  return { empty: false, report, marks };
}

/**
 * 没有 win_id 时是 null，不判负，也不回拉 3007。
 * win_id 对上 atk_id 或 roleId 才是胜。对上的 0 仍是 0，不算缺字段。
 * 有 win_id 但对不上任何己方 id 时是负。只有 win_id、没有 atk_id 也没有角色 id 时仍是 null。
 */
export function resolveWireBattleWin(report: WireBattleReport, roleId: number | null): boolean | null {
  if (report.winId === null) return null;
  const ours: number[] = [];
  if (typeof roleId === "number" && isFinite(roleId)) ours.push(roleId);
  if (report.atkId !== null) ours.push(report.atkId);
  if (ours.length === 0) return null;
  for (let i = 0; i < ours.length; i++) {
    if (ours[i] === report.winId) return true;
  }
  return false;
}

/** 3007 max_idx 是 chapterId，进战是 chapterId+1。没有 max 时才看 now，不把缺的 max 写成 0。 */
export function wireMainlineFightStage(nowIdx: number | null, maxIdx: number | null): number | null {
  if (typeof maxIdx === "number" && isFinite(maxIdx) && maxIdx >= 0) return Math.floor(maxIdx) + 1;
  if (typeof nowIdx === "number" && isFinite(nowIdx) && nowIdx >= 1) return Math.floor(nowIdx);
  if (nowIdx === 0) return 1;
  return null;
}

export function formatWireFightLine(nowIdx: number | null, maxIdx: number | null): string {
  const stage = wireMainlineFightStage(nowIdx, maxIdx);
  if (stage === null) return "进战 idx 未同步";
  return "进战 idx " + stage;
}

export function formatWireBattleMatch(snap: WireBattleMatch, roleId?: number | null): string {
  if (snap.empty) return WIRE_BATTLE_EMPTY;
  if (!snap.report) return joinMarks(WIRE_BATTLE_NO_REPORT, snap.marks);
  const win = resolveWireBattleWin(snap.report, roleId ?? null);
  const winText = win === null ? "胜负未带" : win ? "胜" : "负";
  const typeText = snap.report.battleType === null ? "battle_type 未带" : "battle_type " + snap.report.battleType;
  const line = "report " + winText + " / " + typeText + " / rounds " + snap.report.rounds.length;
  return joinMarks(line, snap.report.marks.concat(snap.marks));
}

export function wireSpineHasClip(stem: string, clip: WireSpineClip): boolean {
  const list = STEM_CLIPS[stem] || heroSkinClips(stem);
  if (!list) return false;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === clip) return true;
  }
  return false;
}

/**
 * skill_id 对技能套取模。null、非数、或表是空的，返回 null，调用方不挂特效。
 * table 只给自检换一张空表；缺省用 WIRE_SPINE_SKILL_STEMS。出现的 0 仍映射到第 0 套。
 */
export function wireSpineSkillStem(skillId: number | null, table?: readonly string[]): string | null {
  if (typeof skillId !== "number" || !isFinite(skillId)) return null;
  const list = table || WIRE_SPINE_SKILL_STEMS;
  if (list.length === 0) return null;
  const index = Math.floor(Math.abs(skillId)) % list.length;
  const stem = list[index];
  if (!stem) return null;
  return stem;
}

/** 有命中才返回受击套。hitCount 为 0，或套名是空的，返回 null。stem 只给自检换成空名。 */
export function wireSpineHitStem(hitCount: number, stem?: string | null): string | null {
  if (typeof hitCount !== "number" || !isFinite(hitCount) || hitCount <= 0) return null;
  const name = stem === undefined ? WIRE_SPINE_HIT_STEM : stem;
  if (!name) return null;
  return name;
}

/** batch2 套上真正有的动作名。没单列的用 stand。不把英雄 hit 当特效动作。 */
const VFX_CLIP: { [stem: string]: string } = {
  yanwu: "act1",
  heidong: "act1",
  chaihong: "act1",
  act: "attack",
  "Dragon-1": "attack",
  "Dragon-2": "attack",
  "Dragon-3": "attack",
  "Dragon-4": "attack",
  lijijihuo: "idle",
  zhihuanfazhen: "idle",
};

export function wireSpineVfxClip(stem: string): string {
  const named = VFX_CLIP[stem];
  if (named) return named;
  return "stand";
}

/**
 * 有 report 才编这份回放。不走 planBattle，不造四回合色块。
 * 没有 rounds 时先站场；胜负已经能判时再补一拍攻击。胜且没有守方英雄时敌方用 crusade_boss_die。
 * 有行动就按行动播 attack 或 stand。受击者套里有 hit 才改成受击。技能号和 hits 另挂 batch2 特效。不播 bisha。
 */
export function planWireSpineReplay(report: WireBattleReport, roleId: number | null, stageId: number): WireSpineReplay {
  const win = resolveWireBattleWin(report, roleId);
  const slots = buildSlots(report, win);
  const beats = buildBeats(report, slots, win);
  const stems: string[] = [];
  for (let i = 0; i < slots.length; i++) pushUnique(stems, slots[i].stem);
  for (let b = 0; b < beats.length; b++) {
    const vfx = beats[b].vfx;
    for (let v = 0; v < vfx.length; v++) pushUnique(stems, vfx[v].stem);
  }
  return { stageId, win, slots, beats, stems };
}

function buildSlots(report: WireBattleReport, win: boolean | null): WireSpineSlot[] {
  const allies = heroSlots(report.atkHeroes, "ally");
  const enemies = heroSlots(report.defHeroes, "enemy");
  if (allies.length === 0) allies.push(fillerSlot("ally", win));
  if (enemies.length === 0) enemies.push(fillerSlot("enemy", win));
  const slots = allies.slice(0, 3).concat(enemies.slice(0, 3));
  slots.push({
    side: "sword",
    stem: WIRE_SPINE_SWORD,
    pos: null,
    hp: null,
    maxHp: null,
    label: "战剑",
  });
  slots.push({
    side: "flag",
    stem: WIRE_SPINE_FLAG,
    pos: null,
    hp: null,
    maxHp: null,
    label: "战旗",
  });
  return slots;
}

function heroSlots(heroes: WireBattleHero[], side: "ally" | "enemy"): WireSpineSlot[] {
  const slots: WireSpineSlot[] = [];
  const pool = side === "ally" ? WIRE_SPINE_ALLY_STEMS : WIRE_SPINE_ENEMY_STEMS;
  for (let i = 0; i < heroes.length && slots.length < 3; i++) {
    const hero = heroes[i];
    const named = hero.heroId !== null ? String(hero.heroId) : "";
    const stem = STEM_CLIPS[named] || heroSkinClips(named) ? named : pool[slots.length % pool.length];
    slots.push({
      side,
      stem,
      pos: hero.pos,
      hp: hero.hp,
      maxHp: hero.maxHp,
      label: heroLabel(side, hero.pos, hero.hp, hero.maxHp, stem, hero.heroId),
    });
  }
  return slots;
}

function fillerSlot(side: "ally" | "enemy", win: boolean | null): WireSpineSlot {
  const stem = side === "enemy" && win === true ? WIRE_SPINE_BOSS : side === "ally" ? WIRE_SPINE_ALLY_STEMS[0] : WIRE_SPINE_ENEMY_STEMS[0];
  return {
    side,
    stem,
    pos: null,
    hp: null,
    maxHp: null,
    label: heroLabel(side, null, null, null, stem, null),
  };
}

function heroLabel(
  side: "ally" | "enemy",
  pos: number | null,
  hp: number | null,
  maxHp: number | null,
  stem: string,
  heroId: number | null
): string {
  const who = side === "ally" ? "我方" : "敌方";
  const posText = pos === null ? "位置未带" : "位置 " + pos;
  let hpText = "";
  if (hp !== null && maxHp !== null) hpText = " " + hp + "/" + maxHp;
  else if (hp !== null) hpText = " hp " + hp;
  else if (maxHp !== null) hpText = " max " + maxHp;
  let shown = stem;
  if (heroId !== null) {
    const typed = wireHeroTypeLabel(heroId);
    if (typed.indexOf("类型 ") !== 0 && typed !== "类型未解") shown = typed;
  }
  return who + " " + posText + hpText + " " + shown;
}

function buildBeats(report: WireBattleReport, slots: WireSpineSlot[], win: boolean | null): WireSpineBeat[] {
  const carried: (number | null)[] = [];
  for (let i = 0; i < slots.length; i++) carried.push(slots[i].hp);
  const take = (beat: WireSpineBeat): WireSpineBeat => {
    for (let i = 0; i < beat.hp.length; i++) {
      if (beat.hp[i] !== null) carried[i] = beat.hp[i];
    }
    return beat;
  };
  const beats: WireSpineBeat[] = [take(standBeat(slots, "站场", carried))];
  let actionCount = 0;
  for (let r = 0; r < report.rounds.length; r++) actionCount += report.rounds[r].actions.length;
  if (actionCount === 0) {
    for (let r = 0; r < report.rounds.length; r++) {
      beats.push(take(standBeat(slots, roundPrefix(report.rounds[r]) + " · 无行动", carried)));
    }
    if (win === true) beats.push(take(outcomeBeat(slots, "ally", win, carried)));
    else if (win === false) beats.push(take(outcomeBeat(slots, "enemy", win, carried)));
    return beats;
  }
  for (let r = 0; r < report.rounds.length; r++) {
    const round = report.rounds[r];
    if (round.actions.length === 0) {
      beats.push(take(standBeat(slots, roundPrefix(round) + " · 无行动", carried)));
      continue;
    }
    for (let a = 0; a < round.actions.length; a++) {
      const last = r === report.rounds.length - 1 && a === round.actions.length - 1;
      beats.push(take(actionBeat(slots, round, round.actions[a], win, last, carried)));
    }
  }
  return beats;
}

function standBeat(slots: WireSpineSlot[], line: string, carried: (number | null)[]): WireSpineBeat {
  return { line, cues: baseCues(slots, carried), hp: emptyHp(slots), vfx: [] };
}

function outcomeBeat(slots: WireSpineSlot[], side: "ally" | "enemy", win: boolean | null, carried: (number | null)[]): WireSpineBeat {
  const cues = baseCues(slots, carried);
  const actor = firstSide(slots, side);
  let verb = "站立";
  if (actor >= 0 && wireSpineHasClip(slots[actor].stem, "attack")) {
    setCue(cues, actor, "attack");
    verb = "攻击";
  }
  const hp = emptyHp(slots);
  if (win === true) applyBossDie(slots, cues, hp, true);
  const line = (win === true ? "胜" : "负") + " · " + verb;
  return { line, cues, hp, vfx: [] };
}

function actionBeat(
  slots: WireSpineSlot[],
  round: WireBattleRound,
  action: WireBattleAction,
  win: boolean | null,
  last: boolean,
  carried: (number | null)[]
): WireSpineBeat {
  const cues = baseCues(slots, carried);
  const hp = emptyHp(slots);
  const vfx = actionVfx(slots, action);
  let line = roundPrefix(round);
  let attacker = -1;
  if (action.atkPos === null) {
    line += " · 行动者未带";
  } else {
    const found = matchSlot(slots, action.atkPos, action.camp);
    if (found === "ambiguous") line += " · 位置 " + action.atkPos + " 阵营未带";
    else if (found === "missing") line += " · 位置 " + action.atkPos + " 未在场";
    else {
      attacker = found;
      const attack = wireSpineHasClip(slots[found].stem, "attack");
      setCue(cues, found, attack ? "attack" : "stand");
      line += " · 位置 " + action.atkPos + (attack ? " 攻击" : " 站立");
    }
  }
  applyDefenderHit(slots, cues, action, attacker, wireBattleDefenderCamp(action.camp));
  if (action.skillId !== null) {
    const skillStem = wireSpineSkillStem(action.skillId);
    line += skillStem ? " · 技能 " + action.skillId + " " + skillStem : " · 技能 " + action.skillId + " 未播";
  }
  for (let i = 0; i < action.hits.length; i++) {
    const hit = action.hits[i];
    if (hit.hurt !== null) line += " · 伤害 " + hit.hurt;
    if (hit.defPos === null || hit.hp === null) continue;
    const target = matchSlot(slots, hit.defPos, wireBattleDefenderCamp(action.camp));
    if (typeof target !== "number") {
      line += " · 受击位置 " + hit.defPos + (target === "ambiguous" ? " 阵营未带" : " 未在场");
      continue;
    }
    hp[target] = hit.hp;
  }
  for (let v = 0; v < vfx.length; v++) {
    if (vfx[v].role === "hit") line += " · 受击 " + vfx[v].stem;
  }
  applyBossDie(slots, cues, hp, win === true && last);
  return { line, cues, hp, vfx };
}

/** 受击者套里有 hit 才改这一拍。攻击者自己被打到时仍留攻击，不改成受击。 */
function applyDefenderHit(
  slots: WireSpineSlot[],
  cues: WireSpineCue[],
  action: WireBattleAction,
  attacker: number,
  defenderCamp: number | null
): void {
  for (let i = 0; i < action.hits.length; i++) {
    const hit = action.hits[i];
    if (hit.defPos === null) continue;
    const target = matchSlot(slots, hit.defPos, defenderCamp);
    if (typeof target !== "number" || target === attacker) continue;
    if (!wireSpineHasClip(slots[target].stem, "hit")) continue;
    setCue(cues, target, "hit");
  }
}

function actionVfx(slots: WireSpineSlot[], action: WireBattleAction): WireSpineVfxCue[] {
  const vfx: WireSpineVfxCue[] = [];
  const skillStem = wireSpineSkillStem(action.skillId);
  if (skillStem) {
    let anchor: number | null = null;
    if (action.atkPos !== null) {
      const found = matchSlot(slots, action.atkPos, action.camp);
      if (typeof found === "number") anchor = found;
    }
    vfx.push({ stem: skillStem, anchor, role: "skill" });
  }
  const hitStem = wireSpineHitStem(action.hits.length);
  if (hitStem) {
    let anchor: number | null = null;
    for (let i = 0; i < action.hits.length; i++) {
      const hit = action.hits[i];
      if (hit.defPos === null) continue;
      const target = matchSlot(slots, hit.defPos, wireBattleDefenderCamp(action.camp));
      if (typeof target === "number") {
        anchor = target;
        break;
      }
    }
    vfx.push({ stem: hitStem, anchor, role: "hit" });
  }
  return vfx;
}

function applyBossDie(slots: WireSpineSlot[], cues: WireSpineCue[], hp: (number | null)[], finish: boolean): void {
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].stem !== WIRE_SPINE_BOSS) continue;
    if (hp[i] === 0 || (finish && slots[i].side === "enemy")) setCue(cues, i, "die");
  }
}

function baseCues(slots: WireSpineSlot[], carried: (number | null)[]): WireSpineCue[] {
  const cues: WireSpineCue[] = [];
  for (let i = 0; i < slots.length; i++) {
    let clip: WireSpineClip = slots[i].side === "flag" ? "idle" : "stand";
    const downed = carried[i] === 0 && (slots[i].side === "ally" || slots[i].side === "enemy");
    if (downed && wireSpineHasClip(slots[i].stem, "die")) clip = "die";
    else if (downed && wireSpineHasClip(slots[i].stem, "hit")) clip = "hit";
    cues.push({ slot: i, clip: fallbackClip(slots[i].stem, clip) });
  }
  return cues;
}

function fallbackClip(stem: string, want: WireSpineClip): WireSpineClip {
  if (wireSpineHasClip(stem, want)) return want;
  if (wireSpineHasClip(stem, "stand")) return "stand";
  if (wireSpineHasClip(stem, "idle")) return "idle";
  return "stand";
}

function setCue(cues: WireSpineCue[], slot: number, clip: WireSpineClip): void {
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].slot === slot) {
      cues[i] = { slot, clip };
      return;
    }
  }
  cues.push({ slot, clip });
}

function matchSlot(slots: WireSpineSlot[], pos: number, camp: number | null): number | "ambiguous" | "missing" {
  const hits: number[] = [];
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (slot.side !== "ally" && slot.side !== "enemy") continue;
    if (slot.pos !== pos) continue;
    if (camp === WIRE_BATTLE_CAMP_ALLY && slot.side !== "ally") continue;
    if (camp === WIRE_BATTLE_CAMP_ENEMY && slot.side !== "enemy") continue;
    hits.push(i);
  }
  if (hits.length === 1) return hits[0];
  if (hits.length === 0) return "missing";
  return "ambiguous";
}

function firstSide(slots: WireSpineSlot[], side: "ally" | "enemy"): number {
  for (let i = 0; i < slots.length; i++) {
    if (slots[i].side === side) return i;
  }
  return -1;
}

function emptyHp(slots: WireSpineSlot[]): (number | null)[] {
  const hp: (number | null)[] = [];
  for (let i = 0; i < slots.length; i++) hp.push(null);
  return hp;
}

function roundPrefix(round: WireBattleRound): string {
  return round.index === null ? "回合未带" : "回合 " + round.index;
}

function pushUnique(list: string[], stem: string): void {
  for (let i = 0; i < list.length; i++) {
    if (list[i] === stem) return;
  }
  list.push(stem);
}

/** BattleReport。3001、3006 和 3102 的 report 都走这一段，不另写一套 rounds。 */
export function decodeWireBattleReport(body: Uint8Array): WireBattleReport | null {
  const json = battleReportFromJson(body);
  if (json && wireBattleActionCount(json) > 0) return json;
  const report = emptyReport();
  if (body.length === 0) return report;
  const fields = readRawFields(body);
  if (!fields) return null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.kind === "varint" && typeof row.varint === "number") {
      if (row.field === 1) {
        report.battleId = row.varint;
        continue;
      }
      if (row.field === WIRE_BATTLE_TYPE_FIELD) {
        report.battleType = row.varint;
        continue;
      }
      if (row.field === WIRE_BATTLE_ATK_FIELD) {
        report.atkId = row.varint;
        continue;
      }
      if (row.field === WIRE_BATTLE_DEF_FIELD) {
        report.defId = row.varint;
        continue;
      }
      if (row.field === WIRE_BATTLE_WIN_ID_FIELD) {
        report.winId = row.varint;
        continue;
      }
    }
    if (row.kind === "bytes" && row.bytes) {
      if (row.field === WIRE_BATTLE_ROUNDS_FIELD) {
        const round = decodeRound(row.bytes);
        if (round) {
          report.rounds.push(round);
          continue;
        }
      } else if (row.field === WIRE_BATTLE_ATK_HERO_FIELD) {
        const hero = decodeHero(row.bytes);
        if (hero) {
          report.atkHeroes.push(hero);
          continue;
        }
      } else if (row.field === WIRE_BATTLE_DEF_HERO_FIELD) {
        const hero = decodeHero(row.bytes);
        if (hero) {
          report.defHeroes.push(hero);
          continue;
        }
      }
    }
    const mark = markOf(row);
    if (mark) report.marks.push(mark);
  }
  if (wireBattleActionCount(report) === 0 && fields) {
    for (let i = 0; i < fields.length; i++) {
      const row = fields[i];
      if (row.kind !== "bytes" || !row.bytes) continue;
      const nested = battleReportFromJson(row.bytes);
      if (nested && wireBattleActionCount(nested) > 0) return nested;
    }
  }
  return report;
}

/**
 * 日服旧战报是 JSON：rounds[].attack_info[].skill.skill_id，攻击者是 unit_id。
 * 不是这份形状就返回 null，调用方继续按 protobuf 解。
 */
function battleReportFromJson(body: Uint8Array): WireBattleReport | null {
  if (body.length === 0 || body[0] !== 0x7b) return null;
  let data: unknown;
  try {
    data = JSON.parse(bytesToText(body));
  } catch (_err) {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const root = data as Record<string, unknown>;
  if (!Array.isArray(root.rounds)) return null;
  const attacker = asRecord(root.attacker);
  const defender = asRecord(root.defender);
  const atkHeroes = jsonHeroes(attacker);
  const defHeroes = jsonHeroes(defender);
  const seats = jsonSeats(atkHeroes, defHeroes, attacker, defender);
  const rounds: WireBattleRound[] = [];
  for (let i = 0; i < root.rounds.length; i++) {
    const round = jsonRound(root.rounds[i], seats);
    if (round) rounds.push(round);
  }
  const report = emptyReport();
  report.battleType = finiteInt(root.battle_type);
  report.atkId = attacker ? finiteInt(attacker.player_id) : null;
  report.defId = defender ? finiteInt(defender.player_id) : null;
  report.winId = finiteInt(root.win_id);
  report.rounds = rounds;
  report.atkHeroes = atkHeroes;
  report.defHeroes = defHeroes;
  report.marks.push({ field: 99, text: "attack_info" });
  if (wireBattleActionCount(report) === 0) return null;
  return report;
}

interface JsonSeat {
  unitId: number;
  pos: number | null;
  camp: number;
}

function jsonHeroes(side: Record<string, unknown> | null): WireBattleHero[] {
  if (!side || !Array.isArray(side.heros)) return [];
  const out: WireBattleHero[] = [];
  for (let i = 0; i < side.heros.length; i++) {
    const row = asRecord(side.heros[i]);
    if (!row) continue;
    out.push({
      pos: finiteInt(row.position),
      heroId: finiteInt(row.hero_id),
      hp: finiteInt(row.hp),
      maxHp: finiteInt(row.max_hp),
      marks: [],
    });
  }
  return out;
}

function jsonSeats(
  atk: WireBattleHero[],
  def: WireBattleHero[],
  attacker: Record<string, unknown> | null,
  defender: Record<string, unknown> | null
): JsonSeat[] {
  const seats: JsonSeat[] = [];
  pushSeats(seats, attacker, atk, WIRE_BATTLE_CAMP_ALLY);
  pushSeats(seats, defender, def, WIRE_BATTLE_CAMP_ENEMY);
  return seats;
}

function pushSeats(seats: JsonSeat[], side: Record<string, unknown> | null, heroes: WireBattleHero[], camp: number): void {
  if (!side || !Array.isArray(side.heros)) return;
  for (let i = 0; i < side.heros.length && i < heroes.length; i++) {
    const row = asRecord(side.heros[i]);
    if (!row) continue;
    const unitId = finiteInt(row.unit_id);
    if (unitId === null) continue;
    seats.push({ unitId, pos: heroes[i].pos, camp });
  }
}

function jsonRound(value: unknown, seats: JsonSeat[]): WireBattleRound | null {
  const row = asRecord(value);
  if (!row) return null;
  const round: WireBattleRound = { index: finiteInt(row.round), actions: [], marks: [] };
  if (!Array.isArray(row.attack_info)) return round;
  for (let i = 0; i < row.attack_info.length; i++) {
    const action = jsonAttack(row.attack_info[i], seats);
    if (action) round.actions.push(action);
  }
  return round;
}

function jsonAttack(value: unknown, seats: JsonSeat[]): WireBattleAction | null {
  const row = asRecord(value);
  if (!row) return null;
  const unitId = finiteInt(row.unit_id);
  const seat = unitId === null ? null : findSeat(seats, unitId);
  const skill = asRecord(row.skill);
  const action: WireBattleAction = {
    atkPos: seat ? seat.pos : null,
    skillId: skill ? finiteInt(skill.skill_id) : null,
    camp: seat ? seat.camp : null,
    hits: [],
    marks: [],
  };
  if (skill && Array.isArray(skill.effect_info)) {
    for (let i = 0; i < skill.effect_info.length; i++) jsonHits(action, skill.effect_info[i], seats);
  }
  if (!actionHasBeat(action)) return null;
  return action;
}

function jsonHits(action: WireBattleAction, value: unknown, seats: JsonSeat[]): void {
  const effect = asRecord(value);
  if (!effect || !Array.isArray(effect.buff_info)) return;
  for (let i = 0; i < effect.buff_info.length; i++) {
    const buff = asRecord(effect.buff_info[i]);
    if (!buff) continue;
    const hurt = jsonHurt(buff.update);
    if (hurt === null) continue;
    const targetId = finiteInt(buff.target_unitId);
    const seat = targetId === null ? null : findSeat(seats, targetId);
    const hit: WireBattleHit = { defPos: seat ? seat.pos : null, hurt, hp: null, marks: [] };
    if (finiteInt(buff.hit) === 2) hit.marks.push({ field: 2, text: "暴击" });
    action.hits.push(hit);
  }
}

function jsonHurt(value: unknown): number | null {
  if (!Array.isArray(value)) return null;
  let hurt = 0;
  let seen = false;
  for (let i = 0; i < value.length; i++) {
    const row = asRecord(value[i]);
    if (!row) continue;
    const delta = finiteInt(row.value);
    if (delta === null || delta >= 0) continue;
    hurt += -delta;
    seen = true;
  }
  return seen ? hurt : null;
}

function findSeat(seats: JsonSeat[], unitId: number): JsonSeat | null {
  for (let i = 0; i < seats.length; i++) {
    if (seats[i].unitId === unitId) return seats[i];
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function finiteInt(value: unknown): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  return Math.floor(value);
}

function bytesToText(body: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-8").decode(body);
  let text = "";
  for (let i = 0; i < body.length; i++) text += String.fromCharCode(body[i]);
  return text;
}

function decodeRound(body: Uint8Array): WireBattleRound | null {
  const round: WireBattleRound = { index: null, actions: [], marks: [] };
  if (body.length === 0) return round;
  const fields = readRawFields(body);
  if (!fields) return null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 && row.kind === "varint" && typeof row.varint === "number") {
      round.index = row.varint;
      continue;
    }
    if (row.field === 2 && row.kind === "bytes" && row.bytes) {
      const action = decodeAction(row.bytes);
      if (action) {
        round.actions.push(action);
        continue;
      }
    }
    const mark = markOf(row);
    if (mark) round.marks.push(mark);
  }
  return round;
}

function decodeAction(body: Uint8Array): WireBattleAction | null {
  const action: WireBattleAction = { atkPos: null, skillId: null, camp: null, hits: [], marks: [] };
  if (body.length === 0) return action;
  const fields = readRawFields(body);
  if (!fields) return null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.kind === "varint" && typeof row.varint === "number") {
      if (row.field === 1) {
        action.atkPos = row.varint;
        continue;
      }
      if (row.field === 2) {
        action.skillId = row.varint;
        continue;
      }
      if (row.field === 4) {
        action.camp = row.varint;
        continue;
      }
    }
    if (row.field === 3 && row.kind === "bytes" && row.bytes) {
      const hit = decodeHit(row.bytes);
      if (hit) {
        action.hits.push(hit);
        continue;
      }
    }
    const mark = markOf(row);
    if (mark) action.marks.push(mark);
  }
  return action;
}

function decodeHit(body: Uint8Array): WireBattleHit | null {
  const hit: WireBattleHit = { defPos: null, hurt: null, hp: null, marks: [] };
  if (body.length === 0) return hit;
  const fields = readRawFields(body);
  if (!fields) return null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.kind === "varint" && typeof row.varint === "number") {
      if (row.field === 1) {
        hit.defPos = row.varint;
        continue;
      }
      if (row.field === 2) {
        hit.hurt = row.varint;
        continue;
      }
      if (row.field === 3) {
        hit.hp = row.varint;
        continue;
      }
    }
    const mark = markOf(row);
    if (mark) hit.marks.push(mark);
  }
  return hit;
}

function decodeHero(body: Uint8Array): WireBattleHero | null {
  const hero: WireBattleHero = { pos: null, heroId: null, hp: null, maxHp: null, marks: [] };
  if (body.length === 0) return hero;
  const fields = readRawFields(body);
  if (!fields) return null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.kind === "varint" && typeof row.varint === "number") {
      if (row.field === 1) {
        hero.pos = row.varint;
        continue;
      }
      if (row.field === 2) {
        hero.heroId = row.varint;
        continue;
      }
      if (row.field === 3) {
        hero.hp = row.varint;
        continue;
      }
      if (row.field === 4) {
        hero.maxHp = row.varint;
        continue;
      }
    }
    const mark = markOf(row);
    if (mark) hero.marks.push(mark);
  }
  return hero;
}

function emptyReport(): WireBattleReport {
  return {
    battleId: null,
    battleType: null,
    atkId: null,
    defId: null,
    winId: null,
    rounds: [],
    atkHeroes: [],
    defHeroes: [],
    marks: [],
  };
}

function joinMarks(line: string, marks: WireBattleMark[]): string {
  if (marks.length === 0) return line;
  const parts: string[] = [];
  const n = Math.min(marks.length, 6);
  for (let i = 0; i < n; i++) parts.push("字段" + marks[i].field + "=" + marks[i].text);
  if (marks.length > n) parts.push("其余 " + (marks.length - n) + " 项");
  return line + " / " + parts.join(" / ");
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function markOf(row: RawField): WireBattleMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1" };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)) };
  }
  if (row.kind === "bytes" && row.bytes) {
    if (row.bytes.length === 0) return { field: row.field, text: "空" };
    return { field: row.field, text: "包" + row.bytes.length };
  }
  return { field: row.field, text: "未解" };
}

function readRawFields(body: Uint8Array): RawField[] | null {
  const fields: RawField[] = [];
  let i = 0;
  while (i < body.length) {
    const key = readVarint(body, i);
    if (!key || key.overflow) return null;
    const field = key.value >>> 3;
    const wt = key.value & 7;
    i = key.next;
    if (field <= 0) return null;
    if (wt === 0) {
      const val = readVarint(body, i);
      if (!val) return null;
      if (val.overflow) fields.push({ field, kind: "varint" });
      else fields.push({ field, kind: "varint", varint: val.value });
      i = val.next;
      continue;
    }
    if (wt === 1) {
      if (i + 8 > body.length) return null;
      const fixed = readFixed(body, i, 8);
      i += 8;
      if (fixed.overflow) fields.push({ field, kind: "varint" });
      else fields.push({ field, kind: "varint", varint: fixed.value });
      continue;
    }
    if (wt === 5) {
      if (i + 4 > body.length) return null;
      const fixed = readFixed(body, i, 4);
      i += 4;
      if (fixed.overflow) fields.push({ field, kind: "varint" });
      else fields.push({ field, kind: "varint", varint: fixed.value });
      continue;
    }
    if (wt === 2) {
      const len = readVarint(body, i);
      if (!len || len.overflow) return null;
      i = len.next;
      if (len.value < 0 || i + len.value > body.length) return null;
      const blob = body.slice(i, i + len.value);
      i += len.value;
      fields.push({ field, kind: "bytes", bytes: blob });
      continue;
    }
    return null;
  }
  return fields;
}

function readFixed(body: Uint8Array, offset: number, size: number): { value: number; overflow: boolean } {
  let value = 0;
  for (let b = 0; b < size; b++) {
    const add = body[offset + b] * Math.pow(2, 8 * b);
    if (!Number.isSafeInteger(value + add)) return { value: 0, overflow: true };
    value += add;
  }
  return { value, overflow: false };
}

function readVarint(body: Uint8Array, offset: number): { value: number; next: number; overflow: boolean } | null {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (i < body.length && shift <= 63) {
    const b = body[i];
    i += 1;
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) {
      if (isProtoInt64Neg1(body, offset, i)) return { value: -1, next: i, overflow: false };
      if (!Number.isSafeInteger(value) || value < 0) return { value: 0, next: i, overflow: true };
      return { value, next: i, overflow: false };
    }
    shift += 7;
  }
  return null;
}

function isProtoInt64Neg1(body: Uint8Array, start: number, end: number): boolean {
  if (end - start !== 10) return false;
  for (let i = 0; i < 9; i++) {
    if (body[start + i] !== 0xff) return false;
  }
  return body[start + 9] === 0x01;
}
