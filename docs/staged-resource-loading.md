# 分阶段资源加载

更新：2026-11-10。负责人已取消全量后台加载，三个阶段均通过LoadingPlan显式配置，未配置资源按需加载。不按模块另建预加载清单。

## 唯一配置入口

client/assets/scripts/app/remake/LoadingPlan.ts 中：
- login：登录界面出现前必须完成。
- enterGame：登录成功、主城出现前必须完成。
- background：主城显示后准备的常用目标；空数组表示不做额外后台准备。

支持按实际路径创建资源描述、明确Bundle内加载路径和类型，以及游戏配置：
```ts
ResourceAssetsUtils.describe("prefabs", "ui/bag/BagView", "Prefab")
{ bundle: "resources", path: "spine/shangcheng", type: "SkeletonData" }
{ config: GConfig.Item }
```
图片使用SpriteFrame的实际加载路径（带/spriteFrame）。预制体直接绑定依赖由Creator加载，不重复抄写。

当前第二段保持主城、背包主体及必要配置；第三段默认仅BagInfoView、HeroListView、HeroInfoView、MainChapterView四个预制体。可以在同一个数组增减图片、动画、预制体或配置。店员、物品图标、英雄立绘等未配置资源使用时加载，不扫描资产目录。

## 页面与资源获取

页面地址和属性仍在@view注册中定义。ApplicationPages只注入打开前置条件；ApplicationResources执行阶段任务，不自动带入同模块其他窗口。

已加载资源直接复用；在途资源共享请求；尚未加载的资源在点击或显示时立即请求。PrefabLoader、配置读取与图片复用ResourceAssets/ResourcePool。统一图片获取入口是ResManager.getSpriteFrame(owner, source)，ResManager仅管理赋图和迟到保护。物品图标直接解析配置，ResManager仅提供目录与路径规则，不维护图标存在性清单；合法ID直接生成地址，ResManager在实际加载失败时按路径去重记录原因，页面继续按候选图回退。角色头像和边框包含默认图候选；ResManager品质框按品质查询，均不决定预加载范围。

project-loading.json、全目录生成逻辑及构建前索引检查已移除。自动图集、原UUID及构建后9张原图去重保留。ResourceCatalog和CommonUiResources已删除。生成器只保留Prefab UUID回退和玩法准入，不生成图片清单。

## 生命周期和缓存缺口

已有节点/作用域引用释放、迟到响应拒绝；节点销毁时撤回持有，最后拥有者释放后交给引擎回收。缓存页面关闭可能只隐藏，因此继续持有资源。阶段预加载、Prefab缓存和部分公共资源目前保留至应用销毁。

尚无统一闲置超时清理、容量上限及页面缓存淘汰策略。后续清理必须保护正在显示、播放及在途资源，区分常驻与可回收资源，不能定时清空全部缓存。本批没有声称完成长期内存管理。

## 验证

进度取实际完成目标数，失败不算成功；后台逐项让帧、停止后不再排队、失败可重试。专项覆盖三个显式数组、未配置目标按需、共享请求、取消、重试及释放。

20:46旧包已验证登录、主城、背包四分类和详情、返回重开、库存不变；全量试验在负责人取消后停止于18,276/21,684，不宣称全量完成。发现旧零字节splice.ss会使引擎报原生缺失；全量链已删除，保留原生空壳拒绝检查。该旧包不能代替当前配置第三段的新包验收。

日常使用Creator本机预览复验；发布包留待整批收口，不为每项脚本修改重复构建。玩法范围不变，先不提交推送。


### 图片入口合并（2026-11-11）

人工入口为client/assets/scripts/framework/assets/ResManager.ts。它是手写的路径与显示逻辑，不再由生成器生成整份图标索引；物品目录规则直接保存在ResManager。旧IconCatalog和SpritePaint文件已删除，无兼容转发。底层ResourceAssets/ResourcePool继续管理作用域、缓存和请求。

```ts
ResManager.setSprite(iconNode, ResManager.skill(skillId));
ResManager.setSprite(faceNode, [ResManager.head(headId) || defaultPath, defaultPath]);
const frame = await ResManager.getSpriteFrame(ownerNode, imagePath);
ResManager.setSprite(iconNode, null); // 清空并阻止旧请求再次赋图
```

setSprite支持单个路径/描述或候选数组，第三参数可传页面有效性判断。缺图按路径去重记录；直接getSpriteFrame失败保留Promise拒绝，由调用者处理。三段预加载仍只配置LoadingPlan，未接入定时清理或页面缓存策略。

## 背包界面缓存当前状态（2026-11-11）

背包已启用有界实例缓存：关闭后保留120秒，全局最多2个闲置页面；参数在UIManager集中定义。重开读取最新Model，无参数默认道具分类，重新适配屏幕。定时检查只处理闲置实例，当前显示与在途打开不参与淘汰；根页面替换和卸载清空缓存。

Creator本机独立环境复验通过：连续切换10次复用同一实例，关闭后业务监听归零；真实等待120秒后缓存归零且计时器停止，重新打开创建新实例；注销后旧缓存清空。首次及淘汰后打开约6ms，缓存重开日志为0ms（整数精度，不是绝对零耗时）。专项测试覆盖最新库存重读、容量上限、活动实例保护、取消和注销清理。

资源边界：阶段预加载由ApplicationResources持有，预制体由PrefabLoader应用缓存持有，本轮不清理这些基础资源。到期前后预制体缓存均2份，资源池作用域25→22、条目85→82。CDP JavaScript堆快照约74.5MB→69.5MB，未强制GC，不能据此认定下降全部来自背包，也不代表GPU纹理或进程总内存；真机和长时间趋势待验。按需Prefab长期持有已在后续本轮收敛，见预制体闲置回收章节；通用资源容量策略仍待实施。见[缓存验收记录](validation/bag-cache-20261111.json)。未提交推送。

## 预制体闲置回收当前实现（2026-11-11）

PrefabLoader按路径分别持有资源池作用域，成功缓存另持有一份引用。spawnPrefab由实例节点持有依赖，UIManager保护异步页面挂载与弹窗实例；节点销毁时撤回自身引用。最后一个实例退出后开始闲置计时，初始120秒；RemakeApp每30秒检查一次，因此前台运行通常在120–150秒内撤回加载器缓存。后台暂停会推迟检查，重回前台后继续，不承诺后台精确计时。

LoadingPlan不变：显式目标继续由ApplicationResources持有。背包详情在第三阶段内，清理加载器缓存不等于卸载预加载资源。页面实例缓存与资源缓存计时分开：背包实例先保留120秒，节点销毁后才开始其预制体的闲置计时。普通动态资源仍按现有ResourcePool拥有者归零释放，本批没有新增第二套图片缓存或通用闲置纹理池。

自动专项已覆盖共享池复用、在途请求保护、实例持有、重复绑定不加引用、预加载独立持有、无预加载资源归零、重新加载及应用关闭后的迟到回包。本机预览已通过：详情显示引用3，关闭后2，关闭113秒观察尚未回收，169秒观察加载器缓存3→2、详情引用2→1，预加载资源仍有效；重开详情引用恢复3、画面正常、无警告错误。观察时间不是精确触发时间。未预加载资源归零及重新请求由自动专项覆盖，本轮没有移除LoadingPlan目标。见[验收记录](validation/prefab-cache-20261111.json)。真机/GPU内存、长期压力及容量策略仍待验。未提交推送。

## 保存点与容量收口（2026-11-11）

负责人要求的当前成果已提交并推送origin/main：00f6b084，包含资源入口收敛、静态登录、背包实例缓存及预制体闲置回收与既有本地修改。之后继续开发的容量上限尚未提交推送。

PrefabLoader新增MAX_IDLE_PREFABS=16：每次维护按最近访问/最后实例退出时间排序，将无实例使用的缓存控制在16份，超时项仍回收；活动实例不计入这个闲置上限，预加载拥有者不受影响。上限是条目数，不是显存或总内存预算，也不是加载完成即强制限制；沿用应用每30秒维护。容量、最近访问保护、实例退出后纳入限额的回归通过，资源/背包/编译兼容与类型检查通过。Creator六轮切页和结算返回已通过；16份超限分支由自动回归覆盖，发布包仍待集中验收。
