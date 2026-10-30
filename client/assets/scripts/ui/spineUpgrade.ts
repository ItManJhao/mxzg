/** Shared compatibility conversion; legacy locomotion remains here. */
export { SPINE_RUNTIME_VERSION, upgradeSpine37Json } from "../framework/assets/SpineJson";

const PLANTED_CLIPS = ["run", "walk", "run2"];
const PLANTED_BONES = ["root", "root_1", "bone"];

/**
 * 挂机跑和走只留手脚。身体骨的 translate 会把人抬离地砖，删掉。
 * 攻击、站立不动。改的是内存副本，不改磁盘上的 json。
 */
export function plantHangLocomotion(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const anims = (raw as { animations?: { [name: string]: SpineAnim } }).animations;
  if (!anims) return raw;
  for (let c = 0; c < PLANTED_CLIPS.length; c++) {
    const anim = anims[PLANTED_CLIPS[c]];
    if (!anim || !anim.bones) continue;
    for (let b = 0; b < PLANTED_BONES.length; b++) {
      const bone = anim.bones[PLANTED_BONES[b]];
      if (bone && bone.translate) delete bone.translate;
    }
  }
  return raw;
}

interface SpineAnim {
  bones?: { [name: string]: { translate?: unknown } };
}
