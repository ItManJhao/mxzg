/** 按旧 G_BATTLE_ACTIONS 覆盖及 BattleActionUtils 解析近身、场地移动、投掷和独立特效时序，由战报播放器消费。 */
export interface BattleAttackPlan {
    /** true为type2/11近身移动；false为type3原地施法，不能瞬移到目标。 */
    readonly melee: boolean;
    /** 1为空动作，6/7/9只播放独立特效，不覆盖施法骨骼；6定位施法者，7定位各目标，9定位战场。 */
    readonly effectOnly: boolean;
    readonly onSource: boolean;
    /** type9按战场宽高比例定位，仅播放一次；左右阵营按旧特效层镜像。 */
    readonly battlefieldOffset: readonly [number, number] | null;
    /** type8角色按显式战场宽高比例移动，敌方镜像横坐标；其他类型为null，不与type9特效位置混用。 */
    readonly moveOffset: readonly [number, number] | null;
    /** type5和type10投射，按旧帧计数飞行；type3在各目标脚下播放一次。 */
    readonly projectile: boolean;
    /** type10按施法者阵营镜像的战场目标比例；type5以各命中目标为终点。 */
    readonly projectileOffset: readonly [number, number] | null;
    /** 同源序列帧路径、帧间隔、缩放和锚点；只有无实际帧时为null。 */
    readonly effect: { paths: readonly string[]; interval: number; flightSeconds: number;
        scaleX: number; scaleY: number; anchorX: number; anchorY: number } | null;
    /** 秒；去程与回程分别使用相同移动时间。 */
    readonly moveSeconds: number;
    /** 按旧BattleHeroNode.Action映射骨骼动作；真正空type1为空串，skill为attack2，skill2为attack3，transform为skill。 */
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

/** 已核实旧覆盖子动作；不保存当前关卡、资源缓存或网络状态。 */
interface LegacyAttackAction {
    /** 旧动作类型，决定角色、投射或独立帧语义。 */
    readonly type: number;
    /** 从技能起点计算的60帧制延迟。 */
    readonly delay: number;
    /** 原暗屏标志；不从技能名称或帧资源推测。 */
    readonly dimly: number;
    /** 原位移、动作和帧参数，坐标允许原来的负锚点。 */
    readonly base: Readonly<Record<string, number | string>>;
    /** 原file仅用于预载；实际format另由唯一plan核对。 */
    readonly files: readonly string[];
    /** 原音效调用，保留多路与空数组，不按同名去重。 */
    readonly sounds: readonly string[];
}

export class BattleAttackUtils {
    /** 纯配置工具不保存播放状态。 */
    private constructor() {}

    /** 旧BattleInfoFactory优先展开G_BATTLE_ACTIONS；恢复已核对的英雄覆盖，内部索引不写回战报。 */
    public static legacyActions<T extends { idx: number; type: number; ani_base: string; file: string; sound: string; delay: number; dimly: number }>(row: T): readonly T[] {
        const verified = this.verifiedLegacyActions(row.idx);
        if (verified) {
            return verified.map((entry, index) => {
                const base = { ...entry.base };
                // 旧type5与_attackingAction都不消费delay_time，不能把它误加为额外等待。
                delete base.delay_time;
                const format = base.format;
                // type2的file仅预载；type10可复用同技能已加载图集，实际按带前缀的format取帧。
                const files = entry.type === 2 || entry.type === 11 ? []
                    : entry.type === 10 ? entry.files
                    : entry.files.length ? entry.files
                    : typeof format === "string" ? [format.replace("/%d.png", "")] : [];
                return { ...row, idx: row.idx * 10 + index, type: entry.type, delay: entry.delay,
                    dimly: entry.dimly, shake: 0, ani_base: JSON.stringify(base),
                    file: JSON.stringify(files), sound: JSON.stringify(entry.sounds) };
            });
        }
        // 荆棘之炎在场地比例位置施法；第15帧独立特效读取当下施法者位置，不能改成目标近身或删除覆盖。
        if (row.idx === 1051101) {
            return [
                { ...row, idx: row.idx * 10, type: 8, delay: 0, dimly: 0, shake: 0,
                    ani_base: JSON.stringify({ move_time: 0.1, move_back: 1.7, attack_delay: 0.3,
                        offset_x: 0.55, offset_y: 0.4 }), file: "[]",
                    sound: JSON.stringify(["skill-101040051"]) },
                { ...row, idx: row.idx * 10 + 1, type: 6, delay: 15, dimly: 1, shake: 0,
                    ani_base: JSON.stringify({ format: "skill-101040051/%d.png", anchor_x: 0.5,
                        anchor_y: 0.4, duration: 0.1, scale_x: 1.3, scale_y: 1.3 }),
                    file: JSON.stringify(["skill-101040051"]), sound: "[]" },
            ];
        }
        // 玛蒙近身本体没有额外音效；旧第25帧在施法者当下位置挂特效并单独播放原音效。
        if (row.idx === 1020100) {
            return [
                { ...row, idx: row.idx * 10, type: 2, delay: 0, dimly: 0, shake: 0,
                    ani_base: JSON.stringify({ move_time: 0.1, move_back: 1, attack_delay: 0 }),
                    file: "[]", sound: "[]" },
                { ...row, idx: row.idx * 10 + 1, type: 6, delay: 25, dimly: 0, shake: 0,
                    ani_base: JSON.stringify({ format: "skill-101030030/%d.png", anchor_x: 0.3,
                        anchor_y: 0.5, duration: 0.06, scale_x: 1.8, scale_y: 1.8 }),
                    file: JSON.stringify(["skill-101030030"]), sound: JSON.stringify(["skill-101030030"]) },
            ];
        }
        // 寒冬、企鹅绅士和水元素史莱姆共用空段与原地普攻。独立的表现事件仍按原表执行，保留原双特效和音效。
        if (row.idx === 2050100 || row.idx === 2160100 || row.idx === 2170100) {
            return [
                { ...row, idx: row.idx * 10, type: 1, delay: 0, dimly: 0, shake: 0,
                    ani_base: "{}", file: "[]", sound: "[]" },
                { ...row, idx: row.idx * 10 + 1, type: 3, delay: 0, dimly: 0, shake: 0,
                    ani_base: JSON.stringify({ attack_time: 0.3, action_time: 0.8,
                        format: "skill-102040050/%d.png", duration: 0.04,
                        scale_x: 1, scale_y: 1, anchor_y: 0.2 }),
                    file: JSON.stringify(["skill-102040050"]), sound: JSON.stringify(["skill-102040050"]) },
            ];
        }
        // 追猎者普攻的file仅供旧预载；近身负责唯一音效，第30帧的type6在施法者位置播放。
        if (row.idx === 3020100) {
            return [
                { ...row, idx: row.idx * 10, type: 2, delay: 0, dimly: 0,
                    ani_base: JSON.stringify({ move_time: 0.1, move_back: 1.5, attack_delay: 0.4 }),
                    file: "[]", sound: JSON.stringify(["skill-103030030"]) },
                { ...row, idx: row.idx * 10 + 1, type: 6, delay: 30, dimly: 0,
                    ani_base: JSON.stringify({ format: "skill-103030030/%d.png", anchor_x: 0.6,
                        anchor_y: 0.35, duration: 0.06, scale_x: 1.4, scale_y: 1.4 }),
                    file: JSON.stringify(["skill-103030030"]), sound: "[]" },
            ];
        }
        // 木灵使者、诺亚、流浪稻草人和风暴之雏的普攻均将目标特效与 type11 近身并行播放。
        if (row.idx === 3040300 || row.idx === 3050300 || row.idx === 3160300 || row.idx === 3170300) {
            return [
                { ...row, idx: row.idx * 10, type: 7, delay: 30, dimly: 0,
                    ani_base: JSON.stringify({ format: "skill-103040050/%d.png", anchor_x: 0.25,
                        anchor_y: 0.21, duration: 0.06, scale_x: 1.4, scale_y: 1.4 }),
                    file: JSON.stringify(["skill-103040050"]), sound: JSON.stringify(["skill-103040050"]) },
                { ...row, idx: row.idx * 10 + 1, type: 11, delay: 0, dimly: 0,
                    ani_base: JSON.stringify({ move_time: 0.1, move_back: 2, attack_delay: 0.2,
                        offset_x: 0.6, offset_y: 0.3 }), file: "[]", sound: "[]" },
            ];
        }
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
        // 布鲁、冰霜元素、冰晶女巫和缇芮的普攻沿旧覆盖在目标处播放四倍水花。
        if (row.idx === 2010100 || row.idx === 2020100 || row.idx === 2030100 || row.idx === 2040100) {
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

    /** 按旧 G_BATTLE_ACTIONS 的声明顺序返回动作，保留不同等级的施法节奏及替换普攻暗屏。 */
    private static verifiedLegacyActions(id: number): readonly LegacyAttackAction[] | null {
        switch (id) {
            case 2041401:
                return [
                    { type: 6, delay: 15, dimly: 1, base: { format: "skill-102040041/%d.png", anchor_x: 0.7,
                        anchor_y: 0.5, duration: 0.1, scale_x: 2.3, scale_y: 2.3, offset_x: 30, offset_y: 0 },
                        files: ["skill-102040041"], sounds: ["skill-102040041"] },
                    { type: 10, delay: 30, dimly: 0, base: { attack_time: 0.3, action_time: 0.5,
                        format: "skill-102040041/arrow-%d.png", scale_x: 1.5, scale_y: 1.5,
                        offset_x: 0.8, offset_y: 0.4, duration: 0.1 }, files: [], sounds: [] },
                ];
            case 4050100:
                return [
                    { type: 3, delay: 0, dimly: 0, base: { attack_time: 0.3, action_time: 1.7,
                        format: "skill-104050050/%d.png", duration: 0.06, scale_x: 2, scale_y: 2, anchor_y: 0.2 },
                        files: ["skill-104050050"], sounds: ["skill-104050050"] },
                ];
            case 4051101:
                return [
                    { type: 3, delay: 0, dimly: 1, base: { action: "skill", action_time: 2 }, files: [], sounds: [] },
                    { type: 6, delay: 20, dimly: 0, base: { format: "skill-104050051-1/%d.png", anchor_x: 0.5,
                        anchor_y: 0.25, duration: 0.03, scale_x: 1, scale_y: 1 }, files: ["skill-104050051-1"], sounds: [] },
                    { type: 7, delay: 70, dimly: 1, base: { format: "skill-104050051/%d.png", anchor_x: 0.5,
                        anchor_y: 0.5, duration: 0.05, scale_x: 1, scale_y: 1 },
                        files: ["skill-104050051"], sounds: ["skill-104050051"] },
                ];
            case 1030100:
                return [
                    { type: 2, delay: 0, dimly: 0,
                        base: {"move_time": 0.1, "move_back": 1, "attack_delay": 0.0},
                        files: [], sounds: [] },
                    { type: 6, delay: 25, dimly: 0,
                        base: {"format": "skill-101030030/%d.png", "anchor_x": 0.3, "anchor_y": 0.5, "duration": 0.06, "scale_x": 1.6, "scale_y": 1.6},
                        files: ["skill-101030030"], sounds: ["skill-101030030"] },
                ];
            case 1031101:
                return [
                    { type: 2, delay: 0, dimly: 1,
                        base: {"move_time": 0.1, "move_back": 1},
                        files: [], sounds: [] },
                    { type: 7, delay: 20, dimly: 0,
                        base: {"format": "skill-101020021/%d.png", "anchor_y": 0.25, "duration": 0.04, "scale_x": 1.8, "scale_y": 1.8},
                        files: ["skill-101020021"], sounds: ["skill-101020021"] },
                ];
            // 木灵使者在近身时播放音效，第 20 帧在命中目标上单独播放暗屏特效。
            case 3041101:
                return [
                    {
                        type: 2, delay: 0, dimly: 0,
                        base: { move_time: 0.1, move_back: 1 },
                        files: ["skill-103040041"], sounds: ["skill-103040041"],
                    },
                    {
                        type: 7, delay: 20, dimly: 1,
                        base: { format: "skill-103040041/%d.png", anchor_y: 0.45, duration: 0.04,
                            scale_x: 1, scale_y: 1 },
                        files: [], sounds: [],
                    },
                ];
            case 3030300:
                return [
                    { type: 7, delay: 30, dimly: 0,
                        base: {"format": "skill-103030030/%d.png", "anchor_y": 0.35, "anchor_x": 0.25, "duration": 0.06, "scale_x": 2.8, "scale_y": 2.8, "flipped": 1},
                        files: ["skill-103030030"], sounds: ["skill-103030030"] },
                    { type: 11, delay: 0, dimly: 0,
                        base: {"move_time": 0.1, "move_back": 2, "attack_delay": 0.2, "offset_x": 0.6, "offset_y": 0.3},
                        files: [], sounds: [] },
                ];
            case 3031101:
                return [
                    { type: 3, delay: 0, dimly: 1,
                        base: {"attack_time": 0.3, "action_time": 1, "format": "skill-103030031/%d.png", "duration": 0.06, "scale_x": 4, "scale_y": 4, "anchor_y": 0.2, "anchor_x": 0.5},
                        files: ["skill-103030031"], sounds: ["skill-103030031"] },
                ];
            case 3120100:
                // 旧普攻在施法者位置补帧，近身回退仍由11号动作承担。旧覆盖引用的同名音效文件未找到。
                return [
                    { type: 1, delay: 0, dimly: 0, base: {}, files: [], sounds: [] },
                    { type: 6, delay: 30, dimly: 0,
                        base: { format: "skill-103040120/%d.png", anchor_y: 0.35, anchor_x: 0.25,
                            duration: 0.04, scale_x: 2.4, scale_y: 2.4 },
                        files: ["skill-103040120"], sounds: [] },
                    { type: 11, delay: 0, dimly: 0,
                        base: { move_time: 0.1, move_back: 2, attack_delay: 0.2, offset_x: 0.6, offset_y: 0.3 },
                        files: [], sounds: [] },
                ];
            case 3121101:
                // 覆盖替换表里的银翼杀手素材，由目标侧独立子动作播帧。原同名音效文件未找到。
                return [
                    { type: 2, delay: 0, dimly: 0, base: { move_time: 0.1, move_back: 1 },
                        files: ["skill-103040121"], sounds: [] },
                    { type: 7, delay: 20, dimly: 1,
                        base: { format: "skill-103040121/%d.png", anchor_y: 0.25,
                            duration: 0.04, scale_x: -2.6, scale_y: 2.6 },
                        files: [], sounds: [] },
                ];
            case 4010100:
                return [
                    { type: 5, delay: 0, dimly: 0,
                        base: {"attack_time": 0.3, "delay_time": 0.3, "action_time": 0.3, "format": "skill-104040020/%d.png", "scale_x": 2, "scale_y": 2, "duration": 0.03},
                        files: ["skill-104040020"], sounds: ["skill-104040020"] },
                ];
            case 4011101:
                return [
                    { type: 2, delay: 0, dimly: 0,
                        base: {"move_time": 0.1, "move_back": 1},
                        files: [], sounds: [] },
                    { type: 6, delay: 15, dimly: 1,
                        base: {"format": "skill-104030011/%d.png", "anchor_x": 0.6, "anchor_y": 0.35, "duration": 0.1, "scale_x": 1.1, "scale_y": 1.1},
                        files: ["skill-104030011"], sounds: ["skill-104030011"] },
                ];
            case 4020100:
                // 蒂芬妮与蕾雅复用普攻帧，旧动作的帧间隔不同。
                return [
                    {
                        type: 5, delay: 0, dimly: 0,
                        base: { attack_time: 0.3, delay_time: 0.3, action_time: 0.3,
                            format: "skill-104040020/%d.png", scale_x: 2, scale_y: 2, duration: 0.05 },
                        files: ["skill-104040020"], sounds: ["skill-104040020"],
                    },
                ];
            case 4021101:
                // 一级主动原地施法，目标侧播放带原锚点的暗屏特效。
                return [
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: { attack_time: 0.3, action_time: 1, format: "skill-104040021/%d.png",
                            duration: 0.06, scale_x: 1.8, scale_y: 1.8, anchor_y: 0.16, anchor_x: 0.51 },
                        files: ["skill-104040021"], sounds: ["skill-104040021"],
                    },
                ];
            case 4030100:
                // 赛拉近身普攻在第 40 帧挂随身镜像特效，旧两段均无音效。
                return [
                    {
                        type: 2, delay: 0, dimly: 0,
                        base: { move_time: 0.1, move_back: 1, attack_delay: 0.3 },
                        files: [], sounds: [],
                    },
                    {
                        type: 6, delay: 40, dimly: 0,
                        base: { format: "skill-104050040/%d.png", anchor_x: 0.5, anchor_y: 0.4,
                            duration: 0.1, scale_x: 2, scale_y: 2, flipped: 1 },
                        files: ["skill-104050040"], sounds: [],
                    },
                ];
            case 4031101:
                // 一级主动把带音效的暗屏施法和目标侧镜像特效分开。
                return [
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: { attack_time: 0.6, action_time: 1 },
                        files: [], sounds: ["skill-104040031"],
                    },
                    {
                        type: 7, delay: 0, dimly: 0,
                        base: { format: "skill-104040031/%d.png", anchor_y: 0.3, duration: 0.1,
                            scale_x: 1.3, scale_y: 1.3, flipped: 1 },
                        files: ["skill-104040031"], sounds: [],
                    },
                ];
            case 5010300:
                return [
                    { type: 7, delay: 0, dimly: 0,
                        base: {"format": "skill-105040030/%d.png", "anchor_y": 0.4, "anchor_x": 0.45, "duration": 0.08, "scale_x": 1.8, "scale_y": 1.8},
                        files: ["skill-105040030"], sounds: ["skill-105040030"] },
                    { type: 11, delay: 0, dimly: 0,
                        base: {"move_time": 0.1, "move_back": 2, "attack_delay": 0.2, "offset_x": 0.6, "offset_y": 0.3},
                        files: [], sounds: [] },
                ];
            case 5011101:
                return [
                    { type: 2, delay: 0, dimly: 0,
                        base: {"move_time": 0.1, "move_back": 1},
                        files: ["skill-105030011"], sounds: ["skill-105030011"] },
                    { type: 6, delay: 15, dimly: 1,
                        base: {"format": "skill-105030011/%d.png", "anchor_x": 0.7, "anchor_y": 0.4, "duration": 0.1, "scale_x": 1.8, "scale_y": 1.8},
                        files: [], sounds: [] },
                ];
            case 5080100:
                return [
                    {
                        type: 3,
                        delay: 0,
                        dimly: 0,
                        base: {
                            attack_time: 0.3,
                            action_time: 1.7,
                            format: "skill-105050080/%d.png",
                            duration: 0.1,
                            scale_x: 1.4,
                            scale_y: 1.4,
                            anchor_x: 0.5,
                            anchor_y: 0.5,
                        },
                        files: ["skill-105050080"],
                        sounds: ["skill-105050080"],
                    },
                ];
            case 5081101:
                // 亡灵之刃的原地施法只播骨骼和音效，预载的图集由第 30 帧的战场特效播放。
                return [
                    {
                        type: 3,
                        delay: 0,
                        dimly: 0,
                        base: { attack_time: 0.6, action_time: 1.8 },
                        files: [],
                        sounds: ["skill-105050081"],
                    },
                    {
                        type: 9,
                        delay: 30,
                        dimly: 1,
                        base: {
                            format: "skill-105050081/%d.png",
                            duration: 0.06,
                            scale_x: 1.5,
                            scale_y: 1.5,
                            anchor_x: 0.5,
                            anchor_y: 0.5,
                            offset_x: 0.6,
                            offset_y: 0.5,
                        },
                        files: [],
                        sounds: [],
                    },
                ];
            case 1080100:
                return [
                    { type: 5, delay: 0, dimly: 0,
                        base: {"attack_time": 0.4, "action_time": 0.4, "format": "skill-101050080-1/%d.png", "duration": 0.02},
                        files: ["skill-101050080-1"], sounds: ["skill-101050080"] },
                    { type: 7, delay: 20, dimly: 0,
                        base: {"format": "skill-101050080-2/%d.png", "anchor_x": 0.4, "anchor_y": 0.4, "duration": 0.1, "scale_x": 1.2, "scale_y": 1.2, "flipped": 1},
                        files: ["skill-101050080-2"], sounds: [] },
                ];
            case 1081101:
                return [
                    { type: 3, delay: 0, dimly: 0,
                        base: {"action": "skill", "attack_time": 0.6, "action_time": 1},
                        files: [], sounds: [] },
                    { type: 9, delay: 75, dimly: 1,
                        base: {"format": "skill-101050081/%d.png", "anchor_y": 0.55, "anchor_x": 0.45, "duration": 0.04, "scale_x": 2, "scale_y": 2, "offset_x": 0.75, "offset_y": 0.5},
                        files: ["skill-101050081"], sounds: ["skill-101050081"] },
                    { type: 6, delay: 40, dimly: 0,
                        base: {"format": "skill-101050081-1/%d.png", "anchor_x": 0.45, "anchor_y": -0.1, "duration": 0.025, "scale_x": 1, "scale_y": 1},
                        files: ["skill-101050081-1"], sounds: [] },
                ];
            case 2141101:
                return [
                    { type: 3, delay: 0, dimly: 0,
                        base: {"action": "skill", "attack_time": 0.6, "action_time": 1.8},
                        files: [], sounds: [] },
                    { type: 7, delay: 100, dimly: 1,
                        base: {"format": "skill-102050141/%d.png", "anchor_x": 0.5, "anchor_y": 0.35, "duration": 0.05, "scale_x": 3, "scale_y": 3},
                        files: ["skill-102050141"], sounds: ["skill-102050110"] },
                    { type: 6, delay: 10, dimly: 0,
                        base: {"format": "skill-102050141-1/%d.png", "anchor_x": 0.5, "anchor_y": 0.3, "duration": 0.035, "scale_x": 2, "scale_y": 2},
                        files: ["skill-102050141-1"], sounds: [] },
                ];
            case 1161101:
            case 1171101:
                return [
                    { type: 8, delay: 0, dimly: 0,
                        base: {"move_time": 0.1, "move_back": 1.7, "attack_delay": 0.3, "offset_x": 0.55, "offset_y": 0.4},
                        files: [], sounds: ["skill-101040051"] },
                    { type: 6, delay: 15, dimly: 1,
                        base: {"format": "skill-101040051/%d.png", "anchor_x": 0.7, "anchor_y": 0.4, "duration": 0.1, "scale_x": 1.3, "scale_y": 1.3},
                        files: ["skill-101040051"], sounds: [] },
                ];
            case 1061101: // 安妮雅一技能，三个等级共用旧动作。
            case 1061102:
            case 1061103:
                return [
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: {
                            action_time: 1, anchor_x: 0.625, anchor_y: 0.325, attack_time: 0.3, duration: 0.06,
                            format: "skill-101050061/%d.png", scale_x: 1.4, scale_y: 1.4,
                        },
                        files: ["skill-101050061"], sounds: ["skill-101050061"],
                    },
                    {
                        type: 1, delay: 0, dimly: 0,
                        base: {},
                        files: [], sounds: [],
                    },
                ];
            case 1091101: // 赤焰舞姬一技能。
            case 1091102:
            case 1091103:
                return [
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { action: "skill", action_time: 1.2, attack_time: 0.6 },
                        files: [], sounds: [],
                    },
                    {
                        type: 9, delay: 70, dimly: 1,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.7, duration: 0.06, format: "skill-101050091/%d.png",
                            offset_x: 0.6, offset_y: 0.5, scale_x: 2, scale_y: 2,
                        },
                        files: ["skill-101050091"], sounds: ["skill-101050091"],
                    },
                    {
                        type: 6, delay: 50, dimly: 0,
                        base: {
                            anchor_x: 0.45, anchor_y: 0.3, duration: 0.028, format: "skill-101050091-1/%d.png",
                            scale_x: 2, scale_y: 2,
                        },
                        files: ["skill-101050091-1"], sounds: [],
                    },
                ];
            case 1101101: // 琪亚娜一技能。
            case 1101102:
            case 1101103:
                return [
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { action: "skill", action_time: 1.8 },
                        files: [], sounds: [],
                    },
                    {
                        type: 7, delay: 90, dimly: 0,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.2, duration: 0.05, format: "skill-101050101/%d.png",
                            scale_x: 3, scale_y: 3,
                        },
                        files: ["skill-101050101"], sounds: ["skill-101040041"],
                    },
                ];
            case 1103101: // 琪亚娜三技能。
            case 1103102:
                return [
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { action: "skill2", action_time: 1.8 },
                        files: [], sounds: [],
                    },
                    {
                        type: 7, delay: 70, dimly: 0,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.55, duration: 0.05, format: "skill-104050051/%d.png",
                            scale_x: 1, scale_y: 1,
                        },
                        files: ["skill-104050051"], sounds: ["skill-101040041"],
                    },
                ];
            case 2061101: // 海神祭司一技能。
            case 2061102:
            case 2061103:
                return [
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: {
                            action: "skill", action_time: 1, anchor_y: 0.365, attack_time: 1, duration: 0.1,
                            format: "skill-102050061/%d.png", scale_x: 1, scale_y: 1,
                        },
                        files: ["skill-102050061"], sounds: ["skill-102050061"],
                    },
                    {
                        type: 1, delay: 0, dimly: 0,
                        base: {},
                        files: [], sounds: [],
                    },
                ];
            case 2071101: // 寒冰战姬一技能。
            case 2071102:
            case 2071103:
                return [
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: {
                            action: "skill", action_time: 2, anchor_y: 0.17, attack_time: 1, duration: 0.06,
                            format: "skill-102050071/%d.png", scale_x: 1, scale_y: 1,
                        },
                        files: ["skill-102050071"], sounds: ["skill-102050071"],
                    },
                    {
                        type: 1, delay: 0, dimly: 0,
                        base: {},
                        files: [], sounds: [],
                    },
                ];
            case 2081101:
            case 2081102:
            case 2081103: { // 格伦男爵一技能，二、三级共享较早的出手与不同帧间隔。
                const firstLevel = id === 2081101;
                return [
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: {
                            action: "skill", action_time: 2, anchor_y: 0.3,
                            attack_time: firstLevel ? 0.8 : 0.3, duration: firstLevel ? 0.048 : 0.1,
                            format: "skill-102050081/%d.png", scale_x: 0.8, scale_y: 0.8,
                        },
                        files: ["skill-102050081"], sounds: ["skill-102050081"],
                    },
                    {
                        type: 6, delay: 50, dimly: 0,
                        base: {
                            anchor_x: 0.35, anchor_y: 0.3, duration: 0.03, format: "skill-102050081-1/%d.png",
                            scale_x: 1, scale_y: 1,
                        },
                        files: ["skill-102050081-1"], sounds: [],
                    },
                ];
            }
            case 2110100: // 章鱼公主·普攻
                return [
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: {
                            action_time: 1.5, anchor_x: 0.5, anchor_y: 0.2, attack_time: 0.3, duration: 0.1,
                            format: "skill-102050110/%d.png", scale_x: 3, scale_y: 3,
                        },
                        files: ["skill-102050110"], sounds: ["skill-102050110"],
                    },
                ];
            case 2111101: // 章鱼公主一技能。
            case 2111102:
            case 2111103:
                return [
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { action: "skill", action_time: 1.8, attack_time: 0.6 },
                        files: [], sounds: ["skill-102050111"],
                    },
                    {
                        type: 7, delay: 70, dimly: 1,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.3, duration: 0.05, format: "skill-102050111/%d.png",
                            scale_x: 3, scale_y: 3,
                        },
                        files: ["skill-102050111"], sounds: ["skill-102050111"],
                    },
                    {
                        type: 6, delay: 30, dimly: 0,
                        base: {
                            anchor_x: 0.55, anchor_y: -0.1, duration: 0.035,
                            format: "skill-102050111-1/%d.png", scale_x: 1.2, scale_y: 1.2,
                        },
                        files: ["skill-102050111-1"], sounds: [],
                    },
                ];
            case 2113101:
            case 2113102: // 章鱼公主三技能，施法后第60帧对目标播放原特效。
                return [
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { action: "skill2", action_time: 2 },
                        files: [], sounds: [],
                    },
                    {
                        type: 7, delay: 60, dimly: 0,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.3, duration: 0.05, format: "skill-102050113/%d.png",
                            scale_x: 3, scale_y: 3,
                        },
                        files: ["skill-102050113"], sounds: ["skill-102050113"],
                    },
                ];
            case 2130100: // 唤潮剑姬·普攻
                return [
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { move_back: 0.8, move_time: 0.1 },
                        files: [], sounds: ["skill-102040130"],
                    },
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: {
                            action_time: 1, anchor_y: 0.5, attack_time: 0.3, duration: 0.04,
                            format: "skill-102040130/%d.png", scale_x: 1.3, scale_y: 1.3,
                        },
                        files: ["skill-102040130"], sounds: [],
                    },
                ];
            case 2131201: // 唤潮剑姬一技能。
            case 2131202:
            case 2131203:
                return [
                    {
                        type: 9, delay: 70, dimly: 1,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.63, duration: 0.06, format: "skill-102040131/%d.png",
                            offset_x: 0.75, offset_y: 0.5, scale_x: 2, scale_y: 2,
                        },
                        files: ["skill-102040131"], sounds: ["skill-102040131"],
                    },
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { action: "skill", action_time: 1.8, attack_time: 0.6 },
                        files: [], sounds: [],
                    },
                    {
                        type: 1, delay: 0, dimly: 0,
                        base: {},
                        files: [], sounds: [],
                    },
                ];
            case 2150200: // 凯萨丁·普攻
                return [
                    {
                        type: 7, delay: 0, dimly: 0,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.3, duration: 0.08, format: "skill-102050150/%d.png",
                            scale_x: 3, scale_y: 3,
                        },
                        files: ["skill-102050150"], sounds: ["skill-102050150"],
                    },
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { action_time: 1.8, attack_time: 0.6 },
                        files: [], sounds: [],
                    },
                ];
            case 2151201: // 凯萨丁一技能。
            case 2151202:
            case 2151203:
                return [
                    {
                        type: 7, delay: 70, dimly: 1,
                        base: {
                            anchor_x: 0.27, anchor_y: 0.3, duration: 0.08, format: "skill-102050151/%d.png",
                            scale_x: 4, scale_y: 4,
                        },
                        files: ["skill-102050151"], sounds: ["skill-102050150"],
                    },
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: { action: "skill", action_time: 1.8, attack_time: 0.6 },
                        files: [], sounds: [],
                    },
                    {
                        type: 6, delay: 60, dimly: 0,
                        base: {
                            anchor_x: 0.5, anchor_y: 0, duration: 0.02, format: "skill-102050151-1/%d.png",
                            scale_x: 3, scale_y: 3,
                        },
                        files: ["skill-102050151-1"], sounds: [],
                    },
                ];
            case 2155201:
            case 2155202: // 凯萨丁替换普攻共享原帧，延后目标特效并保持暗屏。
                return [
                    {
                        type: 7, delay: 10, dimly: 1,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.4, duration: 0.08, format: "skill-102050150/%d.png",
                            scale_x: 1, scale_y: 1,
                        },
                        files: ["skill-102050150"], sounds: ["skill-102050150"],
                    },
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: { action_time: 1.8, attack_time: 0.6 },
                        files: [], sounds: [],
                    },
                ];
            case 3061101: // 风行之神一技能。
            case 3061102:
            case 3061103:
                return [
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: { action: "skill", action_time: 1, attack_time: 0.6 },
                        files: [], sounds: [],
                    },
                    {
                        type: 9, delay: 50, dimly: 0,
                        base: {
                            anchor_x: 0.32, anchor_y: 0.35, duration: 0.1, format: "skill-103050061/%d.png",
                            offset_x: 0.5, offset_y: 0.5, scale_x: 2, scale_y: 2,
                        },
                        files: ["skill-103050061"], sounds: ["skill-103050061"],
                    },
                    {
                        type: 1, delay: 0, dimly: 0,
                        base: {},
                        files: [], sounds: [],
                    },
                ];
            case 3080100: // 森镜之灵·普攻
                return [
                    {
                        type: 2, delay: 0, dimly: 0,
                        base: { attack_delay: 0.4, move_back: 0.6, move_time: 0.1 },
                        files: [], sounds: [],
                    },
                    {
                        type: 7, delay: 30, dimly: 0,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.3, duration: 0.05, format: "skill-103050080/%d.png",
                            scale_x: 2, scale_y: 2,
                        },
                        files: ["skill-103050080"], sounds: ["skill-103050080"],
                    },
                ];
            case 3081101: // 森镜之灵一技能。
            case 3081102:
            case 3081103:
                return [
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: { action: "skill", action_time: 1, attack_time: 0.6 },
                        files: [], sounds: [],
                    },
                    {
                        type: 9, delay: 80, dimly: 0,
                        base: {
                            anchor_x: 0.51, anchor_y: 0.5, duration: 0.1, format: "skill-103050081/%d.png",
                            offset_x: 0.75, offset_y: 0.4, scale_x: 3, scale_y: 3,
                        },
                        files: ["skill-103050081"], sounds: ["skill-103050081"],
                    },
                    {
                        type: 6, delay: 80, dimly: 0,
                        base: {
                            anchor_x: 0.3, anchor_y: 0.45, duration: 0.05, format: "skill-103050081-1/%d.png",
                            scale_x: 3, scale_y: 3,
                        },
                        files: ["skill-103050081-1"], sounds: [],
                    },
                ];
            case 3083101: // 森镜之灵三技能。
            case 3083102:
                return [
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { action: "skill2", action_time: 2 },
                        files: [], sounds: [],
                    },
                    {
                        type: 7, delay: 75, dimly: 0,
                        base: {
                            anchor_x: 0.4, anchor_y: 0.3, duration: 0.05, format: "skill-103050083/%d.png",
                            scale_x: 2, scale_y: 2,
                        },
                        files: ["skill-103050083"], sounds: ["skill-103050083"],
                    },
                ];
            case 3091101: // 伊芙一技能。
            case 3091102:
            case 3091103:
                return [
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: {
                            action_time: 1.7, anchor_x: 0.5, anchor_y: 0.4, attack_time: 0.3, duration: 0.1,
                            format: "skill-103050091/%d.png", scale_x: 2, scale_y: 2,
                        },
                        files: ["skill-103050091"], sounds: ["skill-103050091"],
                    },
                    {
                        type: 6, delay: 20, dimly: 0,
                        base: {
                            anchor_x: 0.25, anchor_y: 0.4, duration: 0.02, format: "skill-103050091-1/%d.png",
                            scale_x: 2, scale_y: 2,
                        },
                        files: ["skill-103050091-1"], sounds: [],
                    },
                ];
            case 3101101: // 安塔利亚一技能。
            case 3101102:
            case 3101103:
                return [
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { action: "skill", action_time: 1.8, attack_time: 0.6 },
                        files: [], sounds: ["skill-103050101"],
                    },
                    {
                        type: 9, delay: 70, dimly: 1,
                        base: {
                            anchor_x: 0.45, anchor_y: 0.2, duration: 0.1, format: "skill-103050101/%d.png",
                            offset_x: 0.75, offset_y: 0.4, scale_x: 1.2, scale_y: 1,
                        },
                        files: ["skill-103050101"], sounds: [],
                    },
                    {
                        type: 6, delay: 70, dimly: 0,
                        base: {
                            anchor_x: -0.15, anchor_y: -0.15, duration: 0.02,
                            format: "skill-103050091-1/%d.png", scale_x: 1, scale_y: 1,
                        },
                        files: ["skill-103050091-1"], sounds: [],
                    },
                ];
            case 3103101: // 安塔利亚三技能。
            case 3103102:
                return [
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { action: "skill2", action_time: 2 },
                        files: [], sounds: [],
                    },
                    {
                        type: 7, delay: 70, dimly: 0,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.25, duration: 0.05, format: "skill-103050103/%d.png",
                            scale_x: 3, scale_y: 3,
                        },
                        files: ["skill-103050103"], sounds: ["skill-103050103"],
                    },
                ];
            case 3110200: // 开膛手·J·普攻
            case 3115201:
            case 3115202: { // 被动替换后的普攻使用同一帧序列，并按旧表暗屏。
                const dimly = id === 3110200 ? 0 : 1;
                return [
                    {
                        type: 7, delay: 0, dimly,
                        base: {
                            anchor_x: 0.35, anchor_y: 0.5, duration: 0.08, flipped: 1,
                            format: "skill-103050110/%d.png", scale_x: 1, scale_y: 1,
                        },
                        files: ["skill-103050110"], sounds: ["skill-103050110"],
                    },
                    {
                        type: 11, delay: 0, dimly,
                        base: {
                            attack_delay: 0.2, move_back: 2, move_time: 0.1, offset_x: 0.6, offset_y: 0.3,
                        },
                        files: [], sounds: [],
                    },
                ];
            }
            case 3111201: // 开膛手·J 一技能。
            case 3111202:
            case 3111203:
                return [
                    {
                        type: 7, delay: 10, dimly: 1,
                        base: {
                            anchor_x: 0.35, anchor_y: 0.5, duration: 0.08, flipped: 1,
                            format: "skill-103050111/%d.png", scale_x: 1, scale_y: 1,
                        },
                        files: ["skill-103050111"], sounds: ["skill-103050111"],
                    },
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: { action_time: 1.8, attack_time: 0.6 },
                        files: [], sounds: [],
                    },
                    {
                        type: 1, delay: 0, dimly: 0,
                        base: {},
                        files: [], sounds: [],
                    },
                ];
            case 4080200: // 艾妮利娅·普攻
                return [
                    {
                        type: 7, delay: 0, dimly: 0,
                        base: {
                            anchor_x: 0.55, anchor_y: 0.3, duration: 0.08, flipped: 1,
                            format: "skill-104050080/%d.png", scale_x: 1, scale_y: 1,
                        },
                        files: ["skill-104050080"], sounds: ["skill-104050080"],
                    },
                    {
                        type: 11, delay: 0, dimly: 0,
                        base: {
                            attack_delay: 0.2, move_back: 2, move_time: 0.1, offset_x: 0.6, offset_y: 0.3,
                        },
                        files: [], sounds: [],
                    },
                ];
            case 4081201: // 艾妮利娅1技能1级
                return [
                    {
                        type: 3, delay: 0, dimly: 1,
                        base: { action: "skill", action_time: 1, attack_time: 0.6 },
                        files: [], sounds: [],
                    },
                    {
                        type: 7, delay: 90, dimly: 1,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.3, duration: 0.05, format: "skill-104050081/%d.png",
                            scale_x: 1.5, scale_y: 1.5,
                        },
                        files: ["skill-104050081"], sounds: ["skill-104050081"],
                    },
                ];
            case 5020300: // 深渊元首·普攻
                return [
                    {
                        type: 7, delay: 0, dimly: 0,
                        base: {
                            anchor_x: 0.45, anchor_y: 0.4, duration: 0.08, format: "skill-105040030/%d.png",
                            scale_x: 1.8, scale_y: 1.8,
                        },
                        files: ["skill-105040030"], sounds: ["skill-105040030"],
                    },
                    {
                        type: 11, delay: 0, dimly: 0,
                        base: {
                            attack_delay: 0.2, move_back: 2, move_time: 0.1, offset_x: 0.6, offset_y: 0.3,
                        },
                        files: [], sounds: [],
                    },
                ];
            case 5030300: // 暗黑女爵·普攻
                return [
                    {
                        type: 7, delay: 0, dimly: 0,
                        base: {
                            anchor_x: 0.45, anchor_y: 0.4, duration: 0.08, flipped: 1,
                            format: "skill-105040030/%d.png", scale_x: 2, scale_y: 2,
                        },
                        files: ["skill-105040030"], sounds: ["skill-105040030"],
                    },
                    {
                        type: 11, delay: 0, dimly: 0,
                        base: {
                            attack_delay: 0.2, move_back: 2, move_time: 0.1, offset_x: 0.6, offset_y: 0.3,
                        },
                        files: [], sounds: [],
                    },
                ];
            case 5031101: // 暗黑女爵1技能1级
                return [
                    {
                        type: 5, delay: 0, dimly: 1,
                        base: {
                            action: "skill", action_time: 0.3, attack_time: 1.2,
                            format: "skill-105040031/%d.png", scale_x: 2, scale_y: 2,
                        },
                        files: ["skill-105040031"], sounds: ["skill-105040031"],
                    },
                    {
                        type: 1, delay: 0, dimly: 0,
                        base: {},
                        files: [], sounds: [],
                    },
                ];
            case 5121101: // 暗化幼龙1技能1级
                return [
                    {
                        type: 3, delay: 0, dimly: 0,
                        base: { action_time: 1.8, attack_time: 0.6 },
                        files: [], sounds: ["skill-105050081"],
                    },
                    {
                        type: 9, delay: 30, dimly: 1,
                        base: {
                            anchor_x: 0.5, anchor_y: 0.5, duration: 0.06, format: "skill-105050081/%d.png",
                            offset_x: 0.6, offset_y: 0.5, scale_x: 1.5, scale_y: 1.5,
                        },
                        files: ["skill-105050081"], sounds: [],
                    },
                ];
            default:
                return null;
        }
    }

    /** 判断该表现是否由通用攻击动作播放器解析，供资源准备与播放共用。 */
    public static isActionType(type: number): boolean {
        return [1, 2, 3, 5, 6, 7, 8, 9, 10, 11].includes(type);
    }

    /** 解析同源 Buff 动作和已核对的帧格式，拒绝未支持的动画资源或动作参数。 */
    public static plan(row: { type: number; ani_base: string; file: string; sound: string;
        shake?: number; dimly?: number }): BattleAttackPlan {
        if (!this.isActionType(row.type)) {
            throw new Error("尚未支持该战斗动作类型");
        }
        const base: unknown = JSON.parse(row.ani_base);
        const files: unknown = JSON.parse(row.file);
        const sounds: unknown = JSON.parse(row.sound);
        if (!base || typeof base !== "object" || Array.isArray(base)
            || !Array.isArray(files)
            || !Array.isArray(sounds) || !sounds.every(value => typeof value === "string")) {
            throw new Error("攻击动作配置超出当前支持范围");
        }
        const values = base as Record<string, unknown>;
        if (row.type === 1 && (Object.keys(values).length || files.length || sounds.length
            || (row.shake !== undefined && row.shake !== 0) || (row.dimly !== undefined && row.dimly !== 0))) {
            // 当前仅恢复真正空动作；旧可选位移及其他领域带音效type1仍须另行核实，不能假装已经支持。
            throw new Error("空动作包含尚未恢复的位移、特效、音效或画面副作用");
        }
        const known = ["move_time", "attack_time", "attack_delay", "action_time", "move_back", "action", "format", "duration", "scale_x", "scale_y", "anchor_x", "anchor_y", "flipped"];
        if ([6, 7, 8, 9, 10, 11].includes(row.type)) known.push("offset_x", "offset_y");
        if (Object.keys(values).some(key => known.indexOf(key) < 0)) {
            throw new Error("攻击动作存在未支持参数");
        }
        const action = values.action === undefined ? "attack" : values.action;
        if (["attack", "skill", "skill2", "transform"].indexOf(action as string) < 0) {
            throw new Error("攻击动作名称无效");
        }
        // 旧type8只移动角色；其独立帧由另一个覆盖子动作承担，不能把file误画在目标脚下。
        if (row.type === 8 && (files.length || values.format !== undefined)) {
            throw new Error("场地移动动作不支持内嵌序列帧");
        }
        // 旧缺横坐标时保持0且不镜像，与显式0的敌方坐标不同；本轮不猜缺省，只有完整比例进入播放。
        if (row.type === 8 && (values.offset_x === undefined || values.offset_y === undefined)) {
            throw new Error("场地移动动作缺少显式双轴比例");
        }
        const moveOffset = row.type === 8
            ? Object.freeze([this.seconds(values, "offset_x", 0), this.seconds(values, "offset_y", 0)]) as readonly [number, number]
            : null;
        if (moveOffset && moveOffset.some(value => value > 1)) {
            throw new Error("角色移动比例超出战场范围");
        }
        let projectileOffset: BattleAttackPlan["projectileOffset"] = null;
        if (row.type === 10) {
            if (typeof values.offset_x !== "number" || typeof values.offset_y !== "number") {
                throw new Error("战场投掷动作缺少显式双轴比例");
            }
            projectileOffset = Object.freeze([this.seconds(values, "offset_x", 0), this.seconds(values, "offset_y", 0)]);
            if (projectileOffset.some(value => value > 1)) {
                throw new Error("投掷终点比例超出战场范围");
            }
        }
        let effect: BattleAttackPlan["effect"] = null;
        const frameSuffix = "/%d.png";
        const format = typeof values.format === "string" ? values.format : "";
        // 旧 type3 按 format 逐帧播放。唤潮剑姬的同技能前段已经声明预载，独立表现段可以省略 file。
        const directFrames = row.type === 3 && files.length === 0 && format.endsWith(frameSuffix);
        if (files.length || row.type === 10 || directFrames) {
            // 帧数以旧plist连续帧及本地逐像素复验为依据，不能遇到未知资源就跳过表现。
            const counts: Record<string, number> = {
                "skill-101050110": 10, "skill-101050111": 10,
                "skill-105050051": 19, "skill-105050051-1": 8,
                "skill-101010011": 9, "skill-101040050": 7, "skill-101040051": 6, "skill-101020021": 11,
                "skill-102050230": 8, "skill-102050231": 17,
                "skill-102050233": 22, "skill-102050233_1": 22,
                "skill-102040040": 14, "skill-102040041": 8, "skill-102010011": 4,
                "skill-103010011": 7,
                "skill-102030031": 8,
                "skill-103020021": 15, "skill-103030030": 12,
                "skill-103040041": 11, "skill-103040050": 8, "skill-103040051": 10,
                "skill-103040120": 11, "skill-103040121": 21,
                "skill-102020021": 14, "skill-102040050": 11, "skill-102040051": 10,
                "skill-101030030": 6,
                "skill-103030031": 9, "skill-104040020": 9, "skill-104040021": 9, "skill-104030011": 6,
                "skill-104040031": 9, "skill-104050040": 6,
                "skill-104050050": 7, "skill-104050051": 11, "skill-104050051-1": 45,
                "skill-105040030": 9, "skill-105030011": 6,
                "skill-105050080": 10, "skill-105050081": 17,
                "skill-101050080-1": 6, "skill-101050080-2": 12,
                "skill-101050081": 25, "skill-101050081-1": 29,
                "skill-102050140": 15, "skill-102050141": 22, "skill-102050141-1": 53,
                "skill-101050060": 11, "skill-101050061": 23, "skill-101050090": 18,
                "skill-101050091": 24, "skill-101050091-1": 22, "skill-101050100": 23,
                "skill-101050101": 21, "skill-102040130": 9, "skill-102040131": 28,
                "skill-102050060": 8, "skill-102050061": 11, "skill-102050071": 17,
                "skill-102050080": 7,
                // 格伦男爵原图集在 17 号首次断帧，旧逐号读取不会使用单独的 19 号。
                "skill-102050081": 17, "skill-102050081-1": 44,
                "skill-102050110": 18, "skill-102050111": 20, "skill-102050111-1": 41, "skill-102050113": 20,
                "skill-102050150": 14, "skill-102050151": 15, "skill-102050151-1": 20,
                "skill-103050060": 18, "skill-103050061": 10, "skill-103050080": 10,
                "skill-103050081": 14, "skill-103050081-1": 9, "skill-103050083": 8,
                "skill-103050090": 12, "skill-103050091": 9, "skill-103050091-1": 20,
                "skill-103050100": 10, "skill-103050101": 13, "skill-103050103": 14,
                "skill-103050110": 14, "skill-103050111": 11, "skill-104050080": 8,
                "skill-104050081": 10, "skill-105040021": 18, "skill-105040031": 8,
            };
            const knownArrow = row.type === 10 && format === "skill-102040041/arrow-%d.png";
            const file = knownArrow ? "skill-102040041" : directFrames ? format.slice(0, -frameSuffix.length) : files[0];
            const count = knownArrow ? 5 : typeof file === "string" ? counts[file] : 0;
            if (!count || (row.type === 10 && !knownArrow) || (knownArrow ? files.length !== 0
                : (!directFrames && files.length !== 1) || format !== file + frameSuffix || row.type === 2)) {
                throw new Error("战斗帧资源尚未核对：type=" + row.type + "，file=" + JSON.stringify(files));
            }
            const interval = this.seconds(values, "duration", 0.05);
            if (interval <= 0) throw new Error("特效帧间隔无效");
            if (values.flipped !== undefined && values.flipped !== 0 && values.flipped !== 1) {
                throw new Error("特效水平翻转配置无效");
            }
            const onHero = row.type === 6 || row.type === 7;
            // 旧附身特效将offset直接加进锚点，包括2041401的大偏移。
            const anchorX = this.coordinate(values, "anchor_x", 0.5) + (onHero ? this.coordinate(values, "offset_x", 0) : 0);
            const anchorY = this.coordinate(values, "anchor_y", 0.5) - 0.07 + (onHero ? this.coordinate(values, "offset_y", 0) : 0);
            effect = Object.freeze({
                paths: Object.freeze(Array.from({ length: count }, (_, index) =>
                    `effects/skill/${file}/${file}_${knownArrow ? "arrow-" : ""}${index}/spriteFrame`)),
                interval,
                // 旧getAnimateCount包含首次查找失败的那一帧，7张图实际飞行8个间隔。
                flightSeconds: (count + 1) * interval,
                // 旧flipped只翻图像；反转锚点配合负缩放保持原图几何边界，不修改共享SpriteFrame。
                scaleX: (typeof values.scale_x === "number" && Number.isFinite(values.scale_x) ? values.scale_x : 1) * (values.flipped === 1 ? -1 : 1), scaleY: this.seconds(values, "scale_y", 1),
                anchorX: values.flipped === 1 ? 1 - anchorX : anchorX, anchorY,
            });
        } else if (values.format !== undefined || row.type === 5) {
            throw new Error("投射或序列帧缺少资源");
        }
        return Object.freeze({
            effectOnly: row.type === 1 || row.type === 6 || row.type === 7 || row.type === 9, onSource: row.type === 6 || row.type === 9,
            battlefieldOffset: row.type === 9 ? Object.freeze([this.seconds(values, "offset_x", 0), this.seconds(values, "offset_y", 0)]) as readonly [number, number] : null,
            moveOffset, projectileOffset,
            melee: row.type === 2 || row.type === 11, projectile: row.type === 5 || row.type === 10, effect,
            moveSeconds: row.type === 2 || row.type === 8 || row.type === 11 ? this.seconds(values, "move_time", 0.1) : 0,
            action: row.type === 1 ? "" : action === "skill" ? "attack2" : action === "skill2" ? "attack3" : action === "transform" ? "skill" : "attack",
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

    /** 旧BuffFactory按类型共享持续帧；只有最后一份同类型实例移除才应撤下，返回值不持有节点或资产。 */
    public static roundEffect(type: 1001 | 1005 | 234): {
        paths: readonly string[]; interval: number; scale: number; anchorY: number;
    } {
        if (type === 1005) {
            return { paths: this.dizzyFrames(), interval: 0.05, scale: 1, anchorY: 0.43 };
        }
        const stem = type === 1001 ? "skill-effect-slient" : "skill-effect-parry";
        const count = type === 1001 ? 8 : 10;
        return {
            paths: Object.freeze(Array.from({ length: count }, (_, index) =>
                "effects/skill-effect/" + stem + "/" + stem + "_" + index + "/spriteFrame")),
            interval: type === 1001 ? 0.05 : 0.15,
            scale: type === 1001 ? 1 : 2,
            anchorY: type === 1001 ? 0.43 : 0.73,
        };
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

    /** 原锚点可超出0～1或为负（如毁灭之烬施法者特效），只拒绝非有限数，不借时间非负规则裁图。 */
    private static coordinate(values: Record<string, unknown>, key: string, fallback: number): number {
        const value = values[key] === undefined ? fallback : values[key];
        if (typeof value !== "number" || !Number.isFinite(value)) {
            throw new Error("攻击动作坐标无效：" + key);
        }
        return value;
    }
}
