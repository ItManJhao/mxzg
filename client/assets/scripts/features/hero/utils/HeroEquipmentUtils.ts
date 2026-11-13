/**
 * 英雄普通装备的只读数据边界，依据旧 HeroResponse 与 equipmenttype。
 * 供统一快照整包校验与只读详情使用，不从背包推断穿戴关系。
 */
import { GameConfig } from "../../../config/GameConfig";
import { GConfig } from "../../../config/GConfig";
/** 一件已穿装备；ID 是持久实例，不允许转换为数值。 */
export interface HeroEquipment {
    /** 持久装备实例 ID。 */
    readonly instanceId: string;
    /** equipmenttype 的 equipment_type，与实例 ID 分离。 */
    readonly templateId: number;
    /** 普通装备槽位 1 至 4，不包含符文、神器。 */
    readonly slot: number;
    /** 旧 soul_lv，非负附魂等级。 */
    readonly soulLevel: number;
    /** 服务端判定已生效的附魂技能；缺失表示未生效，不能按等级自行推测。 */
    readonly soulSkill?: Readonly<{
        skillId: number;
        level: number;
    }>;
}
/** 英雄装备快照校验工具：核对四槽实例与可选配置约束，返回冻结只读装备，不执行穿脱或背包写入。 */
export class HeroEquipmentUtils {
    /** 纯展示或数据转换入口，无需创建工具类实例。 */
    private constructor() { }

    /**
     * 校验一个英雄完整的普通装备列表并冻结副本；空列表表示明确未穿戴。
     * 缺失数据必须由调用方保留“未同步”，本函数拒绝将 undefined 转为空列表。
     * 同一实例不得占多个槽，同槽不得放多件；详情提供已加载配置时额外校验槽位匹配。
     * 快照首包不加载配置，配置一致性由服务端读取时校验。
     */
    public static readHeroEquipment(value: unknown, config?: GameConfig): readonly HeroEquipment[] {
        if (!Array.isArray(value)) {
            throw new Error("英雄装备未同步或格式无效");
        }
        const slots = new Set<number>();
        const instances = new Set<string>();
        return Object.freeze(value.map(raw => {
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
                throw new Error("英雄装备格式无效");
            }
            const row = raw as Record<string, unknown>;
            if (typeof row.instanceId !== "string" || !row.instanceId.trim() || row.instanceId !== row.instanceId.trim() || row.instanceId === "0") {
                throw new Error("英雄装备实例 ID 无效");
            }
            if (!Number.isSafeInteger(row.templateId) || Number(row.templateId) <= 0 ||
                !Number.isSafeInteger(row.slot) || Number(row.slot) < 1 || Number(row.slot) > 4 ||
                !Number.isSafeInteger(row.soulLevel) || Number(row.soulLevel) < 0) {
                throw new Error("英雄装备配置、槽位或附魂等级无效");
            }
            const templateId = row.templateId as number;
            const slot = row.slot as number;
            const template = config?.requireConfig(GConfig.EquipmentType, templateId);
            if (template && template.place !== slot) {
                throw new Error("英雄装备槽位与配置不符");
            }
            if (slots.has(slot) || instances.has(row.instanceId)) {
                throw new Error("英雄装备槽位或实例重复");
            }
            slots.add(slot);
            instances.add(row.instanceId);
            let soulSkill: HeroEquipment["soulSkill"];
            if (row.soulSkill !== undefined) {
                const skill = row.soulSkill as Record<string, unknown>;
                if (!skill || typeof skill !== "object" || Array.isArray(skill) || !Number.isSafeInteger(skill.skillId) || Number(skill.skillId) <= 0 || !Number.isSafeInteger(skill.level) || Number(skill.level) <= 0 || Number(row.soulLevel) <= 0) {
                    throw new Error("附魂技能资料无效");
                }
                soulSkill = Object.freeze({ skillId: skill.skillId as number, level: skill.level as number });
            }
            return Object.freeze({ soulSkill, instanceId: row.instanceId, templateId, slot, soulLevel: row.soulLevel as number });
        }));
    }
}
