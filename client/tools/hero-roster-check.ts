import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountApi } from "../assets/scripts/features/account/AccountApi";
import { AccountService, SessionChanged } from "../assets/scripts/features/account/AccountService";
import { HeroApi, readOwnedHero, readOwnedHeroes } from "../assets/scripts/features/hero/HeroApi";
import { HeroRosterModel } from "../assets/scripts/features/hero/HeroRosterModel";
import { HeroRosterService } from "../assets/scripts/features/hero/HeroRosterService";
import { HeroCatalog } from "../assets/scripts/features/hero/HeroCatalog";
import { HttpFailure, JsonClient } from "../assets/scripts/platform/http/JsonClient";

const hero = { id: "f45747b7-f032-4d00-9546-3504b9a967e5", templateId: 10101001, level: 1, star: 1 };
const session = { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function identity() {
  const account = new AccountModel();
  let stored: typeof session | null = null;
  let now = Date.parse("2026-01-01T00:00:00Z");
  const service = new AccountService(account, {
    developmentLogin: async name => ({ session: { ...session, accessToken: (name === "second" ? "b" : "a").repeat(43) },
      role: { id: name, nickname: name, level: 1, gold: 0, diamonds: 0 } }),
    currentRole: async () => ({ id: "first", nickname: "first", level: 1, gold: 0, diamonds: 0 }),
  }, { read: () => stored, write: value => { stored = value; }, clear: () => { stored = null; } }, () => now);
  return { account, service, stored: () => stored, expire: () => { now = Date.parse("2100-01-01T00:00:00Z"); } };
}

async function main() {
  const requests: any[] = [];
  let response: unknown = [hero];
  const api = new HeroApi(new JsonClient("http://127.0.0.1:18080", async request => {
    requests.push(request); return { status: 200, data: response };
  }));
  const heroes = await api.list(session.accessToken);
  assert.deepEqual(heroes, [hero]);
  assert.equal(requests[0].url, "http://127.0.0.1:18080/api/v1/heroes");
  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].headers.Authorization, "Bearer " + session.accessToken);
  assert.equal(requests[0].body, undefined);
  assert(Object.isFrozen(heroes) && Object.isFrozen(heroes[0]));
  for (const field of ["templateId", "level", "star"]) {
    for (const value of [0, -1, 1.5, "1", NaN, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => readOwnedHero({ ...hero, [field]: value }), /资料无效/);
    }
  }
  for (const value of [null, [], {}, { ...hero, id: "123" }]) assert.throws(() => readOwnedHero(value), /资料无效/);
  assert.throws(() => readOwnedHeroes([hero, hero]), /重复/);
  assert.equal(readOwnedHeroes([hero, { ...hero, id: "a".repeat(8) + "-aaaa-aaaa-aaaa-aaaaaaaaaaaa" }]).length, 2,
    "two owned instances of one template are valid");
  response = { heroes: [] }; await assert.rejects(api.list(session.accessToken), /列表无效/);
  const missingApi = new HeroApi(new JsonClient("http://127.0.0.1:18080", async () => ({ status: 404, data: {} })));
  await assert.rejects(missingApi.list(session.accessToken), (error: unknown) =>
    error instanceof HttpFailure && error.status === 404 && error.message.includes("请更新并重启新后端"));
  const expiredApi = new HeroApi(new JsonClient("http://127.0.0.1:18080", async () => ({ status: 401, data: {} })));
  await assert.rejects(expiredApi.list(session.accessToken), (error: unknown) => error instanceof HttpFailure && error.status === 401);

  const owner = identity();
  await assert.rejects(owner.service.authenticated(async () => 1), SessionChanged);
  await owner.service.login("first");
  const model = new HeroRosterModel();
  let calls = 0;
  let fetch = async () => [hero];
  const roster = new HeroRosterService(model, owner.account, owner.service, { list: () => { calls++; return fetch(); } });
  const initial = deferred<typeof hero[]>(); fetch = () => initial.promise;
  const first = roster.refresh();
  assert.equal(roster.refresh(), first, "concurrent refreshes share one request");
  assert.equal(calls, 1); assert.equal(model.snapshot.status, "loading");
  initial.resolve([hero]); assert.equal(await first, true);
  assert.equal(model.snapshot.heroes[0].id, hero.id);
  assert(Object.isFrozen(model.snapshot) && Object.isFrozen(model.snapshot.heroes[0]));
  assert(!JSON.stringify(model.snapshot).includes(session.accessToken));

  fetch = async () => { throw new Error("offline"); };
  assert.equal(await roster.refresh(), false);
  assert.equal(model.snapshot.status, "error"); assert.equal(model.snapshot.error, "offline");
  assert.equal(model.snapshot.heroes.length, 0, "failed refresh does not display stale heroes");
  assert(owner.stored(), "transport failure keeps the session");
  fetch = async () => []; assert.equal(await roster.refresh(), true);
  assert.equal(model.snapshot.status, "ready"); assert.deepEqual(model.snapshot.heroes, [], "empty is a successful roster");

  const late = deferred<typeof hero[]>(); fetch = () => late.promise;
  const old = roster.refresh(); owner.service.logout();
  assert.equal(model.snapshot.status, "idle");
  late.resolve([hero]); assert.equal(await old, false); assert.deepEqual(model.snapshot.heroes, []);
  await owner.service.login("first");
  const unauthorized = deferred<typeof hero[]>(); fetch = () => unauthorized.promise;
  const oldError = roster.refresh();
  await owner.service.login("second");
  fetch = async () => [hero]; assert.equal(await roster.refresh(), true);
  unauthorized.reject(new HttpFailure(401, "expired")); assert.equal(await oldError, false);
  assert.equal(owner.account.snapshot.role!.id, "second", "old 401 cannot log out a replacement account");
  assert.equal(model.snapshot.status, "ready", "old request cannot clear new roster");
  const current401 = () => Promise.reject(new HttpFailure(401, "expired")); fetch = current401;
  assert.equal(await roster.refresh(), false);
  assert.equal(owner.account.snapshot.role, null); assert.equal(owner.stored(), null);
  assert.equal(model.snapshot.status, "idle"); assert.equal(model.snapshot.heroes.length, 0);

  await owner.service.login("first");
  const closing = deferred<typeof hero[]>(); fetch = () => closing.promise;
  const closed = roster.refresh(); roster.clear();
  fetch = async () => []; assert.equal(await roster.refresh(), true);
  closing.resolve([hero]); assert.equal(await closed, false); assert.deepEqual(model.snapshot.heroes, []);
  const disposing = deferred<typeof hero[]>(); fetch = () => disposing.promise;
  const disposed = roster.refresh(); roster.dispose(); roster.dispose();
  disposing.resolve([hero]); assert.equal(await disposed, false); assert.equal(await roster.refresh(), false);
  assert.equal(model.snapshot.status, "idle");

  const expiry = identity(); await expiry.service.login("first");
  const inFlight = deferred<number>();
  const expired = expiry.service.authenticated(() => inFlight.promise);
  expiry.expire(); inFlight.resolve(1);
  await assert.rejects(expired, (error: unknown) => error instanceof HttpFailure && error.status === 401);
  assert.equal(expiry.account.snapshot.role, null);
  await expiry.service.login("first");
  let dispatched = false;
  await assert.rejects(expiry.service.authenticated(async () => { dispatched = true; return 1; }), HttpFailure);
  assert.equal(dispatched, false, "expired sessions never dispatch a request");

  const herotype = JSON.parse(readFileSync("client/assets/resources/config/herotype.json", "utf8"));
  const items = JSON.parse(readFileSync("client/assets/resources/config/item.json", "utf8"));
  const catalog = new HeroCatalog(herotype, items);
  assert.deepEqual(catalog.find(10101001), { templateId: 10101001, name: "独眼梦魇", elem: 1, icon: "ui/hero/hero-icon_20101001" });
  assert.equal(catalog.find(-12345), null);
  assert(Object.isFrozen(catalog.find(10101001)));
  const fallback = new HeroCatalog({ rows: [{ type: 1, item_id: 0, elem: 99, note: " A " }, { type: "#" }] },
    { rows: [{ idx: 1, icon: "hero-icon/abcdef" }] });
  assert.equal(fallback.find(1)!.icon, "ui/hero/hero-icon_abcdef");
  assert.equal(fallback.find(1)!.elem, null);
  assert.equal(fallback.find(1)!.name, "A");
  assert.throws(() => new HeroCatalog({ rows: [{ type: 1 }, { type: 1 }] }, { rows: [] }), /重复/);

  if (process.env.MXZG_REMAKE_API) {
    const http = new JsonClient(process.env.MXZG_REMAKE_API, async request => {
      const result = await globalThis.fetch(request.url, { method: request.method, headers: request.headers, body: request.body });
      return { status: result.status, data: await result.json() };
    });
    const liveAccount = new AccountModel();
    let saved: typeof session | null = null;
    const store = { read: () => saved, write: (value: typeof session) => { saved = value; }, clear: () => { saved = null; } };
    const liveService = new AccountService(liveAccount, new AccountApi(http), store);
    assert.equal(await liveService.login("hero_read_" + Date.now()), true, liveAccount.snapshot.error);
    const roleId = liveAccount.snapshot.role!.id;
    const liveModel = new HeroRosterModel();
    const liveRoster = new HeroRosterService(liveModel, liveAccount, liveService, new HeroApi(http));
    assert.equal(await liveRoster.refresh(), true, liveModel.snapshot.error);
    assert.equal(liveModel.snapshot.status, "ready");
    assert.deepEqual(liveModel.snapshot.heroes, [], "new server role owns no fabricated heroes");
    await assert.rejects(new HeroApi(http).list("x".repeat(43)), (error: unknown) => error instanceof HttpFailure && error.status === 401);
    const restoredAccount = new AccountModel();
    const restoredService = new AccountService(restoredAccount, new AccountApi(http), store);
    assert.equal(await restoredService.restore(), true);
    assert.equal(restoredAccount.snapshot.role!.id, roleId);
    assert.deepEqual(await restoredService.authenticated(token => new HeroApi(http).list(token)), []);
    liveService.logout(); assert.equal(liveModel.snapshot.status, "idle");
    liveRoster.dispose();
    console.log("hero roster live backend login + authenticated empty roster + invalid token + restore passed");
  }
  console.log("hero-roster-check passed: validated HTTP DTOs, UUID/template separation, real catalog, retry/empty states, session isolation and late-response disposal");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
