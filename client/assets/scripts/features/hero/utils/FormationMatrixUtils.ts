/**
 * 契约阵型说明的数据投影，从已安装的旧阵型、格位加成和语言表取得展示内容。
 * 只读取配置。实际解锁和可用位置由服务器快照提供，阵容写入仍由出阵确认处理。
 */
import { GameConfig } from "../../../config/GameConfig";
import { FormationConfigUtils } from "./FormationConfigUtils";

/** 契约阵型窗口中的一个普通格位。 */
export interface FormationMatrixSlot {
    /** 旧版普通出阵编号 1 至 8，助战位不出现在说明窗。 */
    readonly position: number;
    /** 此阵型配置是否开放该格，与玩家是否解锁整个阵型无关。 */
    readonly open: boolean;
    /** 配置百分比文案，空字符串表示该格没有加成。 */
    readonly bonus: string;
}

/** 一种契约阵型的名称、说明与阵位预览。 */
export interface FormationMatrixEntry {
    /** 原阵型编号，供服务端选项匹配和图标定位。 */
    readonly id: number;
    /** 语言表中的阵型名称。 */
    readonly name: string;
    /** 语言表中的属性类型，如平衡型。 */
    readonly kind: string;
    /** 锁定卡片显示的简短解锁条件。 */
    readonly shortRequirement: string;
    /** 预览锁定阵型时显示的完整解锁条件。 */
    readonly requirement: string;
    /** 当前阵型的普通格，按格位编号从小到大排列。 */
    readonly slots: readonly FormationMatrixSlot[];
}

/** 普通阵位最后一个编号，其后的 9 号由出阵的助战逻辑处理。 */
const LAST_ORDINARY_POSITION = 8;

/** 无状态的阵型说明查询，可在独立仓库上验证真实数据。 */
export class FormationMatrixUtils {
    /** 纯配置工具不创建实例。 */
    private constructor() { }

    /**
     * 按旧表顺序返回完整阵型说明，包括尚未解锁的阵型。
     * @throws 任一配置表、普通格位或必要语言缺失时抛出可定位错误。
     */
    public static list(config: GameConfig = GameConfig.instance): readonly FormationMatrixEntry[] {
        const matrices = new Map<number, { row: Record<string, unknown>; slots: Map<number, FormationMatrixSlot> }>();
        for (const row of FormationConfigUtils.rows(config, "config/battlematrix")) {
            const id = FormationConfigUtils.id(row.idx, "battlematrix.idx");
            if (matrices.has(id)) {
                throw new Error("契约阵型编号重复：" + id);
            }
            matrices.set(id, { row, slots: new Map() });
        }

        for (const row of FormationConfigUtils.rows(config, "config/battlematrixaddition")) {
            const matrixId = FormationConfigUtils.id(row.type, "battlematrixaddition.type");
            const position = FormationConfigUtils.id(row.position, "battlematrixaddition.position");
            const slots = matrices.get(matrixId)?.slots;
            if (!slots || position > LAST_ORDINARY_POSITION + 1 || slots.has(position)) {
                throw new Error("契约阵型格位无效或重复：" + matrixId + "/" + position);
            }
            const open = row.is_open;
            if (typeof open !== "number" || !Number.isSafeInteger(open)) {
                throw new Error("契约阵型格位开放值无效：" + matrixId + "/" + position);
            }
            slots.set(position, Object.freeze({
                position,
                open: open > 0,
                bonus: FormationConfigUtils.bonuses(row.ability, matrixId + "/" + position)
                    .map(bonus => FormationConfigUtils.formatBonus(config, bonus)).join("、"),
            }));
        }

        return Object.freeze(Array.from(matrices, ([id, { row, slots: positions }]) => {
            const slots = Array.from({ length: LAST_ORDINARY_POSITION }, (_, index) => {
                const position = index + 1;
                const slot = positions.get(position);
                if (!slot) {
                    throw new Error("契约阵型缺少普通格位：" + id + "/" + position);
                }
                return slot;
            });
            return Object.freeze({
                id,
                name: FormationConfigUtils.text(config, row.name_lang),
                kind: FormationConfigUtils.text(config, row.ability_lang),
                shortRequirement: FormationConfigUtils.text(config, row.mission_name2),
                requirement: FormationConfigUtils.text(config, row.mission_name),
                slots: Object.freeze(slots),
            });
        }));
    }

}
