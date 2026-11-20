/** 角色基础只读资料，由持久化仓库装配，随登录初始化和服务端状态变化统一下发。 */
package com.funsgamex.mxzg.role;

/**
 * 保存服务端已确认的基础资料；经验、装备与外观指令由所属业务事务处理。
 * @param experience 当前角色等级内经验，不是英雄经验或累计经验
 * @param cup 奖杯积分，新角色采用 inituser 配置
 * @param headId 已选头像配置 ID；存量 0 使用配置初始化的默认头像
 * @param imageId 角色形象配置 ID，与头像不同，由首抽配置初始化
 * @param borderId 已选头像框配置 ID；0 是免费默认框
 * @param language 角色语言编号，新版当前为 1（简体中文）
 * @param createdAtSeconds 创角 Unix 秒，旧记录为 0 表示历史未知
 * @param lastLoginAtSeconds 最后显式登录 Unix 秒，网络恢复不更新
 * @param experienceToNextLevel 当前级经验门槛，最高级为 0；不是尚差经验
 */
public record RoleBasics(
    long experience,
    int cup,
    int headId,
    int imageId,
    int borderId,
    int language,
    long createdAtSeconds,
    long lastLoginAtSeconds,
    long experienceToNextLevel
) {}
