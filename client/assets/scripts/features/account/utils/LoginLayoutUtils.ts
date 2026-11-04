/** 登录和加载美术共用的尺寸工具；只计算比例，不负责页面创建或流程切换。 */
export class LoginLayoutUtils {
    /** 纯工具类不允许创建实例。 */
    private constructor() {}

    /** 按旧版宽度比例返回铺满背景所需尺寸，以及人物缩放和纵向位置。 */
    public static calculate(width: number, height: number) {
        const cover = Math.max(width / 768, height / 1300);
        return {
            backgroundWidth: 768 * cover,
            backgroundHeight: 1300 * cover,
            castScale: width / 770,
            castY: height * 0.05,
        };
    }
}
