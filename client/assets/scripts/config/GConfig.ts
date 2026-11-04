/** 由 tools/generate_config.py 生成；字段规范在 config/client-schema.json，业务注释来自本项目表头。 */
export interface CityButtonRow {
  /** 未知 */
  readonly atom: string;
  /** 未知 */
  readonly checkreddot?: string;
  /** 列 */
  readonly col?: number;
  /** 未知 */
  readonly effId?: number | string;
  /** 未知 */
  readonly idx: number;
  /** 未知 */
  readonly path?: string;
  /** 未知 */
  readonly reddot?: number | string;
  /** 行 */
  readonly row?: number;
  /** 类型 */
  readonly type?: number;
}
export interface CityEffectRow {
  /** idx */
  readonly idx: number;
  /** 动画参数anim：对应effect2表的内容。spine：文件名字 */
  readonly para?: string;
  /** 所处场景层级 */
  readonly parent?: string;
  /** 动画类型 */
  readonly type?: string;
  /** 对应层级x坐标 */
  readonly x: number;
  /** 对应层级y坐标 */
  readonly y: number;
  /** 对应层级z坐标 */
  readonly z?: number;
}
export interface CityPositionRow {
  /** 图标名称 */
  readonly atom: string;
  /** 未知 */
  readonly checkreddot?: string;
  /** 图标类型 */
  readonly idx: number;
  /** 未知 */
  readonly reddot?: number | string;
  /** 对应层级x坐标 */
  readonly x: number;
  /** 对应层级y坐标 */
  readonly y: number;
  /** 所处场景层级 */
  readonly zorder: number;
}
export interface HeroLevelRow {
  /** 升级所需英雄经验 */
  readonly exp_need: number;
  /** 升级所需金币 */
  readonly gold_need: number;
  /** 英雄登记 */
  readonly level: number;
}
export interface HeroSkillRow {
  /** 是否主动（0：被动，1：主动技能，2：普攻，3：光环） */
  readonly active_type?: number;
  /** 触发的art类型 */
  readonly art_list?: string;
  /** 是否有特殊词条层级（0没有，1有） */
  readonly buff_lan_on?: number;
  /** 冷却回合 */
  readonly cool_round?: number;
  /** 是否计算到面板上显示 */
  readonly count_stats?: number;
  /** 唯一编号 */
  readonly idx: number;
  /** 初始回合 */
  readonly initial_round?: number;
  /** 技能描述语言包 */
  readonly lan_describe: number;
  /** 技能名称语言包 */
  readonly lan_name: number;
  /** 技能等级 */
  readonly level: number;
  /** 下级描述语言包 */
  readonly levelup_describe?: number;
  /** 注释·英雄名称 */
  readonly note3?: string;
  /** 强力标志 */
  readonly power_mark?: number;
  /** 需要英雄n星才拥有此技能 */
  readonly star?: number;
  /** 515 */
  readonly type: number;
}
export interface HeroStarRow {
  /** 攻击提升（显示） */
  readonly attack_show?: number;
  /** 血量提升（显示） */
  readonly hp_show?: number;
  /** 英雄等级上限 */
  readonly level_limit: number;
  /** 升星所需额外道具 */
  readonly need_item?: string;
  /** 个人等级要求 */
  readonly role_level_require?: number;
  /** 献祭基础收益 */
  readonly sacrifice_item_refund?: string;
  /** 技能1等级 */
  readonly skill1: number;
  /** 技能2等级 */
  readonly skill2: number;
  /** 技能3等级 */
  readonly skill3: number;
  /** 技能4等级 */
  readonly skill4: number;
  /** 英雄星级 */
  readonly star: number;
  /** 升星消耗（升阶石） */
  readonly upstar_cost?: string;
  /** 世界等级要求 */
  readonly world_level_require?: number;
}
export interface HeroTalkRow {
  /** 编号 */
  readonly idx: number;
  /** 内容语言包 */
  readonly lan: number;
  /** 出现最大等级 */
  readonly level_max: number;
  /** 出现最低的能级 */
  readonly level_min: number;
  /** 备注 */
  readonly note?: string;
}
export interface HeroTypeRow {
  /** 伤害类型（0物理，1魔法） */
  readonly damage_type?: number;
  /** 抽奖描述 */
  readonly describe?: number;
  /** 元素类型 */
  readonly elem?: number;
  /** 对应英雄碎片itemID */
  readonly item_id?: number;
  /** 角色类型（1英雄，2boss） */
  readonly kind?: number;
  /** 名称注释 */
  readonly note?: string;
  /** 职业类型 */
  readonly occupation?: number;
  /** 技能1编号 */
  readonly skill_1?: number;
  /** 技能2编号 */
  readonly skill_2?: number;
  /** 技能3编号 */
  readonly skill_3?: number;
  /** 技能4编号 */
  readonly skill_4?: number;
  /** 普攻编号 */
  readonly skill_5?: number;
  /** 初始星级 */
  readonly star?: number;
  /** 天赋推荐 */
  readonly talent_recommend?: string;
  /** 升10所需素材 */
  readonly to_10_star?: string;
  /** 升11所需素材 */
  readonly to_11_star?: string;
  /** 升12所需素材 */
  readonly to_12_star?: string;
  /** 升13所需素材 */
  readonly to_13_star?: string;
  /** 升14所需素材 */
  readonly to_14_star?: string;
  /** 升5所需素材 */
  readonly to_5_star?: string;
  /** 升6所需素材 */
  readonly to_6_star?: string;
  /** 升7所需素材 */
  readonly to_7_star?: string;
  /** 升8所需素材 */
  readonly to_8_star?: string;
  /** 升9所需素材 */
  readonly to_9_star?: string;
  /** 英雄类型 */
  readonly type: number;
}
export interface HeroUpgradeRow {
  /** 阶级初始等级 */
  readonly begin_level?: number;
  /** 升阶所需金币 */
  readonly gold?: number;
  /** 英雄阶级 */
  readonly grade: number;
  /** 等级上限 */
  readonly level: number;
  /** 英雄变强评分 */
  readonly score?: number;
  /** 技能1是否解锁 */
  readonly skill1: number;
  /** 技能2是否解锁 */
  readonly skill2: number;
  /** 技能3是否解锁 */
  readonly skill3: number;
  /** 技能4是否解锁 */
  readonly skill4: number;
  /** 升阶所需升阶石 */
  readonly soul?: number;
}
export interface ItemRow {
  /** 道具简介（填语言包id） */
  readonly content?: number | string;
  /** 是否能分解 */
  readonly decomposition?: number;
  /** 特效id */
  readonly effect_mark?: number;
  /** 获得途径（填语言包id） */
  readonly gain?: number;
  /** 图标 */
  readonly icon?: string;
  /** 类名 */
  readonly idx: number;
  /** 使用角色等级需求 */
  readonly level_require?: number;
  /** 模块 */
  readonly mode?: number;
  /** 名称（填语言包id） */
  readonly name?: number | string;
  /** 背包标签位置（0：不显示在背包，1：装备，2：道具，3：碎片，4：特殊） */
  readonly place?: number;
  /** 颜色标记 */
  readonly rare_mark?: number;
  /** 排序(数字越大越靠前，先按照排序权重排序。其次按照物品类型排序，数值<=100000) */
  readonly sort?: number;
  /** source */
  readonly source?: string;
  /** 星级 */
  readonly star?: number;
  /** 类型 */
  readonly type?: number;
  /** 使用跳转（openwindow.xlsx） */
  readonly use_jump?: number;
  /** 效用类型 */
  readonly use_type?: number;
  /** 效用值（期限道具时间。单位：天） */
  readonly use_value?: number;
}
export interface LanguageRow {
  /** key值 */
  readonly key: number | string;
  /** 文本 */
  readonly value?: string;
}
export interface LoadingTipsRow {
  /** 提示码 */
  readonly idx: number;
  /** 提示信息 */
  readonly tips?: number;
}
export interface OpenConditionRow {
  /** 客户端导航别名对应的原功能标识 */
  readonly alias_of?: string;
  /** 功能id */
  readonly atom?: string;
  /** 条件 */
  readonly condition_type: number;
  /** 主线等级条件 */
  readonly condition_value?: number;
  /** 系统描述 */
  readonly desc?: number;
  /** 导航门槛查询标识 */
  readonly id: string;
  /** 入口所需主线等级 */
  readonly level: number;
  /** 系统名称 */
  readonly name: string;
  /** 注释2 */
  readonly note?: string;
  /** 是否开启 */
  readonly open?: number;
  /** 开放所需开服自然日，0 表示不限制 */
  readonly open_server_day: number;
  /** 父类 */
  readonly parent?: string;
  /** 世界等级条件 */
  readonly world_level?: number;
}
export interface SystemGateRow {
  /** 配置查询键 */
  readonly key: string;
  /** 策划业务说明 */
  readonly note?: string;
  /** 开放所需开服自然日，0 表示不限制 */
  readonly open_server_day: number;
}
export interface TimeLimitItemRow {
  /**   道具id */
  readonly item_id: number;
  /** 注释 */
  readonly note?: string;
  /** 奖励（每天奖励） */
  readonly reward: string;
  /** 类型 */
  readonly type: number;
  /** 有效时长（单位：天） */
  readonly valid_time: number;
}
export const GConfig = {
  CityButton: "CityButton",
  CityEffect: "CityEffect",
  CityPosition: "CityPosition",
  HeroLevel: "HeroLevel",
  HeroSkill: "HeroSkill",
  HeroStar: "HeroStar",
  HeroTalk: "HeroTalk",
  HeroType: "HeroType",
  HeroUpgrade: "HeroUpgrade",
  Item: "Item",
  Language: "Language",
  LoadingTips: "LoadingTips",
  OpenCondition: "OpenCondition",
  SystemGate: "SystemGate",
  TimeLimitItem: "TimeLimitItem",
} as const;
export interface ConfigRowMap {
  CityButton: CityButtonRow;
  CityEffect: CityEffectRow;
  CityPosition: CityPositionRow;
  HeroLevel: HeroLevelRow;
  HeroSkill: HeroSkillRow;
  HeroStar: HeroStarRow;
  HeroTalk: HeroTalkRow;
  HeroType: HeroTypeRow;
  HeroUpgrade: HeroUpgradeRow;
  Item: ItemRow;
  Language: LanguageRow;
  LoadingTips: LoadingTipsRow;
  OpenCondition: OpenConditionRow;
  SystemGate: SystemGateRow;
  TimeLimitItem: TimeLimitItemRow;
}
export interface ConfigKeyMap {
  CityButton: string;
  CityEffect: number;
  CityPosition: number;
  HeroLevel: number;
  HeroSkill: number;
  HeroStar: number;
  HeroTalk: number;
  HeroType: number;
  HeroUpgrade: number;
  Item: number;
  Language: number | string;
  LoadingTips: number;
  OpenCondition: string;
  SystemGate: string;
  TimeLimitItem: number;
}
export interface ConfigFileMap {
  CityButton: { readonly act: Readonly<Record<string, CityButtonRow>> };
  CityEffect: { readonly maincityeffect: readonly CityEffectRow[] };
  CityPosition: { readonly main: readonly CityPositionRow[] };
  HeroLevel: { readonly rows: readonly HeroLevelRow[] };
  HeroSkill: { readonly rows: readonly HeroSkillRow[] };
  HeroStar: { readonly rows: readonly HeroStarRow[] };
  HeroTalk: { readonly rows: readonly HeroTalkRow[] };
  HeroType: { readonly rows: readonly HeroTypeRow[] };
  HeroUpgrade: { readonly rows: readonly HeroUpgradeRow[] };
  Item: { readonly rows: readonly ItemRow[] };
  Language: { readonly rows: readonly LanguageRow[] };
  LoadingTips: { readonly rows: readonly LoadingTipsRow[] };
  OpenCondition: { readonly rows: readonly OpenConditionRow[] };
  SystemGate: { readonly rows: readonly SystemGateRow[] };
  TimeLimitItem: { readonly rows: readonly TimeLimitItemRow[] };
}
export type ConfigName = keyof ConfigRowMap;
export const CONFIG_SCHEMA = {
  "CityButton": {
    "container": "act",
    "fields": {
      "atom": {
        "note": "功能入口原子标识",
        "required": true,
        "type": "string"
      },
      "checkreddot": {
        "note": "原配置红点检查标识，仅保留数据",
        "required": false,
        "type": "string"
      },
      "col": {
        "note": "入口列号",
        "required": false,
        "type": "number"
      },
      "effId": {
        "note": "特效标识，空字符串表示未配置",
        "required": false,
        "type": "number|string"
      },
      "idx": {
        "note": "配置条目编号",
        "required": true,
        "type": "number"
      },
      "path": {
        "note": "主城图标源路径",
        "required": false,
        "type": "string"
      },
      "reddot": {
        "note": "红点条件编号，空字符串表示未配置",
        "required": false,
        "type": "number|string"
      },
      "row": {
        "note": "入口行号",
        "required": false,
        "type": "number"
      },
      "type": {
        "note": "入口或特效类型",
        "required": false,
        "type": "number"
      }
    },
    "key": "atom",
    "path": "config/maincity/createmaincitybtn"
  },
  "CityEffect": {
    "container": "maincityeffect",
    "fields": {
      "idx": {
        "note": "配置条目编号",
        "required": true,
        "type": "number"
      },
      "para": {
        "note": "动画或骨骼资源标识",
        "required": false,
        "type": "string"
      },
      "parent": {
        "note": "特效挂载父节点名称",
        "required": false,
        "type": "string"
      },
      "type": {
        "note": "入口或特效类型",
        "required": false,
        "type": "string"
      },
      "x": {
        "note": "父节点左下空间的横坐标",
        "required": true,
        "type": "number"
      },
      "y": {
        "note": "父节点左下空间的纵坐标",
        "required": true,
        "type": "number"
      },
      "z": {
        "note": "特效显示层级",
        "required": false,
        "type": "number"
      }
    },
    "key": "idx",
    "path": "config/maincity/maincityeffect"
  },
  "CityPosition": {
    "container": "main",
    "fields": {
      "atom": {
        "note": "功能入口原子标识",
        "required": true,
        "type": "string"
      },
      "checkreddot": {
        "note": "原配置红点检查标识，仅保留数据",
        "required": false,
        "type": "string"
      },
      "idx": {
        "note": "配置条目编号",
        "required": true,
        "type": "number"
      },
      "reddot": {
        "note": "红点条件编号，空字符串表示未配置",
        "required": false,
        "type": "number|string"
      },
      "x": {
        "note": "父节点左下空间的横坐标",
        "required": true,
        "type": "number"
      },
      "y": {
        "note": "父节点左下空间的纵坐标",
        "required": true,
        "type": "number"
      },
      "zorder": {
        "note": "地图绘制层级",
        "required": true,
        "type": "number"
      }
    },
    "key": "idx",
    "path": "config/maincity/maincitypos"
  },
  "HeroLevel": {
    "container": "rows",
    "fields": {
      "exp_need": {
        "note": "升一级所需英雄经验（900101）",
        "required": true,
        "type": "number"
      },
      "gold_need": {
        "note": "升一级所需金币（900001）",
        "required": true,
        "type": "number"
      },
      "level": {
        "note": "英雄当前等级",
        "required": true,
        "type": "number"
      }
    },
    "key": "level",
    "path": "config/herolevel"
  },
  "HeroSkill": {
    "container": "rows",
    "fields": {
      "active_type": {
        "note": "active_type",
        "required": false,
        "type": "number"
      },
      "art_list": {
        "note": "art_list",
        "required": false,
        "type": "string"
      },
      "buff_lan_on": {
        "note": "buff_lan_on",
        "required": false,
        "type": "number"
      },
      "cool_round": {
        "note": "cool_round",
        "required": false,
        "type": "number"
      },
      "count_stats": {
        "note": "count_stats",
        "required": false,
        "type": "number"
      },
      "idx": {
        "note": "idx",
        "required": true,
        "type": "number"
      },
      "initial_round": {
        "note": "initial_round",
        "required": false,
        "type": "number"
      },
      "lan_describe": {
        "note": "lan_describe",
        "required": true,
        "type": "number"
      },
      "lan_name": {
        "note": "lan_name",
        "required": true,
        "type": "number"
      },
      "level": {
        "note": "level",
        "required": true,
        "type": "number"
      },
      "levelup_describe": {
        "note": "levelup_describe",
        "required": false,
        "type": "number"
      },
      "note3": {
        "note": "note3",
        "required": false,
        "type": "string"
      },
      "power_mark": {
        "note": "power_mark",
        "required": false,
        "type": "number"
      },
      "star": {
        "note": "star",
        "required": false,
        "type": "number"
      },
      "type": {
        "note": "type",
        "required": true,
        "type": "number"
      }
    },
    "key": "idx",
    "path": "config/heroskill"
  },
  "HeroStar": {
    "container": "rows",
    "fields": {
      "attack_show": {
        "note": "attack_show",
        "required": false,
        "type": "number"
      },
      "hp_show": {
        "note": "hp_show",
        "required": false,
        "type": "number"
      },
      "level_limit": {
        "note": "level_limit",
        "required": true,
        "type": "number"
      },
      "need_item": {
        "note": "need_item",
        "required": false,
        "type": "string"
      },
      "role_level_require": {
        "note": "role_level_require",
        "required": false,
        "type": "number"
      },
      "sacrifice_item_refund": {
        "note": "sacrifice_item_refund",
        "required": false,
        "type": "string"
      },
      "skill1": {
        "note": "skill1",
        "required": true,
        "type": "number"
      },
      "skill2": {
        "note": "skill2",
        "required": true,
        "type": "number"
      },
      "skill3": {
        "note": "skill3",
        "required": true,
        "type": "number"
      },
      "skill4": {
        "note": "skill4",
        "required": true,
        "type": "number"
      },
      "star": {
        "note": "star",
        "required": true,
        "type": "number"
      },
      "upstar_cost": {
        "note": "upstar_cost",
        "required": false,
        "type": "string"
      },
      "world_level_require": {
        "note": "world_level_require",
        "required": false,
        "type": "number"
      }
    },
    "key": "star",
    "path": "config/herostar"
  },
  "HeroTalk": {
    "container": "rows",
    "fields": {
      "idx": {
        "note": "台词编号",
        "required": true,
        "type": "number"
      },
      "lan": {
        "note": "语言编号",
        "required": true,
        "type": "number"
      },
      "level_max": {
        "note": "最高等级",
        "required": true,
        "type": "number"
      },
      "level_min": {
        "note": "最低等级",
        "required": true,
        "type": "number"
      },
      "note": {
        "note": "策划台词",
        "required": false,
        "type": "string"
      }
    },
    "key": "idx",
    "path": "config/herotalk"
  },
  "HeroType": {
    "container": "rows",
    "fields": {
      "damage_type": {
        "note": "damage_type",
        "required": false,
        "type": "number"
      },
      "describe": {
        "note": "describe",
        "required": false,
        "type": "number"
      },
      "elem": {
        "note": "elem",
        "required": false,
        "type": "number"
      },
      "item_id": {
        "note": "item_id",
        "required": false,
        "type": "number"
      },
      "kind": {
        "note": "kind",
        "required": false,
        "type": "number"
      },
      "note": {
        "note": "note",
        "required": false,
        "type": "string"
      },
      "occupation": {
        "note": "occupation",
        "required": false,
        "type": "number"
      },
      "skill_1": {
        "note": "skill_1",
        "required": false,
        "type": "number"
      },
      "skill_2": {
        "note": "skill_2",
        "required": false,
        "type": "number"
      },
      "skill_3": {
        "note": "skill_3",
        "required": false,
        "type": "number"
      },
      "skill_4": {
        "note": "skill_4",
        "required": false,
        "type": "number"
      },
      "skill_5": {
        "note": "skill_5",
        "required": false,
        "type": "number"
      },
      "star": {
        "note": "star",
        "required": false,
        "type": "number"
      },
      "talent_recommend": {
        "note": "talent_recommend",
        "required": false,
        "type": "string"
      },
      "to_10_star": {
        "note": "to_10_star",
        "required": false,
        "type": "string"
      },
      "to_11_star": {
        "note": "to_11_star",
        "required": false,
        "type": "string"
      },
      "to_12_star": {
        "note": "to_12_star",
        "required": false,
        "type": "string"
      },
      "to_13_star": {
        "note": "to_13_star",
        "required": false,
        "type": "string"
      },
      "to_14_star": {
        "note": "to_14_star",
        "required": false,
        "type": "string"
      },
      "to_5_star": {
        "note": "to_5_star",
        "required": false,
        "type": "string"
      },
      "to_6_star": {
        "note": "to_6_star",
        "required": false,
        "type": "string"
      },
      "to_7_star": {
        "note": "to_7_star",
        "required": false,
        "type": "string"
      },
      "to_8_star": {
        "note": "to_8_star",
        "required": false,
        "type": "string"
      },
      "to_9_star": {
        "note": "to_9_star",
        "required": false,
        "type": "string"
      },
      "type": {
        "note": "配置查询主键",
        "required": true,
        "type": "number"
      }
    },
    "key": "type",
    "path": "config/herotype"
  },
  "HeroUpgrade": {
    "container": "rows",
    "fields": {
      "begin_level": {
        "note": "begin_level",
        "required": false,
        "type": "number"
      },
      "gold": {
        "note": "gold",
        "required": false,
        "type": "number"
      },
      "grade": {
        "note": "grade",
        "required": true,
        "type": "number"
      },
      "level": {
        "note": "level",
        "required": true,
        "type": "number"
      },
      "score": {
        "note": "score",
        "required": false,
        "type": "number"
      },
      "skill1": {
        "note": "skill1",
        "required": true,
        "type": "number"
      },
      "skill2": {
        "note": "skill2",
        "required": true,
        "type": "number"
      },
      "skill3": {
        "note": "skill3",
        "required": true,
        "type": "number"
      },
      "skill4": {
        "note": "skill4",
        "required": true,
        "type": "number"
      },
      "soul": {
        "note": "soul",
        "required": false,
        "type": "number"
      }
    },
    "key": "grade",
    "path": "config/heroupgrade"
  },
  "Item": {
    "container": "rows",
    "fields": {
      "content": {
        "note": "content",
        "required": false,
        "type": "number|string"
      },
      "decomposition": {
        "note": "decomposition",
        "required": false,
        "type": "number"
      },
      "effect_mark": {
        "note": "effect_mark",
        "required": false,
        "type": "number"
      },
      "gain": {
        "note": "gain",
        "required": false,
        "type": "number"
      },
      "icon": {
        "note": "icon",
        "required": false,
        "type": "string"
      },
      "idx": {
        "note": "配置查询主键",
        "required": true,
        "type": "number"
      },
      "level_require": {
        "note": "level_require",
        "required": false,
        "type": "number"
      },
      "mode": {
        "note": "mode",
        "required": false,
        "type": "number"
      },
      "name": {
        "note": "name",
        "required": false,
        "type": "number|string"
      },
      "place": {
        "note": "place",
        "required": false,
        "type": "number"
      },
      "rare_mark": {
        "note": "rare_mark",
        "required": false,
        "type": "number"
      },
      "sort": {
        "note": "sort",
        "required": false,
        "type": "number"
      },
      "source": {
        "note": "source",
        "required": false,
        "type": "string"
      },
      "star": {
        "note": "star",
        "required": false,
        "type": "number"
      },
      "type": {
        "note": "type",
        "required": false,
        "type": "number"
      },
      "use_jump": {
        "note": "use_jump",
        "required": false,
        "type": "number"
      },
      "use_type": {
        "note": "use_type",
        "required": false,
        "type": "number"
      },
      "use_value": {
        "note": "use_value",
        "required": false,
        "type": "number"
      }
    },
    "key": "idx",
    "path": "config/item"
  },
  "Language": {
    "container": "rows",
    "fields": {
      "key": {
        "note": "配置查询主键",
        "required": true,
        "type": "number|string"
      },
      "value": {
        "note": "value",
        "required": false,
        "type": "string"
      }
    },
    "ignoreKeys": [
      "#"
    ],
    "key": "key",
    "path": "config/language"
  },
  "LoadingTips": {
    "container": "rows",
    "fields": {
      "idx": {
        "note": "配置查询主键",
        "required": true,
        "type": "number"
      },
      "tips": {
        "note": "tips",
        "required": false,
        "type": "number"
      }
    },
    "key": "idx",
    "path": "config/loadingtips"
  },
  "OpenCondition": {
    "container": "rows",
    "fields": {
      "alias_of": {
        "note": "客户端导航别名对应的原功能标识",
        "required": false,
        "type": "string"
      },
      "atom": {
        "note": "功能入口原子标识",
        "required": false,
        "type": "string"
      },
      "condition_type": {
        "note": "condition_type",
        "required": true,
        "type": "number"
      },
      "condition_value": {
        "note": "condition_value",
        "required": false,
        "type": "number"
      },
      "desc": {
        "note": "desc",
        "required": false,
        "type": "number"
      },
      "id": {
        "note": "导航门槛查询标识",
        "required": true,
        "type": "string"
      },
      "level": {
        "note": "入口所需主线等级",
        "required": true,
        "type": "number"
      },
      "name": {
        "note": "功能显示名称",
        "required": true,
        "type": "string"
      },
      "note": {
        "note": "策划业务说明",
        "required": false,
        "type": "string"
      },
      "open": {
        "note": "open",
        "required": false,
        "type": "number"
      },
      "open_server_day": {
        "note": "开放所需开服自然日，0 表示不限制",
        "required": true,
        "type": "number"
      },
      "parent": {
        "note": "特效挂载父节点名称",
        "required": false,
        "type": "string"
      },
      "world_level": {
        "note": "world_level",
        "required": false,
        "type": "number"
      }
    },
    "key": "id",
    "path": "config/opencondition"
  },
  "SystemGate": {
    "container": "rows",
    "fields": {
      "key": {
        "note": "配置查询键",
        "required": true,
        "type": "string"
      },
      "note": {
        "note": "策划业务说明",
        "required": false,
        "type": "string"
      },
      "open_server_day": {
        "note": "开放所需开服自然日，0 表示不限制",
        "required": true,
        "type": "number"
      }
    },
    "key": "key",
    "path": "config/system_gate"
  },
  "TimeLimitItem": {
    "container": "rows",
    "fields": {
      "item_id": {
        "note": "期限道具配置 ID",
        "required": true,
        "type": "number"
      },
      "note": {
        "note": "策划备注",
        "required": false,
        "type": "string"
      },
      "reward": {
        "note": "原表每日奖励 JSON，仅保留配置，不开放领取",
        "required": true,
        "type": "string"
      },
      "type": {
        "note": "期限效果类型",
        "required": true,
        "type": "number"
      },
      "valid_time": {
        "note": "北京时间自然日有效天数",
        "required": true,
        "type": "number"
      }
    },
    "key": "item_id",
    "path": "config/timelimititem"
  }
} as const;
