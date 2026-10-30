import { instantiate, Label, Node, UITransform, view } from "cc";
import { mountBattlePrefab } from "../../../ui/BattlePage";
import type { BattlePrefabShell } from "../../../ui/BattlePage";
import { mountBattleSpine, mountNamedSpine } from "../../../ui/battleSpine";
import type { SpineActor } from "../../../ui/battleSpine";
import { fitVisibleRoot } from "../../../ui/visibleFit";
import { paintSpritePaths } from "../../../framework/kit/SpritePaint";
import { setText } from "../../../ui/UiKit";
import { paintBattleFloats, paintBattleSkillName, clearBattleOverhead } from "../../../ui/battlePresentView";
import { hangFormationPoint } from "../../../ui/idleHangSkirmishPlan";
import { hpFillLayout, HP_FILL_HEIGHT } from "../../../ui/battlePrefabLayout";
import { mountIdleSkirmish } from "../../../ui/idleHangSkirmish";
import type { IdleSkirmish } from "../../../ui/idleHangSkirmish";
import type { CampaignReport, CampaignUnit, CampaignHit } from "../CampaignApi";
/** Rendering only: animations consume immutable server events and never calculate damage. */
export class CampaignField {
    private actors = new Map<string, {
        actor: SpineActor;
        unit: CampaignUnit;
        index: number;
        hp: number;
        pose: number;
    }>();
    private cancelPlayback: (() => void) | null = null;
    private closed = false;
    private speed = 1;
    private onSkip: (() => void) | null = null;
    private idle: IdleSkirmish | null = null;
    private idleKey = "";
    private poseTimers = new Set<ReturnType<typeof setTimeout>>();
    private constructor(private readonly shell: BattlePrefabShell) { }
    static async open(parent: Node): Promise<CampaignField> {
        const shell = await mountBattlePrefab(parent);
        const field = new CampaignField(shell);
        fitVisibleRoot(shell.root);
        const bg = shell.root.getChildByName("Bg");
        const floor = shell.root.getChildByName("CampaignFloor");
        for (const node of [bg, floor]) {
            if (!node)
                continue;
            node.active = true;
            node.setPosition(0, 0, 0);
            node.setScale(1, 1, 1);
            const { width, height } = view.getVisibleSize();
            const cover = Math.max(width / 640, height / 1280);
            node.getComponent(UITransform)?.setContentSize(640 * cover, 1280 * cover);
        }
        if (bg)
            paintSpritePaths(bg, ["ui/chapter/hang/map01_B"]);
        // Match the retained idle hall: the sky is a short distant layer, while
        // the transparent foreground/floor covers the entire portrait viewport.
        if (bg) { bg.name = "IdleSky"; bg.setPosition(0,430,0); bg.getComponent(UITransform)?.setContentSize(Math.max(640,view.getVisibleSize().width),420); }
        if (floor) floor.name = "IdleFloor";
        for (const path of ["LayerAppear", "LayerHud/TopBar", "LayerHud/BtnRetreat", "LayerHud/TopBar/BtnClose", "LayerHud/SkillBars"]) {
            const node = shell.root.getChildByPath(path);
            if (node)
                node.active = false;
        }
        // The old battle Skip sat behind the shared bottom tabs. Keep it inside the
        // visible battle field, below the shared top bar, with a real touch target.
        const skip = shell.root.getChildByPath("LayerHud/BtnSkip");
        if (skip) {
            const size = view.getVisibleSize();
            skip.setPosition(size.width / 2 - 86, size.height / 2 - 245, 0);
            skip.getComponent(UITransform)?.setContentSize(128, 48);
            skip.active = false;
        }
        const log = shell.root.getChildByPath("LayerHud/Log");
        const logBg = shell.root.getChildByPath("LayerHud/LogBg");
        log?.setPosition(0, -210, 0);
        if (logBg)
            logBg.active = false;
        shell.bindSkip(() => field.skip());
        shell.clearSkillLabels();
        field.clearPresent();
        return field;
    }
    show(units: CampaignUnit[]): void {
        this.stopIdle();
        this.clearPoseTimers();
        this.cancel();
        for (const entry of this.actors.values())
            if (entry.actor.node.isValid)
                entry.actor.node.destroy();
        this.actors.clear();
        for (const side of ["ally", "enemy"] as const)
            for (let index = 0; index < 7; index++) {
                const slot = this.slot(side, index);
                slot.active = false;
                clearBattleOverhead(slot);
                const hp = this.hpLabel(side, index);
                if (hp?.parent)
                    hp.parent.active = false;
            }
        for (const ally of [true, false]) {
            units.filter(unit => unit.ally === ally).forEach((unit, index) => {
                if (index >= 7)
                    return;
                const side = ally ? "ally" : "enemy";
                const slot = this.slot(side, index);
                slot.active = true;
                const placeholder = slot.getChildByName("Placeholder");
                if (placeholder)
                    placeholder.active = false;
                const point = hangFormationPoint(unit.position, unit.ally);
                slot.setPosition(point.x, point.y, 0);
                const label = slot.getChildByName("Label");
                if (label)
                    label.active = false;
                const actor = mountBattleSpine(slot, String(unit.templateId), () => { if (label?.isValid) {
                    label.active = true;
                    setText(label, unit.name);
                } }, { face: ally ? 1 : -1, scale: 0.36, seatY: 0 });
                this.actors.set(unit.id, { actor, unit, index, hp:unit.maxHp, pose:0 });
                this.hp(unit.id, unit.maxHp);
            });
        }
        setText(this.shell.logLabel, "");
        this.clearPresent();
    }
    startIdle(units: CampaignUnit[]): void {
        const key = JSON.stringify(units.map(unit => [unit.id,unit.templateId,unit.position,unit.maxHp]));
        if (this.idle && key === this.idleKey) return;
        this.show(units.filter(unit => unit.ally));
        this.idleKey = key;
        for (const entry of this.actors.values()) {
            const slot = entry.actor.node.parent as Node & { mxzgHangPos?: number };
            slot.mxzgHangPos = entry.unit.position;
        }
        this.idle = mountIdleSkirmish(this.shell.root,{ plans: () => units.filter(unit => !unit.ally).slice(0,7).map((unit,index) => ({
            stem:String(unit.templateId),spot:index,face:-1 as const,maxHp:unit.maxHp,
        })) });
        this.idle.retarget(Array.from(this.actors.values()).map(entry => entry.actor));
    }
    pauseIdle(): void { this.idle?.pause(); }
    resumeIdle(): void { this.idle?.resume(); }
    private stopIdle(): void {
        this.idle?.stop(); this.idle = null; this.idleKey = "";
        for (const name of ["IdleFoes","IdleSkirmishFx"]) this.shell.root.getChildByName(name)?.destroy();
    }
    private hp(id: string, value: number): void {
        const entry = this.actors.get(id);
        if (!entry)
            return;
        const side = entry.unit.ally ? "ally" : "enemy";
        entry.hp = value;
        const label = this.hpLabel(side, entry.index);
        if (label) {
            // The official hall shows the hero's level beside a compact HP bar.
            setText(label, String(entry.unit.level));
            const number = label.getComponent(Label);
            if (number) { number.fontSize = 28; number.lineHeight = 36; }
            label.getComponent(UITransform)?.setContentSize(50,40);
            label.setPosition(-98,0,0);
            if (label.parent) {
                label.parent.active = true;
                label.parent.setScale(.7,.7,1);
                const point = hangFormationPoint(entry.unit.position, entry.unit.ally);
                label.parent.setPosition(point.x, point.y + 100, 0);
            }
        }
        const fill = label?.parent?.getChildByName("Fill");
        if (fill) {
            const layout = hpFillLayout(value / entry.unit.maxHp);
            fill.active = layout.visible;
            fill.getComponent(UITransform)?.setContentSize(layout.width, HP_FILL_HEIGHT);
            fill.setPosition(layout.x, 0, 0);
        }
    }
    /** The main formation allows seven heroes. Reuse the last serialized slot as
     * its template so every server participant has an actor and an HP bar. */
    private slot(side: "ally" | "enemy", index: number): Node {
        if (index < 6)
            return this.shell.slot(side, index);
        const template = this.shell.slot(side, 5);
        const name = side === "ally" ? "Slot_A6" : "Slot_E6";
        let extra = template.parent!.getChildByName(name);
        if (!extra) {
            extra = instantiate(template);
            extra.name = name;
            extra.parent = template.parent;
        }
        return extra;
    }
    private hpLabel(side: "ally" | "enemy", index: number): Node | null {
        if (index < 6)
            return this.shell.hpLabel(side, index);
        const template = this.shell.hpLabel(side, 5)!.parent!;
        const name = side === "ally" ? "AllyHp_6" : "EnemyHp_6";
        let extra = template.parent!.getChildByName(name);
        if (!extra) {
            extra = instantiate(template);
            extra.name = name;
            extra.parent = template.parent;
        }
        return extra.getChildByName("Label");
    }
    replay(report: CampaignReport): Promise<void> {
        this.show(report.units);
        const intro = this.shell.root.getChildByName("LayerAppear");
        if (intro) {
            for (const child of intro.children) child.active = false;
            intro.setPosition(0,180,0); intro.active = true;
            mountNamedSpine(intro,"ZDKS","stand",{loop:false,onComplete:()=>{if(intro.isValid)intro.active=false;},onFail:()=>{if(intro.isValid)intro.active=false;}});
        }
        const skip = this.shell.root.getChildByPath("LayerHud/BtnSkip");
        if (skip)
            skip.active = true;
        return new Promise(resolve => {
            let index = 0, timer: ReturnType<typeof setTimeout> | null = null, done = false;
            const finish = () => {
                if (done)
                    return;
                done = true;
                if (timer)
                    clearTimeout(timer);
                if (skip?.isValid)
                    skip.active = false;
                if (intro?.isValid) intro.active = false;
                this.cancelPlayback = null;
                this.onSkip = null;
                resolve();
            };
            const final = () => { for (; index < report.hits.length; index++)
                this.hit(report.hits[index], false); finish(); };
            const step = () => {
                if (this.closed || !this.shell.root.isValid) {
                    finish();
                    return;
                }
                if (index >= report.hits.length) {
                    finish();
                    return;
                }
                this.hit(report.hits[index++], true);
                timer = setTimeout(step, 650 / this.speed);
            };
            this.cancelPlayback = finish;
            this.onSkip = final;
            timer = setTimeout(() => { if (intro?.isValid) intro.active=false; step(); },700);
        });
    }
    private hit(hit: CampaignHit, animate: boolean): void {
        const attacker = this.actors.get(hit.attackerId), target = this.actors.get(hit.targetId);
        if (!attacker || !target)
            return;
        this.hp(hit.targetId, hit.remainingHp);
        setText(this.shell.logLabel, `第${hit.round}回合 · ${attacker.unit.name} → ${target.unit.name}`);
        if (animate) {
            attacker.actor.play("attack");
            target.actor.play(hit.remainingHp ? "hit" : "die");
            const attackerPose = ++attacker.pose, targetPose = ++target.pose;
            this.afterPose(() => { if (attacker.pose === attackerPose && attacker.hp > 0 && attacker.actor.node.isValid) attacker.actor.play("stand"); });
            this.afterPose(() => {
                if (target.pose !== targetPose || !target.actor.node.isValid) return;
                if (target.hp > 0) target.actor.play("stand");
                else target.actor.node.active = false;
            });
            const point = hangFormationPoint(target.unit.position, target.unit.ally);
            paintBattleFloats(this.shell.present, [{ anchor: target.index, hurt: -hit.damage, crit: false }], [{ x: point.x, y: point.y }]);
            paintBattleSkillName(this.shell.present, "普通攻击");
        }
        if (!hit.remainingHp)
            target.actor.gesture("die");
        if (!animate && !hit.remainingHp) target.actor.node.active = false;
    }
    private afterPose(run: () => void): void {
        const timer = setTimeout(() => { this.poseTimers.delete(timer); if (!this.closed) run(); },350 / this.speed);
        this.poseTimers.add(timer);
    }
    private clearPoseTimers(): void { for (const timer of this.poseTimers) clearTimeout(timer); this.poseTimers.clear(); }
    nextSpeed(): number { this.speed = this.speed === 3 ? 1 : this.speed + 1; return this.speed; }
    skip(): void { this.onSkip?.(); }
    private cancel(): void { this.cancelPlayback?.(); }
    private clearPresent(): void { paintBattleFloats(this.shell.present, []); paintBattleSkillName(this.shell.present, null); }
    dispose(): void { this.closed = true; this.clearPoseTimers(); this.stopIdle(); this.cancel(); if (this.shell.root.isValid)
        this.shell.root.destroy(); }
}
