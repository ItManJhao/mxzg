import { GameLog } from "../../core/GameLog";
import { WireSession } from "../../net/WireSession";
import { WIRE_GM_CLOSED_TOAST, WIRE_GM_DEFAULT_TYPE, WIRE_GM_SILENT_MS } from "../../net/protocol/wireGmCommand";
import { GM_ITEM_COMMAND, GmTableOp } from "./GmCatalog";

export interface GmSendResult {
  ok: boolean;
  detail: string;
  /** 加英雄之后短等 4030 / 1005。其它命令没有这个等待。 */
  wait?: { heroBefore: number; errorBefore: number; ms: number };
}

const POSITIVE = /^[1-9]\d{0,11}$/;

function positiveText(raw: string): string | null {
  const text = (raw || "").trim();
  if (!POSITIVE.test(text)) return null;
  return text;
}

/**
 * 加英雄。走原来的 pullGmAddHero，星级仍是 9。
 * 不写本地名册。短等没有 4030 / 1005 时由面板报「GM 未开」。
 */
export function sendGmAddHero(typeId: string): GmSendResult {
  const id = positiveText(typeId) || WIRE_GM_DEFAULT_TYPE;
  if (typeId.trim() && !positiveText(typeId)) {
    return { ok: false, detail: "类型号不对，不发送。本地名册不变" };
  }
  const heroBefore = WireSession.gmHeroSerial;
  const errorBefore = WireSession.wireErrorSerial;
  if (!WireSession.pullGmAddHero(id)) {
    return { ok: false, detail: "未发送 ADD_HERO。未连接或还没有关卡 3007。本地名册不变" };
  }
  GameLog.shared.info("GM", "c2s 2015 ADD_HERO " + id + " 星9。不写本地英雄");
  return {
    ok: true,
    detail: "已发 c2s 2015 ADD_HERO " + id + " 星9。等 s2c 4030。没有回包就是服端 GM 未开，不会写入本地英雄",
    wait: { heroBefore, errorBefore, ms: WIRE_GM_SILENT_MS },
  };
}

/** 加一个道具。命令 ADD_ITEM，两个字符串参数：道具 id、数量。不改本地背包。 */
export function sendGmAddItem(itemId: string, count: string): GmSendResult {
  const id = positiveText(itemId);
  const num = positiveText(count);
  if (!id || !num) return { ok: false, detail: "道具 id 和数量都要是正整数。未发送，本地背包不变" };
  return sendGmTableOp({ title: "加道具", tab: "道具", command: GM_ITEM_COMMAND, params: [id, num] });
}

/** 表里的一条，或加道具。只发 2015，不把结果写进 GameStore。 */
export function sendGmTableOp(op: GmTableOp): GmSendResult {
  if (!WireSession.pullGmCommand(op.command, op.params)) {
    return { ok: false, detail: "未发送 " + op.command + "。未连接、还没有关卡，或命令不合法。本地数据不变" };
  }
  const param = op.params.length > 0 ? op.params.join(",") : "无";
  let detail = "已发 c2s 2015 " + op.command + " param=" + param + "。不改本地背包和名册";
  if (op.command === GM_ITEM_COMMAND) {
    detail += "。gm.xlsx 道具页没有 gm_command，这条按同一帧补了 ADD_ITEM。服端不认时背包不变";
  }
  return { ok: true, detail };
}

/** 再拉一次背包整表。只读，不加道具。 */
export function sendGmRefreshBag(): GmSendResult {
  if (!WireSession.pullBackpack()) {
    return { ok: false, detail: "未连接，没有发 5001。本地背包不变" };
  }
  GameLog.shared.info("GM", "c2s 5001 空拉背包。只按回包更新");
  return { ok: true, detail: "已发空 c2s 5001。背包以 s2c 5001 为准，不加本地道具" };
}

export function gmClosedDetail(): string {
  return WIRE_GM_CLOSED_TOAST + "。没有 s2c 4030 / 1005，本地英雄不变";
}
