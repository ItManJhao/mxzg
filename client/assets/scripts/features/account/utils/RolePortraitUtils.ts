/** 角色头像显示：顶栏和资料页共用旧头像/头像框映射，不把角色形象或英雄图标当头像。 */
import { Node } from "cc";
import { ResManager } from "../../../framework/assets/ResManager";
/** 顶栏、资料页与胜利页共用的无状态显示工具，不修改角色Model。 */
export class RolePortraitUtils {
    /** 纯显示工具不创建实例。 */
    private constructor() {}

    /** 显示服务器头像与边框，非法ID或加载失败回退默认图，图片持有与迟到保护归现有资源入口。 */
    public static paint(face: Node | null, border: Node | null, headId: number = 0, borderId: number = 0): void {
        if (face) {
            face.active = true;
            ResManager.setSprite(face, Array.from(new Set([
                ResManager.head(headId) || "ui/hero/head-icon_0",
                "ui/hero/head-icon_0",
            ])));
        }
        if (border) {
            border.active = true;
            ResManager.setSprite(border, Array.from(new Set([
                ResManager.border(borderId) || "ui/bag/backpack_border-default",
                "ui/bag/backpack_border-default",
            ])));
        }
    }
}
