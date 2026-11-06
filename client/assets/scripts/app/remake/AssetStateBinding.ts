/** 应用层统一资产提交：校验角色归属和持久版本，再把真实协议交给角色/背包/英雄 onNotify。
 * 同一通知批次完成全部 Model 更新；不查询库存、不反推玩家资产、不保存第二份资产。
 */
import type { FormationController } from "../../features/hero/FormationController";
import type { HeroRosterController } from "../../features/hero/HeroRosterController";
import { readOwnedHeroes, readHeroRosterInfo, readMainFormation } from "../../features/hero/data/HeroSnapshotData";
import type { AccountModel } from "../../features/account/AccountModel";
import type { BagController } from "../../features/bag/BagController";
import type { RoleController } from "../../features/account/RoleController";
import { readRole } from "../../features/account/AccountApi";
import { readBagItems, readTimedItems } from "../../features/bag/data/BagItemData";
import { statePayload } from "../../platform/ProtocolState";
import type { ProtocolName } from "../../platform/Protocol";
import type { GameFrame } from "../../platform/GameProtocolCodec";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { batchNotifications } from "../../framework/EventDispatcher";
export class AssetStateBinding {
    /** 已接纳的区服/角色键；空值表示尚未接收初始化。 */
    private key: string | null = null;
    /** 当前角色已提交的服务端版本，身份变化时归零，不是页面刷新序号。 */
    private revision = -1;
    /** 应用持有账号订阅，销毁时解除。 */
    private readonly stop: () => void;

    /**
     * 装配唯一模块和角色页面清理入口，不直接写模块资产。
     * @param account 当前账号状态，用于整包归属校验及退出清理。
     * @param bag 唯一背包协议入口。
     * @param role 唯一角色协议入口。
     * @param heroes 唯一英雄协议入口，独立测试可省略。
     * @param formation 唯一阵容保存模块，只协调过程状态重置。
     * @param identityChanged 应用关闭旧角色页面；先关闭再重置，同角色恢复不调用。
     */
    constructor(
        private readonly account: AccountModel,
        private readonly bag: BagController,
        private readonly role: RoleController,
        private readonly heroes?: HeroRosterController,
        private readonly formation?: FormationController,
        private readonly identityChanged: () => void = () => {},
    ) {
        this.stop = account.subscribe(state => { if (!state.role) this.clear(); });
    }

    /** 完整校验后提交真实协议；重复及低版本不通知，同版本鉴权首包仍校准时间。 */
    apply(frame: GameFrame): boolean {
        const current = this.account.snapshot;
        if (!current.role || current.busy) return false;
        if (frame.version !== 1 || (frame.kind !== "event" && (frame.kind !== "response" || frame.ok !== true)) || frame.error !== undefined) {
            throw new Error("资产信封无效");
        }
        const state = statePayload(frame.name as ProtocolName, frame.body);
        const role = readRole(state.role);
        const heroRows = readOwnedHeroes(state.heroes);
        readMainFormation(state.mainFormation, heroRows);
        readHeroRosterInfo(state.heroRoster);
        readBagItems(state.inventory);
        readTimedItems(state.timedInventory);
        if (role.id !== current.role.id || role.serverId !== current.role.serverId) throw new Error("资产不属于当前角色");
        const key = (role.serverId || "") + "/" + role.id;
        const revision = Number(state.revision);
        // 恢复首包即使资产未变化，也要重新校准服务器时间；重复推送则丢弃。
        if (this.key === key && (revision < this.revision || (revision === this.revision && frame.name !== "session.authenticate"))) return false;
        batchNotifications(() => {
            if (this.key !== key) this.changeIdentity(key);
            ProtocolRouter.instance.dispatch(this.role, frame);
            ProtocolRouter.instance.dispatch(this.bag, frame);
            if (this.heroes) ProtocolRouter.instance.dispatch(this.heroes, frame);
            this.revision = revision;
        });
        return true;
    }

    /** 应用先关闭旧角色页面，再清空模块业务状态，不撤销服务端已提交的操作。 */
    private changeIdentity(key: string | null): void {
        this.identityChanged();
        this.key = key;
        this.revision = -1;
        this.bag.resetSession(key);
        this.heroes?.resetSession(key);
        this.formation?.resetSession(key);
    }

    /** 登出或登录新身份前统一清理；不查询任何模块数据。 */
    private clear(): void {
        if (this.key !== null) this.changeIdentity(null);
    }

    /** 应用结束时释放订阅和模块。 */
    dispose(): void {
        this.stop();
        this.clear();
        this.role.dispose();
        this.heroes?.dispose();
        this.formation?.dispose();
    }
}
