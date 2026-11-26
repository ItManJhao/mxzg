/** 黑市客户端回归。通过真实 Controller、Model 和协议路由模拟切页、换号和购买断线重试。 */
import { strict as assert } from "node:assert";
import { webcrypto } from "node:crypto";
import { UIManager } from "../assets/scripts/framework/ui/UIManager";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import type { AccountOperations } from "../assets/scripts/features/account/AccountOperations";
import { BlackMarketController } from "../assets/scripts/features/blackmarket/BlackMarketController";
import { BlackMarketModel } from "../assets/scripts/features/blackmarket/BlackMarketModel";
import {
    BLACK_MARKET_STALL,
    type BlackMarketPurchase,
    type BlackMarketState,
} from "../assets/scripts/features/blackmarket/data/BlackMarketData";
import type { GameFrame } from "../assets/scripts/platform/GameProtocolCodecUtils";
import { SocketFailure } from "../assets/scripts/platform/GameSocketClient";
import { Protocol } from "../assets/scripts/platform/Protocol";

/** 测试认证通道中等待交付的请求。 */
interface Pending {
    readonly name: GameFrame["name"];
    readonly body: unknown;
    readonly reply: (data: unknown) => void;
    readonly reject: (error: Error) => void;
}

/** 仅传送用例明确交付的回包，覆盖客户端在途行为。 */
class Fixture {
    /** 测试用的真实黑市操作入口。 */
    public readonly controller = new BlackMarketController();
    /** 独立钱包数据；验证黑市只读取快照。 */
    public readonly account = new AccountModel();
    /** 发出顺序中的测试请求，取出后由测试决定交付时间。 */
    private readonly requests: Pending[] = [];

    /** 用可控制的认证通道装配 Controller，注入普通测试角色的现有余额。 */
    public constructor() {
        const operations: Pick<AccountOperations, "deliver"> = {
            deliver: (name, body, received, failed) => new Promise<void>(resolve => {
                this.requests.push({
                    name,
                    body,
                    reply: data => {
                        try {
                            received({ version: 1, kind: "response", name, body: data, ok: true });
                        } catch (error) {
                            failed(error);
                        }
                        resolve();
                    },
                    reject: error => {
                        failed(error);
                        resolve();
                    },
                });
            }),
        };
        this.account.replace({ busy: false, error: "",
            role: { id: "role", nickname: "黑市验收", level: 10, gold: 250, diamonds: 200 } });
        this.controller.configure(operations, this.account);
        this.controller.initialize();
    }

    /** 取出下一请求并检查业务协议及可选参数。 */
    public next(name: GameFrame["name"], body?: unknown): Pending {
        const request = this.requests.shift();
        assert.ok(request, `缺少 ${name} 请求`);
        assert.equal(request.name, name);
        if (body !== undefined) {
            assert.deepEqual(request.body, body);
        }
        return request;
    }

    /** 确认客户端没有重复发出请求。 */
    public checkEmpty(): void {
        assert.equal(this.requests.length, 0);
    }
}

/** 构造同一商店不同刷新周期的货架，可指定页签及已购买次数。 */
function shelf(shelfVersion: number, shopType = BLACK_MARKET_STALL, purchased = 0): BlackMarketState {
    return {
        shopType,
        shelfVersion,
        nextRefreshAt: 1800000000,
        currencyItemId: 900002,
        tabs: [
            { shopType: BLACK_MARKET_STALL, name: "摊位", minimumLevel: 6, available: true },
            { shopType: 100500, name: "竞技场", minimumLevel: 8, available: true },
            { shopType: 101000, name: "英雄", minimumLevel: 1, available: false },
        ],
        offers: [{ productId: 13, itemId: 900102, quantity: 1, costItemId: 900002, costQuantity: 80,
            purchaseLimit: 2, purchased, discount: 20, purchasable: shopType !== 101000 }],
    };
}

/** 切页期间只接受最后所选的货架，换号清空值并忽略已关闭操作的迟到数据。 */
function checkTabSelection(fixture: Fixture): void {
    const controller = fixture.controller;
    controller.setVisible(true);
    fixture.next(Protocol.BLACK_MARKET_LIST, { shopType: BLACK_MARKET_STALL }).reply(shelf(11));
    controller.selectShop(100500);
    const arena = fixture.next(Protocol.BLACK_MARKET_LIST, { shopType: 100500 });
    controller.selectShop(101000);
    assert.equal(controller.selectedShopType, 101000);
    fixture.checkEmpty();
    arena.reply(shelf(22, 100500));
    assert.equal(BlackMarketModel.instance.snapshot?.shopType, BLACK_MARKET_STALL);
    fixture.next(Protocol.BLACK_MARKET_LIST, { shopType: 101000 }).reply(shelf(27, 101000));
    assert.equal(BlackMarketModel.instance.snapshot?.shopType, 101000);
    assert.equal(controller.maximum(shelf(27, 101000).offers[0]), 0);
    controller.reloadVisible();
    const oldAccount = fixture.next(Protocol.BLACK_MARKET_LIST, { shopType: 101000 });
    controller.resetSession();
    oldAccount.reply(shelf(28, 101000));
    assert.equal(BlackMarketModel.instance.snapshot, null);
    assert.equal(controller.selectedShopType, null);
}

/** 不信任旧报价；重连复用购买编号和原报价，随后读取新周期并校验限购。 */
function checkPurchaseRecovery(fixture: Fixture, messages: readonly string[]): void {
    const controller = fixture.controller;
    const state = shelf(30);
    controller.setVisible(true);
    fixture.next(Protocol.BLACK_MARKET_LIST, { shopType: BLACK_MARKET_STALL }).reply(state);
    assert.equal(controller.balance(900001), 250);
    assert.equal(controller.balance(900002), 200);
    assert.equal(controller.maximum(state.offers[0]), 2);
    controller.buy(BLACK_MARKET_STALL, 29, 13, 1);
    fixture.next(Protocol.BLACK_MARKET_LIST, { shopType: BLACK_MARKET_STALL }).reply(state);
    controller.buy(BLACK_MARKET_STALL, 30, 13, 3);
    fixture.checkEmpty();

    controller.buy(BLACK_MARKET_STALL, 30, 13, 2);
    const first = fixture.next(Protocol.BLACK_MARKET_BUY);
    const order = first.body as BlackMarketPurchase;
    assert.match(order.requestId, /^[a-f0-9-]{36}$/);
    assert.deepEqual(first.body, { requestId: order.requestId, shopType: BLACK_MARKET_STALL,
        shelfVersion: 30, productId: 13, count: 2 });
    controller.buy(BLACK_MARKET_STALL, 30, 13, 1);
    fixture.checkEmpty();
    first.reject(new SocketFailure("DISCONNECTED", "连接已断开"));
    assert.equal(controller.busy, true);
    assert.deepEqual(messages, ["连接已断开"]);

    const receipt = { requestId: order.requestId, roleId: "role", assetRevision: 2, state: shelf(30, BLACK_MARKET_STALL, 2) };
    controller.reloadVisible();
    fixture.next(Protocol.BLACK_MARKET_BUY, order).reply(receipt);
    assert.equal(BlackMarketModel.instance.snapshot?.offers[0].purchased, 0);
    const refreshed = shelf(31, BLACK_MARKET_STALL, 2);
    fixture.next(Protocol.BLACK_MARKET_LIST, { shopType: BLACK_MARKET_STALL }).reply(refreshed);
    assert.equal(controller.busy, false);
    assert.equal(BlackMarketModel.instance.snapshot?.shelfVersion, 31);
    assert.equal(controller.maximum(refreshed.offers[0]), 0);
    assert.equal(fixture.account.snapshot.role?.diamonds, 200);
    controller.buy(BLACK_MARKET_STALL, 31, 13, 1);
    fixture.checkEmpty();
}

if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: webcrypto });
}
const fixture = new Fixture();
const messages: string[] = [];
const originalToast = UIManager.instance.toast;
UIManager.instance.toast = message => messages.push(message);
try {
    checkTabSelection(fixture);
    checkPurchaseRecovery(fixture, messages);
    console.log("PASS 黑市客户端切页、换号、过期报价、重复购买及重连恢复");
} finally {
    fixture.controller.dispose();
    UIManager.instance.toast = originalToast;
}
