/** 主线阵容页面草稿与交互类型：不是资产Model，服务器确认状态仍归HeroRosterModel。 */
import type { OwnedHero } from "../HeroApi";

/** 草稿专用站位集合，不依赖已暂停的旧LineupApi。 */
export interface FormationDraft {
    /** 本次编辑基于的服务器阵容版本。 */
    version: number;
    /** 原始编辑顺序；实例UUID保持字符串，不从模板ID推算。 */
    slots: { position: number; heroId: string }[];
}

/** 页面草稿不是服务器资产；关闭即丢弃，保存后等待统一状态确认。 */
export interface FormationState {
    /** 当前角色的真实实例名册。 */
    heroes: readonly OwnedHero[];
    /** 基于服务器版本编辑的站位草稿。 */
    lineup: FormationDraft;
    /** true表示等待同步/保存，阻止修改草稿。 */
    busy: boolean;
    /** 当前操作的明确提示。 */
    message: string;
    /** 当前草稿阵型；切换阵型仍须显式保存。 */
    formationId?: number;
    /** 服务器给出的当前可用位置，不由页面推算。 */
    openPositions?: readonly number[];
    /** 当前角色永久解锁的阵型。 */
    unlockedIds?: readonly number[];
}
/** 持久幂等请求；原始顺序和预期版本在重试时保持不变。 */
export interface FormationSaveRequest {
    /** 持久幂等键，结果不明时复用原值。 */
    requestId: string;
    /** 编辑草稿时的服务器阵容版本。 */
    expectedVersion: number;
    /** 用户选择的已解锁阵型。 */
    formationId: number;
    /** 保留原始请求顺序的站位及所属实例UUID。 */
    slots: readonly { position: number; heroId: string }[];
}
