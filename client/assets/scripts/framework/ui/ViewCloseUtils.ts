/** 让 BaseView 能关页，又不和 UIManager 互相 import。 */
type Closer = (view: object) => void;
let closer: Closer | null = null;
/** 连接BaseView关闭请求与UIManager，沿用唯一关闭回调以避免循环导入。 */
export class ViewCloseUtils {
    /** 仅通过静态入口使用，禁止创建无意义的工具实例。 */
    private constructor() {
    }

    /** 替换进程内唯一界面关闭回调，供UIManager装配使用。 */
    public static bindViewCloser(fn: Closer): void {
        closer = fn;
    }

    /** 将关闭请求交给当前绑定的UI管理器；未装配时不产生副作用。 */
    public static requestViewClose(view: object): void {
        if (closer) {
            closer(view);
        }
    }
}
