# 分阶段资源加载

更新：2026-11-10。负责人已取消全量后台加载，三个阶段均通过LoadingPlan显式配置，未配置资源按需加载。不按模块另建预加载清单。

## 唯一配置入口

client/assets/scripts/app/remake/LoadingPlan.ts 中：
- login：登录界面出现前必须完成。
- enterGame：登录成功、主城出现前必须完成。
- background：主城显示后准备的常用目标；空数组表示不做额外后台准备。

支持生成资源描述、明确Bundle内加载路径和类型，以及游戏配置：
```ts
ResourceCatalog.prefab_bag.BagView
{ bundle: "resources", path: "spine/shangcheng", type: "SkeletonData" }
{ config: GConfig.Item }
```
图片使用SpriteFrame的实际加载路径（带/spriteFrame）。预制体直接绑定依赖由Creator加载，不重复抄写。

当前第二段保持主城、背包主体及必要配置；第三段默认仅BagInfoView、HeroListView、HeroInfoView、MainChapterView四个预制体。可以在同一个数组增减图片、动画、预制体或配置。店员、物品图标、英雄立绘等未配置资源使用时加载，不扫描资产目录。

## 页面与资源获取

页面地址和属性仍在@view注册中定义。ApplicationPages只注入打开前置条件；ApplicationResources执行阶段任务，不自动带入同模块其他窗口。

已加载资源直接复用；在途资源共享请求；尚未加载的资源在点击或显示时立即请求。PrefabLoader、配置读取与图片复用ResourceAssets/ResourcePool。统一图片获取入口是ResourceAssetsUtils.getSpriteFrame(owner, source)，SpritePaint仅管理赋图和迟到保护。物品图标直接解析配置，IconCatalog只保留物品目录/缺图例外及其他暂未迁移的专用映射；CommonUiResources品质框按品质查询，均不决定预加载范围。

project-loading.json、全目录生成逻辑及构建前索引检查已移除。自动图集、原UUID及构建后9张原图去重保留。生成ResourceCatalog/IconCatalog的既有工具继续保留，不表示全量预加载。

## 生命周期和缓存缺口

已有节点/作用域引用释放、迟到响应拒绝；节点销毁时撤回持有，最后拥有者释放后交给引擎回收。缓存页面关闭可能只隐藏，因此继续持有资源。阶段预加载、Prefab缓存和部分公共资源目前保留至应用销毁。

尚无统一闲置超时清理、容量上限及页面缓存淘汰策略。后续清理必须保护正在显示、播放及在途资源，区分常驻与可回收资源，不能定时清空全部缓存。本批没有声称完成长期内存管理。

## 验证

进度取实际完成目标数，失败不算成功；后台逐项让帧、停止后不再排队、失败可重试。专项覆盖三个显式数组、未配置目标按需、共享请求、取消、重试及释放。

20:46旧包已验证登录、主城、背包四分类和详情、返回重开、库存不变；全量试验在负责人取消后停止于18,276/21,684，不宣称全量完成。发现旧零字节splice.ss会使引擎报原生缺失；全量链已删除，保留原生空壳拒绝检查。该旧包不能代替当前配置第三段的新包验收。

需刷新Creator、重载构建扩展到1.3.0并重新构建bag-atlas-review，再检查后台仅执行四个默认目标及其依赖。玩法范围不变，先不提交推送。
