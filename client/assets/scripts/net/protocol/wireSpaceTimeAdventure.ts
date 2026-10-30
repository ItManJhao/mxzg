/**
 * 真服时空冒险信息只读。c2s / s2c 都是 74120。
 * c2s 是 GReqSpaceTimeAdventureInfo，空体，没有 page。整帧 04 00 00 00 88 21 01 00，即 0400000088210100。
 * 74120 = 0x12188，小端是 88 21 01 00。空体一次。
 * 这是时空冒险信息，不是已合的时空魔塔 74001（空帧 0400000011210100），也不是积天豪礼2 69001（空帧 04000000890d0100）。
 * 服侧轻懒建（首次 spaceTimeInfoDao.add）可接受。体力 regainEnergy 写回可接受。商店过期清空 shopItems 可接受。无扣费，无领奖，无探索写，无购买写。
 * 不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。不是签到列表 13010。
 * 不是启动链 12010。不是背包 5001。不是世界等级 51001。不是星盘 68001。不是灵器 70001。
 * 74001 已合。本刀不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099。与 74001 分开发，勿合并成一个请求。
 *
 * 由 WireSession.pullIdle 在空 c2s 74001 之后发出，只发一次。Boot.ts 不改。76542 斩魔之路另帧，挂在其后，勿合并。
 * 不夹在 2001 和 3007 中间。
 * 不发 74123 选择航线。74123 是写号，本刀不编码、不发送。
 * 不发 74124 舰队技能加点。74124 是写号，本刀不编码、不发送。
 * 不发 74125 舰队修理。74125 是写号，本刀不编码、不发送。
 * 不发 74126 商店购买。74126 是写号，本刀不编码、不发送。
 * 不发 74127 改航队名。74127 是写号，本刀不编码、不发送。
 * 不发 74128 航队探索。74128 是写号，本刀不编码、不发送。
 * 不发 74129 放弃事件。74129 是写号，本刀不编码、不发送。
 * 不发 74131 执行事件。74131 是写号，本刀不编码、不发送。
 * 不发 74142 航行结算。74142 是写号，本刀不编码、不发送。
 * 不发 74147、74149 超值礼包。不发 74148 疾风之力。这些是写号，本刀不编码、不发送。
 * 不夹发 74121、74122。74121、74122 本刀不编码、不发送。
 * 不做 76501。76501 本轮不做，不编码、不发送。
 * 不做 73002。73002 本轮不做，不编码、不发送。
 * 不做 71001。71001 本轮不做，不编码、不发送。
 * 不做 20011。
 * 5001 已在链上，勿重复。51001 已在链上，勿重复。68001 已在链上，勿重复。70001 已在链上，勿重复。
 * 4601 有 page，硬禁。29001 有 page，硬禁。
 * 相对顺序：2001 → 5001 → 3007 → 3004 → 15000 → 4001 → 17000 → 12010 → 18001 → 22000 → 21010 → 27001 → 4004 → 13044 → 4101 → 4013 → 74100 → 51001 → 20001 → 20012 → 70001 → 73001 → 74300 → 68001 → 75501 → 59001 → 59010 → 55001 → 34001 → 32001 → 4402 → 4401 → 4201 → 74104 → 28100 → 28200 → 75601 → 75606 → 75615 → 28107 → 3099 → 3101 → 20101 → 3203 → 4044 → 13010 → 12020 → 26002 → 26001 → 61001 → 62001 → 63001 → 69001 → 74001 → 74120 → 76542 → 75101 → 75121 → 75131 → 75801 → 75901 → 76001 → 76101 → 76301 → 76081 → 76520 → 76251。
 * 不写金币，不写钻石。不接 USE_*。不回落 Mock。不改 CityChrome / CityMap / SafeArea。
 *
 * s2c 74120 是 GResSpaceTimeAdventureInfo。仓库里没有这份 proto。
 * unlock_route、not_route、energy、not_progress、end_time、shop_end_time、shop_list、status、product_end_time、product_id、product_buy、speed_buff 按声明顺序从 1 编号。
 * unlock_route 是字段 1。not_route 是字段 2。energy 是字段 3。not_progress 是字段 4。
 * end_time 是字段 5。shop_end_time 是字段 6。shop_list 是字段 7。status 是字段 8。
 * product_end_time 是字段 9。product_id 是字段 10。product_buy 是字段 11。speed_buff 是字段 12。
 * unlock_route、not_route 出现的数按出现顺序写。长度包能解成多字段或带子字段的消息时按内层字段号写，不发明内层名字。否则按打包的数写。
 * shop_list 是 repeated。能解成消息时按内层字段号写，不发明商店行的名字。解不成消息时按打包的数写。
 * energy、not_progress、end_time、shop_end_time、status、product_end_time、product_id、product_buy、speed_buff 按标量写。长度包按字段号写，不当成 0。
 * 出现的值如实展示，出现的 0 仍写 0。出现的 -1 仍写 -1。对不上的号按字段号写。
 * 没有的数不写成 0。
 *
 * 空包体是已同步。字段缺省，页上写「已同步空表」，不写成 0。
 * 包解不开时返回 null，调用方保持上一次。
 */
const MAX_BODY = 65536;

/** 和 WsTransport 入站分发、encodeWireMessage 用同一个字符串。数字号是 WireCmd.spaceTimeAdventure。 */
export const WIRE_SPACE_TIME_ADVENTURE_CMD = "wire.74120";

export const WIRE_SPACE_TIME_ADVENTURE_FRAME = "0400000088210100";
export const WIRE_SPACE_TIME_ADVENTURE_EMPTY = "已同步空表";
export const WIRE_SPACE_TIME_ADVENTURE_READONLY_TITLE = "时空冒险（真服只读）";
export const WIRE_SPACE_TIME_ADVENTURE_UNSYNCED_TOAST = "真服未同步";
export const WIRE_SPACE_TIME_ADVENTURE_READONLY_NOTE =
  "只读展示时空冒险信息里实际出现的 unlock_route、not_route、energy、not_progress、end_time、shop_end_time、shop_list、status、product_end_time、product_id、product_buy、speed_buff。按声明顺序是字段 1–12。shop_list 按内层字段号写，不发明商店行名字。缺字段不写成 0，也不补一项。出现的值如实展示。无选择航线、加点、修理、购买、改名、探索、放弃、执行、结算、礼包、疾风之力入口。不重复拉 74001。不发 74123。不发 74124。不发 74125。不发 74126。不发 74127。不发 74128。不发 74129。不发 74131。不发 74142。不发 74147。不发 74148。不发 74149。不夹发 74121。不夹发 74122。不做 76501。不做 73002。不做 71001。不做 20011。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 74001 分开发，勿合并。不写金币，不写钻石。不回落 Mock。无 page";
export const WIRE_SPACE_TIME_ADVENTURE_SIDE_EFFECT =
  "轻懒建（首次 spaceTimeInfoDao.add）可接受。体力 regainEnergy 写回可接受。商店过期清空 shopItems 可接受。无扣费，无领奖，无探索写，无购买写。空 c2s 一次，无 page，挂在 74001 之后。只发 cmd=74120，空帧 0400000088210100。不重复拉 74001。不发 74123。不发 74124。不发 74125。不发 74126。不发 74127。不发 74128。不发 74129。不发 74131。不发 74142。不发 74147。不发 74148。不发 74149。不夹发 74121。不夹发 74122。不做 76501。不做 73002。不做 71001。不做 20011。不是时空魔塔 74001。不是积天豪礼2 69001。不是英雄殿堂 63001。不是神迹遗物 62001。不是周末礼包 61001。不是每月福利列表 26001。不是每日福利列表 26002。不是每日任务列表 12020。5001、51001、68001、70001 已有，勿重复。74001、69001、63001、62001、61001、26001、26002、12020、13010、4044、3203、20101、3101、3099 勿再发。4601 有 page，硬禁。29001 有 page，硬禁。与 74001 分开发，勿合并。本刀不重复拉 74001，也不重复拉 69001，也不重复拉 63001，也不重复拉 62001，也不重复拉 61001，也不重复拉 26001，也不重复拉 26002，也不重复拉 12020，也不重复拉 13010，也不重复拉 4044，也不重复拉 3203，也不重复拉 20101，也不重复拉 3101，也不重复拉 3099";
export const WIRE_SPACE_TIME_ADVENTURE_FIELD_NOTE =
  "unlock_route、not_route、energy、not_progress、end_time、shop_end_time、shop_list、status、product_end_time、product_id、product_buy、speed_buff。按声明顺序是字段 1、2、3、4、5、6、7、8、9、10、11、12。shop_list 不发明内层名字。没有的数不写成 0。只展示实际出现的字段。出现的值如实展示。对不上的号按字段号写";

/** 本刀硬禁。74001 / 69001 / 63001 / 62001 / 61001 / 26001 / 26002 / 5001 / 51001 / 68001 / 70001 / 12020 / 13010 / 4044 / 3203 / 20101 / 3101 / 3099 / 12010 是链上已有帧，不在这张「未编码」表里，由进城链断言不重复发。74123–74129、74131、74142、74147–74149 是写号。74121、74122 不夹发。76501、73002、71001 本轮不做。 */
export const WIRE_SPACE_TIME_ADVENTURE_BANNED_CMDS = [
  "wire.74121",
  "wire.74122",
  "wire.74123",
  "wire.74124",
  "wire.74125",
  "wire.74126",
  "wire.74127",
  "wire.74128",
  "wire.74129",
  "wire.74131",
  "wire.74142",
  "wire.74147",
  "wire.74148",
  "wire.74149",
  "wire.76501",
  "wire.73002",
  "wire.71001",
  "wire.20011",
  "wire.4601",
  "wire.29001",
] as const;

export interface WireSpaceTimeAdventureMark {
  field: number;
  text: string;
}

export interface WireSpaceTimeAdventureNum {
  kind: "num";
  value: number;
}

export interface WireSpaceTimeAdventureRow {
  kind: "row";
  /** 长度包里实际出现的内层号。不发明名字。 */
  marks: WireSpaceTimeAdventureMark[];
}

export type WireSpaceTimeAdventurePiece = WireSpaceTimeAdventureNum | WireSpaceTimeAdventureRow;

export interface WireSpaceTimeAdventureSnapshot {
  /** GResSpaceTimeAdventureInfo.unlock_route。没有时是 null，不写成 0。 */
  unlockRoute: WireSpaceTimeAdventurePiece[] | null;
  /** GResSpaceTimeAdventureInfo.not_route。没有时是 null，不写成 0。 */
  notRoute: WireSpaceTimeAdventurePiece[] | null;
  /** GResSpaceTimeAdventureInfo.energy。没有时是 null，不写成 0。 */
  energy: number | null;
  /** GResSpaceTimeAdventureInfo.not_progress。没有时是 null，不写成 0。 */
  notProgress: number | null;
  /** GResSpaceTimeAdventureInfo.end_time。没有时是 null，不写成 0。 */
  endTime: number | null;
  /** GResSpaceTimeAdventureInfo.shop_end_time。没有时是 null，不写成 0。 */
  shopEndTime: number | null;
  /** GResSpaceTimeAdventureInfo.shop_list。没有时是 null，不写成 0。 */
  shopList: WireSpaceTimeAdventurePiece[] | null;
  /** GResSpaceTimeAdventureInfo.status。没有时是 null，不写成 0。 */
  status: number | null;
  /** GResSpaceTimeAdventureInfo.product_end_time。没有时是 null，不写成 0。 */
  productEndTime: number | null;
  /** GResSpaceTimeAdventureInfo.product_id。没有时是 null，不写成 0。 */
  productId: number | null;
  /** GResSpaceTimeAdventureInfo.product_buy。没有时是 null，不写成 0。 */
  productBuy: number | null;
  /** GResSpaceTimeAdventureInfo.speed_buff。没有时是 null，不写成 0。 */
  speedBuff: number | null;
  /** 对不上这十二个号的字段，或标量号上对不上的值。 */
  marks: WireSpaceTimeAdventureMark[];
}

/**
 * 解 s2c 74120。空包体返回已同步的缺省字段。
 * 超长、坏 varint、列表包解不开时返回 null。
 */
export function decodeWireSpaceTimeAdventure(body: Uint8Array | null | undefined): WireSpaceTimeAdventureSnapshot | null {
  if (!body) return null;
  if (body.length === 0) return emptySnapshot();
  if (body.length > MAX_BODY) return null;
  const fields = readRawFields(body);
  if (!fields) return null;
  return decodeFields(fields);
}

/** 只写出实际出现的字段。都没有时写「已同步空表」。出现的 0 仍写 0。出现的 -1 仍写 -1。 */
export function formatWireSpaceTimeAdventureLine(snap: WireSpaceTimeAdventureSnapshot): string {
  const parts: string[] = [];
  if (snap.unlockRoute !== null) parts.push(formatList("unlock_route", snap.unlockRoute));
  if (snap.notRoute !== null) parts.push(formatList("not_route", snap.notRoute));
  if (snap.energy !== null) parts.push("energy=" + String(snap.energy));
  if (snap.notProgress !== null) parts.push("not_progress=" + String(snap.notProgress));
  if (snap.endTime !== null) parts.push("end_time=" + String(snap.endTime));
  if (snap.shopEndTime !== null) parts.push("shop_end_time=" + String(snap.shopEndTime));
  if (snap.shopList !== null) parts.push(formatList("shop_list", snap.shopList));
  if (snap.status !== null) parts.push("status=" + String(snap.status));
  if (snap.productEndTime !== null) parts.push("product_end_time=" + String(snap.productEndTime));
  if (snap.productId !== null) parts.push("product_id=" + String(snap.productId));
  if (snap.productBuy !== null) parts.push("product_buy=" + String(snap.productBuy));
  if (snap.speedBuff !== null) parts.push("speed_buff=" + String(snap.speedBuff));
  if (parts.length === 0 && snap.marks.length === 0) return WIRE_SPACE_TIME_ADVENTURE_EMPTY;
  if (parts.length === 0) return marksText(snap.marks);
  return joinMarks(parts.join(" / "), snap.marks);
}

export function wireSpaceTimeAdventureNote(snap: WireSpaceTimeAdventureSnapshot): string {
  return formatWireSpaceTimeAdventureLine(snap) + "。" + WIRE_SPACE_TIME_ADVENTURE_SIDE_EFFECT + "。不写金币，不写钻石";
}

function emptySnapshot(): WireSpaceTimeAdventureSnapshot {
  return {
    unlockRoute: null,
    notRoute: null,
    energy: null,
    notProgress: null,
    endTime: null,
    shopEndTime: null,
    shopList: null,
    status: null,
    productEndTime: null,
    productId: null,
    productBuy: null,
    speedBuff: null,
    marks: [],
  };
}

function decodeFields(fields: RawField[]): WireSpaceTimeAdventureSnapshot | null {
  const marks: WireSpaceTimeAdventureMark[] = [];
  let unlockRoute: WireSpaceTimeAdventurePiece[] | null = null;
  let notRoute: WireSpaceTimeAdventurePiece[] | null = null;
  let energy: number | null = null;
  let notProgress: number | null = null;
  let endTime: number | null = null;
  let shopEndTime: number | null = null;
  let shopList: WireSpaceTimeAdventurePiece[] | null = null;
  let status: number | null = null;
  let productEndTime: number | null = null;
  let productId: number | null = null;
  let productBuy: number | null = null;
  let speedBuff: number | null = null;
  let sawEnergy = false;
  let sawProgress = false;
  let sawEnd = false;
  let sawShopEnd = false;
  let sawStatus = false;
  let sawProductEnd = false;
  let sawProductId = false;
  let sawProductBuy = false;
  let sawSpeed = false;
  for (let i = 0; i < fields.length; i++) {
    const row = fields[i];
    if (row.field === 1 || row.field === 2 || row.field === 7) {
      const pieces = piecesOf(row, row.field === 7 ? "shop" : "route");
      if (pieces === "bad") return null;
      if (pieces === "mark") {
        pushMark(marks, row);
        continue;
      }
      if (row.field === 1) unlockRoute = append(unlockRoute, pieces);
      else if (row.field === 2) notRoute = append(notRoute, pieces);
      else shopList = append(shopList, pieces);
      continue;
    }
    if (row.field === 3 && row.kind === "varint" && !sawEnergy) {
      sawEnergy = true;
      energy = accepted(row.varint);
      if (energy === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 4 && row.kind === "varint" && !sawProgress) {
      sawProgress = true;
      notProgress = accepted(row.varint);
      if (notProgress === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 5 && row.kind === "varint" && !sawEnd) {
      sawEnd = true;
      endTime = accepted(row.varint);
      if (endTime === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 6 && row.kind === "varint" && !sawShopEnd) {
      sawShopEnd = true;
      shopEndTime = accepted(row.varint);
      if (shopEndTime === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 8 && row.kind === "varint" && !sawStatus) {
      sawStatus = true;
      status = accepted(row.varint);
      if (status === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 9 && row.kind === "varint" && !sawProductEnd) {
      sawProductEnd = true;
      productEndTime = accepted(row.varint);
      if (productEndTime === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 10 && row.kind === "varint" && !sawProductId) {
      sawProductId = true;
      productId = accepted(row.varint);
      if (productId === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 11 && row.kind === "varint" && !sawProductBuy) {
      sawProductBuy = true;
      productBuy = accepted(row.varint);
      if (productBuy === null) pushMark(marks, row);
      continue;
    }
    if (row.field === 12 && row.kind === "varint" && !sawSpeed) {
      sawSpeed = true;
      speedBuff = accepted(row.varint);
      if (speedBuff === null) pushMark(marks, row);
      continue;
    }
    pushMark(marks, row);
  }
  return {
    unlockRoute,
    notRoute,
    energy,
    notProgress,
    endTime,
    shopEndTime,
    shopList,
    status,
    productEndTime,
    productId,
    productBuy,
    speedBuff,
    marks,
  };
}

function append(
  list: WireSpaceTimeAdventurePiece[] | null,
  pieces: WireSpaceTimeAdventurePiece[]
): WireSpaceTimeAdventurePiece[] {
  if (!list) return pieces.slice();
  for (let i = 0; i < pieces.length; i++) list.push(pieces[i]);
  return list;
}

function piecesOf(row: RawField, mode: "route" | "shop"): WireSpaceTimeAdventurePiece[] | "bad" | "mark" {
  if (row.kind === "varint") {
    const value = accepted(row.varint);
    if (value === null) return "mark";
    return [{ kind: "num", value }];
  }
  if (row.kind === "bytes" && row.bytes) {
    const parsed = mode === "shop" ? decodeShopBytes(row.bytes) : decodeRouteBytes(row.bytes);
    if (!parsed) return "bad";
    return parsed;
  }
  return "mark";
}

function decodeRouteBytes(body: Uint8Array): WireSpaceTimeAdventurePiece[] | null {
  const fields = readRawFields(body);
  if (fields && looksLikeRecord(fields)) return [rowOf(fields)];
  const packed = readPackedNumbers(body);
  if (packed) return numsOf(packed);
  if (fields) return [rowOf(fields)];
  return null;
}

function decodeShopBytes(body: Uint8Array): WireSpaceTimeAdventurePiece[] | null {
  const fields = readRawFields(body);
  if (fields) return [rowOf(fields)];
  const packed = readPackedNumbers(body);
  if (!packed) return null;
  return numsOf(packed);
}

/** 多个不同字段号，或带长度子字段，或空包，当成一条记录。单个标量更像打包的数。 */
function looksLikeRecord(fields: RawField[]): boolean {
  if (fields.length === 0) return true;
  const ids: number[] = [];
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].kind === "bytes") return true;
    if (ids.indexOf(fields[i].field) < 0) ids.push(fields[i].field);
  }
  return ids.length >= 2;
}

function rowOf(fields: RawField[]): WireSpaceTimeAdventureRow {
  const marks: WireSpaceTimeAdventureMark[] = [];
  for (let i = 0; i < fields.length; i++) {
    const mark = markOf(fields[i]);
    if (mark) marks.push(mark);
  }
  return { kind: "row", marks };
}

function numsOf(values: number[]): WireSpaceTimeAdventureNum[] {
  const rows: WireSpaceTimeAdventureNum[] = [];
  for (let i = 0; i < values.length; i++) rows.push({ kind: "num", value: values[i] });
  return rows;
}

function formatList(name: string, pieces: WireSpaceTimeAdventurePiece[]): string {
  if (pieces.length === 0) return name + "=空";
  let allNum = true;
  for (let i = 0; i < pieces.length; i++) {
    if (pieces[i].kind !== "num") allNum = false;
  }
  if (allNum) {
    const n = Math.min(pieces.length, 8);
    const head: string[] = [];
    for (let i = 0; i < n; i++) head.push(String((pieces[i] as WireSpaceTimeAdventureNum).value));
    if (pieces.length > n) return name + "=" + head.join(",") + "…+" + (pieces.length - n);
    return name + "=" + head.join(",");
  }
  const n = Math.min(pieces.length, 4);
  const head: string[] = [];
  for (let i = 0; i < n; i++) head.push(formatPiece(pieces[i]));
  if (pieces.length > n) return name + "=" + head.join(";") + "…+" + (pieces.length - n);
  return name + "=" + head.join(";");
}

function formatPiece(piece: WireSpaceTimeAdventurePiece): string {
  if (piece.kind === "num") return String(piece.value);
  if (piece.marks.length === 0) return "空";
  return marksText(piece.marks);
}

function pushMark(marks: WireSpaceTimeAdventureMark[], row: RawField): void {
  const mark = markOf(row);
  if (mark) marks.push(mark);
}

function joinMarks(line: string, marks: WireSpaceTimeAdventureMark[]): string {
  if (marks.length === 0) return line;
  if (!line) return marksText(marks);
  return line + " / " + marksText(marks);
}

function marksText(marks: WireSpaceTimeAdventureMark[]): string {
  const parts: string[] = [];
  for (let i = 0; i < marks.length; i++) parts.push("字段" + marks[i].field + "=" + marks[i].text);
  return parts.join(" / ");
}

interface RawField {
  field: number;
  kind: "varint" | "bytes";
  varint?: number;
  bytes?: Uint8Array;
}

function markOf(row: RawField): WireSpaceTimeAdventureMark | null {
  if (row.field <= 0) return null;
  if (row.kind === "varint" && typeof row.varint === "number" && isFinite(row.varint)) {
    if (row.varint === -1) return { field: row.field, text: "-1" };
    if (row.varint >= 0) return { field: row.field, text: String(Math.floor(row.varint)) };
  }
  if (row.kind === "bytes" && row.bytes) {
    const text = utf8Printable(row.bytes);
    if (text !== null) return { field: row.field, text };
    return { field: row.field, text: "未解" };
  }
  return { field: row.field, text: "未解" };
}

function utf8Printable(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return null;
  let text = "";
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch (_err) {
    return null;
  }
  if (!text) return null;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 32 || code === 127) return null;
  }
  return text;
}

function accepted(value: number | undefined): number | null {
  if (typeof value !== "number" || !isFinite(value)) return null;
  if (value === -1) return -1;
  if (value < 0) return null;
  return Math.floor(value);
}

function readPackedNumbers(body: Uint8Array): number[] | null {
  if (body.length === 0) return [];
  const values: number[] = [];
  let i = 0;
  while (i < body.length) {
    const val = readVarint(body, i);
    if (!val) return null;
    const value = accepted(val.value);
    if (value === null) return null;
    values.push(value);
    i = val.next;
  }
  return values;
}

function readRawFields(body: Uint8Array): RawField[] | null {
  const fields: RawField[] = [];
  let i = 0;
  while (i < body.length) {
    const key = readVarint(body, i);
    if (!key) return null;
    const field = key.value >>> 3;
    const wt = key.value & 7;
    i = key.next;
    if (field <= 0) return null;
    if (wt === 0) {
      const val = readVarint(body, i);
      if (!val) return null;
      fields.push({ field, kind: "varint", varint: val.value });
      i = val.next;
      continue;
    }
    if (wt === 2) {
      const len = readVarint(body, i);
      if (!len) return null;
      i = len.next;
      if (len.value < 0 || i + len.value > body.length) return null;
      const blob = body.slice(i, i + len.value);
      i += len.value;
      fields.push({ field, kind: "bytes", bytes: blob });
      continue;
    }
    return null;
  }
  return fields;
}

function readVarint(body: Uint8Array, offset: number): { value: number; next: number } | null {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (i < body.length && shift <= 63) {
    const b = body[i];
    i += 1;
    value += (b & 0x7f) * Math.pow(2, shift);
    if ((b & 0x80) === 0) {
      if (isProtoInt64Neg1(body, offset, i)) return { value: -1, next: i };
      if (!Number.isSafeInteger(value) || value < 0) return null;
      return { value, next: i };
    }
    shift += 7;
  }
  return null;
}

/** protobuf int64 的 -1：九个 0xFF 再加 0x01。 */
function isProtoInt64Neg1(body: Uint8Array, start: number, end: number): boolean {
  if (end - start !== 10) return false;
  for (let i = 0; i < 9; i++) {
    if (body[start + i] !== 0xff) return false;
  }
  return body[start + 9] === 0x01;
}
