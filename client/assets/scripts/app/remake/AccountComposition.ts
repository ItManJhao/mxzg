/** 会话装配：创建统一账号Model、WS连接、选服与凭证服务；接纳连接前校验角色及冒险点。
 * 不打开页面、不建立模块副本，不以普通库存补齐旧快照缺失的冒险点。 */
import {MainChapterController} from "../../features/battle/MainChapterController";
import {sys} from "cc";
import {PREVIEW} from "cc/env";
import { GameLog } from "../../core/GameLog";
import { AccountApi } from "../../features/account/AccountApi";
import {AccountModel} from "../../features/account/AccountModel";
import {AccountService} from "../../features/account/AccountService";
import {ServerSelection} from "../../features/account/ServerSelection";
import { BagItemDataUtils } from "../../features/bag/data/BagItemDataUtils";
import { GAME_SOCKET_PROTOCOL } from "../../platform/GameProtocolCodecUtils";
import { GameProtocolLogUtils } from "../../platform/GameProtocolLogUtils";
import {GameSocketClient} from "../../platform/GameSocketClient";
import { IsolatedSocketPreviewUtils } from "./IsolatedSocketPreviewUtils";

/** 开发身份存储键保持原值，不改变现有登录行为。 */
const SESSION_KEY = "mxzg.remake.developmentSession";

export class AccountComposition {
    private constructor() {
    }

    /** 创建会话依赖并在连接推进前校验完整角色扩展，不自动重放写请求；应用销毁时断开socket。 */
    public static async create(socketUrl: string): Promise<{
        model: AccountModel; socket: GameSocketClient; service: AccountService; servers: ServerSelection;
        /** 经过测试实例核验的持久存储作用域，供应用绑定领取恢复。 */
        storageNamespace: string;
    }> {
        const model = new AccountModel();
        const connection = await IsolatedSocketPreviewUtils.isolatedSocketPreview(socketUrl, sys.localStorage);

        const socket = new GameSocketClient(connection.socketUrl, {
            create: url => new WebSocket(url, GAME_SOCKET_PROTOCOL),
            onReceive: PREVIEW ? frame => {
                const message = GameProtocolLogUtils.formatServerFrame(frame);
                if (message) GameLog.shared.classified("APP", "debug", "WS接收", message);
            } : undefined,
            validateSnapshot: value => {
                if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("恢复数据无效");
                const snapshot = value as Record<string, unknown>;
                MainChapterController.readState(snapshot.mainChapter, Number(snapshot.revision));
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
        const servers = new ServerSelection(socket, id => storage.setItem("mxzg.remake.selectedServer", id), savedServer);
        const service = new AccountService(model, api, {
            read: () => {
                const saved = storage.getItem(SESSION_KEY);
                return saved ? AccountApi.readSession(JSON.parse(saved)) : null;
            },
            write: session => storage.setItem(SESSION_KEY, JSON.stringify(session)),
            clear: () => storage.removeItem(SESSION_KEY),
        });
        return {model, socket, service, servers, storageNamespace: connection.storageNamespace};
    }
}
