/**
 * 角色持久化入口：提供身份读取、写事务角色锁和钱包余额保护。
 * 可信奖励调用方提供外层事务；金币/钻石入账在真实角色行锁内分别精确相加后一次保存。
 * 所有钱包写入继续复用AssetSyncService的同事务版本及提交后通知，不创建独立发奖事务。
 */
package com.funsgamex.mxzg.role;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class RoleRepository {
    /** 一次读取持久资料、公开编号及由首次命名记录决定的赠礼资格。 */
    private static final String ROLE_SELECT = """
        SELECT game_role.*, public_id, (first_named AND welcome_gift_eligible
            AND NOT EXISTS (SELECT 1 FROM game_role_welcome_gift WHERE role_id=game_role.id))
            AS welcome_gift_available
        FROM game_role
        LEFT JOIN game_role_public_number ON game_role_public_number.role_id=game_role.id
        """;

    /** 旧服角色编号至少为四位区服号及六位区内号。 */
    private static final long FIRST_PUBLIC_NUMBER_FACTOR = 1_000_000L;

    /** 预留四位区服号前缀，开发一、二服分别使用 1001、1002。 */
    private static final int PUBLIC_SERVER_BASE = 1000;

    /** 四位号段分配上限，防止与已有四位前缀重叠。 */
    private static final int MAX_PUBLIC_SERVER_OFFSET = 8999;

    /**
     * 持有区服编号行锁时读取的号段与末次已持久化序号。
     * @param offset 与公开区服号相差 1000 的稳定编号
     * @param lastSequence 自该号段开始按事务分配的最大区内序号，0 表示还未分配
     */
    private record PublicNumberSequence(int offset, long lastSequence) {}

    /**
     * 一次钱包写入或整笔可信发奖的真实前后余额，不将升级赠钻混入直接奖励数量。
     * @param goldBefore 写入前的金币余额
     * @param diamondsBefore 写入前的钻石余额
     * @param goldAfter 写入后的金币余额
     * @param diamondsAfter 写入后的钻石余额，整笔发奖时包含升级附赠
     */
    public record CurrencyCredit(long goldBefore, long diamondsBefore, long goldAfter, long diamondsAfter) {}
    /** 共享数据库连接，所有角色字段只有这一处持久化读取。 */
    private final JdbcTemplate jdbc;
    /** 初始值与当前等级经验门槛，由原配置决定。 */
    private final RoleRules rules;
    /** 旧英雄容量配置，只在创建角色时提供持久初值。 */
    private final com.funsgamex.mxzg.hero.HeroCapacityService heroCapacity;
    /** 读取基础资料及持久战力投影，公会名由同事务快照装配补充。 */
    private RoleProfile map(java.sql.ResultSet row,int index) throws java.sql.SQLException {
        int level = row.getInt("role_level");
        var basics = new RoleBasics(row.getLong("role_experience"), row.getInt("cup"),
            row.getInt("head_id"), row.getInt("image_id"), row.getInt("border_id"), row.getInt("language_id"),
            row.getLong("created_at_seconds"), row.getLong("last_login_at_seconds"), rules.threshold(level));
        return new RoleProfile(row.getString("id"), row.getString("nickname"), level, row.getLong("gold"),
            row.getLong("diamonds"), row.getString("server_id"), basics, row.getBoolean("first_named"),
            row.getBoolean("welcome_gift_available"), row.getString("public_id"), null,
            row.getObject("current_main_power", Integer.class));
    }
    /** 资产版本与事务提交同步，由所有钱包写入共同使用。 */
    private final com.funsgamex.mxzg.network.AssetSyncService sync;

    /** 写用例在事务内先锁角色行，使发奖、阵容与升级按相同角色顺序串行。 */
    public void lock(String roleId) { jdbc.queryForObject("SELECT id FROM game_role WHERE id=? FOR UPDATE", String.class, roleId); }

    /** 调用者必须持有角色锁；余额不足不写入，数据库条件同时防止负余额。 */
    public boolean debitGold(String roleId, long amount) {
        if (amount <= 0) throw new IllegalArgumentException("Nonpositive gold debit");
        sync.requireTransaction();
        boolean changed=jdbc.update("UPDATE game_role SET gold=gold-? WHERE id=? AND gold>=?", amount, roleId, amount) == 1;
        if(changed) sync.changed(roleId);
        return changed;
    }

    /** 在持有角色锁的事务内条件扣钻石，余额不足不写入。 */
    public boolean debitDiamonds(String roleId, long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Nonpositive diamond debit");
        }
        sync.requireTransaction();
        boolean changed = jdbc.update("UPDATE game_role SET diamonds=diamonds-? WHERE id=? AND diamonds>=?",
                amount, roleId, amount) == 1;
        if (changed) {
            sync.changed(roleId);
        }
        return changed;
    }

    /** 在角色锁内保存竞技场结算后的真实积分，同一次发奖和任务进度共用版本。 */
    public void setArenaScore(String roleId, int score) {
        if (score < 0) {
            throw new IllegalArgumentException("竞技场积分不能为负");
        }
        sync.requireTransaction();
        if (jdbc.update("UPDATE game_role SET cup=? WHERE id=?", score, roleId) != 1) {
            throw new IllegalStateException("竞技场积分写入行数异常");
        }
        sync.changed(roleId);
    }

    /** 注入角色持久化与资产同步出口。 */
    public RoleRepository(JdbcTemplate jdbc, com.funsgamex.mxzg.network.AssetSyncService sync, RoleRules rules, com.funsgamex.mxzg.hero.HeroCapacityService heroCapacity) { this.jdbc=jdbc; this.sync=sync; this.rules=rules; this.heroCapacity=heroCapacity; }
    /** 持有角色锁时读取持久状态版本；同一提交的角色与背包共用此值。 */
    public long revision(String role) { return jdbc.queryForObject("SELECT state_revision FROM game_role WHERE id=?",Long.class,role); }

    /** 在开发 GM 的角色锁内设置合法角色等级，本级经验归零且不经过升级奖励。 */
    public void setDevelopmentLevel(String roleId, int level) {
        rules.threshold(level);
        sync.requireTransaction();
        if (jdbc.update("UPDATE game_role SET role_level=?,role_experience=0 "
                + "WHERE id=? AND (role_level<>? OR role_experience<>0)", level, roleId, level) == 1) {
            sync.changed(roleId);
        }
    }

    /** 角色锁内写当前值，并且只有实际值更高才更新用于副本门槛的历史峰值。 */
    public int observeMainPower(String roleId, int power) {
        sync.requireTransaction();
        jdbc.update("""
            UPDATE game_role SET current_main_power=?,
                max_main_power=CASE WHEN max_main_power<? THEN ? ELSE max_main_power END
            WHERE id=? AND (current_main_power IS NULL OR current_main_power<>? OR max_main_power<?)
            """, power, power, power, roleId, power, power);
        return jdbc.queryForObject("SELECT max_main_power FROM game_role WHERE id=?", Integer.class, roleId);
    }

    /** 持有角色锁的统一快照补齐当前投影；相同值直接保留，不写历史峰值或增加资产版本。 */
    public void projectCurrentMainPower(String roleId, int power) {
        sync.requireTransaction();
        jdbc.update("UPDATE game_role SET current_main_power=? WHERE id=? AND (current_main_power IS NULL OR current_main_power<>?)",
            power, roleId, power);
    }
    /**
     * 在调用方事务内锁定真实钱包，分别校验金币和钻石精确加法后一次保存。
     * 两币种各自允许0但不能同时为0，不把跨币种相加当成余额或奖励有效性条件。
     * 缺角色由持久查询异常拒绝，不创建钱包或发送资产变更通知。
     * @return 本次写入的真实前后余额；仅外层事务提交后才代表持久到账。
     * @throws IllegalArgumentException 奖励为负或两者均为0时拒绝，不执行写入
     * @throws ArithmeticException 任一新余额超出long范围时拒绝，两币种和同步版本都不改写
     * @throws IllegalStateException 缺外层事务、旧余额损坏或写入行数异常时拒绝，由外层整体回滚
     */
    public CurrencyCredit creditCurrency(String role, long gold, long diamonds) {
        if (gold < 0 || diamonds < 0 || (gold == 0 && diamonds == 0)) {
            throw new IllegalArgumentException("无效奖励");
        }
        sync.requireTransaction();
        var current = jdbc.queryForObject("SELECT gold,diamonds FROM game_role WHERE id=? FOR UPDATE", (row, index) -> {
            long currentGold = row.getLong("gold");
            boolean missingGold = row.wasNull();
            long currentDiamonds = row.getLong("diamonds");
            boolean missingDiamonds = row.wasNull();
            if (missingGold || missingDiamonds || currentGold < 0 || currentDiamonds < 0) {
                throw new IllegalStateException("角色持久钱包余额非法");
            }
            return new long[]{currentGold, currentDiamonds};
        }, role);
        long nextGold = Math.addExact(current[0], gold);
        long nextDiamonds = Math.addExact(current[1], diamonds);
        if (jdbc.update("UPDATE game_role SET gold=?,diamonds=? WHERE id=?", nextGold, nextDiamonds, role) != 1) {
            throw new IllegalStateException("角色钱包写入行数异常");
        }
        sync.changed(role);
        return new CurrencyCredit(current[0], current[1], nextGold, nextDiamonds);
    }

    /** 查询默认区服的账号角色，不创建资料。 */
    public Optional<RoleProfile> findByAccount(String account) {
        return findByAccount(account, "local-1");
    }
    /** 按账号及区服读取唯一角色及赠礼资格，区服之间不共享资料。 */
    public Optional<RoleProfile> findByAccount(String account, String serverId) {
        return jdbc.query(ROLE_SELECT + "WHERE login_account = ? AND server_id = ?", this::map, account, serverId)
            .stream().findFirst();
    }

    /** 按服务端已鉴权的角色 ID 读取基础资料和赠礼资格。 */
    public Optional<RoleProfile> findById(String id) {
        return jdbc.query(ROLE_SELECT + "WHERE id = ?", this::map, id).stream().findFirst();
    }

    /** 检查同服已命名记录，保留旧服精确比较，避免数据库排序规则合并大小写或字符变体。 */
    public boolean hasNickname(String serverId, String nickname) {
        return jdbc.queryForList("SELECT nickname FROM game_role WHERE server_id=? AND first_named=TRUE AND nickname=?",
            String.class, serverId, nickname).stream().anyMatch(nickname::equals);
    }

    /** 在角色锁内保存首次命名及新手赠礼资格，唯一键处理跨角色同时认领。 */
    public void setFirstName(String roleId, String nickname) {
        sync.requireTransaction();
        int changed = jdbc.update(
            "UPDATE game_role SET nickname=?,first_named=TRUE,welcome_gift_eligible=TRUE,claimed_nickname=? "
                + "WHERE id=? AND first_named=FALSE",
            nickname, nickname.getBytes(StandardCharsets.UTF_8), roleId);
        if (changed != 1) {
            throw new IllegalStateException("首次命名更新行数异常");
        }
        sync.changed(roleId);
    }

    /** 在角色锁内替换已命名角色的昵称与唯一键，改名不改变首次命名和赠礼资格。 */
    void rename(String roleId, String nickname) {
        sync.requireTransaction();
        if (jdbc.update("UPDATE game_role SET nickname=?,claimed_nickname=? WHERE id=? AND first_named=TRUE",
                nickname, nickname.getBytes(StandardCharsets.UTF_8), roleId) != 1) {
            throw new IllegalStateException("角色改名更新行数异常");
        }
        sync.changed(roleId);
    }

    /** 在角色锁内保存已校验的新形象，头像和头像框保持原资料字段。 */
    void changeImage(String roleId, int imageId) {
        sync.requireTransaction();
        if (jdbc.update("UPDATE game_role SET image_id=? WHERE id=?", imageId, roleId) != 1) {
            throw new IllegalStateException("角色形象更新行数异常");
        }
        sync.changed(roleId);
    }

    /** 返回本角色的真实称号取得记录，已到期记录也供个人空间区分未取得和失效。 */
    List<RoleTitle> titles(String roleId) {
        return jdbc.query("SELECT title_id,end_time_seconds FROM game_role_title WHERE role_id=? ORDER BY title_id",
            (row, index) -> new RoleTitle(row.getInt("title_id"), row.getLong("end_time_seconds")), roleId);
    }

    /** 单独调用或加入上层事务，查找或创建默认区服角色。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RoleProfile create(String account) {
        return create(account, "local-1");
    }

    /** 在区服号段行锁内查找或创建角色，公开编号和内部 UUID 同事务持久化。 */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RoleProfile create(String account, String serverId) {
        PublicNumberSequence sequence = lockPublicNumberSequence(serverId);
        var existing = findByAccount(account, serverId);
        if (existing.isPresent()) {
            return existing.get();
        }

        String id = UUID.randomUUID().toString();
        String key = serverId.equals("local-1") ? account : account + "@" + serverId;
        long now = java.time.Instant.now().getEpochSecond();
        jdbc.update("""
            INSERT INTO game_role(id,account_key,nickname,role_level,gold,diamonds,login_account,server_id,
                role_experience,cup,image_id,created_at_seconds,last_login_at_seconds,hero_capacity,first_named)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,FALSE)
            """, id, key, account, rules.initial("level"), rules.initial("gold"), rules.initial("gem"), account,
            serverId, rules.initial("exp"), rules.initial("cup"), rules.imageId(), now, now, heroCapacity.initial());
        long next = Math.incrementExact(sequence.lastSequence());
        jdbc.update("INSERT INTO game_role_public_number(role_id,public_id) VALUES (?,?)",
            id, publicNumber(sequence.offset(), next));
        jdbc.update("UPDATE game_role_public_sequence SET last_sequence=? WHERE server_id=?", next, serverId);
        return findById(id).orElseThrow();
    }

    /** 读锁住现有号段。新录入的区服先锁目录行，故首次创角只登记一次号段。 */
    private PublicNumberSequence lockPublicNumberSequence(String serverId) {
        var numbers = readPublicNumberSequence(serverId);
        if (!numbers.isEmpty()) {
            return numbers.getFirst();
        }
        jdbc.queryForObject("SELECT id FROM game_server WHERE id=? FOR UPDATE", String.class, serverId);
        numbers = readPublicNumberSequence(serverId);
        if (numbers.isEmpty()) {
            jdbc.update("INSERT INTO game_role_public_sequence(server_id) VALUES (?)", serverId);
            numbers = readPublicNumberSequence(serverId);
        }
        return numbers.getFirst();
    }

    /** 获取受锁保护的号段及末次已发序号，空列表表示该区服尚未登记。 */
    private List<PublicNumberSequence> readPublicNumberSequence(String serverId) {
        return jdbc.query("SELECT server_code_offset,last_sequence FROM game_role_public_sequence WHERE server_id=? FOR UPDATE",
            (row, index) -> new PublicNumberSequence(row.getInt("server_code_offset"), row.getLong("last_sequence")),
            serverId);
    }

    /** 按旧服规则组合区服前缀和区内号，区内号增长到七位时保留相同前缀。 */
    private static long publicNumber(int offset, long sequence) {
        if (offset < 1 || offset > MAX_PUBLIC_SERVER_OFFSET) {
            throw new IllegalStateException("公开角色编号的区服号段不在四位范围内");
        }
        long factor = FIRST_PUBLIC_NUMBER_FACTOR;
        while (sequence >= factor) {
            factor = Math.multiplyExact(factor, 10);
        }
        return Math.addExact(Math.multiplyExact(PUBLIC_SERVER_BASE + offset, factor), sequence);
    }
    /** 显式登录时记录服务器秒；须持有角色锁与事务，变更后统一通知，不把网络重连当作新登录。 */
    public void recordLogin(String roleId,long now) {
        if(now<=0)throw new IllegalArgumentException("登录时间无效");sync.requireTransaction();
        if(jdbc.update("UPDATE game_role SET last_login_at_seconds=? WHERE id=? AND last_login_at_seconds<?",now,roleId,now)>0)sync.changed(roleId);
    }
}
