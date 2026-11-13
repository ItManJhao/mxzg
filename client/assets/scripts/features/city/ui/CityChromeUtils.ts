/** 主城顶底栏显示工具：对现有顶栏与七个导航按钮计算宽度、选中状态和标签缩放，不负责页面实例化。 */
import { Button, Node, Sprite, UITransform } from "cc";
import { TAB_REST_SIZE, CityTabUtils } from "../utils/CityTabUtils";
import { ChromeLayoutUtils } from "../../../framework/ui/ChromeLayoutUtils";
import { ViewportLayoutUtils } from "../../../framework/ui/ViewportLayoutUtils";
export type TabVisual = "selected" | "open" | "locked";
export interface TabState {
    id: string;
    text: string;
    state: TabVisual;
    /** 锁着且主线门槛大于 1 时写在钮上，例如 15。0 表示不写 Lv。 */
    lockLevel?: number;
}
export interface CityChrome {
    root: Node;
    setIdentity(nameLine: string, subLine: string): void;
    setCurrencies(goldLine: string, diamondLine: string): void;
    /** 空串表示没有战力数据，不要留 Prefab 默认的 0。 */
    setPower(text: string): void;
    /** 空串藏掉头像下的占位等级。 */
    setLevelBadge(text: string): void;
    /** null 关掉空褐圈。有路径时用英雄头像盖住框心。 */
    setAvatar(icon: string | null): void;
    setTabs(tabs: TabState[]): void;
    /** 只在主城页显示 ActGroup / UtilityRow。代码壳没有这两块。 */
    setCityExtras(visible: boolean): void;
}
/** Prefab 壳上的活动列表、更多列表和邮件。底栏七项仍走 onTab。 */
export interface CityChromeActions {
    openActivity(): void;
    openMore(): void;
    openMail(): void;
}
/** 主城顶底栏显示工具：对现有顶栏与七个导航按钮计算宽度、选中状态和标签缩放，不负责页面实例化。 */
export class CityChromeUtils {
    /** 纯展示或数据转换入口，无需创建工具类实例。 */
    private constructor() { }

    /** 按旧顶部背景中心位置适配现有顶栏，保留经验条比例，避免整张背景向下重复占高。 */
    public static layoutCityHeader(root: Node, width: number): void {
        const top = root.getChildByName("TopBar");
        if (!top) {
            return;
        }
        const background = top.getChildByName("Bg");
        background?.setPosition(0, 40, 0);
        background?.getComponent(UITransform)?.setContentSize(width, width * 146 / 616);
        // 与旧版顶部资源保持同一缩放比例，保留经验细条的原图高度。
        for (const name of ["ExperienceBg", "ExperienceFill"]) {
            const bar = top.getChildByName(name);
            if (bar) {
                bar.setScale(width / 640, width / 640, 1);
            }
        }
        const positions: Record<string, number> = {
            NameBg: -0.285, LblName: -0.285, LblSub: -0.285,
            PowerSlot: -0.055, CurrencyGold: 0.129, CurrencyGem: 0.33, Avatar: -0.435, LevelBg: -0.435, LblLevel: -0.435
        };
        for (const name of Object.keys(positions)) {
            const node = top.getChildByName(name);
            if (node) {
                node.setPosition(width * positions[name], node.position.y, 0);
            }
        }
    }

    /** 判断节点名是否属于主城底栏七个导航入口。 */
    public static isCityTab(name: string): boolean {
        return (name === "TabCity" ||
            name === "TabHero" ||
            name === "TabBag" ||
            name === "TabBattle" ||
            name === "TabDungeon" ||
            name === "TabClan" ||
            name === "TabFetter");
    }

    /** 七个键先收成同样大小。战斗格预制是 96，并且比其它格高一截。 */
    public static prepareCityTab(button: Node): void {
        const mark = button as CityTabMark;
        const ui = button.getComponent(UITransform);
        const size = ViewportLayoutUtils.uiSize(ui);
        if (ui && size && (size.width > TAB_REST_SIZE + 0.5 || size.height > TAB_REST_SIZE + 0.5)) {
            ViewportLayoutUtils.assignContentSize(ui, TAB_REST_SIZE, TAB_REST_SIZE);
        }
        const icon = button.getChildByName("Icon");
        if (icon) {
            const iconUi = icon.getComponent(UITransform);
            const iconSize = ViewportLayoutUtils.uiSize(iconUi);
            if (iconUi && iconSize && (iconSize.width > 60 || iconSize.height > 60)) {
                ViewportLayoutUtils.assignContentSize(iconUi, 56, 56);
                const sprite = icon.getComponent(Sprite);
                if (sprite) {
                    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
                }
            }
        }
        if (mark.mxzgTabRestY === undefined) {
            const y = button.position && typeof button.position.y === "number" ? button.position.y : 0;
            mark.mxzgTabRestY = y > 20 ? 13 : y;
        }
        const press = button.getComponent(Button);
        if (press && press.transition === Button.Transition.SCALE) {
            press.transition = Button.Transition.NONE;
        }
    }

    /** 窄屏收拢之后再乘选中倍数。Button 的缩放过渡会把 scale 弹回 1，所以先关掉。 */
    public static layoutCityTab(button: Node, visibleW: number): void {
        const mark = button as CityTabMark;
        CityChromeUtils.prepareCityTab(button);
        if (visibleW > 0) {
            mark.mxzgTabWidth = visibleW;
        }
        const width = mark.mxzgTabWidth && mark.mxzgTabWidth > 0 ? mark.mxzgTabWidth : visibleW;
        const names = ["TabCity", "TabHero", "TabBag", "TabBattle", "TabDungeon", "TabClan", "TabFetter"];
        const index = names.indexOf(button.name);
        if (index >= 0 && width > 0) {
            const layout = CityTabUtils.cityTabLayout(width, index, mark.mxzgTabSelected === true);
            button.setPosition(layout.x, layout.y, button.position.z);
            button.setScale(layout.scale, layout.scale, 1);
            return;
        }
        const restY = mark.mxzgTabRestY !== undefined ? mark.mxzgTabRestY : 0;
        if (!mark.mxzgDesign) {
            const pos = button.position;
            const x = pos && typeof pos.x === "number" ? pos.x : 0;
            const z = pos && typeof pos.z === "number" ? pos.z : 0;
            button.setPosition(x, restY, z);
            button.setScale(1, 1, 1);
        }
        else {
            mark.mxzgDesign.sx = 1;
            mark.mxzgDesign.sy = 1;
            mark.mxzgDesign.y = restY;
        }
        ViewportLayoutUtils.squeezeWideNode(button, width);
        const mul = CityTabUtils.tabVisualScale(mark.mxzgTabSelected === true);
        const squeeze = ChromeLayoutUtils.widthSqueeze(width);
        button.setScale(mul * squeeze, mul * squeeze, 1);
    }

    /** 记录按钮选中状态并更新既有标签尺寸，不改变开放规则。 */
    public static setCityTabSelected(button: Node, selected: boolean): void {
        (button as CityTabMark).mxzgTabSelected = selected;
        CityChromeUtils.layoutCityTab(button, 0);
    }
}
interface CityTabMark extends Node {
    mxzgDesign?: {
        x: number;
        y: number;
        sx: number;
        sy: number;
    };
    mxzgTabRestY?: number;
    mxzgTabSelected?: boolean;
    mxzgTabWidth?: number;
}
