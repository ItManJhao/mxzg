import { AccountModel } from "../account/AccountModel";
import { AccountService, SessionChanged } from "../account/AccountService";
import { CampaignApi } from "./CampaignApi";
import { BagController } from "../Bag/BagController";
import type { CampaignState, CampaignReport } from "./CampaignApi";
export type CampaignPhase = "loading" | "idle" | "formation" | "challenging" | "replaying" | "result" | "claiming" | "error";
export interface CampaignActions {
    fight(): void;
    speed(): void;
    skip(): void;
}
export interface CampaignScreen {
    bind(actions: CampaignActions): () => void;
    render(state: CampaignState | null, phase: CampaignPhase, error: string): void;
    replay(report: CampaignReport): Promise<void>;
    showResult(report: CampaignReport, confirm: () => void): Promise<void>;
    dismissResult(): void;
    nextSpeed(): void;
    skipReplay(): void;
    prepareFight?(): Promise<boolean>;
}
function requestId(): string {
    // Idempotency identifier, not a credential. WeChat runtimes may not provide Web Crypto.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, part => {
        const value = Math.floor(Math.random() * 16);
        return (part === "x" ? value : (value & 3) | 8).toString(16);
    });
}
/** Network mutations and replay lifetime. Rewards are applied only by the server claim. */
export class CampaignController {
    private state: CampaignState | null = null;
    private phase: CampaignPhase = "loading";
    private closed = false;
    private epoch = 0;
    private report: CampaignReport | null = null;
    private request: string | null = null;
    private disposers: Array<() => void> = [];
    constructor(private readonly account: AccountModel, private readonly service: AccountService, private readonly api: CampaignApi, private readonly view: CampaignScreen, private readonly notice: (text: string) => void,
        private readonly bag: BagController = BagController.instance) { }
    show(): void {
        if (this.closed || this.disposers.length)
            return;
        const role = this.account.snapshot.role?.id;
        this.disposers = [this.view.bind({ fight: () => { void this.fight(); }, speed: () => this.view.nextSpeed(), skip: () => this.view.skipReplay() }),
            this.account.subscribe(state => { if (!state.role || state.role.id !== role || state.busy) {
                this.epoch++;
                this.view.skipReplay();
            } })];
        void this.load();
    }
    private paint(phase: CampaignPhase, error = ""): void { this.phase = phase; this.view.render(this.state, phase, error); }
    private accepts(epoch: number): boolean { return !this.closed && epoch === this.epoch; }
    private async load(): Promise<void> {
        const epoch = ++this.epoch;
        this.paint("loading");
        try {
            const state = await this.service.authenticated(token => this.api.current(token));
            if (!this.accepts(epoch))
                return;
            this.state = state;
            if (state.pending)
                await this.play(state.pending, epoch);
            else
                this.paint("idle");
        }
        catch (error) {
            this.fail(epoch, error);
        }
    }
    private async fight(): Promise<void> {
        if (this.closed || ["loading", "formation", "challenging", "replaying", "result", "claiming"].includes(this.phase))
            return;
        if (!this.state) {
            await this.load();
            return;
        }
        const epoch = ++this.epoch;
        if (this.report && !this.report.claimed) {
            await this.play(this.report, epoch).catch(error => this.fail(epoch, error));
            return;
        }
        this.notice("");
        try {
            this.paint("formation");
            const confirmed = this.view.prepareFight ? await this.view.prepareFight() : true;
            if (!this.accepts(epoch)) return;
            if (!confirmed) { await this.load(); return; }
            this.request = this.request || requestId();
            this.paint("challenging");
            const report = await this.service.authenticated(token => this.api.challenge(token, this.request!));
            if (!this.accepts(epoch))
                return;
            this.request = null;
            await this.play(report, epoch);
        }
        catch (error) {
            this.fail(epoch, error);
        }
    }
    private async play(report: CampaignReport, epoch: number): Promise<void> {
        this.report = report;
        this.paint("replaying");
        await this.view.replay(report);
        if (!this.accepts(epoch))
            return;
        this.paint("result");
        await this.view.showResult(report, () => { void this.claim(); });
    }
    private async claim(): Promise<void> {
        if (this.closed || !this.report || this.phase === "claiming")
            return;
        const epoch = ++this.epoch, id = this.report.id;
        this.paint("claiming");
        try {
            await this.bag.runInventoryUpdate("campaign-claim:" + id,
                () => this.service.authenticated(token => this.api.claim(token, id)),
                result => {
                    if (result.battle.id !== id) throw new Error("战斗结算响应与请求不一致");
                    return result.inventory;
                },
                result => {
                    this.service.acceptRole(result.role);
                    if (this.accepts(epoch) && this.state) this.state = { ...this.state, stageId: result.stageId, pending: null };
                }, "reward");
            if (!this.accepts(epoch))
                return;
            this.report = null;
            this.view.dismissResult();
            await this.load();
        }
        catch (error) {
            this.fail(epoch, error);
        }
    }
    private fail(epoch: number, error: unknown): void {
        if (!this.accepts(epoch) || error instanceof SessionChanged)
            return;
        const message = error instanceof Error ? error.message : "战斗请求失败，请重试";
        this.paint("error", message);
        this.notice(message);
    }
    close(): void {
        if (this.closed)
            return;
        this.closed = true;
        this.epoch++;
        this.state = null;
        this.report = null;
        for (const off of this.disposers.splice(0))
            off();
        this.view.skipReplay();
    }
}
