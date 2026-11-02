/** 登录/背包试点回归：受控连接验证重连、顶号、换号、超时及库存写入与恢复的竞态。 */
import { strict as assert } from "node:assert";
import { GameSocketClient, SocketFailure, SocketPort } from "../assets/scripts/platform/GameSocketClient";
import { AccountApi, readRole } from "../assets/scripts/features/account/AccountApi";
import { AccountService } from "../assets/scripts/features/account/AccountService";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { JsonClient } from "../assets/scripts/platform/http/JsonClient";
import { BagApi } from "../assets/scripts/features/Bag/BagApi";
import { BagModel } from "../assets/scripts/features/Bag/BagModel";
import { BagController } from "../assets/scripts/features/Bag/BagController";
import { readBagItems } from "../assets/scripts/features/Bag/data/BagItemData";
import { isolatedPreview } from "../assets/scripts/app/remake/IsolatedPreview";

/** 有限等待异步状态，失败及时结束，不通过长时间休眠掩盖竞态。 */
async function until(check: () => boolean): Promise<void> {
  for (let index = 0; index < 200; index++) { if (check()) return; await new Promise(resolve => setTimeout(resolve, 5)); }
  assert.fail("异步状态未按期完成");
}
/** 构造可控业务结果，模拟 HTTP 已进入事务而回包尚未完成。 */
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }

class Wire {
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readyState = 0;
  token = "";
  readonly frames: any[] = [];
  readonly id: string;
  holdInventory = false;
  silence = false;
  held: any[] = [];
  /** 给每条连接独立标识，开连接事件异步触发，与浏览器回调顺序一致。 */
  constructor(private readonly fixture: ReturnType<typeof setup>, index: number) {
    this.id = "connection-" + index;
    queueMicrotask(() => { this.readyState = 1; this.onopen?.({}); });
  }
  /** 服务端桩只实现本批允许消息，其他调用立即暴露。 */
  send(raw: string): void {
    const frame = JSON.parse(raw); this.frames.push(frame);
    if (this.silence) return;
    if (frame.name === "session.authenticate") {
      this.token = frame.body.accessToken;
      this.respond(frame, { connectionId: this.id, roleId: this.token[0], serverTimeMs: Date.now() });
    } else if (frame.name === "session.sync") {
      this.respond(frame, { role: this.fixture.role(this.token), heroes: [], inventory: this.fixture.items() });
    } else if (frame.name === "inventory.list") {
      if (this.holdInventory) this.held.push(frame); else this.respond(frame, this.fixture.items());
    } else if (frame.name === "session.heartbeat") this.respond(frame, { serverTimeMs: Date.now() });
    else assert.fail("不允许的试点消息：" + frame.name);
  }
  /** 延后投递消息，允许测试捕获已发送但尚未到达的旧连接回包。 */
  respond(frame: any, body: unknown): void {
    const receive = this.onmessage;
    queueMicrotask(() => receive?.({ data: JSON.stringify({ version: 1, kind: "response", name: frame.name,
      id: frame.id, connectionId: this.id, ok: true, body }) }));
  }
  /** 客户端关闭不会伪装成新的服务端断线。 */
  close(): void { this.readyState = 3; }
  /** 主动制造传输中断，保留会话凭证供正常重连。 */
  breakConnection(): void { this.readyState = 3; this.onclose?.(); }
  /** 顶号事件与普通断线不同，必须清账号并停止重连。 */
  kick(): void { this.onmessage?.({ data: JSON.stringify({ version: 1, kind: "event", name: "session.kicked", connectionId: this.id, body: { code: "SESSION_REPLACED" } }) }); }
}

/** 组合真实账号/背包模块和试点传输；不连接任何数据库或玩家服务器。 */
function setup(timeout = 150) {
  const wires: Wire[] = [];
  const account = new AccountModel(), model = new BagModel(), bag = new BagController(model);
  let quantity = 5;
  let httpCalls = 0;
  const role = (token: string) => ({ id: token[0], nickname: token[0] + "_user", serverId: "local-1", level: 1, gold: 100, diamonds: 0 });
  const items = () => [{ itemId: 900101, quantity }];
  let fixture: any;
  const socket = new GameSocketClient("ws://127.0.0.1:19080/api/v1/game/socket", {
    create: () => { const wire = new Wire(fixture, wires.length); wires.push(wire); return wire as unknown as SocketPort; },
    validateSnapshot: value => { const row = value as any; readRole(row.role); readBagItems(row.inventory); assert(Array.isArray(row.heroes)); },
    timeoutMs: timeout, heartbeatMs: 10000, retryDelay: () => 5,
  });
  const http = new JsonClient("http://127.0.0.1:19080", async request => {
    httpCalls++;
    assert(request.url.endsWith("/development/login"), "试点角色/背包不能回退 HTTP");
    const token = JSON.parse(request.body!).account[0].repeat(43);
    return { status: 200, data: { role: role(token), session: { accessToken: token, expiresAt: "2099-01-01T00:00:00Z" } } };
  });
  const api = new AccountApi(http, socket);
  const service = new AccountService(account, api, { read: () => null, write: () => {}, clear: () => {} });
  bag.initialize({ account, authorization: service, api: new BagApi(socket) });
  socket.onRejected = (token, message) => service.rejectSession(token, message);
  socket.onReady = () => { if (account.snapshot.role && !account.snapshot.busy) void bag.refresh(true); };
  socket.onDisconnected = () => { if (account.snapshot.role && !account.snapshot.busy) void bag.refresh(true); };
  fixture = { wires, account, model, bag, socket, service, role, items, setQuantity: (value: number) => { quantity = value; },
    httpCalls: () => httpCalls, stop: () => { socket.onReady = socket.onDisconnected = socket.onRejected = null; socket.disconnect(); bag.dispose(); } };
  return fixture as { wires: Wire[]; account: AccountModel; model: BagModel; bag: BagController; socket: GameSocketClient; service: AccountService;
    role: typeof role; items: typeof items; setQuantity(value: number): void; httpCalls(): number; stop(): void };
}

/** 验证实际模块交互，特别是网络恢复不绕过库存写入协调。 */
async function main(): Promise<void> {
  const store = new Map<string, string>();
  const storage = { getItem: (key: string) => store.get(key) || null, setItem: (key: string, value: string) => { store.set(key, value); }, removeItem: (key: string) => { store.delete(key); } };
  const run = "b".repeat(32);
  const locationBefore = Object.getOwnPropertyDescriptor(globalThis, "location");
  try {
    Object.defineProperty(globalThis, "location", { configurable: true, value: { hostname: "localhost", search: "?mxzgSocket=1" } });
    await assert.rejects(isolatedPreview("http://127.0.0.1:18080", async () => assert.fail("孤立开关不能访问日常实例"), storage));
    (globalThis as any).location.search = "?mxzgTestApi=http://127.0.0.1:45678&mxzgTestRun=" + run;
    await assert.rejects(isolatedPreview("http://127.0.0.1:18080", async () => ({ status: 200, data: { kind: "unknown", run } }), storage));
    const isolated = await isolatedPreview("http://127.0.0.1:18080", async () => ({ status: 200, data: { kind: "mxzg-owned-socket-it", run } }), storage);
    assert.equal(isolated.http.baseAddress, "http://127.0.0.1:45678");
    isolated.storage.setItem("session", "isolated"); assert.equal(store.get("session"), undefined);
  } finally {
    if (locationBefore) Object.defineProperty(globalThis, "location", locationBefore);
    else delete (globalThis as any).location;
  }
  const f = setup();
  try {
    assert.equal(await f.service.login("aaa"), true);
    await until(() => f.model.snapshot.status === "ready");
    assert.equal(f.model.quantity(900101), 5);
    assert.equal(f.httpCalls(), 1);
    const old = f.wires[0];
    old.holdInventory = true;
    const stale = f.bag.refresh(true);
    await until(() => old.held.length === 1);
    const oldCallback = old.onmessage;
    old.breakConnection();
    assert.equal(await stale, false);
    await assert.rejects(f.service.authenticated(async () => assert.fail("断线期间不应发出业务")), /恢复/);
    f.setQuantity(9);
    await until(() => f.wires.length === 2 && f.model.quantity(900101) === 9);
    oldCallback?.({ data: JSON.stringify({ version: 1, kind: "response", name: "inventory.list", id: old.held[0].id, connectionId: old.id, ok: true, body: [{ itemId: 900101, quantity: 1 }] }) });
    assert.equal(f.model.quantity(900101), 9, "旧连接回包不能覆盖新库存");

    const writeResult = deferred<readonly { itemId: number; quantity: number }[]>();
    const write = f.bag.runInventoryUpdate("normal-http-write", () => writeResult.promise, value => value, () => {}, "consume");
    await Promise.resolve();
    f.wires[1].breakConnection();
    await until(() => f.wires.length === 3 && f.wires[2].frames.some(frame => frame.name === "session.sync"));
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(f.wires[2].frames.filter(frame => frame.name === "inventory.list").length, 0, "恢复查询必须等待在途库存写操作");
    f.setQuantity(4); writeResult.resolve(f.items()); await write;
    await until(() => f.model.snapshot.status === "ready" && f.model.quantity(900101) === 4);
    assert.equal(f.httpCalls(), 1);

    f.wires[2].kick();
    assert.equal(f.service.hasSession, false);
    assert.equal(f.model.items.length, 0);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(f.wires.length, 3, "顶号不得自动抢回登录");
    assert.equal(await f.service.login("bbb"), true);
    await until(() => f.model.snapshot.status === "ready");
    f.service.rejectSession("a".repeat(43), "旧会话失效");
    assert.equal(f.account.snapshot.role?.id, "b");
    f.service.logout();
    assert.equal(f.account.snapshot.role, null);
    assert.equal(f.model.items.length, 0);
  } finally { f.stop(); }

  const timed = setup(35);
  try {
    await timed.service.login("ccc"); await until(() => timed.model.snapshot.status === "ready");
    timed.wires[0].silence = true;
    const read = timed.socket.request("c".repeat(43), "inventory.list");
    await assert.rejects(read, error => error instanceof SocketFailure && error.code === "TIMEOUT");
    await until(() => timed.wires.length === 2 && timed.model.snapshot.status === "ready");
    assert.equal(timed.service.hasSession, true, "网络超时保留账号，恢复后重新读取");
  } finally { timed.stop(); }

  const bounded = setup();
  try {
    await bounded.service.login("ddd"); await until(() => bounded.model.snapshot.status === "ready");
    bounded.wires[0].holdInventory = true;
    const reads = Array.from({ length: 16 }, () => bounded.socket.request("d".repeat(43), "inventory.list").catch(error => error));
    await assert.rejects(bounded.socket.request("d".repeat(43), "inventory.list"), error => error instanceof SocketFailure && error.code === "BUSY");
    assert.equal(bounded.wires[0].held.length, 16);
    bounded.service.logout();
    assert((await Promise.all(reads)).every(error => error instanceof SocketFailure));
  } finally { bounded.stop(); }

  const malformed = setup();
  try {
    await malformed.service.login("fff"); await until(() => malformed.model.snapshot.status === "ready");
    malformed.wires[0].onmessage?.({ data: "invalid-json" });
    await assert.rejects(malformed.socket.request("f".repeat(43), "inventory.list"), /数据异常/);
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(malformed.wires.length, 1, "协议错误停下，不谎称持续自动重连");
  } finally { malformed.stop(); }

  const delayed = deferred<any>();
  let created = 0;
  const unusedSocket = new GameSocketClient("ws://127.0.0.1:19080/api/v1/game/socket", {
    create: () => { created++; throw new Error("旧登录不得建立连接"); }, validateSnapshot: () => {},
  });
  const delayedModel = new AccountModel();
  const delayedService = new AccountService(delayedModel, new AccountApi(new JsonClient("http://127.0.0.1:19080", () => delayed.promise), unusedSocket),
    { read: () => null, write: () => {}, clear: () => {} });
  const login = delayedService.login("eee");
  delayedService.logout();
  delayed.resolve({ status: 200, data: { role: { id: "e", nickname: "eee", serverId: "local-1", level: 1, gold: 0, diamonds: 0 },
    session: { accessToken: "e".repeat(43), expiresAt: "2099-01-01T00:00:00Z" } } });
  assert.equal(await login, false); assert.equal(created, 0); assert.equal(delayedModel.snapshot.role, null);
  unusedSocket.disconnect();
  console.log("PASS socket login, bag recovery, pending-write ordering, stale replies, account isolation, kick and timeout");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
