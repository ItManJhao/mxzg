/**
 * Creator 登录预览中的 GM 菜单：管理 F9、GM 控制器及只读试战的生命周期。
 * 开发预览提供演示画面，账号服务交付网络结果。关窗保留同一发放的重试记录，退出时清理。
 */
import { EventKeyboard, input, Input, KeyCode } from "cc";
import { OpenCancelled, UIManager } from "../../framework/ui/UIManager";
import type { RoleProfile } from "../account/AccountModel";
import type { AccountOperations } from "../account/AccountOperations";
import type { AccountController } from "../account/AccountController";
import { BattlePreviewController } from "../battle/BattlePreviewController";
import type { BattlePreviewResult } from "../battle/BattlePreviewModel";
import { GmController } from "./GmController";
import { GmView } from "./ui/GmView";

/** 已登录开发界面才装配本菜单，独立战报入口和发布版均无需热键或发放请求。 */
export class GmPreviewMenu {
    /** 总菜单与子窗共用的控制器，关窗后仍可用原参数重试发放。 */
    private readonly grants: GmController;
    /** 仅在预览中持有的阵容试战协议接收者，销毁时解除登记。 */
    private readonly battle: BattlePreviewController;
    /** 菜单打开代次；每次关闭递增，用于撤回仍在准备的演示。 */
    private generation = 0;
    /** 菜单正在准备时第二次 F9 会取消本次打开。 */
    private opening = false;
    /** 从菜单打开技能目录尚未完成，关闭菜单时也要撤销这次开窗。 */
    private openingSkills = false;
    /** 销毁后停止处理按键和演示回调。 */
    private disposed = false;

    /**
     * 登记 F9，并把 GM 和只读试战接到当前应用的认证通道。
     * @param service 提供当前可打开菜单的角色资料。
     * @param operations 提供已认证的 GM 和试战请求，交付当前操作的结果。
     * @param inHome 判断启动是否完成且主城可用。
     * @param showBattle 播放只读战报，原试战窗口关闭时结束尚在准备的演示。
     * @param showSkills 打开现有技能演示目录。
     */
    public constructor(
        private readonly service: Pick<AccountController, "currentRole">,
        operations: Pick<AccountOperations, "request" | "deliver">,
        private readonly inHome: () => boolean,
        private readonly showBattle: (result: BattlePreviewResult, stillOpen: () => boolean) => Promise<void>,
        private readonly showSkills: () => Promise<void>,
    ) {
        this.grants = new GmController(operations);
        this.battle = new BattlePreviewController(operations);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    /** 角色页面统一重置时撤回待开窗口，释放原发放意图。 */
    public reset(): void {
        this.closeWindows();
        this.grants.reset();
    }

    /** 预览退出时撤销热键、窗口和试战协议，不中断真实主线战斗。 */
    public dispose(): void {
        this.disposed = true;
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.reset();
        this.battle.dispose();
    }

    /** 仅松开 F9 切换一次，长按或其他键不连发。 */
    private onKeyUp(event: EventKeyboard): void {
        if (this.disposed || event.keyCode !== KeyCode.F9) {
            return;
        }
        const ui = UIManager.instance;
        if (this.opening || ui.isOpen("gm") || ui.isOpen("gm-grant") || ui.isOpen("gm-battle") || ui.isOpen("gm-tools")) {
            this.closeWindows();
            return;
        }
        const role = this.service.currentRole;
        if (this.inHome() && role) {
            void this.open(role);
        }
    }

    /** 为当前主城角色打开总菜单，并提供工具窗的最新角色等级；取消后屏蔽旧开窗结果。 */
    private async open(role: Readonly<RoleProfile>): Promise<void> {
        // 菜单也可以通过窗口按钮关闭；重开前撤销原菜单正在加载的技能窗。
        if (this.openingSkills) {
            this.closeWindows();
        }
        const generation = ++this.generation;
        this.opening = true;
        try {
            await UIManager.instance.open(GmView, {
                controller: this.grants,
                roleId: role.id,
                nickname: role.nickname,
                readRoleLevel: () => this.service.currentRole?.level,
                openLineupBattle: (mission, stillOpen) => this.openBattle(mission, generation, stillOpen),
                openSkillAudit: () => this.openSkills(generation),
            });
        } catch (error) {
            if (generation === this.generation && !UIManager.isOpenCancelled(error) && !UIManager.isFailureReported(error)) {
                UIManager.instance.toast("GM 打开失败：" + String(error));
            }
        } finally {
            if (generation === this.generation) {
                this.opening = false;
            }
        }
    }

    /** 请求并播放试战，仅发起此操作的子窗可以打开战场并收起所属菜单。 */
    private async openBattle(mission: number, generation: number, stillOpen: () => boolean): Promise<void> {
        const canOpen = () => generation === this.generation && stillOpen();
        if (!canOpen()) {
            throw new OpenCancelled();
        }
        UIManager.instance.toast("正在读取保存阵容，仅试战、不发奖…");
        const result = await this.battle.preview(mission);
        if (!result || !canOpen()) {
            throw new OpenCancelled();
        }
        await this.showBattle(result, canOpen);
        if (canOpen()) {
            this.closeWindows();
        }
    }

    /** 技能目录成功后关闭 GM；用户中途关闭总菜单时收回这次尚未展示的技能目录。 */
    private async openSkills(generation: number): Promise<void> {
        if (generation !== this.generation || !UIManager.instance.isOpen("gm")) {
            throw new OpenCancelled();
        }
        this.openingSkills = true;
        try {
            await this.showSkills();
        } finally {
            if (generation === this.generation) {
                this.openingSkills = false;
            }
        }
        if (generation !== this.generation) {
            throw new OpenCancelled();
        }
        if (!UIManager.instance.isOpen("gm")) {
            UIManager.instance.closeById("skill-audit");
            throw new OpenCancelled();
        }
        this.closeWindows();
    }

    /** 从子到父关闭 GM 窗口，包括尚未完成加载的窗口。 */
    private closeWindows(): void {
        this.generation++;
        this.opening = false;
        const ui = UIManager.instance;
        if (this.openingSkills) {
            this.openingSkills = false;
            ui.closeById("skill-audit");
        }
        for (const id of ["gm-grant", "gm-battle", "gm-tools", "gm"]) {
            ui.closeById(id);
        }
    }
}
