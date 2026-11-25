/** 竞技场子窗口入口，沿用共享布阵和商店数量选择，业务保存仍由竞技场控制器负责。 */
import type { BaseView } from "../../../framework/ui/BaseView";
import { UIManager } from "../../../framework/ui/UIManager";
import type { MainFormation } from "../../hero/data/HeroSnapshotUtils";
import { HeroRosterModel } from "../../hero/HeroRosterModel";
import { FormationView } from "../../hero/ui/FormationView";
import { ArenaController } from "../ArenaController";
import { ArenaModel } from "../ArenaModel";
import { ArenaShopView } from "./ArenaShopView";

export class ArenaDialogs {
    /** 子窗口操作是静态入口。 */
    private constructor() {}

    /** 权威防守阵容到达后打开编辑，关闭父窗会自动取消子窗。 */
    public static async openDefense(parent: BaseView): Promise<void> {
        const controller = ArenaController.instance;
        if (!(await controller.fetchDefense()) || !parent.isValid || !parent.node.activeInHierarchy) {
            return;
        }
        await UIManager.instance.openChild(parent, FormationView, {
            title: "防守布阵",
            formation: {
                read: () => this.readDefense(),
                save: (draft, complete) => controller.saveDefense(draft, complete),
            },
            complete: () => { /* 保留原挑战页，不因为编辑阵容自动出战。 */ },
        }).catch(error => this.reportOpen(error, "防守布阵"));
    }

    /** 竞技币目录与购买进度交给商店窗口显示。 */
    public static openShop(parent: BaseView): void {
        void UIManager.instance.openChild(parent, ArenaShopView)
            .catch(error => this.reportOpen(error, "竞技商店"));
    }

    /** 共用主阵型解锁快照，站位、版本和保存结果取专用防守阵容。 */
    private static readDefense(): MainFormation | null {
        const main = HeroRosterModel.instance.snapshot.mainFormation;
        const defense = ArenaModel.instance.defense;
        if (!main || !defense) {
            return null;
        }
        const options = main.options?.map(row => ({
            formationId: row.formationId,
            openPositions: row.openPositions.filter(position => position !== 9),
        }));
        return {
            ...main,
            version: defense.version,
            formationId: defense.formationId,
            slots: defense.slots,
            assistanceUnlocked: false,
            options,
        };
    }

    /** 框架已报告或被父窗取消的打开操作无需再次提示。 */
    private static reportOpen(error: unknown, title: string): void {
        if (!UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
            UIManager.instance.toast(`${title}打开失败`);
        }
    }
}
