/** VIP 统一快照的只读数据契约。任务进度与领取结果由服务端计算。 */

export interface VipTask {
    /** 商定配置中的契约任务编号。 */
    readonly id: number;
    /** 达成任务所需的数量。 */
    readonly target: number;
    /** 服务端当前进度。未提供表示相关玩法尚未接通。 */
    readonly progress?: number;
    /** 当前角色是否已经领取此任务奖励。 */
    readonly claimed: boolean;
}

export interface VipState {
    /** 当前角色女神 VIP 等级，新号从 0 起。 */
    readonly level: number;
    /** 当前档位的契约任务，满级时为空。 */
    readonly tasks: readonly VipTask[];
}
