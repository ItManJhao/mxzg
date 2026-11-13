/** 按旧G_BATTLE_ACTIONS覆盖及BattleActionUtils解析近身、远程和独立特效时序；不把life当动作时长或生成通用特效。 */
export interface BattleAttackPlan {
    /** true为type2/11近身移动；false为type3原地施法，不能瞬移到目标。 */
    readonly melee: boolean;
    /** 1为空动作，6/7/9只播放独立特效，不覆盖施法骨骼；6定位施法者，7定位各目标，9定位战场。 */
    readonly effectOnly: boolean;
    readonly onSource: boolean;
    /** type9按战场宽高比例定位，仅播放一次；左右阵营按旧特效层镜像。 */
    readonly battlefieldOffset: readonly [number, number] | null;
    /** type5投射，按旧帧计数飞行；type3在各目标脚下播放一次。 */
    readonly projectile: boolean;
    /** 同源序列帧路径、帧间隔、缩放和锚点；空file时为null。 */
    readonly effect: { paths: readonly string[]; interval: number; flightSeconds: number;
        scaleX: number; scaleY: number; anchorX: number; anchorY: number } | null;
    /** 秒；去程与回程分别使用相同移动时间。 */
    readonly moveSeconds: number;
    /** 按旧BattleHeroNode.Action映射骨骼动作：skill为attack2，skill2为attack3，transform为skill。 */
    readonly action: string;
    /** 攻击开始后到附加效果时点的秒数。 */
    readonly attackSeconds: number;
    /** 攻击后、动作后及返回前分别等待的秒数，保持旧序列。 */
    readonly attackDelaySeconds: number;
    readonly actionSeconds: number;
    readonly beforeReturnSeconds: number;
    /** 原配置音效名，不将空file替换成技能ID特效。 */
    readonly sounds: readonly string[];
}

export class BattleAttackUtils {
    /** 纯配置工具不保存播放状态。 */
    private constructor() {}

    /** 旧BattleInfoFactory优先展开G_BATTLE_ACTIONS；恢复已核对的英雄覆盖，内部索引不写回战报。 */
    public static legacyActions<T extends { idx: number; type: number; ani_base: string; file: string; sound: string; delay: number; dimly: number }>(row: T): readonly T[] {
        // 冰晶女巫的file仅用于预加载；施法与第20帧的战场特效分开，不能在目标脚下重复播放。
        if (row.idx >= 2031101 && row.idx <= 2031103) {
            return [
                { ...row, idx: row.idx * 10, type: 3, delay: 0, dimly: 0,
                    ani_base: JSON.stringify({ attack_time: 0.6, action_time: 1 }),
                    file: "[]", sound: JSON.stringify(["skill-102030031"]) },
                { ...row, idx: row.idx * 10 + 1, type: 9, delay: 20, dimly: 1,
                    ani_base: JSON.stringify({ format: "skill-102030031/%d.png", anchor_y: 0.35,
                        duration: 0.1, scale_x: 1.8, scale_y: 1.8, offset_x: 0.6, offset_y: 0.4 }),
                    file: JSON.stringify(["skill-102030031"]), sound: "[]" },
            ];
        }
        // 树精的file用于预加载；type2只做近身，type6实际按ani_base.format生成施法者特效。
        if (row.idx >= 3011101 && row.idx <= 3011103) {
            return [
                { ...row, idx: row.idx * 10, type: 2, delay: 0, dimly: 0,
                    ani_base: JSON.stringify({ move_time: 0.1, move_back: 1 }),
                    file: "[]", sound: JSON.stringify(["skill-103010011"]) },
                { ...row, idx: row.idx * 10 + 1, type: 6, delay: 15, dimly: 1,
                    ani_base: JSON.stringify({ format: "skill-103010011/%d.png", anchor_x: 1,
                        anchor_y: 0.2, duration: 0.1, scale_x: 1, scale_y: 1 }),
                    file: JSON.stringify(["skill-103010011"]), sound: "[]" },
            ];
        }
        // 布鲁与冰晶女巫普攻按旧actions.lua在目标处播放4倍水花，不直接采用基础buff的表现参数。
        if (row.idx === 2010100 || row.idx === 2030100) {
            return [{
                ...row,
                type: 3,
                delay: 10,
                dimly: 0,
                ani_base: JSON.stringify({
                    attack_time: 0.3, action_time: 0.5,
                    format: "skill-102040040/%d.png", duration: 0.05,
                    scale_x: 4, scale_y: 4, anchor_y: 0.2, anchor_x: 0.4,
                }),
                file: JSON.stringify(["skill-102040040"]),
                sound: JSON.stringify(["skill-102040040"]),
            }];
        }
        // 独眼梦魇一级主动：近身骨骼与第20帧的施法者特效并行，音效仅由近身动作播放。
        if (row.idx === 1011101) {
            return [
                { ...row, idx: row.idx * 10, type: 2, delay: 0, dimly: 0,
                    ani_base: JSON.stringify({ move_time: 0.1, move_back: 1 }),
                    file: "[]", sound: JSON.stringify(["skill-101010011"]) },
                { ...row, idx: row.idx * 10 + 1, type: 6, delay: 20, dimly: 1,
                    ani_base: JSON.stringify({ format: "skill-101010011/%d.png", anchor_x: 0.5,
                        duration: 0.025, scale_x: 1.7, scale_y: 1.7 }),
                    file: JSON.stringify(["skill-101010011"]), sound: "[]" }
            ];
        }
        // 黑暗切割者六级主动：四/五级地图偏移不同，六级锚点不同；不复用一级掩盖等级差异。
        if (row.idx >= 5051101 && row.idx <= 5051106) {
            const level = row.idx - 5051100;
            const middle = level === 4 || level === 5;
            const entries = [
                { type: 3, delay: 0, dimly: 0, base: { action: "skill", attack_time: 0.6, action_time: 1.8 }, file: "" },
                { type: 9, delay: 145, dimly: 1, base: { format: "skill-105050051/%d.png", anchor_y: level <= 3 ? 0.7 : 0.5,
                    anchor_x: level === 6 ? 0.7 : middle ? 0.5 : 0.6, duration: 0.06,
                    scale_x: 3, scale_y: 3, offset_x: middle ? 0.7 : 0.6, offset_y: 0.5 }, file: "skill-105050051" },
                { type: 6, delay: 145, dimly: 0, base: { format: "skill-105050051-1/%d.png", anchor_x: 0.2,
                    anchor_y: 0.2, duration: 0.12, scale_x: 2, scale_y: 2 }, file: "skill-105050051-1" }
            ];
            return entries.map((entry, index) => ({ ...row, idx: row.idx * 10 + index,
                type: entry.type, delay: entry.delay, dimly: entry.dimly,
                ani_base: JSON.stringify(entry.base), file: JSON.stringify(entry.file ? [entry.file] : []), sound: "[]" }));
        }
        // 旧魅惑之拥覆盖：普攻目标特效与11号近身并行；主动包含空动作，不额外播放骨骼。
        if (row.idx === 1110200 || (row.idx >= 1111201 && row.idx <= 1111203)) {
            const normal = row.idx === 1110200;
            const entries = normal ? [
                { type: 7, delay: 20, dimly: 0, base: { format: "skill-101050110/%d.png", anchor_y: 0.4,
                    anchor_x: 0.35, duration: 0.08, scale_x: 1, scale_y: 1, flipped: 1 }, file: "skill-101050110" },
                { type: 11, delay: 0, dimly: 0, base: { move_time: 0.1, move_back: 0.5,
                    attack_delay: 0.8, offset_x: 0.6, offset_y: 0.3 }, file: "" }
            ] : [
                { type: 7, delay: 50, dimly: 1, base: { format: "skill-101050111/%d.png", anchor_y: 0.32,
                    anchor_x: 0.5, duration: 0.08, scale_x: 1.3, scale_y: 1.3 }, file: "skill-101050111" },
                { type: 3, delay: 0, dimly: 0, base: { action: "skill", attack_time: 0.6, action_time: 1.5 }, file: "" },
                { type: 1, delay: 0, dimly: 0, base: {}, file: "" }
            ];
            return entries.map((entry, index) => ({ ...row, idx: row.idx * 10 + index,
                type: entry.type, delay: entry.delay, dimly: entry.dimly,
                ani_base: JSON.stringify(entry.base), file: JSON.stringify(entry.file ? [entry.file] : []),
                sound: JSON.stringify(entry.file ? [entry.file] : []) }));
        }
        const normal = row.idx === 2230100;
        const first = row.idx >= 2231101 && row.idx <= 2231103;
        const second = row.idx >= 2233101 && row.idx <= 2233103;
        if (!normal && !first && !second) {
            return [row];
        }
        const entries: { type: number; delay: number; dimly?: number; base: Record<string, number | string>; file?: string; sound?: string }[] = normal ? [
            { type: 2, delay: 0, base: { move_time: 0.1, attack_delay: 0.3, move_back: 1 } },
            { type: 7, delay: 40, base: { format: "skill-102050230/%d.png", anchor_x: 0.5, anchor_y: 0.4, duration: 0.03, scale_x: 2, scale_y: 2 }, file: "skill-102050230", sound: "skill-102050230" }
        ] : first ? [
            { type: 3, delay: 0, base: { action: "skill", attack_time: 1.22, action_time: 1.8 } },
            { type: 7, delay: 90, dimly: 1, base: { format: "skill-102050231/%d.png", anchor_x: 0.5, anchor_y: 0.45, duration: 0.03, scale_x: 1, scale_y: 1 }, file: "skill-102050231", sound: "skill-102050231" }
        ] : [
            { type: 3, delay: 0, base: { action: "skill2", attack_time: 0.6, action_time: 1.8 } },
            { type: 6, delay: 0, dimly: 1, base: { format: "skill-102050233/%d.png", anchor_x: 0.5, anchor_y: 0.25, duration: 0.06, scale_x: 1, scale_y: 1 }, file: "skill-102050233" },
            { type: 7, delay: 120, dimly: 1, base: { format: "skill-102050233_1/%d.png", anchor_x: 0.5, anchor_y: 0.3, duration: 0.06, scale_x: -1, scale_y: 1 }, file: "skill-102050233_1", sound: "skill-102050233" }
        ];
        return entries.map((entry, index) => ({ ...row, idx: row.idx * 10 + index,
            type: entry.type, delay: entry.delay, dimly: entry.dimly || 0,
            ani_base: JSON.stringify(entry.base), file: JSON.stringify(entry.file ? [entry.file] : []),
            sound: JSON.stringify(entry.sound ? [entry.sound] : []) }));
    }

    /** 读取同源buff行；开放type1/2/3/5/11和已核对覆盖表的type6/7/9真实帧资源，未知表现明确拒绝。 */
    public static plan(row: { type: number; ani_base: string; file: string; sound: string }): BattleAttackPlan {
        if ([1, 2, 3, 5, 6, 7, 9, 11].indexOf(row.type) < 0) throw new Error("尚未支持该战斗动作类型");
        const base: unknown = JSON.parse(row.ani_base);
        const files: unknown = JSON.parse(row.file);
        const sounds: unknown = JSON.parse(row.sound);
        if (!base || typeof base !== "object" || Array.isArray(base)
            || !Array.isArray(files)
            || !Array.isArray(sounds) || !sounds.every(value => typeof value === "string")) {
            throw new Error("攻击动作配置超出当前支持范围");
        }
        const values = base as Record<string, unknown>;
        const known = ["move_time", "attack_time", "attack_delay", "action_time", "move_back", "action", "format", "duration", "scale_x", "scale_y", "anchor_x", "anchor_y", "flipped"];
        if (row.type === 9 || row.type === 11) known.push("offset_x", "offset_y");
        if (Object.keys(values).some(key => known.indexOf(key) < 0)) {
            throw new Error("攻击动作存在未支持参数");
        }
        const action = values.action === undefined ? "attack" : values.action;
        if (["attack", "skill", "skill2", "transform"].indexOf(action as string) < 0) {
            throw new Error("攻击动作名称无效");
        }
        let effect: BattleAttackPlan["effect"] = null;
        if (files.length) {
            // 帧数以旧plist连续帧及本地逐像素复验为依据，不能遇到未知资源就跳过表现。
            const counts: Record<string, number> = {
                "skill-101050110": 10, "skill-101050111": 10,
                "skill-105050051": 19, "skill-105050051-1": 8,
                "skill-101010011": 9, "skill-101040050": 7, "skill-101020021": 11,
                "skill-102050230": 8, "skill-102050231": 17,
                "skill-102050233": 22, "skill-102050233_1": 22,
                "skill-102040040": 14, "skill-102010011": 4,
                "skill-103010011": 7,
                "skill-102030031": 8,
            };
            const file = files[0];
            if (files.length !== 1 || typeof file !== "string" || !counts[file]
                || values.format !== file + "/%d.png" || row.type === 2) {
                throw new Error("战斗帧资源尚未核对：type=" + row.type + "，file=" + JSON.stringify(files));
            }
            const interval = this.seconds(values, "duration", 0.05);
            if (interval <= 0) throw new Error("特效帧间隔无效");
            if (values.flipped !== undefined && values.flipped !== 0 && values.flipped !== 1) {
                throw new Error("特效水平翻转配置无效");
            }
            effect = Object.freeze({
                paths: Object.freeze(Array.from({length: counts[file]}, (_, index) =>
                    "effects/skill/" + file + "/" + file + "_" + index + "/spriteFrame")),
                interval,
                // 旧getAnimateCount包含首次查找失败的那一帧，7张图实际飞行8个间隔。
                flightSeconds: (counts[file] + 1) * interval,
                // 旧flipped只翻图像；反转锚点配合负缩放保持原图几何边界，不修改共享SpriteFrame。
                scaleX: (typeof values.scale_x === "number" && Number.isFinite(values.scale_x) ? values.scale_x : 1) * (values.flipped === 1 ? -1 : 1), scaleY: this.seconds(values, "scale_y", 1),
                anchorX: values.flipped === 1 ? 1 - this.seconds(values, "anchor_x", 0.5) : this.seconds(values, "anchor_x", 0.5), anchorY: this.seconds(values, "anchor_y", 0.5) - 0.07
            });
        } else if (values.format !== undefined || row.type === 5) {
            throw new Error("投射或序列帧缺少资源");
        }
        return Object.freeze({
            effectOnly: row.type === 1 || row.type === 6 || row.type === 7 || row.type === 9, onSource: row.type === 6 || row.type === 9,
            battlefieldOffset: row.type === 9 ? Object.freeze([this.seconds(values, "offset_x", 0), this.seconds(values, "offset_y", 0)]) as readonly [number, number] : null,
            melee: row.type === 2 || row.type === 11, projectile: row.type === 5, effect,
            moveSeconds: row.type === 2 || row.type === 11 ? this.seconds(values, "move_time", 0.1) : 0, action: action === "skill" ? "attack2" : action === "skill2" ? "attack3" : action === "transform" ? "skill" : "attack",
            attackSeconds: this.seconds(values, "attack_time", 0),
            attackDelaySeconds: this.seconds(values, "attack_delay", 0),
            actionSeconds: this.seconds(values, "action_time", 0),
            beforeReturnSeconds: this.seconds(values, "move_back", 0),
            sounds: Object.freeze(sounds.slice()) as readonly string[]
        });
    }

    /** 旧1005固定头顶循环眩晕帧，与技能图标分别加载；实例移除不能删除同类型剩余实例的装饰。 */
    public static dizzyFrames(): readonly string[] {
        return Object.freeze(Array.from({length: 10}, (_, index) =>
            "effects/skill/hero-skill/hero-skill_effect-1-" + index + "/spriteFrame"));
    }

    /** 旧SkillController每个效果从技能起点延迟delay帧，按60帧换算，不叠加攻击动作耗时。 */
    public static delaySeconds(row: { delay: number }): number {
        if (!Number.isFinite(row.delay) || row.delay < 0) {
            throw new Error("战斗效果延迟无效");
        }
        return row.delay / 60;
    }

    /** 旧暗屏淡入、停留、淡出参数；读取效果自身ani_base，零秒配置有效。 */
    public static dimly(row: { ani_base: string }): readonly number[] {
        const base = JSON.parse(row.ani_base);
        if (!base || typeof base !== "object" || Array.isArray(base)) {
            throw new Error("暗屏配置无效");
        }
        return Object.freeze([this.seconds(base, "time_in", 0.5),
            this.seconds(base, "time_delay", 1), this.seconds(base, "time_out", 0.5)]);
    }

    /** 伤害音效属于伤害Buff本身；不可从攻击表现或技能ID猜测，非法配置须中止播放。 */
    public static damageSounds(row: { type: number; sound: string }): readonly string[] {
        if (row.type !== 100) {
            throw new Error("伤害音效类型尚未支持：" + row.type);
        }
        const sounds: unknown = JSON.parse(row.sound);
        if (!Array.isArray(sounds) || !sounds.every(value => typeof value === "string" && /^[a-zA-Z0-9_-]+$/.test(value))) {
            throw new Error("伤害音效配置无效");
        }
        return Object.freeze(sounds.slice()) as readonly string[];
    }

    /** 缺省值来自旧常量；零值有效，负值或非数值不可进入动画计时。 */
    private static seconds(values: Record<string, unknown>, key: string, fallback: number): number {
        const value = values[key] === undefined ? fallback : values[key];
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
            throw new Error("攻击动作时间无效：" + key);
        }
        return value;
    }
}
