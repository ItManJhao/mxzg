import { MockSessionSeed } from "./MockGameSession";

/** 一条录好的回包。ReplayTransport 按数组顺序播放，不看请求体。 */
export interface MockEnvelope {
  cmd: string;
  data: unknown;
}

/**
 * 录包。session 用来喂 MockGameSession；steps 给 ReplayTransport。
 * 两边描述同一次「登录 → 创角 → 主线」故事，回放不会重新计算进度。
 */
export interface MockFixture {
  name: string;
  note?: string;
  session?: MockSessionSeed;
  steps: MockEnvelope[];
}

export function parseMockFixture(raw: unknown): MockFixture {
  const body = asRecord(raw);
  const name = typeof body.name === "string" && body.name ? body.name : "fixture";
  if (!Array.isArray(body.steps) || body.steps.length === 0) {
    throw new Error("mock fixture needs steps");
  }
  const steps: MockEnvelope[] = [];
  for (let i = 0; i < body.steps.length; i++) {
    const row = asRecord(body.steps[i]);
    if (typeof row.cmd !== "string" || !row.cmd) {
      throw new Error("mock fixture step " + i + " missing cmd");
    }
    steps.push({ cmd: row.cmd, data: row.data === undefined ? null : row.data });
  }
  const note = typeof body.note === "string" ? body.note : undefined;
  const session = asRecordOrNull(body.session) as MockSessionSeed | undefined;
  return { name, note, session, steps };
}

function asRecord(data: unknown): Record<string, unknown> {
  if (data && typeof data === "object") return data as Record<string, unknown>;
  return {};
}

function asRecordOrNull(data: unknown): MockSessionSeed | undefined {
  if (data && typeof data === "object") return data as MockSessionSeed;
  return undefined;
}
