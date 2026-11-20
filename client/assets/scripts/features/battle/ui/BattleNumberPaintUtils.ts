/**
 * 战斗开始前将原版位图字库持有在页面，命中时立即绘制。字库加载失败时按原色使用系统字。
 */
import { BitmapFont, Color, Label, Node } from "cc";
import { GameLog } from "../../../core/GameLog";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { type BattleNumberKind, BattleNumberUtils } from "../utils/BattleNumberUtils";

/** 原版数字字库的字号和行高均为 73 像素，弹跳缩放由飘字节点负责。 */
const FONT_SIZE = 73;

/** 字库暂不可用时，用实色近似原版位图的配色。 */
const FALLBACK_COLORS: Record<BattleNumberKind, Color> = {
    dmg: new Color(255, 214, 64),
    skill: new Color(110, 203, 255),
    heal: new Color(72, 210, 96),
};

/** 战斗数字绘制工具，使用同一页面已准备好的字体绘制每次独立命中。 */
export class BattleNumberPaintUtils {
    /** 仅供战斗页面使用的静态入口。 */
    private constructor() {
    }

    /** 并行加载旧字库，持有到战斗页面销毁。单项失败时只使用对应类型的系统字回退。 */
    public static async preload(owner: Node): Promise<ReadonlyMap<BattleNumberKind, BitmapFont>> {
        const scope = ResourceAssetsUtils.forNode(owner);
        const fonts = new Map<BattleNumberKind, BitmapFont>();
        const kinds: readonly BattleNumberKind[] = ["dmg", "skill", "heal"];
        await Promise.all(kinds.map(async kind => {
            const path = BattleNumberUtils.battleNumberFontPath(kind);
            try {
                fonts.set(kind, await scope.loadPath(path, "BitmapFont"));
            } catch (error) {
                if (owner.isValid) {
                    GameLog.shared.warnOnce("MODULE", "BattleFx", "NUMBER_FONT_MISSING:" + path,
                        "飘字字库 " + path + " 加载失败，使用系统字：" + String(error));
                }
            }
        }));
        return fonts;
    }

    /**
     * 同步写入带符号整数及其字体，保证第一帧已有正确颜色。非法数字或无效标签返回 false。
     */
    public static applyBattleNumberFont(
        label: Label,
        kind: BattleNumberKind,
        text: string,
        fonts?: ReadonlyMap<BattleNumberKind, BitmapFont>,
    ): boolean {
        const digits = BattleNumberUtils.bitmapNumberText(text);
        if (!digits || !label.isValid) {
            return false;
        }
        const font = fonts?.get(kind);
        // 原浮字用自然大小，避免大数在模板的固定宽高内缩成小字。
        label.overflow = Label.Overflow.NONE;
        label.cacheMode = Label.CacheMode.NONE;
        label.fontSize = FONT_SIZE;
        label.lineHeight = FONT_SIZE;
        if (font) {
            label.font = font;
        } else {
            label.useSystemFont = true;
        }
        label.color = font ? Color.WHITE : FALLBACK_COLORS[kind];
        label.isBold = !font;
        label.string = digits;
        return true;
    }
}
