/** Shared data lifetime only. Each module owns its own data and validation. */
export abstract class BaseModel {
    private currentRoleKey: string | null = null;
    private dataVersion = 0;
    private disposed = false;

    get roleKey(): string | null { return this.currentRoleKey; }
    get version(): number { return this.dataVersion; }

    reset(roleKey: string | null): void {
        this.disposed = false;
        this.currentRoleKey = roleKey;
        this.incrementVersion();
        this.onReset();
    }

    dispose(): void {
        if (this.disposed) return;
        this.reset(null);
        this.disposed = true;
    }

    protected incrementVersion(): void { this.dataVersion++; }
    protected abstract onReset(): void;
}
