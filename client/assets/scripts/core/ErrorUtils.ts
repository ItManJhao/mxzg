/**
 * 错误展示转换：将当前异常转换为可读文字，供应用、页面和资源边界报告失败。
 * 不保存账号或网络状态；实际协议错误由SocketFailure负责，不保留旧数字错误码字典与GameError兼容链。
 */
export class ErrorUtils {
    /** 仅通过静态方法转换异常，禁止创建实例。 */
    private constructor() {
    }

    /** 保留Error的明确原因；未知值返回通用文字，不猜测旧协议错误码。 */
    public static messageOf(error: unknown): string {
        if (error instanceof Error && error.message) {
            return error.message;
        }
        return "未知错误";
    }
}
