/** 普通升级 HTTP 契约；身份来自会话，写请求只接受逻辑请求标识及预期当前等级。 */
package com.funsgamex.mxzg.hero;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/heroes/{heroId}/level-up")
public class HeroLevelController {
    private final HeroLevelService service;
    /** 注入升级用例，不在控制器计算消耗或属性。 */
    public HeroLevelController(HeroLevelService service) { this.service=service; }
    /** 读取自己的英雄升级条件，未持有或不存在统一由用例返回 404。 */
    @GetMapping public HeroLevelService.Preview preview(@RequestHeader(value="Authorization",required=false) String token,@PathVariable String heroId) {
        return service.preview(token,heroId);
    }
    /** 每次请求固定升一级，禁止客户端指定奖励、消耗、目标属性或所属角色。 */
    @PostMapping public HeroLevelService.Result upgrade(@RequestHeader(value="Authorization",required=false) String token,@PathVariable String heroId,@RequestBody HeroLevelService.Request request) {
        return service.upgrade(token,heroId,request);
    }
    /** 缺失或异常配置明确不可用，不向客户端泄露内部表和服务器路径。 */
    @ExceptionHandler(IllegalStateException.class) public ProblemDetail unavailable(IllegalStateException failure) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,"HERO_CONFIG_UNAVAILABLE");
    }
}
