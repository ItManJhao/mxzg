/** 公会徽章显示规则，供创建、选择和名单格子共用。 */
import { ResManager } from "../../../framework/assets/ResManager";

export class GuildBadgeUtils {
    /** 旧徽章编号从 0 开始，初次创建时可以随机到最后一个编号。 */
    public static readonly maxId = 43;

    /** 仅通过静态查询取用徽章地址。 */
    private constructor() {}

    /** 由服务端编号查找同一枚徽章；空资料不会加载占位图。 */
    public static source(badgeId: number | undefined): string | null {
        if (!Number.isInteger(badgeId) || badgeId === undefined || badgeId < 0 || badgeId > this.maxId) {
            return null;
        }
        return ResManager.ui("guild", "badge-" + String(badgeId).padStart(2, "0"));
    }
}
