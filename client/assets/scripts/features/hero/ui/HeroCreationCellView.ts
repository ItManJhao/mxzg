/** 创造法阵的配方头像格。复用英雄头像和星级绘制，通过备料进度和红点显示当前配方的可合成状态。 */
import { _decorator, Color } from "cc";
import type { HeroCreationOption } from "../utils/HeroCreationUtils";
import { HeroIconCellView } from "./HeroIconCellView";

const { ccclass } = _decorator;

@ccclass("HeroCreationCellView")
export class HeroCreationCellView extends HeroIconCellView {
    /** 保存最近一次渲染的配方资格，供虚拟列表先赋数据再激活时显示。 */
    private recipeReady = false;

    /** 换绑配方时刷新目标星级和备料数量，满足当前配方条件时点亮红点。 */
    public showRecipe(option: HeroCreationOption): void {
        this.recipeReady = option.ready;
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

    /** 激活或重绘时只显示当前配方的就绪状态，由基类在停用时熄灭。 */
    protected override refreshReminder(): void {
        this.setReminder(this.recipeReady);
    }
}
