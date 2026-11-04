/** 阵容列表专用格子：继承通用英雄格子的只读绘制和点击绑定，缩放由同名Prefab保存。 */
import { _decorator } from "cc";
import { HeroIconCellView } from "./HeroIconCellView";
const { ccclass } = _decorator;

/** 与FormationHeroCellView.prefab保持同名；共享父类字段，不复制英雄展示逻辑。 */
@ccclass("FormationHeroCellView")
export class FormationHeroCellView extends HeroIconCellView {}
