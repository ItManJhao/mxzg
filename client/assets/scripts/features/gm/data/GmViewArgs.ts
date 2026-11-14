/**
 * GM 窗口共享的打开参数：应用提供唯一控制器及只读测试动作，菜单只转交明确参数。
 * 不保存账号、资产或请求状态，幂等与回执仍由 GmController 管理。
 */
import type { GmController } from "../GmController";

/** 总菜单需要的当前角色和应用测试能力。 */
export interface GmOpenArgs {
    /** 应用装配的唯一发放控制器，所有发放子窗共用。 */
    controller: GmController;
    /** 当前测试角色的持久 ID，原样交给控制器。 */
    roleId: string;
    /** 当前测试角色显示名称。 */
    nickname: string;
    /** 打开现有技能验收窗口，准备成功兑现，失败保留原因。 */
    openSkillAudit?: () => Promise<void>;
    /** 请求并播放指定关卡的只读阵容演示，不推进或发放。 */
    openLineupBattle?: (mission: number) => Promise<void>;
}

/** 每次发放窗口只处理一个类别，不维护隐藏的分类页签。 */
export interface GmGrantArgs {
    /** 与菜单共享的控制器，保存未确认请求的幂等键。 */
    controller: GmController;
    /** 当前测试角色的持久 ID。 */
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
    /** 请求指定关卡的当前阵容演示；完成时返回准备结果，失败不吞错。 */
    openLineupBattle: (mission: number) => Promise<void>;
}
