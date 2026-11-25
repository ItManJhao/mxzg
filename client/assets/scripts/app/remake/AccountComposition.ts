/** 会话装配：创建统一账号Model、WS连接、选服与凭证服务；接纳连接前校验角色及冒险点。
 * 不打开页面、不建立模块副本，不以普通库存补齐旧快照缺失的冒险点。 */
import { MainChapterModel } from "../../features/battle/MainChapterModel";
import {sys} from "cc";
import {PREVIEW} from "cc/env";
import { GameLog } from "../../core/GameLog";
import { ServerClock } from "../../core/ServerClock";
import { AccountApi } from "../../features/account/AccountApi";
import {AccountModel} from "../../features/account/AccountModel";
import {AccountController} from "../../features/account/AccountController";
import {ServerSelectionController} from "../../features/account/ServerSelectionController";
import { BagItemDataUtils } from "../../features/bag/data/BagItemDataUtils";
import { GAME_SOCKET_PROTOCOL } from "../../platform/GameProtocolCodecUtils";
import type { GameFrame } from "../../platform/GameProtocolCodecUtils";
import { GameProtocolLogUtils } from "../../platform/GameProtocolLogUtils";
import {GameSocketClient} from "../../platform/GameSocketClient";
import { IsolatedSocketPreviewUtils } from "./IsolatedSocketPreviewUtils";

/** 开发身份存储键保持原值，不改变现有登录行为。 */
const SESSION_KEY = "mxzg.remake.developmentSession";

/** 同一次应用启动共用的账号、连接与选服服务。 */
export interface ApplicationAccount {
    /** 当前登录与角色状态，供页面订阅和模块装配使用。 */
    model: AccountModel;
    /** 本次应用的唯一游戏连接。 */
    socket: GameSocketClient;
    /** 负责凭证、登录和会话有效性判断。 */
    controller: AccountController;
    /** 查询可用区服并记住选择。 */
    servers: ServerSelectionController;
    /** 当前环境的持久存储命名空间，用于恢复同一角色的原操作。 */
    storageNamespace: string;
}

export class AccountComposition {
    private constructor() {
    }

    /** 创建账号和连接，绑定应用公共时钟，并在接纳连接前校验角色快照。 */
    public static async create(socketUrl: string): Promise<ApplicationAccount> {
        const model = new AccountModel();
        const connection = await IsolatedSocketPreviewUtils.isolatedSocketPreview(socketUrl, sys.localStorage);

        const socket = new GameSocketClient(connection.socketUrl, {
            create: url => new WebSocket(url, GAME_SOCKET_PROTOCOL),
            clock: ServerClock.instance,
            onReceive: PREVIEW ? frame => {
                const message = GameProtocolLogUtils.formatServerFrame(frame);
                if (message) GameLog.shared.classified("APP", "debug", "WS接收", message);
            } : undefined,
            validateSnapshot: value => {
                if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("恢复数据无效");
                const snapshot = value as Record<string, unknown>;
                MainChapterModel.readState(snapshot.mainChapter, Number(snapshot.revision));
                AccountApi.readSnapshotRole(snapshot);
                BagItemDataUtils.readBagItems(snapshot.inventory);
                BagItemDataUtils.readTimedItems(snapshot.timedInventory);
                if (!Number.isSafeInteger(snapshot.revision) || Number(snapshot.revision) < 0) throw new Error("状态版本无效");
            },
        });
        const api = new AccountApi(socket);
        const storage = connection.storage;
        let savedServer: string | null = null;
        try {
            savedServer = storage.getItem("mxzg.remake.selectedServer");
        } catch {
        }
        const servers = new ServerSelectionController(socket, id => storage.setItem("mxzg.remake.selectedServer", id), savedServer);
        const controller = new AccountController(model, api, {
            read: () => {
                const saved = storage.getItem(SESSION_KEY);
                return saved ? AccountApi.readSession(JSON.parse(saved)) : null;
            },
            write: session => storage.setItem(SESSION_KEY, JSON.stringify(session)),
            clear: () => storage.removeItem(SESSION_KEY),
        });
        return {model, socket, controller, servers, storageNamespace: connection.storageNamespace};
    }

    /**
     * 把登录首包、在线推送和重连鉴权接到同一个状态入口。掉线只报告连接状态，
     * 服务端拒绝凭证才通知账号服务结束会话。返回的清理函数随模块卸载解除全部连接回调。
     */
    public static bind(
        account: Pick<ApplicationAccount, "model" | "socket" | "controller">,
        acceptState: (frame: GameFrame) => void,
        acceptReward: (frame: GameFrame) => void,
        showConnectionNotice: (message: string) => void,
        acceptGuildUpdate: ((frame: GameFrame) => void) | null = null,
        acceptQuestChange: ((frame: GameFrame) => void) | null = null,
        acceptSocialChange: ((frame: GameFrame) => void) | null = null,
    ): () => void {
        const {model, socket, controller} = account;
        let disconnected = false;
        controller.onInitialized = acceptState;
        socket.onState = acceptState;
        socket.onReward = acceptReward;
        socket.onGuildUpdated = acceptGuildUpdate;
        socket.onQuestChanged = acceptQuestChange;
        socket.onSocialChanged = acceptSocialChange;
        socket.onRejected = (token, message) => controller.rejectSession(token, message);
        socket.onReady = () => {
            if (disconnected) {
                showConnectionNotice("");
                disconnected = false;
            }
            if (model.snapshot.role && !model.snapshot.busy && socket.latestState) {
                acceptState(socket.latestState);
            }
        };
        socket.onDisconnected = message => {
            if (model.snapshot.role && !model.snapshot.busy) {
                disconnected = true;
                showConnectionNotice(message);
            }
        };
        return () => {
            controller.onInitialized = null;
            socket.onState = null;
            socket.onReward = null;
            socket.onGuildUpdated = null;
            socket.onQuestChanged = null;
            socket.onSocialChanged = null;
            socket.onRejected = null;
            socket.onReady = null;
            socket.onDisconnected = null;
        };
    }
}
