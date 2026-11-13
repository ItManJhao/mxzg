/**
 * 模块数据生命周期：提供本地展示版本和统一清空入口。
 * 各模块负责数据与校验，账号归属及服务端资产版本由应用统一状态入口维护。
 */
export abstract class BaseModel {
    /** 每次提交或重置递增的本地展示版本，不是服务端持久版本。 */
    private dataVersion = 0;
    /** 是否已释放；避免重复释放再次重置模块状态。 */
    private disposed = false;

    /** 返回本地展示版本，供事件监听者判断数据已更新。 */
    get version(): number {
        return this.dataVersion;
    }

    /** 清空模块业务状态并使旧展示版本失效，不保存账号身份。 */
    reset(): void {
        this.disposed = false;
        this.incrementVersion();
        this.onReset();
    }

    /** 幂等释放模块状态；后续显式重置可重新使用实例。 */
    dispose(): void {
        if (this.disposed) {
            return;
        }
        this.reset();
        this.disposed = true;
    }

    /** 记录一次本地数据提交，具体数据由模块保存。 */
    protected incrementVersion(): void {
        this.dataVersion++;
    }

    /** 子类清空自身数据，不处理连接、凭证或页面。 */
    protected abstract onReset(): void;
}
