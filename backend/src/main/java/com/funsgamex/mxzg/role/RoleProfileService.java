/**
 * 自身个人空间的头像、头像框、形象、贵重标记、称号与二次改名入口。
 * 写入与扣费在同一角色锁事务内，在线界面通过统一快照取得已提交资料。
 */
package com.funsgamex.mxzg.role;

import com.funsgamex.mxzg.auth.SessionService;
import com.funsgamex.mxzg.hero.HeroRepository;
import com.funsgamex.mxzg.inventory.InventoryService;
import com.funsgamex.mxzg.time.GameClock;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RoleProfileService {
    /** 旧 2020 协议的钻石付款类型。 */
    private static final int PAY_DIAMONDS = 1;

    /** 旧 2020 协议的改名卡付款类型。 */
    private static final int PAY_RENAME_CARD = 2;
    /** 头像框期限按项目统一的上海自然日切换。 */
    private static final ZoneId SERVER_ZONE = ZoneId.of("Asia/Shanghai");

    /** 个人空间权限固定为已鉴权会话拥有的角色。 */
    private final SessionService sessions;

    /** 角色锁、资料和钻石钱包的持久入口。 */
    private final RoleRepository roles;

    /** 读取角色英雄星级图鉴，使用历史最高星级而非当前在册英雄。 */
    private final HeroRepository heroes;

    /** 改名卡从真实普通库存扣除。 */
    private final InventoryService inventory;

    /** 复用首次命名已确认的长度、保留字符和敏感词校验。 */
    private final RoleNameRules names;

    /** 服务端持有同源图鉴和改名报价，不接受客户端传价格或解锁状态。 */
    private final RoleProfileRules rules;
    /** 按旧策划配置解释图鉴头像和头像框激活方式。 */
    private final RoleDecorationRules decorationRules;
    /** 个人装饰持久入口，头像和框的已选 ID 仍保存在角色基础字段。 */
    private final RoleDecorationRepository decorationRepository;
    /** 游戏时间用于头像框激活与有效期检查。 */
    private final GameClock clock;

    /** 一个已激活头像框的配置 ID，结束时间为 Unix 秒，-1 为永久。 */
    public record RoleBorder(int id, long expiresAtSeconds) {}

    /**
     * 装饰窗使用的权威资格和聊天偏好。头像框列表只包含已激活且仍有效的项。
     * 累计充值保留底层整数单位，由页面按日服口径展示，不能作为客户端传入参数。
     */
    public record Decorations(List<Integer> headIds, List<RoleBorder> borders, long totalRecharge, boolean showPeerage) {}

    /** 注入个人空间的持久入口与同源配置，用于读取和原子写入。 */
    RoleProfileService(SessionService sessions, RoleRepository roles, HeroRepository heroes,
            InventoryService inventory, RoleNameRules names, RoleProfileRules rules,
            RoleDecorationRules decorationRules, RoleDecorationRepository decorationRepository, GameClock clock) {
        this.sessions = sessions;
        this.roles = roles;
        this.heroes = heroes;
        this.inventory = inventory;
        this.names = names;
        this.rules = rules;
        this.decorationRules = decorationRules;
        this.decorationRepository = decorationRepository;
        this.clock = clock;
    }

    /** 一次返回真实头像资格、有效头像框和贵重标记状态；必要时同事务回收过期佩戴。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Decorations decorations(String authorization) {
        var role = lockedRole(authorization);
        long now = clock.epochSeconds();
        decorationRepository.expireEquippedBorder(role.id(), now);
        var borders = new ArrayList<RoleBorder>();
        for (int id : decorationRules.freeBorderIds()) {
            borders.add(new RoleBorder(id, RoleDecorationRules.PERMANENT));
        }
        borders.addAll(decorationRepository.activeBorders(role.id(), now));
        borders.sort(Comparator.comparingInt(RoleBorder::id));
        var peerage = decorationRepository.peerage(role.id());
        return new Decorations(decorationRules.heads(heroes.illustrations(role.id())),
            List.copyOf(borders), peerage.totalRecharge(), peerage.showPeerage());
    }

    /** 已取得过对应英雄或免费头像才允许佩戴；重复提交同一头像无需刷新版本。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void changeHead(String authorization, int id) {
        var role = lockedRole(authorization);
        if (!decorationRules.heads(heroes.illustrations(role.id())).contains(id)) {
            throw rejected("ROLE_HEAD_UNAVAILABLE");
        }
        if (role.basics().headId() != id) {
            decorationRepository.changeHead(role.id(), id);
        }
    }

    /** 物品型头像框必须在角色锁事务完成扣除和激活；激活后由另一条指令佩戴。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void activateBorder(String authorization, int id) {
        var role = lockedRole(authorization);
        var border = decorationRules.border(id);
        if (border == null || !border.itemActivated()) {
            throw rejected("ROLE_BORDER_UNAVAILABLE");
        }
        var now = clock.instant();
        decorationRepository.expireEquippedBorder(role.id(), now.getEpochSecond());
        if (hasActiveBorder(role.id(), id, now.getEpochSecond())) {
            return;
        }
        for (var material : border.costs()) {
            if (!inventory.debit(role.id(), material.itemId(), material.count())) {
                throw rejected("ROLE_BORDER_COST_NOT_ENOUGH");
            }
        }
        long expiresAt = border.limitDays() < 0 ? RoleDecorationRules.PERMANENT
            : now.atZone(SERVER_ZONE).toLocalDate().plusDays(1L + border.limitDays())
                .atStartOfDay(SERVER_ZONE).toEpochSecond();
        decorationRepository.activateBorder(role.id(), id, expiresAt);
    }

    /** 仅使用配置存在的免费框和已激活有效框，过期或未激活的配置拒绝。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void changeBorder(String authorization, int id) {
        var role = lockedRole(authorization);
        var border = decorationRules.border(id);
        long now = clock.epochSeconds();
        if (border == null || (!border.free() && !hasActiveBorder(role.id(), id, now))) {
            throw rejected("ROLE_BORDER_UNAVAILABLE");
        }
        if (role.basics().borderId() != id) {
            decorationRepository.changeBorder(role.id(), id);
        }
    }

    /** 保存明确的聊天展示选项，允许尚未获得贵重标记的角色提前设置。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void setPeerageVisibility(String authorization, boolean show) {
        var role = lockedRole(authorization);
        decorationRepository.setPeerageVisibility(role.id(), show);
    }

    /** 统一快照在已持有角色锁时回收过期的佩戴框，下一份状态会显示免费框。 */
    public void expireEquippedBorder(String roleId, long now) {
        decorationRepository.expireEquippedBorder(roleId, now);
    }

    /** 查询该角色图鉴已开放的普通形象 ID，未接入的时装不能由请求任意解锁。 */
    public List<Integer> images(String authorization) {
        return unlockedImages(sessions.requireRole(authorization));
    }

    /** 沿用旧称号查询，返回角色取得过的称号及所存期限，包含失效和已回收记录。 */
    public List<RoleTitle> titles(String authorization) {
        return roles.titles(sessions.requireRole(authorization));
    }

    /** 选择已解锁的图鉴形象，同一形象重复选择不会推进状态版本。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void changeImage(String authorization, int imageId) {
        var role = lockedRole(authorization);
        if (imageId > 0 && imageId == role.basics().imageId()) {
            return;
        }
        if (!unlockedImages(role.id()).contains(imageId)) {
            throw rejected("ROLE_IMAGE_UNAVAILABLE");
        }
        roles.changeImage(role.id(), imageId);
    }

    /** 首次命名后才可付费改名，服务端校验同服唯一性、报价和实际扣费。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void rename(String authorization, String input, int paymentType) {
        var role = lockedRole(authorization);
        if (!role.firstNamed()) {
            throw rejected("ROLE_NAME_NOT_CONFIRMED");
        }
        if (paymentType != PAY_RENAME_CARD && paymentType != PAY_DIAMONDS) {
            throw rejected("ROLE_RENAME_PAYMENT_INVALID");
        }
        String nickname = names.validate(input).orElseThrow(() -> rejected("ROLE_NAME_INVALID"));
        if (nickname.equals(role.nickname())) {
            throw rejected("ROLE_NAME_SAME");
        }
        if (roles.hasNickname(role.serverId(), nickname)) {
            throw rejected("ROLE_NAME_EXISTS");
        }
        debitRenameCost(role.id(), paymentType);
        try {
            roles.rename(role.id(), nickname);
        } catch (DuplicateKeyException failure) {
            // 两个角色抢占同名时，由同服唯一索引拒绝并回滚扣费。
            throw rejected("ROLE_NAME_EXISTS");
        }
    }

    /** 计算同一角色的图鉴形象，供客户端查询及选择时重新校验。 */
    private List<Integer> unlockedImages(String roleId) {
        return heroes.illustrations(roleId).stream()
            .flatMap(hero -> rules.unlockedImages(hero.templateId(), hero.maxStar()).stream())
            .toList();
    }

    /** 检查单个配置是否仍在当前角色的合法持有范围。 */
    private boolean hasActiveBorder(String roleId, int id, long now) {
        return decorationRepository.activeBorders(roleId, now).stream().anyMatch(border -> border.id() == id);
    }

    /** 取得角色锁后重验会话，避免被同角色新连接接管的旧操作继续写入。 */
    private RoleProfile lockedRole(String authorization) {
        String roleId = sessions.requireRole(authorization);
        roles.lock(roleId);
        sessions.requireRole(authorization);
        return roles.findById(roleId).orElseThrow(() ->
            new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Role no longer exists"));
    }

    /** 按旧界面优先用卡，只扣明确确认的付款类型，余额过期时提示玩家重新确认。 */
    private void debitRenameCost(String roleId, int paymentType) {
        var card = rules.renameCard();
        if (paymentType == PAY_RENAME_CARD) {
            if (!inventory.debit(roleId, card.itemId(), card.quantity())) {
                throw rejected("ROLE_RENAME_COST_NOT_ENOUGH");
            }
            return;
        }
        if (inventory.find(roleId, card.itemId()).map(InventoryService.Item::quantity).orElse(0L) >= card.quantity()) {
            throw rejected("ROLE_RENAME_PAYMENT_INVALID");
        }
        if (!roles.debitDiamonds(roleId, rules.renameDiamonds().quantity())) {
            throw rejected("ROLE_RENAME_COST_NOT_ENOUGH");
        }
    }

    /** 返回可显示飘字的业务错误，不向连接暴露数据库错误。 */
    private static ResponseStatusException rejected(String code) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, code);
    }
}
