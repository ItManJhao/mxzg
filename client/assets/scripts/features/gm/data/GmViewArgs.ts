/**
 * GM 窗口共享的打开参数：应用提供唯一控制器及只读测试动作，菜单只转交明确参数。
 * 不保存账号、资产或请求状态，幂等与回执仍由 GmController 管理。
 */
import type { GmController } from "../GmController";

/** 总菜单需要的当前角色和应用测试能力。 */
export interface GmOpenArgs {
    /** 应用装配的唯一 GM 控制器，各子窗共用。 */
    controller: GmController;
    /** 显示在总菜单上的当前角色 ID。 */
    roleId: string;
    /** 当前测试角色显示名称。 */
    nickname: string;
    /** 打开工具窗时读取最新角色等级，尚未同步时为空。 */
    readRoleLevel?: () => number | undefined;
    /** 打开现有技能验收窗口，准备成功兑现，失败保留原因。 */
    openSkillAudit?: () => Promise<void>;
    /** 从当前试战子窗请求指定关卡，开播前由该次开窗判断能否继续显示。 */
    openLineupBattle?: GmBattleArgs["openLineupBattle"];
}

/** 每次发放窗口只处理一个类别，不维护隐藏的分类页签。 */
export interface GmGrantArgs {
    /** 与菜单共享的控制器，保存未确认请求的幂等键。 */
    controller: GmController;
    /** 显示在发放窗口上的当前角色 ID；发放使用已认证连接。 */
    roleId: string;
    /** 当前角色说明使用的名称。 */
    nickname: string;
    /** 从菜单固定选择的英雄或道具发放类型。 */
    kind: "hero" | "item";
}

/** 阵容试战只接收角色说明和应用动作，不持有发放能力。 */
export interface GmBattleArgs {
    /** 当前测试角色名称，仅用于说明。 */
    nickname: string;
    /** 等待只读战场打开；stillOpen 只在发起点击的这一轮窗口展示期间为真。 */
    openLineupBattle: (mission: number, stillOpen: () => boolean) => Promise<void>;
}

/** 角色与时间窗口只接收认证通道和当前角色说明。 */
export type GmToolsArgs = Pick<GmOpenArgs, "controller" | "nickname" | "readRoleLevel">;
