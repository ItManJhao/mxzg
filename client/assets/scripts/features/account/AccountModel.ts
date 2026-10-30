import { publishNotification } from "../../framework/EventDispatcher";

export interface RoleProfile {
  readonly id: string;
  readonly nickname: string;
  readonly level: number;
  readonly gold: number;
  readonly diamonds: number;
  readonly serverId?: string;
}

export interface AccountState {
  readonly busy: boolean;
  readonly role: Readonly<RoleProfile> | null;
  readonly error: string;
}

/** The account feature's single source of UI data. Tokens never enter view state. */
export class AccountModel {
  private state: AccountState = Object.freeze({ busy: false, role: null, error: "" });
  private readonly listeners = new Set<(state: AccountState) => void>();

  get snapshot(): AccountState { return this.state; }

  subscribe(listener: (state: AccountState) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  replace(state: AccountState): void {
    this.state = Object.freeze({ ...state, role: state.role ? Object.freeze({ ...state.role }) : null });
    publishNotification(this.notify);
  }
  private notify = (): void => { for (const listener of Array.from(this.listeners)) listener(this.state); };
}
