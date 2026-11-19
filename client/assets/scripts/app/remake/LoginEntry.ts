/**
 * 记录玩家点击开始游戏后是否允许进入主城。
 * 身份失效时重置，角色资料和凭证由账号模块保存。
 */
export class LoginEntry {
    /** 本次游戏是否允许进入主城，退出或身份失效时复位。 */
    private confirmed = false;

    /** 记录已确认的进入意图，打开主城前仍须有有效角色。 */
    confirm(): void {
        this.confirmed = true;
    }

    /** 清除进入意图，使退出或失效时返回登录页。 */
    reset(): void {
        this.confirmed = false;
    }

    /** 按进入意图和角色是否就绪返回对应根页。 */
    route(hasRole: boolean): "remake-login" | "remake-home" {
        return this.confirmed && hasRole ? "remake-home" : "remake-login";
    }
}
