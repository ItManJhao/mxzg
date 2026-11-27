/**
 * 登录后的开发 GM 菜单，供个人资料手势和 Creator 预览热键共用。
 * 账号服务交付认证后的网络结果。关窗保留同一发放的重试记录，退出时清理。
 */
import { EventKeyboard, input, Input, KeyCode } from "cc";
import type { BaseView } from "../../framework/ui/BaseView";
import { OpenCancelled, UIManager } from "../../framework/ui/UIManager";
import type { RoleProfile } from "../account/AccountModel";
import type { AccountOperations } from "../account/AccountOperations";
import type { AccountController } from "../account/AccountController";
import { BattlePreviewController } from "../battle/BattlePreviewController";
import type { BattlePreviewResult } from "../battle/BattlePreviewModel";
import type { GmOpenArgs } from "./data/GmViewArgs";
import { GmController } from "./GmController";
import { GmView } from "./ui/GmView";

/** 登录应用持有一套 GM 菜单，实际资产操作由服务端 GM 开关控制。 */
export class GmPreviewMenu {
    /** 总菜单与子窗共用的控制器，关窗后仍可用原参数重试发放。 */
    private readonly grants: GmController;
    /** 当前应用的只读阵容试战协议接收者，销毁时解除登记。 */
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
     * 把 GM 和只读试战接到当前应用的认证通道，并按宿主能力登记热键。
     * @param service 提供当前可打开菜单的角色资料。
     * @param operations 提供已认证的 GM 和试战请求，交付当前操作的结果。
     * @param inHome 判断启动是否完成且主城可用。
     * @param showBattle 播放只读战报，原试战窗口关闭时结束尚在准备的演示。
     * @param showSkills 本机可加载 Creator 技能样本时打开现有目录，否则不提供该入口。
     * @param useShortcut true 时登记 F9，手机等其他宿主只通过资料页调用。
     */
    public constructor(
        private readonly service: Pick<AccountController, "currentRole">,
        operations: Pick<AccountOperations, "request" | "deliver">,
        private readonly inHome: () => boolean,
        private readonly showBattle: (result: BattlePreviewResult, stillOpen: () => boolean) => Promise<void>,
        private readonly showSkills: (() => Promise<void>) | undefined,
        private readonly useShortcut: boolean,
    ) {
        this.grants = new GmController(operations);
        this.battle = new BattlePreviewController(operations);
        if (useShortcut) {
            input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        }
    }

    /** 在触发手势的资料页下打开 GM。资料页关闭时，框架一并取消加载或关闭 GM。 */
    public openFromProfile(owner: BaseView<unknown>): void {
        if (!this.disposed && !this.hasOpenWindows()) {
            this.openForCurrentRole(owner);
        }
    }

    /** 角色页面统一重置时撤回待开窗口，释放原发放意图。 */
    public reset(): void {
        this.closeWindows();
        this.grants.reset();
    }

    /** 应用退出时撤销已注册的热键、窗口和试战协议。 */
    public dispose(): void {
        this.disposed = true;
        if (this.useShortcut) {
            input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        }
        this.reset();
        this.battle.dispose();
    }

    /** 仅松开 F9 切换一次，长按或其他键不连发。 */
    private onKeyUp(event: EventKeyboard): void {
        if (this.disposed || event.keyCode !== KeyCode.F9) {
            return;
        }
        if (this.hasOpenWindows()) {
            this.closeWindows();
            return;
        }
        this.openForCurrentRole();
    }

    /** 总菜单及其子窗共享一组打开状态，保证两个入口不会并发创建同一窗口。 */
    private hasOpenWindows(): boolean {
        const ui = UIManager.instance;
        return this.opening || ui.isOpen("gm") || ui.isOpen("gm-grant") || ui.isOpen("gm-battle") || ui.isOpen("gm-tools");
    }

    /** 从账号服务读取当前角色。资料入口携带所属页面，F9 独立开窗。 */
    private openForCurrentRole(owner?: BaseView<unknown>): void {
        const role = this.service.currentRole;
        if (this.inHome() && role) {
            void this.open(role, owner);
        }
    }

    /** 打开总菜单并提供最新角色等级，所属页面关闭或会话重置都会取消等待中的窗口。 */
    private async open(role: Readonly<RoleProfile>, owner?: BaseView<unknown>): Promise<void> {
        // 菜单也可以通过窗口按钮关闭；重开前撤销原菜单正在加载的技能窗。
        if (this.openingSkills) {
            this.closeWindows();
        }
        const generation = ++this.generation;
        this.opening = true;
        try {
            const args: GmOpenArgs = {
                controller: this.grants,
                roleId: role.id,
                nickname: role.nickname,
                readRoleLevel: () => this.service.currentRole?.level,
                openLineupBattle: (mission, stillOpen) => this.openBattle(mission, generation, stillOpen),
                openSkillAudit: this.showSkills ? () => this.openSkills(generation) : undefined,
            };
            const ui = UIManager.instance;
            if (owner) {
                await ui.openChild(owner, GmView, args);
            } else {
                await ui.open(GmView, args);
            }
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
        const showSkills = this.showSkills;
        if (!showSkills || generation !== this.generation || !UIManager.instance.isOpen("gm")) {
            throw new OpenCancelled();
        }
        this.openingSkills = true;
        try {
            await showSkills();
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
