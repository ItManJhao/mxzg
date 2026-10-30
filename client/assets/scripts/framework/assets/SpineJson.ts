/**
 * 把磁盘上的 Spine 3.7.94 收成 Creator spine-3.8 能读的一份内存副本。
 * 不改 resources 里的 json。3.8 运行时只拒绝精确的 3.8.75，所以版本写成 3.8.99。
 * 3.7 的 skins 是 {皮名: 附件}。3.8 要 [{name, attachments}]，否则读 attachments 时空指针，整套静默失败。
 * 3.7 的曲线是 curve:[c1,c2,c3,c4]。3.8 是 curve、c2、c3、c4 四个数。
 */
export const SPINE_RUNTIME_VERSION = "3.8.99";

export function upgradeSpine37Json(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const version = spineVersion(raw);
  if (version.indexOf("3.8") === 0 && version !== "3.8.75" && skinsAreRuntimeArray(raw)) return raw;
  const clone = JSON.parse(JSON.stringify(raw)) as SpineRoot;
  if (!clone.skeleton || typeof clone.skeleton !== "object") clone.skeleton = {};
  clone.skeleton.spine = SPINE_RUNTIME_VERSION;
  if (clone.skins && !Array.isArray(clone.skins) && typeof clone.skins === "object") {
    const map = clone.skins as { [name: string]: unknown };
    const skins: SpineSkin[] = [];
    const names = Object.keys(map);
    for (let i = 0; i < names.length; i++) {
      skins.push({ name: names[i], attachments: map[names[i]] });
    }
    clone.skins = skins;
  }
  rewriteCurves(clone);
  return clone;
}

interface SpineRoot {
  skeleton?: { spine?: string };
  skins?: unknown;
}

interface SpineSkin {
  name: string;
  attachments: unknown;
}

function spineVersion(raw: object): string {
  const skeleton = (raw as SpineRoot).skeleton;
  if (!skeleton || typeof skeleton.spine !== "string") return "";
  return skeleton.spine;
}

function skinsAreRuntimeArray(raw: object): boolean {
  return Array.isArray((raw as SpineRoot).skins);
}

function rewriteCurves(node: unknown): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    const first = node[0];
    if (!first || typeof first !== "object") return;
    for (let i = 0; i < node.length; i++) rewriteCurves(node[i]);
    return;
  }
  const obj = node as { [key: string]: unknown };
  const curve = obj.curve;
  if (Array.isArray(curve) && curve.length >= 4 && typeof curve[0] === "number") {
    obj.curve = curve[0];
    obj.c2 = typeof curve[1] === "number" ? curve[1] : 0;
    obj.c3 = typeof curve[2] === "number" ? curve[2] : 1;
    obj.c4 = typeof curve[3] === "number" ? curve[3] : 1;
  }
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const value = obj[keys[i]];
    if (value && typeof value === "object") rewriteCurves(value);
  }
}
