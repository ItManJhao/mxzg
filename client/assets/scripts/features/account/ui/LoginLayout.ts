/** Shared by loading and login. Matches LogoSceneCtr/LoadingSceneCtr width / 770. */
export function loginLayout(width: number, height: number) {
    const cover = Math.max(width / 768, height / 1300);
    return { backgroundWidth: 768 * cover, backgroundHeight: 1300 * cover,
        castScale: width / 770, castY: height * 0.05 };
}
