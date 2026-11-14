/**
 * 普通道具、精英碎片及英雄材料的只读详情投影，语言直接查询唯一GameConfig。
 * 旧mode决定类型和按钮，库存上下文只决定原有使用、图鉴和分解入口是否可见；所有操作仍由View提示未开放。
 * 不保存玩家数量、期限、英雄或配置索引，不发请求；期限倒计时继续使用BagModel的真实服务器时间。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig, ItemRow } from "../../../config/GConfig";
import { GameLog } from "../../../core/GameLog";

/** 旧英雄碎片格子的配置样式；数量和完成度由调用方传入当前库存。 */
export interface ItemPieceDisplay {
    /** 同源配置的1至5星，不以所在页签或物品名称猜测。 */
    readonly star: number;
    /** 合成所需真实碎片数，来源为item.use_value，不能套到mode9的英雄ID。 */
    readonly required: number;
}

/** 页面根据真实打开来源提供的只读上下文，不是额外的玩家状态。 */
export interface ItemDetailContext {
    /** true表示当前库存详情；false表示产物或奖励的配置说明，不显示使用或分解。 */
    readonly inventory: boolean;
    /** 由现有HeroType检查item.idx减10000000是否命中，不为随机碎片伪造英雄。 */
    readonly specificHero?: boolean;
    /** true表示期限独立实例；旧期限详情只传配置ID，因此不能显示分解入口。 */
    readonly timed?: boolean;
}

/** 已知范围的只读详情；不包含数量、期限或可执行的资产操作。 */
export interface ItemDetailDisplay {
    /** 源物品配置ID，供显示缺失追溯，不是库存实例ID。 */
    readonly itemId: number;
    /** 旧getPropType直接读取mode得到的类型全文，不使用place或type字段。 */
    readonly typeLine: string;
    /** 配置正文去除旧富文本标签并保留换行；缺失时明确标记，保留其余真实展示。 */
    readonly description: string;
    /** 保留旧font合法颜色和逐项换行的Cocos RichText正文，不携带图片、点击或其他可执行标记。 */
    readonly richDescription: string;
    /** true表示同源正文确实缺失，不能将缺失占位当作已恢复内容。 */
    readonly missingDescription: boolean;
    /** 非碎片为null；详情只显示星和角标，不显示库存完成度或数量。 */
    readonly piece: ItemPieceDisplay | null;
    /** 旧底部首按钮：具体英雄碎片显示详情，否则有真实来源时显示来源。 */
    readonly bottomAction: "detail" | "source" | null;
    /** 旧顶部来源图标仅在底部已经用于英雄详情且存在来源时显示。 */
    readonly showSourceIcon: boolean;
    /** 旧use_type大于0且从库存打开时显示，数量不足和等级不改变此可见条件。 */
    readonly showUse: boolean;
    /** 旧非期限库存表参数并且decomposition为1时显示，真实分解仍未开放。 */
    readonly showDecompose: boolean;
    /** 旧CCB的语言5327，不按使用类型自行改为合成或前往。 */
    readonly useLabel: string;
    /** 底部首按钮对应详情或来源文案；隐藏时保留来源文案不产生操作。 */
    readonly detailLabel: string;
    /** 旧CCB的语言3921，不混用其他模块的分解文案。 */
    readonly decomposeLabel: string;
}

/** 背包格子的真实完成度；只作当前数量展示，不表示已经执行合成。 */
export interface ItemPieceProgress {
    /** 保留真实库存数，可超过合成需求。 */
    readonly current: number;
    /** 同源配置中的合成需求数。 */
    readonly required: number;
    /** 0至1的进度，超额库存仅将进度条截到1，不截文字。 */
    readonly ratio: number;
    /** 旧格子count/need_num文本，没有额外独立数量标签。 */
    readonly text: string;
}

/** 无状态展示工具，不维护另一份图标、配置或库存清单。 */
export class ItemDetailUtils {
    /** 工具仅提供静态查询，不创建实例。 */
    private constructor() {
    }

    /**
     * 读取旧isPiece样式；旧mode3和8才是碎片，mode9即使star为5也没有此样式。
     * 当前真实配置只有mode8；非法星级或需求返回null并按物品记录缺配置，不猜默认值。
     */
    public static piece(row: ItemRow): ItemPieceDisplay | null {
        if (row.mode !== 3 && row.mode !== 8) {
            return null;
        }
        if (!Number.isInteger(row.star) || row.star! < 1 || row.star! > 5 ||
            !Number.isSafeInteger(row.use_value) || row.use_value! <= 0) {
            ItemDetailUtils.warn(row.idx, "PIECE_CONFIG", "碎片星级或合成数量无效");
            return null;
        }
        return { star: row.star!, required: row.use_value! };
    }

    /** 用真实库存数量计算格子完成度；非法数量返回null，不将未知数量冒充0。 */
    public static progress(piece: ItemPieceDisplay, quantity: number): ItemPieceProgress | null {
        if (!Number.isSafeInteger(quantity) || quantity < 0 ||
            !Number.isSafeInteger(piece.required) || piece.required <= 0) {
            return null;
        }
        return {
            current: quantity,
            required: piece.required,
            ratio: Math.min(1, quantity / piece.required),
            text: quantity + "/" + piece.required,
        };
    }

    /**
     * 生成当前mode2/8/9及原有期限mode17详情；其他模块返回null，不借此替代装备、精灵或灵器专页。
     * 缺正文允许显示明确占位，其余决定操作可见性的配置损坏则拒绝投影并记录一次。
     */
    public static read(row: ItemRow, context: ItemDetailContext,
        config = GameConfig.instance): ItemDetailDisplay | null {
        if (row.mode !== 2 && row.mode !== 8 && row.mode !== 9 && row.mode !== 17) {
            return null;
        }
        try {
            if (!Number.isSafeInteger(row.idx) || row.idx <= 0) {
                throw new Error("物品ID无效");
            }
            if (!Number.isInteger(row.use_type) || row.use_type! < 0 ||
                (row.decomposition !== 0 && row.decomposition !== 1)) {
                throw new Error("使用或分解显示条件缺失");
            }
            const piece = ItemDetailUtils.piece(row);
            if (row.mode === 8 && !piece) {
                return null;
            }
            const typeKey = row.mode === 8 ? 47530 : row.mode === 9 ? 47723 : 47215;
            const hasSource = ItemDetailUtils.hasSource(row.source);
            const showDetail = piece !== null && context.inventory && context.specificHero === true;
            const bottomAction = showDetail ? "detail" : hasSource ? "source" : null;
            const description = ItemDetailUtils.findWord(config, row.content);
            const plain = description === null ? "" : ItemDetailUtils.plainText(description);
            const missingDescription = plain.trim().length === 0;
            if (missingDescription) {
                ItemDetailUtils.warn(row.idx, "CONTENT:" + row.content, "物品说明缺失，保留其他真实显示字段");
            }
            return {
                itemId: row.idx,
                typeLine: ItemDetailUtils.word(config, 47086) + ItemDetailUtils.word(config, typeKey),
                description: missingDescription ? "物品说明缺失" : plain,
                richDescription: missingDescription ? "物品说明缺失" : ItemDetailUtils.richText(description!),
                missingDescription,
                piece,
                bottomAction,
                showSourceIcon: showDetail && hasSource,
                showUse: context.inventory && row.use_type! > 0,
                showDecompose: context.inventory && !context.timed && row.mode !== 17 && row.decomposition === 1,
                useLabel: ItemDetailUtils.word(config, 5327),
                detailLabel: ItemDetailUtils.word(config, showDetail ? 47610 : 47243),
                decomposeLabel: ItemDetailUtils.word(config, 3921),
            };
        } catch (error) {
            ItemDetailUtils.warn(row.idx, "DISPLAY", error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    /** source为同源导出的JSON数组；未配置或空数组没有来源，损坏值不按字符串长度猜真。 */
    private static hasSource(raw: string | undefined): boolean {
        if (raw === undefined || raw.trim() === "") {
            return false;
        }
        const value: unknown = JSON.parse(raw);
        if (!Array.isArray(value) || value.some(entry => entry === null || typeof entry !== "object" || Array.isArray(entry))) {
            throw new Error("物品来源配置不是有效数组");
        }
        return value.length > 0;
    }

    /** 通过统一主键索引读取语言，不扫描整表，不把缺失键自身当作正文。 */
    private static findWord(config: GameConfig, key: number | string | undefined): string | null {
        if (key === undefined) {
            return null;
        }
        const row = config.getConfig(GConfig.Language, key);
        return typeof row?.value === "string" && row.value.length > 0 ? row.value : null;
    }

    /** 类型及操作语言缺失会使展示语义不明，拒绝整次详情，不填任意名称。 */
    private static word(config: GameConfig, key: number): string {
        const value = ItemDetailUtils.findWord(config, key);
        if (value === null || value.trim() === "") {
            throw new Error("详情语言缺失：" + key);
        }
        return value;
    }

    /**
     * 将旧正文转为Cocos RichText，仅允许font的六位十六进制颜色和br换行。
     * 未支持标签只保留文字，不把原来的图片、事件或已存在的Cocos标记交给引擎执行。
     */
    public static richText(value: string): string {
        const fonts: boolean[] = [];
        const content = value.replace(/\\n/g, "\n").replace(/<[^>]*>/g, tag => {
            if (/^<br\s*\/?>$/i.test(tag)) {
                return "\n";
            }
            const color = /^<font\s+color\s*=\s*(['"])(#[0-9a-f]{6})\1\s*>$/i.exec(tag);
            if (color) {
                fonts.push(true);
                return "<color=" + color[2] + ">";
            }
            if (/^<font(?:\s[^>]*)?>$/i.test(tag)) {
                fonts.push(false);
            } else if (/^<\/font\s*>$/i.test(tag)) {
                return fonts.pop() ? "</color>" : "";
            }
            return "";
        });
        return content + fonts.reverse().filter(Boolean).map(() => "</color>").join("");
    }

    /** 先还原br及配置中的换行，再去旧标签，供纯文本显示及日志使用，不拼接相邻选项。 */
    private static plainText(value: string): string {
        return value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/\\n/g, "\n");
    }

    /** 配置缺失按物品和原因限频，不在本工具创建日志缓存或玩家提示。 */
    private static warn(itemId: number, reason: string, message: string): void {
        GameLog.shared.warnOnce("MODULE", "ItemDetailUtils", "ITEM_DISPLAY_MISSING:" + itemId + ":" + reason,
            "物品详情未完整展示：itemId=" + itemId + "；" + message);
    }
}
