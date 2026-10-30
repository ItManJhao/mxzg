import { GameLog } from "../core/GameLog";
import { GameStore } from "../core/GameStore";
import { Session } from "../core/Session";
import { NetClient } from "./NetClient";
import {
  decodeWireChapter,
  formatWireMainline,
  WIRE_CHAPTER_CMD,
  wireChapterHasIdx,
  wireChapterNote,
  WireChapterProgress,
} from "./protocol/wireChapter";
import {
  decodeWireBattleMatch,
  formatWireBattleMatch,
  resolveWireBattleWin,
  wireBattleActionCount,
  WIRE_BATTLE_MATCH_CMD,
  WireBattleMatch,
} from "./protocol/wireBattle";
import {
  decodeWireChapterReward,
  formatWireChapterReward,
  WIRE_CHAPTER_REWARD_CMD,
  WireChapterRewardSnapshot,
} from "./protocol/wireChapterReward";
import {
  decodeWireQuickBattle,
  formatWireQuickBattle,
  WIRE_QUICK_BATTLE_CMD,
  WireQuickBattleSnapshot,
} from "./protocol/wireQuickBattle";
import {
  decodeWireChapterReport,
  formatWireChapterReport,
  normalizeWireChapterReportIndex,
  WIRE_CHAPTER_REPORT_CMD,
  WireChapterReportSnapshot,
} from "./protocol/wireChapterReport";
import {
  decodeWireGetBattleReport,
  formatWireBattleReport,
  readWireBattleReportQuery,
  WIRE_BATTLE_REPORT_CMD,
  WireBattleReportSnapshot,
} from "./protocol/wireBattleReport";
import {
  decodeWirePreComputeStrength,
  formatWirePreCompute,
  readWirePreComputeQuery,
  WIRE_PRECOMPUTE_CMD,
  WirePreComputeQuery,
  WirePreComputeSnapshot,
} from "./protocol/wirePreComputeStrength";
import {
  decodeWireStudy,
  formatWireStudy,
  readWireStudyQuery,
  WIRE_STUDY_CMD,
  WireStudySnapshot,
} from "./protocol/wireStudy";
import {
  decodeWireHeroAdd,
  decodeWireServerError,
  formatWireGmHero,
  readWireGmAddHero,
  readWireGmCommand,
  WIRE_GM_CMD,
  WIRE_GM_COMMAND,
  WIRE_HERO_ADD_CMD,
  WIRE_SERVER_ERROR_CMD,
} from "./protocol/wireGmCommand";
import {
  decodeWireLineUpSave,
  readWireLineUpSave,
  WIRE_LINEUP_SAVE_CMD,
  WIRE_LINEUP_SAVE_POSITIONS,
  WIRE_MAIN_POSITION,
} from "./protocol/wireLineUpSave";
import {
  decodeWireIdle,
  decodeWireIdleClaim,
  WIRE_IDLE_CLAIM_CMD,
  WIRE_IDLE_CMD,
  wireIdleClaimNote,
  wireIdleHasTime,
  wireIdleNote,
  WireIdleClaim,
  WireIdleSnapshot,
} from "./protocol/wireIdle";
import {
  decodeWireRole,
  WIRE_ROLE_CMD,
  wireProfileHasBar,
  wireProfileNote,
  WireRoleProfile,
} from "./protocol/wireProfile";
import {
  applyWireBagGain,
  decodeWireBagGain,
  decodeWireBagList,
  WIRE_BAG_CMD,
  WIRE_BAG_GAIN_CMD,
  wireBagGainNote,
  wireBagNote,
  WireBagGain,
  WireBagItem,
  WireBagMark,
} from "./protocol/wireBag";
import {
  decodeWireMailList,
  WIRE_MAIL_CMD,
  wireMailNote,
  WireMailEntry,
} from "./protocol/wireMail";
import {
  decodeWireHeroList,
  WIRE_HERO_CMD,
  WIRE_HERO_PAGE_CAP,
  wireHeroNote,
  WireHeroEntry,
  WireHeroList,
} from "./protocol/wireHero";
import {
  decodeWireActivity,
  WIRE_ACTIVITY_CMD,
  wireActivityNote,
  WireActivityRow,
  WireActivitySnapshot,
} from "./protocol/wireActivity";
import {
  decodeWireAchievement,
  WIRE_ACHIEVEMENT_CMD,
  wireAchievementNote,
  WireAchievementSnapshot,
} from "./protocol/wireAchievement";
import {
  decodeWirePvp,
  WIRE_PVP_CMD,
  wirePvpNote,
  WirePvpOpponent,
  WirePvpSnapshot,
} from "./protocol/wirePvp";
import {
  applyWireSevenDayUpdate,
  decodeWireSevenDay,
  decodeWireSevenDayUpdate,
  WIRE_SEVEN_CMD,
  WIRE_SEVEN_PUSH_CMD,
  wireSevenNote,
  WireSevenDayRow,
  WireSevenDaySnapshot,
} from "./protocol/wireSevenDay";
import {
  decodeWireGoal7,
  WIRE_GOAL7_CMD,
  WIRE_GOAL7_PUSH_CMD,
  wireGoalNote,
  WireGoal7Snapshot,
  WireGoal7Task,
} from "./protocol/wireGoal7";
import {
  decodeWireWish,
  WIRE_WISH_CMD,
  wireWishNote,
  WireWishMark,
  WireWishPool,
  WireWishSlot,
  WireWishSnapshot,
} from "./protocol/wireWish";
import {
  decodeWireSummon,
  WIRE_SUMMON_CMD,
  wireSummonNote,
  WireSummonMark,
  WireSummonSnapshot,
} from "./protocol/wireSummon";
import {
  decodeWireProphet,
  WIRE_PROPHET_CMD,
  wireProphetNote,
  WireProphetLucky,
  WireProphetMark,
  WireProphetSnapshot,
} from "./protocol/wireProphet";
import {
  decodeWireJewel,
  WIRE_JEWEL_CMD,
  wireJewelNote,
  WireJewelHero,
  WireJewelMark,
  WireJewelPiece,
  WireJewelSnapshot,
} from "./protocol/wireJewel";
import {
  decodeWireIllustrat,
  WIRE_ILLUSTRAT_CMD,
  wireIllustratNote,
  WireIllustratMark,
  WireIllustratRow,
  WireIllustratSnapshot,
} from "./protocol/wireIllustrat";
import {
  decodeWirePet,
  WIRE_PET_CMD,
  wirePetNote,
  WirePetMark,
  WirePetRow,
  WirePetSnapshot,
} from "./protocol/wirePet";
import {
  decodeWireWorld,
  WIRE_WORLD_CMD,
  wireWorldNote,
  WireWorldMark,
  WireWorldSnapshot,
} from "./protocol/wireWorld";
import {
  decodeWirePromotion,
  WIRE_PROMOTION_CMD,
  wirePromotionNote,
  WirePromotionMark,
  WirePromotionRecord,
  WirePromotionSnapshot,
} from "./protocol/wirePromotion";
import {
  decodeWireFirstRecharge,
  WIRE_FIRST_CMD,
  wireFirstNote,
  WireFirstRechargeMark,
  WireFirstRechargeReward,
  WireFirstRechargeSnapshot,
} from "./protocol/wireFirstRecharge";
import {
  decodeWireReiki,
  WIRE_REIKI_CMD,
  wireReikiNote,
  WireReikiMark,
  WireReikiRow,
  WireReikiSnapshot,
} from "./protocol/wireReiki";
import {
  decodeWireIslands,
  WIRE_ISLANDS_CMD,
  wireIslandsNote,
  WireIslandsMark,
  WireIslandsSnapshot,
} from "./protocol/wireFloatingIslands";
import {
  decodeWireTotems,
  WIRE_TOTEMS_CMD,
  wireTotemsNote,
  WireTotemsMark,
  WireTotemsRow,
  WireTotemsSnapshot,
} from "./protocol/wireTotems";
import {
  decodeWireAstrolabe,
  WIRE_ASTROLABE_CMD,
  wireAstrolabeNote,
  WireAstrolabeActive,
  WireAstrolabeMark,
  WireAstrolabeSnapshot,
} from "./protocol/wireAstrolabe";
import {
  decodeWireTweakCube,
  WIRE_CUBE_CMD,
  wireTweakCubeNote,
  WireCubeMark,
  WireCubeSnapshot,
  WireCubeTrench,
} from "./protocol/wireTweakCube";
import {
  decodeWireDragon,
  WIRE_DRAGON_CMD,
  wireDragonNote,
  WireDragonIdentity,
  WireDragonMark,
  WireDragonSlot,
  WireDragonSnapshot,
} from "./protocol/wireDragon";
import {
  decodeWireDragonCollection,
  WIRE_DRAGON_COLLECTION_CMD,
  wireDragonCollectionNote,
  WireDragonCollectionMark,
  WireDragonCollectionSnapshot,
} from "./protocol/wireDragonCollection";
import {
  decodeWireTitle,
  WIRE_TITLE_CMD,
  wireTitleNote,
  WireTitleMark,
  WireTitleRow,
  WireTitleSnapshot,
} from "./protocol/wireTitle";
import {
  decodeWireHeadPortrait,
  WIRE_HEAD_PORTRAIT_CMD,
  wireHeadPortraitNote,
  WireHeadPortraitMark,
  WireHeadPortraitSnapshot,
} from "./protocol/wireHeadPortrait";
import {
  decodeWireBorder,
  WIRE_BORDER_CMD,
  wireBorderNote,
  WireBorderMark,
  WireBorderSnapshot,
  WireBorderUnit,
} from "./protocol/wireBorder";
import {
  decodeWireFashion,
  WIRE_FASHION_CMD,
  wireFashionNote,
  WireFashionMark,
  WireFashionRow,
  WireFashionSnapshot,
} from "./protocol/wireFashion";
import {
  decodeWireWornFashion,
  WIRE_WORN_FASHION_CMD,
  wireWornFashionNote,
  WireWornFashionMark,
  WireWornFashionRow,
  WireWornFashionSnapshot,
} from "./protocol/wireWornFashion";
import {
  decodeWireHeroPrayer,
  WIRE_HERO_PRAYER_CMD,
  wireHeroPrayerNote,
  WireHeroPrayerMark,
  WireHeroPrayerSnapshot,
} from "./protocol/wireHeroPrayer";
import {
  decodeWirePetIllustrate,
  WIRE_PET_ILLUSTRATE_CMD,
  wirePetIllustrateNote,
  WirePetIllustrateMark,
  WirePetIllustrateSnapshot,
} from "./protocol/wirePetIllustrate";
import {
  decodeWireFetter,
  WIRE_FETTER_CMD,
  wireFetterNote,
  WireFetterGoddess,
  WireFetterMark,
  WireFetterSnapshot,
} from "./protocol/wireFetter";
import {
  decodeWireFetterFashion,
  WIRE_FETTER_FASHION_CMD,
  wireFetterFashionNote,
  WireFetterFashionMark,
  WireFetterFashionSnapshot,
} from "./protocol/wireFetterFashion";
import {
  decodeWireShenBin,
  WIRE_SHENBIN_CMD,
  wireShenBinNote,
  WireShenBinEquip,
  WireShenBinHole,
  WireShenBinInfo,
  WireShenBinMark,
  WireShenBinSnapshot,
} from "./protocol/wireShenBin";
import {
  decodeWireOccupation,
  WIRE_OCCUPATION_CMD,
  wireOccupationNote,
  WireOccupationInfo,
  WireOccupationMark,
  WireOccupationSnapshot,
  WireOccupationTask,
} from "./protocol/wireOccupation";
import {
  decodeWireRoleShenBin,
  WIRE_ROLE_SHENBIN_CMD,
  wireRoleShenBinNote,
  WireRoleShenBinItem,
  WireRoleShenBinMark,
  WireRoleShenBinSnapshot,
} from "./protocol/wireRoleShenBin";
import {
  decodeWireFetterContract,
  WIRE_FETTER_CONTRACT_CMD,
  wireFetterContractNote,
  WireFetterContractMark,
  WireFetterContractSnapshot,
} from "./protocol/wireFetterContract";
import {
  decodeWireFormation,
  WIRE_FORMATION_CMD,
  wireFormationNote,
  WireFormationMark,
  WireFormationSnapshot,
} from "./protocol/wireFormation";
import {
  decodeWireLineUp,
  WIRE_LINEUP_CMD,
  wireLineUpNote,
  WireLineUpMark,
  WireLineUpRow,
  WireLineUpSnapshot,
} from "./protocol/wireLineUp";
import {
  decodeWireRunningPromotion,
  WIRE_RUNNING_PROMOTION_CMD,
  wireRunningPromotionNote,
  WireRunningPromotionMark,
  WireRunningPromotionRow,
  WireRunningPromotionSnapshot,
} from "./protocol/wireRunningPromotion";
import {
  decodeWireTowerReward,
  WIRE_TOWER_REWARD_CMD,
  wireTowerRewardNote,
  WireTowerRewardMark,
  WireTowerRewardSnapshot,
} from "./protocol/wireTowerReward";
import {
  decodeWireHeroLevelResetTimes,
  WIRE_HERO_LEVEL_RESET_TIMES_CMD,
  wireHeroLevelResetTimesNote,
  WireHeroLevelResetTimesMark,
  WireHeroLevelResetTimesSnapshot,
} from "./protocol/wireHeroLevelResetTimes";
import {
  decodeWireSignInList,
  WIRE_SIGN_IN_LIST_CMD,
  wireSignInListNote,
  WireSignInListMark,
  WireSignInListSnapshot,
} from "./protocol/wireSignInList";
import {
  decodeWireDailyTaskList,
  WIRE_DAILY_TASK_LIST_CMD,
  wireDailyTaskListNote,
  WireDailyTaskListSnapshot,
  WireDailyTaskMark,
  WireDailyTaskRow,
} from "./protocol/wireDailyTaskList";
import {
  decodeWireDailyWelfareList,
  WIRE_DAILY_WELFARE_LIST_CMD,
  wireDailyWelfareListNote,
  WireDailyWelfareListSnapshot,
  WireDailyWelfareMark,
  WireDailyWelfareRow,
} from "./protocol/wireDailyWelfareList";
import {
  decodeWireMouthWelfareList,
  WIRE_MOUTH_WELFARE_LIST_CMD,
  wireMouthWelfareListNote,
  WireMouthWelfareListSnapshot,
  WireMouthWelfareMark,
  WireMouthWelfareRow,
} from "./protocol/wireMouthWelfareList";
import {
  decodeWireWeekendGift,
  WIRE_WEEKEND_GIFT_CMD,
  wireWeekendGiftNote,
  WireWeekendGiftMark,
  WireWeekendGiftRow,
  WireWeekendGiftSnapshot,
} from "./protocol/wireWeekendGift";
import {
  decodeWireGodRelic,
  WIRE_GOD_RELIC_CMD,
  wireGodRelicNote,
  WireGodRelicMapEntry,
  WireGodRelicMark,
  WireGodRelicReward,
  WireGodRelicSnapshot,
} from "./protocol/wireGodRelic";
import {
  decodeWireHeroPalace,
  WIRE_HERO_PALACE_CMD,
  wireHeroPalaceNote,
  WireHeroPalaceMark,
  WireHeroPalaceRole,
  WireHeroPalaceRow,
  WireHeroPalaceSnapshot,
} from "./protocol/wireHeroPalace";
import {
  decodeWireRechargeDaysB,
  WIRE_RECHARGE_DAYS_B_CMD,
  wireRechargeDaysBNote,
  WireRechargeDaysBMark,
  WireRechargeDaysBRow,
  WireRechargeDaysBSnapshot,
} from "./protocol/wireRechargeDaysB";
import {
  decodeWireTimeTower,
  WIRE_TIME_TOWER_CMD,
  wireTimeTowerNote,
  WireTimeTowerMark,
  WireTimeTowerSnapshot,
} from "./protocol/wireTimeTower";
import {
  decodeWireSpaceTimeAdventure,
  WIRE_SPACE_TIME_ADVENTURE_CMD,
  wireSpaceTimeAdventureNote,
  WireSpaceTimeAdventureMark,
  WireSpaceTimeAdventurePiece,
  WireSpaceTimeAdventureSnapshot,
} from "./protocol/wireSpaceTimeAdventure";
import {
  decodeWireMagicTowerRoad,
  WIRE_MAGIC_TOWER_ROAD_CMD,
  wireMagicTowerRoadNote,
  WireMagicTowerRoadMark,
  WireMagicTowerRoadPiece,
  WireMagicTowerRoadSnapshot,
} from "./protocol/wireMagicTowerRoad";
import {
  decodeWireQiShenQi,
  WIRE_QI_SHEN_QI_CMD,
  wireQiShenQiNote,
  WireQiShenQiBuy,
  WireQiShenQiMark,
  WireQiShenQiSnapshot,
} from "./protocol/wireQiShenQi";
import {
  decodeWireZhuShenJiTan,
  WIRE_ZHU_SHEN_JI_TAN_CMD,
  wireZhuShenJiTanNote,
  WireZhuShenJiTanMark,
  WireZhuShenJiTanSnapshot,
} from "./protocol/wireZhuShenJiTan";
import {
  decodeWireMidFood,
  WIRE_MID_FOOD_CMD,
  wireMidFoodNote,
  WireMidFoodBuy,
  WireMidFoodMark,
  WireMidFoodSnapshot,
} from "./protocol/wireMidFood";
import {
  decodeWireQiuShangMingYue,
  WIRE_QIU_SHANG_MING_YUE_CMD,
  wireQiuShangMingYueNote,
  WireQiuShangMingYueMark,
  WireQiuShangMingYuePiece,
  WireQiuShangMingYueSnapshot,
} from "./protocol/wireQiuShangMingYue";
import {
  decodeWireWanShengLottery,
  WIRE_WAN_SHENG_LOTTERY_CMD,
  wireWanShengLotteryNote,
  WireWanShengLotteryMark,
  WireWanShengLotteryPiece,
  WireWanShengLotterySnapshot,
} from "./protocol/wireWanShengLottery";
import {
  decodeWireChristmasGift,
  WIRE_CHRISTMAS_GIFT_CMD,
  wireChristmasGiftNote,
  WireChristmasGiftBuy,
  WireChristmasGiftMark,
  WireChristmasGiftSnapshot,
} from "./protocol/wireChristmasGift";
import {
  decodeWireSpringOuting,
  WIRE_SPRING_OUTING_CMD,
  wireSpringOutingNote,
  WireSpringOutingMark,
  WireSpringOutingPiece,
  WireSpringOutingSnapshot,
} from "./protocol/wireSpringOuting";
import {
  decodeWireChristmasMission,
  WIRE_CHRISTMAS_MISSION_CMD,
  wireChristmasMissionNote,
  WireChristmasMissionMark,
  WireChristmasMissionPiece,
  WireChristmasMissionSnapshot,
} from "./protocol/wireChristmasMission";
import {
  decodeWireMagicTowerLevelRank,
  WIRE_MAGIC_TOWER_LEVEL_RANK_CMD,
  wireMagicTowerLevelRankNote,
  WireMagicTowerLevelRankMark,
  WireMagicTowerLevelRankRow,
  WireMagicTowerLevelRankSnapshot,
} from "./protocol/wireMagicTowerLevelRank";
import {
  decodeWireSpringOutingGrid,
  WIRE_SPRING_OUTING_GRID_CMD,
  wireSpringOutingGridNote,
  WireSpringOutingGridMark,
  WireSpringOutingGridPiece,
  WireSpringOutingGridSnapshot,
} from "./protocol/wireSpringOutingGrid";
import {
  decodeWireHeiWuMission,
  WIRE_HEI_WU_MISSION_CMD,
  wireHeiWuMissionNote,
  WireHeiWuMissionMark,
  WireHeiWuMissionPiece,
  WireHeiWuMissionSnapshot,
} from "./protocol/wireHeiWuMission";
import { wireBody } from "./protocol/wireLogin";

/**
 * ?transport=ws 登录进主城后，这条 NetClient 要活过 Boot 切场景。
 * 心跳 1004 继续发。
 * 连上就听 wire.2001、wire.5001、wire.5002、wire.3007、wire.3001、wire.3010、wire.3012、wire.3006、wire.3102、wire.3103、wire.3030、wire.3004、wire.3005、wire.15000、wire.4001、wire.17000、wire.12010、wire.18001、wire.22000、wire.22002、wire.21010、wire.21013、wire.27001、wire.4004、wire.13044、wire.4101、wire.4013、wire.74100、wire.51001、wire.20001、wire.20012、wire.70001、wire.73001、wire.74300、wire.68001、wire.75501、wire.59001、wire.59010、wire.55001、wire.34001、wire.32001 、wire.4402、wire.4401、wire.4201、wire.74104、wire.28100、wire.28200、wire.75601、wire.75606、wire.75615、wire.28107 、wire.3099、wire.3101、wire.20101 、wire.3203 、wire.4044 、wire.13010 、wire.12020 、wire.26002 和 wire.26001。
 * 登录成功后先发空的 c2s 2001（日志里的拉角色资料）。pullRoleProfile 紧接着发空的 c2s 5001。
 * Boot 不改，随后仍是空的 c2s 3007，再发空的 c2s 3004。pullIdle 在 3004 之后再发空的 c2s 15000，然后 c2s 4001 page=1，再发空的 c2s 17000，再发空的 c2s 12010，再发空的 c2s 18001，再发空的 c2s 22000，再发空的 c2s 21010，再发空的 c2s 27001，再发空的 c2s 4004，再发空的 c2s 13044，再发空的 c2s 4101，再发空的 c2s 4013，再发空的 c2s 74100，再发空的 c2s 51001，再发空的 c2s 20001，再发空的 c2s 20012，再发空的 c2s 70001，再发空的 c2s 73001，再发空的 c2s 74300，再发空的 c2s 68001，再发空的 c2s 75501，再发空的 c2s 59001，再发空的 c2s 59010，再发空的 c2s 55001，再发空的 c2s 34001，再发空的 c2s 32001，再发空的 c2s 4402，再发空的 c2s 4401，再发空的 c2s 4201，再发空的 c2s 74104，再发空的 c2s 28100，再发空的 c2s 28200，再发空的 c2s 75601，再发空的 c2s 75606，再发空的 c2s 75615，再发空的 c2s 28107，再发空的 c2s 3099，再发空的 c2s 3101，再发空的 c2s 20101，再发空的 c2s 3203，再发空的 c2s 4044，再发空的 c2s 13010，再发空的 c2s 12020，再发空的 c2s 26002，再发空的 c2s 26001。
 * 相对顺序是 2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。不等 s2c 2001。51001 在 74100 之后发一次，20001 接在 51001 之后，20012 接在 20001 之后，70001 接在 20012 之后，73001 接在 70001 之后，74300 接在 73001 之后，68001 接在 74300 之后，75501 接在 68001 之后，59001 接在 75501 之后，59010 接在 59001 之后，55001 接在 59010 之后，34001 接在 55001 之后，32001 接在 34001 之后，4402 接在 32001 之后，4401 接在 4402 之后，4201 接在 4401 之后，74104 接在 4201 之后，28100 接在 74104 之后，28200 接在 28100 之后，75601 接在 28200 之后，75606 接在 75601 之后，75615 接在 75606 之后，28107 接在 75615 之后，3099 接在 28107 之后，3101 接在 3099 之后，20101 接在 3101 之后，3203 接在 20101 之后，4044 接在 3203 之后，13010 接在 4044 之后，12020 接在 13010 之后，26002 接在 12020 之后，26001 接在 26002 之后。不夹在 2001 和 3007 中间。11005、58017 仍不发。不做 3007 的加发。
 * 不发 5010，也不发 5004–5009、5011–5013。不发邮件领取、已读、删除。不发英雄升级。空 c2s 20001 只读，不发 20018，不发 20004、20010。空 c2s 20012 只读，不发 20013，不做 13260。空 c2s 70001 只读，不发 70002、70003、70004、70005、70006。70007、70008 仅推送，不当拉包请求。不做 20011。空 c2s 73001 只读，不发 73002、73003、73004。73002 有懒建和日刷写库，不当纯只读。本号无写库。不做 20011。空 c2s 74300 只读，不发 74301 升级/升阶、74302 装备/卸/换、74303 重置。74304 是推送，勿发、勿当拉包。本号无写库。不做 20011。与 74100 同城养成段。空 c2s 68001 只读，无 page。不发 68002 激活元素、68003 点亮星盘、68004 重置、68006 激活星盘。68005 是更新星数常量，勿当拉包。轻懒建，首次 load 可能 astrolabeDao.add 空行，无扣费、无领奖、无日刷写库，管理员认定可接受。不做 20011。空 c2s 75501 只读，无 page。不发 75502 添加、75503 卸下、75504 开格子、75505 清 cd。75506 是等级推送，勿当拉包。轻懒建，首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉，无扣费、无领奖，管理员认定可接受，同星盘。不做 34001。不做 20011。空 c2s 59001 只读，无 page。handler scanDragonInfo 不读 msg。不发 59002 放源石、59003 提升鉴定、59005 加速鉴定、59006 鉴定领奖、59007 提升圣龙等级、59008 圣物替换、59009 调顺序、59011、59012 升星、59013 分解。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。轻懒建，首次 dragonDao.add。无扣费，无领奖。不做 34001。不做 20011。空 c2s 55001 只读，无 page。Title.proto 仅 55001 读写对，同模块无写号。轻懒建，TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。34001 是另只读，单独在 55001 之后拉包，勿与 55001 合并。不发 34002。34003 是解锁推送，勿发、勿当拉包。32001 另只读接在其后。不做 20011。34001 只读，无 page。轻懒建，RoleHeadPortraitService.select 无记录则 dao.add 默认解锁头。无扣费，无领奖，不改当前头像。不点金。不发 12020，不领奖。不发 18002、18003、18005、18007、18008。不发 22001。22002 只收。不发 21011、21012。21013 只收。不发 27002、27003、27004。4201 是英雄祈愿空体，接在 4401 之后。不发 4202。74104 另只读接在其后，勿合并。不发 4002、4005。不做 58001、58007。4004 不是 4001。不发 13041、13042、13043。13044 不是 4004。不发 4102、4103、4104、4105、4106、4107。不做 9001。4101 不是 4001，也不是 13044。不发 4014。4014 仅 s2c 推送。不把 4013 当领奖再发写号。4013 不是 4001，也不是 4101。不发 74101 升级、74102 携带、74103 卸下。74105、74106 仅 s2c 推送，不主动发。74100 不是 4001，也不是 4013。51001 无写操作号。20101 是进行中活动，另帧挂在 3101 之后，不发 20102。空 c2s 4402 只读，无 page。GReqHeroFashionList 空体。不发 4403 激活、4404 替换/使用、4405 皮肤升级。4406 无实现，勿发。4401 穿戴皮肤英雄列表另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。过期限时皮剔除，并可能把英雄 fashionId 置 0。只读展示。无扣费，无领奖。挂在 32001 之后。
 * s2c 2001 按 Role.proto：字段 9 角色名、字段 6 等级、字段 2 金币、字段 1 宝石（顶栏钻石）。
 * s2c 3007 按 Battle.proto：字段 2 now_idx、字段 3 max_idx。缺的 idx 不写成 0。字段 1 res_reward_time 和字段 4 extra_reward_id 只在主线页探针展示，不写进按钮。
 * 不写 Session.stageId，主城按钮用 mainlineLabel()。
 * 至少有一个 idx 时点按钮打开只读代码页；两个都没有仍 Toast。
 * 不打开 Mock 关卡页，不发 3002。3010 是主线页只读已领首通，挂在已合 3001 之后，不进 pullIdle，不重发 3001。3012 是主线页只读快速战斗次数，挂在 3010 之后，不进 pullIdle，不重发 3010、3001。硬禁 3013。3006 是主线页挂机战报，挂在 3012 之后，点按钮才发，不进 pullIdle，不发 3005，胜了不回拉 3007。3102 是主线页请求战报，挂在 3006 之后，点按钮才发，不进 pullIdle，不从 3001 或 3006 自动接。纯读 getReport，无领奖，无扣费。3001/3006 的 battle_id 常回 BATTLE_REPORT_TIMEOUT。3103 是主线页预计算战斗力，挂在 3102 之后，点按钮才发，不进 pullIdle，不从 3102 自动接。只计算，不开战，不落库。空 hero_ids 回 fighting=0 仍是成功。不播 spine。3030 是主线页切磋，点按钮才发，不进 pullIdle。开战 STUDY 并落库。无领奖，无扣钻，不推进 chapterId。不从本帧自动发 3102。3007 空壳探针在主线页点「关卡数据」再发同一空帧，挂在已合 3001 / 3010 / 3012 之后、进战之前。只读 RoleMission。不落库，无扣费，不推进 chapterId。不进 pullIdle。3004 空壳探针在主线页点「挂机奖励」再发同一空帧，挂在已合 3006 之后。只读 GResChapterItemList 的 reward_time、max_reward_time。不领取，不落库，无扣费，不推进 chapterId。不从 3006 自动接。不进 pullIdle。3101 空壳探针在主线页点「获取阵容」再发同一空帧，挂在已合 3007 之后、进战之前，和 3102、3103、3030 探针并排。只读 GResLineUp 的 list、assistance_unlock。不落库，无扣费，不改阵容。不从 3001、3102、3103、3030 自动接。不进 pullIdle。不发 3100。不接 3020。3099 空壳探针在主线页点「查询阵法」再发同一空帧，挂在已合 3101 旁边、已合 3007 之后、进战之前。只读 GResQueryFormation 的 unlockIds。不落库，无扣费，不改阵法。不从 3001、3101、3102、3103、3030 自动接。不进 pullIdle。不发 3098。不发 3100。不接 3020。
 * s2c 3004 按 Battle.proto：字段 1 reward_time、字段 2 max_reward_time。缺的不写成 0。主线页「挂机奖励」展示这两项。
 * s2c 3101 按 GResLineUp：字段 1 list、字段 2 assistance_unlock。缺的不写成 0。主线页「获取阵容」展示这两项。登录链里的空 3101 仍在。
 * s2c 3099 按 GResQueryFormation：字段 1 unlockIds。缺的不写成 0。主线页「查询阵法」展示这一项。登录链里的空 3099 仍在。
 * 不写 Session.gold。挂机页用 rewardTime / maxRewardTime。没有这两项时主城挂机只 Toast。
 * s2c 3005 只改 reward_time。没有奖励清单，不改金币和钻石。
 * s2c 5001 按 GResBackPackList 替换本地背包。空包体是已同步的空背包。
 * 从未收到 5001 时主城背包只 Toast，不打开 Mock 背包页。
 * s2c 5002 在已经有列表之后合并：num > 0 加上，num = 0 删掉该格。type 只记日志，不弹窗。
 * 背包、5002、5010、50000 都不写顶栏。钱包只认 s2c 2001 的金币和宝石。
 * s2c 15000 替换本地邮件列表。空包体是已同步的空邮箱。
 * 从未收到 15000 时主城邮件只 Toast，不打开 Mock 邮件页。
 * 字段 3、字段 4 只记日志，不当成已读或未读。不领取，不删除，不写顶栏。
 * s2c 4001 在 send_status=1（或翻页停下）后替换本地英雄名册。字段 3 长度为 0 是已同步的空名册。空体不是。
 * send_status=0 时接着发下一页，未收齐前不替换名册。
 * 从未收到 4001 时主城英雄只 Toast，不打开 Mock 英雄页。
 * 不升级，不写顶栏。类型对不上 CHeroType 就写类型号。
 * s2c 17000 替换本地点金记录。空包体、以及 list 为 0 条，都是已同步的空表。
 * 按 GResBuyGoldLog 写 status、time 和 idx / num。time 不推开服天。
 * 从未收到 17000 时主城「点金」只 Toast。不从七日登录进入，也不打开 Mock 七日登录。
 * 不点金，不写顶栏。占位 login7.* 仍是 2201–2203。
 * s2c 12010 替换本地成就记录。空包体和 task 为 0 条都是空成就表。
 * 按 PSTaskData 写 idx / process / state。同步可能在服上补成就。不领奖，不改 state。
 * 从未收到 12010 时主城「成就记录」只 Toast，不回落 Mock。
 * s2c 18001 替换本地竞技场。空包体、以及 list 为 0 条，都是已同步的空对手表。
 * 按 GResPvpData 写 free_count、score、season_end_time、like_rids、season_count、season_reward。
 * 对手名字用 PSRankPlayerData.name。score 不写金币。对手空时服可能补名单。
 * 从未收到 18001 时玩法「竞技场」只 Toast，不打开 Mock 竞技场。不挑战，不扣次。
 * s2c 22000 替换本地七日登录。空包体、以及 list 为 0 条，都是已同步的空表。
 * 按 GResSevenDayLoginData 写 end_time、cur_day。行上写 PSSevenLoginStatus 的 idx、status。
 * status 0 是未领，1 是已领。空领奖表仍带 cur_day / end_time，逐日 status=0，不是未同步。
 * 22000 无写库，无自动领奖。不发 22001，不写金币。
 * s2c 22002 只在已经有 22000 时改 cur_day。单独先到不算同步。不是 c2s。
 * 从未收到 22000 时「七日登录」只 Toast，不打开 Mock 七日登录。占位 login7.* 仍是 2201–2203。
 * s2c 21010 替换本地七日目标。空包体、以及 task 为 0 条，都是已同步的空表。
 * 按 GResSevenDayTargetList 写 curr_day、seven_day_value、reward_box_idx。行上写 PSTaskData 的 idx、process、state。
 * state 0 是未领，1 是已领。空表外层仍带 seven_day_value / curr_day，不是未同步。
 * 首次拉取可能建档并懒填计数。不发奖。不发 21011、21012，不写金币。
 * s2c 21013 只收，不改这份表，也不算同步。不是 c2s。
 * 从未收到 21010 时「七日目标」只 Toast，不打开 Mock 七日目标。不从七日登录或点金进入。占位 goal7.* 仍是 2301 / 2302。
 * s2c 27001 替换本地许愿池。空包体、以及 blessing_data 为 0 条，都是已同步的空表。
 * 按 GResBlessingPoolList 写 type、refresh_times、lucky_value、lucky_reward_id、refresh_time。格子写 position、times。item 对得上才写名字，对不上写字段号。
 * 可能懒建或跨日写库，无扣费。不刷新，不抽奖，不领幸运奖。不写金币，不写钻石。
 * 从未收到 27001 时玩法「许愿池」只 Toast，不打开 Mock 许愿池。占位 wish.* 仍是 2501 / 2502。备选 4201 不发。
 * s2c 4004 替换本地召唤次数。空包体是已同步。按 GResHeroSummonCount 写 free_time、senior_free_time。没有的数不写成 0。
 * 可能懒建 HeroSummon。无 page。不召唤，不领累积奖。不写金币，不写钻石。英雄列表仍是 4001。
 * 从未收到 4004 时底栏「召唤」和七日目标的前往只 Toast，不打开 Mock 召唤。占位 summon.pull 仍是 1501。不发 4002、4005。不做 58001、58007。
 * s2c 13044 替换本地先知召唤幸运值。空包体、以及 luckys 为 0 条，都是已同步的空表。
 * 按 GResProphetSummonInfo 写 PSProphetLucky 的 type、lucky。没有的数不写成 0。
 * 可能懒建 HeroSummon。跨日可能重置 levelResetTimes。不抽，不置换，不确认置换。不写金币，不写钻石。召唤次数仍是 4004。
 * 从未收到 13044 时主城「先知召唤」只 Toast，不打开 Mock 召唤。不发 13041、13042、13043。不做 58007、4201。
 * s2c 4101 替换本地英雄宝石。空包体、以及 jewel_list 为 0 条，都是已同步的空表。
 * 按 GResHeroJewel 写 PSHeroJewelData 的 hero_id，以及 PSJewelData 的 jewel_id、place、jewel_type。没有的数不写成 0。
 * 无写库。无 page。空体安全。不替换，不卸下，不一键穿，不一键卸，不合成。不写金币，不写钻石。英雄列表仍是 4001。
 * 从未收到 4101 时主城「英雄宝石」只 Toast，不回落 Mock。不发 4102、4103、4104、4105、4106、4107。不做 9001。
 * s2c 4013 替换本地英雄图鉴。空包体、以及 list 为 0 条，都是已同步的空表。
 * 按 GResIllustratReward 写 ResIllustratRewardData 的 hero_type、star。没有的数不写成 0。
 * 名字像领奖，实为查看。空体安全。无档时服端可能懒建空记录，可接受。不写金币，不写钻石。英雄列表仍是 4001。英雄宝石仍是 4101。
 * 从未收到 4013 时主城「英雄图鉴」只 Toast，不回落 Mock。不发 4014。不把 4013 当领奖再发写号。
 * s2c 74100 替换本地宠物信息。空包体、以及 list 为 0 条，都是已同步的空表。空 list 仍可以是非空外层。
 * 按 GResPetInfoList 写 PSPetInfo 的 pet_id、sys_id、hero_id、level。没有的数不写成 0。
 * 无写库。空体安全。不升级，不携带，不卸下。不写金币，不写钻石。英雄列表仍是 4001。英雄图鉴仍是 4013。
 * 从未收到 74100 时主城「宠物信息」只 Toast，不回落 Mock。不发 74101、74102、74103。不主动发 74105、74106。
 * s2c 51001 替换本地世界等级。空包体是已同步，level 保持缺省，不写成 0。出现的 0 仍写 0。
 * 按 GResWorldLevel 写字段 1 level（int64）。对不上的号按字段号写。无写库。空体安全。
 * 只在 pullIdle 链尾、空 c2s 74100 之后发一次。不夹在 2001 和 3007 中间。不做 20101。不写金币，不写钻石。
 * 从未收到 51001 时主城「世界等级」只 Toast，不回落 Mock。
 * s2c 20001 替换本地基金列表。空包体是已同步，is_buy_foundation 保持缺省，不写成 0。记录为空写「空记录」。
 * 按 GResPromotionList 写字段 1 is_buy_foundation，字段 2 foundation_reward_record（PSMapData 的 key、value）。没有的数不写成 0。
 * 只在 pullIdle 链尾、空 c2s 51001 之后发一次。不发 20018。不发 20004、20010。不做 3007。不写金币，不写钻石。
 * 从未收到 20001 时主城「基金列表」只 Toast，不回落 Mock。
 * s2c 20012 替换本地超值首充记录。空包体是已同步，recharge 保持缺省，不写成 0。已领 idx 为空不写成 0。can_reward 为空写「空记录」。
 * 按 GResFirstRecharge 写字段 1 recharge，字段 2 list（已领 idx），字段 3 can_reward（PSMapData 的 key 是档位，value 0 可领、1 不可）。没有的数不写成 0。
 * 只在 pullIdle 链尾、空 c2s 20001 之后发一次。不发 20013。不做 13260。不写金币，不写钻石。
 * 从未收到 20012 时主城「超值首充」只 Toast，不回落 Mock。
 * s2c 70001 替换本地灵器数据。空包体是已同步，list 为空写「空列表」，不写成 0。
 * 按 GResReikiEquipData 写字段 1 list（PSReikiEquipData 的 hero_id、sys_id、reiki_equip_id）。没有的数不写成 0。
 * 只在 pullIdle 链尾、空 c2s 20012 之后发一次。不发 70002、70003、70004、70005、70006。70007、70008 仅推送，不当拉包请求。不做 20011。不写金币，不写钻石。
 * 从未收到 70001 时主城「灵器数据」只 Toast，不回落 Mock。
 * s2c 73001 替换本地浮空岛时间。空包体是已同步，next_time 和 stage 保持缺省，不写成 0。出现的 0 仍写 0。
 * 按 GResFloatingIslandsTime 写字段 2 next_time、字段 3 stage。没有的数不写成 0。不补字段 1。
 * 只在 pullIdle 链尾、空 c2s 70001 之后发一次。不发 73002、73003、73004。73002 有懒建和日刷写库，不当纯只读。本号无写库。不做 20011。不写金币，不写钻石。
 * 从未收到 73001 时主城「浮空岛时间」只 Toast，不回落 Mock。
 * s2c 74300 替换本地图腾信息。空包体、以及 list 为 0 条，都是已同步的空表。空 list 仍可以是非空外层。
 * 按 GResTotemsInfoList 写字段 1 list（PSTotemsInfo 的 t_id、sys_id、hero_id、level、quality）。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 73001 之后发一次。不发 74301、74302、74303。74304 仅推送，勿发、勿当拉包。本号无写库。不做 20011。不写金币，不写钻石。与 74100 同城养成段。
 * 从未收到 74300 时主城「图腾信息」只 Toast，不回落 Mock。
 * s2c 68001 替换本地星盘数据。空包体是已同步，maxStar 和 activeAstrolabe 保持缺省，不写成 0。active 为空写「空记录」。activeElem 为空不写成 0。
 * 按 GResAstrolabeData 写字段 1 maxStar，字段 2 active（PSMapData 的 key、value），字段 3 activeElem，字段 4 activeAstrolabe。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 74300 之后发一次。无 page。不发 68002、68003、68004、68006。68005 是更新星数常量，勿发、勿当拉包。轻懒建，首次 load 可能 astrolabeDao.add 空行。无扣费，无领奖，无日刷写库。管理员认定可接受。不做 20011。不写金币，不写钻石。
 * 从未收到 68001 时主城「星盘数据」只 Toast，不回落 Mock。
 * s2c 75501 替换本地魔方数据。空包体是已同步，open_count 保持缺省，不写成 0。rank_hero 为空不写成 0。trench 为空写「空槽」。
 * 按 GResTweakCube 写字段 1 rank_hero（repeated int64），字段 2 open_count，字段 3 trench（PSTrench 的 index、hero_id、last_change_time）。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 68001 之后发一次。无 page。不发 75502、75503、75504、75505。75506 是等级推送，勿发、勿当拉包。轻懒建，首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉。无扣费，无领奖。管理员认定可接受，同星盘。不做 34001。不做 20011。不写金币，不写钻石。
 * 从未收到 75501 时主城「魔方数据」只 Toast，不回落 Mock。
 * s2c 59001 替换本地圣龙数据。空包体是已同步，identify_level、attr_level、privilege_end_time 保持缺省，不写成 0。identities 为空写「空鉴定」。slots 为空写「空槽位」。
 * 按 GResDragonScanInfo 写字段 1 identify_level，字段 2 attr_level，字段 3 identities（type、start_time、level、speed_add），字段 4 slots（id、sys_id），字段 5 privilege_end_time。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 75501 之后发一次。无 page。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。轻懒建，首次 dragonDao.add。无扣费，无领奖。不做 34001。不做 20011。不写金币，不写钻石。
 * 从未收到 59001 时主城「圣龙数据」只 Toast，不回落 Mock。
 * s2c 59010 替换本地圣物图鉴。空包体是已同步，sys_id 为空写「空图鉴」，不写成 0。
 * 按 GResDragonCollection 写字段 1 repeated int32 sys_id（图鉴 manuals）。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 59001 之后发一次。无 page。handler 不读 msg。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。轻懒建，与 59001 同 getDragon / dragonDao.add。无扣费，无领奖。不做 34001。不做 20011。不写金币，不写钻石。
 * 从未收到 59010 时主城「圣物图鉴」只 Toast，不回落 Mock。59001 单独到不算。
 * s2c 55001 替换本地称号列表。空包体是已同步，titles 为空写「空称号」，不写成 0。
 * 按 GResScanTitleList 写字段 1 repeated PSTitle titles（idx、end_time）。end_time：-1 永久，0 未激活，时间戳为到期。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 59010 之后发一次。无 page。Title.proto 仅 55001 读写对，同模块无写号。轻懒建，TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。34001 另只读接在其后。不做 20011。不写金币，不写钻石。
 * 从未收到 55001 时主城「称号列表」只 Toast，不回落 Mock。59010 单独到不算。
 * s2c 34001 替换本地头像列表。空包体是已同步，idx_list 为空写「空头像」，不写成 0。
 * s2c 32001 替换本地头像框数据。空包体是已同步，units 为空写「空头像框」，不写成 0。
 * 按 GResBorderData 写字段 1 repeated PSBorderUnit units（id、active_state）。没有的数不写成 0。出现的 0 仍写 0。
 * 只在 pullIdle 链尾、空 c2s 34001 之后发一次。无 page。不发 32002 道具激活。不发 32003 使用/切换边框。32003 是服侧推送，当前框过期时服侧可能写 role.borderId 回落并另推，客户端不发、勿当拉包。轻懒建免费框可接受。4402 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。不写金币，不写钻石。
 * 从未收到 32001 时主城「头像框数据」只 Toast，不回落 Mock。34001 单独到不算。
 * 缺的顶栏字段不写，那个格子保持未同步。字段 5 是奖杯，不写进金币。开服天不推。
 * 别的 s2c 仍只记 wire.<cmdId>。解不开就忽略，不抛进拆帧循环。
 */
export class WireSession {
  static net: NetClient | null = null;

  /** s2c 3007 字段 2。没出现过是 null。 */
  static nowIdx: number | null = null;
  /** s2c 3007 字段 3。0 是服上的 0。没出现过是 null。 */
  static maxIdx: number | null = null;
  /** 最近一帧解开的 s2c 3007，给主线页「关卡数据」。null 表示还没收到。不写 Session.stageId。 */
  static chapterProbe: WireChapterProgress | null = null;
  /** 每记下一次关卡探针加一。主线页用来认领回包。3007 本身不落库。 */
  static chapterProbeSerial = 0;
  /** 最近一帧能解开的 s2c 3001。null 表示还没收到。空包体是已同步空表。 */
  static battleMatch: WireBattleMatch | null = null;
  /** 每处理一帧能解开的 s2c 3001 加一。主线页用来认领回包。 */
  static battleSerial = 0;
  /** 最近一帧能解开的 s2c 3010。null 表示还没收到。空包体是已同步空表。 */
  static chapterReward: WireChapterRewardSnapshot | null = null;
  /** 最近一帧能解开的 s2c 3012。null 表示还没收到。空包体是已同步空表。缺字段保持 null，不写成 0。 */
  static quickBattle: WireQuickBattleSnapshot | null = null;
  /** 最近一帧能解开的 s2c 3006。null 表示还没收到。空包体是已同步空表。缺字段保持 null，不写成 0。 */
  static chapterReport: WireChapterReportSnapshot | null = null;
  /** 每处理一帧能解开的 s2c 3006 加一。主线页用来认领回包。胜了不回拉 3007。 */
  static chapterReportSerial = 0;
  /** 最近一帧能解开的 s2c 3102。null 表示还没收到。空包体是已同步空表。缺字段保持 null。 */
  static battleReport: WireBattleReportSnapshot | null = null;
  /** 每处理一帧能解开的 s2c 3102 加一。主线页用来认领回包。胜了不回拉 3007。不从 3001 或 3006 自动接。 */
  static battleReportSerial = 0;
  /** 最近一帧能解开的 s2c 3103。null 表示还没收到。空包体是已同步。fighting=0 是服上的 0。 */
  static preCompute: WirePreComputeSnapshot | null = null;
  /** 每处理一帧能解开的 s2c 3103 加一。主线页用来认领回包。不播 spine。不从 3102 自动接。 */
  static preComputeSerial = 0;
  /** 最近一帧能解开的 s2c 3030。null 表示还没收到。空包体是已同步空表。缺字段保持 null。 */
  static study: WireStudySnapshot | null = null;
  /** 每处理一帧能解开的 s2c 3030 加一。主线页用来认领回包。胜了不回拉 3007。不自动发 3102。 */
  static studySerial = 0;
  /** 最近一帧 s2c 4030 里最后一只英雄的实例 id。null 表示还没有。不是类型号。 */
  static gmHeroId: number | null = null;
  /** 最近一帧 s2c 4030 里收到的实例。空数组表示还没有。 */
  static gmHeroIds: number[] = [];
  /** 每记下一次带实例的 s2c 4030 加一。主线页用来认领。坏包不加。 */
  static gmHeroSerial = 0;
  /** 每收到一帧空的 s2c 3100 加一。有包体不加，也不改 3101。 */
  static lineUpSaveSerial = 0;
  /**
   * 本会话空的 s2c 3100 已经确认 MAIN 写入。
   * 3101 快照不跟着改，空号挑战用它避免再发 2015。换号时清掉。
   */
  static mainLineReady = false;
  /** 最近一帧 s2c 1005 的说明。空字符串表示还没收到。 */
  static wireErrorText = "";
  /** 每收到一帧 s2c 1005 加一。主线页等 2015 / 3100 时用来 Toast。 */
  static wireErrorSerial = 0;
  /** s2c 3004 字段 1。0 是服上的 0。没出现过是 null。 */
  static rewardTime: number | null = null;
  /** 最近一帧解开的 s2c 3004，给主线页「挂机奖励」。null 表示还没收到。不写金币。 */
  static idleProbe: WireIdleSnapshot | null = null;
  /** 每记下一次挂机奖励探针加一。主线页用来认领回包。3004 本身不落库，不领取。 */
  static idleProbeSerial = 0;
  /** s2c 3004 字段 2。0 是服上的 0。没出现过是 null。 */
  static maxRewardTime: number | null = null;
  /** 每处理一帧 s2c 3005 加一。挂机页用来认领回包。 */
  static claimSerial = 0;
  /** 最近一帧 s2c 3005 的说明。不写金币。 */
  static claimNote = "";
  /**
   * s2c 5001 的整表。null 表示这次进主城还没收到 5001。
   * 空数组是已同步的空背包，不是未同步。
   * 缺的 item_id / item_type / num 留 null，不写成 0。
   */
  static bagItems: WireBagItem[] | null = null;
  /** 对不上 list 的外层字段。未同步时是空数组。 */
  static bagMarks: WireBagMark[] = [];
  /**
   * s2c 15000 的列表。null 表示这次进主城还没收到 15000。
   * 空数组是已同步的空邮箱，不是未同步。
   */
  static mailEntries: WireMailEntry[] | null = null;
  /**
   * 收齐的 s2c 4001 名册。null 表示这次进主城还没收到完整的 4001。
   * 空数组是已同步的空名册，不是未同步。
   */
  static heroes: WireHeroEntry[] | null = null;
  /** s2c 4001 的 hero_capacity。null 表示这包没带，界面退回 hero_space_initial。0 仍是 0。 */
  static heroCapacity: number | null = null;
  /**
   * 收齐的 s2c 17000。null 表示这次进主城还没收到 17000。
   * 空表是已同步，不是未同步。
   */
  static activity: WireActivitySnapshot | null = null;
  /**
   * 收到的 s2c 12010。null 表示这次进主城还没收到 12010。
   * 空 tasks 是已同步的空成就表，不是未同步。
   */
  static achievements: WireAchievementSnapshot | null = null;
  /**
   * 收到的 s2c 18001。null 表示这次进主城还没收到 18001。
   * 空 opponents 是已同步的空对手表，不是未同步。
   */
  static pvp: WirePvpSnapshot | null = null;
  /**
   * 收到的 s2c 22000。null 表示这次进主城还没收到 22000。
   * 空 rows 是已同步的空表，不是未同步。
   */
  static sevenDay: WireSevenDaySnapshot | null = null;
  /**
   * 收到的 s2c 21010。null 表示这次进主城还没收到 21010。
   * 空 tasks 是已同步的空表，不是未同步。
   */
  static goal7: WireGoal7Snapshot | null = null;
  /**
   * 收到的 s2c 27001。null 表示这次进主城还没收到 27001。
   * 空 pools 是已同步的空表，不是未同步。
   */
  static wish: WireWishSnapshot | null = null;
  /**
   * 收到的 s2c 4004。null 表示这次进主城还没收到 4004。
   * 两个次数都没有也是已同步，不是未同步。
   */
  static summon: WireSummonSnapshot | null = null;
  /**
   * 收到的 s2c 13044。null 表示这次进主城还没收到 13044。
   * 空 luckys 是已同步的空表，不是未同步。
   */
  static prophet: WireProphetSnapshot | null = null;
  /**
   * 收到的 s2c 4101。null 表示这次进主城还没收到 4101。
   * 空 heroes 是已同步的空表，不是未同步。
   */
  static jewel: WireJewelSnapshot | null = null;
  /**
   * 收到的 s2c 4013。null 表示这次进主城还没收到 4013。
   * 空 rows 是已同步的空表，不是未同步。
   */
  static illustrat: WireIllustratSnapshot | null = null;
  /**
   * 收到的 s2c 74100。null 表示这次进主城还没收到 74100。
   * 空 rows 是已同步的空表，不是未同步。
   */
  static pet: WirePetSnapshot | null = null;
  /**
   * 收到的 s2c 51001。null 表示这次进主城还没收到 51001。
   * 空包体是已同步，level 为 null，不是未同步，也不写成 0。
   */
  static world: WireWorldSnapshot | null = null;
  /**
   * 收到的 s2c 20001。null 表示这次进主城还没收到 20001。
   * 空包体是已同步，is_buy_foundation 为 null，记录为空，不是未同步，也不写成 0。
   */
  static promotion: WirePromotionSnapshot | null = null;
  /**
   * 收到的 s2c 20012。null 表示这次进主城还没收到 20012。
   * 空包体是已同步，recharge 为 null，已领 idx 和 can_reward 为空，不是未同步，也不写成 0。
   */
  static firstRecharge: WireFirstRechargeSnapshot | null = null;
  /**
   * 收到的 s2c 70001。null 表示这次进主城还没收到 70001。
   * 空包体是已同步，list 为空，不是未同步，也不写成 0。
   */
  static reiki: WireReikiSnapshot | null = null;
  /**
   * 收到的 s2c 73001。null 表示这次进主城还没收到 73001。
   * 空包体是已同步，next_time 和 stage 为 null，不是未同步，也不写成 0。
   */
  static islands: WireIslandsSnapshot | null = null;
  /**
   * 收到的 s2c 74300。null 表示这次进主城还没收到 74300。
   * 空 rows 是已同步的空表，不是未同步，也不写成 0。
   */
  static totems: WireTotemsSnapshot | null = null;
  /**
   * 收到的 s2c 68001。null 表示这次进主城还没收到 68001。
   * 空包体是已同步，maxStar 和 activeAstrolabe 为 null，active 与 activeElem 为空，不是未同步，也不写成 0。
   */
  static astrolabe: WireAstrolabeSnapshot | null = null;
  /**
   * 收到的 s2c 75501。null 表示这次进主城还没收到 75501。
   * 空包体是已同步，open_count 为 null，rank_hero 与 trench 为空，不是未同步，也不写成 0。
   */
  static tweakCube: WireCubeSnapshot | null = null;
  /**
   * 收到的 s2c 59001。null 表示这次进主城还没收到 59001。
   * 空包体是已同步，identify_level、attr_level、privilege_end_time 为 null，identities 与 slots 为空，不是未同步，也不写成 0。
   */
  static dragon: WireDragonSnapshot | null = null;
  /**
   * 收到的 s2c 59010。null 表示这次进主城还没收到 59010。
   * 空包体是已同步，sys_id 为空，不是未同步，也不写成 0。
   */
  static dragonCollection: WireDragonCollectionSnapshot | null = null;
  /**
   * 收到的 s2c 55001。null 表示这次进主城还没收到 55001。
   * 空包体是已同步，titles 为空，不是未同步，也不写成 0。
   */
  static titleList: WireTitleSnapshot | null = null;
  /**
   * 收到的 s2c 34001。null 表示这次进主城还没收到 34001。
   * 空包体是已同步，idx_list 为空，不是未同步，也不写成 0。
   */
  static headPortrait: WireHeadPortraitSnapshot | null = null;
  /**
   * 收到的 s2c 32001。null 表示这次进主城还没收到 32001。
   * 空包体是已同步，units 为空，不是未同步，也不写成 0。
   */
  static border: WireBorderSnapshot | null = null;
  /**
   * 收到的 s2c 4402。null 表示这次进主城还没收到 4402。
   * 空包体是已同步，list 为空，不是未同步，也不写成 0。
   */
  static fashion: WireFashionSnapshot | null = null;
  /**
   * 收到的 s2c 4401。null 表示这次进主城还没收到 4401。
   * 空包体是已同步，list 为空，不是未同步，也不写成 0。
   */
  static wornFashion: WireWornFashionSnapshot | null = null;
  /**
   * 收到的 s2c 4201。null 表示这次进主城还没收到 4201。
   * 空包体是已同步，privilege、end_time 保持缺省，不是未同步，也不写成 0。
   */
  static heroPrayer: WireHeroPrayerSnapshot | null = null;
  /**
   * 收到的 s2c 74104。null 表示这次进主城还没收到 74104。
   * 空包体是已同步，petTypes 为空，不是未同步，也不写成 0。
   */
  static petIllustrate: WirePetIllustrateSnapshot | null = null;
  /**
   * 收到的 s2c 28100。null 表示这次进主城还没收到 28100。
   * 空包体是已同步，reset_count 保持缺省，goddess 为空，不是未同步，也不写成 0。
   */
  static fetter: WireFetterSnapshot | null = null;
  /**
   * 收到的 s2c 28200。null 表示这次进主城还没收到 28200。
   * 空包体是已同步，active_type 为空，use_type 保持缺省，不是未同步，也不写成 0。
   */
  static fetterFashion: WireFetterFashionSnapshot | null = null;
  /**
   * 收到的 s2c 75601。null 表示这次进主城还没收到 75601。
   * 空包体是已同步，shenBinInfos 为空，不是未同步，也不写成 0。
   */
  static shenBin: WireShenBinSnapshot | null = null;
  /**
   * 收到的 s2c 75606。null 表示这次进主城还没收到 75606。
   * 空包体是已同步，occupationInfo 保持缺省，不是未同步，也不写成 0。
   */
  static occupation: WireOccupationSnapshot | null = null;
  /**
   * 收到的 s2c 75615。null 表示这次进主城还没收到 75615。
   * 空包体是已同步，roleShenBins 为空，不是未同步，也不写成 0。
   */
  static roleShenBin: WireRoleShenBinSnapshot | null = null;
  /**
   * 收到的 s2c 28107。null 表示这次进主城还没收到 28107。
   * 空包体是已同步，contracts 为空，不是未同步，也不写成 0。
   */
  static fetterContract: WireFetterContractSnapshot | null = null;
  /**
   * 收到的 s2c 3099。null 表示这次进主城还没收到 3099。
   * 空包体是已同步，unlockIds 为空，不是未同步，也不写成 0。
   */
  static formation: WireFormationSnapshot | null = null;
  /** 每记下一次 s2c 3099 加一。主线页「查询阵法」用来认领回包。3099 本身不落库，不改阵法。 */
  static formationSerial = 0;
  /**
   * 收到的 s2c 3101。null 表示这次进主城还没收到 3101。
   * 空包体是已同步，list 为空，assistance_unlock 保持缺省，不是未同步，也不写成 0。
   */
  static lineUp: WireLineUpSnapshot | null = null;
  /** 每记下一次 s2c 3101 加一。主线页「获取阵容」用来认领回包。3101 本身不落库，不改阵容。 */
  static lineUpSerial = 0;
  /**
   * 收到的 s2c 20101。null 表示这次进主城还没收到 20101。
   * 空包体是已同步，promotions 为空，不是未同步，也不写成 0。
   */
  static runningPromotion: WireRunningPromotionSnapshot | null = null;
  /**
   * 收到的 s2c 3203。null 表示这次进主城还没收到 3203。
   * 空包体是已同步，list 为空，不是未同步，也不写成 0。
   */
  static towerReward: WireTowerRewardSnapshot | null = null;
  /**
   * 收到的 s2c 4044。null 表示这次进主城还没收到 4044。
   * 空包体是已同步，times 保持缺省，不是未同步，也不写成 0。
   */
  static heroLevelResetTimes: WireHeroLevelResetTimesSnapshot | null = null;
  /**
   * 收到的 s2c 13010。null 表示这次进主城还没收到 13010。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static signInList: WireSignInListSnapshot | null = null;
  /**
   * 收到的 s2c 12020。null 表示这次进主城还没收到 12020。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static dailyTaskList: WireDailyTaskListSnapshot | null = null;
  /**
   * 收到的 s2c 26002。null 表示这次进主城还没收到 26002。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static dailyWelfareList: WireDailyWelfareListSnapshot | null = null;
  /**
   * 收到的 s2c 26001。null 表示这次进主城还没收到 26001。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static mouthWelfareList: WireMouthWelfareListSnapshot | null = null;
  /**
   * 收到的 s2c 61001。null 表示这次进主城还没收到 61001。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static weekendGift: WireWeekendGiftSnapshot | null = null;
  /**
   * 收到的 s2c 62001。null 表示这次进主城还没收到 62001。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static godRelic: WireGodRelicSnapshot | null = null;
  /**
   * 收到的 s2c 63001。null 表示这次进主城还没收到 63001。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static heroPalace: WireHeroPalaceSnapshot | null = null;
  /**
   * 收到的 s2c 69001。null 表示这次进主城还没收到 69001。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static rechargeDaysB: WireRechargeDaysBSnapshot | null = null;
  /**
   * 收到的 s2c 74001。null 表示这次进主城还没收到 74001。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static timeTower: WireTimeTowerSnapshot | null = null;
  /**
   * 收到的 s2c 74120。null 表示这次进主城还没收到 74120。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static spaceTimeAdventure: WireSpaceTimeAdventureSnapshot | null = null;
  /**
   * 收到的 s2c 76542。null 表示这次进主城还没收到 76542。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static magicTowerRoad: WireMagicTowerRoadSnapshot | null = null;
  /**
   * 收到的 s2c 75101。null 表示这次进主城还没收到 75101。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static qiShenQi: WireQiShenQiSnapshot | null = null;
  /**
   * 收到的 s2c 75121。null 表示这次进主城还没收到 75121。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static zhuShenJiTan: WireZhuShenJiTanSnapshot | null = null;
  /**
   * 收到的 s2c 75131。null 表示这次进主城还没收到 75131。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static midFood: WireMidFoodSnapshot | null = null;
  /**
   * 收到的 s2c 75801。null 表示这次进主城还没收到 75801。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static qiuShangMingYue: WireQiuShangMingYueSnapshot | null = null;
  /**
   * 收到的 s2c 75901。null 表示这次进主城还没收到 75901。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static wanShengLottery: WireWanShengLotterySnapshot | null = null;
  /**
   * 收到的 s2c 76001。null 表示这次进主城还没收到 76001。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static heiWuMission: WireHeiWuMissionSnapshot | null = null;
  /**
   * 收到的 s2c 76101。null 表示这次进主城还没收到 76101。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static christmasGift: WireChristmasGiftSnapshot | null = null;
  /**
   * 收到的 s2c 76301。null 表示这次进主城还没收到 76301。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static springOuting: WireSpringOutingSnapshot | null = null;
  /**
   * 收到的 s2c 76081。null 表示这次进主城还没收到 76081。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static christmasMission: WireChristmasMissionSnapshot | null = null;
  /**
   * 收到的 s2c 76520。null 表示这次进主城还没收到 76520。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static magicTowerLevelRank: WireMagicTowerLevelRankSnapshot | null = null;
  /**
   * 收到的 s2c 76251。null 表示这次进主城还没收到 76251。
   * 空包体是已同步，字段保持缺省，不是未同步，也不写成 0。
   */
  static springOutingGrid: WireSpringOutingGridSnapshot | null = null;

  private static watched: NetClient | null = null;
  private static offProfile: (() => void) | null = null;
  private static offChapter: (() => void) | null = null;
  private static offBattle: (() => void) | null = null;
  private static offChapterReward: (() => void) | null = null;
  private static offQuickBattle: (() => void) | null = null;
  private static offChapterReport: (() => void) | null = null;
  private static offBattleReport: (() => void) | null = null;
  private static offPreCompute: (() => void) | null = null;
  private static offStudy: (() => void) | null = null;
  private static offIdle: (() => void) | null = null;
  private static offIdleClaim: (() => void) | null = null;
  private static offBag: (() => void) | null = null;
  private static offBagGain: (() => void) | null = null;
  private static offMail: (() => void) | null = null;
  private static offHero: (() => void) | null = null;
  private static offActivity: (() => void) | null = null;
  private static offAchievement: (() => void) | null = null;
  private static offPvp: (() => void) | null = null;
  private static offSeven: (() => void) | null = null;
  private static offSevenPush: (() => void) | null = null;
  private static offGoal: (() => void) | null = null;
  private static offGoalPush: (() => void) | null = null;
  private static offWish: (() => void) | null = null;
  private static offSummon: (() => void) | null = null;
  private static offProphet: (() => void) | null = null;
  private static offJewel: (() => void) | null = null;
  private static offIllustrat: (() => void) | null = null;
  private static offPet: (() => void) | null = null;
  private static offWorld: (() => void) | null = null;
  private static offPromotion: (() => void) | null = null;
  private static offFirstRecharge: (() => void) | null = null;
  private static offReiki: (() => void) | null = null;
  private static offIslands: (() => void) | null = null;
  private static offTotems: (() => void) | null = null;
  private static offAstrolabe: (() => void) | null = null;
  private static offTweakCube: (() => void) | null = null;
  private static offDragon: (() => void) | null = null;
  private static offDragonCollection: (() => void) | null = null;
  private static offTitle: (() => void) | null = null;
  private static offHeadPortrait: (() => void) | null = null;
  private static offBorder: (() => void) | null = null;
  private static offFashion: (() => void) | null = null;
  private static offWornFashion: (() => void) | null = null;
  private static offHeroPrayer: (() => void) | null = null;
  private static offPetIllustrate: (() => void) | null = null;
  private static offFetter: (() => void) | null = null;
  private static offFetterFashion: (() => void) | null = null;
  private static offShenBin: (() => void) | null = null;
  private static offOccupation: (() => void) | null = null;
  private static offRoleShenBin: (() => void) | null = null;
  private static offFetterContract: (() => void) | null = null;
  private static offFormation: (() => void) | null = null;
  private static offLineUp: (() => void) | null = null;
  private static offRunningPromotion: (() => void) | null = null;
  private static offTowerReward: (() => void) | null = null;
  private static offHeroLevelResetTimes: (() => void) | null = null;
  private static offSignInList: (() => void) | null = null;
  private static offDailyTaskList: (() => void) | null = null;
  private static offDailyWelfareList: (() => void) | null = null;
  private static offMouthWelfareList: (() => void) | null = null;
  private static offWeekendGift: (() => void) | null = null;
  private static offGodRelic: (() => void) | null = null;
  private static offHeroPalace: (() => void) | null = null;
  private static offRechargeDaysB: (() => void) | null = null;
  private static offTimeTower: (() => void) | null = null;
  private static offSpaceTimeAdventure: (() => void) | null = null;
  private static offMagicTowerRoad: (() => void) | null = null;
  private static offQiShenQi: (() => void) | null = null;
  private static offZhuShenJiTan: (() => void) | null = null;
  private static offMidFood: (() => void) | null = null;
  private static offQiuShangMingYue: (() => void) | null = null;
  private static offWanShengLottery: (() => void) | null = null;
  private static offHeiWuMission: (() => void) | null = null;
  private static offChristmasGift: (() => void) | null = null;
  private static offSpringOuting: (() => void) | null = null;
  private static offChristmasMission: (() => void) | null = null;
  private static offMagicTowerLevelRank: (() => void) | null = null;
  private static offSpringOutingGrid: (() => void) | null = null;
  private static offHeroAdd: (() => void) | null = null;
  private static offLineUpSave: (() => void) | null = null;
  private static offServerError: (() => void) | null = null;
  private static pending: WireRoleProfile | null = null;
  private static pendingChapter: WireChapterProgress | null = null;
  private static pendingIdle: WireIdleSnapshot | null = null;
  /** null 表示登录过程里还没看到 5001。空数组是空背包。 */
  private static pendingBag: WireBagItem[] | null = null;
  private static pendingBagMarks: WireBagMark[] = [];
  /** 快照之后、进主城之前到达的 5002。新的 5001 会清掉。 */
  private static pendingGains: WireBagGain[] = [];
  /** null 表示登录过程里还没看到 15000。空数组是空邮箱。 */
  private static pendingMail: WireMailEntry[] | null = null;
  /** null 表示还没收齐一版 4001。空名册的 entries 是空数组。 */
  private static pendingHero: WireHeroList | null = null;
  /** send_status=0 时先攒页，收齐再写入 heroes。 */
  private static heroAcc: WireHeroEntry[] = [];
  private static heroGathering = false;
  private static heroExpect = 1;
  /** null 表示登录过程里还没看到 17000。空表的 rows 是空数组。 */
  private static pendingActivity: WireActivitySnapshot | null = null;
  /** null 表示登录过程里还没看到 12010。空表的 tasks 是空数组。 */
  private static pendingAchievement: WireAchievementSnapshot | null = null;
  /** null 表示登录过程里还没看到 18001。空对手表的 opponents 是空数组。 */
  private static pendingPvp: WirePvpSnapshot | null = null;
  /** null 表示登录过程里还没看到 22000。空表的 rows 是空数组。 */
  private static pendingSeven: WireSevenDaySnapshot | null = null;
  /** null 表示登录过程里还没看到 21010。空表的 tasks 是空数组。 */
  private static pendingGoal: WireGoal7Snapshot | null = null;
  /** null 表示登录过程里还没看到 27001。空表的 pools 是空数组。 */
  private static pendingWish: WireWishSnapshot | null = null;
  /** null 表示登录过程里还没看到 4004。空次数的两个字段都是 null。 */
  private static pendingSummon: WireSummonSnapshot | null = null;
  /** null 表示登录过程里还没看到 13044。空表的 luckys 是空数组。 */
  private static pendingProphet: WireProphetSnapshot | null = null;
  /** null 表示登录过程里还没看到 4101。空表的 heroes 是空数组。 */
  private static pendingJewel: WireJewelSnapshot | null = null;
  /** null 表示登录过程里还没看到 4013。空表的 rows 是空数组。 */
  private static pendingIllustrat: WireIllustratSnapshot | null = null;
  /** null 表示登录过程里还没看到 74100。空表的 rows 是空数组。 */
  private static pendingPet: WirePetSnapshot | null = null;
  /** null 表示登录过程里还没看到 51001。空包体的 level 是 null。 */
  private static pendingWorld: WireWorldSnapshot | null = null;
  /** null 表示登录过程里还没看到 20001。空包体的 is_buy_foundation 是 null，记录是空数组。 */
  private static pendingPromotion: WirePromotionSnapshot | null = null;
  /** null 表示登录过程里还没看到 20012。空包体的 recharge 是 null，已领 idx 和 can_reward 是空数组。 */
  private static pendingFirstRecharge: WireFirstRechargeSnapshot | null = null;
  /** null 表示登录过程里还没看到 70001。空包体的 list 是空数组。 */
  private static pendingReiki: WireReikiSnapshot | null = null;
  /** null 表示登录过程里还没看到 73001。空包体的 next_time 和 stage 是 null。 */
  private static pendingIslands: WireIslandsSnapshot | null = null;
  /** null 表示登录过程里还没看到 74300。空包体的 list 是空数组。 */
  private static pendingTotems: WireTotemsSnapshot | null = null;
  /** null 表示登录过程里还没看到 68001。空包体的 maxStar 和 activeAstrolabe 是 null，active 与 activeElem 是空数组。 */
  private static pendingAstrolabe: WireAstrolabeSnapshot | null = null;
  /** null 表示登录过程里还没看到 75501。空包体的 open_count 是 null，rank_hero 与 trench 是空数组。 */
  private static pendingTweakCube: WireCubeSnapshot | null = null;
  /** null 表示登录过程里还没看到 59001。空包体的 identify_level、attr_level、privilege_end_time 是 null，identities 与 slots 是空数组。 */
  private static pendingDragon: WireDragonSnapshot | null = null;
  /** null 表示登录过程里还没看到 59010。空包体的 sys_id 是空数组。 */
  private static pendingDragonCollection: WireDragonCollectionSnapshot | null = null;
  /** null 表示登录过程里还没看到 55001。空包体的 titles 是空数组。 */
  private static pendingTitle: WireTitleSnapshot | null = null;
  /** null 表示登录过程里还没看到 34001。空包体的 idx_list 是空数组。 */
  private static pendingHeadPortrait: WireHeadPortraitSnapshot | null = null;
  /** null 表示登录过程里还没看到 32001。空包体的 units 是空数组。 */
  private static pendingBorder: WireBorderSnapshot | null = null;
  /** null 表示登录过程里还没看到 4402。空包体的 list 是空数组。 */
  private static pendingFashion: WireFashionSnapshot | null = null;
  /** null 表示登录过程里还没看到 4401。空包体的 list 是空数组。 */
  private static pendingWornFashion: WireWornFashionSnapshot | null = null;
  /** null 表示登录过程里还没看到 4201。空包体的 privilege、end_time 保持缺省。 */
  private static pendingHeroPrayer: WireHeroPrayerSnapshot | null = null;
  /** null 表示登录过程里还没看到 74104。空包体的 petTypes 是空数组。 */
  private static pendingPetIllustrate: WirePetIllustrateSnapshot | null = null;
  /** null 表示登录过程里还没看到 28100。空包体的 reset_count 保持缺省，goddess 是空数组。 */
  private static pendingFetter: WireFetterSnapshot | null = null;
  /** null 表示登录过程里还没看到 28200。空包体的 active_type 是空数组，use_type 保持缺省。 */
  private static pendingFetterFashion: WireFetterFashionSnapshot | null = null;
  /** null 表示登录过程里还没看到 75601。空包体的 shenBinInfos 是空数组。 */
  private static pendingShenBin: WireShenBinSnapshot | null = null;
  /** null 表示登录过程里还没看到 75606。空包体的 occupationInfo 保持缺省。 */
  private static pendingOccupation: WireOccupationSnapshot | null = null;
  /** null 表示登录过程里还没看到 75615。空包体的 roleShenBins 是空数组。 */
  private static pendingRoleShenBin: WireRoleShenBinSnapshot | null = null;
  /** null 表示登录过程里还没看到 28107。空包体的 contracts 是空数组。 */
  private static pendingFetterContract: WireFetterContractSnapshot | null = null;
  /** null 表示登录过程里还没看到 3099。空包体的 unlockIds 是空数组。 */
  private static pendingFormation: WireFormationSnapshot | null = null;
  /** null 表示登录过程里还没看到 3101。空包体的 list 是空数组，assistance_unlock 保持缺省。 */
  private static pendingLineUp: WireLineUpSnapshot | null = null;
  /** null 表示登录过程里还没看到 20101。空包体的 promotions 是空数组。 */
  private static pendingRunningPromotion: WireRunningPromotionSnapshot | null = null;
  /** null 表示登录过程里还没看到 3203。空包体的 list 是空数组。 */
  private static pendingTowerReward: WireTowerRewardSnapshot | null = null;
  /** null 表示登录过程里还没看到 4044。空包体的 times 保持缺省。 */
  private static pendingHeroLevelResetTimes: WireHeroLevelResetTimesSnapshot | null = null;
  /** null 表示登录过程里还没看到 13010。空包体的字段保持缺省。 */
  private static pendingSignInList: WireSignInListSnapshot | null = null;
  /** null 表示登录过程里还没看到 12020。空包体的字段保持缺省。 */
  private static pendingDailyTaskList: WireDailyTaskListSnapshot | null = null;
  /** null 表示登录过程里还没看到 26002。空包体的字段保持缺省。 */
  private static pendingDailyWelfareList: WireDailyWelfareListSnapshot | null = null;
  /** null 表示登录过程里还没看到 26001。空包体的字段保持缺省。 */
  private static pendingMouthWelfareList: WireMouthWelfareListSnapshot | null = null;
  /** null 表示登录过程里还没看到 61001。空包体的字段保持缺省。 */
  private static pendingWeekendGift: WireWeekendGiftSnapshot | null = null;
  /** null 表示登录过程里还没看到 62001。空包体的字段保持缺省。 */
  private static pendingGodRelic: WireGodRelicSnapshot | null = null;
  /** null 表示登录过程里还没看到 63001。空包体的字段保持缺省。 */
  private static pendingHeroPalace: WireHeroPalaceSnapshot | null = null;
  /** null 表示登录过程里还没看到 69001。空包体的字段保持缺省。 */
  private static pendingRechargeDaysB: WireRechargeDaysBSnapshot | null = null;
  /** null 表示登录过程里还没看到 74001。空包体的字段保持缺省。 */
  private static pendingTimeTower: WireTimeTowerSnapshot | null = null;
  /** null 表示登录过程里还没看到 74120。空包体的字段保持缺省。 */
  private static pendingSpaceTimeAdventure: WireSpaceTimeAdventureSnapshot | null = null;
  /** null 表示登录过程里还没看到 76542。空包体的字段保持缺省。 */
  private static pendingMagicTowerRoad: WireMagicTowerRoadSnapshot | null = null;
  /** null 表示登录过程里还没看到 75101。空包体的字段保持缺省。 */
  private static pendingQiShenQi: WireQiShenQiSnapshot | null = null;
  /** null 表示登录过程里还没看到 75121。空包体的字段保持缺省。 */
  private static pendingZhuShenJiTan: WireZhuShenJiTanSnapshot | null = null;
  /** null 表示登录过程里还没看到 75131。空包体的字段保持缺省。 */
  private static pendingMidFood: WireMidFoodSnapshot | null = null;
  /** null 表示登录过程里还没看到 75801。空包体的字段保持缺省。 */
  private static pendingQiuShangMingYue: WireQiuShangMingYueSnapshot | null = null;
  /** null 表示登录过程里还没看到 75901。空包体的字段保持缺省。 */
  private static pendingWanShengLottery: WireWanShengLotterySnapshot | null = null;
  /** null 表示登录过程里还没看到 76001。空包体的字段保持缺省。 */
  private static pendingHeiWuMission: WireHeiWuMissionSnapshot | null = null;
  /** null 表示登录过程里还没看到 76101。空包体的字段保持缺省。 */
  private static pendingChristmasGift: WireChristmasGiftSnapshot | null = null;
  /** null 表示登录过程里还没看到 76301。空包体的字段保持缺省。 */
  private static pendingSpringOuting: WireSpringOutingSnapshot | null = null;
  /** null 表示登录过程里还没看到 76081。空包体的字段保持缺省。 */
  private static pendingChristmasMission: WireChristmasMissionSnapshot | null = null;
  /** null 表示登录过程里还没看到 76520。空包体的字段保持缺省。 */
  private static pendingMagicTowerLevelRank: WireMagicTowerLevelRankSnapshot | null = null;
  /** null 表示登录过程里还没看到 76251。空包体的字段保持缺省。 */
  private static pendingSpringOutingGrid: WireSpringOutingGridSnapshot | null = null;
  private static listeners = new Set<() => void>();

  /** 套接字一开就听。登录回包里如果已经夹着 2001、5001、3007 或 3004，先记下，等角色写入后再套上。 */
  static watch(net: NetClient): void {
    if (
      this.watched === net &&
      this.offProfile &&
      this.offChapter &&
      this.offBattle &&
      this.offChapterReward &&
      this.offQuickBattle &&
      this.offChapterReport &&
      this.offBattleReport &&
      this.offPreCompute &&
      this.offStudy &&
      this.offIdle &&
      this.offIdleClaim &&
      this.offBag &&
      this.offBagGain &&
      this.offMail &&
      this.offHero &&
      this.offActivity &&
      this.offAchievement &&
      this.offPvp &&
      this.offSeven &&
      this.offSevenPush &&
      this.offGoal &&
      this.offGoalPush &&
      this.offWish &&
      this.offSummon &&
      this.offProphet &&
      this.offJewel &&
      this.offIllustrat &&
      this.offPet &&
      this.offWorld &&
      this.offPromotion &&
      this.offFirstRecharge &&
      this.offReiki &&
      this.offIslands &&
      this.offTotems &&
      this.offAstrolabe &&
      this.offTweakCube &&
      this.offDragon &&
      this.offDragonCollection &&
      this.offTitle &&
      this.offHeadPortrait &&
      this.offBorder &&
      this.offFashion &&
      this.offWornFashion &&
      this.offHeroPrayer &&
      this.offPetIllustrate &&
      this.offFetter &&
      this.offFetterFashion &&
      this.offShenBin &&
      this.offOccupation &&
      this.offRoleShenBin &&
      this.offFetterContract &&
      this.offFormation &&
      this.offLineUp &&
      this.offRunningPromotion &&
      this.offTowerReward &&
      this.offHeroLevelResetTimes &&
      this.offSignInList &&
      this.offDailyTaskList &&
      this.offDailyWelfareList &&
      this.offMouthWelfareList &&
      this.offWeekendGift &&
      this.offGodRelic &&
      this.offHeroPalace &&
      this.offRechargeDaysB &&
      this.offTimeTower &&
      this.offSpaceTimeAdventure &&
      this.offMagicTowerRoad &&
      this.offQiShenQi &&
      this.offZhuShenJiTan &&
      this.offMidFood &&
      this.offQiuShangMingYue &&
      this.offWanShengLottery &&
      this.offHeiWuMission &&
      this.offChristmasGift &&
      this.offSpringOuting &&
      this.offChristmasMission &&
      this.offMagicTowerLevelRank &&
      this.offSpringOutingGrid &&
      this.offHeroAdd &&
      this.offLineUpSave &&
      this.offServerError
    ) {
      return;
    }
    this.unhook();
    this.watched = net;
    this.offProfile = net.subscribe(WIRE_ROLE_CMD, (msg) => this.onRole(msg.data));
    this.offChapter = net.subscribe(WIRE_CHAPTER_CMD, (msg) => this.onChapter(msg.data));
    this.offBattle = net.subscribe(WIRE_BATTLE_MATCH_CMD, (msg) => this.onBattleMatch(msg.data));
    this.offChapterReward = net.subscribe(WIRE_CHAPTER_REWARD_CMD, (msg) => this.onChapterReward(msg.data));
    this.offQuickBattle = net.subscribe(WIRE_QUICK_BATTLE_CMD, (msg) => this.onQuickBattle(msg.data));
    this.offChapterReport = net.subscribe(WIRE_CHAPTER_REPORT_CMD, (msg) => this.onChapterReport(msg.data));
    this.offBattleReport = net.subscribe(WIRE_BATTLE_REPORT_CMD, (msg) => this.onBattleReport(msg.data));
    this.offPreCompute = net.subscribe(WIRE_PRECOMPUTE_CMD, (msg) => this.onPreCompute(msg.data));
    this.offStudy = net.subscribe(WIRE_STUDY_CMD, (msg) => this.onStudy(msg.data));
    this.offIdle = net.subscribe(WIRE_IDLE_CMD, (msg) => this.onIdle(msg.data));
    this.offIdleClaim = net.subscribe(WIRE_IDLE_CLAIM_CMD, (msg) => this.onIdleClaim(msg.data));
    this.offBag = net.subscribe(WIRE_BAG_CMD, (msg) => this.onBag(msg.data));
    this.offBagGain = net.subscribe(WIRE_BAG_GAIN_CMD, (msg) => this.onBagGain(msg.data));
    this.offMail = net.subscribe(WIRE_MAIL_CMD, (msg) => this.onMail(msg.data));
    this.offHero = net.subscribe(WIRE_HERO_CMD, (msg) => this.onHero(msg.data));
    this.offActivity = net.subscribe(WIRE_ACTIVITY_CMD, (msg) => this.onActivity(msg.data));
    this.offAchievement = net.subscribe(WIRE_ACHIEVEMENT_CMD, (msg) => this.onAchievement(msg.data));
    this.offPvp = net.subscribe(WIRE_PVP_CMD, (msg) => this.onPvp(msg.data));
    this.offSeven = net.subscribe(WIRE_SEVEN_CMD, (msg) => this.onSevenDay(msg.data));
    this.offSevenPush = net.subscribe(WIRE_SEVEN_PUSH_CMD, (msg) => this.onSevenDayPush(msg.data));
    this.offGoal = net.subscribe(WIRE_GOAL7_CMD, (msg) => this.onGoal7(msg.data));
    this.offGoalPush = net.subscribe(WIRE_GOAL7_PUSH_CMD, (msg) => this.onGoal7Push(msg.data));
    this.offWish = net.subscribe(WIRE_WISH_CMD, (msg) => this.onWish(msg.data));
    this.offSummon = net.subscribe(WIRE_SUMMON_CMD, (msg) => this.onSummon(msg.data));
    this.offProphet = net.subscribe(WIRE_PROPHET_CMD, (msg) => this.onProphet(msg.data));
    this.offJewel = net.subscribe(WIRE_JEWEL_CMD, (msg) => this.onJewel(msg.data));
    this.offIllustrat = net.subscribe(WIRE_ILLUSTRAT_CMD, (msg) => this.onIllustrat(msg.data));
    this.offPet = net.subscribe(WIRE_PET_CMD, (msg) => this.onPet(msg.data));
    this.offWorld = net.subscribe(WIRE_WORLD_CMD, (msg) => this.onWorld(msg.data));
    this.offPromotion = net.subscribe(WIRE_PROMOTION_CMD, (msg) => this.onPromotion(msg.data));
    this.offFirstRecharge = net.subscribe(WIRE_FIRST_CMD, (msg) => this.onFirstRecharge(msg.data));
    this.offReiki = net.subscribe(WIRE_REIKI_CMD, (msg) => this.onReiki(msg.data));
    this.offIslands = net.subscribe(WIRE_ISLANDS_CMD, (msg) => this.onIslands(msg.data));
    this.offTotems = net.subscribe(WIRE_TOTEMS_CMD, (msg) => this.onTotems(msg.data));
    this.offAstrolabe = net.subscribe(WIRE_ASTROLABE_CMD, (msg) => this.onAstrolabe(msg.data));
    this.offTweakCube = net.subscribe(WIRE_CUBE_CMD, (msg) => this.onTweakCube(msg.data));
    this.offDragon = net.subscribe(WIRE_DRAGON_CMD, (msg) => this.onDragon(msg.data));
    this.offDragonCollection = net.subscribe(WIRE_DRAGON_COLLECTION_CMD, (msg) => this.onDragonCollection(msg.data));
    this.offTitle = net.subscribe(WIRE_TITLE_CMD, (msg) => this.onTitle(msg.data));
    this.offHeadPortrait = net.subscribe(WIRE_HEAD_PORTRAIT_CMD, (msg) => this.onHeadPortrait(msg.data));
    this.offBorder = net.subscribe(WIRE_BORDER_CMD, (msg) => this.onBorder(msg.data));
    this.offFashion = net.subscribe(WIRE_FASHION_CMD, (msg) => this.onFashion(msg.data));
    this.offWornFashion = net.subscribe(WIRE_WORN_FASHION_CMD, (msg) => this.onWornFashion(msg.data));
    this.offHeroPrayer = net.subscribe(WIRE_HERO_PRAYER_CMD, (msg) => this.onHeroPrayer(msg.data));
    this.offPetIllustrate = net.subscribe(WIRE_PET_ILLUSTRATE_CMD, (msg) => this.onPetIllustrate(msg.data));
    this.offFetter = net.subscribe(WIRE_FETTER_CMD, (msg) => this.onFetter(msg.data));
    this.offFetterFashion = net.subscribe(WIRE_FETTER_FASHION_CMD, (msg) => this.onFetterFashion(msg.data));
    this.offShenBin = net.subscribe(WIRE_SHENBIN_CMD, (msg) => this.onShenBin(msg.data));
    this.offOccupation = net.subscribe(WIRE_OCCUPATION_CMD, (msg) => this.onOccupation(msg.data));
    this.offRoleShenBin = net.subscribe(WIRE_ROLE_SHENBIN_CMD, (msg) => this.onRoleShenBin(msg.data));
    this.offFetterContract = net.subscribe(WIRE_FETTER_CONTRACT_CMD, (msg) => this.onFetterContract(msg.data));
    this.offFormation = net.subscribe(WIRE_FORMATION_CMD, (msg) => this.onFormation(msg.data));
    this.offLineUp = net.subscribe(WIRE_LINEUP_CMD, (msg) => this.onLineUp(msg.data));
    this.offRunningPromotion = net.subscribe(WIRE_RUNNING_PROMOTION_CMD, (msg) => this.onRunningPromotion(msg.data));
    this.offTowerReward = net.subscribe(WIRE_TOWER_REWARD_CMD, (msg) => this.onTowerReward(msg.data));
    this.offHeroLevelResetTimes = net.subscribe(WIRE_HERO_LEVEL_RESET_TIMES_CMD, (msg) => this.onHeroLevelResetTimes(msg.data));
    this.offSignInList = net.subscribe(WIRE_SIGN_IN_LIST_CMD, (msg) => this.onSignInList(msg.data));
    this.offDailyTaskList = net.subscribe(WIRE_DAILY_TASK_LIST_CMD, (msg) => this.onDailyTaskList(msg.data));
    this.offDailyWelfareList = net.subscribe(WIRE_DAILY_WELFARE_LIST_CMD, (msg) => this.onDailyWelfareList(msg.data));
    this.offMouthWelfareList = net.subscribe(WIRE_MOUTH_WELFARE_LIST_CMD, (msg) => this.onMouthWelfareList(msg.data));
    this.offWeekendGift = net.subscribe(WIRE_WEEKEND_GIFT_CMD, (msg) => this.onWeekendGift(msg.data));
    this.offGodRelic = net.subscribe(WIRE_GOD_RELIC_CMD, (msg) => this.onGodRelic(msg.data));
    this.offHeroPalace = net.subscribe(WIRE_HERO_PALACE_CMD, (msg) => this.onHeroPalace(msg.data));
    this.offRechargeDaysB = net.subscribe(WIRE_RECHARGE_DAYS_B_CMD, (msg) => this.onRechargeDaysB(msg.data));
    this.offTimeTower = net.subscribe(WIRE_TIME_TOWER_CMD, (msg) => this.onTimeTower(msg.data));
    this.offSpaceTimeAdventure = net.subscribe(WIRE_SPACE_TIME_ADVENTURE_CMD, (msg) => this.onSpaceTimeAdventure(msg.data));
    this.offMagicTowerRoad = net.subscribe(WIRE_MAGIC_TOWER_ROAD_CMD, (msg) => this.onMagicTowerRoad(msg.data));
    this.offQiShenQi = net.subscribe(WIRE_QI_SHEN_QI_CMD, (msg) => this.onQiShenQi(msg.data));
    this.offZhuShenJiTan = net.subscribe(WIRE_ZHU_SHEN_JI_TAN_CMD, (msg) => this.onZhuShenJiTan(msg.data));
    this.offMidFood = net.subscribe(WIRE_MID_FOOD_CMD, (msg) => this.onMidFood(msg.data));
    this.offQiuShangMingYue = net.subscribe(WIRE_QIU_SHANG_MING_YUE_CMD, (msg) => this.onQiuShangMingYue(msg.data));
    this.offWanShengLottery = net.subscribe(WIRE_WAN_SHENG_LOTTERY_CMD, (msg) => this.onWanShengLottery(msg.data));
    this.offHeiWuMission = net.subscribe(WIRE_HEI_WU_MISSION_CMD, (msg) => this.onHeiWuMission(msg.data));
    this.offChristmasGift = net.subscribe(WIRE_CHRISTMAS_GIFT_CMD, (msg) => this.onChristmasGift(msg.data));
    this.offSpringOuting = net.subscribe(WIRE_SPRING_OUTING_CMD, (msg) => this.onSpringOuting(msg.data));
    this.offChristmasMission = net.subscribe(WIRE_CHRISTMAS_MISSION_CMD, (msg) => this.onChristmasMission(msg.data));
    this.offMagicTowerLevelRank = net.subscribe(WIRE_MAGIC_TOWER_LEVEL_RANK_CMD, (msg) => this.onMagicTowerLevelRank(msg.data));
    this.offSpringOutingGrid = net.subscribe(WIRE_SPRING_OUTING_GRID_CMD, (msg) => this.onSpringOutingGrid(msg.data));
    this.offHeroAdd = net.subscribe(WIRE_HERO_ADD_CMD, (msg) => this.onHeroAdd(msg.data));
    this.offLineUpSave = net.subscribe(WIRE_LINEUP_SAVE_CMD, (msg) => this.onLineUpSave(msg.data));
    this.offServerError = net.subscribe(WIRE_SERVER_ERROR_CMD, (msg) => this.onServerError(msg.data));
  }

  static hold(net: NetClient): void {
    if (this.net && this.net !== net) this.net.close();
    this.net = net;
    this.watch(net);
  }

  /**
   * 这次进主城还没看到新的 s2c 3007 / 3004 / 5001 / 15000 / 4001 / 17000 / 12010 / 18001 / 22000 / 21010 / 27001 / 4004 / 13044 / 4101 / 4013 / 74100 / 51001 / 20001 / 20012 / 70001 / 73001 / 74300 / 68001 / 75501 / 59001 / 59010 / 55001 / 34001 / 32001 / 4402 / 4401 / 4201。丢掉上一名角色的 idx、挂机时间、背包、邮件、英雄、点金、成就、竞技场、七日登录、七日目标、许愿池、召唤次数、先知召唤幸运值、英雄宝石、英雄图鉴、宠物信息、世界等级、基金列表、超值首充记录、灵器数据、浮空岛时间、图腾信息、星盘数据、魔方数据、圣龙数据、圣物图鉴、称号列表、头像列表、头像框数据、激活皮肤列表、穿戴皮肤英雄列表和英雄祈愿数据。
   * 登录过程中先到的包仍留在 pending，接着 flush 再写。
   */
  static prepareCity(): void {
    this.nowIdx = null;
    this.maxIdx = null;
    this.chapterProbe = null;
    this.chapterProbeSerial = 0;
    this.battleMatch = null;
    this.battleSerial = 0;
    this.chapterReward = null;
    this.quickBattle = null;
    this.chapterReport = null;
    this.chapterReportSerial = 0;
    this.battleReport = null;
    this.battleReportSerial = 0;
    this.preCompute = null;
    this.preComputeSerial = 0;
    this.study = null;
    this.studySerial = 0;
    this.resetGmProbe();
    this.rewardTime = null;
    this.maxRewardTime = null;
    this.idleProbe = null;
    this.idleProbeSerial = 0;
    this.claimNote = "";
    this.claimSerial = 0;
    this.bagItems = null;
    this.bagMarks = [];
    this.mailEntries = null;
    this.heroes = null;
    this.heroCapacity = null;
    this.resetHeroGather();
    this.activity = null;
    this.achievements = null;
    this.pvp = null;
    this.sevenDay = null;
    this.goal7 = null;
    this.wish = null;
    this.summon = null;
    this.prophet = null;
    this.jewel = null;
    this.illustrat = null;
    this.pet = null;
    this.world = null;
    this.promotion = null;
    this.firstRecharge = null;
    this.reiki = null;
    this.islands = null;
    this.totems = null;
    this.astrolabe = null;
    this.tweakCube = null;
    this.dragon = null;
    this.dragonCollection = null;
    this.titleList = null;
    this.headPortrait = null;
    this.border = null;
    this.fashion = null;
    this.wornFashion = null;
    this.heroPrayer = null;
    this.petIllustrate = null;
    this.fetter = null;
    this.fetterFashion = null;
    this.shenBin = null;
    this.occupation = null;
    this.roleShenBin = null;
    this.fetterContract = null;
    this.formation = null;
    this.formationSerial = 0;
    this.lineUp = null;
    this.lineUpSerial = 0;
    this.runningPromotion = null;
    this.towerReward = null;
    this.heroLevelResetTimes = null;
    this.signInList = null;
    this.dailyTaskList = null;
    this.dailyWelfareList = null;
    this.mouthWelfareList = null;
    this.weekendGift = null;
    this.godRelic = null;
    this.heroPalace = null;
    this.rechargeDaysB = null;
    this.timeTower = null;
    this.spaceTimeAdventure = null;
    this.magicTowerRoad = null;
    this.qiShenQi = null;
    this.zhuShenJiTan = null;
    this.midFood = null;
    this.qiuShangMingYue = null;
    this.wanShengLottery = null;
    this.heiWuMission = null;
    this.christmasGift = null;
    this.springOuting = null;
    this.christmasMission = null;
    this.magicTowerLevelRank = null;
    this.springOutingGrid = null;
    this.mirrorStore();
  }

  /** 只放下引用。调用方自己 close。 */
  static release(net: NetClient | null): void {
    if (net && this.net === net) this.net = null;
    if (net && this.watched === net) {
      this.unhook();
      this.watched = null;
      this.pending = null;
      this.pendingChapter = null;
      this.pendingIdle = null;
      this.pendingBag = null;
      this.pendingBagMarks = [];
      this.pendingGains = [];
      this.pendingMail = null;
      this.pendingHero = null;
      this.pendingActivity = null;
      this.pendingAchievement = null;
      this.pendingPvp = null;
      this.pendingSeven = null;
      this.pendingGoal = null;
      this.pendingWish = null;
      this.pendingSummon = null;
      this.pendingProphet = null;
      this.pendingJewel = null;
      this.pendingIllustrat = null;
      this.pendingPet = null;
      this.pendingWorld = null;
      this.pendingPromotion = null;
      this.pendingFirstRecharge = null;
      this.pendingReiki = null;
      this.pendingIslands = null;
      this.pendingTotems = null;
      this.pendingAstrolabe = null;
      this.pendingTweakCube = null;
      this.pendingDragon = null;
      this.pendingDragonCollection = null;
      this.pendingTitle = null;
      this.pendingHeadPortrait = null;
      this.pendingBorder = null;
      this.pendingFashion = null;
      this.pendingWornFashion = null;
      this.pendingHeroPrayer = null;
      this.pendingPetIllustrate = null;
      this.pendingFetter = null;
      this.pendingFetterFashion = null;
      this.pendingShenBin = null;
      this.pendingOccupation = null;
      this.pendingRoleShenBin = null;
      this.pendingFetterContract = null;
      this.pendingFormation = null;
      this.pendingLineUp = null;
      this.pendingRunningPromotion = null;
      this.pendingTowerReward = null;
      this.pendingHeroLevelResetTimes = null;
      this.pendingSignInList = null;
      this.pendingDailyTaskList = null;
      this.pendingDailyWelfareList = null;
      this.pendingMouthWelfareList = null;
      this.pendingWeekendGift = null;
      this.pendingGodRelic = null;
      this.pendingHeroPalace = null;
      this.pendingRechargeDaysB = null;
      this.pendingTimeTower = null;
      this.pendingSpaceTimeAdventure = null;
      this.pendingMagicTowerRoad = null;
      this.pendingQiShenQi = null;
      this.pendingZhuShenJiTan = null;
      this.pendingMidFood = null;
      this.pendingQiuShangMingYue = null;
      this.pendingWanShengLottery = null;
      this.pendingHeiWuMission = null;
      this.pendingChristmasGift = null;
      this.pendingSpringOuting = null;
      this.pendingChristmasMission = null;
      this.pendingMagicTowerLevelRank = null;
      this.pendingSpringOutingGrid = null;
      this.resetHeroGather();
      this.nowIdx = null;
      this.maxIdx = null;
      this.chapterProbe = null;
      this.chapterProbeSerial = 0;
      this.battleMatch = null;
      this.battleSerial = 0;
      this.chapterReward = null;
      this.quickBattle = null;
      this.chapterReport = null;
      this.chapterReportSerial = 0;
      this.battleReport = null;
      this.battleReportSerial = 0;
      this.preCompute = null;
      this.preComputeSerial = 0;
      this.study = null;
      this.studySerial = 0;
      this.resetGmProbe();
      this.rewardTime = null;
      this.maxRewardTime = null;
      this.idleProbe = null;
      this.idleProbeSerial = 0;
      this.claimNote = "";
      this.claimSerial = 0;
      this.bagItems = null;
      this.bagMarks = [];
      this.mailEntries = null;
      this.heroes = null;
      this.heroCapacity = null;
      this.resetHeroGather();
      this.activity = null;
      this.achievements = null;
      this.pvp = null;
      this.sevenDay = null;
      this.goal7 = null;
      this.wish = null;
      this.summon = null;
      this.prophet = null;
      this.jewel = null;
      this.illustrat = null;
      this.pet = null;
      this.world = null;
      this.promotion = null;
      this.firstRecharge = null;
      this.reiki = null;
      this.islands = null;
      this.totems = null;
      this.astrolabe = null;
      this.tweakCube = null;
      this.dragon = null;
      this.dragonCollection = null;
      this.titleList = null;
      this.headPortrait = null;
      this.border = null;
      this.fashion = null;
      this.wornFashion = null;
      this.heroPrayer = null;
    this.petIllustrate = null;
    this.fetter = null;
    this.fetterFashion = null;
    this.shenBin = null;
    this.occupation = null;
    this.roleShenBin = null;
    this.fetterContract = null;
    this.formation = null;
    this.formationSerial = 0;
    this.lineUp = null;
    this.lineUpSerial = 0;
    this.runningPromotion = null;
    this.towerReward = null;
    this.heroLevelResetTimes = null;
    this.signInList = null;
    this.dailyTaskList = null;
    this.dailyWelfareList = null;
    this.mouthWelfareList = null;
    this.weekendGift = null;
    this.godRelic = null;
    this.heroPalace = null;
    this.rechargeDaysB = null;
    this.timeTower = null;
    this.spaceTimeAdventure = null;
    this.magicTowerRoad = null;
    this.qiShenQi = null;
    this.zhuShenJiTan = null;
    this.midFood = null;
    this.qiuShangMingYue = null;
    this.wanShengLottery = null;
    this.heiWuMission = null;
    this.christmasGift = null;
    this.springOuting = null;
    this.christmasMission = null;
    this.magicTowerLevelRank = null;
    this.springOutingGrid = null;
    }
  }

  static close(): void {
    const net = this.net;
    this.net = null;
    this.unhook();
    this.watched = null;
    this.pending = null;
    this.pendingChapter = null;
    this.pendingIdle = null;
    this.pendingBag = null;
    this.pendingBagMarks = [];
    this.pendingGains = [];
    this.pendingMail = null;
    this.pendingHero = null;
    this.pendingActivity = null;
    this.pendingAchievement = null;
    this.pendingPvp = null;
    this.pendingSeven = null;
    this.pendingGoal = null;
    this.pendingWish = null;
    this.pendingSummon = null;
    this.pendingProphet = null;
    this.pendingJewel = null;
    this.pendingIllustrat = null;
    this.pendingPet = null;
    this.pendingWorld = null;
    this.pendingPromotion = null;
    this.pendingFirstRecharge = null;
    this.pendingReiki = null;
    this.pendingIslands = null;
    this.pendingTotems = null;
    this.pendingAstrolabe = null;
    this.pendingTweakCube = null;
    this.pendingDragon = null;
    this.pendingDragonCollection = null;
    this.pendingTitle = null;
    this.pendingHeadPortrait = null;
    this.pendingBorder = null;
    this.pendingFashion = null;
    this.pendingWornFashion = null;
    this.pendingHeroPrayer = null;
    this.pendingPetIllustrate = null;
    this.pendingFetter = null;
    this.pendingFetterFashion = null;
    this.pendingShenBin = null;
    this.pendingOccupation = null;
    this.pendingRoleShenBin = null;
    this.pendingFetterContract = null;
    this.pendingFormation = null;
      this.pendingLineUp = null;
      this.pendingRunningPromotion = null;
      this.pendingTowerReward = null;
      this.pendingHeroLevelResetTimes = null;
      this.pendingSignInList = null;
      this.pendingDailyTaskList = null;
      this.pendingDailyWelfareList = null;
      this.pendingMouthWelfareList = null;
      this.pendingWeekendGift = null;
      this.pendingGodRelic = null;
      this.pendingHeroPalace = null;
      this.pendingRechargeDaysB = null;
      this.pendingTimeTower = null;
      this.pendingSpaceTimeAdventure = null;
      this.pendingMagicTowerRoad = null;
      this.pendingQiShenQi = null;
      this.pendingZhuShenJiTan = null;
      this.pendingMidFood = null;
      this.pendingQiuShangMingYue = null;
      this.pendingWanShengLottery = null;
      this.pendingHeiWuMission = null;
      this.pendingChristmasGift = null;
      this.pendingSpringOuting = null;
      this.pendingChristmasMission = null;
      this.pendingMagicTowerLevelRank = null;
      this.pendingSpringOutingGrid = null;
    this.resetHeroGather();
    this.nowIdx = null;
    this.maxIdx = null;
    this.chapterProbe = null;
    this.chapterProbeSerial = 0;
    this.battleMatch = null;
    this.battleSerial = 0;
    this.chapterReward = null;
    this.quickBattle = null;
    this.chapterReport = null;
    this.chapterReportSerial = 0;
    this.battleReport = null;
    this.battleReportSerial = 0;
    this.preCompute = null;
    this.preComputeSerial = 0;
    this.study = null;
    this.studySerial = 0;
    this.resetGmProbe();
    this.rewardTime = null;
    this.maxRewardTime = null;
    this.idleProbe = null;
    this.idleProbeSerial = 0;
    this.claimNote = "";
    this.claimSerial = 0;
    this.bagItems = null;
    this.bagMarks = [];
    this.mailEntries = null;
    this.heroes = null;
    this.heroCapacity = null;
    this.resetHeroGather();
    this.activity = null;
    this.achievements = null;
    this.pvp = null;
    this.sevenDay = null;
    this.goal7 = null;
    this.wish = null;
    this.summon = null;
    this.prophet = null;
    this.jewel = null;
    this.illustrat = null;
    this.pet = null;
    this.world = null;
    this.promotion = null;
    this.firstRecharge = null;
    this.reiki = null;
    this.islands = null;
    this.totems = null;
    this.astrolabe = null;
    this.tweakCube = null;
    this.dragon = null;
    this.dragonCollection = null;
    this.titleList = null;
    this.headPortrait = null;
    this.border = null;
    this.fashion = null;
    this.wornFashion = null;
    this.heroPrayer = null;
    this.petIllustrate = null;
    this.fetter = null;
    this.fetterFashion = null;
    this.shenBin = null;
    this.occupation = null;
    this.roleShenBin = null;
    this.fetterContract = null;
    this.formation = null;
    this.formationSerial = 0;
    this.lineUp = null;
    this.lineUpSerial = 0;
    this.runningPromotion = null;
    this.towerReward = null;
    this.heroLevelResetTimes = null;
    this.signInList = null;
    this.dailyTaskList = null;
    this.dailyWelfareList = null;
    this.mouthWelfareList = null;
    this.weekendGift = null;
    this.godRelic = null;
    this.heroPalace = null;
    this.rechargeDaysB = null;
    this.timeTower = null;
    this.spaceTimeAdventure = null;
    this.magicTowerRoad = null;
    this.qiShenQi = null;
    this.zhuShenJiTan = null;
    this.midFood = null;
    this.qiuShangMingYue = null;
    this.wanShengLottery = null;
    this.heiWuMission = null;
    this.christmasGift = null;
    this.springOuting = null;
    this.christmasMission = null;
    this.magicTowerLevelRank = null;
    this.springOutingGrid = null;
    if (net) net.close();
  }

  /** 顶栏或主线按钮有变化时通知。MainApp 用来重画。 */
  static onSync(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** applyWireRole 之后调用。登录过程中先到的资料在这里写上。 */
  static flush(): void {
    this.commit();
    this.commitChapter();
    this.commitIdle();
    this.commitBag();
    this.commitMail();
    this.commitHero();
    this.commitActivity();
    this.commitAchievement();
    this.commitPvp();
    this.commitSevenDay();
    this.commitGoal7();
    this.commitWish();
    this.commitSummon();
    this.commitProphet();
    this.commitJewel();
    this.commitIllustrat();
    this.commitPet();
    this.commitWorld();
    this.commitPromotion();
    this.commitFirstRecharge();
    this.commitReiki();
    this.commitIslands();
    this.commitTotems();
    this.commitAstrolabe();
    this.commitTweakCube();
    this.commitDragon();
    this.commitDragonCollection();
    this.commitTitle();
    this.commitHeadPortrait();
    this.commitBorder();
    this.commitFashion();
    this.commitWornFashion();
    this.commitHeroPrayer();
    this.commitPetIllustrate();
    this.commitFetter();
    this.commitFetterFashion();
    this.commitShenBin();
    this.commitOccupation();
    this.commitRoleShenBin();
    this.commitFetterContract();
    this.commitFormation();
    this.commitLineUp();
    this.commitRunningPromotion();
    this.commitTowerReward();
    this.commitHeroLevelResetTimes();
    this.commitSignInList();
    this.commitDailyTaskList();
    this.commitDailyWelfareList();
    this.commitMouthWelfareList();
    this.commitWeekendGift();
    this.commitGodRelic();
    this.commitHeroPalace();
    this.commitRechargeDaysB();
    this.commitTimeTower();
    this.commitSpaceTimeAdventure();
    this.commitMagicTowerRoad();
    this.commitQiShenQi();
    this.commitZhuShenJiTan();
    this.commitMidFood();
    this.commitQiuShangMingYue();
    this.commitWanShengLottery();
    this.commitHeiWuMission();
    this.commitChristmasGift();
    this.commitSpringOuting();
    this.commitChristmasMission();
    this.commitMagicTowerLevelRank();
    this.commitSpringOutingGrid();
  }

  /**
   * 空的 c2s 2001，紧接着空的 c2s 5001。
   * Boot 仍只调用这一处再调用 pullChapter / pullIdle，不在中间夹别的号。
   * 进 Main 前会等 citySyncMissing 清空，缺包就停在加载层重试。
   * 相对顺序因此是 2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
   * 15000、4001、17000、12010、18001、22000、21010、27001、4004、13044、4101、4013、74100、51001、20001、20012、70001、73001、74300、68001、75501、59001、59010、55001、34001、32001、4402、4401、4201、74104 、28100、28200、75601、75606、75615、28107、3099、3101、20101、3203、4044、13010、12020、26002 和 26001 在 pullIdle 里，跟在 3004 后面。4001 带 page=1，不是空体。17000、12010、18001、22000、21010、27001、4004、13044、4101、4013、74100、51001、20001、20012、70001、73001、74300、68001、75501、59001、59010、55001、34001、32001、4402、4401、4201、74104 、28100、28200、75601、75606、75615、28107、3099、3101、20101、3203、4044、13010、12020、26002 和 26001 是空体。20101 的空帧是 04000000854e0000。3203 的空帧是 04000000830c0000。4044 的空帧是 04000000cc0f0000。13010 的空帧是 04000000d2320000，不是启动链 12010。12020 的空帧是 04000000f42e0000，不是启动链 12010，也不是 12021。26002 的空帧是 0400000092650000，不是 26001，也不是启动链 12010，也不是 12020。26001 的空帧是 0400000091650000，不是 26002，也不是启动链 12010，也不是 12020。75606 的空帧是 0400000056270100，不是 75607。75615 的空帧是 040000005f270100，不是 75607。
   */
  static pullRoleProfile(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ROLE_CMD);
    this.pullBackpack();
  }

  /** 空的 c2s 5001。GReqBackPackList 没有包体。没连上返回 false，不改本地背包。 */
  static pullBackpack(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    net.send(WIRE_BAG_CMD);
    return true;
  }

  /** 收到过 s2c 5001（含空包体）才算同步。5002 单独到不算。 */
  static hasBag(): boolean {
    return this.bagItems !== null;
  }

  /**
   * 进主城前要看见的包。空包体算到。
   * 2001 顶栏、5001 背包、3007 主线、3004 挂机，再加上主城会挡页面的 4001 / 15000 / 3101 / 3099。
   * pullIdle 里更后面的活动号照旧发，不挡切场景。
   */
  static citySyncMissing(): string[] {
    const missing: string[] = [];
    if (!this.hasRoleProfile()) missing.push("2001");
    if (!this.hasBag()) missing.push("5001");
    if (!this.hasChapter()) missing.push("3007");
    if (!this.hasIdle()) missing.push("3004");
    if (!this.hasHero()) missing.push("4001");
    if (!this.hasMail()) missing.push("15000");
    if (!this.hasLineUp()) missing.push("3101");
    if (!this.hasFormation()) missing.push("3099");
    return missing;
  }

  /** s2c 2001 至少写进顶栏一格。空包和解不开的包不算。 */
  static hasRoleProfile(): boolean {
    return Session.wireSync.name || Session.wireSync.level || Session.wireSync.gold || Session.wireSync.diamond;
  }

  /**
   * 空的 c2s 3007。旧桥日志三例都在 c2s 2001 之后的进游戏同步里发这一帧，包体是空的。
   * 这里跟在 pullRoleProfile 后面发。pullRoleProfile 已经先发了空的 5001。
   * 不等 s2c 2001，也不发夹在中间的其它号。
   */
  static pullChapter(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_CHAPTER_CMD);
  }

  /**
   * 主线页「关卡数据」。再发一帧空的 c2s 3007，整帧 04000000bf0b0000。
   * GReqChapterData 没有字段。挂在已合 3001 / 3010 / 3012 之后，进战前拉关卡状态。
   * 不进 pullIdle，不重发 3001、3010、3012、3006、3102、3103、3030。
   * 没连上或还没有 3007 idx 时返回 false。
   * 只读 RoleMission。不落库，无扣费，不推进 chapterId。不写 Session.stageId。
   * 不发 3002、3005、3008、3011。硬禁 3013、4601、29001。
   */
  static pullChapterProbe(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    net.send(WIRE_CHAPTER_CMD);
    return true;
  }

  /** 主城「主线」按钮。还没有 now_idx / max_idx 时是「主线 · 未同步」。 */
  static mainlineLabel(): string {
    return formatWireMainline(this.nowIdx, this.maxIdx);
  }

  /** 主城主线入口。两个 idx 都没出现过就不打开只读页。max_idx=0 算有。 */
  static hasChapter(): boolean {
    return wireChapterHasIdx({
      nowIdx: this.nowIdx,
      maxIdx: this.maxIdx,
      resRewardTime: null,
      extraRewardIds: [],
    });
  }

  /**
   * 主线页「挑战」。空 c2s 3001，GReqBattleMatch。
   * 插在已合的 3007 之后；3101 若登录链已经拉过，这里不重发。
   * 不进 pullIdle，不接活动链末，不夹活动号。
   * 没连上或还没有 3007 idx 时返回 false。
   * 不发 3002、3005、3008、3011、3013、3100、3097、3098、18002、18001、1201、1202。
   * 不重发 3004、3099、3101、3203。硬禁 4601、29001。
   */
  static challengeMainline(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    net.send(WIRE_BATTLE_MATCH_CMD);
    return true;
  }

  /**
   * 主线页只读拉已领首通。空 c2s 3010，GReqChapterRewardList。
   * 战斗链续在已合 3001 之后：…→3007→…→3001→3010。
   * 不跟挑战同一发，不重发 3001，也不重发 3007、3004、3099、3101、18001、3203。
   * 不进 pullIdle，不接活动链末，不夹活动号。
   * 没连上或还没有 3007 idx 时返回 false。
   * 不发 3002、3005、3008、3011、3013、76271、1201、1202。不从这一发夹 3012。
   * 硬禁 4601、29001。本刀不挑战，不结算。
   */
  static pullChapterRewardList(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    net.send(WIRE_CHAPTER_REWARD_CMD);
    return true;
  }

  /** 收到过 s2c 3010（含空包体）才算同步。解不开的包不算。3001、3007、3002 单独到不算。 */
  static hasChapterReward(): boolean {
    return this.chapterReward !== null;
  }

  /**
   * 主线页只读拉快速战斗次数。空 c2s 3012，GReqQuickBattleInitData。
   * 战斗链续在已合 3010 之后：…→3001→3010→3012。
   * 不跟 3010 同一发，不重发 3010，也不重发 3007、3004、3001、3099、3101、18001、3203。
   * 不进 pullIdle，不接活动链末，不夹活动号。
   * 没连上或还没有 3007 idx 时返回 false。
   * 不发 3002、3005、3008、3011。硬禁 3013。76271 仍暂缓。3102 另帧，不从这里发。
   * 硬禁 4601、29001。不把 Mock 1201/1202 当真服。
   */
  static pullQuickBattleCount(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    net.send(WIRE_QUICK_BATTLE_CMD);
    return true;
  }

  /** 收到过 s2c 3012（含空包体）才算同步。解不开的包不算。3010、3001、3007、3013 单独到不算。 */
  static hasQuickBattle(): boolean {
    return this.quickBattle !== null;
  }

  /**
   * 主线页「挂机战报」。c2s 3006，GReqChapterReport。
   * 包体是 chapterIdx、firstPos，不是空帧。缺省或小于 1 时写成 1。
   * 战斗链续在已合 3012 之后：…→3010→3012→3006。
   * 不跟 3012 同一发，不重发 3012，也不重发 3007、3004、3001、3010、3099、3101、18001、3203。
   * 不进 pullIdle，不接活动链末，不夹活动号。
   * 没连上或还没有 3007 idx 时返回 false。
   * 不发 3002、3005、3008、3011。硬禁 3013。3102 另帧，不从这里自动发。3004 空壳另帧，不从这里自动发。
   * 硬禁 4601、29001。不把 Mock 1201/1202 当真服。
   * 服只算 HANG_UP。不写 receiveReward，不推进 chapterId，不落库。胜了不回拉 3007。
   */
  static pullChapterReport(chapterIdx?: number, firstPos?: number): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    net.send(WIRE_CHAPTER_REPORT_CMD, {
      chapterIdx: normalizeWireChapterReportIndex(chapterIdx),
      firstPos: normalizeWireChapterReportIndex(firstPos),
    });
    return true;
  }

  /** 收到过 s2c 3006（含空包体）才算同步。解不开的包不算。3001、3012、3005、3007、3102 单独到不算。 */
  static hasChapterReport(): boolean {
    return this.chapterReport !== null;
  }

  /**
   * 主线页「请求战报」。c2s 3102，GReqBattleReport。
   * 包体是 battle_id、type 两个 string，不是空壳。空白收成 1。
   * 战斗链续在已合 3006 之后：…→3012→3006→3102。
   * 不跟 3006 同一发，不重发 3006，也不重发 3007、3004、3001、3010、3012、3099、3101、18001、3203。
   * 不从 3001 或 3006 的回包自动接。3001 / 3006 的 battle_id 常回 BATTLE_REPORT_TIMEOUT。
   * 不进 pullIdle，不接活动链末，不夹活动号。不跟 3100、3097、3098 混发。
   * 没连上或还没有 3007 idx 时返回 false。
   * 不发 3002、3005、3008、3011。硬禁 3013。
   * 硬禁 4601、29001。不把 Mock 1201/1202 当真服。
   * 纯读 getReport。无领奖，无扣费。胜了不回拉 3007。3103 另帧，不从这里自动发。
   */
  static pullBattleReport(battleId?: string, type?: string): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    const query = readWireBattleReportQuery({ battleId, type });
    net.send(WIRE_BATTLE_REPORT_CMD, query);
    return true;
  }

  /** 收到过 s2c 3102（含空包体）才算同步。解不开的包不算。3001、3006、3007、3103 单独到不算。 */
  static hasBattleReport(): boolean {
    return this.battleReport !== null;
  }

  /**
   * 主线页「预计算战斗力」。c2s 3103，GReqPreComputeStrength。
   * 不传或 shell 为 true 时发空壳 040000001f0c0000。
   * 否则带 hero_ids、type、line_up_type。空白的 type 和 line_up_type 不编。
   * 战斗链续在已合 3102 之后：…→3006→3102→3103。
   * 不跟 3102 同一发，不重发 3102，也不重发 3007、3004、3001、3006、3010、3012、3099、3101、18001、3203。
   * 不从 3102、3001 或 3006 的回包自动接。
   * 不进 pullIdle，不接活动链末，不夹活动号。不跟 3100、3097、3098、3030 混发。
   * 没连上或还没有 3007 idx 时返回 false。
   * 不发 3002、3005、3008、3011。硬禁 3013。
   * 硬禁 4601、29001。不把 Mock 1201/1202 当真服。
   * 只计算。不开战，不落库，无领奖，无扣费。不回拉 3007。不播 spine。
   * 空 hero_ids 回 fighting=0 仍是成功。
   */
  static pullPreComputeStrength(query?: Partial<WirePreComputeQuery> | null): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    const parsed = readWirePreComputeQuery(query === undefined || query === null ? undefined : query);
    net.send(WIRE_PRECOMPUTE_CMD, parsed);
    return true;
  }

  /** 收到过 s2c 3103（含空包体、含 fighting=0）才算同步。解不开的包不算。3102、3001、3006、3007 单独到不算。 */
  static hasPreCompute(): boolean {
    return this.preCompute !== null;
  }

  /**
   * 主线页「切磋」。c2s 3030，GReqStudy。
   * 包体是 type、opponent_id、server_id，不是空壳。缺 opponent_id 不发。
   * 默认本服 type=0。server_id 缺省写成 1。路由看 server_id。
   * opponent_id 等于当前角色时不发。
   * 不进 pullIdle，不接活动链末，不夹活动号。不跟 3100、3097、3098、3102、3103 混发。
   * 没连上或还没有 3007 idx 时返回 false。
   * 不发 3002、3005、3008、3011。硬禁 3013。不是 18001。
   * 硬禁 4601、29001。不把 Mock 1201/1202 当真服。
   * 开战 STUDY 并落库。无领奖，无扣钻，不推进 chapterId。胜了不回拉 3007。不自动发 3102。
   */
  static pullStudy(type?: number, opponentId?: number, serverId?: number): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    const query = readWireStudyQuery({ type, opponentId, serverId });
    if (!query) return false;
    const selfId = Session.role ? Session.role.roleId : null;
    if (selfId !== null && query.opponentId === selfId) return false;
    net.send(WIRE_STUDY_CMD, query);
    return true;
  }

  /** 收到过 s2c 3030（含空包体）才算同步。解不开的包不算。3001、3006、3102、3103、3007 单独到不算。 */
  static hasStudy(): boolean {
    return this.study !== null;
  }

  /**
   * 主线页「GM 加英雄」，以及空名册点「挑战」的过渡补英雄。c2s 2015，GReqGMCommandNew。
   * command=ADD_HERO，param 是类型号和 "9"。类型号空白时用 10505010。不是正整数不发。
   * 不进 pullIdle。成功没有 2015 回包。实例在 s2c 4030。
   * 没连上或还没有 3007 idx 时返回 false。
   */
  static pullGmAddHero(typeId: string): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    const query = readWireGmAddHero({ command: WIRE_GM_COMMAND, typeId });
    if (!query) return false;
    net.send(WIRE_GM_CMD, query);
    return true;
  }

  /**
   * 调试面板的 c2s 2015。ADD_HERO 仍走 pullGmAddHero，星级保持 9。
   * 其它命令是 gm 表里的大写名，或道具页补的 ADD_ITEM。不进 pullIdle。
   * 不写本地背包，不写名册。没连上、还没有 3007、或命令不合法时返回 false。
   */
  static pullGmCommand(command: string, params: readonly string[]): boolean {
    if (command === WIRE_GM_COMMAND) {
      const typeId = params.length > 0 ? params[0] : "";
      return this.pullGmAddHero(typeId);
    }
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    const query = readWireGmCommand({ command, params: params.slice() });
    if (!query) return false;
    net.send(WIRE_GM_CMD, { command: query.command, params: query.params });
    GameLog.shared.info("GM", "c2s 2015 " + query.command + " param=" + query.params.join(",") + " 不写本地数据");
    return true;
  }

  /**
   * 主线页「GM 上 MAIN」，以及空 MAIN 点「挑战」时的过渡上阵。c2s 3100，GReqLineUpSave。
   * type=0，formation_id=1，goddess_type=0，position=2。
   * 传入 heroId 时用这只服端实例（4001 或 4030）。不传时用最近一次 4030。
   * 没有实例不发。站位不在 2/3/5/6/7/8/9 不发。
   * 不进 pullIdle。不改 3101 的只读快照。成功是空的 s2c 3100。
   * 没连上或还没有 3007 idx 时返回 false。
   */
  static pullMainLineUp(heroId?: number): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    const id = heroId === undefined ? this.gmHeroId : heroId;
    if (id === null) return false;
    const query = readWireLineUpSave({ heroId: id, position: WIRE_MAIN_POSITION });
    if (!query) return false;
    net.send(WIRE_LINEUP_SAVE_CMD, query);
    return true;
  }

  /**
   * 出阵确认。一帧 c2s 3100，type=0，formation_id 字段 5 = 1。
   * 站位按阵法 1 的 2/3/5/6/7/8/9 依次填，多出来的不发。
   * 成功的空 s2c 3100 之后再拉 3101，阵容只从那包进 GameStore。
   */
  static saveMainFormation(heroIds: readonly number[]): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    const heroes: { heroId: number; position: number }[] = [];
    for (let i = 0; i < heroIds.length && heroes.length < WIRE_LINEUP_SAVE_POSITIONS.length; i++) {
      const id = heroIds[i];
      if (!Number.isSafeInteger(id) || id < 1) continue;
      heroes.push({ heroId: id, position: WIRE_LINEUP_SAVE_POSITIONS[heroes.length] });
    }
    if (heroes.length === 0) return false;
    net.send(WIRE_LINEUP_SAVE_CMD, { heroes });
    return true;
  }

  /**
   * 写操作之后再拉角色、背包、挂机时间和关卡。
   * 不重拉 4001：pullHero(1) 会先清掉还没收齐的名册。
   * 英雄变更仍等服上的 4001 / 4030。界面只吃随后的 s2c。
   */
  static refreshPersisted(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    if (Session.source !== "wire") return;
    this.pullRoleProfile();
    net.send(WIRE_IDLE_CMD);
    this.pullChapter();
  }

  private static resetGmProbe(): void {
    this.gmHeroId = null;
    this.gmHeroIds = [];
    this.gmHeroSerial = 0;
    this.lineUpSaveSerial = 0;
    this.mainLineReady = false;
    this.wireErrorText = "";
    this.wireErrorSerial = 0;
  }

  /**
   * 主线页「挂机奖励」。再发一帧空的 c2s 3004，整帧 04000000bc0b0000。
   * GReqChapterItemList 没有字段。挂在已合 3006 之后，和挂机战报并排。
   * 不进 pullIdle，不重发 3006、3007、3001、3010、3012、3102、3103、3030。不从 3006 自动接。
   * 没连上或还没有 3007 idx 时返回 false。
   * 只读。不领取，不落库，无扣费，不推进 chapterId。不写金币，不写 Session.stageId。
   * 不发 3005、3002、3008、3011。硬禁 3013、4601、29001。
   */
  static pullIdleProbe(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    net.send(WIRE_IDLE_CMD);
    return true;
  }

  /**
   * 空的 c2s 3004，紧接着空的 c2s 15000，再发 c2s 4001 page=1，然后空的 c2s 17000，再发空的 c2s 12010，再发空的 c2s 18001，再发空的 c2s 22000，再发空的 c2s 21010，再发空的 c2s 27001，再发空的 c2s 4004，再发空的 c2s 13044，再发空的 c2s 4101，再发空的 c2s 4013，再发空的 c2s 74100，再发空的 c2s 51001，再发空的 c2s 20001，再发空的 c2s 20012，再发空的 c2s 70001，再发空的 c2s 73001，再发空的 c2s 74300，再发空的 c2s 68001，再发空的 c2s 75501，再发空的 c2s 59001，再发空的 c2s 59010，再发空的 c2s 55001，再发空的 c2s 34001，再发空的 c2s 32001，再发空的 c2s 4402，再发空的 c2s 4401，再发空的 c2s 4201，再发空的 c2s 74104，再发空的 c2s 28100，再发空的 c2s 28200，再发空的 c2s 75601，再发空的 c2s 75606，再发空的 c2s 75615，再发空的 c2s 28107，再发空的 c2s 3099，再发空的 c2s 3101，再发空的 c2s 20101，再发空的 c2s 3203，再发空的 c2s 4044，再发空的 c2s 13010，再发空的 c2s 12020，再发空的 c2s 26002，再发空的 c2s 26001。
   * 跟在 pullChapter 后面发，不等 s2c 2001。51001 在 74100 之后发一次，20001 接在 51001 之后，20012 接在 20001 之后，70001 接在 20012 之后，73001 接在 70001 之后，74300 接在 73001 之后，68001 接在 74300 之后，75501 接在 68001 之后，59001 接在 75501 之后，59010 接在 59001 之后，55001 接在 59010 之后，34001 接在 55001 之后，32001 接在 34001 之后，4402 接在 32001 之后，4401 接在 4402 之后，4201 接在 4401 之后，74104 接在 4201 之后，28100 接在 74104 之后，28200 接在 28100 之后，75601 接在 28200 之后，75606 接在 75601 之后，75615 接在 75606 之后，28107 接在 75615 之后，3099 接在 28107 之后，3101 接在 3099 之后，20101 接在 3101 之后，3203 接在 20101 之后，4044 接在 3203 之后，13010 接在 4044 之后，12020 接在 13010 之后，26002 接在 12020 之后，26001 接在 26002 之后。不夹在 2001 和 3007 中间。不做 3007 的加发。
   * 3004 在空 c2s 3007 之后，包体是空的。15000、4001、17000、12010、18001、22000、21010、27001、4004、13044、4101、4013、74100、51001、20001、20012、70001、73001、74300、68001、75501、59001、59010、55001、34001、32001、4402、4401、4201 和 74104 接在 3004 后，不改 Boot.ts。
   * 不发 20018，也不发 20004、20010，也不发 20013，也不发 13260，12020 每日任务列表另只读接在 13010 之后，也不发 12021、12022，26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并，也不发 18002，也不发 22001，也不发 21011、21012，也不发 27002、27003、27004，也不发 4202。74104 是另只读，接在 4201 之后，勿与 4201 或 74100 合并。也不发 4002、4005，也不发 58001、58007，也不发 13041、13042、13043，也不发 4102、4103、4104、4105、4106、4107，也不发 9001，也不发 4014，也不发 74101、74102、74103、74105、74106，20101 是进行中活动空体，挂在 3101 之后，不发 20102。17000 不点金。12010 不领奖。18001 不开战。22000 不领奖。21010 不发奖。27001 不刷新，不抽奖，不领幸运奖。4004 不召唤，不领累积奖。4004 不是 4001。13044 不抽，不置换，不确认置换。13044 不是 4004。4101 不替换，不卸下，不一键穿，不一键卸，不合成。4101 不是 4001，也不是 13044。4013 不领奖。4013 不是 4001，也不是 4101。4014 仅 s2c 推送。74100 不升级，不携带，不卸下。74100 不是 4001，也不是 4013。74105、74106 仅 s2c 推送。51001 无写操作号。20001 不领奖。20012 不领奖。70001 不激活，不穿，不卸，不转换，不合成。70007、70008 仅推送。不做 20011。73001 不挑战，不买次数。不发 73002、73003、73004。73002 有懒建和日刷写库。本号无写库。不做 20011。74300 不升级，不升阶，不装备，不卸下，不更换，不重置。不发 74301、74302、74303。74304 仅推送，勿当拉包。本号无写库。不做 20011。68001 不激活元素，不点亮星盘，不重置，不激活星盘。不发 68002、68003、68004、68006。68005 是更新星数常量，勿当拉包。无 page。轻懒建，首次 load 可能 astrolabeDao.add 空行。无扣费，无领奖，无日刷写库。管理员认定可接受。不做 20011。75501 不添加，不卸下，不开格子，不清 cd。不发 75502、75503、75504、75505。75506 是等级推送，勿当拉包。无 page。轻懒建，首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉。无扣费，无领奖。管理员认定可接受，同星盘。不做 34001。不做 20011。59001 不放源石，不提升鉴定，不加速鉴定，不领鉴定奖，不提升圣龙等级，不替换圣物，不调顺序，不升星，不分解。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。无 page。轻懒建，首次 dragonDao.add。无扣费，无领奖。不做 34001。不做 20011。55001 只读，无 page。Title.proto 仅 55001 读写对，同模块无写号。轻懒建，TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。34001 是另只读，单独在 55001 之后拉包，勿与 55001 合并。不发 34002。34003 是解锁推送，勿发、勿当拉包。32001 另只读接在其后。不做 20011。34001 只读，无 page。轻懒建，RoleHeadPortraitService.select 无记录则 dao.add 默认解锁头。无扣费，无领奖，不改当前头像。4402 只读，无 page。不发 4403 激活、4404 替换/使用、4405 皮肤升级。4406 无实现，勿发。4401 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。过期限时皮剔除，并可能把英雄 fashionId 置 0。只读展示。无扣费，无领奖。挂在 32001 之后。
   */
  static pullIdle(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_IDLE_CMD);
    this.pullMail();
    this.pullHero();
    this.pullActivity();
    this.pullAchievement();
    this.pullPvp();
    this.pullSevenDay();
    this.pullGoal7();
    this.pullWish();
    this.pullSummon();
    this.pullProphet();
    this.pullJewel();
    this.pullIllustrat();
    this.pullPet();
    this.pullWorld();
    this.pullPromotion();
    this.pullFirstRecharge();
    this.pullReiki();
    this.pullIslands();
    this.pullTotems();
    this.pullAstrolabe();
    this.pullTweakCube();
    this.pullDragon();
    this.pullDragonCollection();
    this.pullTitleList();
    this.pullHeadPortrait();
    this.pullBorder();
    this.pullFashion();
    this.pullWornFashion();
    this.pullHeroPrayer();
    this.pullPetIllustrate();
    this.pullFetter();
    this.pullFetterFashion();
    this.pullShenBin();
    this.pullOccupation();
    this.pullRoleShenBin();
    this.pullFetterContract();
    this.pullFormation();
    this.pullLineUp();
    this.pullRunningPromotion();
    this.pullTowerReward();
    this.pullHeroLevelResetTimes();
    this.pullSignInList();
    this.pullDailyTaskList();
    this.pullDailyWelfareList();
    this.pullMouthWelfareList();
    this.pullWeekendGift();
    this.pullGodRelic();
    this.pullHeroPalace();
    this.pullRechargeDaysB();
    this.pullTimeTower();
    this.pullSpaceTimeAdventure();
    this.pullMagicTowerRoad();
    this.pullQiShenQi();
    this.pullZhuShenJiTan();
    this.pullMidFood();
    this.pullQiuShangMingYue();
    this.pullWanShengLottery();
    this.pullHeiWuMission();
    this.pullChristmasGift();
    this.pullSpringOuting();
    this.pullChristmasMission();
    this.pullMagicTowerLevelRank();
    this.pullSpringOutingGrid();
  }

  /** 空的 c2s 15000。没有包体。不发领取和删除。 */
  static pullMail(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_MAIL_CMD);
  }

  /** 收到过 s2c 15000（含空包体）才算同步。解不开的包不算。 */
  static hasMail(): boolean {
    return this.mailEntries !== null;
  }

  /**
   * c2s 4001，GReqHeroList.page。缺省和小于 1 都按 1 发，不发空体。
   * page=1 会丢掉还没收齐的翻页。不发升级。
   */
  static pullHero(page = 1): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    const safe = page >= 1 && Number.isFinite(page) ? Math.floor(page) : 1;
    if (safe === 1) this.resetHeroGather();
    net.send(WIRE_HERO_CMD, { page: safe });
  }

  /** 收齐过 s2c 4001（含空名册）才算同步。空体和解不开的包不算。 */
  static hasHero(): boolean {
    return this.heroes !== null;
  }

  /** 空的 c2s 17000。没有包体。不点金。 */
  static pullActivity(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ACTIVITY_CMD);
  }

  /** 收到过 s2c 17000（含空包体）才算同步。解不开的包不算。 */
  static hasActivity(): boolean {
    return this.activity !== null;
  }

  /** 空的 c2s 12010。没有包体。不领奖。服端可能因此补成就。 */
  static pullAchievement(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ACHIEVEMENT_CMD);
  }

  /** 收到过 s2c 12010（含空包体、含空 task）才算同步。解不开的包不算。 */
  static hasAchievement(): boolean {
    return this.achievements !== null;
  }

  /** 空的 c2s 18001。GReqPvpData 没有包体。不开战，不刷新，不买票，不点赞。 */
  static pullPvp(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PVP_CMD);
  }

  /** 收到过 s2c 18001（含空包体、含空对手表）才算同步。解不开的包不算。 */
  static hasPvp(): boolean {
    return this.pvp !== null;
  }

  /** 空的 c2s 22000。GReqSevenDayLoginData 没有包体。不领奖。 */
  static pullSevenDay(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SEVEN_CMD);
  }

  /** 收到过 s2c 22000（含空包体、含空表）才算同步。解不开的包不算。22002 单独到不算。 */
  static hasSevenDay(): boolean {
    return this.sevenDay !== null;
  }

  /** 空的 c2s 21010。GReqSevenDayTargetList 没有包体。不发奖。可能建档并懒填计数。 */
  static pullGoal7(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_GOAL7_CMD);
  }

  /** 收到过 s2c 21010（含空包体、含空表）才算同步。解不开的包不算。21013 单独到不算。 */
  static hasGoal7(): boolean {
    return this.goal7 !== null;
  }

  /** 空的 c2s 27001。没有包体。不刷新，不抽奖，不领幸运奖。可能懒建或跨日写库，无扣费。 */
  static pullWish(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_WISH_CMD);
  }

  /** 收到过 s2c 27001（含空包体、含空表）才算同步。解不开的包不算。 */
  static hasWish(): boolean {
    return this.wish !== null;
  }

  /** 空的 c2s 4004。没有包体，也没有 page。不召唤，不领累积奖。可能懒建 HeroSummon。 */
  static pullSummon(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SUMMON_CMD);
  }

  /** 收到过 s2c 4004（含空包体）才算同步。解不开的包不算。 */
  static hasSummon(): boolean {
    return this.summon !== null;
  }

  /** 空的 c2s 13044。GReqProphetSummonInfo 没有包体。不抽，不置换，不确认置换。可能懒建 HeroSummon。跨日可能重置 levelResetTimes。 */
  static pullProphet(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PROPHET_CMD);
  }

  /** 收到过 s2c 13044（含空包体、含空表）才算同步。解不开的包不算。 */
  static hasProphet(): boolean {
    return this.prophet !== null;
  }

  /** 空的 c2s 4101。GReqHeroJewel 没有包体，也没有 page。不替换，不卸下，不合成。无写库。 */
  static pullJewel(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_JEWEL_CMD);
  }

  /** 收到过 s2c 4101（含空包体、含空表）才算同步。解不开的包不算。 */
  static hasJewel(): boolean {
    return this.jewel !== null;
  }

  /** 空的 c2s 4013。GReqIllustratReward 没有包体。名字像领奖，实为查看。不发 4014。无档时服端可能懒建空记录。 */
  static pullIllustrat(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ILLUSTRAT_CMD);
  }

  /** 收到过 s2c 4013（含空包体、含空表）才算同步。解不开的包不算。4014 单独到不算。 */
  static hasIllustrat(): boolean {
    return this.illustrat !== null;
  }

  /** 空的 c2s 74100。GReqPetInfoList 没有包体。不升级，不携带，不卸下。不主动发 74105、74106。无写库。 */
  static pullPet(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PET_CMD);
  }

  /** 收到过 s2c 74100（含空包体、含空表）才算同步。解不开的包不算。74105、74106 单独到不算。 */
  static hasPet(): boolean {
    return this.pet !== null;
  }

  /** 空的 c2s 51001。GReqWorldLevel 没有包体。只在 74100 之后发一次。不做 20101。无写库。 */
  static pullWorld(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_WORLD_CMD);
  }

  /** 收到过 s2c 51001（含空包体）才算同步。解不开的包不算。20101 单独到不算。 */
  static hasWorld(): boolean {
    return this.world !== null;
  }

  /** 空的 c2s 20001。GReqPromotionList 没有包体。只在 51001 之后发一次。不发 20018。不发 20004、20010。不做 3007。 */
  static pullPromotion(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PROMOTION_CMD);
  }

  /** 收到过 s2c 20001（含空包体）才算同步。解不开的包不算。20018、20004、20010 单独到不算。 */
  static hasPromotion(): boolean {
    return this.promotion !== null;
  }

  /** 空的 c2s 20012。GReqFirstRecharge 没有包体。只在 20001 之后发一次。不发 20013。不做 13260。 */
  static pullFirstRecharge(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FIRST_CMD);
  }

  /** 收到过 s2c 20012（含空包体）才算同步。解不开的包不算。20013、13260 单独到不算。 */
  static hasFirstRecharge(): boolean {
    return this.firstRecharge !== null;
  }

  /** 空的 c2s 70001。GReqReikiEquipData 没有包体。只在 20012 之后发一次。不发 70002、70003、70004、70005、70006。不做 20011。70007、70008 不当拉包请求。 */
  static pullReiki(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_REIKI_CMD);
  }

  /** 收到过 s2c 70001（含空包体）才算同步。解不开的包不算。70002–70008、20011 单独到不算。 */
  static hasReiki(): boolean {
    return this.reiki !== null;
  }

  /** 空的 c2s 73001。GReqFloatingIslandsTime 没有包体。只在 70001 之后发一次。不发 73002、73003、73004。不做 20011。本号无写库。 */
  static pullIslands(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ISLANDS_CMD);
  }

  /** 收到过 s2c 73001（含空包体）才算同步。解不开的包不算。73002、73003、73004、20011 单独到不算。 */
  static hasIslands(): boolean {
    return this.islands !== null;
  }

  /** 空的 c2s 74300。GReqTotemsInfoList 没有包体。只在 73001 之后发一次。不发 74301、74302、74303。74304 不当拉包请求。不做 20011。本号无写库。 */
  static pullTotems(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_TOTEMS_CMD);
  }

  /** 收到过 s2c 74300（含空包体、含空表）才算同步。解不开的包不算。74301、74302、74303、74304、20011 单独到不算。 */
  static hasTotems(): boolean {
    return this.totems !== null;
  }

  /** 空的 c2s 68001。GReqAstrolabeData 没有包体，没有 page。只在 74300 之后发一次。不发 68002、68003、68004、68006。68005 不当拉包请求。不做 20011。轻懒建可接受。 */
  static pullAstrolabe(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ASTROLABE_CMD);
  }

  /** 收到过 s2c 68001（含空包体）才算同步。解不开的包不算。68002、68003、68004、68005、68006、20011 单独到不算。 */
  static hasAstrolabe(): boolean {
    return this.astrolabe !== null;
  }

  /** 空的 c2s 75501。GReqTweakCube 没有包体，没有 page。只在 68001 之后发一次。不发 75502、75503、75504、75505。75506 不当拉包请求。不做 34001。不做 20011。轻懒建可接受，同星盘。 */
  static pullTweakCube(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_CUBE_CMD);
  }

  /** 收到过 s2c 75501（含空包体）才算同步。解不开的包不算。75502、75503、75504、75505、75506、34001、20011 单独到不算。 */
  static hasTweakCube(): boolean {
    return this.tweakCube !== null;
  }

  /** 空的 c2s 59001。GReqDragonScanInfo 没有包体，没有 page。只在 75501 之后发一次。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 单独在其后拉包，勿与本请求合并，勿当写号。不做 34001。不做 20011。轻懒建可接受。 */
  static pullDragon(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_DRAGON_CMD);
  }

  /** 收到过 s2c 59001（含空包体）才算同步。解不开的包不算。59002、59003、59005、59006、59007、59008、59009、59010、59011、59012、59013、34001、20011 单独到不算。 */
  static hasDragon(): boolean {
    return this.dragon !== null;
  }

  /** 空的 c2s 59010。GReqDragonCollection 没有包体，没有 page。只在 59001 之后发一次。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。不做 34001。不做 20011。轻懒建可接受。 */
  static pullDragonCollection(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_DRAGON_COLLECTION_CMD);
  }

  /** 收到过 s2c 59010（含空包体）才算同步。解不开的包不算。59001、59002、59003、59005、59006、59007、59008、59009、59011、59012、59013、34001、20011 单独到不算。 */
  static hasDragonCollection(): boolean {
    return this.dragonCollection !== null;
  }

  /** 空的 c2s 55001。GReqScanTitleList 没有包体，没有 page。只在 59010 之后发一次。Title.proto 仅 55001 读写对，同模块无写号。34001 另只读接在其后，勿合并。不做 20011。轻懒建可接受。 */
  static pullTitleList(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_TITLE_CMD);
  }

  /** 收到过 s2c 55001（含空包体）才算同步。解不开的包不算。59010、59001、34001、34002、34003、32001、20011 单独到不算。 */
  static hasTitleList(): boolean {
    return this.titleList !== null;
  }

  /** 空的 c2s 34001。GReqHeadPortraitList 没有包体，没有 page。只在 55001 之后发一次。不发 34002。34003 不当拉包。32001 另只读接在其后。不做 20011。轻懒建可接受。 */
  static pullHeadPortrait(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_HEAD_PORTRAIT_CMD);
  }

  /** 收到过 s2c 34001（含空包体）才算同步。解不开的包不算。55001、34002、34003、32001、32002、32003、20011 单独到不算。 */
  static hasHeadPortrait(): boolean {
    return this.headPortrait !== null;
  }

  /** 空的 c2s 32001。GReqBorderData 没有包体，没有 page。只在 34001 之后发一次。不发 32002。不发 32003。32003 不当拉包。4402 另只读接在其后。不做 20011。29001 有 page，硬禁。轻懒建免费框可接受。 */
  static pullBorder(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_BORDER_CMD);
  }

  /** 收到过 s2c 32001（含空包体）才算同步。解不开的包不算。34001、32002、32003、4402、29001、20011 单独到不算。 */
  static hasBorder(): boolean {
    return this.border !== null;
  }

  /** 空的 c2s 4402。GReqHeroFashionList 没有包体，没有 page。只在 32001 之后发一次。不发 4403、4404、4405。4406 无实现，勿发。4401 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。 */
  static pullFashion(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FASHION_CMD);
  }

  /** 收到过 s2c 4402（含空包体）才算同步。解不开的包不算。32001、4401、4403、4404、4405、4406、29001、20011 单独到不算。 */
  static hasFashion(): boolean {
    return this.fashion !== null;
  }

  /** 空的 c2s 4401。GReqHeroFashion 没有包体，没有 page。只在 4402 之后发一次。不发 4403、4404、4405。4406 无实现，勿发。与 4402 分刀，勿合并。本刀不重复拉 4402。4201 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。 */
  static pullWornFashion(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_WORN_FASHION_CMD);
  }

  /** 收到过 s2c 4401（含空包体）才算同步。解不开的包不算。4402、4403、4404、4405、4406、4601、4201、4202、74104、29001、20011 单独到不算。 */
  static hasWornFashion(): boolean {
    return this.wornFashion !== null;
  }

  /** 空的 c2s 4201。GReqHeroPrayerData 没有包体，没有 page。只在 4401 之后发一次。不发 4202。74104 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 4401 分刀，勿合并。本刀不重复拉 4401。轻懒建 hero_prayer 可接受。 */
  static pullHeroPrayer(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_HERO_PRAYER_CMD);
  }

  /** 收到过 s2c 4201（含空包体）才算同步。解不开的包不算。4401、4402、4202、74104、4601、29001、20011 单独到不算。 */
  static hasHeroPrayer(): boolean {
    return this.heroPrayer !== null;
  }

  /** 空的 c2s 74104。GReqPetIllustrate 没有包体，没有 page。只在 4201 之后发一次。不发 74101、74102、74103。74105、74106 是背包增减推送，勿当拉包。28100 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74100、4201 分开发，勿合并。本刀不重复拉 74100，也不重复拉 4201。轻懒建空 PetIllustrate 可接受。 */
  static pullPetIllustrate(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_PET_ILLUSTRATE_CMD);
  }

  /** 收到过 s2c 74104（含空包体）才算同步。解不开的包不算。74100、74101、74102、74103、74105、74106、4201、28101、4601、29001、20011 单独到不算。28100 是下一帧，单独到不算这一份。 */
  static hasPetIllustrate(): boolean {
    return this.petIllustrate !== null;
  }

  /** 空的 c2s 28100。GReqFetterList 没有包体，没有 page。只在 74104 之后发一次。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003。28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74104、4201 分开发，勿合并。本刀不重复拉 74104，也不重复拉 4201。轻懒建（load/getFetterTask）可接受。 */
  static pullFetter(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FETTER_CMD);
  }

  /** 收到过 s2c 28100（含空包体）才算同步。解不开的包不算。74104、4201、28101、28102、28104、28105、28106、28108、28109、28002、28003、28200、4601、29001、20011 单独到不算。 */
  static hasFetter(): boolean {
    return this.fetter !== null;
  }

  /** 空的 c2s 28200。GReqFashionData 没有包体，没有 page。只在 28100 之后发一次。不发 28201、28202、28203、28204、28205。28203 任务列表虽只读，本刀勿夹发。不发 28101–28109、28002、28003。75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28100、74104 分开发，勿合并。本刀不重复拉 28100，也不重复拉 74104。轻懒建 goddess_fashion 可接受。无扣费，无发奖，不改皮肤。 */
  static pullFetterFashion(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FETTER_FASHION_CMD);
  }

  /** 收到过 s2c 28200（含空包体）才算同步。解不开的包不算。28100、74104、28201、28202、28203、28204、28205、28101、28102、28103、28104、28105、28106、28107、28108、28109、28002、28003、75601、4601、29001、20011 单独到不算。75601 是下一帧，单独到不算这一份。 */
  static hasFetterFashion(): boolean {
    return this.fetterFashion !== null;
  }

  /** 空的 c2s 75601。GReqShenBinInfo 没有包体，没有 page。只在 28200 之后发一次。不发 75602、75603、75604、75605。不发 75619、75609。75606 职级信息另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28200、28100 分开发，勿合并。本刀不重复拉 28200，也不重复拉 28100。按 job 轻懒建 core（默认 coreLv=1）可接受。无合成，无装备，无核心升级，无分解。 */
  static pullShenBin(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SHENBIN_CMD);
  }

  /** 收到过 s2c 75601（含空包体）才算同步。解不开的包不算。28200、28100、75602、75603、75604、75605、75607、75608、75609、75619、75615、4601、29001、20011 单独到不算。75606 是下一帧，单独到不算这一份。 */
  static hasShenBin(): boolean {
    return this.shenBin !== null;
  }

  /** 空的 c2s 75606。GReqGetOccupationInfo 没有包体，没有 page。只在 75601 之后发一次。整帧 0400000056270100。75607 同为空体，不发 75607。不发 75609。75608 为服推，勿当 c2s。不发 75602、75603、75604、75605、75619。75615 神兵道具另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75601、28200 分开发，勿合并。本刀不重复拉 75601，也不重复拉 28200。允许 getOrCreate 轻懒建。无扣费，无领奖。 */
  static pullOccupation(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_OCCUPATION_CMD);
  }

  /** 收到过 s2c 75606（含空包体）才算同步。解不开的包不算。75601、28200、75602、75603、75604、75605、75607、75608、75609、75619、4601、29001、20011 单独到不算。75615 是下一帧，单独到不算这一份。 */
  static hasOccupation(): boolean {
    return this.occupation !== null;
  }

  /** 空的 c2s 75615。GReqRoleShenBinInfo 没有包体，没有 page。只在 75606 之后发一次。整帧 040000005f270100。不发 75602、75603、75604、75605、75619。不发 75607、75609。75608 为服推，勿当 c2s。75607 同为空体，不发 75607。28107 查看契约另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75606、75601 分开发，勿合并。本刀不重复拉 75606，也不重复拉 75601。允许 getOrCreate 轻懒建（默认 knighthoodId=1）。只读拼包。无扣费，无领奖。 */
  static pullRoleShenBin(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ROLE_SHENBIN_CMD);
  }

  /** 收到过 s2c 75615（含空包体）才算同步。解不开的包不算。75606、75601、75602、75603、75604、75605、75607、75608、75609、75619、4601、29001、20011 单独到不算。28107 是下一帧，单独到不算这一份。 */
  static hasRoleShenBin(): boolean {
    return this.roleShenBin !== null;
  }

  /** 空的 c2s 28107。GReqFetterContractInfo 没有包体，没有 page。只在 75615 之后发一次。整帧 04000000cb6d0000。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003、28004。不发 28201、28202、28203、28204、28205。3099 查询阵法另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75615、75606 分开发，勿合并。本刀不重复拉 75615，也不重复拉 75606。轻懒建（getFetterTask）可接受。只读，无解锁、无扣费、无领奖。 */
  static pullFetterContract(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FETTER_CONTRACT_CMD);
  }

  /** 收到过 s2c 28107（含空包体）才算同步。解不开的包不算。75615、75606、28100、28101、28102、28104、28105、28106、28108、28109、28002、28003、28004、28201、28202、28203、28204、28205、3099、4601、29001、20011 单独到不算。 */
  static hasFetterContract(): boolean {
    return this.fetterContract !== null;
  }

  /** 空的 c2s 3099。GReqQueryFormation 没有包体，没有 page。只在 28107 之后发一次。整帧 040000001b0c0000。不发 3097 解锁第二契约、3098 解锁阵法、3100 保存战斗队列。不发 3102 查战报、3030 切磋。3101 副本队列另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28107、75615 分开发，勿合并。本刀不重复拉 28107，也不重复拉 75615。getFormation 轻懒建可接受（无记录则 add；未解锁阵法 id=1 则 unlock(1)+update）。只读，无扣费、无领奖、不写养成。 */
  static pullFormation(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_FORMATION_CMD);
  }

  /** 收到过 s2c 3099（含空包体）才算同步。解不开的包不算。28107、75615、3097、3098、3100、3101、3102、3030、4601、29001、20011 单独到不算。 */
  static hasFormation(): boolean {
    return this.formation !== null;
  }

  /**
   * 主线页「查询阵法」。再发一帧空的 c2s 3099，整帧 040000001b0c0000。
   * GReqQueryFormation 没有字段。小端 1b 0c 00 00。
   * 挂在已合 3101 旁边、已合 3007 之后、进战之前，和 3101、3102、3103、3030 探针并排。
   * 不进 pullIdle，不重发 3101、3007、3001、3006、3004、3102、3103、3030。
   * 不从 3001、3101、3102、3103、3030 自动接。登录链里的空 3099 仍在。
   * 没连上或还没有 3007 idx 时返回 false。
   * 只读。不落库，无扣费，不改阵法。不写金币，不写 Session.stageId。
   * 不发 3098。不发 3100。不接 3020。不发 3002、3005、3008、3011。硬禁 3013、4601、29001。
   */
  static pullFormationProbe(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    net.send(WIRE_FORMATION_CMD);
    return true;
  }

  /** 空的 c2s 3101。GReqLineUp 没有包体，没有 page。只在 3099 之后发一次。整帧 040000001d0c0000。不发 3100 保存队列、3098 解锁阵法、3097 解锁第二契约、3030 切磋、3102 请求战报、3103 预计算战斗力。3099 勿再发。不做备选 5001。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 3099 分开发，勿合并。本刀不重复拉 3099。getHeroLineUps→fillLineUp 轻修复可接受（formationId==0 则置 1 并轻修站位后 update；本路径不走 add）。只读，无扣费、无领奖、不写养成。 */
  static pullLineUp(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_LINEUP_CMD);
  }

  /**
   * 主线页「获取阵容」。再发一帧空的 c2s 3101，整帧 040000001d0c0000。
   * GReqLineUp 没有字段。小端 1d 0c 00 00。
   * 挂在已合 3007 之后、进战之前，和 3102、3103、3030 探针并排。
   * 不进 pullIdle，不重发 3007、3001、3006、3004、3102、3103、3030。
   * 不从 3001、3102、3103、3030 自动接。登录链里的空 3101 仍在。
   * 没连上或还没有 3007 idx 时返回 false。
   * 只读。不落库，无扣费，不改阵容。不写金币，不写 Session.stageId。
   * 不发 3100。不接 3020。不发 3002、3005、3008、3011。硬禁 3013、4601、29001。
   */
  static pullLineUpProbe(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    if (!this.hasChapter()) return false;
    net.send(WIRE_LINEUP_CMD);
    return true;
  }

  /** 收到过 s2c 3101（含空包体）才算同步。解不开的包不算。3099、3100、3098、3097、3030、3102、3103、5001、20011、4601、29001、20101 单独到不算。 */
  static hasLineUp(): boolean {
    return this.lineUp !== null;
  }

  /** 空的 c2s 20101。GReqRunningPromotion 没有包体，没有 page。只在 3101 之后发一次。整帧 04000000854e0000。同文件 20102 非空体勿挂。不发各活动领奖写号（20018、20013、20004、20010）。不做 20011。51001 已有，勿重复。5001 已有，勿重复。3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3101 分开发，勿合并。本刀不重复拉 3101，也不重复拉 3099。promotionControlService.getAllWillRun() 组列表。纯读。无扣费，无领奖，不写养成。 */
  static pullRunningPromotion(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_RUNNING_PROMOTION_CMD);
  }

  /** 收到过 s2c 20101（含空包体）才算同步。解不开的包不算。3101、3099、20102、20018、20013、20004、20010、20011、51001、5001、4601、29001 单独到不算。 */
  static hasRunningPromotion(): boolean {
    return this.runningPromotion !== null;
  }

  /** 空的 c2s 3203。GReqTowerRewardList 没有包体，没有 page。只在 20101 之后发一次。整帧 04000000830c0000。不发 3202 买票、3204 领首通、3205 战斗结束、3206 扫荡、3220 编辑 npc。3200 本轮勿挂。4044 英雄等级重生次数另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3099、3101、20101 勿再发。不做 3012、3010、19001。12020 每日任务列表另只读接在 13010 之后。4601 有 page，硬禁。29001 有 page，硬禁。与 20101 分开发，勿合并。本刀不重复拉 20101，也不重复拉 3101，也不重复拉 3099。towerService.getTower 无档可 towerDao.add 轻懒建。handler 不走门票回复，不 updateTower。无扣费，无领奖，无养成写。轻懒建可接受。 */
  static pullTowerReward(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_TOWER_REWARD_CMD);
  }

  /** 收到过 s2c 3203（含空包体）才算同步。解不开的包不算。20101、3101、3099、3202、3204、3205、3206、3220、3200、4044、20011、5001、51001、3012、3010、12020、19001、4601、29001 单独到不算。 */
  static hasTowerReward(): boolean {
    return this.towerReward !== null;
  }

  /** 空的 c2s 4044。GReqHeroLevelResetTimes 没有包体，没有 page。只在 3203 之后发一次。整帧 04000000cc0f0000。不发 4043 英雄等级重生。13010 签到列表另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3203 分开发，勿合并。本刀不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。getHeroSummon 可能轻懒建。跨日可能把 times 清零并更新。轻懒建、轻日刷可接受。无扣费，无领奖，无养成写。 */
  static pullHeroLevelResetTimes(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_HERO_LEVEL_RESET_TIMES_CMD);
  }

  /** 收到过 s2c 4044（含空包体）才算同步。解不开的包不算。3203、20101、3101、3099、4043、13010、20011、5001、51001、4601、29001 单独到不算。 */
  static hasHeroLevelResetTimes(): boolean {
    return this.heroLevelResetTimes !== null;
  }

  /** 空的 c2s 13010。GReqSignInList 没有包体，没有 page。只在 4044 之后发一次。整帧 04000000d2320000。不发 13011 签到领奖。12020 每日任务列表另只读接在其后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 4044 分开发，勿合并。本刀不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。getSignday 轻懒建。跨日、跨月可能把签到日重置并写库。轻懒建、轻日刷、轻月刷可接受。无扣费，无领奖。 */
  static pullSignInList(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SIGN_IN_LIST_CMD);
  }

  /** 收到过 s2c 13010（含空包体）才算同步。解不开的包不算。4044、3203、20101、3101、3099、13011、12020、12010、20011、5001、51001、4601、29001 单独到不算。 */
  static hasSignInList(): boolean {
    return this.signInList !== null;
  }

  /** 空的 c2s 12020。GReqDailyTaskList 没有包体，没有 page。只在 13010 之后发一次。整帧 04000000f42e0000。不发 12021 领每日任务奖。不发 12022 领活跃宝箱。26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 13010 分开发，勿合并。本刀不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。getDailyTasks 可能 reset、checkNew。loadRoleDailyTask 可能按日刷新宝箱进度。轻懒建、轻日刷可接受。无扣费，无领奖。 */
  static pullDailyTaskList(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_DAILY_TASK_LIST_CMD);
  }

  /** 收到过 s2c 12020（含空包体）才算同步。解不开的包不算。13010、4044、3203、20101、3101、3099、12021、12022、26002、26001、12010、20011、5001、51001、4601、29001 单独到不算。 */
  static hasDailyTaskList(): boolean {
    return this.dailyTaskList !== null;
  }

  /** 空的 c2s 26002。GReqDailyWelfareList 没有包体，没有 page。只在 12020 之后发一次。整帧 0400000092650000。26001 每月福利列表另只读接在其后，勿合并。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每日任务列表 12020。5001、51001 已有，勿重复。12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 12020 分开发，勿合并。本刀不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。纯读。轻副作用可接受。无扣费，无领奖写。 */
  static pullDailyWelfareList(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_DAILY_WELFARE_LIST_CMD);
  }

  /** 收到过 s2c 26002（含空包体）才算同步。解不开的包不算。12020、13010、4044、3203、20101、3101、3099、26001、12021、12022、12010、20011、5001、51001、4601、29001 单独到不算。 */
  static hasDailyWelfareList(): boolean {
    return this.dailyWelfareList !== null;
  }

  /** 空的 c2s 26001。GReqMouthWelfareList 没有包体，没有 page。proto 名 mouth，就是 month。只在 26002 之后发一次。整帧 0400000091650000。不重复拉 26002。不发明领奖写号。不发 12021。不发 12022。61001 周末礼包另只读接在其后，勿合并。不发 61002。不做 62001、63001。不做 20011。不是启动链 12010。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 26002 分开发，勿合并。本刀不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。纯读。轻副作用可接受。无扣费，无领奖写。 */
  static pullMouthWelfareList(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_MOUTH_WELFARE_LIST_CMD);
  }

  /** 收到过 s2c 26001（含空包体）才算同步。解不开的包不算。26002、12020、13010、4044、3203、20101、3101、3099、12021、12022、61001、12010、20011、5001、51001、4601、29001 单独到不算。 */
  static hasMouthWelfareList(): boolean {
    return this.mouthWelfareList !== null;
  }

  /** 空的 c2s 61001。GReqWeekendGiftData 没有包体，没有 page。只在 26001 之后发一次。整帧 0400000049ee0000。不重复拉 26001。不发 61002。不做 62001。不做 63001。不发明领奖写号。不发 12021。不发 12022。不做 20011。不是启动链 12010。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 26001 分开发，勿合并。本刀不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建、轻日刷可接受。无扣费，无领奖写。 */
  static pullWeekendGift(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_WEEKEND_GIFT_CMD);
  }

  /** 收到过 s2c 61001（含空包体）才算同步。解不开的包不算。26001、26002、12020、13010、4044、3203、20101、3101、3099、61002、62001、63001、12021、12022、12010、20011、5001、51001、4601、29001 单独到不算。 */
  static hasWeekendGift(): boolean {
    return this.weekendGift !== null;
  }

  /** 空的 c2s 62001。GReqGodRelicData 没有包体，没有 page。只在 61001 之后发一次。整帧 0400000031f20000。不重复拉 61001。不发 62002。不发 62003。不发 62004。不发 62005。不做 63001。不做 20011。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 61001 分开发，勿合并。本刀不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。 */
  static pullGodRelic(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_GOD_RELIC_CMD);
  }

  /** 收到过 s2c 62001（含空包体）才算同步。解不开的包不算。61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、62002、62003、62004、62005、63001、12010、20011、5001、51001、4601、29001 单独到不算。 */
  static hasGodRelic(): boolean {
    return this.godRelic !== null;
  }

  /** 空的 c2s 63001。GReqHeroPalaceData 没有包体，没有 page。只在 62001 之后发一次。整帧 0400000019f60000。不重复拉 62001。不发 63002。不发 63003。69001 积天豪礼2另帧，勿合并。不发 69002。不做 71001。不做 20011。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 62001 分开发，勿合并。本刀不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建、轻日刷可接受。跨日会清 worshipType。无扣费，无领奖写，无成长写。 */
  static pullHeroPalace(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_HERO_PALACE_CMD);
  }

  /** 收到过 s2c 63001（含空包体）才算同步。解不开的包不算。62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、63002、63003、69001、69002、71001、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasHeroPalace(): boolean {
    return this.heroPalace !== null;
  }

  /** 空的 c2s 69001。GReqRechargeDaysBList 没有包体，没有 page。只在 63001 之后发一次。整帧 04000000890d0100。不重复拉 63001。不发 69002。不做 71001。不做 20011。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 63001 分开发，勿合并。本刀不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。 */
  static pullRechargeDaysB(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_RECHARGE_DAYS_B_CMD);
  }

  /** 收到过 s2c 69001（含空包体）才算同步。解不开的包不算。63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、69002、71001、74001、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasRechargeDaysB(): boolean {
    return this.rechargeDaysB !== null;
  }

  /** 空的 c2s 74001。GReqTimeTowerInfo 没有包体，没有 page。只在 69001 之后发一次。整帧 0400000011210100。不重复拉 69001。不发 74002。不发 74003。不做 73002。不做 71001。不做 20011。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 69001 分开发，勿合并。本刀不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建（getTower 可能 add）可接受。轻日刷（跨日清 failNum）可接受。跨服回包轮次变化可能清 weekPass。无扣费，无领奖，无挑战写。 */
  static pullTimeTower(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_TIME_TOWER_CMD);
  }

  /** 收到过 s2c 74001（含空包体）才算同步。解不开的包不算。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、74120、74002、74003、73002、71001、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasTimeTower(): boolean {
    return this.timeTower !== null;
  }

  /** 空的 c2s 74120。GReqSpaceTimeAdventureInfo 没有包体，没有 page。只在 74001 之后发一次。整帧 0400000088210100。不重复拉 74001。不发 74123。不发 74124。不发 74125。不发 74126。不发 74127。不发 74128。不发 74129。不发 74131。不发 74142。不发 74147。不发 74148。不发 74149。不夹发 74121。不夹发 74122。不做 76501。不做 73002。不做 71001。不做 20011。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 74001 分开发，勿合并。本刀不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建（首次 spaceTimeInfoDao.add）可接受。体力 regainEnergy 写回可接受。商店过期清空 shopItems 可接受。无扣费，无领奖，无探索写，无购买写。76542 斩魔之路另帧，挂在其后，勿合并。 */
  static pullSpaceTimeAdventure(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SPACE_TIME_ADVENTURE_CMD);
  }

  /** 收到过 s2c 74120（含空包体）才算同步。解不开的包不算。74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、74121、74122、74123、74124、74125、74126、74127、74128、74129、74131、74142、74147、74148、74149、76542、76543、76544、76502、76503、76504、76505、76506、76541、76501、75001、73002、71001、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasSpaceTimeAdventure(): boolean {
    return this.spaceTimeAdventure !== null;
  }

  /** 空的 c2s 76542。GReqMagicTowerRoadInfo 没有包体，没有 page。只在 74120 之后发一次。整帧 04000000fe2a0100。不重复拉 74120。不发 76543。不发 76544。不发 76502。不发 76503。不发 76504。不发 76505。不发 76506。不发 76541。不发 76501。不夹发 74121。不夹发 74122。不做 75001。不做 73002。不做 71001。不做 20011。不是时空冒险 74120。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 74120 分开发，勿合并。本刀不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建（magicTowerRoadDao.add if missing）可接受。无每次更新。无扣费，无领奖，无挑战写。75101 七神器另帧，挂在其后，勿合并。 */
  static pullMagicTowerRoad(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_MAGIC_TOWER_ROAD_CMD);
  }

  /** 收到过 s2c 76542（含空包体）才算同步。解不开的包不算。74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、76543、76544、76502、76503、76504、76505、76506、76541、76501、74121、74122、75001、73002、71001、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasMagicTowerRoad(): boolean {
    return this.magicTowerRoad !== null;
  }

  /** 空的 c2s 75101。GReqQiShenQiInfo 没有包体，没有 page。只在 76542 之后发一次。整帧 040000005d250100。不重复拉 76542。不发 75102。75102 是购买推送 s2c，勿当 c2s。本模块无独立购写号。75121 诸神祭坛另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76542 分开发，勿合并。不并入 76542。本刀不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建（getPromotionInfo）可接受。轻轮次重置（轮次变则 buyList.clear + update）可接受。无扣费，无购买写。 */
  static pullQiShenQi(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_QI_SHEN_QI_CMD);
  }

  /** 收到过 s2c 75101（含空包体）才算同步。解不开的包不算。76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、75102、75121、75122、75131、75001、76501、73002、71001、74121、74122、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasQiShenQi(): boolean {
    return this.qiShenQi !== null;
  }

  /** 空的 c2s 75121。GReqZSJTInfo 没有包体，没有 FIELD，没有 page。只在 75101 之后发一次。整帧 0400000071250100。不重复拉 75101。不发 75122。75122 是抽奖，不编码、不发送。75131 赏月佳肴另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75101 分开发，勿合并。不并入 75101。本刀不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建（getPromotionInfo）可接受。轮次重置可接受。轻日刷（getMoneyDrawNum 隔日清零钻石抽次数并 update）可接受。无扣费，无领奖，无养成写。 */
  static pullZhuShenJiTan(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_ZHU_SHEN_JI_TAN_CMD);
  }

  /** 收到过 s2c 75121（含空包体）才算同步。解不开的包不算。75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、75122、75131、75132、75102、75801、75001、76501、73002、71001、74121、74122、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasZhuShenJiTan(): boolean {
    return this.zhuShenJiTan !== null;
  }

  /** 空的 c2s 75131。GReqMidFoodInfo 没有包体，没有 FIELD，没有 page。只在 75121 之后发一次。整帧 040000007b250100。不重复拉 75121。不发 75132。75132 是购买推送 s2c，勿当 c2s。不夹 75122。不夹 75102。75801 秋赏明月另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75121 分开发，勿合并。不并入 75121。本刀不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建（getPromotionInfo）可接受。轻轮次重置（轮次变则 buyList.clear + update）可接受。购买走充值回调并推 75132，本帧不触发。无扣费，无领奖，无养成写。 */
  static pullMidFood(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_MID_FOOD_CMD);
  }

  /** 收到过 s2c 75131（含空包体）才算同步。解不开的包不算。75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、75132、75122、75102、75801、75001、76501、73002、71001、74121、74122、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasMidFood(): boolean {
    return this.midFood !== null;
  }

  /** 空的 c2s 75801。GReqMidLotteryGetDataInfo 没有包体，没有 FIELD，没有 page。只在 75131 之后发一次。整帧 0400000019280100。不重复拉 75131。不发 75802。75802 是选档，不编码、不发送。不发 75803。75803 是抽奖，不编码、不发送。不发 75804。75804 是领次数奖，不编码、不发送。75901 万圣抽奖另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75131 分开发，勿合并。不并入 75131。本刀不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建（getPromotionInfo）可接受。轮次清 select/次数/记录可接受。非开启写空默认可接受。无扣费，无领奖，无抽奖。 */
  static pullQiuShangMingYue(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_QIU_SHANG_MING_YUE_CMD);
  }

  /** 收到过 s2c 75801（含空包体）才算同步。解不开的包不算。75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、75802、75803、75804、75901、75001、76501、73002、71001、74121、74122、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasQiuShangMingYue(): boolean {
    return this.qiuShangMingYue !== null;
  }

  /** 空的 c2s 75901。GReqHalloweenLotteryGetDataInfo 没有包体，没有 FIELD，没有 page。只在 75801 之后发一次。整帧 040000007d280100。不重复拉 75801。不发 75902。75902 是选档，不编码、不发送。不发 75903。75903 是抽奖，不编码、不发送。不发 75904。75904 是领次数奖，不编码、不发送。不夹发 75931、75932。不夹发 75941、75942、75943、75944。76001 黑五活动另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75801 分开发，勿合并。不并入 75801。本刀不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建（getPromotionInfo）可接受。轮次清 select/次数/记录可接受。非开启回默认可接受。无扣费，无领奖，无抽奖。 */
  static pullWanShengLottery(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_WAN_SHENG_LOTTERY_CMD);
  }

  /** 收到过 s2c 75901（含空包体）才算同步。解不开的包不算。75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、75902、75903、75904、75931、75932、75941、75942、75943、75944、76001、75001、76501、73002、71001、74121、74122、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasWanShengLottery(): boolean {
    return this.wanShengLottery !== null;
  }

  /** 空的 c2s 76001。GReqBlackFiveMissionGetDataInfo 没有包体，没有 FIELD，没有 page。只在 75901 之后发一次。整帧 04000000e1280100。不重复拉 75901。不发 76002。76002 是领任务奖，不编码、不发送。不发 76003。76003 是进度推，不编码、不发送。不发 76004。76004 是领任务箱，不编码、不发送。不发 76005。76005 是购礼包推，不编码、不发送。不夹发 76021、76022。76101 约惠圣诞另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是万圣抽奖 75901。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75901 分开发，勿合并。不并入 75901。本刀不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建可接受。轮次清 mission/box/buy/count 可接受。非开启回默认可接受。无扣费，无领奖，无养成写。 */
  static pullHeiWuMission(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_HEI_WU_MISSION_CMD);
  }

  /** 收到过 s2c 76001（含空包体）才算同步。解不开的包不算。75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、76002、76003、76004、76005、76021、76022、76101、75001、76501、73002、71001、74121、74122、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasHeiWuMission(): boolean {
    return this.heiWuMission !== null;
  }

  /** 空的 c2s 76101。GReqChristmasGiftInfo 没有包体，没有 FIELD，没有 page。只在 76001 之后发一次。整帧 0400000045290100。不重复拉 76001。不发 76102。76102 是礼包购买推送，不编码、不发送。旁支勿夹 76082、76083、76084、76121、76122、76141、76142、76143、76161、76162、76163。76301 出游寻春另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是黑五活动 76001。不是万圣抽奖 75901。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76001 分开发，勿合并。不并入 76001。本刀不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建可接受。轮次清 buyList 可接受。购买走充值回调推 76102，本帧不触发。无扣费，无领奖，无养成写。 */
  static pullChristmasGift(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_CHRISTMAS_GIFT_CMD);
  }

  /** 收到过 s2c 76101（含空包体）才算同步。解不开的包不算。76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、76102、76082、76083、76084、76121、76122、76141、76142、76143、76161、76162、76163、76301、75001、76501、73002、71001、74121、74122、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasChristmasGift(): boolean {
    return this.christmasGift !== null;
  }

  /** 空的 c2s 76301。GReqSpringOutingMissionGetDataInfo 没有包体，没有 FIELD，没有 page。只在 76101 之后发一次。整帧 040000000d2a0100。不重复拉 76101。不发 76302。76302 是领任务奖，不编码、不发送。不发 76303。76303 是更新任务进度推送，不编码、不发送。不发 76304。76304 是领宝箱/皮肤数量奖，不编码、不发送。勿夹 76305、76306、76307、76308。76081 圣诞连线另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是约惠圣诞 76101。不是黑五活动 76001。不是万圣抽奖 75901。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76101 分开发，勿合并。不并入 76101。本刀不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建可接受。轻日刷可接受。跨日清 mission/box 可接受。未开活动回默认空包可接受。无扣费，无领奖。 */
  static pullSpringOuting(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SPRING_OUTING_CMD);
  }

  /** 收到过 s2c 76301（含空包体）才算同步。解不开的包不算。76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、76302、76303、76304、76305、76306、76307、76308、75001、76501、73002、71001、74121、74122、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasSpringOuting(): boolean {
    return this.springOuting !== null;
  }

  /** 空的 c2s 76081。GReqChristmasMissionGetDataInfo 没有包体，没有 FIELD，没有 page。只在 76301 之后发一次。整帧 0400000031290100。不重复拉 76301。不发 76082。76082 是领任务奖，不编码、不发送。不发 76083。76083 是进度推送，不编码、不发送。不发 76084。76084 是领任务箱，不编码、不发送。旁支勿夹 76121、76122、76141、76143、76161、76163。76520 关卡榜另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是出游寻春 76301。不是约惠圣诞 76101。不是黑五活动 76001。不是万圣抽奖 75901。不是秋赏明月 75801。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76301 分开发，勿合并。不并入 76301。本刀不重复拉 76301，也不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建可接受。轻日刷可接受。跨日清 mission/box 可接受。未开活动回默认空包可接受。无扣费，无领奖，无养成写。 */
  static pullChristmasMission(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_CHRISTMAS_MISSION_CMD);
  }

  /** 收到过 s2c 76081（含空包体）才算同步。解不开的包不算。76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、76082、76083、76084、76121、76122、76141、76143、76161、76163、75001、76501、73002、71001、74121、74122、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasChristmasMission(): boolean {
    return this.christmasMission !== null;
  }

  /** 空的 c2s 76520。GReqMagicTowerLevelRank 没有包体，没有 FIELD，没有 page。只在 76081 之后发一次。整帧 04000000e82a0100。不重复拉 76081。不发 76501。不发 76502。不发 76503。不发 76504。不发 76505。不发 76506。不发 76543。不发 76544。76251 春日踏青另帧，挂在其后，勿合并。不重复拉 76542。不做 75001。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是圣诞连线 76081。不是出游寻春 76301。不是约惠圣诞 76101。不是斩魔之路 76542。5001、51001、68001、70001 已有，勿重复。76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76081 分开发，勿合并。不并入 76081。本刀不重复拉 76081，也不重复拉 76301，也不重复拉 76101，也不重复拉 76001，也不重复拉 75901，也不重复拉 75801，也不重复拉 75131，也不重复拉 75121，也不重复拉 75101，也不重复拉 76542，也不重复拉 74120，也不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。纯读可接受。无扣费，无领奖，无养成写。 */
  static pullMagicTowerLevelRank(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_MAGIC_TOWER_LEVEL_RANK_CMD);
  }

  /** 收到过 s2c 76520（含空包体）才算同步。解不开的包不算。76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、76501、76502、76503、76504、76505、76506、76543、76544、76251、75001、73002、71001、74121、74122、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasMagicTowerLevelRank(): boolean {
    return this.magicTowerLevelRank !== null;
  }

  /** 空的 c2s 76251。GReqSpringOutingGrid 没有包体，没有 FIELD，没有 page。只在 76520 之后发一次。整帧 04000000db290100。不重复拉 76520。不发 76252。76252 是掷骰扣费+发奖，不编码、不发送。不发 76253。76253 是景点成就领奖，不编码、不发送。备选 76271 本轮不做，不编码、不发送。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121。不夹发 74122。不是关卡榜 76520。不是圣诞连线 76081。不是出游寻春 76301。5001、51001、68001、70001 已有，勿重复。76520、76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76520 分开发，勿合并。不并入 76520。本刀不重复拉 76520。轻懒建可接受。轮次重置清 currIdx/dice/scenic 可接受。无扣费，无领奖，无养成写。 */
  static pullSpringOutingGrid(): void {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return;
    net.send(WIRE_SPRING_OUTING_GRID_CMD);
  }

  /** 收到过 s2c 76251（含空包体）才算同步。解不开的包不算。76520、76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099、76252、76253、76271、75001、76501、73002、71001、74121、74122、12010、20011、5001、51001、68001、70001、4601、29001 单独到不算。 */
  static hasSpringOutingGrid(): boolean {
    return this.springOutingGrid !== null;
  }

  /** 空的 c2s 3005。没连上时返回 false，调用方 Toast。 */
  static claimIdle(): boolean {
    const net = this.net || this.watched;
    if (!net || net.state !== "connected") return false;
    net.send(WIRE_IDLE_CLAIM_CMD);
    return true;
  }

  /** 主城挂机入口。两个时间都没出现过就是还没同步。 */
  static hasIdle(): boolean {
    return wireIdleHasTime({ rewardTime: this.rewardTime, maxRewardTime: this.maxRewardTime });
  }

  private static onRole(data: unknown): void {
    let profile: WireRoleProfile | null = null;
    try {
      profile = decodeWireRole(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 2001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!profile) {
      GameLog.shared.info("Wire", "s2c 2001 解不开，顶栏不改");
      return;
    }
    if (!wireProfileHasBar(profile)) {
      GameLog.shared.info("Wire", "s2c 2001 没有可写入顶栏的字段，顶栏不改");
      return;
    }
    this.remember(profile);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 2001 先记下：" + wireProfileNote(this.pending || profile));
      return;
    }
    this.commit();
  }

  private static onChapter(data: unknown): void {
    let progress: WireChapterProgress | null = null;
    try {
      progress = decodeWireChapter(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3007 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!progress) {
      GameLog.shared.info("Wire", "s2c 3007 解不开，主线不改");
      return;
    }
    if (!wireChapterHasIdx(progress)) {
      GameLog.shared.info("Wire", "s2c 3007 没有 now_idx/max_idx，主线不改");
      if (Session.source === "wire" && Session.role) {
        this.chapterProbe = copyChapterProbe(progress);
        this.chapterProbeSerial += 1;
        this.emit();
      }
      return;
    }
    this.rememberChapter(progress);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3007 先记下：" + wireChapterNote(this.pendingChapter || progress));
      return;
    }
    this.commitChapter();
  }

  private static onBattleMatch(data: unknown): void {
    let snap: WireBattleMatch | null = null;
    try {
      snap = decodeWireBattleMatch(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      const body = wireBody(data);
      const size = body && typeof body.length === "number" ? body.length : 0;
      GameLog.shared.info("Wire", "s2c 3001 解不开，战报不改 体长 " + size);
      return;
    }
    this.battleMatch = snap;
    this.battleSerial += 1;
    const roleId = Session.role ? Session.role.roleId : null;
    const attacks = snap.report ? wireBattleActionCount(snap.report) : 0;
    const note = "s2c 3001 " + formatWireBattleMatch(snap, roleId) + " 攻击拍 " + attacks;
    GameLog.shared.info("Wire", note);
    if (snap.report && resolveWireBattleWin(snap.report, roleId) === true) {
      GameLog.shared.info("Wire", "s2c 3001 胜，再拉 3007");
      this.pullChapter();
    }
    this.emit();
  }

  private static onChapterReward(data: unknown): void {
    let snap: WireChapterRewardSnapshot | null = null;
    try {
      snap = decodeWireChapterReward(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3010 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 3010 解不开，已领首通不改");
      return;
    }
    this.chapterReward = snap;
    GameLog.shared.info("Wire", "s2c 3010 " + formatWireChapterReward(snap));
    this.emit();
  }

  private static onQuickBattle(data: unknown): void {
    let snap: WireQuickBattleSnapshot | null = null;
    try {
      snap = decodeWireQuickBattle(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3012 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 3012 解不开，快速战斗次数不改");
      return;
    }
    this.quickBattle = snap;
    GameLog.shared.info("Wire", "s2c 3012 " + formatWireQuickBattle(snap));
    this.emit();
  }

  private static onChapterReport(data: unknown): void {
    let snap: WireChapterReportSnapshot | null = null;
    try {
      snap = decodeWireChapterReport(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3006 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 3006 解不开，挂机战报不改");
      return;
    }
    this.chapterReport = snap;
    this.chapterReportSerial += 1;
    GameLog.shared.info("Wire", "s2c 3006 " + formatWireChapterReport(snap));
    this.emit();
  }

  private static onBattleReport(data: unknown): void {
    let snap: WireBattleReportSnapshot | null = null;
    try {
      snap = decodeWireGetBattleReport(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3102 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 3102 解不开，请求战报不改");
      return;
    }
    this.battleReport = snap;
    this.battleReportSerial += 1;
    GameLog.shared.info("Wire", "s2c 3102 " + formatWireBattleReport(snap));
    this.emit();
  }

  private static onPreCompute(data: unknown): void {
    let snap: WirePreComputeSnapshot | null = null;
    try {
      snap = decodeWirePreComputeStrength(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3103 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 3103 解不开，预计算不改");
      return;
    }
    this.preCompute = snap;
    this.preComputeSerial += 1;
    GameLog.shared.info("Wire", "s2c 3103 " + formatWirePreCompute(snap));
    this.emit();
  }

  private static onStudy(data: unknown): void {
    let snap: WireStudySnapshot | null = null;
    try {
      snap = decodeWireStudy(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3030 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 3030 解不开，切磋不改");
      return;
    }
    this.study = snap;
    this.studySerial += 1;
    GameLog.shared.info("Wire", "s2c 3030 " + formatWireStudy(snap));
    this.emit();
  }

  private static onHeroAdd(data: unknown): void {
    let snap: { heroIds: number[] } | null = null;
    try {
      snap = decodeWireHeroAdd(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4030 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap || snap.heroIds.length === 0) {
      GameLog.shared.info("Wire", "s2c 4030 没有实例，英雄不改");
      return;
    }
    this.gmHeroIds = snap.heroIds.slice();
    this.gmHeroId = snap.heroIds[snap.heroIds.length - 1];
    this.gmHeroSerial += 1;
    GameLog.shared.info("Wire", "s2c 4030 " + formatWireGmHero(this.gmHeroId));
    this.emit();
  }

  private static onLineUpSave(data: unknown): void {
    const ack = decodeWireLineUpSave(wireBody(data));
    if (!ack) return;
    this.lineUpSaveSerial += 1;
    this.mainLineReady = true;
    GameLog.shared.info("Wire", "s2c 3100 空包，MAIN 已保存");
    this.pullLineUp();
    this.emit();
  }

  private static onServerError(data: unknown): void {
    const err = decodeWireServerError(wireBody(data));
    this.wireErrorText = err.text;
    this.wireErrorSerial += 1;
    GameLog.shared.info("Wire", "s2c 1005 " + err.text);
    this.emit();
  }

  private static onIdle(data: unknown): void {
    let snapshot: WireIdleSnapshot | null = null;
    try {
      snapshot = decodeWireIdle(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3004 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snapshot) {
      GameLog.shared.info("Wire", "s2c 3004 解不开，挂机不改");
      return;
    }
    if (!wireIdleHasTime(snapshot)) {
      GameLog.shared.info("Wire", "s2c 3004 没有 reward_time/max_reward_time，挂机不改");
      if (Session.source === "wire" && Session.role) {
        this.idleProbe = copyIdleProbe(snapshot);
        this.idleProbeSerial += 1;
        this.emit();
      }
      return;
    }
    this.rememberIdle(snapshot);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3004 先记下：" + wireIdleNote(this.pendingIdle || snapshot));
      return;
    }
    this.commitIdle();
  }

  private static onIdleClaim(data: unknown): void {
    let claim: WireIdleClaim | null = null;
    try {
      claim = decodeWireIdleClaim(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3005 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      this.finishClaim("s2c 3005 解不开，金币不改");
      return;
    }
    if (!claim) {
      GameLog.shared.info("Wire", "s2c 3005 解不开，金币不改");
      this.finishClaim("s2c 3005 解不开，金币不改");
      return;
    }
    if (claim.rewardTime === null) {
      GameLog.shared.info("Wire", "s2c 3005 没有 reward_time，金币不改");
      this.finishClaim("s2c 3005 没有 reward_time，金币不改");
      return;
    }
    const inCity = Session.source === "wire" && !!Session.role;
    if (this.pendingIdle) {
      this.pendingIdle = {
        rewardTime: claim.rewardTime,
        maxRewardTime: this.pendingIdle.maxRewardTime,
      };
    } else if (!inCity) {
      this.pendingIdle = { rewardTime: claim.rewardTime, maxRewardTime: null };
    }
    if (inCity) this.rewardTime = claim.rewardTime;
    const note = "s2c 3005 " + wireIdleClaimNote(claim);
    GameLog.shared.info("Wire", note);
    this.finishClaim(note);
    this.refreshPersisted();
  }

  private static onBag(data: unknown): void {
    let list: ReturnType<typeof decodeWireBagList> = null;
    try {
      list = decodeWireBagList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 5001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!list) {
      GameLog.shared.info("Wire", "s2c 5001 解不开，背包不改");
      return;
    }
    this.pendingBag = list.items.map(copyBagItem);
    this.pendingBagMarks = list.marks.map(copyBagMark);
    this.pendingGains = [];
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 5001 先记下：" + wireBagNote(list));
      return;
    }
    this.commitBag();
  }

  private static onBagGain(data: unknown): void {
    let gain: WireBagGain | null = null;
    try {
      gain = decodeWireBagGain(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 5002 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!gain) {
      GameLog.shared.info("Wire", "s2c 5002 解不开，背包不改，顶栏不改");
      return;
    }
    GameLog.shared.info("Wire", "s2c 5002 " + wireBagGainNote(gain));
    if (gain.items.length === 0) return;
    const inCity = Session.source === "wire" && !!Session.role;
    if (!inCity) {
      if (this.pendingBag === null) {
        GameLog.shared.info("Wire", "s2c 5002 在背包列表之前，不合并");
        return;
      }
      this.pendingGains.push(gain);
      return;
    }
    if (this.bagItems === null) {
      GameLog.shared.info("Wire", "s2c 5002 在背包列表之前，不合并");
      return;
    }
    this.bagItems = applyWireBagGain(this.bagItems, gain);
    this.emit();
  }

  private static onMail(data: unknown): void {
    let list: { entries: WireMailEntry[] } | null = null;
    try {
      list = decodeWireMailList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 15000 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!list) {
      GameLog.shared.info("Wire", "s2c 15000 解不开，邮件不改");
      return;
    }
    this.pendingMail = list.entries.map(copyMail);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 15000 先记下：" + wireMailNote(list.entries));
      return;
    }
    this.commitMail();
  }

  private static onHero(data: unknown): void {
    let list: WireHeroList | null = null;
    try {
      list = decodeWireHeroList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!list) {
      GameLog.shared.info("Wire", "s2c 4001 解不开，英雄不改");
      return;
    }
    const done = this.takeHeroPage(list);
    if (!done) return;
    this.pendingHero = done;
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4001 先记下：" + wireHeroNote(done));
      return;
    }
    this.commitHero();
  }

  private static onActivity(data: unknown): void {
    let snap: WireActivitySnapshot | null = null;
    try {
      snap = decodeWireActivity(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 17000 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 17000 解不开，点金不改");
      return;
    }
    this.pendingActivity = copyActivity(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 17000 先记下：" + wireActivityNote(snap));
      return;
    }
    this.commitActivity();
  }

  private static onAchievement(data: unknown): void {
    let snap: WireAchievementSnapshot | null = null;
    try {
      snap = decodeWireAchievement(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 12010 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 12010 解不开，成就不改");
      return;
    }
    this.pendingAchievement = copyAchievement(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 12010 先记下：" + wireAchievementNote(snap));
      return;
    }
    this.commitAchievement();
  }

  private static onPvp(data: unknown): void {
    let snap: WirePvpSnapshot | null = null;
    try {
      snap = decodeWirePvp(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 18001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 18001 解不开，竞技场不改");
      return;
    }
    this.pendingPvp = copyPvp(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 18001 先记下：" + wirePvpNote(snap));
      return;
    }
    this.commitPvp();
  }

  private static onSevenDay(data: unknown): void {
    let snap: WireSevenDaySnapshot | null = null;
    try {
      snap = decodeWireSevenDay(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 22000 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 22000 解不开，七日登录不改");
      return;
    }
    this.pendingSeven = copySevenDay(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 22000 先记下：" + wireSevenNote(snap));
      return;
    }
    this.commitSevenDay();
  }

  /** 隔天推送。只改已经有的 cur_day。没有 22000 时不建表，也不算同步。 */
  private static onSevenDayPush(data: unknown): void {
    let curDay: number | null = null;
    try {
      curDay = decodeWireSevenDayUpdate(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 22002 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (curDay === null) {
      GameLog.shared.info("Wire", "s2c 22002 解不开，七日登录不改");
      return;
    }
    if (this.pendingSeven) this.pendingSeven = applyWireSevenDayUpdate(this.pendingSeven, curDay);
    if (Session.source === "wire" && Session.role && this.sevenDay) {
      this.sevenDay = applyWireSevenDayUpdate(this.sevenDay, curDay);
      GameLog.shared.info("Wire", "s2c 22002 cur_day=" + curDay + "。不领奖，不写金币");
      this.emit();
      return;
    }
    if (this.pendingSeven) {
      GameLog.shared.info("Wire", "s2c 22002 先记下 cur_day=" + curDay);
      return;
    }
    GameLog.shared.info("Wire", "s2c 22002 还没有 22000，七日登录不改");
  }

  private static onGoal7(data: unknown): void {
    let snap: WireGoal7Snapshot | null = null;
    try {
      snap = decodeWireGoal7(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 21010 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 21010 解不开，七日目标不改");
      return;
    }
    this.pendingGoal = copyGoal7(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 21010 先记下：" + wireGoalNote(snap));
      return;
    }
    this.commitGoal7();
  }

  private static onWish(data: unknown): void {
    let snap: WireWishSnapshot | null = null;
    try {
      snap = decodeWireWish(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 27001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 27001 解不开，许愿池不改");
      return;
    }
    this.pendingWish = copyWish(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 27001 先记下：" + wireWishNote(snap));
      return;
    }
    this.commitWish();
  }

  private static onSummon(data: unknown): void {
    let snap: WireSummonSnapshot | null = null;
    try {
      snap = decodeWireSummon(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4004 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4004 解不开，召唤次数不改");
      return;
    }
    this.pendingSummon = copySummon(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4004 先记下：" + wireSummonNote(snap));
      return;
    }
    this.commitSummon();
  }

  private static onProphet(data: unknown): void {
    let snap: WireProphetSnapshot | null = null;
    try {
      snap = decodeWireProphet(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 13044 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 13044 解不开，先知召唤不改");
      return;
    }
    this.pendingProphet = copyProphet(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 13044 先记下：" + wireProphetNote(snap));
      return;
    }
    this.commitProphet();
  }

  private static onJewel(data: unknown): void {
    let snap: WireJewelSnapshot | null = null;
    try {
      snap = decodeWireJewel(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4101 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4101 解不开，英雄宝石不改");
      return;
    }
    this.pendingJewel = copyJewel(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4101 先记下：" + wireJewelNote(snap));
      return;
    }
    this.commitJewel();
  }

  private static onIllustrat(data: unknown): void {
    let snap: WireIllustratSnapshot | null = null;
    try {
      snap = decodeWireIllustrat(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4013 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4013 解不开，英雄图鉴不改");
      return;
    }
    this.pendingIllustrat = copyIllustrat(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4013 先记下：" + wireIllustratNote(snap));
      return;
    }
    this.commitIllustrat();
  }

  private static onPet(data: unknown): void {
    let snap: WirePetSnapshot | null = null;
    try {
      snap = decodeWirePet(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 74100 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 74100 解不开，宠物信息不改");
      return;
    }
    this.pendingPet = copyPet(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 74100 先记下：" + wirePetNote(snap));
      return;
    }
    this.commitPet();
  }

  private static onWorld(data: unknown): void {
    let snap: WireWorldSnapshot | null = null;
    try {
      snap = decodeWireWorld(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 51001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 51001 解不开，世界等级不改");
      return;
    }
    this.pendingWorld = copyWorld(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 51001 先记下：" + wireWorldNote(snap));
      return;
    }
    this.commitWorld();
  }

  private static onPromotion(data: unknown): void {
    let snap: WirePromotionSnapshot | null = null;
    try {
      snap = decodeWirePromotion(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 20001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 20001 解不开，基金列表不改");
      return;
    }
    this.pendingPromotion = copyPromotion(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 20001 先记下：" + wirePromotionNote(snap));
      return;
    }
    this.commitPromotion();
  }

  private static onFirstRecharge(data: unknown): void {
    let snap: WireFirstRechargeSnapshot | null = null;
    try {
      snap = decodeWireFirstRecharge(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 20012 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 20012 解不开，超值首充记录不改");
      return;
    }
    this.pendingFirstRecharge = copyFirstRecharge(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 20012 先记下：" + wireFirstNote(snap));
      return;
    }
    this.commitFirstRecharge();
  }

  private static onReiki(data: unknown): void {
    let snap: WireReikiSnapshot | null = null;
    try {
      snap = decodeWireReiki(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 70001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 70001 解不开，灵器数据不改");
      return;
    }
    this.pendingReiki = copyReiki(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 70001 先记下：" + wireReikiNote(snap));
      return;
    }
    this.commitReiki();
  }

  private static onIslands(data: unknown): void {
    let snap: WireIslandsSnapshot | null = null;
    try {
      snap = decodeWireIslands(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 73001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 73001 解不开，浮空岛时间不改");
      return;
    }
    this.pendingIslands = copyIslands(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 73001 先记下：" + wireIslandsNote(snap));
      return;
    }
    this.commitIslands();
  }

  private static onTotems(data: unknown): void {
    let snap: WireTotemsSnapshot | null = null;
    try {
      snap = decodeWireTotems(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 74300 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 74300 解不开，图腾信息不改");
      return;
    }
    this.pendingTotems = copyTotems(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 74300 先记下：" + wireTotemsNote(snap));
      return;
    }
    this.commitTotems();
  }

  private static onAstrolabe(data: unknown): void {
    let snap: WireAstrolabeSnapshot | null = null;
    try {
      snap = decodeWireAstrolabe(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 68001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 68001 解不开，星盘数据不改");
      return;
    }
    this.pendingAstrolabe = copyAstrolabe(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 68001 先记下：" + wireAstrolabeNote(snap));
      return;
    }
    this.commitAstrolabe();
  }

  private static onTweakCube(data: unknown): void {
    let snap: WireCubeSnapshot | null = null;
    try {
      snap = decodeWireTweakCube(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75501 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75501 解不开，魔方数据不改");
      return;
    }
    this.pendingTweakCube = copyTweakCube(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75501 先记下：" + wireTweakCubeNote(snap));
      return;
    }
    this.commitTweakCube();
  }

  private static onDragon(data: unknown): void {
    let snap: WireDragonSnapshot | null = null;
    try {
      snap = decodeWireDragon(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 59001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 59001 解不开，圣龙数据不改");
      return;
    }
    this.pendingDragon = copyDragon(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 59001 先记下：" + wireDragonNote(snap));
      return;
    }
    this.commitDragon();
  }

  private static onDragonCollection(data: unknown): void {
    let snap: WireDragonCollectionSnapshot | null = null;
    try {
      snap = decodeWireDragonCollection(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 59010 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 59010 解不开，圣物图鉴不改");
      return;
    }
    this.pendingDragonCollection = copyDragonCollection(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 59010 先记下：" + wireDragonCollectionNote(snap));
      return;
    }
    this.commitDragonCollection();
  }

  private static onTitle(data: unknown): void {
    let snap: WireTitleSnapshot | null = null;
    try {
      snap = decodeWireTitle(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 55001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 55001 解不开，称号列表不改");
      return;
    }
    this.pendingTitle = copyTitle(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 55001 先记下：" + wireTitleNote(snap));
      return;
    }
    this.commitTitle();
  }

  private static onHeadPortrait(data: unknown): void {
    let snap: WireHeadPortraitSnapshot | null = null;
    try {
      snap = decodeWireHeadPortrait(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 34001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 34001 解不开，头像列表不改");
      return;
    }
    this.pendingHeadPortrait = copyHeadPortrait(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 34001 先记下：" + wireHeadPortraitNote(snap));
      return;
    }
    this.commitHeadPortrait();
  }

  private static onBorder(data: unknown): void {
    let snap: WireBorderSnapshot | null = null;
    try {
      snap = decodeWireBorder(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 32001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 32001 解不开，头像框数据不改");
      return;
    }
    this.pendingBorder = copyBorder(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 32001 先记下：" + wireBorderNote(snap));
      return;
    }
    this.commitBorder();
  }

  private static onFashion(data: unknown): void {
    let snap: WireFashionSnapshot | null = null;
    try {
      snap = decodeWireFashion(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4402 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4402 解不开，激活皮肤列表不改");
      return;
    }
    this.pendingFashion = copyFashion(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4402 先记下：" + wireFashionNote(snap));
      return;
    }
    this.commitFashion();
  }

  private static onWornFashion(data: unknown): void {
    let snap: WireWornFashionSnapshot | null = null;
    try {
      snap = decodeWireWornFashion(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4401 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4401 解不开，穿戴皮肤英雄列表不改");
      return;
    }
    this.pendingWornFashion = copyWornFashion(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4401 先记下：" + wireWornFashionNote(snap));
      return;
    }
    this.commitWornFashion();
  }

  private static onHeroPrayer(data: unknown): void {
    let snap: WireHeroPrayerSnapshot | null = null;
    try {
      snap = decodeWireHeroPrayer(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4201 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4201 解不开，英雄祈愿数据不改");
      return;
    }
    this.pendingHeroPrayer = copyHeroPrayer(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4201 先记下：" + wireHeroPrayerNote(snap));
      return;
    }
    this.commitHeroPrayer();
  }

  private static onPetIllustrate(data: unknown): void {
    let snap: WirePetIllustrateSnapshot | null = null;
    try {
      snap = decodeWirePetIllustrate(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 74104 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 74104 解不开，宠物图鉴不改");
      return;
    }
    this.pendingPetIllustrate = copyPetIllustrate(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 74104 先记下：" + wirePetIllustrateNote(snap));
      return;
    }
    this.commitPetIllustrate();
  }

  private static onFetter(data: unknown): void {
    let snap: WireFetterSnapshot | null = null;
    try {
      snap = decodeWireFetter(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 28100 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 28100 解不开，羁绊数据不改");
      return;
    }
    this.pendingFetter = copyFetter(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 28100 先记下：" + wireFetterNote(snap));
      return;
    }
    this.commitFetter();
  }

  private static onFetterFashion(data: unknown): void {
    let snap: WireFetterFashionSnapshot | null = null;
    try {
      snap = decodeWireFetterFashion(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 28200 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 28200 解不开，羁绊皮肤不改");
      return;
    }
    this.pendingFetterFashion = copyFetterFashion(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 28200 先记下：" + wireFetterFashionNote(snap));
      return;
    }
    this.commitFetterFashion();
  }

  private static onShenBin(data: unknown): void {
    let snap: WireShenBinSnapshot | null = null;
    try {
      snap = decodeWireShenBin(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75601 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75601 解不开，神兵数据不改");
      return;
    }
    this.pendingShenBin = copyShenBin(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75601 先记下：" + wireShenBinNote(snap));
      return;
    }
    this.commitShenBin();
  }

  private static onOccupation(data: unknown): void {
    let snap: WireOccupationSnapshot | null = null;
    try {
      snap = decodeWireOccupation(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75606 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75606 解不开，职级信息不改");
      return;
    }
    this.pendingOccupation = copyOccupation(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75606 先记下：" + wireOccupationNote(snap));
      return;
    }
    this.commitOccupation();
  }

  private static onRoleShenBin(data: unknown): void {
    let snap: WireRoleShenBinSnapshot | null = null;
    try {
      snap = decodeWireRoleShenBin(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75615 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75615 解不开，神兵道具不改");
      return;
    }
    this.pendingRoleShenBin = copyRoleShenBin(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75615 先记下：" + wireRoleShenBinNote(snap));
      return;
    }
    this.commitRoleShenBin();
  }

  private static onFetterContract(data: unknown): void {
    let snap: WireFetterContractSnapshot | null = null;
    try {
      snap = decodeWireFetterContract(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 28107 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 28107 解不开，契约不改");
      return;
    }
    this.pendingFetterContract = copyFetterContract(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 28107 先记下：" + wireFetterContractNote(snap));
      return;
    }
    this.commitFetterContract();
  }

  private static onFormation(data: unknown): void {
    let snap: WireFormationSnapshot | null = null;
    try {
      snap = decodeWireFormation(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3099 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 3099 解不开，阵法不改");
      return;
    }
    this.pendingFormation = copyFormation(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3099 先记下：" + wireFormationNote(snap));
      return;
    }
    this.commitFormation();
  }

  private static onLineUp(data: unknown): void {
    let snap: WireLineUpSnapshot | null = null;
    try {
      snap = decodeWireLineUp(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3101 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 3101 解不开，副本队列不改");
      return;
    }
    this.pendingLineUp = copyLineUp(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3101 先记下：" + wireLineUpNote(snap));
      return;
    }
    this.commitLineUp();
  }

  private static onRunningPromotion(data: unknown): void {
    let snap: WireRunningPromotionSnapshot | null = null;
    try {
      snap = decodeWireRunningPromotion(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 20101 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 20101 解不开，进行中活动不改");
      return;
    }
    this.pendingRunningPromotion = copyRunningPromotion(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 20101 先记下：" + wireRunningPromotionNote(snap));
      return;
    }
    this.commitRunningPromotion();
  }

  private static onTowerReward(data: unknown): void {
    let snap: WireTowerRewardSnapshot | null = null;
    try {
      snap = decodeWireTowerReward(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 3203 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 3203 解不开，爬塔首通已领不改");
      return;
    }
    this.pendingTowerReward = copyTowerReward(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 3203 先记下：" + wireTowerRewardNote(snap));
      return;
    }
    this.commitTowerReward();
  }

  private static onHeroLevelResetTimes(data: unknown): void {
    let snap: WireHeroLevelResetTimesSnapshot | null = null;
    try {
      snap = decodeWireHeroLevelResetTimes(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 4044 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 4044 解不开，英雄等级重生次数不改");
      return;
    }
    this.pendingHeroLevelResetTimes = copyHeroLevelResetTimes(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 4044 先记下：" + wireHeroLevelResetTimesNote(snap));
      return;
    }
    this.commitHeroLevelResetTimes();
  }

  private static onSignInList(data: unknown): void {
    let snap: WireSignInListSnapshot | null = null;
    try {
      snap = decodeWireSignInList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 13010 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 13010 解不开，签到列表不改");
      return;
    }
    this.pendingSignInList = copySignInList(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 13010 先记下：" + wireSignInListNote(snap));
      return;
    }
    this.commitSignInList();
  }

  private static onDailyTaskList(data: unknown): void {
    let snap: WireDailyTaskListSnapshot | null = null;
    try {
      snap = decodeWireDailyTaskList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 12020 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 12020 解不开，每日任务列表不改");
      return;
    }
    this.pendingDailyTaskList = copyDailyTaskList(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 12020 先记下：" + wireDailyTaskListNote(snap));
      return;
    }
    this.commitDailyTaskList();
  }

  private static onDailyWelfareList(data: unknown): void {
    let snap: WireDailyWelfareListSnapshot | null = null;
    try {
      snap = decodeWireDailyWelfareList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 26002 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 26002 解不开，每日福利列表不改");
      return;
    }
    this.pendingDailyWelfareList = copyDailyWelfareList(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 26002 先记下：" + wireDailyWelfareListNote(snap));
      return;
    }
    this.commitDailyWelfareList();
  }

  private static onMouthWelfareList(data: unknown): void {
    let snap: WireMouthWelfareListSnapshot | null = null;
    try {
      snap = decodeWireMouthWelfareList(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 26001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 26001 解不开，每月福利列表不改");
      return;
    }
    this.pendingMouthWelfareList = copyMouthWelfareList(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 26001 先记下：" + wireMouthWelfareListNote(snap));
      return;
    }
    this.commitMouthWelfareList();
  }

  private static onWeekendGift(data: unknown): void {
    let snap: WireWeekendGiftSnapshot | null = null;
    try {
      snap = decodeWireWeekendGift(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 61001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 61001 解不开，周末礼包不改");
      return;
    }
    this.pendingWeekendGift = copyWeekendGift(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 61001 先记下：" + wireWeekendGiftNote(snap));
      return;
    }
    this.commitWeekendGift();
  }

  private static onGodRelic(data: unknown): void {
    let snap: WireGodRelicSnapshot | null = null;
    try {
      snap = decodeWireGodRelic(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 62001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 62001 解不开，神迹遗物不改");
      return;
    }
    this.pendingGodRelic = copyGodRelic(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 62001 先记下：" + wireGodRelicNote(snap));
      return;
    }
    this.commitGodRelic();
  }

  private static onHeroPalace(data: unknown): void {
    let snap: WireHeroPalaceSnapshot | null = null;
    try {
      snap = decodeWireHeroPalace(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 63001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 63001 解不开，英雄殿堂不改");
      return;
    }
    this.pendingHeroPalace = copyHeroPalace(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 63001 先记下：" + wireHeroPalaceNote(snap));
      return;
    }
    this.commitHeroPalace();
  }

  private static onRechargeDaysB(data: unknown): void {
    let snap: WireRechargeDaysBSnapshot | null = null;
    try {
      snap = decodeWireRechargeDaysB(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 69001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 69001 解不开，积天豪礼2不改");
      return;
    }
    this.pendingRechargeDaysB = copyRechargeDaysB(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 69001 先记下：" + wireRechargeDaysBNote(snap));
      return;
    }
    this.commitRechargeDaysB();
  }

  private static onTimeTower(data: unknown): void {
    let snap: WireTimeTowerSnapshot | null = null;
    try {
      snap = decodeWireTimeTower(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 74001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 74001 解不开，时空魔塔不改");
      return;
    }
    this.pendingTimeTower = copyTimeTower(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 74001 先记下：" + wireTimeTowerNote(snap));
      return;
    }
    this.commitTimeTower();
  }

  private static onSpaceTimeAdventure(data: unknown): void {
    let snap: WireSpaceTimeAdventureSnapshot | null = null;
    try {
      snap = decodeWireSpaceTimeAdventure(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 74120 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 74120 解不开，时空冒险不改");
      return;
    }
    this.pendingSpaceTimeAdventure = copySpaceTimeAdventure(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 74120 先记下：" + wireSpaceTimeAdventureNote(snap));
      return;
    }
    this.commitSpaceTimeAdventure();
  }

  private static onMagicTowerRoad(data: unknown): void {
    let snap: WireMagicTowerRoadSnapshot | null = null;
    try {
      snap = decodeWireMagicTowerRoad(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 76542 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 76542 解不开，斩魔之路不改");
      return;
    }
    this.pendingMagicTowerRoad = copyMagicTowerRoad(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 76542 先记下：" + wireMagicTowerRoadNote(snap));
      return;
    }
    this.commitMagicTowerRoad();
  }

  private static onQiShenQi(data: unknown): void {
    let snap: WireQiShenQiSnapshot | null = null;
    try {
      snap = decodeWireQiShenQi(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75101 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75101 解不开，七神器不改");
      return;
    }
    this.pendingQiShenQi = copyQiShenQi(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75101 先记下：" + wireQiShenQiNote(snap));
      return;
    }
    this.commitQiShenQi();
  }

  private static onZhuShenJiTan(data: unknown): void {
    let snap: WireZhuShenJiTanSnapshot | null = null;
    try {
      snap = decodeWireZhuShenJiTan(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75121 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75121 解不开，诸神祭坛不改");
      return;
    }
    this.pendingZhuShenJiTan = copyZhuShenJiTan(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75121 先记下：" + wireZhuShenJiTanNote(snap));
      return;
    }
    this.commitZhuShenJiTan();
  }

  private static onMidFood(data: unknown): void {
    let snap: WireMidFoodSnapshot | null = null;
    try {
      snap = decodeWireMidFood(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75131 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75131 解不开，赏月佳肴不改");
      return;
    }
    this.pendingMidFood = copyMidFood(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75131 先记下：" + wireMidFoodNote(snap));
      return;
    }
    this.commitMidFood();
  }

  private static onQiuShangMingYue(data: unknown): void {
    let snap: WireQiuShangMingYueSnapshot | null = null;
    try {
      snap = decodeWireQiuShangMingYue(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75801 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75801 解不开，秋赏明月不改");
      return;
    }
    this.pendingQiuShangMingYue = copyQiuShangMingYue(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75801 先记下：" + wireQiuShangMingYueNote(snap));
      return;
    }
    this.commitQiuShangMingYue();
  }

  private static onWanShengLottery(data: unknown): void {
    let snap: WireWanShengLotterySnapshot | null = null;
    try {
      snap = decodeWireWanShengLottery(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 75901 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 75901 解不开，万圣抽奖不改");
      return;
    }
    this.pendingWanShengLottery = copyWanShengLottery(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 75901 先记下：" + wireWanShengLotteryNote(snap));
      return;
    }
    this.commitWanShengLottery();
  }

  private static onHeiWuMission(data: unknown): void {
    let snap: WireHeiWuMissionSnapshot | null = null;
    try {
      snap = decodeWireHeiWuMission(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 76001 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 76001 解不开，黑五活动不改");
      return;
    }
    this.pendingHeiWuMission = copyHeiWuMission(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 76001 先记下：" + wireHeiWuMissionNote(snap));
      return;
    }
    this.commitHeiWuMission();
  }

  private static onChristmasGift(data: unknown): void {
    let snap: WireChristmasGiftSnapshot | null = null;
    try {
      snap = decodeWireChristmasGift(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 76101 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 76101 解不开，约惠圣诞不改");
      return;
    }
    this.pendingChristmasGift = copyChristmasGift(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 76101 先记下：" + wireChristmasGiftNote(snap));
      return;
    }
    this.commitChristmasGift();
  }

  private static onSpringOuting(data: unknown): void {
    let snap: WireSpringOutingSnapshot | null = null;
    try {
      snap = decodeWireSpringOuting(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 76301 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 76301 解不开，出游寻春不改");
      return;
    }
    this.pendingSpringOuting = copySpringOuting(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 76301 先记下：" + wireSpringOutingNote(snap));
      return;
    }
    this.commitSpringOuting();
  }

  private static onChristmasMission(data: unknown): void {
    let snap: WireChristmasMissionSnapshot | null = null;
    try {
      snap = decodeWireChristmasMission(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 76081 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 76081 解不开，圣诞连线不改");
      return;
    }
    this.pendingChristmasMission = copyChristmasMission(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 76081 先记下：" + wireChristmasMissionNote(snap));
      return;
    }
    this.commitChristmasMission();
  }

  private static onMagicTowerLevelRank(data: unknown): void {
    let snap: WireMagicTowerLevelRankSnapshot | null = null;
    try {
      snap = decodeWireMagicTowerLevelRank(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 76520 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 76520 解不开，关卡榜不改");
      return;
    }
    this.pendingMagicTowerLevelRank = copyMagicTowerLevelRank(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 76520 先记下：" + wireMagicTowerLevelRankNote(snap));
      return;
    }
    this.commitMagicTowerLevelRank();
  }

  private static onSpringOutingGrid(data: unknown): void {
    let snap: WireSpringOutingGridSnapshot | null = null;
    try {
      snap = decodeWireSpringOutingGrid(wireBody(data));
    } catch (err) {
      GameLog.shared.error("Wire", "s2c 76251 解不开 " + (err instanceof Error ? err.message : "未知错误"));
      return;
    }
    if (!snap) {
      GameLog.shared.info("Wire", "s2c 76251 解不开，春日踏青不改");
      return;
    }
    this.pendingSpringOutingGrid = copySpringOutingGrid(snap);
    if (Session.source !== "wire" || !Session.role) {
      GameLog.shared.info("Wire", "s2c 76251 先记下：" + wireSpringOutingGridNote(snap));
      return;
    }
    this.commitSpringOutingGrid();
  }

  /** 只收。不建表，不改已经有的七日目标，也不发奖。 */
  private static onGoal7Push(_data: unknown): void {
    GameLog.shared.info("Wire", "s2c 21013 只收，七日目标不改，不发奖");
  }

  /**
   * 按页攒名册。send_status=0 时发出下一页并返回 null，先不替换。
   * 页码对不上也返回 null，保持上一次。
   */
  private static takeHeroPage(list: WireHeroList): WireHeroList | null {
    const page = list.page !== null ? list.page : this.heroGathering ? this.heroExpect : 1;
    if (!this.heroGathering) {
      if (page !== 1) {
        GameLog.shared.info("Wire", "s2c 4001 页 " + page + " 不是 1，名册不改");
        return null;
      }
      this.heroAcc = list.entries.map(copyHero);
      this.heroGathering = true;
      this.heroExpect = 1;
    } else if (page !== this.heroExpect) {
      GameLog.shared.info("Wire", "s2c 4001 页 " + page + " 不是 " + this.heroExpect + "，名册不改");
      return null;
    } else {
      for (let i = 0; i < list.entries.length; i++) this.heroAcc.push(copyHero(list.entries[i]));
    }
    if (list.sendStatus === 0 && page < WIRE_HERO_PAGE_CAP) {
      const next = page + 1;
      this.heroExpect = next;
      GameLog.shared.info("Wire", "s2c 4001 send_status=0，继续 page=" + next);
      this.pullHero(next);
      return null;
    }
    if (list.sendStatus === 0) {
      GameLog.shared.info("Wire", "s2c 4001 翻页停止 page=" + page);
    }
    const done: WireHeroList = {
      entries: this.heroAcc.map(copyHero),
      heroCapacity: list.heroCapacity,
      buySpaceTimes: list.buySpaceTimes,
      sendStatus: list.sendStatus,
      page: list.page,
    };
    this.resetHeroGather();
    return done;
  }

  private static resetHeroGather(): void {
    this.heroAcc = [];
    this.heroGathering = false;
    this.heroExpect = 1;
  }

  /** 后到的包只补上自己有的字段，不把先记下、这一包没有的格子清掉。 */
  private static remember(profile: WireRoleProfile): void {
    const prev = this.pending;
    this.pending = {
      name: profile.name !== null ? profile.name : prev ? prev.name : null,
      level: profile.level !== null ? profile.level : prev ? prev.level : null,
      gold: profile.gold !== null ? profile.gold : prev ? prev.gold : null,
      diamond: profile.diamond !== null ? profile.diamond : prev ? prev.diamond : null,
    };
  }

  private static rememberChapter(progress: WireChapterProgress): void {
    const prev = this.pendingChapter;
    this.pendingChapter = {
      nowIdx: progress.nowIdx !== null ? progress.nowIdx : prev ? prev.nowIdx : null,
      maxIdx: progress.maxIdx !== null ? progress.maxIdx : prev ? prev.maxIdx : null,
      resRewardTime: progress.resRewardTime !== null ? progress.resRewardTime : prev ? prev.resRewardTime : null,
      extraRewardIds: progress.extraRewardIds.length > 0 ? progress.extraRewardIds.slice() : prev ? prev.extraRewardIds.slice() : [],
    };
  }

  private static rememberIdle(snapshot: WireIdleSnapshot): void {
    const prev = this.pendingIdle;
    this.pendingIdle = {
      rewardTime: snapshot.rewardTime !== null ? snapshot.rewardTime : prev ? prev.rewardTime : null,
      maxRewardTime: snapshot.maxRewardTime !== null ? snapshot.maxRewardTime : prev ? prev.maxRewardTime : null,
    };
  }

  private static commit(): void {
    const profile = this.pending;
    if (!profile || !wireProfileHasBar(profile)) return;
    if (
      !Session.applyWireSync({
        name: profile.name,
        level: profile.level,
        gold: profile.gold,
        diamond: profile.diamond,
      })
    ) {
      return;
    }
    this.pending = null;
    GameLog.shared.info("Wire", wireProfileNote(profile));
    this.emit();
  }

  private static commitChapter(): void {
    const progress = this.pendingChapter;
    if (!progress || !wireChapterHasIdx(progress)) return;
    if (Session.source !== "wire" || !Session.role) return;
    if (progress.nowIdx !== null) this.nowIdx = progress.nowIdx;
    if (progress.maxIdx !== null) this.maxIdx = progress.maxIdx;
    this.chapterProbe = copyChapterProbe(progress);
    this.chapterProbeSerial += 1;
    this.pendingChapter = null;
    GameLog.shared.info("Wire", wireChapterNote(progress));
    this.emit();
  }

  private static commitBag(): void {
    if (this.pendingBag === null) return;
    if (Session.source !== "wire" || !Session.role) return;
    let items = this.pendingBag.map(copyBagItem);
    for (let i = 0; i < this.pendingGains.length; i++) {
      items = applyWireBagGain(items, this.pendingGains[i]);
    }
    const marks = this.pendingBagMarks.map(copyBagMark);
    this.pendingBag = null;
    this.pendingBagMarks = [];
    this.pendingGains = [];
    this.bagItems = items;
    this.bagMarks = marks;
    GameLog.shared.info("Wire", "s2c 5001 " + wireBagNote({ items, marks }));
    this.emit();
  }

  private static commitMail(): void {
    if (this.pendingMail === null) return;
    if (Session.source !== "wire" || !Session.role) return;
    const entries = this.pendingMail.map(copyMail);
    this.pendingMail = null;
    this.mailEntries = entries;
    GameLog.shared.info("Wire", "s2c 15000 " + wireMailNote(entries));
    this.emit();
  }

  private static commitHero(): void {
    const list = this.pendingHero;
    if (!list) return;
    if (Session.source !== "wire" || !Session.role) return;
    const entries = list.entries.map(copyHero);
    this.pendingHero = null;
    this.heroes = entries;
    this.heroCapacity = list.heroCapacity;
    GameLog.shared.info("Wire", "s2c 4001 " + wireHeroNote({ ...list, entries }));
    this.emit();
  }

  private static commitActivity(): void {
    const snap = this.pendingActivity;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyActivity(snap);
    this.pendingActivity = null;
    this.activity = next;
    GameLog.shared.info("Wire", "s2c 17000 " + wireActivityNote(next));
    this.emit();
  }

  private static commitAchievement(): void {
    const snap = this.pendingAchievement;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyAchievement(snap);
    this.pendingAchievement = null;
    this.achievements = next;
    GameLog.shared.info("Wire", "s2c 12010 " + wireAchievementNote(next));
    this.emit();
  }

  private static commitPvp(): void {
    const snap = this.pendingPvp;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyPvp(snap);
    this.pendingPvp = null;
    this.pvp = next;
    GameLog.shared.info("Wire", "s2c 18001 " + wirePvpNote(next));
    this.emit();
  }

  private static commitSevenDay(): void {
    const snap = this.pendingSeven;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copySevenDay(snap);
    this.pendingSeven = null;
    this.sevenDay = next;
    GameLog.shared.info("Wire", "s2c 22000 " + wireSevenNote(next));
    this.emit();
  }

  private static commitGoal7(): void {
    const snap = this.pendingGoal;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyGoal7(snap);
    this.pendingGoal = null;
    this.goal7 = next;
    GameLog.shared.info("Wire", "s2c 21010 " + wireGoalNote(next));
    this.emit();
  }

  private static commitWish(): void {
    const snap = this.pendingWish;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyWish(snap);
    this.pendingWish = null;
    this.wish = next;
    GameLog.shared.info("Wire", "s2c 27001 " + wireWishNote(next));
    this.emit();
  }

  private static commitSummon(): void {
    const snap = this.pendingSummon;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copySummon(snap);
    this.pendingSummon = null;
    this.summon = next;
    GameLog.shared.info("Wire", "s2c 4004 " + wireSummonNote(next));
    this.emit();
  }

  private static commitProphet(): void {
    const snap = this.pendingProphet;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyProphet(snap);
    this.pendingProphet = null;
    this.prophet = next;
    GameLog.shared.info("Wire", "s2c 13044 " + wireProphetNote(next));
    this.emit();
  }

  private static commitJewel(): void {
    const snap = this.pendingJewel;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyJewel(snap);
    this.pendingJewel = null;
    this.jewel = next;
    GameLog.shared.info("Wire", "s2c 4101 " + wireJewelNote(next));
    this.emit();
  }

  private static commitIllustrat(): void {
    const snap = this.pendingIllustrat;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyIllustrat(snap);
    this.pendingIllustrat = null;
    this.illustrat = next;
    GameLog.shared.info("Wire", "s2c 4013 " + wireIllustratNote(next));
    this.emit();
  }

  private static commitPet(): void {
    const snap = this.pendingPet;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyPet(snap);
    this.pendingPet = null;
    this.pet = next;
    GameLog.shared.info("Wire", "s2c 74100 " + wirePetNote(next));
    this.emit();
  }

  private static commitWorld(): void {
    const snap = this.pendingWorld;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyWorld(snap);
    this.pendingWorld = null;
    this.world = next;
    GameLog.shared.info("Wire", "s2c 51001 " + wireWorldNote(next));
    this.emit();
  }

  private static commitPromotion(): void {
    const snap = this.pendingPromotion;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyPromotion(snap);
    this.pendingPromotion = null;
    this.promotion = next;
    GameLog.shared.info("Wire", "s2c 20001 " + wirePromotionNote(next));
    this.emit();
  }

  private static commitFirstRecharge(): void {
    const snap = this.pendingFirstRecharge;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFirstRecharge(snap);
    this.pendingFirstRecharge = null;
    this.firstRecharge = next;
    GameLog.shared.info("Wire", "s2c 20012 " + wireFirstNote(next));
    this.emit();
  }

  private static commitReiki(): void {
    const snap = this.pendingReiki;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyReiki(snap);
    this.pendingReiki = null;
    this.reiki = next;
    GameLog.shared.info("Wire", "s2c 70001 " + wireReikiNote(next));
    this.emit();
  }

  private static commitIslands(): void {
    const snap = this.pendingIslands;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyIslands(snap);
    this.pendingIslands = null;
    this.islands = next;
    GameLog.shared.info("Wire", "s2c 73001 " + wireIslandsNote(next));
    this.emit();
  }

  private static commitTotems(): void {
    const snap = this.pendingTotems;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyTotems(snap);
    this.pendingTotems = null;
    this.totems = next;
    GameLog.shared.info("Wire", "s2c 74300 " + wireTotemsNote(next));
    this.emit();
  }

  private static commitAstrolabe(): void {
    const snap = this.pendingAstrolabe;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyAstrolabe(snap);
    this.pendingAstrolabe = null;
    this.astrolabe = next;
    GameLog.shared.info("Wire", "s2c 68001 " + wireAstrolabeNote(next));
    this.emit();
  }

  private static commitTweakCube(): void {
    const snap = this.pendingTweakCube;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyTweakCube(snap);
    this.pendingTweakCube = null;
    this.tweakCube = next;
    GameLog.shared.info("Wire", "s2c 75501 " + wireTweakCubeNote(next));
    this.emit();
  }

  private static commitDragon(): void {
    const snap = this.pendingDragon;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyDragon(snap);
    this.pendingDragon = null;
    this.dragon = next;
    GameLog.shared.info("Wire", "s2c 59001 " + wireDragonNote(next));
    this.emit();
  }

  private static commitDragonCollection(): void {
    const snap = this.pendingDragonCollection;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyDragonCollection(snap);
    this.pendingDragonCollection = null;
    this.dragonCollection = next;
    GameLog.shared.info("Wire", "s2c 59010 " + wireDragonCollectionNote(next));
    this.emit();
  }

  private static commitTitle(): void {
    const snap = this.pendingTitle;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyTitle(snap);
    this.pendingTitle = null;
    this.titleList = next;
    GameLog.shared.info("Wire", "s2c 55001 " + wireTitleNote(next));
    this.emit();
  }

  private static commitHeadPortrait(): void {
    const snap = this.pendingHeadPortrait;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyHeadPortrait(snap);
    this.pendingHeadPortrait = null;
    this.headPortrait = next;
    GameLog.shared.info("Wire", "s2c 34001 " + wireHeadPortraitNote(next));
    this.emit();
  }

  private static commitBorder(): void {
    const snap = this.pendingBorder;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyBorder(snap);
    this.pendingBorder = null;
    this.border = next;
    GameLog.shared.info("Wire", "s2c 32001 " + wireBorderNote(next));
    this.emit();
  }

  private static commitFashion(): void {
    const snap = this.pendingFashion;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFashion(snap);
    this.pendingFashion = null;
    this.fashion = next;
    GameLog.shared.info("Wire", "s2c 4402 " + wireFashionNote(next));
    this.emit();
  }

  private static commitWornFashion(): void {
    const snap = this.pendingWornFashion;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyWornFashion(snap);
    this.pendingWornFashion = null;
    this.wornFashion = next;
    GameLog.shared.info("Wire", "s2c 4401 " + wireWornFashionNote(next));
    this.emit();
  }

  private static commitHeroPrayer(): void {
    const snap = this.pendingHeroPrayer;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyHeroPrayer(snap);
    this.pendingHeroPrayer = null;
    this.heroPrayer = next;
    GameLog.shared.info("Wire", "s2c 4201 " + wireHeroPrayerNote(next));
    this.emit();
  }

  private static commitPetIllustrate(): void {
    const snap = this.pendingPetIllustrate;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyPetIllustrate(snap);
    this.pendingPetIllustrate = null;
    this.petIllustrate = next;
    GameLog.shared.info("Wire", "s2c 74104 " + wirePetIllustrateNote(next));
    this.emit();
  }

  private static commitFetter(): void {
    const snap = this.pendingFetter;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFetter(snap);
    this.pendingFetter = null;
    this.fetter = next;
    GameLog.shared.info("Wire", "s2c 28100 " + wireFetterNote(next));
    this.emit();
  }

  private static commitFetterFashion(): void {
    const snap = this.pendingFetterFashion;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFetterFashion(snap);
    this.pendingFetterFashion = null;
    this.fetterFashion = next;
    GameLog.shared.info("Wire", "s2c 28200 " + wireFetterFashionNote(next));
    this.emit();
  }

  private static commitShenBin(): void {
    const snap = this.pendingShenBin;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyShenBin(snap);
    this.pendingShenBin = null;
    this.shenBin = next;
    GameLog.shared.info("Wire", "s2c 75601 " + wireShenBinNote(next));
    this.emit();
  }

  private static commitOccupation(): void {
    const snap = this.pendingOccupation;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyOccupation(snap);
    this.pendingOccupation = null;
    this.occupation = next;
    GameLog.shared.info("Wire", "s2c 75606 " + wireOccupationNote(next));
    this.emit();
  }

  private static commitRoleShenBin(): void {
    const snap = this.pendingRoleShenBin;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyRoleShenBin(snap);
    this.pendingRoleShenBin = null;
    this.roleShenBin = next;
    GameLog.shared.info("Wire", "s2c 75615 " + wireRoleShenBinNote(next));
    this.emit();
  }

  private static commitFetterContract(): void {
    const snap = this.pendingFetterContract;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFetterContract(snap);
    this.pendingFetterContract = null;
    this.fetterContract = next;
    GameLog.shared.info("Wire", "s2c 28107 " + wireFetterContractNote(next));
    this.emit();
  }

  private static commitFormation(): void {
    const snap = this.pendingFormation;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyFormation(snap);
    this.pendingFormation = null;
    this.formation = next;
    this.formationSerial += 1;
    GameLog.shared.info("Wire", "s2c 3099 " + wireFormationNote(next));
    this.emit();
  }

  private static commitLineUp(): void {
    const snap = this.pendingLineUp;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyLineUp(snap);
    this.pendingLineUp = null;
    this.lineUp = next;
    this.lineUpSerial += 1;
    GameLog.shared.info("Wire", "s2c 3101 " + wireLineUpNote(next));
    this.emit();
  }

  private static commitRunningPromotion(): void {
    const snap = this.pendingRunningPromotion;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyRunningPromotion(snap);
    this.pendingRunningPromotion = null;
    this.runningPromotion = next;
    GameLog.shared.info("Wire", "s2c 20101 " + wireRunningPromotionNote(next));
    this.emit();
  }

  private static commitTowerReward(): void {
    const snap = this.pendingTowerReward;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyTowerReward(snap);
    this.pendingTowerReward = null;
    this.towerReward = next;
    GameLog.shared.info("Wire", "s2c 3203 " + wireTowerRewardNote(next));
    this.emit();
  }

  private static commitHeroLevelResetTimes(): void {
    const snap = this.pendingHeroLevelResetTimes;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyHeroLevelResetTimes(snap);
    this.pendingHeroLevelResetTimes = null;
    this.heroLevelResetTimes = next;
    GameLog.shared.info("Wire", "s2c 4044 " + wireHeroLevelResetTimesNote(next));
    this.emit();
  }

  private static commitSignInList(): void {
    const snap = this.pendingSignInList;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copySignInList(snap);
    this.pendingSignInList = null;
    this.signInList = next;
    GameLog.shared.info("Wire", "s2c 13010 " + wireSignInListNote(next));
    this.emit();
  }

  private static commitDailyTaskList(): void {
    const snap = this.pendingDailyTaskList;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyDailyTaskList(snap);
    this.pendingDailyTaskList = null;
    this.dailyTaskList = next;
    GameLog.shared.info("Wire", "s2c 12020 " + wireDailyTaskListNote(next));
    this.emit();
  }

  private static commitDailyWelfareList(): void {
    const snap = this.pendingDailyWelfareList;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyDailyWelfareList(snap);
    this.pendingDailyWelfareList = null;
    this.dailyWelfareList = next;
    GameLog.shared.info("Wire", "s2c 26002 " + wireDailyWelfareListNote(next));
    this.emit();
  }

  private static commitMouthWelfareList(): void {
    const snap = this.pendingMouthWelfareList;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyMouthWelfareList(snap);
    this.pendingMouthWelfareList = null;
    this.mouthWelfareList = next;
    GameLog.shared.info("Wire", "s2c 26001 " + wireMouthWelfareListNote(next));
    this.emit();
  }

  private static commitWeekendGift(): void {
    const snap = this.pendingWeekendGift;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyWeekendGift(snap);
    this.pendingWeekendGift = null;
    this.weekendGift = next;
    GameLog.shared.info("Wire", "s2c 61001 " + wireWeekendGiftNote(next));
    this.emit();
  }

  private static commitGodRelic(): void {
    const snap = this.pendingGodRelic;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyGodRelic(snap);
    this.pendingGodRelic = null;
    this.godRelic = next;
    GameLog.shared.info("Wire", "s2c 62001 " + wireGodRelicNote(next));
    this.emit();
  }

  private static commitHeroPalace(): void {
    const snap = this.pendingHeroPalace;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyHeroPalace(snap);
    this.pendingHeroPalace = null;
    this.heroPalace = next;
    GameLog.shared.info("Wire", "s2c 63001 " + wireHeroPalaceNote(next));
    this.emit();
  }

  private static commitRechargeDaysB(): void {
    const snap = this.pendingRechargeDaysB;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyRechargeDaysB(snap);
    this.pendingRechargeDaysB = null;
    this.rechargeDaysB = next;
    GameLog.shared.info("Wire", "s2c 69001 " + wireRechargeDaysBNote(next));
    this.emit();
  }

  private static commitTimeTower(): void {
    const snap = this.pendingTimeTower;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyTimeTower(snap);
    this.pendingTimeTower = null;
    this.timeTower = next;
    GameLog.shared.info("Wire", "s2c 74001 " + wireTimeTowerNote(next));
    this.emit();
  }

  private static commitSpaceTimeAdventure(): void {
    const snap = this.pendingSpaceTimeAdventure;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copySpaceTimeAdventure(snap);
    this.pendingSpaceTimeAdventure = null;
    this.spaceTimeAdventure = next;
    GameLog.shared.info("Wire", "s2c 74120 " + wireSpaceTimeAdventureNote(next));
    this.emit();
  }

  private static commitMagicTowerRoad(): void {
    const snap = this.pendingMagicTowerRoad;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyMagicTowerRoad(snap);
    this.pendingMagicTowerRoad = null;
    this.magicTowerRoad = next;
    GameLog.shared.info("Wire", "s2c 76542 " + wireMagicTowerRoadNote(next));
    this.emit();
  }

  private static commitQiShenQi(): void {
    const snap = this.pendingQiShenQi;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyQiShenQi(snap);
    this.pendingQiShenQi = null;
    this.qiShenQi = next;
    GameLog.shared.info("Wire", "s2c 75101 " + wireQiShenQiNote(next));
    this.emit();
  }

  private static commitZhuShenJiTan(): void {
    const snap = this.pendingZhuShenJiTan;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyZhuShenJiTan(snap);
    this.pendingZhuShenJiTan = null;
    this.zhuShenJiTan = next;
    GameLog.shared.info("Wire", "s2c 75121 " + wireZhuShenJiTanNote(next));
    this.emit();
  }

  private static commitMidFood(): void {
    const snap = this.pendingMidFood;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyMidFood(snap);
    this.pendingMidFood = null;
    this.midFood = next;
    GameLog.shared.info("Wire", "s2c 75131 " + wireMidFoodNote(next));
    this.emit();
  }

  private static commitQiuShangMingYue(): void {
    const snap = this.pendingQiuShangMingYue;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyQiuShangMingYue(snap);
    this.pendingQiuShangMingYue = null;
    this.qiuShangMingYue = next;
    GameLog.shared.info("Wire", "s2c 75801 " + wireQiuShangMingYueNote(next));
    this.emit();
  }

  private static commitWanShengLottery(): void {
    const snap = this.pendingWanShengLottery;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyWanShengLottery(snap);
    this.pendingWanShengLottery = null;
    this.wanShengLottery = next;
    GameLog.shared.info("Wire", "s2c 75901 " + wireWanShengLotteryNote(next));
    this.emit();
  }

  private static commitHeiWuMission(): void {
    const snap = this.pendingHeiWuMission;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyHeiWuMission(snap);
    this.pendingHeiWuMission = null;
    this.heiWuMission = next;
    GameLog.shared.info("Wire", "s2c 76001 " + wireHeiWuMissionNote(next));
    this.emit();
  }

  private static commitChristmasGift(): void {
    const snap = this.pendingChristmasGift;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyChristmasGift(snap);
    this.pendingChristmasGift = null;
    this.christmasGift = next;
    GameLog.shared.info("Wire", "s2c 76101 " + wireChristmasGiftNote(next));
    this.emit();
  }

  private static commitSpringOuting(): void {
    const snap = this.pendingSpringOuting;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copySpringOuting(snap);
    this.pendingSpringOuting = null;
    this.springOuting = next;
    GameLog.shared.info("Wire", "s2c 76301 " + wireSpringOutingNote(next));
    this.emit();
  }

  private static commitChristmasMission(): void {
    const snap = this.pendingChristmasMission;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyChristmasMission(snap);
    this.pendingChristmasMission = null;
    this.christmasMission = next;
    GameLog.shared.info("Wire", "s2c 76081 " + wireChristmasMissionNote(next));
    this.emit();
  }

  private static commitMagicTowerLevelRank(): void {
    const snap = this.pendingMagicTowerLevelRank;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copyMagicTowerLevelRank(snap);
    this.pendingMagicTowerLevelRank = null;
    this.magicTowerLevelRank = next;
    GameLog.shared.info("Wire", "s2c 76520 " + wireMagicTowerLevelRankNote(next));
    this.emit();
  }

  private static commitSpringOutingGrid(): void {
    const snap = this.pendingSpringOutingGrid;
    if (!snap) return;
    if (Session.source !== "wire" || !Session.role) return;
    const next = copySpringOutingGrid(snap);
    this.pendingSpringOutingGrid = null;
    this.springOutingGrid = next;
    GameLog.shared.info("Wire", "s2c 76251 " + wireSpringOutingGridNote(next));
    this.emit();
  }

  private static commitIdle(): void {
    const snapshot = this.pendingIdle;
    if (!snapshot || !wireIdleHasTime(snapshot)) return;
    if (Session.source !== "wire" || !Session.role) return;
    if (snapshot.rewardTime !== null) this.rewardTime = snapshot.rewardTime;
    if (snapshot.maxRewardTime !== null) this.maxRewardTime = snapshot.maxRewardTime;
    this.pendingIdle = null;
    this.idleProbe = copyIdleProbe(snapshot);
    this.idleProbeSerial += 1;
    GameLog.shared.info("Wire", wireIdleNote(snapshot));
    this.emit();
  }

  private static finishClaim(note: string): void {
    this.claimNote = note;
    this.claimSerial += 1;
    this.emit();
  }

  /** 真服 s2c 落地后抄一份给界面。source 不是 wire 时 GameStore 自己不动 Mock。 */
  private static mirrorStore(): void {
    const role = Session.role;
    GameStore.noteWire({
      enabled: Session.source === "wire" && !!role,
      account: Session.account,
      serverId: Session.serverId,
      roleId: role ? role.roleId : null,
      name: role ? role.name : "",
      nameSynced: Session.wireSync.name,
      level: Session.wireSync.level && role ? role.level : null,
      gold: Session.wireSync.gold ? Session.gold : null,
      diamond: Session.wireSync.diamond ? Session.diamond : null,
      nowIdx: this.nowIdx,
      maxIdx: this.maxIdx,
      heroes: this.heroes,
      bag: this.bagItems,
      lineUp: this.lineUp,
      unlockIds: this.formation ? this.formation.unlockIds : null,
      rewardTime: this.rewardTime,
      maxRewardTime: this.maxRewardTime,
      battle: this.battleMatch,
    });
  }

  private static emit(): void {
    this.mirrorStore();
    for (const listener of Array.from(this.listeners)) {
      try {
        listener();
      } catch (err) {
        GameLog.shared.error("Wire", "刷新顶栏失败 " + (err instanceof Error ? err.message : "未知错误"));
      }
    }
  }

  private static unhook(): void {
    if (this.offProfile) {
      this.offProfile();
      this.offProfile = null;
    }
    if (this.offChapter) {
      this.offChapter();
      this.offChapter = null;
    }
    if (this.offBattle) {
      this.offBattle();
      this.offBattle = null;
    }
    if (this.offChapterReward) {
      this.offChapterReward();
      this.offChapterReward = null;
    }
    if (this.offQuickBattle) {
      this.offQuickBattle();
      this.offQuickBattle = null;
    }
    if (this.offChapterReport) {
      this.offChapterReport();
      this.offChapterReport = null;
    }
    if (this.offBattleReport) {
      this.offBattleReport();
      this.offBattleReport = null;
    }
    if (this.offPreCompute) {
      this.offPreCompute();
      this.offPreCompute = null;
    }
    if (this.offStudy) {
      this.offStudy();
      this.offStudy = null;
    }
    if (this.offIdle) {
      this.offIdle();
      this.offIdle = null;
    }
    if (this.offIdleClaim) {
      this.offIdleClaim();
      this.offIdleClaim = null;
    }
    if (this.offBag) {
      this.offBag();
      this.offBag = null;
    }
    if (this.offBagGain) {
      this.offBagGain();
      this.offBagGain = null;
    }
    if (this.offMail) {
      this.offMail();
      this.offMail = null;
    }
    if (this.offHero) {
      this.offHero();
      this.offHero = null;
    }
    if (this.offActivity) {
      this.offActivity();
      this.offActivity = null;
    }
    if (this.offAchievement) {
      this.offAchievement();
      this.offAchievement = null;
    }
    if (this.offPvp) {
      this.offPvp();
      this.offPvp = null;
    }
    if (this.offSeven) {
      this.offSeven();
      this.offSeven = null;
    }
    if (this.offSevenPush) {
      this.offSevenPush();
      this.offSevenPush = null;
    }
    if (this.offGoal) {
      this.offGoal();
      this.offGoal = null;
    }
    if (this.offGoalPush) {
      this.offGoalPush();
      this.offGoalPush = null;
    }
    if (this.offWish) {
      this.offWish();
      this.offWish = null;
    }
    if (this.offSummon) {
      this.offSummon();
      this.offSummon = null;
    }
    if (this.offProphet) {
      this.offProphet();
      this.offProphet = null;
    }
    if (this.offJewel) {
      this.offJewel();
      this.offJewel = null;
    }
    if (this.offIllustrat) {
      this.offIllustrat();
      this.offIllustrat = null;
    }
    if (this.offPet) {
      this.offPet();
      this.offPet = null;
    }
    if (this.offWorld) {
      this.offWorld();
      this.offWorld = null;
    }
    if (this.offPromotion) {
      this.offPromotion();
      this.offPromotion = null;
    }
    if (this.offFirstRecharge) {
      this.offFirstRecharge();
      this.offFirstRecharge = null;
    }
    if (this.offReiki) {
      this.offReiki();
      this.offReiki = null;
    }
    if (this.offIslands) {
      this.offIslands();
      this.offIslands = null;
    }
    if (this.offTotems) {
      this.offTotems();
      this.offTotems = null;
    }
    if (this.offAstrolabe) {
      this.offAstrolabe();
      this.offAstrolabe = null;
    }
    if (this.offTweakCube) {
      this.offTweakCube();
      this.offTweakCube = null;
    }
    if (this.offDragon) {
      this.offDragon();
      this.offDragon = null;
    }
    if (this.offDragonCollection) {
      this.offDragonCollection();
      this.offDragonCollection = null;
    }
    if (this.offTitle) {
      this.offTitle();
      this.offTitle = null;
    }
    if (this.offHeadPortrait) {
      this.offHeadPortrait();
      this.offHeadPortrait = null;
    }
    if (this.offBorder) {
      this.offBorder();
      this.offBorder = null;
    }
    if (this.offFashion) {
      this.offFashion();
      this.offFashion = null;
    }
    if (this.offWornFashion) {
      this.offWornFashion();
      this.offWornFashion = null;
    }
    if (this.offHeroPrayer) {
      this.offHeroPrayer();
      this.offHeroPrayer = null;
    }
    if (this.offPetIllustrate) {
      this.offPetIllustrate();
      this.offPetIllustrate = null;
    }
    if (this.offFetter) {
      this.offFetter();
      this.offFetter = null;
    }
    if (this.offFetterFashion) {
      this.offFetterFashion();
      this.offFetterFashion = null;
    }
    if (this.offShenBin) {
      this.offShenBin();
      this.offShenBin = null;
    }
    if (this.offOccupation) {
      this.offOccupation();
      this.offOccupation = null;
    }
    if (this.offRoleShenBin) {
      this.offRoleShenBin();
      this.offRoleShenBin = null;
    }
    if (this.offFetterContract) {
      this.offFetterContract();
      this.offFetterContract = null;
    }
    if (this.offFormation) {
      this.offFormation();
      this.offFormation = null;
    }
    if (this.offLineUp) {
      this.offLineUp();
      this.offLineUp = null;
    }
    if (this.offRunningPromotion) {
      this.offRunningPromotion();
      this.offRunningPromotion = null;
    }
    if (this.offTowerReward) {
      this.offTowerReward();
      this.offTowerReward = null;
    }
    if (this.offHeroLevelResetTimes) {
      this.offHeroLevelResetTimes();
      this.offHeroLevelResetTimes = null;
    }
    if (this.offSignInList) {
      this.offSignInList();
      this.offSignInList = null;
    }
    if (this.offDailyTaskList) {
      this.offDailyTaskList();
      this.offDailyTaskList = null;
    }
    if (this.offDailyWelfareList) {
      this.offDailyWelfareList();
      this.offDailyWelfareList = null;
    }
    if (this.offMouthWelfareList) {
      this.offMouthWelfareList();
      this.offMouthWelfareList = null;
    }
    if (this.offWeekendGift) {
      this.offWeekendGift();
      this.offWeekendGift = null;
    }
    if (this.offGodRelic) {
      this.offGodRelic();
      this.offGodRelic = null;
    }
    if (this.offHeroPalace) {
      this.offHeroPalace();
      this.offHeroPalace = null;
    }
    if (this.offRechargeDaysB) {
      this.offRechargeDaysB();
      this.offRechargeDaysB = null;
    }
    if (this.offTimeTower) {
      this.offTimeTower();
      this.offTimeTower = null;
    }
    if (this.offSpaceTimeAdventure) {
      this.offSpaceTimeAdventure();
      this.offSpaceTimeAdventure = null;
    }
    if (this.offMagicTowerRoad) {
      this.offMagicTowerRoad();
      this.offMagicTowerRoad = null;
    }
    if (this.offQiShenQi) {
      this.offQiShenQi();
      this.offQiShenQi = null;
    }
    if (this.offZhuShenJiTan) {
      this.offZhuShenJiTan();
      this.offZhuShenJiTan = null;
    }
    if (this.offMidFood) {
      this.offMidFood();
      this.offMidFood = null;
    }
    if (this.offQiuShangMingYue) {
      this.offQiuShangMingYue();
      this.offQiuShangMingYue = null;
    }
    if (this.offWanShengLottery) {
      this.offWanShengLottery();
      this.offWanShengLottery = null;
    }
    if (this.offHeiWuMission) {
      this.offHeiWuMission();
      this.offHeiWuMission = null;
    }
    if (this.offChristmasGift) {
      this.offChristmasGift();
      this.offChristmasGift = null;
    }
    if (this.offSpringOuting) {
      this.offSpringOuting();
      this.offSpringOuting = null;
    }
    if (this.offChristmasMission) {
      this.offChristmasMission();
      this.offChristmasMission = null;
    }
    if (this.offMagicTowerLevelRank) {
      this.offMagicTowerLevelRank();
      this.offMagicTowerLevelRank = null;
    }
    if (this.offSpringOutingGrid) {
      this.offSpringOutingGrid();
      this.offSpringOutingGrid = null;
    }
    if (this.offHeroAdd) {
      this.offHeroAdd();
      this.offHeroAdd = null;
    }
    if (this.offLineUpSave) {
      this.offLineUpSave();
      this.offLineUpSave = null;
    }
    if (this.offServerError) {
      this.offServerError();
      this.offServerError = null;
    }
  }
}

function copyBagItem(item: WireBagItem): WireBagItem {
  const marks = item.marks ? item.marks.map(copyBagMark) : [];
  return { itemId: item.itemId, itemType: item.itemType, num: item.num, marks };
}

function copyBagMark(mark: WireBagMark): WireBagMark {
  return { field: mark.field, text: mark.text };
}

function copyMail(entry: WireMailEntry): WireMailEntry {
  return {
    id: entry.id,
    time: entry.time,
    mark3: entry.mark3,
    mark4: entry.mark4,
    title: entry.title,
    body: entry.body,
    attachment: entry.attachment,
    attachments: entry.attachments.map((row) => ({ itemId: row.itemId, count: row.count })),
  };
}

function copyActivity(snap: WireActivitySnapshot): WireActivitySnapshot {
  return {
    status: snap.status,
    time: snap.time,
    rows: snap.rows.map(copyActivityRow),
  };
}

function copyActivityRow(row: WireActivityRow): WireActivityRow {
  return { idx: row.idx, num: row.num };
}

function copyAchievement(snap: WireAchievementSnapshot): WireAchievementSnapshot {
  return {
    tasks: snap.tasks.map((task) => ({ idx: task.idx, process: task.process, state: task.state })),
  };
}

function copyPvp(snap: WirePvpSnapshot): WirePvpSnapshot {
  return {
    freeCount: snap.freeCount,
    score: snap.score,
    opponents: snap.opponents.map(copyPvpOpponent),
    seasonEndTime: snap.seasonEndTime,
    likeRids: snap.likeRids ? snap.likeRids.slice() : null,
    likeRidsUnparsed: snap.likeRidsUnparsed,
    seasonCount: snap.seasonCount,
    seasonReward: snap.seasonReward,
    seasonRewardUnparsed: snap.seasonRewardUnparsed,
  };
}

function copySevenDay(snap: WireSevenDaySnapshot): WireSevenDaySnapshot {
  return {
    endTime: snap.endTime,
    curDay: snap.curDay,
    rows: snap.rows.map(copySevenDayRow),
  };
}

function copySevenDayRow(row: WireSevenDayRow): WireSevenDayRow {
  return { idx: row.idx, status: row.status };
}

function copyGoal7(snap: WireGoal7Snapshot): WireGoal7Snapshot {
  return {
    currDay: snap.currDay,
    sevenDayValue: snap.sevenDayValue,
    rewardBoxIdx: snap.rewardBoxIdx.slice(),
    tasks: snap.tasks.map(copyGoal7Task),
  };
}

function copyGoal7Task(task: WireGoal7Task): WireGoal7Task {
  return { idx: task.idx, process: task.process, state: task.state };
}

function copyWish(snap: WireWishSnapshot): WireWishSnapshot {
  return {
    pools: snap.pools.map(copyWishPool),
    marks: snap.marks.map(copyWishMark),
  };
}

function copyWishPool(pool: WireWishPool): WireWishPool {
  return {
    type: pool.type,
    refreshTimes: pool.refreshTimes,
    luckyValue: pool.luckyValue,
    luckyRewardId: pool.luckyRewardId,
    refreshTime: pool.refreshTime,
    slots: pool.slots.map(copyWishSlot),
    marks: pool.marks.map(copyWishMark),
  };
}

function copyWishSlot(slot: WireWishSlot): WireWishSlot {
  return {
    position: slot.position,
    times: slot.times,
    item: slot.item,
    marks: slot.marks.map(copyWishMark),
  };
}

function copyWishMark(mark: WireWishMark): WireWishMark {
  return { field: mark.field, text: mark.text };
}

function copySummon(snap: WireSummonSnapshot): WireSummonSnapshot {
  return {
    freeTime: snap.freeTime,
    seniorFreeTime: snap.seniorFreeTime,
    marks: snap.marks.map(copySummonMark),
  };
}

function copySummonMark(mark: WireSummonMark): WireSummonMark {
  return { field: mark.field, text: mark.text };
}

function copyProphet(snap: WireProphetSnapshot): WireProphetSnapshot {
  return {
    luckys: snap.luckys.map(copyProphetLucky),
    marks: snap.marks.map(copyProphetMark),
  };
}

function copyProphetLucky(row: WireProphetLucky): WireProphetLucky {
  return {
    type: row.type,
    lucky: row.lucky,
    marks: row.marks.map(copyProphetMark),
  };
}

function copyProphetMark(mark: WireProphetMark): WireProphetMark {
  return { field: mark.field, text: mark.text };
}

function copyJewel(snap: WireJewelSnapshot): WireJewelSnapshot {
  return {
    heroes: snap.heroes.map(copyJewelHero),
    marks: snap.marks.map(copyJewelMark),
  };
}

function copyJewelHero(row: WireJewelHero): WireJewelHero {
  return {
    heroId: row.heroId,
    jewels: row.jewels.map(copyJewelPiece),
    marks: row.marks.map(copyJewelMark),
  };
}

function copyJewelPiece(row: WireJewelPiece): WireJewelPiece {
  return {
    jewelId: row.jewelId,
    place: row.place,
    jewelType: row.jewelType,
    marks: row.marks.map(copyJewelMark),
  };
}

function copyJewelMark(mark: WireJewelMark): WireJewelMark {
  return { field: mark.field, text: mark.text };
}

function copyIllustrat(snap: WireIllustratSnapshot): WireIllustratSnapshot {
  return {
    rows: snap.rows.map(copyIllustratRow),
    marks: snap.marks.map(copyIllustratMark),
  };
}

function copyIllustratRow(row: WireIllustratRow): WireIllustratRow {
  return {
    heroType: row.heroType,
    star: row.star,
    marks: row.marks.map(copyIllustratMark),
  };
}

function copyIllustratMark(mark: WireIllustratMark): WireIllustratMark {
  return { field: mark.field, text: mark.text };
}

function copyPet(snap: WirePetSnapshot): WirePetSnapshot {
  return {
    rows: snap.rows.map(copyPetRow),
    marks: snap.marks.map(copyPetMark),
  };
}

function copyPetRow(row: WirePetRow): WirePetRow {
  return {
    petId: row.petId,
    sysId: row.sysId,
    heroId: row.heroId,
    level: row.level,
    marks: row.marks.map(copyPetMark),
  };
}

function copyPetMark(mark: WirePetMark): WirePetMark {
  return { field: mark.field, text: mark.text };
}

function copyWorld(snap: WireWorldSnapshot): WireWorldSnapshot {
  return {
    level: snap.level,
    marks: snap.marks.map(copyWorldMark),
  };
}

function copyWorldMark(mark: WireWorldMark): WireWorldMark {
  return { field: mark.field, text: mark.text };
}

function copyPromotion(snap: WirePromotionSnapshot): WirePromotionSnapshot {
  return {
    isBuyFoundation: snap.isBuyFoundation,
    records: snap.records.map(copyPromotionRecord),
    marks: snap.marks.map(copyPromotionMark),
  };
}

function copyPromotionRecord(row: WirePromotionRecord): WirePromotionRecord {
  return {
    key: row.key,
    value: row.value,
    marks: row.marks.map(copyPromotionMark),
  };
}

function copyPromotionMark(mark: WirePromotionMark): WirePromotionMark {
  return { field: mark.field, text: mark.text };
}

function copyFirstRecharge(snap: WireFirstRechargeSnapshot): WireFirstRechargeSnapshot {
  return {
    recharge: snap.recharge,
    claimed: snap.claimed.slice(),
    rewards: snap.rewards.map(copyFirstRechargeReward),
    marks: snap.marks.map(copyFirstRechargeMark),
  };
}

function copyFirstRechargeReward(row: WireFirstRechargeReward): WireFirstRechargeReward {
  return {
    key: row.key,
    value: row.value,
    marks: row.marks.map(copyFirstRechargeMark),
  };
}

function copyFirstRechargeMark(mark: WireFirstRechargeMark): WireFirstRechargeMark {
  return { field: mark.field, text: mark.text };
}

function copyReiki(snap: WireReikiSnapshot): WireReikiSnapshot {
  return {
    rows: snap.rows.map(copyReikiRow),
    marks: snap.marks.map(copyReikiMark),
  };
}

function copyReikiRow(row: WireReikiRow): WireReikiRow {
  return {
    heroId: row.heroId,
    sysId: row.sysId,
    reikiEquipId: row.reikiEquipId,
    marks: row.marks.map(copyReikiMark),
  };
}

function copyReikiMark(mark: WireReikiMark): WireReikiMark {
  return { field: mark.field, text: mark.text };
}

function copyIslands(snap: WireIslandsSnapshot): WireIslandsSnapshot {
  return {
    nextTime: snap.nextTime,
    stage: snap.stage,
    marks: snap.marks.map(copyIslandsMark),
  };
}

function copyIslandsMark(mark: WireIslandsMark): WireIslandsMark {
  return { field: mark.field, text: mark.text };
}

function copyTotems(snap: WireTotemsSnapshot): WireTotemsSnapshot {
  return {
    rows: snap.rows.map(copyTotemsRow),
    marks: snap.marks.map(copyTotemsMark),
  };
}

function copyTotemsRow(row: WireTotemsRow): WireTotemsRow {
  return {
    tId: row.tId,
    sysId: row.sysId,
    heroId: row.heroId,
    level: row.level,
    quality: row.quality,
    marks: row.marks.map(copyTotemsMark),
  };
}

function copyTotemsMark(mark: WireTotemsMark): WireTotemsMark {
  return { field: mark.field, text: mark.text };
}

function copyAstrolabe(snap: WireAstrolabeSnapshot): WireAstrolabeSnapshot {
  return {
    maxStar: snap.maxStar,
    active: snap.active.map(copyAstrolabeActive),
    activeElem: snap.activeElem.slice(),
    activeAstrolabe: snap.activeAstrolabe,
    marks: snap.marks.map(copyAstrolabeMark),
  };
}

function copyAstrolabeActive(row: WireAstrolabeActive): WireAstrolabeActive {
  return {
    key: row.key,
    value: row.value,
    marks: row.marks.map(copyAstrolabeMark),
  };
}

function copyAstrolabeMark(mark: WireAstrolabeMark): WireAstrolabeMark {
  return { field: mark.field, text: mark.text };
}

function copyTweakCube(snap: WireCubeSnapshot): WireCubeSnapshot {
  return {
    rankHero: snap.rankHero.slice(),
    openCount: snap.openCount,
    trenches: snap.trenches.map(copyTweakCubeTrench),
    marks: snap.marks.map(copyTweakCubeMark),
  };
}

function copyTweakCubeTrench(row: WireCubeTrench): WireCubeTrench {
  return {
    index: row.index,
    heroId: row.heroId,
    lastChangeTime: row.lastChangeTime,
    marks: row.marks.map(copyTweakCubeMark),
  };
}

function copyTweakCubeMark(mark: WireCubeMark): WireCubeMark {
  return { field: mark.field, text: mark.text };
}

function copyDragon(snap: WireDragonSnapshot): WireDragonSnapshot {
  return {
    identifyLevel: snap.identifyLevel,
    attrLevel: snap.attrLevel,
    identities: snap.identities.map(copyDragonIdentity),
    slots: snap.slots.map(copyDragonSlot),
    privilegeEndTime: snap.privilegeEndTime,
    marks: snap.marks.map(copyDragonMark),
  };
}

function copyDragonIdentity(row: WireDragonIdentity): WireDragonIdentity {
  return {
    type: row.type,
    startTime: row.startTime,
    level: row.level,
    speedAdd: row.speedAdd,
    marks: row.marks.map(copyDragonMark),
  };
}

function copyDragonSlot(row: WireDragonSlot): WireDragonSlot {
  return {
    id: row.id,
    sysId: row.sysId,
    marks: row.marks.map(copyDragonMark),
  };
}

function copyDragonMark(mark: WireDragonMark): WireDragonMark {
  return { field: mark.field, text: mark.text };
}

function copyDragonCollection(snap: WireDragonCollectionSnapshot): WireDragonCollectionSnapshot {
  return {
    sysIds: snap.sysIds.slice(),
    marks: snap.marks.map(copyDragonCollectionMark),
  };
}

function copyDragonCollectionMark(mark: WireDragonCollectionMark): WireDragonCollectionMark {
  return { field: mark.field, text: mark.text };
}

function copyTitle(snap: WireTitleSnapshot): WireTitleSnapshot {
  return {
    titles: snap.titles.map(copyTitleRow),
    marks: snap.marks.map(copyTitleMark),
  };
}

function copyTitleRow(row: WireTitleRow): WireTitleRow {
  return {
    idx: row.idx,
    endTime: row.endTime,
    marks: row.marks.map(copyTitleMark),
  };
}

function copyTitleMark(mark: WireTitleMark): WireTitleMark {
  return { field: mark.field, text: mark.text };
}

function copyHeadPortrait(snap: WireHeadPortraitSnapshot): WireHeadPortraitSnapshot {
  return {
    idxList: snap.idxList.slice(),
    marks: snap.marks.map(copyHeadPortraitMark),
  };
}

function copyHeadPortraitMark(mark: WireHeadPortraitMark): WireHeadPortraitMark {
  return { field: mark.field, text: mark.text };
}

function copyBorder(snap: WireBorderSnapshot): WireBorderSnapshot {
  return {
    units: snap.units.map(copyBorderUnit),
    marks: snap.marks.map(copyBorderMark),
  };
}

function copyBorderUnit(row: WireBorderUnit): WireBorderUnit {
  return {
    id: row.id,
    activeState: row.activeState,
    marks: row.marks.map(copyBorderMark),
  };
}

function copyBorderMark(mark: WireBorderMark): WireBorderMark {
  return { field: mark.field, text: mark.text };
}

function copyFashion(snap: WireFashionSnapshot): WireFashionSnapshot {
  return {
    list: snap.list.map(copyFashionRow),
    marks: snap.marks.map(copyFashionMark),
  };
}

function copyFashionRow(row: WireFashionRow): WireFashionRow {
  return {
    heroType: row.heroType,
    fashionId: row.fashionId,
    level: row.level,
    status: row.status,
    endTime: row.endTime,
    marks: row.marks.map(copyFashionMark),
  };
}

function copyFashionMark(mark: WireFashionMark): WireFashionMark {
  return { field: mark.field, text: mark.text };
}

function copyWornFashion(snap: WireWornFashionSnapshot): WireWornFashionSnapshot {
  return {
    list: snap.list.map(copyWornFashionRow),
    marks: snap.marks.map(copyWornFashionMark),
  };
}

function copyWornFashionRow(row: WireWornFashionRow): WireWornFashionRow {
  return {
    heroId: row.heroId,
    fashionId: row.fashionId,
    marks: row.marks.map(copyWornFashionMark),
  };
}

function copyWornFashionMark(mark: WireWornFashionMark): WireWornFashionMark {
  return { field: mark.field, text: mark.text };
}

function copyHeroPrayer(snap: WireHeroPrayerSnapshot): WireHeroPrayerSnapshot {
  return {
    privilege: snap.privilege,
    endTime: snap.endTime,
    marks: snap.marks.map(copyHeroPrayerMark),
  };
}

function copyHeroPrayerMark(mark: WireHeroPrayerMark): WireHeroPrayerMark {
  return { field: mark.field, text: mark.text };
}

function copyPetIllustrate(snap: WirePetIllustrateSnapshot): WirePetIllustrateSnapshot {
  return {
    petTypes: snap.petTypes.slice(),
    marks: snap.marks.map(copyPetIllustrateMark),
  };
}

function copyPetIllustrateMark(mark: WirePetIllustrateMark): WirePetIllustrateMark {
  return { field: mark.field, text: mark.text };
}

function copyFetter(snap: WireFetterSnapshot): WireFetterSnapshot {
  return {
    resetCount: snap.resetCount,
    goddess: snap.goddess.map(copyFetterGoddess),
    marks: snap.marks.map(copyFetterMark),
  };
}

function copyFetterGoddess(row: WireFetterGoddess): WireFetterGoddess {
  return {
    type: row.type,
    exp: row.exp,
    level: row.level,
    skillLevel: row.skillLevel,
    refineLevel: row.refineLevel,
    uplimitLevel: row.uplimitLevel,
    soulLevel: row.soulLevel,
    washLevel: row.washLevel,
    marks: row.marks.map(copyFetterMark),
  };
}

function copyFetterMark(mark: WireFetterMark): WireFetterMark {
  return { field: mark.field, text: mark.text };
}

function copyFetterFashion(snap: WireFetterFashionSnapshot): WireFetterFashionSnapshot {
  return {
    activeTypes: snap.activeTypes.slice(),
    useType: snap.useType,
    marks: snap.marks.map(copyFetterFashionMark),
  };
}

function copyFetterFashionMark(mark: WireFetterFashionMark): WireFetterFashionMark {
  return { field: mark.field, text: mark.text };
}

function copyShenBin(snap: WireShenBinSnapshot): WireShenBinSnapshot {
  return {
    infos: snap.infos.map(copyShenBinInfo),
    marks: snap.marks.map(copyShenBinMark),
  };
}

function copyShenBinInfo(row: WireShenBinInfo): WireShenBinInfo {
  return {
    job: row.job,
    coreLv: row.coreLv,
    fighting: row.fighting,
    equip: row.equip ? copyShenBinEquip(row.equip) : null,
    marks: row.marks.map(copyShenBinMark),
  };
}

function copyShenBinEquip(equip: WireShenBinEquip): WireShenBinEquip {
  return {
    job: equip.job,
    holes: equip.holes.map(copyShenBinHole),
    marks: equip.marks.map(copyShenBinMark),
  };
}

function copyShenBinHole(hole: WireShenBinHole): WireShenBinHole {
  return { marks: hole.marks.map(copyShenBinMark) };
}

function copyShenBinMark(mark: WireShenBinMark): WireShenBinMark {
  return { field: mark.field, text: mark.text };
}

function copyOccupation(snap: WireOccupationSnapshot): WireOccupationSnapshot {
  return {
    info: snap.info ? copyOccupationInfo(snap.info) : null,
    marks: snap.marks.map(copyOccupationMark),
  };
}

function copyOccupationInfo(info: WireOccupationInfo): WireOccupationInfo {
  return {
    ocId: info.ocId,
    tasks: info.tasks.map(copyOccupationTask),
    marks: info.marks.map(copyOccupationMark),
  };
}

function copyOccupationTask(row: WireOccupationTask): WireOccupationTask {
  return {
    taskId: row.taskId,
    targetCount: row.targetCount,
    condition: row.condition,
    completeType: row.completeType,
    marks: row.marks.map(copyOccupationMark),
  };
}

function copyOccupationMark(mark: WireOccupationMark): WireOccupationMark {
  return { field: mark.field, text: mark.text };
}

function copyRoleShenBin(snap: WireRoleShenBinSnapshot): WireRoleShenBinSnapshot {
  return {
    items: snap.items.map(copyRoleShenBinItem),
    marks: snap.marks.map(copyRoleShenBinMark),
  };
}

function copyRoleShenBinItem(row: WireRoleShenBinItem): WireRoleShenBinItem {
  return {
    itemType: row.itemType,
    itemNum: row.itemNum,
    marks: row.marks.map(copyRoleShenBinMark),
  };
}

function copyFetterContract(snap: WireFetterContractSnapshot): WireFetterContractSnapshot {
  return {
    contracts: snap.contracts.slice(),
    marks: snap.marks.map(copyFetterContractMark),
  };
}

function copyFetterContractMark(mark: WireFetterContractMark): WireFetterContractMark {
  return { field: mark.field, text: mark.text };
}

function copyFormation(snap: WireFormationSnapshot): WireFormationSnapshot {
  return {
    unlockIds: snap.unlockIds.slice(),
    marks: snap.marks.map(copyFormationMark),
  };
}

function copyFormationMark(mark: WireFormationMark): WireFormationMark {
  return { field: mark.field, text: mark.text };
}

function copyLineUp(snap: WireLineUpSnapshot): WireLineUpSnapshot {
  return {
    rows: snap.rows.map(copyLineUpRow),
    assistanceUnlock: snap.assistanceUnlock,
    marks: snap.marks.map(copyLineUpMark),
  };
}

function copyLineUpRow(row: WireLineUpRow): WireLineUpRow {
  return { marks: row.marks.map(copyLineUpMark) };
}

function copyLineUpMark(mark: WireLineUpMark): WireLineUpMark {
  return { field: mark.field, text: mark.text };
}

function copyRunningPromotion(snap: WireRunningPromotionSnapshot): WireRunningPromotionSnapshot {
  return {
    rows: snap.rows.map(copyRunningPromotionRow),
    marks: snap.marks.map(copyRunningPromotionMark),
  };
}

function copyRunningPromotionRow(row: WireRunningPromotionRow): WireRunningPromotionRow {
  return {
    id: row.id,
    startTime: row.startTime,
    endTime: row.endTime,
    clearTime: row.clearTime,
    turns: row.turns,
    marks: row.marks.map(copyRunningPromotionMark),
  };
}

function copyRunningPromotionMark(mark: WireRunningPromotionMark): WireRunningPromotionMark {
  return { field: mark.field, text: mark.text };
}

function copyTowerReward(snap: WireTowerRewardSnapshot): WireTowerRewardSnapshot {
  return {
    list: snap.list.slice(),
    marks: snap.marks.map(copyTowerRewardMark),
  };
}

function copyTowerRewardMark(mark: WireTowerRewardMark): WireTowerRewardMark {
  return { field: mark.field, text: mark.text };
}

function copyHeroLevelResetTimes(snap: WireHeroLevelResetTimesSnapshot): WireHeroLevelResetTimesSnapshot {
  return {
    times: snap.times,
    marks: snap.marks.map(copyHeroLevelResetTimesMark),
  };
}

function copyHeroLevelResetTimesMark(mark: WireHeroLevelResetTimesMark): WireHeroLevelResetTimesMark {
  return { field: mark.field, text: mark.text };
}

function copySignInList(snap: WireSignInListSnapshot): WireSignInListSnapshot {
  return {
    days: snap.days ? snap.days.slice() : null,
    isSignIn: snap.isSignIn,
    month: snap.month,
    charged: snap.charged,
    newServer: snap.newServer,
    marks: snap.marks.map(copySignInListMark),
  };
}

function copySignInListMark(mark: WireSignInListMark): WireSignInListMark {
  return { field: mark.field, text: mark.text };
}

function copyDailyTaskList(snap: WireDailyTaskListSnapshot): WireDailyTaskListSnapshot {
  return {
    tasks: snap.tasks ? snap.tasks.map(copyDailyTaskRow) : null,
    rewardBoxIdx: snap.rewardBoxIdx ? snap.rewardBoxIdx.slice() : null,
    dailyValue: snap.dailyValue,
    marks: snap.marks.map(copyDailyTaskMark),
  };
}

function copyDailyTaskRow(row: WireDailyTaskRow): WireDailyTaskRow {
  return {
    idx: row.idx,
    process: row.process,
    state: row.state,
    marks: row.marks.map(copyDailyTaskMark),
  };
}

function copyDailyTaskMark(mark: WireDailyTaskMark): WireDailyTaskMark {
  return { field: mark.field, text: mark.text };
}

function copyDailyWelfareList(snap: WireDailyWelfareListSnapshot): WireDailyWelfareListSnapshot {
  return {
    list: snap.list ? snap.list.map(copyDailyWelfareRow) : null,
    marks: snap.marks.map(copyDailyWelfareMark),
  };
}

function copyDailyWelfareRow(row: WireDailyWelfareRow): WireDailyWelfareRow {
  return {
    giftPackId: row.giftPackId,
    num: row.num,
    marks: row.marks.map(copyDailyWelfareMark),
  };
}

function copyDailyWelfareMark(mark: WireDailyWelfareMark): WireDailyWelfareMark {
  return { field: mark.field, text: mark.text };
}

function copyMouthWelfareList(snap: WireMouthWelfareListSnapshot): WireMouthWelfareListSnapshot {
  return {
    list: snap.list ? snap.list.map(copyMouthWelfareRow) : null,
    marks: snap.marks.map(copyMouthWelfareMark),
  };
}

function copyMouthWelfareRow(row: WireMouthWelfareRow): WireMouthWelfareRow {
  return {
    giftPackId: row.giftPackId,
    num: row.num,
    marks: row.marks.map(copyMouthWelfareMark),
  };
}

function copyMouthWelfareMark(mark: WireMouthWelfareMark): WireMouthWelfareMark {
  return { field: mark.field, text: mark.text };
}

function copyWeekendGift(snap: WireWeekendGiftSnapshot): WireWeekendGiftSnapshot {
  return {
    startTime: snap.startTime,
    endTime: snap.endTime,
    rewardStatus: snap.rewardStatus ? snap.rewardStatus.map(copyWeekendGiftRow) : null,
    marks: snap.marks.map(copyWeekendGiftMark),
  };
}

function copyWeekendGiftRow(row: WireWeekendGiftRow): WireWeekendGiftRow {
  return {
    idx: row.idx,
    status: row.status,
    marks: row.marks.map(copyWeekendGiftMark),
  };
}

function copyWeekendGiftMark(mark: WireWeekendGiftMark): WireWeekendGiftMark {
  return { field: mark.field, text: mark.text };
}

function copyGodRelic(snap: WireGodRelicSnapshot): WireGodRelicSnapshot {
  return {
    buyCount: snap.buyCount,
    canChallengeCount: snap.canChallengeCount,
    starMap: snap.starMap ? snap.starMap.map(copyGodRelicMap) : null,
    starRewardRecord: snap.starRewardRecord ? snap.starRewardRecord.map(copyGodRelicReward) : null,
    marks: snap.marks.map(copyGodRelicMark),
  };
}

function copyGodRelicMap(row: WireGodRelicMapEntry): WireGodRelicMapEntry {
  return {
    key: row.key,
    value: row.value,
    marks: row.marks.map(copyGodRelicMark),
  };
}

function copyGodRelicReward(row: WireGodRelicReward): WireGodRelicReward {
  if (row.kind === "num") return { kind: "num", value: row.value };
  return { kind: "row", marks: row.marks.map(copyGodRelicMark) };
}

function copyGodRelicMark(mark: WireGodRelicMark): WireGodRelicMark {
  return { field: mark.field, text: mark.text };
}

function copyHeroPalace(snap: WireHeroPalaceSnapshot): WireHeroPalaceSnapshot {
  return {
    rows: snap.rows ? snap.rows.map(copyHeroPalaceRow) : null,
    marks: snap.marks.map(copyHeroPalaceMark),
  };
}

function copyHeroPalaceRow(row: WireHeroPalaceRow): WireHeroPalaceRow {
  return {
    type: row.type,
    rankRole: row.rankRole ? copyHeroPalaceRole(row.rankRole) : null,
    isReward: row.isReward,
    isWorship: row.isWorship,
    serverRankRole: row.serverRankRole ? copyHeroPalaceRole(row.serverRankRole) : null,
    marks: row.marks.map(copyHeroPalaceMark),
  };
}

function copyHeroPalaceRole(role: WireHeroPalaceRole): WireHeroPalaceRole {
  if (role.kind === "num") return { kind: "num", value: role.value };
  return { kind: "blob", marks: role.marks.map(copyHeroPalaceMark) };
}

function copyHeroPalaceMark(mark: WireHeroPalaceMark): WireHeroPalaceMark {
  return { field: mark.field, text: mark.text };
}

function copyRechargeDaysB(snap: WireRechargeDaysBSnapshot): WireRechargeDaysBSnapshot {
  return {
    rows: snap.rows ? snap.rows.map(copyRechargeDaysBRow) : null,
    marks: snap.marks.map(copyRechargeDaysBMark),
  };
}

function copyRechargeDaysBRow(row: WireRechargeDaysBRow): WireRechargeDaysBRow {
  return {
    day: row.day,
    money: row.money,
    hasReward: row.hasReward,
    marks: row.marks.map(copyRechargeDaysBMark),
  };
}

function copyRechargeDaysBMark(mark: WireRechargeDaysBMark): WireRechargeDaysBMark {
  return { field: mark.field, text: mark.text };
}

function copyTimeTower(snap: WireTimeTowerSnapshot): WireTimeTowerSnapshot {
  return {
    missionId: snap.missionId,
    accumulatePass: snap.accumulatePass,
    maxPass: snap.maxPass,
    heart: snap.heart,
    missionMark: snap.missionMark,
    starttime: snap.starttime,
    endtime: snap.endtime,
    marks: snap.marks.map(copyTimeTowerMark),
  };
}

function copyTimeTowerMark(mark: WireTimeTowerMark): WireTimeTowerMark {
  return { field: mark.field, text: mark.text };
}

function copySpaceTimeAdventure(snap: WireSpaceTimeAdventureSnapshot): WireSpaceTimeAdventureSnapshot {
  return {
    unlockRoute: copySpaceTimePieces(snap.unlockRoute),
    notRoute: copySpaceTimePieces(snap.notRoute),
    energy: snap.energy,
    notProgress: snap.notProgress,
    endTime: snap.endTime,
    shopEndTime: snap.shopEndTime,
    shopList: copySpaceTimePieces(snap.shopList),
    status: snap.status,
    productEndTime: snap.productEndTime,
    productId: snap.productId,
    productBuy: snap.productBuy,
    speedBuff: snap.speedBuff,
    marks: snap.marks.map(copySpaceTimeMark),
  };
}

function copySpaceTimePieces(list: WireSpaceTimeAdventurePiece[] | null): WireSpaceTimeAdventurePiece[] | null {
  if (!list) return null;
  const next: WireSpaceTimeAdventurePiece[] = [];
  for (let i = 0; i < list.length; i++) next.push(copySpaceTimePiece(list[i]));
  return next;
}

function copySpaceTimePiece(piece: WireSpaceTimeAdventurePiece): WireSpaceTimeAdventurePiece {
  if (piece.kind === "num") return { kind: "num", value: piece.value };
  return { kind: "row", marks: piece.marks.map(copySpaceTimeMark) };
}

function copySpaceTimeMark(mark: WireSpaceTimeAdventureMark): WireSpaceTimeAdventureMark {
  return { field: mark.field, text: mark.text };
}

function copyMagicTowerRoad(snap: WireMagicTowerRoadSnapshot): WireMagicTowerRoadSnapshot {
  return {
    normalList: copyMagicTowerPieces(snap.normalList),
    kingList: copyMagicTowerPieces(snap.kingList),
    state: snap.state,
    marks: snap.marks.map(copyMagicTowerMark),
  };
}

function copyMagicTowerPieces(list: WireMagicTowerRoadPiece[] | null): WireMagicTowerRoadPiece[] | null {
  if (!list) return null;
  const next: WireMagicTowerRoadPiece[] = [];
  for (let i = 0; i < list.length; i++) next.push(copyMagicTowerPiece(list[i]));
  return next;
}

function copyMagicTowerPiece(piece: WireMagicTowerRoadPiece): WireMagicTowerRoadPiece {
  if (piece.kind === "num") return { kind: "num", value: piece.value };
  return { kind: "row", marks: piece.marks.map(copyMagicTowerMark) };
}

function copyMagicTowerMark(mark: WireMagicTowerRoadMark): WireMagicTowerRoadMark {
  return { field: mark.field, text: mark.text };
}

function copyQiShenQi(snap: WireQiShenQiSnapshot): WireQiShenQiSnapshot {
  return {
    buy: copyQiShenQiBuys(snap.buy),
    marks: snap.marks.map(copyQiShenQiMark),
  };
}

function copyQiShenQiBuys(list: WireQiShenQiBuy[] | null): WireQiShenQiBuy[] | null {
  if (!list) return null;
  const next: WireQiShenQiBuy[] = [];
  for (let i = 0; i < list.length; i++) next.push(copyQiShenQiBuy(list[i]));
  return next;
}

function copyQiShenQiBuy(row: WireQiShenQiBuy): WireQiShenQiBuy {
  return { idx: row.idx, count: row.count, marks: row.marks.map(copyQiShenQiMark) };
}

function copyQiShenQiMark(mark: WireQiShenQiMark): WireQiShenQiMark {
  return { field: mark.field, text: mark.text };
}

function copyZhuShenJiTan(snap: WireZhuShenJiTanSnapshot): WireZhuShenJiTanSnapshot {
  return {
    floor: snap.floor,
    moneyDrawNum: snap.moneyDrawNum,
    marks: snap.marks.map(copyZhuShenJiTanMark),
  };
}

function copyZhuShenJiTanMark(mark: WireZhuShenJiTanMark): WireZhuShenJiTanMark {
  return { field: mark.field, text: mark.text, nested: mark.nested };
}

function copyMidFood(snap: WireMidFoodSnapshot): WireMidFoodSnapshot {
  return {
    buy: copyMidFoodBuys(snap.buy),
    marks: snap.marks.map(copyMidFoodMark),
  };
}

function copyMidFoodBuys(list: WireMidFoodBuy[] | null): WireMidFoodBuy[] | null {
  if (!list) return null;
  const next: WireMidFoodBuy[] = [];
  for (let i = 0; i < list.length; i++) next.push(copyMidFoodBuy(list[i]));
  return next;
}

function copyMidFoodBuy(row: WireMidFoodBuy): WireMidFoodBuy {
  return { idx: row.idx, count: row.count, marks: row.marks.map(copyMidFoodMark) };
}

function copyMidFoodMark(mark: WireMidFoodMark): WireMidFoodMark {
  return { field: mark.field, text: mark.text };
}

function copyQiuShangMingYue(snap: WireQiuShangMingYueSnapshot): WireQiuShangMingYueSnapshot {
  return {
    selectInfo: copyQiuShangPieces(snap.selectInfo),
    lotteryReward: copyQiuShangPieces(snap.lotteryReward),
    lotteryCount: snap.lotteryCount,
    lotteryBestRemainingCount: snap.lotteryBestRemainingCount,
    marks: snap.marks.map(copyQiuShangMark),
  };
}

function copyQiuShangPieces(list: WireQiuShangMingYuePiece[] | null): WireQiuShangMingYuePiece[] | null {
  if (!list) return null;
  const next: WireQiuShangMingYuePiece[] = [];
  for (let i = 0; i < list.length; i++) next.push(copyQiuShangPiece(list[i]));
  return next;
}

function copyQiuShangPiece(piece: WireQiuShangMingYuePiece): WireQiuShangMingYuePiece {
  if (piece.kind === "num") return { kind: "num", value: piece.value };
  return { kind: "row", marks: piece.marks.map(copyQiuShangMark) };
}

function copyQiuShangMark(mark: WireQiuShangMingYueMark): WireQiuShangMingYueMark {
  return { field: mark.field, text: mark.text };
}

function copyWanShengLottery(snap: WireWanShengLotterySnapshot): WireWanShengLotterySnapshot {
  return {
    selectInfo: copyWanShengPieces(snap.selectInfo),
    lotteryReward: copyWanShengPieces(snap.lotteryReward),
    lotteryCount: snap.lotteryCount,
    lotteryBestRemainingCount: snap.lotteryBestRemainingCount,
    lastLotteryId: snap.lastLotteryId,
    marks: snap.marks.map(copyWanShengMark),
  };
}

function copyWanShengPieces(list: WireWanShengLotteryPiece[] | null): WireWanShengLotteryPiece[] | null {
  if (!list) return null;
  const next: WireWanShengLotteryPiece[] = [];
  for (let i = 0; i < list.length; i++) next.push(copyWanShengPiece(list[i]));
  return next;
}

function copyWanShengPiece(piece: WireWanShengLotteryPiece): WireWanShengLotteryPiece {
  if (piece.kind === "num") return { kind: "num", value: piece.value };
  return { kind: "row", marks: piece.marks.map(copyWanShengMark) };
}

function copyWanShengMark(mark: WireWanShengLotteryMark): WireWanShengLotteryMark {
  return { field: mark.field, text: mark.text };
}

function copyHeiWuMission(snap: WireHeiWuMissionSnapshot): WireHeiWuMissionSnapshot {
  return {
    mission: copyHeiWuPieces(snap.mission),
    missionBoxRewardRecord: copyHeiWuPieces(snap.missionBoxRewardRecord),
    missionRewardCount: snap.missionRewardCount,
    buy: copyHeiWuPieces(snap.buy),
    marks: snap.marks.map(copyHeiWuMark),
  };
}

function copyHeiWuPieces(list: WireHeiWuMissionPiece[] | null): WireHeiWuMissionPiece[] | null {
  if (!list) return null;
  const next: WireHeiWuMissionPiece[] = [];
  for (let i = 0; i < list.length; i++) next.push(copyHeiWuPiece(list[i]));
  return next;
}

function copyHeiWuPiece(piece: WireHeiWuMissionPiece): WireHeiWuMissionPiece {
  if (piece.kind === "num") return { kind: "num", value: piece.value };
  return { kind: "row", marks: piece.marks.map(copyHeiWuMark) };
}

function copyHeiWuMark(mark: WireHeiWuMissionMark): WireHeiWuMissionMark {
  return { field: mark.field, text: mark.text };
}

function copyChristmasGift(snap: WireChristmasGiftSnapshot): WireChristmasGiftSnapshot {
  return {
    buy: copyChristmasGiftBuys(snap.buy),
    marks: snap.marks.map(copyChristmasGiftMark),
  };
}

function copyChristmasGiftBuys(list: WireChristmasGiftBuy[] | null): WireChristmasGiftBuy[] | null {
  if (!list) return null;
  const next: WireChristmasGiftBuy[] = [];
  for (let i = 0; i < list.length; i++) next.push(copyChristmasGiftBuy(list[i]));
  return next;
}

function copyChristmasGiftBuy(row: WireChristmasGiftBuy): WireChristmasGiftBuy {
  return { idx: row.idx, count: row.count, marks: row.marks.map(copyChristmasGiftMark) };
}

function copyChristmasGiftMark(mark: WireChristmasGiftMark): WireChristmasGiftMark {
  return { field: mark.field, text: mark.text };
}

function copySpringOuting(snap: WireSpringOutingSnapshot): WireSpringOutingSnapshot {
  return {
    mission: copySpringPieces(snap.mission),
    missionBoxRewardRecord: copySpringPieces(snap.missionBoxRewardRecord),
    openDay: snap.openDay,
    marks: snap.marks.map(copySpringMark),
  };
}

function copySpringPieces(list: WireSpringOutingPiece[] | null): WireSpringOutingPiece[] | null {
  if (!list) return null;
  const next: WireSpringOutingPiece[] = [];
  for (let i = 0; i < list.length; i++) next.push(copySpringPiece(list[i]));
  return next;
}

function copySpringPiece(piece: WireSpringOutingPiece): WireSpringOutingPiece {
  if (piece.kind === "num") return { kind: "num", value: piece.value };
  return { kind: "row", marks: piece.marks.map(copySpringMark) };
}

function copySpringMark(mark: WireSpringOutingMark): WireSpringOutingMark {
  return { field: mark.field, text: mark.text };
}

function copyChristmasMission(snap: WireChristmasMissionSnapshot): WireChristmasMissionSnapshot {
  return {
    mission: copyChristmasPieces(snap.mission),
    missionBoxRewardRecord: copyChristmasPieces(snap.missionBoxRewardRecord),
    openDay: snap.openDay,
    marks: snap.marks.map(copyChristmasMark),
  };
}

function copyChristmasPieces(list: WireChristmasMissionPiece[] | null): WireChristmasMissionPiece[] | null {
  if (!list) return null;
  const next: WireChristmasMissionPiece[] = [];
  for (let i = 0; i < list.length; i++) next.push(copyChristmasPiece(list[i]));
  return next;
}

function copyChristmasPiece(piece: WireChristmasMissionPiece): WireChristmasMissionPiece {
  if (piece.kind === "num") return { kind: "num", value: piece.value };
  return { kind: "row", marks: piece.marks.map(copyChristmasMark) };
}

function copyChristmasMark(mark: WireChristmasMissionMark): WireChristmasMissionMark {
  return { field: mark.field, text: mark.text };
}

function copyMagicTowerLevelRank(snap: WireMagicTowerLevelRankSnapshot): WireMagicTowerLevelRankSnapshot {
  return {
    self: snap.self ? copyMagicTowerLevelRankRow(snap.self) : null,
    list: snap.list ? snap.list.map(copyMagicTowerLevelRankRow) : null,
    marks: snap.marks.map(copyMagicTowerLevelRankMark),
  };
}

function copyMagicTowerLevelRankRow(row: WireMagicTowerLevelRankRow): WireMagicTowerLevelRankRow {
  return {
    rid: row.rid,
    serverId: row.serverId,
    name: row.name,
    borderId: row.borderId,
    headId: row.headId,
    passLevel: row.passLevel,
    passTime: row.passTime,
    rank: row.rank,
    marks: row.marks.map(copyMagicTowerLevelRankMark),
  };
}

function copyMagicTowerLevelRankMark(mark: WireMagicTowerLevelRankMark): WireMagicTowerLevelRankMark {
  return { field: mark.field, text: mark.text };
}

function copySpringOutingGrid(snap: WireSpringOutingGridSnapshot): WireSpringOutingGridSnapshot {
  return {
    currIdx: snap.currIdx,
    scenicRecord: copySpringOutingGridPieces(snap.scenicRecord),
    scenicCount: snap.scenicCount,
    marks: snap.marks.map(copySpringOutingGridMark),
  };
}

function copySpringOutingGridPieces(list: WireSpringOutingGridPiece[] | null): WireSpringOutingGridPiece[] | null {
  if (!list) return null;
  const next: WireSpringOutingGridPiece[] = [];
  for (let i = 0; i < list.length; i++) next.push(copySpringOutingGridPiece(list[i]));
  return next;
}

function copySpringOutingGridPiece(piece: WireSpringOutingGridPiece): WireSpringOutingGridPiece {
  if (piece.kind === "num") return { kind: "num", value: piece.value };
  return { kind: "row", marks: piece.marks.map(copySpringOutingGridMark) };
}

function copySpringOutingGridMark(mark: WireSpringOutingGridMark): WireSpringOutingGridMark {
  return { field: mark.field, text: mark.text };
}

function copyRoleShenBinMark(mark: WireRoleShenBinMark): WireRoleShenBinMark {
  return { field: mark.field, text: mark.text };
}

function copyPvpOpponent(row: WirePvpOpponent): WirePvpOpponent {
  return {
    playerId: row.playerId,
    name: row.name,
    marks: row.marks.map((mark) => ({ field: mark.field, text: mark.text })),
  };
}

function copyIdleProbe(snapshot: WireIdleSnapshot): WireIdleSnapshot {
  return {
    rewardTime: snapshot.rewardTime,
    maxRewardTime: snapshot.maxRewardTime,
  };
}

function copyChapterProbe(progress: WireChapterProgress): WireChapterProgress {
  return {
    nowIdx: progress.nowIdx,
    maxIdx: progress.maxIdx,
    resRewardTime: progress.resRewardTime,
    extraRewardIds: progress.extraRewardIds.slice(),
  };
}

function copyHero(entry: WireHeroEntry): WireHeroEntry {
  return {
    heroId: entry.heroId,
    heroType: entry.heroType,
    level: entry.level,
    stage: entry.stage,
    star: entry.star,
    elem: entry.elem,
    occupation: entry.occupation,
    isLock: entry.isLock,
    fighting: entry.fighting,
  };
}
