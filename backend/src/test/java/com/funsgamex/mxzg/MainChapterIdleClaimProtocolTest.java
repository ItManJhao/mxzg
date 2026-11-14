/**
 * 新挂机领取强类型协议专项：不启动服务或数据库，验证请求、历史回执、状态结果和可选快照字段。
 * 输出本次Java实际Protobuf字节供TypeScript交叉读取；实例ID始终保留字符串，不将历史明细混成当前资产快照。
 */
package com.funsgamex.mxzg;

import com.funsgamex.mxzg.network.GameProtocolCodec;
import com.funsgamex.mxzg.protocol.GameProtocol;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MainChapterIdleClaimProtocolTest {
    /** 每个夹具使用同一业务键，Frame.id另行生成不参与持久幂等。 */
    private static final String REQUEST = "12345678-1234-1234-1234-123456789abc";
    /** 真实实例身份允许超过JS安全整数的十进制文本。 */
    private static final String INSTANCE = "9223372036854775807";

    /** 请求只包含意图键和显式消费版本，status与claim分别映射不同oneof载荷。 */
    @Test
    void requestsHaveDistinctTypedPayloads() throws Exception {
        var claim = frame("request", "chapter.idle.claim", Map.of(
            "requestId", REQUEST, "expectedOperationVersion", 9_007_199_254_740_991L));
        var bytes = GameProtocolCodec.encode(claim);
        var typed = GameProtocol.Frame.parseFrom(bytes);
        assertEquals(GameProtocol.Frame.PayloadCase.CHAPTER_IDLE_CLAIM, typed.getPayloadCase());
        assertEquals(9_007_199_254_740_991L, typed.getChapterIdleClaim().getExpectedOperationVersion());
        var decoded = GameProtocolCodec.decode(bytes);
        assertEquals(REQUEST, decoded.path("body").path("requestId").asString());
        assertFalse(decoded.has("chapterIdleClaim"));

        var status = GameProtocol.Frame.parseFrom(GameProtocolCodec.encode(frame(
            "request", "chapter.idle.claim.status", Map.of("requestId", REQUEST))));
        assertEquals(GameProtocol.Frame.PayloadCase.CHAPTER_IDLE_CLAIM_STATUS_REQUEST, status.getPayloadCase());
        assertEquals(REQUEST, status.getChapterIdleClaimStatusRequest().getRequestId());
    }

    /** 完整实际发放字段按强类型编码，历史余额、真实实例和附赠均能跨语言恢复。 */
    @Test
    void receiptAndCommittedStatusKeepFrozenDetails() throws Exception {
        var receipt = receipt();
        byte[] wire = GameProtocolCodec.encode(frame("response", "chapter.idle.claim", receipt));
        var typed = GameProtocol.Frame.parseFrom(wire).getChapterIdleClaimReceipt();
        assertEquals(3, typed.getBeforeOperationVersion());
        assertEquals(4, typed.getAfterOperationVersion());
        assertEquals(INSTANCE, typed.getActual().getSpirits().getItems(0).getInstanceId());
        assertEquals("stack:role:900101", typed.getActual().getStacks(0).getInstanceId());
        assertEquals("ROLE_LEVEL_UP", typed.getActual().getBonuses(0).getSource());
        var decoded = GameProtocolCodec.decode(wire);
        assertFalse(decoded.has("chapterIdleClaimReceipt"));
        assertFalse(decoded.path("body").has("snapshot"));
        Files.write(Path.of("target/idle-claim-receipt.pb"), wire);

        byte[] status = GameProtocolCodec.encode(frame("response", "chapter.idle.claim.status",
            Map.of("requestId", REQUEST, "status", "COMMITTED", "receipt", receipt)));
        var restored = GameProtocolCodec.decode(status).path("body");
        assertEquals(decoded.path("body"), restored.path("receipt"));
        Files.write(Path.of("target/idle-claim-status.pb"), status);
    }

    /** NOT_FOUND没有回执；缺失必填版本及消息名与oneof不符均拒绝整帧。 */
    @Test
    void absentReceiptAndMalformedFramesRemainDistinct() throws Exception {
        byte[] wire = GameProtocolCodec.encode(frame("response", "chapter.idle.claim.status",
            Map.of("requestId", REQUEST, "status", "NOT_FOUND")));
        assertFalse(GameProtocolCodec.decode(wire).path("body").has("receipt"));
        var incomplete = GameProtocol.Frame.newBuilder().setVersion(1).setKind("request")
            .setName("chapter.idle.claim")
            .setChapterIdleClaim(GameProtocol.ChapterIdleClaim.newBuilder().setRequestId(REQUEST).buildPartial())
            .buildPartial().toByteArray();
        assertThrows(com.google.protobuf.InvalidProtocolBufferException.class,
            () -> GameProtocolCodec.decode(incomplete));
        var mismatched = GameProtocol.Frame.newBuilder().setVersion(1).setKind("request")
            .setName("chapter.idle.claim").setEmpty(GameProtocol.Empty.getDefaultInstance()).build().toByteArray();
        assertThrows(IllegalArgumentException.class, () -> GameProtocolCodec.decode(mismatched));
    }

    /** 构造内部信封；只用于二进制协议夹具，不含凭证、角色网络身份或当前资产快照。 */
    private static Map<String, Object> frame(String kind, String name, Object body) {
        var result = new LinkedHashMap<String, Object>();
        result.put("version", 1);
        result.put("kind", kind);
        result.put("name", name);
        result.put("id", REQUEST);
        result.put("body", body);
        if (kind.equals("response")) {
            result.put("ok", true);
        }
        return result;
    }

    /** 提供与领域record同形的不可变历史结果，理论奖励和升级附赠分开。 */
    private static Map<String, Object> receipt() {
        var actual = Map.of(
            "roleId", "protocol-role",
            "items", List.of(Map.of("itemId", 900003, "requested", 10, "credited", 10, "ignored", 0, "reason", "NONE")),
            "wallet", Map.of("goldBefore", 1, "diamondsBefore", 2, "goldAfter", 1, "diamondsAfter", 5),
            "stacks", List.of(Map.of("itemId", 900101, "instanceId", "stack:role:900101", "beforeQuantity", 1, "quantity", 2, "afterQuantity", 3)),
            "experience", List.of(Map.of("beforeLevel", 1, "beforeExperience", 0, "requested", 10,
                "accepted", 10, "ignored", 0, "level", 2, "experience", 0, "diamonds", 3)),
            "tavern", List.of(Map.of("beforeQuantity", 0, "limit", 11000, "afterQuantity", 0)),
            "bonuses", List.of(Map.of("source", "ROLE_LEVEL_UP", "itemId", 900002, "quantity", 3)),
            "timedItems", List.of(Map.of("instanceId", INSTANCE, "itemId", 1000001,
                "activeAtSeconds", 100, "expiresAtSeconds", 200)),
            "spirits", Map.of("schemaVersion", 1, "items", List.of(Map.of("instanceId", INSTANCE,
                "itemId", 2000002, "abilityId", 1, "skills", List.of(Map.of("sort", 1, "skillId", 1, "level", 1))))));
        var result = new LinkedHashMap<String, Object>();
        result.put("schemaVersion", 1);
        result.put("requestId", REQUEST);
        result.put("receiptId", "22345678-1234-1234-1234-123456789abc");
        result.put("expectedOperationVersion", 3);
        result.put("beforeOperationVersion", 3);
        result.put("afterOperationVersion", 4);
        result.put("committedAtSeconds", 160);
        result.put("previousStartedAtSeconds", 100);
        result.put("seconds", 60);
        result.put("maxSeconds", 43200);
        result.put("rewardStage", 1);
        result.put("assetRevision", 7);
        result.put("theoreticalRewards", List.of(Map.of("itemId", 900003, "quantity", 10)));
        result.put("actual", actual);
        result.put("experience", Map.of("beforeLevel", 1, "beforeExp", 0, "beforeThreshold", 10,
            "afterLevel", 2, "afterExp", 0, "afterThreshold", 20));
        return result;
    }
}
