import { HttpFailure, JsonClient } from "../../platform/http/JsonClient";

/** Server-owned instance ID stays a UUID; template ID is a separate config key. */
export interface OwnedHero {
  readonly id: string;
  readonly templateId: number;
  readonly level: number;
  readonly star: number;
}
export interface HeroGateway { list(token: string): Promise<readonly OwnedHero[]>; }

export function readOwnedHero(value: unknown): OwnedHero {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("英雄资料无效");
  const row = value as Record<string, unknown>;
  if (typeof row.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(row.id) ||
      !positiveInteger(row.templateId) || !positiveInteger(row.level) || !positiveInteger(row.star)) throw new Error("英雄资料无效");
  return Object.freeze({ id: row.id, templateId: row.templateId, level: row.level, star: row.star });
}

function positiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

export function readOwnedHeroes(value: unknown): readonly OwnedHero[] {
  if (!Array.isArray(value)) throw new Error("英雄列表无效");
  const heroes = value.map(readOwnedHero);
  if (new Set(heroes.map(hero => hero.id)).size !== heroes.length) throw new Error("英雄实例 ID 重复");
  return Object.freeze(heroes);
}

export class HeroApi implements HeroGateway {
  constructor(private readonly http: JsonClient) {}
  async list(token: string): Promise<readonly OwnedHero[]> {
    try {
      return readOwnedHeroes(await this.http.request("/api/v1/heroes", undefined, token));
    } catch (error) {
      if (error instanceof HttpFailure && error.status === 404) {
        throw new HttpFailure(404, "英雄接口不存在\n请更新并重启新后端");
      }
      throw error;
    }
  }
}
