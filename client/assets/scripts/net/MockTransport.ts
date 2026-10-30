import { ErrorCode, logErrorCode } from "../core/errors";
import { GameStore } from "../core/GameStore";
import { mockRuntimeEnabled } from "./transportSelect";
import { MockGameSession } from "./MockGameSession";
import { encodeRequest } from "./protocol/codec";
import { Cmd } from "./protocol/cmds";
import { HeartbeatResp } from "./protocol/types";
import { ITransport, NetHandler, NetMessage } from "./NetTypes";

export interface MockTransportOptions {
  /** 回包延迟。默认很短，方便编辑器预览。 */
  latencyMs?: number;
  /** 不传则新建一局。断线重连沿用同一个对象，进度还在。 */
  session?: MockGameSession;
}

/**
 * 不连服务器的假传输。默认预览走这条，不用另起进程。
 * 业务状态在 MockGameSession：开服天、角色等级、主线进度，同一局里多次请求都改它。
 * 内置回包：login、heartbeat、role.enter、role.create、stage.enter、stage.result、stage.push、idle.query、idle.claim、hero.list、hero.upgrade、summon.pull、bag.list、bag.use、mail.list、mail.read、mail.claim、mail.claimAll、mail.delete、smith.view、smith.strengthen、arena.view、arena.challenge、tower.view、tower.challenge、daily.view、daily.challenge、login7.view、login7.claim、login7.advance、goal7.view、goal7.claim、shop.view、shop.buy、wish.view、wish.draw、cafe.view、cafe.send、cafe.claim。
 * 其它 cmd 原样 echo。引擎 websocket 模块当前是关的，这里故意不用 WebSocket。
 * 默认已有角色 MockHero，且属于账号 mock。Boot 只调 role.enter 也能进主城。
 * 登录别的账号时 role.enter 的 hasRole 为 false，直到 role.create。
 */
export class MockTransport implements ITransport {
  readonly session: MockGameSession;
  private latencyMs: number;
  private opened = false;
  private messageHandler: NetHandler | null = null;
  private closeHandler: (() => void) | null = null;

  constructor(options?: MockTransportOptions) {
    this.latencyMs = options?.latencyMs ?? 30;
    this.session = options?.session ?? new MockGameSession();
  }

  connect(_url: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.opened = true;
        resolve();
      }, this.latencyMs);
    });
  }

  send(msg: NetMessage): void {
    if (!this.opened) {
      logErrorCode("Mock", ErrorCode.NET_CLOSED, "drop " + msg.cmd);
      return;
    }
    setTimeout(() => this.reply(msg), this.latencyMs);
  }

  close(): void {
    if (!this.opened) return;
    this.opened = false;
    const handler = this.closeHandler;
    if (handler) handler();
  }

  onMessage(handler: NetHandler): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  private reply(msg: NetMessage): void {
    if (!this.opened) return;
    if (!msg.cmd) {
      logErrorCode("Mock", ErrorCode.UNKNOWN_CMD, "empty");
      this.emit(encodeRequest(msg.cmd, { ok: false, code: ErrorCode.UNKNOWN_CMD }));
      return;
    }
    const session = this.session;
    if (msg.cmd === Cmd.login) {
      const resp = session.login(msg.data);
      const seed = mockRuntimeEnabled() ? GameStore.mockSeedFor(resp.account) : null;
      if (seed) {
        const heroes: { id: number; name: string; level: number; star: number; weaponLevel?: number }[] = [];
        for (let i = 0; i < seed.heroes.length; i++) {
          const row = seed.heroes[i];
          if (row.heroId === null || row.heroId < 1) continue;
          heroes.push({
            id: row.heroId,
            name: row.name || "英雄" + row.heroId,
            level: row.level !== null && row.level >= 1 ? row.level : 1,
            star: row.star !== null && row.star >= 1 ? row.star : 1,
            weaponLevel: row.weaponLevel,
          });
        }
        session.restoreClientCache({
          account: seed.account,
          serverId: seed.serverId,
          role: { roleId: seed.roleId, name: seed.name },
          clearedStage: seed.clearedStage,
          stageId: seed.stageId,
          openDay: seed.openDay,
          gold: seed.gold,
          diamond: seed.diamond,
          idleAnchorMs: seed.idleAnchorMs,
          items: seed.items,
          heroes,
        });
      }
      this.emit(encodeRequest(Cmd.login, resp));
      return;
    }
    if (msg.cmd === Cmd.heartbeat) {
      const data: HeartbeatResp = { serverTime: Date.now() };
      this.emit(encodeRequest(Cmd.heartbeat, data));
      return;
    }
    if (msg.cmd === Cmd.roleEnter) {
      this.emit(encodeRequest(Cmd.roleEnter, session.roleEnter()));
      return;
    }
    if (msg.cmd === Cmd.roleCreate) {
      this.emit(encodeRequest(Cmd.roleCreate, session.roleCreate(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.stageEnter) {
      this.emit(encodeRequest(Cmd.stageEnter, session.stageEnter(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.stageResult) {
      this.emit(encodeRequest(Cmd.stageResult, session.stageResult(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.stagePush) {
      this.emit(encodeRequest(Cmd.stagePush, session.stagePush(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.idleQuery) {
      this.emit(encodeRequest(Cmd.idleQuery, session.idleQuery()));
      return;
    }
    if (msg.cmd === Cmd.idleClaim) {
      this.emit(encodeRequest(Cmd.idleClaim, session.idleClaim()));
      return;
    }
    if (msg.cmd === Cmd.heroList) {
      this.emit(encodeRequest(Cmd.heroList, session.heroList()));
      return;
    }
    if (msg.cmd === Cmd.heroUpgrade) {
      this.emit(encodeRequest(Cmd.heroUpgrade, session.heroUpgrade(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.summonPull) {
      this.emit(encodeRequest(Cmd.summonPull, session.summon(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.bagList) {
      this.emit(encodeRequest(Cmd.bagList, session.bagList()));
      return;
    }
    if (msg.cmd === Cmd.bagUse) {
      this.emit(encodeRequest(Cmd.bagUse, session.bagUse(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.mailList) {
      this.emit(encodeRequest(Cmd.mailList, session.mailList()));
      return;
    }
    if (msg.cmd === Cmd.mailRead) {
      this.emit(encodeRequest(Cmd.mailRead, session.mailRead(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.mailClaim) {
      this.emit(encodeRequest(Cmd.mailClaim, session.mailClaim(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.mailClaimAll) {
      this.emit(encodeRequest(Cmd.mailClaimAll, session.mailClaimAll()));
      return;
    }
    if (msg.cmd === Cmd.mailDelete) {
      this.emit(encodeRequest(Cmd.mailDelete, session.mailDelete(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.smithView) {
      this.emit(encodeRequest(Cmd.smithView, session.smithView()));
      return;
    }
    if (msg.cmd === Cmd.smithStrengthen) {
      this.emit(encodeRequest(Cmd.smithStrengthen, session.smithStrengthen(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.arenaView) {
      this.emit(encodeRequest(Cmd.arenaView, session.arenaView()));
      return;
    }
    if (msg.cmd === Cmd.arenaChallenge) {
      this.emit(encodeRequest(Cmd.arenaChallenge, session.arenaChallenge(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.towerView) {
      this.emit(encodeRequest(Cmd.towerView, session.towerView()));
      return;
    }
    if (msg.cmd === Cmd.towerChallenge) {
      this.emit(encodeRequest(Cmd.towerChallenge, session.towerChallenge()));
      return;
    }
    if (msg.cmd === Cmd.dailyView) {
      this.emit(encodeRequest(Cmd.dailyView, session.dailyView()));
      return;
    }
    if (msg.cmd === Cmd.dailyChallenge) {
      this.emit(encodeRequest(Cmd.dailyChallenge, session.dailyChallenge(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.login7View) {
      this.emit(encodeRequest(Cmd.login7View, session.login7View()));
      return;
    }
    if (msg.cmd === Cmd.login7Claim) {
      this.emit(encodeRequest(Cmd.login7Claim, session.login7Claim(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.login7Advance) {
      this.emit(encodeRequest(Cmd.login7Advance, session.login7Advance()));
      return;
    }
    if (msg.cmd === Cmd.goal7View) {
      this.emit(encodeRequest(Cmd.goal7View, session.goal7View()));
      return;
    }
    if (msg.cmd === Cmd.goal7Claim) {
      this.emit(encodeRequest(Cmd.goal7Claim, session.goal7Claim(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.shopView) {
      this.emit(encodeRequest(Cmd.shopView, session.shopView()));
      return;
    }
    if (msg.cmd === Cmd.shopBuy) {
      this.emit(encodeRequest(Cmd.shopBuy, session.shopBuy(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.wishView) {
      this.emit(encodeRequest(Cmd.wishView, session.wishView()));
      return;
    }
    if (msg.cmd === Cmd.wishDraw) {
      this.emit(encodeRequest(Cmd.wishDraw, session.wishDraw(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.cafeView) {
      this.emit(encodeRequest(Cmd.cafeView, session.cafeView()));
      return;
    }
    if (msg.cmd === Cmd.cafeSend) {
      this.emit(encodeRequest(Cmd.cafeSend, session.cafeSend(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.cafeClaim) {
      this.emit(encodeRequest(Cmd.cafeClaim, session.cafeClaim()));
      return;
    }
    if (msg.cmd === Cmd.giftView) {
      this.emit(encodeRequest(Cmd.giftView, session.giftView()));
      return;
    }
    if (msg.cmd === Cmd.giftClaimLevel) {
      this.emit(encodeRequest(Cmd.giftClaimLevel, session.giftClaimLevel(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.giftBuyDaily) {
      this.emit(encodeRequest(Cmd.giftBuyDaily, session.giftBuyDaily()));
      return;
    }
    if (msg.cmd === Cmd.giftRecharge) {
      this.emit(encodeRequest(Cmd.giftRecharge, session.giftRecharge(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.giftClaimAcc) {
      this.emit(encodeRequest(Cmd.giftClaimAcc, session.giftClaimAcc(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.limitedView) {
      this.emit(encodeRequest(Cmd.limitedView, session.limitedView()));
      return;
    }
    if (msg.cmd === Cmd.limitedExchange) {
      this.emit(encodeRequest(Cmd.limitedExchange, session.limitedExchange(msg.data)));
      return;
    }
    if (msg.cmd === Cmd.limitedAlchemy) {
      this.emit(encodeRequest(Cmd.limitedAlchemy, session.limitedAlchemy()));
      return;
    }
    if (msg.cmd === Cmd.limitedBuy) {
      this.emit(encodeRequest(Cmd.limitedBuy, session.limitedBuy(msg.data)));
      return;
    }
    this.emit(encodeRequest(msg.cmd, { ok: true, echo: msg.data ?? null }));
  }

  private emit(msg: NetMessage): void {
    this.publishStore();
    if (this.messageHandler) this.messageHandler(msg);
  }

  /** 有可见角色才写入。登录别的空号时不拿上一名角色盖掉快照。 */
  private publishStore(): void {
    const session = this.session;
    const enter = session.roleEnter();
    if (!enter.hasRole || enter.roleId < 1) return;
    const heroes: {
      heroId: number;
      heroType: null;
      name: string;
      level: number;
      star: number;
      fighting: null;
      weaponLevel?: number;
    }[] = [];
    for (let i = 0; i < session.heroes.length; i++) {
      const row = session.heroes[i];
      heroes.push({
        heroId: row.id,
        heroType: null,
        name: row.name,
        level: row.level,
        star: row.star,
        fighting: null,
        weaponLevel: row.weaponLevel,
      });
    }
    const items: { id: number; count: number }[] = [];
    const counts = session.itemCounts;
    const keys = Object.keys(counts);
    for (let i = 0; i < keys.length; i++) {
      const id = Number(keys[i]);
      const count = counts[id];
      if (!isFinite(id) || id < 1 || typeof count !== "number" || count <= 0) continue;
      items.push({ id: Math.floor(id), count: Math.floor(count) });
    }
    if (!mockRuntimeEnabled()) return;
    GameStore.fillFromMock({
      account: session.account,
      serverId: session.serverId,
      roleId: enter.roleId,
      name: enter.name,
      level: enter.level,
      gold: session.gold,
      diamond: session.diamond,
      openDay: session.openDay,
      stageId: session.stageId,
      clearedStage: session.clearedStage,
      idleAnchorMs: session.idleAnchorMs,
      heroes,
      items,
    });
  }
}
