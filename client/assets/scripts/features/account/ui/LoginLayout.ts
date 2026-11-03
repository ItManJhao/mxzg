/** 登录和加载美术共用的尺寸计算，不负责创建页面或切换流程。 */
/** 依据视口返回铺满背景和人物缩放尺寸，保持旧版宽度比例。 */
export function loginLayout(width: number, height: number) {
    const cover = Math.max(width / 768, height / 1300);
    return { backgroundWidth: 768 * cover, backgroundHeight: 1300 * cover,
        castScale: width / 770, castY: height * 0.05 };
}
