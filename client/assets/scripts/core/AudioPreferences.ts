/**
 * 本机音频设置：设置窗读取和更新音乐、音效偏好，场景和演出沿用各自的音源。
 * 音乐开关立即作用于当前背景音乐，音效开关控制后续播放，设置随设备保留。
 */
import { sys, type AudioSource } from "cc";
import { GameLog } from "./GameLog";

export class AudioPreferences {
    /** 旧版默认开启。首次访问从设备读取，此后直接使用当前进程的选择。 */
    private static music: boolean | undefined;
    /** 旧版默认开启。后续请求播放音效时读取，既有短音效按原时长结束。 */
    private static effects: boolean | undefined;
    /** 当前场景持有的背景音源。关闭音乐时保留音源，离开场景时由播放方解除。 */
    private static currentMusic: AudioSource | null = null;

    /** 统一由设置窗和播放入口访问，无需创建工具实例。 */
    private constructor() {
    }

    /** 获取本机背景音乐的选择。 */
    public static get musicEnabled(): boolean {
        return this.music ??= this.read("mxzg.audio.music");
    }

    /** 获取本机音效的选择。 */
    public static get effectsEnabled(): boolean {
        return this.effects ??= this.read("mxzg.audio.effects");
    }

    /** 保存音乐选择，立即启停当前场景的背景音乐。 */
    public static setMusicEnabled(enabled: boolean): void {
        if (this.musicEnabled === enabled) {
            return;
        }
        this.music = enabled;
        this.write("mxzg.audio.music", enabled);
        const source = this.currentMusic;
        if (source?.isValid) {
            if (enabled) {
                source.play();
            } else {
                source.stop();
            }
        }
    }

    /** 保存短音效选择，从下一次申请播放起应用。 */
    public static setEffectsEnabled(enabled: boolean): void {
        this.effects = enabled;
        this.write("mxzg.audio.effects", enabled);
    }

    /** 接管已经绑定音频的背景音源。关闭设置时仍登记，便于玩家开启后播放。 */
    public static playMusic(source: AudioSource): void {
        if (this.currentMusic === source) {
            return;
        }
        if (this.currentMusic?.isValid) {
            this.currentMusic.stop();
        }
        this.currentMusic = source;
        if (this.musicEnabled) {
            source.play();
        }
    }

    /** 停止播放方自己的音源，旧场景退出不会清除新场景登记的背景音乐。 */
    public static stopMusic(source: AudioSource): void {
        if (this.currentMusic === source) {
            this.currentMusic = null;
        }
        if (source.isValid) {
            source.stop();
        }
    }

    /** 满足设备偏好时播放已有音源。音源和音频资源仍由发起方清理。 */
    public static playEffect(source: AudioSource): void {
        if (this.effectsEnabled) {
            source.play();
        }
    }

    /** 读取当前设备选项。存储不可用时仍可在本次运行调整音乐和音效。 */
    private static read(key: string): boolean {
        try {
            return sys.localStorage.getItem(key) !== "false";
        } catch (error) {
            GameLog.shared.warnOnce("PLATFORM", "AudioPreferences", "READ", String(error));
            return true;
        }
    }

    /** 持久化设备选项，失败不影响已生效的当前选择。 */
    private static write(key: string, enabled: boolean): void {
        try {
            sys.localStorage.setItem(key, String(enabled));
        } catch (error) {
            GameLog.shared.warnOnce("PLATFORM", "AudioPreferences", "WRITE", String(error));
        }
    }
}
