import { _decorator, Component, Label, Node } from "cc";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";

const { ccclass, property } = _decorator;

const CHIP_ICON = "ui/city/main-city_icon-main_mission";

/**
 * 挂机左上角关卡标。字绑在 HangMissionChip 上。
 * 图标没挂上时字仍在。不从根往下搜。
 */
@ccclass("HangMissionChipView")
export class HangMissionChipView extends Component {
  @property(Label)
  caption: Label | null = null;

  @property(Node)
  icon: Node | null = null;

  private painted = false;

  show(text: string): void {
    if (!this.painted) {
      this.painted = true;
      paintSpritePaths(this.icon, [CHIP_ICON]);
    }
    if (this.caption) this.caption.string = text;
  }
}
