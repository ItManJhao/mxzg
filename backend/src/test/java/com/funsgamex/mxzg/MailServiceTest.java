/** 以独立数据库检验角色信箱的归属、附件到账、幂等与原销毁期限。 */
package com.funsgamex.mxzg;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.funsgamex.mxzg.auth.DevelopmentLoginService;
import com.funsgamex.mxzg.mail.MailService;
import com.funsgamex.mxzg.mail.MailService.Action;
import com.funsgamex.mxzg.mail.MailService.Command;
import com.funsgamex.mxzg.mail.MailService.MailEntry;
import com.funsgamex.mxzg.reward.RewardFeedbackService.Mode;
import com.funsgamex.mxzg.reward.RewardGrantService.Reward;
import com.funsgamex.mxzg.time.GameClock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.server.ResponseStatusException;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:mail_service;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "mxzg.gm.enabled=false"
})
@ActiveProfiles("local")
class MailServiceTest {
    /** 通过正式邮件服务和真实资产领域验收投递与领奖。 */
    @Autowired private MailService mail;
    /** 真实初始化每个隔离测试角色。 */
    @Autowired private DevelopmentLoginService login;
    /** 准备隔离角色和核对持久钱包，不发送线上邮件。 */
    @Autowired private JdbcTemplate jdbc;
    /** 注入受控时间验证收取过的邮件到期清理。 */
    @Autowired private GameClock clock;

    /** 阅读和领取均校验真实收件人，单领回执重放不能重复改资产。 */
    @Test
    void readsClaimsAndDeletesOnlyForTheRecipient() {
        String alice = role();
        String bob = role();
        assertTrue(mail.list(alice).entries().isEmpty());
        String rewardMail = mail.deliver(alice, "维护!", "服务器更新完成。\n感谢等待。", List.of(new Reward(900001, 120)));
        assertTrue(mail.list(bob).entries().isEmpty());
        reject("MAIL_NOT_FOUND", () -> change(bob, Action.CLAIM, rewardMail));
        assertFalse(mail.list(alice).entries().getFirst().read());
        reject("MAIL_DELETE_BLOCKED", () -> change(alice, Action.DELETE, rewardMail));

        var opened = change(alice, Action.OPEN, rewardMail);
        assertEquals("服务器更新完成。\n感谢等待。", opened.detail().content());
        assertEquals(List.of(new Reward(900001, 120)), opened.detail().attachments());
        assertTrue(opened.state().entries().getFirst().read());
        assertFalse(opened.state().entries().getFirst().claimed());
        assertEquals(0, gold(alice));
        change(alice, Action.DELETE_READ, null);
        assertEquals(rewardMail, mail.list(alice).entries().getFirst().id());

        var request = new Command(id(), Action.CLAIM, rewardMail);
        var claim = mail.change(alice, request);
        assertEquals(Mode.POPUP, claim.notice().mode());
        assertEquals(120, gold(alice));
        assertEquals(0, gold(bob));
        assertEquals(claim.notice(), mail.change(alice, request).notice());
        reject("MAIL_ALREADY_CLAIMED", () -> change(alice, Action.CLAIM, rewardMail));
        reject("MAIL_REQUEST_CONFLICT", () -> mail.change(alice, new Command(request.requestId(), Action.OPEN, rewardMail)));
        assertTrue(change(alice, Action.DELETE, rewardMail).state().entries().isEmpty());
        assertEquals(claim.notice(), mail.change(alice, request).notice());
        assertEquals(120, gold(alice));
    }

    /** 批量领取设为已读已领，成功删除后仍能恢复原批量奖励。 */
    @Test
    void mergesAttachmentsAndMarksTextMailAsProcessed() {
        String recipient = role();
        String text = mail.deliver(recipient, "维护通知", "计划公告", List.of());
        mail.deliver(recipient, "首封奖励", "", List.of(new Reward(900001, 45)));
        mail.deliver(recipient, "第二封奖励", "", List.of(new Reward(900001, 55), new Reward(900002, 7)));

        var request = new Command(id(), Action.CLAIM_ALL, null);
        var claim = mail.change(recipient, request);
        assertEquals(100, gold(recipient));
        assertEquals(7, jdbc.queryForObject("SELECT diamonds FROM game_role WHERE id=?", Long.class, recipient));
        assertEquals(3, claim.state().entries().stream().filter(MailEntry::read).count());
        assertEquals(3, claim.state().entries().stream().filter(MailEntry::claimed).count());
        assertNull(change(recipient, Action.CLAIM_ALL, null).notice());
        assertEquals(List.of(), change(recipient, Action.OPEN, text).detail().attachments());
        assertTrue(change(recipient, Action.DELETE_READ, null).state().entries().isEmpty());
        assertEquals(claim.notice(), mail.change(recipient, request).notice());
        assertEquals(100, gold(recipient));

        String textOnly = mail.deliver(recipient, "维护通知", "无附件", List.of());
        assertEquals(List.of(), change(recipient, Action.OPEN, textOnly).detail().attachments());
        assertEquals(1, change(recipient, Action.DELETE_READ, null).state().entries().size());
        assertNull(change(recipient, Action.CLAIM_ALL, null).notice());
        assertTrue(change(recipient, Action.DELETE_READ, null).state().entries().isEmpty());
    }

    /** 七天内可以再次阅读已领邮件，超过期限只保留未领取的实际附件。 */
    @Test
    void retainsUnclaimedAttachmentsPastTheCleanupPeriod() {
        String recipient = role();
        long before = Instant.parse("2026-11-11T02:00:00Z").getEpochSecond();
        clock.setEpochSeconds(before);
        try {
            String claimed = mail.deliver(recipient, "将到期", "", List.of(new Reward(900001, 12)));
            String unclaimed = mail.deliver(recipient, "尚未收取", "", List.of(new Reward(900001, 30)));
            change(recipient, Action.CLAIM, claimed);
            clock.setEpochSeconds(before + 7 * 86_400L);
            assertEquals(2, mail.list(recipient).entries().size());
            clock.setEpochSeconds(before + 7 * 86_400L + 1L);
            assertEquals(List.of(unclaimed), mail.list(recipient).entries().stream().map(MailEntry::id).toList());
            reject("MAIL_NOT_FOUND", () -> change(recipient, Action.OPEN, claimed));
            change(recipient, Action.CLAIM, unclaimed);
            assertEquals(42, gold(recipient));
        } finally {
            clock.reset();
        }
    }

    /** 为每项测试生成真实的角色身份，角色初始钱包为零。 */
    private String role() {
        String account = "mail_" + id().substring(0, 17);
        String id = login.login(account, "local-1").role().id();
        jdbc.update("UPDATE game_role SET gold=0,diamonds=0 WHERE id=?", id);
        return id;
    }

    /** 查询数据库中已提交的金币余额。 */
    private long gold(String role) {
        return jdbc.queryForObject("SELECT gold FROM game_role WHERE id=?", Long.class, role);
    }

    /** 单动作使用和客户端一致的新请求编号，测试重试时复用原命令。 */
    private MailService.MailboxReceipt change(String role, Action action, String mailId) {
        return mail.change(role, new Command(id(), action, mailId));
    }

    /** 明确校验业务拒绝码，避免表结构或执行错误被当成权限用例通过。 */
    private static void reject(String code, Executable action) {
        assertEquals(code, assertThrows(ResponseStatusException.class, action).getReason());
    }

    /** 新身份与客户端规范一致。 */
    private static String id() {
        return UUID.randomUUID().toString();
    }
}
