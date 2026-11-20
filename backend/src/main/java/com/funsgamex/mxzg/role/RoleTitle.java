/** 本角色称号档案的持久投影，供个人空间查询取得状态和期限。 */
package com.funsgamex.mxzg.role;

/**
 * @param idx 旧称号配置 ID
 * @param endTimeSeconds -1 为永久，0 为已回收，正数为到期的服务器 Unix 秒
 */
public record RoleTitle(int idx, long endTimeSeconds) {}
