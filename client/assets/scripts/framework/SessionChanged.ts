/** 共享会话失效异常：标记旧角色任务不可继续提交，由应用或业务入口按当前会话处理。 */
export class SessionChanged extends Error {
    /** 使用稳定提示区分会话已切换与普通业务失败。 */
    constructor() { super("会话已切换，请重新请求"); this.name = "SessionChanged"; }
}
