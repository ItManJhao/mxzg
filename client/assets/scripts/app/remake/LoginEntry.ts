/**
 * 玩家进入意图：区分账号已恢复与玩家已点击开始游戏。
 * 由RemakeApp创建并交给登录页面装配；身份失效时重置，不保存角色或凭证。
 */
export class LoginEntry {
    /** 玩家本次是否已确认进入；只在开始游戏动作后设true，退出或失效时复位。 */
    private confirmed = false;

    /** 接受本次开始游戏意图，不绕过外部账号就绪校验。 */
    confirm(): void {
        this.confirmed = true;
    }

    /** 清除进入意图，使恢复账号仍先停留登录页。 */
    reset(): void {
        this.confirmed = false;
    }

    /** 仅在玩家已确认且账号有角色时进入主城，其余返回登录页。 */
    route(hasRole: boolean): "remake-login" | "remake-home" {
        return this.confirmed && hasRole ? "remake-home" : "remake-login";
    }
}
