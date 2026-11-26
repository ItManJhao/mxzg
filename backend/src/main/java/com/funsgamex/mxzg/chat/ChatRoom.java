/** 服务端计算出的历史范围，按频道和范围键区分持久游标。 */
package com.funsgamex.mxzg.chat;

record ChatRoom(ChatChannel channel, String key) {}
