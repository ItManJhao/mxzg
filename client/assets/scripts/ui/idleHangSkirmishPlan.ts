/**
 * 挂机演武的纯规则。不碰场景，也不发协议。
 * 日服挂机左右各前 4 后 4，大约 8 个站位。人在左、朝右，怪在右、朝左。
 * 下标是阵容 position（协议站位 1..8），不是把人按 0、1、2 挤进画面中间。
 * 不是 BattlePage battlePrefabLayout（那是左敌右我），也不是 c2s 3100 的写入格子。
 * 没有阵位时，三只默认英雄仍占阵位 1、4、5，只是这三格已经拉开，不再收进一小块。
 * jpHangHeroPosition 仍是日服原公式，给对照。画面上的点用 hangFormationPoint，不把全员夹进近列。
 */

/**
 * map01_F 高 1280、原点在画面中心。柱廊平台大约从 y=120 往上。
 * 我方和怪都站在棕色地砖上，不把怪放到柱廊上。
 */
export const IDLE_FLOOR_TOP = 120;

/** 日服挂机层。底左角，和项目设计分辨率同一套 640×1280。 */
export const HANG_LAYER_W = 640;
export const HANG_LAYER_H = 1280;

/**
 * 没有阵位时先占的三格，也是战报只有顺序下标时的三格。
 * 1 在前排最上，4 在前排最下，5 在后排最上。三格分开，不叠在画面中间。
 */
export const IDLE_HANG_DEFAULT_POSITIONS = [1, 4, 5] as const;

/** 一侧最多 8 人：前 4（位号 1–4）后 4（位号 5–8）。 */
export const HANG_CAST_LIMIT = 8;

/** 四行从高到低。最低一行的脚停在掉落堆图标之上。 */
const HANG_ROW_Y = [96, 28, -40, -108];
/** 前排离中线的距离。后排再往外，左右不再挤在中间。 */
const HANG_FRONT_X = 96;
const HANG_BACK_X = 230;
/** 没写阵位时按这个顺序补格，前三格仍是 1、4、5。 */
const HANG_FILL_ORDER = [1, 4, 5, 2, 3, 6, 7, 8];

export interface HangSpot {
  x: number;
  y: number;
  face: -1 | 1;
}

/**
 * 日服 BattleUtils.getHangHeroPosition。
 * index 是 heroSrcData.position。isMirror 为真是我方（左），为假是敌方（右）。
 * 返回层的底左角坐标，还不是画面中心。
 */
export function jpHangHeroPosition(
  index: number,
  layerWidth: number,
  layerHeight: number,
  isMirror: boolean
): { x: number; y: number } {
  const width = layerWidth > 0 && isFinite(layerWidth) ? layerWidth : 0;
  const height = layerHeight > 0 && isFinite(layerHeight) ? layerHeight : 0;
  const bgH = height * 0.9;
  const centerX = width * 0.5;
  const slot = wholeIndex(index);
  let offsetX = 0;
  let offsetY = 0;
  if (isMirror) {
    const baseX = width * 0.22;
    offsetX = -baseX * (1 + Math.floor(slot / 2)) * 1.1;
    if (slot > 1) offsetY = bgH * 0.2 * (slot % 2 === 0 ? 1 : -1);
  } else {
    const baseX = width * 0.1;
    offsetX = baseX + slot * (width * 0.15);
  }
  return {
    x: centerX + offsetX + (isMirror ? width * 0.2 : 0),
    y: bgH * 0.5 + offsetY - 20,
  };
}

/**
 * 阵位号落到挂机地砖。画面中心是原点。
 * 1–4 前排，5–8 后排，四行拉开。我方在左朝右，敌方是镜像、朝左。
 * 位号小于 1 时站前排第一行。超过 8 的号按 8 格循环，避免叠到中线。
 */
export function hangFormationPoint(position: number, ally: boolean): HangSpot {
  const slot = wholeIndex(position);
  const raw = slot < 1 ? 0 : (slot - 1) % HANG_CAST_LIMIT;
  const row = raw % HANG_ROW_Y.length;
  const lane = raw < 4 ? HANG_FRONT_X : HANG_BACK_X;
  const stagger = (row - 1.5) * 16;
  const dir = ally ? -1 : 1;
  const x = Math.round(dir * lane + dir * stagger * 0.35);
  const y = HANG_ROW_Y[row];
  return { x, y, face: ally ? 1 : -1 };
}

/** 我方脚点。人朝右，x 为负。 */
export function hangAllyFloorPoint(position: number): HangSpot {
  return hangFormationPoint(position, true);
}

/** 敌方脚点。怪朝左，x 为正，和我方同一行同一列距。 */
export function hangEnemyFloorPoint(position: number): HangSpot {
  return hangFormationPoint(position, false);
}

/**
 * 阵位号原样用。没有阵位时按 1、4、5、2、3、6、7、8 补，避开已经占了的号。
 * 前三只仍是 1、4、5。used 由调用方带着，避免两只人叠在同一格。
 */
export function hangLinePosition(position: number | null, order: number, used: number[]): number {
  if (typeof position === "number" && isFinite(position) && position >= 1) {
    const n = Math.floor(position);
    used.push(n);
    return n;
  }
  const start = isFinite(order) && order >= 0 ? Math.floor(order) : 0;
  for (let step = 0; step < HANG_FILL_ORDER.length; step++) {
    const candidate = HANG_FILL_ORDER[(start + step) % HANG_FILL_ORDER.length];
    if (used.indexOf(candidate) < 0) {
      used.push(candidate);
      return candidate;
    }
  }
  let extra = HANG_FILL_ORDER.length + 1;
  while (used.indexOf(extra) >= 0) extra += 1;
  used.push(extra);
  return extra;
}

/** 默认三格：阵位 1、4、5。战报条只有顺序下标时也站这三格。 */
export const IDLE_HANG_SPOTS: ReadonlyArray<HangSpot> = [
  hangAllyFloorPoint(IDLE_HANG_DEFAULT_POSITIONS[0]),
  hangAllyFloorPoint(IDLE_HANG_DEFAULT_POSITIONS[1]),
  hangAllyFloorPoint(IDLE_HANG_DEFAULT_POSITIONS[2]),
];

/** 右侧前 4 后 4。都朝左对着我方。入场从格子再往右滑进来。 */
export const IDLE_SKIRMISH_SPOTS: ReadonlyArray<HangSpot> = hangEnemySpots();

/**
 * 演武条和战报格子只有顺序下标。我方 0、1、2 是默认阵位 1、4、5，不是 BattlePage 槽，也不是把下标当成阵位号。
 * 知道阵位号时用 hangAllyFloorPoint。敌方下标是右侧八格。
 */
export function hangStandPoint(side: "ally" | "enemy", index: number): HangSpot {
  const spots = side === "enemy" ? IDLE_SKIRMISH_SPOTS : IDLE_HANG_SPOTS;
  const i = index < 0 || !isFinite(index) ? 0 : Math.floor(index);
  const n = i % spots.length;
  return spots[n < 0 ? n + spots.length : n];
}

/**
 * 窄屏按 Fit Height 裁掉 640 左右两边。远列按 640 摆时会再被裁一截。
 * 返回整列要右移的距离。宽屏和正好 640 不挪，避免把左列拉到中线。
 * 9:16 的可视宽仍约 720，大于设计宽，也不挪。
 */
export function hangAllyVisibleShift(layerWidth: number): number {
  const width = layerWidth > 0 && isFinite(layerWidth) ? layerWidth : HANG_LAYER_W;
  if (width >= HANG_LAYER_W - 0.5) return 0;
  return (HANG_LAYER_W - width) / 2;
}

function hangEnemySpots(): HangSpot[] {
  const spots: HangSpot[] = [];
  for (let position = 1; position <= HANG_CAST_LIMIT; position++) spots.push(hangEnemyFloorPoint(position));
  return spots;
}

function wholeIndex(index: number): number {
  if (!isFinite(index)) return 0;
  return Math.floor(index);
}

/** 站位都在地砖上沿以下。柱廊上的 y 不算。 */
export function idleSpotsOnFloor(spots: ReadonlyArray<{ y: number }>): boolean {
  if (!spots || spots.length === 0) return false;
  for (let i = 0; i < spots.length; i++) {
    if (spots[i].y > IDLE_FLOOR_TOP) return false;
  }
  return true;
}

/** 行军时大理石每秒往左。天更慢。只走水平，不抬高，也不在段尾弹回。 */
export const IDLE_HALL_SCROLL_PX = 28;
export const IDLE_SKY_SCROLL_PX = 10;
/** 这一段跑完才遇怪。遇怪时停。 */
export const IDLE_MARCH_MS = 1400;
/** 怪从格子右侧滑进格子。 */
export const IDLE_FOE_ENTER_MS = 640;
export const IDLE_FOE_ENTER_FROM = 460;

/**
 * 行军阶段的循环偏移。时间一直涨，在宽度内折返，不会滑一段再回到原点。
 * 返回负值：图层往左走。没有 y。
 */
export function idleHangLoopOffset(elapsedMs: number, width: number, pxPerSec: number): number {
  const w = width >= 1 ? width : 1;
  const speed = pxPerSec > 0 ? pxPerSec : 0;
  let ms = elapsedMs;
  if (!isFinite(ms) || ms <= 0 || speed === 0) return 0;
  const dist = (ms / 1000) * speed;
  if (!isFinite(dist) || dist <= 0) return 0;
  let wrapped = dist % w;
  if (wrapped < 0) wrapped += w;
  if (wrapped === 0) return 0;
  return -wrapped;
}

/** 怪入场的 x。t 从 0 到 1，从格子右侧滑到格子。y 由调用方保持格子的 y。 */
export function idleFoeEnterX(slotX: number, t: number): number {
  let u = t;
  if (!isFinite(u) || u < 0) u = 0;
  if (u > 1) u = 1;
  const start = slotX + IDLE_FOE_ENTER_FROM;
  return Math.round(start + (slotX - start) * u);
}

/** 怪已经显示才允许出刀。看不见人时不许打空。 */
export function idleSkirmishMayStrike(foeVisible: boolean): boolean {
  return foeVisible === true;
}

/** 奇数刀用 attack2，套里没有再退回 attack。 */
export function idleSkirmishSwingClip(index: number): "attack" | "attack2" {
  return Math.floor(index) % 2 === 1 ? "attack2" : "attack";
}

/** 和 WIRE_SPINE_ENEMY_STEMS 同一组。表里的怪对不上 stand 时用。 */
export const IDLE_SKIRMISH_FALLBACK_STEMS = ["10405006", "10405007", "10505010"];

export const IDLE_SKIRMISH_OPEN_MS = 480;
export const IDLE_SKIRMISH_APPEAR_MS = 720;
export const IDLE_SKIRMISH_STRIKE_MS = 680;
export const IDLE_SKIRMISH_KILL_MS = 760;
export const IDLE_SKIRMISH_GAP_MS = 560;
/** 只有一名英雄时也打两下，避免一刀就把怪收掉。 */
export const IDLE_SKIRMISH_HITS = 2;

export interface IdleFoePlan {
  stem: string;
  spot: number;
  face: -1 | 1;
  /** 表里的 hp。没有就 null，飘字改用演出数字。 */
  maxHp: number | null;
}

/** 当前关。Mock 关号只在已经是 Mock 时用。真服用 3007，都没有就是 1。 */
export function idleSkirmishStageIdx(mockStage: number | null, nowIdx: number | null, maxIdx: number | null): number {
  if (mockStage !== null && mockStage >= 1) return Math.floor(mockStage);
  if (nowIdx !== null && nowIdx >= 1) return Math.floor(nowIdx);
  if (maxIdx !== null && maxIdx >= 1) return Math.floor(maxIdx);
  return 1;
}

/** 有几名英雄就打几下，至少 IDLE_SKIRMISH_HITS 下。没有英雄时仍按最少下数分血。 */
export function idleSkirmishSwings(allyCount: number): number {
  if (allyCount >= IDLE_SKIRMISH_HITS) return Math.floor(allyCount);
  return IDLE_SKIRMISH_HITS;
}

/**
 * 把这一只的血分到每一刀。最后一刀把剩下的打完，并标记击杀。
 * 没有 hp 时用固定演出数字，仍是最后一刀击杀。不掷随机数。
 */
export function idleSkirmishHurt(maxHp: number | null, hitIndex: number, hits: number): { hurt: number; kill: boolean } {
  const n = hits >= 1 ? Math.floor(hits) : 1;
  let index = Math.floor(hitIndex);
  if (index < 0) index = 0;
  if (index >= n) index = n - 1;
  const kill = index === n - 1;
  if (maxHp === null || !isFinite(maxHp) || maxHp <= 0) {
    return { hurt: 48 + index * 16, kill };
  }
  const total = Math.floor(maxHp);
  const each = Math.max(1, Math.floor(total / n));
  const hurt = kill ? total - each * (n - 1) : each;
  return { hurt: hurt > 0 ? hurt : 1, kill };
}

/** 有 die 播倒地，否则有 hit 播受击，再没有就站着被收掉。 */
export function idleSkirmishKillClip(stem: string, hasClip: (name: string, clip: "die" | "hit" | "stand") => boolean): "die" | "hit" | "stand" {
  if (hasClip(stem, "die")) return "die";
  if (hasClip(stem, "hit")) return "hit";
  return "stand";
}

function usableIdleFoes(
  monsters: { heroType: number; hp: number | null }[],
  hasStand: (stem: string) => boolean
): { stem: string; hp: number | null }[] {
  const usable: { stem: string; hp: number | null }[] = [];
  for (let i = 0; i < monsters.length; i++) {
    const type = monsters[i].heroType;
    if (typeof type !== "number" || !isFinite(type) || type <= 0) continue;
    const stem = String(Math.floor(type));
    if (!hasStand(stem)) continue;
    let seen = false;
    for (let j = 0; j < usable.length; j++) {
      if (usable[j].stem === stem) seen = true;
    }
    if (seen) continue;
    const hp = monsters[i].hp;
    usable.push({ stem, hp: typeof hp === "number" && isFinite(hp) && hp > 0 ? Math.floor(hp) : null });
  }
  return usable;
}

/**
 * 当前关有 stand 的怪优先，按波次轮换。
 * 一只都对不上就用 fallback，仍按波次换格子。
 */
export function planIdleFoe(
  wave: number,
  monsters: { heroType: number; hp: number | null }[],
  hasStand: (stem: string) => boolean,
  fallback: readonly string[]
): IdleFoePlan {
  const turn = wave >= 0 ? Math.floor(wave) : 0;
  const spot = IDLE_SKIRMISH_SPOTS[turn % IDLE_SKIRMISH_SPOTS.length];
  const usable = usableIdleFoes(monsters, hasStand);
  if (usable.length > 0) {
    const row = usable[turn % usable.length];
    return { stem: row.stem, spot: turn % IDLE_SKIRMISH_SPOTS.length, face: spot.face, maxHp: row.hp };
  }
  const pool = fallback.length > 0 ? fallback : IDLE_SKIRMISH_FALLBACK_STEMS;
  return {
    stem: pool[turn % pool.length],
    spot: turn % IDLE_SKIRMISH_SPOTS.length,
    face: spot.face,
    maxHp: null,
  };
}

/**
 * 这一波同时上场的怪。有几只能站的就上几只，最多八个格子。
 * 不按死亡再补下一只。表里一只就一只。一只都没有就用 fallback 的第一只，站 0 号格。
 */
export function planIdleWave(
  monsters: { heroType: number; hp: number | null }[],
  hasStand: (stem: string) => boolean,
  fallback: readonly string[]
): IdleFoePlan[] {
  const usable = usableIdleFoes(monsters, hasStand);
  if (usable.length === 0) {
    const one = planIdleFoe(0, monsters, hasStand, fallback);
    const spot = IDLE_SKIRMISH_SPOTS[0];
    return [{ stem: one.stem, spot: 0, face: spot.face, maxHp: null }];
  }
  const n = usable.length < IDLE_SKIRMISH_SPOTS.length ? usable.length : IDLE_SKIRMISH_SPOTS.length;
  const plans: IdleFoePlan[] = [];
  for (let i = 0; i < n; i++) {
    const spot = IDLE_SKIRMISH_SPOTS[i];
    plans.push({ stem: usable[i].stem, spot: i, face: spot.face, maxHp: usable[i].hp });
  }
  return plans;
}

export interface HangFightMonster {
  heroType: number;
  hp: number | null;
  name: string;
}

export interface HangFightReportHero {
  heroId: number | null;
  hp: number | null;
  maxHp: number | null;
}

export interface HangFightFoe {
  stem: string;
  spot: number;
  face: -1 | 1;
  maxHp: number | null;
  name: string;
}

export interface HangFightLine {
  stageId: number | null;
  source: "report" | "chapter" | "none";
  reason: string;
  foes: HangFightFoe[];
}

/**
 * 开战用的关卡号，和 chapter.note、chapterreward.idx 同一套。
 * 真服两个 idx 都没有时返回 null，不用第 1 关冒充未同步。
 * max_idx 是 RoleMission.chapterId，服打的是 chapterId+1。出现的 0 仍是 0，进战是 1。
 * 有 nowIdx（≥1）时仍用它。Mock 没有关号时仍是 1。
 */
export function hangFightStageId(
  mockStage: number | null,
  nowIdx: number | null,
  maxIdx: number | null,
  wire: boolean
): number | null {
  if (!wire && mockStage !== null && mockStage >= 1) return Math.floor(mockStage);
  if (nowIdx !== null && nowIdx >= 1) return Math.floor(nowIdx);
  if (maxIdx !== null && maxIdx >= 0) return Math.floor(maxIdx) + 1;
  if (nowIdx === 0) return 1;
  if (wire) return null;
  return 1;
}

/**
 * 出场光盖在这一侧模型身上。脚在站位上，光心抬到身体。
 * 没有模型返回 null，调用方不播这一侧。不是森林 LayerAppear 的 (±180, 0)。
 */
export const HANG_APPEAR_BODY = 40;

export function hangAppearAnchor(points: ReadonlyArray<{ x: number; y: number }>): { x: number; y: number } | null {
  if (!points || points.length === 0) return null;
  let x = 0;
  let y = 0;
  let n = 0;
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    if (!isFinite(point.x) || !isFinite(point.y)) continue;
    x += point.x;
    y += point.y;
    n += 1;
  }
  if (n === 0) return null;
  return { x: Math.round(x / n), y: Math.round(y / n) + HANG_APPEAR_BODY };
}

/**
 * 开战右侧的怪。战报守方优先，对不上 stand 再读 chapter。
 * 不补演武 fallback，也不补默认三套。空表、未同步、没有 stand 都留空，调用方打日志。
 */
export function planHangFightLine(
  stageId: number | null,
  monsters: HangFightMonster[],
  hasStand: (stem: string) => boolean,
  reportHeroes: HangFightReportHero[] | null
): HangFightLine {
  const fromReport = foesFromReport(reportHeroes, hasStand);
  if (fromReport.foes.length > 0) {
    return { stageId, source: "report", reason: fromReport.reason, foes: fromReport.foes };
  }
  const prefix = fromReport.reason ? fromReport.reason + "，" : "";
  if (stageId === null) {
    return { stageId: null, source: "none", reason: prefix + "主线未同步", foes: [] };
  }
  const rows = monsters || [];
  if (rows.length === 0) {
    return { stageId, source: "none", reason: prefix + "第" + stageId + "关守方表是空的", foes: [] };
  }
  const missed: string[] = [];
  const foes: HangFightFoe[] = [];
  for (let i = 0; i < rows.length && foes.length < IDLE_SKIRMISH_SPOTS.length; i++) {
    const row = rows[i];
    const type = row.heroType;
    if (typeof type !== "number" || !isFinite(type) || type <= 0) continue;
    const stem = String(Math.floor(type));
    if (!hasStand(stem)) {
      missed.push(stem);
      continue;
    }
    const spot = IDLE_SKIRMISH_SPOTS[foes.length];
    const hp = row.hp;
    foes.push({
      stem,
      spot: foes.length,
      face: spot.face,
      maxHp: typeof hp === "number" && isFinite(hp) && hp > 0 ? Math.floor(hp) : null,
      name: row.name || "类型 " + stem,
    });
  }
  if (foes.length === 0) {
    const tail = missed.length > 0 ? "守方没有 stand " + missed.join(",") : "守方没有可用类型";
    return { stageId, source: "none", reason: prefix + "第" + stageId + "关" + tail, foes: [] };
  }
  const names: string[] = [];
  for (let i = 0; i < foes.length; i++) names.push(foes[i].stem);
  return {
    stageId,
    source: "chapter",
    reason: prefix + "第" + stageId + "关 " + names.join(","),
    foes,
  };
}

function foesFromReport(
  heroes: HangFightReportHero[] | null,
  hasStand: (stem: string) => boolean
): { reason: string; foes: HangFightFoe[] } {
  if (!heroes) return { reason: "", foes: [] };
  if (heroes.length === 0) return { reason: "战报没有守方", foes: [] };
  const missed: string[] = [];
  const foes: HangFightFoe[] = [];
  for (let i = 0; i < heroes.length && foes.length < IDLE_SKIRMISH_SPOTS.length; i++) {
    const hero = heroes[i];
    const id = hero.heroId;
    if (typeof id !== "number" || !isFinite(id) || id <= 0) continue;
    const stem = String(Math.floor(id));
    if (!hasStand(stem)) {
      missed.push(stem);
      continue;
    }
    const spot = IDLE_SKIRMISH_SPOTS[foes.length];
    const maxHp = hero.maxHp;
    const hp = hero.hp;
    const shown = typeof maxHp === "number" && isFinite(maxHp) && maxHp > 0 ? Math.floor(maxHp) : typeof hp === "number" && isFinite(hp) && hp > 0 ? Math.floor(hp) : null;
    foes.push({
      stem,
      spot: foes.length,
      face: spot.face,
      maxHp: shown,
      name: "类型 " + stem,
    });
  }
  if (foes.length === 0) {
    const tail = missed.length > 0 ? missed.join(",") : "没有 hero_id";
    return { reason: "战报守方对不上 stand " + tail, foes: [] };
  }
  const names: string[] = [];
  for (let i = 0; i < foes.length; i++) names.push(foes[i].stem);
  return { reason: "战报守方 " + names.join(","), foes };
}
