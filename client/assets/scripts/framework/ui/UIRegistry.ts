/** 页面注册契约：各View用@UIRegistry.view保存唯一预制体地址和静态参数，UIManager统一读取。
 * 应用只绑定当前Controller工厂和确有变化的宿主；撤销绑定恢复页面自身定义。
 * 支持本地及远程Bundle路径；资源持有和下载仍由统一加载器管理。
 */
import { Prefab } from "cc";
import { UILayer } from "./UILayer";
import type { BaseView } from "./BaseView";
/** 页面生命周期适配器；模块BaseController由应用持有，不能交给窗口关闭流程销毁。 */
export interface ViewController {
    show(): void;
    close(): void;
}
/** 一个正式界面：视图类、Prefab、页面 id 绑在一起。 */
export interface ViewSpec {
    id: string;
    /** 相对 assets，例如 bundles/module/bag/prefabs/BagView。 */
    prefab: string;
    layer: UILayer;
    /** 仅Page启用限时实例缓存；Popup关闭释放实例，资源缓存仍由共享资源池管理。 */
    cache: boolean;
    /** 同一页面能否叠两份。不能时，进行中的打开共用一次，只压一层。 */
    allowMultiple: boolean;
    /** 弹窗需要模态拦截时配置；省略表示不拦截窗口外部。 */
    modal?: ModalOptions;
    /**
     * 非 Page 挂到哪一个常驻宿主。
     * 宿主由 UIManager.setResidentHost 登记，注册表只存字符串。
     */
    hostId?: string;
    /** 打开前只准备页面必需的配置；预加载仅取得Prefab，不调用此业务前置入口。 */
    prepare?: () => Promise<void>;
    /** 确需自定义Prefab取得方式时使用；复用统一加载器，不重复固定页面地址或增加UUID回退。 */
    load?: () => Promise<Prefab>;
    /** 仅注入页面生命周期适配器；模块Controller归应用持有，背包页面无需此工厂。 */
    createController?: (view: BaseView<unknown>) => ViewController;
}
/** 应用运行期只能注入会话相关装配，不能重写页面地址、缓存和模态等静态定义。 */
export interface ViewRuntime {
    /** 独立战报等场景临时采用的宿主；省略则使用@UIRegistry.view保存的宿主。 */
    hostId?: string;
    /** 当前应用提供的页面生命周期适配器；撤销后不保留旧应用闭包。 */
    createController?: (view: BaseView<unknown>) => ViewController;
}
/** 模态的两个独立开关；透明拦截同样阻止点击穿透，不创建第二份遮罩。 */
export interface ModalOptions {
    /** true显示半透明蒙版；false保留透明的外部点击拦截。 */
    mask: boolean;
    /** true点击外部关闭所属窗口；false只拦截，继续使用窗口原确认/取消流程。 */
    closeOnOutside: boolean;
}
export type ViewClass<T> = new () => BaseView<T>;
/** 同一类当前生效的定义或运行期绑定；previous只用于撤销恢复，不形成第二份资源清单。 */
interface ViewEntry {
    /** 当前生效的页面参数副本，调用方不能通过原对象修改它。 */
    spec: ViewSpec;
    /** 临时绑定覆盖前的登记；普通@UIRegistry.view登记没有前项。 */
    previous: ViewEntry | null;
    /** true表示此登记已撤销，后续恢复时跳过，防止迟到关闭复活旧应用闭包。 */
    released: boolean;
}
/** 视图类到唯一当前登记，运行期装配也复用该表。 */
const byCtor = new Map<Function, ViewEntry>();
/** 页面id到视图类，供按id打开和LoadingPlan解析页面使用。 */
const byId = new Map<string, Function>();
/** 页面唯一注册与运行绑定入口，继续使用原登记表，不扫描或重复保存资源定义。 */
export class UIRegistry {
    /** 仅通过静态入口使用，禁止创建无意义的工具实例。 */
    private constructor() {
    }

    /** 类装饰器。和 @ccclass 一起写在视图上。 */
    public static view(spec: ViewSpec): ClassDecorator {
        return ctor => { UIRegistry.registerView(ctor, spec); };
    }

    /** 登记页面地址与开关契约；模态参数只用于Popup，复制配置避免调用方随后修改已登记行为。 */
    public static registerView(ctor: Function, spec: ViewSpec): () => void {
        if (spec.modal !== undefined && (!spec.modal || spec.layer !== UILayer.Popup || typeof spec.modal.mask !== "boolean"
            || typeof spec.modal.closeOnOutside !== "boolean")) {
            throw new Error("模态配置仅支持Popup，并须明确mask和closeOnOutside " + spec.id);
        }
        const stored: ViewSpec = {
            id: spec.id,
            prefab: spec.prefab,
            layer: spec.layer,
            cache: spec.cache === true,
            allowMultiple: spec.allowMultiple === true,
            modal: spec.modal ? { mask: spec.modal.mask, closeOnOutside: spec.modal.closeOnOutside } : undefined,
            hostId: spec.hostId,
            prepare: spec.prepare,
            load: spec.load,
            createController: spec.createController,
        };
        const previous = byId.get(stored.id);
        if (previous && previous !== ctor) {
            throw new Error("页面 id 重复 " + stored.id);
        }
        const oldSpec = byCtor.get(ctor);
        if (oldSpec && oldSpec.spec.id !== stored.id) {
            throw new Error("同一 View 不能登记多个页面 id");
        }
        const entry: ViewEntry = { spec: stored, previous: null, released: false };
        byCtor.set(ctor, entry);
        byId.set(stored.id, ctor);
        return () => UIRegistry.releaseEntry(ctor, entry);
    }

    /** 为当前应用绑定依赖；只接受窄运行参数，撤销时恢复@UIRegistry.view，乱序撤销不会复活已释放绑定。 */
    public static bindViewRuntime(ctor: Function, runtime: ViewRuntime): () => void {
        const previous = byCtor.get(ctor);
        if (!previous) {
            throw new Error("运行期绑定前必须由@UIRegistry.view登记界面");
        }
        const entry: ViewEntry = {
            spec: {
                ...previous.spec,
                hostId: runtime.hostId === undefined ? previous.spec.hostId : runtime.hostId,
                createController: runtime.createController === undefined ? previous.spec.createController : runtime.createController,
            },
            previous,
            released: false,
        };
        byCtor.set(ctor, entry);
        return () => UIRegistry.releaseEntry(ctor, entry);
    }

    /** 撤销自己持有的登记；若上层仍生效只做失效标记，等它撤销时一起跳过。 */
    private static releaseEntry(ctor: Function, entry: ViewEntry): void {
        entry.released = true;
        if (byCtor.get(ctor) !== entry) {
            return;
        }
        let previous = entry.previous;
        while (previous?.released) {
            previous = previous.previous;
        }
        if (previous) {
            byCtor.set(ctor, previous);
            return;
        }
        byCtor.delete(ctor);
        if (byId.get(entry.spec.id) === ctor) {
            byId.delete(entry.spec.id);
        }
    }

    /** 取得页面当前定义，含该应用有效的运行期绑定；未登记返回null。 */
    public static viewSpecOf(ctor: Function): ViewSpec | null {
        return byCtor.get(ctor)?.spec || null;
    }

    /** 按唯一页面id取得已导入的View类；装饰器不会扫描或自动导入目录。 */
    public static viewCtorById(id: string): Function | null {
        return byId.get(id) || null;
    }
}
