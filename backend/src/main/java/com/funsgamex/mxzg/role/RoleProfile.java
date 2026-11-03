/** 服务端角色快照：身份用字符串传输，钱包与基础资料从同一持久角色记录读取。 */
package com.funsgamex.mxzg.role;
/** 由统一登录、恢复及资产变化快照下发，不另开角色查询协议。 */
public record RoleProfile(String id, String nickname, int level, long gold, long diamonds, String serverId, RoleBasics basics) {}
