/**
 * 事务回执的共享持久化格式检查。冻结原 JSON 和摘要，重读发现损坏时拒绝恢复。
 * 业务服务仍负责验证角色、业务键及结果，网络使用生成的二进制协议。
 */
package com.funsgamex.mxzg.reward;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@Component
public class RewardReceiptPayloads {
    /** 协议支持的客户端精确非负整数上限。 */
    private static final long MAX_SAFE_INTEGER = 9_007_199_254_740_991L;
    /** 客户端生成和回执自身使用的规范 UUID 格式。 */
    private static final Pattern UUID = Pattern.compile("[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}");
    /** 使用应用统一映射配置保存实际发奖结果。 */
    private final ObjectMapper mapper;

    /** 回执内容和对应的原始字节摘要，跟随实际资产同事务保存。 */
    public record Frozen(String json, String hash) {}

    /** 注入统一JSON映射器，不保存每次领取的可变状态。 */
    public RewardReceiptPayloads(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    /** 校验准确数值后冻结本次回执，无法交付的结果在事务提交前拒绝。 */
    public Frozen freeze(Object result) {
        JsonNode fields = mapper.valueToTree(result);
        requireSafeNumbers(fields);
        String json = mapper.writeValueAsString(fields);
        return new Frozen(json, hash(json));
    }

    /** 按原冻结内容读取历史结果，摘要损坏不得被当成未发奖。 */
    public <T> T read(String json, String expectedHash, Class<T> type) {
        if (!hash(json).equals(expectedHash)) {
            throw new IllegalStateException("奖励历史回执摘要损坏");
        }
        return mapper.readValue(json, type);
    }

    /** 返回标识是否为规范小写 UUID。 */
    public static boolean validId(String id) {
        return id != null && UUID.matcher(id).matches();
    }

    /** 检查全部嵌套整数，保留普通奖励余额的准确性。 */
    private static void requireSafeNumbers(JsonNode value) {
        if (value.isIntegralNumber() && (!value.canConvertToLong() || value.asLong() < 0
                || value.asLong() > MAX_SAFE_INTEGER)) {
            throw new IllegalStateException("奖励回执超出协议精确非负整数范围");
        }
        for (var child : value) {
            requireSafeNumbers(child);
        }
    }

    /** 对持久 JSON 的 UTF-8 字节计算摘要，恢复时不依赖当前配置。 */
    private static String hash(String json) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(json.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("缺少奖励回执摘要算法", error);
        }
    }
}
