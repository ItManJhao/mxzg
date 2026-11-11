/** 战报统计格子：复用旧卡片与英雄头像预制体，绑定冻结名册及三项统计，不访问当前英雄Model。 */
import { _decorator, Component, Label, Sprite } from "cc";
import { BattleHeroStarView } from "./BattleHeroStarView";
import { HeroIconCellView } from "../../hero/ui/HeroIconCellView";
import { HeroTemplateFace } from "../../hero/utils/HeroCatalog";
import { BattleStatisticsRow, BattleStatisticValue, BattleStatisticsUtils } from "../utils/BattleStatisticsUtils";

const { ccclass, property } = _decorator;

@ccclass("BattleDetailCell")
export class BattleDetailCell extends Component {
    /** 静态嵌入的只读头像，复用自身异步图片代次保护。 */
    @property(HeroIconCellView) hero: HeroIconCellView | null = null;
    /** 战斗专用星级，独立于通用英雄格子的五颗星。 */
    @property(BattleHeroStarView) starView: BattleHeroStarView | null = null;
    /** 旧红色伤害数值。 */
    @property(Label) damageText: Label | null = null;
    /** 旧黄色承伤数值。 */
    @property(Label) takenText: Label | null = null;
    /** 旧绿色治疗数值，允许负治疗并明确显示缺失。 */
    @property(Label) recoveryText: Label | null = null;
    /** 伤害水平填充条，最大值由双方统一计算。 */
    @property(Sprite) damageFill: Sprite | null = null;
    /** 承伤水平填充条。 */
    @property(Sprite) takenFill: Sprite | null = null;
    /** 治疗水平填充条。 */
    @property(Sprite) recoveryFill: Sprite | null = null;

    /** 复用格子时读取历史头像；缺失降级为模板头像，由弹层统一标明，不查当前名册或开放养成。 */
    public show(row: BattleStatisticsRow, template: HeroTemplateFace | null): void {
        if (!this.starView || !this.hero || !this.damageText || !this.takenText || !this.recoveryText
            || !this.damageFill || !this.takenFill || !this.recoveryFill) {
            throw new Error("战斗统计格子预制体绑定缺失");
        }
        this.hero.show({
            kind: "owned", name: template?.name || "英雄 " + row.unit.templateId,
            showName: false, face: BattleStatisticsUtils.portrait(row.unit) ?? template?.icon ?? null, elem: template?.elem || null,
            stars: 0, level: row.unit.level, locked: false, deployed: false,
        });
        this.hero.button!.interactable = false;
        this.starView.show(row.unit.star);
        this.paint(this.damageText, this.damageFill, row.damage);
        this.paint(this.takenText, this.takenFill, row.taken);
        this.paint(this.recoveryText, this.recoveryFill, row.recovery);
    }

    /** 缺失显示破折号并隐藏条形；真实0保留数字0，负治疗只显示原值。 */
    private paint(label: Label, fill: Sprite, stat: BattleStatisticValue): void {
        label.string = stat.value === null ? "—" : String(stat.value);
        fill.node.active = stat.value !== null;
        fill.fillRange = stat.ratio;
    }
}
