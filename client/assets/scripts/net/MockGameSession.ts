import { ErrorCode } from "../core/errors";
import {
  applyHeroExp,
  EXP_POTION_GAIN,
  GOLD_BAG_GAIN,
  ITEM_EXP_POTION,
  ITEM_GOLD_BAG,
  listBagItems,
  ITEM_WISH_TOKEN,
  STARTER_EXP_POTION,
  STARTER_GOLD_BAG,
  STARTER_WISH_TOKEN,
} from "../module/bag/items";
import {
  clampWeaponLevel,
  HeroRosterEntry,
  HeroSeed,
  HERO_MAX_LEVEL,
  normalizeRoster,
  starterRoster,
  toHeroCard,
  upgradeCost,
  WEAPON_MAX_LEVEL,
} from "../module/hero/growth";
import {
  buildIdleView,
  elapsedSince,
  IDLE_HERO_EXP_ID,
  IDLE_ITEM_ID,
  IDLE_ITEM_NAME,
  IDLE_ROLE_EXP_ID,
} from "../module/idle/rewards";
import { MAINLINE_PUSH_MAX, MAINLINE_PUSH_STAGE, STAGE_WIN_GOLD } from "../module/mainline/battle";
import {
  attachmentName,
  MailSeed,
  mergeAttachments,
  normalizeMailList,
  starterMails,
  StoredMail,
  toMailEntry,
} from "../module/mail/inbox";
import { strengthenGoldCost, STRENGTHEN_STONE_COST, toSmithGear } from "../module/smith/forge";
import {
  ARENA_DAILY_LIMIT,
  ARENA_START_SCORE,
  clampArenaScore,
  findArenaOpponent,
  listArenaOpponents,
  rankFromScore,
  rosterPower,
  settleArena,
} from "../module/arena/match";
import {
  clampTowerFloor,
  floorGuardianName,
  floorPower,
  settleTower,
  TOWER_DAILY_LIMIT,
  TOWER_ITEM_ID,
  TOWER_ITEM_NAME,
  TOWER_MAX_FLOOR,
  towerCleared,
} from "../module/tower/climb";
import {
  DAILY_GOLD_KIND,
  DAILY_GOLD_LIMIT,
  DAILY_ITEM_ID,
  DAILY_ITEM_NAME,
  findDailyTier,
  listDailyTiers,
  settleDailyGold,
} from "../module/daily/gold";
import {
  findLogin7Rewards,
  listLogin7Days,
  LOGIN7_DAYS,
  tallyLogin7,
} from "../module/login7/rewards";
import {
  copyGoal7Rewards,
  findGoal7Task,
  goal7Current,
  goal7State,
  heroLevelsToUpgrades,
  listGoal7Tasks,
  tallyGoal7,
  Goal7Progress,
} from "../module/goal7/tasks";
import { findShopOffer, listShopSkus } from "../module/shop/catalog";
import {
  dropAt,
  parseWishPay,
  wishCost,
  WISH_DAILY_LIMIT,
  WISH_DIAMOND_COST,
  WISH_GOLD_COST,
  WISH_ITEM_COST,
} from "../module/wish/pool";
import {
  cafeHasDuplicate,
  cafeReward,
  CAFE_BEAN_ITEM_ID,
  CAFE_BEAN_ONE,
  CAFE_BEAN_TWO,
  CAFE_DAILY_LIMIT,
  CAFE_GOLD_ONE,
  CAFE_GOLD_TWO,
  CAFE_MAX_HEROES,
  readCafeHeroIds,
} from "../module/cafe/serve";
import { CAFE_BEAN_NAME } from "../module/bag/items";
import {
  findGiftAcc,
  findGiftLevel,
  GIFT_DAILY_GOLD,
  GIFT_DAILY_ITEM_COUNT,
  GIFT_DAILY_ITEM_ID,
  GIFT_DAILY_ITEM_NAME,
  GIFT_DAILY_PRICE,
  GIFT_FIRST_AMOUNT,
  GIFT_FIRST_DIAMOND,
  GIFT_FIRST_ITEM_COUNT,
  GIFT_FIRST_ITEM_ID,
  GIFT_FIRST_ITEM_NAME,
  GIFT_RECHARGE_DIAMOND,
  GIFT_RECHARGE_STEP,
  listGiftAcc,
  listGiftLevels,
  parseGiftRecharge,
} from "../module/gift/packs";
import {
  findLimitedOffer,
  findLimitedPack,
  limitedCountdown,
  limitedPackEnded,
  limitedStoneCost,
  limitedStoneFree,
  LIMITED_BEAN_ITEM_ID,
  LIMITED_PACK_DAYS,
  LIMITED_STONE_GOLD,
  LIMITED_STONE_LIMIT,
  listLimitedOffers,
  listLimitedPacks,
} from "../module/limited/event";
import {
  isSummonCount,
  poolAt,
  shardItemId,
  SUMMON_SHARD_GAIN,
  summonCost,
} from "../module/summon/pull";
import {
  BagListResp,
  BagUseResp,
  HeroListResp,
  HeroUpgradeResp,
  IdleClaimResp,
  IdleQueryResp,
  LoginResp,
  RoleCreateResp,
  RoleEnterResp,
  StageEnterResp,
  StagePushResp,
  StageResultResp,
  MailAttachment,
  MailClaimAllResp,
  MailClaimResp,
  MailDeleteResp,
  MailListResp,
  MailReadResp,
  SmithStrengthenResp,
  SmithViewResp,
  ArenaChallengeResp,
  ArenaViewResp,
  SummonDrop,
  SummonPullResp,
  TowerChallengeResp,
  TowerViewResp,
  DailyChallengeResp,
  DailyViewResp,
  Login7AdvanceResp,
  Login7ClaimResp,
  Login7ViewResp,
  Goal7ClaimResp,
  Goal7ViewResp,
  ShopBuyResp,
  ShopViewResp,
  WishDrawResp,
  WishPay,
  WishViewResp,
  CafeClaimResp,
  CafeHero,
  CafeSendResp,
  CafeViewResp,
  GiftBuyDailyResp,
  GiftClaimAccResp,
  GiftClaimLevelResp,
  GiftLevelState,
  GiftAccState,
  GiftRechargeResp,
  GiftViewResp,
  LimitedAlchemyResp,
  LimitedBuyResp,
  LimitedExchangeResp,
  LimitedViewResp,
} from "./protocol/types";

/** 一场预览里的假服状态。同一 MockTransport 上多次请求共用这一份。 */
export interface MockRoleState {
  roleId: number;
  name: string;
  level: number;
}

/**
 * 给 MockGameSession 的初始值。
 * level 不单独存：新通关后按 clearedStage 重算（1 + 已通关数）。
 * openDay 只升不降，除非创角重置；不填则按每 5 关 +1 天。
 */
export interface MockSessionSeed {
  openDay?: number;
  account?: string;
  token?: string;
  serverId?: number;
  role?: { roleId?: number; name?: string };
  /** 下一关。缺省是 clearedStage + 1。 */
  stageId?: number;
  clearedStage?: number;
  /** 不填则用新号起步：金币 100、钻石 20。 */
  gold?: number;
  diamond?: number;
  /** 挂机起算时刻（毫秒）。不填则从构造这一刻起算。 */
  idleAnchorMs?: number;
  /**
   * 已持有的道具。id 101 是强化石，201 小金币袋，202 经验药水，203 许愿符。
   * 不填则发起步消耗品。填了（含空数组）就只用这里的数量。
   */
  items?: { id: number; count: number }[];
  /** 英雄名册。不填或空数组则种下三名起步英雄。 */
  heroes?: HeroSeed[];
  /** 召唤顺序下标。不填从 0 开始。创角会回到 0。 */
  summonCursor?: number;
  /**
   * 邮箱。不填则发起步三封：欢迎、开服补给、维护公告。
   * 填了（含空数组）就只用这里的邮件。
   */
  mails?: MailSeed[];
  /** 竞技场积分。不填则 1000。创角回到 1000。 */
  arenaScore?: number;
  /** 今日已挑战次数。不填为 0。超过每日上限时按上限计。 */
  arenaUsed?: number;
  /**
   * 次数所属的开服天。不填则跟当前 openDay 对齐，避免一打开就把次数清掉。
   * 和 openDay 不一致时，下一次查看或挑战会把次数清零。
   */
  arenaDay?: number;
  /** 幻境之塔下一层。不填为 1。通关第 20 层后为 21。创角回到 1。 */
  towerFloor?: number;
  /** 今日已挑战幻境之塔的次数。不填为 0。超过每日上限时按上限计。 */
  towerUsed?: number;
  /**
   * 塔次数所属的开服天。不填则跟当前 openDay 对齐。
   * 和 openDay 不一致时，下一次查看或挑战会把次数清零，层数不动。
   */
  towerDay?: number;
  /** 今日已挑战金币副本的次数。不填为 0。超过每日上限时按上限计。 */
  dailyUsed?: number;
  /**
   * 金币副本次数所属的开服天。不填则跟当前 openDay 对齐。
   * 和 openDay 不一致时，下一次查看或挑战会把次数清零。
   */
  dailyDay?: number;
  /**
   * 角色登录天，1 到 7。不填为 1。
   * 跟创角后的登录天数走，不跟 openDay。主线推进不会加这个数。
   */
  loginDay?: number;
  /** 已经领取的登录天。只认 1 到 7。不填则都没领。 */
  loginClaimed?: number[];
  /**
   * 成功领取挂机的次数。不填为 0。
   * 时间太短被拒绝的不算。创角清零。七日目标的「领取挂机」读这个数。
   */
  idleClaimCount?: number;
  /** 已经领取的七日目标 id。不认识的字符串会记下，但不出现在任务列表里。 */
  goalClaimed?: string[];
  /**
   * 今日各商品已购次数。id 是商品 id，不是道具 id。
   * 不认识的 id 忽略。超过该商品限购时按限购计。
   */
  shopBought?: { id: number; count: number }[];
  /**
   * 已购次数所属的开服天。不填则跟当前 openDay 对齐，避免一打开就把次数清掉。
   * 和 openDay 不一致时，下一次查看或购买会把次数清零，背包里已经买到的不收回。
   */
  shopDay?: number;
  /** 今日已许愿次数。不填为 0。超过每日上限时按上限计。三种方式共用。 */
  wishUsed?: number;
  /**
   * 许愿次数所属的开服天。不填则跟当前 openDay 对齐。
   * 和 openDay 不一致时，下一次查看或许愿会把次数清零，奖池游标不动。
   */
  wishDay?: number;
  /** 奖池游标。不填为 0。成功许愿后 +1，创角回到 0。失败不前进。 */
  wishCursor?: number;
  /** 今日已派出招待的次数。不填为 0。超过每日上限时按上限计。 */
  cafeUsed?: number;
  /**
   * 招待次数所属的开服天。不填则跟当前 openDay 对齐。
   * 和 openDay 不一致时，下一次查看、派出或领取会把次数清零。未领取的招待留下。
   */
  cafeDay?: number;
  /**
   * 还没领取的招待英雄 id。不认识的 id 会丢掉。超过 2 人时只留前 2 个。
   * 不填表示没有派出。创角清掉。
   */
  cafeHeroIds?: number[];
  /** 已经领取的升级有礼门槛，例如 5、10、15。不认识的数字会丢掉。 */
  giftLevelClaimed?: number[];
  /**
   * 今日每日礼包是否已买。不填为 false。
   * 和 giftDailyDay 不是当前开服天时，下一次查看或购买会清掉，背包里已经买到的不收回。
   */
  giftDailyBought?: boolean;
  /** 每日礼包所属的开服天。不填则跟当前 openDay 对齐。 */
  giftDailyDay?: number;
  /** 首充是否已经用「模拟充值」完成。不填为 false。创角清掉。 */
  firstChargeDone?: boolean;
  /** 模拟累充金额。首充和累充页的模拟充值都加在这里。不填为 0。每日礼包不加。 */
  totalRecharge?: number;
  /** 已经领取的累充门槛，例如 6、30、68。不认识的数字会丢掉。 */
  giftAccClaimed?: number[];
  /**
   * 今日各兑换已兑次数。id 是兑换项 id，不是道具 id。
   * 不认识的 id 忽略。超过限购时按限购计。
   */
  limitedExBought?: { id: number; count: number }[];
  /**
   * 兑换次数所属的开服天。不填则跟当前 openDay 对齐。
   * 和 openDay 不一致时，下一次查看或兑换会把次数清零，已经换到的不收回。
   */
  limitedExDay?: number;
  /** 今日已点石次数。不填为 0。超过每日上限时按上限计。第一次免费。 */
  limitedStoneUsed?: number;
  /**
   * 点石次数所属的开服天。不填则跟当前 openDay 对齐。
   * 和 openDay 不一致时，下一次查看或点石会把次数清零。
   */
  limitedStoneDay?: number;
  /** 已经购买的限时礼包 id。不认识的数字会丢掉。不随开服天补货。 */
  limitedPackBought?: number[];
}

/** 新号起步钱包。主线胜利的奖励 id 1 加金币，id 2 加钻石。 */
export const MOCK_STARTER_GOLD = 100;
export const MOCK_STARTER_DIAMOND = 20;

/**
 * 进程内假服。不听端口。
 * C1 登录/创角、主线连打、挂机领取、英雄升级、召唤、背包使用、邮件领取、铁匠铺强化、竞技场挑战、幻境之塔、日常金币副本、七日登录、七日目标、基础商店、低级许愿池、咖啡馆招待、礼包骨架和限时活动都改这里的状态，编辑器预览不用另起进程。
 */
export class MockGameSession {
  openDay = 1;
  account = "";
  token = "mock-token";
  serverId = 1;
  role: MockRoleState = { roleId: 1001, name: "MockHero", level: 1 };
  /**
   * 默认角色属于账号 mock。
   * 已登录且账号对不上时，role.enter 报没有角色，但不清掉这份数据。
   * 创角成功后改归当前登录账号。
   */
  roleAccount = "mock";
  hasRole = true;
  /** 下一关。 */
  stageId = 1;
  clearedStage = 0;
  gold = MOCK_STARTER_GOLD;
  diamond = MOCK_STARTER_DIAMOND;
  battleSeq = 0;
  battleId = "";
  /**
   * 挂机起算。领取、创角会拨到当前时刻。
   * 断线重连不新建会话，所以不会把已累计的时间清掉。
   */
  idleAnchorMs = 0;
  /** 道具 id → 数量。顶栏不显示。挂机页写强化石，背包页列出全部。 */
  itemCounts: { [id: number]: number } = {};
  /** 为 true 时构造函数不再补起步消耗品。创角会重新发一份。 */
  private itemsSeeded = false;
  /** 邮箱。领取改钱包和背包，不改进度。 */
  mails: StoredMail[] = [];
  /** 为 true 时构造函数不再补起步三封。创角会重新发一份。 */
  private mailsSeeded = false;
  /** 已拥有的英雄。空名册会在构造、创角和读列表时种下起步三名。 */
  heroes: HeroRosterEntry[] = [];
  /** 下一抽出 SUMMON_POOL 的下标。单抽走 1 格，十连走 10 格。不足时不动。 */
  summonCursor = 0;
  /** 竞技场积分。不随主线变化。创角回到 1000。 */
  arenaScore = ARENA_START_SCORE;
  /** 当前 arenaDay 上已经用掉的挑战次数。 */
  arenaUsed = 0;
  /** 次数所属开服天。和 openDay 不同时，下一次竞技场操作清零。 */
  arenaDay = 1;
  private arenaDaySeeded = false;
  /** 幻境之塔下一层。不随主线变化。创角回到 1。 */
  towerFloor = 1;
  /** 当前 towerDay 上已经用掉的挑战次数。 */
  towerUsed = 0;
  /** 次数所属开服天。和 openDay 不同时，下一次塔操作清零。 */
  towerDay = 1;
  private towerDaySeeded = false;
  /** 当前 dailyDay 上已经用掉的金币副本次数。 */
  dailyUsed = 0;
  /** 次数所属开服天。和 openDay 不同时，下一次金币副本操作清零。 */
  dailyDay = 1;
  private dailyDaySeeded = false;
  /**
   * 角色登录天。新号第 1 天。
   * 只由调试加天和创角改它，开服天和主线都不带动它。
   */
  loginDay = 1;
  /** 下标 1 到 7。true 表示这一天已经领过。 */
  private loginClaimed: boolean[] = [false, false, false, false, false, false, false, false];
  /** 成功领取挂机的次数。七日目标读它，不跟挂机起算时刻混。 */
  idleClaimCount = 0;
  /** 七日目标 id → 已领取。 */
  private goalClaimed: { [id: string]: boolean } = {};
  /** 商品 id → 当前 shopDay 上已经购买的次数。 */
  private shopBought: { [id: number]: number } = {};
  /** 已购次数所属开服天。和 openDay 不同时，下一次商店操作清零。 */
  shopDay = 1;
  private shopDaySeeded = false;
  /** 当前 wishDay 上已经用掉的许愿次数。金币、许愿符、钻石共用。 */
  wishUsed = 0;
  /** 次数所属开服天。和 openDay 不同时，下一次许愿操作清零。游标不动。 */
  wishDay = 1;
  private wishDaySeeded = false;
  /** 下一次落到奖池的下标。成功才 +1。创角回到 0。 */
  wishCursor = 0;
  /** 当前 cafeDay 上已经派出的招待次数。领取不额外占次数。 */
  cafeUsed = 0;
  /** 次数所属开服天。和 openDay 不同时，下一次咖啡馆操作把次数清零。未领取的招待留下。 */
  cafeDay = 1;
  private cafeDaySeeded = false;
  /** 还没领取的英雄 id。空表示没有派出。 */
  private cafeServing: number[] = [];
  /** 升级有礼门槛 → 已领取。 */
  private giftLevels: { [level: number]: boolean } = {};
  /** 当前 giftDailyDay 上每日礼包是否已买。 */
  private giftDailyBought = false;
  /** 每日礼包所属开服天。和 openDay 不同时，下一次礼包操作清掉已购。 */
  giftDailyDay = 1;
  private giftDailyDaySeeded = false;
  /** 首充模拟充值是否已经完成。 */
  firstChargeDone = false;
  /** 模拟累充累计。单位是「元」，不是钻石。 */
  totalRecharge = 0;
  /** 累充门槛 → 已领取。 */
  private giftAccClaimed: { [amount: number]: boolean } = {};
  /** 兑换项 id → 当前 limitedExDay 上已经兑换的次数。 */
  private limitedExBought: { [id: number]: number } = {};
  /** 兑换次数所属开服天。和 openDay 不同时，下一次限时兑换操作清零。 */
  limitedExDay = 1;
  private limitedExDaySeeded = false;
  /** 当前 limitedStoneDay 上已经用掉的点石次数。 */
  limitedStoneUsed = 0;
  /** 点石次数所属开服天。和 openDay 不同时，下一次点石操作清零。 */
  limitedStoneDay = 1;
  private limitedStoneDaySeeded = false;
  /** 限时礼包 id → 已购买。不随开服天清掉。 */
  private limitedPacks: { [id: number]: boolean } = {};
  private clock: () => number = () => Date.now();

  constructor(seed?: MockSessionSeed, clock?: () => number) {
    if (typeof clock === "function") this.clock = clock;
    this.idleAnchorMs = this.clock();
    this.applySeed(seed);
    if (!this.arenaDaySeeded) this.arenaDay = this.openDay;
    if (!this.towerDaySeeded) this.towerDay = this.openDay;
    if (!this.dailyDaySeeded) this.dailyDay = this.openDay;
    if (!this.shopDaySeeded) this.shopDay = this.openDay;
    if (!this.wishDaySeeded) this.wishDay = this.openDay;
    if (!this.cafeDaySeeded) this.cafeDay = this.openDay;
    if (!this.giftDailyDaySeeded) this.giftDailyDay = this.openDay;
    if (!this.limitedExDaySeeded) this.limitedExDay = this.openDay;
    if (!this.limitedStoneDaySeeded) this.limitedStoneDay = this.openDay;
    this.ensureHeroes();
    this.ensureStarterGear();
    if (!this.itemsSeeded) this.grantStarterItems();
    if (!this.mailsSeeded) this.grantStarterMails();
  }

  login(data: unknown): LoginResp {
    const body = asRecord(data);
    const account = strField(body, "account") || "mock";
    const serverId = numField(body, "serverId", 1);
    this.account = account;
    this.serverId = serverId;
    this.token = "mock-token";
    return { ok: true, account, token: this.token, serverId };
  }

  roleEnter(): RoleEnterResp {
    if (!this.visibleRole()) {
      return {
        ok: true,
        hasRole: false,
        roleId: 0,
        name: "",
        level: 0,
        openDay: this.openDay,
        stageId: 1,
        gold: 0,
        diamond: 0,
      };
    }
    return {
      ok: true,
      hasRole: true,
      roleId: this.role.roleId,
      name: this.role.name,
      level: this.role.level,
      openDay: this.openDay,
      stageId: this.stageId,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /** 空名字拒绝。成功则改名，并把主线、开服天、钱包、道具、英雄、武器、召唤游标、邮箱、竞技场、幻境之塔、金币副本次数、七日登录、七日目标、商店已购、许愿次数、咖啡馆招待和礼包领取重置到新号。 */
  roleCreate(data: unknown): RoleCreateResp {
    const name = strField(asRecord(data), "name").trim();
    if (!name) {
      return { ok: false, code: ErrorCode.ROLE_NAME_EMPTY, roleId: 0, name: "", level: 0 };
    }
    this.role = { roleId: this.role.roleId || 1001, name, level: 1 };
    this.hasRole = true;
    if (this.account) this.roleAccount = this.account;
    this.clearedStage = 0;
    this.stageId = 1;
    this.gold = MOCK_STARTER_GOLD;
    this.diamond = MOCK_STARTER_DIAMOND;
    this.battleId = "";
    this.itemCounts = {};
    this.grantStarterItems();
    this.heroes = starterRoster();
    this.ensureStarterGear();
    this.summonCursor = 0;
    this.grantStarterMails();
    this.idleAnchorMs = this.clock();
    this.syncDerived(true);
    this.arenaScore = ARENA_START_SCORE;
    this.arenaUsed = 0;
    this.arenaDay = this.openDay;
    this.towerFloor = 1;
    this.towerUsed = 0;
    this.towerDay = this.openDay;
    this.dailyUsed = 0;
    this.dailyDay = this.openDay;
    this.resetLogin7();
    this.resetGoal7();
    this.resetShop();
    this.resetWish();
    this.resetCafe();
    this.resetGift();
    this.resetLimited();
    return { ok: true, roleId: this.role.roleId, name: this.role.name, level: this.role.level };
  }

  stageEnter(data: unknown): StageEnterResp {
    const stageId = numField(asRecord(data), "stageId", 0);
    if (stageId < 1) {
      return { ok: false, code: ErrorCode.STAGE_ID_INVALID, stageId: 0, battleId: "" };
    }
    this.battleSeq += 1;
    this.battleId = "mock-battle-" + stageId + "-" + this.battleSeq;
    return { ok: true, stageId, battleId: this.battleId };
  }

  /**
   * 胜利且关卡高于已通关：推进进度，等级 = 1 + 已通关，开服天至少每 5 关 +1。
   * 允许跳关（调试）。失败停在本关，不改进度。
   */
  stageResult(data: unknown): StageResultResp {
    const body = asRecord(data);
    const stageId = numField(body, "stageId", 0);
    const win = body.win === true;
    if (stageId < 1) {
      return {
        ok: false,
        code: ErrorCode.STAGE_ID_INVALID,
        stageId: 0,
        win: false,
        nextStageId: 0,
        rewards: [],
        openDay: this.openDay,
        level: this.role.level,
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    if (win && stageId > this.clearedStage) {
      this.clearedStage = stageId;
      this.syncDerived(false);
    }
    const nextStageId = win ? this.clearedStage + 1 : stageId;
    if (win) this.stageId = nextStageId;
    const rewards = win ? [{ id: 1, count: STAGE_WIN_GOLD }] : [];
    this.addRewards(rewards);
    this.battleId = "";
    return {
      ok: true,
      stageId,
      win,
      nextStageId,
      rewards,
      openDay: this.openDay,
      level: this.role.level,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 调试：从下一关起连胜推到 target（缺省第 70 关，含本关）。
   * 每一关都走 stageResult 的胜利，所以金币、等级、开服天和一关关打相同。
   * 已经到达则不加金币。不改挂机起算、角色登录天、英雄、召唤和已领记录。
   * 开服天只升不降；竞技场、塔、金币副本的今日次数留到下次进入再按天刷新。
   */
  stagePush(data: unknown): StagePushResp {
    const target = readPushTarget(data);
    if (target === null) return this.pushFail();
    const fromStage = this.clearedStage;
    if (fromStage >= target) {
      return {
        ok: true,
        already: true,
        fromStage,
        clearedStage: fromStage,
        stageId: fromStage,
        win: true,
        nextStageId: this.stageId,
        rewards: [],
        goldGain: 0,
        openDay: this.openDay,
        level: this.role.level,
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    const goldBefore = this.gold;
    for (let stage = fromStage + 1; stage <= target; stage++) {
      this.stageResult({ stageId: stage, win: true });
    }
    const goldGain = this.gold - goldBefore;
    return {
      ok: true,
      already: false,
      fromStage,
      clearedStage: this.clearedStage,
      stageId: this.clearedStage,
      win: true,
      nextStageId: this.stageId,
      rewards: goldGain > 0 ? [{ id: 1, count: goldGain }] : [],
      goldGain,
      openDay: this.openDay,
      level: this.role.level,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /** 只读预览。不改钱包，也不拨动起算时刻。 */
  idleQuery(): IdleQueryResp {
    const view = buildIdleView(elapsedSince(this.clock(), this.idleAnchorMs), this.clearedStage);
    return {
      ok: true,
      elapsedMs: view.elapsedMs,
      capMs: view.capMs,
      capped: view.capped,
      clearedStage: this.clearedStage,
      stageId: this.stageId,
      goldPerMin: view.goldPerMin,
      itemEveryMs: view.itemEveryMs,
      itemId: IDLE_ITEM_ID,
      itemName: IDLE_ITEM_NAME,
      pendingGold: view.pendingGold,
      pendingItem: view.pendingItem,
      pendingRoleExp: view.pendingRoleExp,
      pendingHeroExp: view.pendingHeroExp,
      capGold: view.capGold,
      capItem: view.capItem,
      ownedItem: this.itemCount(IDLE_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 把当前可领的金币、角色经验、英雄经验和强化石计入，然后重新起算。
   * 金币和两种经验来自当前关 reward_base。强化石仍是 Mock 侧节奏。
   * 不满 1 个单位时拒绝，钱包和起算时刻都不动。
   * 主线胜利不调用这里，快速作战也不会把挂机时间清掉。
   */
  idleClaim(): IdleClaimResp {
    const view = buildIdleView(elapsedSince(this.clock(), this.idleAnchorMs), this.clearedStage);
    const owned = this.itemCount(IDLE_ITEM_ID);
    if (view.pendingGold <= 0 && view.pendingItem <= 0 && view.pendingRoleExp <= 0 && view.pendingHeroExp <= 0) {
      return {
        ok: false,
        code: ErrorCode.IDLE_EMPTY,
        rewards: [],
        elapsedMs: view.elapsedMs,
        gold: this.gold,
        diamond: this.diamond,
        ownedItem: owned,
      };
    }
    const rewards: { id: number; count: number; name: string }[] = [];
    if (view.pendingGold > 0) rewards.push({ id: 1, count: view.pendingGold, name: "金币" });
    if (view.pendingItem > 0) rewards.push({ id: IDLE_ITEM_ID, count: view.pendingItem, name: IDLE_ITEM_NAME });
    if (view.pendingRoleExp > 0) rewards.push({ id: IDLE_ROLE_EXP_ID, count: view.pendingRoleExp, name: "角色经验" });
    if (view.pendingHeroExp > 0) rewards.push({ id: IDLE_HERO_EXP_ID, count: view.pendingHeroExp, name: "英雄经验" });
    this.addRewards(rewards);
    if (view.pendingItem > 0) this.addItem(IDLE_ITEM_ID, view.pendingItem);
    if (view.pendingRoleExp > 0) this.addItem(IDLE_ROLE_EXP_ID, view.pendingRoleExp);
    if (view.pendingHeroExp > 0) this.addItem(IDLE_HERO_EXP_ID, view.pendingHeroExp);
    this.idleAnchorMs = this.clock();
    this.idleClaimCount += 1;
    return {
      ok: true,
      rewards,
      elapsedMs: 0,
      gold: this.gold,
      diamond: this.diamond,
      ownedItem: this.itemCount(IDLE_ITEM_ID),
    };
  }

  /** 只读名册。空了会先种下起步英雄。不改钱包。 */
  heroList(): HeroListResp {
    this.ensureHeroes();
    const heroes: HeroListResp["heroes"] = [];
    for (let i = 0; i < this.heroes.length; i++) heroes.push(toHeroCard(this.heroes[i]));
    return { ok: true, heroes, gold: this.gold, diamond: this.diamond };
  }

  /**
   * 升级一名英雄，扣除金币。星级不动。
   * 没有这名英雄、金币不够、或已满级时拒绝，等级和钱包都不变。
   * 不改挂机起算，也不改主线进度。
   */
  heroUpgrade(data: unknown): HeroUpgradeResp {
    this.ensureHeroes();
    const heroId = Math.floor(numField(asRecord(data), "heroId", 0));
    const hero = this.findHero(heroId);
    if (!hero) {
      return {
        ok: false,
        code: ErrorCode.HERO_NOT_FOUND,
        heroId,
        hero: null,
        cost: 0,
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    const current = toHeroCard(hero);
    if (hero.level >= HERO_MAX_LEVEL) {
      return {
        ok: false,
        code: ErrorCode.HERO_LEVEL_MAX,
        heroId,
        hero: current,
        cost: 0,
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    const cost = upgradeCost(hero.level);
    if (this.gold < cost) {
      return {
        ok: false,
        code: ErrorCode.HERO_GOLD_SHORT,
        heroId,
        hero: current,
        cost: 0,
        needGold: cost,
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    this.gold -= cost;
    hero.level += 1;
    return {
      ok: true,
      heroId,
      hero: toHeroCard(hero),
      cost,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 只读铁匠铺。空名册会先种下起步英雄。
   * 还没有武器的英雄补一把 Lv1 新手短剑，不扣金币，也不扣强化石。
   */
  smithView(): SmithViewResp {
    this.ensureHeroes();
    this.ensureStarterGear();
    const gears: SmithViewResp["gears"] = [];
    for (let i = 0; i < this.heroes.length; i++) gears.push(toSmithGear(this.heroes[i]));
    const lead = this.heroes.length > 0 ? this.heroes[0].id : 0;
    return {
      ok: true,
      leadId: lead,
      gears,
      stoneOwned: this.itemCount(IDLE_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 把指定英雄的新手短剑强化 1 级。
   * 消耗金币和 1 个强化石。还没有武器时先免费补成 Lv1，再按这一级的花费往上强化。
   * 没有这名英雄、金币不够、强化石不够、或已满级时拒绝：不扣金币和强化石，也不提升等级。
   * 补武器本身不收费，所以失败时 Lv0 会变成 Lv1，已经有的等级保持原样。
   * 不改英雄等级、星级、钻石、挂机起算和主线进度。
   */
  smithStrengthen(data: unknown): SmithStrengthenResp {
    this.ensureHeroes();
    this.ensureStarterGear();
    const heroId = Math.floor(numField(asRecord(data), "heroId", 0));
    const hero = this.findHero(heroId);
    if (!hero) return this.smithFail(heroId, ErrorCode.HERO_NOT_FOUND);
    const level = clampWeaponLevel(hero.weaponLevel);
    if (level >= WEAPON_MAX_LEVEL) return this.smithFail(heroId, ErrorCode.SMITH_LEVEL_MAX);
    const goldCost = strengthenGoldCost(level);
    const stoneCost = STRENGTHEN_STONE_COST;
    if (this.gold < goldCost) return this.smithFail(heroId, ErrorCode.SMITH_GOLD_SHORT, { needGold: goldCost });
    const ownedStone = this.itemCount(IDLE_ITEM_ID);
    if (ownedStone < stoneCost) return this.smithFail(heroId, ErrorCode.SMITH_STONE_SHORT, { needStone: stoneCost });
    this.gold -= goldCost;
    this.spendItem(IDLE_ITEM_ID, stoneCost);
    hero.weaponLevel = level + 1;
    return {
      ok: true,
      heroId,
      gear: toSmithGear(hero),
      goldCost,
      stoneCost,
      stoneOwned: this.itemCount(IDLE_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 只读竞技场。按当前开服天刷新今日次数，不改积分和钱包。
   * 对手是固定名单。入口等级锁在客户端，这里不重复判断主线等级。
   */
  arenaView(): ArenaViewResp {
    this.ensureHeroes();
    this.refreshArenaDay();
    return {
      ok: true,
      score: this.arenaScore,
      rank: rankFromScore(this.arenaScore),
      power: rosterPower(this.heroes),
      used: this.arenaUsed,
      limit: ARENA_DAILY_LIMIT,
      opponents: listArenaOpponents(),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 挑战一名固定对手，一键结算。战力不低于对手则胜。
   * 胜利加积分和金币，失败只扣积分。胜负都占用 1 次今日次数。
   * 没有这位对手或次数用完时拒绝，积分、金币和次数都不变。
   * 不改英雄、武器、钻石、挂机起算和主线进度。
   */
  arenaChallenge(data: unknown): ArenaChallengeResp {
    this.ensureHeroes();
    this.refreshArenaDay();
    const opponentId = Math.floor(numField(asRecord(data), "opponentId", 0));
    const opponent = findArenaOpponent(opponentId);
    if (!opponent) return this.arenaFail(opponentId, "", ErrorCode.ARENA_NOT_FOUND);
    if (this.arenaUsed >= ARENA_DAILY_LIMIT) {
      return this.arenaFail(opponentId, opponent.name, ErrorCode.ARENA_NO_CHANCE);
    }
    const playerPower = rosterPower(this.heroes);
    const settled = settleArena(playerPower, opponent.power, this.arenaScore);
    this.arenaScore = settled.score;
    if (settled.goldGain > 0) this.gold += settled.goldGain;
    this.arenaUsed += 1;
    return {
      ok: true,
      opponentId,
      opponentName: opponent.name,
      win: settled.win,
      playerPower,
      opponentPower: opponent.power,
      scoreBefore: settled.scoreBefore,
      score: settled.score,
      scoreDelta: settled.scoreDelta,
      rank: settled.rank,
      goldGain: settled.goldGain,
      gold: this.gold,
      diamond: this.diamond,
      used: this.arenaUsed,
      limit: ARENA_DAILY_LIMIT,
    };
  }

  /**
   * 只读幻境之塔。按当前开服天刷新今日次数，不改层数和钱包。
   * 入口等级锁在客户端，这里不重复判断主线等级，也不看开服天。
   */
  towerView(): TowerViewResp {
    this.ensureHeroes();
    this.refreshTowerDay();
    const floor = this.towerFloor;
    const cleared = towerCleared(floor);
    return {
      ok: true,
      floor,
      maxFloor: TOWER_MAX_FLOOR,
      cleared,
      name: floorGuardianName(floor),
      floorPower: floorPower(floor),
      playerPower: rosterPower(this.heroes),
      used: this.towerUsed,
      limit: TOWER_DAILY_LIMIT,
      stoneOwned: this.itemCount(TOWER_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 挑战当前层，一键结算。战力不低于守关则胜。
   * 胜利层数 +1，加金币和 1 个强化石。失败层数不变，不发奖励。胜负都占用 1 次今日次数。
   * 已到塔顶或次数用完时拒绝，层数、金币、道具和次数都不变。
   * 不改英雄、武器、钻石、挂机起算、主线进度和竞技场。
   */
  towerChallenge(): TowerChallengeResp {
    this.ensureHeroes();
    this.refreshTowerDay();
    if (towerCleared(this.towerFloor)) return this.towerFail(ErrorCode.TOWER_CLEARED);
    if (this.towerUsed >= TOWER_DAILY_LIMIT) return this.towerFail(ErrorCode.TOWER_NO_CHANCE);
    const playerPower = rosterPower(this.heroes);
    const settled = settleTower(playerPower, this.towerFloor);
    if (settled.win) {
      this.towerFloor = settled.nextFloor;
      if (settled.goldGain > 0) this.gold += settled.goldGain;
      if (settled.itemGain > 0) this.addItem(TOWER_ITEM_ID, settled.itemGain);
    }
    this.towerUsed += 1;
    return {
      ok: true,
      floor: settled.floor,
      nextFloor: this.towerFloor,
      name: floorGuardianName(settled.floor),
      win: settled.win,
      playerPower,
      floorPower: settled.floorPower,
      goldGain: settled.goldGain,
      itemId: TOWER_ITEM_ID,
      itemName: TOWER_ITEM_NAME,
      itemGain: settled.itemGain,
      stoneOwned: this.itemCount(TOWER_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
      used: this.towerUsed,
      limit: TOWER_DAILY_LIMIT,
    };
  }

  /**
   * 只读金币副本。按当前开服天刷新今日次数，不改钱包。
   * 入口等级锁在客户端，这里不重复判断主线等级。只返回金币难度。
   */
  dailyView(): DailyViewResp {
    this.ensureHeroes();
    this.refreshDailyDay();
    return {
      ok: true,
      kind: DAILY_GOLD_KIND,
      used: this.dailyUsed,
      limit: DAILY_GOLD_LIMIT,
      playerPower: rosterPower(this.heroes),
      tiers: listDailyTiers(),
      stoneOwned: this.itemCount(DAILY_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 挑战一档金币难度，一键结算。战力不低于建议值则胜。
   * 胜利加该档金币；普通和困难再加强化石。失败不发奖励。胜负都占用 1 次今日次数。
   * 没有这个难度或次数用完时拒绝，金币、道具和次数都不变。
   * 不改英雄、武器、钻石、挂机起算、主线、竞技场和幻境之塔。
   */
  dailyChallenge(data: unknown): DailyChallengeResp {
    this.ensureHeroes();
    this.refreshDailyDay();
    const tierId = Math.floor(numField(asRecord(data), "tierId", 0));
    const tier = findDailyTier(tierId);
    if (!tier) return this.dailyFail(tierId, "", ErrorCode.DAILY_NOT_FOUND);
    if (this.dailyUsed >= DAILY_GOLD_LIMIT) return this.dailyFail(tierId, tier.name, ErrorCode.DAILY_NO_CHANCE);
    const playerPower = rosterPower(this.heroes);
    const settled = settleDailyGold(playerPower, tier);
    if (settled.goldGain > 0) this.gold += settled.goldGain;
    if (settled.itemGain > 0) this.addItem(DAILY_ITEM_ID, settled.itemGain);
    this.dailyUsed += 1;
    return {
      ok: true,
      tierId,
      name: tier.name,
      win: settled.win,
      playerPower,
      needPower: tier.power,
      goldGain: settled.goldGain,
      itemId: DAILY_ITEM_ID,
      itemName: DAILY_ITEM_NAME,
      itemGain: settled.itemGain,
      stoneOwned: this.itemCount(DAILY_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
      used: this.dailyUsed,
      limit: DAILY_GOLD_LIMIT,
    };
  }

  /**
   * 只读基础商店。按当前开服天刷新今日限购，不改钱包和背包。
   * 样例 opencondition 没有商店，这里不判断主线等级。
   */
  shopView(): ShopViewResp {
    this.refreshShopDay();
    return {
      ok: true,
      skus: listShopSkus(
        (id) => this.shopBoughtCount(id),
        (itemId) => this.itemCount(itemId)
      ),
      openDay: this.openDay,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 买一件商品。金币商品扣金币，钻石商品扣钻石，道具写入背包。
   * 没有这个商品、今日已达限购、货币不足时拒绝，钱包、背包和已购次数都不变。
   * 不改英雄、武器、挂机、主线、召唤和各玩法次数。
   */
  shopBuy(data: unknown): ShopBuyResp {
    this.refreshShopDay();
    const id = Math.floor(numField(asRecord(data), "id", 0));
    const offer = findShopOffer(id);
    if (!offer) return this.shopFail(id, ErrorCode.SHOP_NOT_FOUND);
    const bought = this.shopBoughtCount(id);
    if (offer.limit > 0 && bought >= offer.limit) return this.shopFail(id, ErrorCode.SHOP_SOLD_OUT);
    if (offer.currency === "gold" && this.gold < offer.price) return this.shopFail(id, ErrorCode.SHOP_GOLD_SHORT);
    if (offer.currency === "diamond" && this.diamond < offer.price) return this.shopFail(id, ErrorCode.SHOP_DIAMOND_SHORT);
    if (offer.currency === "gold") this.gold -= offer.price;
    else this.diamond -= offer.price;
    this.addItem(offer.itemId, offer.count);
    this.shopBought[id] = bought + 1;
    return {
      ok: true,
      id,
      name: offer.name,
      itemId: offer.itemId,
      count: offer.count,
      currency: offer.currency,
      price: offer.price,
      bought: bought + 1,
      limit: offer.limit,
      owned: this.itemCount(offer.itemId),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 只读低级许愿池。按当前开服天刷新今日次数，不改钱包、背包和奖池游标。
   * 入口仍由客户端 opencondition 的 main_blessingpool（主线 Lv10）上锁，这里不判断等级。
   */
  wishView(): WishViewResp {
    this.refreshWishDay();
    return this.wishSnapshot();
  }

  /**
   * 许愿一次。pay 为 gold、item 或 diamond。
   * 金币扣金币，许愿符扣背包，钻石扣钻石，然后按游标发一格奖励。
   * 方式不对、今日次数用完、货币或许愿符不足时拒绝，钱包、背包、次数和游标都不变。
   * 不改英雄、武器、挂机、主线、召唤、商店和其它玩法次数。
   */
  wishDraw(data: unknown): WishDrawResp {
    this.refreshWishDay();
    const pay = parseWishPay(strField(asRecord(data), "pay"));
    if (!pay) return this.wishFail("", ErrorCode.WISH_PAY_INVALID);
    if (this.wishUsed >= WISH_DAILY_LIMIT) return this.wishFail(pay, ErrorCode.WISH_NO_CHANCE);
    const cost = wishCost(pay);
    if (pay === "gold" && this.gold < cost) return this.wishFail(pay, ErrorCode.WISH_GOLD_SHORT);
    if (pay === "diamond" && this.diamond < cost) return this.wishFail(pay, ErrorCode.WISH_DIAMOND_SHORT);
    if (pay === "item" && this.itemCount(ITEM_WISH_TOKEN) < cost) return this.wishFail(pay, ErrorCode.WISH_ITEM_SHORT);
    if (pay === "gold") this.gold -= cost;
    else if (pay === "diamond") this.diamond -= cost;
    else this.spendItem(ITEM_WISH_TOKEN, cost);
    const drop = dropAt(this.wishCursor);
    let goldGain = 0;
    let diamondGain = 0;
    let itemGain = 0;
    if (drop.kind === "gold") {
      goldGain = drop.count;
      this.gold += goldGain;
    } else if (drop.kind === "diamond") {
      diamondGain = drop.count;
      this.diamond += diamondGain;
    } else if (drop.itemId > 0 && drop.count > 0) {
      itemGain = drop.count;
      this.addItem(drop.itemId, itemGain);
    }
    this.wishCursor += 1;
    this.wishUsed += 1;
    return {
      ok: true,
      pay,
      cost,
      kind: drop.kind,
      name: drop.name,
      count: drop.count,
      goldGain,
      diamondGain,
      itemId: itemGain > 0 ? drop.itemId : 0,
      itemGain,
      tokenOwned: this.itemCount(ITEM_WISH_TOKEN),
      gold: this.gold,
      diamond: this.diamond,
      used: this.wishUsed,
      limit: WISH_DAILY_LIMIT,
      cursor: this.wishCursor,
    };
  }

  /**
   * 只读咖啡馆。按当前开服天刷新今日次数，不改钱包、背包和未领取的招待。
   * 入口仍由客户端 opencondition 的 main_cafe（主线 Lv12）上锁，这里不判断等级。
   */
  cafeView(): CafeViewResp {
    this.prepareCafe();
    return this.cafeSnapshot();
  }

  /**
   * 派出 1 到 2 名英雄招待。MVP 立刻可领，不扣金币。
   * 没选、超过 2 人、重复、名册没有、已经派出还没领、今日次数用完时拒绝。
   * 失败不改次数、钱包和背包。成功只占 1 次，奖励在 cafeClaim。
   * 不改英雄等级、武器、挂机、主线、召唤、商店、许愿和其它玩法次数。
   */
  cafeSend(data: unknown): CafeSendResp {
    this.prepareCafe();
    if (this.cafeServing.length > 0) return this.cafeSendFail(ErrorCode.CAFE_BUSY);
    const read = readCafeHeroIds(asRecord(data).heroIds);
    if (read.problem === "empty") return this.cafeSendFail(ErrorCode.CAFE_NO_HERO);
    if (read.problem === "bad") return this.cafeSendFail(ErrorCode.CAFE_HERO_MISSING);
    if (read.ids.length > CAFE_MAX_HEROES) return this.cafeSendFail(ErrorCode.CAFE_TOO_MANY);
    if (cafeHasDuplicate(read.ids)) return this.cafeSendFail(ErrorCode.CAFE_DUPLICATE);
    for (let i = 0; i < read.ids.length; i++) {
      if (!this.findHero(read.ids[i])) return this.cafeSendFail(ErrorCode.CAFE_HERO_MISSING);
    }
    if (this.cafeUsed >= CAFE_DAILY_LIMIT) return this.cafeSendFail(ErrorCode.CAFE_NO_CHANCE);
    this.cafeServing = read.ids.slice();
    this.cafeUsed += 1;
    const reward = cafeReward(this.cafeServing.length);
    return {
      ok: true,
      heroIds: this.cafeServing.slice(),
      names: this.cafeNames(this.cafeServing),
      goldPreview: reward.gold,
      beanPreview: reward.beans,
      used: this.cafeUsed,
      limit: CAFE_DAILY_LIMIT,
      ready: true,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 领取当前招待。金币进钱包，咖啡豆进背包，然后清掉派出。
   * 没有派出时拒绝，钱包和背包不动，次数不退。
   * 不改英雄等级、主线和其它玩法次数。
   */
  cafeClaim(): CafeClaimResp {
    this.prepareCafe();
    if (this.cafeServing.length === 0) return this.cafeClaimFail(ErrorCode.CAFE_NOTHING);
    const names = this.cafeNames(this.cafeServing);
    const reward = cafeReward(this.cafeServing.length);
    this.gold += reward.gold;
    if (reward.beans > 0) this.addItem(CAFE_BEAN_ITEM_ID, reward.beans);
    this.cafeServing = [];
    return {
      ok: true,
      names,
      goldGain: reward.gold,
      itemId: reward.beans > 0 ? CAFE_BEAN_ITEM_ID : 0,
      itemName: CAFE_BEAN_NAME,
      itemGain: reward.beans,
      beanOwned: this.itemCount(CAFE_BEAN_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
      used: this.cafeUsed,
      limit: CAFE_DAILY_LIMIT,
    };
  }

  /**
   * 只读礼包。按当前开服天刷新每日礼包，不改钱包、背包、首充和累充。
   * 入口不设等级锁。升级有礼看主线等级。
   */
  giftView(): GiftViewResp {
    this.refreshGiftDay();
    return this.giftSnapshot();
  }

  /**
   * 领取一档升级有礼。主线等级达到门槛且还没领过才能领。
   * 没有这一档、等级不够、已经领过都拒绝，钱包和背包不动。
   * 不改主线、英雄、每日礼包、首充和累充。
   */
  giftClaimLevel(data: unknown): GiftClaimLevelResp {
    this.refreshGiftDay();
    const level = Math.floor(numField(asRecord(data), "level", 0));
    const bundle = findGiftLevel(level);
    if (!bundle) return this.giftLevelFail(level, "", ErrorCode.GIFT_LEVEL_NOT_FOUND);
    const claimed = this.giftLevels[level] === true;
    if (claimed) return this.giftLevelFail(level, "claimed", ErrorCode.GIFT_LEVEL_CLAIMED);
    if (this.role.level < level) return this.giftLevelFail(level, "locked", ErrorCode.GIFT_LEVEL_LOCKED);
    this.grantGiftBundle(bundle);
    this.giftLevels[level] = true;
    return {
      ok: true,
      level,
      state: "claimed",
      goldGain: bundle.gold,
      diamondGain: bundle.diamond,
      itemId: bundle.itemCount > 0 ? bundle.itemId : 0,
      itemName: bundle.itemName,
      itemGain: bundle.itemCount,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 买今日礼包。花钻石，金币和道具进账，一天一次。
   * 今天买过或钻石不够时拒绝，钱包、背包和已购标记都不变。
   * 不计入累充，也不改首充。开服天变化后可以再买。
   */
  giftBuyDaily(): GiftBuyDailyResp {
    this.refreshGiftDay();
    if (this.giftDailyBought) return this.giftDailyFail(ErrorCode.GIFT_DAILY_BOUGHT);
    if (this.diamond < GIFT_DAILY_PRICE) return this.giftDailyFail(ErrorCode.GIFT_DAILY_SHORT);
    this.diamond -= GIFT_DAILY_PRICE;
    this.gold += GIFT_DAILY_GOLD;
    if (GIFT_DAILY_ITEM_COUNT > 0) this.addItem(GIFT_DAILY_ITEM_ID, GIFT_DAILY_ITEM_COUNT);
    this.giftDailyBought = true;
    return {
      ok: true,
      price: GIFT_DAILY_PRICE,
      bought: true,
      goldGain: GIFT_DAILY_GOLD,
      itemId: GIFT_DAILY_ITEM_ID,
      itemName: GIFT_DAILY_ITEM_NAME,
      itemGain: GIFT_DAILY_ITEM_COUNT,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 模拟充值。kind 为 first 时只完成一次首充：发钻石和道具，累充加上首充金额，并记下 firstChargeDone。
   * kind 为 acc 时每次都加上一笔累充，并另发钻石，不重复发首充礼包。
   * 首充已经完成、或方式不对时拒绝，累充、钱包和背包不动。
   * 不改主线、每日礼包和各玩法次数。不是真实支付。
   */
  giftRecharge(data: unknown): GiftRechargeResp {
    this.refreshGiftDay();
    const kind = parseGiftRecharge(strField(asRecord(data), "kind"));
    if (!kind) return this.giftRechargeFail("", ErrorCode.GIFT_RECHARGE_INVALID);
    if (kind === "first") {
      if (this.firstChargeDone) return this.giftRechargeFail(kind, ErrorCode.GIFT_FIRST_DONE);
      this.firstChargeDone = true;
      this.totalRecharge += GIFT_FIRST_AMOUNT;
      this.diamond += GIFT_FIRST_DIAMOND;
      if (GIFT_FIRST_ITEM_COUNT > 0) this.addItem(GIFT_FIRST_ITEM_ID, GIFT_FIRST_ITEM_COUNT);
      return {
        ok: true,
        kind,
        added: GIFT_FIRST_AMOUNT,
        firstChargeDone: true,
        firstGranted: true,
        diamondGain: GIFT_FIRST_DIAMOND,
        itemId: GIFT_FIRST_ITEM_ID,
        itemName: GIFT_FIRST_ITEM_NAME,
        itemGain: GIFT_FIRST_ITEM_COUNT,
        totalRecharge: this.totalRecharge,
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    this.totalRecharge += GIFT_RECHARGE_STEP;
    this.diamond += GIFT_RECHARGE_DIAMOND;
    return {
      ok: true,
      kind,
      added: GIFT_RECHARGE_STEP,
      firstChargeDone: this.firstChargeDone,
      firstGranted: false,
      diamondGain: GIFT_RECHARGE_DIAMOND,
      itemId: 0,
      itemName: "",
      itemGain: 0,
      totalRecharge: this.totalRecharge,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 领取一档累充。累计金额达到门槛且还没领过才能领。
   * 没有这一档、金额不够、已经领过都拒绝，钱包、背包和累充金额不动。
   */
  giftClaimAcc(data: unknown): GiftClaimAccResp {
    this.refreshGiftDay();
    const amount = Math.floor(numField(asRecord(data), "amount", 0));
    const bundle = findGiftAcc(amount);
    if (!bundle) return this.giftAccFail(amount, "", ErrorCode.GIFT_ACC_NOT_FOUND);
    const claimed = this.giftAccClaimed[amount] === true;
    if (claimed) return this.giftAccFail(amount, "claimed", ErrorCode.GIFT_ACC_CLAIMED);
    if (this.totalRecharge < amount) return this.giftAccFail(amount, "locked", ErrorCode.GIFT_ACC_LOCKED);
    this.grantGiftBundle(bundle);
    this.giftAccClaimed[amount] = true;
    return {
      ok: true,
      amount,
      state: "claimed",
      goldGain: bundle.gold,
      diamondGain: bundle.diamond,
      itemId: bundle.itemCount > 0 ? bundle.itemId : 0,
      itemName: bundle.itemName,
      itemGain: bundle.itemCount,
      totalRecharge: this.totalRecharge,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 只读限时活动。按当前开服天刷新兑换和点石次数，不改钱包和已购礼包。
   * 入口不设等级锁。限时礼包是否结束只看开服天。
   */
  limitedView(): LimitedViewResp {
    this.refreshLimitedDay();
    return this.limitedSnapshot();
  }

  /**
   * 兑换一次。材料兑换扣背包，金币兑换扣金币，奖励进背包。
   * 没有这项、今日已兑完、材料或金币不足时拒绝，钱包、背包和次数都不变。
   * 不改点石次数、限时礼包、礼包骨架和各玩法次数。
   */
  limitedExchange(data: unknown): LimitedExchangeResp {
    this.refreshLimitedDay();
    const id = Math.floor(numField(asRecord(data), "id", 0));
    const offer = findLimitedOffer(id);
    if (!offer) return this.limitedExchangeFail(id, ErrorCode.LIMITED_EX_NOT_FOUND);
    const bought = this.limitedExCount(id);
    if (offer.limit > 0 && bought >= offer.limit) return this.limitedExchangeFail(id, ErrorCode.LIMITED_EX_SOLD_OUT);
    if (offer.pay === "gold" && this.gold < offer.costCount) return this.limitedExchangeFail(id, ErrorCode.LIMITED_EX_GOLD_SHORT);
    if (offer.pay === "item" && this.itemCount(offer.costItemId) < offer.costCount) {
      return this.limitedExchangeFail(id, ErrorCode.LIMITED_EX_ITEM_SHORT);
    }
    if (offer.pay === "gold") this.gold -= offer.costCount;
    else this.spendItem(offer.costItemId, offer.costCount);
    this.addItem(offer.rewardItemId, offer.rewardCount);
    this.limitedExBought[id] = bought + 1;
    return {
      ok: true,
      id,
      pay: offer.pay,
      costName: offer.costName,
      costCount: offer.costCount,
      rewardName: offer.rewardName,
      rewardItemId: offer.rewardItemId,
      rewardCount: offer.rewardCount,
      bought: bought + 1,
      limit: offer.limit,
      owned: offer.pay === "item" ? this.itemCount(offer.costItemId) : 0,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 点石一次。今日第一次不扣钻石，之后按固定汇率扣钻石换金币。
   * 次数用完或钻石不够时拒绝，钱包和次数不变。
   * 不改兑换次数、限时礼包和各玩法。
   */
  limitedAlchemy(): LimitedAlchemyResp {
    this.refreshLimitedDay();
    if (this.limitedStoneUsed >= LIMITED_STONE_LIMIT) return this.limitedAlchemyFail(ErrorCode.LIMITED_STONE_NO_CHANCE);
    const free = limitedStoneFree(this.limitedStoneUsed);
    const cost = limitedStoneCost(this.limitedStoneUsed);
    if (!free && this.diamond < cost) return this.limitedAlchemyFail(ErrorCode.LIMITED_STONE_SHORT);
    if (cost > 0) this.diamond -= cost;
    this.gold += LIMITED_STONE_GOLD;
    this.limitedStoneUsed += 1;
    return {
      ok: true,
      free,
      cost,
      goldGain: LIMITED_STONE_GOLD,
      used: this.limitedStoneUsed,
      limit: LIMITED_STONE_LIMIT,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 买一个限时礼包。库存 1。钻石礼包扣钻石，模拟购买不扣。
   * 买过、本轮已结束、钻石不够、没有这个 id 都拒绝，钱包和已购记录不变。
   * 已经买过的优先于已结束。不改兑换、点石、礼包骨架和累充。
   */
  limitedBuy(data: unknown): LimitedBuyResp {
    this.refreshLimitedDay();
    const id = Math.floor(numField(asRecord(data), "id", 0));
    const pack = findLimitedPack(id);
    if (!pack) return this.limitedBuyFail(id, ErrorCode.LIMITED_PACK_NOT_FOUND);
    if (this.limitedPacks[id] === true) return this.limitedBuyFail(id, ErrorCode.LIMITED_PACK_BOUGHT);
    if (limitedPackEnded(this.openDay, pack.openThrough)) return this.limitedBuyFail(id, ErrorCode.LIMITED_PACK_ENDED);
    if (pack.pay === "diamond" && this.diamond < pack.price) return this.limitedBuyFail(id, ErrorCode.LIMITED_PACK_SHORT);
    if (pack.pay === "diamond" && pack.price > 0) this.diamond -= pack.price;
    if (pack.gold > 0) this.gold += pack.gold;
    if (pack.diamond > 0) this.diamond += pack.diamond;
    if (pack.itemCount > 0) this.addItem(pack.itemId, pack.itemCount);
    this.limitedPacks[id] = true;
    return {
      ok: true,
      id,
      name: pack.name,
      pay: pack.pay,
      price: pack.price,
      goldGain: pack.gold,
      diamondGain: pack.diamond,
      itemId: pack.itemCount > 0 ? pack.itemId : 0,
      itemName: pack.itemName,
      itemGain: pack.itemCount,
      bought: true,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 只读七日登录。按角色登录天列出七格，不改钱包，也不改开服天。
   * 新号第 1 天可领。入口不设等级锁。
   */
  login7View(): Login7ViewResp {
    return {
      ok: true,
      loginDay: this.loginDay,
      openDay: this.openDay,
      days: listLogin7Days(this.loginDay, (day) => this.loginClaimed[day] === true),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 领取某一登录天。已到达且未领才能领，包括今天之前没领的。
   * 未来天、已经领过、没有这一天都拒绝，钱包和背包不动。
   * 金币钻石进钱包，其它道具进背包。不改开服天、主线、英雄和各玩法次数。
   */
  login7Claim(data: unknown): Login7ClaimResp {
    const day = Math.floor(numField(asRecord(data), "day", 0));
    const rewards = findLogin7Rewards(day);
    if (!rewards) return this.login7Fail(day, ErrorCode.LOGIN7_NOT_FOUND);
    if (day >= 1 && day <= LOGIN7_DAYS && this.loginClaimed[day]) {
      return this.login7Fail(day, ErrorCode.LOGIN7_CLAIMED);
    }
    if (day > this.loginDay) return this.login7Fail(day, ErrorCode.LOGIN7_LOCKED);
    const grant = tallyLogin7(rewards);
    this.gold += grant.gold;
    this.diamond += grant.diamond;
    for (let i = 0; i < grant.items.length; i++) {
      this.addItem(grant.items[i].id, grant.items[i].count);
    }
    if (day >= 1 && day <= LOGIN7_DAYS) this.loginClaimed[day] = true;
    return {
      ok: true,
      day,
      rewards,
      goldGain: grant.gold,
      diamondGain: grant.diamond,
      gold: this.gold,
      diamond: this.diamond,
      loginDay: this.loginDay,
    };
  }

  /**
   * 调试：角色登录天 +1，最多到第 7 天。
   * 不改开服天，不自动领取，也不动钱包。
   */
  /**
   * 只读七日目标。按当前通关、召唤、升级和挂机领取列出任务，不改钱包。
   * 第 70 关在通关数到 70 之前是未开启。天数只分组。
   */
  goal7View(): Goal7ViewResp {
    this.ensureHeroes();
    const progress = this.goal7Progress();
    return {
      ok: true,
      clearedStage: this.clearedStage,
      tasks: listGoal7Tasks(progress, (id) => this.goalClaimed[id] === true),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 领取一个已完成且未领的目标。
   * 未开启、还没完成、已经领过、没有这个 id 都拒绝，钱包和背包不动。
   * 金币钻石进钱包，其它道具进背包。不改主线、英雄、召唤、挂机次数和七日登录。
   */
  goal7Claim(data: unknown): Goal7ClaimResp {
    this.ensureHeroes();
    const id = strField(asRecord(data), "id").trim();
    const def = findGoal7Task(id);
    if (!def) return this.goal7Fail(id, "", "in-progress", 0, 0, ErrorCode.GOAL7_NOT_FOUND);
    const progress = this.goal7Progress();
    const current = goal7Current(def, progress);
    const state = goal7State(def, progress, this.goalClaimed[def.id] === true);
    if (state === "claimed") return this.goal7Fail(def.id, def.title, state, current, def.target, ErrorCode.GOAL7_CLAIMED);
    if (state === "locked") return this.goal7Fail(def.id, def.title, state, current, def.target, ErrorCode.GOAL7_LOCKED);
    if (state !== "claimable") {
      return this.goal7Fail(def.id, def.title, state, current, def.target, ErrorCode.GOAL7_INCOMPLETE);
    }
    const grant = tallyGoal7(def.rewards);
    this.gold += grant.gold;
    this.diamond += grant.diamond;
    for (let i = 0; i < grant.items.length; i++) {
      this.addItem(grant.items[i].id, grant.items[i].count);
    }
    this.goalClaimed[def.id] = true;
    return {
      ok: true,
      id: def.id,
      title: def.title,
      state: "claimed",
      current,
      target: def.target,
      rewards: copyGoal7Rewards(def.rewards),
      goldGain: grant.gold,
      diamondGain: grant.diamond,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  login7Advance(): Login7AdvanceResp {
    if (this.loginDay >= LOGIN7_DAYS) {
      return {
        ok: false,
        loginDay: this.loginDay,
        advanced: false,
        openDay: this.openDay,
        code: ErrorCode.LOGIN7_MAX,
      };
    }
    this.loginDay += 1;
    return {
      ok: true,
      loginDay: this.loginDay,
      advanced: true,
      openDay: this.openDay,
    };
  }

  /**
   * 单抽或十连，只扣钻石。
   * 新英雄追加到名册末尾（Lv1，星级按卡池）。已拥有则加碎片，等级和星级不动。
   * 钻石不够或次数不是 1/10 时整次拒绝，游标、名册、钱包都不变。
   * 不改金币、挂机起算和主线进度。
   */
  summon(data: unknown): SummonPullResp {
    this.ensureHeroes();
    const count = Math.floor(numField(asRecord(data), "count", 0));
    if (!isSummonCount(count)) {
      return {
        ok: false,
        code: ErrorCode.SUMMON_COUNT_INVALID,
        count,
        cost: 0,
        drops: [],
        newCount: 0,
        shardCount: 0,
        gold: this.gold,
        diamond: this.diamond,
      };
    }
    const cost = summonCost(count);
    if (this.diamond < cost) {
      return {
        ok: false,
        code: ErrorCode.SUMMON_DIAMOND_SHORT,
        count,
        cost: 0,
        drops: [],
        newCount: 0,
        shardCount: 0,
        gold: this.gold,
        diamond: this.diamond,
        needDiamond: cost,
      };
    }
    this.diamond -= cost;
    const drops: SummonDrop[] = [];
    let newCount = 0;
    let shardCount = 0;
    for (let i = 0; i < count; i++) {
      const candidate = poolAt(this.summonCursor);
      this.summonCursor += 1;
      const shardId = shardItemId(candidate.id);
      if (this.findHero(candidate.id)) {
        this.addItem(shardId, SUMMON_SHARD_GAIN);
        shardCount += 1;
        drops.push({
          heroId: candidate.id,
          name: candidate.name,
          star: candidate.star,
          kind: "shard",
          shardId,
          shardGain: SUMMON_SHARD_GAIN,
          shardOwned: this.itemCount(shardId),
        });
      } else {
        this.heroes.push({ id: candidate.id, name: candidate.name, level: 1, star: candidate.star, weaponLevel: 1 });
        newCount += 1;
        drops.push({
          heroId: candidate.id,
          name: candidate.name,
          star: candidate.star,
          kind: "new",
          shardId,
          shardGain: 0,
          shardOwned: this.itemCount(shardId),
        });
      }
    }
    return {
      ok: true,
      count,
      cost,
      drops,
      newCount,
      shardCount,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /** 只读背包。数量为 0 的不出现。不改钱包，也不改英雄。 */
  bagList(): BagListResp {
    return {
      ok: true,
      items: listBagItems(this.itemCounts, (heroId) => this.heroNameById(heroId)),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /**
   * 使用道具，默认 1 个。
   * 小金币袋加金币。经验药水给名册第一名加经验，满 100 升 1 级。
   * 强化石和碎片拒绝，数量不动。
   * 背包是空的、没有这个道具、数量不够、数量小于 1、领队已满级时拒绝。
   * 不改钻石、挂机起算、主线和召唤游标。
   */
  bagUse(data: unknown): BagUseResp {
    const body = asRecord(data);
    const id = Math.floor(numField(body, "id", 0));
    const count = readUseCount(body);
    if (count === null) return this.bagFail(id, ErrorCode.BAG_COUNT_INVALID);
    const owned = this.itemCount(id);
    const view = this.findBagView(id);
    if (owned <= 0 || !view) {
      const empty = listBagItems(this.itemCounts, (heroId) => this.heroNameById(heroId)).length === 0;
      return this.bagFail(id, empty ? ErrorCode.BAG_EMPTY : ErrorCode.BAG_NOT_FOUND);
    }
    if (count > owned) return this.bagFail(id, ErrorCode.BAG_NOT_ENOUGH, { need: count });
    if (!view.usable) return this.bagFail(id, ErrorCode.BAG_NOT_USABLE);
    if (id === ITEM_GOLD_BAG) {
      this.spendItem(id, count);
      const goldGain = GOLD_BAG_GAIN * count;
      this.gold += goldGain;
      return {
        ok: true,
        id,
        name: view.name,
        kind: view.kind,
        spent: count,
        owned: this.itemCount(id),
        gold: this.gold,
        diamond: this.diamond,
        goldGain,
      };
    }
    if (id === ITEM_EXP_POTION) {
      this.ensureHeroes();
      const hero = this.heroes[0];
      if (!hero || hero.level >= HERO_MAX_LEVEL) {
        return this.bagFail(id, ErrorCode.BAG_HERO_MAX, {
          heroName: hero ? hero.name : "",
          heroLevel: hero ? hero.level : 0,
        });
      }
      this.spendItem(id, count);
      const next = applyHeroExp(hero.level, hero.exp || 0, EXP_POTION_GAIN * count, HERO_MAX_LEVEL);
      hero.level = next.level;
      hero.exp = next.exp;
      return {
        ok: true,
        id,
        name: view.name,
        kind: view.kind,
        spent: count,
        owned: this.itemCount(id),
        gold: this.gold,
        diamond: this.diamond,
        heroId: hero.id,
        heroName: hero.name,
        heroLevel: hero.level,
        expGain: EXP_POTION_GAIN * count,
        leveled: next.leveled,
      };
    }
    return this.bagFail(id, ErrorCode.BAG_NOT_USABLE);
  }

  /** 只读邮箱。不改已读，也不改钱包。 */
  mailList(): MailListResp {
    const mails = this.viewMails();
    let unread = 0;
    let claimable = 0;
    for (let i = 0; i < mails.length; i++) {
      if (mails[i].unread) unread += 1;
      if (mails[i].hasAttachment && !mails[i].claimed) claimable += 1;
    }
    return {
      ok: true,
      mails,
      unread,
      claimable,
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  /** 标成已读。已经读过也成功。不发附件。 */
  mailRead(data: unknown): MailReadResp {
    const id = readMailId(data);
    const mail = this.findMail(id);
    if (!mail) return { ok: false, gold: this.gold, diamond: this.diamond, code: ErrorCode.MAIL_NOT_FOUND };
    mail.read = true;
    return { ok: true, mail: this.viewMail(mail), gold: this.gold, diamond: this.diamond };
  }

  /**
   * 领取一封附件。金币、钻石进钱包，其它进背包，然后标成已领取和已读。
   * 没有这封、没有附件、已经领过都拒绝，钱包和背包不动。
   * 不改英雄、挂机起算、主线和召唤游标。
   */
  mailClaim(data: unknown): MailClaimResp {
    const id = readMailId(data);
    const mail = this.findMail(id);
    if (!mail) return this.mailClaimFail(id, ErrorCode.MAIL_NOT_FOUND);
    const rewards = this.namedAttachments(mail);
    if (rewards.length === 0) return this.mailClaimFail(id, ErrorCode.MAIL_NO_ATTACHMENT);
    if (mail.claimed) return this.mailClaimFail(id, ErrorCode.MAIL_ALREADY_CLAIMED);
    const gain = this.grantAttachments(rewards);
    mail.claimed = true;
    mail.read = true;
    return {
      ok: true,
      id,
      title: mail.title,
      count: 1,
      rewards,
      gold: this.gold,
      diamond: this.diamond,
      goldGain: gain.goldGain,
      diamondGain: gain.diamondGain,
    };
  }

  /** 把每封还没领的附件都领掉。一封都没有时拒绝，状态不动。 */
  mailClaimAll(): MailClaimAllResp {
    const targets: StoredMail[] = [];
    for (let i = 0; i < this.mails.length; i++) {
      const mail = this.mails[i];
      if (mail.claimed) continue;
      if (this.namedAttachments(mail).length === 0) continue;
      targets.push(mail);
    }
    if (targets.length === 0) return this.mailClaimAllFail(ErrorCode.MAIL_NOTHING);
    const ids: number[] = [];
    const pieces: MailAttachment[] = [];
    let goldGain = 0;
    let diamondGain = 0;
    for (let i = 0; i < targets.length; i++) {
      const mail = targets[i];
      const rewards = this.namedAttachments(mail);
      const gain = this.grantAttachments(rewards);
      mail.claimed = true;
      mail.read = true;
      ids.push(mail.id);
      goldGain += gain.goldGain;
      diamondGain += gain.diamondGain;
      for (let j = 0; j < rewards.length; j++) pieces.push(rewards[j]);
    }
    return {
      ok: true,
      count: ids.length,
      ids,
      rewards: mergeAttachments(pieces),
      gold: this.gold,
      diamond: this.diamond,
      goldGain,
      diamondGain,
    };
  }

  /** 删一封。还有未领附件时拒绝。没有附件或已经领过可以删。 */
  mailDelete(data: unknown): MailDeleteResp {
    const id = readMailId(data);
    const mail = this.findMail(id);
    if (!mail) {
      return { ok: false, id, title: "", gold: this.gold, diamond: this.diamond, code: ErrorCode.MAIL_NOT_FOUND };
    }
    if (!mail.claimed && this.namedAttachments(mail).length > 0) {
      return {
        ok: false,
        id,
        title: mail.title,
        gold: this.gold,
        diamond: this.diamond,
        code: ErrorCode.MAIL_DELETE_BLOCKED,
      };
    }
    const title = mail.title;
    const next: StoredMail[] = [];
    for (let i = 0; i < this.mails.length; i++) {
      if (this.mails[i].id !== id) next.push(this.mails[i]);
    }
    this.mails = next;
    return { ok: true, id, title, gold: this.gold, diamond: this.diamond };
  }

  private applySeed(seed?: MockSessionSeed): void {
    if (!seed) return;
    if (typeof seed.account === "string") {
      this.account = seed.account;
      if (seed.account) this.roleAccount = seed.account;
    }
    if (typeof seed.token === "string" && seed.token) this.token = seed.token;
    if (typeof seed.serverId === "number" && isFinite(seed.serverId)) this.serverId = seed.serverId;
    if (typeof seed.clearedStage === "number" && isFinite(seed.clearedStage) && seed.clearedStage >= 0) {
      this.clearedStage = Math.floor(seed.clearedStage);
    }
    if (seed.role) {
      if (typeof seed.role.roleId === "number" && isFinite(seed.role.roleId)) {
        this.role.roleId = seed.role.roleId;
      }
      if (typeof seed.role.name === "string" && seed.role.name) this.role.name = seed.role.name;
    }
    this.syncDerived(false);
    if (typeof seed.stageId === "number" && isFinite(seed.stageId) && seed.stageId >= 1) {
      this.stageId = Math.floor(seed.stageId);
    } else {
      this.stageId = this.clearedStage + 1;
    }
    if (typeof seed.openDay === "number" && isFinite(seed.openDay) && seed.openDay >= 1) {
      this.openDay = Math.floor(seed.openDay);
    }
    if (typeof seed.gold === "number" && isFinite(seed.gold)) this.gold = Math.max(0, Math.floor(seed.gold));
    if (typeof seed.diamond === "number" && isFinite(seed.diamond)) {
      this.diamond = Math.max(0, Math.floor(seed.diamond));
    }
    if (typeof seed.idleAnchorMs === "number" && isFinite(seed.idleAnchorMs)) {
      this.idleAnchorMs = Math.floor(seed.idleAnchorMs);
    }
    if (Array.isArray(seed.items)) {
      this.itemsSeeded = true;
      for (let i = 0; i < seed.items.length; i++) {
        const row = seed.items[i];
        if (!row || typeof row.id !== "number" || !isFinite(row.id)) continue;
        if (typeof row.count !== "number" || !isFinite(row.count) || row.count <= 0) continue;
        this.itemCounts[Math.floor(row.id)] = Math.floor(row.count);
      }
    }
    if (Array.isArray(seed.heroes)) this.heroes = normalizeRoster(seed.heroes);
    if (typeof seed.summonCursor === "number" && isFinite(seed.summonCursor) && seed.summonCursor >= 0) {
      this.summonCursor = Math.floor(seed.summonCursor);
    }
    if (Array.isArray(seed.mails)) {
      this.mailsSeeded = true;
      this.mails = normalizeMailList(seed.mails);
    }
    if (typeof seed.arenaScore === "number" && isFinite(seed.arenaScore)) {
      this.arenaScore = clampArenaScore(seed.arenaScore);
    }
    if (typeof seed.arenaUsed === "number" && isFinite(seed.arenaUsed)) {
      let used = Math.floor(seed.arenaUsed);
      if (used < 0) used = 0;
      if (used > ARENA_DAILY_LIMIT) used = ARENA_DAILY_LIMIT;
      this.arenaUsed = used;
    }
    if (typeof seed.arenaDay === "number" && isFinite(seed.arenaDay) && seed.arenaDay >= 1) {
      this.arenaDay = Math.floor(seed.arenaDay);
      this.arenaDaySeeded = true;
    }
    if (typeof seed.towerFloor === "number" && isFinite(seed.towerFloor)) {
      this.towerFloor = clampTowerFloor(seed.towerFloor);
    }
    if (typeof seed.towerUsed === "number" && isFinite(seed.towerUsed)) {
      let used = Math.floor(seed.towerUsed);
      if (used < 0) used = 0;
      if (used > TOWER_DAILY_LIMIT) used = TOWER_DAILY_LIMIT;
      this.towerUsed = used;
    }
    if (typeof seed.towerDay === "number" && isFinite(seed.towerDay) && seed.towerDay >= 1) {
      this.towerDay = Math.floor(seed.towerDay);
      this.towerDaySeeded = true;
    }
    if (typeof seed.dailyUsed === "number" && isFinite(seed.dailyUsed)) {
      let used = Math.floor(seed.dailyUsed);
      if (used < 0) used = 0;
      if (used > DAILY_GOLD_LIMIT) used = DAILY_GOLD_LIMIT;
      this.dailyUsed = used;
    }
    if (typeof seed.dailyDay === "number" && isFinite(seed.dailyDay) && seed.dailyDay >= 1) {
      this.dailyDay = Math.floor(seed.dailyDay);
      this.dailyDaySeeded = true;
    }
    if (typeof seed.loginDay === "number" && isFinite(seed.loginDay)) {
      let day = Math.floor(seed.loginDay);
      if (day < 1) day = 1;
      if (day > LOGIN7_DAYS) day = LOGIN7_DAYS;
      this.loginDay = day;
    }
    if (Array.isArray(seed.loginClaimed)) {
      for (let i = 0; i < seed.loginClaimed.length; i++) {
        const raw = seed.loginClaimed[i];
        if (typeof raw !== "number" || !isFinite(raw)) continue;
        const day = Math.floor(raw);
        if (day >= 1 && day <= LOGIN7_DAYS) this.loginClaimed[day] = true;
      }
    }
    if (typeof seed.idleClaimCount === "number" && isFinite(seed.idleClaimCount)) {
      const count = Math.floor(seed.idleClaimCount);
      this.idleClaimCount = count > 0 ? count : 0;
    }
    if (Array.isArray(seed.shopBought)) {
      for (let i = 0; i < seed.shopBought.length; i++) {
        const row = seed.shopBought[i];
        if (!row || typeof row.id !== "number" || !isFinite(row.id)) continue;
        const offer = findShopOffer(row.id);
        if (!offer) continue;
        if (typeof row.count !== "number" || !isFinite(row.count)) continue;
        let count = Math.floor(row.count);
        if (count < 0) count = 0;
        if (count > offer.limit) count = offer.limit;
        if (count > 0) this.shopBought[offer.id] = count;
      }
    }
    if (typeof seed.shopDay === "number" && isFinite(seed.shopDay) && seed.shopDay >= 1) {
      this.shopDay = Math.floor(seed.shopDay);
      this.shopDaySeeded = true;
    }
    if (typeof seed.wishUsed === "number" && isFinite(seed.wishUsed)) {
      let used = Math.floor(seed.wishUsed);
      if (used < 0) used = 0;
      if (used > WISH_DAILY_LIMIT) used = WISH_DAILY_LIMIT;
      this.wishUsed = used;
    }
    if (typeof seed.wishDay === "number" && isFinite(seed.wishDay) && seed.wishDay >= 1) {
      this.wishDay = Math.floor(seed.wishDay);
      this.wishDaySeeded = true;
    }
    if (typeof seed.wishCursor === "number" && isFinite(seed.wishCursor) && seed.wishCursor >= 0) {
      this.wishCursor = Math.floor(seed.wishCursor);
    }
    if (typeof seed.cafeUsed === "number" && isFinite(seed.cafeUsed)) {
      let used = Math.floor(seed.cafeUsed);
      if (used < 0) used = 0;
      if (used > CAFE_DAILY_LIMIT) used = CAFE_DAILY_LIMIT;
      this.cafeUsed = used;
    }
    if (typeof seed.cafeDay === "number" && isFinite(seed.cafeDay) && seed.cafeDay >= 1) {
      this.cafeDay = Math.floor(seed.cafeDay);
      this.cafeDaySeeded = true;
    }
    if (Array.isArray(seed.cafeHeroIds)) {
      const ids: number[] = [];
      for (let i = 0; i < seed.cafeHeroIds.length; i++) {
        const raw = seed.cafeHeroIds[i];
        if (typeof raw !== "number" || !isFinite(raw) || raw <= 0) continue;
        ids.push(Math.floor(raw));
      }
      this.cafeServing = ids;
    }
    if (Array.isArray(seed.giftLevelClaimed)) {
      for (let i = 0; i < seed.giftLevelClaimed.length; i++) {
        const raw = seed.giftLevelClaimed[i];
        if (typeof raw !== "number" || !isFinite(raw)) continue;
        const level = Math.floor(raw);
        if (findGiftLevel(level)) this.giftLevels[level] = true;
      }
    }
    if (seed.giftDailyBought === true) this.giftDailyBought = true;
    if (typeof seed.giftDailyDay === "number" && isFinite(seed.giftDailyDay) && seed.giftDailyDay >= 1) {
      this.giftDailyDay = Math.floor(seed.giftDailyDay);
      this.giftDailyDaySeeded = true;
    }
    if (seed.firstChargeDone === true) this.firstChargeDone = true;
    if (typeof seed.totalRecharge === "number" && isFinite(seed.totalRecharge)) {
      const total = Math.floor(seed.totalRecharge);
      this.totalRecharge = total > 0 ? total : 0;
    }
    if (Array.isArray(seed.giftAccClaimed)) {
      for (let i = 0; i < seed.giftAccClaimed.length; i++) {
        const raw = seed.giftAccClaimed[i];
        if (typeof raw !== "number" || !isFinite(raw)) continue;
        const amount = Math.floor(raw);
        if (findGiftAcc(amount)) this.giftAccClaimed[amount] = true;
      }
    }
    if (Array.isArray(seed.limitedExBought)) {
      for (let i = 0; i < seed.limitedExBought.length; i++) {
        const row = seed.limitedExBought[i];
        if (!row || typeof row.id !== "number" || !isFinite(row.id)) continue;
        if (typeof row.count !== "number" || !isFinite(row.count)) continue;
        const offer = findLimitedOffer(Math.floor(row.id));
        if (!offer) continue;
        let count = Math.floor(row.count);
        if (count < 1) continue;
        if (offer.limit > 0 && count > offer.limit) count = offer.limit;
        this.limitedExBought[offer.id] = count;
      }
    }
    if (typeof seed.limitedExDay === "number" && isFinite(seed.limitedExDay) && seed.limitedExDay >= 1) {
      this.limitedExDay = Math.floor(seed.limitedExDay);
      this.limitedExDaySeeded = true;
    }
    if (typeof seed.limitedStoneUsed === "number" && isFinite(seed.limitedStoneUsed)) {
      let used = Math.floor(seed.limitedStoneUsed);
      if (used < 0) used = 0;
      if (used > LIMITED_STONE_LIMIT) used = LIMITED_STONE_LIMIT;
      this.limitedStoneUsed = used;
    }
    if (typeof seed.limitedStoneDay === "number" && isFinite(seed.limitedStoneDay) && seed.limitedStoneDay >= 1) {
      this.limitedStoneDay = Math.floor(seed.limitedStoneDay);
      this.limitedStoneDaySeeded = true;
    }
    if (Array.isArray(seed.limitedPackBought)) {
      for (let i = 0; i < seed.limitedPackBought.length; i++) {
        const raw = seed.limitedPackBought[i];
        if (typeof raw !== "number" || !isFinite(raw)) continue;
        const id = Math.floor(raw);
        if (findLimitedPack(id)) this.limitedPacks[id] = true;
      }
    }
    if (Array.isArray(seed.goalClaimed)) {
      for (let i = 0; i < seed.goalClaimed.length; i++) {
        const raw: unknown = seed.goalClaimed[i];
        if (typeof raw !== "string") continue;
        const id = raw.trim();
        if (id) this.goalClaimed[id] = true;
      }
    }
  }

  /** id 1 金币，id 2 钻石。其它 id 先忽略。 */
  private addRewards(rewards: { id: number; count: number }[]): void {
    for (let i = 0; i < rewards.length; i++) {
      const reward = rewards[i];
      const count = typeof reward.count === "number" && isFinite(reward.count) ? Math.floor(reward.count) : 0;
      if (count <= 0) continue;
      if (reward.id === 1) this.gold += count;
      else if (reward.id === 2) this.diamond += count;
    }
  }

  private addItem(id: number, count: number): void {
    if (count <= 0) return;
    this.itemCounts[id] = this.itemCount(id) + count;
  }

  private spendItem(id: number, count: number): void {
    const left = this.itemCount(id) - count;
    if (left <= 0) delete this.itemCounts[id];
    else this.itemCounts[id] = left;
  }

  private grantStarterItems(): void {
    this.addItem(ITEM_GOLD_BAG, STARTER_GOLD_BAG);
    this.addItem(ITEM_EXP_POTION, STARTER_EXP_POTION);
    this.addItem(ITEM_WISH_TOKEN, STARTER_WISH_TOKEN);
  }

  private grantStarterMails(): void {
    this.mails = normalizeMailList(starterMails());
  }

  private viewMails() {
    const out = [];
    for (let i = 0; i < this.mails.length; i++) out.push(this.viewMail(this.mails[i]));
    return out;
  }

  private viewMail(mail: StoredMail) {
    return toMailEntry(mail, (heroId) => this.heroNameById(heroId));
  }

  private namedAttachments(mail: StoredMail): MailAttachment[] {
    const named: MailAttachment[] = [];
    for (let i = 0; i < mail.attachments.length; i++) {
      const row = mail.attachments[i];
      if (row.count <= 0 || row.id <= 0) continue;
      named.push({
        id: row.id,
        name: attachmentName(row.id, (heroId) => this.heroNameById(heroId)),
        count: row.count,
      });
    }
    return named;
  }

  private grantAttachments(rows: MailAttachment[]): { goldGain: number; diamondGain: number } {
    let goldGain = 0;
    let diamondGain = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.count <= 0) continue;
      if (row.id === 1) {
        this.gold += row.count;
        goldGain += row.count;
      } else if (row.id === 2) {
        this.diamond += row.count;
        diamondGain += row.count;
      } else {
        this.addItem(row.id, row.count);
      }
    }
    return { goldGain, diamondGain };
  }

  private findMail(id: number): StoredMail | null {
    if (id < 1) return null;
    for (let i = 0; i < this.mails.length; i++) {
      if (this.mails[i].id === id) return this.mails[i];
    }
    return null;
  }

  private mailClaimFail(id: number, code: number): MailClaimResp {
    const mail = this.findMail(id);
    return {
      ok: false,
      id,
      title: mail ? mail.title : "",
      count: 0,
      rewards: [],
      gold: this.gold,
      diamond: this.diamond,
      goldGain: 0,
      diamondGain: 0,
      code,
    };
  }

  private mailClaimAllFail(code: number): MailClaimAllResp {
    return {
      ok: false,
      count: 0,
      ids: [],
      rewards: [],
      gold: this.gold,
      diamond: this.diamond,
      goldGain: 0,
      diamondGain: 0,
      code,
    };
  }

  private findBagView(id: number): ReturnType<typeof listBagItems>[number] | null {
    const items = listBagItems(this.itemCounts, (heroId) => this.heroNameById(heroId));
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i];
    }
    return null;
  }

  private bagFail(
    id: number,
    code: number,
    extra?: { need?: number; heroName?: string; heroLevel?: number }
  ): BagUseResp {
    const view = this.findBagView(id);
    const heroName = extra && extra.heroName ? extra.heroName : undefined;
    const heroLevel = extra && typeof extra.heroLevel === "number" ? extra.heroLevel : undefined;
    return {
      ok: false,
      id,
      name: view ? view.name : "",
      kind: view ? view.kind : undefined,
      spent: 0,
      owned: this.itemCount(id),
      gold: this.gold,
      diamond: this.diamond,
      need: extra && typeof extra.need === "number" ? extra.need : undefined,
      heroName,
      heroLevel,
      code,
    };
  }

  private heroNameById(heroId: number): string {
    const hero = this.findHero(heroId);
    return hero ? hero.name : "";
  }

  private ensureHeroes(): void {
    if (this.heroes.length === 0) this.heroes = starterRoster();
  }

  /** 缺武器的英雄补 Lv1 新手短剑。已有等级只取整，不扣费。 */
  private ensureStarterGear(): void {
    this.ensureHeroes();
    for (let i = 0; i < this.heroes.length; i++) {
      this.heroes[i].weaponLevel = clampWeaponLevel(this.heroes[i].weaponLevel);
    }
  }

  /** 开服天变了就把今日次数清零。积分不动。 */
  private refreshArenaDay(): void {
    if (this.arenaDay === this.openDay) return;
    this.arenaDay = this.openDay;
    this.arenaUsed = 0;
  }

  /** 开服天变了就把塔的今日次数清零。层数不动。 */
  private refreshTowerDay(): void {
    if (this.towerDay === this.openDay) return;
    this.towerDay = this.openDay;
    this.towerUsed = 0;
  }

  /** 开服天变了就把金币副本的今日次数清零。 */
  private refreshDailyDay(): void {
    if (this.dailyDay === this.openDay) return;
    this.dailyDay = this.openDay;
    this.dailyUsed = 0;
  }

  /** 开服天变了就把商店今日已购清零。背包里已经买到的留下。 */
  private refreshShopDay(): void {
    if (this.shopDay === this.openDay) return;
    this.shopDay = this.openDay;
    this.shopBought = {};
  }

  private resetShop(): void {
    this.shopBought = {};
    this.shopDay = this.openDay;
  }

  /** 开服天变了就把许愿今日次数清零。奖池游标和已经拿到的奖励留下。 */
  private refreshWishDay(): void {
    if (this.wishDay === this.openDay) return;
    this.wishDay = this.openDay;
    this.wishUsed = 0;
  }

  private resetWish(): void {
    this.wishUsed = 0;
    this.wishDay = this.openDay;
    this.wishCursor = 0;
  }

  /** 开服天变了就把招待今日次数清零。还没领取的英雄留下，咖啡豆也不收回。 */
  private refreshCafeDay(): void {
    if (this.cafeDay === this.openDay) return;
    this.cafeDay = this.openDay;
    this.cafeUsed = 0;
  }

  private resetCafe(): void {
    this.cafeUsed = 0;
    this.cafeDay = this.openDay;
    this.cafeServing = [];
  }

  /** 开服天变了就把每日礼包已购清掉。升级有礼、首充和累充留下。 */
  private refreshGiftDay(): void {
    if (this.giftDailyDay === this.openDay) return;
    this.giftDailyDay = this.openDay;
    this.giftDailyBought = false;
  }

  private resetGift(): void {
    this.giftLevels = {};
    this.giftDailyBought = false;
    this.giftDailyDay = this.openDay;
    this.firstChargeDone = false;
    this.totalRecharge = 0;
    this.giftAccClaimed = {};
  }

  /** 开服天变了就把兑换次数和点石次数清零。已经换到的道具和已购礼包留下。 */
  private refreshLimitedDay(): void {
    if (this.limitedExDay !== this.openDay) {
      this.limitedExDay = this.openDay;
      this.limitedExBought = {};
    }
    if (this.limitedStoneDay !== this.openDay) {
      this.limitedStoneDay = this.openDay;
      this.limitedStoneUsed = 0;
    }
  }

  private resetLimited(): void {
    this.limitedExBought = {};
    this.limitedExDay = this.openDay;
    this.limitedStoneUsed = 0;
    this.limitedStoneDay = this.openDay;
    this.limitedPacks = {};
  }

  private limitedExCount(id: number): number {
    const value = this.limitedExBought[id];
    return typeof value === "number" && isFinite(value) ? value : 0;
  }

  private limitedSnapshot(): LimitedViewResp {
    const free = limitedStoneFree(this.limitedStoneUsed) && this.limitedStoneUsed < LIMITED_STONE_LIMIT;
    return {
      ok: true,
      openDay: this.openDay,
      gold: this.gold,
      diamond: this.diamond,
      beanOwned: this.itemCount(LIMITED_BEAN_ITEM_ID),
      offers: listLimitedOffers(
        (id) => this.limitedExCount(id),
        (itemId) => this.itemCount(itemId)
      ),
      stoneUsed: this.limitedStoneUsed,
      stoneLimit: LIMITED_STONE_LIMIT,
      stoneFree: free,
      stoneCost: limitedStoneCost(this.limitedStoneUsed),
      stoneGold: LIMITED_STONE_GOLD,
      packs: listLimitedPacks(this.openDay, (id) => this.limitedPacks[id] === true),
      countdown: limitedCountdown(this.openDay, LIMITED_PACK_DAYS),
    };
  }

  private limitedExchangeFail(id: number, code: number): LimitedExchangeResp {
    const offer = findLimitedOffer(id);
    return {
      ok: false,
      id,
      pay: offer ? offer.pay : "",
      costName: offer ? offer.costName : "",
      costCount: offer ? offer.costCount : 0,
      rewardName: offer ? offer.rewardName : "",
      rewardItemId: offer ? offer.rewardItemId : 0,
      rewardCount: offer ? offer.rewardCount : 0,
      bought: this.limitedExCount(id),
      limit: offer ? offer.limit : 0,
      owned: offer && offer.pay === "item" ? this.itemCount(offer.costItemId) : 0,
      gold: this.gold,
      diamond: this.diamond,
      code,
    };
  }

  private limitedAlchemyFail(code: number): LimitedAlchemyResp {
    const free = limitedStoneFree(this.limitedStoneUsed) && this.limitedStoneUsed < LIMITED_STONE_LIMIT;
    return {
      ok: false,
      free,
      cost: limitedStoneCost(this.limitedStoneUsed),
      goldGain: 0,
      used: this.limitedStoneUsed,
      limit: LIMITED_STONE_LIMIT,
      gold: this.gold,
      diamond: this.diamond,
      code,
    };
  }

  private limitedBuyFail(id: number, code: number): LimitedBuyResp {
    const pack = findLimitedPack(id);
    return {
      ok: false,
      id,
      name: pack ? pack.name : "",
      pay: pack ? pack.pay : "",
      price: pack ? pack.price : 0,
      goldGain: 0,
      diamondGain: 0,
      itemId: 0,
      itemName: pack ? pack.itemName : "",
      itemGain: 0,
      bought: this.limitedPacks[id] === true,
      gold: this.gold,
      diamond: this.diamond,
      code,
    };
  }

  private grantGiftBundle(bundle: { gold: number; diamond: number; itemId: number; itemCount: number }): void {
    if (bundle.gold > 0) this.gold += bundle.gold;
    if (bundle.diamond > 0) this.diamond += bundle.diamond;
    if (bundle.itemId > 0 && bundle.itemCount > 0) this.addItem(bundle.itemId, bundle.itemCount);
  }

  private giftSnapshot(): GiftViewResp {
    return {
      ok: true,
      level: this.role.level,
      openDay: this.openDay,
      gold: this.gold,
      diamond: this.diamond,
      levels: listGiftLevels(this.role.level, (level) => this.giftLevels[level] === true),
      dailyPrice: GIFT_DAILY_PRICE,
      dailyBought: this.giftDailyBought,
      dailyGold: GIFT_DAILY_GOLD,
      dailyItemId: GIFT_DAILY_ITEM_ID,
      dailyItemName: GIFT_DAILY_ITEM_NAME,
      dailyItemCount: GIFT_DAILY_ITEM_COUNT,
      firstChargeDone: this.firstChargeDone,
      firstAmount: GIFT_FIRST_AMOUNT,
      firstDiamond: GIFT_FIRST_DIAMOND,
      firstItemId: GIFT_FIRST_ITEM_ID,
      firstItemName: GIFT_FIRST_ITEM_NAME,
      firstItemCount: GIFT_FIRST_ITEM_COUNT,
      totalRecharge: this.totalRecharge,
      rechargeStep: GIFT_RECHARGE_STEP,
      rechargeDiamond: GIFT_RECHARGE_DIAMOND,
      tiers: listGiftAcc(this.totalRecharge, (amount) => this.giftAccClaimed[amount] === true),
    };
  }

  private giftLevelFail(level: number, state: GiftLevelState | "", code: number): GiftClaimLevelResp {
    return {
      ok: false,
      level,
      state,
      goldGain: 0,
      diamondGain: 0,
      itemId: 0,
      itemName: "",
      itemGain: 0,
      gold: this.gold,
      diamond: this.diamond,
      code,
    };
  }

  private giftDailyFail(code: number): GiftBuyDailyResp {
    return {
      ok: false,
      price: GIFT_DAILY_PRICE,
      bought: this.giftDailyBought,
      goldGain: 0,
      itemId: 0,
      itemName: "",
      itemGain: 0,
      gold: this.gold,
      diamond: this.diamond,
      code,
    };
  }

  private giftRechargeFail(kind: "" | "first" | "acc", code: number): GiftRechargeResp {
    return {
      ok: false,
      kind,
      added: 0,
      firstChargeDone: this.firstChargeDone,
      firstGranted: false,
      diamondGain: 0,
      itemId: 0,
      itemName: "",
      itemGain: 0,
      totalRecharge: this.totalRecharge,
      gold: this.gold,
      diamond: this.diamond,
      code,
    };
  }

  private giftAccFail(amount: number, state: GiftAccState | "", code: number): GiftClaimAccResp {
    return {
      ok: false,
      amount,
      state,
      goldGain: 0,
      diamondGain: 0,
      itemId: 0,
      itemName: "",
      itemGain: 0,
      totalRecharge: this.totalRecharge,
      gold: this.gold,
      diamond: this.diamond,
      code,
    };
  }

  private prepareCafe(): void {
    this.ensureHeroes();
    this.refreshCafeDay();
    this.sanitizeCafeServing();
  }

  private sanitizeCafeServing(): void {
    const next: number[] = [];
    const seen: { [id: number]: boolean } = {};
    for (let i = 0; i < this.cafeServing.length; i++) {
      const id = this.cafeServing[i];
      if (seen[id]) continue;
      if (!this.findHero(id)) continue;
      seen[id] = true;
      next.push(id);
      if (next.length >= CAFE_MAX_HEROES) break;
    }
    this.cafeServing = next;
  }

  private cafeNames(ids: number[]): string[] {
    const names: string[] = [];
    for (let i = 0; i < ids.length; i++) {
      const hero = this.findHero(ids[i]);
      names.push(hero ? hero.name : "");
    }
    return names;
  }

  private cafeHeroRows(): CafeHero[] {
    const serving: { [id: number]: boolean } = {};
    for (let i = 0; i < this.cafeServing.length; i++) serving[this.cafeServing[i]] = true;
    const rows: CafeHero[] = [];
    for (let i = 0; i < this.heroes.length; i++) {
      const hero = this.heroes[i];
      rows.push({
        id: hero.id,
        name: hero.name,
        level: hero.level,
        serving: serving[hero.id] === true,
      });
    }
    return rows;
  }

  private cafeSnapshot(): CafeViewResp {
    return {
      ok: true,
      used: this.cafeUsed,
      limit: CAFE_DAILY_LIMIT,
      openDay: this.openDay,
      servingCount: this.cafeServing.length,
      ready: this.cafeServing.length > 0,
      heroes: this.cafeHeroRows(),
      goldOne: CAFE_GOLD_ONE,
      goldTwo: CAFE_GOLD_TWO,
      beanOne: CAFE_BEAN_ONE,
      beanTwo: CAFE_BEAN_TWO,
      beanOwned: this.itemCount(CAFE_BEAN_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  private cafeSendFail(code: number): CafeSendResp {
    const reward = cafeReward(this.cafeServing.length);
    return {
      ok: false,
      heroIds: this.cafeServing.slice(),
      names: this.cafeNames(this.cafeServing),
      goldPreview: reward.gold,
      beanPreview: reward.beans,
      used: this.cafeUsed,
      limit: CAFE_DAILY_LIMIT,
      ready: this.cafeServing.length > 0,
      gold: this.gold,
      diamond: this.diamond,
      code,
    };
  }

  private cafeClaimFail(code: number): CafeClaimResp {
    return {
      ok: false,
      names: this.cafeNames(this.cafeServing),
      goldGain: 0,
      itemId: 0,
      itemName: CAFE_BEAN_NAME,
      itemGain: 0,
      beanOwned: this.itemCount(CAFE_BEAN_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
      used: this.cafeUsed,
      limit: CAFE_DAILY_LIMIT,
      code,
    };
  }

  private wishSnapshot(): WishViewResp {
    return {
      ok: true,
      used: this.wishUsed,
      limit: WISH_DAILY_LIMIT,
      openDay: this.openDay,
      cursor: this.wishCursor,
      goldCost: WISH_GOLD_COST,
      diamondCost: WISH_DIAMOND_COST,
      itemCost: WISH_ITEM_COST,
      tokenOwned: this.itemCount(ITEM_WISH_TOKEN),
      gold: this.gold,
      diamond: this.diamond,
    };
  }

  private shopBoughtCount(id: number): number {
    const raw = this.shopBought[id];
    if (typeof raw !== "number" || !isFinite(raw) || raw <= 0) return 0;
    return Math.floor(raw);
  }

  private resetLogin7(): void {
    this.loginDay = 1;
    for (let i = 0; i < this.loginClaimed.length; i++) this.loginClaimed[i] = false;
  }

  private resetGoal7(): void {
    this.idleClaimCount = 0;
    this.goalClaimed = {};
  }

  private goal7Progress(): Goal7Progress {
    const levels: number[] = [];
    for (let i = 0; i < this.heroes.length; i++) levels.push(this.heroes[i].level);
    return {
      clearedStage: this.clearedStage,
      summonCount: this.summonCursor,
      heroUpgradeCount: heroLevelsToUpgrades(levels),
      idleClaimCount: this.idleClaimCount,
    };
  }

  private goal7Fail(
    id: string,
    title: string,
    state: Goal7ClaimResp["state"],
    current: number,
    target: number,
    code: number
  ): Goal7ClaimResp {
    return {
      ok: false,
      id,
      title,
      state,
      current,
      target,
      rewards: [],
      goldGain: 0,
      diamondGain: 0,
      gold: this.gold,
      diamond: this.diamond,
      code,
    };
  }

  private login7Fail(day: number, code: number): Login7ClaimResp {
    return {
      ok: false,
      day,
      rewards: [],
      goldGain: 0,
      diamondGain: 0,
      gold: this.gold,
      diamond: this.diamond,
      loginDay: this.loginDay,
      code,
    };
  }

  private wishFail(pay: WishPay | "", code: number): WishDrawResp {
    const cost = pay === "" ? 0 : wishCost(pay);
    return {
      ok: false,
      pay,
      cost,
      kind: "",
      name: "",
      count: 0,
      goldGain: 0,
      diamondGain: 0,
      itemId: 0,
      itemGain: 0,
      tokenOwned: this.itemCount(ITEM_WISH_TOKEN),
      gold: this.gold,
      diamond: this.diamond,
      used: this.wishUsed,
      limit: WISH_DAILY_LIMIT,
      cursor: this.wishCursor,
      code,
    };
  }

  private shopFail(id: number, code: number): ShopBuyResp {
    const offer = findShopOffer(id);
    return {
      ok: false,
      id,
      name: offer ? offer.name : "",
      itemId: offer ? offer.itemId : 0,
      count: offer ? offer.count : 0,
      currency: offer ? offer.currency : "gold",
      price: offer ? offer.price : 0,
      bought: this.shopBoughtCount(id),
      limit: offer ? offer.limit : 0,
      owned: offer ? this.itemCount(offer.itemId) : 0,
      gold: this.gold,
      diamond: this.diamond,
      code,
    };
  }

  private dailyFail(tierId: number, name: string, code: number): DailyChallengeResp {
    const tier = findDailyTier(tierId);
    return {
      ok: false,
      tierId,
      name,
      win: false,
      playerPower: rosterPower(this.heroes),
      needPower: tier ? tier.power : 0,
      goldGain: 0,
      itemId: DAILY_ITEM_ID,
      itemName: DAILY_ITEM_NAME,
      itemGain: 0,
      stoneOwned: this.itemCount(DAILY_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
      used: this.dailyUsed,
      limit: DAILY_GOLD_LIMIT,
      code,
    };
  }

  private towerFail(code: number): TowerChallengeResp {
    const floor = this.towerFloor;
    const cleared = towerCleared(floor);
    return {
      ok: false,
      floor: cleared ? TOWER_MAX_FLOOR : floor,
      nextFloor: floor,
      name: floorGuardianName(floor),
      win: false,
      playerPower: rosterPower(this.heroes),
      floorPower: floorPower(floor),
      goldGain: 0,
      itemId: TOWER_ITEM_ID,
      itemName: TOWER_ITEM_NAME,
      itemGain: 0,
      stoneOwned: this.itemCount(TOWER_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
      used: this.towerUsed,
      limit: TOWER_DAILY_LIMIT,
      code,
    };
  }

  private arenaFail(opponentId: number, name: string, code: number): ArenaChallengeResp {
    return {
      ok: false,
      opponentId,
      opponentName: name,
      win: false,
      playerPower: rosterPower(this.heroes),
      opponentPower: 0,
      scoreBefore: this.arenaScore,
      score: this.arenaScore,
      scoreDelta: 0,
      rank: rankFromScore(this.arenaScore),
      goldGain: 0,
      gold: this.gold,
      diamond: this.diamond,
      used: this.arenaUsed,
      limit: ARENA_DAILY_LIMIT,
      code,
    };
  }

  private pushFail(): StagePushResp {
    return {
      ok: false,
      already: false,
      fromStage: this.clearedStage,
      clearedStage: this.clearedStage,
      stageId: 0,
      win: false,
      nextStageId: this.stageId >= 1 ? this.stageId : 1,
      rewards: [],
      goldGain: 0,
      openDay: this.openDay,
      level: this.role.level,
      gold: this.gold,
      diamond: this.diamond,
      code: ErrorCode.STAGE_ID_INVALID,
    };
  }

  private smithFail(
    heroId: number,
    code: number,
    extra?: { needGold?: number; needStone?: number }
  ): SmithStrengthenResp {
    const hero = this.findHero(heroId);
    return {
      ok: false,
      heroId,
      gear: hero ? toSmithGear(hero) : null,
      goldCost: 0,
      stoneCost: 0,
      stoneOwned: this.itemCount(IDLE_ITEM_ID),
      gold: this.gold,
      diamond: this.diamond,
      needGold: extra && typeof extra.needGold === "number" ? extra.needGold : undefined,
      needStone: extra && typeof extra.needStone === "number" ? extra.needStone : undefined,
      code,
    };
  }

  private findHero(id: number): HeroRosterEntry | null {
    for (let i = 0; i < this.heroes.length; i++) {
      if (this.heroes[i].id === id) return this.heroes[i];
    }
    return null;
  }

  private itemCount(id: number): number {
    const value = this.itemCounts[id];
    return typeof value === "number" && isFinite(value) ? value : 0;
  }

  /** 还没 login 时沿用默认角色，Boot 的 skipLogin 和旧自检都能进。 */
  private visibleRole(): boolean {
    if (!this.hasRole) return false;
    if (!this.account) return true;
    return this.account === this.roleAccount;
  }

  /**
   * 同账号刷新后把上次 Mock 快照接上。不写密码、不写 token。
   * 道具列表按种子整份替换，避免构造时发的起步消耗品叠在快照上。
   */
  restoreClientCache(seed: MockSessionSeed): void {
    if (Array.isArray(seed.items)) this.itemCounts = {};
    this.applySeed(seed);
    this.hasRole = true;
    if (seed.account) this.roleAccount = seed.account;
    this.ensureStarterGear();
  }

  /** resetOpenDay：创角时开服天回到推导值，而不是保留旧号的天数。 */
  private syncDerived(resetOpenDay: boolean): void {
    this.role.level = 1 + this.clearedStage;
    const derivedDay = 1 + Math.floor(this.clearedStage / 5);
    this.openDay = resetOpenDay ? derivedDay : Math.max(this.openDay, derivedDay);
  }
}

function asRecord(data: unknown): Record<string, unknown> {
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return {};
}

function strField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string" ? value : "";
}

function numField(body: Record<string, unknown>, key: string, fallback: number): number {
  const value = body[key];
  return typeof value === "number" && isFinite(value) ? value : fallback;
}

function readPushTarget(data: unknown): number | null {
  const body = asRecord(data);
  if (!Object.prototype.hasOwnProperty.call(body, "target") || body.target === undefined) return MAINLINE_PUSH_STAGE;
  const value = body.target;
  if (typeof value !== "number" || !isFinite(value)) return null;
  const target = Math.floor(value);
  if (target < 1 || target > MAINLINE_PUSH_MAX) return null;
  return target;
}

function readMailId(data: unknown): number {
  return Math.floor(numField(asRecord(data), "id", 0));
}

/** 缺省 1。写了但小于 1、或不是数字，则整次无效。 */
function readUseCount(body: Record<string, unknown>): number | null {
  if (!Object.prototype.hasOwnProperty.call(body, "count") || body.count === undefined) return 1;
  const value = body.count;
  if (typeof value !== "number" || !isFinite(value) || value < 1) return null;
  return Math.floor(value);
}
