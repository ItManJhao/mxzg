/**
 * 阵容候选列表的头像格，使用通用英雄格绘制与名册一致的品质、等级和星级。
 * 卡片尺寸与压暗、绿勾的叠放顺序都在同名预制体中编辑。
 */
import { _decorator } from "cc";
import { HeroIconCellView } from "./HeroIconCellView";
const { ccclass } = _decorator;

/** 与FormationHeroCellView.prefab保持同名；共享父类字段，不复制英雄展示逻辑。 */
@ccclass("FormationHeroCellView")
export class FormationHeroCellView extends HeroIconCellView {}
