import { ErrorCode, errorText } from "../../core/errors";
import { Session } from "../../core/Session";
import { heroIdFromShard, ITEM_EXP_POTION, ITEM_GOLD_BAG } from "../bag/items";
import { IDLE_ITEM_ID, IDLE_ITEM_NAME } from "../idle/rewards";
import { shardItemId } from "../summon/pull";
import { MailAttachment, MailEntry } from "../../net/protocol/types";

/**
 * 邮件（C8）。新号三封：系统欢迎、开服补给、维护公告。
 * 金币和钻石进顶栏钱包，其它附件进背包。
 * 没有附件或已经领取过，不能再领。未领的附件不能删。
 */

export const MAIL_WELCOME_ID = 1;
export const MAIL_REWARD_ID = 2;
export const MAIL_NOTICE_ID = 3;

export const MAIL_REWARD_GOLD = 80;
export const MAIL_REWARD_STONE = 3;
export const MAIL_REWARD_GOLD_BAG = 1;

export interface MailSeed {
  id: number;
  title?: string;
  body?: string;
  from?: string;
  /** 已读。缺省未读。 */
  read?: boolean;
  /** 已领取。没有附件时忽略。 */
  claimed?: boolean;
  attachments?: { id: number; count: number }[];
}

/** 会话里的一封信。附件数量已经收成正整数。 */
export interface StoredMail {
  id: number;
  title: string;
  body: string;
  from: string;
  read: boolean;
  claimed: boolean;
  attachments: { id: number; count: number }[];
}

export function starterMails(): MailSeed[] {
  return [
    {
      id: MAIL_WELCOME_ID,
      title: "欢迎来到梦想之光",
      body: "欢迎来到梦想之光。主城、英雄、召唤和背包都已开放。带附件的邮件可以领取，金币会进顶栏，道具会进背包。",
      from: "系统",
      read: false,
    },
    {
      id: MAIL_REWARD_ID,
      title: "开服补给",
      body: "开服补给已送到。请领取金币、强化石和小金币袋。小金币袋可以在背包里使用。",
      from: "系统",
      read: false,
      attachments: [
        { id: 1, count: MAIL_REWARD_GOLD },
        { id: IDLE_ITEM_ID, count: MAIL_REWARD_STONE },
        { id: ITEM_GOLD_BAG, count: MAIL_REWARD_GOLD_BAG },
      ],
    },
    {
      id: MAIL_NOTICE_ID,
      title: "维护公告",
      body: "本周维护已结束。这是一封公告，没有附件，不能领取。",
      from: "系统",
      read: true,
    },
  ];
}

export function emptyMailToast(): string {
  return "邮箱是空的";
}

export function pickMailToast(): string {
  return "请先选择一封邮件";
}

export function deletedToast(title?: string): string {
  if (title) return "已删除：" + title;
  return "已删除";
}

export function mailSummaryText(total: number, unread: number, claimable: number): string {
  if (total <= 0) return emptyMailToast();
  return total + " 封 · 未读 " + finiteInt(unread) + " · 可领 " + finiteInt(claimable);
}

export function mailRowText(mail: {
  unread: boolean;
  title: string;
  hasAttachment: boolean;
  claimed: boolean;
}): string {
  const state = mail.unread ? "未读" : "已读";
  let extra = "";
  if (mail.hasAttachment && mail.claimed) extra = " · 已领取";
  else if (mail.hasAttachment) extra = " · 有附件";
  return state + " · " + (mail.title || "邮件") + extra;
}

export function attachmentText(mail: {
  hasAttachment: boolean;
  claimed: boolean;
  attachments: MailAttachment[];
}): string {
  if (!mail.hasAttachment || !mail.attachments || mail.attachments.length === 0) return "这封邮件没有附件";
  const body = mail.attachments.map((row) => row.name + " ×" + row.count).join("、");
  return (mail.claimed ? "附件已领取：" : "附件：") + body;
}

export function claimButtonText(mail: { hasAttachment: boolean; claimed: boolean } | null): string {
  if (!mail) return "领取";
  if (!mail.hasAttachment) return "无附件";
  if (mail.claimed) return "已领取";
  return "领取";
}

export function claimAllButtonText(claimable: number): string {
  const count = finiteInt(claimable);
  if (count <= 0) return "全部领取";
  return "全部领取（" + count + "）";
}

export function isClaimable(mail: { hasAttachment: boolean; claimed: boolean }): boolean {
  return mail.hasAttachment === true && mail.claimed !== true;
}

export function mailClaimToast(resp: { count?: number; rewards?: MailAttachment[] } | null | undefined): string {
  const phrase = rewardPhrase(resp && resp.rewards ? resp.rewards : []);
  const count = finiteInt(resp?.count);
  if (count > 1) return "领取成功：" + count + " 封" + (phrase ? "，" + phrase : "");
  return "领取成功" + (phrase ? "：" + phrase : "");
}

export function mailFailToast(resp: { code?: number } | null | undefined): string {
  const code = resp && typeof resp.code === "number" ? resp.code : ErrorCode.UNKNOWN_CMD;
  if (code === ErrorCode.MAIL_NOT_FOUND) return "没有这封邮件";
  if (code === ErrorCode.MAIL_NO_ATTACHMENT) return "这封邮件没有附件";
  if (code === ErrorCode.MAIL_ALREADY_CLAIMED) return "附件已经领取过了";
  if (code === ErrorCode.MAIL_NOTHING) return "没有可领取的附件";
  if (code === ErrorCode.MAIL_DELETE_BLOCKED) return "请先领取附件再删除";
  return errorText(code);
}

/** 领取成功才把钱包写进 Session。失败不动。道具在下一次背包列表里读到。 */
export function applyMailClaim(result: { ok?: boolean; gold?: number; diamond?: number } | null | undefined): void {
  if (!result || result.ok !== true) return;
  Session.applyCurrencies(result.gold, result.diamond);
}

export function normalizeMailList(rows: MailSeed[] | null | undefined): StoredMail[] {
  const out: StoredMail[] = [];
  const seen: { [id: number]: boolean } = {};
  const list = rows || [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (!row || typeof row.id !== "number" || !isFinite(row.id)) continue;
    const id = Math.floor(row.id);
    if (id < 1 || seen[id]) continue;
    const attachments = normalizeAttachmentSeeds(row.attachments);
    seen[id] = true;
    out.push({
      id,
      title: textOr(row.title, "邮件" + id),
      body: textOr(row.body, ""),
      from: textOr(row.from, "系统"),
      read: row.read === true,
      claimed: attachments.length > 0 && row.claimed === true,
      attachments,
    });
  }
  return out;
}

export function toMailEntry(mail: StoredMail, heroName?: (heroId: number) => string): MailEntry {
  const attachments = nameAttachments(mail.attachments, heroName);
  const hasAttachment = attachments.length > 0;
  return {
    id: mail.id,
    title: mail.title,
    body: mail.body,
    from: mail.from,
    unread: mail.read !== true,
    hasAttachment,
    claimed: hasAttachment && mail.claimed === true,
    attachments,
  };
}

export function attachmentName(id: number, heroName?: (heroId: number) => string): string {
  if (id === 1) return "金币";
  if (id === 2) return "钻石";
  if (id === ITEM_GOLD_BAG) return "小金币袋";
  if (id === ITEM_EXP_POTION) return "经验药水";
  if (id === IDLE_ITEM_ID) return IDLE_ITEM_NAME;
  const heroId = heroIdFromShard(id);
  if (heroId !== null && id === shardItemId(heroId)) {
    const named = heroName ? heroName(heroId) : "";
    return (named || "英雄") + "碎片";
  }
  return "道具" + id;
}

export function mergeAttachments(rows: MailAttachment[] | null | undefined): MailAttachment[] {
  const out: MailAttachment[] = [];
  const list = rows || [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (!row || finiteInt(row.count) <= 0) continue;
    let found = false;
    for (let j = 0; j < out.length; j++) {
      if (out[j].id !== row.id) continue;
      out[j].count += finiteInt(row.count);
      found = true;
      break;
    }
    if (!found) out.push({ id: row.id, name: row.name, count: finiteInt(row.count) });
  }
  return out;
}

function nameAttachments(
  rows: { id: number; count: number }[],
  heroName?: (heroId: number) => string
): MailAttachment[] {
  const out: MailAttachment[] = [];
  for (let i = 0; i < rows.length; i++) {
    const count = finiteInt(rows[i].count);
    const id = finiteInt(rows[i].id);
    if (id <= 0 || count <= 0) continue;
    out.push({ id, name: attachmentName(id, heroName), count });
  }
  return out;
}

function normalizeAttachmentSeeds(
  rows: { id: number; count: number }[] | null | undefined
): { id: number; count: number }[] {
  const out: { id: number; count: number }[] = [];
  const list = rows || [];
  for (let i = 0; i < list.length; i++) {
    const row = list[i];
    if (!row || typeof row.id !== "number" || !isFinite(row.id)) continue;
    if (typeof row.count !== "number" || !isFinite(row.count)) continue;
    const id = Math.floor(row.id);
    const count = Math.floor(row.count);
    if (id <= 0 || count <= 0) continue;
    let found = false;
    for (let j = 0; j < out.length; j++) {
      if (out[j].id !== id) continue;
      out[j].count += count;
      found = true;
      break;
    }
    if (!found) out.push({ id, count });
  }
  return out;
}

function rewardPhrase(rewards: MailAttachment[]): string {
  const parts: string[] = [];
  for (let i = 0; i < rewards.length; i++) {
    const row = rewards[i];
    const count = finiteInt(row.count);
    if (count <= 0) continue;
    if (row.id === 1) parts.push("金币 +" + count);
    else if (row.id === 2) parts.push("钻石 +" + count);
    else parts.push((row.name || "道具") + " ×" + count);
  }
  return parts.join("、");
}

function textOr(value: string | undefined, fallback: string): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function finiteInt(value: number | undefined): number {
  if (typeof value !== "number" || !isFinite(value)) return 0;
  return Math.floor(value);
}
