/**
 * 游戏 WebSocket 连接：鉴权、恢复同步、心跳、公共时钟校准、退避重连和请求关联。
 * 应用持有此实例；不保存玩家资产，不自动重放业务请求，旧连接回包由连接代次隔离。
 */
import type { ServerClock } from "../core/ServerClock";
import type { AuthenticatedGameProtocol, ReadProtocol } from "./Protocol";
import { Protocol } from "./Protocol";
import type { GameFrame } from "./GameProtocolCodecUtils";
import { GameProtocolCodecUtils, GAME_SOCKET_PROTOCOL } from "./GameProtocolCodecUtils";

export type SocketPort = Pick<WebSocket, "onopen" | "onmessage" | "onerror" | "onclose" | "send" | "close" | "readyState" | "binaryType" | "protocol">;
export class SocketFailure extends Error {
  /** 保存稳定原因；身份失败由账号层清理，网络中断不伪装成业务拒绝。 */
  constructor(readonly code: string, message = "网络连接中断，请稍后重试") { super(message); this.name = "SocketFailure"; }
  /** 判断是否必须回到登录页面，禁止自动抢回被替换的会话。 */
  get unauthorized(): boolean { return this.code === "UNAUTHENTICATED" || this.code === "SESSION_REPLACED"; }

  /** 连接被中断时业务结果可能仍已提交，允许在重新鉴权后按原操作查询。 */
  get interrupted(): boolean {
    return ["DISCONNECTED", "NOT_READY", "TIMEOUT", "SUSPENDED", "STATE_REFRESH", "SESSION_CHANGED"].includes(this.code);
  }
}
interface Pending {
  name: string;
  resolve(value: GameFrame): void;
  reject(error: Error): void;
  timer: ReturnType<typeof setTimeout>;
}
export interface SocketOptions {
  create(url: string): SocketPort;
  validateSnapshot(value: unknown): void;
  /** 游戏应用提供公共时钟，收到已鉴权回包时校准。独立连接测试可省略。 */
  clock?: ServerClock;
  /** 可选开发观察口：仅交付当前连接、已关联的服务端帧，观察异常不影响业务。 */
  onReceive?: (frame: Readonly<GameFrame>) => void;
  timeoutMs?: number;
  heartbeatMs?: number;
  retryDelay?: (attempt: number) => number;
}

/** 仅使用原生 WebSocket 能力；平台适配器由应用注入，测试可注入受控连接。 */
export class GameSocketClient {
  /** 自动重连完成后应用提交登录快照。 */
  onReady: (() => void) | null = null;
  /** 资产事件交给应用统一校验并提交。 */
  onState: ((frame: GameFrame) => void) | null = null;
  /** 当前连接的通用奖励事件，只交应用核对归属及安排展示，不替代状态快照。 */
  onReward: ((frame: GameFrame) => void) | null = null;
  /** 当前已认证连接收到公会变更后刷新公会窗口，公会名仍由角色快照提交。 */
  onGuildUpdated: ((frame: GameFrame) => void) | null = null;
  /** 当前认证连接的任务状态变化或新达成成就。 */
  onQuestChanged: ((frame: GameFrame) => void) | null = null;
  /** 邮箱、好友和世界频道提交后的失效通知，应用定向交付相应模块。 */
  onSocialChanged: ((frame: GameFrame) => void) | null = null;
  /** 当前连接最近的完整帧，供本次登录交付，不另建资产 Model。 */
  latestState: GameFrame | null = null;
  onDisconnected: ((message: string) => void) | null = null;
  onRejected: ((token: string, message: string) => void) | null = null;
  private socket: SocketPort | null = null;
  private token = "";
  private connectionId = "";
  private roleId = "";
  private generation = 0;
  private ready = false;
  /** 当前连接已接收的持久状态版本；旧版本不能覆盖最新初始化帧。 */
  private stateRevision = -1;
  private blocked: SocketFailure | null = null;
  private maintain = false;
  /** 应用是否在后台；后台保留凭证但停止连接与重试，重复生命周期事件无副作用。 */
  private suspended = false;
  private retries = 0;
  private connecting: Promise<void> | null = null;
  private rejectOpen: ((error: Error) => void) | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly pending = new Map<string, Pending>();
  private readonly instanceId = this.identifier();

  /** 验证地址，禁止令牌出现在 URL；明文连接仅允许回环开发地址。 */
  constructor(private readonly url: string, private readonly options: SocketOptions) {
    if (!/^wss:\/\/[^\s?#@]+$/.test(url) && !/^ws:\/\/(?:127\.0\.0\.1|localhost):\d+\/[^\s?#@]+$/.test(url)) {
      throw new Error("长连接地址无效");
    }
  }

  /** 登录/恢复时等待鉴权及快照校验；相同会话共享连接任务，不回退 HTTP。 */
  connect(token: string): Promise<void> {
    if (this.suspended) return Promise.reject(new SocketFailure("NOT_READY", "应用在后台，等待恢复"));
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return Promise.reject(new SocketFailure("UNAUTHENTICATED", "登录凭证无效"));
    if (token !== this.token) { this.disconnect(); this.token = token; }
    if (this.ready) return Promise.resolve();
    if (this.connecting) return this.connecting;
    this.blocked = null;
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    const generation = ++this.generation;
    const task = this.establish(token, generation);
    this.connecting = task;
    void task.then(() => { if (this.connecting === task) this.connecting = null; }, () => { if (this.connecting === task) this.connecting = null; });
    return task;
  }

  /** 本地身份交换也走二进制连接；先结束旧会话，失败不会恢复旧账号。 */
  async login(account: string, serverId: string): Promise<GameFrame> {
    if (this.suspended) throw new SocketFailure("NOT_READY", "应用在后台，等待恢复");
    this.disconnect(); const generation=++this.generation;
    await this.establish("",generation,{account,serverId});
    if(generation!==this.generation || !this.latestState) throw new SocketFailure("SESSION_CHANGED");
    return this.latestState;
  }
  /** 匿名选服使用短生命周期连接；返回后关闭，不接管玩家会话。 */
  catalog(): Promise<unknown> {
    const socket=this.options.create(this.url); socket.binaryType="arraybuffer"; const id=this.identifier();
    return new Promise((resolve,reject)=>{
      let done=false;
      const finish=(error: Error|null,value?:unknown):void=>{
        if(done)return;done=true;clearTimeout(timer);socket.onopen=socket.onmessage=socket.onerror=socket.onclose=null;
        try {socket.close();} catch {}
        if(error)reject(error);else resolve(value);
      };
      const timer=setTimeout(()=>finish(new SocketFailure("TIMEOUT")),this.options.timeoutMs||15000);
      socket.onopen=()=>{
        if(socket.protocol!==GAME_SOCKET_PROTOCOL){finish(new SocketFailure("INVALID_MESSAGE","服务端协议版本不匹配，请重启后端"));return;}
        try {socket.send(GameProtocolCodecUtils.encodeGameFrame({version:1,kind:"request",name:Protocol.SERVERS_LIST,id,body:{}}));}catch{finish(new SocketFailure("DISCONNECTED"));}
      };
      socket.onmessage=event=>{
        try {
          const frame=GameProtocolCodecUtils.decodeGameFrame(event.data);
          if(frame.version!==1 || frame.kind!=="response" || frame.name!==Protocol.SERVERS_LIST || frame.id!==id || frame.ok!==true || frame.error!==undefined) throw new SocketFailure("INVALID_MESSAGE");
          this.traceReceived(frame);finish(null,this.object(frame.body).items);
        }catch{finish(new SocketFailure("INVALID_MESSAGE"));}
      };
      socket.onerror=socket.onclose=()=>finish(new SocketFailure("DISCONNECTED"));
    });
  }

  /** 业务入口只检查当前会话就绪，不在断线期间排队扣费请求。 */
  assertReady(token: string): void {
    if (token === this.token && this.blocked) throw this.blocked;
    if (token !== this.token || !this.ready || this.socket?.readyState !== 1) throw new SocketFailure("NOT_READY", "网络正在恢复，请稍后重试");
  }

  /** 已有账号调用只需要数据体，复用完整信封入口；不另建第二条网络链。 */
  async request(token: string, name: ReadProtocol): Promise<unknown> {
    return (await this.requestFrame(token, name)).body;
  }

  /** 用当前连接发送请求，信封已匹配且连接仍有效时才交付业务结果。 */
  async requestFrame(token: string, name: AuthenticatedGameProtocol, body: unknown = {}): Promise<GameFrame> {
    this.assertReady(token);
    const generation = this.generation;
    const frame = await this.send(name, body);
    if (generation !== this.generation) {
      throw new SocketFailure("SESSION_CHANGED");
    }
    return frame;
  }

  /**
   * 回执已到但提交快照缺失时，显式重建当前通道并等待统一鉴权首包。
   * 普通connect在就绪时不会刷新；这里不查询库存，也不重放任何业务命令。
   */
  async refreshSnapshot(token: string): Promise<void> {
    this.assertReady(token);
    this.drop(new SocketFailure("STATE_REFRESH", "正在恢复最新状态"), false);
    await this.connect(token);
  }

  /** 后台主动结束旧通道及计时器，保留已登录凭证；回前台只重做鉴权首包，不重放业务请求。 */
  setBackground(background: boolean): void {
    if (this.suspended === background) return;
    this.suspended = background;
    if (background) this.drop(new SocketFailure("SUSPENDED", "应用已暂停，返回后恢复同步"), false);
    else if (this.maintain && this.token && !this.blocked) void this.connect(this.token).catch(() => {});
  }

  /** 登出、换号或应用销毁时取消全部任务；迟到回包无法复活旧会话。 */
  disconnect(): void {
    this.maintain = false;
    this.token = "";
    this.roleId = "";
    this.latestState = null;
    this.stateRevision = -1;
    this.retries = 0;
    this.blocked = null;
    this.drop(new SocketFailure("SESSION_CHANGED", "会话已切换"), false);
  }

  /** 鉴权和首包校验完成后校准公共时钟，再通知应用提交快照。 */
  private async establish(token: string, generation: number, login?: { account: string; serverId: string }): Promise<void> {
    try {
      const socket = this.options.create(this.url);
      this.socket = socket;
      socket.binaryType = "arraybuffer";
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => this.drop(new SocketFailure("TIMEOUT"), this.maintain), this.options.timeoutMs || 15000);
        this.rejectOpen = error => { clearTimeout(timer); reject(error); };
        socket.onopen = () => {
          if (generation !== this.generation) return;
          if (socket.protocol !== GAME_SOCKET_PROTOCOL) { this.drop(new SocketFailure("INVALID_MESSAGE", "服务端协议版本不匹配，请重启后端"), false); return; }
          clearTimeout(timer); this.rejectOpen = null; resolve();
        };
        socket.onmessage = event => { if (generation === this.generation) this.receive(event.data); };
        socket.onerror = socket.onclose = () => {
          if (generation === this.generation) this.drop(new SocketFailure("DISCONNECTED"), this.maintain);
        };
      });
      if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
      const frame = await this.send(login ? Protocol.SESSION_LOGIN : Protocol.SESSION_AUTHENTICATE, login ? { ...login, clientInstanceId: this.instanceId } : { accessToken: token, clientInstanceId: this.instanceId });
      const accepted = this.object(frame.body);
      if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
      if (typeof accepted.connectionId !== "string" || !accepted.connectionId || accepted.connectionId.length > 128
          || typeof accepted.roleId !== "string" || !accepted.roleId || accepted.roleId.length > 128
          || !Number.isSafeInteger(accepted.serverTimeMs) || Number(accepted.serverTimeMs) <= 0) throw new SocketFailure("INVALID_MESSAGE");
      this.connectionId = accepted.connectionId;
      if (this.roleId && this.roleId !== accepted.roleId) throw new SocketFailure("INVALID_MESSAGE");
      this.roleId = accepted.roleId;
      const snapshot = accepted.initial;
      if (login) {
        const session = this.object(accepted.session);
        if(typeof session.accessToken!=="string" || !/^[A-Za-z0-9_-]{43}$/.test(session.accessToken)) throw new SocketFailure("INVALID_MESSAGE");
        this.token=session.accessToken;
      }
      if (generation !== this.generation) throw new SocketFailure("SESSION_CHANGED");
      this.options.validateSnapshot(snapshot);
      if (generation !== this.generation) {
        throw new SocketFailure("SESSION_CHANGED");
      }
      if (this.object(this.object(snapshot).role).id !== this.roleId) throw new SocketFailure("INVALID_MESSAGE");
      if(!Number.isSafeInteger(this.object(snapshot).revision) || Number(this.object(snapshot).revision)<0) throw new SocketFailure("INVALID_MESSAGE");
      this.stateRevision=Number(this.object(snapshot).revision);
      this.latestState=frame;
      this.ready = true; this.maintain = true; this.retries = 0;
      this.options.clock?.synchronize(Number(accepted.serverTimeMs));
      this.scheduleHeartbeat();
      this.onReady?.();
    } catch (error) {
      const failure = error instanceof SocketFailure ? error : new SocketFailure("INVALID_MESSAGE", "连接或会话数据无效");
      if (generation === this.generation) {
        if (failure.unauthorized) this.rejectSession(failure);
        else this.drop(failure, this.maintain && failure.code !== "INVALID_MESSAGE");
      }
      throw failure;
    }
  }

  /** 有界请求表保存一次网络往返；超时结束连接，所有未决读取由模块决定是否重新查询。 */
  private send(name: string, body: unknown): Promise<GameFrame> {
    if (!this.socket || this.socket.readyState !== 1) return Promise.reject(new SocketFailure("DISCONNECTED"));
    if (this.pending.size >= 16) return Promise.reject(new SocketFailure("BUSY", "请求较多，请稍后重试"));
    const id = this.identifier();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => this.drop(new SocketFailure("TIMEOUT"), this.maintain), this.options.timeoutMs || 15000);
      this.pending.set(id, { name, resolve, reject, timer });
      try {
        this.socket!.send(GameProtocolCodecUtils.encodeGameFrame({ version: 1, kind: "request", name, id, body,
          ...(this.connectionId ? { connectionId: this.connectionId } : {}) }));
      } catch { this.drop(new SocketFailure("DISCONNECTED"), this.maintain); }
    });
  }

  /** 校验连接标识，按服务器推送或请求回包分派。非法协议立即结束当前连接。 */
  private receive(raw: unknown): void {
    const generation = this.generation;
    try {
      const frame = GameProtocolCodecUtils.decodeGameFrame(raw);
      if (frame.version !== 1 || typeof frame.name !== "string"
          || (this.connectionId && frame.connectionId !== this.connectionId)) {
        throw new SocketFailure("INVALID_MESSAGE");
      }
      if (frame.kind === "event") {
        this.onServerEvent(frame);
      } else {
        this.onResponse(frame);
      }
    } catch (error) {
      if (generation === this.generation) {
        this.drop(error instanceof SocketFailure ? error : new SocketFailure("INVALID_MESSAGE"), false);
      }
    }
  }

  /** 只接纳本连接上的会话、资产、奖励、公会和任务通知。顶号消息在连接已识别时即可生效。 */
  private onServerEvent(frame: GameFrame): void {
    if (!this.connectionId) {
      throw new SocketFailure("INVALID_MESSAGE");
    }
    if (frame.name === Protocol.SESSION_KICKED) {
      if (!this.traceReceived(frame)) {
        return;
      }
      this.rejectSession(new SocketFailure("SESSION_REPLACED", "账号已在其他连接登录，请重新登录"));
      return;
    }
    if (!this.ready) {
      throw new SocketFailure("INVALID_MESSAGE");
    }
    switch (frame.name) {
      case Protocol.STATE_CHANGED:
        this.onStateChanged(frame);
        return;
      case Protocol.GUILD_UPDATED:
      case Protocol.QUEST_CHANGED:
      case Protocol.MAIL_CHANGED:
      case Protocol.FRIEND_CHANGED:
      case Protocol.CHAT_CHANGED:
        if (frame.id !== undefined || frame.ok !== undefined || frame.error !== undefined) {
          throw new SocketFailure("INVALID_MESSAGE");
        }
        if (this.traceReceived(frame)) {
          if (frame.name === Protocol.QUEST_CHANGED) {
            this.onQuestChanged?.(frame);
          } else if (frame.name === Protocol.GUILD_UPDATED) {
            this.onGuildUpdated?.(frame);
          } else {
            this.onSocialChanged?.(frame);
          }
        }
        return;
      case Protocol.REWARD_GRANTED: {
        const notice = GameProtocolCodecUtils.validateRewardNotice(frame.body);
        if (notice.roleId !== this.roleId) {
          throw new SocketFailure("INVALID_MESSAGE");
        }
        if (!this.traceReceived(frame)) {
          return;
        }
        // 允许真实通知早于快照。展示等待归奖励模块，传输层不改资产版本。
        this.onReward?.(frame);
        return;
      }
      default:
        throw new SocketFailure("INVALID_MESSAGE");
    }
  }

  /** 接纳同一角色的较新快照，再通知应用一次性提交各模块。 */
  private onStateChanged(frame: GameFrame): void {
    if (frame.id !== undefined || frame.ok !== undefined || frame.error !== undefined) {
      throw new SocketFailure("INVALID_MESSAGE");
    }
    this.options.validateSnapshot(frame.body);
    const state = this.object(frame.body);
    if (!Number.isSafeInteger(state.revision) || Number(state.revision) < 0
        || this.object(state.role).id !== this.roleId) {
      throw new SocketFailure("INVALID_MESSAGE");
    }
    if (!this.traceReceived(frame)) {
      return;
    }
    const revision = Number(state.revision);
    if (revision > this.stateRevision) {
      this.stateRevision = revision;
      this.latestState = frame;
      this.onState?.(frame);
    }
  }

  /** 按请求编号和协议名交付回执。已完成的编号可忽略，归属或内容非法则整帧拒绝。 */
  private onResponse(frame: GameFrame): void {
    if (frame.kind !== "response" || typeof frame.id !== "string" || typeof frame.ok !== "boolean") {
      throw new SocketFailure("INVALID_MESSAGE");
    }
    const pending = this.pending.get(frame.id);
    if (!pending) {
      return;
    }
    if (pending.name !== frame.name) {
      throw new SocketFailure("INVALID_MESSAGE");
    }
    let failure: SocketFailure | null = null;
    if (frame.ok) {
      if (!("body" in frame) || frame.error !== undefined) {
        throw new SocketFailure("INVALID_MESSAGE");
      }
      const handshake = pending.name === Protocol.SESSION_AUTHENTICATE || pending.name === Protocol.SESSION_LOGIN;
      if (handshake && this.object(frame.body).connectionId !== frame.connectionId) {
        throw new SocketFailure("INVALID_MESSAGE");
      }
      if (this.ready) {
        this.checkReceiptOwner(frame);
      }
    } else {
      const error = this.object(frame.error);
      if (typeof error.code !== "string" || !/^[A-Z_]{3,64}$/.test(error.code) || frame.body !== null) {
        throw new SocketFailure("INVALID_MESSAGE");
      }
      failure = new SocketFailure(error.code, GameSocketClient.failureMessage(error.code));
    }
    if (!this.traceReceived(frame)) {
      return;
    }
    this.pending.delete(frame.id);
    clearTimeout(pending.timer);
    if (failure) {
      pending.reject(failure);
      if (failure.unauthorized) {
        this.rejectSession(failure);
      }
    } else {
      pending.resolve(frame);
    }
  }

  /**
   * 解码器已验证协议的必填字段、查询状态和结构。直接回执与查询内回执均在交付前核对角色，
   * 实际发奖、竞技场本人行与自己发布的聊天回执也须归属本连接。
   */
  private checkReceiptOwner(frame: GameFrame): void {
    const body = this.object(frame.body);
    const receipt = body.receipt === undefined ? body : this.object(body.receipt);
    if (receipt.roleId !== undefined && receipt.roleId !== this.roleId) {
      throw new SocketFailure("INVALID_MESSAGE", "回执不属于当前角色");
    }
    if (receipt.actual !== undefined && this.object(receipt.actual).roleId !== this.roleId) {
      throw new SocketFailure("INVALID_MESSAGE", "奖励明细不属于当前角色");
    }
    if ((frame.name === Protocol.QUEST_CLAIM || frame.name === Protocol.RANKING_LIKE
      || frame.name === Protocol.MAIL_CHANGE || frame.name === Protocol.FRIEND_CHANGE
      || frame.name === Protocol.ARENA_CHEST_CLAIM || frame.name === Protocol.ARENA_LIKE
      || frame.name === Protocol.ARENA_SHOP_BUY)
      && body.notice !== undefined && this.object(body.notice).roleId !== this.roleId) {
      throw new SocketFailure("INVALID_MESSAGE", "奖励不属于当前角色");
    }
    if (frame.name === Protocol.ARENA_RANKING || frame.name === Protocol.ARENA_LIKE) {
      const ranking = frame.name === Protocol.ARENA_LIKE ? this.object(body.ranking) : body;
      if (this.object(ranking.own).roleId !== this.roleId) {
        throw new SocketFailure("INVALID_MESSAGE", "竞技场个人名次不属于当前角色");
      }
    }
    if (frame.name === Protocol.CHAT_SEND && this.object(body.message).roleId !== this.roleId) {
      throw new SocketFailure("INVALID_MESSAGE", "聊天发送回执不属于当前角色");
    }
  }

  /** 将资格、消耗、请求和连接等业务拒绝映射为飘字文案。 */
  private static failureMessage(code: string): string {
    switch (code) {
      case "UNAUTHENTICATED": return "登录已失效，请重新登录";
      case "SERVER_UNAVAILABLE": return "服务器暂未开放，请重新选择";
      case "BUSY": return "服务器正在处理，请稍后重试";
      case "GM_DISABLED": return "服务端开发GM未开启";
      case "GM_INVALID": return "GM发放参数无效，请检查配置和整数数量";
      case "GM_INVALID_HERO": return "英雄配置无效，或单次发放超过20名";
      case "GM_CAPACITY_FULL": return "英雄名册容量不足，请减少发放数量";
      case "GM_UNKNOWN_ITEM": return "该道具配置不存在，请重新选择";
      case "GM_UNSUPPORTED_ITEM_TYPE": return "该精灵尚未恢复真实实例生成，暂不能发放";
      case "GM_SPIRIT_LIMIT": return "精灵单次最多发放1000只，请减少数量";
      case "GM_TIMED_LIMIT": return "期限道具单次最多发放100件，请减少数量";
      case "GM_REQUEST_CONFLICT": return "同一 GM 请求的参数发生变化，请重新确认";
      case "GM_INVALID_LEVEL": return "角色等级超出策划配置范围";
      case "GM_INVALID_CHAPTER": return "请输入当前开放范围内的主线关卡";
      case "GM_CHAPTER_PENDING": return "请先完成当前主线战斗的结算";
      case "GM_INVALID_TIME": return "服务器时间无效，请检查输入";
      case "CHAPTER_UNAVAILABLE": return "主线条件不满足、阵容技能尚未支持或战报不可用，请检查阵容与进度";
      case "BATTLE_EMPTY": return "请先保存非空主线阵容";
      case "BATTLE_UNSUPPORTED": return "当前阵容包含尚未支持的技能或助战，请调整阵容";
      case "BATTLE_INVALID": return "只读试战关卡参数无效，请检查全局关卡编号";
      case "SUMMON_ALREADY_COMPLETED": return "普通免费首抽已完成";
      case "SUMMON_CAPACITY_FULL": return "英雄名册已满，无法召唤";
      case "SUMMON_TICKET_INSUFFICIENT": return "普通召唤券不足";
      case "SUMMON_FRIENDSHIP_INSUFFICIENT": return "友情点不足";
      case "SUMMON_DIAMONDS_INSUFFICIENT": return "钻石不足";
      case "SUMMON_DIAMOND_CONFIRM_REQUIRED": return "召唤消耗已变化，请重新确认";
      case "SUMMON_POINTS_INSUFFICIENT": return "召唤积分不足";
      case "SUMMON_POINTS_RECHARGE_REQUIRED": return "尚未达到积分召唤条件";
      case "SUMMON_REQUEST_CONFLICT": return "召唤请求已变更，请重新操作";
      case "SUMMON_INVALID": return "召唤参数无效";
      case "SUMMON_BUSY": return "召唤正在确认，请稍后重试";
      case "ROLE_NAME_INVALID": return "名字格式不正确，请重新输入";
      case "ROLE_NAME_EXISTS": return "这个名字已被使用，请换一个";
      case "ROLE_NAME_ALREADY_CONFIRMED": return "角色已经完成首次命名";
      case "ROLE_NAME_UNAVAILABLE": return "暂时无法获取随机名，请重试或手动输入";
      case "ROLE_NAME_SAME": return "新名字与当前名字相同";
      case "ROLE_NAME_NOT_CONFIRMED": return "请先完成首次命名";
      case "ROLE_RENAME_COST_NOT_ENOUGH": return "改名所需材料不足";
      case "ROLE_RENAME_PAYMENT_INVALID": return "改名消耗已变化，请重新确认";
      case "ROLE_IMAGE_UNAVAILABLE": return "该形象尚未解锁";
      case "ROLE_HEAD_UNAVAILABLE": return "该头像尚未解锁";
      case "ROLE_BORDER_UNAVAILABLE": return "该头像框尚未激活或已过期";
      case "ROLE_BORDER_COST_NOT_ENOUGH": return "激活头像框所需道具不足";
      case "WELCOME_GIFT_UNAVAILABLE": return "当前角色没有可领取的新手赠礼";
      case "FIRST_REWARD_INVALID": return "通关奖励的关卡编号无效";
      case "FIRST_REWARD_UNKNOWN": return "该关卡的通关奖励暂未开放";
      case "FIRST_REWARD_NOT_REACHED": return "请先通关对应关卡";
      case "FIRST_REWARD_BUSY": return "通关奖励正在确认，请稍后重试";
      case "INVALID_UPGRADE_REQUEST": return "英雄升级参数无效";
      case "INVALID_EQUIPMENT_REQUEST": return "装备操作参数无效，请重新选择";
      case "EQUIPMENT_NOT_AVAILABLE": return "该装备数量不足或已不可用";
      case "HERO_EQUIPMENT_CHANGED": return "英雄装备已变化，请按当前槽位重新操作";
      case "HERO_EQUIPMENT_BUSY": return "装备操作正在确认，请稍后重试";
      case "HERO_NOT_FOUND": return "英雄资料已变化，请重新打开详情";
      case "HERO_LOCK_BUSY": return "角色数据正忙，请稍后设置英雄锁定状态";
      case "HERO_LEVEL_CHANGED": return "英雄等级已变化，请按当前等级重新升级";
      case "HERO_STAGE_CHANGED": return "英雄阶级已变化，请按当前阶级重新进阶";
      case "HERO_STAGE_LEVEL": return "英雄等级未达到进阶要求";
      case "HERO_STAGE_STAR": return "英雄星级未达到进阶要求";
      case "HERO_STAGE_LIMIT": return "已达最高强化阶级";
      case "HERO_GROWTH_BUSY": return "培养操作正在确认，请稍后重试";
      case "INVALID_HERO_STAR_REQUEST": return "升星参数无效，请重新选择";
      case "HERO_STAR_CHANGED": return "英雄星级已变化，请重新选择素材";
      case "HERO_STAR_LIMIT": return "当前英雄已达最高星级";
      case "HERO_STAR_LEVEL": return "尚未达到升星等级条件";
      case "HERO_STAR_ROSTER": return "未达到升星所需高星英雄数量";
      case "HERO_STAR_MATERIALS": return "所选材料不符合配方";
      case "HERO_STAR_MATERIAL_UNAVAILABLE": return "所选英雄已不可作为材料";
      case "INSUFFICIENT_HERO_STAR_ITEMS": return "升星所需道具不足";
      case "INVALID_HERO_JEWEL_REQUEST": return "宝石操作参数无效，请重新选择";
      case "HERO_JEWEL_INVALID": return "宝石配置或部位无效";
      case "HERO_JEWEL_SLOT_LOCKED": return "英雄星级尚未解锁该宝石槽";
      case "HERO_JEWEL_CHANGED": return "该槽宝石已变化，请重新选择";
      case "HERO_JEWEL_RECIPE_INVALID": return "当前宝石没有可用合成配方";
      case "HERO_JEWEL_NOT_AVAILABLE": return "所需宝石材料不足";
      case "HERO_JEWEL_PREVIEW_CHANGED": return "材料已变化，请重新确认一键合成";
      case "GOD_EQUIPMENT_CHANGE_INVALID": return "神装穿卸参数无效";
      case "GOD_EQUIPMENT_NOT_FOUND": return "该神装已不在背包";
      case "GOD_EQUIPMENT_CHANGED": return "神装槽状态已变化，请重新选择";
      case "GOD_EQUIPMENT_ALREADY_WORN": return "该神装已被其他英雄穿戴";
      case "GOD_EQUIPMENT_ROLE_LEVEL": return "角色达到 70 级解锁神装";
      case "GOD_EQUIPMENT_WORLD_LEVEL": return "所在区服世界等级尚未解锁神装";
      case "GOD_EQUIPMENT_HERO_STAR": return "英雄达到 6 星可穿戴神装";
      case "GOD_EQUIPMENT_DRAW_INVALID": return "探宝参数无效";
      case "GOD_EQUIPMENT_DRAW_PRICE_CHANGED": return "探宝价格已变化，请重新确认";
      case "GOD_EQUIPMENT_SHOP_REQUEST_INVALID": return "神装商店购买数量无效";
      case "GOD_EQUIPMENT_SHOP_RESET": return "神装商店已刷新，请重新选择";
      case "GOD_EQUIPMENT_SHOP_PRODUCT_MISSING": return "该商品暂不可购买";
      case "GOD_EQUIPMENT_SHOP_LIMIT": return "该商品已达到今日限购数量";
      case "GOD_EQUIPMENT_SHOP_INSUFFICIENT": return "神装碎片不足";
      case "INVALID_HERO_ARTIFACT_REQUEST": return "圣器操作参数无效";
      case "ARTIFACT_NOT_FOUND": return "该圣器已不在当前部位或背包";
      case "ARTIFACT_SLOT_CHANGED": return "圣器佩戴状态已变化，请重新选择";
      case "ARTIFACT_SLOT_NOT_ACTIVATABLE": return "该部位未达到激活条件或已激活";
      case "ARTIFACT_SLOT_NOT_ACTIVE": return "请先激活该圣器部位";
      case "ARTIFACT_TRANSFORM_TARGET_CHANGED": return "圣器转换目标已变化";
      case "ARTIFACT_UPGRADE_HERO_UNAVAILABLE": return "升星素材英雄已不可用";
      case "ARTIFACT_UPGRADE_MATERIALS": return "圣器升星素材与配方不符";
      case "ARTIFACT_UPGRADE_TARGET_CHANGED": return "圣器升星目标已变化";
      case "INSUFFICIENT_ARTIFACT_ITEMS": return "圣器操作所需钻石或道具不足";
      case "INSUFFICIENT_HERO_STAGE_STONE": return "英雄进阶石不足";
      case "LEVEL_LIMIT": return "已达到当前强化阶段的等级上限";
      case "INSUFFICIENT_GOLD": return "金币不足";
      case "INSUFFICIENT_HERO_EXP": return "英雄经验不足";
      case "HERO_UPGRADE_BUSY": return "英雄升级正在确认，请稍后重试";
      case "FRAGMENT_INVALID": return "碎片合成参数无效";
      case "FRAGMENT_UNSUPPORTED": return "该碎片暂不支持合成";
      case "FRAGMENT_INSUFFICIENT": return "碎片数量不足";
      case "FRAGMENT_CAPACITY_FULL": return "英雄名册剩余位置不足";
      case "FRAGMENT_LEVEL_REQUIRED": return "角色等级未达到合成要求";
      case "FRAGMENT_REQUEST_CONFLICT": return "合成请求与原参数冲突，请重新确认";
      case "FRAGMENT_BUSY": return "碎片合成正在确认，请稍后重试";
      case "MARKET_LOCKED": return "市场尚未开放，请先提升角色等级";
      case "MARKET_SHELF_CHANGED": return "货架已变化，请按当前商品重新操作";
      case "MARKET_PRODUCT_MISSING": return "商品已不在当前货架";
      case "MARKET_REWARD_UNAVAILABLE": return "该商品暂不可购买";
      case "MARKET_LIMIT": return "已达到该商品的购买上限";
      case "MARKET_REFRESH_LIMIT": return "今日付费刷新次数已用完";
      case "MARKET_INSUFFICIENT": return "购买或刷新所需的货币不足";
      case "INVALID_MARKET_REQUEST": return "市场操作参数无效，请重新选择";
      case "INVALID_BLACK_MARKET_REQUEST": return "商店操作参数无效，请重新选择";
      case "BLACK_MARKET_LOCKED": return "该商店尚未解锁";
      case "BLACK_MARKET_UNAVAILABLE": return "该商店暂未开放兑换";
      case "BLACK_MARKET_PRODUCT_MISSING": return "商品已不在当前货架";
      case "BLACK_MARKET_CLERGY_REQUIRED": return "神职等级不足，暂不可购买";
      case "BLACK_MARKET_LIMIT": return "已达到该商品的购买上限";
      case "BLACK_MARKET_INSUFFICIENT": return "购买所需的货币不足";
      case "BLACK_MARKET_SHELF_CHANGED": return "货架已更新，请重新选择商品";
      case "INVALID_SMITH_REQUEST": return "合成参数无效，请重新选择";
      case "SMITH_LOCKED": return "角色达到 5 级开启铁匠铺";
      case "SMITH_QUICK_LOCKED": return "角色达到 25 级或已充值后开启装备一键合成";
      case "SMITH_RECIPE_INVALID": return "该装备没有合成配方";
      case "SMITH_INSUFFICIENT_GOLD": return "金币不足";
      case "SMITH_INSUFFICIENT_MATERIAL": return "装备合成材料不足";
      case "SMITH_EMPTY": return "没有可合成的装备";
      case "SMITH_PREVIEW_CHANGED": return "库存已变化，请重新预览合成";
      case "GUILD_LOCKED": return "角色达到18级后开放公会";
      case "GUILD_INSUFFICIENT": return "创建公会所需的钻石不足";
      case "GUILD_RECHARGE_REQUIRED": return "尚未达到创建公会的累计充值条件";
      case "GUILD_NAME_INVALID": return "公会名称不符合要求";
      case "GUILD_DESCRIPTION_INVALID": return "公会公告不符合要求";
      case "GUILD_NAME_TAKEN": return "公会名称已被使用";
      case "GUILD_NOT_FOUND": return "该公会已不存在";
      case "GUILD_ALREADY_MEMBER": return "你已加入公会";
      case "GUILD_NOT_MEMBER": return "你尚未加入公会";
      case "GUILD_FULL": return "公会人数已满";
      case "GUILD_COOLDOWN": return "退出公会后需等待两小时才能申请";
      case "GUILD_FORBIDDEN": return "你没有此公会操作权限";
      case "GUILD_LEADER_CANNOT_LEAVE": return "会长不能在仍有其他成员时退出公会";
      case "GUILD_APPLICATION_MISSING": return "该入会申请已处理或失效";
      case "GUILD_REQUEST_CONFLICT": return "操作已发生变化，请刷新公会状态";
      case "GUILD_REQUEST_INVALID": return "公会操作参数无效";
      case "GUILD_SHOP_MEMBERSHIP_CHANGED":
      case "GUILD_DONATION_CHANGED": return "公会成员关系已变化，请重新打开窗口";
      case "GUILD_SHOP_RESET": return "公会商店已刷新，请重新确认兑换";
      case "GUILD_SHOP_PRODUCT_UNAVAILABLE": return "该公会商店商品暂未开放";
      case "GUILD_SHOP_LIMIT": return "已达到商品的每周兑换上限";
      case "GUILD_SHOP_INSUFFICIENT": return "公会勋章不足";
      case "GUILD_SHOP_REQUEST_INVALID":
      case "GUILD_DONATION_REQUEST_INVALID": return "公会操作参数无效";
      case "GUILD_SHOP_REQUEST_REUSED":
      case "GUILD_DONATION_REQUEST_CONFLICT": return "操作已变化，请重新打开窗口";
      case "GUILD_DONATION_RESET": return "已进入新的捐献周期，请重新确认";
      case "GUILD_DONATION_ALREADY_DONATED": return "今天已完成公会捐献";
      case "GUILD_DONATION_INSUFFICIENT": return "今天所选档位的捐献材料不足";
      case "GUILD_DONATION_CHEST_LOCKED": return "公会今日贡献尚未达到该宝箱要求";
      case "GUILD_DONATION_CHEST_CLAIMED": return "今天已领取该公会宝箱";
      case "QUEST_RESET": return "每日任务已刷新，请重新确认";
      case "QUEST_NOT_FOUND": return "该任务奖励已刷新";
      case "QUEST_NOT_COMPLETE": return "尚未达到领取条件";
      case "QUEST_ALREADY_CLAIMED": return "该奖励已领取";
      case "QUEST_REQUEST_INVALID":
      case "QUEST_REQUEST_CONFLICT": return "任务操作已变化，请重试";
      case "RANK_LOCKED": return "排行榜尚未开放";
      case "RANK_CROSS_LOCKED": return "跨服排行榜尚未开放";
      case "RANK_LIKE_RESET": return "排行榜已刷新，请重新点赞";
      case "RANK_ALREADY_LIKED": return "今天已为该榜点赞";
      case "RANK_LEADER_CHANGED": return "榜首已变化，请查看最新排行榜";
      case "RANK_REQUEST_CONFLICT":
      case "RANK_INVALID": return "排行榜操作已变化，请重试";
      case "MAIL_NOT_FOUND": return "该邮件已删除或过期";
      case "MAIL_ALREADY_CLAIMED": return "该邮件附件已领取";
      case "MAIL_DELETE_BLOCKED": return "请先阅读邮件并领取附件";
      case "MAIL_FULL": return "邮件箱已满";
      case "MAIL_INVALID":
      case "MAIL_REQUEST_CONFLICT": return "邮件操作已变化，请重试";
      case "FRIEND_NOT_FOUND": return "找不到该玩家";
      case "FRIEND_ALREADY": return "对方已是好友";
      case "FRIEND_BLOCKED": return "当前无法向对方发起好友操作";
      case "FRIEND_LIMIT": return "你的好友数量已达上限";
      case "FRIEND_TARGET_LIMIT": return "对方好友数量已达上限";
      case "FRIEND_APPLICATION_MISSING": return "该好友申请已处理";
      case "FRIEND_RELATION_MISSING": return "该好友关系已变化";
      case "FRIEND_BLOCK_LIMIT": return "黑名单数量已达上限";
      case "FRIEND_ALREADY_BLOCKED": return "对方已在黑名单中";
      case "FRIEND_NOT_BLOCKED": return "对方已解除拉黑";
      case "FRIEND_SEND_LIMIT": return "今日赠送次数已用完";
      case "FRIEND_ALREADY_SENT": return "今天已向对方赠送";
      case "FRIEND_NO_GIFTS": return "暂无可领取的礼物";
      case "FRIEND_DAY_CHANGED": return "友情礼物已跨日刷新，请重试";
      case "FRIEND_INVALID":
      case "FRIEND_REQUEST_CONFLICT": return "好友操作已变化，请重试";
      case "CHAT_LEVEL_REQUIRED": return "尚未达到当前频道的发言等级";
      case "CHAT_CHANNEL_UNAVAILABLE": return "当前无法访问此聊天频道或会话";
      case "CHAT_READ_ONLY": return "系统频道仅显示公告";
      case "CHAT_RATE_LIMIT": return "发送太快，请稍后再试";
      case "CHAT_CONTENT_TOO_LONG": return "消息过长，请缩短后重试";
      case "CHAT_CONTENT_RESTRICTED": return "消息含有无法发送的内容";
      case "CHAT_REQUEST_EXPIRED": return "原发送已超出历史保留范围";
      case "CHAT_REQUEST_CONFLICT":
      case "CHAT_INVALID": return "聊天操作无法完成，请重新确认";
      case "VIP_REQUEST_INVALID": return "VIP 任务参数无效";
      case "VIP_REQUEST_CONFLICT": return "VIP 任务操作已变化，请重新选择";
      case "VIP_TASK_TIER": return "当前档位无法领取该任务";
      case "VIP_TASK_UNAVAILABLE": return "该任务相关玩法尚未开放";
      case "VIP_TASK_NOT_REACHED": return "任务进度尚未达成";
      case "VIP_TASK_CLAIMED": return "该任务奖励已领取";
      case "DUNGEON_LEVEL": return "角色等级未达到副本开启条件";
      case "DUNGEON_STAGE": return "该副本关卡尚未开放";
      case "DUNGEON_PREVIOUS_STAGE": return "请先通关当前副本的上一关";
      case "DUNGEON_POWER": return "历史主线阵容最高战力未达到副本要求";
      case "DUNGEON_COUNT": return "今日副本次数已用完";
      case "DUNGEON_SWEEP_LOCKED": return "首次挑战胜利后可清扫";
      case "DUNGEON_COST_CHANGED": return "挑战费用已变化，请重新确认";
      case "DUNGEON_DIAMONDS": return "挑战所需钻石不足";
      case "DUNGEON_FORMATION": return "请先保存可出战的主线阵容";
      case "DUNGEON_BATTLE_UNAVAILABLE": return "当前阵容的技能尚不能用于此副本，请检查上阵英雄";
      case "DUNGEON_REQUEST_INVALID": return "副本操作参数无效，请重新选择";
      case "DUNGEON_REQUEST_CONFLICT": return "副本操作与原请求不一致，请重新确认";
      case "TOWER_LEVEL": return "角色达到16级后开放幻境之塔";
      case "TOWER_FLOOR": return "请挑战当前未通关楼层";
      case "TOWER_ENERGY": return "幻境之塔精力不足";
      case "TOWER_FORMATION_EMPTY": return "请先保存幻境之塔阵容";
      case "TOWER_FORMATION_CHANGED": return "阵容已变化，请重新打开出阵";
      case "TOWER_FORMATION_INVALID": return "幻境阵容不可用，请重新选将";
      case "TOWER_BATTLE_UNAVAILABLE": return "当前阵容无法进行幻境战斗";
      case "TOWER_SWEEP_FLOOR": return "只能扫荡已通关的最高楼层";
      case "TOWER_SWEEP_LIMIT": return "今日幻境扫荡次数已用完";
      case "TOWER_COST_CHANGED": return "扫荡费用已变化，请重新确认";
      case "TOWER_DIAMONDS": return "扫荡所需钻石不足";
      case "TOWER_MILESTONE_LOCKED": return "通关对应楼层后可领取";
      case "TOWER_MILESTONE_CLAIMED": return "该楼层奖励已领取";
      case "TOWER_REQUEST_INVALID": return "幻境操作参数无效，请重新选择";
      case "TOWER_REQUEST_CONFLICT": return "幻境操作与原请求不一致，请重新确认";
      case "DREAMLAND_LEVEL": return "角色达到25级后开放永恒梦境";
      case "DREAMLAND_FLOOR_UNAVAILABLE": return "当前楼层暂未开放";
      case "DREAMLAND_FORMATION_EMPTY": return "请先选择出战英雄";
      case "DREAMLAND_FORMATION_INVALID": return "梦境阵容不可用，请重新选将";
      case "DREAMLAND_BATTLE_UNAVAILABLE": return "当前阵容无法进行梦境战斗，请检查上阵英雄";
      case "DREAMLAND_BUFF_INVALID": return "可选增益已变化，请重新选择";
      case "DREAMLAND_PHASE":
      case "DREAMLAND_STATE_CHANGED": return "梦境进度已变化，正在同步";
      case "DREAMLAND_MILESTONE_LOCKED": return "通关对应楼层后可领取当前首通奖励";
      case "DREAMLAND_MILESTONE_CLAIMED": return "该首通奖励已领取";
      case "DREAMLAND_ASSIST_ALREADY_DISPATCHED": return "今日已派遣英雄";
      case "DREAMLAND_ASSIST_OWN_HERO": return "请选择自己拥有的英雄";
      case "DREAMLAND_ASSIST_UNAVAILABLE": return "该好友英雄当前不可借用，请重新选择";
      case "DREAMLAND_ASSIST_POWER": return "该英雄超出当前助战战力上限";
      case "DREAMLAND_REQUEST_INVALID": return "梦境操作参数无效，请重新选择";
      case "DREAMLAND_REQUEST_CONFLICT": return "梦境操作与原请求不一致，请重新确认";
      case "TRIAL_LEVEL": return "角色达到30级后开放勇者试炼";
      case "TRIAL_DIFFICULTY_ALREADY_SELECTED": return "今日已选择难度";
      case "TRIAL_DIFFICULTY_LOCKED": return "需要通关上一难度并达到对应战力";
      case "TRIAL_DIFFICULTY_UNAVAILABLE": return "该难度的守军规则尚未开放";
      case "TRIAL_FORMATION_INVALID": return "请选择满足要求的试炼英雄";
      case "TRIAL_NO_LIVING_HERO": return "试炼阵容中没有可出战的英雄";
      case "TRIAL_NODE_LOCKED": return "请先完成前面的关卡";
      case "TRIAL_CHEST_CLAIMED": return "该试炼宝箱已领取";
      case "TRIAL_BATTLE_UNAVAILABLE": return "当前战斗无法开始，请稍后重试";
      case "TRIAL_OPPONENT_UNAVAILABLE": return "当前试炼守军的战斗规则尚未开放";
      case "TRIAL_REVIVE_UNAVAILABLE": return "当前无法复活英雄";
      case "TRIAL_ASSIST_POWER": return "该英雄超出试炼助战战力上限";
      case "TRIAL_ASSIST_UNAVAILABLE": return "该支援当前不可操作，请重新选择";
      case "TRIAL_STATE_CHANGED": return "试炼进度已更新，请重新操作";
      case "TRIAL_CLOCK_REGRESSED": return "试炼刷新时间异常，请稍后重试";
      case "TRIAL_REQUEST_INVALID":
      case "TRIAL_REQUEST_CONFLICT": return "试炼操作已失效，请重新确认";
      case "TRIAL_SHOP_INSUFFICIENT": return "试炼之血不足";
      case "TRIAL_SHOP_LIMIT": return "该商品已达到本周限购";
      case "TRIAL_SHOP_OFFER_UNAVAILABLE": return "该试炼商品当前无法兑换";
      case "TRIAL_SHOP_RESET": return "试炼商店已刷新，请重新选择";
      case "TRIAL_SHOP_REQUEST_INVALID":
      case "TRIAL_SHOP_REQUEST_REUSED": return "试炼兑换请求已失效，请重新确认";
      case "ARENA_LEVEL": return "角色达到8级后开放竞技场";
      case "ARENA_OPPONENT": return "对手已变化，请重新选择";
      case "ARENA_TICKETS": return "免费次数已用完，竞技场门票不足";
      case "ARENA_DIAMONDS": return "购买竞技场门票所需的钻石不足";
      case "ARENA_BATTLE_UNAVAILABLE": return "请保存可出战的主线阵容后再挑战";
      case "ARENA_REPORT": return "该竞技场战报不可用";
      case "ARENA_FORMATION_INVALID": return "防守阵容包含无效格位或不可用英雄";
      case "ARENA_FORMATION_CHANGED": return "防守阵容已变化，请关闭并重新编辑";
      case "ARENA_SEASON_CHANGED": return "赛季已变更，请刷新后再领取";
      case "ARENA_CHEST": return "该竞技场宝箱不可用";
      case "ARENA_CHEST_CLAIMED": return "该宝箱已领取";
      case "ARENA_CHEST_COUNT": return "本赛季挑战次数不足";
      case "ARENA_LIKE_DAY": return "点赞日期已变化，请刷新榜单";
      case "ARENA_LIKE_TARGET": return "该玩家当前不可点赞";
      case "ARENA_LIKED": return "今天已经为该玩家点过赞";
      case "ARENA_LIKE_COUNT": return "今天的点赞次数已用完";
      case "ARENA_SHOP_REQUEST": return "竞技商店兑换参数无效";
      case "ARENA_SHOP_REFRESH": return "商店已刷新，请重新确认商品";
      case "ARENA_SHOP_OFFER": return "该商品当前不可兑换";
      case "ARENA_SHOP_LIMIT": return "已超过本周兑换数量";
      case "ARENA_SHOP_CURRENCY": return "竞技币不足";
      case "ARENA_REQUEST_INVALID": return "竞技场操作参数无效，请重新选择";
      case "ARENA_REQUEST_CONFLICT": return "竞技场操作与原请求不一致，请重新确认";
      case "IDEMPOTENCY_CONFLICT": return "操作与原请求不一致，请重新确认";
      case "UNKNOWN_MESSAGE": return "服务端不支持此协议，请更新并重启后端";
      default: return "请求未完成（" + code + "），请稍后重试";
    }
  }

  /** 输出诊断后返回连接是否仍有效。监听器可同步退出游戏，此时原帧应当就地结束。 */
  private traceReceived(frame: Readonly<GameFrame>): boolean {
    const generation = this.generation;
    try {
      this.options.onReceive?.(frame);
    } catch {
      // 诊断代码失败本身不改变游戏连接或协议结果。
    }
    return generation === this.generation;
  }

  /** 仅当前凭证失效时通知账号层；先停止重连，避免回登录后后台抢占会话。 */
  private rejectSession(error: SocketFailure): void {
    const token = this.token;
    this.maintain = false;
    this.drop(error, false);
    this.onRejected?.(token, error.message);
  }

  /** 清理连接、时钟和待响应请求；旧事件先解绑再关闭，重试只重建鉴权及同步。 */
  private drop(error: Error, retry: boolean): void {
    this.generation++;
    this.options.clock?.invalidate();
    const wasReady = this.ready;
    this.ready = false; this.connectionId = ""; this.connecting = null;
    if (!retry && error instanceof SocketFailure && error.code === "INVALID_MESSAGE") {
      this.blocked = new SocketFailure("INVALID_MESSAGE", "连接数据异常，请返回登录后重试");
    }
    if (this.retryTimer !== null) clearTimeout(this.retryTimer);
    if (this.heartbeatTimer !== null) clearTimeout(this.heartbeatTimer);
    this.retryTimer = this.heartbeatTimer = null;
    const socket = this.socket; this.socket = null;
    if (socket) { socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null; try { socket.close(); } catch { /* 通道已失效。 */ } }
    const rejectOpen = this.rejectOpen; this.rejectOpen = null; rejectOpen?.(error);
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(error); }
    this.pending.clear();
    if (retry && this.token && !this.suspended) {
      const token = this.token;
      const attempt = this.retries++;
      const delay = this.options.retryDelay?.(attempt) ?? Math.min(15000, 1000 * Math.pow(2, attempt) * (0.8 + Math.random() * 0.4));
      this.retryTimer = setTimeout(() => { this.retryTimer = null; if (this.token === token) void this.connect(token).catch(() => {}); }, delay);
    }
    if (wasReady) this.onDisconnected?.(retry ? "网络已断开，正在重新连接…" : this.blocked?.message || error.message);
  }

  /** 心跳串行等待回应；只有当前连接的有效回应可校准时钟并安排下一次心跳。 */
  private scheduleHeartbeat(): void {
    this.heartbeatTimer = setTimeout(async () => {
      this.heartbeatTimer = null;
      const generation = this.generation;
      try {
        const value = this.object((await this.send(Protocol.SESSION_HEARTBEAT, {})).body);
        if (!Number.isSafeInteger(value.serverTimeMs) || Number(value.serverTimeMs) <= 0) throw new SocketFailure("INVALID_MESSAGE");
        if (generation === this.generation && this.ready) {
          this.options.clock?.synchronize(Number(value.serverTimeMs));
          this.scheduleHeartbeat();
        }
      } catch (error) {
        if (generation === this.generation) {
          if (error instanceof SocketFailure && error.code === "BUSY" && this.ready) this.scheduleHeartbeat();
          else this.drop(error instanceof Error ? error : new SocketFailure("DISCONNECTED"), false);
        }
      }
    }, this.options.heartbeatMs || 20000);
  }

  /** 只接受解码后的对象，不让数组/null 被当作合法消息或快照。 */
  private object(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new SocketFailure("INVALID_MESSAGE");
    return value as Record<string, unknown>;
  }

  /** 请求标识只用于关联，不是安全凭证或业务幂等键。 */
  private identifier(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, char => {
      const random = Math.floor(Math.random() * 16); return (char === "x" ? random : (random & 3) | 8).toString(16);
    });
  }
}
