# 多分辨率与安全区（B8）

设计分辨率是 **640×1280**（竖屏），已经写在 `client/settings/v2/packages/project.json`。Boot 的 Canvas 内容尺寸是 640×1280，中心在 (320, 640)。Main / Battle 的 Canvas 仍是引擎默认 960×640，`_alignCanvasWithScreen` 在运行时按可见区域改。代码不把它改成横屏，也不调用 `view.setDesignResolutionSize`。

项目只勾选 **适配高度（Fit Height）**，不勾选适配宽度。两个一起勾是 SHOW_ALL，屏幕比例不同时可能出现留边。

2026-10-29 已核对日服引擎补丁 `客户端/engine-build/build/engine_changes.patch` 的 AppDelegate 启动代码（约 46616–46623 行）：以启动时 win_size.height / win_size.width 判断，值大于 1.34 时设置 `640, 1280, FIXED_HEIGHT`，否则设置 `768, 1280, FIXED_HEIGHT`。日服 `engine-build/web/shell.html` 另外按浏览器视口计算实际画布像素，画布像素不是另一套 UI 设计尺寸。当前 Creator 的 640×1280 + Fit Height 与日服手机基准一致，继续保持；平板、窄屏与安全区通过布局适配处理，不为迁就单张背景或旧 Prefab 把工程改成 720×1280。日服 Lua 里还有 640×1136 等局部面板尺寸，不能拿局部尺寸替代应用启动设置。

新功能继续以 640×1280 的逻辑坐标和组件尺寸设计；美术可以按两倍像素制作，设计基准与图片分辨率分别记录。720×1280 的布局基准比 640×1280 宽 12.5%，但在 Fit Height 下并不会增加同一设备的可见逻辑宽度。已有 720 作者宽的底栏通过适配保留。将来若整体迁到 720，需同步梳理安全区、面板约束、横向坐标和适配检查，不能只修改项目配置后同时保留两套未标明的设计基准。

Fit Height 的可视设计宽 = 屏宽 × 1280 / 屏高，**不读设计宽**。所以设计宽从 720 改成 640 之后，同一台手机的可视宽不变：iPhone 14 Pro（393×852）仍约 **590**，9:16 仍约 **720**，宽屏预览仍可以到大约 996。590 小于 640，羊皮纸仍要按可视宽缩小。9:16 的可视宽大于设计宽，全屏垫图仍按 720 盖，不收成 640。主城顶栏、底栏和 CityHub 用 Widget 左右拉到 `view.getVisibleSize()` 的宽。底栏按钮按预制作者宽 720 收拢。主城地图仍是 `ui/maps/map-bg-city-*` 多层长图（设计高 1280，逻辑宽约 1500），默认视口宽是 640，运行时跟可见宽走。内容宽至少等于可见宽，可以左右拖；拖到最左时，内容左缘贴屏幕左缘。

`scripts/ui/SafeArea.ts` 只读引擎算完的可见区域和 `sys.getSafeAreaRect()`，再把 UI 放进安全区：

- 边距不对称时，内容中心移到安全区中心，避免刘海和底部横条压住按钮、Toast。
- Boot 的 `SafeFrame` 在安全区比设计分辨率小时只缩小、不放大。
- 主城顶底栏和主城地图不再因为可见宽小于设计宽而整层缩小。那一层缩小会在上下再留出黑边。它们抵消祖先缩放，按可见尺寸铺。
- 弹窗层只平移，不缩放，遮罩仍盖住画面。

## 倩不用改场景

Canvas 上已经有四边对齐的 Widget。不要再挂引擎自带的 SafeArea 组件，会和这里抢边距。Boot、MainApp 会在 `start` 时自己适配，并监听窗口变化。

## 桌面上看刘海

浏览器预览通常四边都是 0。控制台执行：

```js
localStorage.setItem("mxzg.safe", "88,0,34,0")
```

顺序是上、右、下、左，单位是设计分辨率像素。然后拖一下窗口（或刷新）。左上角那一行（例如 `590x1280 L0 T0 R0 B0 x0.82`）默认不画。要看时地址加 `?safeDebug=1`，或执行 `localStorage.setItem("mxzg.safeDebug", "1")` 后再刷新。控制台 `[mxzg][debug][SafeArea]` 仍会写设计分辨率，例如 `visible 640x1280 design 640x1280 L0 R0 T88 B34 scale 0.90`，不受这一行开关影响。

去掉预览边距：`localStorage.removeItem("mxzg.safe")`。预览地址加 `?safe=88,0,34,0` 同样有效，并且优先于 localStorage。关掉分辨率行：去掉 `safeDebug=1`，并 `localStorage.removeItem("mxzg.safeDebug")`。适配仍在。

真机刘海要页面带 `viewport-fit=cover`。Creator 3.8 的 Web Mobile 模板一般已经写了。若真机边距一直是 0，再查构建模板的 viewport。
