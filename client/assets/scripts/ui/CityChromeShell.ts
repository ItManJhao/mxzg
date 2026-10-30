import { _decorator, Component, Node } from "cc";

const { ccclass, property } = _decorator;

/**
 * CityChrome 的节点引用。
 * 只有节点引用。不加载界面，不发消息，不改页面逻辑。
 */
@ccclass("CityChromeShell")
export class CityChromeShell extends Component {
  @property(Node)
  topBar: Node | null = null;

  @property(Node)
  avatar: Node | null = null;

  @property(Node)
  lblName: Node | null = null;

  @property(Node)
  lblLevel: Node | null = null;

  @property(Node)
  lblSub: Node | null = null;

  @property(Node)
  powerSlot: Node | null = null;

  @property(Node)
  currencyGold: Node | null = null;

  @property(Node)
  currencyGem: Node | null = null;

  @property(Node)
  btnAddGold: Node | null = null;

  @property(Node)
  btnAddGem: Node | null = null;

  @property(Node)
  actGroup: Node | null = null;

  @property(Node)
  btnActExpand: Node | null = null;

  @property(Node)
  monthCard: Node | null = null;

  @property(Node)
  utilityRow: Node | null = null;

  @property(Node)
  btnReplay: Node | null = null;

  @property(Node)
  btnFriend: Node | null = null;

  @property(Node)
  btnMail: Node | null = null;

  @property(Node)
  btnRank: Node | null = null;

  @property(Node)
  btnMore: Node | null = null;

  @property(Node)
  bottomBar: Node | null = null;

  @property(Node)
  tabCity: Node | null = null;

  @property(Node)
  tabHero: Node | null = null;

  @property(Node)
  tabBag: Node | null = null;

  @property(Node)
  tabBattle: Node | null = null;

  @property(Node)
  tabDungeon: Node | null = null;

  @property(Node)
  tabClan: Node | null = null;

  @property(Node)
  tabFetter: Node | null = null;

  @property(Node)
  btnActivity: Node | null = null;

  @property(Node)
  btnMorePanel: Node | null = null;
}
