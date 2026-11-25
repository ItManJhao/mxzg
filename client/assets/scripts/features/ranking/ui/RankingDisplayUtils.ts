/** 排行榜渲染辅助，统一卡片、榜单项和前三领奖台的头像与文案。 */
import type { Node } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { RolePortraitUtils } from "../../account/utils/RolePortraitUtils";
import { GuildBadgeUtils } from "../../guild/ui/GuildBadgeUtils";
import type { RankingBoardKind, RankingEntry } from "../data/RankingData";

/** 将服务端排行资料转换成视图展示，不计算或修改名次。 */
export class RankingDisplayUtils {
    /** 只提供静态显示计算。 */
    private constructor() {}

    /** 公会榜使用徽章和会长资料。 */
    public static isGuild(kind: RankingBoardKind): boolean {
        return kind === "GUILD" || kind === "CROSS_GUILD";
    }

    /** 本服和跨服各用自己的榜单数据。 */
    public static isCross(kind: RankingBoardKind): boolean {
        return kind === "CROSS_GUILD" || kind === "CROSS_POWER";
    }

    /** 按实际区服编号显示前缀，保留有自定义名字的区服。 */
    public static serverTag(serverId: string): string {
        return /^\d+$/.test(serverId) ? `[S${serverId}]` : `[${serverId}]`;
    }

    /** 详情标题由当前榜类型决定。 */
    public static title(kind: RankingBoardKind): string {
        switch (kind) {
            case "CHAPTER": return "剧情进度";
            case "GUILD": return "公会排名";
            case "POWER": return "战力排名";
            case "CROSS_GUILD": return "跨服公会排名";
            case "CROSS_POWER": return "跨服战力排名";
        }
    }

    /** 应用服务端的角色头像或公会徽章，空项释放图片持有。 */
    public static paintPortrait(face: Node, border: Node, kind: RankingBoardKind, entry?: RankingEntry): void {
        if (!entry) {
            ResManager.setSprite(face, null);
            ResManager.setSprite(border, null);
            face.active = false;
            border.active = false;
            return;
        }
        if (this.isGuild(kind)) {
            face.active = true;
            border.active = false;
            ResManager.setSprite(face, GuildBadgeUtils.source(entry.badgeId));
            ResManager.setSprite(border, null);
            return;
        }
        RolePortraitUtils.paint(face, border, entry.headId, entry.borderId);
    }
}
