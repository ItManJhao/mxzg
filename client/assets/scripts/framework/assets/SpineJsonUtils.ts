/**
 * 把磁盘上的 Spine 3.7.94 收成 Creator spine-3.8 能读的一份内存副本。
 * 不改 resources 里的 json。3.8 运行时只拒绝精确的 3.8.75，所以版本写成 3.8.99。
 * 3.7 的 skins 是 {皮名: 附件}。3.8 要 [{name, attachments}]，否则读 attachments 时空指针，整套静默失败。
 * 3.7 的曲线是 curve:[c1,c2,c3,c4]。3.8 是 curve、c2、c3、c4 四个数。
 */
export const SPINE_RUNTIME_VERSION = "3.8.99";
/** 旧Spine数据转换的纯工具，只处理内存副本，不修改源文件或资源拥有者。 */
export class SpineJsonUtils {
    /** 仅通过静态入口使用，禁止创建无意义的工具实例。 */
    private constructor() {
    }

    /** 将不兼容的旧骨骼转换为可读内存副本；已兼容输入原样返回。 */
    public static upgradeSpine37Json(raw: unknown): unknown {
        if (!raw || typeof raw !== "object") {
            return raw;
        }
        const version = SpineJsonUtils.spineVersion(raw);
        if (version.indexOf("3.8") === 0 && version !== "3.8.75" && SpineJsonUtils.skinsAreRuntimeArray(raw)) {
            return raw;
        }
        const clone = JSON.parse(JSON.stringify(raw)) as SpineRoot;
        if (!clone.skeleton || typeof clone.skeleton !== "object") {
            clone.skeleton = {};
        }
        clone.skeleton.spine = SPINE_RUNTIME_VERSION;
        if (clone.skins && !Array.isArray(clone.skins) && typeof clone.skins === "object") {
            const map = clone.skins as {
                [name: string]: unknown;
            };
            const skins: SpineSkin[] = [];
            const names = Object.keys(map);
            for (let i = 0; i < names.length; i++) {
                skins.push({ name: names[i], attachments: map[names[i]] });
            }
            clone.skins = skins;
        }
        SpineJsonUtils.rewriteCurves(clone);
        return clone;
    }

    /** 读取骨骼版本；缺少合法版本时返回空字符串。 */
    private static spineVersion(raw: object): string {
        const skeleton = (raw as SpineRoot).skeleton;
        if (!skeleton || typeof skeleton.spine !== "string") {
            return "";
        }
        return skeleton.spine;
    }

    /** 判断皮肤是否已经采用当前运行时所需数组结构。 */
    private static skinsAreRuntimeArray(raw: object): boolean {
        return Array.isArray((raw as SpineRoot).skins);
    }

    /** 递归转换副本中的旧曲线轨道，保留其他表现数据。 */
    private static rewriteCurves(node: unknown): void {
        if (!node || typeof node !== "object") {
            return;
        }
        if (Array.isArray(node)) {
            const first = node[0];
            if (!first || typeof first !== "object") {
                return;
            }
            for (let i = 0; i < node.length; i++) {
                SpineJsonUtils.rewriteCurves(node[i]);
            }
            return;
        }
        const obj = node as {
            [key: string]: unknown;
        };
        const curve = obj.curve;
        if (Array.isArray(curve) && curve.length >= 4 && typeof curve[0] === "number") {
            obj.curve = curve[0];
            obj.c2 = typeof curve[1] === "number" ? curve[1] : 0;
            obj.c3 = typeof curve[2] === "number" ? curve[2] : 1;
            obj.c4 = typeof curve[3] === "number" ? curve[3] : 1;
        }
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            const value = obj[keys[i]];
            if (value && typeof value === "object") {
                SpineJsonUtils.rewriteCurves(value);
            }
        }
    }
}
interface SpineRoot {
    skeleton?: {
        spine?: string;
    };
    skins?: unknown;
}
interface SpineSkin {
    name: string;
    attachments: unknown;
}
