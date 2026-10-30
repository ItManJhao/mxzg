/** New feature groups are committed atomically; legacy ConfigDb is deliberately separate. */
export class GroupedConfig {
  private ready = new Map<string, unknown>();
  private requests = new Map<string, Promise<unknown>>();
  constructor(private readonly fetch: (path: string) => Promise<unknown>,
    private readonly validate: (path: string, value: unknown) => void) {}

  async prepare(paths: readonly string[], progress?: (done: number, total: number) => void): Promise<void> {
    // Creator's publish transform assumes array spreads are arrays, including Set iterators.
    const names = Array.from(new Set(paths));
    let done = 0;
    let acceptingProgress = true;
    progress?.(0, names.length);
    let entries: Array<{ path: string; value: unknown }>;
    try { entries = await Promise.all(names.map(async path => {
      let request = this.requests.get(path);
      if (!request) {
        const created = Promise.resolve().then(() => this.fetch(path)).then(value => {
          this.validate(path, value);
          return value;
        }).catch(error => {
          if (this.requests.get(path) === created) this.requests.delete(path);
          throw error;
        });
        request = created;
        this.requests.set(path, created);
      }
      const value = await request;
      if (acceptingProgress) progress?.(++done, names.length);
      return { path, value };
    })); } finally { acceptingProgress = false; }
    // No partial group is made visible if a required file fails validation/loading.
    for (const { path, value } of entries) this.ready.set(path, value);
  }

  get<T>(path: string): T | undefined { return this.ready.get(path) as T | undefined; }

  read<T>(path: string): Promise<T> {
    if (!this.ready.has(path)) return Promise.reject(new Error("配置尚未准备：" + path));
    return Promise.resolve(this.ready.get(path) as T);
  }
}
