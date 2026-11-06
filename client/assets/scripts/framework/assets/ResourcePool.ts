/** 资源作用域共享池：合并在途加载，按拥有者计数；快照只含计数，不持有页面或业务对象。 */
export interface ResourceGateway<T> {
  load(key: string): Promise<T>;
  retain(asset: T): void;
  release(asset: T): void;
  /** 加载完成时所有拥有者已关闭，回收无人接收的资源。 */
  discard?(asset: T): void;
}
export interface ResourceScope<T> {
  load(key: string): Promise<T>;
  dispose(): void;
}
interface Entry<T> { users: number; promise: Promise<T>; asset?: T; pinned: boolean; }
export class ResourceScopeClosed extends Error {}

/** Deduplicate requests and track owners. Cache eviction remains a gateway policy. */
export class ResourcePool<T> {
  /** 当前尚未释放的资源记录，键为加载描述。 */
  private entries = new Map<string, Entry<T>>();
  /** 未关闭的调用方作用域数量，包含暂未加载资源的作用域。 */
  private scopes = 0;

  /** 注入实际引擎加载、持有和释放策略。 */
  constructor(private readonly gateway: ResourceGateway<T>) {}

  /** 返回当前池的只读计数；pending包含关闭后尚未完成的加载，不等同泄漏。 */
  public snapshot(): { scopes: number; entries: number; pending: number; owners: number; retained: number } {
    const entries = Array.from(this.entries.values());
    return { scopes: this.scopes, entries: entries.length,
      pending: entries.filter(entry => !entry.asset).length,
      owners: entries.reduce((sum, entry) => sum + entry.users, 0),
      retained: entries.filter(entry => entry.pinned).length };
  }

  /** 创建独立拥有者；dispose重复调用安全，失败加载可在同一作用域重试。 */
  createScope(): ResourceScope<T> {
    this.scopes++;
    let closed = false;
    const owned = new Map<string, { entry: Entry<T>; promise: Promise<T> }>();
    return {
      load: key => {
        if (closed) return Promise.reject(new ResourceScopeClosed("资源作用域已关闭"));
        const existing = owned.get(key);
        if (existing) return existing.promise;
        const entry = this.acquire(key);
        const promise = entry.promise.then(asset => {
          if (closed) throw new ResourceScopeClosed("资源作用域已关闭");
          return asset;
        }).catch(error => {
          // Failure may be retried in the same scope. Never release twice after disposal.
          if (owned.get(key)?.entry === entry) {
            owned.delete(key);
            this.drop(key, entry);
          }
          throw error;
        });
        owned.set(key, { entry, promise });
        return promise;
      },
      dispose: () => {
        if (closed) return;
        closed = true;
        this.scopes--;
        for (const [key, { entry }] of owned) this.drop(key, entry);
        owned.clear();
      },
    };
  }

  /** 获取共享在途记录，首次成功加载仅持有一次引擎引用。 */
  private acquire(key: string): Entry<T> {
    let entry = this.entries.get(key);
    if (!entry) {
      const created: Entry<T> = { users: 0, pinned: false, promise: null as unknown as Promise<T> };
      created.promise = Promise.resolve().then(() => this.gateway.load(key)).then(asset => {
        created.asset = asset;
        if (created.users > 0) {
          this.gateway.retain(asset);
          created.pinned = true;
        } else {
          if (this.entries.get(key) === created) this.entries.delete(key);
          this.gateway.discard?.(asset);
        }
        return asset;
      }).catch(error => {
        if (this.entries.get(key) === created) this.entries.delete(key);
        throw error;
      });
      this.entries.set(key, created);
      entry = created;
    }
    entry.users++;
    return entry;
  }

  /** 最后一个拥有者离开时移除记录并交给网关回收，不影响其他作用域。 */
  private drop(key: string, entry: Entry<T>): void {
    entry.users--;
    if (entry.users !== 0 || !entry.pinned) return;
    entry.pinned = false;
    if (this.entries.get(key) === entry) this.entries.delete(key);
    this.gateway.release(entry.asset!);
  }
}
