import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AccountModel } from "../assets/scripts/features/account/AccountModel";
import { AccountService, SessionStore } from "../assets/scripts/features/account/AccountService";
import { AccountController, AccountActions } from "../assets/scripts/features/account/AccountController";
import { AccountApi, AccountSession, LoginResult, readRole } from "../assets/scripts/features/account/AccountApi";
import { HttpFailure, JsonClient } from "../assets/scripts/platform/http/JsonClient";
import { LoginEntry } from "../assets/scripts/app/remake/LoginEntry";

const role = { id: "role-one", nickname: "player_1", level: 1, gold: 0, diamonds: 0 };
const session: AccountSession = { accessToken: "a".repeat(43), expiresAt: "2099-01-01T00:00:00Z" };
const result: LoginResult = { role, session };
function memoryStore(): SessionStore {
  let saved: AccountSession | null = null;
  return { read: () => saved, write: value => { saved = value; }, clear: () => { saved = null; } };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

async function main() {
  const assets = join(process.cwd(), "client/assets");
  const prefab = JSON.parse(readFileSync(join(assets, "prefabs/ui/account/AccountLogin.prefab"), "utf8"));
  const view = prefab.find((row: Record<string, unknown>) => row.accountInput && row.profileLabel);
  assert(view, "AccountLogin has its bound View component");
  for (const [field, type] of Object.entries({ accountInput: "cc.EditBox", loginButton: "cc.Button", restoreButton: "cc.Button", logoutButton: "cc.Button", statusLabel: "cc.Label", profileLabel: "cc.Label" })) {
    assert.equal(prefab[view[field].__id__].__type__, type, field + " binds the correct component");
  }
  const scene = JSON.parse(readFileSync(join(assets, "scenes/Remake.scene"), "utf8"));
  const root = scene.find((row: Record<string, unknown>) => row.loginPrefab && row.apiBaseUrl);
  assert(root && root.loginPrefab.__uuid__, "Remake scene explicitly binds its sample Prefab");
  const model = new AccountModel();
  const storage = memoryStore();
  let requests = 0;
  const service = new AccountService(model, { developmentLogin: async account => {
    requests++; assert.equal(account, "player_1"); return result;
  }, currentRole: async token => { assert.equal(token, session.accessToken); return role; } }, storage);
  assert.equal(await service.login("x"), false);
  assert.equal(requests, 0);
  assert.equal(await service.login(" Player_1 "), true);
  assert.equal(model.snapshot.role?.id, role.id);
  assert(Object.isFrozen(model.snapshot.role));
  assert.equal(JSON.stringify(model.snapshot).includes(session.accessToken), false);
  const restored = new AccountModel();
  assert.equal(await new AccountService(restored, { developmentLogin: async () => result, currentRole: async () => role }, storage).restore(), true);
  assert.equal(restored.snapshot.role?.id, role.id);

  const pending = deferred<LoginResult>();
  const pendingModel = new AccountModel();
  const pendingStore = memoryStore();
  const pendingService = new AccountService(pendingModel, { developmentLogin: () => pending.promise, currentRole: async () => role }, pendingStore);
  const login = pendingService.login("player_1");
  pendingService.logout(); pending.resolve(result); await login;
  assert.equal(pendingModel.snapshot.role, null);
  assert.equal(pendingStore.read(), null);

  const first = deferred<LoginResult>(); const second = deferred<LoginResult>();
  let calls = 0;
  const raceModel = new AccountModel();
  const race = new AccountService(raceModel, { developmentLogin: () => (++calls === 1 ? first.promise : second.promise), currentRole: async () => role }, memoryStore());
  const one = race.login("player_1"); const two = race.login("player_2");
  second.resolve({ session, role: { ...role, id: "role-two" } }); await two;
  first.resolve(result); await one;
  assert.equal(raceModel.snapshot.role?.id, "role-two");

  storage.write(session);
  const offline = new AccountService(new AccountModel(), { developmentLogin: async () => result, currentRole: async () => { throw new Error("offline"); } }, storage);
  await offline.restore(); assert(storage.read(), "temporary network failure keeps saved session");
  const expired = new AccountService(new AccountModel(), { developmentLogin: async () => result, currentRole: async () => { throw new HttpFailure(401, "expired"); } }, storage);
  await expired.restore(); assert.equal(storage.read(), null);
  assert.throws(() => readRole({ ...role, gold: Number.MAX_SAFE_INTEGER + 1 }));

  let renders = 0; let bindings = 0; let actions: AccountActions | null = null;
  const controller = new AccountController(model, service, {
    bind: value => { bindings++; actions = value; return () => { actions = null; }; },
    render: () => { renders++; },
  });
  controller.show(); controller.show(); assert.equal(bindings, 1);
  controller.close(); const closedCount = renders;
  service.logout(); assert.equal(renders, closedCount); assert.equal(actions, null);
  controller.show(); assert.equal(bindings, 2); controller.close();

  const api = new AccountApi(new JsonClient("http://127.0.0.1:18080", async request => {
    if (request.method === "POST") { assert.equal(request.body, '{"account":"player_1"}'); return { status: 200, data: result }; }
    assert.equal(request.headers.Authorization, "Bearer " + session.accessToken);
    return { status: 200, data: role };
  }));
  assert.equal((await api.developmentLogin("player_1")).role.id, role.id);
  assert.equal((await api.currentRole(session.accessToken)).id, role.id);

  // Optional live-backend mode uses the same production API boundary, with a Node HTTP adapter.
  const live = process.env.MXZG_REMAKE_API;
  if (live) {
    const liveApi = new AccountApi(new JsonClient(live, async request => {
      const response = await fetch(request.url, { method: request.method, headers: request.headers, body: request.body });
      return { status: response.status, data: await response.json() };
    }));
    const liveModel = new AccountModel(); const liveStore = memoryStore();
    const liveService = new AccountService(liveModel, liveApi, liveStore);
    assert.equal(await liveService.login("mvc_integration"), true, liveModel.snapshot.error);
    const id = liveModel.snapshot.role!.id;
    const reloadedModel = new AccountModel();
    assert.equal(await new AccountService(reloadedModel, liveApi, liveStore).restore(), true);
    assert.equal(reloadedModel.snapshot.role!.id, id);
    console.log("account live backend login + session restore passed");
  }
  // Restoring identity prepares the login page; only Start may enter the city.
  const entry = new LoginEntry();
  const entryModel = new AccountModel();
  const entryStore = memoryStore(); entryStore.write(session);
  let roleReads = 0; let developmentLogins = 0;
  const entryService = new AccountService(entryModel, {
    currentRole: async () => { roleReads++; return role; },
    developmentLogin: async () => { developmentLogins++; return result; },
  }, entryStore);
  let entryActions!: AccountActions;
  const entryController = new AccountController(entryModel, entryService, {
    bind: value => { entryActions = value; return () => {}; }, render: () => {},
  }, () => entry.confirm());
  entryController.show();
  await entryService.restore();
  assert.equal(entry.route(!!entryModel.snapshot.role), "remake-login", "saved identity cannot skip login");
  entryActions.restore();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(entry.route(!!entryModel.snapshot.role), "remake-login", "restore button does not enter");
  entryActions.login("ignored-for-prepared-session");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(entry.route(!!entryModel.snapshot.role), "remake-home", "explicit Start enters after validation");
  assert.equal(developmentLogins, 0, "prepared identity must not be replaced by default player_1");
  assert.equal(roleReads, 3);
  entryActions.logout(); entry.reset();
  assert.equal(entry.route(!!entryModel.snapshot.role), "remake-login");
  entryActions.login("x"); await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(entry.route(!!entryModel.snapshot.role), "remake-login", "failed Start cannot enter");
  entryActions.login("player_new");
  entryController.close();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(entry.route(!!entryModel.snapshot.role), "remake-login", "a closed controller cannot enter after its request completes");
  console.log("account-check passed: validation, persistence boundary, races, logout, offline/401, explicit Start gate, controller lifecycle and HTTP contract");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
