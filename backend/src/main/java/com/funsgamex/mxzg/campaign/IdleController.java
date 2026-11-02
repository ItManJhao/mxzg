/** 普通挂机 HTTP 契约：客户端只提交幂等标识和预期版本，时间、关卡、奖励均由服务器决定。 */
package com.funsgamex.mxzg.campaign;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/idle")
public class IdleController {
    private final IdleService service;
    /** 注入唯一挂机用例。 */
    public IdleController(IdleService service) { this.service=service; }
    /** 查询可信时间、上限和每周期基础收益，不执行随机掉落。 */
    @GetMapping public IdleService.State current(@RequestHeader(value="Authorization",required=false) String token) { return service.current(token); }
    /** 领取一次收益；重复请求返回同一收据，不重复发放。 */
    @PostMapping("/claim") public IdleService.Result claim(@RequestHeader(value="Authorization",required=false) String token,@RequestBody IdleService.Request request) {
        return service.claim(token,request);
    }
}
