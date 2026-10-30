/**
 * 保留的核心旧页面壳对照。纯数据，不加载资源。
 * 计划外壳已清理，新增项必须登记 tools/prefab-plan.json 并通过 prefab-plan 检查。
 */

export const USE_PAGE_PREFAB_SHELL = true;

/**
 * 主线壳先是挂机站场，底钮仍是 BattlePanelLayer。
 * 「战斗」才交给已经写好的挑战，不另发协议。不是一点底栏就进森林 BattlePage。
 */
export const PAGE_SHELL_FIGHT = "mxzg-shell-fight";

export interface PagePrefabShellSpec {
  /** 相对 assets，无扩展名。 */
  path: string;
  /** true：btn_battle 触发 PAGE_SHELL_FIGHT。 */
  fight: boolean;
}

function shell(path: string, fight = false): PagePrefabShellSpec {
  return { path, fight };
}

/**
 * 键是 PanelNav / 建筑 atom 的页面 id。
 * 没有路由的建筑仍走原来的占位页，壳盖在占位页上。
 */
export const PAGE_PREFAB_SHELLS: { [id: string]: PagePrefabShellSpec } = {
  mainline: shell("prefabs/ui/battle/BattlePanelLayer", true),
  hero: shell("prefabs/ui/hero/HeroListLayer"),
  "hero-detail": shell("prefabs/ui/hero/HeroInfoLayer"),
  summon: shell("prefabs/ui/summon/SummonLayer"),
  bag: shell("prefabs/ui/backpack/BackpackLayer"),
  mail: shell("prefabs/ui/mail/MailLayer"),
  idle: shell("prefabs/ui/quick-battle/QuickBattleLayer"),
};

export function pagePrefabShell(id: string): PagePrefabShellSpec | null {
  return PAGE_PREFAB_SHELLS[id] || null;
}

/** 这些状态留在登录壳上，不弹出 ErrorLayer。 */
const P1_PROGRESS_PREFIXES = [
  "账号",
  "正在",
  "打开后",
  "进入主城",
  "连接 Mock",
  "准备",
  "已打开",
  "已改走",
  "加载",
  "点进入",
  "请稍候",
  "登录回包",
  "创角回包",
];

export function isP1ProgressStatus(text: string): boolean {
  if (!text) return true;
  for (let i = 0; i < P1_PROGRESS_PREFIXES.length; i++) {
    if (text.indexOf(P1_PROGRESS_PREFIXES[i]) === 0) return true;
  }
  return false;
}
