/** 角色头像显示：顶栏和资料页共用旧头像/头像框映射，不把角色形象或英雄图标当头像。 */
import { Node } from "cc";
import { HeadIconById, BorderIconById } from "../../../framework/assets/IconCatalog";
import { ResourceCatalog } from "../../../framework/assets/ResourceCatalog";
import { paintSpriteResources } from "../../../framework/kit/SpritePaint";
/** 显示服务器选中的头像和框；0 是旧版默认资源，缺失资源回退默认图，不修改 Model。 */
export function paintRolePortrait(face: Node | null, border: Node | null, headId: number = 0, borderId: number = 0): void {
    if (face) { face.active = true; paintSpriteResources(face, [HeadIconById[headId] || ResourceCatalog.hero.head_icon_0]); }
    if (border) { border.active = true; paintSpriteResources(border, [BorderIconById[borderId] || ResourceCatalog.bag.backpack_border_default]); }
}
