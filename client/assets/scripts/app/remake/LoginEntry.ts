/** Prepared identity and the player's explicit decision to enter are separate. */
export class LoginEntry {
  private confirmed = false;
  confirm(): void { this.confirmed = true; }
  reset(): void { this.confirmed = false; }
  route(hasRole: boolean): "remake-login" | "remake-home" {
    return this.confirmed && hasRole ? "remake-home" : "remake-login";
  }
}
