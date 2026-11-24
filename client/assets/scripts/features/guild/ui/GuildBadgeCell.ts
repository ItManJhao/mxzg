/** 公会徽章选择格，列表换绑时绘制实际徽章资源。 */
import { _decorator, Component } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
import { GuildBadgeUtils } from "./GuildBadgeUtils";

const { ccclass } = _decorator;

@ccclass("GuildBadgeCell")
export class GuildBadgeCell extends Component {
    /** 按当前虚拟格的数据更新图标。 */
    public render(badgeId: number): void {
        ResManager.setSprite(this.node, GuildBadgeUtils.source(badgeId));
    }
}
