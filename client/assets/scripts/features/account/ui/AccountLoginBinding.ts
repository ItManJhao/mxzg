/**
 * 登录页显示时订阅账号与区服，向按钮提供登录、恢复和选服操作。
 * 账号服务接收登录结果；页面关闭时解除订阅并取消尚未完成的主城跳转。
 */
import type { AccountModel } from "../AccountModel";
import type { AccountState } from "../AccountModel";
import type { AccountController } from "../AccountController";
import type { ServerSelectionController, GameServer } from "../ServerSelectionController";

export interface AccountActions {
    login(account: string): void;

    restore(): void;

    logout(): void;

    chooseServer?(): void;
}

export interface AccountView {
    bind(actions: AccountActions): () => void;

    render(state: AccountState): void;

    renderServer?(server: GameServer | null): void;

    /** 打开属于当前登录页的选服窗口。 */
    openServerPicker?(selection: ServerSelectionController): void;

    /** 展示进入游戏时的页面错误。 */
    showNotice(message: string): void;

    prepareAccount?(account: string): void;
}

/** 登录页负责绑定交互和显示。登录及切服流程由账号服务完成。 */
export class AccountLoginBinding {
    /** 本次打开登记的视图与状态监听，关页时逐个解除。 */
    private readonly disposers: Array<() => void> = [];
    /** 页面已打开时只登记一组监听。 */
    private open = false;
    /** 当前点击开始的任务，关页即撤销进入回调，避免旧任务打开后来重建的页面。 */
    private entryAttempt: object | null = null;

    /**
     * @param model 订阅当前账号的角色和进度。
     * @param service 提交登录、恢复和退出，由账号层处理会话。
     * @param view 当前登录页的输入与展示。
     * @param enterGame 角色就绪且原登录页仍打开时进入主城。
     * @param selection 区服目录及玩家当前选择，单区服页面可省略。
     */
    constructor(
        private readonly model: AccountModel,
        private readonly service: AccountController,
        private readonly view: AccountView,
        private readonly enterGame: () => void = () => {},
        private readonly selection?: ServerSelectionController,
    ) {}

    /** 打开时预填已知账号一次；之后无会话时保留用户编辑，避免状态刷新覆盖新输入。 */
    public show(): void {
        if (this.open) {
            return;
        }
        this.open = true;
        try {
            if (this.service.accountName) {
                this.view.prepareAccount?.(this.service.accountName);
            }
            this.disposers.push(this.view.bind({
                login: account => {
                    if (!this.model.snapshot.busy && !this.entryAttempt) {
                        void this.startGame(account);
                    }
                },
                restore: () => {
                    if (!this.model.snapshot.busy) {
                        void this.service.restore().then(restored => {
                            if (restored && this.open) {
                                this.view.prepareAccount?.(this.service.accountName);
                            }
                        });
                    }
                },
                logout: () => this.service.logout(),
                chooseServer: () => {
                    if (this.selection && !this.model.snapshot.busy) {
                        this.view.openServerPicker?.(this.selection);
                    }
                },
            }));
            this.disposers.push(this.model.subscribe(state => this.paint(state)));
            const selection = this.selection;
            if (selection) {
                this.disposers.push(selection.subscribe(() => this.view.renderServer?.(selection.selected)));
            }
            this.view.renderServer?.(selection?.selected ?? null);
            this.paint(this.model.snapshot);
        } catch (error) {
            this.close();
            throw error;
        }
    }

    /** 关闭当前登录页，注销监听并取消这一次点击的界面跳转。 */
    public close(): void {
        this.open = false;
        this.entryAttempt = null;
        for (const dispose of this.disposers.splice(0)) {
            dispose();
        }
    }

    /** 将选服与输入交给账号服务；只允许当前点击进入主城。 */
    private async startGame(account: string): Promise<void> {
        const attempt = this.entryAttempt = {};
        try {
            this.paint(this.model.snapshot);
            await this.service.enterServer(account, this.selection?.selected?.id, () => {
                if (this.entryAttempt === attempt) {
                    this.enterGame();
                }
            });
        } catch (error) {
            if (this.entryAttempt === attempt && this.service.currentRole) {
                this.view.showNotice(error instanceof Error ? error.message : "进入主城失败，请重试");
            }
        } finally {
            if (this.entryAttempt === attempt) {
                this.entryAttempt = null;
                this.paint(this.model.snapshot);
            }
        }
    }

    /** 将角色资料、连接进度和按钮等待状态交给登录页展示。 */
    private paint(state: AccountState): void {
        this.view.render({ ...state, busy: state.busy || !!this.entryAttempt });
    }
}
