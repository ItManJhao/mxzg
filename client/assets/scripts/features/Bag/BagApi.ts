/** 背包查询适配：只获取并校验完整库存，状态和读写协调仍归 BagController。 */
import type { GameSocketClient } from "../../platform/GameSocketClient";
import { readBagItems } from "./data/BagItemData";
import type { BagItemData } from "./data/BagItemData";

/** Handwritten inventory gateway. No state, event delivery or Model ownership. */
export class BagApi {
    /** 背包仅接受长连接；应用须先完成登录鉴权与恢复同步。 */
    constructor(private readonly socket: GameSocketClient) {}

    /** 获取当前角色库存；仅查询，模块负责会话代次、旧读失效和写后刷新。 */
    async list(token: string): Promise<readonly BagItemData[]> {
        return readBagItems(await this.socket.request(token, "inventory.list"));
    }
}
