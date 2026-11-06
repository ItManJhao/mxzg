/** 英雄名册控制器：统一登录/恢复和服务端同步 → 唯一 Model → 列表刷新事件；不持有账号、凭证或查询接口。 */
import { GameLog } from "../../core/GameLog";
import { BaseController } from "../../framework/BaseController";
import { publishNotification } from "../../framework/EventDispatcher";
import { Protocol, ProtocolName } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { statePayload, STATE_PROTOCOLS } from "../../platform/ProtocolState";
import { readOwnedHeroes, readHeroRosterInfo, readMainFormation } from "./data/HeroSnapshotData";
import { HeroRosterModel } from "./HeroRosterModel";
import { HeroRosterEvent } from "./utils/HeroRosterEvent";

export class HeroRosterController extends BaseController {
    /** 应用唯一模块，独立于窗口开关。 */
    static readonly instance = new HeroRosterController(HeroRosterModel.instance);

    /** 注入唯一名册状态；构造不联网，不监听登录。 */
    constructor(private readonly model: HeroRosterModel) {
        super();
    }

    /** 登记真实统一状态协议，身份协调由应用层处理。 */
    protected onInitialize(): void {
        this.ownListener(ProtocolRouter.instance.register(this, STATE_PROTOCOLS));
        this.resetSession(null);
    }

    /** 换号或退出清空上一角色数据，禁止额外查询。 */
    protected onResetSession(roleKey: string | null): void {
        this.model.reset(roleKey);
        this.notify();
    }

    /** 明确名册接收的登录、恢复和资产同步消息。 */
    onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.SESSION_LOGIN:
            case Protocol.SESSION_AUTHENTICATE:
            case Protocol.STATE_CHANGED:
                this.onHeroState(protocol, data);
                break;
            default:
                // 路由会拒绝非法回包；模块仅忽略不属于自身的通知，不触碰Model。
                GameLog.shared.warnOnce("MODULE", "HeroRosterController", "UNHANDLED_PROTOCOL:" + protocol,
                    "英雄名册未登记协议：" + protocol + "；已忽略，未更新数据");
                return;
        }
    }

    /** 提交服务端完整名册，空数组表示没有英雄；不推算升级或增减英雄。 */
    private onHeroState(protocol: ProtocolName, data: unknown): void {
        const heroes = readOwnedHeroes(statePayload(protocol, data).heroes);
        const rosterInfo = readHeroRosterInfo(statePayload(protocol, data).heroRoster);
        const mainFormation = readMainFormation(statePayload(protocol, data).mainFormation, heroes);
        this.model.replace({ status: "ready", heroes, rosterInfo, mainFormation, error: "" });
        this.notify();
    }

    /** 延后通知，确保同一快照的角色、背包和名册已全部提交。 */
    private notify(): void {
        publishNotification(() => this.emit(HeroRosterEvent.Updated, {
            roleKey: this.model.roleKey, revision: this.model.version,
        }));
    }
}
