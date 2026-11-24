/**
 * 已接入的日常副本类型。网络入口用同一类型贯穿配置、进度、回执和战报标识。
 * 持久键同时用于策划配置路径，升级数据库时保留原有键值。
 */
package com.funsgamex.mxzg.dungeon;

public enum DailyDungeonType {
    GOLD("gold"),
    EXPERIENCE("experience"),
    HERO("hero"),
    FETTER("fetter"),
    SPIRIT("spirit");

    /** 当前类型的稳定持久键，用于配置路径和战报来源。 */
    private final String key;

    /** 为已开通的类型登记稳定键。 */
    DailyDungeonType(String key) {
        this.key = key;
    }

    /** 返回数据库和配置文件共用的副本键。 */
    public String key() {
        return key;
    }

    /** 读取已提交回执的副本类型，未知键代表持久化数据损坏。 */
    public static DailyDungeonType fromKey(String key) {
        return switch (key) {
            case "gold" -> GOLD;
            case "experience" -> EXPERIENCE;
            case "hero" -> HERO;
            case "fetter" -> FETTER;
            case "spirit" -> SPIRIT;
            default -> throw new IllegalStateException("日常副本回执类型无效：" + key);
        };
    }

    /** 生成与具体类型、关卡绑定的真实战报标识。 */
    public String scenario(int stageId) {
        return "dungeon:" + key + ":" + stageId;
    }
}
