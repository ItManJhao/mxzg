import { failureCode, logErrorCode } from "../../core/errors";
import { NetClient } from "../NetClient";
import { decodeResponse } from "./codec";
import { Cmd } from "./cmds";
import {
  HeartbeatReq,
  HeartbeatResp,
  LoginReq,
  LoginResp,
  RoleCreateReq,
  RoleCreateResp,
  RoleEnterReq,
  RoleEnterResp,
  HeroListReq,
  HeroListResp,
  HeroUpgradeReq,
  HeroUpgradeResp,
  SummonPullReq,
  SummonPullResp,
  BagListReq,
  BagListResp,
  BagUseReq,
  BagUseResp,
  MailClaimAllReq,
  MailClaimAllResp,
  MailClaimReq,
  MailClaimResp,
  MailDeleteReq,
  MailDeleteResp,
  MailListReq,
  MailListResp,
  MailReadReq,
  MailReadResp,
  SmithStrengthenReq,
  SmithStrengthenResp,
  SmithViewReq,
  SmithViewResp,
  ArenaChallengeReq,
  ArenaChallengeResp,
  ArenaViewReq,
  ArenaViewResp,
  TowerChallengeReq,
  TowerChallengeResp,
  TowerViewReq,
  TowerViewResp,
  DailyChallengeReq,
  DailyChallengeResp,
  DailyViewReq,
  DailyViewResp,
  Login7AdvanceReq,
  Login7AdvanceResp,
  Login7ClaimReq,
  Login7ClaimResp,
  Login7ViewReq,
  Login7ViewResp,
  Goal7ClaimReq,
  Goal7ClaimResp,
  Goal7ViewReq,
  Goal7ViewResp,
  ShopBuyReq,
  ShopBuyResp,
  ShopViewReq,
  ShopViewResp,
  WishDrawReq,
  WishDrawResp,
  WishViewReq,
  WishViewResp,
  CafeClaimReq,
  CafeClaimResp,
  CafeSendReq,
  CafeSendResp,
  CafeViewReq,
  CafeViewResp,
  GiftBuyDailyReq,
  GiftBuyDailyResp,
  GiftClaimAccReq,
  GiftClaimAccResp,
  GiftClaimLevelReq,
  GiftClaimLevelResp,
  GiftRechargeReq,
  GiftRechargeResp,
  GiftViewReq,
  GiftViewResp,
  LimitedAlchemyReq,
  LimitedAlchemyResp,
  LimitedBuyReq,
  LimitedBuyResp,
  LimitedExchangeReq,
  LimitedExchangeResp,
  LimitedViewReq,
  LimitedViewResp,
  IdleClaimReq,
  IdleClaimResp,
  IdleQueryReq,
  IdleQueryResp,
  StageEnterReq,
  StageEnterResp,
  StagePushReq,
  StagePushResp,
  StageResultReq,
  StageResultResp,
} from "./types";

async function call<T>(net: NetClient, cmd: string, data?: unknown): Promise<T> {
  const msg = await net.request(cmd, data);
  const body = decodeResponse<T>(msg);
  const code = failureCode(body);
  if (code !== null) logErrorCode("Proto", code, cmd);
  return body;
}

/**
 * P0 类型化入口。内部仍是 NetClient.request → MockTransport。
 * 不传 net 时用 NetClient.shared（Boot 预览走这条）。
 */
export const Proto = {
  login(req: LoginReq, net: NetClient = NetClient.shared): Promise<LoginResp> {
    return call(net, Cmd.login, req);
  },

  heartbeat(req: HeartbeatReq, net: NetClient = NetClient.shared): Promise<HeartbeatResp> {
    return call(net, Cmd.heartbeat, req);
  },

  roleEnter(req: RoleEnterReq, net: NetClient = NetClient.shared): Promise<RoleEnterResp> {
    return call(net, Cmd.roleEnter, req);
  },

  roleCreate(req: RoleCreateReq, net: NetClient = NetClient.shared): Promise<RoleCreateResp> {
    return call(net, Cmd.roleCreate, req);
  },

  stageEnter(req: StageEnterReq, net: NetClient = NetClient.shared): Promise<StageEnterResp> {
    return call(net, Cmd.stageEnter, req);
  },

  stageResult(req: StageResultReq, net: NetClient = NetClient.shared): Promise<StageResultResp> {
    return call(net, Cmd.stageResult, req);
  },

  /** Mock 调试：从下一关连胜推到 target（缺省 70）。不播战报。 */
  stagePush(req: StagePushReq, net: NetClient = NetClient.shared): Promise<StagePushResp> {
    return call(net, Cmd.stagePush, req);
  },

  idleQuery(req: IdleQueryReq, net: NetClient = NetClient.shared): Promise<IdleQueryResp> {
    return call(net, Cmd.idleQuery, req);
  },

  idleClaim(req: IdleClaimReq, net: NetClient = NetClient.shared): Promise<IdleClaimResp> {
    return call(net, Cmd.idleClaim, req);
  },

  heroList(req: HeroListReq, net: NetClient = NetClient.shared): Promise<HeroListResp> {
    return call(net, Cmd.heroList, req);
  },

  heroUpgrade(req: HeroUpgradeReq, net: NetClient = NetClient.shared): Promise<HeroUpgradeResp> {
    return call(net, Cmd.heroUpgrade, req);
  },

  summonPull(req: SummonPullReq, net: NetClient = NetClient.shared): Promise<SummonPullResp> {
    return call(net, Cmd.summonPull, req);
  },

  bagList(req: BagListReq, net: NetClient = NetClient.shared): Promise<BagListResp> {
    return call(net, Cmd.bagList, req);
  },

  bagUse(req: BagUseReq, net: NetClient = NetClient.shared): Promise<BagUseResp> {
    return call(net, Cmd.bagUse, req);
  },

  mailList(req: MailListReq, net: NetClient = NetClient.shared): Promise<MailListResp> {
    return call(net, Cmd.mailList, req);
  },

  mailRead(req: MailReadReq, net: NetClient = NetClient.shared): Promise<MailReadResp> {
    return call(net, Cmd.mailRead, req);
  },

  mailClaim(req: MailClaimReq, net: NetClient = NetClient.shared): Promise<MailClaimResp> {
    return call(net, Cmd.mailClaim, req);
  },

  mailClaimAll(req: MailClaimAllReq, net: NetClient = NetClient.shared): Promise<MailClaimAllResp> {
    return call(net, Cmd.mailClaimAll, req);
  },

  mailDelete(req: MailDeleteReq, net: NetClient = NetClient.shared): Promise<MailDeleteResp> {
    return call(net, Cmd.mailDelete, req);
  },

  smithView(req: SmithViewReq, net: NetClient = NetClient.shared): Promise<SmithViewResp> {
    return call(net, Cmd.smithView, req);
  },

  smithStrengthen(req: SmithStrengthenReq, net: NetClient = NetClient.shared): Promise<SmithStrengthenResp> {
    return call(net, Cmd.smithStrengthen, req);
  },

  arenaView(req: ArenaViewReq, net: NetClient = NetClient.shared): Promise<ArenaViewResp> {
    return call(net, Cmd.arenaView, req);
  },

  arenaChallenge(req: ArenaChallengeReq, net: NetClient = NetClient.shared): Promise<ArenaChallengeResp> {
    return call(net, Cmd.arenaChallenge, req);
  },

  towerView(req: TowerViewReq, net: NetClient = NetClient.shared): Promise<TowerViewResp> {
    return call(net, Cmd.towerView, req);
  },

  towerChallenge(req: TowerChallengeReq, net: NetClient = NetClient.shared): Promise<TowerChallengeResp> {
    return call(net, Cmd.towerChallenge, req);
  },

  dailyView(req: DailyViewReq, net: NetClient = NetClient.shared): Promise<DailyViewResp> {
    return call(net, Cmd.dailyView, req);
  },

  dailyChallenge(req: DailyChallengeReq, net: NetClient = NetClient.shared): Promise<DailyChallengeResp> {
    return call(net, Cmd.dailyChallenge, req);
  },

  login7View(req: Login7ViewReq, net: NetClient = NetClient.shared): Promise<Login7ViewResp> {
    return call(net, Cmd.login7View, req);
  },

  login7Claim(req: Login7ClaimReq, net: NetClient = NetClient.shared): Promise<Login7ClaimResp> {
    return call(net, Cmd.login7Claim, req);
  },

  login7Advance(req: Login7AdvanceReq, net: NetClient = NetClient.shared): Promise<Login7AdvanceResp> {
    return call(net, Cmd.login7Advance, req);
  },

  goal7View(req: Goal7ViewReq, net: NetClient = NetClient.shared): Promise<Goal7ViewResp> {
    return call(net, Cmd.goal7View, req);
  },

  goal7Claim(req: Goal7ClaimReq, net: NetClient = NetClient.shared): Promise<Goal7ClaimResp> {
    return call(net, Cmd.goal7Claim, req);
  },

  shopView(req: ShopViewReq, net: NetClient = NetClient.shared): Promise<ShopViewResp> {
    return call(net, Cmd.shopView, req);
  },

  shopBuy(req: ShopBuyReq, net: NetClient = NetClient.shared): Promise<ShopBuyResp> {
    return call(net, Cmd.shopBuy, req);
  },

  wishView(req: WishViewReq, net: NetClient = NetClient.shared): Promise<WishViewResp> {
    return call(net, Cmd.wishView, req);
  },

  wishDraw(req: WishDrawReq, net: NetClient = NetClient.shared): Promise<WishDrawResp> {
    return call(net, Cmd.wishDraw, req);
  },

  cafeView(req: CafeViewReq, net: NetClient = NetClient.shared): Promise<CafeViewResp> {
    return call(net, Cmd.cafeView, req);
  },

  cafeSend(req: CafeSendReq, net: NetClient = NetClient.shared): Promise<CafeSendResp> {
    return call(net, Cmd.cafeSend, req);
  },

  cafeClaim(req: CafeClaimReq, net: NetClient = NetClient.shared): Promise<CafeClaimResp> {
    return call(net, Cmd.cafeClaim, req);
  },

  giftView(req: GiftViewReq, net: NetClient = NetClient.shared): Promise<GiftViewResp> {
    return call(net, Cmd.giftView, req);
  },

  giftClaimLevel(req: GiftClaimLevelReq, net: NetClient = NetClient.shared): Promise<GiftClaimLevelResp> {
    return call(net, Cmd.giftClaimLevel, req);
  },

  giftBuyDaily(req: GiftBuyDailyReq, net: NetClient = NetClient.shared): Promise<GiftBuyDailyResp> {
    return call(net, Cmd.giftBuyDaily, req);
  },

  giftRecharge(req: GiftRechargeReq, net: NetClient = NetClient.shared): Promise<GiftRechargeResp> {
    return call(net, Cmd.giftRecharge, req);
  },

  giftClaimAcc(req: GiftClaimAccReq, net: NetClient = NetClient.shared): Promise<GiftClaimAccResp> {
    return call(net, Cmd.giftClaimAcc, req);
  },

  limitedView(req: LimitedViewReq, net: NetClient = NetClient.shared): Promise<LimitedViewResp> {
    return call(net, Cmd.limitedView, req);
  },

  limitedExchange(req: LimitedExchangeReq, net: NetClient = NetClient.shared): Promise<LimitedExchangeResp> {
    return call(net, Cmd.limitedExchange, req);
  },

  limitedAlchemy(req: LimitedAlchemyReq, net: NetClient = NetClient.shared): Promise<LimitedAlchemyResp> {
    return call(net, Cmd.limitedAlchemy, req);
  },

  limitedBuy(req: LimitedBuyReq, net: NetClient = NetClient.shared): Promise<LimitedBuyResp> {
    return call(net, Cmd.limitedBuy, req);
  },
};
