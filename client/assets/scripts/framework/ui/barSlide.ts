/** 底栏切页的方向与指数缓动；仅供当前PageTransition使用，不保存旧页面栈状态。 */
/** 1：新页从右进。-1：新页从左进。0：不播。 */
export function barSlideDir(fromIndex: number, toIndex: number): -1 | 0 | 1 {
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
        return 0;
    }
    return toIndex > fromIndex ? 1 : -1;
}

/** Cocos EaseExponentialOut：1 - 2^(-10t)。两端钉死，避免停在 0.999。 */
export function expoOut(t: number): number {
    if (t <= 0) {
        return 0;
    }
    if (t >= 1) {
        return 1;
    }
    return 1 - Math.pow(2, -10 * t);
}
