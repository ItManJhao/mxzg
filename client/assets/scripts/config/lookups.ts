/**
 * Boot 读完 JSON 后登记的展示查找。没登记时调用方保持原来的常量或帧名。
 * 不读 xlsx。战报里的 hp 不从这里改写。
 */

const skillNames = new Map<number, string>();
const skillDelays = new Map<number, number>();
const heroHp = new Map<string, number>();

export function clearConfigLookups(): void {
  skillNames.clear();
  skillDelays.clear();
  heroHp.clear();
}

export function setSkillDisplayName(skillId: number, name: string): void {
  const id = whole(skillId);
  const text = (name || "").trim();
  if (id === null || !text) return;
  skillNames.set(id, text);
}

export function skillDisplayName(skillId: number): string | null {
  const id = whole(skillId);
  if (id === null) return null;
  return skillNames.get(id) ?? null;
}

export function setSkillCastDelay(skillId: number, delayMs: number): void {
  const id = whole(skillId);
  if (id === null || typeof delayMs !== "number" || !isFinite(delayMs) || delayMs <= 0) return;
  skillDelays.set(id, Math.floor(delayMs));
}

export function skillCastDelay(skillId: number): number {
  const id = whole(skillId);
  if (id === null) return 0;
  return skillDelays.get(id) ?? 0;
}

export function setHeroBaseHp(heroType: number, star: number, hp: number): void {
  const type = whole(heroType);
  const starN = whole(star);
  if (type === null || starN === null || typeof hp !== "number" || !isFinite(hp) || hp <= 0) return;
  heroHp.set(type + ":" + starN, Math.floor(hp));
}

export function heroBaseHp(heroType: number, star: number): number | null {
  const type = whole(heroType);
  const starN = whole(star);
  if (type === null || starN === null) return null;
  const hp = heroHp.get(type + ":" + starN);
  return typeof hp === "number" ? hp : null;
}

function whole(value: number): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  return Math.floor(value);
}
