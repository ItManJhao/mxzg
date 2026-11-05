/** 按旧BattleActionUtils._attackingAction及_actions[2/3]解析近身与原地远程时序；不把life当动作时长或生成通用特效。 */
export interface BattleAttackPlan {
    /** true为type2近身移动；false为type3原地施法，不能瞬移到目标。 */
    readonly melee: boolean;
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

    /** 读取同源buff行；开放type2/3及第3关type5与远程真实帧资源，未知表现明确拒绝。 */
    public static plan(row: { type: number; ani_base: string; file: string; sound: string }): BattleAttackPlan {
        if ([2, 3, 5].indexOf(row.type) < 0) throw new Error("尚未支持该战斗动作类型");
        const base: unknown = JSON.parse(row.ani_base);
        const files: unknown = JSON.parse(row.file);
        const sounds: unknown = JSON.parse(row.sound);
        if (!base || typeof base !== "object" || Array.isArray(base)
            || !Array.isArray(files)
            || !Array.isArray(sounds) || !sounds.every(value => typeof value === "string")) {
            throw new Error("攻击动作配置超出当前支持范围");
        }
        const values = base as Record<string, unknown>;
        const known = ["move_time", "attack_time", "attack_delay", "action_time", "move_back", "action", "format", "duration", "scale_x", "scale_y", "anchor_x", "anchor_y"];
        if (Object.keys(values).some(key => known.indexOf(key) < 0)) {
            throw new Error("攻击动作存在未支持参数");
        }
        const action = values.action === undefined ? "attack" : values.action;
        if (["attack", "skill", "skill2", "transform"].indexOf(action as string) < 0) {
            throw new Error("攻击动作名称无效");
        }
        let effect: BattleAttackPlan["effect"] = null;
        if (files.length) {
            const counts: Record<string, number> = { "skill-101040050": 7, "skill-101020021": 11 };
            const file = files[0];
            if (files.length !== 1 || typeof file !== "string" || !counts[file]
                || values.format !== file + "/%d.png" || row.type === 2) {
                throw new Error("战斗帧资源尚未核对");
            }
            const interval = this.seconds(values, "duration", 0.05);
            if (interval <= 0) throw new Error("特效帧间隔无效");
            effect = Object.freeze({
                paths: Object.freeze(Array.from({length: counts[file]}, (_, index) =>
                    "battle/skill/" + file + "/" + file + "_" + index + "/spriteFrame")),
                interval,
                // 旧getAnimateCount包含首次查找失败的那一帧，7张图实际飞行8个间隔。
                flightSeconds: (counts[file] + 1) * interval,
                scaleX: this.seconds(values, "scale_x", 1), scaleY: this.seconds(values, "scale_y", 1),
                anchorX: this.seconds(values, "anchor_x", 0.5), anchorY: this.seconds(values, "anchor_y", 0.5) - 0.07
            });
        } else if (values.format !== undefined || row.type === 5) {
            throw new Error("投射或序列帧缺少资源");
        }
        return Object.freeze({
            melee: row.type === 2, projectile: row.type === 5, effect,
            moveSeconds: row.type === 2 ? this.seconds(values, "move_time", 0.1) : 0, action: action === "skill" ? "attack2" : action === "skill2" ? "attack3" : action === "transform" ? "skill" : "attack",
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
            "battle/skill/hero-skill/hero-skill_effect-1-" + index + "/spriteFrame"));
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
