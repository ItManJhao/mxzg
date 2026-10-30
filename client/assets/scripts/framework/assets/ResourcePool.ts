export interface ResourceGateway<T> {
  load(key: string): Promise<T>;
  retain(asset: T): void;
  release(asset: T): void;
}
export interface ResourceScope<T> {
  load(key: string): Promise<T>;
  dispose(): void;
}
interface Entry<T> { users: number; promise: Promise<T>; asset?: T; pinned: boolean; }
export class ResourceScopeClosed extends Error {}

/** Deduplicate requests and track owners. Cache eviction remains a gateway policy. */
export class ResourcePool<T> {
  private entries = new Map<string, Entry<T>>();
  constructor(private readonly gateway: ResourceGateway<T>) {}

  createScope(): ResourceScope<T> {
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
        for (const [key, { entry }] of owned) this.drop(key, entry);
        owned.clear();
      },
    };
  }

  private acquire(key: string): Entry<T> {
    let entry = this.entries.get(key);
    if (!entry) {
      const created: Entry<T> = { users: 0, pinned: false, promise: null as unknown as Promise<T> };
      created.promise = Promise.resolve().then(() => this.gateway.load(key)).then(asset => {
        created.asset = asset;
        if (created.users > 0) {
          this.gateway.retain(asset);
          created.pinned = true;
        } else if (this.entries.get(key) === created) this.entries.delete(key);
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

  private drop(key: string, entry: Entry<T>): void {
    entry.users--;
    if (entry.users !== 0 || !entry.pinned) return;
    entry.pinned = false;
    if (this.entries.get(key) === entry) this.entries.delete(key);
    this.gateway.release(entry.asset!);
  }
}
