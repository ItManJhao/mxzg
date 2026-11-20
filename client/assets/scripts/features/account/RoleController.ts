/**
 * 角色协议控制器收发命名、个人空间及新手赠礼消息。
 * 角色资料和冒险点由统一快照写入唯一账号 Model，装饰资格和目录由当前窗口读取。
 */
import { GameLog } from "../../core/GameLog";
import { EventDispatcher } from "../../framework/EventDispatcher";
import { UIManager } from "../../framework/ui/UIManager";
import { AccountApi } from "./AccountApi";
import type { AccountModel } from "./AccountModel";
import type { AccountOperations } from "./AccountOperations";
import type { AuthenticatedGameProtocol, ProtocolName } from "../../platform/Protocol";
import { Protocol } from "../../platform/Protocol";
import { ProtocolRouter } from "../../platform/ProtocolRouter";
import { ProtocolStateUtils, STATE_PROTOCOLS } from "../../platform/ProtocolStateUtils";
import type { RewardBinding } from "../reward/RewardBinding";
import type { RewardNotice } from "../reward/data/RewardNoticeData";

/** 仅通知命名窗口更新随机输入或恢复确认按钮，角色资料仍来自快照。 */
export const RoleNameEvent = {
    Suggested: "role-name:suggested",
    Submitted: "role-name:submitted",
} as const;

/** 个人空间子窗口的操作确认和只读目录通知。 */
export const RoleProfileEvent = {
    AppearanceSaved: "role-profile:appearance-saved",
    Images: "role-profile:images",
    Titles: "role-profile:titles",
    Decorations: "role-profile:decorations",
    DecorationSaved: "role-profile:decoration-saved",
    Renamed: "role-profile:renamed",
} as const;

/** 服务端发放的称号记录，结束时间 -1 为永久、0 为回收、正数为 Unix 秒。 */
export interface OwnedRoleTitle {
    readonly idx: number;
    readonly endTimeSeconds: number;
}

/** 服务端交付当前角色的装饰资格，个人空间窗口按需显示。 */
export interface RoleDecorations {
    /** 已永久解锁的头像 ID。 */
    readonly headIds: readonly number[];
    /** 已激活的头像框及期限，-1 表示永久。 */
    readonly borders: readonly { readonly id: number; readonly expiresAtSeconds: number }[];
    /** 累计充值，100 单位等于 1 pt。 */
    readonly totalRecharge: number;
    /** 聊天是否展示已满足充值条件的贵重标记。 */
    readonly showPeerage: boolean;
}

/** 新手赠礼回包处理结束，供领取窗口恢复按钮。 */
export const WelcomeGiftFinished = "role-welcome-gift:finished";

declare module "../../framework/EventDispatcher" {
    interface EventPayloads {
        [RoleNameEvent.Suggested]: string | null;
        [RoleNameEvent.Submitted]: void;
        [RoleProfileEvent.AppearanceSaved]: boolean;
        [RoleProfileEvent.Images]: readonly number[] | null;
        [RoleProfileEvent.Titles]: readonly OwnedRoleTitle[] | null;
        [RoleProfileEvent.Decorations]: RoleDecorations | null;
        [RoleProfileEvent.DecorationSaved]: boolean;
        [RoleProfileEvent.Renamed]: boolean;
        [WelcomeGiftFinished]: void;
    }
}

export class RoleController {
    /** 模块的协议登记，销毁应用时释放。 */
    private readonly stop: () => void;

    /**
     * @param model 应用唯一角色资料来源，保存服务端快照。
     * @param operations 账号提供的认证通道，仅渲染角色快照时可省略。
     * @param rewards 当前应用通用发奖队列，接纳新手赠礼回包中的实际奖励。
     */
    constructor(
        private readonly model: AccountModel,
        private readonly operations?: Pick<AccountOperations, "deliver">,
        private readonly rewards?: Pick<RewardBinding, "restore">,
    ) {
        this.stop = ProtocolRouter.instance.register(this, [
            ...STATE_PROTOCOLS, Protocol.ROLE_NAME_RANDOM, Protocol.ROLE_NAME_SET, Protocol.ROLE_WELCOME_CLAIM,
            Protocol.ROLE_IMAGE_CHANGE, Protocol.ROLE_IMAGES_LIST, Protocol.ROLE_TITLES_LIST, Protocol.ROLE_RENAME,
            Protocol.ROLE_DECORATIONS_LIST, Protocol.ROLE_HEAD_CHANGE, Protocol.ROLE_BORDER_CHANGE,
            Protocol.ROLE_BORDER_ACTIVATE, Protocol.ROLE_PEERAGE_DISPLAY,
        ]);
    }

    /** 向当前区服请求一个可用的随机昵称，结果由命名窗口处理。 */
    public randomName(): void {
        this.send(Protocol.ROLE_NAME_RANDOM, {}, () => EventDispatcher.instance.emit(RoleNameEvent.Suggested, null));
    }

    /** 提交玩家确认的第一次命名，顶栏随下一份权威快照刷新。 */
    public setFirstName(nickname: string): void {
        this.send(Protocol.ROLE_NAME_SET, { nickname }, () => EventDispatcher.instance.emit(RoleNameEvent.Submitted, undefined));
    }

    /** 申请二次改名，费用类型是确认时展示给玩家的选择。 */
    public rename(nickname: string, paymentType: 1 | 2): void {
        this.send(Protocol.ROLE_RENAME, { nickname, paymentType },
            () => EventDispatcher.instance.emit(RoleProfileEvent.Renamed, false));
    }

    /** 查询当前角色图鉴已解锁的形象，不改写角色和英雄快照。 */
    public requestImages(): void {
        this.send(Protocol.ROLE_IMAGES_LIST, {},
            () => EventDispatcher.instance.emit(RoleProfileEvent.Images, null));
    }

    /** 变更形象，实际选择和解锁校验交给服务端。 */
    public changeImage(imageId: number): void {
        this.send(Protocol.ROLE_IMAGE_CHANGE, { imageId },
            () => EventDispatcher.instance.emit(RoleProfileEvent.AppearanceSaved, false));
    }

    /** 查询该角色已获得称号和期限，结果供当前称号窗显示。 */
    public requestTitles(): void {
        this.send(Protocol.ROLE_TITLES_LIST, {},
            () => EventDispatcher.instance.emit(RoleProfileEvent.Titles, null));
    }

    /** 查询当前头像、头像框和贵重标记的权威资格。 */
    public requestDecorations(): void {
        this.send(Protocol.ROLE_DECORATIONS_LIST, {},
            () => EventDispatcher.instance.emit(RoleProfileEvent.Decorations, null));
    }

    /** 更换已获得的头像，装备资料从统一快照更新。 */
    public changeHead(id: number): void {
        this.updateDecoration(Protocol.ROLE_HEAD_CHANGE, { id });
    }

    /** 激活头像框，实际扣除条件物品及计算期限由服务端处理。 */
    public activateBorder(id: number): void {
        this.updateDecoration(Protocol.ROLE_BORDER_ACTIVATE, { id });
    }

    /** 佩戴尚在有效期内的头像框。 */
    public changeBorder(id: number): void {
        this.updateDecoration(Protocol.ROLE_BORDER_CHANGE, { id });
    }

    /** 保存贵重标记是否显示在聊天中。 */
    public setPeerageDisplay(visible: boolean): void {
        this.updateDecoration(Protocol.ROLE_PEERAGE_DISPLAY, { visible });
    }

    /** 提交个人装饰变更，失败时只结束当前操作并保留已同步的资格数据。 */
    private updateDecoration(name: AuthenticatedGameProtocol, body: object): void {
        this.send(name, body, () => EventDispatcher.instance.emit(RoleProfileEvent.DecorationSaved, false));
    }

    /** 申请领取当前角色的新手赠礼，奖励内容和领取状态由服务端决定。 */
    public claimWelcomeGift(): void {
        this.send(Protocol.ROLE_WELCOME_CLAIM, {}, () => EventDispatcher.instance.emit(WelcomeGiftFinished, undefined));
    }

    /** 通过账号通道交付本次回包，失败时恢复对应窗口按钮并显示原因。 */
    private send(name: AuthenticatedGameProtocol, body: object, onFailure: () => void): void {
        void this.operations?.deliver(name, body, frame => ProtocolRouter.instance.dispatch(this, frame), error => {
            onFailure();
            UIManager.instance.toast(error instanceof Error ? error.message : "操作失败，请重试");
        });
    }

    /** 提交角色快照，或将个人空间和领取结果交给各自窗口。 */
    onNotify(protocol: ProtocolName, data: unknown): void {
        switch (protocol) {
            case Protocol.SESSION_LOGIN:
            case Protocol.SESSION_AUTHENTICATE:
            case Protocol.STATE_CHANGED:
                this.onRoleState(protocol, data);
                break;
            case Protocol.ROLE_NAME_RANDOM:
                EventDispatcher.instance.emit(RoleNameEvent.Suggested, (data as { nickname: string }).nickname);
                break;
            case Protocol.ROLE_NAME_SET:
                EventDispatcher.instance.emit(RoleNameEvent.Submitted, undefined);
                break;
            case Protocol.ROLE_RENAME:
                UIManager.instance.toast("改名成功");
                EventDispatcher.instance.emit(RoleProfileEvent.Renamed, true);
                break;
            case Protocol.ROLE_IMAGES_LIST:
                EventDispatcher.instance.emit(RoleProfileEvent.Images, (data as { imageIds: number[] }).imageIds);
                break;
            case Protocol.ROLE_IMAGE_CHANGE:
                UIManager.instance.toast("形象已更换");
                EventDispatcher.instance.emit(RoleProfileEvent.AppearanceSaved, true);
                break;
            case Protocol.ROLE_TITLES_LIST:
                EventDispatcher.instance.emit(RoleProfileEvent.Titles, (data as { titles: OwnedRoleTitle[] }).titles);
                break;
            case Protocol.ROLE_DECORATIONS_LIST:
                EventDispatcher.instance.emit(RoleProfileEvent.Decorations, data as RoleDecorations);
                break;
            case Protocol.ROLE_HEAD_CHANGE:
            case Protocol.ROLE_BORDER_CHANGE:
            case Protocol.ROLE_BORDER_ACTIVATE:
            case Protocol.ROLE_PEERAGE_DISPLAY:
                EventDispatcher.instance.emit(RoleProfileEvent.Decorations, data as RoleDecorations);
                EventDispatcher.instance.emit(RoleProfileEvent.DecorationSaved, true);
                if (protocol !== Protocol.ROLE_PEERAGE_DISPLAY) {
                    UIManager.instance.toast(protocol === Protocol.ROLE_BORDER_ACTIVATE ? "头像框已激活" : "装饰已更换");
                }
                break;
            case Protocol.ROLE_WELCOME_CLAIM:
                this.rewards?.restore(data as RewardNotice);
                EventDispatcher.instance.emit(WelcomeGiftFinished, undefined);
                break;
            default:
                // 路由会拒绝非法回包；模块仅忽略不属于自身的通知，不触碰Model。
                GameLog.shared.warnOnce("MODULE", "RoleController", "UNHANDLED_PROTOCOL:" + protocol,
                    "角色未登记协议：" + protocol + "；已忽略，未更新数据");
                return;
        }
    }

    /** 一次提交经过整体校验的角色及独立冒险点，缺失扩展明确覆盖为未同步，账号Model统一通知。 */
    private onRoleState(protocol: ProtocolName, data: unknown): void {
        const role = AccountApi.readSnapshotRole(ProtocolStateUtils.statePayload(protocol, data));
        this.model.replace({ busy: false, role, error: "" });
    }

    /** 应用销毁时解除登记，关闭页面不调用。 */
    dispose(): void {
        this.stop();
    }
}
