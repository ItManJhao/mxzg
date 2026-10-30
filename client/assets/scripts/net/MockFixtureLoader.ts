import { JsonAsset, resources } from "cc";
import { MockFixture, parseMockFixture } from "./MockFixture";

/** 相对 assets/resources，不带扩展名。 */
export const MOCK_FIXTURE_LOGIN_STAGE = "mock/session-login-stage";

/** 读录包 JSON。默认预览不调用；要换 ReplayTransport 时再用。 */
export function loadMockFixture(path = MOCK_FIXTURE_LOGIN_STAGE): Promise<MockFixture> {
  return new Promise((resolve, reject) => {
    resources.load(path, JsonAsset, (err, asset) => {
      if (err || !asset || asset.json == null) {
        reject(err ?? new Error("missing mock fixture " + path));
        return;
      }
      try {
        resolve(parseMockFixture(asset.json));
      } catch (parseErr) {
        reject(parseErr);
      }
    });
  });
}
