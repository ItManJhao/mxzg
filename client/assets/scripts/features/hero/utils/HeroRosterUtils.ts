/** 英雄名册展示工具：把唯一Model和静态配置投影为列表，不查询服务器、不修改英雄数据。 */
import { GameLog } from "../../../core/GameLog";
import type { HeroCellModel, HeroListModel } from "../ui/HeroListPresentation";
import type { HeroCatalog } from "./HeroCatalog";
import type { HeroRosterState } from "../HeroRosterModel";

/** 只负责名册展示规则；实例身份、顺序和服务器容量均从真实数据读取。 */
export class HeroRosterUtils {
    /** 纯工具类不创建实例。 */
    private constructor() {}

    /** 按元素筛选列表，依次按上阵、星级、等级、配置ID降序；复制后排序，不修改Model。 */
    public static present(state: HeroRosterState, catalog: HeroCatalog, elem: number): HeroListModel {
        const cells: HeroCellModel[] = [];
        if (state.status === "ready") {
            const sorted = state.heroes.slice().sort((a, b) =>
                Number(b.deployed === true) - Number(a.deployed === true) ||
                b.star - a.star || b.level - a.level || b.templateId - a.templateId);
            for (const hero of sorted) {
                const template = catalog.find(hero.templateId);
                if (!template) {
                    GameLog.shared.warnOnce("MODULE", "HeroRosterUtils", "TEMPLATE_MISSING:" + hero.templateId,
                        "英雄列表缺少展示模板：" + hero.templateId + "；保留实例并显示缺失占位");
                }
                if (elem && template?.elem !== elem) {
                    continue;
                }
                cells.push({
                    kind: "owned",
                    instanceId: hero.id,
                    name: template?.name || "未知英雄（模板 " + hero.templateId + "）",
                    showName: false,
                    face: template?.icon || null,
                    elem: template?.elem || null,
                    level: hero.level,
                    stars: hero.star,
                    locked: hero.locked === true,
                    deployed: hero.deployed === true,
                });
            }
        }
        let emptyText = "";
        if (state.status === "idle" || state.status === "loading") {
            emptyText = "正在加载英雄…";
        } else if (state.status === "error") {
            emptyText = state.error + "\n等待连接恢复后同步";
        } else if (!state.heroes.length) {
            emptyText = "尚未获得英雄";
        } else if (!cells.length) {
            emptyText = "没有符合筛选条件的英雄";
        }
        return {
            synced: state.status === "ready",
            mode: "roster",
            cells,
            emptyText,
            capacityLine: state.status === "ready"
                ? "英雄：" + state.heroes.length + "/" + (state.rosterInfo ? state.rosterInfo.capacity : "—")
                : "英雄：—",
        };
    }
}
