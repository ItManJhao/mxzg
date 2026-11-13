/** 挂机对话显示：页面持有计时与气泡，沿用旧配置，跨遇敌/跑步保留冷却；挑战和关页清理。 */
import { instantiate, Node, RichText, UITransform } from "cc";
import { ResourceAssetsUtils } from "../../../framework/assets/ResourceAssetsUtils";
import { GameLog } from "../../../core/GameLog";
import { HeroTalkRow, HeroTalkUtils } from "../utils/HeroTalkUtils";

export class MainChapterHeroTalk {
    /** 配置资源归本页面，销毁时释放。 */
    private readonly assets = ResourceAssetsUtils.createAssetScope();
    /** 等级筛选表，加载失败时保持空，不编造台词。 */
    private rows: HeroTalkRow[] = [];
    /** 旧语言编号对应正式中文内容。 */
    private language = new Map<number, string>();
    /** 冷却和停留时长，单位秒，由 system 配置赋值。 */
    private cooldown = 0;
    /** 台词显示秒数，旧 system.hero_talk_last。 */
    private duration = 0;
    /** 首次准备好即允许说话，之后跨挂机循环累计冷却秒数。 */
    private elapsed = Number.POSITIVE_INFINITY;
    /** 当前气泡、跟随英雄槽和剩余显示秒数。 */
    private bubble: Node | null = null;
    /** 当前说话站位；行军与战报宿主切换时按同名槽接续。 */
    private speaker: Node | null = null;
    /** 本条台词剩余停留秒数，关闭或到期移除气泡。 */
    private remaining = 0;
    /** 销毁后拒绝迟到资源，避免关闭页面后重新显示。 */
    private closed = false;
    /** 静态模板与战场宿主由页面注入，等级只读权威角色。 */
    public constructor(private readonly template: Node, private readonly host: Node, private readonly level: () => number) {
        void this.load();
    }

    /** 一次加载旧配置；失败仅停用对话，不阻断战斗。 */
    private async load(): Promise<void> {
        try {
            const [talk, language, system] = await Promise.all([
                this.assets.loadPath("config/herotalk", "JsonAsset"),
                this.assets.loadPath("config/language", "JsonAsset"),
                this.assets.loadPath("config/system", "JsonAsset"),
            ]);
            if (this.closed) return;
            this.rows = (talk.json as { rows: HeroTalkRow[] }).rows;
            this.language = new Map((language.json as { rows: { key: number; value: string }[] }).rows.map(row => [row.key, row.value]));
            const values = (system.json as { rows: { key: string; value: number }[] }).rows;
            this.cooldown = Number(values.find(row => row.key === "hero_talk_cd")?.value) || 0;
            this.duration = Number(values.find(row => row.key === "hero_talk_last")?.value) || 0;
        } catch (error) {
            if (!this.closed) GameLog.shared.classified("MODULE", "warn", "MainChapterHeroTalk", "对话配置不可用：" + String(error));
        }
    }

    /** 只在挂机更新；气泡跟随活动英雄槽，遇敌换宿主时结束旧气泡但保留冷却。 */
    public update(dt: number, enabled: boolean): void {
        if (this.closed) return;
        if (!enabled) { this.clear(); return; }
        const delta = Math.max(0, dt);
        this.elapsed += delta;
        this.remaining -= delta;
        const heroes = this.activeHeroes();
        if (this.bubble && this.speaker && (!this.speaker.isValid || !this.speaker.activeInHierarchy)) {
            // 同一权威站位由行军切到战报节点，保持原台词与剩余停留时间。
            const nextSpeaker = heroes.find(hero => hero.name === this.speaker!.name);
            if (!nextSpeaker) {
                // 战报资源加载的短暂无英雄阶段只隐藏，不能缩短旧版10秒停留。
                this.bubble.active = false;
                if (this.remaining <= 0) this.clear();
                return;
            }
            this.speaker = nextSpeaker;
            this.bubble.active = true;
        }
        if (this.bubble && (this.remaining <= 0 || !this.speaker)) this.clear();
        if (this.bubble && this.speaker) {
            const point = this.speaker.worldPosition;
            const local = this.bubble.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(point);
            const halfWidth = this.bubble.parent!.getComponent(UITransform)!.width / 2;
            this.bubble.setPosition(Math.max(-halfWidth + 135, Math.min(halfWidth - 135, local.x + 60)), local.y + 190, 0);
        }
        if (this.bubble || this.elapsed < this.cooldown || this.cooldown <= 0 || this.duration <= 0) return;
        const candidates = HeroTalkUtils.candidates(this.level(), this.rows, this.language);
        if (!heroes.length || !candidates.length) return;
        this.speaker = heroes[Math.floor(Math.random() * heroes.length)];
        this.bubble = instantiate(this.template);
        this.bubble.name = "HeroTalkBubble";
        this.bubble.parent = this.template.parent;
        this.bubble.active = true;
        this.bubble.getChildByName("Text")!.getComponent(RichText)!.string = HeroTalkUtils.richText(candidates[Math.floor(Math.random() * candidates.length)]);
        this.remaining = this.duration;
        this.elapsed = 0;
        this.update(0, true);
    }

    /** 获取当前活动挂机显示的我方槽位，行军与遇敌共用原站位名称。 */
    private activeHeroes(): Node[] {
        const heroes: Node[] = [];
        for (const root of this.host.children) {
            const slots = root.getChildByPath("LayerField/AllySlots");
            for (const slot of slots?.children || []) {
                if (slot.activeInHierarchy) heroes.push(slot);
            }
        }
        return heroes;
    }

    /** 切换挑战或说话单位消失时移除气泡，不重置挂机冷却。 */
    private clear(): void {
        if (this.bubble?.isValid) this.bubble.destroy();
        this.bubble = null;
        this.speaker = null;
    }

    /** 页面关闭释放气泡与配置资源，迟到加载不得重新激活。 */
    public dispose(): void {
        this.closed = true;
        this.clear();
        this.assets.dispose();
    }
}
