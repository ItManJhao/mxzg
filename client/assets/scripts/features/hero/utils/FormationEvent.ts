/** 阵容保存进度事件：Controller更新过程Model后通知，View自行读取并绘制。 */
export const FormationEvent = { SaveChanged: "formation:save-changed" } as const;
declare module "../../../framework/EventDispatcher" {
    interface EventPayloads {
        [FormationEvent.SaveChanged]: { readonly revision: number };
    }
}
