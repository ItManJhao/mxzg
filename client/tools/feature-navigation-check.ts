import { strict as assert } from "node:assert";
import { HomeFeatureNavigation } from "../assets/scripts/app/remake/HomeFeatureNavigation";
import { OpenCancelled } from "../assets/scripts/framework/ui/UIManager";

function deferred() {
  let resolve!: () => void; let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 0));
async function main() {
  let current = "remake-home", authorized = false, notice = "", attempts = 0, backs = 0;
  let job: ReturnType<typeof deferred> | null = null;
  const intents: string[] = [];
  const flow = new HomeFeatureNavigation({
    keepOnly: id => { intents.push(id); },
    back: () => { backs++; current = "remake-home"; return true; },
    openById: async id => {
      assert.equal(id, "hero"); attempts++;
      if (!job) job = deferred();
      await job.promise; current = "hero";
    },
  }, { current: () => current, authorized: () => authorized, notice: text => { notice = text; } });
  assert.equal(flow.open("clan"), false);
  assert.equal(flow.open("hero"), true); assert.equal(attempts, 0, "Start/session gate prevents feature work");
  authorized = true;
  flow.open("hero"); const cancelled = job!;
  flow.open("city"); flow.open("hero");
  assert.equal(attempts, 2, "rapid re-entry can share an existing UIManager load");
  job = null; cancelled.reject(new OpenCancelled()); await settle();
  assert.equal(attempts, 3, "latest hero intent restarts after the shared cancelled job");
  job!.resolve(); await settle();
  assert.equal(current, "hero"); assert.equal(notice, "");
  flow.open("hero"); assert.equal(attempts, 3, "selected hero tab does not stack another page");
  flow.open("city"); assert.equal(backs, 2);
  assert.equal(current, "remake-home"); assert.equal(intents[intents.length - 1], "remake-home");
  job = null; flow.open("hero"); const oldIdentity = job!;
  flow.reset(); // Logout then a successful login may leave the same role ID; epoch still cancels old intent.
  job = null; oldIdentity.reject(new OpenCancelled()); await settle();
  assert.equal(attempts, 4, "old identity cannot reopen a feature after login");
  flow.open("city");
  job = null; flow.open("hero"); const disposed = job!;
  flow.dispose(); notice = "closed"; disposed.reject(new Error("late failure")); await settle();
  assert.equal(notice, "closed");
  flow.open("hero"); assert.equal(attempts, 5);
  console.log("feature-navigation-check passed: Start gate, shared-job cancellation/re-entry, return, identity reset and disposed callbacks");
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
