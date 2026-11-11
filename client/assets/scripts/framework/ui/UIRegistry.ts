/** 页面注册契约：统一记录预制体路径与页面生命周期选项，由UIManager读取。
 * 支持本地及远程Bundle路径；资源持有和下载仍由统一加载器管理。
 */
import { Node, Prefab } from "cc";
import { UILayer } from "./UILayer";
import type { BaseView } from "./BaseView";

/** 将已有预制体挂入宿主，静态背景和布局由预制体保存。 */
export type ViewMount = (host: Node, prefab: Prefab) => Node | Promise<Node>;

/** 页面生命周期适配器；模块BaseController由应用持有，不能交给窗口关闭流程销毁。 */
export interface ViewController {
  show(): void;
  close(): void;
}

/** 一个正式界面：视图类、Prefab、页面 id 绑在一起。 */
export interface ViewSpec {
  id: string;
  /** 相对 assets，例如 bundles/bag/prefabs/BagView。 */
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
  /** 不写就直接生成在宿主下。 */
  mount?: ViewMount;
  /** 应用注入的资源准备入口，复用统一加载器，不另维护业务UUID加载回退。 */
  load?: () => Promise<Prefab>;
  /** 仅注入页面生命周期适配器；模块Controller归应用持有，背包页面无需此工厂。 */
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

const byCtor = new Map<Function, ViewSpec>();
const byId = new Map<string, Function>();

/** 类装饰器。和 @ccclass 一起写在视图上。 */
export function view(spec: ViewSpec): ClassDecorator {
  return ctor => { registerView(ctor, spec); };
}

/** 登记页面地址与开关契约；模态参数只用于Popup，复制配置避免调用方随后修改已登记行为。 */
export function registerView(ctor: Function, spec: ViewSpec): () => void {
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
    mount: spec.mount,
    load: spec.load,
    createController: spec.createController,
  };
  const previous = byId.get(stored.id);
  if (previous && previous !== ctor) throw new Error("页面 id 重复 " + stored.id);
  const oldSpec = byCtor.get(ctor);
  if (oldSpec && oldSpec.id !== stored.id) throw new Error("同一 View 不能登记多个页面 id");
  byCtor.set(ctor, stored);
  byId.set(stored.id, ctor);
  return () => {
    if (byCtor.get(ctor) !== stored) return;
    byCtor.delete(ctor);
    if (byId.get(stored.id) === ctor) byId.delete(stored.id);
  };
}

export function viewSpecOf(ctor: Function): ViewSpec | null {
  return byCtor.get(ctor) || null;
}

export function viewCtorById(id: string): Function | null {
  return byId.get(id) || null;
}
