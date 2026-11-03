/** 英雄名册唯一状态：保存只读英雄与同步状态，由模块 Controller 提交，不持有网络或监听。 */
import type {OwnedHero, HeroRosterInfo} from "./HeroApi";
import {BaseModel} from "../../framework/BaseModel";

export interface HeroRosterState {
    readonly status: "idle" | "loading" | "ready" | "error";
    readonly heroes: readonly OwnedHero[];
    readonly error: string;
    /** 同一快照下发的总容量；缺失时显示未同步，不使用本地默认上限。 */
    readonly rosterInfo?:HeroRosterInfo;
}

export class HeroRosterModel extends BaseModel {
    static readonly instance = new HeroRosterModel();
    private state: HeroRosterState = Object.freeze({status: "idle", heroes: Object.freeze([]), error: ""});

    /** 返回当前角色只读状态与基类版本，不另存版本计数。 */
    get snapshot(): HeroRosterState & { readonly roleKey: string | null; readonly revision: number } {
        return Object.freeze({...this.state, roleKey: this.roleKey, revision: this.version});
    }

    /** 提交整批状态；输入由 Controller 校验，复制英雄避免外部后续修改。 */
    replace(state: HeroRosterState): void {
        this.state = Object.freeze({
            ...state,
            rosterInfo:state.rosterInfo?Object.freeze({...state.rosterInfo}):undefined,
            heroes: Object.freeze(state.heroes.map(hero => Object.freeze({...hero})))
        });
        this.incrementVersion();
    }

    /** 会话重置时清空名册；通知由 Controller 统一发布。 */
    protected onReset(): void {
        this.state = Object.freeze({status: "idle", heroes: Object.freeze([]), error: ""});
    }
}
