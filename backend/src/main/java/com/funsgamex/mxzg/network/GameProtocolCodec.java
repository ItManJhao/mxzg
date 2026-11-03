/**
 * Protobuf 信封适配：唯一外部输入为二进制，使用生成协议类解析和构造，不接收 JSON 文本。
 * JsonNode 仅承接已有业务字段校验及记录投影，不在网络上传输；库存、英雄与角色均有明确消息类型。
 */
package com.funsgamex.mxzg.network;

import com.funsgamex.mxzg.protocol.GameProtocol;
import com.google.protobuf.*;
import java.util.*;
import tools.jackson.databind.*;
import tools.jackson.databind.node.*;

public final class GameProtocolCodec {
    /** 消息字节上限；连接层和编解码层共同限制。 */
    public static final int FRAME_LIMIT = 65536;
    /** WebSocket 握手协议名，防止新版二进制客户端误连旧 JSON 进程。 */
    public static final String SUBPROTOCOL = "mxzg.protobuf.v2";
    /** 只用于将已有业务记录转换为内存字段树，不解析网络 JSON。 */
    private static final ObjectMapper MAPPER = new ObjectMapper();
    /** oneof 载荷名，由唯一 .proto 定义约束。 */
    private static final Set<String> PAYLOADS = Set.of("authenticate", "accepted", "snapshot", "inventory", "heartbeat", "kicked", "empty", "login", "servers", "gmGrant", "gmResult", "gmStatus");
    /** 工具类不持有实例状态。 */
    private GameProtocolCodec() {}

    /** 解析完整二进制消息；字段必填、长度、载荷与消息方向不符时拒绝，不返回部分结果。 */
    public static JsonNode decode(byte[] bytes) throws java.io.IOException {
        if (bytes.length == 0 || bytes.length > FRAME_LIMIT) throw new IllegalArgumentException("Invalid frame length");
        var input = CodedInputStream.newInstance(bytes);
        input.setSizeLimit(FRAME_LIMIT); input.setRecursionLimit(16);
        var frame = GameProtocol.Frame.parseFrom(input);
        if (!input.isAtEnd()) throw new IllegalArgumentException("Trailing frame data");
        ObjectNode tree = tree(frame);
        String expected = payload(tree);
        String actual = frame.getPayloadCase() == GameProtocol.Frame.PayloadCase.PAYLOAD_NOT_SET ? null
            : frame.getDescriptorForType().findFieldByNumber(frame.getPayloadCase().getNumber()).getJsonName();
        if (!Objects.equals(expected, actual)) throw new IllegalArgumentException("Payload mismatch");
        if (expected == null) tree.putNull("body");
        else tree.set("body", expected.equals("inventory") ? tree.path(expected).path("items") : tree.path(expected));
        for (String field : PAYLOADS) tree.remove(field);
        return tree;
    }

    /** 将经过业务处理的信封构造成强类型 Protobuf；不把业务结果作为 JSON 字符串塞进 bytes。 */
    public static byte[] encode(Object value) {
        ObjectNode tree = (ObjectNode) MAPPER.valueToTree(value);
        JsonNode body = tree.remove("body");
        String payload = payload(tree);
        if (payload != null) {
            if (payload.equals("inventory")) {
                ObjectNode inventory = MAPPER.createObjectNode(); inventory.set("items", body); tree.set(payload, inventory);
            } else tree.set(payload, body);
        }
        var builder = GameProtocol.Frame.newBuilder();
        populate(builder, tree);
        byte[] bytes = builder.build().toByteArray();
        if (bytes.length > FRAME_LIMIT) throw new IllegalArgumentException("Frame too large");
        return bytes;
    }

    /** 消息名称映射到 oneof，错误响应不携带成功载荷，未知请求仍可得到关联的 UNKNOWN_MESSAGE。 */
    private static String payload(JsonNode frame) {
        String kind = frame.path("kind").asString(), name = frame.path("name").asString();
        if (kind.equals("response") && frame.has("ok") && !frame.path("ok").asBoolean()) return null;
        if (kind.equals("request")) return switch(name) { case "session.authenticate" -> "authenticate"; case "session.login" -> "login"; case "gm.grant" -> "gmGrant"; default -> "empty"; };
        if (kind.equals("event") && name.equals("state.changed")) return "snapshot";
        if (kind.equals("event") && name.equals("session.kicked")) return "kicked";
        if (kind.equals("response")) return switch (name) {
            case "session.login", "session.authenticate" -> "accepted"; case "servers.list" -> "servers";
            case "session.heartbeat" -> "heartbeat"; case "gm.grant" -> "gmResult"; case "gm.status" -> "gmStatus";
            default -> throw new IllegalArgumentException("Unknown payload");
        };
        throw new IllegalArgumentException("Invalid direction");
    }

    /** 由协议描述符生成内存字段树，保留 bool 的缺失/false 区别，空 repeated 显式保留为空数组。 */
    private static ObjectNode tree(Message message) {
        ObjectNode result = MAPPER.createObjectNode();
        for (var field : message.getDescriptorForType().getFields()) {
            if (field.isRepeated()) {
                ArrayNode array = result.putArray(field.getJsonName());
                for (Object value : (List<?>) message.getField(field)) array.add(node(value));
            } else if (message.hasField(field)) result.set(field.getJsonName(), node(message.getField(field)));
        }
        return result;
    }

    /** 将嵌套消息递归投影，标量保留原类型，不进行字符串到数值的强转。 */
    private static JsonNode node(Object value) {
        return value instanceof Message message ? tree(message) : MAPPER.valueToTree(value);
    }

    /** 根据同一生成描述符构建消息，未知字段和类型强转均拒绝，必填字段由 build 校验。 */
    private static void populate(Message.Builder builder, JsonNode value) {
        if (value == null || !value.isObject()) throw new IllegalArgumentException("Expected object");
        for (String name : value.propertyNames()) {
            var field = builder.getDescriptorForType().getFields().stream()
                .filter(candidate -> candidate.getJsonName().equals(name)).findFirst().orElseThrow(() -> new IllegalArgumentException("Unknown field"));
            JsonNode child = value.path(name);
            if (child.isNull()) continue;
            if (field.isRepeated()) {
                if (!child.isArray()) throw new IllegalArgumentException("Expected array");
                for (JsonNode row : child) builder.addRepeatedField(field, scalar(builder, field, row));
            } else builder.setField(field, scalar(builder, field, child));
        }
    }

    /** 构建单字段值；业务数值范围仍由 handler/Service 校验，编解码不代替鉴权。 */
    private static Object scalar(Message.Builder parent, Descriptors.FieldDescriptor field, JsonNode value) {
        return switch (field.getJavaType()) {
            case MESSAGE -> {
                var nested = parent.newBuilderForField(field); populate(nested, value); yield nested.build();
            }
            case STRING -> { if (!value.isString()) throw new IllegalArgumentException("Expected string"); yield value.asString(); }
            case BOOLEAN -> { if (!value.isBoolean()) throw new IllegalArgumentException("Expected boolean"); yield value.asBoolean(); }
            case INT -> { if (!value.isIntegralNumber() || !value.canConvertToInt()) throw new IllegalArgumentException("Expected int"); yield value.asInt(); }
            case LONG -> { if (!value.isIntegralNumber() || !value.canConvertToLong()) throw new IllegalArgumentException("Expected long"); yield value.asLong(); }
            default -> throw new IllegalArgumentException("Unsupported field");
        };
    }
}
