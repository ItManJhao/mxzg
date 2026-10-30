# Asset batch: login + city (PR-A)

Generated 2026-10-21 Asia/Hong_Kong.

Source root: `idle/res/hd/ccbi-res` (+ `idle/res/hd/font` for TTF).
Target root: `client/assets/resources/`.
Tool: `client/tools/extract_pvr_atlas.py` (CCZ zlib + legacy PVR RGBA8888 + plist format 2/3).

## Fonts

| file | status | notes |
| --- | --- | --- |
| `CloudYuanCuGBK.ttf` | **included** | `idle/res/hd/font/CloudYuanCuGBK.ttf` → `client/assets/resources/font/CloudYuanCuGBK.ttf` |
| `STZhongsong.ttf` | **still missing** | not in idle/res. **P0 substitute remains `FZCSJW-GB1-0.ttf`** (already in repo). |
| `FZCSJW-GB1-0.ttf` | in repo (not this zip) | P0 default CJK UI font |

## Protected .meta / PNG (do NOT overwrite — #66 九宫格)

These five already have correct 九宫格 `.meta` borders on main via PR #66. This pack **does not** ship replacement PNG or `.meta` for them:

- `ui/common/button_btn-blue-big-1.png` (+ `.meta`)
- `ui/common/button_btn-blue.png` (+ `.meta`)
- `ui/common/button_btn-green-big-1.png` (+ `.meta`)
- `ui/common/button_btn-orange-big-1.png` (+ `.meta`)
- `ui/common/win-bg_win-bg-12.png` (+ `.meta`)

## Excluded from this pack

- `ui/battle/`, `ui/battle-kor/` (separate PVR batch)
- play `map-bg` / `promotion-bg` batch
- No `.meta` files — open in Cocos Creator 3.8.8 to generate (except never replace the five above).

## Atlas → path map

| atlas (ccbi-res) | new folder | frames in pack |
| --- | --- | ---: |
| `logo-scene` | `ui/login/` | 11 |
| `main-scene` | `ui/city/` | 27 |
| `main-scene-lang` | `ui/city/` | 10 |
| `main-city` | `ui/city/` | 105 |
| `main-city-effect` | `ui/city/` | 89 |
| `main-scene-effect` | `ui/city/` | 25 |
| `main-scene-effect-2` | `ui/city/` | 10 |
| `common-ui` | `ui/common/` | 34 |
| `common-ui-2` (tight chrome whitelist) | `ui/common/` | 110 |
| font `CloudYuanCuGBK.ttf` | `font/` | 1 |

### ui/login

| file |
| --- |
| `ui/login/logo-scene_btn-change-account.png` |
| `ui/login/logo-scene_btn-notice.png` |
| `ui/login/logo-scene_btn-service.png` |
| `ui/login/logo-scene_btn-start-game-1.png` |
| `ui/login/logo-scene_btn-start-game-2.png` |
| `ui/login/logo-scene_btn-switchlanguage.png` |
| `ui/login/logo-scene_btn-user.png` |
| `ui/login/logo-scene_spr-logo.png` |
| `ui/login/logo-scene_spr-parttern-l.png` |
| `ui/login/logo-scene_spr-parttern-r.png` |
| `ui/login/logo-scene_spr-server-bg.png` |

### ui/city (new vs main)

| file | atlas |
| --- | --- |
| `ui/city/main-scene_btn-mission-1.png` | `main-scene` |
| `ui/city/main-scene_completed.png` | `main-scene` |
| `ui/city/main-scene_progress-AFK-bg.png` | `main-scene` |
| `ui/city/main-scene_progress-AFK.png` | `main-scene` |
| `ui/city/main-scene_progress-exp-bg.png` | `main-scene` |
| `ui/city/main-scene_progress-exp.png` | `main-scene` |
| `ui/city/main-scene_progress-hangs-bg.png` | `main-scene` |
| `ui/city/main-scene_progress-hangs.png` | `main-scene` |
| `ui/city/main-scene_progress-role-exp-bg.png` | `main-scene` |
| `ui/city/main-scene_progress-role-exp.png` | `main-scene` |
| `ui/city/main-scene_scale-bar-1.png` | `main-scene` |
| `ui/city/main-scene_scale-bar-2.png` | `main-scene` |
| `ui/city/main-scene_skill-num-bg.png` | `main-scene` |
| `ui/city/main-scene_spot.png` | `main-scene` |
| `ui/city/main-scene_spr-box-2.png` | `main-scene` |
| `ui/city/main-scene_spr-bubble.png` | `main-scene` |
| `ui/city/main-scene_spr-cell-title.png` | `main-scene` |
| `ui/city/main-scene_spr-drop-1.png` | `main-scene` |
| `ui/city/main-scene_spr-estimated-bg.png` | `main-scene` |
| `ui/city/main-scene_spr-fetter.png` | `main-scene` |
| `ui/city/main-scene_spr-fetters-unlock.png` | `main-scene` |
| `ui/city/main-scene_spr-map-frame-1.png` | `main-scene` |
| `ui/city/main-scene_spr-progress-AFK-bg.png` | `main-scene` |
| `ui/city/main-scene_spr-skin.png` | `main-scene` |
| `ui/city/main-scene_spr-up-bg.png` | `main-scene` |
| `ui/city/main-scene_star.png` | `main-scene` |
| `ui/city/main-scene_time_bg.png` | `main-scene` |
| `ui/city/main-scene-lang_btn-reward-1.png` | `main-scene-lang` |
| `ui/city/main-scene-lang_btn-world.png` | `main-scene-lang` |
| `ui/city/main-scene-lang_lbl-clan.png` | `main-scene-lang` |
| `ui/city/main-scene-lang_lbl-fetter.png` | `main-scene-lang` |
| `ui/city/main-scene-lang_lbl-fetters-unlock.png` | `main-scene-lang` |
| `ui/city/main-scene-lang_lbl-map-1.png` | `main-scene-lang` |
| `ui/city/main-scene-lang_lbl-skin.png` | `main-scene-lang` |
| `ui/city/main-scene-lang_spr-clan-2.png` | `main-scene-lang` |
| `ui/city/main-scene-lang_spr-skin-2.png` | `main-scene-lang` |
| `ui/city/main-scene-lang_spr-skin.png` | `main-scene-lang` |
| `ui/city/main-city_20-0.png` | `main-city` |
| `ui/city/main-city_20-1.png` | `main-city` |
| `ui/city/main-city_20-10.png` | `main-city` |
| `ui/city/main-city_20-11.png` | `main-city` |
| `ui/city/main-city_20-12.png` | `main-city` |
| `ui/city/main-city_20-2.png` | `main-city` |
| `ui/city/main-city_20-3.png` | `main-city` |
| `ui/city/main-city_20-4.png` | `main-city` |
| `ui/city/main-city_20-5.png` | `main-city` |
| `ui/city/main-city_20-6.png` | `main-city` |
| `ui/city/main-city_20-7.png` | `main-city` |
| `ui/city/main-city_20-8.png` | `main-city` |
| `ui/city/main-city_20-9.png` | `main-city` |
| `ui/city/main-city_btn-chat-1.png` | `main-city` |
| `ui/city/main-city_btn-discuss.png` | `main-city` |
| `ui/city/main-city_btn-friend-1.png` | `main-city` |
| `ui/city/main-city_btn-hero-recommend-1.png` | `main-city` |
| `ui/city/main-city_btn-login-1.png` | `main-city` |
| `ui/city/main-city_btn-login-8.png` | `main-city` |
| `ui/city/main-city_btn-mail-1.png` | `main-city` |
| `ui/city/main-city_btn-main-video-studio.png` | `main-city` |
| `ui/city/main-city_btn-mian-storage-lower.png` | `main-city` |
| `ui/city/main-city_btn-mian-storage-up.png` | `main-city` |
| `ui/city/main-city_btn-rank-1.png` | `main-city` |
| `ui/city/main-city_btn-unfold-1.png` | `main-city` |
| `ui/city/main-city_btn-unfold-2.png` | `main-city` |
| `ui/city/main-city_facebook.png` | `main-city` |
| `ui/city/main-city_icon-act_achievement.png` | `main-city` |
| `ui/city/main-city_icon-act_advance_announce.png` | `main-city` |
| `ui/city/main-city_icon-act_adven_note.png` | `main-city` |
| `ui/city/main-city_icon-act_appreciate_moon.png` | `main-city` |
| `ui/city/main-city_icon-act_black_friday.png` | `main-city` |
| `ui/city/main-city_icon-act_buy_fashion.png` | `main-city` |
| `ui/city/main-city_icon-act_christmas.png` | `main-city` |
| `ui/city/main-city_icon-act_clan_boss.png` | `main-city` |
| `ui/city/main-city_icon-act_clan_gvg.png` | `main-city` |
| `ui/city/main-city_icon-act_day_first_recharge.png` | `main-city` |
| `ui/city/main-city_icon-act_develop_gift_activity.png` | `main-city` |
| `ui/city/main-city_icon-act_festival_gift.png` | `main-city` |
| `ui/city/main-city_icon-act_halloween.png` | `main-city` |
| `ui/city/main-city_icon-act_happy_month.png` | `main-city` |
| `ui/city/main-city_icon-act_hero_arrive.png` | `main-city` |
| `ui/city/main-city_icon-act_limit_gift.png` | `main-city` |
| `ui/city/main-city_icon-act_limit_time_activity.png` | `main-city` |
| `ui/city/main-city_icon-act_limit_time_server.png` | `main-city` |
| `ui/city/main-city_icon-act_limit_time_server_2.png` | `main-city` |
| `ui/city/main-city_icon-act_mid_autumn.png` | `main-city` |
| `ui/city/main-city_icon-act_month_invest.png` | `main-city` |
| `ui/city/main-city_icon-act_mystery_box.png` | `main-city` |
| `ui/city/main-city_icon-act_new_server_limit_activity.png` | `main-city` |
| `ui/city/main-city_icon-act_new_year.png` | `main-city` |
| `ui/city/main-city_icon-act_privilege.png` | `main-city` |
| `ui/city/main-city_icon-act_recharge.png` | `main-city` |
| `ui/city/main-city_icon-act_recharge_first.png` | `main-city` |
| `ui/city/main-city_icon-act_secret_treasure.png` | `main-city` |
| `ui/city/main-city_icon-act_seven_artifact.png` | `main-city` |
| `ui/city/main-city_icon-act_sevent_day_christmass_gift.png` | `main-city` |
| `ui/city/main-city_icon-act_sevent_day_gift.png` | `main-city` |
| `ui/city/main-city_icon-act_sevent_day_target.png` | `main-city` |
| `ui/city/main-city_icon-act_spring.png` | `main-city` |
| `ui/city/main-city_icon-act_supre_gift.png` | `main-city` |
| `ui/city/main-city_icon-act_war_order.png` | `main-city` |
| `ui/city/main-city_icon-act_welfare.png` | `main-city` |
| `ui/city/main-city_icon-main_altar.png` | `main-city` |
| `ui/city/main-city_icon-main_ancient.png` | `main-city` |
| `ui/city/main-city_icon-main_black_market.png` | `main-city` |
| `ui/city/main-city_icon-main_champion.png` | `main-city` |
| `ui/city/main-city_icon-main_champion_cross.png` | `main-city` |
| `ui/city/main-city_icon-main_clan.png` | `main-city` |
| `ui/city/main-city_icon-main_crusade_group.png` | `main-city` |
| `ui/city/main-city_icon-main_dream.png` | `main-city` |
| `ui/city/main-city_icon-main_dungeon.png` | `main-city` |
| `ui/city/main-city_icon-main_exotic_adventure.png` | `main-city` |
| `ui/city/main-city_icon-main_fantasy_land.png` | `main-city` |
| `ui/city/main-city_icon-main_hero_make.png` | `main-city` |
| `ui/city/main-city_icon-main_hero_pernute.png` | `main-city` |
| `ui/city/main-city_icon-main_magic_cube.png` | `main-city` |
| `ui/city/main-city_icon-main_prophet_tree.png` | `main-city` |
| `ui/city/main-city_icon-main_proving_lang.png` | `main-city` |
| `ui/city/main-city_icon-main_pub_task.png` | `main-city` |
| `ui/city/main-city_icon-main_rank.png` | `main-city` |
| `ui/city/main-city_spr-bubble-1.png` | `main-city` |
| `ui/city/main-city_spr-mian-storagebg.png` | `main-city` |
| `ui/city/main-city_spr-time-bg.png` | `main-city` |
| `ui/city/main-city_spr-tip-summon.png` | `main-city` |
| `ui/city/main-city_spr-tip-welfare.png` | `main-city` |
| `ui/city/main-city_up-main_altar.png` | `main-city` |
| `ui/city/main-city_up-main_black_market.png` | `main-city` |
| `ui/city/main-city_up-main_blessingpool.png` | `main-city` |
| `ui/city/main-city_up-main_crusade_group.png` | `main-city` |
| `ui/city/main-city_up-main_dungeon.png` | `main-city` |
| `ui/city/main-city_up-main_fantasy_land.png` | `main-city` |
| `ui/city/main-city_up-main_fantasy_tower.png` | `main-city` |
| `ui/city/main-city_up-main_hero_make.png` | `main-city` |
| `ui/city/main-city_up-main_hero_palace.png` | `main-city` |
| `ui/city/main-city_up-main_hero_pernute.png` | `main-city` |
| `ui/city/main-city_up-main_prophet_tree.png` | `main-city` |
| `ui/city/main-city_up-main_proving_lang.png` | `main-city` |
| `ui/city/main-city_up-main_pub_task.png` | `main-city` |
| `ui/city/main-city_up-main_pvp.png` | `main-city` |
| `ui/city/main-city_up-main_rank.png` | `main-city` |
| `ui/city/main-city_up-main_shop.png` | `main-city` |
| `ui/city/main-city_up-main_smith_shop.png` | `main-city` |
| `ui/city/main-city_up-main_summon.png` | `main-city` |
| `ui/city/main-city_yxjl.png` | `main-city` |
| `ui/city/main-city-effect_15-0.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-1.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-10.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-11.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-12.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-13.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-14.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-2.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-3.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-4.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-5.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-6.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-7.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-8.png` | `main-city-effect` |
| `ui/city/main-city-effect_15-9.png` | `main-city-effect` |
| `ui/city/main-city-effect_6-0.png` | `main-city-effect` |
| `ui/city/main-city-effect_6-1.png` | `main-city-effect` |
| `ui/city/main-city-effect_6-2.png` | `main-city-effect` |
| `ui/city/main-city-effect_6-3.png` | `main-city-effect` |
| `ui/city/main-city-effect_6-4.png` | `main-city-effect` |
| `ui/city/main-city-effect_6-5.png` | `main-city-effect` |
| `ui/city/main-city-effect_6-6.png` | `main-city-effect` |
| `ui/city/main-city-effect_6-7.png` | `main-city-effect` |
| `ui/city/main-city-effect_6-8.png` | `main-city-effect` |
| `ui/city/main-city-effect_6-9.png` | `main-city-effect` |
| `ui/city/main-city-effect_crack-0.png` | `main-city-effect` |
| `ui/city/main-city-effect_crack-1.png` | `main-city-effect` |
| `ui/city/main-city-effect_crack-2.png` | `main-city-effect` |
| `ui/city/main-city-effect_crack-3.png` | `main-city-effect` |
| `ui/city/main-city-effect_crack-4.png` | `main-city-effect` |
| `ui/city/main-city-effect_crack-5.png` | `main-city-effect` |
| `ui/city/main-city-effect_crack-6.png` | `main-city-effect` |
| `ui/city/main-city-effect_crack-7.png` | `main-city-effect` |
| `ui/city/main-city-effect_crack-8.png` | `main-city-effect` |
| `ui/city/main-city-effect_crack-9.png` | `main-city-effect` |
| `ui/city/main-city-effect_photosphere-0.png` | `main-city-effect` |
| `ui/city/main-city-effect_photosphere-1.png` | `main-city-effect` |
| `ui/city/main-city-effect_photosphere-2.png` | `main-city-effect` |
| `ui/city/main-city-effect_photosphere-3.png` | `main-city-effect` |
| `ui/city/main-city-effect_photosphere-4.png` | `main-city-effect` |
| `ui/city/main-city-effect_photosphere-5.png` | `main-city-effect` |
| `ui/city/main-city-effect_photosphere-6.png` | `main-city-effect` |
| `ui/city/main-city-effect_photosphere-7.png` | `main-city-effect` |
| `ui/city/main-city-effect_photosphere-8.png` | `main-city-effect` |
| `ui/city/main-city-effect_photosphere-9.png` | `main-city-effect` |
| `ui/city/main-city-effect_portrait-0.png` | `main-city-effect` |
| `ui/city/main-city-effect_portrait-1.png` | `main-city-effect` |
| `ui/city/main-city-effect_portrait-2.png` | `main-city-effect` |
| `ui/city/main-city-effect_portrait-3.png` | `main-city-effect` |
| `ui/city/main-city-effect_portrait-4.png` | `main-city-effect` |
| `ui/city/main-city-effect_portrait-5.png` | `main-city-effect` |
| `ui/city/main-city-effect_portrait-6.png` | `main-city-effect` |
| `ui/city/main-city-effect_portrait-7.png` | `main-city-effect` |
| `ui/city/main-city-effect_portrait-8.png` | `main-city-effect` |
| `ui/city/main-city-effect_portrait-9.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers1-0.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers1-1.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers1-2.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers1-3.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers1-4.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers1-5.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers1-6.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers1-7.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers1-8.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers1-9.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers2-0.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers2-1.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers2-2.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers2-3.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers2-4.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers2-5.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers2-6.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers2-7.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers2-8.png` | `main-city-effect` |
| `ui/city/main-city-effect_rivers2-9.png` | `main-city-effect` |
| `ui/city/main-city-effect_spr-cloud-1.png` | `main-city-effect` |
| `ui/city/main-city-effect_spr-cloud-2.png` | `main-city-effect` |
| `ui/city/main-city-effect_spr-cloud-3.png` | `main-city-effect` |
| `ui/city/main-city-effect_spr-cloud-4.png` | `main-city-effect` |
| `ui/city/main-city-effect_summon-0.png` | `main-city-effect` |
| `ui/city/main-city-effect_summon-1.png` | `main-city-effect` |
| `ui/city/main-city-effect_summon-2.png` | `main-city-effect` |
| `ui/city/main-city-effect_summon-3.png` | `main-city-effect` |
| `ui/city/main-city-effect_summon-4.png` | `main-city-effect` |
| `ui/city/main-city-effect_summon-5.png` | `main-city-effect` |
| `ui/city/main-city-effect_summon-6.png` | `main-city-effect` |
| `ui/city/main-city-effect_summon-7.png` | `main-city-effect` |
| `ui/city/main-city-effect_summon-8.png` | `main-city-effect` |
| `ui/city/main-city-effect_summon-9.png` | `main-city-effect` |
| `ui/city/main-scene-effect_btn-battle-0.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-battle-1.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-battle-2.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-battle-3.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-battle-4.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-battle-5.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-battle-6.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-battle-7.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-battle-8.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-battle-9.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-0.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-1.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-10.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-11.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-12.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-13.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-14.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-2.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-3.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-4.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-5.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-6.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-7.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-8.png` | `main-scene-effect` |
| `ui/city/main-scene-effect_btn-scale-9.png` | `main-scene-effect` |
| `ui/city/main-scene-effect-2_btn-scale-battle-0.png` | `main-scene-effect-2` |
| `ui/city/main-scene-effect-2_btn-scale-battle-1.png` | `main-scene-effect-2` |
| `ui/city/main-scene-effect-2_btn-scale-battle-2.png` | `main-scene-effect-2` |
| `ui/city/main-scene-effect-2_btn-scale-battle-3.png` | `main-scene-effect-2` |
| `ui/city/main-scene-effect-2_btn-scale-battle-4.png` | `main-scene-effect-2` |
| `ui/city/main-scene-effect-2_btn-scale-battle-5.png` | `main-scene-effect-2` |
| `ui/city/main-scene-effect-2_btn-scale-battle-6.png` | `main-scene-effect-2` |
| `ui/city/main-scene-effect-2_btn-scale-battle-7.png` | `main-scene-effect-2` |
| `ui/city/main-scene-effect-2_btn-scale-battle-8.png` | `main-scene-effect-2` |
| `ui/city/main-scene-effect-2_btn-scale-battle-9.png` | `main-scene-effect-2` |

### ui/common (new vs main; protected excluded)

| file | atlas |
| --- | --- |
| `ui/common/button_btn-battle-detail-2.png` | `common-ui` |
| `ui/common/button_btn-battle-detail.png` | `common-ui` |
| `ui/common/button_btn-replay-1.png` | `common-ui` |
| `ui/common/button_btn-replay-3.png` | `common-ui` |
| `ui/common/button_btn-replay-4.png` | `common-ui` |
| `ui/common/button_btn-replay-5.png` | `common-ui` |
| `ui/common/button_btn-report.png` | `common-ui` |
| `ui/common/button_btn-src.png` | `common-ui` |
| `ui/common/button_btn-strategy.png` | `common-ui` |
| `ui/common/button_btn-vs-report.png` | `common-ui` |
| `ui/common/button_btn-world-level.png` | `common-ui` |
| `ui/common/button_spr-spsc.png` | `common-ui` |
| `ui/common/other_hero-recommend-t0.png` | `common-ui` |
| `ui/common/other_hero-recommend-t1.png` | `common-ui` |
| `ui/common/other_hero-recommend-t2.png` | `common-ui` |
| `ui/common/other_lbl-dead.png` | `common-ui` |
| `ui/common/other_spr-aaa.png` | `common-ui` |
| `ui/common/other_spr-activate.png` | `common-ui` |
| `ui/common/other_spr-battle.png` | `common-ui` |
| `ui/common/other_spr-death-1.png` | `common-ui` |
| `ui/common/other_spr-geted.png` | `common-ui` |
| `ui/common/other_spr-go.png` | `common-ui` |
| `ui/common/other_spr-hangxing.png` | `common-ui` |
| `ui/common/other_spr-huitui-k3.png` | `common-ui` |
| `ui/common/other_spr-my-rank.png` | `common-ui` |
| `ui/common/other_spr-power.png` | `common-ui` |
| `ui/common/other_spr-pubtask-1.png` | `common-ui` |
| `ui/common/other_spr-sign-3.png` | `common-ui` |
| `ui/common/other_spr-unlock-1.png` | `common-ui` |
| `ui/common/other_spr-used.png` | `common-ui` |
| `ui/common/other_strong-important.png` | `common-ui` |
| `ui/common/other_tag-hl.png` | `common-ui` |
| `ui/common/other_tag-jp.png` | `common-ui` |
| `ui/common/other_tag-xy.png` | `common-ui` |
| `ui/common/button_btn-battle-1.png` | `common-ui-2` |
| `ui/common/button_btn-battle-2.png` | `common-ui-2` |
| `ui/common/button_btn-battle-switch-3.png` | `common-ui-2` |
| `ui/common/button_btn-check-1.png` | `common-ui-2` |
| `ui/common/button_btn-check-2.png` | `common-ui-2` |
| `ui/common/button_btn-close-3.png` | `common-ui-2` |
| `ui/common/button_btn-close-4.png` | `common-ui-2` |
| `ui/common/button_btn-close-5.png` | `common-ui-2` |
| `ui/common/button_btn-close-6.png` | `common-ui-2` |
| `ui/common/button_btn-close-7.png` | `common-ui-2` |
| `ui/common/button_btn-detail.png` | `common-ui-2` |
| `ui/common/res-icon_attack-1.png` | `common-ui-2` |
| `ui/common/res-icon_attack-2.png` | `common-ui-2` |
| `ui/common/res-icon_crown.png` | `common-ui-2` |
| `ui/common/res-icon_elem-fire.png` | `common-ui-2` |
| `ui/common/res-icon_icon-battle.png` | `common-ui-2` |
| `ui/common/res-icon_star.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-1.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-10.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-11.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-12.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-13.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-14.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-16.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-17.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-18.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-19.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-2.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-20.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-21.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-22.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-23.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-24.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-25.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-26.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-27.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-28.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-29.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-3.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-30.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-31.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-4.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-40.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-41.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-42.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-43.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-44.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-45.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-6.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-7.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-8.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-9.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-checkbox-1.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-checkbox-2.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-messageview.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-notice-2.png` | `common-ui-2` |
| `ui/common/win-bg_block-bg-notice.png` | `common-ui-2` |
| `ui/common/win-bg_block-gray-2.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-1.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-10.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-11.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-12.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-13.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-14.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-15.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-16.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-17.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-18.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-2.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-4.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-5.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-6.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-7.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-8.png` | `common-ui-2` |
| `ui/common/win-bg_cell-bg-9.png` | `common-ui-2` |
| `ui/common/win-bg_line-2.png` | `common-ui-2` |
| `ui/common/win-bg_line-3.png` | `common-ui-2` |
| `ui/common/win-bg_line-4.png` | `common-ui-2` |
| `ui/common/win-bg_line-5.png` | `common-ui-2` |
| `ui/common/win-bg_line-6.png` | `common-ui-2` |
| `ui/common/win-bg_line-7.png` | `common-ui-2` |
| `ui/common/win-bg_line.png` | `common-ui-2` |
| `ui/common/win-bg_num-bg-1.png` | `common-ui-2` |
| `ui/common/win-bg_num-bg-2.png` | `common-ui-2` |
| `ui/common/win-bg_spot-white.png` | `common-ui-2` |
| `ui/common/win-bg_spr-black-1.png` | `common-ui-2` |
| `ui/common/win-bg_spr-clan-create-bg.png` | `common-ui-2` |
| `ui/common/win-bg_spr-pattern-bottom.png` | `common-ui-2` |
| `ui/common/win-bg_title-bar-2.png` | `common-ui-2` |
| `ui/common/win-bg_title-bar-3.png` | `common-ui-2` |
| `ui/common/win-bg_title-bar-4.png` | `common-ui-2` |
| `ui/common/win-bg_title-bar-5.png` | `common-ui-2` |
| `ui/common/win-bg_title-bar-6.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-1.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-11.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-13.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-14.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-15.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-16.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-17.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-18.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-19.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-2.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-20.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-21.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-22.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-23.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-24.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-3.png` | `common-ui-2` |
| `ui/common/win-bg_win-bg-4.png` | `common-ui-2` |

## Counts

- login png: **11**
- city png: **266**
- common png: **144**
- font: **1** (`CloudYuanCuGBK.ttf`)
- skipped (already on main / protected / filter): **56**

