/**
 * 对照库：用客户端同一套 3100 / 3101 / 3007 / 3005 / 2001 帧，
 * 把进度写进 JSON，再读回来。不是 gameserver，也不代替 MySQL。
 * 跑：npx --yes esbuild client/tools/persist-roundtrip.ts --bundle --platform=node --format=cjs --outfile=/tmp/mxzg-persist-roundtrip.js && node /tmp/mxzg-persist-roundtrip.js
 */
import { readFileSync, writeFileSync } from "fs";
import { encodeWireMessage } from "../assets/scripts/net/protocol/wireLogin";
import { decodeWireLineUp } from "../assets/scripts/net/protocol/wireLineUp";
import { decodeWireLineUpSave } from "../assets/scripts/net/protocol/wireLineUpSave";
import { decodeWireChapter } from "../assets/scripts/net/protocol/wireChapter";
import { decodeWireIdleClaim } from "../assets/scripts/net/protocol/wireIdle";
import { decodeWireRole } from "../assets/scripts/net/protocol/wireProfile";

const FILE = "/tmp/mxzg-wire-persist.json";

interface Row {
  uid: number;
  roleId: number;
  name: string;
  level: number;
  gold: number;
  diamond: number;
  chapterId: number;
  rewardTime: number;
  heroes: number[];
}

function assert(ok: boolean, message: string): void {
  if (!ok) throw new Error(message);
}

function varint(n: number): number[] {
  const out: number[] = [];
  let v = Math.floor(n);
  while (v > 127) {
    out.push((v & 0x7f) | 0x80);
    v = Math.floor(v / 128);
  }
  out.push(v);
  return out;
}

function fieldVar(field: number, value: number): number[] {
  return varint((field << 3) | 0).concat(varint(value));
}

function fieldBytes(field: number, bytes: number[]): number[] {
  return varint((field << 3) | 2).concat(varint(bytes.length), bytes);
}

function fieldString(field: number, text: string): number[] {
  const bytes = Array.from(Buffer.from(text, "utf8"));
  return fieldBytes(field, bytes);
}

function load(): Row {
  return JSON.parse(readFileSync(FILE, "utf8")) as Row;
}

function save(row: Row): void {
  writeFileSync(FILE, JSON.stringify(row));
}

function applyFormation(row: Row): Uint8Array {
  const encoded = encodeWireMessage({
    cmd: "wire.3100",
    data: {
      heroes: [
        { heroId: 42, position: 2 },
        { heroId: 43, position: 3 },
      ],
    },
  });
  assert(encoded !== null && encoded.note.indexOf("formation_id=1") >= 0, "3100 encodes formation_id");
  const body = encoded.bytes.subarray(8);
  assert(decodeWireLineUpSave(new Uint8Array(0)) !== null, "empty 3100 ack");
  const heroes: number[] = [];
  for (let i = 0; i < body.length; i++) {
    if (body[i] === 0x08 && i + 1 < body.length && body[i + 1] === 42) heroes.push(42);
    if (body[i] === 0x08 && i + 1 < body.length && body[i + 1] === 43) heroes.push(43);
  }
  assert(heroes.length === 2, "3100 body carries both hero ids");
  assert(body.indexOf(0x28) >= 0 && body[body.indexOf(0x28) + 1] === 1, "field 5 formation_id is 1");
  row.heroes = [42, 43];
  save(row);
  return encoded.bytes;
}

function lineupBody(heroes: number[]): Uint8Array {
  const positions = [2, 3, 5, 6, 7, 8, 9];
  const line: number[] = [];
  line.push(...fieldVar(1, 0));
  for (let i = 0; i < heroes.length; i++) {
    const hero = fieldVar(1, heroes[i]).concat(fieldVar(3, positions[i]));
    line.push(...fieldBytes(4, hero));
  }
  line.push(...fieldVar(5, 1));
  return Uint8Array.from(fieldBytes(1, line));
}

function fresh(): Row {
  const row: Row = {
    uid: 960011,
    roleId: 1000002,
    name: "见习冒险家",
    level: 1,
    gold: 0,
    diamond: 0,
    chapterId: 0,
    rewardTime: 1792464848,
    heroes: [],
  };
  save(row);
  return row;
}

function play(row: Row): void {
  applyFormation(row);
  const line = decodeWireLineUp(lineupBody(load().heroes));
  assert(line !== null && line.rows.length === 1, "3101 decodes the saved MAIN");
  const text = JSON.stringify(line.rows[0].marks);
  assert(text.indexOf("42") >= 0 && text.indexOf("43") >= 0, "3101 lists both heroes");

  row.chapterId = 1;
  row.gold = 40;
  row.rewardTime = 1792468000;
  save(row);

  const chapter = decodeWireChapter(Uint8Array.from(fieldVar(2, 1).concat(fieldVar(3, 1))));
  assert(chapter !== null && chapter.nowIdx === 1 && chapter.maxIdx === 1, "3007 is the next stage");
  const claim = decodeWireIdleClaim(Uint8Array.from(fieldVar(1, row.rewardTime)));
  assert(claim !== null && claim.rewardTime === row.rewardTime, "3005 reward_time persisted");
  const role = decodeWireRole(
    Uint8Array.from(
      fieldVar(1, row.diamond)
        .concat(fieldVar(2, row.gold))
        .concat(fieldVar(6, row.level))
        .concat(fieldString(9, row.name))
    )
  );
  assert(role !== null && role.gold === 40 && role.name === row.name, "2001 wallet comes from the saved row");
}

fresh();
play(load());
const again = load();
assert(again.roleId === 1000002 && again.heroes.join(",") === "42,43", "restart keeps the role and MAIN");
assert(again.chapterId === 1 && again.gold === 40 && again.rewardTime === 1792468000, "restart keeps stage, gold, idle time");
console.log("persist-roundtrip ok");
