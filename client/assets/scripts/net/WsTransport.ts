import { GameLog } from "../core/GameLog";
import { ErrorCode, logErrorCode } from "../core/errors";
import { ITransport, NetHandler, NetMessage } from "./NetTypes";
import { Cmd } from "./protocol/cmds";
import { bytesToHex, concatBytes, decodeFrames, exactBuffer } from "./protocol/frame";
import { decodeProtoFields, encodeWireMessage, formatProtoFields, WireInbound } from "./protocol/wireLogin";

/**
 * 浏览器 WebSocket，默认连本机桥 ws://127.0.0.1:13111/game（转到 TCP 9902）。
 * 线上只写 frame.ts 里的长度前缀帧：心跳 1004 空体、登录 1001、创角 1002。
 * 占位 cmd 没有日志里的帧时不发送。粘包按 TCP 帧切开。见 docs/h5-websocket.md。
 * 登录后的推送（倩本机见过 28000、28103、20005、25001、23000、21013、50000）记日志并派发成 wire.<cmdId>。
 * 空的 c2s 2001 是日志里拉角色资料的那一帧。回包由 WireSession 读字段 9、6、2、1。
 * 空的 c2s 5001 拉背包整表。s2c 5001 / 5002 由 WireSession 读，不写顶栏。
 * 空的 c2s 15000 拉邮件列表。s2c 15000 由 WireSession 读，不写顶栏，不领取。
 * c2s 4001 page=1 拉英雄列表。s2c 4001 由 WireSession 读，不写顶栏，不升级。
 * 空的 c2s 17000 拉点金记录。s2c 17000 由 WireSession 按 GResBuyGoldLog 读，不写顶栏，不点金。
 * 空的 c2s 12010 拉成就记录。s2c 12010 由 WireSession 按 GResAchievementList 读，不写顶栏，不领奖。不发 12020。
 * 空的 c2s 18001 拉竞技场。s2c 18001 由 WireSession 按 GResPvpData 读，不写顶栏，不开战。不发 18002、18003、18005、18007、18008。
 * 空的 c2s 22000 拉七日登录。s2c 22000 由 WireSession 按 GResSevenDayLoginData 读，不写顶栏，不领奖。不发 22001。s2c 22002 只改 cur_day。
 * 空的 c2s 21010 拉七日目标。s2c 21010 由 WireSession 按 GResSevenDayTargetList 读，不写顶栏，不发奖。不发 21011、21012。s2c 21013 只收，不改表。不是 22000，也不是 17000。
 * 空的 c2s 27001 拉许愿池。s2c 27001 由 WireSession 按 GResBlessingPoolList 读，不写顶栏。不发 27002、27003、27004。不发 4201。
 * 空的 c2s 4004 拉召唤次数。s2c 4004 由 WireSession 按 GResHeroSummonCount 读 free_time、senior_free_time，不写顶栏。不发 4002、4005。不做 58001、58007。不是英雄列表 4001。
 * 空的 c2s 13044 拉先知召唤幸运值。s2c 13044 由 WireSession 按 GResProphetSummonInfo 读 luckys 的 type、lucky，不写顶栏。不发 13041、13042、13043。不做 58007、4201。不是召唤次数 4004。
 * 空的 c2s 4101 拉英雄宝石。s2c 4101 由 WireSession 按 GResHeroJewel 读 hero_id、jewel_id、place、jewel_type，不写顶栏。不发 4102、4103、4104、4105、4106、4107。不做 9001。不是英雄列表 4001，也不是 13044。
 * 空的 c2s 4013 拉英雄图鉴。s2c 4013 由 WireSession 按 GResIllustratReward 读 list 的 hero_type、star，不写顶栏。名字像领奖，实为查看。不发 4014。4014 仅 s2c 推送。不是英雄列表 4001，也不是 4101。
 * 空的 c2s 74100 拉宠物信息。s2c 74100 由 WireSession 按 GResPetInfoList 读 list 的 pet_id、sys_id、hero_id、level，不写顶栏。不发 74101、74102、74103。74105、74106 仅 s2c 推送，不主动发。不是英雄列表 4001，也不是 4013。
 * 空的 c2s 51001 拉世界等级。s2c 51001 由 WireSession 按 GResWorldLevel 读 level，不写顶栏。本模块无写操作号。不做 20101。不夹在 2001 和 3007 中间。别的号不猜。
 * 空的 c2s 20001 拉基金列表。s2c 20001 由 WireSession 按 GResPromotionList 读 is_buy_foundation 和 foundation_reward_record，不写顶栏。不发 20018。不发 20004、20010。不做 3007。挂在 51001 之后。不回落 Mock。
 * 空的 c2s 20012 拉超值首充记录。s2c 20012 由 WireSession 按 GResFirstRecharge 读 recharge、list 已领 idx 和 can_reward，不写顶栏。不发 20013。不做 13260。挂在 20001 之后。不回落 Mock。
 * 空的 c2s 70001 拉灵器数据。s2c 70001 由 WireSession 按 GResReikiEquipData 读 list 的 hero_id、sys_id、reiki_equip_id，不写顶栏。不发 70002、70003、70004、70005、70006。70007、70008 仅推送，不当拉包请求。不做 20011。挂在 20012 之后。不回落 Mock。
 * 空的 c2s 73001 拉浮空岛时间。s2c 73001 由 WireSession 按 GResFloatingIslandsTime 读 next_time、stage，不写顶栏。不发 73002、73003、73004。73002 有懒建和日刷写库，不当纯只读。本号无写库。不做 20011。挂在 70001 之后。不回落 Mock。
 * 空的 c2s 74300 拉图腾信息。s2c 74300 由 WireSession 按 GResTotemsInfoList 读 list 的 t_id、sys_id、hero_id、level、quality，不写顶栏。不发 74301 升级/升阶、74302 装备/卸/换、74303 重置。74304 仅推送，勿发、勿当拉包请求。本号无写库。不做 20011。挂在 73001 之后。与 74100 宠物同城养成段。不回落 Mock。
 * 空的 c2s 68001 拉星盘数据。无 page。s2c 68001 由 WireSession 按 GResAstrolabeData 读 maxStar、active 的 PSMapData key、value、activeElem、activeAstrolabe，不写顶栏。不发 68002 激活元素、68003 点亮星盘、68004 重置、68006 激活星盘。68005 是更新星数常量，勿发、勿当拉包请求。轻懒建，首次 load 可能 astrolabeDao.add 空行，无扣费、无领奖、无日刷写库，管理员认定可接受。不做 20011。挂在 74300 之后。不回落 Mock。
 * 空的 c2s 75501 拉魔方数据。无 page。s2c 75501 由 WireSession 按 GResTweakCube 读 rank_hero、open_count、trench 的 index、hero_id、last_change_time，不写顶栏。不发 75502 添加、75503 卸下、75504 开格子、75505 清 cd。75506 是等级推送，勿发、勿当拉包请求。轻懒建，首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉，无扣费、无领奖，管理员认定可接受，同星盘。不做 34001。不做 20011。挂在 68001 之后。不回落 Mock。
 * 空的 c2s 59001 拉圣龙数据。无 page。s2c 59001 由 WireSession 按 GResDragonScanInfo 读 identify_level、attr_level、identities 的 type、start_time、level、speed_add、slots 的 id、sys_id、privilege_end_time，不写顶栏。不发 59002 放源石、59003 提升鉴定、59005 加速鉴定、59006 鉴定领奖、59007 提升圣龙等级、59008 圣物替换、59009 调顺序、59011、59012 升星、59013 分解。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。轻懒建，首次 dragonDao.add，无扣费、无领奖。不做 34001。不做 20011。挂在 75501 之后。不回落 Mock。
 * 空的 c2s 59010 拉圣物图鉴。无 page。s2c 59010 由 WireSession 按 GResDragonCollection 读 repeated int32 sys_id，不写顶栏。不发 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。轻懒建，与 59001 同 getDragon / dragonDao.add，无扣费、无领奖。不做 34001。不做 20011。挂在 59001 之后。不回落 Mock。
 * 空的 c2s 55001 拉称号列表。无 page。s2c 55001 由 WireSession 按 GResScanTitleList 读 repeated PSTitle 的 idx、end_time，不写顶栏。end_time：-1 永久，0 未激活，时间戳为到期。Title.proto 仅 55001 读写对，同模块无写号。轻懒建，TitleService.getTitle → dao.add，无扣费、无领奖、无日刷。34001 另只读接在其后。不做 20011。挂在 59010 之后。不回落 Mock。
 * 空的 c2s 34001 拉头像列表。无 page。整帧 04000000d1840000。s2c 34001 由 WireSession 按 GResHeadPortraitList 读 repeated int32 idx_list，不写顶栏。不发 34002 更换头像。34003 是解锁推送，勿发、勿当拉包。32001 另只读接在其后。不做 20011。轻懒建，RoleHeadPortraitService.select 无记录则 dao.add 默认解锁头，无扣费、无领奖、不改当前头像。挂在 55001 之后。不回落 Mock。
 * 空的 c2s 32001 拉头像框数据。无 page。整帧 04000000017d0000。s2c 32001 由 WireSession 按 GResBorderData 读 repeated PSBorderUnit 的 id、active_state，不写顶栏。不发 32002 道具激活。不发 32003 使用/切换边框。32003 是服侧推送，当前框过期时服侧可能写 role.borderId 回落并另推，客户端不发、勿当拉包。4402 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。轻懒建免费框可接受。挂在 34001 之后。不回落 Mock。
 * 空的 c2s 4402 拉激活皮肤列表。无 page。整帧 0400000032110000。s2c 4402 由 WireSession 按 GResHeroFashionList 读 repeated PSFashionData 的 hero_type、fashion_id、level、status、end_time，不写顶栏。status：0 永久，1 限时。不发 4403 激活。不发 4404 替换/使用。不发 4405 皮肤升级。4406 无实现，勿发。4401 穿戴皮肤英雄列表另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。过期限时皮剔除，并可能把英雄 fashionId 置 0。只读展示。无扣费，无领奖。挂在 32001 之后。不回落 Mock。
 * 空的 c2s 4401 拉穿戴皮肤英雄列表。无 page。整帧 0400000031110000。s2c 4401 由 WireSession 按 GResHeroFashion 读 repeated PSHeroFashion 的 hero_id、fashion_id，不写顶栏。不发 4403 激活。不发 4404 替换/使用。不发 4405 皮肤升级。4406 无实现，勿发。与 4402 分刀，勿合并。本刀不重复拉 4402。4201 英雄祈愿数据另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。过期限时皮清理，并可能卸英雄 fashionId。只读展示。无扣费，无领奖，无邮件。挂在 4402 之后。不回落 Mock。
 * 空的 c2s 4201 拉英雄祈愿数据。无 page。整帧 0400000069100000。s2c 4201 由 WireSession 按 GResHeroPrayerData 读 privilege、end_time，不写顶栏。privilege：0/1。end_time 未开为 0。没有的数不写成 0。不发 4202 英雄祈愿。4202 扣道具并发奖。74104 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 4401 分刀，勿合并。本刀不重复拉 4401。轻懒建 hero_prayer。特权过期清字段。只读展示。无扣费，无领奖。挂在 4401 之后。不回落 Mock。
 * 空的 c2s 28100 拉羁绊数据。无 page。整帧 04000000c46d0000。s2c 28100 由 WireSession 按 GResFetterList 读 reset_count 和 goddess 的 type、exp、level、skill_level、refine_level、uplimit_level、soul_level、wash_level，不写顶栏。没有的数不写成 0。出现的值如实展示。不发 28101 升级、28102 升技、28104 突破、28105 重置、28106 铸魂、28108 解锁契约、28109 洗炼。不发 28002 领任务奖、28003 精炼。28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74104 分开发，勿合并。本刀不重复拉 74104。轻懒建（load/getFetterTask）。无扣费，无领奖。只读展示。挂在 74104 之后。不回落 Mock。
 * 空的 c2s 28200 拉羁绊皮肤。无 page。整帧 04000000286e0000。s2c 28200 由 WireSession 按 GResFashionData 读 active_type 和 use_type，不写顶栏。没有的数不写成 0。出现的值如实展示。不发 28201 熔炼、28202 激活、28204 领任务奖、28205 使用皮肤。28203 任务列表虽只读，本刀勿夹发。不发 28101–28109、28002、28003。75601 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28100 分开发，勿合并。本刀不重复拉 28100。轻懒建 goddess_fashion。无扣费，无发奖，不改皮肤。只读展示。挂在 28100 之后。不回落 Mock。
 * 空的 c2s 75601 拉神兵数据。无 page。整帧 0400000051270100。s2c 75601 由 WireSession 按 GResShenBinInfo 读 shenBinInfos 的 job、coreLv、equipData（job 与 equip_list 的 PSHoleData）、fighting，不写顶栏。没有的数不写成 0。出现的值如实展示。不发 75602 合成、75603 装备、75604 核心升级、75605 分解。不发 75619、75609。75606 职级信息另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28200 分开发，勿合并。本刀不重复拉 28200。按 job 轻懒建 core（默认 coreLv=1）。无合成，无装备，无核心升级，无分解。只读展示。挂在 28200 之后。不回落 Mock。
 * 空的 c2s 75606 拉职级信息。无 page。整帧 0400000056270100。s2c 75606 由 WireSession 按 GResGetOccupationInfo 读 occupationInfo 的 oc_id 和 taskInfos 的 taskId、targetCount、condition、complete_type，不写顶栏。没有的数不写成 0。出现的值如实展示。75607 同为空体 GReqGetOccupationInfo，不发 75607。不发 75609。75608 为服推，勿当 c2s。不发 75602、75603、75604、75605、75619。75615 神兵道具另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75601 分开发，勿合并。本刀不重复拉 75601。允许 getOrCreate 轻懒建。无扣费，无领奖。只读展示。挂在 75601 之后。不回落 Mock。
 * 空的 c2s 75615 拉神兵道具。无 page。整帧 040000005f270100。s2c 75615 由 WireSession 按 GResRoleShenBinInfo 读 roleShenBins 的 item_type、itemNum，不写顶栏。902048 是精华 SHENBIN_ESSENCE，其余 item_type 是 shenBinMap 材料。没有的数不写成 0。出现的值如实展示。不发 75602、75603、75604、75605、75619。不发 75607、75609。75608 为服推，勿当 c2s。75607 同为空体，不发 75607。28107 查看契约另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75606 分开发，勿合并。本刀不重复拉 75606。允许 getOrCreate 轻懒建（默认 knighthoodId=1）。只读拼包。无扣费，无领奖。只读展示。挂在 75606 之后。不回落 Mock。
 * 空的 c2s 28107 拉已激活契约。无 page。整帧 04000000cb6d0000。s2c 28107 由 WireSession 按 GResFetterContractInfo 读 contracts（repeated int32，不保证顺序），不写顶栏。没有的数不写成 0。出现的值如实展示。不发 28101、28102、28104、28105、28106、28108、28109。不发 28002、28003、28004。不发 28201–28205。3099 查询阵法另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 75615 分开发，勿合并。本刀不重复拉 75615。轻懒建（getFetterTask）。只读，无解锁、无扣费、无领奖。只读展示。挂在 75615 之后。不回落 Mock。
 * 空的 c2s 3099 拉已解锁阵法。无 page。整帧 040000001b0c0000。s2c 3099 由 WireSession 按 GResQueryFormation 读 unlockIds（repeated int32，不保证顺序），不写顶栏。没有的数不写成 0。出现的值如实展示。不发 3097 解锁第二契约、3098 解锁阵法、3100 保存战斗队列。不发 3102 查战报、3030 切磋。3101 副本队列另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 28107 分开发，勿合并。本刀不重复拉 28107。getFormation 轻懒建（无记录则 add；未解锁阵法 id=1 则 unlock(1)+update）。只读，无扣费、无领奖、不写养成。只读展示。挂在 28107 之后。不回落 Mock。
 * 空的 c2s 3101 拉副本队列。无 page。整帧 040000001d0c0000。s2c 3101 由 WireSession 按 GResLineUp 读 list（repeated PSLineUpData，按字段号写）和 assistance_unlock（optional bool），不写顶栏。没有的数不写成 0。出现的值如实展示。不发 3100 保存队列、3098 解锁阵法、3097 解锁第二契约、3030 切磋、3102 请求战报、3103 预计算战斗力。3099 勿再发。不做备选 5001。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 3099 分开发，勿合并。本刀不重复拉 3099。getHeroLineUps→fillLineUp 轻修复（formationId==0 则置 1 并轻修站位后 update；本路径不走 add）。只读，无扣费、无领奖、不写养成。只读展示。挂在 3099 之后。不回落 Mock。
 * 空的 c2s 20101 拉进行中活动。无 page。整帧 04000000854e0000。s2c 20101 由 WireSession 按 GResRunningPromotion 读 promotions（repeated PbPromotionData：id、start_time、end_time、clear_time、turns），不写顶栏。没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。同文件 20102 非空体勿挂。不发各活动领奖写号（20018、20013、20004、20010）。不做 20011。51001 已有，勿重复。5001 已有，勿重复。3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3101 分开发，勿合并。本刀不重复拉 3101，也不重复拉 3099。promotionControlService.getAllWillRun() 组列表。纯读。无扣费，无领奖，不写养成。只读展示。挂在 3101 之后。3203 另帧接在其后。不回落 Mock。
 * 空的 c2s 3203 拉已领爬塔首通。无 page。整帧 04000000830c0000。s2c 3203 由 WireSession 按 GResTowerRewardList 读 list（字段 1，repeated int32，已领爬塔首通 idx），不写顶栏。没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不发 3202、3204、3205、3206、3220。3200 本轮勿挂。4044 英雄等级重生次数另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3099、3101、20101 勿再发。不做 3012、3010、19001。12020 每日任务列表另只读接在 13010 之后。4601 有 page，硬禁。29001 有 page，硬禁。与 20101 分开发，勿合并。本刀不重复拉 20101，也不重复拉 3101，也不重复拉 3099。towerService.getTower 无档可 towerDao.add 轻懒建。handler 不走门票回复，不 updateTower。无扣费，无领奖，无养成写。轻懒建可接受。只读展示。挂在 20101 之后。不回落 Mock。
 * 空的 c2s 4044 拉英雄等级重生次数。无 page。整帧 04000000cc0f0000。s2c 4044 由 WireSession 按 GResHeroLevelResetTimes 读 times（字段 1），不写顶栏。没有的数不写成 0。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不发 4043 英雄等级重生（扣费、清符文、降级、返还）。13010 签到列表另只读接在其后，勿合并。不做 20011。5001、51001 已有，勿重复。3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3203 分开发，勿合并。本刀不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。HeroSummonService.getHeroSummon 可能轻懒建。跨日可能把 times 清零并更新。轻懒建、轻日刷可接受。无扣费，无领奖，无养成写。只读展示。挂在 3203 之后。不回落 Mock。
 * 空的 c2s 13010 拉签到列表。无 page。整帧 04000000d2320000。s2c 13010 由 WireSession 按 GResSignInList 读 days、isSignIn、month、charged、newServer（字段 1–5），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不发 13011 签到领奖。12020 每日任务列表另只读接在其后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 4044 分开发，勿合并。本刀不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。getSignday 轻懒建。跨日、跨月可能把签到日重置并写库。轻懒建、轻日刷、轻月刷可接受。无扣费，无领奖。只读展示。挂在 4044 之后。不回落 Mock。
 * 空的 c2s 12020 拉每日任务列表。无 page。整帧 04000000f42e0000。s2c 12020 由 WireSession 按 GResDailyTaskList 读 Task、RewardBoxIdx、DailyValue（字段 1–3），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不发 12021 领每日任务奖。不发 12022 领活跃宝箱。26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并。不做 20011。不是启动链 12010。5001、51001 已有，勿重复。13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 13010 分开发，勿合并。本刀不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。getDailyTasks 可能 reset、checkNew。loadRoleDailyTask 可能按日刷新宝箱进度。轻懒建、轻日刷可接受。无扣费，无领奖。只读展示。挂在 13010 之后。不回落 Mock。
 * 空的 c2s 26002 拉每日福利列表。无 page。整帧 0400000092650000。s2c 26002 由 WireSession 按 GResDailyWelfareList 读 list（字段 1，repeated PSMapData，key 是 giftPackId，value 是 num），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。26001 每月福利列表另只读接在其后，勿合并。不发明领奖写号。不发 12021、12022。不做 20011。不是启动链 12010。不是每日任务列表 12020。5001、51001 已有，勿重复。12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 12020 分开发，勿合并。本刀不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。纯读。轻副作用可接受。无扣费，无领奖写。只读展示。挂在 12020 之后。不回落 Mock。
 * 空的 c2s 26001 拉每月福利列表。proto 名 mouth，就是 month。无 page。整帧 0400000091650000。s2c 26001 由 WireSession 按 GResMouthWelfareList 读 list（字段 1，repeated PSMapData，key 是 giftPackId，value 是 num），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 26002。不发明领奖写号。不发 12021、12022。61001 周末礼包另只读接在其后，勿合并。不发 61002。62001 神迹遗物另帧，勿合并。63001 英雄殿堂另帧，勿合并。不做 20011。不是启动链 12010。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 26002 分开发，勿合并。本刀不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。纯读。轻副作用可接受。无扣费，无领奖写。只读展示。挂在 26002 之后。不回落 Mock。
 * 空的 c2s 61001 拉周末礼包。无 page。整帧 0400000049ee0000。s2c 61001 由 WireSession 按 GResWeekendGiftData 读 start_time、end_time、reward_status（字段 1–3，reward_status 内层 idx、status），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 26001。不发 61002。62001 神迹遗物另只读接在其后，勿合并。63001 英雄殿堂另只读接在 62001 之后，勿合并。不发明领奖写号。不发 12021、12022。不做 20011。不是启动链 12010。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 26001 分开发，勿合并。本刀不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建、轻日刷可接受。无扣费，无领奖写。只读展示。挂在 26001 之后。不回落 Mock。
 * 空的 c2s 62001 拉神迹遗物。无 page。整帧 0400000031f20000。s2c 62001 由 WireSession 按 GResGodRelicData 读 buyCount、canChallengeCount、starMap、starRewardRecord（字段 1–4，starMap 内层 key、value，starRewardRecord 按出现的数或内层字段号写），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 61001。不发 62002 挑战。不发 62003 买次数。不发 62004 领星级奖。不发 62005 扫荡。63001 英雄殿堂另只读接在其后，勿合并。不发 63002。不发 63003。69001 积天豪礼2另帧，勿合并。不做 20011。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 61001 分开发，勿合并。本刀不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。只读展示。挂在 61001 之后。不回落 Mock。
 * 空的 c2s 63001 拉英雄殿堂。无 page。整帧 0400000019f60000。s2c 63001 由 WireSession 按 GResHeroPalaceData 读 PSHeroPalace 的 type、rankRole、isReward、isWorship、serverRankRole（字段 1–5），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 62001。不发 63002 膜拜。不发 63003 领排名奖。69001 积天豪礼2另帧，勿合并。不做 20011。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 62001 分开发，勿合并。本刀不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建、轻日刷可接受。跨日会清 worshipType。无扣费，无领奖写，无成长写。只读展示。挂在 62001 之后。不回落 Mock。
 * 空的 c2s 69001 拉积天豪礼2。无 page。整帧 04000000890d0100。s2c 69001 由 WireSession 按 GResRechargeDaysBList 读 list（repeated PSRechargeDaysInfo 的 day、money、hasReward，字段 1–3），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 63001。不发 69002 领取积天豪礼2奖励。不做 71001。不做 20011。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 63001 分开发，勿合并。本刀不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。只读展示。挂在 63001 之后。74001 时空魔塔另帧，挂在本帧之后，勿合并。不回落 Mock。
 * 空的 c2s 74001 拉时空魔塔个人信息。无 page。整帧 0400000011210100。s2c 74001 由 WireSession 按 GResTimeTowerInfo 读 mission_id、accumulate_pass、max_pass、heart、mission_mark、starttime、endtime（字段 1–7），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 69001。不发 74002 挑战。不发 74003 排行。不做 73002。不做 71001。不做 20011。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 69001 分开发，勿合并。本刀不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建（getTower 可能 add）可接受。轻日刷（跨日清 failNum）可接受。跨服回包轮次变化可能清 weekPass。无扣费，无领奖，无挑战写。只读展示。挂在 69001 之后。74120 时空冒险另帧，挂在本帧之后，勿合并。不回落 Mock。
 * 空的 c2s 74120 拉时空冒险信息。无 page。整帧 0400000088210100。s2c 74120 由 WireSession 按 GResSpaceTimeAdventureInfo 读 unlock_route、not_route、energy、not_progress、end_time、shop_end_time、shop_list、status、product_end_time、product_id、product_buy、speed_buff（字段 1–12），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。shop_list 按内层字段号写，不发明商店行名字。不重复拉 74001。不发 74123 选择航线。不发 74124 舰队技能加点。不发 74125 舰队修理。不发 74126 商店购买。不发 74127 改航队名。不发 74128 航队探索。不发 74129 放弃事件。不发 74131 执行事件。不发 74142 航行结算。不发 74147、74149 超值礼包。不发 74148 疾风之力。不夹发 74121、74122。不做 76501。不做 73002。不做 71001。不做 20011。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 74001 分开发，勿合并。本刀不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。轻懒建（首次 spaceTimeInfoDao.add）可接受。体力 regainEnergy 写回可接受。商店过期清空 shopItems 可接受。无扣费，无领奖，无探索写，无购买写。只读展示。挂在 74001 之后。76542 斩魔之路另帧，挂在本帧之后，勿合并。不回落 Mock。
 * 空的 c2s 76542 拉斩魔之路信息。无 page。整帧 04000000fe2a0100。s2c 76542 由 WireSession 按 GResMagicTowerRoadInfo 读 normal_list、king_list、state（字段 1–3），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。normal_list、king_list 按内层字段号写，不发明行名字。不重复拉 74120。不发 76543 斩魔之路领奖。不发 76544 斩魔王者购买。不发 76502、76503、76504、76505、76506、76541。不发 76501。不夹发 74121、74122。不做 75001。不做 73002。不做 71001。不做 20011。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 74120 分开发，勿合并。轻懒建（magicTowerRoadDao.add if missing）可接受。无每次更新。无扣费，无领奖，无挑战写。只读展示。挂在 74120 之后。不回落 Mock。75101 七神器另帧，挂在其后，勿合并。不并入本帧。
 * 空的 c2s 75101 拉七神器。无 page。整帧 040000005d250100。s2c 75101 由 WireSession 按 GResQiShenQiInfo 读 buy（字段 1，repeated PSMapData，key=配置 idx，value=已购次数），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 76542。不发 75102。75102 是购买推送 s2c，勿当 c2s。本模块无独立购写号。75121 诸神祭坛另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121、74122。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76542 分开发，勿合并。不并入 76542。轻懒建（getPromotionInfo）可接受。轻轮次重置（轮次变则 buyList.clear + update）可接受。无扣费，无购买写。只读展示。挂在 76542 之后。不回落 Mock。
 * 空的 c2s 75121 拉诸神祭坛。无 page。整帧 0400000071250100。s2c 75121 由 WireSession 按 GResZSJTInfo 读 info.floor（info 是字段 1，floor 是内层字段 1）与 moneyDrawNum（外层字段 2），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 75101。不发 75122。75122 是抽奖 GReqZSJTLuckDraw.type，不编码、不发送。75131 赏月佳肴另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121、74122。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75101 分开发，勿合并。不并入 75101。轻懒建（getPromotionInfo）可接受。轮次重置可接受。轻日刷（getMoneyDrawNum 隔日清零钻石抽次数并 update）可接受。无扣费，无领奖，无养成写。只读展示。挂在 75101 之后。不回落 Mock。
 * 空的 c2s 75131 拉赏月佳肴。无 page，无 FIELD。整帧 040000007b250100。s2c 75131 由 WireSession 按 GResMidFoodInfo 读 buy（字段 1，repeated PSMapData，key=配置 idx，value=已购次数），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 75121。不发 75132。75132 是购买推送 s2c，勿当 c2s。不夹 75122。不夹 75102。75801 秋赏明月另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121、74122。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。不是时空冒险 74120。不是时空魔塔 74001。5001、51001、68001、70001 已有，勿重复。75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75121 分开发，勿合并。不并入 75121。轻懒建（getPromotionInfo）可接受。轻轮次重置（轮次变则 buyList.clear + update）可接受。购买走充值回调并推 75132，本帧不触发。无扣费，无领奖，无养成写。只读展示。挂在 75121 之后。不回落 Mock。
 * 空的 c2s 75801 拉秋赏明月。活动 QIU_SHANG_MING_YUE / promo074。无 page，无 FIELD。整帧 0400000019280100。s2c 75801 由 WireSession 按 GResMidLotteryGetDataInfo 读 select_info、lottery_reward、lottery_count、lottery_best_remaining_count（字段 1–4），不写顶栏。select_info、lottery_reward 按内层字段号写，不发明行名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 75131。不发 75802 选档。不发 75803 抽奖。不发 75804 领次数奖。75901 万圣抽奖另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121、74122。不是赏月佳肴 75131。不是诸神祭坛 75121。不是七神器 75101。不是斩魔之路 76542。5001、51001、68001、70001 已有，勿重复。75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75131 分开发，勿合并。不并入 75131。轻懒建（getPromotionInfo）可接受。轮次清 select/次数/记录可接受。非开启写空默认可接受。无扣费，无领奖，无抽奖。只读展示。挂在 75131 之后。不回落 Mock。
 * 空的 c2s 75901 拉万圣抽奖。活动 WAN_SHENG_LOTTERY / promo078。无 page，无 FIELD。整帧 040000007d280100。s2c 75901 由 WireSession 按 GResHalloweenLotteryGetDataInfo 读 select_info、lottery_reward、lottery_count、lottery_best_remaining_count、last_lottery_id（字段 1–5），不写顶栏。select_info、lottery_reward 按内层字段号写，不发明行名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 75801。不发 75902 选档。不发 75903 抽奖。不发 75904 领次数奖。不夹发 75931、75932 万圣礼包。不夹发 75941–75944 万圣任务。76001 黑五活动另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121、74122。不是秋赏明月 75801。不是赏月佳肴 75131。5001、51001、68001、70001 已有，勿重复。75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75801 分开发，勿合并。不并入 75801。轻懒建（getPromotionInfo）可接受。轮次清 select/次数/记录可接受。非开启回默认可接受。无扣费，无领奖，无抽奖。只读展示。挂在 75801 之后。不回落 Mock。
 * 空的 c2s 76001 拉黑五活动。活动 HEI_WU_MISSION / promo081。无 page，无 FIELD。整帧 04000000e1280100。s2c 76001 由 WireSession 按 GResBlackFiveMissionGetDataInfo 读 mission、mission_box_reward_record、mission_reward_count、buy（字段 1–4），不写顶栏。mission、mission_box_reward_record、buy 按内层字段号写，不发明行名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 75901。不发 76002 领任务奖。不发 76003 进度推。不发 76004 领任务箱。不发 76005 购礼包推。不夹发 76021、76022。76101 约惠圣诞另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121、74122。不是万圣抽奖 75901。不是秋赏明月 75801。5001、51001、68001、70001 已有，勿重复。75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 75901 分开发，勿合并。不并入 75901。轻懒建可接受。轮次清 mission/box/buy/count 可接受。非开启回默认可接受。无扣费，无领奖，无养成写。只读展示。挂在 75901 之后。不回落 Mock。
 * 空的 c2s 76101 拉约惠圣诞礼包。活动 CHRISTMAS_GIFT / promo086。无 page，无 FIELD。整帧 0400000045290100。s2c 76101 由 WireSession 按 GResChristmasGiftInfo 读 buy（字段 1，repeated PSMapData，key=礼包 idx，value=已购次数），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 76001。不发 76102 礼包购买推送。旁支勿夹 76082–76084、76121–76122、76141–76143、76161–76163。76301 出游寻春另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121、74122。不是黑五活动 76001。不是万圣抽奖 75901。5001、51001、68001、70001 已有，勿重复。76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76001 分开发，勿合并。不并入 76001。轻懒建可接受。轮次清 buyList 可接受。购买走充值回调推 76102，本帧不触发。无扣费，无领奖，无养成写。只读展示。挂在 76001 之后。不回落 Mock。
 * 空的 c2s 76301 拉出游寻春。活动 CHU_YOU_XUN_CHUN / promo096。无 page，无 FIELD。整帧 040000000d2a0100。s2c 76301 由 WireSession 按 GResSpringOutingMissionGetDataInfo 读 mission、mission_box_reward_record、open_day（字段 1–3），不写顶栏。mission、mission_box_reward_record 按内层字段号写，不发明行名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 76101。不发 76302 领任务奖。不发 76303 更新任务进度推送。不发 76304 领宝箱/皮肤数量奖。勿夹 76305–76308。76081 圣诞连线另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121、74122。不是约惠圣诞 76101。不是黑五活动 76001。5001、51001、68001、70001 已有，勿重复。76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76101 分开发，勿合并。不并入 76101。轻懒建可接受。轻日刷可接受。跨日清 mission/box 可接受。未开活动回默认空包可接受。无扣费，无领奖。只读展示。挂在 76101 之后。不回落 Mock。
 * 空的 c2s 76081 拉圣诞连线。活动 CHRISTMAS_MISSION / promo085。无 page，无 FIELD。整帧 0400000031290100。s2c 76081 由 WireSession 按 GResChristmasMissionGetDataInfo 读 mission、mission_box_reward_record、open_day（字段 1–3），不写顶栏。mission、mission_box_reward_record 按内层字段号写，不发明行名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 76301。不发 76082 领任务奖。不发 76083 进度推送。不发 76084 领任务箱。旁支勿夹 76121、76122、76141、76143、76161、76163。76520 关卡榜另帧，挂在其后，勿合并。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121、74122。不是出游寻春 76301。不是约惠圣诞 76101。5001、51001、68001、70001 已有，勿重复。76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76301 分开发，勿合并。不并入 76301。轻懒建可接受。轻日刷可接受。跨日清 mission/box 可接受。未开活动回默认空包可接受。无扣费，无领奖，无养成写。只读展示。挂在 76301 之后。不回落 Mock。
 * 空的 c2s 76520 拉关卡榜。GReqMagicTowerLevelRank / GResMagicTowerLevelRank。无 page，无 FIELD。整帧 04000000e82a0100。s2c 76520 由 WireSession 按 self、list（字段 1、2）读行内 rid、server_id、name、border_id、head_id、pass_level、pass_time、rank（字段 1–8），不写顶栏。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 76081。不发 76501–76506。不发 76543、76544。76251 春日踏青另帧，挂在其后，勿合并。不重复拉 76542。不做 75001。不做 73002。不做 71001。不做 20011。不夹发 74121、74122。不是圣诞连线 76081。不是出游寻春 76301。5001、51001、68001、70001 已有，勿重复。76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76081 分开发，勿合并。不并入 76081。纯读可接受。无扣费，无领奖，无养成写。只读展示。挂在 76081 之后。不回落 Mock。
 * 空的 c2s 76251 拉春日踏青。活动 CHUN_RI_TA_QING / promo093。无 page，无 FIELD。整帧 04000000db290100。s2c 76251 由 WireSession 按 GResSpringOutingGrid 读 curr_idx、scenic_record、scenic_count（字段 1–3），不写顶栏。scenic_record 按内层字段号写，不发明行名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示，出现的 0 仍写 0，出现的 -1 仍写 -1。不重复拉 76520。不发 76252 掷骰扣费+发奖。不发 76253 景点成就领奖。备选 76271 本轮不做。不做 75001。不做 76501。不做 73002。不做 71001。不做 20011。不夹发 74121、74122。不是关卡榜 76520。不是圣诞连线 76081。不是出游寻春 76301。5001、51001、68001、70001 已有，勿重复。76520、76081、76301、76101、76001、75901、75801、75131、75121、75101、76542、74120、74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 76520 分开发，勿合并。不并入 76520。轻懒建可接受。轮次重置清 currIdx/dice/scenic 可接受。无扣费，无领奖，无养成写。只读展示。挂在 76520 之后。不回落 Mock。
 * 单条处理失败也不丢掉后面的帧。
 */

export interface WsSocketLike {
  binaryType: string;
  send(data: string | ArrayBuffer): void;
  close(): void;
  addEventListener(type: string, listener: (ev: WsSocketEvent) => void): void;
  removeEventListener(type: string, listener: (ev: WsSocketEvent) => void): void;
}

export interface WsSocketEvent {
  code?: number;
  reason?: string;
  data?: unknown;
}

export type WsSocketFactory = (url: string) => WsSocketLike;

export interface WsTransportOptions {
  connectTimeoutMs?: number;
  /** 单测注入。预览里不传，用浏览器 WebSocket。 */
  factory?: WsSocketFactory;
}

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * 第一帧的 cmdId。半帧、坏长度返回 null。
 * 保留这个名字，是为了自检还能点到「第 5–8 字节」。
 */
export function readObservedCmdId(data: ArrayBuffer): number | null {
  if (!data || data.byteLength < 8) return null;
  const decoded = decodeFrames(new Uint8Array(data));
  if (decoded.fatal || decoded.frames.length === 0) return null;
  return decoded.frames[0].cmdId;
}

export class WsTransport implements ITransport {
  private factory: WsSocketFactory;
  private connectTimeoutMs: number;
  private socket: WsSocketLike | null = null;
  private url = "";
  private opened = false;
  private messageHandler: NetHandler | null = null;
  private closeHandler: (() => void) | null = null;
  private pendingReject: ((err: Error) => void) | null = null;
  private pendingBytes: Uint8Array = new Uint8Array(0);
  private openListener: ((ev: WsSocketEvent) => void) | null = null;
  private errorListener: ((ev: WsSocketEvent) => void) | null = null;
  private closeListener: ((ev: WsSocketEvent) => void) | null = null;
  private messageListener: ((ev: WsSocketEvent) => void) | null = null;

  constructor(options?: WsTransportOptions) {
    this.factory = options?.factory ?? defaultFactory;
    const timeout = options?.connectTimeoutMs;
    this.connectTimeoutMs = typeof timeout === "number" && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS;
  }

  connect(url: string): Promise<void> {
    if (this.opened && this.socket && this.url === url) return Promise.resolve();
    this.cancelPending();
    this.url = url;
    GameLog.shared.info("Ws", "正在连接 " + url);
    return new Promise((resolve, reject) => {
      let socket: WsSocketLike;
      try {
        socket = this.factory(url);
      } catch (err) {
        const text = errText(err);
        GameLog.shared.error("Ws", "出错 " + text);
        reject(err instanceof Error ? err : new Error(text));
        return;
      }
      this.socket = socket;
      try {
        socket.binaryType = "arraybuffer";
      } catch (_err) {
        // 个别桩没有 binaryType。浏览器实现里有。
      }

      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        GameLog.shared.error("Ws", "出错 连接超时");
        GameLog.shared.warn("Ws", "已关闭");
        fail(new Error("连接超时"));
      }, this.connectTimeoutMs);

      const fail = (err: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (this.pendingReject === fail) this.pendingReject = null;
        this.opened = false;
        this.pendingBytes = new Uint8Array(0);
        if (this.socket === socket) this.socket = null;
        this.detach(socket);
        try {
          socket.close();
        } catch (_err) {
          // 还没打开就失败时，关掉半连接。
        }
        reject(err);
      };
      this.pendingReject = fail;

      const onOpen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (this.pendingReject === fail) this.pendingReject = null;
        this.opened = true;
        GameLog.shared.info("Ws", "已打开 " + url);
        resolve();
      };
      const onError = () => {
        if (settled) return;
        GameLog.shared.error("Ws", "出错");
        GameLog.shared.warn("Ws", "已关闭");
        fail(new Error("服未启动"));
      };
      const onClose = (ev: WsSocketEvent) => {
        if (settled && !this.opened) return;
        if (!settled) GameLog.shared.error("Ws", "出错");
        GameLog.shared.warn("Ws", "已关闭" + formatClose(ev));
        if (!settled) {
          fail(new Error("服未启动"));
          return;
        }
        this.opened = false;
        this.pendingBytes = new Uint8Array(0);
        if (this.socket === socket) this.socket = null;
        this.detach(socket);
        const handler = this.closeHandler;
        if (handler) handler();
      };
      const onMessage = (ev: WsSocketEvent) => {
        this.noteIncoming(ev ? ev.data : undefined);
      };
      this.openListener = onOpen;
      this.errorListener = onError;
      this.closeListener = onClose;
      this.messageListener = onMessage;
      socket.addEventListener("open", onOpen);
      socket.addEventListener("error", onError);
      socket.addEventListener("close", onClose);
      socket.addEventListener("message", onMessage);
    });
  }

  /**
   * 编成日志里的帧再写。heartbeat 是 1004 空体，不是占位号 1002。
   * 没有证明过的 cmd 只记日志，不写字节。
   */
  send(msg: NetMessage): void {
    const cmd = msg && msg.cmd ? msg.cmd : "(empty)";
    if (!this.opened || !this.socket) {
      logErrorCode("Ws", ErrorCode.NET_CLOSED, "drop " + cmd);
      return;
    }
    const packet = encodeWireMessage(msg);
    if (!packet) {
      const why = cmd === Cmd.roleCreate ? "创角名字是空的或日志里没有这条帧" : "日志里没有这条 c2s 帧";
      GameLog.shared.info("Ws", "未发送 " + cmd + "：" + why);
      return;
    }
    GameLog.shared.info(
      "Ws",
      "发送 c2s " + packet.cmdId + " 帧长 " + packet.bytes.length + " " + bytesToHex(packet.bytes) + " " + packet.note
    );
    try {
      this.socket.send(exactBuffer(packet.bytes));
    } catch (err) {
      GameLog.shared.error("Ws", "发送失败 " + errText(err));
    }
  }

  close(): void {
    if (this.pendingReject) {
      const rejectPending = this.pendingReject;
      this.pendingReject = null;
      GameLog.shared.warn("Ws", "已关闭");
      rejectPending(new Error("连接已取消"));
      return;
    }
    if (!this.socket && !this.opened) return;
    const wasOpen = this.opened;
    const socket = this.socket;
    this.opened = false;
    this.pendingBytes = new Uint8Array(0);
    this.socket = null;
    if (socket) {
      this.detach(socket);
      GameLog.shared.warn("Ws", "已关闭");
      try {
        socket.close();
      } catch (_err) {
        // 重复关闭忽略。
      }
    }
    if (wasOpen) {
      const handler = this.closeHandler;
      if (handler) handler();
    }
  }

  onMessage(handler: NetHandler): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  private cancelPending(): void {
    if (!this.pendingReject) {
      this.dropOpenSocket();
      return;
    }
    const rejectPending = this.pendingReject;
    this.pendingReject = null;
    rejectPending(new Error("连接已取消"));
  }

  private dropOpenSocket(): void {
    const socket = this.socket;
    this.opened = false;
    this.pendingBytes = new Uint8Array(0);
    this.socket = null;
    if (!socket) return;
    this.detach(socket);
    try {
      socket.close();
    } catch (_err) {
      // 换地址重连时关掉旧套接字。
    }
  }

  private detach(socket: WsSocketLike): void {
    if (this.openListener) socket.removeEventListener("open", this.openListener);
    if (this.errorListener) socket.removeEventListener("error", this.errorListener);
    if (this.closeListener) socket.removeEventListener("close", this.closeListener);
    if (this.messageListener) socket.removeEventListener("message", this.messageListener);
    this.openListener = null;
    this.errorListener = null;
    this.closeListener = null;
    this.messageListener = null;
  }

  /** 文本只记日志。二进制按长度前缀拆帧，半帧留在 pendingBytes。 */
  private noteIncoming(data: unknown): void {
    if (typeof data === "string") {
      const preview = data.length > 60 ? data.slice(0, 60) : data;
      GameLog.shared.info("Ws", "收到文本 " + data.length + " " + preview);
      return;
    }
    const bytes = toArrayBuffer(data);
    if (!bytes) {
      GameLog.shared.info("Ws", "收到无法读取的帧");
      return;
    }
    this.pendingBytes = concatBytes(this.pendingBytes, new Uint8Array(bytes));
    const decoded = decodeFrames(this.pendingBytes);
    for (let i = 0; i < decoded.frames.length; i++) {
      const frame = decoded.frames[i];
      this.emitFrame(frame.cmdId, frame.body);
    }
    if (decoded.fatal) {
      GameLog.shared.error("Ws", "帧长度异常，丢掉剩余 " + this.pendingBytes.length + " 字节");
      this.pendingBytes = new Uint8Array(0);
      return;
    }
    this.pendingBytes = decoded.rest;
  }

  private emitFrame(cmdId: number, body: Uint8Array): void {
    const frameLength = 4 + 4 + body.length;
    const hex = body.length === 0 ? "" : bytesToHex(body);
    const fields = body.length > 0 && body.length <= 64 ? decodeProtoFields(body) : null;
    const fieldText = fields && fields.length > 0 ? " " + formatProtoFields(fields) : "";
    const empty = body.length === 0 ? " 空体" : "";
    GameLog.shared.info(
      "Ws",
      "收到 s2c " + cmdId + " 帧长 " + frameLength + " 体长 " + body.length + (hex ? " " + hex : "") + empty + fieldText
    );
    const inbound: WireInbound = { cmdId, frameLength, body, hex };
    const handler = this.messageHandler;
    if (!handler) return;
    try {
      handler({ cmd: inboundCmd(cmdId), data: inbound });
    } catch (err) {
      GameLog.shared.error("Ws", "分发 s2c " + cmdId + " 失败 " + errText(err));
    }
  }
}

function inboundCmd(cmdId: number): string {
  if (cmdId === 1001) return Cmd.login;
  if (cmdId === 1002) return Cmd.roleCreate;
  if (cmdId === 1004) return Cmd.heartbeat;
  return "wire." + cmdId;
}

function defaultFactory(url: string): WsSocketLike {
  const host = globalThis as { WebSocket?: new (target: string) => WsSocketLike };
  const Ctor = host.WebSocket;
  if (typeof Ctor !== "function") throw new Error("当前环境没有 WebSocket");
  return new Ctor(url);
}

function formatClose(ev: WsSocketEvent | undefined): string {
  if (!ev || typeof ev.code !== "number") return "";
  const reason = typeof ev.reason === "string" && ev.reason ? " " + ev.reason : "";
  return " code=" + ev.code + reason;
}

function toArrayBuffer(data: unknown): ArrayBuffer | null {
  if (data instanceof ArrayBuffer) return data;
  if (ArrayBuffer.isView(data)) {
    const view = data as ArrayBufferView;
    const slice = view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    return slice as ArrayBuffer;
  }
  return null;
}

function errText(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "未知错误";
}
