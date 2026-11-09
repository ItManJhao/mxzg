/** 会话装配：创建统一账号Model、WS连接、选服与凭证服务；不打开页面、不建立模块副本。 */
import { MainChapterController } from "../../features/battle/MainChapterController";
import { sys } from "cc";
import { PREVIEW } from "cc/env";
import { GameLog } from "../../core/GameLog";
import { AccountApi, readRole, readSession } from "../../features/account/AccountApi";
import { AccountModel } from "../../features/account/AccountModel";
import { AccountService } from "../../features/account/AccountService";
import { ServerSelection } from "../../features/account/ServerSelection";
import { readBagItems, readTimedItems } from "../../features/bag/data/BagItemData";
import { GAME_SOCKET_PROTOCOL } from "../../platform/GameProtocolCodec";
import { formatServerFrame } from "../../platform/GameProtocolLog";
import { GameSocketClient } from "../../platform/GameSocketClient";
import { isolatedSocketPreview } from "./IsolatedSocketPreview";

/** 开发身份存储键保持原值，不改变现有登录行为。 */
const SESSION_KEY = "mxzg.remake.developmentSession";

export class AccountComposition {
    private constructor() { }

    /** 创建会话依赖，不自动重放写请求；调用方在应用销毁时断开socket。 */
    public static async create(socketUrl: string): Promise<{
        model: AccountModel; socket: GameSocketClient; service: AccountService; servers: ServerSelection;
    }> {
        const model = new AccountModel();
        const connection = await isolatedSocketPreview(socketUrl, sys.localStorage);

        const socket = new GameSocketClient(connection.socketUrl, {
            create: url => new WebSocket(url, GAME_SOCKET_PROTOCOL),
            onReceive: PREVIEW ? frame => {
                const message = formatServerFrame(frame);
                if(message) GameLog.shared.classified("APP", "debug", "WS接收", message);
            } : undefined,
            validateSnapshot: value => {
                if(!value || typeof value !== "object" || Array.isArray(value)) throw new Error("恢复数据无效");
                const snapshot = value as Record<string, unknown>;
                MainChapterController.readState(snapshot.mainChapter, Number(snapshot.revision));
                readRole(snapshot.role); readBagItems(snapshot.inventory); readTimedItems(snapshot.timedInventory);
                if(!Number.isSafeInteger(snapshot.revision) || Number(snapshot.revision) < 0) throw new Error("状态版本无效");
            },
        });
        const api = new AccountApi(socket);
        const storage = connection.storage;
        let savedServer: string | null = null;
        try { savedServer = storage.getItem("mxzg.remake.selectedServer"); } catch { }
        const servers = new ServerSelection(socket, id => storage.setItem("mxzg.remake.selectedServer", id), savedServer);
        const service = new AccountService(model, api, {
            read: () => { const saved = storage.getItem(SESSION_KEY); return saved ? readSession(JSON.parse(saved)) : null; },
            write: session => storage.setItem(SESSION_KEY, JSON.stringify(session)),
            clear: () => storage.removeItem(SESSION_KEY),
        });
        return { model, socket, service, servers };
    }
}
