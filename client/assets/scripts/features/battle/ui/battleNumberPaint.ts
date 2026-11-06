/**
 * 把一条飘字换成位图数字。字库没挂上时涂回系统字：掉血红，治疗绿，暴击金。
 */
import { BitmapFont,Color,Label } from "cc";
import { GameLog } from "../../../core/GameLog";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssets";
import { BattleNumberKind,BattleNumberUtils } from "../utils/BattleNumberUtils";

const WHITE = new Color(255, 255, 255, 255);

let fontMissLogged = false;

function noteFontMiss(path: string): void {
    if (fontMissLogged) return;
    fontMissLogged = true;
    GameLog.shared.classified("MODULE", "warn", "BattleFx", "飘字字库 " + path + " 没有挂上，仍用系统字");
}

/** 字库归属文字节点，失败不永久缓存；销毁后不再回写。 */
function loadNumberFont(label: Label, path: string, done: (font: BitmapFont | null) => void): void {
    ResourceAssetsUtils.loadForNode(label.node, path, "BitmapFont", (error, font) => {
        if (!label.isValid) return;
        if (error || !font) noteFontMiss(path);
        done(font);
    });
}

/**
 * 成功返回 true。字还在加载时先涂白，挂上之后不再用系统字染色。
 * 不是纯数字时返回 false，调用方自己涂色。
 */
export function applyBattleNumberFont(label: Label, kind: BattleNumberKind, text: string): boolean {
    const digits = BattleNumberUtils.bitmapNumberText(text);
    if (!digits || !label.isValid) return false;
    label.string = digits;
    label.color = WHITE;
    label.isBold = false;
    const size = BattleNumberUtils.battleNumberFontSize(kind);
    label.fontSize = size;
    label.lineHeight = size + 4;
    const path = BattleNumberUtils.battleNumberFontPath(kind);
    loadNumberFont(label, path, (font) => {
        if (!label.isValid) return;
        if (!font) {
            paintSystemNumber(label, kind);
            return;
        }
        const view = label as Label & { font?: BitmapFont | null; cacheMode?: number };
        view.font = font;
        label.useSystemFont = false;
        label.string = digits;
        label.color = WHITE;
        label.isBold = false;
        const cache = (Label as unknown as { CacheMode?: { NONE: number } }).CacheMode;
        if (cache) view.cacheMode = cache.NONE;
    });
    return true;
}

/** 字库没挂上时的系统字。掉血红，治疗绿，暴击金。 */
function paintSystemNumber(label: Label, kind: BattleNumberKind): void {
    label.useSystemFont = true;
    label.isBold = true;
    if (kind === "crit") {
        label.fontSize = 40;
        label.lineHeight = 44;
        label.color = new Color(255, 214, 64, 255);
        return;
    }
    if (kind === "heal") {
        label.fontSize = 32;
        label.lineHeight = 36;
        label.color = new Color(72, 210, 96, 255);
        return;
    }
    label.fontSize = 34;
    label.lineHeight = 38;
    label.color = new Color(255, 72, 56, 255);
}
