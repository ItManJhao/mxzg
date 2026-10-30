import { HttpFailure } from "../../platform/http/JsonClient";
import { AccountService, SessionChanged } from "../account/AccountService";
import { AccountModel } from "../account/AccountModel";
import { HeroApi, OwnedHero } from "./HeroApi";
import { HeroCatalog } from "./HeroCatalog";
import { LineupApi, MainLineup, MAIN_POSITIONS } from "./LineupApi";
export interface FormationState {
    heroes: readonly OwnedHero[];
    lineup: MainLineup;
    busy: boolean;
    message: string;
}
export interface FormationActions {
    toggle(id: string): void;
    remove(position: number): void;
    confirm(): void;
    cancel(): void;
    retry(): void;
}
export interface FormationScreen {
    bind(actions: FormationActions, catalog: HeroCatalog): () => void;
    render(state: FormationState): void;
    complete(confirmed: boolean): void;
}
/** Editable UUID draft; confirmation saves the owned lineup before any challenge. */
export class FormationController {
    private state: FormationState = { heroes: [], lineup: { version: 0, slots: [] }, busy: true, message: "正在读取阵容…" };
    private closed = false;
    private loaded = false;
    private saving = false;
    private epoch = 0;
    private disposers: Array<() => void> = [];
    constructor(
        private readonly account: AccountModel,
        private readonly service: AccountService,
        private readonly heroes: HeroApi,
        private readonly api: LineupApi,
        private readonly catalog: HeroCatalog,
        private readonly view: FormationScreen,
    ) { }
    show(): void {
        const role = this.account.snapshot.role?.id;
        const actions: FormationActions = {
            toggle: id => this.toggle(id),
            remove: position => this.remove(position),
            confirm: () => { void this.save(); },
            cancel: () => { if (!this.saving) this.view.complete(false); },
            retry: () => { void this.load(); },
        };
        this.disposers = [
            this.view.bind(actions, this.catalog),
            this.account.subscribe(state => {
                if (!state.role || state.role.id !== role || state.busy) this.view.complete(false);
            }),
        ];
        void this.load();
    }
    private paint(): void {
        if (!this.closed) this.view.render(this.state);
    }
    private async load(): Promise<void> {
        const epoch = ++this.epoch;
        this.state = { ...this.state, busy: true, message: "正在读取阵容…" };
        this.paint();
        try {
            const [heroes, lineup] = await this.service.authenticated(token => Promise.all([this.heroes.list(token), this.api.current(token)]));
            if (this.closed || epoch !== this.epoch)
                return;
            if (lineup.slots.some(slot => !heroes.some(hero => hero.id === slot.heroId)))
                throw new Error("出阵英雄不在当前名册，请重试");
            this.loaded = true;
            this.state = { heroes, lineup, busy: false, message: "点击英雄上阵，点击阵位撤下" };
            this.paint();
        }
        catch (error) {
            this.fail(epoch, error);
        }
    }
    private toggle(id: string): void {
        if (!this.loaded || this.state.busy || this.closed)
            return;
        const previous = this.state.lineup.slots.find(slot => slot.heroId === id);
        if (previous) {
            this.remove(previous.position);
            return;
        }
        if (!this.state.heroes.some(hero => hero.id === id))
            return;
        const position = MAIN_POSITIONS.find(pos => !this.state.lineup.slots.some(slot => slot.position === pos));
        if (position === undefined) {
            this.state = { ...this.state, message: "最多上阵七名英雄" };
            this.paint();
            return;
        }
        this.state = { ...this.state, lineup: { ...this.state.lineup, slots: [...this.state.lineup.slots, { position, heroId: id }] }, message: "阵容尚未保存，点击出阵确认" };
        this.paint();
    }
    private remove(position: number): void {
        if (this.state.busy || this.closed)
            return;
        this.state = { ...this.state, lineup: { ...this.state.lineup, slots: this.state.lineup.slots.filter(slot => slot.position !== position) }, message: "阵容尚未保存，点击出阵确认" };
        this.paint();
    }
    private async save(): Promise<void> {
        if (this.state.busy || this.closed)
            return;
        if (!this.loaded) {
            await this.load();
            return;
        }
        if (!this.state.lineup.slots.length) {
            this.state = { ...this.state, message: "至少上阵一名英雄才能挑战" };
            this.paint();
            return;
        }
        const epoch = ++this.epoch;
        this.saving = true;
        this.state = { ...this.state, busy: true, message: "正在保存阵容…" };
        this.paint();
        try {
            await this.service.authenticated(token => this.api.save(token, this.state.lineup));
            if (!this.closed && epoch === this.epoch)
                this.view.complete(true);
        }
        catch (error) {
            if (error instanceof HttpFailure && error.status === 409 && !this.closed) {
                await this.load();
                this.state = { ...this.state, message: "阵容已在其他操作中更新，请重新选择并确认" };
                this.paint();
            }
            else
                this.fail(epoch, error);
        }
        finally {
            this.saving = false;
        }
    }
    private fail(epoch: number, error: unknown): void {
        if (this.closed || epoch !== this.epoch || error instanceof SessionChanged)
            return;
        // A failed/ambiguous save must be re-read before another save; never overwrite a newer version.
        this.loaded = false;
        this.state = { ...this.state, busy: false, message: (error instanceof Error ? error.message : "阵容读取失败") + "，点击出阵重新读取" };
        this.paint();
    }
    close(): void {
        this.closed = true;
        this.epoch++;
        for (const off of this.disposers.splice(0)) off();
    }
}
