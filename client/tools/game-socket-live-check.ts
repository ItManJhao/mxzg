/** 真实 TS 客户端到独立 H2 后端的登录/背包联调；实例身份核对通过前绝不登录或改数据。 */
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { GameSocketClient } from "../assets/scripts/platform/GameSocketClient";
import { AccountApi, readRole } from "../assets/scripts/features/account/AccountApi";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { JsonClient } from "../assets/scripts/platform/http/JsonClient";
import { BagApi } from "../assets/scripts/features/Bag/BagApi";
import { BagController } from "../assets/scripts/features/Bag/BagController";
import { BagModel } from "../assets/scripts/features/Bag/BagModel";
import { readBagItems } from "../assets/scripts/features/Bag/data/BagItemData";
import { readOwnedHeroes } from "../assets/scripts/features/hero/HeroApi";

/** 等待实际网络/模块结果，超时明确失败。 */
async function until(check: () => boolean): Promise<void> {
  for (let index = 0; index < 200; index++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 10)); }
  assert.fail("客户端联调状态超时");
}

/** 真实模块装配，记录 socket 以主动断线；不绕过 Controller 写入任何库存。 */
function fixture(base: string) {
  const account = new AccountModel(), model = new BagModel(), bag = new BagController(model);
  const wires: WebSocket[] = [];
  const http = new JsonClient(base, async request => {
    const response = await fetch(request.url, { method: request.method, headers: request.headers, body: request.body });
    return { status: response.status, data: await response.json() };
  });
  const socket = new GameSocketClient(base.replace(/^http/, "ws") + "/api/v1/game/socket", {
    create: url => { const wire = new WebSocket(url); wires.push(wire); return wire; },
    validateSnapshot: value => {
      const row = value as any; readRole(row.role); readOwnedHeroes(row.heroes); readBagItems(row.inventory);
    }, retryDelay: () => 20,
  });
  const service = new AccountService(account, new AccountApi(http, socket), { read: () => null, write: () => {}, clear: () => {} });
  bag.initialize({ account, authorization: service, api: new BagApi(http, socket) });
  socket.onRejected = (token, message) => service.rejectSession(token, message);
  socket.onReady = () => { if (account.snapshot.role && !account.snapshot.busy) void bag.refresh(true); };
  socket.onDisconnected = () => { if (account.snapshot.role && !account.snapshot.busy) void bag.refresh(true); };
  return { service, account, model, bag, wires, http, stop: () => {
    socket.onReady = socket.onDisconnected = socket.onRejected = null;
    socket.disconnect(); bag.dispose();
  } };
}

/** 完成真实身份交换、初始化/奖励、背包重连恢复与跨连接顶号，全部限于被核验的测试实例。 */
async function main(): Promise<void> {
  const [port, run] = process.argv.slice(2);
  assert(/^\d{4,5}$/.test(port) && Number(port) <= 65535 && ![18080, 18081, 3306].includes(Number(port)));
  assert(/^[0-9a-f-]{36}$/.test(run));
  const base = "http://127.0.0.1:" + port;
  const identity = await (await fetch(base + "/api/v1/socket-test-identity")).json() as any;
  assert.equal(identity.kind, "mxzg-owned-socket-it"); assert.equal(identity.run, run);
  const one = fixture(base), two = fixture(base);
  try {
    const account = "wsclient_" + randomUUID().slice(0, 12);
    assert.equal(await one.service.login(account, "local-1"), true, one.account.snapshot.error);
    await one.service.authenticated(token => one.http.request("/api/v1/campaign/initialize", {}, token));
    assert.equal(await one.bag.refresh(true), true);
    const before = one.model.quantity(900101);
    const battle: any = await one.service.authenticated(token => one.http.request("/api/v1/campaign/battles", { requestId: randomUUID() }, token));
    assert.equal(battle.won, true);
    await one.service.authenticated(token => one.http.request("/api/v1/campaign/battles/" + battle.id + "/claim", {}, token));
    one.wires[0].close();
    await until(() => one.wires.length === 2 && one.model.snapshot.status === "ready" && one.model.quantity(900101) > before);
    assert.equal(one.service.hasSession, true);
    const inventory = one.model.items;
    assert.equal(await two.service.login(account, "local-1"), true, two.account.snapshot.error);
    await until(() => !one.service.hasSession && two.model.snapshot.status === "ready");
    assert.equal(one.model.items.length, 0);
    assert.deepEqual(two.model.items, inventory);
    await new Promise(resolve => setTimeout(resolve, 80));
    assert.equal(one.wires.length, 2, "顶号不能自动抢回");
    two.service.logout(); assert.equal(two.model.items.length, 0);
    console.log("PASS real TS client → isolated H2: login, bag, reward, reconnect, kick, logout");
  } finally { one.stop(); two.stop(); }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
