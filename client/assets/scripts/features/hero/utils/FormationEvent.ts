/** 阵容模块的保存状态和只读草稿战力事件，由当前窗口按请求编号接收。 */
export const FormationEvent = {
    SaveChanged: "formation:save-changed",
    PowerPreviewed: "formation:power-previewed",
} as const;
declare module "../../../framework/EventDispatcher" {
    interface EventPayloads {
        [FormationEvent.SaveChanged]: { readonly revision: number };
        [FormationEvent.PowerPreviewed]: {
            readonly requestId: string;
            /** null 表示该次预览失败，不覆盖为零。 */
            readonly power: number | null;
        };
    }
}
