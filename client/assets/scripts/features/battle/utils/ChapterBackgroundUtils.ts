/**
 * 主线背景的同源配置查询：按已完成结算的全局关卡取得正式地图或挂机前后景地址。
 * 由MainChapterView在进度或演出模式变化时使用，不加载资源、不另存地图清单或推测开放范围。
 */
import type { MainChapterState } from "../MainChapterModel";

/** 一次背景切换的完整目标；同地图内换关不重复下载。 */
export interface ChapterBackgroundPlan {
    /** 资源身份由原map及正式/挂机模式组成，不使用角色、连接或本地版本作为缓存键。 */
    readonly key: string;
    /** 已结束主线结算的全局关卡；尚未通关时按旧clamp使用第1关背景。 */
    readonly stage: number;
    /** 原chapterreward.map字段，不根据章节或关卡号猜素材。 */
    readonly map: string;
    /** 正式整图或挂机远景的现有Bundle SpriteFrame路径。 */
    readonly background: string;
    /** 挂机前景；正式整图为null，避免将循环地板重复覆盖到正式地图。 */
    readonly floor: string | null;
}

export class ChapterBackgroundUtils {
    /** 只做纯配置投影，不创建有状态地图管理器。 */
    private constructor() {}

    /**
     * 沿旧ChapterData.getChapterMap/getChapterHangMap取map。
     * 新版模拟胜利先推进maxCleared，尚有pending时减去这笔未结算关，保持旧chapterEnd后才换景。
     * 缺失或损坏行明确拒绝，不回退成另一个已存在地图。
     */
    public static resolve(table: unknown, state: Pick<MainChapterState, "maxCleared" | "pendingBattleId"> | null,
        formal: boolean): ChapterBackgroundPlan {
        const rows = (table as { rows?: unknown } | null)?.rows;
        const cleared = state?.maxCleared ?? 0;
        if (!Array.isArray(rows) || !Number.isSafeInteger(cleared) || cleared < 0) {
            throw new Error("主线背景配置或权威进度无效");
        }
        const stage = Math.max(1, cleared - (state?.pendingBattleId ? 1 : 0));
        const matches = rows.filter(row => row?.idx === stage);
        const map = matches[0]?.map;
        if (matches.length !== 1 || typeof map !== "string" || !/^map[0-9]+$/.test(map)) {
            throw new Error("主线背景配置缺失或重复：chapterreward/" + stage);
        }
        return Object.freeze({
            key: (formal ? "battle:" : "idle:") + map,
            stage,
            map,
            background: formal ? "chapter/ui/" + map + "/spriteFrame"
                : "chapter/ui/hang/" + map + "_B/spriteFrame",
            floor: formal ? null : "chapter/ui/hang/" + map + "_F/spriteFrame",
        });
    }
}
