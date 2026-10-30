/**
 * Page 进页面栈。
 * 其它层要带 hostId，调用方用 setResidentHost 给出父节点。这一层不认识具体界面。
 */
export enum UILayer {
  Page = "page",
  Hud = "hud",
  Popup = "popup",
  Toast = "toast",
}
