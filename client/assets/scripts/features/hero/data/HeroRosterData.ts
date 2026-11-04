/** 英雄名册页面的只读交互契约；由页面适配器提供操作，数据所有者仍是HeroRosterModel。 */
import type { HeroCellModel, HeroListModel } from "../ui/HeroListPresentation";

/** 统一名册向现有列表预制体提供的读取和交互入口。 */
export interface HeroRosterSource {
    /** 按元素筛选并返回列表投影；0表示全部元素。 */
    read(elem: number): HeroListModel;
    /** 转交恢复操作，不直接修改名册或重复查询库存。 */
    retry(): void;
    /** 把选中格子的实例身份交给页面导航。 */
    select(cell: HeroCellModel): void;
}

/** 既有列表页面接入统一名册的最小接口。 */
export interface HeroRosterView {
    /** 绑定当前页面的数据读取与交互能力。 */
    useRoster(source: HeroRosterSource): void;
    /** 服务器同步完成后重新绘制，数据不归View持有。 */
    refreshRoster(): void;
}
