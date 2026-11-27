<#
恢复联调 H5 在桌面浏览器的竖屏容器。发布任务仅修改已构建的入口页面，手机仍用引擎全屏布局。
#>
param([Parameter(Mandatory)][string]$IndexFile)
$ErrorActionPreference = 'Stop'
$html = [IO.File]::ReadAllText($IndexFile)
if ($html.Contains('data-desktop-portrait')) {
    return
}

$style = @'
<style>
    html[data-desktop-portrait] body { overflow: hidden; background-color: #000; }
    html[data-desktop-portrait] #GameDiv { flex: none; margin: auto; overflow: hidden; }
</style>
'@
$startup = @'
    // 桌面按原设计比例居中。手机继续使用引擎的全屏布局。
    let engineReady = Promise.resolve();
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const frame = document.getElementById('GameDiv');
        document.documentElement.setAttribute('data-desktop-portrait', '');
        frame.removeAttribute('cc_exact_fit_screen');

        /** 按设计比例更新画布外框，引擎读取实际外框确定布局和输入坐标。 */
        function fitDesktopPortrait() {
            const scale = Math.min(window.innerWidth / 640, window.innerHeight / 1280);
            frame.style.width = (640 * scale) + 'px';
            frame.style.height = (1280 * scale) + 'px';
        }

        fitDesktopPortrait();
        window.addEventListener('resize', fitDesktopPortrait);
        engineReady = System.import('cc').then(function configureDesktopScreen(engine) {
            engine.game.onPostBaseInitDelegate.add(function usePortraitFrame() {
                engine.settings.overrideSettings('screen', 'exactFitScreen', false);
            });
        });
    }

    engineReady
        .then(function startApplication() { return System.import('./index.js'); })
        .catch(function reportStartupError(error) { console.error(error); });
'@
$original = "System.import('./index.js').catch(function(err) { console.error(err); })"
$pattern = '(?m)^[ \t]*' + [regex]::Escape($original) + ';?[ \t]*(?=\r?$)'
if ([regex]::Matches($html, $pattern).Count -ne 1 -or [regex]::Matches($html, '</head>').Count -ne 1) {
    throw 'H5 启动模板有变化，无法安全应用桌面竖屏设置。'
}
$html = [regex]::Replace($html, $pattern, [Text.RegularExpressions.MatchEvaluator]{ param($match) $startup })
$html = $html.Replace('</head>', ($style + [Environment]::NewLine + '</head>'))
[IO.File]::WriteAllText($IndexFile, $html, [Text.UTF8Encoding]::new($false))
