import { Node, Prefab } from "cc";
import { UILayer } from "./UILayer";
import type { BaseView } from "./BaseView";

/** 把预制挂进页面宿主。背包的店内底图放在自己的挂载里，不写进 UIManager。 */
export type ViewMount = (host: Node, prefab: Prefab) => Node | Promise<Node>;

/** Existing page-lifetime adapter for unmigrated features. Module BaseController is application-owned. */
export interface ViewController {
  show(): void;
  close(): void;
}

/** 一个正式界面：视图类、Prefab、页面 id 绑在一起。 */
export interface ViewSpec {
  id: string;
  /** 相对 assets，例如 prefabs/ui/backpack/BackpackLayer。 */
  prefab: string;
  layer: UILayer;
  /** 关掉后如果节点还在，留着实例，下次不再加载。 */
  cache: boolean;
  /** 同一页面能否叠两份。不能时，进行中的打开共用一次，只压一层。 */
  allowMultiple: boolean;
  /**
   * 非 Page 挂到哪一个常驻宿主。
   * 宿主由 UIManager.setResidentHost 登记，注册表只存字符串。
   */
  hostId?: string;
  /** 不写就直接生成在宿主下。 */
  mount?: ViewMount;
  /** Application-supplied loader; scene-bound Prefabs need no business UUID fallback. */
  load?: () => Promise<Prefab>;
  /** Page-lifetime adapter only. Never supply a module BaseController here. BagView has no factory. */
  createController?: (view: BaseView<unknown>) => ViewController;
}

export type ViewClass<T> = new () => BaseView<T>;

const byCtor = new Map<Function, ViewSpec>();
const byId = new Map<string, Function>();

/** 类装饰器。和 @ccclass 一起写在视图上。 */
export function view(spec: ViewSpec): ClassDecorator {
  return ctor => { registerView(ctor, spec); };
}

/** New applications register their pages in one readable composition module. */
export function registerView(ctor: Function, spec: ViewSpec): () => void {
  const stored: ViewSpec = {
    id: spec.id,
    prefab: spec.prefab,
    layer: spec.layer,
    cache: spec.cache === true,
    allowMultiple: spec.allowMultiple === true,
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
