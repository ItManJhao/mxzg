/** 选服 id。登录屏只显示本机桥，不把这份表画成离线服。 */
export interface GameServer {
  id: number;
  name: string;
}

export const MOCK_SERVERS: GameServer[] = [
  { id: 1, name: "本机桥" },
  { id: 2, name: "提审" },
  { id: 3, name: "正式占位" },
];

/** 未知 id 回到列表第一项（本机桥）。 */
export function findServer(id: number): GameServer {
  for (let i = 0; i < MOCK_SERVERS.length; i++) {
    if (MOCK_SERVERS[i].id === id) return MOCK_SERVERS[i];
  }
  return MOCK_SERVERS[0];
}
