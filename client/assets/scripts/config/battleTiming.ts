/**
 * 战斗节奏的表覆盖。没读表时保持原来的 70ms 帧步，加速和跳过不设等级门槛。
 * effect2.eff_battle_start 的 speed 单位是 0.01 秒，读到之后才改帧步。
 * system.battle_speed_level / battle_skip_level 只在真服回放里拦按钮。
 * battletype.round_max 是回合上限，不是毫秒。不拿它裁掉服已经下发的回合。
 */

const DEFAULT_FRAME_STEP_MS = 70;

let frameStepMs = DEFAULT_FRAME_STEP_MS;
let speedUnlockLevel = 0;
let skipUnlockLevel = 0;
const roundMax = new Map<number, number>();

export function battleFrameStepMs(): number {
  return frameStepMs;
}

/** 小于 24 的值丢掉，避免帧步收成 0。 */
export function setBattleFrameStepMs(ms: number): void {
  if (typeof ms !== "number" || !isFinite(ms) || ms < 24) return;
  frameStepMs = Math.floor(ms);
}

export function setBattleUnlockLevels(speedLevel: number, skipLevel: number): void {
  speedUnlockLevel = positiveLevel(speedLevel);
  skipUnlockLevel = positiveLevel(skipLevel);
}

export function battleSpeedUnlockLevel(): number {
  return speedUnlockLevel;
}

export function battleSkipUnlockLevel(): number {
  return skipUnlockLevel;
}

/** 0 表示表还没读到，不拦。 */
export function battleSpeedUnlocked(level: number): boolean {
  if (speedUnlockLevel <= 0) return true;
  return finiteLevel(level) >= speedUnlockLevel;
}

export function battleSkipUnlocked(level: number): boolean {
  if (skipUnlockLevel <= 0) return true;
  return finiteLevel(level) >= skipUnlockLevel;
}

export function setBattleRoundMax(battleType: number, rounds: number): void {
  if (typeof battleType !== "number" || !isFinite(battleType)) return;
  if (typeof rounds !== "number" || !isFinite(rounds) || rounds < 1) return;
  roundMax.set(Math.floor(battleType), Math.floor(rounds));
}

export function battleRoundMax(battleType: number): number | null {
  if (typeof battleType !== "number" || !isFinite(battleType)) return null;
  const value = roundMax.get(Math.floor(battleType));
  return typeof value === "number" ? value : null;
}

function positiveLevel(value: number): number {
  if (typeof value !== "number" || !isFinite(value) || value < 1) return 0;
  return Math.floor(value);
}

function finiteLevel(value: number): number {
  if (typeof value !== "number" || !isFinite(value)) return 1;
  return Math.floor(value);
}
