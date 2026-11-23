/** 创造法阵的配方头像格。复用英雄头像和星级绘制，以备料进度显示当前配方的可合成状态。 */
import { _decorator, Color } from "cc";
import type { HeroCreationOption } from "../utils/HeroCreationUtils";
import { HeroIconCellView } from "./HeroIconCellView";

const { ccclass } = _decorator;

@ccclass("HeroCreationCellView")
export class HeroCreationCellView extends HeroIconCellView {
    /** 列表换绑时显示配方的目标星级和已备材料数量，备齐后将数量标为绿色。 */
    public showRecipe(option: HeroCreationOption): void {
        this.show({
            kind: "owned",
            name: option.face.name,
            showName: false,
            face: option.face.icon,
            elem: option.face.elem,
            locked: false,
            deployed: false,
            stars: option.recipe.toStar,
            level: 1,
        });
        this.levelLabel!.string = `${option.available}/${option.required}`;
        this.levelLabel!.color = option.ready ? new Color(142, 227, 57) : Color.WHITE;
    }
}
