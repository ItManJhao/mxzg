/**
 * 只编码 net-20261020.jsonl 里能对上的 c2s 1001 / 1002。
 * 字段号是从包体反解出来的，不是 .proto 里的名字。两例登录都出现的常量照写，不猜平台 OAuth。
 * 字节顺序跟日志第二例（uid 960011）对齐。第一例 uid 111 字段号和值相同，顺序不同；两例都拿到了 s2c 1001。
 *
 * c2s 1001（两例，uid 和字段5不同）：
 *   字段1 varint = 7
 *   字段2 varint = 平台 uid。纯数字账号原样（111 与 960011）。其它非空账号写成稳定正整数，不再省掉字段2。
 *   字段3 varint = 2
 *   字段5 string = 十进制 unix 秒（1792464901 与 1792466798）
 *   字段6 string = localdev
 *   字段7 string = mxzg-web-1001
 * 空的 s2c 1001 之后客户端才发 1002。成功的 s2c 1001：字段1 角色 id，字段2 毫秒时间，字段4 = 28800。
 *
 * c2s 1002：
 *   字段1 string = 角色名（日志里是「见习冒险家」）
 *   字段2 varint = 0
 *   字段3 varint = 2
 *   字段4 string = local
 *   字段5 string = mxzg-web-1001
 * s2c 1002 字段1 = 新角色 id。
 *
 * 进主城后另外几帧也在这里编：空的 c2s 2001（wire.2001）、空的 c2s 5001（wire.5001）、
 * 空的 c2s 3007（wire.3007，GReqChapterData 无字段，整帧 04000000bf0b0000）。登录链发一次。主线页「关卡数据」再发同一空帧，不进 pullIdle。空的 c2s 3004（wire.3004，GReqChapterItemList 无字段，整帧 04000000bc0b0000）。登录链发一次。主线页「挂机奖励」再发同一空帧，挂在已合 3006 之后，不进 pullIdle，不从 3006 自动接。空的 c2s 3099（wire.3099，GReqQueryFormation 无字段，整帧 040000001b0c0000，小端 1b 0c 00 00）。登录链在 28107 之后发一次。主线页「查询阵法」再发同一空帧，挂在已合 3101 旁边、已合 3007 之后、进战之前，不进 pullIdle，不从 3001、3101、3102、3103、3030 自动接，不发 3098，不发 3100，不接 3020。空的 c2s 3101（wire.3101，GReqLineUp 无字段，整帧 040000001d0c0000，小端 1d 0c 00 00）。登录链在 3099 之后发一次。主线页「获取阵容」再发同一空帧，挂在已合 3007 之后、进战之前，不进 pullIdle，不从 3001、3102、3103、3030 自动接，不发 3100，不接 3020。空的 c2s 15000（wire.15000）、
 * 空的 c2s 3001（wire.3001，GReqBattleMatch）只在主线页点挑战时编，不进 pullIdle，不接在活动链末。
 * c2s 3006（wire.3006，GReqChapterReport）只在主线页点挂机战报时编，包体是 chapterIdx 和 firstPos，不是空帧。不进 pullIdle。
 * c2s 3102（wire.3102，GReqBattleReport）只在主线页点请求战报时编，包体是 battle_id 和 type 两个 string，不是空壳 040000001e0c0000。不进 pullIdle。不从 3001 或 3006 自动接。
 * c2s 3103（wire.3103，GReqPreComputeStrength）只在主线页点空壳探针或预计算时编。空壳整帧 040000001f0c0000。可带 hero_ids、type、line_up_type。不进 pullIdle。不从 3102 自动接。不播 spine。
 * c2s 3030（wire.3030，GReqStudy）只在主线页点切磋且带上 opponent_id 时编。字段 1 type、字段 2 opponent_id、字段 3 server_id。不是空壳 04000000d60b0000。缺 opponent_id 不编码。不进 pullIdle。不从 3102 自动接，成功后也不自动发 3102。
 * c2s 2015（wire.2015，GReqGMCommandNew）在主线页点「GM 加英雄」，或空名册点「挑战」的过渡补英雄时编。command=ADD_HERO、类型号是正整数。字段 1 command，字段 2 param。缺这些不编码。不进 pullIdle。成功没有 2015 回包，实例在 s2c 4030。
 * c2s 3100（wire.3100，GReqLineUpSave）在主线页点「GM 上 MAIN」，或「挑战」发现 MAIN 没有英雄时编。hero_id 用 4030 或 4001 的实例，站位在 2/3/5/6/7/8/9。字段 1 lineData：1 type、3 goddess_type、4 hero_list（1 hero_id、3 position）、5 formation_id。字段 2 time 和英雄字段 2 hp 不写。空 cmd 不编。不进 pullIdle。不是 3101。成功是空的 s2c 3100。
 * c2s 4001 page=1（wire.4001，包体 `08 01`）、空的 c2s 17000（wire.17000）、空的 c2s 12010（wire.12010）、
 * 空的 c2s 18001（wire.18001，GReqPvpData）、空的 c2s 22000（wire.22000，GReqSevenDayLoginData）、
 * 空的 c2s 21010（wire.21010，GReqSevenDayTargetList）、
 * 空的 c2s 27001（wire.27001，许愿池 GResBlessingPoolList）、
 * 空的 c2s 4004（wire.4004，召唤次数 GResHeroSummonCount。不是英雄列表 4001）、
 * 空的 c2s 13044（wire.13044，先知召唤 GReqProphetSummonInfo / GResProphetSummonInfo。不是 4004）、
 * 空的 c2s 4101（wire.4101，英雄宝石 GReqHeroJewel / GResHeroJewel。不是 4001，也不是 13044）、
 * 空的 c2s 4013（wire.4013，英雄图鉴 GReqIllustratReward / GResIllustratReward。名字像领奖，实为查看。不是 4001，也不是 4101。不编 4014）。
 * 空的 c2s 74100（wire.74100，宠物信息 GReqPetInfoList / GResPetInfoList。不是 4001，也不是 4013。不编 74101、74102、74103、74105、74106）。
 * 空的 c2s 51001（wire.51001，世界等级 GReqWorldLevel / GResWorldLevel。level 是字段 1。20101 另帧，不并进本帧。不夹在 2001 和 3007 中间）。
 * 空的 c2s 20001（wire.20001，基金列表 GReqPromotionList / GResPromotionList。is_buy_foundation 是字段 1，foundation_reward_record 是字段 2。不编 20018。不编 20004、20010。不做 3007。挂在 51001 之后）。
 * 空的 c2s 20012（wire.20012，超值首充 GReqFirstRecharge / GResFirstRecharge。recharge 是字段 1，list 是字段 2 已领 idx，can_reward 是字段 3。不编 20013。不做 13260。挂在 20001 之后）。
 * 空的 c2s 70001（wire.70001，灵器数据 GReqReikiEquipData / GResReikiEquipData。list 是字段 1，PSReikiEquipData 的 hero_id、sys_id、reiki_equip_id。不编 70002、70003、70004、70005、70006。不编 70007、70008。不做 20011。挂在 20012 之后）。
 * 空的 c2s 73001（wire.73001，浮空岛时间 GReqFloatingIslandsTime / GResFloatingIslandsTime。next_time 是字段 2，stage 是字段 3。不编 73002、73003、73004。73002 有懒建和日刷写库。本号无写库。不做 20011。挂在 70001 之后）。
 * 空的 c2s 74300（wire.74300，图腾信息 GReqTotemsInfoList / GResTotemsInfoList。list 是字段 1，PSTotemsInfo 的 t_id、sys_id、hero_id、level、quality。不编 74301、74302、74303。不编 74304。74304 是推送，勿当拉包。本号无写库。不做 20011。挂在 73001 之后。与 74100 同城养成段）。
 * 空的 c2s 68001（wire.68001，星盘数据 GReqAstrolabeData / GResAstrolabeData。无 page。maxStar 是字段 1，active 是字段 2 的 PSMapData key、value，activeElem 是字段 3 的 int 列表，activeAstrolabe 是字段 4。不编 68002、68003、68004、68006。不编 68005。68005 是更新星数常量，勿当拉包。轻懒建，首次 load 可能 astrolabeDao.add 空行。无扣费，无领奖，无日刷写库。管理员认定可接受。不做 20011。挂在 74300 之后）。
 * 空的 c2s 75501（wire.75501，魔方数据 GReqTweakCube / GResTweakCube。无 page。handler getData 不读 req。rank_hero 是字段 1 的 int64 列表，open_count 是字段 2，trench 是字段 3 的 PSTrench index、hero_id、last_change_time。不编 75502、75503、75504、75505。不编 75506。75506 是等级推送，勿当拉包。轻懒建，首次 get 可能 doCreate + tweakCubeDao.add，建免费槽并按战力塞供奉。无扣费，无领奖。管理员认定可接受，同星盘。不做 34001。不做 20011。挂在 68001 之后）。
 * 空的 c2s 59001（wire.59001，圣龙数据 GReqDragonScanInfo / GResDragonScanInfo。无 page。handler scanDragonInfo 不读 msg。identify_level 是字段 1，attr_level 是字段 2，identities 是字段 3 的 type、start_time、level、speed_add，slots 是字段 4 的 id、sys_id，privilege_end_time 是字段 5。不编 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。不编 59010。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。轻懒建，首次 dragonDao.add。无扣费，无领奖。不做 34001。不做 20011。挂在 75501 之后）。
 * 空的 c2s 59010（wire.59010，圣物图鉴 GReqDragonCollection / GResDragonCollection。无 page。handler 不读 msg。sys_id 是字段 1，repeated int32，图鉴 manuals。不编 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。轻懒建，与 59001 同 getDragon / dragonDao.add。无扣费，无领奖。不做 34001。不做 20011。挂在 59001 之后）。
 * 空的 c2s 55001（wire.55001，称号列表 GReqScanTitleList / GResScanTitleList。无 page。titles 是字段 1，repeated PSTitle 的 idx、end_time。end_time：-1 永久，0 未激活，时间戳为到期。Title.proto 仅 55001 读写对，同模块无写号。轻懒建，TitleService.getTitle → dao.add。无扣费，无领奖，无日刷。34001 另只读接在其后。不做 20011。挂在 59010 之后）。
 * 空的 c2s 34001（wire.34001，头像列表 GReqHeadPortraitList / GResHeadPortraitList。无 page。idx_list 是字段 1，repeated int32，已解锁头像 id。不编 34002。不编 34003。34003 是解锁推送，勿当拉包。32001 另只读接在其后。不做 20011。轻懒建，RoleHeadPortraitService.select 无记录则 dao.add 默认解锁头。无扣费，无领奖，不改当前头像。挂在 55001 之后）。
 * 空的 c2s 32001（wire.32001，头像框数据 GReqBorderData / GResBorderData。无 page。units 是字段 1，repeated PSBorderUnit 的 id、active_state。不编 32002。不编 32003。32003 是服侧推送，当前框过期时服侧可能写 role.borderId 回落并另推，勿当拉包。4402 另只读接在其后。不做 20011。29001 有 page，硬禁。轻懒建免费框可接受。挂在 34001 之后）。
 * 空的 c2s 4402（wire.4402，激活皮肤列表 GReqHeroFashionList / GResHeroFashionList。无 page。list 是字段 1，repeated PSFashionData 的 hero_type、fashion_id、level、status、end_time。status：0 永久，1 限时。不编 4403。不编 4404。不编 4405。不编 4406。4406 无实现，勿发。4401 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。过期限时皮剔除，并可能把英雄 fashionId 置 0。只读展示。无扣费，无领奖。挂在 32001 之后）。
 * 空的 c2s 4401（wire.4401，穿戴皮肤英雄列表 GReqHeroFashion / GResHeroFashion。无 page。list 是字段 1，repeated PSHeroFashion 的 hero_id、fashion_id。不编 4402。不编 4403。不编 4404。不编 4405。不编 4406。4406 无实现，勿发。与 4402 分刀，勿合并。本刀不重复拉 4402。4201 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。过期限时皮清理，并可能卸英雄 fashionId。只读展示。无扣费，无领奖，无邮件。挂在 4402 之后）。
 * 空的 c2s 4201（wire.4201，英雄祈愿数据 GReqHeroPrayerData / GResHeroPrayerData。无 page。privilege 是字段 1，end_time 是字段 2。privilege：0/1。end_time 未开为 0。不编 4202。74104 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 4401 分刀，勿合并。本刀不重复拉 4401。轻懒建 hero_prayer。特权过期清字段。只读展示。无扣费，无领奖。挂在 4401 之后）。
 * 空的 c2s 74104（wire.74104，宠物图鉴 GReqPetIllustrate / GResPetIllustrate。空体，无 page。petTypes 是字段 1，repeated int32，已解锁宠物类型。不编 74101、74102、74103。不编 74105、74106。74105、74106 是背包增减推送，勿当拉包。28100 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74100、4201 分开发，勿合并。本刀不重复拉 74100，也不重复拉 4201。轻懒建空 PetIllustrate。无扣费，无发奖。只读展示。挂在 4201 之后）。
 * 空的 c2s 28100（wire.28100，羁绊数据 GReqFetterList / GResFetterList。空体，无 page。reset_count 是字段 1。goddess 是字段 2，repeated PSFetterData 的 type、exp、level、skill_level、refine_level、uplimit_level、soul_level、wash_level。不编 28101、28102、28104、28105、28106、28108、28109。不编 28002、28003。28200 另只读接在其后，勿合并。不做 20011。4601 有 page，硬禁。29001 有 page，硬禁。与 74104、4201 分开发，勿合并。本刀不重复拉 74104，也不重复拉 4201。轻懒建（load/getFetterTask）。无扣费，无领奖。只读展示。挂在 74104 之后）。
 * 挂机页领取再编空的 c2s 3005（wire.3005）。
 * 3007 见 wireChapter.ts。3004 / 3005 见 wireIdle.ts。5001 见 wireBag.ts。15000 见 wireMail.ts。4001 见 wireHero.ts。17000 见 wireActivity.ts。12010 见 wireAchievement.ts。18001 见 wirePvp.ts。22000 见 wireSevenDay.ts。21010 见 wireGoal7.ts。27001 见 wireWish.ts。4004 见 wireSummon.ts。13044 见 wireProphet.ts。4101 见 wireJewel.ts。4013 见 wireIllustrat.ts。74100 见 wirePet.ts。51001 见 wireWorld.ts。20001 见 wirePromotion.ts。20012 见 wireFirstRecharge.ts。70001 见 wireReiki.ts。73001 见 wireFloatingIslands.ts。74300 见 wireTotems.ts。68001 见 wireAstrolabe.ts。75501 见 wireTweakCube.ts。59001 见 wireDragon.ts。59010 见 wireDragonCollection.ts。55001 见 wireTitle.ts。34001 见 wireHeadPortrait.ts。32001 见 wireBorder.ts。4402 见 wireFashion.ts。4401 见 wireWornFashion.ts。4201 见 wireHeroPrayer.ts。74104 见 wirePetIllustrate.ts。28100 见 wireFetter.ts。28200 见 wireFetterFashion.ts。75601 见 wireShenBin.ts。75606 见 wireOccupation.ts。75615 见 wireRoleShenBin.ts。28107 见 wireFetterContract.ts。3099 见 wireFormation.ts。3101 见 wireLineUp.ts。
 * 空的 12020 要编，挂在 13010 之后，勿与 13010 合并，也不是启动链 12010。不编 12021、12022。空的 26002 要编，挂在 12020 之后，勿与 12020 合并，也不是同模块 26001，也不是启动链 12010。26001 每月福利列表另只读接在其后，勿合并。不编 22001，也不编 22002。不编 21011、21012。不编 21013。旧号 21000 / 21001 不编。
 * 3002 不编。5002 只收不发。5004–5009、5010、5011–5013 不编。
 * 邮件领取、已读、删除不编。占位 mail.* 仍是 1701–1705。
 * 英雄升级不编。占位 hero.list / hero.upgrade 仍是 1401 / 1402。
 * 不编空的 4001。12020 另帧编码空体，不是启动链 12010。占位 login7.* 仍是 2201–2203，领取不编。成就不领奖。
 * 空的 18001 要编。不编 18002、18003、18005、18007、18008。
 * 空的 22000 要编。22002 只收，不当成 c2s。
 * 空的 21010 要编。21013 只收，不当成 c2s。不编 21011、21012。
 * 空的 27001 要编。不编 27002、27003、27004。许愿不发 4201。4201 是英雄祈愿另帧。
 * 空的 4004 要编。不编 4002、4005。不编 58001、58007。英雄列表仍是 4001，不编成空体。
 * 空的 13044 要编。不编 13041、13042、13043。不编 58007。先知召唤不发 4201。4201 是英雄祈愿另帧。召唤次数仍是 4004。
 * 空的 4101 要编。不编 4102、4103、4104、4105、4106、4107。不编 9001。英雄列表仍是 4001。先知召唤仍是 13044。
 * 空的 4013 要编。不编 4014。4014 是 s2c 推送。不把 4013 当领奖再发写号。英雄列表仍是 4001。英雄宝石仍是 4101。
 * 空的 74100 要编。不编 74101、74102、74103。不编 74105、74106。74105、74106 是 s2c 推送。英雄列表仍是 4001。英雄图鉴仍是 4013。74104 是宠物图鉴另帧，勿与 74100 合并。
 * 空的 51001 要编。20101 另帧，不并进本帧。本模块无写操作号。不夹在 2001 和 3007 中间。
 * 空的 20001 要编。不编 20018。不编 20004、20010。不做 3007。挂在 51001 之后。不是角色资料 2001。
 * 空的 20012 要编。不编 20013。不做 13260。挂在 20001 之后。不是基金列表 20001。
 * 空的 70001 要编。不编 70002、70003、70004、70005、70006。不编 70007、70008。70007、70008 是 s2c 推送，不当拉包请求。不做 20011。挂在 20012 之后。不是超值首充 20012。
 * 空的 73001 要编。不编 73002、73003、73004。73002 有懒建和日刷写库，不当纯只读。本号无写库。不做 20011。挂在 70001 之后。不是灵器数据 70001。
 * 空的 74300 要编。不编 74301、74302、74303。不编 74304。74304 是 s2c 推送，勿发、勿当拉包。本号无写库。不做 20011。挂在 73001 之后。与 74100 同城养成段。不是浮空岛时间 73001。不是宠物信息 74100。
 * 空的 68001 要编。无 page。不编 68002、68003、68004、68006。不编 68005。68005 是更新星数常量，勿发、勿当拉包。轻懒建可接受。不做 20011。挂在 74300 之后。不是图腾信息 74300。
 * 空的 75501 要编。无 page。不编 75502、75503、75504、75505。不编 75506。75506 是等级推送，勿发、勿当拉包。轻懒建可接受，同星盘。不做 34001。不做 20011。挂在 68001 之后。不是星盘数据 68001。
 * 空的 59001 要编。无 page。不编 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。不编 59010。59010 是另只读，单独在 59001 之后拉包，勿与 59001 合并成一个请求，勿当写号。轻懒建可接受。不做 34001。不做 20011。挂在 75501 之后。不是魔方数据 75501。
 * 空的 59010 要编。无 page。不编 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。勿与 59001 合并成一个请求。轻懒建可接受。不做 34001。不做 20011。挂在 59001 之后。不是圣龙数据 59001。
 * 空的 55001 要编。无 page。Title.proto 仅 55001 读写对，同模块无写号。轻懒建可接受。34001 另只读接在其后。不做 20011。挂在 59010 之后。不是圣物图鉴 59010。
 * 空的 34001 要编。无 page。不编 34002。不编 34003。34003 是解锁推送，勿当拉包。32001 另只读接在其后。不做 20011。轻懒建可接受。挂在 55001 之后。不是称号列表 55001。
 * 空的 32001 要编。无 page。不编 32002。不编 32003。32003 是服侧推送，勿当拉包。4402 另只读接在其后。不做 20011。29001 有 page，硬禁。轻懒建免费框可接受。挂在 34001 之后。不是头像列表 34001。
 * 空的 4402 要编。无 page。不编 4403。不编 4404。不编 4405。不编 4406。4406 无实现，勿发。4401 另只读接在其后，勿合并。不做 20011。29001 有 page，硬禁。轻懒建 HeroFashion 可接受。挂在 32001 之后。不是头像框数据 32001。
 * 空的 4401 要编。无 page。不编 4402、4403、4404、4405、4406、4601、4202、74104、29001、20011。4406 无实现，勿发。4601 有 page，硬禁。29001 有 page，硬禁。与 4402 分刀，勿合并。本刀不重复拉 4402。4201 另只读接在其后，勿合并。轻懒建 HeroFashion 可接受。挂在 4402 之后。不是激活皮肤列表 4402。
 * 空的 4201 要编。无 page。不编 4202、74104、4601、29001、20011。4202 是英雄祈愿，扣道具并发奖，勿发。74104 另只读接在其后，勿合并。4601 有 page，硬禁。29001 有 page，硬禁。与 4401 分刀，勿合并。本刀不重复拉 4401。轻懒建 hero_prayer 可接受。挂在 4401 之后。不是穿戴皮肤英雄列表 4401。
 * 空的 74104 要编。无 page。不编 74101、74102、74103、74105、74106、4601、29001、20011。74105、74106 是背包增减推送，勿当拉包。28100 另只读接在其后，勿合并。4601 有 page，硬禁。29001 有 page，硬禁。与 74100、4201 分开发，勿合并。本刀不重复拉 74100，也不重复拉 4201。轻懒建空 PetIllustrate 可接受。挂在 4201 之后。不是宠物信息 74100。不是英雄祈愿数据 4201。
 * 空的 28100 要编。无 page。不编 28101、28102、28103、28104、28105、28106、28107、28108、28109、28002、28003、4601、29001、20011。28200 另帧编码空体，勿与 28100 合并。不编 28201、28202、28203、28204、28205。75601 另帧编码空体，勿与 28200 合并。不编 75602、75603、75604、75605、75607、75608、75609、75619。75615 另帧编码空体，勿与已合帧合并。75606 另帧编码空体，勿与 75601 合并。4601 有 page，硬禁。29001 有 page，硬禁。与 74104、4201 分开发，勿合并。本刀不重复拉 74104，也不重复拉 4201。轻懒建（load/getFetterTask）可接受。挂在 74104 之后。不是宠物图鉴 74104。不是英雄祈愿数据 4201。
 * 空的 28200 要编。无 page。不编 28201、28202、28203、28204、28205、28101、28102、28103、28104、28105、28106、28107、28108、28109、28002、28003、4601、29001、20011。28203 任务列表虽只读，本刀勿夹发。75601 另帧编码空体，勿与 28200 合并。不编 75602、75603、75604、75605、75607、75608、75609、75619。75615 另帧编码空体，勿与已合帧合并。75606 另帧编码空体，勿与 75601 合并。4601 有 page，硬禁。29001 有 page，硬禁。与 28100、74104 分开发，勿合并。本刀不重复拉 28100，也不重复拉 74104。轻懒建 goddess_fashion 可接受。无扣费，无发奖，不改皮肤。挂在 28100 之后。不是羁绊数据 28100。不是激活皮肤列表 4402。
 * 空的 75601 要编。无 page。不编 75602、75603、75604、75605、75607、75608、75609、75619、4601、29001、20011。75606 另帧编码空体，勿与 75601 合并。4601 有 page，硬禁。29001 有 page，硬禁。与 28200、28100 分开发，勿合并。本刀不重复拉 28200，也不重复拉 28100。按 job 轻懒建 core（默认 coreLv=1）可接受。无合成，无装备，无核心升级，无分解。挂在 28200 之后。不是羁绊皮肤 28200。不是羁绊数据 28100。
 * 空的 75606 要编。无 page。整帧 0400000056270100。75607 同为空体 GReqGetOccupationInfo，切勿编成 75607（0400000057270100）。不编 75607、75608、75609、75602、75603、75604、75605、75619、4601、29001、20011。75608 为服推，勿当 c2s。75615 另帧编码空体，勿与 75606 合并。4601 有 page，硬禁。29001 有 page，硬禁。与 75601、28200 分开发，勿合并。本刀不重复拉 75601，也不重复拉 28200。允许 getOrCreate 轻懒建。无扣费，无领奖。挂在 75601 之后。不是神兵数据 75601。
 * 空的 75615 要编。无 page。整帧 040000005f270100。不编 75602、75603、75604、75605、75619、75607、75608、75609、4601、29001、20011。75607 同为空体，切勿编成 75607（0400000057270100）。75608 为服推，勿当 c2s。28107 另帧编码空体，勿与 75615 合并。4601 有 page，硬禁。29001 有 page，硬禁。与 75606、75601 分开发，勿合并。本刀不重复拉 75606，也不重复拉 75601。允许 getOrCreate 轻懒建（默认 knighthoodId=1）。只读拼包。无扣费，无领奖。挂在 75606 之后。不是职级信息 75606。不是神兵数据 75601。
 * 空的 28107 要编。无 page。整帧 04000000cb6d0000。不编 28101、28102、28104、28105、28106、28108、28109、28002、28003、28004、28201、28202、28203、28204、28205、3097、3098、3100、3102、3030、20011、4601、29001。3099 另帧编码空体，勿与 28107 合并。4601 有 page，硬禁。29001 有 page，硬禁。与 75615、75606 分开发，勿合并。本刀不重复拉 75615，也不重复拉 75606。轻懒建（getFetterTask）可接受。只读，无解锁、无扣费、无领奖。挂在 75615 之后。不是神兵道具 75615。不是羁绊数据 28100。
 * 空的 3099 要编。无 page。整帧 040000001b0c0000。不编 3097、3098、3100、3102、3030、20011、4601、29001。3101 副本队列另只读接在其后，勿合并。4601 有 page，硬禁。29001 有 page，硬禁。与 28107、75615 分开发，勿合并。本刀不重复拉 28107，也不重复拉 75615。getFormation 轻懒建可接受（无记录则 add；未解锁阵法 id=1 则 unlock(1)+update）。只读，无扣费、无领奖、不写养成。挂在 28107 之后。不是契约 28107。不是神兵道具 75615。
 * 空的 3101 要编。无 page。整帧 040000001d0c0000。不编 3100、3098、3097、3030、3102、3103、20011、4601、29001。3099 勿再发。不做备选 5001。4601 有 page，硬禁。29001 有 page，硬禁。与 3099 分开发，勿合并。本刀不重复拉 3099。getHeroLineUps→fillLineUp 轻修复可接受（formationId==0 则置 1 并轻修站位后 update；本路径不走 add）。只读，无扣费、无领奖、不写养成。挂在 3099 之后。20101 进行中活动另只读接在其后，勿合并。不是阵法 3099。不是契约 28107。
 * 空的 20101 要编。无 page。整帧 04000000854e0000。不编 20102、20018、20013、20004、20010、20011、4601、29001。20102 同文件非空体，勿挂。不发各活动领奖写号。51001 已有，勿重复。5001 已有，勿重复。3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3101 分开发，勿合并。本刀不重复拉 3101，也不重复拉 3099。promotionControlService.getAllWillRun() 组列表。纯读。无扣费，无领奖，不写养成。挂在 3101 之后。3203 爬塔首通已领另只读接在其后，勿合并。不是副本队列 3101。不是世界等级 51001。不是背包 5001。
 * 空的 3203 要编。无 page。整帧 04000000830c0000。不编 3202、3204、3205、3206、3220、3200、20011、19001、4601、29001。3012、3010 另帧，不从 3203 发。12020 每日任务列表另帧编码空体，勿与 3203 合并。3200 本轮勿挂。5001 已有，勿重复。51001 已有，勿重复。3099、3101、20101 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 20101 分开发，勿合并。本刀不重复拉 20101，也不重复拉 3101，也不重复拉 3099。towerService.getTower 无档可 towerDao.add 轻懒建。handler 不走门票回复，不 updateTower。无扣费，无领奖，无养成写。轻懒建可接受。挂在 20101 之后。4044 英雄等级重生次数另帧编码空体，勿与 3203 合并。不是进行中活动 20101。不是副本队列 3101。不是世界等级 51001。
 * 空的 4044 要编。无 page。整帧 04000000cc0f0000。不编 4043、20011、4601、29001。4043 是英雄等级重生写号（扣费、清符文、降级、返还），不编码、不发送。13010 签到列表另只读接在其后，勿合并。5001 已有，勿重复。51001 已有，勿重复。3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 3203 分开发，勿合并。本刀不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。HeroSummonService.getHeroSummon 可能轻懒建。跨日可能把 times 清零并更新。轻懒建、轻日刷可接受。无扣费，无领奖，无养成写。挂在 3203 之后。不是爬塔首通已领 3203。不是进行中活动 20101。不是世界等级 51001。
 * 空的 13010 要编。无 page。整帧 04000000d2320000。不编 13011、12021、12022、20011、4601、29001。13011 是签到领奖写号，不编码、不发送。12020 每日任务列表另帧编码空体，勿与 13010 合并。不是启动链 12010。5001 已有，勿重复。51001 已有，勿重复。4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 4044 分开发，勿合并。本刀不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。getSignday 轻懒建。跨日、跨月可能把签到日重置并写库。轻懒建、轻日刷、轻月刷可接受。无扣费，无领奖。挂在 4044 之后。不是英雄等级重生次数 4044。不是世界等级 51001。
 * 空的 12020 要编。无 page。整帧 04000000f42e0000。不编 12021、12022、20011、4601、29001。12021 是领每日任务奖，不编码、不发送。12022 是领活跃宝箱，不编码、不发送。26002 每日福利列表另只读接在其后，勿合并。26001 每月福利列表另只读接在 26002 之后，勿合并。不是启动链 12010。5001 已有，勿重复。51001 已有，勿重复。13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 13010 分开发，勿合并。本刀不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。getDailyTasks 可能 reset、checkNew。loadRoleDailyTask 可能按日刷新宝箱进度。轻懒建、轻日刷可接受。无扣费，无领奖。挂在 13010 之后。不是签到列表 13010。不是成就列表 12010。不是世界等级 51001。
 * 空的 26002 要编。无 page。整帧 0400000092650000。不发 12021、12022、20011、4601、29001。26001 每月福利列表另只读接在其后，勿合并。本刀不重复拉 26002。不发明领奖写号。不是启动链 12010。不是每日任务列表 12020。5001 已有，勿重复。51001 已有，勿重复。12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 12020 分开发，勿合并。本刀不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。纯读。轻副作用可接受。无扣费，无领奖写。挂在 12020 之后。不是签到列表 13010。不是成就列表 12010。不是世界等级 51001。
 * 空的 26001 要编。无 page。整帧 0400000091650000。proto 名 mouth，就是 month。不发 12021、12022。61001 周末礼包另只读接在其后，勿合并。不做 20011。不做 4601、29001。26002 已合，勿与 26002 合并，不重复拉。不发明领奖写号。不是启动链 12010。不是每日福利列表 26002。不是每日任务列表 12020。5001 已有，勿重复。51001 已有，勿重复。26002、12020、13010、4044、3203、20101、3101、3099 勿再发。纯读。轻副作用可接受。无扣费，无领奖写。挂在 26002 之后。
 * 空的 61001 要编。无 page。整帧 0400000049ee0000。不发 61002。62001 神迹遗物另只读接在其后，勿合并。63001 英雄殿堂另只读接在 62001 之后，勿合并。不发 63002、63003。69001 积天豪礼2另帧，勿合并。不发 69002。不做 71001。不发 62002、62003、62004、62005。不发 12021、12022。不做 20011。不做 4601、29001。26001 已合，勿与 26001 合并，不重复拉。不发明领奖写号。不是启动链 12010。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001 已有，勿重复。51001 已有，勿重复。26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。轻懒建、轻日刷可接受。无扣费，无领奖写。挂在 26001 之后。
 * 空的 62001 要编。无 page。整帧 0400000031f20000。不发 62002、62003、62004、62005。63001 英雄殿堂另只读接在其后，勿合并。不发 63002、63003。69001 积天豪礼2另帧，勿合并。不发 69002。不做 71001。不做 20011。不做 4601、29001。61001 已合，勿与 61001 合并，不重复拉。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001 已有，勿重复。51001 已有，勿重复。61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。挂在 61001 之后。
 * 空的 69001 要编。无 page。整帧 04000000890d0100。不发 69002。不做 71001。不做 20011。不做 4601、29001。63001 已合，勿与 63001 合并，不重复拉。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。轻懒建、轻日刷可接受。无扣费，无领奖写，无成长写。挂在 63001 之后。74001 时空魔塔另帧，勿合并。
 * 空的 74001 要编。无 page。整帧 0400000011210100。不发 74002。不发 74003。不做 73002。不做 71001。不做 20011。不做 4601、29001。69001 已合，勿与 69001 合并，不重复拉。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。轻懒建（getTower 可能 add）可接受。轻日刷（跨日清 failNum）可接受。跨服回包轮次变化可能清 weekPass。无扣费，无领奖，无挑战写。挂在 69001 之后。74120 时空冒险另帧，勿合并。
 * 空的 74120 要编。无 page。整帧 0400000088210100。不发 74123、74124、74125、74126、74127、74128、74129、74131、74142、74147、74148、74149。不夹发 74121、74122。不做 76501。不做 73002。不做 71001。不做 20011。不做 4601、29001。74001 已合，勿与 74001 合并，不重复拉。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。轻懒建（首次 spaceTimeInfoDao.add）可接受。体力 regainEnergy 写回可接受。商店过期清空 shopItems 可接受。无扣费，无领奖，无探索写，无购买写。挂在 74001 之后。76542 斩魔之路另帧，挂在其后，勿合并。75101 七神器另帧，挂在 76542 之后，勿合并。不并入 76542。不发 75102。75121 诸神祭坛另帧，挂在其后，勿合并。75131 赏月佳肴另帧，挂在其后，勿合并。不并入 75121。不发 75132。75801 秋赏明月另帧，挂在其后，勿合并。不并入 75131。不发 75802。不发 75803。不发 75804。75901 万圣抽奖另帧，挂在其后，勿合并。不并入 75801。不发 75902。不发 75903。不发 75904。76001 黑五活动另帧，挂在其后，勿合并。不并入 75901。不发 76002。不发 76003。不发 76004。不发 76005。76101 约惠圣诞另帧，挂在其后，勿合并。不并入 76001。不发 76102。
 */
import { NetMessage } from "../NetTypes";
import { Cmd } from "./cmds";
import { bytesToHex, encodeFrame, WireCmd } from "./frame";
import { WIRE_ACHIEVEMENT_CMD } from "./wireAchievement";
import { WIRE_ACTIVITY_CMD } from "./wireActivity";
import { WIRE_PVP_CMD } from "./wirePvp";
import { WIRE_GOAL7_CMD } from "./wireGoal7";
import { WIRE_SEVEN_CMD } from "./wireSevenDay";
import { WIRE_WISH_CMD } from "./wireWish";
import { WIRE_SUMMON_CMD } from "./wireSummon";
import { WIRE_PROPHET_CMD } from "./wireProphet";
import { WIRE_JEWEL_CMD } from "./wireJewel";
import { WIRE_ILLUSTRAT_CMD } from "./wireIllustrat";
import { WIRE_PET_CMD } from "./wirePet";
import { WIRE_WORLD_CMD } from "./wireWorld";
import { WIRE_PROMOTION_CMD } from "./wirePromotion";
import { WIRE_FIRST_CMD } from "./wireFirstRecharge";
import { WIRE_REIKI_CMD } from "./wireReiki";
import { WIRE_ISLANDS_CMD } from "./wireFloatingIslands";
import { WIRE_TOTEMS_CMD } from "./wireTotems";
import { WIRE_ASTROLABE_CMD } from "./wireAstrolabe";
import { WIRE_CUBE_CMD } from "./wireTweakCube";
import { WIRE_DRAGON_CMD } from "./wireDragon";
import { WIRE_DRAGON_COLLECTION_CMD } from "./wireDragonCollection";
import { WIRE_TITLE_CMD } from "./wireTitle";
import { WIRE_HEAD_PORTRAIT_CMD } from "./wireHeadPortrait";
import { WIRE_BORDER_CMD } from "./wireBorder";
import { WIRE_FASHION_CMD } from "./wireFashion";
import { WIRE_WORN_FASHION_CMD } from "./wireWornFashion";
import { WIRE_HERO_PRAYER_CMD } from "./wireHeroPrayer";
import { WIRE_PET_ILLUSTRATE_CMD } from "./wirePetIllustrate";
import { WIRE_FETTER_CMD } from "./wireFetter";
import { WIRE_FETTER_FASHION_CMD } from "./wireFetterFashion";
import { WIRE_SHENBIN_CMD } from "./wireShenBin";
import { WIRE_OCCUPATION_CMD } from "./wireOccupation";
import { WIRE_ROLE_SHENBIN_CMD } from "./wireRoleShenBin";
import { WIRE_FETTER_CONTRACT_CMD } from "./wireFetterContract";
import { WIRE_FORMATION_CMD } from "./wireFormation";
import { WIRE_LINEUP_CMD } from "./wireLineUp";
import { WIRE_RUNNING_PROMOTION_CMD } from "./wireRunningPromotion";
import { WIRE_TOWER_REWARD_CMD } from "./wireTowerReward";
import { WIRE_HERO_LEVEL_RESET_TIMES_CMD } from "./wireHeroLevelResetTimes";
import { WIRE_SIGN_IN_LIST_CMD } from "./wireSignInList";
import { WIRE_DAILY_TASK_LIST_CMD } from "./wireDailyTaskList";
import { WIRE_DAILY_WELFARE_LIST_CMD } from "./wireDailyWelfareList";
import { WIRE_MOUTH_WELFARE_LIST_CMD } from "./wireMouthWelfareList";
import { WIRE_WEEKEND_GIFT_CMD } from "./wireWeekendGift";
import { WIRE_GOD_RELIC_CMD } from "./wireGodRelic";
import { WIRE_HERO_PALACE_CMD } from "./wireHeroPalace";
import { WIRE_RECHARGE_DAYS_B_CMD } from "./wireRechargeDaysB";
import { WIRE_TIME_TOWER_CMD } from "./wireTimeTower";
import { WIRE_SPACE_TIME_ADVENTURE_CMD } from "./wireSpaceTimeAdventure";
import { WIRE_MAGIC_TOWER_ROAD_CMD } from "./wireMagicTowerRoad";
import { WIRE_QI_SHEN_QI_CMD } from "./wireQiShenQi";
import { WIRE_ZHU_SHEN_JI_TAN_CMD } from "./wireZhuShenJiTan";
import { WIRE_MID_FOOD_CMD } from "./wireMidFood";
import { WIRE_QIU_SHANG_MING_YUE_CMD } from "./wireQiuShangMingYue";
import { WIRE_WAN_SHENG_LOTTERY_CMD } from "./wireWanShengLottery";
import { WIRE_HEI_WU_MISSION_CMD } from "./wireHeiWuMission";
import { WIRE_CHRISTMAS_GIFT_CMD } from "./wireChristmasGift";
import { WIRE_SPRING_OUTING_CMD } from "./wireSpringOuting";
import { WIRE_CHRISTMAS_MISSION_CMD } from "./wireChristmasMission";
import { WIRE_MAGIC_TOWER_LEVEL_RANK_CMD } from "./wireMagicTowerLevelRank";
import { WIRE_BATTLE_MATCH_CMD } from "./wireBattle";
import { WIRE_CHAPTER_REWARD_CMD } from "./wireChapterReward";
import { WIRE_QUICK_BATTLE_CMD } from "./wireQuickBattle";
import { encodeWireChapterReportBody, readWireChapterReportQuery, WIRE_CHAPTER_REPORT_CMD } from "./wireChapterReport";
import { encodeWireBattleReportBody, readWireBattleReportQuery, WIRE_BATTLE_REPORT_CMD } from "./wireBattleReport";
import { encodeWirePreComputeBody, readWirePreComputeQuery, WIRE_PRECOMPUTE_CMD } from "./wirePreComputeStrength";
import { encodeWireStudyBody, readWireStudyQuery, WIRE_STUDY_CMD } from "./wireStudy";
import {
  encodeWireGmCommandBody,
  encodeWireGmGenericBody,
  readWireGmCommand,
  WIRE_GM_CMD,
  WIRE_GM_COMMAND,
} from "./wireGmCommand";
import {
  encodeWireLineUpSaveBody,
  encodeWireLineUpSaveHeroes,
  readWireLineUpSave,
  readWireLineUpSaveMany,
  WIRE_LINEUP_SAVE_CMD,
} from "./wireLineUpSave";
import { WIRE_SPRING_OUTING_GRID_CMD } from "./wireSpringOutingGrid";
import { encodeWireHeroListBody, readWireHeroPage, WIRE_HERO_CMD } from "./wireHero";

const LOGIN_FIELD1 = 7;
const LOGIN_FIELD3 = 2;
const LOGIN_DEVICE = "localdev";
const LOGIN_CHANNEL = "mxzg-web-1001";
const CREATE_FIELD2 = 0;
const CREATE_FIELD3 = 2;
const CREATE_PLACE = "local";

export interface ProtoField {
  field: number;
  kind: "varint" | "string" | "bytes";
  varint?: number;
  text?: string;
  hex?: string;
}

export interface WireInbound {
  cmdId: number;
  frameLength: number;
  body: Uint8Array;
  hex: string;
}

export interface WirePacket {
  cmdId: number;
  bytes: Uint8Array;
  note: string;
}

export interface LoginReplySummary {
  empty: boolean;
  roleId: number | null;
  status: string;
  detail: string;
}

/** 字段 1 是已证明的角色 id。空包或没有这个字段时不进主城。 */
export function wireRoleReady(summary: LoginReplySummary): boolean {
  return typeof summary.roleId === "number" && summary.roleId > 0;
}

const PURE_UID = /^[1-9][0-9]{0,9}$/;

/** 正整数平台 uid。0、空、超长数字都不是。 */
export function positiveUid(text: string): number | null {
  const raw = (text || "").trim();
  if (!PURE_UID.test(raw)) return null;
  const n = Number(raw);
  if (!Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

/**
 * 纯数字账号原样。其它非空账号压成 1..999999999，同一字符串每次相同。
 * 空串和非法数字（0、前导 0）仍是 null，不另编一个号。
 */
export function uidFromAccount(account: string): number | null {
  const text = (account || "").trim();
  if (!text) return null;
  if (/^[0-9]+$/.test(text)) return positiveUid(text);
  return stableAccountUid(text);
}

/** FNV-1a，再收进 9 位正整数。给 hao1 这类账号填字段2。 */
export function stableAccountUid(account: string): number {
  const text = (account || "").trim();
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const n = (hash >>> 0) % 999999999;
  return n === 0 ? 1 : n;
}

/**
 * 纯数字账号优先，不看平台ID。
 * 账号不是纯数字时，平台ID 填了正整数就用它当字段2；空着或是 0 则用账号散列。
 */
export function resolveLoginUid(account: string, platformId?: string | null): number | null {
  const text = (account || "").trim();
  if (PURE_UID.test(text)) return positiveUid(text);
  const fromPlatform = positiveUid(platformId || "");
  if (fromPlatform !== null) return fromPlatform;
  return uidFromAccount(text);
}

/** 登录框 CHANNEL_ID 空着时仍是 mxzg-web-1001。 */
export function observedLoginChannel(channel?: string | null): string {
  const text = (channel || "").trim();
  return text || LOGIN_CHANNEL;
}

/** 登录框 PF_ID 空着时仍是 localdev。填了才替换字段6。 */
export function observedLoginDevice(device?: string | null): string {
  const text = (device || "").trim();
  return text || LOGIN_DEVICE;
}

export interface LoginBodyOptions {
  channel?: string | null;
  device?: string | null;
}

/** 字段顺序与日志第二例（uid 960011）一致，便于对字节。有 uid 就写字段2。channel / device 空着用本机常量。 */
export function encodeObservedLoginBody(uid: number | null, nowSec: number, options?: LoginBodyOptions): Uint8Array {
  const parts: number[] = [];
  pushString(parts, 5, String(Math.floor(nowSec)));
  if (uid !== null) pushVarintField(parts, 2, uid);
  pushVarintField(parts, 1, LOGIN_FIELD1);
  pushVarintField(parts, 3, LOGIN_FIELD3);
  pushString(parts, 7, observedLoginChannel(options && options.channel));
  pushString(parts, 6, observedLoginDevice(options && options.device));
  return Uint8Array.from(parts);
}

export function encodeObservedCreateBody(name: string): Uint8Array | null {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const parts: number[] = [];
  pushString(parts, 1, trimmed);
  pushVarintField(parts, 2, CREATE_FIELD2);
  pushVarintField(parts, 3, CREATE_FIELD3);
  pushString(parts, 4, CREATE_PLACE);
  pushString(parts, 5, LOGIN_CHANNEL);
  return Uint8Array.from(parts);
}

/**
 * 把 NetClient 的明文 cmd 编成线上帧。
 * heartbeat → 1004 空体。login → 1001。role.create → 1002。wire.2001 → 空的 c2s 2001。
 * wire.5001 → 空的 c2s 5001（背包整表）。
 * wire.3007 → 空的 c2s 3007（主线关卡进度）。
 * wire.3004 → 空的 c2s 3004（挂机奖励列表）。wire.3005 → 空的 c2s 3005（领取挂机）。
 * wire.15000 → 空的 c2s 15000（邮件列表）。
 * wire.4001 → c2s 4001，GReqHeroList.page（缺省按 1，不会编成 0）。
 * wire.17000 → 空的 c2s 17000（点金 GResBuyGoldLog，不点金）。
 * wire.12010 → 空的 c2s 12010（成就 GResAchievementList，不领奖）。不是 12020。12020 另帧编码空体。
 * wire.18001 → 空的 c2s 18001（竞技场 GReqPvpData / GResPvpData）。不编 18002、18003、18005、18007、18008。
 * wire.22000 → 空的 c2s 22000（七日登录 GReqSevenDayLoginData / GResSevenDayLoginData）。不编 22001。不编 22002。
 * wire.21010 → 空的 c2s 21010（七日目标 GReqSevenDayTargetList / GResSevenDayTargetList）。不编 21011、21012。不编 21013。
 * wire.27001 → 空的 c2s 27001（许愿池 GResBlessingPoolList）。不编 27002、27003、27004。许愿不发 4201。4201 是英雄祈愿另帧。
 * wire.4004 → 空的 c2s 4004（召唤次数 GResHeroSummonCount）。不编 4002、4005。不编 58001、58007。不是 4001。
 * wire.13044 → 空的 c2s 13044（先知召唤 GReqProphetSummonInfo / GResProphetSummonInfo）。不编 13041、13042、13043。不编 58007。先知召唤不发 4201。4201 是英雄祈愿另帧。不是 4004。
 * wire.4101 → 空的 c2s 4101（英雄宝石 GReqHeroJewel / GResHeroJewel）。不编 4102、4103、4104、4105、4106、4107。不编 9001。不是 4001，也不是 13044。
 * wire.4013 → 空的 c2s 4013（英雄图鉴 GReqIllustratReward / GResIllustratReward）。不编 4014。不是 4001，也不是 4101。
 * wire.74100 → 空的 c2s 74100（宠物信息 GReqPetInfoList / GResPetInfoList）。不编 74101、74102、74103、74105、74106。不是 4001，也不是 4013。
 * wire.51001 → 空的 c2s 51001（世界等级 GReqWorldLevel / GResWorldLevel）。20101 另帧，不并进本帧。
 * wire.20001 → 空的 c2s 20001（基金列表 GReqPromotionList / GResPromotionList）。不编 20018。不编 20004、20010。不做 3007。不是角色资料 2001。
 * wire.20012 → 空的 c2s 20012（超值首充 GReqFirstRecharge / GResFirstRecharge）。不编 20013。不做 13260。不是基金列表 20001。
 * wire.70001 → 空的 c2s 70001（灵器数据 GReqReikiEquipData / GResReikiEquipData）。不编 70002、70003、70004、70005、70006。不编 70007、70008。不做 20011。不是超值首充 20012。
 * wire.73001 → 空的 c2s 73001（浮空岛时间 GReqFloatingIslandsTime / GResFloatingIslandsTime）。不编 73002、73003、73004。不做 20011。不是灵器数据 70001。
 * wire.74300 → 空的 c2s 74300（图腾信息 GReqTotemsInfoList / GResTotemsInfoList）。不编 74301、74302、74303、74304。不做 20011。不是浮空岛时间 73001。不是宠物信息 74100。
 * wire.68001 → 空的 c2s 68001（星盘数据 GReqAstrolabeData / GResAstrolabeData）。无 page。不编 68002、68003、68004、68005、68006。不做 20011。不是图腾信息 74300。
 * wire.75501 → 空的 c2s 75501（魔方数据 GReqTweakCube / GResTweakCube）。无 page。不编 75502、75503、75504、75505、75506。不做 34001。不做 20011。不是星盘数据 68001。
 * wire.59001 → 空的 c2s 59001（圣龙数据 GReqDragonScanInfo / GResDragonScanInfo）。无 page。不编 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。59010 另帧，勿与本帧合并。不做 34001。不做 20011。不是魔方数据 75501。
 * wire.59010 → 空的 c2s 59010（圣物图鉴 GReqDragonCollection / GResDragonCollection）。无 page。不编 59002、59003、59005、59006、59007、59008、59009、59011、59012、59013。不做 34001。不做 20011。不是圣龙数据 59001。
 * wire.55001 → 空的 c2s 55001（称号列表 GReqScanTitleList / GResScanTitleList）。无 page。Title.proto 仅 55001 读写对。34001 另帧，勿与本帧合并。不做 20011。不是圣物图鉴 59010。
 * wire.34001 → 空的 c2s 34001（头像列表 GReqHeadPortraitList / GResHeadPortraitList）。无 page。不编 34002、34003、20011。32001 另帧，勿与本帧合并。34003 是解锁推送，勿当拉包。不是称号列表 55001。
 * wire.32001 → 空的 c2s 32001（头像框数据 GReqBorderData / GResBorderData）。无 page。不编 32002、32003、29001、20011。4402 另帧，勿与本帧合并。32003 是服侧推送，勿当拉包。29001 有 page，硬禁。不是头像列表 34001。
 * wire.4402 → 空的 c2s 4402（激活皮肤列表 GReqHeroFashionList / GResHeroFashionList）。无 page。4401 另帧，勿与本帧合并。不编 4403、4404、4405、4406、4601、4202、74104、29001、20011。4601 有 page，硬禁。4406 无实现，勿发。29001 有 page，硬禁。4201 另帧，勿与本帧合并。不是头像框数据 32001。
 * wire.4401 → 空的 c2s 4401（穿戴皮肤英雄列表 GReqHeroFashion / GResHeroFashion）。无 page。不编 4402、4403、4404、4405、4406、4601、4202、74104、29001、20011。4406 无实现，勿发。4601 有 page，硬禁。29001 有 page，硬禁。4201 另帧，勿与本帧合并。不是激活皮肤列表 4402。
 * wire.4201 → 空的 c2s 4201（英雄祈愿数据 GReqHeroPrayerData / GResHeroPrayerData）。无 page。不编 4202、74104、4601、29001、20011。4202 扣道具并发奖，勿发。74104 另只读接在其后，勿合并。4601 有 page，硬禁。29001 有 page，硬禁。不是穿戴皮肤英雄列表 4401。
 * wire.74104 → 空的 c2s 74104（宠物图鉴 GReqPetIllustrate / GResPetIllustrate）。无 page。不编 74101、74102、74103、74105、74106、4601、29001、20011。74105、74106 是背包增减推送，勿当拉包。28100 另只读接在其后，勿合并。不是宠物信息 74100。不是英雄祈愿 4201。
 * wire.28100 → 空的 c2s 28100（羁绊数据 GReqFetterList / GResFetterList）。无 page。不编 28101、28102、28103、28104、28105、28106、28107、28108、28109、28002、28003、4601、29001、20011。28200 另帧，勿与本帧合并。不是宠物图鉴 74104。不是英雄祈愿 4201。
 * wire.28200 → 空的 c2s 28200（羁绊皮肤 GReqFashionData / GResFashionData）。无 page。不编 28201、28202、28203、28204、28205、28101、28102、28103、28104、28105、28106、28107、28108、28109、28002、28003、4601、29001、20011。28203 虽只读，本刀勿夹发。75601 另帧，勿与本帧合并。不是羁绊数据 28100。不是激活皮肤列表 4402。
 * wire.75601 → 空的 c2s 75601（神兵数据 GReqShenBinInfo / GResShenBinInfo）。无 page。不编 75602、75603、75604、75605、75607、75608、75609、75619、4601、29001、20011。75606 另帧编码空体，勿与 75601 合并。4601 有 page，硬禁。29001 有 page，硬禁。不是羁绊皮肤 28200。不是羁绊数据 28100。
 * wire.75606 → 空的 c2s 75606（职级信息 GReqGetOccupationInfo / GResGetOccupationInfo）。无 page。整帧 0400000056270100。不编 75607、75608、75609、75602、75603、75604、75605、75619、4601、29001、20011。75607 同为空体，切勿编成 75607。75608 为服推，勿当 c2s。75615 另帧编码空体，勿与 75606 合并。不是神兵数据 75601。
 * wire.75615 → 空的 c2s 75615（神兵道具 GReqRoleShenBinInfo / GResRoleShenBinInfo）。无 page。整帧 040000005f270100。不编 75602、75603、75604、75605、75619、75607、75608、75609、4601、29001、20011。75607 同为空体，切勿编成 75607。75608 为服推，勿当 c2s。28107 另帧，勿与本帧合并。不是职级信息 75606。不是神兵数据 75601。
 * wire.28107 → 空的 c2s 28107（契约 GReqFetterContractInfo / GResFetterContractInfo）。无 page。整帧 04000000cb6d0000。不编 28101、28102、28104、28105、28106、28108、28109、28002、28003、28004、28201、28202、28203、28204、28205、3097、3098、3100、3102、3030、4601、29001、20011。3099 另帧，勿与本帧合并。不是神兵道具 75615。不是羁绊数据 28100。
 * wire.3099 → 空的 c2s 3099（阵法 GReqQueryFormation / GResQueryFormation）。无 page。整帧 040000001b0c0000。登录链在 28107 之后发一次。主线页「查询阵法」再发同一空帧。不编 3097、3098、3100、3020、3102、3030、3002、3005、3008、3011、3013、4601、29001、20011。3101 副本队列另只读接在其后，勿合并。不是契约 28107。不是神兵道具 75615。
 * wire.3101 → 空的 c2s 3101（副本队列 GReqLineUp / GResLineUp）。无 page。整帧 040000001d0c0000。登录链在 3099 之后发一次。主线页「获取阵容」再发同一空帧。不编 3100、3020、3098、3097、3030、3102、3103、4601、29001、20011。3099 勿再发。不做备选 5001。20101 进行中活动另只读接在其后，勿合并。不是阵法 3099。不是契约 28107。
 * wire.20101 → 空的 c2s 20101（进行中活动 GReqRunningPromotion / GResRunningPromotion）。无 page。整帧 04000000854e0000。不编 20102、20018、20013、20004、20010、4601、29001、20011。20102 同文件非空体，勿挂。51001 已有，勿重复。5001 已有，勿重复。3101、3099 勿再发。3203 爬塔首通已领另只读接在其后，勿合并。不是副本队列 3101。不是世界等级 51001。
 * wire.3203 → 空的 c2s 3203（爬塔首通已领 GReqTowerRewardList / GResTowerRewardList）。无 page。整帧 04000000830c0000。不编 3202、3204、3205、3206、3220、3200、19001、4601、29001、20011。3012、3010 另帧，不从 3203 发。3200 本轮勿挂。12020 每日任务列表另帧编码空体，勿与 3203 合并。5001 已有，勿重复。51001 已有，勿重复。20101、3101、3099 勿再发。4044 英雄等级重生次数另帧编码空体，勿与 3203 合并。不是进行中活动 20101。不是副本队列 3101。
 * wire.4044 → 空的 c2s 4044（英雄等级重生次数 GReqHeroLevelResetTimes / GResHeroLevelResetTimes）。无 page。整帧 04000000cc0f0000。不编 4043、4601、29001、20011。4043 是写号，不编码。5001 已有，勿重复。51001 已有，勿重复。3203、20101、3101、3099 勿再发。不是爬塔首通已领 3203。不是进行中活动 20101。
 * wire.13010 → 空的 c2s 13010（签到列表 GReqSignInList / GResSignInList）。无 page。整帧 04000000d2320000。不编 13011、12021、12022、4601、29001、20011。13011 是签到领奖写号，不编码。12020 每日任务列表另帧编码空体，勿与 13010 合并。不是启动链 12010。5001 已有，勿重复。51001 已有，勿重复。4044、3203、20101、3101、3099 勿再发。不是英雄等级重生次数 4044。
 * wire.12020 → 空的 c2s 12020（每日任务列表 GReqDailyTaskList / GResDailyTaskList）。无 page。整帧 04000000f42e0000。不编 12021、12022、4601、29001、20011。12021 是领每日任务奖，不编码。12022 是领活跃宝箱，不编码。不是启动链 12010。5001 已有，勿重复。51001 已有，勿重复。13010、4044、3203、20101、3101、3099 勿再发。不是签到列表 13010。不是成就列表 12010。
 * wire.26002 → 空的 c2s 26002（每日福利列表 GReqDailyWelfareList / GResDailyWelfareList）。无 page。整帧 0400000092650000。不发 12021、12022、4601、29001、20011。26001 每月福利列表另只读接在其后，勿合并。不发明领奖写号。不是启动链 12010。不是每日任务列表 12020。5001 已有，勿重复。51001 已有，勿重复。12020、13010、4044、3203、20101、3101、3099 勿再发。不是签到列表 13010。不是成就列表 12010。
 * wire.26001 → 空的 c2s 26001（每月福利列表 GReqMouthWelfareList / GResMouthWelfareList）。无 page。整帧 0400000091650000。proto 名 mouth，就是 month。不编 12021、12022、61002、4601、29001、20011。61001 周末礼包另只读接在其后，勿合并。26002 已合，勿合并，不重复拉。不发明领奖写号。不是启动链 12010。不是每日福利列表 26002。不是每日任务列表 12020。5001 已有，勿重复。51001 已有，勿重复。26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
 * wire.61001 → 空的 c2s 61001（周末礼包 GReqWeekendGiftData / GResWeekendGiftData）。无 page。整帧 0400000049ee0000。不编 61002、62002、62003、62004、62005、63002、63003、69002、71001、12021、12022、4601、29001、20011。61002 是领奖写号，不编码。62001 神迹遗物另帧，勿与本帧合并。63001 英雄殿堂另帧，勿与 62001 合并。69001 积天豪礼2另帧编码空体，勿与 63001 合并。26001 已合，勿合并，不重复拉。不发明领奖写号。不是启动链 12010。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001 已有，勿重复。51001 已有，勿重复。26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
 * wire.62001 → 空的 c2s 62001（神迹遗物 GReqGodRelicData / GResGodRelicData）。无 page。整帧 0400000031f20000。不编 62002、62003、62004、62005、63002、63003、69002、71001、4601、29001、20011。62002 是挑战，62003 是买次数，62004 是领星级奖，62005 是扫荡，都不编码。63001 英雄殿堂另帧编码空体，勿与本帧合并。69001 积天豪礼2另帧编码空体，勿与 63001 合并。61001 已合，勿合并，不重复拉。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001 已有，勿重复。51001 已有，勿重复。61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
 * wire.69001 → 空的 c2s 69001（积天豪礼2 GReqRechargeDaysBList / GResRechargeDaysBList）。无 page。整帧 04000000890d0100。不编 69002、71001、4601、29001、20011。69002 是领取积天豪礼2奖励，不编码。71001 本轮不做，不编码。63001 已合，勿合并，不重复拉。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。74001 时空魔塔另帧编码空体，勿与本帧合并。
 * wire.74001 → 空的 c2s 74001（时空魔塔个人信息 GReqTimeTowerInfo / GResTimeTowerInfo）。无 page。整帧 0400000011210100。不编 74002、74003、73002、71001、4601、29001、20011。74002 是挑战，不编码。74003 是排行，本刀不挂，不编码。73002 本轮不做，不编码。69001 已合，勿合并，不重复拉。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。74120 时空冒险另帧编码空体，勿与本帧合并。
 * wire.74120 → 空的 c2s 74120（时空冒险信息 GReqSpaceTimeAdventureInfo / GResSpaceTimeAdventureInfo）。无 page。整帧 0400000088210100。不编 74121、74122、74123、74124、74125、74126、74127、74128、74129、74131、74142、74147、74148、74149、76501、73002、71001、4601、29001、20011。74123 是选择航线，74124 是舰队技能加点，74125 是舰队修理，74126 是商店购买，74127 是改航队名，74128 是航队探索，74129 是放弃事件，74131 是执行事件，74142 是航行结算，74147、74149 是超值礼包，74148 是疾风之力，都不编码。74121、74122 不夹发，不编码。76501 本轮不做，不编码。74001 已合，勿合并，不重复拉。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。76542 斩魔之路另帧编码空体，勿与本帧合并。75101 七神器另帧编码空体，勿与 76542 合并。
 * wire.76542 → 空的 c2s 76542（斩魔之路信息 GReqMagicTowerRoadInfo / GResMagicTowerRoadInfo）。无 page。整帧 04000000fe2a0100。不编 76543、76544、76502、76503、76504、76505、76506、76541、76501、74121、74122、75001、73002、71001、4601、29001、20011。74120 已合，勿合并，不重复拉。75101 七神器另帧编码空体，勿与本帧合并。
 * wire.75101 → 空的 c2s 75101（七神器 GReqQiShenQiInfo / GResQiShenQiInfo）。无 page。整帧 040000005d250100。不编 75102、75001、76501、73002、71001、74121、74122、4601、29001、20011。75102 是购买推送 s2c，勿当 c2s，不编码。本模块无独立购写号。76542 已合，勿合并，不重复拉。不并入 76542。75121 诸神祭坛另帧编码空体，勿与本帧合并。
 * wire.75121 → 空的 c2s 75121（诸神祭坛 GReqZSJTInfo / GResZSJTInfo）。无 page。整帧 0400000071250100。不编 75122、75132、75102、75001、76501、73002、71001、74121、74122、4601、29001、20011。75801 秋赏明月另帧编码空体，勿与本帧合并。75122 是抽奖 GReqZSJTLuckDraw.type，不编码。75131 赏月佳肴另帧编码空体，勿与本帧合并。75101 已合，勿合并，不重复拉。不并入 75101。
 * wire.75131 → 空的 c2s 75131（赏月佳肴 GReqMidFoodInfo / GResMidFoodInfo）。无 page，无 FIELD。整帧 040000007b250100。不编 75132、75122、75102、75001、76501、73002、71001、74121、74122、4601、29001、20011。75801 秋赏明月另帧编码空体，勿与本帧合并。75132 是购买推送 s2c，勿当 c2s，不编码。75121 已合，勿合并，不重复拉。不并入 75121。
 * wire.75801 → 空的 c2s 75801（秋赏明月 GReqMidLotteryGetDataInfo / GResMidLotteryGetDataInfo，QIU_SHANG_MING_YUE / promo074）。无 page，无 FIELD。整帧 0400000019280100。不编 75802、75803、75804、75001、76501、73002、71001、74121、74122、4601、29001、20011。75802 是选档，75803 是抽奖，75804 是领次数奖，都不编码。75901 万圣抽奖另帧编码空体，勿与本帧合并。75131 已合，勿合并，不重复拉。不并入 75131。
 * wire.75901 → 空的 c2s 75901（万圣抽奖 GReqHalloweenLotteryGetDataInfo / GResHalloweenLotteryGetDataInfo，WAN_SHENG_LOTTERY / promo078）。无 page，无 FIELD。整帧 040000007d280100。不编 75902、75903、75904、75931、75932、75941、75942、75943、75944、75001、76501、73002、71001、74121、74122、4601、29001、20011。75902 是选档，75903 是抽奖，75904 是领次数奖，75931、75932 是万圣礼包，75941–75944 是万圣任务，都不编码。76001 黑五活动另帧编码空体，勿与本帧合并。75801 已合，勿合并，不重复拉。不并入 75801。
 * wire.76001 → 空的 c2s 76001（黑五活动 GReqBlackFiveMissionGetDataInfo / GResBlackFiveMissionGetDataInfo，HEI_WU_MISSION / promo081）。无 page，无 FIELD。整帧 04000000e1280100。不编 76002、76003、76004、76005、76021、76022、75001、76501、73002、71001、74121、74122、4601、29001、20011。76002 是领任务奖，76003 是进度推，76004 是领任务箱，76005 是购礼包推，76021、76022 不夹发，都不编码。76101 约惠圣诞另帧编码空体，勿与本帧合并。75901 已合，勿合并，不重复拉。不并入 75901。
 * wire.76101 → 空的 c2s 76101（约惠圣诞礼包 GReqChristmasGiftInfo / GResChristmasGiftInfo，CHRISTMAS_GIFT / promo086）。无 page，无 FIELD。整帧 0400000045290100。不编 76102、76082、76083、76084、76121、76122、76141、76142、76143、76161、76162、76163、75001、76501、73002、71001、74121、74122、4601、29001、20011。76102 是礼包购买推送，76082–76084、76121–76122、76141–76143、76161–76163 是旁支，76301 出游寻春另帧编码空体，勿与本帧合并。76001 已合，勿合并，不重复拉。不并入 76001。
 * wire.76301 → 空的 c2s 76301（出游寻春 GReqSpringOutingMissionGetDataInfo / GResSpringOutingMissionGetDataInfo，CHU_YOU_XUN_CHUN / promo096）。无 page，无 FIELD。整帧 040000000d2a0100。不编 76302、76303、76304、76305、76306、76307、76308、75001、76501、73002、71001、74121、74122、4601、29001、20011。76302 是领任务奖，76303 是更新任务进度推送，76304 是领宝箱/皮肤数量奖，76305–76308 勿夹，76081 圣诞连线另帧编码空体，勿与本帧合并。76101 已合，勿合并，不重复拉。不并入 76101。
 * wire.76081 → 空的 c2s 76081（圣诞连线 GReqChristmasMissionGetDataInfo / GResChristmasMissionGetDataInfo，CHRISTMAS_MISSION / promo085）。无 page，无 FIELD。整帧 0400000031290100。不编 76082、76083、76084、76121、76122、76141、76142、76143、76161、76162、76163、75001、76501、73002、71001、74121、74122、4601、29001、20011。76082 是领任务奖，76083 是进度推送，76084 是领任务箱，76121、76122、76141、76143、76161、76163 是旁支，都不编码。76520 关卡榜另帧编码空体，勿与本帧合并。76301 已合，勿合并，不重复拉。不并入 76301。
 * wire.76520 → 空的 c2s 76520（关卡榜 GReqMagicTowerLevelRank / GResMagicTowerLevelRank）。无 page，无 FIELD。整帧 04000000e82a0100。不编 76501、76502、76503、76504、76505、76506、76543、76544、75001、73002、71001、74121、74122、4601、29001、20011。76501–76506、76543、76544 禁发。76251 春日踏青另帧编码空体，勿与本帧合并。76081 已合，勿合并，不重复拉。不并入 76081。不重复拉 76542。
 * wire.76251 → 空的 c2s 76251（春日踏青 GReqSpringOutingGrid / GResSpringOutingGrid，CHUN_RI_TA_QING / promo093）。无 page，无 FIELD。整帧 04000000db290100。不编 76252、76253、76271、75001、76501、73002、71001、74121、74122、4601、29001、20011。76252 是掷骰扣费+发奖，76253 是景点成就领奖，76271 备选本轮不做，都不编码。76520 已合，勿合并，不重复拉。不并入 76520。
 * 别的 cmd 返回 null，调用方不得把占位包写到线上。占位表里的 2001 仍是 Mock 的 tower.view。
 * 占位 idle.query / idle.claim 仍是 1301 / 1302，和这两帧不是一回事。
 * 占位 bag.list / bag.use 仍是 1601 / 1602。3002 / 3010 不编码。
 * 5002 不编码。5004–5009、5010、5011–5013 不编码。
 * 占位 mail.list / mail.read / mail.claim / mail.claimAll / mail.delete 仍是 1701–1705。领取和删除不编码。
 * 占位 hero.list / hero.upgrade 仍是 1401 / 1402。升级不编码。18001 不是英雄。
 * 占位 login7.view / login7.claim / login7.advance 仍是 2201–2203。领取不编码。wire.12020 编码空体，勿与 13010 或启动链 12010 合并。wire.12021、wire.12022、wire.61002、wire.62002、wire.62003、wire.62004、wire.62005、wire.63002、wire.63003、wire.69002、wire.71001、wire.74002、wire.74003、wire.73002、wire.74121、wire.74122、wire.74123、wire.74124、wire.74125、wire.74126、wire.74127、wire.74128、wire.74129、wire.74131、wire.74142、wire.74147、wire.74148、wire.74149、wire.76501、wire.76543、wire.76544、wire.76502、wire.76503、wire.76504、wire.76505、wire.76506、wire.76541、wire.75001、wire.75102 不编码。wire.75122、wire.75132、wire.75102 不编码。wire.75801 编码空体，勿与 75131 合并。wire.75901 编码空体，勿与 75801 合并。wire.76001 编码空体，勿与 75901 合并。wire.76101 编码空体，勿与 76001 合并。不编 wire.75902、wire.75903、wire.75904、wire.75931、wire.75932、wire.75941、wire.75942、wire.75943、wire.75944、wire.76002、wire.76003、wire.76004、wire.76005、wire.76021、wire.76022、wire.76102、wire.76082、wire.76083、wire.76084、wire.76121、wire.76122、wire.76141、wire.76142、wire.76143、wire.76161、wire.76162、wire.76163。wire.76301 编码空体，勿与 76101 合并。wire.76081 编码空体，勿与 76301 合并。wire.76520 编码空体，勿与 76081 合并。wire.76251 编码空体，勿与 76520 合并。不编 wire.76252、wire.76253、wire.76271。不编 wire.76302、wire.76303、wire.76304、wire.76305、wire.76306、wire.76307、wire.76308。wire.75131 编码空体，勿与 75121 合并。wire.75121 编码空体，勿与 75101 合并。wire.75101 编码空体，勿与 76542 合并。wire.76542 编码空体，勿与 74120 合并。wire.74120 编码空体，勿与 74001 合并。wire.74001 编码空体，勿与 69001 合并。wire.69001 编码空体，勿与 63001 合并。wire.63001 编码空体，勿与 62001 合并。wire.62001 编码空体，勿与 61001 合并。wire.61001 编码空体，勿与 26001 合并。wire.26001 编码空体，勿与 26002 合并。wire.26002 编码空体，勿与 12020 或启动链 12010 合并。
 * wire.22001、wire.22002 不编码。22002 是 s2c 推送。
 * 占位 goal7.view / goal7.claim 仍是 2301 / 2302。领取不编码。
 * wire.21011、wire.21012、wire.21013 不编码。21013 是 s2c。wire.21000、wire.21001 不编码。
 * 占位 wish.view / wish.draw 仍是 2501 / 2502。刷新、抽奖和幸运领奖不编码。
 * wire.27002、wire.27003、wire.27004 不编码。许愿不发 4201。4201 只编码空体。
 * 占位 summon.pull 仍是 1501。召唤和累积奖不编码。
 * wire.4002、wire.4005、wire.58001、wire.58007 不编码。
 * wire.13041、wire.13042、wire.13043 不编码。先知召唤的 58007 也不编码。先知召唤不发 4201。
 * wire.4102、wire.4103、wire.4104、wire.4105、wire.4106、wire.4107、wire.9001 不编码。
 * wire.4014 不编码。4014 是 s2c 推送。
 * wire.74101、wire.74102、wire.74103、wire.74105、wire.74106 不编码。74105、74106 是背包增减推送，勿当拉包。74104 只编码空体。28100 只编码空体，勿与 74104 合并。
 * wire.28101、wire.28102、wire.28103、wire.28104、wire.28105、wire.28106、wire.28108、wire.28109、wire.28002、wire.28003、wire.28004 不编码。wire.3097、wire.3098、wire.3100 不编码。wire.3030 另帧编码非空体，缺 opponent_id 不编空壳，不进 pullIdle，勿与 3102、3103、3099、3101 合并。wire.3103 另帧编码，空壳或带 hero_ids，不进 pullIdle，勿与 3102、3099、3101 合并。wire.3102 另帧编码非空体，不进 pullIdle，勿与 3099、3101 合并。wire.3101 编码空体，勿与 3099 合并。28100 只编码空体。wire.28200 编码空体，勿与 28100 合并。wire.28201、wire.28202、wire.28203、wire.28204、wire.28205 不编码。wire.75601 编码空体，勿与 28200 合并。wire.75602、wire.75603、wire.75604、wire.75605、wire.75607、wire.75608、wire.75609、wire.75619 不编码。wire.75606 编码空体，勿与 75601 合并。wire.75615 编码空体，勿与 75606 合并。wire.28107 编码空体，勿与 75615 合并。wire.3099 编码空体，勿与 28107 合并。75607 同为空体 GReqGetOccupationInfo，切勿编成 75607。
 * wire.20101 编码空体，勿与 3101 合并。不编 20102、20018、20013、20004、20010。51001 只编码空体。世界等级本模块无写操作号。
 * wire.3203 编码空体，勿与 20101 合并。不编 3202、3204、3205、3206、3220、3200、19001。3012、3010 另帧，不从 3203 发。12020 另帧编码空体，勿与 3203 合并。3200 本轮勿挂。5001、51001 已有，勿重复。
 * wire.4044 编码空体，勿与 3203 合并。不编 4043。13010 签到列表另帧编码空体，勿与 4044 合并。4043 是写号。5001、51001 已有，勿重复。3203、20101、3101、3099 勿再发。
 * wire.13010 编码空体，勿与 4044 合并。不编 13011。12020 另帧编码空体，勿与 13010 合并。13011 是写号。不是启动链 12010。5001、51001 已有，勿重复。4044、3203、20101、3101、3099 勿再发。
 * wire.12020 编码空体，勿与 13010 合并。不编 12021、12022。26001 每月福利列表另帧编码空体，勿合并。26002 另帧编码空体，勿与 12020 合并。12021、12022 是写号。不是启动链 12010。5001、51001 已有，勿重复。13010、4044、3203、20101、3101、3099 勿再发。
 * wire.26002 编码空体，勿与 12020 合并。不发 12021、12022。26001 每月福利列表另只读接在其后，勿合并。不发明领奖写号。不是启动链 12010。不是每日任务列表 12020。5001、51001 已有，勿重复。12020、13010、4044、3203、20101、3101、3099 勿再发。
 * wire.26001 编码空体，勿与 26002 合并。不编 12021、12022、61002、62002、62003、62004、62005、63002、63003、69002、71001。61001 周末礼包另帧编码空体，勿与 26001 合并。62001 神迹遗物另帧编码空体，勿与 61001 合并。63001 英雄殿堂另帧编码空体，勿与 62001 合并。69001 积天豪礼2另帧编码空体，勿与 63001 合并。74001 时空魔塔另帧编码空体，勿与 69001 合并。74120 时空冒险另帧编码空体，勿与 74001 合并。76542 斩魔之路另帧编码空体，勿与 74120 合并。75101 七神器另帧编码空体，勿与 76542 合并。75121 诸神祭坛另帧编码空体，勿与 75101 合并。75131 赏月佳肴另帧编码空体，勿与 75121 合并。不编 74002、74003、73002、74121、74122、74123、74124、74125、74126、74127、74128、74129、74131、74142、74147、74148、74149、76501、76543、76544、76502、76503、76504、76505、76506、76541、75001、75102、75122、75132。75801 秋赏明月另帧编码空体，勿与 75131 合并。不发明领奖写号。不是启动链 12010。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001 已有，勿重复。26002、12020、13010、4044、3203、20101、3101、3099 勿再发。
 * wire.20018、wire.20004、wire.20010 不编码。20001 只编码空体。不做 3007。
 * wire.20013、wire.13260 不编码。20012 只编码空体。不做 13260。
 * wire.70002、wire.70003、wire.70004、wire.70005、wire.70006、wire.70007、wire.70008、wire.20011 不编码。70001 只编码空体。70007、70008 是 s2c 推送。不做 20011。
 * wire.73002、wire.73003、wire.73004、wire.20011 不编码。73001 只编码空体。73002 有懒建和日刷写库。不做 20011。
 * wire.74301、wire.74302、wire.74303、wire.74304、wire.20011 不编码。74300 只编码空体。74304 是 s2c 推送，勿当拉包。不做 20011。
 * wire.68002、wire.68003、wire.68004、wire.68005、wire.68006、wire.20011 不编码。68001 只编码空体。68005 是更新星数常量，勿当拉包。不做 20011。
 * wire.75502、wire.75503、wire.75504、wire.75505、wire.75506、wire.20011 不编码。75501 只编码空体。75506 是等级推送，勿当拉包。34001 另帧，勿与本帧合并。不做 20011。
 * wire.59002、wire.59003、wire.59005、wire.59006、wire.59007、wire.59008、wire.59009、wire.59011、wire.59012、wire.59013、wire.20011 不编码。59001 只编码空体。59010 只编码空体，勿与 59001 合并。55001 只编码空体，勿与 59010 合并。34001 只编码空体，勿与 55001 合并。32001 只编码空体，勿与 34001 合并。4402 只编码空体，勿与 32001 合并。不编 34002。不编 34003。34003 是解锁推送，勿当拉包。不编 32002。不编 32003。32003 是服侧推送，勿当拉包。4401 只编码空体，勿与 4402 合并。不编 4403。不编 4404。不编 4405。不编 4406。不编 4601。4601 有 page，硬禁。4201 只编码空体，勿与 4401 合并。不编 4202。74104 只编码空体，勿与 4201 合并，也勿与 74100 合并。不编 74101、74102、74103。28100 只编码空体，勿与 74104 合并。28200 只编码空体，勿与 28100 合并。75601 只编码空体，勿与 28200 合并。75606 只编码空体，勿与 75601 合并。不编 28101、28102、28103、28104、28105、28106、28108、28109、28002、28003、28004、28201、28202、28203、28204、28205、3097、3098、3100、75602、75603、75604、75605、75607、75608、75609、75619。3030 另帧编码非空体，缺 opponent_id 不编空壳，不进 pullIdle。3103 另帧编码，空壳或带 hero_ids，不进 pullIdle。3102 另帧编码非空体，不进 pullIdle。75615 另帧编码空体，勿与已合帧合并。28107 另帧编码空体，勿与 75615 合并。3099 另帧编码空体，勿与 28107 合并。3101 另帧编码空体，勿与 3099 合并。20101 另帧编码空体，勿与 3101 合并。不编 20102、20018、20013、20004、20010。75607 同为空体 GReqGetOccupationInfo，切勿编成 75607。4406 无实现，勿发。29001 有 page，硬禁。不做 20011。
 */
export function encodeWireMessage(msg: NetMessage): WirePacket | null {
  const cmd = msg && msg.cmd ? msg.cmd : "";
  if (cmd === Cmd.heartbeat) {
    return {
      cmdId: WireCmd.heartbeat,
      bytes: encodeFrame(WireCmd.heartbeat),
      note: "空体",
    };
  }
  if (cmd === Cmd.login) {
    const uid = readUid(msg.data);
    const nowSec = readNowSec(msg.data);
    const channel = readLoginText(msg.data, "channel");
    const device = readLoginText(msg.data, "device");
    const body = encodeObservedLoginBody(uid, nowSec, { channel, device });
    const uidNote = uid === null ? "字段2未写" : "字段2=" + uid;
    return {
      cmdId: WireCmd.login,
      bytes: encodeFrame(WireCmd.login, body),
      note:
        "字段1=" +
        LOGIN_FIELD1 +
        " " +
        uidNote +
        " 字段3=" +
        LOGIN_FIELD3 +
        " 字段5=" +
        Math.floor(nowSec) +
        " 字段6=" +
        observedLoginDevice(device) +
        " 字段7=" +
        observedLoginChannel(channel),
    };
  }
  if (cmd === "wire.2001") {
    return {
      cmdId: WireCmd.roleProfile,
      bytes: encodeFrame(WireCmd.roleProfile),
      note: "空体",
    };
  }
  if (cmd === "wire.5001") {
    return {
      cmdId: WireCmd.backpackList,
      bytes: encodeFrame(WireCmd.backpackList),
      note: "空体",
    };
  }
  if (cmd === "wire.3007") {
    return {
      cmdId: WireCmd.chapterData,
      bytes: encodeFrame(WireCmd.chapterData),
      note: "空体",
    };
  }
  if (cmd === WIRE_BATTLE_MATCH_CMD) {
    return {
      cmdId: WireCmd.battleMatch,
      bytes: encodeFrame(WireCmd.battleMatch),
      note: "空体",
    };
  }
  if (cmd === WIRE_CHAPTER_REWARD_CMD) {
    return {
      cmdId: WireCmd.chapterRewardList,
      bytes: encodeFrame(WireCmd.chapterRewardList),
      note: "空体",
    };
  }
  if (cmd === WIRE_QUICK_BATTLE_CMD) {
    return {
      cmdId: WireCmd.quickBattleInit,
      bytes: encodeFrame(WireCmd.quickBattleInit),
      note: "空体",
    };
  }
  if (cmd === WIRE_CHAPTER_REPORT_CMD) {
    const query = readWireChapterReportQuery(msg.data);
    return {
      cmdId: WireCmd.chapterReport,
      bytes: encodeFrame(WireCmd.chapterReport, encodeWireChapterReportBody(query.chapterIdx, query.firstPos)),
      note: "chapterIdx=" + query.chapterIdx + " firstPos=" + query.firstPos,
    };
  }
  if (cmd === WIRE_BATTLE_REPORT_CMD) {
    const query = readWireBattleReportQuery(msg.data);
    return {
      cmdId: WireCmd.battleReport,
      bytes: encodeFrame(WireCmd.battleReport, encodeWireBattleReportBody(query.battleId, query.type)),
      note: "battle_id=" + query.battleId + " type=" + query.type,
    };
  }
  if (cmd === WIRE_PRECOMPUTE_CMD) {
    const query = readWirePreComputeQuery(msg.data);
    const body = encodeWirePreComputeBody(query);
    const note = query.shell
      ? "空壳"
      : "hero_ids=" + query.heroIds.join(",") + " type=" + (query.type === null ? "无" : query.type) + " line_up_type=" + (query.lineUpType === null ? "无" : String(query.lineUpType));
    return {
      cmdId: WireCmd.preComputeStrength,
      bytes: encodeFrame(WireCmd.preComputeStrength, body),
      note,
    };
  }
  if (cmd === WIRE_STUDY_CMD) {
    const query = readWireStudyQuery(msg.data);
    if (!query) return null;
    return {
      cmdId: WireCmd.study,
      bytes: encodeFrame(WireCmd.study, encodeWireStudyBody(query.type, query.opponentId, query.serverId)),
      note: "type=" + query.type + " opponent_id=" + query.opponentId + " server_id=" + query.serverId,
    };
  }
  if (cmd === WIRE_GM_CMD) {
    const query = readWireGmCommand(msg.data);
    if (!query) return null;
    const body = query.command === WIRE_GM_COMMAND ? encodeWireGmCommandBody(query) : encodeWireGmGenericBody(query);
    if (!body) return null;
    return {
      cmdId: WireCmd.gmCommand,
      bytes: encodeFrame(WireCmd.gmCommand, body),
      note: "command=" + query.command + " param=" + query.params.join(","),
    };
  }
  if (cmd === WIRE_LINEUP_SAVE_CMD) {
    const many = readWireLineUpSaveMany(msg.data);
    if (many) {
      const packed = encodeWireLineUpSaveHeroes(many);
      if (!packed) return null;
      const ids: string[] = [];
      for (let i = 0; i < many.heroes.length; i++) ids.push(String(many.heroes[i].heroId));
      return {
        cmdId: WireCmd.lineUpSave,
        bytes: encodeFrame(WireCmd.lineUpSave, packed),
        note: "heroes=" + ids.join(",") + " formation_id=1",
      };
    }
    const query = readWireLineUpSave(msg.data);
    if (!query) return null;
    const body = encodeWireLineUpSaveBody(query);
    if (!body) return null;
    return {
      cmdId: WireCmd.lineUpSave,
      bytes: encodeFrame(WireCmd.lineUpSave, body),
      note: "hero_id=" + query.heroId + " position=" + query.position,
    };
  }
  if (cmd === "wire.3004") {
    return {
      cmdId: WireCmd.chapterItemList,
      bytes: encodeFrame(WireCmd.chapterItemList),
      note: "空体",
    };
  }
  if (cmd === "wire.3005") {
    return {
      cmdId: WireCmd.chapterItemReward,
      bytes: encodeFrame(WireCmd.chapterItemReward),
      note: "空体",
    };
  }
  if (cmd === "wire.15000") {
    return {
      cmdId: WireCmd.mailList,
      bytes: encodeFrame(WireCmd.mailList),
      note: "空体",
    };
  }
  if (cmd === WIRE_HERO_CMD) {
    const page = readWireHeroPage(msg.data);
    return {
      cmdId: WireCmd.heroList,
      bytes: encodeFrame(WireCmd.heroList, encodeWireHeroListBody(page)),
      note: "page=" + page,
    };
  }
  if (cmd === WIRE_ACTIVITY_CMD) {
    return {
      cmdId: WireCmd.buyGoldList,
      bytes: encodeFrame(WireCmd.buyGoldList),
      note: "空体",
    };
  }
  if (cmd === WIRE_ACHIEVEMENT_CMD) {
    return {
      cmdId: WireCmd.achievementList,
      bytes: encodeFrame(WireCmd.achievementList),
      note: "空体",
    };
  }
  if (cmd === WIRE_PVP_CMD) {
    return {
      cmdId: WireCmd.pvpData,
      bytes: encodeFrame(WireCmd.pvpData),
      note: "空体",
    };
  }
  if (cmd === WIRE_SEVEN_CMD) {
    return {
      cmdId: WireCmd.sevenDayLogin,
      bytes: encodeFrame(WireCmd.sevenDayLogin),
      note: "空体",
    };
  }
  if (cmd === WIRE_GOAL7_CMD) {
    return {
      cmdId: WireCmd.sevenDayTarget,
      bytes: encodeFrame(WireCmd.sevenDayTarget),
      note: "空体",
    };
  }
  if (cmd === WIRE_WISH_CMD) {
    return {
      cmdId: WireCmd.blessingPool,
      bytes: encodeFrame(WireCmd.blessingPool),
      note: "空体",
    };
  }
  if (cmd === WIRE_SUMMON_CMD) {
    return {
      cmdId: WireCmd.heroSummonCount,
      bytes: encodeFrame(WireCmd.heroSummonCount),
      note: "空体",
    };
  }
  if (cmd === WIRE_PROPHET_CMD) {
    return {
      cmdId: WireCmd.prophetSummon,
      bytes: encodeFrame(WireCmd.prophetSummon),
      note: "空体",
    };
  }
  if (cmd === WIRE_JEWEL_CMD) {
    return {
      cmdId: WireCmd.heroJewel,
      bytes: encodeFrame(WireCmd.heroJewel),
      note: "空体",
    };
  }
  if (cmd === WIRE_ILLUSTRAT_CMD) {
    return {
      cmdId: WireCmd.illustratReward,
      bytes: encodeFrame(WireCmd.illustratReward),
      note: "空体",
    };
  }
  if (cmd === WIRE_PET_CMD) {
    return {
      cmdId: WireCmd.petInfoList,
      bytes: encodeFrame(WireCmd.petInfoList),
      note: "空体",
    };
  }
  if (cmd === WIRE_WORLD_CMD) {
    return {
      cmdId: WireCmd.worldLevel,
      bytes: encodeFrame(WireCmd.worldLevel),
      note: "空体",
    };
  }
  if (cmd === WIRE_PROMOTION_CMD) {
    return {
      cmdId: WireCmd.promotionList,
      bytes: encodeFrame(WireCmd.promotionList),
      note: "空体",
    };
  }
  if (cmd === WIRE_FIRST_CMD) {
    return {
      cmdId: WireCmd.firstRecharge,
      bytes: encodeFrame(WireCmd.firstRecharge),
      note: "空体",
    };
  }
  if (cmd === WIRE_REIKI_CMD) {
    return {
      cmdId: WireCmd.reikiEquipData,
      bytes: encodeFrame(WireCmd.reikiEquipData),
      note: "空体",
    };
  }
  if (cmd === WIRE_ISLANDS_CMD) {
    return {
      cmdId: WireCmd.floatingIslandsTime,
      bytes: encodeFrame(WireCmd.floatingIslandsTime),
      note: "空体",
    };
  }
  if (cmd === WIRE_TOTEMS_CMD) {
    return {
      cmdId: WireCmd.totemsInfoList,
      bytes: encodeFrame(WireCmd.totemsInfoList),
      note: "空体",
    };
  }
  if (cmd === WIRE_ASTROLABE_CMD) {
    return {
      cmdId: WireCmd.astrolabeData,
      bytes: encodeFrame(WireCmd.astrolabeData),
      note: "空体",
    };
  }
  if (cmd === WIRE_CUBE_CMD) {
    return {
      cmdId: WireCmd.tweakCubeData,
      bytes: encodeFrame(WireCmd.tweakCubeData),
      note: "空体",
    };
  }
  if (cmd === WIRE_DRAGON_CMD) {
    return {
      cmdId: WireCmd.dragonScan,
      bytes: encodeFrame(WireCmd.dragonScan),
      note: "空体",
    };
  }
  if (cmd === WIRE_DRAGON_COLLECTION_CMD) {
    return {
      cmdId: WireCmd.dragonCollection,
      bytes: encodeFrame(WireCmd.dragonCollection),
      note: "空体",
    };
  }
  if (cmd === WIRE_TITLE_CMD) {
    return {
      cmdId: WireCmd.scanTitleList,
      bytes: encodeFrame(WireCmd.scanTitleList),
      note: "空体",
    };
  }
  if (cmd === WIRE_HEAD_PORTRAIT_CMD) {
    return {
      cmdId: WireCmd.headPortraitList,
      bytes: encodeFrame(WireCmd.headPortraitList),
      note: "空体",
    };
  }
  if (cmd === WIRE_BORDER_CMD) {
    return {
      cmdId: WireCmd.borderData,
      bytes: encodeFrame(WireCmd.borderData),
      note: "空体",
    };
  }
  if (cmd === WIRE_FASHION_CMD) {
    return {
      cmdId: WireCmd.heroFashionList,
      bytes: encodeFrame(WireCmd.heroFashionList),
      note: "空体",
    };
  }
  if (cmd === WIRE_WORN_FASHION_CMD) {
    return {
      cmdId: WireCmd.heroFashion,
      bytes: encodeFrame(WireCmd.heroFashion),
      note: "空体",
    };
  }
  if (cmd === WIRE_HERO_PRAYER_CMD) {
    return {
      cmdId: WireCmd.heroPrayerData,
      bytes: encodeFrame(WireCmd.heroPrayerData),
      note: "空体",
    };
  }
  if (cmd === WIRE_PET_ILLUSTRATE_CMD) {
    return {
      cmdId: WireCmd.petIllustrate,
      bytes: encodeFrame(WireCmd.petIllustrate),
      note: "空体",
    };
  }
  if (cmd === WIRE_FETTER_CMD) {
    return {
      cmdId: WireCmd.fetterList,
      bytes: encodeFrame(WireCmd.fetterList),
      note: "空体",
    };
  }
  if (cmd === WIRE_FETTER_FASHION_CMD) {
    return {
      cmdId: WireCmd.fetterFashion,
      bytes: encodeFrame(WireCmd.fetterFashion),
      note: "空体",
    };
  }
  if (cmd === WIRE_SHENBIN_CMD) {
    return {
      cmdId: WireCmd.shenBin,
      bytes: encodeFrame(WireCmd.shenBin),
      note: "空体",
    };
  }
  if (cmd === WIRE_OCCUPATION_CMD) {
    return {
      cmdId: WireCmd.occupation,
      bytes: encodeFrame(WireCmd.occupation),
      note: "空体",
    };
  }
  if (cmd === WIRE_ROLE_SHENBIN_CMD) {
    return {
      cmdId: WireCmd.roleShenBin,
      bytes: encodeFrame(WireCmd.roleShenBin),
      note: "空体",
    };
  }
  if (cmd === WIRE_FETTER_CONTRACT_CMD) {
    return {
      cmdId: WireCmd.fetterContract,
      bytes: encodeFrame(WireCmd.fetterContract),
      note: "空体",
    };
  }
  if (cmd === WIRE_FORMATION_CMD) {
    return {
      cmdId: WireCmd.formation,
      bytes: encodeFrame(WireCmd.formation),
      note: "空体",
    };
  }
  if (cmd === WIRE_LINEUP_CMD) {
    return {
      cmdId: WireCmd.lineUp,
      bytes: encodeFrame(WireCmd.lineUp),
      note: "空体",
    };
  }
  if (cmd === WIRE_RUNNING_PROMOTION_CMD) {
    return {
      cmdId: WireCmd.runningPromotion,
      bytes: encodeFrame(WireCmd.runningPromotion),
      note: "空体",
    };
  }
  if (cmd === WIRE_TOWER_REWARD_CMD) {
    return {
      cmdId: WireCmd.towerReward,
      bytes: encodeFrame(WireCmd.towerReward),
      note: "空体",
    };
  }
  if (cmd === WIRE_HERO_LEVEL_RESET_TIMES_CMD) {
    return {
      cmdId: WireCmd.heroLevelResetTimes,
      bytes: encodeFrame(WireCmd.heroLevelResetTimes),
      note: "空体",
    };
  }
  if (cmd === WIRE_SIGN_IN_LIST_CMD) {
    return {
      cmdId: WireCmd.signInList,
      bytes: encodeFrame(WireCmd.signInList),
      note: "空体",
    };
  }
  if (cmd === WIRE_DAILY_TASK_LIST_CMD) {
    return {
      cmdId: WireCmd.dailyTaskList,
      bytes: encodeFrame(WireCmd.dailyTaskList),
      note: "空体",
    };
  }
  if (cmd === WIRE_DAILY_WELFARE_LIST_CMD) {
    return {
      cmdId: WireCmd.dailyWelfareList,
      bytes: encodeFrame(WireCmd.dailyWelfareList),
      note: "空体",
    };
  }
  if (cmd === WIRE_MOUTH_WELFARE_LIST_CMD) {
    return {
      cmdId: WireCmd.mouthWelfareList,
      bytes: encodeFrame(WireCmd.mouthWelfareList),
      note: "空体",
    };
  }
  if (cmd === WIRE_WEEKEND_GIFT_CMD) {
    return {
      cmdId: WireCmd.weekendGift,
      bytes: encodeFrame(WireCmd.weekendGift),
      note: "空体",
    };
  }
  if (cmd === WIRE_GOD_RELIC_CMD) {
    return {
      cmdId: WireCmd.godRelic,
      bytes: encodeFrame(WireCmd.godRelic),
      note: "空体",
    };
  }
  if (cmd === WIRE_HERO_PALACE_CMD) {
    return {
      cmdId: WireCmd.heroPalace,
      bytes: encodeFrame(WireCmd.heroPalace),
      note: "空体",
    };
  }
  if (cmd === WIRE_RECHARGE_DAYS_B_CMD) {
    return {
      cmdId: WireCmd.rechargeDaysB,
      bytes: encodeFrame(WireCmd.rechargeDaysB),
      note: "空体",
    };
  }
  if (cmd === WIRE_TIME_TOWER_CMD) {
    return {
      cmdId: WireCmd.timeTower,
      bytes: encodeFrame(WireCmd.timeTower),
      note: "空体",
    };
  }
  if (cmd === WIRE_SPACE_TIME_ADVENTURE_CMD) {
    return {
      cmdId: WireCmd.spaceTimeAdventure,
      bytes: encodeFrame(WireCmd.spaceTimeAdventure),
      note: "空体",
    };
  }
  if (cmd === WIRE_MAGIC_TOWER_ROAD_CMD) {
    return {
      cmdId: WireCmd.magicTowerRoad,
      bytes: encodeFrame(WireCmd.magicTowerRoad),
      note: "空体",
    };
  }
  if (cmd === WIRE_QI_SHEN_QI_CMD) {
    return {
      cmdId: WireCmd.qiShenQi,
      bytes: encodeFrame(WireCmd.qiShenQi),
      note: "空体",
    };
  }
  if (cmd === WIRE_ZHU_SHEN_JI_TAN_CMD) {
    return {
      cmdId: WireCmd.zhuShenJiTan,
      bytes: encodeFrame(WireCmd.zhuShenJiTan),
      note: "空体",
    };
  }
  if (cmd === WIRE_MID_FOOD_CMD) {
    return {
      cmdId: WireCmd.midFood,
      bytes: encodeFrame(WireCmd.midFood),
      note: "空体",
    };
  }
  if (cmd === WIRE_QIU_SHANG_MING_YUE_CMD) {
    return {
      cmdId: WireCmd.qiuShangMingYue,
      bytes: encodeFrame(WireCmd.qiuShangMingYue),
      note: "空体",
    };
  }
  if (cmd === WIRE_WAN_SHENG_LOTTERY_CMD) {
    return {
      cmdId: WireCmd.wanShengLottery,
      bytes: encodeFrame(WireCmd.wanShengLottery),
      note: "空体",
    };
  }
  if (cmd === WIRE_HEI_WU_MISSION_CMD) {
    return {
      cmdId: WireCmd.heiWuMission,
      bytes: encodeFrame(WireCmd.heiWuMission),
      note: "空体",
    };
  }
  if (cmd === WIRE_CHRISTMAS_GIFT_CMD) {
    return {
      cmdId: WireCmd.christmasGift,
      bytes: encodeFrame(WireCmd.christmasGift),
      note: "空体",
    };
  }
  if (cmd === WIRE_SPRING_OUTING_CMD) {
    return {
      cmdId: WireCmd.springOuting,
      bytes: encodeFrame(WireCmd.springOuting),
      note: "空体",
    };
  }
  if (cmd === WIRE_CHRISTMAS_MISSION_CMD) {
    return {
      cmdId: WireCmd.christmasMission,
      bytes: encodeFrame(WireCmd.christmasMission),
      note: "空体",
    };
  }
  if (cmd === WIRE_MAGIC_TOWER_LEVEL_RANK_CMD) {
    return {
      cmdId: WireCmd.magicTowerLevelRank,
      bytes: encodeFrame(WireCmd.magicTowerLevelRank),
      note: "空体",
    };
  }
  if (cmd === WIRE_SPRING_OUTING_GRID_CMD) {
    return {
      cmdId: WireCmd.springOutingGrid,
      bytes: encodeFrame(WireCmd.springOutingGrid),
      note: "空体",
    };
  }
  if (cmd === Cmd.roleCreate) {
    const name = readName(msg.data);
    const body = encodeObservedCreateBody(name);
    if (!body) return null;
    return {
      cmdId: WireCmd.roleCreate,
      bytes: encodeFrame(WireCmd.roleCreate, body),
      note: "字段1名字 字段2=0 字段3=2 字段4=" + CREATE_PLACE + " 字段5=" + LOGIN_CHANNEL,
    };
  }
  return null;
}

export function decodeProtoFields(body: Uint8Array): ProtoField[] | null {
  const fields: ProtoField[] = [];
  let i = 0;
  while (i < body.length) {
    const key = readVarint(body, i);
    if (!key) return null;
    const field = key.value >>> 3;
    const wt = key.value & 7;
    i = key.next;
    if (field <= 0) return null;
    if (wt === 0) {
      const val = readVarint(body, i);
      if (!val) return null;
      fields.push({ field, kind: "varint", varint: val.value });
      i = val.next;
      continue;
    }
    if (wt === 2) {
      const len = readVarint(body, i);
      if (!len || i < 0) return null;
      i = len.next;
      if (len.value < 0 || i + len.value > body.length) return null;
      const blob = body.slice(i, i + len.value);
      i += len.value;
      const text = decodeUtf8(blob);
      if (text !== null) fields.push({ field, kind: "string", text });
      else fields.push({ field, kind: "bytes", hex: bytesToHex(blob, 24) });
      continue;
    }
    return null;
  }
  return fields;
}

export function varintField(fields: ProtoField[] | null, field: number): number | null {
  if (!fields) return null;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === field && row.kind === "varint" && typeof row.varint === "number") return row.varint;
  }
  return null;
}

export function formatProtoFields(fields: ProtoField[]): string {
  const parts: string[] = [];
  for (let i = 0; i < fields.length && i < 8; i++) {
    const row = fields[i];
    if (row.kind === "varint") parts.push("字段" + row.field + "=" + row.varint);
    else if (row.kind === "string") parts.push("字段" + row.field + "=" + row.text);
    else parts.push("字段" + row.field + "=" + row.hex);
  }
  if (fields.length > 8) parts.push("…");
  return parts.join(" ");
}

export function wireBody(data: unknown): Uint8Array {
  if (data && typeof data === "object") {
    const body = (data as { body?: unknown }).body;
    if (body instanceof Uint8Array) return body;
  }
  return new Uint8Array(0);
}

export function summarizeLoginReply(body: Uint8Array): LoginReplySummary {
  if (body.length === 0) {
    return {
      empty: true,
      roleId: null,
      status: "登录回包是空的",
      detail: "日志里空的 1001 表示还没有角色。点创角发 1002。有角色才会进主城。",
    };
  }
  const fields = decodeProtoFields(body);
  const roleId = varintField(fields, 1);
  const time = varintField(fields, 2);
  const tz = varintField(fields, 4);
  const bits: string[] = ["体长 " + body.length];
  if (roleId !== null) bits.push("字段1=" + roleId);
  if (time !== null) bits.push("字段2=" + time);
  if (tz !== null) bits.push("字段4=" + tz);
  const ready = roleId !== null && roleId > 0;
  bits.push(ready ? "进入主城" : "没有角色 id，不进主城");
  return {
    empty: false,
    roleId,
    status: ready ? "登录回包 角色 " + roleId : "登录回包 1001",
    detail: bits.join(" "),
  };
}

export function summarizeCreateReply(body: Uint8Array): { roleId: number | null; status: string } {
  const roleId = varintField(decodeProtoFields(body), 1);
  if (roleId === null) return { roleId: null, status: "创角回包 1002 体长 " + body.length };
  return { roleId, status: "创角回包 角色 " + roleId };
}

function readUid(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as { uid?: unknown; account?: unknown; platformId?: unknown };
  if (typeof raw.uid === "number" && Number.isSafeInteger(raw.uid) && raw.uid > 0) return raw.uid;
  const account = typeof raw.account === "string" ? raw.account : "";
  const platformId = typeof raw.platformId === "string" ? raw.platformId : "";
  if (account || platformId) return resolveLoginUid(account, platformId);
  return null;
}

function readLoginText(data: unknown, key: "channel" | "device"): string {
  if (!data || typeof data !== "object") return "";
  const value = (data as { channel?: unknown; device?: unknown })[key];
  return typeof value === "string" ? value : "";
}

function readNowSec(data: unknown): number {
  if (data && typeof data === "object") {
    const nowSec = (data as { nowSec?: unknown }).nowSec;
    if (typeof nowSec === "number" && Number.isFinite(nowSec)) return Math.floor(nowSec);
  }
  return Math.floor(Date.now() / 1000);
}

function readName(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const name = (data as { name?: unknown }).name;
  return typeof name === "string" ? name : "";
}

function pushVarintField(parts: number[], field: number, value: number): void {
  pushVarint(parts, (field << 3) | 0);
  pushVarint(parts, value);
}

function pushString(parts: number[], field: number, text: string): void {
  const bytes = utf8(text);
  pushVarint(parts, (field << 3) | 2);
  pushVarint(parts, bytes.length);
  for (let i = 0; i < bytes.length; i++) parts.push(bytes[i]);
}

function pushVarint(parts: number[], value: number): void {
  let n = Math.floor(value);
  if (n < 0) n = 0;
  while (n > 127) {
    parts.push((n & 0x7f) | 0x80);
    n = Math.floor(n / 128);
  }
  parts.push(n);
}

function readVarint(body: Uint8Array, offset: number): { value: number; next: number } | null {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (i < body.length && shift <= 49) {
    const b = body[i];
    i += 1;
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) {
      if (!Number.isSafeInteger(value)) return null;
      return { value, next: i };
    }
    shift += 7;
  }
  return null;
}

function utf8(text: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text);
  const parts: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let c = text.charCodeAt(i);
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        c = 0x10000 + ((c - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      }
    }
    if (c < 0x80) parts.push(c);
    else if (c < 0x800) parts.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c < 0x10000) parts.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    else parts.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return Uint8Array.from(parts);
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    if (typeof TextDecoder !== "undefined") {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return text;
    }
  } catch (_err) {
    return null;
  }
  let out = "";
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
      continue;
    }
    return null;
  }
  return out;
}
