import { findServer } from "./servers";

/** Mock 登录结果。模块单例，切场景后仍在（不挂节点）。 */
export interface MockRole {
  roleId: number;
  name: string;
  level: number;
}

/** mock：钱包和关卡来自 Mock。wire：顶栏只写 s2c 2001 里解开的格子，没写到的仍是未同步。 */
export type SessionSource = "mock" | "wire";

export class Session {
  static account = "";
  static token = "";
  /** 选服。登录显示本机桥。 */
  static serverId = findServer(1).id;
  static serverName = findServer(1).name;
  static role: MockRole | null = null;
  /** 开服自然日。来自 Mock 的 role.enter；缺省第 1 天。真服不从 s2c 2001 字段 16 推这一天。 */
  static openDay = 1;
  /**
   * 下一关。Mock 主城「主线」用它发 stage.enter。
   * 真服按钮不读这里：s2c 3007 的 now_idx / max_idx 记在 WireSession，不写进这一格。
   */
  static stageId = 1;
  /** Mock 钱包。道具 id 1 金币、id 2 钻石。没进角色时是 0。wire 在对应标记为真之前，界面写未同步，不读这里的 0。 */
  static gold = 0;
  static diamond = 0;
  static source: SessionSource = "mock";
  /**
   * 真服顶栏哪些格子已经从 s2c 2001 写过。
   * 角色名是字段 9，等级是字段 6，金币是字段 2，钻石是字段 1（宝石）。
   * 缺字段保持 false。字段 5 是奖杯，不进金币。开服天不在这里。
   */
  static wireSync = { name: false, level: false, gold: false, diamond: false };

  static setServer(id: number): void {
    const server = findServer(id);
    this.serverId = server.id;
    this.serverName = server.name;
  }

  /** Boot 在 Mock 的 role.enter 成功后写入。缺金币钻石时记 0，避免沿用上一个号。 */
  static applyEnter(role: {
    roleId: number;
    name: string;
    level: number;
    openDay?: number;
    stageId?: number;
    gold?: number;
    diamond?: number;
  }): void {
    this.role = { roleId: role.roleId, name: role.name, level: role.level };
    this.openDay = typeof role.openDay === "number" && role.openDay >= 1 ? role.openDay : 1;
    this.stageId = typeof role.stageId === "number" && role.stageId >= 1 ? role.stageId : 1;
    this.gold = nonNegativeInt(role.gold);
    this.diamond = nonNegativeInt(role.diamond);
    this.source = "mock";
    this.clearWireSync();
  }

  /**
   * 真服 s2c 1001 有角色 id 时写入。
   * 不填 Mock 起步金币 100 / 钻石 20。等级、金币、钻石等 s2c 2001，没到之前界面上标成未同步。
   * name 只有创角面板刚提交的名字。s2c 1001 没有角色名，名字等 s2c 2001 字段 9。
   */
  static applyWireRole(input: { account: string; serverId: number; roleId: number; name?: string | null }): void {
    this.account = input.account;
    this.setServer(input.serverId);
    this.token = "";
    const typed = (input.name || "").trim();
    this.role = {
      roleId: input.roleId,
      name: typed || "角色 " + input.roleId,
      level: 1,
    };
    this.openDay = 1;
    this.stageId = 1;
    this.gold = 0;
    this.diamond = 0;
    this.source = "wire";
    this.clearWireSync();
  }

  /**
   * 真服同步包里已经能确定的顶栏格子。没进 wire 角色时不改。
   * 调用方不要把 Mock 的 100 / 20 传进来。没出现的字段传 null，不要补 0。
   * 金币和钻石的 0 是服上的 0，要传 0。等级至少 1。
   */
  static applyWireSync(patch: {
    name?: string | null;
    level?: number | null;
    gold?: number | null;
    diamond?: number | null;
  }): boolean {
    if (this.source !== "wire" || !this.role) return false;
    if (typeof patch.name === "string") {
      const name = patch.name.trim();
      if (name) {
        this.role.name = name;
        this.wireSync.name = true;
      }
    }
    if (typeof patch.level === "number" && isFinite(patch.level) && patch.level >= 1) {
      this.role.level = Math.floor(patch.level);
      this.wireSync.level = true;
    }
    if (typeof patch.gold === "number" && isFinite(patch.gold) && patch.gold >= 0) {
      this.gold = Math.floor(patch.gold);
      this.wireSync.gold = true;
    }
    if (typeof patch.diamond === "number" && isFinite(patch.diamond) && patch.diamond >= 0) {
      this.diamond = Math.floor(patch.diamond);
      this.wireSync.diamond = true;
    }
    return true;
  }

  static applyCurrencies(gold?: number, diamond?: number): void {
    if (typeof gold === "number" && isFinite(gold)) this.gold = nonNegativeInt(gold);
    if (typeof diamond === "number" && isFinite(diamond)) this.diamond = nonNegativeInt(diamond);
  }

  private static clearWireSync(): void {
    this.wireSync.name = false;
    this.wireSync.level = false;
    this.wireSync.gold = false;
    this.wireSync.diamond = false;
  }
}

function nonNegativeInt(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/** 主城顶栏左侧第一行：角色名和等级。真服只有同步过等级才写 Lv，不把占位 1 显示出来。 */
export function formatNameLine(): string {
  if (!Session.account) return "未登录";
  const name = Session.role?.name || "未命名";
  if (Session.source === "wire") {
    if (Session.wireSync.level && Session.role) return name + " Lv" + Session.role.level;
    return name;
  }
  const level = Session.role?.level ?? 1;
  return name + " Lv" + level;
}

/**
 * 日志和创角条上的服名。
 * 登录和日志都写「本机桥」。不把选服画成离线服。
 * 不改 source，也不改服表。
 */
export function formatServerLabel(wire = Session.source === "wire"): string {
  if (wire) return "本机桥";
  return Session.serverName || "未选服";
}

/** 顶栏左侧第二行：服务器和开服自然日。真服开服天仍未同步，这里只写角色 id。 */
export function formatSubLine(): string {
  if (!Session.account) return "请从 Boot 进入";
  if (Session.source === "wire") {
    const id = Session.role ? String(Session.role.roleId) : "?";
    return "真服 · 角色 " + id;
  }
  const server = Session.serverName || "未选服";
  const day = Session.openDay >= 1 ? Session.openDay : 1;
  return server + " · 开服D" + day;
}

export function formatGoldLine(): string {
  if (Session.source === "wire" && !Session.wireSync.gold) return "金币 未同步";
  return "金币 " + Session.gold;
}

export function formatDiamondLine(): string {
  if (Session.source === "wire" && !Session.wireSync.diamond) return "钻石 未同步";
  return "钻石 " + Session.diamond;
}

/** 头像下的等级徽。真服没同步等级时不写占位 1。 */
export function formatLevelBadge(): string {
  if (!Session.role) return "";
  if (Session.source === "wire" && !Session.wireSync.level) return "";
  const level = Session.role.level;
  if (typeof level !== "number" || !isFinite(level) || level < 1) return "";
  return String(Math.floor(level));
}

/** 主城标题下那一行：角色名、等级、所选服务器。 */
export function formatHubIdentity(): string {
  if (!Session.account) return "未登录（请从 Boot 进入）";
  const name = Session.role?.name || "未命名";
  if (Session.source === "wire") {
    if (Session.wireSync.level && Session.role) return name + " Lv" + Session.role.level + " · 真服";
    return name + " · 真服";
  }
  const level = Session.role?.level ?? 1;
  const server = Session.serverName || "未选服";
  return name + " Lv" + level + " · " + server;
}
